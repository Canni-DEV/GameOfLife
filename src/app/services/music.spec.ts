import { TestBed } from '@angular/core/testing';
import { MusicService } from './music';

describe('MusicService', () => {
  let service: MusicService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MusicService);
  });

  it('resumes audio context when enabled', () => {
    const audio = { state: 'suspended', resume: jasmine.createSpy('resume') } as any;
    (service as any).audio = audio;
    service.setEnabled(true);
    expect(audio.resume).toHaveBeenCalled();
  });

  it('resumes on playCells if still suspended', () => {
    const audio = { state: 'suspended', resume: jasmine.createSpy('resume') } as any;
    (service as any).audio = audio;
    service.setEnabled(true);
    spyOn<any>(service, 'playRow');
    service.playCells([[0,0]]);
    expect(audio.resume).toHaveBeenCalledTimes(2);
  });
});
