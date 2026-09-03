// PM2 process definition for the church-cafe Next.js frontend.
//
// Version-controlled here, shipped inside every release tarball, and copied to
// the stable path /var/www/church-cafe-frontend/ecosystem.config.js by
// deploy/release.sh. PM2 always reads it from that stable path, so a change to
// this file takes effect on the next deploy.
module.exports = {
  apps: [
    {
      name: "church-cafe-frontend",

      // `cwd` is the release symlink, so each reload picks up whatever release
      // is current. Node resolves the symlink when it loads server.js, so
      // __dirname inside the app points at the real release directory.
      cwd: "/var/www/church-cafe-frontend/current",
      script: "server.js",

      // Cluster mode lets `pm2 reload` boot new workers before retiring the old
      // ones, so deploys don't drop requests. The app is entirely client
      // components with no server-side state, so workers share nothing and the
      // instance count is a pure memory/throughput trade. Drop to 1 if the VPS
      // is tight on RAM -- it already runs furniture-shop and the cafe backend.
      exec_mode: "cluster",
      instances: 2,

      env: {
        NODE_ENV: "production",
        PORT: 3100,
        // Bind to loopback only: nginx is the sole public entry point, so the
        // Node server must not be reachable directly from the internet.
        // 3000 is taken by furniture-shop on this box.
        HOSTNAME: "127.0.0.1",
      },

      // Next finishes in-flight requests on SIGINT; give it room to drain.
      kill_timeout: 10000,
      listen_timeout: 10000,
      max_memory_restart: "400M",
      autorestart: true,

      error_file: "/var/www/church-cafe-frontend/logs/error.log",
      out_file: "/var/www/church-cafe-frontend/logs/out.log",
      merge_logs: true,
      time: true,
    },
  ],
};
