import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ClipboardList, BarChart3, CalendarDays, Settings, Sun, Moon } from 'lucide-react';
import { useApp } from '../AppContext';
import { BackupRestoreModal } from '../modals';
import { GOLD } from '../types';
import logoImg from '/logo.png?url';

export function HomeScreen() {
  const { units, records, recorder, setRecorder, theme, toggleTheme, setScreen } = useApp();
  const [showBackup, setShowBackup] = useState(false);

  const selectedDate = format(new Date(), 'yyyy-MM-dd');
  const dailyProgress = useMemo(() =>
    units.filter(u => { const t = records.find(r => r.unitId === u.id && r.date === selectedDate)?.temperature; return t !== undefined && t !== ''; }).length,
  [units, records, selectedDate]);

  const startLogging = () => {
    if (!recorder.trim()) return;
    setScreen('logging');
  };

  return (
    <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-8">
      <button onClick={toggleTheme} className="absolute top-4 right-4 p-2.5 rounded-xl glass tc-muted hover:tc-primary transition-all" title="Toggle theme">
        {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
      </button>
      <button onClick={() => setShowBackup(true)} className="absolute top-4 left-4 p-2.5 rounded-xl glass tc-muted hover:tc-primary transition-all" title="Backup & Restore">
        <Settings size={18} />
      </button>

      <div className="mb-6 animate-float">
        <img src={logoImg} alt="Majestic Tea Bar" className="w-32 h-32 md:w-40 md:h-40 rounded-full object-cover"
          style={{ boxShadow: `0 12px 48px rgba(0,46,109,0.2), 0 0 0 4px ${GOLD}` }} />
      </div>

      <h1 className="font-brand text-4xl md:text-5xl font-semibold tracking-[0.25em] uppercase text-center tc-heading">
        Majestic
      </h1>
      <p className="text-xs md:text-sm font-semibold tracking-[0.2em] uppercase text-center tc-heading mt-1">
        Tea Bar
      </p>
      <p className="text-xs font-medium mt-3 text-center tc-muted tracking-wide">
        Temperature Log &middot; Food Control Plan
      </p>

      {dailyProgress > 0 && (
        <div className="mt-4 px-4 py-2 rounded-full glass text-sm font-semibold tc-accent">
          {dailyProgress}/{units.length} logged today
        </div>
      )}

      <div className="w-full max-w-sm mt-8">
        <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-center tc-muted">Who's recording?</label>
        <input type="text" value={recorder} onChange={e => setRecorder(e.target.value)} onKeyDown={e => e.key === 'Enter' && startLogging()}
          className="w-full px-5 py-4 rounded-2xl text-center text-lg font-semibold outline-none transition-all glass-input" placeholder="Enter your name" autoFocus />
      </div>

      <div className="mt-8">
        <button onClick={startLogging} disabled={!recorder.trim()}
          className="px-10 py-4 rounded-2xl text-white text-lg font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed btn-accent tracking-wide">
          Start Logging
        </button>
      </div>

      <div className="flex gap-3 mt-8">
        <button onClick={() => setScreen('records')} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold glass tc-muted hover:tc-primary transition-all">
          <ClipboardList size={14} /> Records
        </button>
        <button onClick={() => setScreen('dashboard')} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold glass tc-muted hover:tc-primary transition-all">
          <BarChart3 size={14} /> Dashboard
        </button>
        <button onClick={() => setScreen('calendar')} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold glass tc-muted hover:tc-primary transition-all">
          <CalendarDays size={14} /> Calendar
        </button>
      </div>

      {showBackup && <BackupRestoreModal onClose={() => setShowBackup(false)} />}
    </div>
  );
}
