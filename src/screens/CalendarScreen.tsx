import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isToday } from 'date-fns';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { useApp } from '../AppContext';
import { ACCENT } from '../types';

export function CalendarScreen() {
  const { units, getTemp, setScreen } = useApp();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days: Date[] = [];
    let day = calStart;
    while (day <= calEnd) { days.push(day); day = addDays(day, 1); }
    return days;
  }, [currentMonth]);

  const dayStatuses = useMemo(() => {
    const map: Record<string, 'full' | 'partial' | 'empty'> = {};
    calendarDays.forEach(d => {
      const ds = format(d, 'yyyy-MM-dd');
      if (units.length === 0) { map[ds] = 'empty'; return; }
      const logged = units.filter(u => getTemp(u.id, ds)).length;
      map[ds] = logged === 0 ? 'empty' : logged === units.length ? 'full' : 'partial';
    });
    return map;
  }, [calendarDays, units, getTemp]);

  const goToDay = () => {
    setScreen('records');
  };

  return (
    <div className="relative z-10 min-h-screen px-4 py-5">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-4 animate-fade-in-down">
          <button onClick={() => setScreen('home')} className="p-2 rounded-xl tc-muted hover:tc-primary hover:bg-black/5 transition-all active:scale-95" title="Home"><ArrowLeft size={22} /></button>
          <h2 className="text-lg font-bold tc-heading">Calendar</h2>
          <div />
        </div>

        {/* Month nav */}
        <div className="glass-strong rounded-2xl p-4 mb-4 animate-fade-in-up">
          <div className="flex items-center justify-between">
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2.5 rounded-xl hover:bg-black/5 transition-all active:scale-95" style={{ color: ACCENT }} title="Previous month"><ChevronLeft size={22} /></button>
            <h3 className="text-lg font-bold tc-heading">{format(currentMonth, 'MMMM yyyy')}</h3>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2.5 rounded-xl hover:bg-black/5 transition-all active:scale-95" style={{ color: ACCENT }} title="Next month"><ChevronRight size={22} /></button>
          </div>
        </div>

        {/* Calendar grid */}
        <div className="glass-strong rounded-2xl p-3 mb-4 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
              <div key={d} className="text-center text-xs font-bold tc-muted py-1">{d}</div>
            ))}
          </div>
          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map(d => {
              const ds = format(d, 'yyyy-MM-dd');
              const inMonth = isSameMonth(d, currentMonth);
              const today = isToday(d);
              const status = dayStatuses[ds] || 'empty';
              return (
                <button key={ds} onClick={() => goToDay()}
                  className={`relative p-1.5 rounded-xl text-center transition-all active:scale-95 ${
                    !inMonth ? 'opacity-25' : 'hover:bg-black/5'
                  } ${today ? 'ring-2 ring-indigo-400' : ''}`}>
                  <div className={`text-sm font-semibold ${today ? 'tc-heading' : inMonth ? 'tc-primary' : 'tc-muted'}`}>
                    {format(d, 'd')}
                  </div>
                  <div className="flex justify-center mt-0.5">
                    {status === 'full' && <div className="w-1.5 h-1.5 rounded-full bg-green-400" />}
                    {status === 'partial' && <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                    {status === 'empty' && inMonth && <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--dot-inactive)' }} />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="glass-strong rounded-2xl p-4 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center justify-center gap-6 text-xs font-semibold tc-muted">
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-green-400" /> All logged</div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Partial</div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--dot-inactive)' }} /> None</div>
          </div>

          {/* Monthly summary */}
          {(() => {
            const monthStart = startOfMonth(currentMonth);
            const monthEnd = endOfMonth(currentMonth);
            let total = 0, logged = 0;
            let d = monthStart;
            while (d <= monthEnd) {
              const ds = format(d, 'yyyy-MM-dd');
              units.forEach(u => { total++; if (getTemp(u.id, ds)) logged++; });
              d = addDays(d, 1);
            }
            const pct = total > 0 ? Math.round((logged / total) * 100) : 0;
            return (
              <div className="text-center mt-3 pt-3" style={{ borderTop: '1px solid var(--divider)' }}>
                <span className="text-sm font-bold" style={{ color: pct >= 80 ? '#34d399' : '#f59e0b' }}>{pct}%</span>
                <span className="text-xs tc-muted ml-2">monthly compliance ({logged}/{total})</span>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
