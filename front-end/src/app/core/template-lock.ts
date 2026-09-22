// Comentario que separa la firma (bloqueada) del cuerpo editable en el código inicial.
const MARKER = 'Escribe tu solución aquí';

/** Partes del código inicial que el estudiante no puede modificar. */
export interface TemplateLock {
  /** Desde el inicio hasta la línea del comentario, incluido su salto de línea. */
  prefix: string;
  /** Llaves de cierre finales (JavaScript, Java); vacío en Python. */
  suffix: string;
}

/** Calcula las partes bloqueadas, o null si la plantilla no tiene el comentario. */
export function templateLock(template: string): TemplateLock | null {
  const lines = template.split('\n');
  const markerLine = lines.findIndex((l) => l.includes(MARKER));
  if (markerLine < 0) return null;

  const rest = lines.slice(markerLine + 1);
  let start = rest.length;
  while (start > 0 && /^\s*\}?\s*$/.test(rest[start - 1])) start--;
  const closing = rest.slice(start);
  while (closing.length && !closing[0].trim()) closing.shift();

  return {
    prefix: lines.slice(0, markerLine + 1).join('\n') + '\n',
    suffix: closing.join('\n').trimEnd(),
  };
}

/** Indica si el código conserva intactas las partes bloqueadas de la plantilla. */
export function respectsLock(code: string, lock: TemplateLock): boolean {
  return (
    code.startsWith(lock.prefix) &&
    code.trimEnd().endsWith(lock.suffix) &&
    code.length >= lock.prefix.length + lock.suffix.length
  );
}
