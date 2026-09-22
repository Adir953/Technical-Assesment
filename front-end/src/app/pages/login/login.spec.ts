import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { LoginPage } from './login';
import { ApiService } from '../../core/api.service';
import { SessionService } from '../../core/session.service';

describe('LoginPage', () => {
  let fixture: ComponentFixture<LoginPage>;
  let api: { login: jest.Mock };
  let session: { login: jest.Mock };
  let router: Router;

  const admin = { id: 7, name: 'Administrador', username: 'admin', email: 'admin@example.com', role: 'admin' as const };

  function type(name: string, value: string) {
    const input = fixture.nativeElement.querySelector(`input[name="${name}"]`) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  async function submit() {
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  beforeEach(async () => {
    api = { login: jest.fn() };
    session = { login: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: ApiService, useValue: api },
        { provide: SessionService, useValue: session },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    jest.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    fixture = TestBed.createComponent(LoginPage);
    await fixture.whenStable();
  });

  it('GIVEN el formulario de login, WHEN se muestra, THEN no pide el perfil porque el rol lo decide el backend', () => {
    expect(fixture.nativeElement.querySelector('input[name="role"]')).toBeNull();
  });

  it('GIVEN credenciales válidas de un evaluador, WHEN inicia sesión, THEN guarda la sesión y lo lleva a su panel', async () => {
    api.login.mockReturnValue(of(admin));

    type('username', '  admin ');
    type('password', 'admin');
    await submit();

    expect(api.login).toHaveBeenCalledWith('admin', 'admin');
    expect(session.login).toHaveBeenCalledWith(admin);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/admin');
  });

  it('GIVEN una returnUrl, WHEN inicia sesión, THEN vuelve a esa página solo si es del propio sitio', async () => {
    api.login.mockReturnValue(of(admin));

    fixture.componentRef.setInput('returnUrl', '/admin/questions/new');
    await submit();
    expect(router.navigateByUrl).toHaveBeenLastCalledWith('/admin/questions/new');

    fixture.componentRef.setInput('returnUrl', '//malicioso.com');
    await submit();
    expect(router.navigateByUrl).toHaveBeenLastCalledWith('/admin');
  });

  it('GIVEN credenciales inválidas, WHEN inicia sesión, THEN muestra un error y no guarda la sesión', async () => {
    api.login.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 401 })));

    type('username', 'estudiante');
    type('password', 'mala');
    await submit();

    const alert = fixture.nativeElement.querySelector('.alert-error') as HTMLElement;
    expect(alert.textContent).toContain('Usuario o contraseña incorrectos');
    expect(session.login).not.toHaveBeenCalled();
  });
});
