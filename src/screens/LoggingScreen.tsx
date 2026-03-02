import { useState, useMemo, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import { ArrowLeft, ArrowRight, CheckCircle2, ClipboardList, Pencil, Plus, AlertTriangle } from 'lucide-react';
import { useApp } from '../AppContext';
import { FridgeIllustration, ColdVapor } from '../components/visuals';
import { AddUnitModal, EditUnitModal, CorrectiveActionModal } from '../modals';
import { ACCENT } from '../types';

export function LoggingScreen() {
  const { units, records, recorder, getTemp, setTemp, getTempStatus, setScreen } = useApp();

  const [selectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [idx, setIdx] = useState(0);
  const [slideDir, setSlideDir] = useState<'right' | 'left'>('right');
  const [cardKey, setCardKey] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [caModal, setCaModal] = useState<{ unitId: string; date: string } | null>(null);

  const safeIdx = Math.min(idx, Math.max(units.length - 1, 0));
  const unit = units[safeIdx];

  const dailyProgress = useMemo(() =>
    units.filter(u => { const t = records.find(r => r.unitId === u.id && r.date === selectedDate)?.temperature; return t !== undefined && t !== ''; }).length,
  [units, records, selectedDate]);

  const goNext = useCallback(() => {
    if (!unit) return;
    const temp = getTemp(unit.id, selectedDate);
    const status = getTempStatus(unit, temp);
    if (status === 'warn' && temp) {
      setCaModal({ unitId: unit.id, date: selectedDate });
      return;
    }
    setSlideDir('right');
    if (safeIdx < units.length - 1) setIdx(safeIdx + 1);
    else setScreen('complete');
    setCardKey(k => k + 1);
  }, [unit, safeIdx, units.length, getTemp, getTempStatus, selectedDate, setScreen]);

  const advanceAfterCa = useCallback(() => {
    setCaModal(null);
    setSlideDir('right');
    if (safeIdx < units.length - 1) setIdx(safeIdx + 1);
    else setScreen('complete');
    setCardKey(k => k + 1);
  }, [safeIdx, units.length, setScreen]);

  const goPrev = () => { setSlideDir('left'); if (safeIdx > 0) { setIdx(safeIdx - 1); setCardKey(k => k + 1); } };
  const jumpTo = (i: number) => { setSlideDir(i > safeIdx ? 'right' : 'left'); setIdx(i); setCardKey(k => k + 1); };

  const slideClass = slideDir === 'right' ? 'animate-slide-right' : 'animate-slide-left';

  return (
    <div className="relative z-10 min-h-screen px-4 py-5">
      <div className="max-w-lg mx-auto">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-4 animate-fade-in-down">
          <button onClick={() => setScreen('home')} className="p-2 rounded-xl tc-muted hover:tc-primary hover:bg-black/5 transition-all active:scale-95" title="Home"><ArrowLeft size={22} /></button>
          <div className="text-center">
            <p className="font-bold text-sm tc-heading">{format(parseISO(selectedDate), 'EEEE')}</p>
            <p className="text-xs tc-muted">{format(parseISO(selectedDate), 'd MMMM yyyy')}</p>
          </div>
          <div className="text-xs font-bold px-3 py-1 rounded-full glass tc-muted">{recorder}</div>
        </div>

        {/* Progress */}
        <div className="glass-strong rounded-2xl p-4 mb-4 animate-fade-in-up">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold" style={{ color: ACCENT }}>Progress</span>
            <span className="text-xs font-bold tc-secondary">{dailyProgress} of {units.length}</span>
          </div>
          <div className="w-full rounded-full h-2.5 overflow-hidden bg-progress-track">
            <div className="h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${(dailyProgress / Math.max(units.length, 1)) * 100}%`, background: dailyProgress === units.length ? '#34d399' : `linear-gradient(90deg, #6366f1, #a78bfa)` }} />
          </div>
          {units.length > 1 && (
            <div className="flex justify-center gap-1.5 mt-3">
              {units.map((u, i) => (
                <button key={u.id} onClick={() => jumpTo(i)} title={u.name} className="rounded-full transition-all duration-300"
                  style={{ width: i === safeIdx ? 20 : 8, height: 8, background: i === safeIdx ? ACCENT : getTemp(u.id, selectedDate) ? '#34d399' : 'var(--dot-inactive)', borderRadius: i === safeIdx ? 4 : 999 }} />
              ))}
            </div>
          )}
        </div>

        {/* Card */}
        {units.length === 0 ? (
          <div className="glass-strong rounded-2xl p-10 text-center animate-scale-in">
            <FridgeIllustration size={80} className="mx-auto mb-4 opacity-50" />
            <p className="font-medium tc-muted">No units added yet</p>
            <button onClick={() => setShowAdd(true)} className="mt-3 btn-accent px-5 py-2.5 rounded-xl text-sm font-bold"><Plus size={16} className="inline mr-1.5" /> Add First Unit</button>
          </div>
        ) : (
          <div key={`card-${cardKey}`} className={slideClass}>
            <div className="glass-strong rounded-2xl overflow-hidden">
              <div className="relative p-5 pb-3 flex items-center gap-4 bg-card-header">
                <div className="animate-float-slow shrink-0"><FridgeIllustration size={65} /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold uppercase tracking-widest tc-muted">Unit {safeIdx + 1} of {units.length}</p>
                  <h3 className="text-2xl font-bold truncate tc-heading">{unit?.name}</h3>
                  <p className="text-xs font-semibold tc-muted mt-0.5">Range: {unit?.minTemp}°C to {unit?.maxTemp}°C</p>
                </div>
                <button onClick={() => unit && setEditId(unit.id)} className="p-2 rounded-xl hover:bg-black/5 transition-all active:scale-95 shrink-0 tc-muted hover:tc-primary" title="Edit"><Pencil size={16} /></button>
              </div>
              <div className="px-5 -mt-1"><ColdVapor /></div>

              <div className="p-6 md:p-8 pt-4">
                <label className="block text-xs font-bold uppercase tracking-widest mb-4 text-center tc-muted">Temperature Reading</label>
                <div className="relative max-w-[260px] mx-auto">
                  {(() => {
                    const temp = getTemp(unit?.id || '', selectedDate);
                    const status = unit ? getTempStatus(unit, temp) : 'none';
                    return (
                      <>
                        <input type="number" step="0.1" inputMode="decimal" value={temp}
                          onChange={e => unit && setTemp(unit.id, selectedDate, e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') goNext(); }}
                          className={`w-full text-center text-5xl md:text-6xl font-bold py-5 rounded-2xl outline-none transition-all glass-input ${status === 'warn' ? 'ring-2 ring-amber-400' : ''}`}
                          placeholder="0.0" autoFocus />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-2xl font-bold pointer-events-none tc-muted">°C</span>
                        {status === 'warn' && (
                          <div className="flex items-center justify-center gap-1.5 mt-2 text-amber-500 animate-fade-in">
                            <AlertTriangle size={14} /><span className="text-xs font-bold">Out of safe range!</span>
                          </div>
                        )}
                        {status === 'ok' && (
                          <div className="flex items-center justify-center gap-1.5 mt-2 text-green-500 animate-fade-in">
                            <CheckCircle2 size={14} /><span className="text-xs font-bold">Within range</span>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
                <p className="text-center text-xs mt-3 tc-muted">Enter temp &middot; Press Enter for next</p>
              </div>

              <div className="p-4 pt-0 flex gap-3">
                <button onClick={goPrev} disabled={safeIdx === 0} className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm transition-all active:scale-[0.97] disabled:opacity-25 tc-secondary bg-back-btn"><ArrowLeft size={17} /> Back</button>
                <button onClick={goNext} className="flex-[1.4] flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm text-white transition-all active:scale-[0.97] btn-accent shadow-lg">
                  {safeIdx === units.length - 1 ? <><CheckCircle2 size={17} /> Finish</> : <><span>Next</span> <ArrowRight size={17} /></>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quick overview */}
        {units.length > 0 && (
          <div className="mt-4 glass-strong rounded-2xl p-4 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <span className="flex items-center gap-1.5 text-xs font-bold mb-2" style={{ color: ACCENT }}><ClipboardList size={14} /> Quick View</span>
            <div className="flex flex-wrap gap-1.5">
              {units.map(u => { const t = getTemp(u.id, selectedDate); const s = getTempStatus(u, t); return (
                <span key={u.id} className={`text-xs px-2.5 py-1 rounded-full font-semibold ${s === 'warn' ? 'bg-amber-100 text-amber-700' : ''}`}
                  style={s !== 'warn' ? { background: t ? 'rgba(99,102,241,0.08)' : 'var(--pill-inactive-bg)', color: t ? ACCENT : 'var(--pill-inactive-text)' } : undefined}>
                  {u.name}: {t ? `${t}°C` : '—'}
                </span>
              ); })}
            </div>
          </div>
        )}
      </div>

      {showAdd && <AddUnitModal onClose={() => setShowAdd(false)} />}
      {editId && <EditUnitModal unitId={editId} onClose={() => setEditId(null)} />}
      {caModal && <CorrectiveActionModal unitId={caModal.unitId} date={caModal.date} onClose={advanceAfterCa} />}
    </div>
  );
}
