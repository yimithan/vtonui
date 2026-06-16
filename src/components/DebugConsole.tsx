import React, { useState, useEffect, useRef } from 'react';
import { LogEntry, LogLevel, subscribeToLogs, clearLogs } from '../services/debugLogger';
import { Terminal, Trash2, ChevronDown, ChevronUp, Copy, Check, ChevronRight, Layers, X } from 'lucide-react';

type FilterLevel = LogLevel | 'all';

const LEVEL_TEXT: Record<LogLevel, string> = {
  info: 'text-slate-300',
  proof: 'text-emerald-300',
  warn: 'text-yellow-400',
  error: 'text-red-400',
};

const LEVEL_ROW_BG: Record<LogLevel, string> = {
  info: '',
  proof: 'bg-emerald-900/15',
  warn: 'bg-yellow-900/20',
  error: 'bg-red-900/20',
};

const LEVEL_BADGE: Record<LogLevel, string> = {
  info: 'bg-slate-700 text-slate-300',
  proof: 'bg-emerald-500/20 text-emerald-300',
  warn: 'bg-yellow-500/20 text-yellow-400',
  error: 'bg-red-500/20 text-red-400',
};

const FILTERS: FilterLevel[] = ['all', 'info', 'proof', 'warn', 'error'];

function formatEntryAsText(e: LogEntry): string {
  const time = e.timestamp.toLocaleTimeString();
  const proc = e.processId ? `[${e.processId}${e.step ? `·s${e.step}` : ''}] ` : '';
  const head = `${time} ${e.level.toUpperCase().padEnd(5)} ${proc}${e.message}`;
  if (!e.details) return head;
  const indented = e.details.split('\n').map(l => `    ${l}`).join('\n');
  return `${head}\n${indented}`;
}

export default function DebugConsole() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<FilterLevel>('all');
  const [processFilter, setProcessFilter] = useState<string | null>(null);
  const [grouped, setGrouped] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [copied, setCopied] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return subscribeToLogs(setLogs);
  }, []);

  // Auto-scroll to bottom when new logs arrive (only when not minimized & not grouped).
  useEffect(() => {
    if (!isMinimized && !grouped) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isMinimized, grouped]);

  const filteredLogs = logs.filter(l => {
    if (filter !== 'all' && l.level !== filter) return false;
    if (processFilter && l.processId !== processFilter) return false;
    return true;
  });

  const warnCount = logs.filter(l => l.level === 'warn').length;
  const errorCount = logs.filter(l => l.level === 'error').length;
  const proofCount = logs.filter(l => l.level === 'proof').length;

  const toggleExpand = (id: number) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCopy = async () => {
    const text = filteredLogs.map(formatEntryAsText).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard may be blocked; ignore silently.
    }
  };

  const renderEntry = (entry: LogEntry) => {
    const hasDetails = !!entry.details;
    const isOpen = expanded.has(entry.id);
    return (
      <div
        key={entry.id}
        className={`border-b border-slate-800/50 ${LEVEL_ROW_BG[entry.level]}`}
      >
        <div className="flex gap-2 px-2 py-1">
          <span className="text-slate-600 shrink-0 select-none">
            {entry.timestamp.toLocaleTimeString()}
          </span>
          <span className={`shrink-0 uppercase text-[10px] font-bold px-1 rounded self-start mt-0.5 ${LEVEL_BADGE[entry.level]}`}>
            {entry.level}
          </span>
          {entry.processId && (
            <button
              onClick={() => setProcessFilter(prev => (prev === entry.processId ? null : entry.processId!))}
              title={`Filter to ${entry.processId}`}
              className={`shrink-0 self-start mt-0.5 text-[10px] font-bold px-1 rounded font-mono transition-colors ${
                processFilter === entry.processId
                  ? 'bg-indigo-500 text-white'
                  : 'bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/40'
              }`}
            >
              {entry.processId}{entry.step ? `·s${entry.step}` : ''}
            </button>
          )}
          <span className={`flex-1 ${LEVEL_TEXT[entry.level]} break-all whitespace-pre-wrap`}>
            {entry.message}
          </span>
          {hasDetails && (
            <button
              onClick={() => toggleExpand(entry.id)}
              title={isOpen ? 'Hide proof detail' : 'Show proof detail'}
              className="shrink-0 self-start mt-0.5 text-slate-400 hover:text-slate-200"
            >
              {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
        {hasDetails && isOpen && (
          <pre className="mx-2 mb-2 mt-0 p-2 rounded bg-slate-950/70 border border-slate-700/60 text-[11px] text-slate-300 whitespace-pre-wrap break-all overflow-x-auto">
            {entry.details}
          </pre>
        )}
      </div>
    );
  };

  // Group entries by processId, preserving first-seen order — makes the
  // sub-process execution order of each process easy to follow.
  const renderGrouped = () => {
    const order: string[] = [];
    const groups = new Map<string, LogEntry[]>();
    for (const e of filteredLogs) {
      const key = e.processId ?? '— ungrouped —';
      if (!groups.has(key)) {
        groups.set(key, []);
        order.push(key);
      }
      groups.get(key)!.push(e);
    }
    return order.map(key => (
      <div key={key} className="border-b border-slate-700">
        <div className="sticky top-0 z-10 px-2 py-1 bg-slate-800 text-[11px] font-mono font-bold text-indigo-300 flex items-center justify-between">
          <span>{key}</span>
          <span className="text-slate-500">{groups.get(key)!.length} lines</span>
        </div>
        {groups.get(key)!.map(renderEntry)}
      </div>
    ));
  };

  return (
    <div
      className="fixed bottom-0 right-0 z-50 w-[460px] flex flex-col shadow-2xl border-t border-l border-slate-700 bg-slate-900 rounded-tl-xl"
      style={{ maxHeight: isMinimized ? 'auto' : '440px' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-800 rounded-tl-xl border-b border-slate-700 shrink-0">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-indigo-400" />
          <span className="text-sm font-mono font-bold text-slate-200">Debug Console</span>
          {proofCount > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
              {proofCount} proof
            </span>
          )}
          {errorCount > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">
              {errorCount} err
            </span>
          )}
          {warnCount > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400">
              {warnCount} warn
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setGrouped(g => !g)}
            title={grouped ? 'Show chronological' : 'Group by process'}
            className={`p-1 transition-colors ${grouped ? 'text-indigo-400' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Layers className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleCopy}
            title="Copy visible logs"
            className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={clearLogs}
            title="Clear logs"
            className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsMinimized(prev => !prev)}
            title={isMinimized ? 'Expand' : 'Minimize'}
            className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
          >
            {isMinimized ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Filter bar */}
          <div className="flex items-center gap-1 px-2 py-1.5 bg-slate-800/80 border-b border-slate-700 shrink-0 flex-wrap">
            {FILTERS.map(level => (
              <button
                key={level}
                onClick={() => setFilter(level)}
                className={`text-xs px-2 py-0.5 rounded font-mono transition-colors capitalize ${
                  filter === level
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                }`}
              >
                {level}
              </button>
            ))}
            {processFilter && (
              <button
                onClick={() => setProcessFilter(null)}
                title="Clear process filter"
                className="text-xs px-2 py-0.5 rounded font-mono bg-indigo-500/30 text-indigo-200 hover:bg-indigo-500/50 flex items-center gap-1"
              >
                {processFilter} <X className="w-3 h-3" />
              </button>
            )}
            <span className="ml-auto text-xs text-slate-500 font-mono">
              {filteredLogs.length} entries
            </span>
          </div>

          {/* Log list */}
          <div className="flex-1 overflow-y-auto font-mono text-xs">
            {filteredLogs.length === 0 ? (
              <p className="text-center text-slate-500 py-6">No logs yet.</p>
            ) : grouped ? (
              renderGrouped()
            ) : (
              <>
                {filteredLogs.map(renderEntry)}
                <div ref={bottomRef} />
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
