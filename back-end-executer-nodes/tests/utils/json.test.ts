import { canonicalJson } from '../../src/utils/json';

describe('canonicalJson', () => {
  it('GIVEN un JSON válido con espacios, WHEN se llama a canonicalJson, THEN lo devuelve compactado', () => {
    expect(canonicalJson('[1, 2,  3]')).toBe('[1,2,3]');
    expect(canonicalJson(' "aloh" ')).toBe('"aloh"');
  });

  it('GIVEN un texto que no es JSON o undefined, WHEN se llama a canonicalJson, THEN lo devuelve sin cambios', () => {
    expect(canonicalJson('hola mundo')).toBe('hola mundo');
    expect(canonicalJson(undefined)).toBeUndefined();
  });
});
