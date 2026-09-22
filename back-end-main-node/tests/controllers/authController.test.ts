import { login } from '../../src/controllers/authController';
import * as userService from '../../src/services/userService';
import { mockHttp } from '../helpers/http';

jest.mock('../../src/services/userService', () => ({ login: jest.fn() }));

describe('authController.login', () => {
  beforeEach(() => jest.clearAllMocks());

  it('responde con el usuario cuando las credenciales son válidas', async () => {
    const user = { id: 3, name: 'Carlos López', username: 'carlos', email: 'carlos@example.com', role: 'student' as const };
    jest.mocked(userService.login).mockResolvedValue(user);
    const { req, res, next } = mockHttp({
      body: { username: 'carlos', password: 'secreto123', role: 'student' },
    });

    await login(req, res, next);

    expect(userService.login).toHaveBeenCalledWith('carlos', 'secreto123', 'student');
    expect(res.json).toHaveBeenCalledWith(user);
  });

  it('rechaza un rol desconocido sin intentar el login', async () => {
    const { req, res, next } = mockHttp({
      body: { username: 'carlos', password: 'secreto123', role: 'superadmin' },
    });

    await login(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ status: 400, message: 'role must be one of: student, admin' })
    );
    expect(userService.login).not.toHaveBeenCalled();
  });
});
