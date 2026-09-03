# Deploying church-cafe to the iv.lt VPS

Every push to `prod` — in **either** repo — builds on GitHub Actions and
releases to the VPS. No manual step, no build toolchain on the server.

This is the same pipeline as `furniture-shop`, which already runs on this box.
The two apps coexist: separate PM2 processes, separate ports, separate nginx
sites, separate release directories. Nothing here touches furniture-shop.

```
push to prod (my-church-cafe)          push to prod (my-church-cafe-backend)
   └─ GitHub Actions                      └─ GitHub Actions
        ├─ npm ci                              ├─ npm ci --omit=dev
        ├─ npm run build:standalone            ├─ node --check every src/*.js
        │    ← fails deploy on a TS error      ├─ tar src + node_modules
        ├─ tar the standalone bundle           └─ scp to the server
        └─ scp to the server                        └─ deploy/release.sh
             └─ deploy/release.sh                        ├─ unpack to releases/<sha>
                  ├─ unpack to releases/<sha>            ├─ link shared/.env + uploads
                  ├─ flip `current` atomically           ├─ flip `current` atomically
                  ├─ pm2 startOrReload (cluster)         ├─ pm2 startOrReload (fork)
                  ├─ health-check :3100/                 ├─ health-check :4000/health
                  │    └─ on failure: roll back          │    └─ on failure: roll back
                  └─ keep 5 newest releases              └─ keep 5 newest releases
```

## One domain, two processes

nginx terminates TLS and routes by path. Both Node processes bind to loopback
only, so neither is directly reachable from the internet.

```
https://YOUR_DOMAIN
 ├─ /api/*       ─┐
 ├─ /uploads/*    ├─→ 127.0.0.1:4000   Express  (church-cafe-backend)
 ├─ /socket.io/   │
 ├─ /health      ─┘
 └─ /*            ─→ 127.0.0.1:3100   Next.js  (church-cafe-frontend)
```

Same-origin is a **requirement**, not a preference. In production
[socket.ts](src/app/_lib/socket.ts) calls `io()` with no URL, so the browser
opens the Socket.IO connection against the page's own origin. Serving the API
from a second hostname would silently break realtime — the barista board would
stop updating — until that file is changed.

Because it is all one origin, `CORS_ORIGIN` is barely load-bearing and no
preflight ever crosses a hostname boundary.

Port 3000 is furniture-shop's. The cafe frontend uses 3100.

### Layout on the server

```
/var/www/church-cafe-frontend/
├── current -> releases/8f3a91c…      # atomically swapped each deploy
├── ecosystem.config.js               # PM2 config, refreshed from each release
├── logs/{out,error}.log
└── releases/…                        # 5 kept, for rollback

/var/www/church-cafe-backend/
├── current -> releases/2b4c77e…
├── ecosystem.config.js
├── logs/{out,error}.log
├── shared/                           # OUTLIVES every release
│   ├── .env                          # secrets, mode 600, never in git
│   └── uploads/{products,users}/     # symlinked into each release
└── releases/…
```

`shared/` is the whole reason the backend has its own `release.sh`. Product and
avatar images are written by multer into `<release>/uploads/` and served from
there by `express.static`; without the symlink, every deploy would orphan every
image uploaded since the previous one.

---

## One-time setup

### 1. Create a deploy key

On your Mac. This key is only ever used by GitHub Actions to reach the server —
give it no passphrase, since CI can't type one.

```bash
ssh-keygen -t ed25519 -C "github-actions-church-cafe" -f ~/.ssh/church-cafe-deploy -N ""
```

That writes `church-cafe-deploy` (private — goes into a GitHub secret) and
`church-cafe-deploy.pub` (public — goes onto the server). Never commit either.

### 2. Provision the server

`server-setup.sh` is additive: it installs only what is missing, **appends** to
`authorized_keys` rather than overwriting it, and leaves the furniture-shop
nginx site, PM2 app and release directories alone. It is idempotent.

It provisions **both** cafe processes, because one nginx site fronts them.

```bash
scp -r deploy ~/.ssh/church-cafe-deploy.pub root@YOUR_SERVER_IP:/tmp/
```

Then, on the server:

```bash
sudo DOMAIN=YOUR_DOMAIN DEPLOY_PUBKEY="$(cat /tmp/church-cafe-deploy.pub)" bash /tmp/deploy/server-setup.sh
```

It installs MySQL if absent, creates `church_cafe_db` and a
`church_cafe@localhost` user with a generated password, and writes
`/var/www/church-cafe-backend/shared/.env` with that password plus a freshly
generated `JWT_SECRET`. **The password is printed once at the end** — copy it if
you want it, though it is already in the `.env` (mode 600).

Re-running the script leaves an existing `.env` untouched, because rotating
`JWT_SECRET` would sign every logged-in user out.

### 3. Load the database schema

The SQL lives in the backend repo. From `my-church-cafe-backend/`:

```bash
scp -r scripts deploy@YOUR_SERVER_IP:/tmp/cafe-sql
```

Then on the server, **in this order** — the migrations are plain `ALTER TABLE`
statements and are not idempotent, so run each exactly once:

```bash
cd /tmp/cafe-sql
mysql -u church_cafe -p church_cafe_db < schema.sql
mysql -u church_cafe -p church_cafe_db < migration_drink_subtypes.sql
mysql -u church_cafe -p church_cafe_db < migration_dessert_category.sql
mysql -u church_cafe -p church_cafe_db < migration_user_picture.sql
mysql -u church_cafe -p church_cafe_db < migration_order_item_options.sql
mysql -u church_cafe -p church_cafe_db < migration_drink_options_tables.sql
mysql -u church_cafe -p church_cafe_db < migration_organizations.sql
mysql -u church_cafe -p church_cafe_db < migration_order_comments.sql
mysql -u church_cafe -p church_cafe_db < migration_order_customer_name.sql
mysql -u church_cafe -p church_cafe_db < migration_product_available_until.sql
```

`schema.sql` starts with `CREATE DATABASE IF NOT EXISTS` and `USE`, so it is
happy to run against the database the setup script already made.

**Migrating existing data instead?** Dump from the old VPS and load it in place
of `schema.sql` and the migrations — the dump already has every column:

```bash
# on the OLD server
mysqldump -u root -p --single-transaction church_cafe_db > cafe.sql
# on the NEW server, after scp'ing it across
mysql -u church_cafe -p church_cafe_db < cafe.sql
```

Copy `uploads/` across too, or every product image 404s:

```bash
rsync -av OLD_SERVER:/path/to/old/apps/backend/uploads/ \
          deploy@YOUR_SERVER_IP:/var/www/church-cafe-backend/shared/uploads/
```

### 4. Pin the server's host key

This is what stops a hijacked DNS record from collecting your deploy key.

```bash
ssh-keyscan -t ed25519 YOUR_SERVER_IP
```

Verify it matches the server itself before trusting it — run this **on the
server** and check the fingerprints agree:

```bash
ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub
```

### 5. Add the GitHub secrets and variables

Both repos need the same four secrets: **Settings → Secrets and variables →
Actions**.

| Secret | Value |
| --- | --- |
| `DEPLOY_HOST` | Server IP or hostname |
| `DEPLOY_USER` | `deploy` |
| `DEPLOY_SSH_KEY` | Full contents of `~/.ssh/church-cafe-deploy` (the **private** key, including the `-----BEGIN`/`-----END` lines) |
| `DEPLOY_KNOWN_HOSTS` | The `ssh-keyscan` output from step 4 |

The **frontend** repo also needs two repository *variables* (not secrets — these
end up in the browser bundle either way):

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | `https://YOUR_DOMAIN` — the site's own origin, not a separate API host |
| `NEXT_PUBLIC_ORG_NAME` | Organization name for the guest `/orders` board (`Default` unless you changed it) |

The build fails fast if `NEXT_PUBLIC_API_URL` is unset, rather than shipping an
app with no backend to call.

If the server uses a non-standard SSH port, add a repository **variable** named
`DEPLOY_PORT` in both repos. It defaults to `22`.

The old `HOST` / `USERNAME` / `PRIVATE_KEY` / `SSH_PORT` secrets pointed at the
previous VPS and are no longer read — delete them.

### 6. DNS and TLS

Point the domain's `A` record at the server, wait for it to resolve, then:

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d YOUR_DOMAIN -d www.YOUR_DOMAIN
```

If `www.YOUR_DOMAIN` has no DNS record, drop that second `-d` — certbot fails
the whole run if any name doesn't resolve — and remove `www.YOUR_DOMAIN` from
`server_name` in `/etc/nginx/sites-available/church-cafe`.

Certbot rewrites `/etc/nginx/sites-available/church-cafe` in place, adding the
TLS block and the HTTP→HTTPS redirect, and installs a renewal timer. Don't
hand-edit the TLS config afterwards — let certbot own it.

### 7. First deploy

Push to `prod` in the **backend** repo first (the frontend is useless without an
API), then the frontend. Or trigger both from the Actions tab.

Until the first deploy lands, `current` doesn't exist and nginx returns 502.
That's expected.

---

## Everyday use

Push to `prod`. That's it.

Then sync the branches, per the project rule — for whichever repo you changed:

```bash
git push origin prod
git checkout main    && git merge prod --ff-only && git push origin main    && git checkout prod
git checkout partial && git merge prod --ff-only && git push origin partial && git checkout prod
```

Deploys are serialised by a `concurrency` group, so two pushes in quick
succession queue rather than race for the symlink. The two repos have separate
groups and can deploy simultaneously.

## Rollback

A release that fails its health check rolls itself back automatically. To go
back further by hand, SSH in as `deploy`:

```bash
ls -1t /var/www/church-cafe-frontend/releases
```

```bash
APP=/var/www/church-cafe-frontend   # or church-cafe-backend
ln -sfn $APP/releases/OLD_SHA $APP/.current.tmp && mv -Tf $APP/.current.tmp $APP/current
pm2 reload $APP/ecosystem.config.js --update-env
```

Reverting the commit on `prod` and pushing does the same thing through the
pipeline and keeps git honest about what's deployed. Prefer it when you have
the time.

## Troubleshooting

```bash
pm2 status                                   # all three apps on the box
pm2 logs church-cafe-backend --lines 100
curl -sS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3100/        # frontend
curl -sS http://127.0.0.1:4000/health                                    # backend
```

**502 from nginx** — the Node process isn't listening. Check `pm2 status` and
`pm2 logs`. After a reboot, `pm2 resurrect` should have restored it; if not,
re-run the `pm2 startup` line from `deploy/server-setup.sh`.

**Deploy fails at "Activate release"** — read the Actions log; `release.sh`
prints the last 50 PM2 log lines on failure, and the previous release is already
serving again.

**Permission denied (publickey)** — the `DEPLOY_SSH_KEY` secret is usually
missing its trailing newline or the `-----END` line. Re-paste the whole file.

**Realtime dead, everything else fine** — nginx isn't upgrading the WebSocket.
Confirm the `/socket.io/` block is present and that
`map $http_upgrade $church_cafe_conn_upgrade` survived certbot's rewrite.

**413 on image upload** — nginx's `client_max_body_size` (20m) must stay above
the backend's `UPLOAD_MAX_IMAGE_MB` (15).

**Backend running with default secrets** — it shouldn't be; `release.sh` refuses
to deploy if `shared/.env` is missing. If you ever see
`JWT_SECRET=change_this_secret` in effect, that file was deleted.

## Local production preview

`next start` no longer works with `output: "standalone"`. To run the real
production bundle locally:

```bash
npm run build:standalone && npm run start:standalone
```

`npm run dev` is unaffected.

## Notes

- **`NEXT_PUBLIC_*` is baked in at build time**, not read at runtime. Changing
  `NEXT_PUBLIC_API_URL` needs a rebuild — a PM2 restart won't pick it up. Every
  route in this app prerenders as static, so there is no server-side read of it
  at all.
- **The build must run on Linux**, and the server's Node major must match
  `node-version` in the workflows (currently 22). The pipeline ships a prebuilt
  `node_modules` / standalone bundle; a mismatch is asking for trouble. Don't
  shortcut it by rsyncing a local build.
- **The backend runs in PM2 fork mode with one instance, deliberately.** It
  holds Socket.IO room state (`user:{id}`, `staff`) in memory. Cluster mode
  would spread clients over workers that share nothing, so a status change
  emitted by one worker would never reach a barista connected to another.
  Scaling out needs `@socket.io/redis-adapter` first. The frontend is stateless
  and does run in cluster mode.
- **A backend deploy is a restart, not a rolling reload** — fork mode has no
  second worker to hand over to. Expect a sub-second gap in which sockets drop;
  `WebSocketContext` reconnects on its own.
- **The receipt printer will not work from this VPS.** `PRINTER_HOST` was
  `192.168.0.68`, a church-LAN address a public server cannot route to, so
  `server-setup.sh` leaves it unset. Printing is best-effort by design: orders
  still get created and staff get a `printer:unavailable` socket event telling
  them to write the ticket down. Restoring it needs a tunnel or VPN back to the
  church network (e.g. Tailscale on both the VPS and a machine on that LAN),
  then setting `PRINTER_HOST` in `shared/.env` and running
  `pm2 restart church-cafe-backend`.
- **`npm run lint` is not a CI gate.** This repo has a flat `eslint.config.mjs`,
  which Next 14's `next lint` doesn't read — it prompts interactively instead,
  and `@eslint/eslintrc` isn't installed. `next build` type-checks and is the
  real gate. Fixing lint means either downgrading to `.eslintrc.json` or moving
  to `eslint` directly.
- **The mobile app points at the old backend.** `my-church-cafe-mobile` resolves
  its API base from `EXPO_PUBLIC_API_URL` → `app.json` `extra.apiUrl`. Update it
  to `https://YOUR_DOMAIN` and rebuild the app; it is not part of this pipeline.
- **Secrets stay on the server.** `shared/.env` is never in git and never in the
  build artifact. To change one, edit it on the server and
  `pm2 restart church-cafe-backend` — no redeploy needed.
