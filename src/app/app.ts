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
}
