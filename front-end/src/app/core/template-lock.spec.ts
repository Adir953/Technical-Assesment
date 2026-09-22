import { respectsLock, templateLock } from './template-lock';

const js = 'function findMax(arr) {\n  // Escribe tu solución aquí\n}\n';
const python = 'def find_max(arr):\n    # Escribe tu solución aquí\n    pass\n';
const java =
  'public class Solution {\n    public int findMax(int[] arr) {\n        // Escribe tu solución aquí\n        return 0;\n    }\n}\n';

describe('templateLock', () => {
  it('GIVEN una plantilla de JavaScript, WHEN se calcula el bloqueo, THEN bloquea la firma, el comentario y la llave de cierre', () => {
    expect(templateLock(js)).toEqual({
      prefix: 'function findMax(arr) {\n  // Escribe tu solución aquí\n',
      suffix: '}',
    });
  });

  it('GIVEN una plantilla de Python, WHEN se calcula el bloqueo, THEN deja editable el pass y no bloquea nada al final', () => {
    expect(templateLock(python)).toEqual({
      prefix: 'def find_max(arr):\n    # Escribe tu solución aquí\n',
      suffix: '',
    });
  });

  it('GIVEN una plantilla de Java, WHEN se calcula el bloqueo, THEN deja editable el return de relleno y bloquea las llaves de cierre', () => {
    expect(templateLock(java)?.suffix).toBe('    }\n}');
  });

  it('GIVEN una plantilla sin el comentario, WHEN se calcula el bloqueo, THEN no bloquea nada', () => {
    expect(templateLock('function f() {}\n')).toBeNull();
  });
});

describe('respectsLock', () => {
  const lock = templateLock(js)!;

  it('GIVEN una solución escrita debajo del comentario, WHEN se valida, THEN respeta la plantilla', () => {
    const code = 'function findMax(arr) {\n  // Escribe tu solución aquí\n  return Math.max(...arr);\n}';
    expect(respectsLock(code, lock)).toBe(true);
  });

  it('GIVEN un código sin el comentario, WHEN se valida, THEN no respeta la plantilla', () => {
    const code = 'function findMax(arr) {\n  return Math.max(...arr);\n}\n';
    expect(respectsLock(code, lock)).toBe(false);
  });

  it('GIVEN un código con la función renombrada, WHEN se valida, THEN no respeta la plantilla', () => {
    const code = 'function max(arr) {\n  // Escribe tu solución aquí\n}\n';
    expect(respectsLock(code, lock)).toBe(false);
  });

  it('GIVEN un código sin la llave de cierre, WHEN se valida, THEN no respeta la plantilla', () => {
    expect(respectsLock('function findMax(arr) {\n  // Escribe tu solución aquí\n', lock)).toBe(false);
  });
});
