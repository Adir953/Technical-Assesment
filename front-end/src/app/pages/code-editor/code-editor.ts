import { Component, DestroyRef, computed, effect, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService, errorMessage } from '../../core/api.service';
import { SubmittedNotice, deadline, formatDuration, latestByQuestion, questionState } from '../../core/grading';
import type { AssessmentDetail, ProgrammingLanguage, QuestionDetail, SubmissionDetail } from '../../core/models';
import { MonacoEditor } from '../../shared/monaco-editor/monaco-editor';
import { FormatArgsPipe, FormatJsonPipe } from '../../shared/format-args/format-args.pipe';
import { ConsoleView, ExecutionConsole, errorLines, fromRun, fromSubmit } from '../../shared/execution-console/execution-console';
import { LANGUAGES } from '../../core/languages';

function starterFor(question: QuestionDetail, language: ProgrammingLanguage): string {
  return question.starterCodes[language] ?? '';
}

@Component({
  selector: 'app-code-editor',
  imports: [RouterLink, MonacoEditor, ExecutionConsole, FormatArgsPipe, FormatJsonPipe],
  templateUrl: './code-editor.html',
  styleUrl: './code-editor.css',
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
  // Resumen del último envío calificado; se muestra hasta la siguiente ejecución o envío.
  protected readonly submitted = signal<SubmittedNotice | null>(null);
  protected readonly summaryState = computed(() => {
    const s = this.submitted();
    if (!s) return null;
    return questionState({ score: s.score }, s.points);
  });
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

    // El estudiante se queda en el editor para revisar la calificación; vuelve con el botón.
    this.submitted.set({
      title: q.title,
      score: view.score?.obtained ?? 0,
      points: q.points,
      passed: view.tests.filter((t) => t.passed).length,
      total: view.tests.length,
    });
  }

  backToQuestions() {
    this.router.navigate(['/submissions', this.submissionId()], {
      state: { submitted: this.submitted() },
    });
  }

  private async execute(action: () => Promise<ConsoleView>): Promise<ConsoleView | null> {
    this.busy.set(true);
    this.error.set(null);
    this.submitted.set(null);
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
