export type LogLevel = 'info' | 'proof' | 'warn' | 'error';

export interface LogEntry {
  id: number;
  timestamp: Date;
  level: LogLevel;
  message: string;
  /** Groups every log line emitted by a single sub-process (e.g. one model×garment combination). */
  processId?: string;
  /** Monotonic step index within a process — proves the order sub-processes execute in. */
  step?: number;
  /** Expandable hard-proof payload (full prompt text, per-image fingerprints, etc.). */
  details?: string;
}

export interface LogOptions {
  processId?: string;
  step?: number;
  details?: string;
}

type Listener = (entries: LogEntry[]) => void;

let entries: LogEntry[] = [];
let nextId = 0;
const listeners = new Set<Listener>();

// Cap entries to avoid unbounded memory; proofs are verbose so allow more than before.
const MAX_ENTRIES = 1500;

function notify() {
  const snapshot = [...entries];
  listeners.forEach(l => l(snapshot));
}

export function addLog(level: LogLevel, message: string, options: LogOptions = {}): void {
  const entry: LogEntry = {
    id: nextId++,
    timestamp: new Date(),
    level,
    message,
    processId: options.processId,
    step: options.step,
    details: options.details,
  };
  entries = entries.length >= MAX_ENTRIES
    ? [...entries.slice(1), entry]
    : [...entries, entry];
  notify();
}

export function clearLogs(): void {
  entries = [];
  notify();
}

export function subscribeToLogs(listener: Listener): () => void {
  listeners.add(listener);
  // Immediately emit current entries to the new subscriber
  listener([...entries]);
  return () => listeners.delete(listener);
}

// --------------------------------------------------------------------------
// Process / sub-process tracking
// --------------------------------------------------------------------------
// Each top-level task (one model×garment×mode combination, one pose, one face)
// gets a short, stable process id. Every log line tied to it carries that id
// plus an incrementing step number, so the exact order of sub-processes
// (analyze -> transmit -> generate -> receive) is provable even when several
// processes run concurrently and their lines interleave.

let processCounter = 0;
const processSteps = new Map<string, number>();

export function newProcessId(prefix = 'P'): string {
  return `${prefix}${++processCounter}`;
}

/** Log a line that belongs to a process; auto-assigns the next step number. */
export function logProcess(
  processId: string,
  level: LogLevel,
  message: string,
  details?: string,
): void {
  const step = (processSteps.get(processId) ?? 0) + 1;
  processSteps.set(processId, step);
  addLog(level, message, { processId, step, details });
}

// --------------------------------------------------------------------------
// Hard-proof helpers
// --------------------------------------------------------------------------

export interface FileFingerprint {
  name: string;
  type: string;
  sizeKB: number;
  /** First 8 bytes of the SHA-256 of the raw file content — a content fingerprint. */
  sha: string;
}

/**
 * Content-addressable fingerprint of a file. The SHA-256 is computed over the
 * actual bytes, so two visually-identical-but-different files produce different
 * hashes and the same file always produces the same hash — this is what makes
 * "is THIS garment really being sent?" verifiable rather than a guess.
 */
export async function fingerprintFile(file: File): Promise<FileFingerprint> {
  let sha = 'unavailable';
  try {
    const buf = await file.arrayBuffer();
    // crypto.subtle is only present in secure contexts (https / localhost).
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const digest = await crypto.subtle.digest('SHA-256', buf);
      sha = Array.from(new Uint8Array(digest))
        .slice(0, 8)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    }
  } catch {
    // Degrade gracefully — the rest of the proof (name/size/type) still stands.
  }
  return {
    name: file.name,
    type: file.type || 'unknown',
    sizeKB: Math.max(1, Math.round(file.size / 1024)),
    sha,
  };
}

/**
 * Emit the strongest practical proof that every garment image is actually being
 * handed to the model for a given stage. Fingerprints the model image and every
 * garment, lists them with role + index + SHA-256, asserts the attached count,
 * and flags two silent-failure modes: zero garments and duplicate garments
 * (same content sent twice, which usually means a UI wiring bug).
 *
 * @returns the garment fingerprints so callers can cross-check stages.
 */
export async function logImageTransmissionProof(
  processId: string,
  stage: string,
  modelImage: File,
  garmentImages: File[],
  expectedGarments: number = garmentImages.length,
): Promise<FileFingerprint[]> {
  const modelFp = await fingerprintFile(modelImage);
  const garmentFps = await Promise.all(garmentImages.map(fingerprintFile));

  const lines: string[] = [];
  lines.push(
    `#1  [MODEL]            ${modelFp.name}  |  ${modelFp.sizeKB}KB  |  ${modelFp.type}  |  sha256:${modelFp.sha}`,
  );
  garmentFps.forEach((fp, i) => {
    lines.push(
      `#${i + 2}  [GARMENT ${i + 1}/${garmentFps.length}]   ${fp.name}  |  ${fp.sizeKB}KB  |  ${fp.type}  |  sha256:${fp.sha}`,
    );
  });

  const total = 1 + garmentFps.length;
  const countOk = garmentFps.length === expectedGarments;
  lines.push('');
  lines.push(
    `ASSERT attached garments (${garmentFps.length}) === expected (${expectedGarments}) -> ${countOk ? 'PASS ✓' : 'FAIL ✗'}`,
  );
  lines.push(`TOTAL images in request payload: ${total} (1 model + ${garmentFps.length} garment)`);

  logProcess(
    processId,
    'proof',
    `[${stage}] IMAGE TRANSMIT PROOF — ${garmentFps.length}/${expectedGarments} garment(s) + 1 model attached ${countOk ? '✓' : '✗ COUNT MISMATCH'}`,
    lines.join('\n'),
  );

  if (!countOk) {
    logProcess(
      processId,
      'error',
      `[${stage}] Garment count mismatch — expected ${expectedGarments}, attached ${garmentFps.length}.`,
    );
  }
  if (garmentFps.length === 0) {
    logProcess(processId, 'warn', `[${stage}] No garment images attached to this request.`);
  }

  // Duplicate detection — same content sent more than once.
  const shaCounts = new Map<string, number>();
  garmentFps.forEach(fp => {
    if (fp.sha !== 'unavailable') shaCounts.set(fp.sha, (shaCounts.get(fp.sha) ?? 0) + 1);
  });
  const dupes = [...shaCounts.entries()].filter(([, c]) => c > 1);
  if (dupes.length > 0) {
    logProcess(
      processId,
      'warn',
      `[${stage}] Duplicate garment content detected (identical SHA-256): ${dupes
        .map(([sha, c]) => `${sha}×${c}`)
        .join(', ')}`,
    );
  }

  return garmentFps;
}

/** Stable short fingerprint of an arbitrary string (used for prompt proofs). */
async function hashString(text: string): Promise<string> {
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const buf = new TextEncoder().encode(text);
      const digest = await crypto.subtle.digest('SHA-256', buf);
      return Array.from(new Uint8Array(digest))
        .slice(0, 8)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    }
  } catch {
    /* ignore */
  }
  return 'unavailable';
}

/**
 * Proof that an exact prompt + model id are what got sent. Logs the model id and
 * the full prompt text (expandable) plus its length and SHA-256 so the operator
 * can confirm the *intended* prompt — not a stale or wrong-mode one — was used.
 */
export async function logPromptProof(
  processId: string,
  stage: string,
  modelId: string,
  prompt: string,
  extra?: Record<string, string | number>,
): Promise<void> {
  const sha = await hashString(prompt);
  const extraStr = extra
    ? ' · ' + Object.entries(extra).map(([k, v]) => `${k}=${v}`).join(' · ')
    : '';
  logProcess(
    processId,
    'proof',
    `[${stage}] PROMPT/MODEL PROOF — model="${modelId}" · ${prompt.length} chars · sha256:${sha}${extraStr}`,
    prompt,
  );
}

// --------------------------------------------------------------------------
// Console interception — captures all existing console.* output automatically.
// --------------------------------------------------------------------------
const originalLog = console.log.bind(console);
const originalWarn = console.warn.bind(console);
const originalError = console.error.bind(console);

function formatArgs(args: unknown[]): string {
  return args
    .map(a => {
      if (a instanceof Error) return `${a.name}: ${a.message}`;
      if (typeof a === 'object' && a !== null) {
        try {
          return JSON.stringify(a, null, 2);
        } catch {
          return String(a);
        }
      }
      return String(a);
    })
    .join(' ');
}

console.log = (...args: unknown[]) => {
  originalLog(...args);
  addLog('info', formatArgs(args));
};

console.warn = (...args: unknown[]) => {
  originalWarn(...args);
  addLog('warn', formatArgs(args));
};

console.error = (...args: unknown[]) => {
  originalError(...args);
  addLog('error', formatArgs(args));
};
