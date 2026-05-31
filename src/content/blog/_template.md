---
# Copy this file to start a new post, e.g.:
#   cp src/content/blog/_template.md src/content/blog/my-new-post.md
# The file name becomes the URL slug:  /blog/my-new-post
#
# Files or folders starting with "_" are IGNORED by Astro, so this
# template will never be published. Delete these comments in your copy.

title: 'Your post title (max 80 chars)'
description: 'A one or two sentence summary, 20–160 characters. Shows in lists and link previews.'
pubDate: 2026-01-01 # YYYY-MM-DD
# category must be one of: engineering | music | recreation | general
category: 'general'
# tags are optional; lowercased + de-duped automatically
tags: ['example', 'draft']
# Optional fields ↓ (delete if unused)
# updatedDate: 2026-01-15
# heroImage:
#   src: './my-image.jpg'   # relative to this file
#   alt: 'Describe the image'
# draft: true               # drafts are hidden in production builds
---

Write your post here in **Markdown**. The first paragraph reads like a lede.

## A heading

- Bullet points
- `inline code`
- [links](https://example.com)

```ts
// Fenced code blocks get syntax highlighting automatically.
const hello = 'world'
```

> A blockquote for emphasis.

That's it — save the file and it appears on `/blog` and the home page.
