import type { ProgrammingLanguage } from './models';

/** Lenguajes que soportan los runners, en el orden en que se muestran. */
export const LANGUAGES: ReadonlyArray<{ id: ProgrammingLanguage; label: string }> = [
  { id: 'javascript', label: 'JavaScript (Node.js)' },
  { id: 'python', label: 'Python' },
  { id: 'java', label: 'Java' },
];
