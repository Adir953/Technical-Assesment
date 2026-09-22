import {
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { respectsLock, templateLock } from '../../core/template-lock';

// Monaco se sirve como assets estáticos (ver angular.json) y se carga con su
// loader AMD, así no pasa por el bundler de Angular.
// La URL debe ser absoluta: los web workers de Monaco no pueden resolver rutas relativas.
const MONACO_BASE = new URL('assets/monaco/vs', document.baseURI).href;

/* eslint-disable @typescript-eslint/no-explicit-any */
type Monaco = any;
let monacoPromise: Promise<Monaco> | null = null;

function loadMonaco(): Promise<Monaco> {
  const w = window as any;
  if (w.monaco) return Promise.resolve(w.monaco);
  monacoPromise ??= new Promise((resolve, reject) => {
    w.MonacoEnvironment = {
      getWorkerUrl: () =>
        `data:text/javascript;charset=utf-8,${encodeURIComponent(
          `self.MonacoEnvironment = { baseUrl: '${MONACO_BASE}/../' };` +
            `importScripts('${MONACO_BASE}/base/worker/workerMain.js');`
        )}`,
    };
    const script = document.createElement('script');
    script.src = `${MONACO_BASE}/loader.js`;
    script.onload = () => {
      w.require.config({ paths: { vs: MONACO_BASE } });
      w.require(['vs/editor/editor.main'], () => resolve(w.monaco), reject);
    };
    script.onerror = () => reject(new Error('No se pudo cargar Monaco Editor'));
    document.body.appendChild(script);
  });
  return monacoPromise;
}

export interface EditorMarker {
  line: number;
  message: string;
}

@Component({
  selector: 'app-monaco-editor',
  templateUrl: './monaco-editor.html',
  styleUrl: './monaco-editor.css',
})
export class MonacoEditor {
  readonly value = input.required<string>();
  readonly language = input<string>('javascript');
  readonly markers = input<EditorMarker[]>([]);
  // Código inicial cuya firma y comentario no se pueden modificar (null = todo editable).
  readonly lockedTemplate = input<string | null>(null);
  readonly valueChange = output<string>();

  private readonly host = viewChild.required<ElementRef<HTMLDivElement>>('host');
  protected readonly fallback = signal(false);
  private readonly lock = computed(() => {
    const template = this.lockedTemplate();
    return template ? templateLock(template) : null;
  });
  private monaco: Monaco = null;
  private editor: Monaco = null;
  private lockDecorations: Monaco = null;
  private lastValue = '';
  // Activo mientras el valor cambia por código (no por el usuario); omite la validación del bloqueo.
  private reverting = false;

  constructor() {
    loadMonaco()
      .then((monaco) => {
        this.monaco = monaco;
        this.editor = monaco.editor.create(this.host().nativeElement, {
          value: this.value(),
          language: this.language(),
          theme: 'vs-dark',
          automaticLayout: true,
          minimap: { enabled: false },
          fontSize: 14,
          scrollBeyondLastLine: false,
          tabSize: 4,
        });
        this.lastValue = this.editor.getValue();
        this.lockDecorations = this.editor.createDecorationsCollection();
        this.editor.onDidChangeModelContent((e: Monaco) => this.onContentChange(e));
        this.applyMarkers(this.markers());
        this.paintLock();
      })
      .catch((err) => {
        console.error(err);
        this.fallback.set(true);
      });

    // Sincroniza cambios externos (p. ej. al cambiar de lenguaje).
    effect(() => {
      const value = this.value();
      if (this.editor && this.editor.getValue() !== value) {
        this.reverting = true;
        this.editor.setValue(value);
        this.reverting = false;
      }
    });
    effect(() => {
      const language = this.language();
      if (this.editor) this.monaco.editor.setModelLanguage(this.editor.getModel(), language);
    });
    effect(() => this.applyMarkers(this.markers()));
    effect(() => {
      this.lock();
      this.paintLock();
    });

    inject(DestroyRef).onDestroy(() => this.editor?.dispose());
  }

  private onContentChange(e: Monaco) {
    const value = this.editor.getValue();
    const lock = this.lock();
    // Si el cambio toca la plantilla, se deshace. Solo aplica cuando el código ya la respetaba,
    // para no bloquear respuestas guardadas antes de esta regla.
    if (!this.reverting && lock && respectsLock(this.lastValue, lock) && !respectsLock(value, lock)) {
      const { startLineNumber, startColumn } = e.changes[0].range;
      this.reverting = true;
      this.editor.setValue(this.lastValue);
      this.reverting = false;
      this.editor.setPosition({ lineNumber: startLineNumber, column: startColumn });
      return;
    }
    this.lastValue = value;
    this.paintLock();
    this.valueChange.emit(value);
  }

  // Sombrea las líneas bloqueadas para que el estudiante vea qué no puede editar.
  private paintLock() {
    if (!this.editor) return;
    const lock = this.lock();
    const model = this.editor.getModel();
    const code: string = model.getValue();
    if (!lock || !respectsLock(code, lock)) {
      this.lockDecorations.clear();
      return;
    }
    const ranges = [[0, lock.prefix.length - 1]];
    if (lock.suffix) {
      const end = code.trimEnd().length;
      ranges.push([end - lock.suffix.length, end]);
    }
    this.lockDecorations.set(
      ranges.map(([from, to]) => ({
        range: new this.monaco.Range(model.getPositionAt(from).lineNumber, 1, model.getPositionAt(to).lineNumber, 1),
        options: { isWholeLine: true, className: 'template-locked' },
      }))
    );
  }

  private applyMarkers(markers: EditorMarker[]) {
    if (!this.editor) return;
    const model = this.editor.getModel();
    this.monaco.editor.setModelMarkers(
      model,
      'execution',
      markers.map((m) => ({
        startLineNumber: m.line,
        endLineNumber: m.line,
        startColumn: 1,
        endColumn: model.getLineMaxColumn(Math.min(m.line, model.getLineCount())),
        message: m.message,
        severity: this.monaco.MarkerSeverity.Error,
      }))
    );
  }
}
