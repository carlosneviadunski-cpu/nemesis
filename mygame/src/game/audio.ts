/**
 * Efeitos sonoros sintetizados com Web Audio (sem arquivos externos).
 * Leve, com limitação de taxa para sons frequentes (tiros/acertos).
 */
export type SfxName = "shoot" | "laser" | "hit" | "kill" | "pickup" | "levelup" | "dash" | "hurt" | "boss" | "explosion" | "forge" | "wave";

class Sfx {
  enabled = true;
  haptics = true;
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private last: Record<string, number> = {};
  private noiseBuf: AudioBuffer | null = null;

  /** Deve ser chamado a partir de um gesto do usuário (clique/toque). */
  init() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return;
    }
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 0.5;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } catch {
      this.ctx = null;
    }
  }

  vibrate(ms: number | number[]) {
    if (!this.haptics) return;
    try {
      navigator.vibrate?.(ms);
    } catch {
      /* ignore */
    }
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, slideTo?: number, delay = 0) {
    const ctx = this.ctx!;
    const t0 = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(this.master!);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  private noise(dur: number, vol: number, filterFreq: number, slideTo?: number, delay = 0) {
    const ctx = this.ctx!;
    if (!this.noiseBuf) return;
    const t0 = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.setValueAtTime(filterFreq, t0);
    if (slideTo) f.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), t0 + dur);
    f.Q.value = 0.8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f);
    f.connect(g);
    g.connect(this.master!);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  play(name: SfxName, pitch = 1) {
    if (!this.enabled || !this.ctx || !this.master) return;
    if (this.ctx.state === "suspended") void this.ctx.resume();
    const now = performance.now();
    const minGap: Partial<Record<SfxName, number>> = { shoot: 45, laser: 90, hit: 40, kill: 30, pickup: 60 };
    const gap = minGap[name] ?? 0;
    if (gap && now - (this.last[name] ?? 0) < gap) return;
    this.last[name] = now;
    switch (name) {
      case "shoot":
        this.tone(420 * pitch, 0.08, "square", 0.08, 160 * pitch);
        this.noise(0.05, 0.05, 2500, 800);
        break;
      case "laser":
        this.tone(1200 * pitch, 0.07, "sawtooth", 0.035, 900 * pitch);
        break;
      case "hit":
        this.tone(220, 0.04, "triangle", 0.06, 120);
        break;
      case "kill":
        this.tone(520 * pitch, 0.18, "triangle", 0.12, 90);
        this.noise(0.18, 0.12, 1200, 200);
        break;
      case "explosion":
        this.noise(0.45, 0.3, 500, 60);
        this.tone(90, 0.4, "sine", 0.2, 35);
        break;
      case "pickup":
        this.tone(880, 0.07, "sine", 0.08);
        this.tone(1320, 0.1, "sine", 0.08, undefined, 0.06);
        break;
      case "levelup":
        [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.18, "triangle", 0.12, undefined, i * 0.09));
        break;
      case "forge":
        this.noise(0.3, 0.15, 3000, 600);
        [392, 523, 784].forEach((f, i) => this.tone(f, 0.25, "square", 0.06, undefined, 0.1 + i * 0.08));
        break;
      case "dash":
        this.noise(0.22, 0.18, 400, 3000);
        break;
      case "hurt":
        this.tone(140, 0.2, "sawtooth", 0.14, 60);
        this.noise(0.12, 0.1, 300, 100);
        break;
      case "boss":
        this.tone(70, 1.2, "sawtooth", 0.2, 55);
        this.tone(105, 1.2, "square", 0.08, 82);
        break;
      case "wave":
        this.tone(330, 0.2, "triangle", 0.1);
        this.tone(440, 0.3, "triangle", 0.1, undefined, 0.15);
        break;
      default:
        break;
    }
  }
}

export const sfx = new Sfx();
