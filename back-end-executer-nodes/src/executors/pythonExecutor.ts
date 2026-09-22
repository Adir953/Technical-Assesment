import * as fs from 'fs';
import * as path from 'path';
import { createWorkDir, evaluateRun, runSandboxed, type TestOutcome } from './sandbox';
import { checkSyntax } from './syntaxCheck';

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

export async function executePython(
  userCode: string,
  templateCode: string,
  testCases: TestCase[],
  timeoutMs: number = 5000
): Promise<ExecutionResult> {
  const tmpDir = createWorkDir('python-exec-');
  const scriptPath = path.join(tmpDir, 'solution.py');

  try {
    // The editor starts from the template, so the user submits the whole program;
    // the template only tells which function the harness must call.
    let fullCode = userCode;

    const funcMatch = templateCode.match(/def\s+(\w+)\s*\(/);
    const functionName = funcMatch ? funcMatch[1] : null;

    // Add auto-generated harness if function found
    if (functionName) {
      fullCode += `\n\nif __name__ == "__main__":
    import json
    import sys
    try:
        line = sys.stdin.read().strip()
        if line:
            args = json.loads(line)
            if not isinstance(args, list):
                args = [args]
            result = ${functionName}(*args)
            print(json.dumps(result, separators=(',', ':')))
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)`;
    }

    fs.writeFileSync(scriptPath, fullCode);

    const syntaxError = await checkSyntax('python3', ['-m', 'py_compile', scriptPath], tmpDir, timeoutMs);
    if (syntaxError) {
      return { status: 'COMPILE_ERROR', error: syntaxError, passedTests: 0, totalTests: testCases.length };
    }

    // Execute test cases
    const testResults = await runTestCases(scriptPath, testCases, timeoutMs);

    return testResults;
  } catch (error) {
    return {
      status: 'RUNTIME_ERROR',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  } finally {
    // Cleanup
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (e) {
      console.error('Cleanup error:', e);
    }
  }
}

async function runTestCases(
  scriptPath: string,
  testCases: TestCase[],
  timeoutMs: number
): Promise<ExecutionResult> {
  const testResults = [];
  let passedTests = 0;
  let firstError: ExecutionResult | null = null;

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    const result = await runSingleTest(scriptPath, testCase, timeoutMs);

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
  scriptPath: string,
  testCase: TestCase,
  timeoutMs: number
): Promise<TestOutcome> {
  const run = await runSandboxed('python3', [scriptPath], {
    cwd: path.dirname(scriptPath),
    timeoutMs,
    input: testCase.input || '',
  });
  return evaluateRun(run, testCase.expectedOutput);
}
