import { Component, signal, ViewChild } from '@angular/core';
import { GameCanvasComponent } from './components/game-canvas/game-canvas';
import { SidePanelComponent } from './components/side-panel/side-panel';
import { InfoPanelComponent } from './components/info-panel/info-panel';

@Component({
  selector: 'app-root',
  imports: [SidePanelComponent, GameCanvasComponent,InfoPanelComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('game-of-life');

  @ViewChild('canvas', { static: true })
  canvas!: GameCanvasComponent;

  setMusicEnabled(v: boolean) {
    this.canvas.setMusicEnabled(v);
  }

  setScale(name: string) {
    this.canvas.setScale(name);
  }

  setSteps(steps: [number, number]) {
    this.canvas.setSteps(steps[0], steps[1]);
  }

  setRootNote(n: number) {
    this.canvas.setRootNote(n);
  }

  setOctaves(o: number) {
    this.canvas.setOctaves(o);
  }

  setDrumsEnabled(v: boolean) {
    this.canvas.setDrumsEnabled(v);
  }
}
