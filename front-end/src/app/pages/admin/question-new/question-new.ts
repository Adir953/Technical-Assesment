import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import type { QuestionDetail } from '../../../core/models';
import { QuestionForm } from '../question-form/question-form';

@Component({
  selector: 'app-question-new',
  imports: [RouterLink, QuestionForm],
  templateUrl: './question-new.html',
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
