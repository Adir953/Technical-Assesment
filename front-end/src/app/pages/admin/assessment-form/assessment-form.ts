import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService, errorMessage } from '../../../core/api.service';
import type { Question, QuestionDetail } from '../../../core/models';
import { QuestionForm } from '../question-form/question-form';

@Component({
  selector: 'app-assessment-form',
  imports: [RouterLink, QuestionForm],
  templateUrl: './assessment-form.html',
  styleUrl: './assessment-form.css',
})
export class AssessmentFormPage {
  private readonly api = inject(ApiService);
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
    if (this.problems().length) return;

    this.saving.set(true);
    this.error.set(null);
    try {
      const created = await firstValueFrom(
        this.api.createAssessment({
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
