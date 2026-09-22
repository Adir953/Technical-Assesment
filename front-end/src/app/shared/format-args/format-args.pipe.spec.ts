import { FormatArgsPipe, FormatJsonPipe } from './format-args.pipe';

describe('FormatArgsPipe', () => {
  const pipe = new FormatArgsPipe();

  it('GIVEN un solo argumento, WHEN se formatea, THEN quita la lista exterior', () => {
    expect(pipe.transform('[[3,5,1,8,2]]')).toBe('[3, 5, 1, 8, 2]');
    expect(pipe.transform('["hola"]')).toBe('"hola"');
  });

  it('GIVEN varios argumentos, WHEN se formatea, THEN los separa con comas', () => {
    expect(pipe.transform('[1, 2]')).toBe('1, 2');
  });

  it('GIVEN un texto que no es JSON, WHEN se formatea, THEN lo devuelve tal cual', () => {
    expect(pipe.transform('no es json')).toBe('no es json');
  });
});

describe('FormatJsonPipe', () => {
  it('GIVEN un JSON compacto, WHEN se formatea, THEN agrega espacios después de las comas', () => {
    expect(new FormatJsonPipe().transform('[1,2,[3,4]]')).toBe('[1, 2, [3, 4]]');
  });
});
