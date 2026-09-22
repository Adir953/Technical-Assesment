import * as fs from 'fs';
import * as path from 'path';
import type { ExecutionResult, TestCase } from '../types/execution';
import { createWorkDir, evaluateRun, runSandboxed } from '../utils/sandbox';
import { checkSyntax } from '../utils/syntaxCheck';
import { runTestCases } from '../utils/testRunner';

/**
 * Igual que el ejecutor de JavaScript: agrega un harness que lee los argumentos en JSON de stdin
 * y llama a la primera función (`def`) del código inicial. La sintaxis se valida con
 * `py_compile` para reportar COMPILE_ERROR antes de correr los casos.
 */
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

    return await runTestCases(testCases, async (testCase) => {
      const run = await runSandboxed('python3', [scriptPath], {
        cwd: tmpDir,
        timeoutMs,
        input: testCase.input || '',
      });
      return evaluateRun(run, testCase.expectedOutput);
    });
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
