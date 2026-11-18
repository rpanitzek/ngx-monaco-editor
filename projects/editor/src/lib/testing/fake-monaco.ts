import { vi } from 'vitest';

type Listener<T> = (event: T) => void;

class Emitter<T> {
  private readonly listeners = new Set<Listener<T>>();

  readonly event = (listener: Listener<T>) => {
    this.listeners.add(listener);
    return { dispose: () => this.listeners.delete(listener) };
  };

  get listenerCount(): number {
    return this.listeners.size;
  }

  fire(event: T): void {
    for (const listener of [...this.listeners]) {
      listener(event);
    }
  }
}

export class FakeUri {
  constructor(private readonly value: string) {}

  toString(): string {
    return this.value;
  }
}

let modelCount = 0;

export class FakeTextModel {
  readonly uri: FakeUri;
  readonly contentChanged = new Emitter<void>();
  disposed = false;

  constructor(
    private value: string,
    private languageId = 'plaintext',
    uri?: FakeUri
  ) {
    this.uri = uri ?? new FakeUri(`inmemory://model/${++modelCount}`);
  }

  getValue(): string {
    return this.value;
  }

  setValue(value: string): void {
    if (this.disposed) {
      throw new Error('Model is disposed!');
    }
    this.value = value;
    this.contentChanged.fire();
  }

  getLanguageId(): string {
    return this.languageId;
  }

  setLanguageId(languageId: string): void {
    this.languageId = languageId;
  }

  dispose(): void {
    this.disposed = true;
  }
}

export class FakeCodeEditor {
  options: Record<string, any>;
  disposed = false;
  readonly layout = vi.fn();
  readonly focus = vi.fn();

  private model: FakeTextModel | null = null;
  private modelListener: { dispose(): void } | undefined;
  private readonly ownsModel: boolean;
  private readonly contentChanged = new Emitter<void>();
  private readonly blurred = new Emitter<void>();
  private readonly modelChanged = new Emitter<void>();
  private readonly disposedEmitter = new Emitter<void>();

  readonly onDidChangeModelContent = this.contentChanged.event;
  readonly onDidBlurEditorWidget = this.blurred.event;
  readonly onDidChangeModel = this.modelChanged.event;
  readonly onDidDispose = this.disposedEmitter.event;

  constructor(options: Record<string, any>, createModel: (value: string, language?: string) => FakeTextModel) {
    const { model, value, ...rest } = options;
    this.options = rest;
    // Like Monaco: without a model, the editor creates (and owns) one from `value` and `language`.
    this.ownsModel = model === undefined;
    this.attach(model ?? createModel(value ?? '', options['language']));
  }

  getModel(): FakeTextModel | null {
    return this.model;
  }

  setModel(model: FakeTextModel | null): void {
    this.attach(model);
    this.modelChanged.fire();
  }

  getValue(): string {
    return this.model?.getValue() ?? '';
  }

  setValue(value: string): void {
    this.model?.setValue(value);
  }

  updateOptions(options: Record<string, any>): void {
    this.options = { ...this.options, ...options };
  }

  /** Simulates the user replacing the content. */
  type(text: string): void {
    this.setValue(text);
  }

  /** Simulates the editor losing focus. */
  blur(): void {
    this.blurred.fire();
  }

  dispose(): void {
    this.disposed = true;
    this.modelListener?.dispose();
    if (this.ownsModel) {
      this.model?.dispose();
    }
    this.disposedEmitter.fire();
  }

  private attach(model: FakeTextModel | null): void {
    this.modelListener?.dispose();
    this.model = model;
    this.modelListener = model?.contentChanged.event(() => this.contentChanged.fire());
  }
}

export class FakeDiffEditor {
  options: Record<string, any>;
  model: { original: FakeTextModel; modified: FakeTextModel } | null = null;
  disposed = false;
  readonly layout = vi.fn();

  constructor(options: Record<string, any>) {
    this.options = { ...options };
  }

  setModel(model: { original: FakeTextModel; modified: FakeTextModel } | null): void {
    this.model = model;
  }

  getModel(): { original: FakeTextModel; modified: FakeTextModel } | null {
    return this.model;
  }

  updateOptions(options: Record<string, any>): void {
    this.options = { ...this.options, ...options };
  }

  dispose(): void {
    this.disposed = true;
  }
}

interface FakeMarker {
  severity: number;
  message: string;
  startLineNumber: number;
  startColumn: number;
}

/** Installs a fake `window.monaco`, so the loader resolves at once and the components create fake editors. */
export function installFakeMonaco() {
  const models: FakeTextModel[] = [];
  const markers = new Map<string, FakeMarker[]>();
  const markersChanged = new Emitter<FakeUri[]>();
  const editors: FakeCodeEditor[] = [];
  const diffEditors: FakeDiffEditor[] = [];

  const createModel = vi.fn((value: string, language?: string, uri?: FakeUri) => {
    const model = new FakeTextModel(value, language ?? 'plaintext', uri);
    models.push(model);
    return model;
  });

  const fake = {
    editors,
    diffEditors,
    Uri: { parse: (value: string) => new FakeUri(value) },
    editor: {
      create: vi.fn((_container: HTMLElement, options: Record<string, any>) => {
        const codeEditor = new FakeCodeEditor(options, createModel);
        editors.push(codeEditor);
        return codeEditor;
      }),
      createDiffEditor: vi.fn((_container: HTMLElement, options: Record<string, any>) => {
        const diffEditor = new FakeDiffEditor(options);
        diffEditors.push(diffEditor);
        return diffEditor;
      }),
      createModel,
      getModel: (uri: FakeUri) => models.find(model => !model.disposed && model.uri.toString() === uri.toString()) ?? null,
      setModelLanguage: vi.fn((model: FakeTextModel, languageId: string) => model.setLanguageId(languageId)),
      getModelMarkers: ({ resource }: { resource: FakeUri }) => markers.get(resource.toString()) ?? [],
      onDidChangeMarkers: markersChanged.event,
    },
    /** Sets the markers of a model and fires `onDidChangeMarkers`, like a language worker would. */
    setMarkers(model: FakeTextModel, list: FakeMarker[]): void {
      markers.set(model.uri.toString(), list);
      markersChanged.fire([model.uri]);
    },
    get markerListenerCount(): number {
      return markersChanged.listenerCount;
    },
  };

  (window as any).monaco = fake;
  // jsdom has no ResizeObserver.
  (globalThis as any).ResizeObserver ??= class {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  };
  return fake;
}

export type FakeMonaco = ReturnType<typeof installFakeMonaco>;

/** Waits for pending promise callbacks, such as the editor creation after Monaco has "loaded". */
export const flush = () => new Promise(resolve => setTimeout(resolve));
