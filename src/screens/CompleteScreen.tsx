import { useState, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import { CheckCircle2, StickyNote, AlertTriangle } from 'lucide-react';
import { useApp } from '../AppContext';
import { SuccessCheck, CelebrationOverlay } from '../components/visuals';
import { ACCENT } from '../types';

export function CompleteScreen() {
  const { units, getTemp, getTempStatus, getCorrectiveAction, recorder, setScreen } = useApp();

  const selectedDate = format(new Date(), 'yyyy-MM-dd');
  const [submitted, setSubmitted] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [completeNote, setCompleteNote] = useState('');
  const { setNoteText } = useApp();

  const handleSubmit = () => {
    if (completeNote.trim()) setNoteText(selectedDate, completeNote);
    setSubmitted(true);
    setShowCelebration(true);
  };
  const hideCelebration = useCallback(() => setShowCelebration(false), []);

  const outOfRangeCount = units.filter(u => getTempStatus(u, getTemp(u.id, selectedDate)) === 'warn').length;

  if (submitted) {
    return (
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-8">
        {showCelebration && <CelebrationOverlay onDone={hideCelebration} />}
        <div className="w-full max-w-md text-center animate-scale-in">
          <div className="animate-pop-in mb-4" style={{ animationDelay: '0.2s' }}>
            <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center glass"><CheckCircle2 size={40} style={{ color: ACCENT }} /></div>
          </div>
          <h2 className="text-3xl font-bold mb-2 animate-fade-in-up tc-heading" style={{ animationDelay: '0.4s' }}>All Done!</h2>
          <p className="text-sm mb-8 animate-fade-in-up tc-muted" style={{ animationDelay: '0.5s' }}>Log saved for {format(parseISO(selectedDate), 'EEEE, d MMM')} by {recorder}</p>
          <div className="flex flex-col gap-3 animate-fade-in-up" style={{ animationDelay: '0.65s' }}>
            <button onClick={() => setScreen('logging')} className="w-full py-3.5 rounded-2xl font-bold text-sm btn-accent shadow-lg">Log Another Day</button>
            <button onClick={() => setScreen('records')} className="w-full py-3.5 rounded-2xl font-bold text-sm glass tc-secondary hover:bg-black/3 transition-all">View Records</button>
            <button onClick={() => setScreen('home')} className="text-sm font-semibold transition-colors mt-2 tc-muted">Back to Home</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-md animate-scale-in">
        <div className="text-center mb-6">
          <div className="animate-pop-in mb-4"><SuccessCheck size={90} /></div>
          <h2 className="text-2xl font-bold animate-fade-in-up tc-heading" style={{ animationDelay: '0.5s' }}>All Temperatures Recorded!</h2>
          <p className="text-sm mt-1 animate-fade-in-up tc-muted" style={{ animationDelay: '0.6s' }}>
            {format(parseISO(selectedDate), 'EEEE, d MMMM yyyy')} &middot; {recorder}
          </p>
          {outOfRangeCount > 0 && (
            <div className="mt-2 flex items-center justify-center gap-1.5 text-amber-500 animate-fade-in-up" style={{ animationDelay: '0.7s' }}>
              <AlertTriangle size={14} /><span className="text-xs font-bold">{outOfRangeCount} out of range</span>
            </div>
          )}
        </div>

        <div className="glass-strong rounded-2xl overflow-hidden mb-4 animate-fade-in-up" style={{ animationDelay: '0.7s' }}>
          <div className="divide-y stagger" style={{ borderColor: 'var(--divider)' }}>
            {units.map((u) => {
              const t = getTemp(u.id, selectedDate);
              const status = getTempStatus(u, t);
              const ca = getCorrectiveAction(u.id, selectedDate);
              return (
                <div key={u.id} className="px-4 py-3 animate-stagger-up cursor-pointer hover:bg-black/3 transition-all"
                  onClick={() => setScreen('logging')}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {status === 'warn' ? <AlertTriangle size={16} className="text-amber-500" />
                        : t ? <CheckCircle2 size={16} style={{ color: ACCENT }} />
                        : <div className="w-4 h-4 rounded-full border-2" style={{ borderColor: 'var(--divider)' }} />}
                      <div>
                        <span className="font-semibold text-sm tc-primary">{u.name}</span>
                        <span className="text-xs tc-muted ml-2">({u.minTemp} to {u.maxTemp}°C)</span>
                      </div>
                    </div>
                    <span className="font-bold" style={{ color: status === 'warn' ? '#f59e0b' : t ? ACCENT : 'var(--pill-inactive-text)' }}>
                      {t ? `${t}°C` : '—'}
                    </span>
                  </div>
                  {ca && <p className="text-xs text-amber-600 mt-1 ml-7">Action: {ca}</p>}
                </div>
              );
            })}
          </div>
        </div>

        <div className="glass-strong rounded-2xl p-4 mb-4 animate-fade-in-up" style={{ animationDelay: '0.85s' }}>
          <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest mb-2" style={{ color: ACCENT }}>
            <StickyNote size={14} /> Add a note (optional)
          </label>
          <textarea value={completeNote} onChange={e => setCompleteNote(e.target.value)}
            className="w-full p-3 rounded-xl text-sm font-medium outline-none resize-none glass-input transition-all" rows={2} placeholder="Any problems or notes for today..." />
        </div>

        <div className="animate-fade-in-up" style={{ animationDelay: '1s' }}>
          <button onClick={handleSubmit} className="w-full py-4 rounded-2xl text-white text-lg font-bold transition-all active:scale-[0.97] animate-pulse-ring btn-accent shadow-xl">
            <span className="flex items-center justify-center gap-3"><CheckCircle2 size={22} /> Submit Log</span>
          </button>
        </div>
        <button onClick={() => setScreen('logging')} className="w-full mt-3 py-2.5 text-sm font-semibold transition-colors text-center tc-muted">← Go back and edit</button>
      </div>
    </div>
  );
}
