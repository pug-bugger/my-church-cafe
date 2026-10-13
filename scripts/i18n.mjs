#!/usr/bin/env node
/**
 * The i18n catalogue's keeper: `check` validates it, `sync` mirrors it.
 *
 * ── Shared script ───────────────────────────────────────────────────────────
 * Authored in `my-church-cafe` and mirrored into `my-church-cafe-mobile` by
 * `sync`, so both repos can validate their own copy standalone — which they
 * have to, since each is a separate git repository with its own CI.
 * ────────────────────────────────────────────────────────────────────────────
 *
 *   node scripts/i18n.mjs check     validate this repo's catalogue
 *   node scripts/i18n.mjs sync      copy the catalogue to the mobile app
 *   node scripts/i18n.mjs sync --check   report drift without writing
 *
 * `check` fails the command (exit 1) on anything that would reach a screen as
 * a wrong or missing string; it only warns about keys nothing uses, since a key
 * used solely by the other app looks unused from here.
 */
import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..");
const I18N = join(REPO, "src", "i18n");
const MESSAGES = join(I18N, "messages");

/** The repo that owns the catalogue, and the one that mirrors it. */
const CANONICAL = "my-church-cafe";
const MIRROR = "my-church-cafe-mobile";
/** Where the mirror sits relative to the canonical repo. */
const MIRROR_PATH = resolve(REPO, "..", MIRROR);

/**
 * Platform-neutral files that are identical in both apps. `index.tsx` is
 * deliberately absent: the provider differs (localStorage + `<html lang>` on
 * the web, AsyncStorage + the device locale on native).
 */
const SHARED_MODULES = [
  "catalog.ts",
  "locales.ts",
  "names.ts",
  "runtime.ts",
  "translate.ts",
  "README.md",
];

/** Plural forms each language must declare when a message is count-dependent. */
const REQUIRED_PLURAL_FORMS = {
  en: ["one", "other"],
  lt: ["one", "few", "other"],
  ru: ["one", "few", "many"],
};

function packageName(dir) {
  try {
    return JSON.parse(readFileSync(join(dir, "package.json"), "utf8")).name;
  } catch {
    return null;
  }
}

function localeIds() {
  // Read the locale ids out of locales.ts rather than duplicating them, so
  // adding a language in one place is genuinely enough.
  const source = readFileSync(join(I18N, "locales.ts"), "utf8");
  const type = source.match(/export type LocaleId =([^;]+);/);
  if (!type) throw new Error("could not read LocaleId from locales.ts");
  return [...type[1].matchAll(/"([a-z-]+)"/g)].map((m) => m[1]);
}

function namespaceFiles() {
  return readdirSync(MESSAGES)
    .filter((f) => f.endsWith(".json"))
    .sort();
}

function isLeaf(value) {
  return value && typeof value === "object" && "en" in value;
}

/** Every leaf in a namespace, as `[dotted.key, leaf]`. */
function leaves(node, prefix, out = []) {
  for (const [key, value] of Object.entries(node)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (isLeaf(value)) out.push([path, value]);
    else if (value && typeof value === "object") leaves(value, path, out);
  }
  return out;
}

function placeholders(template) {
  return new Set([...String(template).matchAll(/\{(\w+)\}/g)].map((m) => m[1]));
}

/** Every `{placeholder}` a message uses, across all its plural forms. */
function messagePlaceholders(message) {
  if (typeof message === "string") return placeholders(message);
  const all = new Set();
  for (const form of Object.values(message ?? {})) {
    for (const name of placeholders(form)) all.add(name);
  }
  return all;
}

function sourceFiles(root) {
  const out = [];
  const skip = new Set(["node_modules", ".next", ".expo", "android", "ios", "dist", ".git"]);
  const walk = (dir) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (skip.has(entry.name)) continue;
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (/\.tsx?$/.test(entry.name)) out.push(path);
    }
  };
  for (const sub of ["src", "app"]) {
    const dir = join(root, sub);
    if (existsSync(dir)) walk(dir);
  }
  return out;
}

/**
 * Which catalogue keys the source actually mentions.
 *
 * Plain literals are matched exactly. A template literal — `t(\`status.${id}\`)`,
 * which is how closed-set keys are built — becomes a pattern where every
 * `${…}` stands for one path segment.
 */
function collectUsage(roots) {
  const literals = new Set();
  const patterns = [];
  for (const root of roots) {
    for (const file of sourceFiles(root)) {
      const source = readFileSync(file, "utf8");
      for (const match of source.matchAll(/["']([a-zA-Z][\w.]*\.[\w.]+)["']/g)) {
        literals.add(match[1]);
      }
      for (const match of source.matchAll(/`([a-zA-Z][\w.]*\$\{[^`]*)`/g)) {
        const body = match[1];
        if (!body.includes(".")) continue;
        // Split on the interpolations first, then escape only the literal
        // parts. Escaping the whole string first would mangle the `${…}`
        // markers themselves, and the pattern would silently match nothing.
        const pattern = body
          .split(/\$\{[^}]*\}/)
          .map((literal) => literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
          .join("[^.]+");
        try {
          patterns.push(new RegExp(`^${pattern}$`));
        } catch {
          /* an expression too odd to turn into a pattern; ignore it */
        }
      }
    }
  }
  return { literals, patterns };
}

function checkCatalogue() {
  const locales = localeIds();
  const errors = [];
  const warnings = [];
  let leafCount = 0;

  for (const file of namespaceFiles()) {
    const namespace = file.replace(/\.json$/, "");
    const path = join(MESSAGES, file);
    let parsed;
    try {
      parsed = JSON.parse(readFileSync(path, "utf8"));
    } catch (err) {
      errors.push(`${file}: invalid JSON — ${err.message}`);
      continue;
    }

    for (const [key, leaf] of leaves(parsed, "")) {
      leafCount += 1;
      const fullKey = `${namespace}.${key}`;
      const reference = messagePlaceholders(leaf.en);

      for (const locale of locales) {
        const message = leaf[locale];
        if (message === undefined) {
          errors.push(`${fullKey}: no "${locale}" translation`);
          continue;
        }
        if (typeof message !== "string" && typeof message !== "object") {
          errors.push(`${fullKey}: "${locale}" is neither a string nor plural forms`);
          continue;
        }

        // A message is count-dependent in every language or in none: a plural
        // `en` with a flat `lt` silently drops the count agreement.
        const enIsPlural = typeof leaf.en === "object";
        const isPlural = typeof message === "object";
        if (enIsPlural !== isPlural) {
          errors.push(
            `${fullKey}: "${locale}" is ${isPlural ? "plural" : "a single string"} but "en" is ${
              enIsPlural ? "plural" : "a single string"
            }`,
          );
          continue;
        }

        if (isPlural) {
          const required = REQUIRED_PLURAL_FORMS[locale] ?? ["other"];
          for (const form of required) {
            if (typeof message[form] !== "string") {
              errors.push(`${fullKey}: "${locale}" is missing the "${form}" plural form`);
            }
          }
          for (const form of Object.keys(message)) {
            if (!required.includes(form)) {
              warnings.push(
                `${fullKey}: "${locale}" declares "${form}", which ${locale} never selects`,
              );
            }
          }
        }

        const found = messagePlaceholders(message);
        for (const name of reference) {
          if (!found.has(name)) {
            errors.push(`${fullKey}: "${locale}" is missing the {${name}} placeholder`);
          }
        }
        for (const name of found) {
          if (!reference.has(name)) {
            errors.push(`${fullKey}: "${locale}" has an unexpected {${name}} placeholder`);
          }
        }
      }
    }
  }

  return { errors, warnings, leafCount, locales };
}

function checkUsage() {
  // Both apps when they are checked out side by side; this one alone otherwise.
  const roots = [REPO];
  const sibling = packageName(REPO) === CANONICAL ? MIRROR_PATH : resolve(REPO, "..", CANONICAL);
  if (existsSync(sibling)) roots.push(sibling);

  const { literals, patterns } = collectUsage(roots);
  const unused = [];
  let total = 0;

  for (const file of namespaceFiles()) {
    const namespace = file.replace(/\.json$/, "");
    const parsed = JSON.parse(readFileSync(join(MESSAGES, file), "utf8"));
    for (const [key] of leaves(parsed, "")) {
      const fullKey = `${namespace}.${key}`;
      total += 1;
      if (literals.has(fullKey)) continue;
      if (patterns.some((pattern) => pattern.test(fullKey))) continue;
      unused.push(fullKey);
    }
  }

  return { unused, total, roots: roots.map((r) => packageName(r) ?? r) };
}

function sharedFileList() {
  const files = SHARED_MODULES.map((name) => join("src", "i18n", name));
  for (const file of namespaceFiles()) {
    files.push(join("src", "i18n", "messages", file));
  }
  files.push(join("scripts", "i18n.mjs"));
  return files.filter((file) => existsSync(join(REPO, file)));
}

function syncToMirror({ dryRun }) {
  if (packageName(REPO) !== CANONICAL) {
    console.error(
      `sync runs from ${CANONICAL} only — it is the catalogue's source of truth.\n` +
        `This is ${packageName(REPO)}; run "npm run i18n:sync" there instead.`,
    );
    return 1;
  }
  if (!existsSync(MIRROR_PATH)) {
    console.error(
      `${MIRROR} is not checked out next to this repo (looked in ${MIRROR_PATH}).\n` +
        `Clone it beside ${CANONICAL} and run this again.`,
    );
    return 1;
  }

  let changed = 0;
  let same = 0;
  for (const file of sharedFileList()) {
    const from = join(REPO, file);
    const to = join(MIRROR_PATH, file);
    const source = readFileSync(from);
    const existing = existsSync(to) ? readFileSync(to) : null;
    if (existing && existing.equals(source)) {
      same += 1;
      continue;
    }
    changed += 1;
    console.log(`${dryRun ? "differs" : "writing"}  ${file}`);
    if (!dryRun) {
      mkdirSync(dirname(to), { recursive: true });
      writeFileSync(to, source);
    }
  }

  if (dryRun) {
    if (changed > 0) {
      console.error(
        `\n${changed} shared i18n file(s) differ from ${MIRROR}. Run "npm run i18n:sync".`,
      );
      return 1;
    }
    console.log(`${MIRROR} is in step (${same} shared files).`);
    return 0;
  }

  console.log(
    changed === 0
      ? `${MIRROR} was already in step (${same} shared files).`
      : `\nSynced ${changed} file(s) to ${MIRROR}; ${same} already matched.`,
  );
  return 0;
}

function runCheck() {
  const { errors, warnings, leafCount, locales } = checkCatalogue();
  const usage = checkUsage();

  console.log(
    `${leafCount} messages × ${locales.length} languages (${locales.join(", ")}) ` +
      `in ${namespaceFiles().length} namespaces`,
  );

  for (const warning of warnings) console.log(`warn   ${warning}`);
  if (usage.unused.length > 0) {
    console.log(
      `\nwarn   ${usage.unused.length} message(s) nothing references ` +
        `(scanned ${usage.roots.join(", ")}):`,
    );
    for (const key of usage.unused) console.log(`         ${key}`);
  }

  if (errors.length > 0) {
    console.error(`\n${errors.length} problem(s):`);
    for (const error of errors) console.error(`  ${error}`);
    return 1;
  }

  console.log("\nCatalogue is complete and consistent.");
  return 0;
}

const [command, ...flags] = process.argv.slice(2);
let exitCode = 0;

switch (command) {
  case "check":
    exitCode = runCheck();
    break;
  case "sync":
    exitCode = syncToMirror({ dryRun: flags.includes("--check") });
    break;
  default:
    console.error(
      "usage: node scripts/i18n.mjs <check | sync [--check]>\n\n" +
        "  check          validate this repo's catalogue\n" +
        `  sync           copy the shared catalogue to ${MIRROR}\n` +
        "  sync --check   report drift without writing",
    );
    exitCode = 1;
}

process.exit(exitCode);
