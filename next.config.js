const { version } = require("./package.json");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Emits a self-contained server bundle at .next/standalone containing only
  // the node_modules Next traced as reachable. The deploy pipeline ships that
  // folder, so the VPS never runs `npm ci` or keeps a build toolchain.
  output: "standalone",

  // The version shown at the foot of Profile. Inlined into the bundle at build
  // time, like every other NEXT_PUBLIC_* value, so it describes the code the
  // browser is actually running rather than whatever package.json happens to
  // say on the server. Bumping the version therefore needs a rebuild — which
  // is exactly what shipping a new version is.
  env: { NEXT_PUBLIC_APP_VERSION: version },
};

module.exports = nextConfig;
