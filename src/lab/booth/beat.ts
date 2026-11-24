/**
 * A tiny house loop synthesised in the browser with Web Audio: kick on every
 * beat, open hat on the off-beat, clap on 2 and 4, and a filtered bass line.
 * No audio files, so nothing to download; it only starts when the visitor
 * presses play (browsers require a gesture anyway).
 */

export const BPM = 124

export type Beat = {
	start(): Promise<void>
	stop(): void
	readonly playing: boolean
	/** 0..1 loudness right now, for meters and lights. */
	level(): number
	/** Position within the current beat, 0..1, from the audio clock. */
	phase(): number
}

export function createBeat(): Beat {
	let ctx: AudioContext | null = null
	let master: GainNode
	let analyser: AnalyserNode
	let noise: AudioBuffer
	let timer = 0
	let nextTime = 0
	let step = 0
	let startedAt = 0
	let playing = false
	const data = new Uint8Array(256)
	const spb = 60 / BPM
	const sixteenth = spb / 4
	// A minor-ish bass riff, one note per 8th note off-beat.
	const bassNotes = [45, 45, 48, 45, 43, 45, 52, 50]

	function setup() {
		ctx = new AudioContext()
		master = ctx.createGain()
		master.gain.value = 0.55
		const comp = ctx.createDynamicsCompressor()
		analyser = ctx.createAnalyser()
		analyser.fftSize = 512
		master.connect(comp).connect(analyser).connect(ctx.destination)
		noise = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate)
		const ch = noise.getChannelData(0)
		for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1
	}

	function kick(t: number) {
		const o = ctx!.createOscillator()
		const g = ctx!.createGain()
		o.frequency.setValueAtTime(140, t)
		o.frequency.exponentialRampToValueAtTime(42, t + 0.12)
		g.gain.setValueAtTime(1, t)
		g.gain.exponentialRampToValueAtTime(0.001, t + 0.38)
		o.connect(g).connect(master)
		o.start(t)
		o.stop(t + 0.4)
	}

	function noiseHit(t: number, type: BiquadFilterType, freq: number, dur: number, vol: number) {
		const src = ctx!.createBufferSource()
		src.buffer = noise
		const f = ctx!.createBiquadFilter()
		f.type = type
		f.frequency.value = freq
		const g = ctx!.createGain()
		g.gain.setValueAtTime(vol, t)
		g.gain.exponentialRampToValueAtTime(0.001, t + dur)
		src.connect(f).connect(g).connect(master)
		src.start(t)
		src.stop(t + dur)
	}

	function bass(t: number, midi: number) {
		const o = ctx!.createOscillator()
		o.type = 'sawtooth'
		o.frequency.value = 440 * Math.pow(2, (midi - 69) / 12)
		const f = ctx!.createBiquadFilter()
		f.type = 'lowpass'
		f.frequency.setValueAtTime(900, t)
		f.frequency.exponentialRampToValueAtTime(160, t + 0.18)
		f.Q.value = 6
		const g = ctx!.createGain()
		g.gain.setValueAtTime(0.0001, t)
		g.gain.exponentialRampToValueAtTime(0.32, t + 0.01)
		g.gain.exponentialRampToValueAtTime(0.001, t + 0.22)
		o.connect(f).connect(g).connect(master)
		o.start(t)
		o.stop(t + 0.25)
	}

	function schedule() {
		while (nextTime < ctx!.currentTime + 0.12) {
			const s = step % 16
			if (s % 4 === 0) kick(nextTime)
			if (s % 4 === 2) {
				noiseHit(nextTime, 'highpass', 7000, 0.12, 0.22)
				bass(nextTime, bassNotes[(step >> 2) % bassNotes.length])
			}
			if (s % 2 === 1) noiseHit(nextTime, 'highpass', 9000, 0.03, 0.07)
			if (s === 4 || s === 12) noiseHit(nextTime, 'bandpass', 1500, 0.16, 0.45)
			nextTime += sixteenth
			step++
		}
	}

	return {
		async start() {
			if (!ctx) setup()
			await ctx!.resume()
			step = 0
			nextTime = ctx!.currentTime + 0.05
			startedAt = nextTime
			schedule()
			timer = window.setInterval(schedule, 25)
			playing = true
		},
		stop() {
			window.clearInterval(timer)
			playing = false
			ctx?.suspend()
		},
		get playing() {
			return playing
		},
		level() {
			if (!playing || !ctx) return 0
			analyser.getByteTimeDomainData(data)
			let peak = 0
			for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i] - 128))
			return Math.min(1, peak / 90)
		},
		phase() {
			if (!playing || !ctx) return -1
			const beats = (ctx.currentTime - startedAt) / spb
			return beats - Math.floor(beats)
		}
	}
}
