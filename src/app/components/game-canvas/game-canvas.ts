import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  OnDestroy,
  ViewChild,
  effect,
  runInInjectionContext,
  signal
} from '@angular/core';
import { MusicService } from '../../services/music';
import { GameOfLifeService } from '../../services/game-of-life';
import { WebglRendererService } from '../../services/webgl-renderer';

@Component({
  selector: 'game-canvas',
  standalone: true,
  templateUrl: './game-canvas.html',
  styleUrls: ['./game-canvas.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GameCanvasComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas', { static: true })
  private canvasRef!: ElementRef<HTMLCanvasElement>;

  private ctx!: CanvasRenderingContext2D;
  private rendererType = signal<'canvas' | 'webgl'>('canvas');
  constructor(
    private readonly game: GameOfLifeService,
    private readonly injector: Injector,
    private readonly music: MusicService,
    private readonly webgl: WebglRendererService
  ) {}
  private cellSize = 10;
  private offset = { x: 0, y: 0 };
  private patternToPlace: [number, number][] | null = null;
  private speed = 10;       // gen/s
  private loopId?: number;
  private panState = { active: false, lastX: 0, lastY: 0 };
  colorEnabled = signal(false);
  baseHue = signal(0);
  bgColor = signal('#ffffff');



  ngAfterViewInit(): void {
    this.initCanvas();

    // efecto reactivo para redibujar al cambiar cells()
    runInInjectionContext(this.injector, () => {
      effect(() => {
        const cells = this.game.cells();
        this.draw(cells);
      });
      effect(() => {
        const bg = this.bgColor();
        if (this.canvasRef) this.canvasRef.nativeElement.style.background = bg;
      });
      effect(() => {
        const born = this.game.newbornCells();
        this.music.playCells(born);
      });
    });

    this.handleURLMessage();
    this.setupPan();
    this.setupZoom();
    this.setupClick();
  }

  ngOnDestroy(): void {
    clearInterval(this.loopId);
  }

  /** Inicializa canvas y contexto */
  private initCanvas(): void {
    const c = this.canvasRef.nativeElement;
    if (this.rendererType() === 'webgl') {
      this.webgl.init(c);
    } else {
      this.ctx = c.getContext('2d')!;
    }
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  /** Ajusta el tamaño al contenedor */
  private resizeCanvas(): void {
    const c = this.canvasRef.nativeElement;
    c.width  = c.clientWidth;
    c.height = c.clientHeight;
    if (this.rendererType() === 'webgl') {
      this.webgl.resize(c.width, c.height);
    }
  }

  /** Si llega ?msj= en la URL, lo convierte en patrón */
  private handleURLMessage(): void {
    const msg = new URLSearchParams(window.location.search).get('text') ?? "Canni-DEV";
    if (msg) {
      const pat = this.convertTextToPattern(msg);
      this.game.insertPatternAt(pat, 0, 0);
    }
  }

  /** Pan con botón derecho */
  private setupPan(): void {
    const c = this.canvasRef.nativeElement;
    c.addEventListener('contextmenu', e => e.preventDefault());
    c.addEventListener('mousedown', e => {
      if (e.button === 2) {
        this.panState.active = true;
        this.panState.lastX = e.clientX;
        this.panState.lastY = e.clientY;
        e.preventDefault();
      }
    });
    c.addEventListener('mousemove', e => {
      if (this.panState.active) {
        const dx = (e.clientX - this.panState.lastX) / this.cellSize;
        const dy = (e.clientY - this.panState.lastY) / this.cellSize;
        this.offset.x += dx;
        this.offset.y += dy;
        this.panState.lastX = e.clientX;
        this.panState.lastY = e.clientY;
        this.draw(this.game.cells());
      }
    });
    c.addEventListener('mouseup', e => {
      if (e.button === 2) this.panState.active = false;
    });
  }

  /** Zoom con rueda (1px–20px) */
  private setupZoom(): void {
    const c = this.canvasRef.nativeElement;
    c.addEventListener('wheel', e => {
      e.preventDefault();
      this.cellSize = e.deltaY < 0
        ? Math.min(50, this.cellSize + 1)
        : Math.max(1,  this.cellSize - 1);
      this.draw(this.game.cells());
    });
  }

  /** Clic izquierdo: coloca patrón o alterna célula */
  private setupClick(): void {
    const c = this.canvasRef.nativeElement;
    c.addEventListener('click', e => {
      const rect = c.getBoundingClientRect();
      const cx   = e.clientX - rect.left  - c.width  / 2;
      const cy   = e.clientY - rect.top   - c.height / 2;
      const worldX = cx / this.cellSize - this.offset.x;
      const worldY = cy / this.cellSize - this.offset.y;

      const x = Math.floor(worldX);
      const y = Math.floor(worldY);

      if (this.patternToPlace) {
        this.game.insertPatternAt(this.patternToPlace, x, y);
        //this.patternToPlace = null;
      } else {
        this.game.toggleCell(x, y);
      }
    });
  }

  /** Inicia el loop de simulación */
  start(): void {
    this.stop();
    this.loopId = window.setInterval(() => this.game.step(), 1000 / this.speed);
  }

  /** Detiene el loop */
  stop(): void {
    if (this.loopId != null) {
      clearInterval(this.loopId);
      this.loopId = undefined;
    }
  }

  /** Cambia velocidad desde panel */
  setSpeed(genPerSec: number): void {
    this.speed = genPerSec;
    if (this.loopId != null) this.start();
  }

  setColorEnabled(v: boolean): void {
    this.colorEnabled.set(v);
    this.draw(this.game.cells());
  }

  setBaseHue(h: number): void {
    this.baseHue.set(h);
    this.draw(this.game.cells());
  }

  setBgColor(color: string): void {
    this.bgColor.set(color);
  }

  setMusicEnabled(v: boolean): void {
    this.music.setEnabled(v);
  }

  setScale(name: string): void {
    this.music.setScale(name);
  }

  setRenderer(type: 'canvas' | 'webgl'): void {
    this.rendererType.set(type);
    this.initCanvas();
    this.draw(this.game.cells());
  }

  /** Recibe patrón desde el side‑panel */
  selectPattern(coords: [number, number][]): void {
    this.patternToPlace = coords;
  }

  /** Decodifica un key:numérico a [x,y] */
  private decodeKey(key: number): [number, number] {
    // x = high 16 bits, y = low 16 bits, ambos con signo
    const x = (key >> 16) << 16 >> 16;
    const y = (key << 16) >> 16;
    return [x, y];
  }

  /** Dibuja todas las celdas vivas */
  private draw(cells: Set<number>): void {
    if (this.rendererType() === 'webgl') {
      this.webgl.draw(
        cells,
        this.game.ages(),
        this.cellSize,
        this.offset,
        this.colorEnabled(),
        this.baseHue()
      );
      return;
    }
    const c    = this.canvasRef.nativeElement;
    const ages = this.game.ages();

    this.ctx.clearRect(0, 0, c.width, c.height);
    cells.forEach(key => {
      const [x, y] = this.decodeKey(key);
      const age    = ages.get(key) ?? 0;
      this.ctx.fillStyle = this.colorForAge(age);
      this.ctx.fillRect(
        c.width  / 2 + (x + this.offset.x) * this.cellSize,
        c.height / 2 + (y + this.offset.y) * this.cellSize,
        this.cellSize - 1,
        this.cellSize - 1
      );
    });
  }

  /** Color según edad (igual que antes) */
  private colorForAge(age: number): string {
    if (!this.colorEnabled()) return '#000';
    const h = ((age * 15) + this.baseHue()) % 360;
    const l = 40 + Math.min(age, 10) * 5;
    return `hsl(${h},70%,${l}%)`;
  }

  /** Texto ➔ patrón (sin cambios) */
  private convertTextToPattern(text: string): [number, number][] {
    const off = document.createElement('canvas');
    const ctx = off.getContext('2d')!;
    const fs  = 20;
    ctx.font = `${fs}px monospace`;
    const w = Math.ceil(ctx.measureText(text).width);
    const h = fs;
    off.width  = w; off.height = h;
    ctx.font = `${fs}px monospace`;
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'white';
    ctx.fillText(text, 0, fs * 0.8);
    const data = ctx.getImageData(0, 0, w, h).data;
    const pat: [number, number][] = [];
    for (let yy = 0; yy < h; yy++) {
      for (let xx = 0; xx < w; xx++) {
        if (data[(yy * w + xx) * 4] > 128) {
          pat.push([xx - Math.floor(w/2), yy - Math.floor(h/2)]);
        }
      }
    }
    return pat;
  }
}
