import { TestBed } from '@angular/core/testing';
import { GameOfLifeService } from './game-of-life';


describe('GameOfLife', () => {
  let service: GameOfLifeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GameOfLifeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
