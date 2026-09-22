import { buildMain, parseSignature, toJavaLiteral } from '../../src/utils/javaSource';

describe('javaSource', () => {
  describe('parseSignature', () => {
    it('lee el nombre y los tipos del primer método público', () => {
      const template = 'public class Solution {\n    public int findMax(int[] arr) {\n        return 0;\n    }\n}\n';

      expect(parseSignature(template)).toEqual({ name: 'findMax', paramTypes: ['int[]'] });
    });

    it('no parte los genéricos por sus comas', () => {
      expect(parseSignature('public List<Integer> top(Map<String, Integer> counts, int limit) {')).toEqual({
        name: 'top',
        paramTypes: ['Map<String, Integer>', 'int'],
      });
    });
  });

  it('toJavaLiteral escribe cada valor según el tipo del parámetro', () => {
    expect(toJavaLiteral([[1, 2], [3]], 'int[][]')).toBe('new int[][]{new int[]{1, 2}, new int[]{3}}');
    expect(toJavaLiteral('di "hola"', 'String')).toBe('"di \\"hola\\""');
    expect(toJavaLiteral([4, 5], 'List<Integer>')).toBe('new ArrayList<>(List.of(4, 5))');
    expect(toJavaLiteral(7, 'long')).toBe('7L');
  });

  it('buildMain genera un case por cada caso de prueba', () => {
    const main = buildMain({ name: 'findMax', paramTypes: ['int[]'] }, [
      { input: '[[3, 5, 1]]', expectedOutput: '5', isVisible: true },
      { input: '[[-2]]', expectedOutput: '-2', isVisible: false },
    ]);

    expect(main).toContain('case 0 -> solution.findMax(new int[]{3, 5, 1});');
    expect(main).toContain('case 1 -> solution.findMax(new int[]{-2});');
  });
});
