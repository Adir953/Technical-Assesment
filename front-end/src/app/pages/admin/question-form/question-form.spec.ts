import { normalizeInput } from './question-form';

describe('normalizeInput', () => {
  it('GIVEN un número suelto, WHEN se normaliza, THEN se envuelve como único argumento', () => {
    expect(normalizeInput(' 5 ')).toBe('[5]');
  });

  it('GIVEN un texto entre comillas, WHEN se normaliza, THEN se envuelve como único argumento', () => {
    expect(normalizeInput('"hola"')).toBe('["hola"]');
  });

  it('GIVEN un arreglo de argumentos, WHEN se normaliza, THEN se conserva sin cambios', () => {
    expect(normalizeInput('[[3,5,1,8]]')).toBe('[[3,5,1,8]]');
    expect(normalizeInput('[2, 3]')).toBe('[2, 3]');
  });

  it('GIVEN una entrada que no es JSON válido, WHEN se normaliza, THEN devuelve null', () => {
    expect(normalizeInput('')).toBeNull();
    expect(normalizeInput('[1, 2')).toBeNull();
    expect(normalizeInput('hola')).toBeNull();
  });
});
