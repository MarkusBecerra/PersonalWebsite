/**
 * "Booth": a DJ booth in a dark club, drawn with three.js.
 *
 * Two media-player decks and a two-channel mixer sit on a table. Each deck has
 * four hot-cue pads, one per section of the site; hitting a pad "loads" that
 * section, spins the platter and opens it in the side panel. The LED wall,
 * light beams and meters run on a 124 BPM clock, or on the real audio when the
 * synthesised beat is playing.
 *
 * Everything is built from primitives and canvas textures, so the only
 * download is three.js itself.
 */
import {
	ACESFilmicToneMapping,
	AdditiveBlending,
	AmbientLight,
	BoxGeometry,
	BufferAttribute,
	BufferGeometry,
	CanvasTexture,
	Color,
	ConeGeometry,
	CylinderGeometry,
	DoubleSide,
	ExtrudeGeometry,
	FogExp2,
	Group,
	HemisphereLight,
	InstancedMesh,
	Mesh,
	MeshBasicMaterial,
	MeshStandardMaterial,
	Object3D,
	PerspectiveCamera,
	PlaneGeometry,
	PMREMGenerator,
	PointLight,
	Points,
	PointsMaterial,
	Raycaster,
	Scene,
	ShaderMaterial,
	Shape,
	SpotLight,
	SRGBColorSpace,
	TorusGeometry,
	Vector2,
	Vector3,
	WebGLRenderer
} from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

import { createLoop, damp } from '../runtime'
import { BPM, type Beat } from './beat'
import { SECTION_COLORS } from './colors'

export type Section = { id: string; label: string }

export type BoothOptions = {
	sections: readonly Section[]
	beat: Beat
	onPick(id: string): void
	onPlayToggle(): void
}

export type BoothApi = {
	select(id: string | null): void
}

const LCD_FONT = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'

function roundedRect(w: number, h: number, r: number) {
	const s = new Shape()
	const x = -w / 2
	const y = -h / 2
	s.moveTo(x + r, y)
	s.lineTo(x + w - r, y)
	s.quadraticCurveTo(x + w, y, x + w, y + r)
	s.lineTo(x + w, y + h - r)
	s.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
	s.lineTo(x + r, y + h)
	s.quadraticCurveTo(x, y + h, x, y + h - r)
	s.lineTo(x, y + r)
	s.quadraticCurveTo(x, y, x + r, y)
	return s
}

/** A rounded slab lying flat on the table, top face at y = height. */
function slab(w: number, d: number, height: number, r: number, mat: MeshStandardMaterial) {
	const geo = new ExtrudeGeometry(roundedRect(w, d, r), {
		depth: height,
		bevelEnabled: true,
		bevelThickness: 0.04,
		bevelSize: 0.04,
		bevelSegments: 2,
		curveSegments: 6
	})
	geo.rotateX(-Math.PI / 2)
	const m = new Mesh(geo, mat)
	return m
}

function canvasTexture(w: number, h: number) {
	const canvas = document.createElement('canvas')
	canvas.width = w
	canvas.height = h
	const tex = new CanvasTexture(canvas)
	tex.colorSpace = SRGBColorSpace
	tex.anisotropy = 4
	return { canvas, ctx: canvas.getContext('2d')!, tex }
}

/** Deterministic pseudo-random waveform per section so each "track" looks different. */
function waveform(seed: string, n: number) {
	let h = 2166136261
	for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
	const out: number[] = []
	for (let i = 0; i < n; i++) {
		h = Math.imul(h ^ (h >>> 13), 1274126177)
		const r = ((h >>> 0) % 1000) / 1000
		const env = 0.55 + 0.45 * Math.sin((i / n) * Math.PI * 3 + seed.length)
		out.push(Math.max(0.12, Math.min(1, r * 0.6 + env * 0.5)))
	}
	return out
}

export function mountBooth(canvas: HTMLCanvasElement, opts: BoothOptions): BoothApi {
	const { sections, beat } = opts

	// ─── Renderer, scene, camera ─────────────────────────────────────────────
	const renderer = new WebGLRenderer({
		canvas,
		antialias: true,
		powerPreference: 'high-performance'
	})
	renderer.toneMapping = ACESFilmicToneMapping
	renderer.toneMappingExposure = 1.05
	renderer.outputColorSpace = SRGBColorSpace

	const scene = new Scene()
	scene.background = new Color('#07060b')
	scene.fog = new FogExp2('#07060b', 0.03)

	// A soft studio environment so the metal and plastic catch some highlights.
	const pmrem = new PMREMGenerator(renderer)
	scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
	scene.environmentIntensity = 0.35

	const camera = new PerspectiveCamera(40, 1, 0.1, 80)
	const overview = { pos: new Vector3(0, 6.2, 8.6), look: new Vector3(0, 0.4, -1.6) }
	const focusDeck = { pos: new Vector3(-2.9, 5.6, 5.4), look: new Vector3(-3.3, 0.2, -0.6) }
	const camPos = overview.pos.clone()
	const camLook = overview.look.clone()
	camera.position.copy(camPos)

	scene.add(new AmbientLight('#2a2540', 0.6))
	scene.add(new HemisphereLight('#6b5bff', '#120b08', 0.35))

	// Work lights over each deck, like a gooseneck lamp on the booth.
	const deckLights: PointLight[] = []
	for (const x of [-4, 0, 4]) {
		const l = new PointLight('#ffe6c7', x === 0 ? 4 : 6, 9, 1.6)
		l.position.set(x, 3.4, 1.2)
		scene.add(l)
		deckLights.push(l)
	}

	// ─── Materials ───────────────────────────────────────────────────────────
	const bodyMat = new MeshStandardMaterial({ color: '#1a1b1f', roughness: 0.5, metalness: 0.55 })
	const plateMat = new MeshStandardMaterial({ color: '#25272c', roughness: 0.38, metalness: 0.7 })
	const rubberMat = new MeshStandardMaterial({ color: '#0f0f11', roughness: 0.9, metalness: 0 })
	const capMat = new MeshStandardMaterial({ color: '#d9d9de', roughness: 0.35, metalness: 0.4 })
	const tableMat = new MeshStandardMaterial({ color: '#121014', roughness: 0.75, metalness: 0.15 })

	// ─── Table ───────────────────────────────────────────────────────────────
	const table = new Mesh(new BoxGeometry(14, 0.35, 6.2), tableMat)
	table.position.set(0, -0.175, 0)
	scene.add(table)
	const front = new Mesh(new BoxGeometry(14, 3.2, 0.2), tableMat)
	front.position.set(0, -1.8, -3.05)
	scene.add(front)
	// LED strip along the crowd-facing edge.
	const stripMat = new MeshBasicMaterial({ color: '#7b5cff' })
	const strip = new Mesh(new BoxGeometry(14, 0.05, 0.05), stripMat)
	strip.position.set(0, -0.02, -3.12)
	scene.add(strip)

	// ─── Decks ───────────────────────────────────────────────────────────────
	const pickables: Object3D[] = []
	type Deck = {
		group: Group
		platter: Group
		screen: ReturnType<typeof canvasTexture>
		pads: Mesh[]
		ring: MeshBasicMaterial
		play: Mesh
		spin: number
		angle: number
		side: 'A' | 'B'
	}

	function makeLabelStrip(labels: string[], w: number) {
		const t = canvasTexture(512, 64)
		const { ctx } = t
		ctx.fillStyle = '#25272c'
		ctx.fillRect(0, 0, 512, 64)
		ctx.font = `600 22px ${LCD_FONT}`
		ctx.textAlign = 'center'
		ctx.textBaseline = 'middle'
		labels.forEach((l, i) => {
			ctx.fillStyle = '#b9bac2'
			ctx.fillText(l.toUpperCase(), (512 / labels.length) * (i + 0.5), 32)
		})
		t.tex.needsUpdate = true
		const m = new Mesh(
			new PlaneGeometry(w, w / 8),
			new MeshStandardMaterial({ map: t.tex, roughness: 0.5 })
		)
		m.rotation.x = -Math.PI / 2
		return m
	}

	function platterTexture() {
		const t = canvasTexture(512, 512)
		const { ctx } = t
		const g = ctx.createRadialGradient(256, 256, 40, 256, 256, 256)
		g.addColorStop(0, '#3a3c43')
		g.addColorStop(0.42, '#1b1c20')
		g.addColorStop(0.43, '#2c2e34')
		g.addColorStop(1, '#16171a')
		ctx.fillStyle = g
		ctx.fillRect(0, 0, 512, 512)
		// Fine grooves.
		ctx.strokeStyle = 'rgba(255,255,255,0.04)'
		for (let r = 120; r < 250; r += 4) {
			ctx.beginPath()
			ctx.arc(256, 256, r, 0, Math.PI * 2)
			ctx.stroke()
		}
		// Strobe dots around the rim so rotation reads at a glance.
		ctx.fillStyle = 'rgba(255,255,255,0.55)'
		for (let i = 0; i < 48; i++) {
			const a = (i / 48) * Math.PI * 2
			ctx.beginPath()
			ctx.arc(256 + Math.cos(a) * 238, 256 + Math.sin(a) * 238, 4, 0, Math.PI * 2)
			ctx.fill()
		}
		// Position marker.
		ctx.fillStyle = '#ffffff'
		ctx.fillRect(250, 30, 12, 80)
		t.tex.needsUpdate = true
		return t.tex
	}

	const platterTex = platterTexture()

	function makeDeck(side: 'A' | 'B', x: number): Deck {
		const group = new Group()
		group.position.set(x, 0, 0)

		const body = slab(3.3, 4.6, 0.42, 0.25, bodyMat)
		group.add(body)
		const plate = slab(3.1, 4.4, 0.02, 0.2, plateMat)
		plate.position.y = 0.44
		group.add(plate)

		// Screen, tilted toward the DJ.
		const screen = canvasTexture(512, 288)
		const bezel = new Mesh(new BoxGeometry(2.3, 0.12, 1.36), rubberMat)
		bezel.position.set(0, 0.56, -1.45)
		bezel.rotation.x = 0.32
		group.add(bezel)
		const lcd = new Mesh(
			new PlaneGeometry(2.12, 1.2),
			new MeshBasicMaterial({ map: screen.tex, toneMapped: false })
		)
		lcd.position.set(0, 0.625, -1.425)
		lcd.rotation.x = -Math.PI / 2 + 0.32
		group.add(lcd)

		// Hot-cue pads, one per section.
		const pads: Mesh[] = []
		sections.forEach((s, i) => {
			const color = new Color(SECTION_COLORS[s.id] ?? '#ffffff')
			const mat = new MeshStandardMaterial({
				color: color.clone().multiplyScalar(0.35),
				emissive: color,
				emissiveIntensity: 0.5,
				roughness: 0.4
			})
			const pad = new Mesh(new BoxGeometry(0.5, 0.1, 0.32), mat)
			pad.position.set(-1.0 + i * 0.66, 0.5, -0.5)
			pad.userData = { kind: 'pad', section: s.id, base: 0.5 }
			group.add(pad)
			pads.push(pad)
			pickables.push(pad)
		})
		const labels = makeLabelStrip(
			sections.map((s) => s.label),
			2.64
		)
		labels.position.set(0, 0.461, -0.22)
		group.add(labels)

		// Jog wheel.
		const platter = new Group()
		platter.position.set(-0.15, 0.46, 0.95)
		const wheel = new Mesh(new CylinderGeometry(1.08, 1.12, 0.14, 64), rubberMat)
		wheel.position.y = 0.07
		platter.add(wheel)
		const top = new Mesh(
			new CylinderGeometry(1.0, 1.0, 0.02, 64),
			new MeshStandardMaterial({ map: platterTex, roughness: 0.35, metalness: 0.6 })
		)
		top.position.y = 0.15
		platter.add(top)
		platter.userData = { kind: 'platter', side }
		wheel.userData = platter.userData
		top.userData = platter.userData
		pickables.push(wheel, top)
		group.add(platter)

		const ringMat = new MeshBasicMaterial({
			color: side === 'A' ? '#5cb8ff' : '#ff5c8a',
			toneMapped: false
		})
		const ring = new Mesh(new TorusGeometry(1.17, 0.025, 8, 96), ringMat)
		ring.rotation.x = Math.PI / 2
		ring.position.set(-0.15, 0.5, 0.95)
		group.add(ring)

		// Play / cue buttons, bottom-left like most decks.
		const play = new Mesh(
			new CylinderGeometry(0.22, 0.22, 0.08, 32),
			new MeshStandardMaterial({ color: '#0d2a19', emissive: '#2bff86', emissiveIntensity: 0.25 })
		)
		play.position.set(-1.15, 0.5, 2.0)
		play.userData = { kind: 'play' }
		pickables.push(play)
		group.add(play)
		const cue = new Mesh(
			new CylinderGeometry(0.22, 0.22, 0.08, 32),
			new MeshStandardMaterial({ color: '#2a1d0b', emissive: '#ffb340', emissiveIntensity: 0.35 })
		)
		cue.position.set(-1.15, 0.5, 1.45)
		group.add(cue)

		// Tempo fader.
		const slot = new Mesh(new BoxGeometry(0.08, 0.02, 2.0), rubberMat)
		slot.position.set(1.32, 0.47, 0.95)
		group.add(slot)
		const tempo = new Mesh(new BoxGeometry(0.34, 0.14, 0.2), capMat)
		tempo.position.set(1.32, 0.53, 0.8)
		group.add(tempo)

		// Browse encoder beside the screen.
		const enc = new Mesh(new CylinderGeometry(0.16, 0.18, 0.18, 24), capMat)
		enc.position.set(1.35, 0.55, -1.2)
		group.add(enc)

		scene.add(group)
		return { group, platter, screen, pads, ring: ringMat, play, spin: 0, angle: 0, side }
	}

	const deckA = makeDeck('A', -4)
	const deckB = makeDeck('B', 4)
	const decks = [deckA, deckB]

	// ─── Mixer ───────────────────────────────────────────────────────────────
	const mixer = new Group()
	const mixBody = slab(2.7, 4.6, 0.5, 0.2, bodyMat)
	mixer.add(mixBody)
	const mixPlate = slab(2.5, 4.4, 0.02, 0.16, plateMat)
	mixPlate.position.y = 0.52
	mixer.add(mixPlate)

	const knobGeo = new CylinderGeometry(0.15, 0.17, 0.18, 24)
	const tickGeo = new BoxGeometry(0.025, 0.02, 0.12)
	const tickMat = new MeshBasicMaterial({ color: '#ffffff' })
	const knobs: Mesh[] = []
	for (const cx of [-0.75, 0.75]) {
		for (let r = 0; r < 4; r++) {
			const k = new Mesh(knobGeo, r === 0 ? capMat : rubberMat)
			k.position.set(cx, 0.62, -1.75 + r * 0.55)
			const tick = new Mesh(tickGeo, tickMat)
			tick.position.set(0, 0.1, -0.08)
			k.add(tick)
			k.rotation.y = (Math.random() - 0.5) * 2
			mixer.add(k)
			knobs.push(k)
		}
	}
	// Channel faders.
	const faders: Mesh[] = []
	for (const cx of [-0.75, 0.75]) {
		const slot = new Mesh(new BoxGeometry(0.07, 0.02, 1.2), rubberMat)
		slot.position.set(cx, 0.54, 0.9)
		mixer.add(slot)
		const cap = new Mesh(new BoxGeometry(0.36, 0.16, 0.2), capMat)
		cap.position.set(cx, 0.62, 0.5)
		mixer.add(cap)
		faders.push(cap)
	}
	// Crossfader.
	const xslot = new Mesh(new BoxGeometry(1.4, 0.02, 0.07), rubberMat)
	xslot.position.set(0, 0.54, 1.95)
	mixer.add(xslot)
	const xfader = new Mesh(new BoxGeometry(0.2, 0.16, 0.36), capMat)
	xfader.position.set(0, 0.62, 1.95)
	mixer.add(xfader)

	// Level meters: two columns of LEDs, coloured per instance.
	const LEDS = 14
	const ledGeo = new BoxGeometry(0.14, 0.03, 0.09)
	const ledMat = new MeshBasicMaterial({ toneMapped: false })
	const meter = new InstancedMesh(ledGeo, ledMat, LEDS * 2)
	const dummy = new Object3D()
	for (let c = 0; c < 2; c++) {
		for (let i = 0; i < LEDS; i++) {
			dummy.position.set(c === 0 ? -0.14 : 0.14, 0.6, 0.4 - i * 0.14)
			dummy.updateMatrix()
			meter.setMatrixAt(c * LEDS + i, dummy.matrix)
		}
	}
	// Colours must exist before the first render, or the shader is built without them.
	for (let i = 0; i < LEDS * 2; i++) meter.setColorAt(i, new Color('#141416'))
	mixer.add(meter)
	const ledOff = new Color('#141416')
	const ledColor = (i: number) =>
		new Color(i < LEDS * 0.6 ? '#2bff86' : i < LEDS * 0.85 ? '#ffd23f' : '#ff3b3b')
	const ledOn = Array.from({ length: LEDS }, (_, i) => ledColor(i))
	scene.add(mixer)

	// ─── The room beyond the booth ───────────────────────────────────────────
	// LED wall: one shader-drawn plane of dots; pattern moves with the beat.
	const wallMat = new ShaderMaterial({
		uniforms: { uTime: { value: 0 }, uPulse: { value: 0 }, uHue: { value: 0 } },
		vertexShader: /* glsl */ `
			varying vec2 vUv;
			void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
		`,
		fragmentShader: /* glsl */ `
			varying vec2 vUv;
			uniform float uTime, uPulse, uHue;
			vec3 hsv(float h, float s, float v) {
				vec3 k = clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
				return v * mix(vec3(1.0), k, s);
			}
			void main() {
				vec2 grid = vec2(96.0, 32.0);
				vec2 cell = floor(vUv * grid);
				vec2 f = fract(vUv * grid) - 0.5;
				float dot = smoothstep(0.42, 0.25, length(f));
				vec2 p = cell / grid - 0.5;
				float wave = sin(p.x * 9.0 + uTime * 1.3) * 0.5 + sin(length(p * vec2(2.2, 1.0)) * 16.0 - uTime * 3.0) * 0.5;
				float bars = step(abs(p.y) * 2.0, 0.25 + 0.65 * fract(sin(cell.x * 12.9898) * 43758.5) * (0.35 + uPulse));
				float v = mix(smoothstep(0.2, 0.9, wave), bars, 0.55) * (0.35 + 0.65 * uPulse);
				vec3 col = hsv(fract(uHue + p.x * 0.25 + wave * 0.05), 0.8, v);
				gl_FragColor = vec4(col * dot * 0.9, 1.0);
			}
		`,
		toneMapped: false
	})
	const wall = new Mesh(new PlaneGeometry(32, 9), wallMat)
	wall.position.set(0, 1.4, -18)
	scene.add(wall)

	// Floor far below the booth so the room has depth under the fog.
	const floor = new Mesh(
		new PlaneGeometry(60, 60),
		new MeshStandardMaterial({ color: '#0b0a10', roughness: 0.3, metalness: 0.6 })
	)
	floor.rotation.x = -Math.PI / 2
	floor.position.y = -3.4
	scene.add(floor)

	// Light beams: open cones, additive, fading toward the far end.
	const beamMat = (color: string) =>
		new ShaderMaterial({
			uniforms: { uColor: { value: new Color(color) }, uIntensity: { value: 0.5 } },
			vertexShader: /* glsl */ `
				varying float vY;
				void main() { vY = uv.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
			`,
			fragmentShader: /* glsl */ `
				varying float vY;
				uniform vec3 uColor; uniform float uIntensity;
				void main() { gl_FragColor = vec4(uColor * uIntensity * pow(vY, 2.2) * 0.55, 1.0); }
			`,
			transparent: true,
			blending: AdditiveBlending,
			depthWrite: false,
			side: DoubleSide,
			toneMapped: false
		})
	const beamGeo = new ConeGeometry(1.6, 16, 32, 1, true)
	beamGeo.translate(0, -8, 0) // apex at origin
	const beams: Mesh[] = []
	const beamColors = ['#7b5cff', '#ff5c8a', '#5cb8ff', '#3ee6a4', '#ffb340', '#7b5cff']
	beamColors.forEach((c, i) => {
		const b = new Mesh(beamGeo, beamMat(c))
		b.position.set(-10 + i * 4, 9, -10)
		b.userData = { phase: i * 0.9 }
		scene.add(b)
		beams.push(b)
	})

	// Two coloured spots that actually light the booth, swinging on the beat.
	const spots = ['#7b5cff', '#ff5c8a'].map((c, i) => {
		const s = new SpotLight(c, 40, 30, 0.5, 0.6, 1.2)
		s.position.set(i === 0 ? -7 : 7, 9, -6)
		s.target.position.set(0, 0, 0)
		scene.add(s, s.target)
		return s
	})

	// Haze: a few hundred slow motes that catch the light.
	const MOTES = 500
	const motePos = new Float32Array(MOTES * 3)
	for (let i = 0; i < MOTES; i++) {
		motePos[i * 3] = (Math.random() - 0.5) * 30
		motePos[i * 3 + 1] = Math.random() * 10 - 2
		motePos[i * 3 + 2] = -Math.random() * 16 + 2
	}
	const moteGeo = new BufferGeometry()
	moteGeo.setAttribute('position', new BufferAttribute(motePos, 3))
	const motes = new Points(
		moteGeo,
		new PointsMaterial({
			color: '#b9a8ff',
			size: 0.05,
			transparent: true,
			opacity: 0.6,
			blending: AdditiveBlending,
			depthWrite: false
		})
	)
	scene.add(motes)

	// ─── LCD drawing ─────────────────────────────────────────────────────────
	const waves = Object.fromEntries(sections.map((s) => [s.id, waveform(s.id, 220)]))
	let selected: string | null = null
	let trackTime = 0

	function drawScreen(deck: Deck, t: number) {
		const { ctx, tex } = deck.screen
		const W = 512
		const H = 288
		const loaded = deck.side === 'A' ? selected : nextSection()
		const color = loaded ? (SECTION_COLORS[loaded] ?? '#fff') : '#6f7280'
		const idx = loaded ? sections.findIndex((s) => s.id === loaded) : -1

		ctx.fillStyle = '#05070a'
		ctx.fillRect(0, 0, W, H)
		// Header.
		ctx.fillStyle = '#11151c'
		ctx.fillRect(0, 0, W, 40)
		ctx.font = `700 20px ${LCD_FONT}`
		ctx.textBaseline = 'middle'
		ctx.fillStyle = deck.side === 'A' ? '#5cb8ff' : '#ff5c8a'
		ctx.fillText(`DECK ${deck.side}`, 14, 21)
		ctx.fillStyle = '#c9ccd6'
		ctx.textAlign = 'right'
		ctx.fillText(`${BPM.toFixed(1)} BPM`, W - 14, 21)
		ctx.textAlign = 'left'

		if (!loaded) {
			ctx.fillStyle = '#6f7280'
			ctx.font = `600 26px ${LCD_FONT}`
			ctx.fillText('HIT A PAD TO LOAD', 24, 120)
			ctx.font = `500 18px ${LCD_FONT}`
			ctx.fillText('about · work · projects · blog', 24, 160)
			const blink = Math.floor(t * 2) % 2 === 0
			if (blink) {
				ctx.fillStyle = '#ffb340'
				ctx.fillText('▸ NO TRACK', 24, 230)
			}
			tex.needsUpdate = true
			return
		}

		// Title block.
		ctx.fillStyle = color
		ctx.font = `700 30px ${LCD_FONT}`
		ctx.fillText(
			`${String(idx + 1).padStart(2, '0')}  ${sections[idx].label.toUpperCase()}`,
			18,
			80
		)
		ctx.fillStyle = '#8d91a0'
		ctx.font = `500 18px ${LCD_FONT}`
		ctx.fillText(deck.side === 'A' ? 'Markus Becerra — live' : 'CUED NEXT', 18, 112)

		// Waveform, scrolling under a fixed playhead on deck A.
		const wave = waves[loaded]
		const midY = 196
		const barW = 4
		const offset = deck.side === 'A' ? Math.floor(trackTime * 14) : 0
		for (let x = 0; x < W / barW; x++) {
			const v = wave[(x + offset) % wave.length]
			const h = v * 52
			const past = deck.side === 'A' && x < W / barW / 2
			ctx.fillStyle = past ? color + '66' : color
			ctx.fillRect(x * barW, midY - h, barW - 1, h * 2)
		}
		if (deck.side === 'A') {
			ctx.fillStyle = '#ffffff'
			ctx.fillRect(W / 2 - 1, midY - 64, 2, 128)
		}
		// Footer: elapsed time.
		ctx.fillStyle = '#c9ccd6'
		ctx.font = `600 18px ${LCD_FONT}`
		const secs = Math.floor(deck.side === 'A' ? trackTime : 0)
		ctx.fillText(`${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`, 18, H - 18)
		ctx.textAlign = 'right'
		ctx.fillText(beat.playing ? '♪ SOUND ON' : 'SOUND OFF', W - 18, H - 18)
		ctx.textAlign = 'left'
		tex.needsUpdate = true
	}

	function nextSection() {
		const i = selected ? sections.findIndex((s) => s.id === selected) : -1
		return sections[(i + 1) % sections.length].id
	}

	// ─── Interaction ─────────────────────────────────────────────────────────
	const raycaster = new Raycaster()
	const pointer = new Vector2(9, 9)
	const parallax = new Vector2()
	let hovered: Object3D | null = null
	let drag: { deck: Deck; x: number } | null = null

	function pick(e: PointerEvent) {
		const r = canvas.getBoundingClientRect()
		pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
		raycaster.setFromCamera(pointer, camera)
		return raycaster.intersectObjects(pickables, false)[0]?.object ?? null
	}

	canvas.addEventListener('pointermove', (e) => {
		parallax.set((e.clientX / innerWidth) * 2 - 1, (e.clientY / innerHeight) * 2 - 1)
		if (drag) {
			drag.deck.spin += (e.clientX - drag.x) * 0.02
			drag.x = e.clientX
			return
		}
		hovered = pick(e)
		canvas.style.cursor = hovered ? (hovered.userData.kind === 'platter' ? 'grab' : 'pointer') : ''
	})
	canvas.addEventListener('pointerleave', () => {
		hovered = null
		drag = null
	})
	canvas.addEventListener('pointerdown', (e) => {
		const hit = pick(e)
		if (!hit) return
		const kind = hit.userData.kind
		if (kind === 'pad') {
			hit.userData.press = 1
			opts.onPick(hit.userData.section)
		} else if (kind === 'play') {
			opts.onPlayToggle()
		} else if (kind === 'platter') {
			const deck = hit.userData.side === 'A' ? deckA : deckB
			drag = { deck, x: e.clientX }
			canvas.setPointerCapture(e.pointerId)
			canvas.style.cursor = 'grabbing'
		}
	})
	canvas.addEventListener('pointerup', () => {
		drag = null
	})

	// ─── Loop ────────────────────────────────────────────────────────────────
	function resize() {
		const w = canvas.clientWidth
		const h = canvas.clientHeight
		renderer.setSize(w, h, false)
		camera.aspect = w / h
		// Narrow windows: pull back so both decks still fit.
		camera.fov = w / h < 1.2 ? 55 : 40
		camera.updateProjectionMatrix()
	}
	new ResizeObserver(resize).observe(canvas)
	resize()

	let screenClock = 0
	const loop = createLoop(
		(dt, t) => {
			// Beat clock: the real audio when playing, otherwise a free-running 124 BPM.
			const audioPhase = beat.phase()
			const phase = audioPhase >= 0 ? audioPhase : (t * BPM) / 60 - Math.floor((t * BPM) / 60)
			const pulse = Math.exp(-phase * 5)
			const level = beat.playing ? beat.level() : 0.25 + pulse * 0.35

			// Camera: overview, or close on deck A while a section is open; slight parallax.
			const target = selected ? focusDeck : overview
			const px = parallax.x * (selected ? 0.15 : 0.5)
			const py = parallax.y * (selected ? 0.1 : 0.3)
			camPos.set(
				damp(camPos.x, target.pos.x + px, 3, dt),
				damp(camPos.y, target.pos.y - py, 3, dt),
				damp(camPos.z, target.pos.z, 3, dt)
			)
			camLook.set(
				damp(camLook.x, target.look.x, 3, dt),
				damp(camLook.y, target.look.y, 3, dt),
				damp(camLook.z, target.look.z, 3, dt)
			)
			camera.position.copy(camPos)
			camera.lookAt(camLook)

			// Platters: deck A spins while a section is loaded (33⅓-ish), drag scratches.
			for (const d of decks) {
				const playing = d === deckA ? !!selected : beat.playing
				const speed = playing ? 3.5 : 0
				d.spin = damp(d.spin, drag?.deck === d ? d.spin : speed, drag?.deck === d ? 0 : 2, dt)
				d.angle -= d.spin * dt
				d.platter.rotation.y = d.angle
				d.ring.color.setScalar(1)
				d.ring.color
					.set(d.side === 'A' ? '#5cb8ff' : '#ff5c8a')
					.multiplyScalar(0.5 + (playing ? pulse * 0.8 : 0.1))
				for (const p of d.pads) {
					const mat = p.material as MeshStandardMaterial
					const isSel = p.userData.section === selected && d === deckA
					const isHover = hovered === p
					p.userData.press = damp(p.userData.press ?? 0, 0, 10, dt)
					mat.emissiveIntensity = isSel ? 1.8 + pulse : isHover ? 1.4 : 0.45
					p.position.y = 0.5 - p.userData.press * 0.04
				}
				const playMat = d.play.material as MeshStandardMaterial
				playMat.emissiveIntensity = beat.playing ? 0.6 + pulse * 1.5 : hovered === d.play ? 1 : 0.25
			}
			if (selected) trackTime += dt

			// Mixer: faders and meters follow the music.
			faders[0].position.z = damp(faders[0].position.z, selected ? 1.3 : 0.6, 4, dt)
			faders[1].position.z = damp(faders[1].position.z, beat.playing ? 1.3 : 0.6, 4, dt)
			for (let c = 0; c < 2; c++) {
				const chLevel =
					c === 0 ? (selected || beat.playing ? level : 0.1) : beat.playing ? level * 0.9 : 0.05
				const lit = Math.round(chLevel * LEDS)
				for (let i = 0; i < LEDS; i++) meter.setColorAt(c * LEDS + i, i < lit ? ledOn[i] : ledOff)
			}
			if (meter.instanceColor) meter.instanceColor.needsUpdate = true

			// Room.
			wallMat.uniforms.uTime.value = t
			wallMat.uniforms.uPulse.value = 0.35 + pulse * 0.65 * (beat.playing ? 1 : 0.6)
			wallMat.uniforms.uHue.value = (t * 0.02) % 1
			stripMat.color.setHSL((t * 0.05) % 1, 0.8, 0.35 + pulse * 0.25)
			beams.forEach((b, i) => {
				const ph = b.userData.phase as number
				b.rotation.z = Math.sin(t * 0.6 + ph) * 0.5
				b.rotation.x = 0.5 + Math.cos(t * 0.45 + ph) * 0.25
				;(b.material as ShaderMaterial).uniforms.uIntensity.value =
					0.35 + (i % 2 === Math.floor(t * (BPM / 60)) % 2 ? pulse * 0.9 : 0.1)
			})
			spots.forEach((s, i) => {
				s.target.position.x = Math.sin(t * 0.7 + i * 2) * 4
				s.intensity = 25 + pulse * 45
			})
			const pos = moteGeo.attributes.position as BufferAttribute
			for (let i = 0; i < MOTES; i++) {
				let y = pos.getY(i) + dt * 0.08
				if (y > 8) y = -2
				pos.setY(i, y)
			}
			pos.needsUpdate = true

			// LCDs at ~30fps; they're canvas redraws, no need for every frame.
			screenClock += dt
			if (screenClock > 1 / 30) {
				screenClock = 0
				drawScreen(deckA, t)
				drawScreen(deckB, t)
			}

			renderer.render(scene, camera)
		},
		(ratio) => renderer.setPixelRatio(ratio)
	)
	loop.start()

	return {
		select(id) {
			if (id !== selected) trackTime = 0
			selected = id
		}
	}
}
