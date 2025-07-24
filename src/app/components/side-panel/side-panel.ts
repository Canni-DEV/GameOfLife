import { Component, EventEmitter, effect, Output, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameOfLifeService } from '../../services/game-of-life';

interface Pattern { name: string; coords: [number, number][]; }
interface RulePreset {
  name: string;
  survive: number[];
  born: number[];
}
const PATTERNS = signal<Pattern[]>([
  { name: 'Block', coords: [[0,0],[0,1],[1,0],[1,1]] },
  { name: 'Beehive', coords: [[1,0],[2,0],[0,1],[3,1],[1,2],[2,2]] },
  { name: 'Loaf', coords: [[1,0],[2,0],[0,1],[3,1],[1,2],[3,2],[2,3]] },
  { name: 'Boat', coords: [[0,0],[1,0],[0,1],[2,1],[1,2]] },
  { name: 'Tub', coords: [[1,0],[0,1],[2,1],[1,2]] },
  { name: 'Blinker', coords: [[-1,0],[0,0],[1,0]] },
  { name: 'Toad', coords: [[-1,0],[0,0],[1,0],[0,1],[1,1],[2,1]] },
  { name: 'Beacon', coords: [[-1,-1],[0,-1],[-1,0],[0,0],[1,1],[2,1],[1,2],[2,2]] },
  { name: 'Pulsar', coords: [
    [2,0],[3,0],[4,0],[8,0],[9,0],[10,0],
    [0,2],[5,2],[7,2],[12,2],
    [0,3],[5,3],[7,3],[12,3],
    [0,4],[5,4],[7,4],[12,4],
    [2,5],[3,5],[4,5],[8,5],[9,5],[10,5]
  ] },
  { name: 'Pentadecathlon', coords: [
    [-4,0],[-3,0],[-2,0],[-1,0],[0,0],
    [1,0], [2,0],[3,0],[4,0],[5,0],
    [6,0],[7,0]
  ] },
  { name: 'Glider', coords: [[0,1],[1,2],[2,0],[2,1],[2,2]] },
  { name: 'Lightweight spaceship (LWSS)', coords: [[0,1],[0,4],[1,0],[2,0],[3,0],[4,0],[4,1],[4,2],[3,3],[1,3],[0,2]] },
  { name: 'Middleweight spaceship (MWSS)', coords: [[0,1],[0,4],[1,0],[2,0],[3,0],[4,0],[5,0],[5,1],[5,2],[4,3],[2,3],[1,3],[0,2]] },
  { name: 'Heavyweight spaceship (HWSS)', coords: [[0,1],[0,5],[1,0],[2,0],[3,0],[4,0],[5,0],[6,0],[6,1],[6,2],[5,3],[3,3],[1,3],[0,2]] },
  { name: 'R-pentomino', coords: [[0,1],[1,1],[2,1],[1,0],[1,2]] },
  { name: 'Diehard', coords: [[6,0],[0,1],[1,1],[1,2],[5,2],[6,2],[7,2]] },
  { name: 'Acorn', coords: [[1,0],[3,1],[0,2],[1,2],[4,2],[5,2],[6,2]] },
]);

@Component({
  selector: 'side-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: `./side-panel.html`,
  styleUrls: ['./side-panel.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})

export class SidePanelComponent {
  // señal para inputs de reglas
  survive = signal('2,3');
  born = signal('3');
  speed = signal(10);
  patterns = PATTERNS;

  open = signal(false);

    // 1) Lista de presets, con “Conway’s Life” seleccionado por defecto
  rulePresets: RulePreset[] = [
    { name: 'Conway’s Life',        survive: [2,3],     born: [3]    },
    { name: 'HighLife',              survive: [2,3],     born: [3,6]  },
    { name: 'Seeds',                 survive: [],        born: [2]    },
    { name: 'Life without death',    survive: [0,1,2,3,4,5,6,7,8], born: [3] },
    { name: 'Day & Night',           survive: [3,4,6,7,8], born: [3,6,7,8] },
    { name: 'Replicator',            survive: [1,3,5,7], born: [1,3,5,7] },
    { name: 'Diamoeba',              survive: [5,6,7,8], born: [3,5,6,7,8] },
    { name: '2×2 (Move)',            survive: [1,2,5],   born: [3,6]  },
    { name: 'Maze',                  survive: [1,2,3,4,5], born: [3]   },
    { name: 'Anneal',                survive: [3,5,6,7,8], born: [4,6,7,8] }
  ];
  currentPreset = this.rulePresets[0].name;

  @Output() start = new EventEmitter<void>();
  @Output() stop = new EventEmitter<void>();
  @Output() speedChange = new EventEmitter<number>();
  @Output() patternSelected = new EventEmitter<[number, number][]>();

  constructor(public game: GameOfLifeService) {
    // cada vez que cambien survive/born aplico reglas automáticamente
    effect(() => {
      const s = this.survive().split(',').map(n => +n);
      const b = this.born().split(',').map(n => +n);
      this.game.setRules(s, b);
    });
  }

   onRulePresetChange(event: Event) {
    const sel = (event.target as HTMLSelectElement).value;
    const preset = this.rulePresets.find(r => r.name === sel);
    if (!preset) return;
    this.currentPreset = preset.name;
    this.survive.set(preset.survive.join(','));
    this.born.set(preset.born.join(','));
  }

  insertPattern(coords: [number, number][]) {
    this.game.insertPattern(coords);
  }

  onSurviveChange(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.survive.set(value);
  }

  onBornChange(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.born.set(value);
  }

  onSpeedChange(e: Event) {
    const v = Math.max(1, Math.min(120, +(<HTMLInputElement>e.target).value));
    this.speed.set(v);
    this.speedChange.emit(v);
  }

  toggleMenu() { this.open.set(!this.open()); }

  selectPattern(pattern: Pattern) {
    this.patternSelected.emit(pattern.coords);
  }

  onPatternChange(event: Event) {
    const name = (event.target as HTMLSelectElement).value;
    let pattern = this.patterns().find(p => p.name === name);
    if(!pattern)
      pattern = { name: 'Block', coords: [[0,0]] };
    if (pattern) this.selectPattern(pattern);
  }

  onRLEFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      this.game.loadFromRLE(text);
    };
    reader.readAsText(file);
  }
}
