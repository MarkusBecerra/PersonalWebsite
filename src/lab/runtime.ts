/**
 * Small shared helpers for the 3D versions: deciding whether to render 3D at
 * all, and a render loop that stays cheap (pauses when hidden, drops
 * resolution when the device is struggling).
 *
 * Nothing here imports three.js, so it can run before the 3D bundle loads.
 */

export type RenderMode = { mode: '3d' | 'lite'; reason?: string }

const LITE_KEY = 'lab-lite'

/** Remember an explicit choice between the 3D scene and the lightweight page. */
export function setLitePreference(lite: boolean | null) {
	try {
		if (lite === null) localStorage.removeItem(LITE_KEY)
		else localStorage.setItem(LITE_KEY, lite ? '1' : '0')
	} catch {
		/* private mode: the choice just won't stick */
	}
}

function storedLitePreference(): boolean | null {
	try {
		const v = localStorage.getItem(LITE_KEY)
		return v === null ? null : v === '1'
	} catch {
		return null
	}
}

function hasWebGL(): boolean {
	try {
		const c = document.createElement('canvas')
		return !!(c.getContext('webgl2') || c.getContext('webgl'))
	} catch {
		return false
	}
}

/**
 * 3D by default on capable desktops; the lightweight version on phones, on
 * low-end hardware, without WebGL, or when the visitor asked for less motion.
 * `?lite` / `?3d` in the URL, or the in-page toggle, override the guess.
 */
export function decideRenderMode(): RenderMode {
	const params = new URLSearchParams(location.search)
	if (params.has('lite')) return { mode: 'lite', reason: 'Requested with ?lite' }
	if (!hasWebGL()) return { mode: 'lite', reason: 'This browser has no WebGL' }
	if (params.has('3d')) return { mode: '3d' }

	const stored = storedLitePreference()
	if (stored !== null)
		return stored ? { mode: 'lite', reason: 'You chose the lite version' } : { mode: '3d' }

	if (matchMedia('(prefers-reduced-motion: reduce)').matches)
		return { mode: 'lite', reason: 'Your system asks for reduced motion' }

	const coarse = matchMedia('(pointer: coarse)').matches
	if (coarse && Math.min(innerWidth, innerHeight) < 600)
		return { mode: 'lite', reason: 'Phones get the lightweight version' }

	const nav = navigator as Navigator & { deviceMemory?: number }
	if ((nav.deviceMemory ?? 8) < 4 || (navigator.hardwareConcurrency ?? 8) <= 2)
		return { mode: 'lite', reason: 'Saving your battery on a low-power device' }

	return { mode: '3d' }
}

export type Loop = {
	start(): void
	stop(): void
	/** Current pixel ratio the loop wants the renderer at. */
	readonly pixelRatio: number
}

/**
 * requestAnimationFrame loop that:
 *  - stops while the tab is hidden,
 *  - starts at up to 1.75× device pixels and steps down to 1× if frames run
 *    long, so a laptop on battery still gets a smooth scene.
 */
export function createLoop(
	frame: (dt: number, t: number) => void,
	onPixelRatio: (ratio: number) => void
): Loop {
	let raf = 0
	let running = false
	let last = 0
	let pixelRatio = Math.min(window.devicePixelRatio || 1, 1.75)
	let slowFrames = 0
	let sampled = 0

	onPixelRatio(pixelRatio)

	const tick = (now: number) => {
		raf = requestAnimationFrame(tick)
		const dt = Math.min((now - last) / 1000, 0.1)
		last = now
		frame(dt, now / 1000)

		// Adaptive quality: after warm-up, if most frames take > 28ms, drop resolution.
		sampled++
		if (sampled > 30 && dt > 0.028) slowFrames++
		if (sampled === 150) {
			if (slowFrames > 60 && pixelRatio > 1) {
				pixelRatio = Math.max(1, pixelRatio - 0.5)
				onPixelRatio(pixelRatio)
			}
			sampled = 30
			slowFrames = 0
		}
	}

	const start = () => {
		if (running) return
		running = true
		last = performance.now()
		raf = requestAnimationFrame(tick)
	}
	const stop = () => {
		running = false
		cancelAnimationFrame(raf)
	}

	document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()))

	return {
		start,
		stop,
		get pixelRatio() {
			return pixelRatio
		}
	}
}

/** Critically damped approach of `current` to `target`; frame-rate independent. */
export function damp(current: number, target: number, lambda: number, dt: number) {
	return current + (target - current) * (1 - Math.exp(-lambda * dt))
}
