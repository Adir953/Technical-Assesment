import { Routes } from '@angular/router';
import { adminGuard, authGuard, guestGuard, studentGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'assessments' },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/login/login').then((m) => m.LoginPage),
  },
  {
    path: 'assessments',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/assessment-list/assessment-list').then((m) => m.AssessmentListPage),
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/admin/admin-dashboard/admin-dashboard').then((m) => m.AdminDashboardPage),
      },
      {
        path: 'assessments/new',
        loadComponent: () =>
          import('./pages/admin/assessment-form/assessment-form').then((m) => m.AssessmentFormPage),
      },
      {
        path: 'questions/new',
        loadComponent: () => import('./pages/admin/question-new/question-new').then((m) => m.QuestionNewPage),
      },
    ],
  },
  {
    path: 'submissions/:submissionId',
    canActivate: [studentGuard],
    loadComponent: () =>
      import('./pages/assessment-detail/assessment-detail').then((m) => m.AssessmentDetailPage),
  },
  {
    path: 'submissions/:submissionId/questions/:questionId',
    canActivate: [studentGuard],
    loadComponent: () => import('./pages/code-editor/code-editor').then((m) => m.CodeEditorPage),
  },
  {
    path: 'submissions/:submissionId/results',
    canActivate: [studentGuard],
    loadComponent: () => import('./pages/results/results').then((m) => m.ResultsPage),
  },
  { path: '**', redirectTo: 'assessments' },
];
