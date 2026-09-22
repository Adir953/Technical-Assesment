import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ConsoleView, ExecutionConsole, errorLines, fromSubmit } from './execution-console';
import type { SolutionResult } from '../../core/models';

describe('errorLines', () => {
  it('extrae la línea de errores de Python, Node y Java', () => {
    expect(errorLines('File "solution.py", line 2\n    return max(arr')[0].line).toBe(2);
    expect(errorLines('solution.js:4\n  return x +')[0].line).toBe(4);
    expect(errorLines("Solution.java:3: error: ';' expected")[0].line).toBe(3);
  });

  it('devuelve una lista vacía si no hay error', () => {
    expect(errorLines(null)).toEqual([]);
  });
});

describe('fromSubmit', () => {
  it('convierte la respuesta del backend en la vista de la consola', () => {
    const result = {
      status: 'WRONG_ANSWER',
      questionSubmission: { score: 6, compilationError: null, executionOutput: null },
      testCaseResults: [
        { inputValue: '["hola"]', expectedOutput: '"aloh"', actualOutput: '"hola"', isPassed: false, errorMessage: null },
        { inputValue: '["a"]', expectedOutput: '"a"', actualOutput: '"a"', isPassed: true, errorMessage: null },
      ],
    } as unknown as SolutionResult;

    const view = fromSubmit(result, 10);

    expect(view.kind).toBe('submit');
    expect(view.score).toEqual({ obtained: 6, points: 10 });
    expect(view.tests.map((t) => t.passed)).toEqual([false, true]);
  });
});

describe('ExecutionConsole', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ExecutionConsole],
      providers: [provideZonelessChangeDetection()],
    });
  });

  it('muestra "Compilación: Error" cuando el código no compila', async () => {
    const view: ConsoleView = {
      kind: 'run',
      status: 'COMPILE_ERROR',
      error: 'solution.js:2\nSyntaxError: missing ) after argument list',
      output: null,
      tests: [],
    };
    const fixture = TestBed.createComponent(ExecutionConsole);
    fixture.componentRef.setInput('view', view);
    await fixture.whenStable();

    const status = fixture.nativeElement.querySelector('.console-status') as HTMLElement;
    expect(status.textContent).toContain('Compilación: Error');
    expect(fixture.nativeElement.textContent).toContain('Línea 2');
  });
});
