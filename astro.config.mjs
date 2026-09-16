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
import { isSiteLocked } from './src/site-lock'

// While the site is locked, every page has to be rendered on demand so that the
// middleware in src/middleware.ts can gate it — prerendered pages are served
// straight off Vercel's filesystem and never reach middleware. Setting
// SITE_LOCKED=false restores the fully static build.
const locked = isSiteLocked()

// https://astro.build/config
export default defineConfig({
	site: 'https://markusbecerra.com',
	integrations: [
		expressiveCode(expressiveCodeOptions),
		tailwind({
			applyBaseStyles: false
		}),
		// No point advertising pages nobody can read yet.
		...(locked ? [] : [sitemap()]),
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
					rel: ['nofollow, noopener, noreferrer']
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
	adapter: vercel({
		webAnalytics: { enabled: true }
	})
})
