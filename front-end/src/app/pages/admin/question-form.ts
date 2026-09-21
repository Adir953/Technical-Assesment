import { Component, computed, inject, input, output, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService, errorMessage } from '../../core/api.service';
import { SessionService } from '../../core/session.service';
import type { ProgrammingLanguage, QuestionDetail } from '../../core/models';

const LANGUAGES: Array<{ id: ProgrammingLanguage; label: string }> = [
  { id: 'javascript', label: 'JavaScript (Node.js)' },
  { id: 'python', label: 'Python' },
  { id: 'java', label: 'Java' },
];

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
  template: `
    <form class="admin-form" (submit)="save($event)" novalidate>
      <div class="form-grid">
        <label class="field span-2">
          Título
          <input [value]="title()" (input)="title.set(val($event))" placeholder="Encuentra el número máximo" />
        </label>
        <label class="field">
          Puntaje
          <input type="number" min="1" [value]="points()" (input)="points.set(+val($event))" />
        </label>
      </div>

      <label class="field">
        Descripción
        <textarea rows="4" [value]="description()" (input)="description.set(val($event))"
                  placeholder="Dado un arreglo de números, retorne el valor máximo."></textarea>
      </label>

      <fieldset class="field-group">
        <legend>Lenguajes permitidos y código inicial</legend>
        <p class="muted small">El runner llama a la primera función del código inicial (en Java, al primer método público de <code>Solution</code>).</p>
        <div class="language-checks">
          @for (l of languages; track l.id) {
            <label class="check">
              <input type="checkbox" [checked]="enabled()[l.id]" (change)="toggleLanguage(l.id)" />
              {{ l.label }}
            </label>
          }
        </div>
        @for (l of languages; track l.id) {
          @if (enabled()[l.id]) {
            <label class="field">
              <span>{{ l.label }}</span>
              <textarea class="code-input" rows="6" spellcheck="false"
                        [value]="starters()[l.id]" (input)="setStarter(l.id, val($event))"></textarea>
            </label>
          }
        }
      </fieldset>

      <fieldset class="field-group">
        <legend>Casos de prueba</legend>
        <p class="muted small">
          La entrada es un arreglo JSON con los argumentos de la función, p. ej. <code>[[3,5,1,8]]</code> para
          un solo argumento de tipo arreglo. La salida esperada también es JSON: <code>8</code>, <code>"texto"</code>.
        </p>
        <table class="case-table">
          <thead><tr><th>Entrada (argumentos)</th><th>Salida esperada</th><th>Visible</th><th></th></tr></thead>
          <tbody>
            @for (c of cases(); track $index; let i = $index) {
              <tr>
                <td>
                  <input class="mono" [class.invalid]="submitted() && !validInput(c.inputValue)"
                         [value]="c.inputValue" (input)="updateCase(i, { inputValue: val($event) })" placeholder="[[3,5,1,8]]" />
                </td>
                <td>
                  <input class="mono" [class.invalid]="submitted() && !c.expectedOutput.trim()"
                         [value]="c.expectedOutput" (input)="updateCase(i, { expectedOutput: val($event) })" placeholder="8" />
                </td>
                <td class="center">
                  <input type="checkbox" [checked]="c.isVisible" (change)="updateCase(i, { isVisible: !c.isVisible })"
                         title="Los casos ocultos solo se usan al calificar" />
                </td>
                <td>
                  <button type="button" class="btn btn-ghost btn-sm" (click)="removeCase(i)" [disabled]="cases().length === 1"
                          aria-label="Eliminar caso">✕</button>
                </td>
              </tr>
            }
          </tbody>
        </table>
        <button type="button" class="btn btn-sm-pad" (click)="addCase()">+ Agregar caso</button>
      </fieldset>

      @if (submitted() && problems().length) {
        <ul class="alert alert-error problem-list">
          @for (p of problems(); track p) { <li>{{ p }}</li> }
        </ul>
      }
      @if (error()) {
        <div class="alert alert-error">{{ error() }}</div>
      }

      <div class="form-actions">
        @if (cancellable()) {
          <button type="button" class="btn btn-ghost" (click)="cancelled.emit()">Cancelar</button>
        }
        <button type="submit" class="btn btn-primary" [disabled]="saving()">
          {{ saving() ? 'Guardando…' : 'Crear pregunta' }}
        </button>
      </div>
    </form>
  `,
})
export class QuestionForm {
  readonly cancellable = input(false);
  readonly created = output<QuestionDetail>();
  readonly cancelled = output<void>();

  private readonly api = inject(ApiService);
  private readonly session = inject(SessionService);

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
    if (!this.cases().some((c) => c.isVisible)) list.push('Al menos un caso debe ser visible para poder "Ejecutar".');
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
    const user = this.session.user();
    if (this.problems().length || !user) return;

    this.saving.set(true);
    this.error.set(null);
    try {
      const question = await firstValueFrom(
        this.api.createQuestion({
          createdBy: user.id,
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
