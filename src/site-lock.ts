/**
 * Temporary "under construction" gate.
 *
 * While the site is locked every page is rendered on demand and hidden behind
 * `/unlock`. Flip `SITE_LOCKED` to `false` in the deployment environment to take
 * the site public again — the whole site goes back to being statically built and
 * no code needs to change.
 *
 * This is a "closed for the season" sign, not an auth system: one shared
 * password, no accounts, no rate limiting.
 */

/** Read at build time (astro.config.mjs) and at request time (middleware). */
export function isSiteLocked(): boolean {
	return readEnv('SITE_LOCKED') !== 'false'
}

/**
 * Fallback password, used when `SITE_PASSWORD` is not set in the environment.
 * This repository is public, so anyone reading it can see this value — set
 * `SITE_PASSWORD` in the Vercel project if you want one that isn't on GitHub.
 */
const FALLBACK_PASSWORD = 'goldenhour'

export function getSitePassword(): string {
	return readEnv('SITE_PASSWORD') || FALLBACK_PASSWORD
}

export const UNLOCK_COOKIE = 'site-unlock'
export const UNLOCK_PAGE = '/unlock'
export const UNLOCK_ENDPOINT = '/api/unlock'

/** How long a successful unlock is remembered for. */
export const UNLOCK_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

/**
 * Paths that stay reachable while locked: the gate itself, plus the static
 * assets it needs to render. On Vercel these assets are served straight off the
 * filesystem and never reach this middleware, but `astro dev` routes them
 * through it, so the allowlist keeps both environments behaving the same.
 */
const OPEN_PREFIXES = [UNLOCK_PAGE, UNLOCK_ENDPOINT, '/_astro/', '/fonts/', '/favicon/']

export function isOpenPath(pathname: string): boolean {
	return OPEN_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix))
}

/**
 * The cookie holds a digest of the password rather than the password itself, so
 * a leaked cookie doesn't hand over the password, and rotating `SITE_PASSWORD`
 * invalidates every cookie that's already out there.
 */
export async function unlockToken(password: string): Promise<string> {
	const bytes = new TextEncoder().encode(`site-unlock:${password}`)
	const digest = await crypto.subtle.digest('SHA-256', bytes)
	return Array.from(new Uint8Array(digest))
		.map((byte) => byte.toString(16).padStart(2, '0'))
		.join('')
}

export async function isUnlocked(cookieValue: string | undefined): Promise<boolean> {
	if (!cookieValue) return false
	return equals(cookieValue, await unlockToken(getSitePassword()))
}

/** Compares without leaking where the mismatch is via timing. */
export function equals(a: string, b: string): boolean {
	if (a.length !== b.length) return false
	let diff = 0
	for (let i = 0; i < a.length; i++) {
		diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
	}
	return diff === 0
}

/**
 * Prevents `?next=` from bouncing a visitor to another origin once they unlock.
 * Only same-origin, absolute paths are allowed through.
 */
export function safeRedirectPath(value: string | null | undefined, fallback = '/'): string {
	if (!value) return fallback
	if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return fallback
	return value
}

/**
 * `import.meta.env` carries values inlined at build time; `process.env` carries
 * whatever the server was started with. Checking both means the same helper
 * works in the config, during prerendering, and inside a running function.
 */
function readEnv(key: string): string | undefined {
	const buildEnv = import.meta.env as Record<string, string | undefined> | undefined
	const fromBuild = buildEnv?.[key]
	if (fromBuild !== undefined) return fromBuild
	return typeof process !== 'undefined' ? process.env?.[key] : undefined
}
