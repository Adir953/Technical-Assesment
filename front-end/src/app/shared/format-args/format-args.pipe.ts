import { Pipe, PipeTransform } from '@angular/core';

/** JSON con espacio tras las comas: [3, 5, 1] en lugar de [3,5,1]. */
function formatValue(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(formatValue).join(', ')}]`;
  if (value !== null && typeof value === 'object') {
    return `{ ${Object.entries(value).map(([k, v]) => `${JSON.stringify(k)}: ${formatValue(v)}`).join(', ')} }`;
  }
  return JSON.stringify(value);
}

/**
 * La entrada de un caso de prueba se guarda como la lista JSON de argumentos de la función
 * (el runner hace `fn(...args)`), por eso un arreglo como único argumento queda `[[3,5,1]]`.
 * Para mostrarla se quita esa lista exterior: `[[3,5,1]]` → `[3, 5, 1]`, `["hola"]` → `"hola"`,
 * `[1, 2]` → `1, 2`. Si no es una lista JSON válida se muestra tal cual.
 */
@Pipe({ name: 'formatArgs' })
export class FormatArgsPipe implements PipeTransform {
  transform(input: string | null | undefined): string {
    if (input == null) return '';
    try {
      const args: unknown = JSON.parse(input);
      return Array.isArray(args) ? args.map(formatValue).join(', ') : formatValue(args);
    } catch {
      return input;
    }
  }
}

/** Formatea un valor JSON (p. ej. la salida esperada) con espacios legibles. */
@Pipe({ name: 'formatJson' })
export class FormatJsonPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (value == null) return '';
    try {
      return formatValue(JSON.parse(value));
    } catch {
      return value;
    }
  }
}
