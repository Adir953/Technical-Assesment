import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApiService } from './api.service';

describe('ApiService.startOrResume', () => {
  let api: ApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(ApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('crea un intento nuevo y devuelve su id', async () => {
    const result = api.startOrResume(1);

    const req = http.expectOne('/api/submissions');
    expect(req.request.body).toEqual({ assessmentId: 1 });
    req.flush({ id: 15 });

    expect(await result).toBe(15);
  });

  it('retoma el intento en curso cuando el backend responde 409', async () => {
    const result = api.startOrResume(1);

    http.expectOne('/api/submissions').flush(
      { error: { status: 409, message: 'Student 8 already has attempt 12 in progress for this assessment' } },
      { status: 409, statusText: 'Conflict' }
    );

    expect(await result).toBe(12);
  });

  it('propaga cualquier otro error', async () => {
    const result = api.startOrResume(99);

    http.expectOne('/api/submissions').flush(
      { error: { status: 404, message: 'Assessment 99 not found' } },
      { status: 404, statusText: 'Not Found' }
    );

    await expect(result).rejects.toMatchObject({ status: 404 });
  });
});
