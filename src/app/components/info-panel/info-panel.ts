import { Component, EventEmitter, Output, Signal, computed } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { GameOfLifeService } from '../../services/game-of-life';

@Component({
  selector: 'info-panel',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './info-panel.html',
  styleUrl: './info-panel.scss'
})
export class InfoPanelComponent {
  @Output() start = new EventEmitter<void>();
  @Output() stop = new EventEmitter<void>();

  step!: Signal<number>;
  born!: Signal<number>;
  died!: Signal<number>;
  alive!: Signal<number>;
  ratio!: Signal<number>;

  constructor(public game: GameOfLifeService) {
    this.step = game.stepCount;
    this.born = game.bornTotal;
    this.died = game.diedTotal;
    this.alive = computed(() => game.cells().size);
    this.ratio = computed(() => {
      const d = this.died();
      return d === 0 ? 0 : this.born() / d;
    });
  }

  startGame() { this.start.emit(); }
}
