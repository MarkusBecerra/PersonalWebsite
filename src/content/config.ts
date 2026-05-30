import { defineCollection, z } from 'astro:content'
import { glob } from 'astro/loaders'

function removeDupsAndLowerCase(array: string[]) {
	if (!array.length) return array
	const lowercaseItems = array.map((str) => str.toLowerCase())
	const distinctItems = new Set(lowercaseItems)
	return Array.from(distinctItems)
}

// The three pillars of the site + a catch-all. `engineering` covers tech/software,
// `music` covers DJ/production, `recreation` covers climbing/hobbies.
export const CATEGORIES = ['engineering', 'music', 'recreation', 'general'] as const

const blog = defineCollection({
	// Content Layer glob loader — Markdown + MDX live in src/content/blog.
	// Files/folders starting with "_" (e.g. _template.md) are excluded.
	loader: glob({
		pattern: ['**/*.{md,mdx}', '!**/_*', '!**/_*/**'],
		base: './src/content/blog'
	}),
	schema: ({ image }) =>
		z.object({
			title: z.string().max(80),
			description: z.string().min(20).max(160),
			pubDate: z
				.string()
				.or(z.date())
				.transform((val) => new Date(val)),
			updatedDate: z
				.string()
				.optional()
				.transform((str) => (str ? new Date(str) : undefined)),
			category: z.enum(CATEGORIES).default('general'),
			tags: z.array(z.string()).default([]).transform(removeDupsAndLowerCase),
			heroImage: z
				.object({
					src: image(),
					alt: z.string()
				})
				.optional(),
			draft: z.boolean().default(false),
			ogImage: z.string().optional()
		})
})

export const collections = { blog }
