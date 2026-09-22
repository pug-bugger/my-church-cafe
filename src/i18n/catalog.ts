/**
 * The catalogue: every namespace, assembled.
 *
 * ── Shared module ───────────────────────────────────────────────────────────
 * Authored here in the web app and mirrored verbatim into
 * `my-church-cafe-mobile/src/i18n/`. Do not edit the mobile copy: change this
 * one and run `npm run i18n:sync`. See `src/i18n/README.md`.
 * ────────────────────────────────────────────────────────────────────────────
 *
 * One namespace per file under `messages/`, and the file name is the first
 * segment of every key it defines — so `t("terminal.sendToBarista")` is in
 * `messages/terminal.json` and nowhere else. Adding a namespace means adding
 * the file and one line to `CATALOG` below.
 *
 * Importing all three languages at once is deliberate: the whole catalogue is
 * a few tens of kilobytes, and it buys a language switch that is instant, with
 * no async load, no suspense boundary and no split between what the web bundler
 * and Metro can each do.
 */
import auth from "./messages/auth.json";
import common from "./messages/common.json";
import errors from "./messages/errors.json";
import home from "./messages/home.json";
import manage from "./messages/manage.json";
import menu from "./messages/menu.json";
import nav from "./messages/nav.json";
import orders from "./messages/orders.json";
import products from "./messages/products.json";
import realtime from "./messages/realtime.json";
import profile from "./messages/profile.json";
import settings from "./messages/settings.json";
import stats from "./messages/stats.json";
import status from "./messages/status.json";
import terminal from "./messages/terminal.json";
import time from "./messages/time.json";
import {
  flattenMessages,
  type MessageLeaf,
  type MessageNode,
  type MessagePath,
} from "./translate";

/**
 * Namespace → its messages. The key here is what every message key in that
 * file is prefixed with.
 */
export const CATALOG = {
  /** Words reused across screens: Save, Cancel, Total, item counts. */
  common,
  /** Header links, tab bar, connection badge. */
  nav,
  /** Sign in, register, sign out. */
  auth,
  /** The web landing page. */
  home,
  /** The menu board (web) and Menu tab (mobile). */
  menu,
  /** Counter terminal: product picker, running order, product sheet. */
  terminal,
  /** Pickup board, barista queue, order cards. */
  orders,
  /** Manage / admin: products, options, people, reports, the data table. */
  manage,
  /** Profile: account, dashboard, analytics. */
  profile,
  /** Appearance, language, printer and connection settings. */
  settings,
  /** Statistics screen (mobile). */
  stats,
  /** Category, subtype and product-option wording. */
  products,
  /** Order status labels. */
  status,
  /** Relative times and day names. */
  time,
  /** Socket connection and order-event toasts. */
  realtime,
  /** Failure messages shown in toasts and alerts. */
  errors,
} as const;

/** Every key `t()` accepts, e.g. `"terminal.sendToBarista"`. */
export type MessageKey = MessagePath<typeof CATALOG>;

/** `{ "terminal.sendToBarista": <leaf> }` — built once, read on every render. */
export const MESSAGES: Record<string, MessageLeaf> = flattenMessages(
  CATALOG as unknown as MessageNode,
);

/** Namespace names, for the checker's reporting. */
export const NAMESPACES = Object.keys(CATALOG) as (keyof typeof CATALOG)[];
