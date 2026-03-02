import { useState, useMemo } from 'react';
import { format, subDays } from 'date-fns';
import { ArrowLeft, TrendingUp, AlertTriangle } from 'lucide-react';
import { useApp } from '../AppContext';
import { SimpleChart } from '../components/SimpleChart';
import { ACCENT } from '../types';

export function DashboardScreen() {
  const { units, getTemp, getTempStatus, setScreen } = useApp();
  const [period, setPeriod] = useState(7);

  const chartData = useMemo(() => {
    const today = new Date();
    return Array.from({ length: period }, (_, i) => {
      const d = subDays(today, period - 1 - i);
      const ds = format(d, 'yyyy-MM-dd');
      const values: Record<string, number | null> = {};
      units.forEach(u => {
        const t = getTemp(u.id, ds);
        values[u.id] = t ? parseFloat(t) : null;
      });
      return { date: ds, label: format(d, period <= 7 ? 'EEE' : 'dd/MM'), values };
    });
  }, [units, getTemp, period]);

  const stats = useMemo(() => {
    const today = new Date();
    let totalSlots = 0, logged = 0, outOfRange = 0;
    const unitAvgs: { name: string; avg: number | null; count: number }[] = [];
    units.forEach(u => {
      let sum = 0, cnt = 0;
      for (let i = 0; i < period; i++) {
        const ds = format(subDays(today, i), 'yyyy-MM-dd');
        totalSlots++;
        const t = getTemp(u.id, ds);
        if (t) { logged++; const v = parseFloat(t); if (!isNaN(v)) { sum += v; cnt++; } if (getTempStatus(u, t) === 'warn') outOfRange++; }
      }
      unitAvgs.push({ name: u.name, avg: cnt > 0 ? Math.round((sum / cnt) * 10) / 10 : null, count: cnt });
    });
    return { compliance: totalSlots > 0 ? Math.round((logged / totalSlots) * 100) : 0, logged, totalSlots, outOfRange, unitAvgs };
  }, [units, getTemp, getTempStatus, period]);

  return (
    <div className="relative z-10 min-h-screen px-4 py-5">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4 animate-fade-in-down">
          <button onClick={() => setScreen('home')} className="p-2 rounded-xl tc-muted hover:tc-primary hover:bg-black/5 transition-all active:scale-95" title="Home"><ArrowLeft size={22} /></button>
          <h2 className="text-lg font-bold tc-heading">Dashboard</h2>
          <div />
        </div>

        {/* Period selector */}
        <div className="flex gap-2 mb-4 animate-fade-in-up">
          {[7, 14, 30].map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${p === period ? 'btn-accent' : 'glass tc-secondary'}`}>
              {p} Days
            </button>
          ))}
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-3 gap-3 mb-4 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <div className="glass-strong rounded-2xl p-4 text-center">
            <div className="text-2xl font-bold" style={{ color: stats.compliance >= 80 ? '#34d399' : '#f59e0b' }}>{stats.compliance}%</div>
            <div className="text-xs font-semibold tc-muted mt-1">Compliance</div>
          </div>
          <div className="glass-strong rounded-2xl p-4 text-center">
            <div className="text-2xl font-bold tc-heading">{stats.logged}</div>
            <div className="text-xs font-semibold tc-muted mt-1">Readings</div>
          </div>
          <div className="glass-strong rounded-2xl p-4 text-center">
            <div className="text-2xl font-bold" style={{ color: stats.outOfRange > 0 ? '#f59e0b' : '#34d399' }}>{stats.outOfRange}</div>
            <div className="text-xs font-semibold tc-muted mt-1">Out of Range</div>
          </div>
        </div>

        {/* Chart */}
        <div className="glass-strong rounded-2xl p-4 mb-4 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={16} style={{ color: ACCENT }} />
            <span className="text-sm font-bold" style={{ color: ACCENT }}>Temperature Trends</span>
          </div>
          <SimpleChart data={chartData} unitNames={units.map(u => ({ id: u.id, name: u.name }))} height={220} />
        </div>

        {/* Unit averages */}
        <div className="glass-strong rounded-2xl overflow-hidden mb-4 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--divider)' }}>
            <span className="text-sm font-bold" style={{ color: ACCENT }}>Unit Averages ({period} days)</span>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--divider)' }}>
            {stats.unitAvgs.map(ua => (
              <div key={ua.name} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-sm tc-primary">{ua.name}</span>
                  <span className="text-xs tc-muted">({ua.count} readings)</span>
                </div>
                <span className="font-bold tc-heading">{ua.avg !== null ? `${ua.avg}°C` : '—'}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Out of range events */}
        {stats.outOfRange > 0 && (
          <div className="glass-strong rounded-2xl overflow-hidden mb-4 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid var(--divider)' }}>
              <AlertTriangle size={14} className="text-amber-500" />
              <span className="text-sm font-bold text-amber-600">Out-of-Range Events</span>
            </div>
            <div className="divide-y max-h-48 overflow-y-auto" style={{ borderColor: 'var(--divider)' }}>
              {(() => {
                const today = new Date();
                const events: { unit: string; date: string; temp: string }[] = [];
                for (let i = 0; i < period; i++) {
                  const d = subDays(today, i);
                  const ds = format(d, 'yyyy-MM-dd');
                  units.forEach(u => {
                    const t = getTemp(u.id, ds);
                    if (t && getTempStatus(u, t) === 'warn') events.push({ unit: u.name, date: format(d, 'EEE dd/MM'), temp: t });
                  });
                }
                return events.map((e, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={12} className="text-amber-400" />
                      <span className="text-xs font-semibold tc-primary">{e.unit}</span>
                      <span className="text-xs tc-muted">{e.date}</span>
                    </div>
                    <span className="text-xs font-bold text-amber-600">{e.temp}°C</span>
                  </div>
                ));
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
