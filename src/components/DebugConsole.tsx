import React, { useState, useEffect, useRef } from 'react';
import { LogEntry, LogLevel, subscribeToLogs, clearLogs } from '../services/debugLogger';
import { Terminal, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

type FilterLevel = LogLevel | 'all';

const LEVEL_TEXT: Record<LogLevel, string> = {
  info: 'text-slate-300',
  warn: 'text-yellow-400',
  error: 'text-red-400',
};

const LEVEL_ROW_BG: Record<LogLevel, string> = {
  info: '',
  warn: 'bg-yellow-900/20',
  error: 'bg-red-900/20',
};

const LEVEL_BADGE: Record<LogLevel, string> = {
  info: 'bg-slate-700 text-slate-300',
  warn: 'bg-yellow-500/20 text-yellow-400',
  error: 'bg-red-500/20 text-red-400',
};

export default function DebugConsole() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<FilterLevel>('all');
  const [isMinimized, setIsMinimized] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return subscribeToLogs(setLogs);
  }, []);

  // Auto-scroll to bottom when new logs arrive (only when not minimized)
  useEffect(() => {
    if (!isMinimized) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isMinimized]);

  const filteredLogs = filter === 'all' ? logs : logs.filter(l => l.level === filter);

  const warnCount = logs.filter(l => l.level === 'warn').length;
  const errorCount = logs.filter(l => l.level === 'error').length;

  const filters: FilterLevel[] = ['all', 'info', 'warn', 'error'];

  return (
    <div
      className="fixed bottom-0 right-0 z-50 w-[420px] flex flex-col shadow-2xl border-t border-l border-slate-700 bg-slate-900 rounded-tl-xl"
      style={{ maxHeight: isMinimized ? 'auto' : '380px' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-800 rounded-tl-xl border-b border-slate-700 shrink-0">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-indigo-400" />
          <span className="text-sm font-mono font-bold text-slate-200">Debug Console</span>
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
          <div className="flex items-center gap-1 px-2 py-1.5 bg-slate-800/80 border-b border-slate-700 shrink-0">
            {filters.map(level => (
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
            <span className="ml-auto text-xs text-slate-500 font-mono">
              {filteredLogs.length} entries
            </span>
          </div>

          {/* Log list */}
          <div className="flex-1 overflow-y-auto font-mono text-xs">
            {filteredLogs.length === 0 ? (
              <p className="text-center text-slate-500 py-6">No logs yet.</p>
            ) : (
              filteredLogs.map(entry => (
                <div
                  key={entry.id}
                  className={`flex gap-2 px-2 py-1 border-b border-slate-800/50 ${LEVEL_ROW_BG[entry.level]}`}
                >
                  <span className="text-slate-600 shrink-0 select-none">
                    {entry.timestamp.toLocaleTimeString()}
                  </span>
                  <span className={`shrink-0 uppercase text-[10px] font-bold px-1 rounded self-start mt-0.5 ${LEVEL_BADGE[entry.level]}`}>
                    {entry.level}
                  </span>
                  <span className={`${LEVEL_TEXT[entry.level]} break-all whitespace-pre-wrap`}>
                    {entry.message}
                  </span>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>
        </>
      )}
    </div>
  );
}
