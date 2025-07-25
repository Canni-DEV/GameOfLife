import { Component, EventEmitter, Output, computed } from '@angular/core';
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

  step = this.game.stepCount;
  born = this.game.bornTotal;
  died = this.game.diedTotal;
  alive = computed(() => this.game.cells().size);
  ratio = computed(() => {
    const d = this.died();
    return d === 0 ? 0 : this.born() / d;
  });

  constructor(public game: GameOfLifeService) {
    this.game = game;
  }

  toggleMenu() { this.start.emit(); }
}
