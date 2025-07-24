import { Component, EventEmitter, Output } from '@angular/core';
import { GameOfLifeService } from '../../services/game-of-life';

@Component({
  selector: 'info-panel',
  imports: [],
  templateUrl: './info-panel.html',
  styleUrl: './info-panel.scss'
})
export class InfoPanelComponent {
  @Output() start = new EventEmitter<void>();
  @Output() stop = new EventEmitter<void>();

  constructor(public game: GameOfLifeService) {
    this.game = game;
  }

  toggleMenu() { this.start.emit(); }
}
