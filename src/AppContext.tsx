import { createContext, useContext, useEffect, useCallback, type ReactNode } from 'react';
import {
  format, startOfWeek, addDays, eachDayOfInterval, parseISO, startOfMonth, endOfMonth,
} from 'date-fns';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useLocalStorage } from './hooks/useLocalStorage';
import type { Unit, TemperatureRecord, DailyNote, Screen, Theme } from './types';

function migrateUnits(raw: any[]): Unit[] {
  return raw.map(u => ({ id: u.id, name: u.name, minTemp: u.minTemp ?? 0, maxTemp: u.maxTemp ?? 5 }));
}

export interface AppContextType {
  units: Unit[];
  records: TemperatureRecord[];
  recorder: string;
  notes: DailyNote[];
  theme: Theme;
  screen: Screen;
  setScreen: (s: Screen) => void;
  setRecorder: (name: string) => void;
  addUnit: (name: string, min: number, max: number) => void;
  updateUnit: (id: string, name: string, min: number, max: number) => void;
  deleteUnit: (id: string) => void;
  getTemp: (uid: string, date: string) => string;
  setTemp: (uid: string, date: string, val: string) => void;
  getTempStatus: (unit: Unit, temp: string) => 'ok' | 'warn' | 'none';
  getCorrectiveAction: (uid: string, date: string) => string;
  setCorrectiveAction: (uid: string, date: string, action: string) => void;
  getNote: (date: string) => DailyNote | undefined;
  setNoteText: (date: string, text: string) => void;
  toggleTheme: () => void;
  exportBackup: () => void;
  importBackup: (json: string) => boolean;
  exportExcel: (fromDate: string, toDate: string, signature?: string) => void;
  exportPDF: (fromDate: string, toDate: string, signature?: string) => void;
  getExportRange: (mode: 'week' | 'month' | 'custom', baseDate: string, customFrom?: string, customTo?: string) => { from: string; to: string; label: string };
  doBulkUpdate: (from: string, to: string, unitId: string, temp: string) => void;
}

const Ctx = createContext<AppContextType>(null!);
export const useApp = () => useContext(Ctx);

export function AppProvider({ children }: { children: ReactNode }) {
  const [units, setUnits] = useLocalStorage<Unit[]>('temperature-units', migrateUnits([
    { id: '1', name: 'Fridge 1', minTemp: 0, maxTemp: 5 },
    { id: '2', name: 'Fridge 2', minTemp: 0, maxTemp: 5 },
  ]));
  const [records, setRecords] = useLocalStorage<TemperatureRecord[]>('temperature-records', []);
  const [recorder, setRecorderRaw] = useLocalStorage<string>('temperature-recorder', '');
  const [notes, setNotes] = useLocalStorage<DailyNote[]>('temperature-notes', []);
  const [theme, setTheme] = useLocalStorage<Theme>('temperature-theme', 'light');
  const [screen, setScreenRaw] = useLocalStorage<Screen>('temperature-screen', 'home');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    setUnits(prev => migrateUnits(prev));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setScreen = useCallback((s: Screen) => setScreenRaw(s), [setScreenRaw]);
  const setRecorder = useCallback((n: string) => setRecorderRaw(n), [setRecorderRaw]);

  const addUnit = useCallback((name: string, min: number, max: number) => {
    setUnits(prev => [...prev, { id: Date.now().toString(), name, minTemp: min, maxTemp: max }]);
  }, [setUnits]);

  const updateUnit = useCallback((id: string, name: string, min: number, max: number) => {
    setUnits(prev => prev.map(u => u.id === id ? { ...u, name, minTemp: min, maxTemp: max } : u));
  }, [setUnits]);

  const deleteUnit = useCallback((id: string) => {
    if (!confirm('Delete this unit and all its records?')) return;
    setUnits(prev => prev.filter(u => u.id !== id));
    setRecords(prev => prev.filter(r => r.unitId !== id));
  }, [setUnits, setRecords]);

  const getTemp = useCallback((uid: string, date: string) =>
    records.find(r => r.unitId === uid && r.date === date)?.temperature || ''
  , [records]);

  const setTemp = useCallback((uid: string, date: string, val: string) => {
    setRecords(prev => {
      const i = prev.findIndex(r => r.unitId === uid && r.date === date);
      if (i >= 0) { const u = [...prev]; u[i] = { ...u[i], temperature: val }; return u; }
      return [...prev, { unitId: uid, date, temperature: val }];
    });
  }, [setRecords]);

  const getTempStatus = useCallback((unit: Unit, temp: string): 'ok' | 'warn' | 'none' => {
    if (!temp) return 'none';
    const v = parseFloat(temp);
    if (isNaN(v)) return 'none';
    return v >= unit.minTemp && v <= unit.maxTemp ? 'ok' : 'warn';
  }, []);

  const getCorrectiveAction = useCallback((uid: string, date: string) =>
    records.find(r => r.unitId === uid && r.date === date)?.correctiveAction || ''
  , [records]);

  const setCorrectiveAction = useCallback((uid: string, date: string, action: string) => {
    setRecords(prev => {
      const i = prev.findIndex(r => r.unitId === uid && r.date === date);
      if (i >= 0) { const u = [...prev]; u[i] = { ...u[i], correctiveAction: action }; return u; }
      return [...prev, { unitId: uid, date, temperature: '', correctiveAction: action }];
    });
  }, [setRecords]);

  const getNote = useCallback((date: string) => notes.find(n => n.date === date), [notes]);

  const setNoteText = useCallback((date: string, text: string) => {
    setNotes(prev => {
      const i = prev.findIndex(n => n.date === date);
      if (i >= 0) { const u = [...prev]; u[i] = { ...u[i], note: text, recorder }; return u; }
      return [...prev, { date, note: text, recorder }];
    });
  }, [setNotes, recorder]);

  const toggleTheme = useCallback(() => setTheme(prev => prev === 'light' ? 'dark' : 'light'), [setTheme]);

  const exportBackup = useCallback(() => {
    const data = JSON.stringify({ units, records, notes, recorder, exportedAt: new Date().toISOString() }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `temperature_backup_${format(new Date(), 'yyyy-MM-dd')}.json`; a.click();
    URL.revokeObjectURL(url);
  }, [units, records, notes, recorder]);

  const importBackup = useCallback((json: string): boolean => {
    try {
      const data = JSON.parse(json);
      if (data.units) setUnits(migrateUnits(data.units));
      if (data.records) setRecords(data.records);
      if (data.notes) setNotes(data.notes);
      if (data.recorder) setRecorderRaw(data.recorder);
      return true;
    } catch { return false; }
  }, [setUnits, setRecords, setNotes, setRecorderRaw]);

  const getExportRange = useCallback((mode: 'week' | 'month' | 'custom', baseDate: string, customFrom?: string, customTo?: string) => {
    if (mode === 'week') {
      const ws = startOfWeek(parseISO(baseDate), { weekStartsOn: 1 });
      const we = addDays(ws, 6);
      return { from: format(ws, 'yyyy-MM-dd'), to: format(we, 'yyyy-MM-dd'), label: `Week of ${format(ws, 'dd MMM')}` };
    }
    if (mode === 'month') {
      const ms = startOfMonth(parseISO(baseDate));
      const me = endOfMonth(parseISO(baseDate));
      return { from: format(ms, 'yyyy-MM-dd'), to: format(me, 'yyyy-MM-dd'), label: format(ms, 'MMMM yyyy') };
    }
    return { from: customFrom || baseDate, to: customTo || baseDate, label: `${customFrom || baseDate} to ${customTo || baseDate}` };
  }, []);

  const exportExcel = useCallback((fromDate: string, toDate: string, signature?: string) => {
    const allDays = eachDayOfInterval({ start: parseISO(fromDate), end: parseISO(toDate) });
    if (allDays.length === 0) return;

    const weeks: Date[][] = [];
    let buf: Date[] = [];
    allDays.forEach(d => { if (buf.length > 0 && d.getDay() === 1) { weeks.push(buf); buf = []; } buf.push(d); });
    if (buf.length) weeks.push(buf);

    const wb = XLSX.utils.book_new();

    weeks.forEach((weekDays, wi) => {
      const ws = startOfWeek(weekDays[0], { weekStartsOn: 1 });
      const we = addDays(ws, 6);
      const fullWeek = Array.from({ length: 7 }, (_, i) => addDays(ws, i));

      const data: (string | number)[][] = [];
      data.push(['Fridge/Chiller Temperature Checks']);
      data.push([`Date week starts: ${format(ws, 'dd/MM/yy')}`, '', '', `Week ends: ${format(we, 'dd/MM/yy')}`]);
      if (recorder) data.push([`Recorded by: ${recorder}`]);
      data.push([]);
      data.push(['Fridge', ...fullWeek.map(d => `${format(d, 'EEE')} ${format(d, 'dd/MM')}`)]);

      units.forEach(u => {
        const row: string[] = [u.name];
        fullWeek.forEach(d => {
          const t = getTemp(u.id, format(d, 'yyyy-MM-dd'));
          row.push(t ? `${t}°C` : '');
        });
        data.push(row);
      });

      data.push([]);
      data.push(['Name:', signature || recorder || '', '', 'Signed:', signature || '', '', `Date: ${format(new Date(), 'dd/MM/yyyy')}`]);
      if (signature) data.push(['', `Digitally signed by ${signature} on ${format(new Date(), 'dd/MM/yyyy HH:mm')}`]);

      const sheet = XLSX.utils.aoa_to_sheet(data);
      sheet['!cols'] = [{ wch: 16 }, ...fullWeek.map(() => ({ wch: 12 }))];
      XLSX.utils.book_append_sheet(wb, sheet, weeks.length > 1 ? `Week ${wi + 1}` : 'Temperatures');
    });

    XLSX.writeFile(wb, `Fridge_Temp_Log_${fromDate}_to_${toDate}.xlsx`);
  }, [units, recorder, getTemp]);

  const exportPDF = useCallback((fromDate: string, toDate: string, signature?: string) => {
    try {
      const startD = parseISO(fromDate);
      const endD = parseISO(toDate);
      if (isNaN(startD.getTime()) || isNaN(endD.getTime()) || startD > endD) {
        alert('Invalid date range for export.'); return;
      }

      const NAVY: [number, number, number] = [0, 46, 109];
      const NAVY_LIGHT: [number, number, number] = [212, 223, 240];
      const GOLD_PDF: [number, number, number] = [201, 168, 76];
      const CREAM: [number, number, number] = [244, 241, 236];

      const allDays = eachDayOfInterval({ start: startD, end: endD });
      if (allDays.length === 0) { alert('No days in range.'); return; }

      const weeks: Date[][] = [];
      let weekBuf: Date[] = [];
      allDays.forEach(d => { if (weekBuf.length > 0 && d.getDay() === 1) { weeks.push(weekBuf); weekBuf = []; } weekBuf.push(d); });
      if (weekBuf.length) weeks.push(weekBuf);

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const signedBy = signature || recorder || '';

      const drawTitle = () => {
        doc.setDrawColor(...GOLD_PDF); doc.setLineWidth(2);
        doc.circle(28, 22, 12, 'S');
        doc.setFillColor(...NAVY);
        doc.circle(28, 22, 10, 'F');
        doc.setTextColor(255, 255, 255); doc.setFontSize(11); doc.setFont('helvetica', 'bold');
        doc.text('M', 25, 25);
        doc.setTextColor(...NAVY); doc.setFontSize(18); doc.setFont('helvetica', 'bold');
        doc.text('Majestic Tea Bar', 46, 18);
        doc.setTextColor(...GOLD_PDF); doc.setFontSize(13); doc.setFont('helvetica', 'normal');
        doc.text('Fridge/Chiller Temperature Checks', 46, 26);
        doc.setDrawColor(...GOLD_PDF); doc.setLineWidth(0.5);
        doc.line(46, 28, 170, 28);
      };

      const drawWeekTable = (weekDays: Date[], startY: number) => {
        const weekStart = startOfWeek(weekDays[0], { weekStartsOn: 1 });
        const weekEnd = addDays(weekStart, 6);
        const fullWeek = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
        const inRange = (d: Date) => weekDays.some(wd => format(wd, 'yyyy-MM-dd') === format(d, 'yyyy-MM-dd'));

        // "Date week starts" / "ends" bar
        doc.setFillColor(...NAVY);
        doc.rect(14, startY, 88, 7, 'F');
        doc.setTextColor(255, 255, 255); doc.setFontSize(7.5); doc.setFont('helvetica', 'bold');
        doc.text('Date week starts:', 16, startY + 5);
        doc.setFillColor(255, 255, 255);
        doc.rect(50, startY + 0.5, 24, 6, 'F');
        doc.setTextColor(60, 60, 60); doc.setFontSize(9); doc.setFont('helvetica', 'bold');
        doc.text(format(weekStart, 'dd/MM/yy'), 52, startY + 5);
        doc.setTextColor(255, 255, 255); doc.setFontSize(7.5);
        doc.text('Ends:', 76, startY + 5);
        doc.setFillColor(255, 255, 255);
        doc.rect(84, startY + 0.5, 24, 6, 'F');
        doc.setTextColor(60, 60, 60); doc.setFontSize(9);
        doc.text(format(weekEnd, 'dd/MM/yy'), 86, startY + 5);

        // Table headers: two rows - day name + date
        const dayHeaders = fullWeek.map(d => `${format(d, 'EEE')}\n${format(d, 'dd/MM')}`);

        const tableY = startY + 9;
        const body: string[][] = [];
        units.forEach(u => {
          const row = [u.name];
          fullWeek.forEach(d => {
            if (!inRange(d)) { row.push(''); return; }
            const t = getTemp(u.id, format(d, 'yyyy-MM-dd'));
            row.push(t ? `${t}°c` : '');
          });
          body.push(row);
        });
        if (body.length === 0) body.push(['No units', '', '', '', '', '', '', '']);

        autoTable(doc, {
          startY: tableY,
          head: [['Fridge', ...dayHeaders]],
          body,
          theme: 'grid',
          tableWidth: 'auto',
          headStyles: { fillColor: [...NAVY], textColor: 255, fontStyle: 'bold', fontSize: 8, cellPadding: 2.5, halign: 'center', lineColor: [...GOLD_PDF], lineWidth: 0.3 },
          bodyStyles: { fontSize: 9, textColor: [80, 80, 80], cellPadding: 3.5, lineColor: [...GOLD_PDF], lineWidth: 0.3, halign: 'center' },
          alternateRowStyles: { fillColor: [...CREAM] },
          styles: { font: 'helvetica', overflow: 'linebreak' },
          columnStyles: { 0: { halign: 'center', fontStyle: 'bold', fillColor: [...NAVY_LIGHT], textColor: [80, 80, 80], cellWidth: 20 } },
          margin: { left: 14, right: 14 },
        });

        return (doc as any).lastAutoTable?.finalY || tableY + 80;
      };

      const drawSignatureBox = (y: number) => {
        const boxY = Math.min(y + 6, 262);
        doc.setDrawColor(...GOLD_PDF); doc.setLineWidth(0.3);
        doc.rect(14, boxY, 182, 28, 'S');

        doc.setFillColor(...NAVY_LIGHT);
        doc.rect(14, boxY, 182, 7, 'F');
        doc.setDrawColor(...GOLD_PDF); doc.setLineWidth(0.3);
        doc.rect(14, boxY, 182, 7, 'S');
        doc.setTextColor(...NAVY); doc.setFontSize(9); doc.setFont('helvetica', 'bold');
        doc.text('SIGNATURE / VERIFICATION', 16, boxY + 5);

        const row1 = boxY + 11;
        doc.setTextColor(100, 100, 100); doc.setFontSize(8); doc.setFont('helvetica', 'normal');
        doc.text('Name:', 16, row1);
        doc.setFont('helvetica', 'bold'); doc.setTextColor(50, 50, 50);
        doc.text(signedBy || '___________________________', 30, row1);

        doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 100, 100);
        doc.text('Date:', 120, row1);
        doc.setFont('helvetica', 'bold'); doc.setTextColor(50, 50, 50);
        doc.text(format(new Date(), 'dd/MM/yyyy'), 133, row1);

        const row2 = boxY + 18;
        doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 100, 100);
        doc.text('Signed:', 16, row2);
        if (signedBy) {
          doc.setFont('helvetica', 'bolditalic'); doc.setTextColor(...NAVY);
          doc.setFontSize(13);
          doc.text(signedBy, 33, row2 + 1);
          doc.setFontSize(6); doc.setTextColor(140, 140, 140); doc.setFont('helvetica', 'normal');
          doc.text(`Digitally signed on ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 33, row2 + 5);
        } else {
          doc.setTextColor(180, 180, 180); doc.setFontSize(8);
          doc.text('___________________________', 33, row2);
        }
      };

      // Build the PDF
      drawTitle();
      let curY = 36;
      if (recorder) {
        doc.setTextColor(100, 100, 100); doc.setFontSize(9); doc.setFont('helvetica', 'normal');
        doc.text('Recorded by: ' + recorder, 14, curY); curY += 6;
      }

      weeks.forEach((weekDays, wi) => {
        if (wi > 0 && curY + 95 > 270) { doc.addPage(); curY = 14; }
        curY = drawWeekTable(weekDays, curY) + 6;
      });

      // Corrective actions
      const actions = allDays.flatMap(d => {
        const ds = format(d, 'yyyy-MM-dd');
        return units.map(u => ({ unit: u.name, day: format(d, 'EEE dd/MM'), ca: getCorrectiveAction(u.id, ds) })).filter(x => x.ca);
      });
      if (actions.length) {
        if (curY + 30 > 260) { doc.addPage(); curY = 14; }
        doc.setFontSize(10); doc.setTextColor(...NAVY); doc.setFont('helvetica', 'bold');
        doc.text('Corrective Actions / Problems', 14, curY + 4);
        autoTable(doc, {
          startY: curY + 8,
          head: [['Unit', 'Day', 'Action Taken']],
          body: actions.map(a => [a.unit, a.day, a.ca]),
          theme: 'grid',
          headStyles: { fillColor: [...NAVY], textColor: 255, fontSize: 8, lineColor: [...GOLD_PDF], lineWidth: 0.3, cellPadding: 2.5 },
          bodyStyles: { fontSize: 8, cellPadding: 2.5, lineColor: [...GOLD_PDF], lineWidth: 0.3 },
          margin: { left: 14, right: 14 },
        });
        curY = (doc as any).lastAutoTable?.finalY || curY + 20;
      }

      // Signature box
      if (curY + 36 > 290) { doc.addPage(); curY = 14; }
      drawSignatureBox(curY);

      doc.save(`Fridge_Temp_Log_${fromDate}_to_${toDate}.pdf`);
    } catch (err) {
      console.error('PDF export error:', err);
      alert('PDF export failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  }, [units, recorder, getTemp, getCorrectiveAction]);

  const doBulkUpdate = useCallback((from: string, to: string, unitId: string, temp: string) => {
    if (!temp) return;
    const ds = eachDayOfInterval({ start: parseISO(from), end: parseISO(to) });
    const us = unitId === 'all' ? units : units.filter(u => u.id === unitId);
    setRecords(prev => {
      const nr = [...prev];
      ds.forEach(d => { const s = format(d, 'yyyy-MM-dd'); us.forEach(u => {
        const i = nr.findIndex(r => r.unitId === u.id && r.date === s);
        if (i >= 0) nr[i].temperature = temp; else nr.push({ unitId: u.id, date: s, temperature: temp });
      }); });
      return nr;
    });
  }, [units, setRecords]);

  return (
    <Ctx.Provider value={{
      units, records, recorder, notes, theme, screen,
      setScreen, setRecorder, addUnit, updateUnit, deleteUnit,
      getTemp, setTemp, getTempStatus,
      getCorrectiveAction, setCorrectiveAction,
      getNote, setNoteText, toggleTheme,
      exportBackup, importBackup, exportExcel, exportPDF, getExportRange, doBulkUpdate,
    }}>
      {children}
    </Ctx.Provider>
  );
}
