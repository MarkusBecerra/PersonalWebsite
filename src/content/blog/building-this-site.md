---
title: 'Building this site with Astro and Tailwind'
description: 'Why I rebuilt my corner of the web on Astro — content collections, islands, and a warm golden-hour palette.'
pubDate: 2026-05-20
category: 'engineering'
tags: ['astro', 'tailwind', 'web']
---

I wanted a place that loads instantly, reads beautifully, and gets out of the way.
Astro turned out to be the right tool: ship zero JavaScript by default, reach for
an island only when a component genuinely needs interactivity.

## The stack

- **Astro** for routing, content collections, and static rendering.
- **Tailwind** for a small, consistent design system.
- **MDX** so posts can drop in a component when prose isn't enough.

## Content collections

Every post lives in `src/content/blog` and is validated against a schema at build
time. If I forget a `description` or fat-finger a `category`, the build tells me
before anything ships.

```ts
const blog = defineCollection({
  type: 'content',
  schema: ({ image }) =>
    z.object({
      title: z.string().max(80),
      pubDate: z.date(),
      category: z.enum(['engineering', 'music', 'recreation', 'general'])
    })
})
```

That's the whole idea — fast, typed, and calm. More soon.
