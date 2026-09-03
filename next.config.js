/** @type {import('next').NextConfig} */
const nextConfig = {
  // Emits a self-contained server bundle at .next/standalone containing only
  // the node_modules Next traced as reachable. The deploy pipeline ships that
  // folder, so the VPS never runs `npm ci` or keeps a build toolchain.
  output: "standalone",
};

module.exports = nextConfig;
