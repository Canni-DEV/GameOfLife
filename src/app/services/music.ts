import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class MusicService {
  static readonly SCALES: Record<string, number[]> = {
    major: [0, 2, 4, 5, 7, 9, 11],
    minor: [0, 2, 3, 5, 7, 8, 10],
    lydian: [0, 2, 4, 6, 7, 9, 11],
    dorian: [0, 2, 3, 5, 7, 9, 10]
  };

  private audio = new AudioContext();
  private scale = MusicService.SCALES['major'];
  private rootNote = 60;
  private horizontalStep = 1;
  private verticalStep = 2;
  private octaves = 5;
  private drumEnabled = false;
  private drumStep = 0;
  private bpmRatio = 60;
  private drumInterval = 16;
  private kickPos = 0;
  private snarePos = 8;
  readonly enabled = signal(false);

  setScale(name: string) {
    this.scale = MusicService.SCALES[name] ?? this.scale;
  }

  setSteps(hStep: number, vStep: number) {
    this.horizontalStep = Math.floor(hStep);
    this.verticalStep = Math.floor(vStep);
  }

  setOctaves(o: number) {
    this.octaves = Math.max(1, Math.floor(o));
  }

  setRootNote(n: number) {
    this.rootNote = Math.floor(n);
  }

  setDrumsEnabled(v: boolean) {
    this.drumEnabled = v;
  }

  setBpmRatio(r: number) {
    this.bpmRatio = Math.max(1, r);
  }

  setDrumInterval(i: number) {
    this.drumInterval = Math.max(1, Math.floor(i));
    this.kickPos %= this.drumInterval;
    this.snarePos %= this.drumInterval;
  }

  setKickPosition(pos: number) {
    this.kickPos = Math.floor(pos) % this.drumInterval;
  }

  setSnarePosition(pos: number) {
    this.snarePos = Math.floor(pos) % this.drumInterval;
  }

  setEnabled(v: boolean) {
    this.enabled.set(v);
    if (v && this.audio.state === 'suspended') this.audio.resume();
  }

  playCells(cells: [number, number][]) {
    if (!this.enabled()) return;
    if (this.audio.state === 'suspended') this.audio.resume();

    const maxSteps = this.scale.length * this.octaves;
    const notes = new Set<number>();

    for (const [x, y] of cells) {
      const xs = x * this.horizontalStep;
      const ys = y * this.verticalStep;
      const a = this.encodeCoord(xs);
      const b = this.encodeCoord(ys);
      const idx = this.cantorPairing(a, b);
      const wrapped = idx % maxSteps;
      const degreeIdx = wrapped % this.scale.length;
      const octaveIdx = Math.floor(wrapped / this.scale.length);
      const midi = this.rootNote + octaveIdx * 12 + this.scale[degreeIdx];
      notes.add(midi);
    }

    const now = this.audio.currentTime;
    for (const midi of notes) {
      this.spawnVoice(midi, now);
    }
  }

  private encodeCoord(n: number): number {
    return n >= 0
      ? 2 * n
      : -2 * n - 1;
  }

  private cantorPairing(a: number, b: number): number {
    const s = a + b;
    return (s * (s + 1)) / 2 + b;
  }

  private spawnVoice(midi: number, when: number) {
    const freq = 440 * Math.pow(2, (midi - 69) / 12);
    const osc = this.audio.createOscillator();
    const gain = this.audio.createGain();

    osc.frequency.value = freq;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.1, when);
    gain.gain.exponentialRampToValueAtTime(0.001, when + 0.3);

    osc.connect(gain).connect(this.audio.destination);
    osc.start(when);
    osc.stop(when + 0.4);
  }

  tick(speed: number) {
    if (!this.drumEnabled || !this.enabled()) return;
    const bpm = speed * this.bpmRatio;
    const interval = this.drumInterval;
    const now = this.audio.currentTime;

    if (this.drumStep % interval === this.kickPos) this.playKick(now);
    if (this.drumStep % interval === this.snarePos) this.playSnare(now);

    this.drumStep = (this.drumStep + 1) % interval;
  }

  private playKick(when: number) {
    const osc1 = this.audio.createOscillator();
    const osc2 = this.audio.createOscillator();
    const gain = this.audio.createGain();
    osc1.frequency.setValueAtTime(150, when);
    osc1.frequency.exponentialRampToValueAtTime(50, when + 0.1);
    osc2.frequency.setValueAtTime(90, when);
    osc2.frequency.exponentialRampToValueAtTime(30, when + 0.1);
    gain.gain.setValueAtTime(0.8, when);
    gain.gain.exponentialRampToValueAtTime(0.001, when + 0.5);
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.audio.destination);
    osc1.start(when);
    osc2.start(when);
    osc1.stop(when + 0.5);
    osc2.stop(when + 0.5);
  }

  private playSnare(when: number) {
    const buffer = this.audio.createBuffer(1, this.audio.sampleRate * 0.2, this.audio.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const noise = this.audio.createBufferSource();
    noise.buffer = buffer;
    const filter = this.audio.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1000;
    const gain = this.audio.createGain();
    gain.gain.setValueAtTime(0.3, when);
    gain.gain.exponentialRampToValueAtTime(0.001, when + 0.2);
    noise.connect(filter).connect(gain).connect(this.audio.destination);
    noise.start(when);
    noise.stop(when + 0.2);
  }
}

