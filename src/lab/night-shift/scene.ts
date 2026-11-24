/**
 * "Night shift": a desk in a dark room at night. An old beige computer hums on
 * the desk, a lamp throws a warm pool of light, a game console sits beside
 * it, and rain streaks past the window with the odd flash of lightning.
 *
 * Click the monitor and the camera pushes into the screen; the page then
 * takes over with a real, accessible terminal (in HTML) holding the site.
 * Everything is primitives and canvas textures: three.js is the only download.
 */
import {
	ACESFilmicToneMapping,
	AdditiveBlending,
	AmbientLight,
	BoxGeometry,
	BufferAttribute,
	BufferGeometry,
	CanvasTexture,
	CatmullRomCurve3,
	Color,
	CylinderGeometry,
	DirectionalLight,
	ExtrudeGeometry,
	Fog,
	Group,
	InstancedMesh,
	LineBasicMaterial,
	LineSegments,
	Mesh,
	MeshBasicMaterial,
	MeshStandardMaterial,
	Object3D,
	Path,
	PerspectiveCamera,
	PlaneGeometry,
	PointLight,
	Raycaster,
	RepeatWrapping,
	Scene,
	Shape,
	SphereGeometry,
	SpotLight,
	SRGBColorSpace,
	TorusGeometry,
	TubeGeometry,
	Vector2,
	Vector3,
	WebGLRenderer
} from 'three'

import { createLoop, damp } from '../runtime'

export type NightShiftOptions = {
	/** The visitor clicked the monitor. */
	onEnter(): void
	/** Lightning struck (so the page can play thunder). */
	onLightning(): void
}

export type NightShiftApi = {
	/** Push the camera into the screen; resolves once it's filled the view. */
	zoomIn(): Promise<void>
	zoomOut(): void
}

const PHOSPHOR = '#7dffb0'

function roundedRectShape<T extends Path>(w: number, h: number, r: number, path: T): T {
	const x = -w / 2
	const y = -h / 2
	path.moveTo(x + r, y)
	path.lineTo(x + w - r, y)
	path.quadraticCurveTo(x + w, y, x + w, y + r)
	path.lineTo(x + w, y + h - r)
	path.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
	path.lineTo(x + r, y + h)
	path.quadraticCurveTo(x, y + h, x, y + h - r)
	path.lineTo(x, y + r)
	path.quadraticCurveTo(x, y, x + r, y)
	return path
}

function canvasTexture(w: number, h: number) {
	const canvas = document.createElement('canvas')
	canvas.width = w
	canvas.height = h
	const tex = new CanvasTexture(canvas)
	tex.colorSpace = SRGBColorSpace
	return { canvas, ctx: canvas.getContext('2d')!, tex }
}

export function mountNightShift(canvas: HTMLCanvasElement, opts: NightShiftOptions): NightShiftApi {
	const renderer = new WebGLRenderer({
		canvas,
		antialias: true,
		powerPreference: 'high-performance'
	})
	renderer.toneMapping = ACESFilmicToneMapping
	renderer.toneMappingExposure = 1.1
	renderer.outputColorSpace = SRGBColorSpace

	const scene = new Scene()
	scene.background = new Color('#05070d')
	scene.fog = new Fog('#05070d', 4, 12)

	const camera = new PerspectiveCamera(48, 1, 0.01, 40)

	// ─── Materials ───────────────────────────────────────────────────────────
	const beige = new MeshStandardMaterial({ color: '#cbbf9f', roughness: 0.62 })
	const beigeDark = new MeshStandardMaterial({ color: '#a89c7d', roughness: 0.7 })
	const wood = new MeshStandardMaterial({ color: '#3a2a1e', roughness: 0.72 })
	const wallMat = new MeshStandardMaterial({ color: '#1b2030', roughness: 0.95 })
	const black = new MeshStandardMaterial({ color: '#141416', roughness: 0.6 })
	const metal = new MeshStandardMaterial({ color: '#2b2d33', roughness: 0.35, metalness: 0.8 })

	// ─── Room ────────────────────────────────────────────────────────────────
	const floor = new Mesh(
		new PlaneGeometry(10, 10),
		new MeshStandardMaterial({ color: '#141018', roughness: 0.9 })
	)
	floor.rotation.x = -Math.PI / 2
	scene.add(floor)

	// Back wall with a window opening: four panels around the hole.
	const WALL_Z = -0.95
	const win = { x: 0.95, y: 1.45, w: 1.05, h: 1.05 }
	const wallPanels: Array<[number, number, number, number]> = [
		// [centerX, centerY, width, height]
		[-2.5 + (win.x - win.w / 2 + 2.5) / 2 - 0.0, 1.5, win.x - win.w / 2 + 2.5, 3],
		[(win.x + win.w / 2 + 3) / 2, 1.5, 3 - (win.x + win.w / 2), 3],
		[win.x, (win.y - win.h / 2) / 2, win.w, win.y - win.h / 2],
		[win.x, (win.y + win.h / 2 + 3) / 2, win.w, 3 - (win.y + win.h / 2)]
	]
	for (const [cx, cy, w, h] of wallPanels) {
		const p = new Mesh(new BoxGeometry(w, h, 0.1), wallMat)
		p.position.set(cx, cy, WALL_Z - 0.05)
		scene.add(p)
	}
	// Window frame and mullions.
	const frameMat = new MeshStandardMaterial({ color: '#d8d4c8', roughness: 0.6 })
	const frameBits: Array<[number, number, number, number]> = [
		[win.x, win.y + win.h / 2, win.w + 0.08, 0.06],
		[win.x, win.y - win.h / 2, win.w + 0.12, 0.07],
		[win.x - win.w / 2, win.y, 0.06, win.h],
		[win.x + win.w / 2, win.y, 0.06, win.h],
		[win.x, win.y, win.w, 0.035],
		[win.x, win.y, 0.035, win.h]
	]
	for (const [cx, cy, w, h] of frameBits) {
		const f = new Mesh(new BoxGeometry(w, h, 0.08), frameMat)
		f.position.set(cx, cy, WALL_Z)
		scene.add(f)
	}
	const sill = new Mesh(new BoxGeometry(win.w + 0.2, 0.03, 0.18), frameMat)
	sill.position.set(win.x, win.y - win.h / 2 - 0.03, WALL_Z + 0.06)
	scene.add(sill)

	// Outside: a skyline painted on a canvas, far enough back to parallax.
	const sky = canvasTexture(1024, 512)
	{
		const { ctx } = sky
		const g = ctx.createLinearGradient(0, 0, 0, 512)
		g.addColorStop(0, '#0a1024')
		g.addColorStop(0.7, '#1a2140')
		g.addColorStop(1, '#2a2440')
		ctx.fillStyle = g
		ctx.fillRect(0, 0, 1024, 512)
		let x = 0
		while (x < 1024) {
			const bw = 40 + Math.random() * 90
			const bh = 120 + Math.random() * 300
			ctx.fillStyle = `hsl(230 25% ${6 + Math.random() * 5}%)`
			ctx.fillRect(x, 512 - bh, bw, bh)
			for (let wy = 512 - bh + 10; wy < 500; wy += 14) {
				for (let wx = x + 6; wx < x + bw - 8; wx += 11) {
					if (Math.random() < 0.18) {
						ctx.fillStyle = Math.random() < 0.8 ? '#ffcf7a' : '#9ad7ff'
						ctx.globalAlpha = 0.4 + Math.random() * 0.6
						ctx.fillRect(wx, wy, 5, 7)
						ctx.globalAlpha = 1
					}
				}
			}
			x += bw + 4
		}
		sky.tex.needsUpdate = true
	}
	const skyMat = new MeshBasicMaterial({ map: sky.tex, fog: false })
	const skyline = new Mesh(new PlaneGeometry(9, 4.5), skyMat)
	skyline.position.set(win.x + 0.4, 1.2, -5.5)
	scene.add(skyline)

	// Rain: short vertical segments falling between the window and the city.
	const DROPS = 900
	const rainPos = new Float32Array(DROPS * 6)
	const rainBox = { x0: win.x - 1.6, x1: win.x + 1.6, y0: -0.5, y1: 3.4, z0: -4.5, z1: -1.1 }
	const speeds = new Float32Array(DROPS)
	for (let i = 0; i < DROPS; i++) {
		const x = rainBox.x0 + Math.random() * (rainBox.x1 - rainBox.x0)
		const y = rainBox.y0 + Math.random() * (rainBox.y1 - rainBox.y0)
		const z = rainBox.z0 + Math.random() * (rainBox.z1 - rainBox.z0)
		const len = 0.06 + Math.random() * 0.1
		rainPos.set([x, y, z, x - 0.01, y - len, z], i * 6)
		speeds[i] = 5 + Math.random() * 3
	}
	const rainGeo = new BufferGeometry()
	rainGeo.setAttribute('position', new BufferAttribute(rainPos, 3))
	const rainMat = new LineBasicMaterial({
		color: '#9fb6ff',
		transparent: true,
		opacity: 0.35,
		blending: AdditiveBlending,
		depthWrite: false
	})
	scene.add(new LineSegments(rainGeo, rainMat))

	// Droplets on the glass, as a texture whose streak layer slides down slowly.
	const glassTex = canvasTexture(256, 256)
	{
		const { ctx } = glassTex
		ctx.clearRect(0, 0, 256, 256)
		for (let i = 0; i < 140; i++) {
			const x = Math.random() * 256
			const y = Math.random() * 256
			const r = 0.6 + Math.random() * 2.2
			ctx.fillStyle = `rgba(200,220,255,${0.15 + Math.random() * 0.3})`
			ctx.beginPath()
			ctx.arc(x, y, r, 0, Math.PI * 2)
			ctx.fill()
			if (Math.random() < 0.12) {
				ctx.fillRect(x - 0.4, y, 0.8, 10 + Math.random() * 30)
			}
		}
		glassTex.tex.wrapS = glassTex.tex.wrapT = RepeatWrapping
		glassTex.tex.repeat.set(2, 2)
		glassTex.tex.needsUpdate = true
	}
	const glass = new Mesh(
		new PlaneGeometry(win.w, win.h),
		new MeshBasicMaterial({
			map: glassTex.tex,
			transparent: true,
			opacity: 0.8,
			depthWrite: false,
			color: '#cfe0ff'
		})
	)
	glass.position.set(win.x, win.y, WALL_Z + 0.01)
	glass.userData = { kind: 'window' }
	scene.add(glass)

	// Shelf on the wall with a few boxes: game cases and notebooks.
	const shelf = new Mesh(new BoxGeometry(0.8, 0.025, 0.2), wood)
	shelf.position.set(-0.75, 1.62, WALL_Z + 0.1)
	scene.add(shelf)
	const spineColors = ['#c0392b', '#2e86de', '#f6b93b', '#38ada9', '#8e44ad', '#e8e2d0', '#e15f41']
	let sx = -1.1
	spineColors.forEach((c, i) => {
		const w = 0.035 + (i % 3) * 0.01
		const h = 0.16 + ((i * 37) % 5) * 0.015
		const book = new Mesh(
			new BoxGeometry(w, h, 0.15),
			new MeshStandardMaterial({ color: c, roughness: 0.8 })
		)
		book.position.set(sx + w / 2, 1.633 + h / 2, WALL_Z + 0.1)
		if (i === 6) book.rotation.z = -0.25
		scene.add(book)
		sx += w + 0.008
	})

	// ─── Desk ────────────────────────────────────────────────────────────────
	const DESK_Y = 0.75
	const desk = new Mesh(new BoxGeometry(2.0, 0.05, 0.85), wood)
	desk.position.set(0, DESK_Y - 0.025, -0.5)
	scene.add(desk)
	for (const [lx, lz] of [
		[-0.95, -0.12],
		[0.95, -0.12],
		[-0.95, -0.88],
		[0.95, -0.88]
	]) {
		const leg = new Mesh(new BoxGeometry(0.05, DESK_Y - 0.05, 0.05), wood)
		leg.position.set(lx, (DESK_Y - 0.05) / 2, lz)
		scene.add(leg)
	}

	// ─── The computer ────────────────────────────────────────────────────────
	const computer = new Group()
	computer.position.set(-0.05, DESK_Y, -0.55)
	scene.add(computer)

	// Base unit the monitor sits on.
	const base = new Mesh(new BoxGeometry(0.56, 0.11, 0.44), beige)
	base.position.set(0, 0.055, 0)
	computer.add(base)
	const drive = new Mesh(new BoxGeometry(0.16, 0.012, 0.01), black)
	drive.position.set(0.14, 0.06, 0.221)
	computer.add(drive)
	const led = new Mesh(
		new BoxGeometry(0.012, 0.012, 0.01),
		new MeshBasicMaterial({ color: '#39ff7a' })
	)
	led.position.set(-0.22, 0.05, 0.221)
	computer.add(led)

	// Monitor: bezel with a screen-shaped hole, a tapered back, a curved screen.
	const SCREEN_W = 0.36
	const SCREEN_H = 0.27
	const bezelShape = roundedRectShape(0.48, 0.4, 0.03, new Shape())
	bezelShape.holes.push(roundedRectShape(SCREEN_W + 0.01, SCREEN_H + 0.01, 0.025, new Path()))
	const bezel = new Mesh(
		new ExtrudeGeometry(bezelShape, {
			depth: 0.05,
			bevelEnabled: true,
			bevelSize: 0.01,
			bevelThickness: 0.01,
			bevelSegments: 2
		}),
		beige
	)
	const MON_Y = 0.11 + 0.21
	bezel.position.set(0, MON_Y, 0.12)
	computer.add(bezel)
	// Square frustum for the tube housing.
	const back = new Mesh(new CylinderGeometry(0.3, 0.2, 0.36, 4, 1), beigeDark)
	back.rotation.x = -Math.PI / 2
	back.rotation.y = Math.PI / 4
	back.position.set(0, MON_Y, -0.07)
	back.scale.set(1, 1, 0.92)
	computer.add(back)
	// Screen: slightly bulged plane with the live canvas on it.
	const screen = canvasTexture(640, 480)
	const screenGeo = new PlaneGeometry(SCREEN_W, SCREEN_H, 24, 18)
	{
		const p = screenGeo.attributes.position as BufferAttribute
		for (let i = 0; i < p.count; i++) {
			const x = p.getX(i) / (SCREEN_W / 2)
			const y = p.getY(i) / (SCREEN_H / 2)
			p.setZ(i, 0.018 * (1 - (x * x + y * y) / 2))
		}
		screenGeo.computeVertexNormals()
	}
	const screenMat = new MeshBasicMaterial({ map: screen.tex, toneMapped: false })
	const screenMesh = new Mesh(screenGeo, screenMat)
	screenMesh.position.set(0, MON_Y, 0.135)
	screenMesh.userData = { kind: 'screen' }
	computer.add(screenMesh)
	bezel.userData = { kind: 'screen' }
	back.userData = { kind: 'screen' }
	const powerLed = new Mesh(
		new SphereGeometry(0.006, 8, 8),
		new MeshBasicMaterial({ color: '#39ff7a' })
	)
	powerLed.position.set(0.2, MON_Y - 0.175, 0.185)
	computer.add(powerLed)

	// Screen glow onto the desk and keyboard.
	const glow = new PointLight(PHOSPHOR, 0.012, 0.8, 1.8)
	glow.position.set(-0.05, DESK_Y + 0.08, -0.12)
	scene.add(glow)

	// Keyboard.
	const kb = new Group()
	kb.position.set(-0.05, DESK_Y, -0.13)
	kb.rotation.x = 0.06
	scene.add(kb)
	const kbBase = new Mesh(new BoxGeometry(0.5, 0.025, 0.17), beige)
	kbBase.position.y = 0.0125
	kb.add(kbBase)
	const COLS = 15
	const ROWS = 5
	const keys = new InstancedMesh(
		new BoxGeometry(0.026, 0.014, 0.026),
		new MeshStandardMaterial({ color: '#e7e0cc', roughness: 0.55 }),
		COLS * ROWS
	)
	const d = new Object3D()
	for (let r = 0; r < ROWS; r++) {
		for (let c = 0; c < COLS; c++) {
			d.position.set(-0.21 + c * 0.03, 0.03, -0.06 + r * 0.03)
			d.updateMatrix()
			keys.setMatrixAt(r * COLS + c, d.matrix)
			keys.setColorAt(
				r * COLS + c,
				new Color(c === 0 || c === COLS - 1 || r === ROWS - 1 ? '#b9b19b' : '#ffffff')
			)
		}
	}
	kb.add(keys)

	// Desk lamp, warm, lighting the left half of the desk.
	const lamp = new Group()
	lamp.position.set(-0.7, DESK_Y, -0.55)
	scene.add(lamp)
	const lampBase = new Mesh(new CylinderGeometry(0.08, 0.09, 0.02, 24), metal)
	lampBase.position.y = 0.01
	lamp.add(lampBase)
	const arm1 = new Mesh(new CylinderGeometry(0.008, 0.008, 0.38, 8), metal)
	arm1.position.set(0.04, 0.19, 0)
	arm1.rotation.z = -0.25
	lamp.add(arm1)
	const arm2 = new Mesh(new CylinderGeometry(0.008, 0.008, 0.3, 8), metal)
	arm2.position.set(0.17, 0.4, 0.03)
	arm2.rotation.z = -1.1
	lamp.add(arm2)
	const head = new Mesh(new CylinderGeometry(0.03, 0.08, 0.11, 24, 1, true), metal)
	head.position.set(0.3, 0.42, 0.06)
	head.rotation.z = 0.5
	lamp.add(head)
	const bulb = new Mesh(
		new SphereGeometry(0.028, 16, 16),
		new MeshBasicMaterial({ color: '#ffd9a0' })
	)
	bulb.position.set(0.31, 0.4, 0.06)
	lamp.add(bulb)
	lamp.userData = { kind: 'lamp' }
	for (const m of [lampBase, arm1, arm2, head, bulb]) m.userData = lamp.userData
	const lampLight = new SpotLight('#ffb36b', 5, 2.5, 0.9, 0.6, 1.5)
	lampLight.position.set(-0.4, DESK_Y + 0.38, -0.5)
	lampLight.target.position.set(-0.3, DESK_Y, -0.3)
	scene.add(lampLight, lampLight.target)
	// Spill from the bulb, so the side of the computer catches some warmth.
	const lampSpill = new PointLight('#ffb36b', 0.25, 1.8, 2)
	lampSpill.position.set(-0.35, DESK_Y + 0.45, -0.35)
	scene.add(lampSpill)

	// Mug.
	const mug = new Mesh(
		new CylinderGeometry(0.04, 0.037, 0.09, 24),
		new MeshStandardMaterial({ color: '#7a2f2a', roughness: 0.5 })
	)
	mug.position.set(-0.45, DESK_Y + 0.045, -0.2)
	scene.add(mug)
	const handle = new Mesh(new TorusGeometry(0.025, 0.007, 8, 16), mug.material)
	handle.position.set(-0.405, DESK_Y + 0.05, -0.2)
	scene.add(handle)

	// Games console and pad, to the right of the computer.
	const consoleBox = new Mesh(
		new BoxGeometry(0.28, 0.06, 0.2),
		new MeshStandardMaterial({ color: '#57565e', roughness: 0.55 })
	)
	consoleBox.position.set(0.55, DESK_Y + 0.03, -0.62)
	scene.add(consoleBox)
	const cart = new Mesh(
		new BoxGeometry(0.1, 0.07, 0.02),
		new MeshStandardMaterial({ color: '#2e86de' })
	)
	cart.position.set(0.55, DESK_Y + 0.08, -0.65)
	scene.add(cart)
	const pad = new Group()
	pad.position.set(0.45, DESK_Y + 0.012, -0.2)
	pad.rotation.y = -0.35
	scene.add(pad)
	const padBody = new Mesh(
		new BoxGeometry(0.15, 0.022, 0.065),
		new MeshStandardMaterial({ color: '#d7d3cc', roughness: 0.5 })
	)
	pad.add(padBody)
	for (const [bx, col] of [
		[0.04, '#c0392b'],
		[0.058, '#2e86de']
	] as const) {
		const b = new Mesh(
			new CylinderGeometry(0.008, 0.008, 0.008, 12),
			new MeshStandardMaterial({ color: col })
		)
		b.position.set(bx, 0.014, bx === 0.04 ? 0.006 : -0.008)
		pad.add(b)
	}
	const dpadH = new Mesh(new BoxGeometry(0.03, 0.006, 0.01), black)
	dpadH.position.set(-0.045, 0.013, 0)
	pad.add(dpadH)
	const dpadV = new Mesh(new BoxGeometry(0.01, 0.006, 0.03), black)
	dpadV.position.set(-0.045, 0.013, 0)
	pad.add(dpadV)
	const cable = new Mesh(
		new TubeGeometry(
			new CatmullRomCurve3([
				new Vector3(0.43, DESK_Y + 0.01, -0.235),
				new Vector3(0.4, DESK_Y + 0.004, -0.35),
				new Vector3(0.5, DESK_Y + 0.004, -0.45),
				new Vector3(0.48, DESK_Y + 0.02, -0.52)
			]),
			24,
			0.004,
			6
		),
		black
	)
	scene.add(cable)

	// ─── Lights ──────────────────────────────────────────────────────────────
	scene.add(new AmbientLight('#2a3660', 0.55))
	const moon = new DirectionalLight('#7f9dff', 0.6)
	moon.position.set(win.x, 2.5, -4)
	moon.target.position.set(0, 0.5, 0)
	scene.add(moon, moon.target)

	// ─── Screen content (the idle boot screen) ───────────────────────────────
	const bootLines = [
		'NIGHTSHIFT BIOS v1.0',
		'Memory test ......... 640K OK',
		'Detecting drives .... C: D:',
		'Loading MARKUS.SYS',
		'',
		'  about   work   projects   blog',
		'',
		'Click the screen to log in'
	]
	let hoverScreen = false
	function drawScreen(t: number) {
		const { ctx, tex } = screen
		const W = 640
		const H = 480
		const bright = hoverScreen ? 1 : 0.82
		const bg = ctx.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, W * 0.65)
		bg.addColorStop(0, `rgba(10, 42, 24, ${bright})`)
		bg.addColorStop(1, 'rgb(2, 10, 6)')
		ctx.fillStyle = bg
		ctx.fillRect(0, 0, W, H)
		ctx.font = '600 26px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
		ctx.textBaseline = 'top'
		ctx.shadowColor = PHOSPHOR
		ctx.shadowBlur = 8
		// Lines appear one by one, then loop after a pause.
		const cycle = t % 14
		const shown = Math.min(bootLines.length, Math.floor(cycle / 0.45))
		for (let i = 0; i < shown; i++) {
			const isCta = i === bootLines.length - 1
			ctx.fillStyle = isCta ? '#ffd27a' : PHOSPHOR
			ctx.globalAlpha = bright
			ctx.fillText(bootLines[i], 36, 40 + i * 44)
		}
		if (shown === bootLines.length && Math.floor(t * 2) % 2 === 0) {
			const w = ctx.measureText(bootLines[bootLines.length - 1]).width
			ctx.fillStyle = '#ffd27a'
			ctx.fillRect(36 + w + 10, 40 + (bootLines.length - 1) * 44, 16, 28)
		}
		ctx.shadowBlur = 0
		ctx.globalAlpha = 1
		// Scanlines and a rolling bar.
		ctx.fillStyle = 'rgba(0,0,0,0.22)'
		for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 2)
		const bar = ((t * 60) % (H + 120)) - 60
		const g = ctx.createLinearGradient(0, bar - 60, 0, bar + 60)
		g.addColorStop(0, 'rgba(125,255,176,0)')
		g.addColorStop(0.5, 'rgba(125,255,176,0.05)')
		g.addColorStop(1, 'rgba(125,255,176,0)')
		ctx.fillStyle = g
		ctx.fillRect(0, bar - 60, W, 120)
		tex.needsUpdate = true
	}

	// ─── Camera ──────────────────────────────────────────────────────────────
	const screenWorld = new Vector3()
	screenMesh.getWorldPosition(screenWorld)
	const overview = { pos: new Vector3(0.35, 1.32, 1.05), look: new Vector3(0.1, 1.02, -0.6) }
	const camPos = overview.pos.clone()
	const camLook = overview.look.clone()
	let zoom = 0 // 0 = overview, 1 = inside the screen
	let zoomTarget = 0
	let zoomResolve: (() => void) | null = null

	function zoomPose() {
		// Close enough that the screen fills the view at the current aspect.
		const vfov = (camera.fov * Math.PI) / 180
		// Frame the whole bezel, so the HTML monitor that fades in lines up with it.
		const distH = 0.42 / 2 / Math.tan(vfov / 2)
		const distW = 0.5 / 2 / (Math.tan(vfov / 2) * camera.aspect)
		const dist = Math.max(distH, distW) * 1.05
		return {
			pos: new Vector3(screenWorld.x, screenWorld.y, screenWorld.z + 0.02 + dist),
			look: screenWorld.clone()
		}
	}

	// ─── Interaction ─────────────────────────────────────────────────────────
	const pickables = [screenMesh, bezel, back, glass, lampBase, arm1, arm2, head, bulb]
	const raycaster = new Raycaster()
	const pointer = new Vector2()
	const parallax = new Vector2()
	let lampOn = true
	let flash = 0
	let nextFlash = 6 + Math.random() * 8

	function pick(e: PointerEvent) {
		const r = canvas.getBoundingClientRect()
		pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
		raycaster.setFromCamera(pointer, camera)
		return raycaster.intersectObjects(pickables, false)[0]?.object ?? null
	}
	canvas.addEventListener('pointermove', (e) => {
		parallax.set((e.clientX / innerWidth) * 2 - 1, (e.clientY / innerHeight) * 2 - 1)
		if (zoomTarget) return
		const hit = pick(e)
		hoverScreen = hit?.userData.kind === 'screen'
		canvas.style.cursor = hit ? 'pointer' : ''
	})
	canvas.addEventListener('click', (e) => {
		if (zoomTarget) return
		const kind = pick(e)?.userData.kind
		if (kind === 'screen') opts.onEnter()
		else if (kind === 'lamp') lampOn = !lampOn
		else if (kind === 'window') strike()
	})

	function strike() {
		flash = 1
		nextFlash = 10 + Math.random() * 14
		opts.onLightning()
	}

	// ─── Loop ────────────────────────────────────────────────────────────────
	function resize() {
		const w = canvas.clientWidth
		const h = canvas.clientHeight
		renderer.setSize(w, h, false)
		camera.aspect = w / h
		camera.fov = w / h < 1 ? 62 : 48
		camera.updateProjectionMatrix()
	}
	new ResizeObserver(resize).observe(canvas)
	resize()

	let screenClock = 0
	let elapsed = 0
	const loop = createLoop(
		(dt, t) => {
			elapsed += dt
			// Zoom eases in/out; parallax only applies in the overview.
			zoom = damp(zoom, zoomTarget, zoomTarget ? 2.6 : 3.2, dt)
			if (zoomResolve && zoom > 0.97) {
				zoomResolve()
				zoomResolve = null
			}
			const zp = zoomPose()
			const k = zoom * zoom * (3 - 2 * zoom)
			const px = parallax.x * 0.12 * (1 - k)
			const py = parallax.y * 0.06 * (1 - k)
			camPos.lerpVectors(overview.pos, zp.pos, k).add(new Vector3(px, -py, 0))
			camLook.lerpVectors(overview.look, zp.look, k)
			camera.position.copy(camPos)
			camera.lookAt(camLook)

			// Rain.
			const p = rainGeo.attributes.position as BufferAttribute
			const arr = p.array as Float32Array
			for (let i = 0; i < DROPS; i++) {
				const o = i * 6
				const dy = speeds[i] * dt
				arr[o + 1] -= dy
				arr[o + 4] -= dy
				arr[o] -= dy * 0.08
				arr[o + 3] -= dy * 0.08
				if (arr[o + 4] < rainBox.y0) {
					const len = arr[o + 1] - arr[o + 4]
					const x = rainBox.x0 + Math.random() * (rainBox.x1 - rainBox.x0)
					arr[o] = x
					arr[o + 1] = rainBox.y1
					arr[o + 3] = x - 0.01
					arr[o + 4] = rainBox.y1 - len
				}
			}
			p.needsUpdate = true
			glassTex.tex.offset.y = (elapsed * 0.02) % 1

			// Lightning: a double flicker, then a long dark.
			nextFlash -= dt
			if (nextFlash <= 0) strike()
			flash = Math.max(0, flash - dt * 2.2)
			const f = flash > 0.75 || (flash > 0.35 && flash < 0.5) ? flash : flash * 0.2
			moon.intensity = 0.6 + f * 6
			skyMat.color.setScalar(1 + f * 2.5)
			rainMat.opacity = 0.35 + f * 0.5

			// Lamp and the monitor's breathing glow.
			lampLight.intensity = damp(lampLight.intensity, lampOn ? 5 : 0, 8, dt)
			lampSpill.intensity = damp(lampSpill.intensity, lampOn ? 0.25 : 0, 8, dt)
			;(bulb.material as MeshBasicMaterial).color.set(lampOn ? '#ffd9a0' : '#3a3530')
			glow.intensity = (hoverScreen ? 0.02 : 0.012) + Math.sin(t * 50) * 0.001

			screenClock += dt
			if (screenClock > 1 / 24) {
				screenClock = 0
				drawScreen(elapsed)
			}

			renderer.render(scene, camera)
		},
		(ratio) => renderer.setPixelRatio(ratio)
	)
	loop.start()

	return {
		zoomIn() {
			zoomTarget = 1
			hoverScreen = true
			canvas.style.cursor = ''
			return new Promise<void>((resolve) => {
				zoomResolve = resolve
			})
		},
		zoomOut() {
			zoomTarget = 0
			hoverScreen = false
			zoomResolve?.()
			zoomResolve = null
		}
	}
}
