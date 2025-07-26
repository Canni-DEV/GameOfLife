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
}
