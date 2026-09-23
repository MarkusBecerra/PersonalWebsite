import type { APIRoute } from 'astro'

import {
	UNLOCK_COOKIE,
	UNLOCK_MAX_AGE,
	UNLOCK_PAGE,
	equals,
	getSitePassword,
	safeRedirectPath,
	unlockToken
} from '@/site-lock'

export const prerender = false

/** Checks the submitted password and, if it matches, drops the unlock cookie. */
export const POST: APIRoute = async ({ cookies, redirect, request }) => {
	const form = await request.formData()
	const submitted = String(form.get('password') ?? '')
	const next = safeRedirectPath(String(form.get('next') ?? ''))

	// Comparing digests rather than the raw strings keeps both sides the same
	// length, so the comparison can't be timed to learn the password's length.
	const expected = await unlockToken(getSitePassword())
	if (!equals(await unlockToken(submitted), expected)) {
		return redirect(`${UNLOCK_PAGE}?error=1&next=${encodeURIComponent(next)}`, 303)
	}

	cookies.set(UNLOCK_COOKIE, expected, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: import.meta.env.PROD,
		maxAge: UNLOCK_MAX_AGE
	})

	return redirect(next, 303)
}

/** Nothing to show here — bounce stray GETs back to the gate. */
export const GET: APIRoute = ({ redirect }) => redirect(UNLOCK_PAGE, 303)
