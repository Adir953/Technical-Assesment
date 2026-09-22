import type { JavaSignature, TestCase } from '../types/execution';

// e.g. "public int findMax(int[] arr)" -> { name: 'findMax', paramTypes: ['int[]'] }
export function parseSignature(code: string): JavaSignature | null {
  const match = code.match(/public\s+(?:static\s+)?[\w<>\[\],\s]+?\s+(\w+)\s*\(([^)]*)\)/);
  if (!match) return null;
  const params = match[2].trim() ? splitTopLevel(match[2]) : [];
  return { name: match[1], paramTypes: params.map((p) => p.trim().replace(/\s+\w+$/, '')) };
}

// Splits "Map<String, Integer> a, int b" on the commas that are not inside generics.
function splitTopLevel(params: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const ch of params) {
    if (ch === '<') depth++;
    if (ch === '>') depth--;
    if (ch === ',' && depth === 0) {
      parts.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  return [...parts, current];
}

// Turns a parsed JSON value into a Java literal of the parameter type.
export function toJavaLiteral(value: unknown, type: string): string {
  if (value === null) return 'null';
  if (type.endsWith('[]')) {
    const items = (value as unknown[]).map((v) => toJavaLiteral(v, type.slice(0, -2)));
    return `new ${type}{${items.join(', ')}}`;
  }
  const list = type.match(/^(?:List|ArrayList|Collection)<(.+)>$/);
  if (list) {
    const items = (value as unknown[]).map((v) => toJavaLiteral(v, list[1].trim()));
    return `new ArrayList<>(List.of(${items.join(', ')}))`;
  }
  switch (type) {
    case 'String':
      return JSON.stringify(value);
    case 'char':
    case 'Character':
      return `'${JSON.stringify(value).slice(1, -1).replace(/'/g, "\\'")}'`;
    case 'long':
    case 'Long':
      return `${value}L`;
    case 'double':
    case 'Double':
      return `${value}d`;
    case 'float':
    case 'Float':
      return `${value}f`;
    default:
      return String(value);
  }
}

// Main receives the test case index as argument, calls the method with that case's
// arguments already written as Java literals, and prints the result as compact JSON.
export function buildMain(signature: JavaSignature, testCases: TestCase[]): string {
  const cases = testCases.map((testCase, index) => {
    const parsed = JSON.parse(testCase.input || '[]');
    const args = Array.isArray(parsed) ? parsed : [parsed];
    const literals = args.map((arg, i) => toJavaLiteral(arg, signature.paramTypes[i] ?? 'Object'));
    return `            case ${index} -> solution.${signature.name}(${literals.join(', ')});`;
  });

  return `import java.util.*;
import java.lang.reflect.Array;

public class Main {
    public static void main(String[] args) {
        Solution solution = new Solution();
        Object result = switch (Integer.parseInt(args[0])) {
${cases.join('\n')}
            default -> throw new IllegalArgumentException("Unknown test case");
        };
        System.out.println(toJson(result));
    }

    static String toJson(Object value) {
        if (value == null) return "null";
        if (value instanceof String || value instanceof Character) {
            return "\\"" + value.toString().replace("\\\\", "\\\\\\\\").replace("\\"", "\\\\\\"").replace("\\n", "\\\\n") + "\\"";
        }
        if (value instanceof Double d && d == Math.rint(d)) return String.valueOf(d.longValue());
        if (value.getClass().isArray()) {
            StringJoiner json = new StringJoiner(",", "[", "]");
            for (int i = 0; i < Array.getLength(value); i++) json.add(toJson(Array.get(value, i)));
            return json.toString();
        }
        if (value instanceof Collection<?> items) {
            StringJoiner json = new StringJoiner(",", "[", "]");
            for (Object item : items) json.add(toJson(item));
            return json.toString();
        }
        return String.valueOf(value);
    }
}
`;
}
