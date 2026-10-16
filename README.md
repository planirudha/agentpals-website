# AgentPals — website

A fast, dependency-free static site (HTML + CSS + vanilla JS). There is no build step, so it deploys straight to GitHub Pages.

```
Static Website/
├── index.html          # the landing page
├── 404.html            # custom "not found" page
├── css/style.css       # all styles (design tokens at the top)
├── js/main.js          # interactions (config at the top)
├── assets/             # favicon, social preview image
├── robots.txt
└── .nojekyll           # tells GitHub Pages to serve files as-is
```

## Preview locally

```bash
cd "Static Website"
python3 -m http.server 8000
# open http://localhost:8000
```

## Make it yours (checklist)

| What | Where |
|---|---|
| Headline, copy, FAQ, pricing | `index.html` (each section is marked with a `<!-- ==== NAME ==== -->` comment) |
| Brand colors | `css/style.css` → `--brand` (#006DFB), `--brand-2`, `--cyan` at the top |
| Contact email | `js/main.js` → `CONTACT_EMAIL`, and the footer `mailto:` in `index.html` |
| Waitlist storage | `js/main.js` → `FORM_ENDPOINT` (see below) |
| Logo | Mark: the `<symbol id="ap-mark">` SVG at the top of `index.html` + `assets/favicon.svg`. Wordmark: `assets/wordmark.png` (cropped from `assets/agentpals-logo.png` and used as a CSS mask, so it turns dark in light mode) |

### Collecting waitlist emails
GitHub Pages can't run a backend, so use a form service:
1. Create a free form at [Formspree](https://formspree.io) (or Getform/Basin).
2. Paste its endpoint into `FORM_ENDPOINT` in `js/main.js`, e.g. `https://formspree.io/f/abcd1234`.

Until you do that, the form opens the visitor's email app addressed to `CONTACT_EMAIL`.

## Deploy to GitHub Pages

1. **Create a repo** on GitHub, e.g. `agentpals-website` (Public, or Private if you have GitHub Pro/Team).
2. **Push this folder** as the repo root:
   ```bash
   cd "/storage-01/apoovalakunta/dev_kit/Agent/Static Website"
   git init -b main
   git add .
   git commit -m "Initial website"
   git remote add origin https://github.com/<your-username>/agentpals-website.git
   git push -u origin main
   ```
3. On GitHub, go to **Settings → Pages**, then:
   - Source: **Deploy from a branch**
   - Branch: **main**, folder **/ (root)**, then **Save**
4. After about a minute the site is live at `https://<your-username>.github.io/agentpals-website/`.

> Tip: if you name the repo `<your-username>.github.io`, the site is served at `https://<your-username>.github.io/` instead.

Every `git push` to `main` redeploys automatically.

## Later: connect your custom domain

Do these steps once the site is live.

1. **In GitHub**, go to **Settings → Pages → Custom domain**, enter `www.yourdomain.com` and save.
   GitHub adds a `CNAME` file to the repo. Run `git pull` so your local copy has it too.
2. **At your domain registrar's DNS settings** (GoDaddy, Namecheap, Cloudflare, …), add these records:

   | Type | Name/Host | Value |
   |---|---|---|
   | CNAME | `www` | `<your-username>.github.io` |
   | A | `@` | `185.199.108.153` |
   | A | `@` | `185.199.109.153` |
   | A | `@` | `185.199.110.153` |
   | A | `@` | `185.199.111.153` |
   | AAAA (optional) | `@` | `2606:50c0:8000::153`, `…8001::153`, `…8002::153`, `…8003::153` |

   The A records make the bare `yourdomain.com` work and redirect it to `www`.
3. Wait for DNS to update (from a few minutes up to 24h). Then in **Settings → Pages**, tick **Enforce HTTPS**.
4. Recommended: **verify the domain** under GitHub **Settings (your profile) → Pages → Add a verified domain**, so nobody else can claim it.
5. Update `og:image` in `index.html` to an absolute URL, e.g. `https://www.yourdomain.com/assets/og-image.png`.

## Notes
- `404.html` uses root-absolute paths (`/css/style.css`). It looks right on a custom domain or a `username.github.io` repo. On a project URL (`…github.io/agentpals-website/`) it shows up unstyled until you add the domain.
- Social sites (LinkedIn, X, Slack) don't render SVG preview images. Export `assets/og-image.svg` to a 1200×630 PNG and point `og:image` at it.
- The playground and hero console are **simulated** animations. Replace the scripted messages in `js/main.js` (`MISSIONS`, `script`) with flows that match your real product.
- Before launch, add real customer logos, testimonials and metrics only once you have them.
- Accessibility: keyboard navigable, skip link, ARIA tabs, live regions, and full `prefers-reduced-motion` support.
