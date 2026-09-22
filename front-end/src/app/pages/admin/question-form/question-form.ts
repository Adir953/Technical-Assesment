import { Component, computed, inject, input, output, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService, errorMessage } from '../../../core/api.service';
import type { ProgrammingLanguage, QuestionDetail } from '../../../core/models';
import { LANGUAGES } from '../../../core/languages';

// El runner invoca la primera función (o método público en Java) del código inicial.
const DEFAULT_STARTERS: Record<ProgrammingLanguage, string> = {
  javascript: 'function solution(arr) {\n  // Escribe tu solución aquí\n}\n',
  python: 'def solution(arr):\n    # Escribe tu solución aquí\n    pass\n',
  java:
    'public class Solution {\n    public int solution(int[] arr) {\n        // Escribe tu solución aquí\n        return 0;\n    }\n}\n',
};

interface TestCaseDraft {
  inputValue: string;
  expectedOutput: string;
  isVisible: boolean;
}

function isJson(value: string): boolean {
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}

/** Formulario de creación de preguntas. Emite la pregunta creada. */
@Component({
  selector: 'app-question-form',
  templateUrl: './question-form.html',
  styleUrl: './question-form.css',
})
export class QuestionForm {
  readonly cancellable = input(false);
  readonly created = output<QuestionDetail>();
  readonly cancelled = output<void>();

  private readonly api = inject(ApiService);

  protected readonly languages = LANGUAGES;
  protected readonly title = signal('');
  protected readonly description = signal('');
  protected readonly points = signal(10);
  protected readonly enabled = signal<Record<ProgrammingLanguage, boolean>>({
    javascript: true,
    python: true,
    java: true,
  });
  protected readonly starters = signal<Record<ProgrammingLanguage, string>>({ ...DEFAULT_STARTERS });
  protected readonly cases = signal<TestCaseDraft[]>([{ inputValue: '', expectedOutput: '', isVisible: true }]);
  protected readonly submitted = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly problems = computed(() => {
    const list: string[] = [];
    if (!this.title().trim()) list.push('El título es obligatorio.');
    if (!this.description().trim()) list.push('La descripción es obligatoria.');
    if (!Number.isInteger(this.points()) || this.points() < 1) list.push('El puntaje debe ser un entero mayor a 0.');
    const langs = LANGUAGES.filter((l) => this.enabled()[l.id]);
    if (langs.length === 0) list.push('Selecciona al menos un lenguaje.');
    if (langs.some((l) => !this.starters()[l.id].trim())) list.push('Cada lenguaje permitido necesita código inicial.');
    if (this.cases().some((c) => !this.validInput(c.inputValue)))
      list.push('Cada entrada debe ser un arreglo JSON de argumentos, p. ej. [[1,2,3]].');
    if (this.cases().some((c) => !c.expectedOutput.trim())) list.push('Cada caso necesita una salida esperada.');
    if (!this.cases().some((c) => c.isVisible)) list.push('Al menos un caso debe ser de ejemplo para que el estudiante pueda "Ejecutar".');
    return list;
  });

  protected val(event: Event): string {
    return (event.target as HTMLInputElement | HTMLTextAreaElement).value;
  }

  protected validInput(value: string): boolean {
    return isJson(value) && Array.isArray(JSON.parse(value));
  }

  toggleLanguage(id: ProgrammingLanguage) {
    this.enabled.update((e) => ({ ...e, [id]: !e[id] }));
  }

  setStarter(id: ProgrammingLanguage, code: string) {
    this.starters.update((s) => ({ ...s, [id]: code }));
  }

  addCase() {
    this.cases.update((c) => [...c, { inputValue: '', expectedOutput: '', isVisible: true }]);
  }

  removeCase(index: number) {
    this.cases.update((c) => c.filter((_, i) => i !== index));
  }

  updateCase(index: number, patch: Partial<TestCaseDraft>) {
    this.cases.update((c) => c.map((tc, i) => (i === index ? { ...tc, ...patch } : tc)));
  }

  async save(event: Event) {
    event.preventDefault();
    this.submitted.set(true);
    if (this.problems().length) return;

    this.saving.set(true);
    this.error.set(null);
    try {
      const question = await firstValueFrom(
        this.api.createQuestion({
          title: this.title().trim(),
          description: this.description().trim(),
          points: this.points(),
          starterCodes: Object.fromEntries(
            LANGUAGES.filter((l) => this.enabled()[l.id]).map((l) => [l.id, this.starters()[l.id]])
          ),
          testCases: this.cases().map((c) => ({
            inputValue: c.inputValue.trim(),
            // Un texto sin comillas no es JSON: se guarda como string JSON ("texto").
            expectedOutput: isJson(c.expectedOutput.trim())
              ? c.expectedOutput.trim()
              : JSON.stringify(c.expectedOutput.trim()),
            isVisible: c.isVisible,
          })),
        })
      );
      this.created.emit(question);
    } catch (err) {
      this.error.set(errorMessage(err));
    } finally {
      this.saving.set(false);
    }
  }
}
