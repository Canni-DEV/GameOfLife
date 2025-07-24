import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InfoPanel } from './info-panel';

describe('InfoPanel', () => {
  let component: InfoPanel;
  let fixture: ComponentFixture<InfoPanel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InfoPanel]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InfoPanel);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
