type SfxKind = "sine" | "triangle" | "square";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function lerp(start: number, end: number, amount: number) {
  return start + (end - start) * amount;
}

function jitter(value: number, amount: number) {
  return value + (Math.random() * 2 - 1) * amount;
}

export class SnackAudioEngine {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private musicTimer: number | null = null;
  private step = 0;
  private muted = false;
  private danger = 0;
  private gameOver = false;

  async resume() {
    this.ensureContext();
    if (!this.context) {
      return;
    }

    if (this.context.state === "suspended") {
      await this.context.resume();
    }

    this.startMusicLoop();
  }

  dispose() {
    if (this.musicTimer !== null) {
      window.clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }

    if (this.context) {
      void this.context.close();
    }

    this.context = null;
    this.master = null;
    this.musicBus = null;
    this.sfxBus = null;
  }

  setMuted(nextMuted: boolean) {
    this.muted = nextMuted;
    if (this.master && this.context) {
      const now = this.context.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setTargetAtTime(nextMuted ? 0 : 0.8, now, 0.06);
    }
  }

  setMood(options: { danger: number; gameOver: boolean }) {
    this.danger = clamp(options.danger, 0, 1);
    this.gameOver = options.gameOver;
  }

  playDrop() {
    const base = lerp(260, 190, this.danger);
    this.playBlip({
      kind: "triangle",
      attack: 0.004,
      decay: 0.14,
      endFrequency: base * 0.78,
      frequency: jitter(base, 10),
      gain: 0.11,
    });
  }

  playMerge(chain: number) {
    const sizeBoost = clamp(chain, 1, 4);
    this.playBlip({
      kind: "sine",
      attack: 0.005,
      decay: 0.16,
      endFrequency: 390,
      frequency: 320 + sizeBoost * 18,
      gain: 0.1 + sizeBoost * 0.012,
    });

    this.playBlip({
      kind: "triangle",
      attack: 0.003,
      decay: 0.14,
      delay: 0.028,
      endFrequency: 520,
      frequency: 440 + sizeBoost * 16,
      gain: 0.065 + sizeBoost * 0.01,
    });
  }

  playChain(chain: number) {
    const sparkleCount = clamp(chain + 1, 2, 5);
    for (let index = 0; index < sparkleCount; index += 1) {
      this.playBlip({
        kind: "square",
        attack: 0.002,
        decay: 0.09,
        delay: index * 0.034,
        endFrequency: 760 + index * 40,
        frequency: 980 + index * 30,
        gain: 0.032,
      });
    }
  }

  playTierUp() {
    const notes = [460, 540, 680];
    notes.forEach((frequency, index) => {
      this.playBlip({
        kind: "triangle",
        attack: 0.004,
        decay: 0.16,
        delay: index * 0.05,
        endFrequency: frequency + 14,
        frequency,
        gain: 0.085,
      });
    });
  }

  playGameOver() {
    this.playBlip({
      kind: "sine",
      attack: 0.01,
      decay: 0.45,
      endFrequency: 108,
      frequency: 168,
      gain: 0.15,
    });
  }

  private ensureContext() {
    if (this.context || typeof window === "undefined") {
      return;
    }

    const AudioCtx = window.AudioContext;
    if (!AudioCtx) {
      return;
    }

    const context = new AudioCtx();
    const master = context.createGain();
    const musicBus = context.createGain();
    const sfxBus = context.createGain();
    const lowPass = context.createBiquadFilter();

    master.gain.value = this.muted ? 0 : 0.8;
    musicBus.gain.value = 0.16;
    sfxBus.gain.value = 0.6;
    lowPass.type = "lowpass";
    lowPass.frequency.value = 1600;
    lowPass.Q.value = 0.85;

    musicBus.connect(lowPass);
    lowPass.connect(master);
    sfxBus.connect(master);
    master.connect(context.destination);

    this.context = context;
    this.master = master;
    this.musicBus = musicBus;
    this.sfxBus = sfxBus;
  }

  private startMusicLoop() {
    if (this.musicTimer !== null || !this.context || !this.musicBus) {
      return;
    }

    const tick = () => {
      if (!this.context || !this.musicBus) {
        return;
      }

      const bpm = lerp(74, 126, this.danger);
      const beatMs = (60 / bpm) * 1000;
      const isPulseBeat = this.step % 4 === 0;
      const scale = this.danger > 0.65 ? [220, 247, 262, 294, 330] : [196, 220, 247, 262, 294];
      const rootIndex = this.step % scale.length;
      const root = scale[rootIndex];
      const accent = isPulseBeat ? 1.2 : 1;
      const wave: SfxKind = this.danger > 0.58 ? "triangle" : "sine";

      this.playBlip({
        bus: "music",
        kind: wave,
        attack: 0.012,
        decay: isPulseBeat ? 0.34 : 0.22,
        endFrequency: root * 0.985,
        frequency: root,
        gain: (this.gameOver ? 0.02 : 0.04) * accent,
      });

      if (this.danger > 0.45 && this.step % 2 === 0) {
        this.playBlip({
          bus: "music",
          kind: "triangle",
          attack: 0.006,
          decay: 0.12,
          delay: 0.02,
          endFrequency: root * 1.5,
          frequency: root * 1.62,
          gain: this.gameOver ? 0.012 : 0.02,
        });
      }

      this.step += 1;
      this.musicTimer = window.setTimeout(tick, beatMs);
    };

    tick();
  }

  private playBlip(options: {
    frequency: number;
    endFrequency: number;
    gain: number;
    attack: number;
    decay: number;
    kind: SfxKind;
    delay?: number;
    bus?: "music" | "sfx";
  }) {
    this.ensureContext();
    if (!this.context) {
      return;
    }

    const bus = options.bus === "music" ? this.musicBus : this.sfxBus;
    if (!bus) {
      return;
    }

    const now = this.context.currentTime + (options.delay ?? 0);
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();

    osc.type = options.kind;
    osc.frequency.setValueAtTime(options.frequency, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(60, options.endFrequency), now + options.decay);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(options.gain, now + options.attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + options.decay);

    osc.connect(gain);
    gain.connect(bus);

    osc.start(now);
    osc.stop(now + options.decay + 0.03);
  }
}
