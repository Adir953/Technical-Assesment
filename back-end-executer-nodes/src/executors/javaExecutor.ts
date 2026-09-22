import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { createWorkDir, evaluateRun, runSandboxed, type TestOutcome } from './sandbox';

interface TestCase {
  input: string;
  expectedOutput: string;
  isVisible: boolean;
}

interface ExecutionResult {
  status: 'SUCCESS' | 'WRONG_ANSWER' | 'COMPILE_ERROR' | 'RUNTIME_ERROR' | 'TIME_LIMIT_EXCEEDED';
  output?: string;
  error?: string;
  testResults?: Array<{
    testCaseIndex: number;
    input: string;
    expectedOutput: string;
    actualOutput?: string;
    passed: boolean;
    error?: string;
  }>;
  passedTests?: number;
  totalTests?: number;
}

// Faster JVM startup: every test case starts a new JVM within the same time limit.
// The heap is capped, and UsePerfData is off because the sandbox user cannot write to /tmp.
const JVM_FLAGS = ['-XX:+UseSerialGC', '-XX:TieredStopAtLevel=1', '-XX:-UsePerfData', '-Xmx256m'];

export async function executeJava(
  userCode: string,
  templateCode: string,
  testCases: TestCase[],
  timeoutMs: number = 5000
): Promise<ExecutionResult> {
  const tmpDir = createWorkDir('java-exec-');

  try {
    const signature = parseSignature(templateCode);
    if (!signature) {
      return { status: 'COMPILE_ERROR', error: 'No public method found in the starter code' };
    }

    // The editor starts from the template, so the user submits the whole class.
    // Imports go on the first line so compiler line numbers still match the editor.
    const solutionCode =
      'import java.util.*; import java.util.stream.*; ' +
      userCode.replace(/(public\s+)?class\s+\w+/, 'public class Solution');

    fs.writeFileSync(path.join(tmpDir, 'Solution.java'), solutionCode);
    fs.writeFileSync(path.join(tmpDir, 'Main.java'), buildMain(signature, testCases));

    const compileResult = await compileJava(tmpDir, timeoutMs);
    if (compileResult.status !== 'SUCCESS') {
      return compileResult;
    }

    return await runTestCases(tmpDir, testCases, timeoutMs);
  } catch (error) {
    return {
      status: 'RUNTIME_ERROR',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (e) {
      console.error('Cleanup error:', e);
    }
  }
}

interface Signature {
  name: string;
  paramTypes: string[];
}

// e.g. "public int findMax(int[] arr)" -> { name: 'findMax', paramTypes: ['int[]'] }
function parseSignature(code: string): Signature | null {
  const match = code.match(/public\s+(?:static\s+)?[\w<>\[\],\s]+?\s+(\w+)\s*\(([^)]*)\)/);
  if (!match) return null;
  const params = match[2].trim() ? splitTopLevel(match[2]) : [];
  return { name: match[1], paramTypes: params.map((p) => p.trim().replace(/\s+\w+$/, '')) };
}

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
function toJavaLiteral(value: unknown, type: string): string {
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
function buildMain(signature: Signature, testCases: TestCase[]): string {
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

async function compileJava(tmpDir: string, timeoutMs: number): Promise<ExecutionResult> {
  return new Promise((resolve) => {
    const process = spawn('javac', [
      '-d',
      tmpDir,
      path.join(tmpDir, 'Solution.java'),
      path.join(tmpDir, 'Main.java'),
    ]);

    let stderr = '';
    let timedOut = false;

    const timeout = setTimeout(() => {
      timedOut = true;
      process.kill('SIGKILL');
    }, timeoutMs);

    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    process.on('close', (code) => {
      clearTimeout(timeout);
      if (timedOut) {
        resolve({ status: 'TIME_LIMIT_EXCEEDED', error: 'Compilation time exceeded' });
      } else if (code !== 0) {
        // Hide the temp directory so errors read "Solution.java:3: error ...".
        resolve({
          status: 'COMPILE_ERROR',
          error: stderr.split(`${tmpDir}${path.sep}`).join('') || 'Compilation error',
        });
      } else {
        resolve({ status: 'SUCCESS' });
      }
    });

    process.on('error', (err) => {
      clearTimeout(timeout);
      resolve({ status: 'COMPILE_ERROR', error: err.message });
    });
  });
}

async function runTestCases(
  tmpDir: string,
  testCases: TestCase[],
  timeoutMs: number
): Promise<ExecutionResult> {
  const testResults = [];
  let passedTests = 0;
  let firstError: ExecutionResult | null = null;

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    const result = await runSingleTest(tmpDir, i, testCase, timeoutMs);

    testResults.push({
      testCaseIndex: i,
      input: testCase.input,
      expectedOutput: testCase.expectedOutput,
      actualOutput: result.output,
      passed: result.passed,
      error: result.error,
    });

    if (result.passed) {
      passedTests++;
    } else if (!firstError) {
      firstError = {
        status: result.status,
        error: result.error,
        output: result.output,
      };
    }
  }

  const allPassed = passedTests === testCases.length;

  return {
    status: allPassed ? 'SUCCESS' : firstError?.status || 'WRONG_ANSWER',
    error: allPassed ? undefined : firstError?.error,
    testResults,
    passedTests,
    totalTests: testCases.length,
    output: allPassed ? 'All tests passed!' : undefined,
  };
}

async function runSingleTest(
  tmpDir: string,
  index: number,
  testCase: TestCase,
  timeoutMs: number
): Promise<TestOutcome> {
  const run = await runSandboxed('java', [...JVM_FLAGS, '-cp', tmpDir, 'Main', String(index)], {
    cwd: tmpDir,
    timeoutMs,
  });
  return evaluateRun(run, testCase.expectedOutput);
}
