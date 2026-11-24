/**
 * The site's content in one place, so the default pages and the experimental
 * versions under /lab read from the same source. Edit here, and every version
 * of the site picks it up.
 */

export const email = 'markusbecerra@gmail.com'

// ─── About ────────────────────────────────────────────────────────────────────
// Replace the placeholder paragraphs with your own words. The first is the lead.
export const bio: string[] = [
	'[Your bio goes here. A few sentences about who you are, what you do, and what drives you. Keep it personal and genuine.]',
	"[Add a second paragraph if you'd like — maybe where you're based, your background, or what you're currently working on.]"
]

// Add, remove, or reorder freely — they render as one comma-separated sentence.
export const hobbies = [
	'Software Engineering',
	'DJing',
	'Music Production',
	'Bouldering',
	'Rock Climbing',
	'Hiking'
]

export const hobbyList = new Intl.ListFormat('en', { type: 'conjunction' }).format(hobbies)

// What I'm in the middle of, one row per hat. Rewrite these as they change;
// `href` is optional. Keep it to three or four rows.
export const currently: Array<{ verb: string; what: string; href?: string }> = [
	{ verb: 'Building', what: 'this site, in Astro and Tailwind', href: '/blog/building-this-site/' },
	{
		verb: 'Mixing',
		what: 'a golden-hour house set for the rooftop',
		href: '/blog/sunset-set-notes/'
	},
	{
		verb: 'Projecting',
		what: 'a V5 slab that keeps sending me home',
		href: '/blog/project-of-the-week/'
	}
]

// Update each `href` and `handle` with your actual profile URLs.
// Set `deprecated: true` to dim the row and mark it as no longer active.
export const socials = [
	{
		label: 'X / Twitter',
		handle: '@markusbecerra',
		href: 'https://x.com/markusbecerra',
		deprecated: false,
		icon: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.741l7.732-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z'
	},
	{
		label: 'Instagram',
		handle: '@markusbecerra',
		href: 'https://instagram.com/markusbecerra',
		deprecated: false,
		icon: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z'
	},
	{
		label: 'SoundCloud',
		handle: 'markusbecerra',
		href: 'https://soundcloud.com/markusbecerra',
		deprecated: false,
		icon: 'M11.5 12.5v6h7.7a3.3 3.3 0 0 0 .3-6.59A4.5 4.5 0 0 0 11.5 11zm-1 6V13a2.5 2.5 0 0 0 0 5zm-2-4.8v4.8c-.3 0-.6-.05-.9-.14V13.6c.3-.2.6-.32.9-.4zm-2 1.1v3.5a2 2 0 0 1 0-3.5z'
	},
	{
		label: 'Apple Music',
		handle: 'markusbecerra',
		href: 'https://music.apple.com/',
		deprecated: false,
		icon: 'M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z'
	},
	{
		label: 'Spotify',
		handle: 'markusbecerra',
		href: 'https://open.spotify.com/user/markusbecerra',
		deprecated: true,
		icon: 'M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z'
	},
	{
		label: 'LinkedIn',
		handle: 'Markus Becerra',
		href: 'https://linkedin.com/in/markusbecerra',
		deprecated: false,
		icon: 'M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM8.34 17.34V10.5H6.16v6.84zM7.25 9.31a1.26 1.26 0 1 0 0-2.52a1.26 1.26 0 0 0 0 2.52m10.09 8.03v-3.74c0-2-.43-3.54-2.77-3.54a2.43 2.43 0 0 0-2.19 1.2h-.03V10.5h-2.1v6.84h2.18v-3.39c0-.89.17-1.76 1.28-1.76c1.09 0 1.1 1.02 1.1 1.82v3.33z'
	}
]

// ─── Work ─────────────────────────────────────────────────────────────────────
// Replace / extend with your actual skills and honest levels.
export type SkillLevel = 'advanced' | 'intermediate' | 'beginner'

export const skills: Array<{ name: string; level: SkillLevel }> = [
	{ name: '[Skill A]', level: 'advanced' },
	{ name: '[Skill B]', level: 'advanced' },
	{ name: '[Skill C]', level: 'intermediate' },
	{ name: '[Skill D]', level: 'intermediate' },
	{ name: '[Skill E]', level: 'beginner' }
]

export const skillLevels: SkillLevel[] = ['advanced', 'intermediate', 'beginner']

export const skillsByLevel = skillLevels
	.map((level) => ({ level, names: skills.filter((s) => s.level === level).map((s) => s.name) }))
	.filter((group) => group.names.length > 0)

// One object per role. Fields:
//   employer  — company or organization name
//   title     — your job title / role
//   duration  — e.g. "Jun 2022 – Present" or "Jan 2020 – May 2022"
//   team      — team or department name
//   location  — city, state or "Remote" (optional)
//   skills    — list of tools / languages / frameworks you used in this role
export const experiences: Array<{
	employer: string
	title: string
	duration: string
	team: string
	location?: string
	skills: string[]
}> = [
	{
		employer: '[Company Name]',
		title: '[Your Title]',
		duration: '[Start] – [End or Present]',
		team: '[Team / Department]',
		location: '[City, State or Remote]',
		skills: ['[Skill A]', '[Skill B]', '[Skill C]']
	}
	// Add more entries here ↑
]

// ─── Projects ─────────────────────────────────────────────────────────────────
export type Project = {
	title: string
	description: string
	tags?: string[]
	links?: Array<{ label: string; href: string }>
	badge?: string
}

// To add a mix: open the track/set on SoundCloud → Share → Embed → copy the
// `src` URL from the iframe and paste it below.
export const mixes: Array<{ title: string; embedUrl: string }> = [
	// {
	//   title: 'Rooftop Sunset Set — May 2026',
	//   embedUrl: 'https://w.soundcloud.com/player/?url=https%3A//soundcloud.com/your-handle/your-set&color=%23db9b3b&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&visual=true'
	// }
]

export const soundcloudProfile = 'https://soundcloud.com/' // ← replace with your handle

export const musicRoadmap = [
	{
		title: 'Concert rating system',
		detail:
			'Log every show — artist, venue, date — with a personal rating and a short review. Sortable by score, recency, and genre.',
		status: 'Next up'
	},
	{
		title: 'Albums & tracks',
		detail:
			'Extend the same rating model to albums and standout tracks, so the whole listening history lives in one place.',
		status: 'Planned'
	},
	{
		title: 'Live SoundCloud activity',
		detail: 'Auto-pull recent reposts, likes, and uploads instead of hand-curating embeds.',
		status: 'Exploring'
	}
]

// Software / side projects. `badge` is a short status label, e.g. 'Active', 'Shipped'.
export const softwareProjects: Project[] = [
	// {
	//   title: 'Personal Website',
	//   description: 'This site — built with Astro 5, Tailwind CSS, and deployed on Vercel.',
	//   tags: ['Astro', 'TypeScript', 'Tailwind'],
	//   links: [{ label: 'GitHub', href: 'https://github.com/your-handle/personal-website' }],
	//   badge: 'Active'
	// }
]

// Climbing sends, race results — anything worth tracking.
// Use `badge` for the activity type (e.g. 'Bouldering', 'Running').
export const fitnessProjects: Project[] = [
	// {
	//   title: 'V6 Flash — Movement Oakland',
	//   description: 'Flashed my first V6 bouldering problem. Comp-style set with a big dynamic move to the lip.',
	//   tags: ['Bouldering', 'V6', 'Flash'],
	//   badge: 'Climbing'
	// }
]
