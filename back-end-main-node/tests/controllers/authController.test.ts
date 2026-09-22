import { login, logout, me } from '../../src/controllers/authController';
import * as userService from '../../src/services/userService';
import { SESSION_COOKIE } from '../../src/middleware/auth';
import { unauthorized } from '../../src/middleware/errorHandler';
import { mockHttp } from '../helpers/http';

jest.mock('../../src/services/userService', () => ({ login: jest.fn(), getPublicUser: jest.fn() }));

const user = { id: 3, name: 'Carlos López', username: 'carlos', email: 'carlos@example.com', role: 'student' as const };

describe('authController', () => {
  beforeEach(() => jest.clearAllMocks());

  it('login responde con el usuario y deja el JWT en una cookie httpOnly', async () => {
    jest.mocked(userService.login).mockResolvedValue(user);
    const { req, res, next } = mockHttp({ body: { username: 'carlos', password: 'secreto123' } });

    await login(req, res, next);

    expect(userService.login).toHaveBeenCalledWith('carlos', 'secreto123');
    expect(res.cookie).toHaveBeenCalledWith(
      SESSION_COOKIE,
      expect.any(String),
      expect.objectContaining({ httpOnly: true, sameSite: 'strict' })
    );
    expect(res.json).toHaveBeenCalledWith(user);
  });

  it('login no crea la cookie si las credenciales no son válidas', async () => {
    const error = unauthorized('Invalid username or password');
    jest.mocked(userService.login).mockRejectedValue(error);
    const { req, res, next } = mockHttp({ body: { username: 'carlos', password: 'mala' } });

    await login(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.cookie).not.toHaveBeenCalled();
  });

  it('me devuelve el usuario de la sesión', async () => {
    jest.mocked(userService.getPublicUser).mockResolvedValue(user);
    const { req, res, next } = mockHttp({ user: { id: 3, role: 'student' } });

    await me(req, res, next);

    expect(userService.getPublicUser).toHaveBeenCalledWith(3);
    expect(res.json).toHaveBeenCalledWith(user);
  });

  it('logout borra la cookie', () => {
    const { req, res } = mockHttp();

    logout(req, res);

    expect(res.clearCookie).toHaveBeenCalledWith(SESSION_COOKIE, expect.objectContaining({ httpOnly: true }));
    expect(res.status).toHaveBeenCalledWith(204);
  });
});
