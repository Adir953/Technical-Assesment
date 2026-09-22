import { FormatArgsPipe, FormatJsonPipe } from './format-args.pipe';

describe('FormatArgsPipe', () => {
  const pipe = new FormatArgsPipe();

  it('quita la lista exterior cuando hay un solo argumento', () => {
    expect(pipe.transform('[[3,5,1,8,2]]')).toBe('[3, 5, 1, 8, 2]');
    expect(pipe.transform('["hola"]')).toBe('"hola"');
  });

  it('separa con comas cuando hay varios argumentos', () => {
    expect(pipe.transform('[1, 2]')).toBe('1, 2');
  });

  it('devuelve el texto tal cual si no es JSON', () => {
    expect(pipe.transform('no es json')).toBe('no es json');
  });
});

describe('FormatJsonPipe', () => {
  it('agrega espacios después de las comas', () => {
    expect(new FormatJsonPipe().transform('[1,2,[3,4]]')).toBe('[1, 2, [3, 4]]');
  });
});
