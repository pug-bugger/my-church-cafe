/**
 * Build stamps for the footer on /profile.
 *
 * The app's own number is inlined from package.json by next.config.js; the
 * backend's is fetched, because the two deploy separately and can legitimately
 * differ for a few seconds — or, when something goes wrong, for longer.
 */

/** This bundle's version, e.g. "1.0.0". See VERSIONING.md for when it changes. */
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0";

/** What `GET /api/version` answers. */
export type ServerVersion = {
  name?: string;
  version?: string;
  env?: string;
};
