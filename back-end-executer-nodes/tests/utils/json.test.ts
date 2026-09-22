import { canonicalJson } from '../../src/utils/json';

describe('canonicalJson', () => {
  it('compacta un JSON válido', () => {
    expect(canonicalJson('[1, 2,  3]')).toBe('[1,2,3]');
    expect(canonicalJson(' "aloh" ')).toBe('"aloh"');
  });

  it('deja igual lo que no es JSON', () => {
    expect(canonicalJson('hola mundo')).toBe('hola mundo');
    expect(canonicalJson(undefined)).toBeUndefined();
  });
});
