import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class MusicService {
    static readonly SCALES: Record<string, number[]> = {
    major:  [0,2,4,5,7,9,11],
    minor:  [0,2,3,5,7,8,10],
    lydian: [0,2,4,6,7,9,11],
    dorian: [0,2,3,5,7,9,10]
  };

  private readonly audio = new AudioContext();
  private scale: number[] = MusicService.SCALES['major'];
  private readonly rootNote = 60; // MIDI note C4
  readonly enabled = signal(false);



  setEnabled(v: boolean): void {
    this.enabled.set(v);
  }

  setScale(name: string): void {
    this.scale = MusicService.SCALES[name] ?? MusicService.SCALES['major'];
  }

  playCells(cells: [number, number][]): void {
    if (!this.enabled()) return;
    for (const [, y] of cells) {
      this.playRow(y);
    }
  }

  private playRow(row: number): void {
    const midi = this.midiFromRow(row);
    const freq = 440 * Math.pow(2, (midi - 69) / 12);
    const osc = this.audio.createOscillator();
    const gain = this.audio.createGain();
    osc.frequency.value = freq;
    osc.type = 'sine';
    const now = this.audio.currentTime;
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(gain).connect(this.audio.destination);
    osc.start();
    osc.stop(now + 0.4);
  }

  private midiFromRow(row: number): number {
    const len = this.scale.length;
    const idx = ((row % len) + len) % len;
    const octave = Math.floor(row / len);
    return this.rootNote + octave * 12 + this.scale[idx];
  }
}
