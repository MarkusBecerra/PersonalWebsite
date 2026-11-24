/**
 * Rain on the window, synthesised with Web Audio: filtered noise for the hiss,
 * random ticks for drops on the glass, and a low rumble on demand for thunder.
 * Off until the visitor turns it on.
 */
export type Rain = {
	start(): Promise<void>
	stop(): void
	thunder(delay?: number): void
	readonly playing: boolean
}

export function createRain(): Rain {
	let ctx: AudioContext | null = null
	let master: GainNode
	let noise: AudioBuffer
	let hiss: AudioBufferSourceNode | null = null
	let timer = 0
	let playing = false

	function setup() {
		ctx = new AudioContext()
		master = ctx.createGain()
		master.gain.value = 0.5
		master.connect(ctx.destination)
		// Two seconds of brown-ish noise, looped.
		noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
		const ch = noise.getChannelData(0)
		let last = 0
		for (let i = 0; i < ch.length; i++) {
			const white = Math.random() * 2 - 1
			last = (last + 0.04 * white) / 1.04
			ch[i] = last * 3.5 + white * 0.15
		}
	}

	function drop() {
		if (!ctx) return
		const t = ctx.currentTime + Math.random() * 0.05
		const src = ctx.createBufferSource()
		src.buffer = noise
		const f = ctx.createBiquadFilter()
		f.type = 'bandpass'
		f.frequency.value = 2500 + Math.random() * 4000
		f.Q.value = 8
		const g = ctx.createGain()
		g.gain.setValueAtTime(0.25 * Math.random(), t)
		g.gain.exponentialRampToValueAtTime(0.001, t + 0.04)
		src.connect(f).connect(g).connect(master)
		src.start(t, Math.random())
		src.stop(t + 0.05)
	}

	return {
		async start() {
			if (!ctx) setup()
			await ctx!.resume()
			hiss = ctx!.createBufferSource()
			hiss.buffer = noise
			hiss.loop = true
			const lp = ctx!.createBiquadFilter()
			lp.type = 'lowpass'
			lp.frequency.value = 1400
			const hp = ctx!.createBiquadFilter()
			hp.type = 'highpass'
			hp.frequency.value = 250
			const g = ctx!.createGain()
			g.gain.value = 0.35
			hiss.connect(lp).connect(hp).connect(g).connect(master)
			hiss.start()
			timer = window.setInterval(() => {
				for (let i = 0; i < 3; i++) if (Math.random() < 0.6) drop()
			}, 60)
			playing = true
		},
		stop() {
			window.clearInterval(timer)
			hiss?.stop()
			hiss = null
			playing = false
			ctx?.suspend()
		},
		thunder(delay = 0.8) {
			if (!ctx || !playing) return
			const t = ctx.currentTime + delay
			const src = ctx.createBufferSource()
			src.buffer = noise
			src.loop = true
			const f = ctx.createBiquadFilter()
			f.type = 'lowpass'
			f.frequency.setValueAtTime(220, t)
			f.frequency.exponentialRampToValueAtTime(60, t + 3)
			const g = ctx.createGain()
			g.gain.setValueAtTime(0.001, t)
			g.gain.exponentialRampToValueAtTime(1.6, t + 0.15)
			g.gain.exponentialRampToValueAtTime(0.001, t + 3.5)
			src.connect(f).connect(g).connect(master)
			src.start(t)
			src.stop(t + 3.6)
		},
		get playing() {
			return playing
		}
	}
}
