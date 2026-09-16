# Personal Website

My personal site serving as an online resume, blog, and a place to share my hobbies.

## Features

- Astro v4
- TailwindCSS utility classes
- ESLint / Prettier pre-installed and pre-configured
- Accessible, semantic HTML markup
- Responsive & SEO-friendly
- Dark / Light mode, using Tailwind and CSS variables (referenced from shadcn)
- [Astro Assets Integration](https://docs.astro.build/en/guides/assets/) for optimised images
- MD & [MDX](https://docs.astro.build/en/guides/markdown-content/#mdx-only-features) posts
- Pagination
- [Automatic RSS feed](https://docs.astro.build/en/guides/rss)
- Auto-generated [sitemap](https://docs.astro.build/en/guides/integrations-guide/sitemap/)
- [Expressive Code](https://expressive-code.com/) source code and syntax highlighter

## Site lock (temporary)

The site is currently behind an "under construction" password page. Visitors are
redirected to `/unlock` until they enter the site password, which is remembered
in a cookie for 30 days.

| Variable        | Default      | What it does                                                                |
| --------------- | ------------ | --------------------------------------------------------------------------- |
| `SITE_LOCKED`   | `true`       | Set to `false` to take the site public again.                               |
| `SITE_PASSWORD` | `goldenhour` | The shared password. Set this in Vercel to use one that isn't in this repo. |

While locked, every page is rendered on demand so the middleware in
`src/middleware.ts` can gate it — prerendered pages are served straight off
Vercel's filesystem and never reach middleware. The sitemap is skipped and every
page is marked `noindex`. Setting `SITE_LOCKED=false` restores the fully static
build, the sitemap, and normal indexing, with no code changes.

`SITE_LOCKED` decides how the site is built, so changing it needs a redeploy.
`SITE_PASSWORD` is read per request and is never baked into the bundle, but
Vercel still needs a redeploy for a new value to reach the running function.

Two caveats worth knowing:

- **This repository is public**, so the site's content — posts and all — is
  already readable on GitHub. The gate hides the deployed site, not the source.
- Files under `public/` (favicons, fonts, `social-card.png`) are served straight
  off the filesystem and stay reachable by direct URL. Page content does not.

`security.checkOrigin` is turned off in `astro.config.mjs`. Astro's cross-origin
form check rebuilds the request URL and, with no `allowedDomains` configured,
falls back to a `localhost` origin that never matches the browser's — which would
403 the unlock form on every deployed domain while working fine in `astro dev`.
The only POST on this site is that form, and forging one could at most set the
unlock cookie for someone who already knows the password.

To remove the gate for good, delete `src/site-lock.ts`, `src/middleware.ts`,
`src/pages/unlock.astro` and `src/pages/api/unlock.ts`, then restore
`output: 'static'`, the unconditional `sitemap()`, and Astro's default
`security` in `astro.config.mjs`.

## Credits

- [astro-theme-cactus](https://github.com/chrismwilliams/astro-theme-cactus) for blog design
- [minirezume-framer](https://minirezume.framer.website/) for resume homepage design
