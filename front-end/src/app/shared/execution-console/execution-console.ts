import { Component, computed, input } from '@angular/core';
import type { ExecutionResult, ExecutionStatus, SolutionResult } from '../../core/models';
import { FormatArgsPipe, FormatJsonPipe } from '../format-args/format-args.pipe';

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
  templateUrl: './execution-console.html',
  styleUrl: './execution-console.css',
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
