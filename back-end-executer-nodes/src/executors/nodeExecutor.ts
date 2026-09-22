import * as fs from 'fs';
import * as path from 'path';
import type { ExecutionResult, TestCase } from '../types/execution';
import { createWorkDir, evaluateRun, runSandboxed } from '../utils/sandbox';
import { checkSyntax } from '../utils/syntaxCheck';
import { runTestCases } from '../utils/testRunner';

/**
 * Arma `solution.js` con el código del candidato más un harness que lee una línea JSON de stdin
 * (la lista de argumentos), llama a la función del código inicial y imprime el resultado en JSON.
 * Primero valida la sintaxis con `node --check` y luego ejecuta un proceso por caso.
 */
export async function executeJavaScript(
  userCode: string,
  templateCode: string,
  testCases: TestCase[],
  timeoutMs: number = 5000
): Promise<ExecutionResult> {
  const tmpDir = createWorkDir('node-exec-');
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

    return await runTestCases(testCases, async (testCase) => {
      const run = await runSandboxed('node', ['--max-old-space-size=128', scriptPath], {
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
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (e) {
      console.error('Cleanup error:', e);
    }
  }
}
