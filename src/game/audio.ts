interface ChordStep {
  root: number;
  notes: number[];
  melody: number[];
}

// Cozy C-major / A-minor lo-fi jazz progression (Fmaj7 -> Em7 -> Dm7 -> Cmaj7)
const LOFI_PROGRESSION: ChordStep[] = [
  {
    root: 87.31, // F2
    notes: [174.61, 220.0, 261.63, 329.63], // Fmaj7
    melody: [523.25, 659.25, 587.33, 440.0],
  },
  {
    root: 82.41, // E2
    notes: [164.81, 196.0, 246.94, 293.66], // Em7
    melody: [493.88, 587.33, 659.25, 392.0],
  },
  {
    root: 73.42, // D2
    notes: [146.83, 174.61, 220.0, 261.63], // Dm7
    melody: [440.0, 523.25, 587.33, 659.25],
  },
  {
    root: 65.41, // C2
    notes: [130.81, 164.81, 196.0, 246.94], // Cmaj7
    melody: [392.0, 493.88, 523.25, 659.25],
  },
];

class SoundEffectsEngine {
  private ctx: AudioContext | null = null;
  private muted = false;

  // Lo-Fi music scheduler state
  private musicEnabled = true;
  private musicDucked = false;
  private musicPlaying = false;
  private musicGain: GainNode | null = null;
  private musicFilter: BiquadFilterNode | null = null;
  private musicCompressor: DynamicsCompressorNode | null = null;
  private musicMakeupGain: GainNode | null = null;
  private musicLimiter: DynamicsCompressorNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private vinylBuffer: AudioBuffer | null = null;
  private vinylSource: AudioBufferSourceNode | null = null;
  private vinylGain: GainNode | null = null;
  private schedulerId: number | null = null;
  private stepIndex = 0;
  private nextStepTime = 0;

  private getOrCreateContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    return this.ctx;
  }

  private ensureContext(): AudioContext | null {
    if (this.muted) return null;
    const ctx = this.getOrCreateContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }

  private ensureMusicBus(ctx: AudioContext) {
    if (!this.musicFilter) {
      this.musicFilter = ctx.createBiquadFilter();
      this.musicFilter.type = 'lowpass';
      this.musicFilter.frequency.setValueAtTime(4200, ctx.currentTime);
      this.musicFilter.Q.setValueAtTime(0.5, ctx.currentTime);
    }
    if (!this.musicCompressor) {
      this.musicCompressor = ctx.createDynamicsCompressor();
      this.musicCompressor.threshold.setValueAtTime(-18, ctx.currentTime);
      this.musicCompressor.knee.setValueAtTime(10, ctx.currentTime);
      this.musicCompressor.ratio.setValueAtTime(4, ctx.currentTime);
      this.musicCompressor.attack.setValueAtTime(0.005, ctx.currentTime);
      this.musicCompressor.release.setValueAtTime(0.15, ctx.currentTime);
    }
    if (!this.musicMakeupGain) {
      this.musicMakeupGain = ctx.createGain();
      this.musicMakeupGain.gain.setValueAtTime(2.6, ctx.currentTime);
    }
    if (!this.musicLimiter) {
      this.musicLimiter = ctx.createDynamicsCompressor();
      this.musicLimiter.threshold.setValueAtTime(-1.5, ctx.currentTime);
      this.musicLimiter.knee.setValueAtTime(0, ctx.currentTime);
      this.musicLimiter.ratio.setValueAtTime(20, ctx.currentTime);
      this.musicLimiter.attack.setValueAtTime(0.002, ctx.currentTime);
      this.musicLimiter.release.setValueAtTime(0.08, ctx.currentTime);
    }
    if (!this.musicGain) {
      this.musicGain = ctx.createGain();
      this.musicGain.gain.setValueAtTime(0.0001, ctx.currentTime);
      this.musicFilter.connect(this.musicCompressor);
      this.musicCompressor.connect(this.musicMakeupGain);
      this.musicMakeupGain.connect(this.musicLimiter);
      this.musicLimiter.connect(this.musicGain);
      this.musicGain.connect(ctx.destination);
    }
    if (!this.noiseBuffer) {
      const len = Math.floor(ctx.sampleRate * 0.25);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      this.noiseBuffer = buf;
    }
    if (!this.vinylBuffer) {
      const len = Math.floor(ctx.sampleRate * 3.0);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        const white = Math.random() * 2 - 1;
        lp = lp * 0.92 + white * 0.08;
        const crackle = Math.random() < 0.0014 ? (Math.random() * 2 - 1) * 0.42 : 0;
        data[i] = lp * 0.09 + crackle;
      }
      this.vinylBuffer = buf;
    }
  }

  private syncMusicGain() {
    if (!this.ctx || !this.musicGain) return;
    const now = this.ctx.currentTime;
    const active = !this.muted && this.musicEnabled;
    const target = active ? (this.musicDucked ? 0.42 : 1.0) : 0.0001;
    this.musicGain.gain.cancelScheduledValues(now);
    this.musicGain.gain.setTargetAtTime(target, now, 0.05);
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    this.syncMusicGain();
    if (!muted && this.musicEnabled) {
      this.startMusic();
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMusicEnabled(enabled: boolean) {
    this.musicEnabled = enabled;
    this.syncMusicGain();
    if (enabled && !this.muted) {
      this.startMusic();
    } else if (!enabled) {
      this.stopMusic();
    }
  }

  public isMusicEnabled(): boolean {
    return this.musicEnabled;
  }

  public setMusicDucked(ducked: boolean) {
    this.musicDucked = ducked;
    this.syncMusicGain();
  }

  public unlockAndStartMusic() {
    if (this.muted || !this.musicEnabled) return;
    this.startMusic();
  }

  public startMusic() {
    if (this.muted || !this.musicEnabled) return;
    const ctx = this.getOrCreateContext();
    if (!ctx) return;

    this.ensureMusicBus(ctx);

    if (ctx.state === 'suspended') {
      ctx.resume()
        .then(() => {
          this.nextStepTime = ctx.currentTime + 0.04;
          this.syncMusicGain();
        })
        .catch(() => {});
    }

    this.syncMusicGain();

    if (this.musicPlaying) return;
    this.musicPlaying = true;
    this.nextStepTime = ctx.currentTime + 0.06;

    // Gentle vinyl crackle loop
    if (this.vinylBuffer && this.musicFilter && !this.vinylSource) {
      const src = ctx.createBufferSource();
      src.buffer = this.vinylBuffer;
      src.loop = true;

      const hp = ctx.createBiquadFilter();
      hp.type = 'bandpass';
      hp.frequency.setValueAtTime(1600, ctx.currentTime);
      hp.Q.setValueAtTime(0.7, ctx.currentTime);

      const vGain = ctx.createGain();
      vGain.gain.setValueAtTime(0.18, ctx.currentTime);

      src.connect(hp);
      hp.connect(vGain);
      vGain.connect(this.musicFilter);
      src.start(ctx.currentTime);

      this.vinylSource = src;
      this.vinylGain = vGain;
    }

    const scheduleAheadSec = 0.16;
    const bpm = 112;
    const stepDuration = 60 / bpm / 2; // 112 BPM eighth-note grid

    const runScheduler = () => {
      if (!this.musicPlaying || !this.ctx) return;
      if (this.ctx.state !== 'running') return;
      if (this.nextStepTime < this.ctx.currentTime - 0.35) {
        this.nextStepTime = this.ctx.currentTime + 0.04;
      }
      while (this.nextStepTime < this.ctx.currentTime + scheduleAheadSec) {
        const swingOffset = this.stepIndex % 2 === 1 ? 0.016 : 0;
        this.scheduleLofiStep(
          this.ctx,
          this.stepIndex,
          this.nextStepTime + swingOffset,
          stepDuration
        );
        this.nextStepTime += stepDuration;
        this.stepIndex = (this.stepIndex + 1) % 32; // 4 bars x 8 eighth-notes
      }
    };

    runScheduler();
    this.schedulerId = window.setInterval(runScheduler, 35);
  }

  public stopMusic() {
    this.musicPlaying = false;
    if (this.schedulerId !== null) {
      window.clearInterval(this.schedulerId);
      this.schedulerId = null;
    }
    if (this.vinylSource) {
      try {
        this.vinylSource.stop();
        this.vinylSource.disconnect();
      } catch {
        // ignore stop errors
      }
      this.vinylSource = null;
    }
    if (this.vinylGain) {
      this.vinylGain.disconnect();
      this.vinylGain = null;
    }
    this.syncMusicGain();
  }

  private scheduleLofiStep(
    ctx: AudioContext,
    step: number,
    time: number,
    stepDuration: number
  ) {
    if (!this.musicFilter || this.muted || !this.musicEnabled) return;

    const bar = Math.floor(step / 8); // 0..3
    const barStep = step % 8; // 0..7
    const chord = LOFI_PROGRESSION[bar];

    // 1. Warm Rhodes Electric Piano chord with tighter upbeat decay
    if (barStep === 0) {
      chord.notes.forEach((freq, idx) => {
        const strum = idx * 0.018;
        this.playRhodesNote(ctx, freq, time + strum, 1.55, 0.22);
      });
      this.playSubBass(ctx, chord.root, time, 0.95, 0.46);
    }

    // Bouncy chord stabs on off-beats for faster groove
    if (barStep === 3 || barStep === 5) {
      this.playRhodesNote(ctx, chord.notes[1], time, 0.45, 0.14);
      this.playRhodesNote(ctx, chord.notes[3], time + 0.012, 0.45, 0.14);
      if (barStep === 5) {
        this.playSubBass(ctx, chord.root * 1.5, time, 0.32, 0.3);
      }
    }

    // 2. Brisker dreamy melody plucks (present on speakers)
    if (barStep === 1 || barStep === 2 || barStep === 4 || barStep === 6) {
      const mIdx = (bar + barStep) % chord.melody.length;
      const noteFreq = chord.melody[mIdx];
      this.playRhodesNote(ctx, noteFreq, time, 0.42, 0.19);
    }

    // 3. Upbeat Lo-Fi Boom-Bap Drums
    if (barStep === 0 || barStep === 3 || barStep === 5) {
      this.playLofiKick(
        ctx,
        time,
        barStep === 0 ? 0.62 : barStep === 5 ? 0.5 : 0.38
      );
    }

    // Crisp lo-fi snare on beats 2 & 4
    if (barStep === 2 || barStep === 6) {
      this.playLofiSnare(ctx, time, 0.38);
    }

    // Driving swung hi-hats + occasional 16th-note double-hit
    const hatGain = barStep % 2 === 0 ? 0.14 : 0.095;
    this.playLofiHat(ctx, time, hatGain);
    if (barStep === 3 || barStep === 7) {
      this.playLofiHat(ctx, time + stepDuration * 0.5, 0.07);
    }
  }

  private playRhodesNote(
    ctx: AudioContext,
    freq: number,
    time: number,
    duration: number,
    peakGain: number
  ) {
    if (!this.musicFilter) return;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    // Slight tape pitch drift for warm lo-fi character
    const wobble = (Math.random() - 0.5) * 6;
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, time);
    osc1.detune.setValueAtTime(-4 + wobble, time);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq, time);
    osc2.detune.setValueAtTime(5 + wobble, time);

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(peakGain, time + 0.03);
    gain.gain.exponentialRampToValueAtTime(peakGain * 0.48, time + duration * 0.4);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    const osc2Gain = ctx.createGain();
    osc2Gain.gain.setValueAtTime(0.48, time);

    osc1.connect(gain);
    osc2.connect(osc2Gain);
    osc2Gain.connect(gain);
    gain.connect(this.musicFilter);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + duration + 0.05);
    osc2.stop(time + duration + 0.05);
  }

  private playSubBass(
    ctx: AudioContext,
    freq: number,
    time: number,
    duration: number,
    peakGain: number
  ) {
    if (!this.musicFilter) return;
    // Fundamental sub + warm upper octave harmonic so small laptop/phone speakers reproduce the bassline clearly
    const subOsc = ctx.createOscillator();
    const warmOsc = ctx.createOscillator();
    const warmGain = ctx.createGain();
    const gain = ctx.createGain();

    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(freq, time);

    warmOsc.type = 'triangle';
    warmOsc.frequency.setValueAtTime(freq * 2, time);
    warmGain.gain.setValueAtTime(0.55, time);

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(peakGain, time + 0.035);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    subOsc.connect(gain);
    warmOsc.connect(warmGain);
    warmGain.connect(gain);
    gain.connect(this.musicFilter);
    subOsc.start(time);
    warmOsc.start(time);
    subOsc.stop(time + duration + 0.05);
    warmOsc.stop(time + duration + 0.05);
  }

  private playLofiKick(ctx: AudioContext, time: number, level: number) {
    if (!this.musicFilter) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(125, time);
    osc.frequency.exponentialRampToValueAtTime(46, time + 0.11);

    gain.gain.setValueAtTime(level, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.22);

    osc.connect(gain);
    gain.connect(this.musicFilter);
    osc.start(time);
    osc.stop(time + 0.24);

    // Subtle mid-bass punch so kick rhythm cuts through built-in speakers
    const punch = ctx.createOscillator();
    const pGain = ctx.createGain();
    punch.type = 'triangle';
    punch.frequency.setValueAtTime(180, time);
    punch.frequency.exponentialRampToValueAtTime(82, time + 0.065);
    pGain.gain.setValueAtTime(level * 0.45, time);
    pGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.08);

    punch.connect(pGain);
    pGain.connect(this.musicFilter);
    punch.start(time);
    punch.stop(time + 0.09);
  }

  private playLofiSnare(ctx: AudioContext, time: number, level: number) {
    if (!this.musicFilter || !this.noiseBuffer) return;

    // Warm noise brush
    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1500, time);
    filter.Q.setValueAtTime(0.75, time);

    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(level, time);
    nGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.13);

    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(this.musicFilter);
    noise.start(time);
    noise.stop(time + 0.14);

    // Snare body thump
    const body = ctx.createOscillator();
    const bGain = ctx.createGain();
    body.type = 'triangle';
    body.frequency.setValueAtTime(185, time);
    body.frequency.exponentialRampToValueAtTime(110, time + 0.07);
    bGain.gain.setValueAtTime(level * 0.72, time);
    bGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.09);

    body.connect(bGain);
    bGain.connect(this.musicFilter);
    body.start(time);
    body.stop(time + 0.1);
  }

  private playLofiHat(ctx: AudioContext, time: number, level: number) {
    if (!this.musicFilter || !this.noiseBuffer) return;
    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(4200, time);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(level, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.045);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicFilter);
    noise.start(time);
    noise.stop(time + 0.055);
  }

  public playWaterCollect() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(860, now + 0.14);
    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.17);
  }

  public playTapFix() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [520, 780].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const t = now + idx * 0.06;
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.15, t + 0.08);
      gain.gain.setValueAtTime(0.26, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.11);
    });
  }

  public playCisternBank() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const t = now + idx * 0.055;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.19);
    });
  }

  public playFoodCollect() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(360, now);
    osc.frequency.exponentialRampToValueAtTime(590, now + 0.11);
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.14);
  }

  public playOrphanageDonate() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const t = now + idx * 0.065;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.22, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.25);
    });
  }

  public playCourierLaunch() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(640, now + 0.16);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.19);
  }

  public playDamage() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(190, now);
    osc.frequency.exponentialRampToValueAtTime(95, now + 0.16);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.19);
  }

  public playHeal() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [440, 587.33].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const t = now + idx * 0.05;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.16, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.15);
    });
  }

  public playVictory() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const t = now + idx * 0.09;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.24, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.36);
    });
  }

  public playMysteryBoxOpen(polarity: 'easier' | 'harder') {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes =
      polarity === 'easier'
        ? [392.0, 493.88, 587.33, 783.99, 987.77]
        : [220.0, 261.63, 311.13, 415.3, 466.16];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = polarity === 'easier' ? 'sine' : 'triangle';
      const t = now + idx * 0.07;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.33);
    });
  }

  public playBossHit() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(75, now + 0.18);
    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.21);
  }

  public playBossWarning() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [160, 140].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const t = now + idx * 0.14;
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.85, t + 0.12);
      gain.gain.setValueAtTime(0.22, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.14);
    });
  }

  public playTutorialStep() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [587.33, 880].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const t = now + idx * 0.065;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.19);
    });
  }

  public playMysteryPickupReveal(polarity: 'good' | 'bad') {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes =
      polarity === 'good'
        ? [523.25, 659.25, 783.99, 1046.5]
        : [329.63, 277.18, 207.65];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = polarity === 'good' ? 'sine' : 'sawtooth';
      const t = now + idx * 0.065;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(polarity === 'good' ? 0.22 : 0.14, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.23);
    });
  }
}

export const soundFx = new SoundEffectsEngine();
