import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService, errorMessage } from '../../core/api.service';
import { SessionService } from '../../core/session.service';
import type { Question, QuestionDetail } from '../../core/models';
import { QuestionForm } from './question-form';

@Component({
  selector: 'app-assessment-form',
  imports: [RouterLink, QuestionForm],
  template: `
    <a routerLink="/admin" class="back">← Panel del evaluador</a>
    <h1>Nuevo assessment</h1>

    <form class="admin-form card" (submit)="save($event)" novalidate>
      <div class="form-grid">
        <label class="field span-2">
          Nombre
          <input [value]="title()" (input)="title.set(val($event))" placeholder="Assessment Full Stack Cloud" />
        </label>
        <label class="field">
          Tiempo límite (minutos)
          <input type="number" min="1" [value]="duration()" (input)="duration.set(+val($event))" />
        </label>
      </div>
      <label class="field">
        Descripción
        <textarea rows="3" [value]="description()" (input)="description.set(val($event))"></textarea>
      </label>

      <fieldset class="field-group">
        <legend>Preguntas ({{ selected().length }} seleccionadas · {{ totalPoints() }} pts)</legend>

        @if (selected().length) {
          <ol class="selected-list">
            @for (q of selected(); track q.id; let i = $index, last = $last) {
              <li>
                <span class="order">{{ i + 1 }}</span>
                <span class="grow">{{ q.title }} <span class="muted">· {{ q.points }} pts</span></span>
                <button type="button" class="btn btn-ghost btn-sm" (click)="move(i, -1)" [disabled]="i === 0" aria-label="Subir">↑</button>
                <button type="button" class="btn btn-ghost btn-sm" (click)="move(i, 1)" [disabled]="last" aria-label="Bajar">↓</button>
                <button type="button" class="btn btn-ghost btn-sm" (click)="toggle(q)" aria-label="Quitar">✕</button>
              </li>
            }
          </ol>
        } @else {
          <p class="muted small">Selecciona preguntas del banco o crea una nueva.</p>
        }

        <div class="bank-header">
          <strong>Banco de preguntas</strong>
          @if (!creatingQuestion()) {
            <button type="button" class="btn btn-sm-pad" (click)="creatingQuestion.set(true)">+ Nueva pregunta</button>
          }
        </div>
        @if (loadingBank()) {
          <p class="muted small">Cargando preguntas…</p>
        }
        <ul class="bank-list">
          @for (q of bank(); track q.id) {
            <li>
              <label class="check">
                <input type="checkbox" [checked]="isSelected(q.id)" (change)="toggle(q)" />
                <span>{{ q.title }}</span>
                <span class="muted">· {{ q.points }} pts</span>
              </label>
            </li>
          }
        </ul>
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
        <a routerLink="/admin" class="btn btn-ghost">Cancelar</a>
        <button type="submit" class="btn btn-primary" [disabled]="saving() || creatingQuestion()">
          {{ saving() ? 'Guardando…' : 'Crear assessment' }}
        </button>
      </div>
    </form>

    @if (creatingQuestion()) {
      <section class="card nested-form">
        <h2>Nueva pregunta</h2>
        <p class="muted small">Al guardarla se agrega al banco y queda seleccionada para este assessment.</p>
        <app-question-form [cancellable]="true" (created)="onQuestionCreated($event)" (cancelled)="creatingQuestion.set(false)" />
      </section>
    }
  `,
})
export class AssessmentFormPage {
  private readonly api = inject(ApiService);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);

  protected readonly title = signal('');
  protected readonly description = signal('');
  protected readonly duration = signal(60);
  protected readonly bank = signal<Question[]>([]);
  protected readonly loadingBank = signal(true);
  protected readonly selected = signal<Question[]>([]);
  protected readonly creatingQuestion = signal(false);
  protected readonly submitted = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly totalPoints = computed(() => this.selected().reduce((s, q) => s + q.points, 0));
  protected readonly problems = computed(() => {
    const list: string[] = [];
    if (!this.title().trim()) list.push('El nombre es obligatorio.');
    if (!Number.isInteger(this.duration()) || this.duration() < 1) list.push('El tiempo límite debe ser un entero mayor a 0.');
    if (this.selected().length === 0) list.push('Selecciona al menos una pregunta.');
    return list;
  });

  constructor() {
    this.api.listQuestions().subscribe({
      next: (questions) => {
        this.bank.set(questions);
        this.loadingBank.set(false);
      },
      error: (err) => {
        this.error.set(errorMessage(err));
        this.loadingBank.set(false);
      },
    });
  }

  protected val(event: Event): string {
    return (event.target as HTMLInputElement | HTMLTextAreaElement).value;
  }

  isSelected(id: number) {
    return this.selected().some((q) => q.id === id);
  }

  toggle(question: Question) {
    this.selected.update((list) =>
      list.some((q) => q.id === question.id) ? list.filter((q) => q.id !== question.id) : [...list, question]
    );
  }

  move(index: number, delta: number) {
    this.selected.update((list) => {
      const next = [...list];
      [next[index], next[index + delta]] = [next[index + delta], next[index]];
      return next;
    });
  }

  onQuestionCreated(question: QuestionDetail) {
    this.bank.update((b) => [...b, question]);
    this.selected.update((s) => [...s, question]);
    this.creatingQuestion.set(false);
  }

  async save(event: Event) {
    event.preventDefault();
    this.submitted.set(true);
    const user = this.session.user();
    if (this.problems().length || !user) return;

    this.saving.set(true);
    this.error.set(null);
    try {
      const created = await firstValueFrom(
        this.api.createAssessment({
          createdBy: user.id,
          title: this.title().trim(),
          description: this.description().trim() || undefined,
          durationMinutes: this.duration(),
          questionIds: this.selected().map((q) => q.id),
        })
      );
      await this.router.navigate(['/admin'], { state: { created: created.title } });
    } catch (err) {
      this.error.set(errorMessage(err));
    } finally {
      this.saving.set(false);
    }
  }
}
