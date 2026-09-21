import { Component, computed, input } from '@angular/core';
import type { ExecutionResult, ExecutionStatus, SolutionResult } from '../core/models';
import { FormatArgsPipe, FormatJsonPipe } from './format-args.pipe';

export interface ConsoleTest {
  input: string;
  expected: string;
  actual: string | null;
  passed: boolean;
  error: string | null;
}

export interface ConsoleView {
  kind: 'run' | 'submit';
  status: ExecutionStatus;
  error: string | null;
  output: string | null;
  tests: ConsoleTest[];
  score?: { obtained: number; points: number };
}

const STATUS_LABEL: Record<ExecutionStatus, string> = {
  SUCCESS: 'Todos los casos pasaron',
  WRONG_ANSWER: 'Respuesta incorrecta',
  COMPILE_ERROR: 'Error de compilación',
  RUNTIME_ERROR: 'Error en tiempo de ejecución',
  TIME_LIMIT_EXCEEDED: 'Tiempo límite excedido',
};

export function fromRun(result: ExecutionResult): ConsoleView {
  return {
    kind: 'run',
    status: result.status,
    error: result.error ?? null,
    output: result.output ?? null,
    tests: (result.testResults ?? []).map((t) => ({
      input: t.input,
      expected: t.expectedOutput,
      actual: t.actualOutput ?? null,
      passed: t.passed,
      error: t.error ?? null,
    })),
  };
}

/** Tras enviar se muestran todos los casos (ejemplos y ocultos) con sus entradas y salidas. */
export function fromSubmit(result: SolutionResult, points: number): ConsoleView {
  const qs = result.questionSubmission;
  return {
    kind: 'submit',
    status: result.status,
    error: qs.compilationError,
    output: qs.executionOutput,
    tests: result.testCaseResults.map((t) => ({
      input: t.inputValue,
      expected: t.expectedOutput,
      actual: t.actualOutput,
      passed: t.isPassed,
      error: t.errorMessage,
    })),
    score: { obtained: qs.score ?? 0, points },
  };
}

/** Extrae números de línea de mensajes de Python, Node y javac. */
export function errorLines(message: string | null): Array<{ line: number; message: string }> {
  if (!message) return [];
  const found = new Map<number, string>();
  for (const text of message.split('\n')) {
    const match = /(?:line|l[ií]nea)\s+(\d+)|\.(?:java|js|py):(\d+)/i.exec(text);
    const line = Number(match?.[1] ?? match?.[2]);
    if (line > 0 && !found.has(line)) found.set(line, text.trim());
  }
  return [...found].map(([line, msg]) => ({ line, message: msg }));
}

@Component({
  selector: 'app-execution-console',
  imports: [FormatArgsPipe, FormatJsonPipe],
  template: `
    <div class="console">
      <div class="console-header">
        Consola
        @if (!running() && view(); as v) {
          <span class="console-kind">
            · {{ v.kind === 'submit' ? 'Calificación con todos los casos' : 'Prueba con casos de ejemplo (no se guarda)' }}
          </span>
        }
      </div>
      @if (running()) {
        <p class="console-line muted">Ejecutando…</p>
      } @else if (view(); as v) {
        <div class="console-status" [class.ok]="compiled()" [class.fail]="!compiled()">
          Compilación: {{ compiled() ? 'Exitosa' : 'Error' }}
        </div>
        <div class="console-status" [class.ok]="v.status === 'SUCCESS'" [class.fail]="v.status !== 'SUCCESS'">
          {{ statusLabel[v.status] }}
        </div>

        @if (lines().length) {
          <ul class="console-errors">
            @for (l of lines(); track l.line) {
              <li>Línea {{ l.line }}: {{ l.message }}</li>
            }
          </ul>
        }
        @if (v.error) {
          <pre class="console-pre error">{{ v.error }}</pre>
        }
        @if (v.output) {
          <div class="console-label">Salida</div>
          <pre class="console-pre">{{ v.output }}</pre>
        }

        @if (v.tests.length) {
          <div class="console-summary">
            <span>{{ v.tests.length }} casos ejecutados</span>
            <span class="ok">{{ passed() }} exitosos</span>
            <span class="fail">{{ v.tests.length - passed() }} fallidos</span>
            <strong>Resultado: {{ percent() }}%</strong>
            @if (v.score) {
              <strong>Puntaje: {{ v.score.obtained }} / {{ v.score.points }}</strong>
            }
          </div>
          <table class="console-table">
            <thead><tr><th>#</th><th>Entrada</th><th>Esperado</th><th>Obtenido</th><th></th></tr></thead>
            <tbody>
              @for (t of v.tests; track $index) {
                <tr [class.row-fail]="!t.passed">
                  <td>{{ $index + 1 }}</td>
                  <td><code>{{ t.input | formatArgs }}</code></td>
                  <td><code>{{ t.expected | formatJson }}</code></td>
                  <td><code>{{ t.actual === null ? '—' : (t.actual | formatJson) }}</code>
                    @if (t.error && t.error !== v.error) { <div class="cell-error">{{ t.error }}</div> }
                  </td>
                  <td>{{ t.passed ? '✔' : '✘' }}</td>
                </tr>
              }
            </tbody>
          </table>
        }
      } @else {
        <p class="console-line muted">Ejecuta tu código para ver la salida y los casos de prueba.</p>
      }
    </div>
  `,
})
export class ExecutionConsole {
  readonly view = input<ConsoleView | null>(null);
  readonly running = input(false);

  protected readonly statusLabel = STATUS_LABEL;
  protected readonly compiled = computed(() => this.view()?.status !== 'COMPILE_ERROR');
  protected readonly passed = computed(() => this.view()?.tests.filter((t) => t.passed).length ?? 0);
  protected readonly percent = computed(() => {
    const total = this.view()?.tests.length ?? 0;
    return total ? Math.round((this.passed() / total) * 100) : 0;
  });
  protected readonly lines = computed(() => errorLines(this.view()?.error ?? null));
}
