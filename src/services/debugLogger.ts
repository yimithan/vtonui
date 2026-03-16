export type LogLevel = 'info' | 'warn' | 'error';

export interface LogEntry {
  id: number;
  timestamp: Date;
  level: LogLevel;
  message: string;
}

type Listener = (entries: LogEntry[]) => void;

let entries: LogEntry[] = [];
let nextId = 0;
const listeners = new Set<Listener>();

function notify() {
  const snapshot = [...entries];
  listeners.forEach(l => l(snapshot));
}

export function addLog(level: LogLevel, message: string): void {
  const entry: LogEntry = {
    id: nextId++,
    timestamp: new Date(),
    level,
    message,
  };
  // Cap at 500 entries to prevent memory issues
  entries = entries.length >= 500
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

// Intercept console methods so all existing logs are captured automatically
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
