import {
  Component,
  DestroyRef,
  ElementRef,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';

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
  readonly valueChange = output<string>();

  private readonly host = viewChild.required<ElementRef<HTMLDivElement>>('host');
  protected readonly fallback = signal(false);
  private monaco: Monaco = null;
  private editor: Monaco = null;

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
        this.editor.onDidChangeModelContent(() => this.valueChange.emit(this.editor.getValue()));
        this.applyMarkers(this.markers());
      })
      .catch((err) => {
        console.error(err);
        this.fallback.set(true);
      });

    // Sincroniza cambios externos (p. ej. al cambiar de lenguaje).
    effect(() => {
      const value = this.value();
      if (this.editor && this.editor.getValue() !== value) this.editor.setValue(value);
    });
    effect(() => {
      const language = this.language();
      if (this.editor) this.monaco.editor.setModelLanguage(this.editor.getModel(), language);
    });
    effect(() => this.applyMarkers(this.markers()));

    inject(DestroyRef).onDestroy(() => this.editor?.dispose());
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
