import { defineConfig } from 'astro/config'
import mdx from '@astrojs/mdx'
import tailwind from '@astrojs/tailwind'
import sitemap from '@astrojs/sitemap'
import { remarkReadingTime } from './src/utils/remarkReadingTime.ts'
import remarkUnwrapImages from 'remark-unwrap-images'
import rehypeExternalLinks from 'rehype-external-links'
import expressiveCode from 'astro-expressive-code'
import { expressiveCodeOptions } from './src/site.config'
import icon from 'astro-icon'

import vercel from '@astrojs/vercel'
import { loadEnv } from 'vite'
import { isLockedValue } from './src/site-lock'

// Read through Vite so this agrees with what `import.meta.env` hands the running
// site: plain `process.env` misses .env files, which would let the build and the
// server disagree about whether the site is locked.
const env = loadEnv(process.env.NODE_ENV ?? 'production', process.cwd(), '')

// While the site is locked, every page has to be rendered on demand so that the
// middleware in src/middleware.ts can gate it — prerendered pages are served
// straight off Vercel's filesystem and never reach middleware. Setting
// SITE_LOCKED=false restores the fully static build.
const locked = isLockedValue(env.SITE_LOCKED)

// https://astro.build/config
export default defineConfig({
	site: 'https://markusbecerra.com',
	integrations: [
		expressiveCode(expressiveCodeOptions),
		tailwind({
			applyBaseStyles: false
		}),
		// No point advertising pages nobody can read yet. Once public, the gate
		// itself still doesn't belong in the sitemap.
		...(locked ? [] : [sitemap({ filter: (page) => !page.includes('/unlock') })]),
		mdx(),
		icon()
	],
	markdown: {
		remarkPlugins: [remarkUnwrapImages, remarkReadingTime],
		rehypePlugins: [
			[
				rehypeExternalLinks,
				{
					target: '_blank',
					rel: ['nofollow', 'noopener', 'noreferrer']
				}
			]
		],
		remarkRehype: {
			footnoteLabelProperties: {
				className: ['']
			}
		}
	},
	prefetch: true,
	output: locked ? 'server' : 'static',
	// Astro's cross-origin form check compares the browser's Origin header against
	// a URL it rebuilds from the request. With no `allowedDomains` configured it
	// discards the real Host and falls back to `localhost`, so the unlock form
	// would 403 on every deployed domain while working fine in dev. The only POST
	// on this site is that password form, and a forged one could at most set the
	// unlock cookie for someone who already knows the password, so there's nothing
	// here for CSRF to abuse.
	security: { checkOrigin: false },
	adapter: vercel({
		webAnalytics: { enabled: true }
	})
})
