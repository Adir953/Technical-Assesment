import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

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

export async function executeJava(
  userCode: string,
  templateCode: string,
  testCases: TestCase[],
  timeoutMs: number = 5000
): Promise<ExecutionResult> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'java-exec-'));
  const className = 'Solution';
  const javaFile = path.join(tmpDir, `${className}.java`);

  try {
    // Merge user code with template
    let fullCode = templateCode.includes('// SOLUTION')
      ? templateCode.replace('// SOLUTION', userCode)
      : `${templateCode}\n${userCode}`;

    // Ensure class name is correct
    let fixedCode = fullCode.replace(/public class \w+/, `public class ${className}`);

    // Extract method name from template (first public method)
    const methodMatch = templateCode.match(/public\s+\w+\s+(\w+)\s*\(/);
    const methodName = methodMatch ? methodMatch[1] : null;

    // Add auto-generated main if method found
    if (methodName && !fixedCode.includes('public static void main')) {
      fixedCode += `\n\n    public static void main(String[] args) throws Exception {
        java.util.Scanner scanner = new java.util.Scanner(System.in);
        if (scanner.hasNextLine()) {
            String line = scanner.nextLine();
            try {
                java.util.List<Object> argsList = new java.util.ArrayList<>();
                String jsonLine = line.trim();
                if (jsonLine.startsWith("[")) {
                    jsonLine = jsonLine.substring(1, jsonLine.length() - 1);
                    for (String arg : jsonLine.split(",")) {
                        arg = arg.trim();
                        if (arg.matches("-?\\\\d+(\\\\.\\\\d+)?")) {
                            if (arg.contains(".")) {
                                argsList.add(Double.parseDouble(arg));
                            } else {
                                argsList.add(Integer.parseInt(arg));
                            }
                        } else {
                            argsList.add(arg.replaceAll("^\\"|\\"$", ""));
                        }
                    }
                }

                ${className} solution = new ${className}();
                Object result = solution.${methodName}(argsList.toArray());
                System.out.println(result);
            } catch (Exception e) {
                System.err.println("Error: " + e.getMessage());
                System.exit(1);
            }
        }
    }`;
    }

    fs.writeFileSync(javaFile, fixedCode);

    // Compile
    const compileResult = await compileJava(javaFile, timeoutMs);
    if (compileResult.status !== 'SUCCESS') {
      return compileResult;
    }

    // Execute test cases
    const testResults = await runTestCases(tmpDir, className, testCases, timeoutMs);

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

async function compileJava(javaFile: string, timeoutMs: number): Promise<ExecutionResult> {
  return new Promise((resolve) => {
    const process = spawn('javac', [javaFile]);

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
        resolve({
          status: 'TIME_LIMIT_EXCEEDED',
          error: 'Compilation time exceeded',
        });
      } else if (code !== 0) {
        resolve({
          status: 'COMPILE_ERROR',
          error: stderr || 'Compilation error',
        });
      } else {
        resolve({
          status: 'SUCCESS',
        });
      }
    });

    process.on('error', (err) => {
      clearTimeout(timeout);
      resolve({
        status: 'COMPILE_ERROR',
        error: err.message,
      });
    });
  });
}

async function runTestCases(
  tmpDir: string,
  className: string,
  testCases: TestCase[],
  timeoutMs: number
): Promise<ExecutionResult> {
  const testResults = [];
  let passedTests = 0;
  let firstError: ExecutionResult | null = null;

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    const result = await runSingleTest(tmpDir, className, testCase, timeoutMs);

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
  className: string,
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

    const process = spawn('java', ['-cp', tmpDir, className]);

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
