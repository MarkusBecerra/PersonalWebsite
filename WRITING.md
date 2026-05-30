# Writing posts

You add posts by creating files — no code changes, no dev server gymnastics.

## Quick start

```bash
# 1. Copy the template (the file name becomes the URL slug)
cp src/content/blog/_template.md src/content/blog/my-first-post.md

# 2. Edit the frontmatter + body in your editor

# 3. Preview locally
npm run dev        # → http://localhost:4321/blog/my-first-post
```

That's it. The post automatically shows up on `/blog`, in the home page
**Latest posts** list, in the RSS feed, and on its tag pages.

## Where posts live

```
src/content/blog/
├── _template.md          ← copy this to start (ignored by the build)
├── building-this-site.md
├── sunset-set-notes.md
└── project-of-the-week.md
```

- One Markdown (`.md`) or MDX (`.mdx`) file per post.
- The **file name** is the URL slug: `my-post.md` → `/blog/my-post`.
- Anything starting with `_` is ignored — handy for templates and notes.
- You can group posts in subfolders if you like; the folder is part of the slug
  (e.g. `2026/recap.md` → `/blog/2026/recap`).

## Frontmatter schema

Defined and validated in `src/content/config.ts`. If a field is wrong or missing,
the build fails with a clear message before anything ships.

| Field         | Required | Notes                                                          |
| ------------- | -------- | -------------------------------------------------------------- |
| `title`       | yes      | Up to 80 characters.                                           |
| `description` | yes      | 20–160 characters. Used in lists + link previews.              |
| `pubDate`     | yes      | `YYYY-MM-DD`.                                                  |
| `category`    | no       | `engineering` \| `music` \| `recreation` \| `general`. Defaults to `general`. |
| `tags`        | no       | Array of strings; lowercased and de-duped automatically.       |
| `updatedDate` | no       | `YYYY-MM-DD`. Shown as "Updated …".                            |
| `heroImage`   | no       | `{ src: './img.jpg', alt: '…' }`, relative to the post file.   |
| `draft`       | no       | `true` hides the post in production (still visible in `dev`).   |

## Categories

Each post belongs to one of the site's pillars, which is color-coded everywhere
via the category badge:

- **engineering** — software, systems, side projects
- **music** — DJ/production notes (the SoundCloud + concert log lives at `/music`)
- **recreation** — climbing, bouldering, the outdoors
- **general** — everything else

To add or rename a category, edit `CATEGORIES` in `src/content/config.ts` and the
color map in `src/components/CategoryBadge.astro`.

## Images

Drop the image next to your post and reference it relatively:

```yaml
heroImage:
  src: './cover.jpg'
  alt: 'Sunset over the rooftop'
```

Astro optimizes it at build time. Inline images in the body work the same way:
`![alt](./inline.jpg)`.
