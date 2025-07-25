import { Injectable, signal } from '@angular/core';
import { parseRLE } from '../utils/rle-parser';

export interface Rules {
  survive: Set<number>;
  born:    Set<number>;
}

@Injectable({ providedIn: 'root' })
export class GameOfLifeService {
  // -------------------------------------------------------------------
  // 1) Empaquetado de coordenadas en un solo número de 32 bits:
  //    [ x:16 bits ][ y:16 bits ]   signed via two's complement
  private encode(x: number, y: number): number {
    return ((x & 0xffff) << 16) | (y & 0xffff);
  }
  private decode(key: number): [number,number] {
    // recuperar x desplazando a la derecha
    const x = (key >> 16) << 16 >> 16; 
    const y = (key << 16) >> 16;
    return [x, y];
  }

  // -------------------------------------------------------------------
  // 2) Array plano de offsets (dx,dy) para los 8 vecinos:
  private static readonly NEIGHBORS: number[] = [
    -1, -1,  -1,  0,  -1,  1,
     0, -1,           0,  1,
     1, -1,   1,  0,   1,  1
  ];

  // -------------------------------------------------------------------
  // 3) Usamos Set<number> y Map<number,number> en lugar de string:
  readonly cells = signal<Set<number>>(new Set());
  readonly ages  = signal<Map<number,number>>(new Map());
  readonly rules = signal<Rules>({
    survive: new Set([2,3]),
    born:    new Set([3])
  });
  readonly stepCount = signal(0);
  readonly bornTotal = signal(0);
  readonly diedTotal = signal(0);
  readonly newbornCells = signal<[number, number][]>([]);

  setRules(survive: number[], born: number[]): void {
    this.rules.set({ survive: new Set(survive), born: new Set(born) });
  }

  insertPattern(pattern: [number,number][]): void {
    this.insertPatternAt(pattern, 0, 0);
  }

  insertPatternAt(pattern: [number,number][], ox: number, oy: number): void {
    this.cells.update(prev => {
      const next = new Set(prev);
      for (const [dx,dy] of pattern) {
        next.add(this.encode(ox + dx, oy + dy));
      }
      return next;
    });
  }

  toggleCell(x: number, y: number): void {
    const key = this.encode(x, y);
    this.cells.update(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
    // Edad:
    this.ages.update(prev => {
      const next = new Map(prev);
      next.has(key) ? next.delete(key) : next.set(key, 1);
      return next;
    });
  }

  // -------------------------------------------------------------------
  // 4) step() optimizado
  step(): void {
    const current = this.cells();
    const { survive, born: bornSet } = this.rules();

    // Conteo de vecinos en un Map<number, number>
    const counts = new Map<number, number>();

    for (const key of current) {
      // decodificar solo una vez por célula viva
      const [x, y] = this.decode(key);

      // sumar +1 vecino a cada tecla vecina
      const N = GameOfLifeService.NEIGHBORS;
      for (let i = 0; i < N.length; i += 2) {
        const nk = this.encode(x + N[i], y + N[i+1]);
        counts.set(nk, (counts.get(nk) ?? 0) + 1);
      }
    }

    // Unir claves: todas las con conteo más las vivas (para supervivencia con 0 vecinos)
    const check = new Set<number>(counts.keys());
    for (const k of current) check.add(k);

    // Calcular siguiente generación
    const nextCells = new Set<number>();
    for (const key of check) {
      const n = counts.get(key) ?? 0;
      ( current.has(key) ? survive.has(n) : bornSet.has(n) ) && nextCells.add(key);
    }

    const newborn: [number, number][] = [];
    for (const k of nextCells) {
      if (!current.has(k)) newborn.push(this.decode(k));
    }
    this.newbornCells.set(newborn);

    // Estadísticas
    let born = 0;
    let died = 0;
    for (const k of nextCells) if (!current.has(k)) born++;
    for (const k of current) if (!nextCells.has(k)) died++;

    this.cells.set(nextCells);
    this.stepCount.update(v => v + 1);
    this.bornTotal.update(v => v + born);
    this.diedTotal.update(v => v + died);

    // Actualizar edades
    this.ages.update(prev => {
      const next = new Map<number, number>();
      for (const key of nextCells) {
        next.set(key, (prev.get(key) ?? 0) + 1);
      }
      return next;
    });
  }

  clear(): void {
    this.cells.set(new Set());
    this.ages .set(new Map());
    this.stepCount.set(0);
    this.bornTotal.set(0);
    this.diedTotal.set(0);
  }

  loadFromRLE(rleText: string): void {
    const pattern = parseRLE(rleText);
    this.clear();
    this.insertPatternAt(pattern, 0, 0);
  }
}
