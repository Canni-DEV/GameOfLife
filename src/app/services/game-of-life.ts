// src/app/services/game-of-life.service.ts

import { Injectable, signal } from '@angular/core';
import { parseRLE } from '../utils/rle-parser';

export interface Rules {
  survive: Set<number>;
  born: Set<number>;
}

@Injectable({ providedIn: 'root' })
export class GameOfLifeService {
  /** Celdas vivas (coordenadas "x,y") */
  readonly cells = signal<Set<string>>(new Set());

  /** Edad de cada célula viva */
  readonly ages = signal<Map<string, number>>(new Map());

  /** Reglas S/B */
  readonly rules = signal<Rules>({
    survive: new Set([2, 3]),
    born:    new Set([3])
  });

  /** Ajusta las reglas de supervivencia y nacimiento */
  setRules(survive: number[], born: number[]): void {
    this.rules.set({ survive: new Set(survive), born: new Set(born) });
  }

  /** Inserta un patrón centrado en (0,0) */
  insertPattern(pattern: [number, number][]): void {
    this.insertPatternAt(pattern, 0, 0);
  }

  /** Inserta un patrón en offset (x,y) */
  insertPatternAt(pattern: [number, number][], x: number, y: number): void {
    this.cells.update(prev => {
      const next = new Set(prev);
      for (const [dx, dy] of pattern) {
        next.add(`${x + dx},${y + dy}`);
      }
      return next;
    });
  }

  /** Alterna una célula en (x,y) */
  toggleCell(x: number, y: number): void {
    this.cells.update(prev => {
      const next = new Set(prev);
      const key = `${x},${y}`;
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
    // reset age to 1 si reaparece
    this.ages.update(prev => {
      const next = new Map(prev);
      const k = `${x},${y}`;
      if (next.has(k)) next.delete(k);
      else next.set(k, 1);
      return next;
    });
  }

  /** Avanza una generación y actualiza edades */
  step(): void {
    const current = this.cells();
    const { survive, born } = this.rules();
    const counts = new Map<string, number>();

    // contar vecinos de forma eficiente
    for (const key of current) {
      const comma = key.indexOf(',');
      const x = +key.slice(0, comma);
      const y = +key.slice(comma + 1);
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) continue;
          const nKey = `${x + dx},${y + dy}`;
          counts.set(nKey, (counts.get(nKey) ?? 0) + 1);
        }
      }
    }

    // considerar también celdas con 0 vecinos
    const cellsToCheck = new Set<string>(counts.keys());
    current.forEach(k => cellsToCheck.add(k));

    const nextCells = new Set<string>();
    cellsToCheck.forEach(key => {
      const neighbors = counts.get(key) ?? 0;
      if (current.has(key) ? survive.has(neighbors) : born.has(neighbors)) {
        nextCells.add(key);
      }
    });
    this.cells.set(nextCells);

    // actualizar edades
    this.ages.update(prev => {
      const next = new Map<string, number>();
      nextCells.forEach(key => {
        next.set(key, (prev.get(key) ?? 0) + 1);
      });
      return next;
    });
  }

  /** Limpia todo */
  clear(): void {
    this.cells.set(new Set());
    this.ages.set(new Map());
  }

  /** Carga un patrón desde texto RLE */
  loadFromRLE(rleText: string): void {
    const pattern = parseRLE(rleText);
    this.clear();
    this.insertPatternAt(pattern, 0, 0);
  }
}
