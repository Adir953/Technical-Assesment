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
    jest.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(LoginPage);
    await fixture.whenStable();
  });

  it('inicia sesión como evaluador y lo lleva a su panel', async () => {
    const admin = { id: 7, name: 'Administrador', username: 'admin', email: 'admin@example.com', role: 'admin' as const };
    api.login.mockReturnValue(of(admin));

    fixture.nativeElement.querySelector('input[value="admin"]').click();
    type('username', 'admin');
    type('password', 'admin');
    await submit();

    expect(api.login).toHaveBeenCalledWith('admin', 'admin', 'admin');
    expect(session.login).toHaveBeenCalledWith(admin);
    expect(router.navigate).toHaveBeenCalledWith(['/admin']);
  });

  it('muestra un error cuando las credenciales no son válidas', async () => {
    api.login.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 401 })));

    type('username', 'estudiante');
    type('password', 'mala');
    await submit();

    const alert = fixture.nativeElement.querySelector('.alert-error') as HTMLElement;
    expect(alert.textContent).toContain('Usuario, contraseña o perfil incorrectos');
    expect(session.login).not.toHaveBeenCalled();
  });
});
