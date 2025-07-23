// src/app/components/game-canvas/game-canvas.component.ts

import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  OnDestroy,
  ViewChild,
  effect,
  runInInjectionContext
} from '@angular/core';
import { GameOfLifeService } from '../../services/game-of-life';

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
  private cellSize = 10;
  private offset = { x: 0, y: 0 };
  private patternToPlace: [number, number][] | null = null;
  private speed = 10;       // gen/s
  private loopId?: number;
  private panState = { active: false, lastX: 0, lastY: 0 };

  constructor(
    private readonly game: GameOfLifeService,
    private readonly injector: Injector
  ) {
  }

  ngAfterViewInit(): void {
    this.initCanvas();

     // Registrar efecto REACTIVO tras tener el contexto
    runInInjectionContext(this.injector, () => {
      effect(() => {
        const cells = this.game.cells();
        if (!this.ctx) return;      // espera a que ctx esté inicializado
        this.draw(cells);
      });
    });

    this.handleURLMessage();
    this.setupPan();
    this.setupZoom();
    this.setupClick();
  }

  ngOnDestroy(): void {
    clearInterval(this.loopId);
    // idealmente remover listeners si los guardaste
  }

  /** Inicializa tamaño y contexto */
  private initCanvas(): void {
    const c = this.canvasRef.nativeElement;
    this.ctx = c.getContext('2d')!;
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  /** Ajusta canvas a su contenedor */
  private resizeCanvas(): void {
    const c = this.canvasRef.nativeElement;
    c.width = c.clientWidth;
    c.height = c.clientHeight;
  }

  /** Busca ?msj= y lo dibuja como patrón */
  private handleURLMessage(): void {
    const msg = new URLSearchParams(window.location.search).get('msj');
    console.log(msg);
    if (msg) {
      const pat = this.convertTextToPattern(msg);
      this.game.insertPatternAt(pat, 0, 0);
    }
  }

  /** Arrastra con botón derecho */
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
    c.addEventListener('mouseup', e => { if (e.button === 2) this.panState.active = false; });
  }

  /** Zoom con rueda, entre 1 y 20 px */
  private setupZoom(): void {
    const c = this.canvasRef.nativeElement;
    c.addEventListener('wheel', e => {
      e.preventDefault();
      this.cellSize = e.deltaY < 0
        ? Math.min(20, this.cellSize + 1)
        : Math.max(1, this.cellSize - 1);
      this.draw(this.game.cells());
    });
  }

  /** Clic izquierdo: toggle o patrón */
  private setupClick(): void {
    const c = this.canvasRef.nativeElement;
    c.addEventListener('click', e => {
      const rect = c.getBoundingClientRect();
      const cx = e.clientX - rect.left - rect.width / 2;
      const cy = e.clientY - rect.top - rect.height / 2;
      const x = Math.floor(cx / this.cellSize) - this.offset.x;
      const y = Math.floor(cy / this.cellSize) - this.offset.y;

      if (this.patternToPlace) {
        this.game.insertPatternAt(this.patternToPlace, x, y);
        this.patternToPlace = null;
      } else {
        this.game.toggleCell(x, y);
      }
    });
  }

  /** Inicia loop a la velocidad actual */
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

  /** Cambio de velocidad desde el panel */
  setSpeed(genPerSec: number): void {
    this.speed = genPerSec;
    if (this.loopId != null) this.start();
  }

  /** Recibe patrón seleccionado */
  selectPattern(coords: [number, number][]): void {
    this.patternToPlace = coords;
  }

  /** Dibuja todas las celdas actuales */
  private draw(cells: Set<string>): void {
    const c = this.canvasRef.nativeElement;
    this.ctx.clearRect(0, 0, c.width, c.height);
    this.ctx.fillStyle = '#222';

    cells.forEach(key => {
      const [x, y] = key.split(',').map(Number);
      this.ctx.fillRect(
        c.width / 2 + (x + this.offset.x) * this.cellSize,
        c.height / 2 + (y + this.offset.y) * this.cellSize,
        this.cellSize - 1,
        this.cellSize - 1
      );
    });
  }

  /** Convierte un texto en patrón de puntos */
  private convertTextToPattern(text: string): [number, number][] {
    const off = document.createElement('canvas');
    const ctx = off.getContext('2d')!;
    const fs = 20;
    ctx.font = `${fs}px monospace`;
    const w = Math.ceil(ctx.measureText(text).width);
    const h = fs;
    off.width = w; off.height = h;
    ctx.font = `${fs}px monospace`;
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'white';
    ctx.fillText(text, 0, fs * 0.8);
    const data = ctx.getImageData(0, 0, w, h).data;
    const pat: [number, number][] = [];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (data[(y * w + x) * 4] > 128) {
          pat.push([x - Math.floor(w / 2), y - Math.floor(h / 2)]);
        }
      }
    }
    return pat;
  }
}
