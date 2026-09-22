import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import type { ExecutionResult, TestCase } from '../types/execution';
import { createWorkDir, evaluateRun, runSandboxed } from '../utils/sandbox';
import { buildMain, parseSignature } from '../utils/javaSource';
import { runTestCases } from '../utils/testRunner';

// Faster JVM startup: every test case starts a new JVM within the same time limit.
// The heap is capped, and UsePerfData is off because the sandbox user cannot write to /tmp.
const JVM_FLAGS = ['-XX:+UseSerialGC', '-XX:TieredStopAtLevel=1', '-XX:-UsePerfData', '-Xmx256m'];

/**
 * Java no puede leer argumentos JSON sin librerías ni llamar a un método sin conocer sus tipos,
 * así que el trabajo se hace aquí: se lee la firma del código inicial y se genera un `Main.java`
 * con cada caso escrito como literal Java (ver utils/javaSource.ts). Se compila una vez
 * (`Solution` + `Main`) y se ejecuta `java Main <índice>` por cada caso.
 */
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

    return await runTestCases(testCases, async (testCase, index) => {
      const run = await runSandboxed('java', [...JVM_FLAGS, '-cp', tmpDir, 'Main', String(index)], {
        cwd: tmpDir,
        timeoutMs,
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
