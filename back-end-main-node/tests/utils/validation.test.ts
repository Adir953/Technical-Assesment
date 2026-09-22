import { parseId, parseLanguage, requireString } from '../../src/utils/validation';
import { AppError } from '../../src/middleware/errorHandler';

describe('validation', () => {
  describe('parseId', () => {
    it('convierte ids que llegan como string', () => {
      expect(parseId('12', 'id')).toBe(12);
    });

    it.each([0, -3, 1.5, 'abc', undefined])('rechaza %p', (value) => {
      expect(() => parseId(value, 'id')).toThrow('id must be a positive integer');
    });
  });

  it('parseLanguage solo acepta python, javascript y java', () => {
    expect(parseLanguage('java')).toBe('java');
    expect(() => parseLanguage('ruby')).toThrow(AppError);
  });

  it('requireString no acepta strings vacíos', () => {
    expect(requireString('print(1)', 'code')).toBe('print(1)');
    expect(() => requireString('   ', 'code')).toThrow('code is required');
  });
});
