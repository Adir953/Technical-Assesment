import { Component, DestroyRef, computed, effect, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService, errorMessage } from '../../core/api.service';
import { SubmittedNotice, deadline, formatDuration, latestByQuestion } from '../../core/grading';
import type { AssessmentDetail, ProgrammingLanguage, QuestionDetail, SubmissionDetail } from '../../core/models';
import { MonacoEditor } from '../../shared/monaco-editor';
import { ConsoleView, ExecutionConsole, errorLines, fromRun, fromSubmit } from '../../shared/execution-console';

const LANGUAGES: Array<{ id: ProgrammingLanguage; label: string }> = [
  { id: 'javascript', label: 'JavaScript (Node.js)' },
  { id: 'python', label: 'Python' },
  { id: 'java', label: 'Java' },
];

function starterFor(question: QuestionDetail, language: ProgrammingLanguage): string {
  return question.starterCodes[language] ?? '';
}

@Component({
  selector: 'app-code-editor',
  imports: [RouterLink, MonacoEditor, ExecutionConsole],
  template: `
    <a [routerLink]="['/submissions', submissionId()]" class="back">← Volver al assessment</a>
    @if (error()) {
      <div class="alert alert-error">{{ error() }}</div>
    }
    @if (question(); as q) {
      <div class="editor-layout">
        <section class="card problem">
          <div class="problem-header">
            <h1>{{ q.title }}</h1>
            <span class="badge">{{ q.points }} pts</span>
          </div>
          @if (assessment()) {
            <p class="muted">Tiempo restante: <strong [class.danger]="remainingMs() < 5 * 60_000">{{ remaining() }}</strong></p>
          }
          <pre class="problem-description">{{ q.description }}</pre>
          @if (q.testCases.length) {
            <h3>Casos de ejemplo</h3>
            <table class="console-table">
              <thead><tr><th>Entrada</th><th>Salida esperada</th></tr></thead>
              <tbody>
                @for (t of q.testCases; track t.id) {
                  <tr><td><code>{{ t.inputValue }}</code></td><td><code>{{ t.expectedOutput }}</code></td></tr>
                }
              </tbody>
            </table>
          }
        </section>

        <section class="workspace">
          <div class="toolbar">
            <label>
              Lenguaje
              <select [value]="language()" (change)="changeLanguage($any($event.target).value)">
                @for (l of languages(); track l.id) {
                  <option [value]="l.id">{{ l.label }}</option>
                }
              </select>
            </label>
            <span class="spacer"></span>
            <button class="btn btn-ghost" (click)="reset()" [disabled]="busy()">Restablecer</button>
            <button class="btn" (click)="run()" [disabled]="busy() || expired()">▶ Ejecutar</button>
            <button class="btn btn-primary" (click)="submit()" [disabled]="busy() || expired()">Enviar respuesta</button>
          </div>
          <div class="editor-frame">
            <app-monaco-editor
              [value]="code()"
              [language]="language()"
              [markers]="markers()"
              (valueChange)="setCode($event)"
            />
          </div>
          <app-execution-console [view]="result()" [running]="busy()" />
        </section>
      </div>
    } @else if (!error()) {
      <p class="muted">Cargando pregunta…</p>
    }
  `,
})
export class CodeEditorPage {
  readonly submissionId = input.required<string>();
  readonly questionId = input.required<string>();

  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  protected readonly question = signal<QuestionDetail | null>(null);
  protected readonly languages = computed(() => {
    const allowed = this.question()?.starterCodes ?? {};
    return LANGUAGES.filter((l) => l.id in allowed);
  });
  protected readonly assessment = signal<AssessmentDetail | null>(null);
  private readonly submission = signal<SubmissionDetail | null>(null);
  protected readonly language = signal<ProgrammingLanguage>('javascript');
  protected readonly code = signal('');
  protected readonly result = signal<ConsoleView | null>(null);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  private readonly now = signal(Date.now());

  // Borradores por lenguaje, para no perder código al alternar.
  private drafts: Partial<Record<ProgrammingLanguage, string>> = {};

  protected readonly markers = computed(() => errorLines(this.result()?.error ?? null));
  protected readonly remainingMs = computed(() => {
    const s = this.submission();
    const a = this.assessment();
    return s && a ? deadline(s, a.durationMinutes) - this.now() : Infinity;
  });
  protected readonly remaining = computed(() => formatDuration(this.remainingMs()));
  protected readonly expired = computed(() => this.remainingMs() <= 0 || !!this.submission()?.completedAt);

  constructor() {
    const timer = setInterval(() => this.now.set(Date.now()), 1000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));

    effect(() => this.load(Number(this.submissionId()), Number(this.questionId())));
  }

  private async load(submissionId: number, questionId: number) {
    try {
      const [question, submission] = await Promise.all([
        firstValueFrom(this.api.getQuestion(questionId)),
        firstValueFrom(this.api.getSubmission(submissionId)),
      ]);
      if (submission.completedAt) {
        await this.router.navigate(['/submissions', submissionId, 'results']);
        return;
      }
      this.submission.set(submission);
      this.question.set(question);
      this.api.getAssessment(submission.assessmentId).subscribe((a) => this.assessment.set(a));

      // Si ya hubo un envío, se retoma el último código enviado.
      const previous = latestByQuestion(submission).get(questionId);
      if (previous) {
        this.language.set(previous.programmingLanguage);
        this.drafts[previous.programmingLanguage] = previous.studentCode;
      } else if (!(this.language() in question.starterCodes)) {
        const first = this.languages()[0];
        if (first) this.language.set(first.id);
      }
      this.code.set(this.drafts[this.language()] ?? starterFor(question, this.language()));
    } catch (err) {
      this.error.set(errorMessage(err));
    }
  }

  setCode(code: string) {
    this.code.set(code);
    this.drafts[this.language()] = code;
  }

  changeLanguage(language: ProgrammingLanguage) {
    const q = this.question();
    if (!q) return;
    this.language.set(language);
    this.code.set(this.drafts[language] ?? starterFor(q, language));
    this.result.set(null);
  }

  reset() {
    const q = this.question();
    if (!q) return;
    delete this.drafts[this.language()];
    this.code.set(starterFor(q, this.language()));
    this.result.set(null);
  }

  async run() {
    const q = this.question();
    if (!q) return;
    await this.execute(async () =>
      fromRun(await firstValueFrom(this.api.runQuestion(q.id, this.code(), this.language())))
    );
  }

  async submit() {
    const q = this.question();
    if (!q) return;
    const view = await this.execute(async () => {
      const res = await firstValueFrom(
        this.api.submitSolution(Number(this.submissionId()), q.id, this.code(), this.language())
      );
      return fromSubmit(res, q.points);
    });
    if (!view) return;

    // Tras enviar, se vuelve a la lista de preguntas con el resumen del envío.
    const submitted: SubmittedNotice = {
      title: q.title,
      score: view.score?.obtained ?? 0,
      points: q.points,
      passed: view.tests.filter((t) => t.passed).length,
      total: view.tests.length,
    };
    await this.router.navigate(['/submissions', this.submissionId()], { state: { submitted } });
  }

  private async execute(action: () => Promise<ConsoleView>): Promise<ConsoleView | null> {
    this.busy.set(true);
    this.error.set(null);
    try {
      const view = await action();
      this.result.set(view);
      return view;
    } catch (err) {
      this.error.set(errorMessage(err));
      return null;
    } finally {
      this.busy.set(false);
    }
  }
}
