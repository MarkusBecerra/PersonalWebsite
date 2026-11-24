import { isSiteLocked } from '@/site-lock'

/**
 * Alternate versions of the site, built as experiments ("the lab").
 *
 * The default site stays exactly as it is. Each version below is a separate,
 * self-contained page under /lab that reads the same content from
 * src/data/profile.ts and the blog collection, so you can flip between them
 * with the switcher in the bottom corner and compare.
 */
export type SiteVersion = {
	id: string
	name: string
	blurb: string
	/** Where the version lives. Ideas that aren't built yet have none. */
	href?: string
}

export const siteVersions: SiteVersion[] = [
	{ id: 'paper', name: 'Paper', blurb: 'The current site', href: '/' },
	{ id: 'booth', name: 'Booth', blurb: '3D DJ booth, two decks and a mixer', href: '/lab/booth/' },
	{
		id: 'night-shift',
		name: 'Night shift',
		blurb: 'An old computer in a dark room, rain outside',
		href: '/lab/night-shift/'
	},
	{ id: 'shelf', name: 'Shelf', blurb: 'A bookshelf, one spine per section' },
	{ id: 'plain', name: 'Plain', blurb: 'Minimal, almost text-only' }
]

/** The sections every version has to surface, in nav order. */
export const labSections = [
	{ id: 'about', label: 'About' },
	{ id: 'work', label: 'Work' },
	{ id: 'projects', label: 'Projects' },
	{ id: 'blog', label: 'Blog' }
] as const

export type LabSectionId = (typeof labSections)[number]['id']

/**
 * The switcher shows while the site is behind its password, so it's only ever
 * seen by you. Set PUBLIC_VERSION_SWITCHER=true to keep it after launch, or
 * =false to hide it while still locked.
 */
export function showVersionSwitcher(): boolean {
	const flag = String(import.meta.env.PUBLIC_VERSION_SWITCHER ?? '')
	if (flag === 'true') return true
	if (flag === 'false') return false
	return isSiteLocked()
}
