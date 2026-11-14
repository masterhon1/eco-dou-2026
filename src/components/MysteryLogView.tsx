import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Clock,
  Copy,
  Download,
  FileText,
  Flame,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import {
  formatCountdown,
  formatLogAsCsv,
  formatLogAsPlainText,
  ResolvedMysteryBoxStatus,
} from '../game/mysteryBox';
import { MysteryBoxLogEntry } from '../game/types';

interface MysteryLogViewProps {
  entries: MysteryBoxLogEntry[];
  status: ResolvedMysteryBoxStatus;
  onBackHome: () => void;
  onClearLog: () => void;
}

type LogFilter = 'all' | 'OPENED' | 'easier' | 'harder' | 'resets';

function triggerDownload(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export const MysteryLogView: React.FC<MysteryLogViewProps> = ({
  entries,
  status,
  onBackHome,
  onClearLog,
}) => {
  const [filter, setFilter] = useState<LogFilter>('all');
  const [query, setQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const stats = useMemo(() => {
    const opened = entries.filter((e) => e.eventType === 'OPENED');
    const easierCount = opened.filter((e) => e.polarity === 'easier').length;
    const harderCount = opened.filter((e) => e.polarity === 'harder').length;
    const resetsCount = entries.filter((e) => e.eventType === 'DAILY_RESET').length;
    return {
      totalOpened: opened.length,
      easierCount,
      harderCount,
      resetsCount,
    };
  }, [entries]);

  const filteredEntries = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (filter === 'OPENED' && e.eventType !== 'OPENED') return false;
      if (filter === 'easier' && e.polarity !== 'easier') return false;
      if (filter === 'harder' && e.polarity !== 'harder') return false;
      if (filter === 'resets' && e.eventType !== 'DAILY_RESET' && e.eventType !== 'EXPIRED') {
        return false;
      }
      if (!q) return true;
      return (
        e.modifierName.toLowerCase().includes(q) ||
        e.dayKey.toLowerCase().includes(q) ||
        e.summary.toLowerCase().includes(q) ||
        e.eventType.toLowerCase().includes(q)
      );
    });
  }, [entries, filter, query]);

  const handleCopyLog = async () => {
    try {
      await navigator.clipboard.writeText(formatLogAsPlainText(filteredEntries));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: ignore clipboard error if denied
    }
  };

  const todaySlug = status.currentDayKey;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 min-h-[68px] py-2 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onBackHome}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <ArrowLeft className="w-4 h-4 shrink-0" />
              <span>Preview Home</span>
            </button>
            <div className="min-w-0">
              <h1 className="font-display text-lg sm:text-xl font-bold text-white truncate">
                External Mystery Box Log
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() =>
                triggerDownload(
                  `ecosplit-mystery-log-${todaySlug}.log`,
                  formatLogAsPlainText(filteredEntries),
                  'text/plain;charset=utf-8'
                )
              }
              className="min-h-[44px] px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Download className="w-4 h-4 shrink-0" />
              <span>Export .LOG</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Intro + Current Live Status */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-slate-400">
              Audit History · 3-Hour Effect Windows · Daily Midnight Resets
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">
              Mystery Box Activity Ledger
            </h2>
            <p className="text-sm sm:text-base text-slate-300 max-w-2xl">
              Every daily Mystery Box roll, 3-hour expiration, and daily reset is permanently
              tracked here and can be exported as an external .LOG, .CSV, or .JSON file.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                triggerDownload(
                  `ecosplit-mystery-log-${todaySlug}.csv`,
                  formatLogAsCsv(filteredEntries),
                  'text/csv;charset=utf-8'
                )
              }
              className="min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-100 text-sm font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Download className="w-4 h-4 text-emerald-300 shrink-0" />
              <span>Export .CSV</span>
            </button>

            <button
              type="button"
              onClick={() =>
                triggerDownload(
                  `ecosplit-mystery-log-${todaySlug}.json`,
                  JSON.stringify(filteredEntries, null, 2),
                  'application/json;charset=utf-8'
                )
              }
              className="min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-100 text-sm font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Download className="w-4 h-4 text-amber-300 shrink-0" />
              <span>Export .JSON</span>
            </button>

            <button
              type="button"
              onClick={handleCopyLog}
              className="min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-100 text-sm font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-emerald-300">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-300 shrink-0" />
                  <span>Copy Log</span>
                </>
              )}
            </button>
          </div>
        </section>

        {/* 4-Column KPI Summary Strip */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-1">
            <div className="text-xs font-medium text-slate-400">Boxes Opened</div>
            <div className="font-mono-tabular text-2xl font-bold text-white">
              {stats.totalOpened}
            </div>
            <div className="text-xs text-slate-300">{stats.resetsCount} daily resets logged</div>
          </div>

          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-1">
            <div className="text-xs font-medium text-slate-400">Easier vs Harder</div>
            <div className="font-mono-tabular text-2xl font-bold text-white">
              <span className="text-emerald-300">{stats.easierCount}</span>
              <span className="text-slate-600 mx-1.5">/</span>
              <span className="text-amber-300">{stats.harderCount}</span>
            </div>
            <div className="text-xs text-slate-300">Blessings vs Challenges</div>
          </div>

          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-1">
            <div className="text-xs font-medium text-slate-400">Active 3h Window</div>
            <div className="font-mono-tabular text-2xl font-bold text-sky-300">
              {status.phase === 'ACTIVE'
                ? formatCountdown(status.activeRemainingMs)
                : 'Inactive'}
            </div>
            <div className="text-xs text-slate-300 truncate">
              {status.phase === 'ACTIVE' && status.activeModifier
                ? status.activeModifier.name
                : status.phase === 'READY'
                ? 'Box ready on Preview Home'
                : 'Waiting for tomorrow'}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-1">
            <div className="text-xs font-medium text-slate-400">Next Daily Reset</div>
            <div className="font-mono-tabular text-2xl font-bold text-white">
              {formatCountdown(status.resetRemainingMs)}
            </div>
            <div className="text-xs text-slate-300">Resets at 12:00 AM local</div>
          </div>
        </section>

        {/* Filter & Search Toolbar */}
        <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800">
            {(
              [
                { id: 'all', label: 'All Events' },
                { id: 'OPENED', label: 'Opened' },
                { id: 'easier', label: 'Easier' },
                { id: 'harder', label: 'Harder' },
                { id: 'resets', label: 'Expirations & Resets' },
              ] as const
            ).map((tab) => {
              const active = filter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilter(tab.id)}
                  className={`min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-sky-600 text-white'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search modifier or date..."
                aria-label="Search mystery box log"
                className="w-full min-h-[44px] pl-9 pr-3 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-sky-400"
              />
            </div>

            {entries.length > 0 && !confirmClear && (
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                className="min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-red-950/60 border border-slate-700 hover:border-red-500/70 text-slate-200 hover:text-red-200 text-sm font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Trash2 className="w-4 h-4 shrink-0" />
                <span>Clear Log</span>
              </button>
            )}

            {confirmClear && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    onClearLog();
                    setConfirmClear(false);
                  }}
                  className="min-h-[44px] px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-bold cursor-pointer whitespace-nowrap shrink-0"
                >
                  Confirm Clear
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  className="min-h-[44px] px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold cursor-pointer whitespace-nowrap shrink-0"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </section>

        {/* External Log Table */}
        <section className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
          {filteredEntries.length === 0 ? (
            <div className="p-10 text-center space-y-3">
              <FileText className="w-10 h-10 text-slate-500 mx-auto" />
              <h3 className="font-display text-lg font-bold text-white">
                {entries.length === 0
                  ? 'No Mystery Box Events Recorded Yet'
                  : 'No Matching Log Entries'}
              </h3>
              <p className="text-sm text-slate-300 max-w-md mx-auto">
                {entries.length === 0
                  ? 'Open your Daily Mystery Box from the Preview Home to start tracking 3-hour modifiers and daily resets.'
                  : 'Try clearing your search or selecting All Events to see full history.'}
              </p>
              {entries.length === 0 && (
                <button
                  type="button"
                  onClick={onBackHome}
                  className="mt-2 min-h-[46px] px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-bold cursor-pointer"
                >
                  Go to Preview Home
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-xs font-semibold text-slate-400">
                    <th className="py-3.5 px-4 whitespace-nowrap">Timestamp</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Day</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Event</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Modifier</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Impact</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Window</th>
                    <th className="py-3.5 px-4">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-sm">
                  {filteredEntries.map((entry) => {
                    const ts = new Date(entry.timestamp);
                    const formattedTime = ts.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    });
                    const isCurrentlyActive =
                      entry.eventType === 'OPENED' &&
                      entry.expiresAt !== null &&
                      Date.now() < entry.expiresAt;

                    return (
                      <tr
                        key={entry.id}
                        className="hover:bg-slate-800/40 transition-colors align-top"
                      >
                        <td className="py-3.5 px-4 font-mono-tabular text-xs text-slate-300 whitespace-nowrap">
                          {formattedTime}
                        </td>
                        <td className="py-3.5 px-4 font-mono-tabular text-xs text-slate-300 whitespace-nowrap">
                          {entry.dayKey}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                            {entry.eventType === 'OPENED' && (
                              <Clock className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                            )}
                            {entry.eventType === 'EXPIRED' && (
                              <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            )}
                            {entry.eventType === 'DAILY_RESET' && (
                              <RotateCcw className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            )}
                            <span>
                              {entry.eventType === 'OPENED'
                                ? 'Box Opened'
                                : entry.eventType === 'EXPIRED'
                                ? '3h Expired'
                                : 'Daily Reset'}
                            </span>
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-white whitespace-nowrap">
                          {entry.modifierName}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {entry.polarity === 'easier' ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-300">
                              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                              <span>Makes Easier</span>
                            </span>
                          ) : entry.polarity === 'harder' ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-300">
                              <Flame className="w-3.5 h-3.5 shrink-0" />
                              <span>Makes Harder</span>
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">System Reset</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono-tabular text-xs whitespace-nowrap">
                          {entry.durationHours > 0 ? (
                            <span
                              className={
                                isCurrentlyActive
                                  ? 'text-sky-300 font-semibold'
                                  : 'text-slate-300'
                              }
                            >
                              {isCurrentlyActive ? '3h Active Now' : '3h 00m'}
                            </span>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-200 min-w-[240px]">
                          {entry.summary}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};
