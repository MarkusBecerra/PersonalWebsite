/**
 * "Level select": a tiny side-scrolling pixel world drawn on a 2D canvas.
 *
 * A kid in headphones walks a street at sunset past four buildings, one per
 * section of the site. Walk up to a door and press up (or tap the building)
 * to go in; the page then opens that section in a text box. Coins along the
 * way are just for fun.
 *
 * Everything is drawn with fillRect at 320×180 and scaled up with
 * `image-rendering: pixelated`, so there are no sprite sheets to download.
 */

export type LevelSection = { id: string; label: string }

export type GameOptions = {
	sections: readonly LevelSection[]
	onEnter(id: string): void
	/** Called with a short sound name; the page decides whether sound is on. */
	onSound(name: 'coin' | 'jump' | 'door'): void
	reducedMotion: boolean
}

export type GameApi = {
	/** Walk to a building and go in, as if the visitor had tapped it. */
	goTo(id: string): void
	/** Put the player back on the street in front of the door they used. */
	exitBuilding(): void
	press(key: 'left' | 'right' | 'jump' | 'enter', down: boolean): void
}

const W = 320
const H = 180
const GROUND = 150
const WORLD = 1000
const FONT = '"Press Start 2P", ui-monospace, monospace'

// Palette.
const C = {
	skin: '#f2c19b',
	hair: '#3a2418',
	phones: '#ff5c8a',
	shirt: '#3ee6a4',
	pants: '#2d4a8a',
	shoe: '#1b1b24',
	white: '#fff7e6',
	ink: '#1a1426'
}

// 12×16 player frames; each char is a palette key (see SPRITE_KEY), '.' is clear.
const SPRITE_KEY: Record<string, string> = {
	h: C.hair,
	s: C.skin,
	p: C.phones,
	t: C.shirt,
	j: C.pants,
	o: C.shoe,
	e: C.ink,
	w: C.white
}
const IDLE = [
	'....hhhh....',
	'...hhhhhh...',
	'..phhhhhhp..',
	'..pssssssp..',
	'..pseesesp..',
	'...ssssss...',
	'....ssss....',
	'...tttttt...',
	'..tttttttt..',
	'..sttttttts.',
	'..s.tttt.s..',
	'....jjjj....',
	'....jjjj....',
	'....j..j....',
	'....j..j....',
	'...oo..oo...'
]
const WALK = [
	...IDLE.slice(0, 11),
	'....jjjj....',
	'...jjjjj....',
	'...j...jj...',
	'..jj....j...',
	'..oo....oo..'
]
const JUMP = [
	...IDLE.slice(0, 7),
	'.s.tttttt.s.',
	'..tttttttt..',
	'...tttttt...',
	'....tttt....',
	'....jjjj....',
	'...jjjjjj...',
	'...j....j...',
	'..oo....oo..',
	'............'
]

type Building = {
	id: string
	label: string
	x: number // left edge
	w: number
	door: number // door centre x
	draw(ctx: CanvasRenderingContext2D, x: number, t: number): void
}

function rect(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	w: number,
	h: number,
	c: string
) {
	ctx.fillStyle = c
	ctx.fillRect(Math.round(x), Math.round(y), w, h)
}

function sign(ctx: CanvasRenderingContext2D, cx: number, y: number, text: string, color: string) {
	ctx.font = `8px ${FONT}`
	const w = Math.ceil(ctx.measureText(text).width) + 8
	rect(ctx, cx - w / 2, y, w, 12, C.ink)
	rect(ctx, cx - w / 2 + 1, y + 1, w - 2, 10, color)
	ctx.fillStyle = C.ink
	ctx.textBaseline = 'top'
	ctx.fillText(text, Math.round(cx - w / 2 + 4), y + 2)
}

function makeBuildings(sections: readonly LevelSection[]): Building[] {
	const spots = [150, 370, 600, 820]
	const drawers: Record<string, Building['draw']> = {
		// A little house with a lit window and smoke from the chimney.
		about(ctx, x, t) {
			rect(ctx, x + 50, GROUND - 74, 8, 16, '#7a3b2e')
			for (let i = 0; i < 3; i++) {
				const k = (t * 0.6 + i / 3) % 1
				ctx.globalAlpha = 0.5 * (1 - k)
				rect(ctx, x + 51 + Math.sin(k * 6 + i) * 3, GROUND - 78 - k * 26, 5, 5, '#d9d2e0')
				ctx.globalAlpha = 1
			}
			for (let r = 0; r < 14; r++)
				rect(
					ctx,
					x + 4 + r * 2,
					GROUND - 58 - r * 1.6 + 0,
					70 - r * 4,
					2,
					r % 3 === 0 ? '#9c3d2f' : '#c4513c'
				)
			rect(ctx, x + 8, GROUND - 52, 62, 52, '#e8d3a8')
			rect(ctx, x + 8, GROUND - 52, 62, 3, '#c9b386')
			rect(ctx, x + 32, GROUND - 26, 14, 26, '#6b3f2a')
			rect(ctx, x + 43, GROUND - 14, 2, 2, '#f0c070')
			rect(ctx, x + 14, GROUND - 40, 12, 12, '#ffd27a')
			rect(ctx, x + 19, GROUND - 40, 2, 12, '#6b3f2a')
			rect(ctx, x + 52, GROUND - 40, 12, 12, '#ffd27a')
			rect(ctx, x + 57, GROUND - 40, 2, 12, '#6b3f2a')
			sign(ctx, x + 39, GROUND - 98, 'ABOUT', '#ff5c8a')
		},
		// An office tower with a grid of windows, some lit.
		work(ctx, x) {
			rect(ctx, x + 6, GROUND - 104, 66, 104, '#3b4a6b')
			rect(ctx, x + 6, GROUND - 104, 66, 4, '#55688f')
			for (let r = 0; r < 7; r++)
				for (let c = 0; c < 5; c++) {
					const lit = (r * 7 + c * 3) % 5 < 2
					rect(ctx, x + 11 + c * 12, GROUND - 96 + r * 11, 8, 7, lit ? '#ffe08a' : '#24304a')
				}
			rect(ctx, x + 26, GROUND - 18, 26, 18, '#1d2436')
			rect(ctx, x + 38, GROUND - 18, 2, 18, '#55688f')
			rect(ctx, x + 18, GROUND - 22, 42, 4, '#55688f')
			sign(ctx, x + 39, GROUND - 120, 'WORK', '#ffb340')
		},
		// A workshop with a roll-up door and a turning gear on the sign.
		projects(ctx, x, t) {
			rect(ctx, x + 4, GROUND - 60, 74, 60, '#8a5a3a')
			rect(ctx, x, GROUND - 66, 82, 8, '#5c3a24')
			for (let i = 0; i < 6; i++)
				rect(ctx, x + 18, GROUND - 46 + i * 7, 46, 5, i % 2 ? '#c8c0b0' : '#a89f8c')
			rect(ctx, x + 18, GROUND - 4, 46, 4, '#2b2b2b')
			// Gear.
			const cx = x + 41
			const cy = GROUND - 82
			for (let k = 0; k < 8; k++) {
				const a = (k / 8) * Math.PI * 2 + t * 1.2
				rect(ctx, cx + Math.cos(a) * 9 - 2, cy + Math.sin(a) * 9 - 2, 4, 4, '#3ee6a4')
			}
			rect(ctx, cx - 6, cy - 6, 12, 12, '#3ee6a4')
			rect(ctx, cx - 2, cy - 2, 4, 4, '#1a1426')
			sign(ctx, x + 41, GROUND - 106, 'PROJECTS', '#3ee6a4')
		},
		// A newsstand-library with an open book on top and papers in the window.
		blog(ctx, x, t) {
			rect(ctx, x + 6, GROUND - 64, 70, 64, '#5a3d6b')
			for (let i = 0; i < 8; i++)
				rect(ctx, x + 2 + i * 10, GROUND - 72, 10, 10, i % 2 ? '#ffffff' : '#5cb8ff')
			rect(ctx, x + 2, GROUND - 62, 80, 2, '#3a2748')
			rect(ctx, x + 12, GROUND - 50, 22, 20, '#ffe9b8')
			for (let i = 0; i < 4; i++)
				rect(ctx, x + 15, GROUND - 46 + i * 4, 16 - (i % 2) * 5, 1, '#8a7a5a')
			rect(ctx, x + 46, GROUND - 34, 18, 34, '#2f1f3a')
			rect(ctx, x + 60, GROUND - 18, 2, 2, '#f0c070')
			// Book sign with pages that flutter.
			const flap = Math.sin(t * 3) > 0.6 ? 1 : 0
			rect(ctx, x + 26, GROUND - 92 - flap, 15, 12, '#fff7e6')
			rect(ctx, x + 42, GROUND - 92 + flap, 15, 12, '#fff7e6')
			rect(ctx, x + 41, GROUND - 93, 1, 14, '#5cb8ff')
			sign(ctx, x + 41, GROUND - 110, 'BLOG', '#5cb8ff')
		}
	}
	return sections.map((s, i) => {
		const w = s.id === 'work' ? 78 : 82
		const x = spots[i] - w / 2
		const doorOffset: Record<string, number> = { about: 39, work: 39, projects: 41, blog: 55 }
		return {
			id: s.id,
			label: s.label,
			x,
			w,
			door: x + (doorOffset[s.id] ?? w / 2),
			draw: drawers[s.id]
		}
	})
}

export function mountGame(canvas: HTMLCanvasElement, opts: GameOptions): GameApi {
	const ctx = canvas.getContext('2d')!
	canvas.width = W
	canvas.height = H
	ctx.imageSmoothingEnabled = false

	const buildings = makeBuildings(opts.sections)
	const coins = Array.from({ length: 12 }, (_, i) => ({
		x: 60 + i * 78 + (i % 2) * 20,
		y: GROUND - 22 - (i % 3) * 14,
		got: false
	}))
	const clouds = Array.from({ length: 7 }, (_, i) => ({
		x: i * 160 + (i % 3) * 40,
		y: 18 + (i % 3) * 14,
		w: 26 + (i % 4) * 8
	}))
	const stars = Array.from({ length: 40 }, (_, i) => ({ x: (i * 97) % (W * 2), y: (i * 37) % 60 }))

	const player = { x: 40, y: GROUND, vy: 0, face: 1, walk: 0, inside: false, onGround: true }
	const keys = { left: false, right: false }
	let target: { x: number; enter?: string } | null = null
	let camX = 0
	let lastDoor: Building | null = null
	let coinCount = 0

	function doorAt(x: number) {
		return buildings.find((b) => Math.abs(b.door - x) < 12) ?? null
	}

	function enter(b: Building) {
		if (player.inside) return
		player.inside = true
		lastDoor = b
		target = null
		opts.onSound('door')
		setTimeout(() => opts.onEnter(b.id), 260)
	}

	function jump() {
		if (!player.onGround || player.inside) return
		player.vy = -190
		player.onGround = false
		opts.onSound('jump')
	}

	// ─── Input ───────────────────────────────────────────────────────────────
	const keyMap: Record<string, 'left' | 'right' | 'jump' | 'enter'> = {
		ArrowLeft: 'left',
		a: 'left',
		ArrowRight: 'right',
		d: 'right',
		' ': 'jump',
		ArrowUp: 'enter',
		w: 'enter',
		Enter: 'enter'
	}
	function press(k: 'left' | 'right' | 'jump' | 'enter', down: boolean) {
		if (k === 'left' || k === 'right') {
			keys[k] = down
			if (down) target = null
		} else if (down && k === 'jump') jump()
		else if (down && k === 'enter') {
			const b = doorAt(player.x)
			if (b && player.onGround) enter(b)
			else jump()
		}
	}
	addEventListener('keydown', (e) => {
		if ((e.target as HTMLElement)?.closest?.('input, textarea, [data-panel]')) return
		const k = keyMap[e.key]
		if (!k || player.inside) return
		e.preventDefault()
		if (!e.repeat || k === 'left' || k === 'right') press(k, true)
	})
	addEventListener('keyup', (e) => {
		const k = keyMap[e.key]
		if (k === 'left' || k === 'right') keys[k] = false
	})
	canvas.addEventListener('pointerdown', (e) => {
		if (player.inside) return
		const r = canvas.getBoundingClientRect()
		const wx = ((e.clientX - r.left) / r.width) * W + camX
		const wy = ((e.clientY - r.top) / r.height) * H
		const b = buildings.find(
			(b) => wx >= b.x && wx <= b.x + b.w && wy > GROUND - 124 && wy < GROUND
		)
		target = b ? { x: b.door, enter: b.id } : { x: Math.max(8, Math.min(WORLD - 8, wx)) }
	})
	canvas.addEventListener('pointermove', (e) => {
		const r = canvas.getBoundingClientRect()
		const wx = ((e.clientX - r.left) / r.width) * W + camX
		const wy = ((e.clientY - r.top) / r.height) * H
		const over = buildings.some(
			(b) => wx >= b.x && wx <= b.x + b.w && wy > GROUND - 124 && wy < GROUND
		)
		canvas.style.cursor = over ? 'pointer' : ''
	})

	// ─── Drawing ─────────────────────────────────────────────────────────────
	function drawSprite(frame: string[], x: number, y: number, flip: boolean) {
		for (let r = 0; r < frame.length; r++) {
			const row = frame[r]
			for (let c = 0; c < row.length; c++) {
				const k = row[flip ? row.length - 1 - c : c]
				if (k === '.') continue
				ctx.fillStyle = SPRITE_KEY[k]
				ctx.fillRect(Math.round(x) + c, Math.round(y) + r, 1, 1)
			}
		}
	}

	function drawSky(t: number) {
		const bands = ['#2a1b4a', '#3d2160', '#5e2a6e', '#8a3a6e', '#c4566a', '#e98a5a', '#f6b86a']
		const bh = Math.ceil(GROUND / bands.length)
		bands.forEach((c, i) => rect(ctx, 0, i * bh, W, bh, c))
		for (const s of stars) {
			const x = (((s.x - camX * 0.05) % (W * 2)) + W * 2) % (W * 2)
			if (x < W && Math.sin(t * 2 + s.x) > -0.6) rect(ctx, x, s.y, 1, 1, '#fff2d6')
		}
		// Sun sinking behind the hills.
		ctx.fillStyle = '#ffd27a'
		ctx.beginPath()
		ctx.arc(Math.round(230 - camX * 0.04), 112, 26, 0, Math.PI * 2)
		ctx.fill()
		for (let i = 0; i < 4; i++) rect(ctx, 200 - camX * 0.04, 100 + i * 7, 60, 2, '#f6a86a')
	}

	function drawMountains() {
		ctx.fillStyle = '#4a2a5e'
		for (let i = -1; i < 8; i++) {
			const bx = i * 90 - ((camX * 0.15) % 90)
			ctx.beginPath()
			ctx.moveTo(bx, GROUND - 20)
			ctx.lineTo(bx + 45, GROUND - 78 - (i % 3) * 12)
			ctx.lineTo(bx + 90, GROUND - 20)
			ctx.fill()
		}
		// Snow caps.
		ctx.fillStyle = '#e9d6ef'
		for (let i = -1; i < 8; i++) {
			const bx = i * 90 - ((camX * 0.15) % 90)
			const peak = GROUND - 78 - (i % 3) * 12
			ctx.beginPath()
			ctx.moveTo(bx + 37, peak + 9)
			ctx.lineTo(bx + 45, peak)
			ctx.lineTo(bx + 53, peak + 9)
			ctx.fill()
		}
		ctx.fillStyle = '#35204a'
		for (let i = -1; i < 12; i++) {
			const bx = i * 60 - ((camX * 0.35) % 60)
			ctx.beginPath()
			ctx.arc(bx + 30, GROUND - 6, 34, Math.PI, 0)
			ctx.fill()
		}
	}

	function drawClouds(t: number) {
		for (const c of clouds) {
			const drift = opts.reducedMotion ? 0 : t * 4
			const x = ((((c.x + drift - camX * 0.25) % 1200) + 1200) % 1200) - 100
			rect(ctx, x, c.y, c.w, 6, '#f6c9d6')
			rect(ctx, x + 6, c.y - 4, c.w - 14, 4, '#f6c9d6')
			rect(ctx, x + 2, c.y + 6, c.w - 4, 2, '#d99aba')
		}
	}

	function drawGround() {
		rect(ctx, 0, GROUND, W, H - GROUND, '#2b2238')
		rect(ctx, 0, GROUND, W, 3, '#5a4a6e')
		// Pavement tiles scroll with the world.
		for (let x = -(camX % 16); x < W; x += 16) rect(ctx, x, GROUND + 7, 1, 4, '#3d3150')
		for (let x = -(camX % 40); x < W; x += 40) rect(ctx, x + 8, GROUND + 18, 18, 2, '#e8c86a')
	}

	function drawStreetlamps(t: number) {
		for (let wx = 60; wx < WORLD; wx += 220) {
			const x = wx - camX
			if (x < -20 || x > W + 20) continue
			rect(ctx, x, GROUND - 46, 2, 46, '#1e1830')
			rect(ctx, x - 3, GROUND - 50, 8, 4, '#1e1830')
			const flicker = Math.sin(t * 9 + wx) > 0.95 ? 0.4 : 1
			ctx.globalAlpha = 0.18 * flicker
			ctx.fillStyle = '#ffd27a'
			ctx.beginPath()
			ctx.moveTo(x - 2, GROUND - 46)
			ctx.lineTo(x - 16, GROUND)
			ctx.lineTo(x + 18, GROUND)
			ctx.lineTo(x + 4, GROUND - 46)
			ctx.fill()
			ctx.globalAlpha = 1
			rect(ctx, x - 2, GROUND - 46, 6, 2, '#ffe9a8')
		}
	}

	function drawHud() {
		ctx.font = `8px ${FONT}`
		ctx.textBaseline = 'top'
		const hud = (text: string, x: number) => {
			ctx.fillStyle = C.ink
			ctx.fillText(text, x + 1, 7)
			ctx.fillStyle = C.white
			ctx.fillText(text, x, 6)
		}
		hud('MARKUS', 8)
		hud('WORLD 1-1', 120)
		hud(`¢${String(coinCount).padStart(2, '0')}/${coins.length}`, 248)
	}

	// ─── Loop ────────────────────────────────────────────────────────────────
	let last = performance.now()
	let raf = 0
	function frame(now: number) {
		raf = requestAnimationFrame(frame)
		const dt = Math.min((now - last) / 1000, 0.05)
		last = now
		const t = now / 1000

		// Movement: keys win; otherwise walk toward a tapped target.
		let dir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0)
		if (!dir && target && !player.inside) {
			const dx = target.x - player.x
			if (Math.abs(dx) < 1.5) {
				const id = target.enter
				target = null
				const b = buildings.find((b) => b.id === id)
				if (b) enter(b)
			} else dir = Math.sign(dx)
		}
		if (player.inside) dir = 0
		player.x = Math.max(8, Math.min(WORLD - 8, player.x + dir * 78 * dt))
		if (dir) player.face = dir
		player.walk = dir ? player.walk + dt * 9 : 0
		player.vy += 520 * dt
		player.y += player.vy * dt
		if (player.y >= GROUND) {
			player.y = GROUND
			player.vy = 0
			player.onGround = true
		}

		for (const c of coins) {
			if (!c.got && Math.abs(c.x - player.x) < 8 && Math.abs(c.y - (player.y - 8)) < 12) {
				c.got = true
				coinCount++
				opts.onSound('coin')
			}
		}

		const camTarget = Math.max(0, Math.min(WORLD - W, player.x - W / 2))
		camX += (camTarget - camX) * (opts.reducedMotion ? 1 : Math.min(1, dt * 5))

		drawSky(t)
		drawClouds(t)
		drawMountains()
		drawGround()
		drawStreetlamps(t)
		for (const b of buildings) {
			const x = b.x - camX
			if (x > -100 && x < W + 20) b.draw(ctx, Math.round(x), t)
		}
		for (const c of coins) {
			if (c.got) continue
			const x = c.x - camX
			if (x < -8 || x > W + 8) continue
			const bob = Math.round(Math.sin(t * 4 + c.x) * 2)
			const spin = Math.abs(Math.cos(t * 5 + c.x))
			const w = Math.max(2, Math.round(6 * spin))
			rect(ctx, x - w / 2, c.y + bob - 4, w, 8, '#ffd23f')
			rect(ctx, x - w / 2, c.y + bob - 4, 1, 8, '#fff2a8')
		}

		// The door prompt.
		const near = !player.inside && player.onGround ? doorAt(player.x) : null
		if (near && Math.floor(t * 3) % 2 === 0) {
			const x = Math.round(near.door - camX)
			rect(ctx, x - 14, GROUND - 46, 28, 11, C.ink)
			rect(ctx, x - 13, GROUND - 45, 26, 9, C.white)
			ctx.font = `8px ${FONT}`
			ctx.fillStyle = C.ink
			ctx.fillText('▲IN', x - 12, GROUND - 44)
		}

		if (!player.inside) {
			const sprite = !player.onGround ? JUMP : dir && Math.floor(player.walk) % 2 ? WALK : IDLE
			drawSprite(sprite, player.x - 6 - camX, player.y - 16, player.face < 0)
		}
		drawHud()
	}
	raf = requestAnimationFrame(frame)
	document.addEventListener('visibilitychange', () => {
		cancelAnimationFrame(raf)
		if (!document.hidden) {
			last = performance.now()
			raf = requestAnimationFrame(frame)
		}
	})

	return {
		goTo(id) {
			const b = buildings.find((b) => b.id === id)
			if (!b) return
			if (player.inside) return opts.onEnter(id)
			// Close enough: go straight in. Otherwise walk there first.
			if (Math.abs(player.x - b.door) < 60) {
				player.x = b.door
				enter(b)
			} else {
				player.x = b.door - 50 * Math.sign(b.door - player.x)
				target = { x: b.door, enter: b.id }
			}
		},
		exitBuilding() {
			player.inside = false
			if (lastDoor) player.x = lastDoor.door
			player.face = 1
		},
		press
	}
}
