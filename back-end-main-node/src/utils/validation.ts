import { badRequest } from '../middleware/errorHandler';
import type { ProgrammingLanguage } from '../types/submission';


const LANGUAGES: ProgrammingLanguage[] = ['python', 'javascript', 'java'];

export function parseId(value: unknown, field: string): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw badRequest(`${field} must be a positive integer`);
  }
  return id;
}

export function parseIdList(value: unknown, field: string): number[] {
  if (!Array.isArray(value)) {
    throw badRequest(`${field} must be an array`);
  }
  return value.map((item) => parseId(item, `${field}[]`));
}

export function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw badRequest(`${field} is required`);
  }
  return value;
}

export function optionalString(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw badRequest(`${field} must be a string`);
  }
  return value;
}

export function parseLanguage(value: unknown): ProgrammingLanguage {
  if (!LANGUAGES.includes(value as ProgrammingLanguage)) {
    throw badRequest(`language must be one of: ${LANGUAGES.join(', ')}`);
  }
  return value as ProgrammingLanguage;
}
