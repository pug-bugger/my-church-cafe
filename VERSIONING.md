# Versioning — web frontend

`my-church-cafe` is versioned **MAJOR.MINOR.PATCH** ([semver]). The number is
shown to whoever is using the app, at the foot of `/profile`:

```
v1.0.1 · server v1.0.0
```

[semver]: https://semver.org

## Which part to change

| What you shipped | Change | Example |
| --- | --- | --- |
| **A hotfix** — something that was meant to work already didn't, and now does | **PATCH** + 1 | `1.0.0` → `1.0.1` |
| **A new feature** — a new screen, a new control, anything staff or customers would notice as new | **MINOR** + 1, PATCH back to `0` | `1.0.1` → `1.1.0` |
| **A breaking change** — a workflow people rely on is removed or reshaped, or the app now needs a backend they don't have | **MAJOR** + 1, the rest back to `0` | `1.1.0` → `2.0.0` |

Rules of thumb:

- If the release note would say *"fixed"*, it is a patch. If it would say
  *"added"* or *"you can now"*, it is a minor.
- A redesign of a screen that still does the same job is a **minor**, not a
  major. Major is for "the thing you did yesterday is not there any more".
- Refactors, dependency bumps, comment and doc changes that nobody can see from
  the browser do not need a bump at all.
- Never skip a number and never reuse one. The version is how a bug report is
  matched to a build.

## Where the number lives

`package.json` → `"version"`. That is the only place it is edited.

From there:

- `next.config.js` inlines it as `NEXT_PUBLIC_APP_VERSION`,
- `src/lib/version.ts` exposes it as `APP_VERSION`,
- `src/components/profile/VersionFooter.tsx` renders it under every section of
  `/profile`, including the signed-out sign-in view.

The footer's second half — `server v1.0.0` — is fetched from the backend's
`GET /api/version` and is simply left off if the backend is unreachable or too
old to serve it.

> **`NEXT_PUBLIC_*` is inlined at build time.** Editing `package.json` changes
> nothing in a browser until the app is rebuilt and deployed. That is the
> intended behaviour: the footer describes the bundle actually being run, not
> the repo.

## How to change it

Bump it **in the same commit as the change it describes**, so the number that
reaches `prod` always belongs to the code that reached `prod`.

```bash
cd my-church-cafe

# Pick one. Each rewrites package.json and commits, with no git tag.
npm version patch --no-git-tag-version   # hotfix        1.0.0 -> 1.0.1
npm version minor --no-git-tag-version   # new feature   1.0.1 -> 1.1.0
npm version major --no-git-tag-version   # breaking      1.1.0 -> 2.0.0

git add -A && git commit -m "Fix …  (v1.0.1)"
git push origin prod
```

Then **sync the branches** as the repo requires — see `CLAUDE.md`:

```bash
git checkout main    && git merge prod --ff-only && git push origin main    && git checkout prod
git checkout partial && git merge prod --ff-only && git push origin partial && git checkout prod
```

Pushing to `prod` triggers the deploy. Confirm the right build went live by
opening `/profile` and reading the footer — a hard refresh if the old bundle is
still cached.

## The apps version separately

The web frontend, the backend, the mobile app and the print agent are four
repos with four independent version numbers. They do **not** have to match —
the footer prints both of the ones that matter here precisely so a mismatch is
visible:

```
v1.1.0 · server v1.0.0      # this app has a feature the backend hasn't shipped
```

That is normal for a few seconds mid-deploy. If it persists, one of the two
deploys failed.
