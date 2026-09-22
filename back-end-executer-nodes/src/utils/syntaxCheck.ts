import { spawn } from 'child_process';
import * as path from 'path';

/**
 * "Compilación" para lenguajes interpretados: valida la sintaxis del archivo sin ejecutarlo
 * (`node --check`, `python3 -m py_compile`). Devuelve el mensaje de error, o null si es válido.
 * Así un error de sintaxis se informa como COMPILE_ERROR, igual que `javac` en Java.
 */
export function checkSyntax(
  command: string,
  args: string[],
  tmpDir: string,
  timeoutMs: number
): Promise<string | null> {
  return new Promise((resolve) => {
    const child = spawn(command, args);
    let stderr = '';
    let timedOut = false;

    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, timeoutMs);

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      clearTimeout(timeout);
      // Si la validación no termina a tiempo se deja que la ejecución decida.
      if (timedOut || code === 0) {
        resolve(null);
        return;
      }
      // Oculta el directorio temporal: "solution.js:3" en lugar de "/tmp/node-exec-XXXX/solution.js:3".
      resolve(stderr.split(`${tmpDir}${path.sep}`).join('').trim() || 'Syntax error');
    });

    child.on('error', () => {
      clearTimeout(timeout);
      resolve(null);
    });
  });
}
