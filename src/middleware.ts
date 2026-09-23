import { defineMiddleware } from 'astro:middleware'

import { UNLOCK_COOKIE, UNLOCK_PAGE, isOpenPath, isSiteLocked, isUnlocked } from '@/site-lock'

/**
 * Sends every visitor to `/unlock` until they've entered the site password.
 *
 * When `SITE_LOCKED=false` this is a no-op and the site prerenders exactly as it
 * did before the gate existed.
 */
export const onRequest = defineMiddleware(async (context, next) => {
	if (!isSiteLocked()) return next()

	const { pathname, search } = context.url
	if (isOpenPath(pathname)) return next()

	if (await isUnlocked(context.cookies.get(UNLOCK_COOKIE)?.value)) return next()

	const destination = `${pathname}${search}`
	return context.redirect(`${UNLOCK_PAGE}?next=${encodeURIComponent(destination)}`)
})
