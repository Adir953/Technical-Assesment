import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { authInterceptor } from './auth.interceptor';
import { SessionService } from './session.service';

describe('authInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let session: { clear: jest.Mock };
  let router: Router;

  beforeEach(() => {
    session = { clear: jest.fn() };
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: SessionService, useValue: session },
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    jest.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  it('cierra la sesión y manda al login si la cookie venció', async () => {
    const result = firstValueFrom(http.get('/api/submissions'));
    backend.expectOne('/api/submissions').flush({}, { status: 401, statusText: 'Unauthorized' });

    await expect(result).rejects.toMatchObject({ status: 401 });
    expect(session.clear).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login'], expect.anything());
  });

  it('deja que el login maneje su propio 401', async () => {
    const result = firstValueFrom(http.post('/api/auth/login', {}));
    backend.expectOne('/api/auth/login').flush({}, { status: 401, statusText: 'Unauthorized' });

    await expect(result).rejects.toMatchObject({ status: 401 });
    expect(session.clear).not.toHaveBeenCalled();
  });
});
