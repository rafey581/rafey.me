# Hosting rafey.me on Cloudflare

The site is served by the Cloudflare Worker **`rafey-me`** using Workers static assets. Cloudflare's GitHub integration (Workers Builds) runs `npx wrangler deploy` on every push to `main`, so **deploying = pushing to `main`**. Cost: free plan.

## Files that control hosting
| File | Purpose |
|---|---|
| `wrangler.jsonc` | Worker name (`rafey-me`, must match the dashboard), serve the repo root, `404.html` for unknown URLs |
| `_headers` | Security headers (CSP, HSTS, frame/permissions policies) and cache rules |
| `.assetsignore` | Repo internals that are never uploaded (`.git`, docs, README, config) |

## One-time dashboard checklist
1. **Domains:** Workers & Pages → `rafey-me` → Settings → *Domains & Routes* → make sure **`rafey.me`** and **`www.rafey.me`** are attached as custom domains.
2. **www → apex redirect** (one canonical address for SEO): `rafey.me` zone → Rules → *Redirect Rules* → **Create from template → "Redirect from WWW to root"** → Deploy.
3. **SSL/TLS:** `rafey.me` zone → SSL/TLS → Edge Certificates → turn on **Always Use HTTPS**.
4. **Build settings:** Workers & Pages → `rafey-me` → Settings → *Build* → deploy command `npx wrangler deploy`, root directory `/`, production branch `main`.
5. **GitHub Pages off:** GitHub repo → Settings → Pages → Source **None / Unpublish**, otherwise the site is duplicated at `rafey581.github.io/rafey.me`.
6. **Search Console:** add a *Domain* property for `rafey.me`, add the TXT record it gives you in Cloudflare DNS, then submit `https://rafey.me/sitemap.xml`.

## Check it's working
```bash
curl -sI https://rafey.me/ | grep -iE "^HTTP|content-security|strict-transport"
```
Or run the site through <https://securityheaders.com>.

## Preview locally exactly like production
```bash
npx wrangler dev
```
Then open http://localhost:8787. It serves the site with the same headers and 404 handling.

## Rollback
Workers & Pages → `rafey-me` → *Deployments* → pick an earlier version → **Rollback**. Or revert the commit on `main`.
