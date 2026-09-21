import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import type { QuestionDetail } from '../../core/models';
import { QuestionForm } from './question-form';

@Component({
  selector: 'app-question-new',
  imports: [RouterLink, QuestionForm],
  template: `
    <a routerLink="/admin" class="back">← Panel del evaluador</a>
    <h1>Nueva pregunta</h1>
    <section class="card">
      <app-question-form [cancellable]="true" (created)="done($event)" (cancelled)="back()" />
    </section>
  `,
})
export class QuestionNewPage {
  private readonly router = inject(Router);

  done(question: QuestionDetail) {
    this.router.navigate(['/admin'], { state: { created: question.title } });
  }

  back() {
    this.router.navigate(['/admin']);
  }
}
