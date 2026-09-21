import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
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

export async function executeJavaScript(
  userCode: string,
  templateCode: string,
  testCases: TestCase[],
  timeoutMs: number = 5000
): Promise<ExecutionResult> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'node-exec-'));
  const scriptPath = path.join(tmpDir, 'solution.js');

  try {
    // The editor starts from the template, so the user submits the whole program;
    // the template only tells which function the harness must call.
    let fullCode = userCode;

    const funcMatch = templateCode.match(/function\s+(\w+)\s*\(|const\s+(\w+)\s*=\s*\(|let\s+(\w+)\s*=\s*\(/);
    const functionName = funcMatch ? (funcMatch[1] || funcMatch[2] || funcMatch[3]) : null;

    // Add auto-generated harness if function found
    if (functionName) {
      fullCode += `\n\nif (require.main === module) {
    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: false
    });

    rl.on('line', (line) => {
        try {
            const args = JSON.parse(line);
            const argsArray = Array.isArray(args) ? args : [args];
            const result = ${functionName}(...argsArray);
            console.log(JSON.stringify(result));
            process.exit(0);
        } catch (e) {
            console.error(e.message);
            process.exit(1);
        }
    });
}`;
    }

    fs.writeFileSync(scriptPath, fullCode);

    const syntaxError = await checkSyntax('node', ['--check', scriptPath], tmpDir, timeoutMs);
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
): Promise<{
  status: 'SUCCESS' | 'WRONG_ANSWER' | 'RUNTIME_ERROR' | 'TIME_LIMIT_EXCEEDED';
  output?: string;
  passed: boolean;
  error?: string;
}> {
  return new Promise((resolve) => {
    if (typeof testCase.expectedOutput !== 'string') {
      resolve({
        status: 'RUNTIME_ERROR',
        passed: false,
        error: `Invalid test case: expectedOutput is missing or empty`,
      });
      return;
    }

    const process = spawn('node', [scriptPath]);

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const timeout = setTimeout(() => {
      timedOut = true;
      process.kill('SIGKILL');
    }, timeoutMs);

    process.stdin.write(testCase.input || '');
    process.stdin.end();

    process.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    process.on('close', (code) => {
      clearTimeout(timeout);

      if (timedOut) {
        resolve({
          status: 'TIME_LIMIT_EXCEEDED',
          output: stdout,
          passed: false,
          error: 'Execution time exceeded',
        });
        return;
      }

      if (code !== 0 && stderr) {
        resolve({
          status: 'RUNTIME_ERROR',
          output: stdout,
          passed: false,
          error: stderr.trim(),
        });
        return;
      }

      const trimmedOutput = stdout.trim();
      const expectedOutput = (testCase.expectedOutput || '').trim();
      const passed = trimmedOutput === expectedOutput;

      resolve({
        status: passed ? 'SUCCESS' : 'WRONG_ANSWER',
        output: trimmedOutput,
        passed,
        error: passed ? undefined : `Expected: ${expectedOutput}, Got: ${trimmedOutput}`,
      });
    });

    process.on('error', (err) => {
      clearTimeout(timeout);
      resolve({
        status: 'RUNTIME_ERROR',
        passed: false,
        error: err.message,
      });
    });
  });
}
