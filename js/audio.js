/**
 * Audio Synthesizer: Giả lập âm thanh động cơ, drift, nitro bằng Web Audio API
 * Không phụ thuộc vào bất kỳ file âm thanh MP3/WAV bên ngoài nào
 */
class SoundManager {
    constructor() {
        this.ctx = null;
        this.engineOsc = null;
        this.engineGain = null;
        this.driftNoise = null;
        this.driftGain = null;
        this.isInitialized = false;
    }

    init() {
        if (this.isInitialized) return;
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        this.ctx = new AudioCtx();

        // 1. Âm thanh động cơ
        this.engineOsc = this.ctx.createOscillator();
        this.engineGain = this.ctx.createGain();
        this.engineOsc.type = 'sawtooth';
        this.engineOsc.frequency.setValueAtTime(60, this.ctx.currentTime);
        this.engineGain.gain.setValueAtTime(0.05, this.ctx.currentTime);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(450, this.ctx.currentTime);

        this.engineOsc.connect(filter);
        filter.connect(this.engineGain);
        this.engineGain.connect(this.ctx.destination);
        this.engineOsc.start();

        // 2. Âm thanh Drift (Noise generator)
        const bufferSize = this.ctx.sampleRate * 2;
        const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        const whiteNoise = this.ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;

        const driftFilter = this.ctx.createBiquadFilter();
        driftFilter.type = 'bandpass';
        driftFilter.frequency.setValueAtTime(1000, this.ctx.currentTime);
        driftFilter.Q.setValueAtTime(3, this.ctx.currentTime);

        this.driftGain = this.ctx.createGain();
        this.driftGain.gain.setValueAtTime(0, this.ctx.currentTime);

        whiteNoise.connect(driftFilter);
        driftFilter.connect(this.driftGain);
        this.driftGain.connect(this.ctx.destination);
        whiteNoise.start();

        this.isInitialized = true;
    }

    updateEngine(speed, maxSpeed) {
        if (!this.ctx || !this.engineOsc) return;
        const ratio = Math.min(Math.abs(speed) / maxSpeed, 1.2);
        const targetFreq = 50 + ratio * 200;
        this.engineOsc.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.05);
    }

    setDrift(active) {
        if (!this.ctx || !this.driftGain) return;
        const target = active ? 0.09 : 0;
        this.driftGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.08);
    }

    playNitro() {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.4);

        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.5);
    }

    playBoostPad() {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.25);

        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.25);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.25);
    }

    playLapSound() {
        if (!this.ctx) return;
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime + i * 0.08);
            gain.gain.setValueAtTime(0.12, this.ctx.currentTime + i * 0.08);
            gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + i * 0.08 + 0.12);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(this.ctx.currentTime + i * 0.08);
            osc.stop(this.ctx.currentTime + i * 0.08 + 0.12);
        });
    }
}
