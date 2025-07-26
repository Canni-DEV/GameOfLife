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
  // 3 cells – oscillator p2 (“Blinker”)
  { name: 'Blinker', coords: [[-1,0],[0,0],[1,0]] },

  // 4 cells – still lifes
  { name: 'Block', coords: [[0,0],[0,1],[1,0],[1,1]] },      // 2×2 block
  { name: 'Tub',   coords: [[1,0],[0,1],[2,1],[1,2]] },      // “tub” still life

  // 5 cells – small patterns
  { name: 'Boat',               coords: [[0,0],[1,0],[0,1],[2,1],[1,2]] }, // boat still life
  { name: 'R-pentomino',        coords: [[0,1],[1,1],[2,1],[1,0],[1,2]] }, // five-cell pentomino
  { name: 'Cross',              coords: [[0,1],[1,1],[2,1],[1,0],[1,2]] }, // p2 oscillator (“Cross”)
  { name: 'Glider',             coords: [[0,1],[1,2],[2,0],[2,1],[2,2]] }, // lightweight spaceship (period 4)
  { name: 'Hustler (p3 Oscillator)', coords: [[0,0],[1,0],[2,0],[1,1],[1,2]] }, // 3-cell oscillator

  // 6 cells – slightly larger oscillators/ships
  { name: 'Beehive',            coords: [[1,0],[2,0],[0,1],[3,1],[1,2],[2,2]] }, // still life “beehive”
  { name: 'Toad',               coords: [[-1,0],[0,0],[1,0],[0,1],[1,1],[2,1]] }, // oscillator period 2
  { name: 'Hustler II (p4 Oscillator)', coords: [[0,1],[1,1],[1,0],[2,0],[2,2],[3,2]] }, // 4-period oscillator
  { name: 'Pipsquirter (p6 Oscillator)', coords: [[0,1],[1,1],[2,1],[1,0],[1,2],[4,1]] }, // p6 oscillator

  // 7 cells – medium still lifes/oscillators
  { name: 'Loaf',               coords: [[1,0],[2,0],[0,1],[3,1],[1,2],[3,2],[2,3]] }, // still life “loaf”
  { name: 'Diehard',            coords: [[6,0],[0,1],[1,1],[1,2],[5,2],[6,2],[7,2]] }, // methuselah (dies in 130 generations)
  { name: 'Acorn',              coords: [[1,0],[3,1],[0,2],[1,2],[4,2],[5,2],[6,2]] }, // methuselah (long tail)

  // 8 cells – larger oscillators and bumpers
  { name: 'Beacon',             coords: [[-1,-1],[0,-1],[-1,0],[0,0],[1,1],[2,1],[1,2],[2,2]] }, // oscillator period 2
  { name: 'Snark (p6 bumper)',  coords: [[0,0],[1,0],[2,0],[3,1],[2,2],[1,2],[2,3],[4,2]] }, // p6 “bumper”
  { name: 'Pinwheel',           coords: [[1,0],[2,0],[3,1],[3,2],[2,3],[1,3],[0,2],[0,1]] }, // p4 rotor

  // 9 cells – small oscillator
  { name: 'Sir Robin',          coords: [[0,0],[1,0],[2,0],[3,1],[4,1],[3,2],[2,2],[1,2],[2,3]] }, // p6 oscillator

  // 10 cells – simple puffers and ships
  { name: 'Lobster (Breeder)',  coords: [[0,2],[1,2],[2,2],[3,1],[3,3],[4,0],[4,4],[5,2],[6,2],[7,2]] }, // breeder
  { name: 'Gemini',             coords: [[0,0],[1,0],[2,0],[2,1],[3,1],[4,1],[5,2],[6,2],[5,3],[4,3]] }, // replicator
  { name: 'Clock',              coords: [[1,0],[2,0],[3,0],[0,1],[1,1],[3,1],[4,1],[1,2],[2,2],[3,2]] }, // p4 oscillator

  // 11 cells – small spaceships/puffers
  { name: 'Lightweight spaceship (LWSS)', coords: [[0,1],[0,4],[1,0],[2,0],[3,0],[4,0],[4,1],[4,2],[3,3],[1,3],[0,2]] }, // period 4 ship
  { name: 'Mini Puffer',        coords: [[0,0],[1,0],[2,0],[3,1],[4,2],[4,3],[3,4],[2,4],[1,4],[0,3],[0,2]] }, // compact puffer

  // 12 cells – long oscillators
  { name: 'Pentadecathlon',     coords: [[-4,0],[-3,0],[-2,0],[-1,0],[0,0],[1,0],[2,0],[3,0],[4,0],[5,0],[6,0],[7,0]] }, // p15 oscillator
  { name: 'Traffic Light',      coords: [[0,1],[1,1],[2,1],[3,1],[1,2],[3,2],[1,3],[3,3],[0,4],[1,4],[2,4],[3,4]] }, // p2 oscillator
  { name: 'Tumbler',            coords: [[2,0],[3,0],[4,0],[1,1],[2,1],[4,1],[5,1],[1,2],[2,2],[3,2],[5,2],[3,3]] }, // p3 oscillator

  // 13 cells – medium spaceships and engines
  { name: 'Middleweight spaceship (MWSS)', coords: [[0,1],[0,4],[1,0],[2,0],[3,0],[4,0],[5,0],[5,1],[5,2],[4,3],[2,3],[1,3],[0,2]] }, // period 4 ship
  { name: 'Block-laying Switch Engine', coords: [[0,0],[1,0],[2,0],[3,0],[4,0],[5,0],[2,1],[3,1],[4,1],[3,2],[5,2],[6,2],[7,2]] }, // engine
  { name: 'p690 Gun',           coords: [[0,4],[1,4],[10,4],[10,5],[11,3],[12,2],[13,2],[14,5],[16,4],[20,10],[21,11],[30,10],[31,11]] }, // gun period 690

  // 14 cells – heavyweight spaceship
  { name: 'Heavyweight spaceship (HWSS)', coords: [[0,1],[0,5],[1,0],[2,0],[3,0],[4,0],[5,0],[6,0],[6,1],[6,2],[5,3],[3,3],[1,3],[0,2]] }, // period 4 ship

  // 15 cells – puffers and shuttles
  { name: 'Stimpson Puffer',    coords: [[0,0],[1,0],[2,0],[3,0],[4,1],[5,2],[6,3],[6,4],[6,5],[5,6],[4,6],[3,6],[2,6],[1,5],[0,4]] }, // compact puffer
  { name: 'Twin Bees Shuttle',  coords: [[0,0],[0,1],[1,1],[1,2],[2,2],[2,3],[3,3],[3,4],[4,4],[4,5],[5,5],[5,6],[6,6],[6,7],[7,7]] }, // shuttle

  // 16 cells – smaller guns
  { name: 'Simkin Glider Gun',  coords: [[0,0],[1,0],[2,0],[1,1],[0,2],[2,2],[3,1],[3,3],[4,3],[5,2],[6,1],[7,1],[7,2],[6,3],[5,4],[4,4]] }, // compact gun

  // 18 cells – mid-period gun
  { name: 'p60 Gun',            coords: [[0,4],[1,4],[10,4],[10,5],[10,6],[11,3],[11,7],[12,2],[12,8],[13,2],[13,8],[14,5],[15,3],[15,7],[16,4],[16,5],[16,6],[17,5]] }, // period 60 gun

  // 22 cells – longer-period gun
  { name: 'p144 Gun',           coords: [[0,4],[1,4],[10,4],[10,5],[10,6],[11,3],[11,7],[12,2],[12,8],[13,2],[13,8],[14,5],[15,3],[15,7],[16,4],[16,5],[16,6],[17,5],[20,10],[20,11],[21,10],[21,11]] }, // period 144 gun

  // 24 cells – large oscillators
  { name: 'Pulsar',             coords: [
      [2,0],[3,0],[4,0],[8,0],[9,0],[10,0],
      [0,2],[5,2],[7,2],[12,2],
      [0,3],[5,3],[7,3],[12,3],
      [0,4],[5,4],[7,4],[12,4],
      [2,5],[3,5],[4,5],[8,5],[9,5],[10,5]
    ]
  },
  { name: 'Fumarole',           coords: [
      [2,0],[3,0],[7,0],[8,0],
      [1,1],[3,1],[7,1],[9,1],
      [0,2],[4,2],[6,2],[10,2],
      [0,3],[4,3],[6,3],[10,3],
      [1,4],[3,4],[7,4],[9,4],
      [2,5],[3,5],[7,5],[8,5]
    ]
  },

  // 30 cells – very large oscillator
  { name: 'Caterer',            coords: [
      [4,0],[5,0],[6,0],
      [3,1],[7,1],
      [2,2],[3,2],[7,2],[8,2],
      [1,3],[2,3],[4,3],[5,3],[6,3],[8,3],
      [0,4],[1,4],[7,4],[8,4],
      [0,5],[1,5],[2,5],[3,5],[7,5],[8,5],
      [6,6],[4,6],[5,6]
    ]
  },

  // 36 cells – largest gun
  { name: 'Gosper Glider Gun',  coords: [
      [0,4],[1,4],[0,5],[1,5],
      [10,4],[10,5],[10,6],[11,3],[11,7],[12,2],[12,8],[13,2],[13,8],
      [14,5],[15,3],[15,7],[16,4],[16,5],[16,6],[17,5],
      [20,2],[20,3],[20,4],[21,2],[21,3],[21,4],[22,1],[22,5],[24,0],[24,1],
      [24,5],[24,6],
      [34,2],[34,3],[35,2],[35,3]
    ]
  }
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

  colorEnabled = signal(false);
  baseColor = signal('#ff0000');
  background = signal('#ffffff');
  musicEnabled = signal(false);
  scale = signal('major');

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
  @Output() colorEnabledChange = new EventEmitter<boolean>();
  @Output() baseHueChange = new EventEmitter<number>();
  @Output() bgColorChange = new EventEmitter<string>();
  @Output() musicEnabledChange = new EventEmitter<boolean>();
  @Output() scaleChange = new EventEmitter<string>();

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

  onColorEnabledChange(e: Event) {
    const v = (e.target as HTMLInputElement).checked;
    this.colorEnabled.set(v);
    this.colorEnabledChange.emit(v);
  }

  onMusicEnabledChange(e: Event) {
    const v = (e.target as HTMLInputElement).checked;
    this.musicEnabled.set(v);
    this.musicEnabledChange.emit(v);
  }

  onScaleChange(e: Event) {
    const val = (e.target as HTMLSelectElement).value;
    this.scale.set(val);
    this.scaleChange.emit(val);
  }

  onBaseColorChange(e: Event) {
    const hex = (e.target as HTMLInputElement).value;
    this.baseColor.set(hex);
    this.baseHueChange.emit(this.hexToHue(hex));
  }

  onBgColorChange(e: Event) {
    const hex = (e.target as HTMLInputElement).value;
    this.background.set(hex);
    this.bgColorChange.emit(hex);
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

  private hexToHue(hex: string): number {
    const r = parseInt(hex.slice(1,3), 16) / 255;
    const g = parseInt(hex.slice(3,5), 16) / 255;
    const b = parseInt(hex.slice(5,7), 16) / 255;
    const max = Math.max(r,g,b), min = Math.min(r,g,b);
    if (max === min) return 0;
    let h = 0;
    if (max === r) h = (60 * ((g-b)/(max-min)) + 360) % 360;
    else if (max === g) h = 60 * ((b-r)/(max-min)) + 120;
    else h = 60 * ((r-g)/(max-min)) + 240;
    return h;
  }
}
