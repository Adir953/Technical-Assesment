import { parseId, parseLanguage, requireString } from '../../src/utils/validation';
import { AppError } from '../../src/middleware/errorHandler';

describe('validation', () => {
  describe('parseId', () => {
    it('GIVEN un id que llega como string, WHEN se llama a parseId, THEN lo convierte a número', () => {
      expect(parseId('12', 'id')).toBe(12);
    });

    it.each([0, -3, 1.5, 'abc', undefined])('GIVEN el valor %p, WHEN se llama a parseId, THEN lanza un error', (value) => {
      expect(() => parseId(value, 'id')).toThrow('id must be a positive integer');
    });
  });

  it('GIVEN un lenguaje, WHEN se llama a parseLanguage, THEN solo acepta python, javascript y java', () => {
    expect(parseLanguage('java')).toBe('java');
    expect(() => parseLanguage('ruby')).toThrow(AppError);
  });

  it('GIVEN un string vacío, WHEN se llama a requireString, THEN lanza un error', () => {
    expect(requireString('print(1)', 'code')).toBe('print(1)');
    expect(() => requireString('   ', 'code')).toThrow('code is required');
  });
});
