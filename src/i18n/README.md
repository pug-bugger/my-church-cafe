# Translations

Every user-facing string in the **web app and the mobile app** comes from the
catalogue in this directory. There is one authored copy of it, here in
`my-church-cafe`; the mobile app carries a generated mirror.

```
src/i18n/
├── messages/            ← the catalogue. This is the "one place".
│   ├── common.json         Save, Cancel, Total, item counts — reused everywhere
│   ├── nav.json            header links, tab bar, connection badge
│   ├── auth.json           sign in, register, sign out
│   ├── home.json           the web landing page
│   ├── menu.json           the menu board
│   ├── terminal.json       counter terminal: picker, running order, sheet
│   ├── orders.json         pickup board, barista queue, order cards
│   ├── manage.json         products, options, people, reports, data table
│   ├── profile.json        account, dashboard, analytics
│   ├── settings.json       appearance, language, printer, connection
│   ├── stats.json          the mobile Statistics screen
│   ├── products.json       category / subtype / option wording
│   ├── status.json         order statuses
│   ├── time.json           relative times and day names
│   └── errors.json         failure messages
├── catalog.ts           assembles the namespaces; derives the MessageKey type
├── locales.ts           the languages, and their plural rules
├── translate.ts         lookup, plurals, {placeholder} interpolation
├── names.ts             translating names that come out of the database
├── runtime.ts           the active language, and the non-React `t()`
└── index.tsx            LanguageProvider + useTranslation  (web-only)
```

## The shape of a message

```json
"sendToBarista": {
  "en": "Send to barista",
  "lt": "Siųsti baristui",
  "ru": "Отправить баристе"
}
```

**All languages sit on one line, together.** That is the point of the format:
updating a string means editing one place with every translation in front of
you, and a language that has not been filled in is obvious at a glance instead
of hiding in a parallel file.

**The file name is the first segment of the key.** `t("terminal.sendToBarista")`
is defined in `messages/terminal.json` and can be defined nowhere else, so any
string on a screen can be traced to its file from the key alone — and a whole
screen's wording can be reviewed by opening one file. Keys nest freely inside a
namespace (`settings.printer.badge.connected`); a node is a *message* exactly
when it has an `en` value.

### Placeholders

`{name}` is substituted from the second argument:

```ts
t("manage.product.deleted", { name: product.name })   // "Cappuccino" deleted
```

Every language of a message must use the same set of placeholders — the checker
enforces it, because a dropped `{name}` is a sentence with a hole in it.

### Counts

A count-dependent message declares plural forms per language, and passing
`count` picks the right one:

```json
"itemCount": {
  "en": { "one": "{count} item",  "other": "{count} items" },
  "lt": { "one": "{count} prekė", "few": "{count} prekės", "other": "{count} prekių" },
  "ru": { "one": "{count} позиция", "few": "{count} позиции", "many": "{count} позиций" }
}
```

```ts
t("common.itemCount", { count: 3 })   // lt → "3 prekės"
```

Each language declares only the forms it actually selects (`pluralCategory` in
`locales.ts` implements the CLDR rules for en, lt and ru), and the checker
enforces that set: English needs `one`/`other`, Lithuanian `one`/`few`/`other`,
Russian `one`/`few`/`many`. This is not decoration — "5 prekės" and "5 заказа"
are both wrong, and only a native speaker would notice.

## Using it

In a component, always the hook — its `t` re-renders on a language switch:

```tsx
const { t } = useTranslation();
return <button>{t("terminal.sendToBarista")}</button>;
```

Outside React — the API client, the store, a Zod schema, a toast helper — the
module-scope `t` reads the same active language:

```ts
import { t } from "@/i18n";
toast.error(t("errors.loadOrders"));
```

The module-scope one is *not* reactive. That is correct for a toast (written
once, when it fires) and wrong for anything on screen. Keys are type-checked
either way: `MessageKey` is derived from the catalogue, so a typo fails
`next build`, and so does a message that exists in no namespace.

### Names from the database

Categories, drink subtypes and option labels are rows an admin can create, so
they are not in the catalogue. `names.ts` translates the seeded ones
(`Drink`, `Coffee`, `Season drinks`, the statuses, the roles) and passes
anything else through as typed. **Product names are never translated** — they
are the cafe's own wording, and the barista reads them off the same ticket in
every language.

Pass the hook's `t` when you call these from a component:

```tsx
const { t } = useTranslation();
<span>{groupLabel(row.group, t)}</span>
```

## Adding a language

1. Add it to `LOCALES` in `locales.ts` (id, native name, `<html lang>`, `Intl` tag).
2. Teach `pluralCategory` its plural rule, unless English's one/other is right.
3. Fill its value in on every message. `npm run i18n:check` lists what is left.

Nothing else branches on the language, and no screen needs touching.

## Adding a namespace

Add `messages/<name>.json` and one line to `CATALOG` in `catalog.ts`. The name
becomes the key prefix.

## Keeping the two apps in step

`my-church-cafe` **owns** the catalogue. The mobile app holds a mirror of every
platform-neutral file (`messages/`, `catalog.ts`, `locales.ts`, `names.ts`,
`runtime.ts`, `translate.ts`, this README and `scripts/i18n.mjs`), and
**`src/i18n/index.tsx` is the one file that differs** — the web provider uses
`localStorage` and sets `<html lang>`, the native one uses `AsyncStorage` and
the device locale. Both expose the same `useTranslation()`.

The two copies exist because the apps are separate git repositories with
separate CI: neither can import from a path outside its own checkout at build
time. So the catalogue is authored once and copied, the way the print agent's
ESC/POS builder is a copy of the backend's.

```bash
npm run i18n:check        # validate the catalogue (both repos)
npm run i18n:sync         # canonical → mobile        (this repo only)
npm run i18n:sync:check   # fail if the mirror has drifted
```

Never edit the mobile copy. `i18n:sync:check` is what catches it if someone
does.

`i18n:check` verifies that every message has every language, that the
placeholders agree across languages, that plural messages declare the forms
their language needs, and it lists messages nothing references. The last one is
a warning rather than an error: when both repos are checked out side by side it
scans both, but on CI it sees one, and a key used only by the other app would
otherwise look dead.

## What is deliberately not translated

- **The wordmark** — "Church Cafe", "Renewal Church Cafe". A name, not a string.
- **Product names and descriptions** — the cafe's own wording, from the database.
- **`/privacy`** — the privacy policy is a legal document and a *server*
  component (it has to render without JavaScript for the app stores' checkers,
  which is why it is the only server-rendered page). The per-device language
  here is a client-side choice, so translating that page needs either
  locale-routed URLs or a client component, and the wording needs a human sign-off
  before it is published in a second language. It stays English until then.
