import { useState, useEffect, useMemo, useRef } from 'react';
import {
  format,
  startOfWeek,
  addDays,
  subDays,
  addWeeks,
  subWeeks,
  eachDayOfInterval,
  isToday,
  parseISO,
} from 'date-fns';
import {
  Plus,
  Download,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Calendar,
  CheckCircle2,
  Thermometer,
  ArrowRight,
  ArrowLeft,
  ClipboardList,
  Table2,
  Pencil,
  AlertTriangle,
  Snowflake,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface Unit {
  id: string;
  name: string;
  minTemp: number;
  maxTemp: number;
}

interface TemperatureRecord {
  unitId: string;
  date: string;
  temperature: string;
}

type ViewMode = 'daily' | 'weekly';

const PRESETS = [
  { key: 'fridge', label: 'Fridge', icon: '🧊', min: 0, max: 5, defaultName: 'Fridge' },
  { key: 'chiller', label: 'Chiller', icon: '❄️', min: -2, max: 2, defaultName: 'Chiller' },
  { key: 'freezer', label: 'Freezer', icon: '🥶', min: -25, max: -18, defaultName: 'Freezer' },
  { key: 'custom', label: 'Custom', icon: '⚙️', min: 0, max: 5, defaultName: '' },
] as const;

function migrateUnits(raw: any[]): Unit[] {
  return raw.map((u) => ({
    id: u.id,
    name: u.name,
    minTemp: u.minTemp ?? 0,
    maxTemp: u.maxTemp ?? 5,
  }));
}

function App() {
  const [units, setUnits] = useState<Unit[]>(() => {
    const saved = localStorage.getItem('temperature-units');
    return saved
      ? migrateUnits(JSON.parse(saved))
      : [
          { id: '1', name: 'Fridge 1', minTemp: 0, maxTemp: 5 },
          { id: '2', name: 'Chiller 1', minTemp: -2, maxTemp: 2 },
        ];
  });

  const [records, setRecords] = useState<TemperatureRecord[]>(() => {
    const saved = localStorage.getItem('temperature-records');
    return saved ? JSON.parse(saved) : [];
  });

  const [viewMode, setViewMode] = useState<ViewMode>('daily');

  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [currentUnitIndex, setCurrentUnitIndex] = useState(0);
  const [showDailySummary, setShowDailySummary] = useState(false);
  const [slideDir, setSlideDir] = useState<'right' | 'left'>('right');
  const [cardKey, setCardKey] = useState(0);

  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

  // Add Unit modal
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [newUnitName, setNewUnitName] = useState('');
  const [newPreset, setNewPreset] = useState('fridge');
  const [newMinTemp, setNewMinTemp] = useState('0');
  const [newMaxTemp, setNewMaxTemp] = useState('5');

  // Edit Unit modal
  const [showEditUnit, setShowEditUnit] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [editName, setEditName] = useState('');
  const [editMinTemp, setEditMinTemp] = useState('');
  const [editMaxTemp, setEditMaxTemp] = useState('');

  // Bulk Update modal
  const [showBulkUpdate, setShowBulkUpdate] = useState(false);
  const [bulkUpdateTemp, setBulkUpdateTemp] = useState('');
  const [bulkUpdateUnit, setBulkUpdateUnit] = useState('all');
  const [bulkDateFrom, setBulkDateFrom] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [bulkDateTo, setBulkDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));

  const tempInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('temperature-units', JSON.stringify(units));
  }, [units]);

  useEffect(() => {
    localStorage.setItem('temperature-records', JSON.stringify(records));
  }, [records]);

  useEffect(() => {
    if (!showDailySummary && tempInputRef.current) {
      tempInputRef.current.focus();
    }
  }, [currentUnitIndex, showDailySummary]);

  const daysOfWeek = Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i));

  const dailyProgress = useMemo(() => {
    return units.filter((u) => {
      const temp = records.find((r) => r.unitId === u.id && r.date === selectedDate)?.temperature;
      return temp !== undefined && temp !== '';
    }).length;
  }, [units, records, selectedDate]);

  const safeUnitIndex = Math.min(currentUnitIndex, Math.max(units.length - 1, 0));
  const currentUnit = units[safeUnitIndex];

  const handleTemperatureChange = (unitId: string, date: string, value: string) => {
    setRecords((prev) => {
      const existing = prev.findIndex((r) => r.unitId === unitId && r.date === date);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { ...updated[existing], temperature: value };
        return updated;
      }
      return [...prev, { unitId, date, temperature: value }];
    });
  };

  const getTemperature = (unitId: string, date: string) => {
    return records.find((r) => r.unitId === unitId && r.date === date)?.temperature || '';
  };

  const getTempStatus = (unit: Unit, temp: string): 'ok' | 'warn' | 'none' => {
    if (!temp) return 'none';
    const val = parseFloat(temp);
    if (isNaN(val)) return 'none';
    return val >= unit.minTemp && val <= unit.maxTemp ? 'ok' : 'warn';
  };

  // ---- Add Unit ----
  const handlePresetSelect = (presetKey: string) => {
    setNewPreset(presetKey);
    const preset = PRESETS.find((p) => p.key === presetKey)!;
    setNewMinTemp(String(preset.min));
    setNewMaxTemp(String(preset.max));
    if (presetKey !== 'custom' && !newUnitName) {
      const count = units.filter((u) =>
        u.name.toLowerCase().startsWith(preset.defaultName.toLowerCase())
      ).length;
      setNewUnitName(`${preset.defaultName} ${count + 1}`);
    }
  };

  const addUnit = () => {
    if (!newUnitName.trim()) return;
    const min = parseFloat(newMinTemp);
    const max = parseFloat(newMaxTemp);
    if (isNaN(min) || isNaN(max)) return;

    setUnits([
      ...units,
      { id: Date.now().toString(), name: newUnitName.trim(), minTemp: min, maxTemp: max },
    ]);
    setNewUnitName('');
    setNewPreset('fridge');
    setNewMinTemp('0');
    setNewMaxTemp('5');
    setShowAddUnit(false);
  };

  const resetAddUnitForm = () => {
    setNewUnitName('');
    setNewPreset('fridge');
    setNewMinTemp('0');
    setNewMaxTemp('5');
    setShowAddUnit(false);
  };

  // ---- Edit Unit ----
  const openEditUnit = (unit: Unit) => {
    setEditingUnit(unit);
    setEditName(unit.name);
    setEditMinTemp(String(unit.minTemp));
    setEditMaxTemp(String(unit.maxTemp));
    setShowEditUnit(true);
  };

  const saveEditUnit = () => {
    if (!editingUnit || !editName.trim()) return;
    const min = parseFloat(editMinTemp);
    const max = parseFloat(editMaxTemp);
    if (isNaN(min) || isNaN(max)) return;

    setUnits(
      units.map((u) =>
        u.id === editingUnit.id ? { ...u, name: editName.trim(), minTemp: min, maxTemp: max } : u
      )
    );
    setShowEditUnit(false);
    setEditingUnit(null);
  };

  const deleteUnit = (id: string) => {
    if (confirm('Are you sure you want to delete this unit?')) {
      setUnits(units.filter((u) => u.id !== id));
      setRecords(records.filter((r) => r.unitId !== id));
      if (currentUnitIndex >= units.length - 1 && currentUnitIndex > 0) {
        setCurrentUnitIndex(currentUnitIndex - 1);
      }
    }
  };

  // ---- Bulk Update ----
  const handleBulkUpdate = () => {
    if (!bulkUpdateTemp || !bulkDateFrom || !bulkDateTo) return;
    const from = parseISO(bulkDateFrom);
    const to = parseISO(bulkDateTo);
    if (from > to) return;

    const datesToUpdate = eachDayOfInterval({ start: from, end: to });
    const unitsToUpdate =
      bulkUpdateUnit === 'all' ? units : units.filter((u) => u.id === bulkUpdateUnit);

    const newRecords = [...records];
    datesToUpdate.forEach((dateObj) => {
      const dateStr = format(dateObj, 'yyyy-MM-dd');
      unitsToUpdate.forEach((unit) => {
        const idx = newRecords.findIndex((r) => r.unitId === unit.id && r.date === dateStr);
        if (idx >= 0) {
          newRecords[idx].temperature = bulkUpdateTemp;
        } else {
          newRecords.push({ unitId: unit.id, date: dateStr, temperature: bulkUpdateTemp });
        }
      });
    });

    setRecords(newRecords);
    setShowBulkUpdate(false);
    setBulkUpdateTemp('');
  };

  // ---- Daily Navigation ----
  const handleDailyNext = () => {
    setSlideDir('right');
    if (safeUnitIndex < units.length - 1) {
      setCurrentUnitIndex(safeUnitIndex + 1);
      setCardKey((k) => k + 1);
    } else {
      setShowDailySummary(true);
      setCardKey((k) => k + 1);
    }
  };

  const handleDailyPrev = () => {
    setSlideDir('left');
    if (showDailySummary) {
      setShowDailySummary(false);
      setCardKey((k) => k + 1);
    } else if (safeUnitIndex > 0) {
      setCurrentUnitIndex(safeUnitIndex - 1);
      setCardKey((k) => k + 1);
    }
  };

  const jumpToUnit = (idx: number) => {
    setSlideDir(idx > safeUnitIndex ? 'right' : 'left');
    setCurrentUnitIndex(idx);
    setShowDailySummary(false);
    setCardKey((k) => k + 1);
  };

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    setCurrentUnitIndex(0);
    setShowDailySummary(false);
    setCardKey((k) => k + 1);
  };

  // ---- Exports ----
  const exportToExcel = () => {
    const data = units.map((unit) => {
      const rowData: Record<string, string> = {
        'Fridge/Chiller': unit.name,
        'Range': `${unit.minTemp}°C to ${unit.maxTemp}°C`,
      };
      daysOfWeek.forEach((day) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const temp = getTemperature(unit.id, dateStr);
        rowData[format(day, 'EEE dd/MM')] = temp ? `${temp}°C` : '';
      });
      return rowData;
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Temperatures');
    XLSX.writeFile(wb, `Temperature_Log_${format(currentWeekStart, 'yyyy-MM-dd')}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(22);
    doc.setTextColor(30, 64, 175);
    doc.setFont('helvetica', 'bold');
    doc.text('Fridge/Chiller Temperature Checks', 14, 22);

    doc.setFontSize(12);
    doc.setTextColor(75, 85, 99);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date week starts: ${format(currentWeekStart, 'dd/MM/yyyy')}`, 14, 32);

    const tableColumn = ['Fridge / Chiller', 'Range', ...daysOfWeek.map((d) => format(d, 'EEE'))];
    const tableRows = units.map((unit) => [
      unit.name,
      `${unit.minTemp} to ${unit.maxTemp}°C`,
      ...daysOfWeek.map((day) => {
        const temp = getTemperature(unit.id, format(day, 'yyyy-MM-dd'));
        return temp ? `${temp}°C` : '';
      }),
    ]);

    (doc as any).autoTable({
      startY: 40,
      head: [tableColumn],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [243, 244, 246] },
      styles: { halign: 'center', font: 'helvetica', fontSize: 10, cellPadding: 5 },
      columnStyles: {
        0: { halign: 'left', fontStyle: 'bold', textColor: [31, 41, 55] },
        1: { halign: 'center', fontSize: 8, textColor: [107, 114, 128] },
      },
    });

    doc.save(`Temperature_Log_${format(currentWeekStart, 'yyyy-MM-dd')}.pdf`);
  };

  const slideClass = slideDir === 'right' ? 'animate-slide-in-right' : 'animate-slide-in-left';

  return (
    <div className="min-h-screen bg-slate-100 font-sans">
      {/* ==================== HEADER ==================== */}
      <div className="bg-blue-800 text-white px-4 py-4 md:px-8 md:py-6 safe-area-top">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight truncate">
                Temperature Log
              </h1>
              <p className="text-blue-200 text-xs md:text-sm font-medium mt-0.5">
                Food Control Plan &bull; MPI Daily Record
              </p>
            </div>
            <div className="flex gap-2 shrink-0 print:hidden">
              <button
                onClick={() => setShowAddUnit(true)}
                className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl border border-white/20 transition-all active:scale-95"
                title="Add Unit"
              >
                <Plus size={20} />
              </button>
              <button
                onClick={() => setShowBulkUpdate(true)}
                className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl border border-white/20 transition-all active:scale-95"
                title="Bulk Update"
              >
                <Calendar size={20} />
              </button>
              <button
                onClick={exportToExcel}
                className="p-2.5 bg-emerald-600/80 hover:bg-emerald-500 rounded-xl border border-emerald-400/30 transition-all active:scale-95"
                title="Export to Excel"
              >
                <FileSpreadsheet size={20} />
              </button>
              <button
                onClick={exportToPDF}
                className="p-2.5 bg-red-600/80 hover:bg-red-500 rounded-xl border border-red-400/30 transition-all active:scale-95"
                title="Export to PDF"
              >
                <Download size={20} />
              </button>
            </div>
          </div>

          <div className="mt-4 flex gap-2 print:hidden">
            <button
              onClick={() => setViewMode('daily')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 active:scale-[0.97] ${
                viewMode === 'daily'
                  ? 'bg-white text-blue-800 shadow-lg'
                  : 'bg-white/10 text-white/80 hover:bg-white/20 border border-white/20'
              }`}
            >
              <Thermometer size={16} /> Daily Logger
            </button>
            <button
              onClick={() => setViewMode('weekly')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 active:scale-[0.97] ${
                viewMode === 'weekly'
                  ? 'bg-white text-blue-800 shadow-lg'
                  : 'bg-white/10 text-white/80 hover:bg-white/20 border border-white/20'
              }`}
            >
              <Table2 size={16} /> Weekly View
            </button>
          </div>
        </div>
      </div>

      {/* ==================== MAIN CONTENT ==================== */}
      <div className="max-w-5xl mx-auto px-4 py-5 md:px-8 md:py-6">
        {viewMode === 'daily' ? (
          /* ==================== DAILY LOGGER ==================== */
          <div className="max-w-lg mx-auto">
            {/* Date Selector */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-4 animate-slide-in-up">
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={() =>
                    handleDateChange(format(subDays(parseISO(selectedDate), 1), 'yyyy-MM-dd'))
                  }
                  className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all active:scale-95 shrink-0"
                  title="Previous day"
                >
                  <ChevronLeft size={22} />
                </button>
                <div className="text-center min-w-0">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="text-lg font-bold text-blue-900 bg-transparent text-center outline-none cursor-pointer w-full"
                    title="Select date"
                  />
                  <p className="text-sm text-slate-500 font-medium mt-0.5">
                    {format(parseISO(selectedDate), 'EEEE')}
                    {isToday(parseISO(selectedDate)) && (
                      <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">
                        Today
                      </span>
                    )}
                  </p>
                </div>
                <button
                  onClick={() =>
                    handleDateChange(format(addDays(parseISO(selectedDate), 1), 'yyyy-MM-dd'))
                  }
                  className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all active:scale-95 shrink-0"
                  title="Next day"
                >
                  <ChevronRight size={22} />
                </button>
              </div>
              {!isToday(parseISO(selectedDate)) && (
                <button
                  onClick={() => handleDateChange(format(new Date(), 'yyyy-MM-dd'))}
                  className="w-full mt-3 py-2 text-sm font-semibold text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100 transition-all active:scale-[0.98]"
                >
                  Go to Today
                </button>
              )}
            </div>

            {/* Progress Bar */}
            {units.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-4 animate-slide-in-up">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-slate-500">Progress</span>
                  <span className="text-sm font-bold text-slate-700">
                    {dailyProgress} of {units.length} logged
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ease-out ${
                      dailyProgress === units.length ? 'bg-green-500' : 'bg-blue-500'
                    }`}
                    style={{
                      width: `${units.length > 0 ? (dailyProgress / units.length) * 100 : 0}%`,
                    }}
                  />
                </div>
                {!showDailySummary && units.length > 1 && (
                  <div className="flex justify-center gap-1.5 mt-3">
                    {units.map((u, idx) => (
                      <button
                        key={u.id}
                        onClick={() => jumpToUnit(idx)}
                        title={u.name}
                        className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                          idx === safeUnitIndex
                            ? 'bg-blue-600 scale-125'
                            : getTemperature(u.id, selectedDate)
                              ? 'bg-green-400'
                              : 'bg-slate-300'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Main Content */}
            {units.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center animate-scale-in">
                <Thermometer className="mx-auto text-slate-300 mb-4" size={48} />
                <p className="text-slate-500 font-medium text-lg">No units added yet</p>
                <button
                  onClick={() => setShowAddUnit(true)}
                  className="mt-4 px-6 py-3 bg-blue-700 text-white rounded-xl font-bold hover:bg-blue-800 transition-all active:scale-[0.97]"
                >
                  <Plus size={18} className="inline mr-2 -mt-0.5" /> Add First Unit
                </button>
              </div>
            ) : showDailySummary ? (
              /* ---------- SUMMARY VIEW ---------- */
              <div key={`summary-${cardKey}`} className={slideClass}>
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="bg-green-50 border-b border-green-200 p-4 flex items-center gap-3">
                    <div className="animate-check-pop">
                      <CheckCircle2 className="text-green-600 shrink-0" size={24} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-green-800 text-lg">Daily Summary</h3>
                      <p className="text-green-600 text-sm truncate">
                        {format(parseISO(selectedDate), 'EEEE, d MMMM yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="divide-y divide-slate-100 stagger-children">
                    {units.map((unit, idx) => {
                      const temp = getTemperature(unit.id, selectedDate);
                      const status = getTempStatus(unit, temp);
                      return (
                        <div
                          key={unit.id}
                          className="flex items-center justify-between p-4 hover:bg-slate-50 cursor-pointer transition-all active:bg-slate-100 animate-stagger-in"
                          onClick={() => jumpToUnit(idx)}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {status === 'ok' ? (
                              <CheckCircle2 className="text-green-500 shrink-0" size={20} />
                            ) : status === 'warn' ? (
                              <AlertTriangle className="text-amber-500 shrink-0" size={20} />
                            ) : (
                              <div className="w-5 h-5 rounded-full border-2 border-slate-300 shrink-0" />
                            )}
                            <div className="min-w-0">
                              <span className="font-semibold text-slate-700 truncate block">
                                {unit.name}
                              </span>
                              <span className="text-xs text-slate-400">
                                Range: {unit.minTemp}°C to {unit.maxTemp}°C
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-3">
                            <span
                              className={`font-bold text-lg ${
                                status === 'warn'
                                  ? 'text-amber-600'
                                  : status === 'ok'
                                    ? 'text-green-600'
                                    : 'text-slate-300'
                              }`}
                            >
                              {temp ? `${temp}°C` : '—'}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditUnit(unit);
                              }}
                              className="p-1.5 rounded-lg text-slate-300 hover:text-blue-600 hover:bg-blue-50 transition-all"
                              title={`Edit ${unit.name}`}
                            >
                              <Pencil size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="border-t border-slate-200 p-4">
                    <button
                      onClick={() => jumpToUnit(0)}
                      className="w-full py-3 rounded-xl font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 transition-all active:scale-[0.98]"
                    >
                      Edit Temperatures
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* ---------- STEP-BY-STEP FRIDGE CARD ---------- */
              <div key={`card-${cardKey}`} className={slideClass}>
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 p-5">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-blue-500 text-xs font-bold uppercase tracking-widest">
                          Unit {safeUnitIndex + 1} of {units.length}
                        </p>
                        <h3 className="text-2xl font-bold text-blue-900 mt-1 truncate">
                          {currentUnit?.name}
                        </h3>
                        <p className="text-blue-400 text-xs font-semibold mt-0.5">
                          Safe range: {currentUnit?.minTemp}°C to {currentUnit?.maxTemp}°C
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => currentUnit && openEditUnit(currentUnit)}
                          className="p-2 rounded-xl bg-white/60 hover:bg-white text-blue-500 hover:text-blue-700 transition-all active:scale-95"
                          title={`Edit ${currentUnit?.name}`}
                        >
                          <Pencil size={16} />
                        </button>
                        <div
                          className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                            (() => {
                              const temp = getTemperature(currentUnit?.id || '', selectedDate);
                              const status = currentUnit ? getTempStatus(currentUnit, temp) : 'none';
                              return status === 'ok'
                                ? 'bg-green-100 text-green-600'
                                : status === 'warn'
                                  ? 'bg-amber-100 text-amber-600 animate-pulse-glow'
                                  : 'bg-slate-100 text-slate-400';
                            })()
                          }`}
                        >
                          <Thermometer size={28} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 md:p-8">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 text-center">
                      Temperature Reading
                    </label>
                    <div className="relative max-w-[280px] mx-auto">
                      <input
                        ref={tempInputRef}
                        type="number"
                        step="0.1"
                        value={getTemperature(currentUnit?.id || '', selectedDate)}
                        onChange={(e) =>
                          currentUnit &&
                          handleTemperatureChange(currentUnit.id, selectedDate, e.target.value)
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleDailyNext();
                        }}
                        className={`w-full text-center text-5xl md:text-6xl font-bold py-6 border-2 rounded-2xl focus:ring-4 outline-none transition-all duration-300 placeholder-slate-300 ${
                          (() => {
                            const temp = getTemperature(currentUnit?.id || '', selectedDate);
                            const status = currentUnit ? getTempStatus(currentUnit, temp) : 'none';
                            return status === 'ok'
                              ? 'bg-green-50 border-green-300 focus:border-green-500 focus:ring-green-500/20 text-green-700'
                              : status === 'warn'
                                ? 'bg-amber-50 border-amber-300 focus:border-amber-500 focus:ring-amber-500/20 text-amber-700'
                                : 'bg-slate-50 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 text-blue-900';
                          })()
                        }`}
                        placeholder="0.0"
                        inputMode="decimal"
                      />
                      <span className="absolute right-5 top-1/2 -translate-y-1/2 text-2xl font-bold text-slate-400 pointer-events-none">
                        °C
                      </span>
                    </div>

                    {/* Range indicator bar */}
                    {currentUnit && (
                      <div className="mt-5 max-w-[280px] mx-auto">
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-1">
                          <span>{currentUnit.minTemp}°C</span>
                          <span>{currentUnit.maxTemp}°C</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 relative overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-r from-green-300 via-green-400 to-green-300 rounded-full" />
                        </div>
                        {(() => {
                          const temp = getTemperature(currentUnit.id, selectedDate);
                          const status = getTempStatus(currentUnit, temp);
                          if (status === 'warn') {
                            return (
                              <div className="mt-2 flex items-center justify-center gap-1.5 text-amber-600 animate-pop-in">
                                <AlertTriangle size={14} />
                                <span className="text-xs font-bold">Out of safe range!</span>
                              </div>
                            );
                          }
                          if (status === 'ok') {
                            return (
                              <div className="mt-2 flex items-center justify-center gap-1.5 text-green-600 animate-pop-in">
                                <CheckCircle2 size={14} />
                                <span className="text-xs font-bold">Within safe range</span>
                              </div>
                            );
                          }
                          return (
                            <p className="text-center text-xs text-slate-400 mt-2">
                              Press Enter for next
                            </p>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                  <div className="border-t border-slate-200 p-4 flex gap-3">
                    <button
                      onClick={handleDailyPrev}
                      disabled={safeUnitIndex === 0}
                      className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-slate-100 transition-all active:scale-[0.97]"
                    >
                      <ArrowLeft size={18} /> Back
                    </button>
                    <button
                      onClick={handleDailyNext}
                      className="flex-[1.3] flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-white bg-blue-700 hover:bg-blue-800 transition-all active:scale-[0.97] shadow-sm"
                    >
                      {safeUnitIndex === units.length - 1 ? (
                        <>
                          Summary <CheckCircle2 size={18} />
                        </>
                      ) : (
                        <>
                          Next <ArrowRight size={18} />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Log Overview */}
            {units.length > 0 && !showDailySummary && (
              <div className="mt-4 animate-slide-in-up">
                <button
                  onClick={() => {
                    setSlideDir('right');
                    setShowDailySummary(true);
                    setCardKey((k) => k + 1);
                  }}
                  className="w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-4 text-left hover:bg-slate-50 transition-all active:bg-slate-100"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ClipboardList size={18} className="text-slate-400" />
                      <span className="font-bold text-slate-700">Today's Log</span>
                    </div>
                    <span className="text-sm text-slate-500 font-semibold">
                      {dailyProgress}/{units.length}
                    </span>
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {units.map((unit) => {
                      const temp = getTemperature(unit.id, selectedDate);
                      const status = getTempStatus(unit, temp);
                      return (
                        <span
                          key={unit.id}
                          className={`text-xs px-2.5 py-1 rounded-full font-semibold transition-all ${
                            status === 'ok'
                              ? 'bg-green-100 text-green-700'
                              : status === 'warn'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          {unit.name}: {temp ? `${temp}°C` : '—'}
                        </span>
                      );
                    })}
                  </div>
                </button>
              </div>
            )}
          </div>
        ) : (
          /* ==================== WEEKLY VIEW ==================== */
          <div className="animate-fade-in">
            {/* Week Navigation */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-4">
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))}
                  className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all active:scale-95 shrink-0"
                  title="Previous week"
                >
                  <ChevronLeft size={22} />
                </button>
                <div className="text-center min-w-0">
                  <p className="text-lg font-bold text-blue-900 truncate">
                    Week of {format(currentWeekStart, 'dd MMM yyyy')}
                  </p>
                  <p className="text-sm text-slate-500">
                    {format(currentWeekStart, 'dd/MM')} —{' '}
                    {format(addDays(currentWeekStart, 6), 'dd/MM')}
                  </p>
                </div>
                <button
                  onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))}
                  className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all active:scale-95 shrink-0"
                  title="Next week"
                >
                  <ChevronRight size={22} />
                </button>
              </div>
              <button
                onClick={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
                className="w-full mt-3 py-2 text-sm font-semibold text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100 transition-all active:scale-[0.98]"
              >
                Go to Current Week
              </button>
            </div>

            {/* Export Buttons */}
            <div className="flex gap-2 mb-4 print:hidden">
              <button
                onClick={exportToExcel}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all shadow-sm active:scale-[0.97]"
              >
                <FileSpreadsheet size={18} /> Excel
              </button>
              <button
                onClick={exportToPDF}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-all shadow-sm active:scale-[0.97]"
              >
                <Download size={18} /> PDF
              </button>
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-slate-800">
                    <thead>
                      <tr>
                        <th className="bg-slate-50 border-b-2 border-slate-200 p-4 text-left font-bold text-slate-600 uppercase tracking-wider text-xs w-52">
                          Fridge / Chiller
                        </th>
                        {daysOfWeek.map((day) => {
                          const dayIsToday = isToday(day);
                          return (
                            <th
                              key={day.toISOString()}
                              className={`border-b-2 border-slate-200 border-l border-slate-100 p-3 text-center ${
                                dayIsToday ? 'bg-blue-50' : 'bg-slate-50'
                              }`}
                            >
                              <div
                                className={`font-bold ${dayIsToday ? 'text-blue-700' : 'text-slate-700'}`}
                              >
                                {format(day, 'EEE')}
                              </div>
                              <div className="font-medium text-slate-400 text-sm mt-0.5">
                                {format(day, 'dd/MM')}
                              </div>
                            </th>
                          );
                        })}
                        <th className="bg-slate-50 border-b-2 border-slate-200 border-l border-slate-100 p-3 w-20 print:hidden" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {units.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="p-12 text-center text-slate-400 font-medium">
                            No units added. Click "+" to begin.
                          </td>
                        </tr>
                      ) : (
                        units.map((unit, index) => (
                          <tr
                            key={unit.id}
                            className={`${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} animate-stagger-in`}
                          >
                            <td className="p-3 border-r border-slate-100">
                              <div className="font-bold text-slate-700">{unit.name}</div>
                              <div className="text-xs text-slate-400 font-medium">
                                {unit.minTemp}°C to {unit.maxTemp}°C
                              </div>
                            </td>
                            {daysOfWeek.map((day) => {
                              const dateStr = format(day, 'yyyy-MM-dd');
                              const temp = getTemperature(unit.id, dateStr);
                              const status = getTempStatus(unit, temp);
                              return (
                                <td
                                  key={dateStr}
                                  className={`p-2 border-r border-slate-100 relative group ${
                                    status === 'warn' ? 'bg-amber-50' : ''
                                  }`}
                                >
                                  <input
                                    type="number"
                                    step="0.1"
                                    value={temp}
                                    onChange={(e) =>
                                      handleTemperatureChange(unit.id, dateStr, e.target.value)
                                    }
                                    className={`w-full h-12 text-center text-lg font-semibold bg-transparent focus:bg-blue-50 focus:ring-2 focus:ring-blue-500 rounded-lg outline-none transition-all placeholder-slate-300 ${
                                      status === 'warn' ? 'text-amber-700' : 'text-blue-900'
                                    }`}
                                    placeholder="—"
                                  />
                                  {temp && (
                                    <span
                                      className={`absolute right-2 top-1/2 -translate-y-1/2 font-bold pointer-events-none text-xs ${
                                        status === 'warn'
                                          ? 'text-amber-400'
                                          : 'text-slate-400 group-focus-within:text-blue-500'
                                      }`}
                                    >
                                      °C
                                    </span>
                                  )}
                                </td>
                              );
                            })}
                            <td className="p-2 text-center print:hidden">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => openEditUnit(unit)}
                                  className="text-slate-300 hover:text-blue-600 hover:bg-blue-50 p-1.5 rounded-lg transition-all"
                                  title={`Edit ${unit.name}`}
                                >
                                  <Pencil size={15} />
                                </button>
                                <button
                                  onClick={() => deleteUnit(unit.id)}
                                  className="text-slate-300 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-all"
                                  title={`Delete ${unit.name}`}
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
              {units.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center text-slate-400 font-medium">
                  No units added yet
                </div>
              ) : (
                units.map((unit) => (
                  <div
                    key={unit.id}
                    className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-slide-in-up"
                  >
                    <div className="flex items-center justify-between bg-slate-50 px-4 py-3 border-b border-slate-200">
                      <div>
                        <span className="font-bold text-slate-700">{unit.name}</span>
                        <span className="text-xs text-slate-400 ml-2">
                          ({unit.minTemp} to {unit.maxTemp}°C)
                        </span>
                      </div>
                      <div className="flex items-center gap-1 print:hidden">
                        <button
                          onClick={() => openEditUnit(unit)}
                          className="text-slate-300 hover:text-blue-600 p-1.5 rounded-lg transition-all"
                          title={`Edit ${unit.name}`}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => deleteUnit(unit.id)}
                          className="text-slate-300 hover:text-red-600 p-1.5 rounded-lg transition-all"
                          title={`Delete ${unit.name}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-7 divide-x divide-slate-100">
                      {daysOfWeek.map((day) => {
                        const dateStr = format(day, 'yyyy-MM-dd');
                        const temp = getTemperature(unit.id, dateStr);
                        const dayIsToday = isToday(day);
                        const status = getTempStatus(unit, temp);
                        return (
                          <div
                            key={dateStr}
                            className={`p-1.5 text-center ${
                              status === 'warn'
                                ? 'bg-amber-50'
                                : dayIsToday
                                  ? 'bg-blue-50'
                                  : ''
                            }`}
                          >
                            <div
                              className={`text-[10px] font-bold uppercase ${
                                dayIsToday ? 'text-blue-600' : 'text-slate-400'
                              }`}
                            >
                              {format(day, 'EEE')}
                            </div>
                            <div className="text-[9px] text-slate-300 mb-0.5">
                              {format(day, 'dd')}
                            </div>
                            <input
                              type="number"
                              step="0.1"
                              value={temp}
                              onChange={(e) =>
                                handleTemperatureChange(unit.id, dateStr, e.target.value)
                              }
                              className={`w-full text-center text-sm font-semibold bg-transparent focus:bg-blue-50 rounded py-1 outline-none placeholder-slate-200 ${
                                status === 'warn' ? 'text-amber-700' : 'text-blue-900'
                              }`}
                              placeholder="—"
                              inputMode="decimal"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Info Notice */}
        <div className="mt-6 flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm font-medium animate-fade-in">
          <span className="text-lg leading-none shrink-0">⚠️</span>
          <p>
            Record temperatures daily. If outside the unit's safe range, take corrective action and
            document in your Food Control Plan diary.
          </p>
        </div>
      </div>

      {/* ==================== ADD UNIT MODAL ==================== */}
      {showAddUnit && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center z-50 print:hidden modal-overlay"
          onClick={resetAddUnitForm}
        >
          <div
            className="bg-white rounded-t-3xl md:rounded-2xl p-6 w-full md:max-w-md shadow-2xl modal-sheet max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-5 md:hidden" />
            <h2 className="text-xl font-bold text-slate-800 mb-5 flex items-center gap-2">
              <Plus className="text-blue-600" size={22} /> Add Fridge/Chiller
            </h2>

            {/* Preset Type Selector */}
            <div className="mb-5">
              <label className="block text-sm font-bold text-slate-600 mb-2.5">Type</label>
              <div className="grid grid-cols-4 gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => handlePresetSelect(p.key)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 font-semibold text-xs transition-all active:scale-95 ${
                      newPreset === p.key
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-xl">{p.icon}</span>
                    <span>{p.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Unit Name */}
            <div className="mb-4">
              <label className="block text-sm font-bold text-slate-600 mb-2">Unit Name</label>
              <input
                type="text"
                value={newUnitName}
                onChange={(e) => setNewUnitName(e.target.value)}
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-800 font-medium transition-all text-lg"
                placeholder="e.g. Walk-in Chiller 1"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && addUnit()}
              />
            </div>

            {/* Temperature Range */}
            <div className="mb-6">
              <label className="block text-sm font-bold text-slate-600 mb-2">
                Safe Temperature Range
              </label>
              <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                  <input
                    type="number"
                    step="0.1"
                    value={newMinTemp}
                    onChange={(e) => setNewMinTemp(e.target.value)}
                    className="w-full p-3 pr-10 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-semibold text-slate-800 transition-all"
                    placeholder="Min"
                    inputMode="decimal"
                    title="Minimum temperature"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm pointer-events-none">
                    °C
                  </span>
                </div>
                <span className="text-slate-400 font-bold text-sm shrink-0">to</span>
                <div className="flex-1 relative">
                  <input
                    type="number"
                    step="0.1"
                    value={newMaxTemp}
                    onChange={(e) => setNewMaxTemp(e.target.value)}
                    className="w-full p-3 pr-10 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-semibold text-slate-800 transition-all"
                    placeholder="Max"
                    inputMode="decimal"
                    title="Maximum temperature"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm pointer-events-none">
                    °C
                  </span>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                <Snowflake size={12} />
                <span>
                  Temperatures outside this range will trigger a warning
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={resetAddUnitForm}
                className="flex-1 py-3.5 text-slate-600 hover:bg-slate-100 font-bold rounded-xl transition-all active:scale-[0.97]"
              >
                Cancel
              </button>
              <button
                onClick={addUnit}
                disabled={!newUnitName.trim()}
                className="flex-1 py-3.5 bg-blue-700 text-white rounded-xl hover:bg-blue-800 font-bold shadow-sm transition-all active:scale-[0.97] disabled:opacity-40"
              >
                Add Unit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== EDIT UNIT MODAL ==================== */}
      {showEditUnit && editingUnit && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center z-50 print:hidden modal-overlay"
          onClick={() => {
            setShowEditUnit(false);
            setEditingUnit(null);
          }}
        >
          <div
            className="bg-white rounded-t-3xl md:rounded-2xl p-6 w-full md:max-w-md shadow-2xl modal-sheet max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-5 md:hidden" />
            <h2 className="text-xl font-bold text-slate-800 mb-5 flex items-center gap-2">
              <Pencil className="text-blue-600" size={20} /> Edit Unit
            </h2>

            {/* Unit Name */}
            <div className="mb-4">
              <label className="block text-sm font-bold text-slate-600 mb-2">Unit Name</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-800 font-medium transition-all text-lg"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && saveEditUnit()}
              />
            </div>

            {/* Temperature Range */}
            <div className="mb-6">
              <label className="block text-sm font-bold text-slate-600 mb-2">
                Safe Temperature Range
              </label>
              <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                  <input
                    type="number"
                    step="0.1"
                    value={editMinTemp}
                    onChange={(e) => setEditMinTemp(e.target.value)}
                    className="w-full p-3 pr-10 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-semibold text-slate-800 transition-all"
                    placeholder="Min"
                    inputMode="decimal"
                    title="Minimum temperature"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm pointer-events-none">
                    °C
                  </span>
                </div>
                <span className="text-slate-400 font-bold text-sm shrink-0">to</span>
                <div className="flex-1 relative">
                  <input
                    type="number"
                    step="0.1"
                    value={editMaxTemp}
                    onChange={(e) => setEditMaxTemp(e.target.value)}
                    className="w-full p-3 pr-10 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-semibold text-slate-800 transition-all"
                    placeholder="Max"
                    inputMode="decimal"
                    title="Maximum temperature"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm pointer-events-none">
                    °C
                  </span>
                </div>
              </div>

              {/* Quick Preset buttons for edit */}
              <div className="mt-3 flex flex-wrap gap-2">
                {PRESETS.filter((p) => p.key !== 'custom').map((p) => (
                  <button
                    key={p.key}
                    onClick={() => {
                      setEditMinTemp(String(p.min));
                      setEditMaxTemp(String(p.max));
                    }}
                    className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-blue-50 hover:text-blue-600 font-semibold transition-all active:scale-95"
                  >
                    {p.icon} {p.label} ({p.min} to {p.max}°C)
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowEditUnit(false);
                  setEditingUnit(null);
                }}
                className="flex-1 py-3.5 text-slate-600 hover:bg-slate-100 font-bold rounded-xl transition-all active:scale-[0.97]"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteUnit(editingUnit.id)}
                className="py-3.5 px-4 text-red-600 hover:bg-red-50 font-bold rounded-xl transition-all active:scale-[0.97]"
                title="Delete unit"
              >
                <Trash2 size={18} />
              </button>
              <button
                onClick={saveEditUnit}
                disabled={!editName.trim()}
                className="flex-1 py-3.5 bg-blue-700 text-white rounded-xl hover:bg-blue-800 font-bold shadow-sm transition-all active:scale-[0.97] disabled:opacity-40"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== BULK UPDATE MODAL ==================== */}
      {showBulkUpdate && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center z-50 print:hidden modal-overlay"
          onClick={() => setShowBulkUpdate(false)}
        >
          <div
            className="bg-white rounded-t-3xl md:rounded-2xl p-6 w-full md:max-w-md shadow-2xl modal-sheet max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-5 md:hidden" />
            <h2 className="text-xl font-bold text-slate-800 mb-5 flex items-center gap-2">
              <Calendar className="text-purple-600" size={22} /> Bulk Update
            </h2>

            <div className="space-y-5 mb-6">
              <div>
                <label htmlFor="bulk-from-date" className="block text-sm font-bold text-slate-600 mb-2">
                  From Date
                </label>
                <input
                  id="bulk-from-date"
                  type="date"
                  value={bulkDateFrom}
                  onChange={(e) => setBulkDateFrom(e.target.value)}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none font-medium text-slate-800 transition-all"
                />
              </div>

              <div>
                <label htmlFor="bulk-to-date" className="block text-sm font-bold text-slate-600 mb-2">
                  To Date
                </label>
                <input
                  id="bulk-to-date"
                  type="date"
                  value={bulkDateTo}
                  onChange={(e) => setBulkDateTo(e.target.value)}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none font-medium text-slate-800 transition-all"
                />
              </div>

              <div>
                <label htmlFor="bulk-unit-select" className="block text-sm font-bold text-slate-600 mb-2">
                  Select Unit
                </label>
                <select
                  id="bulk-unit-select"
                  value={bulkUpdateUnit}
                  onChange={(e) => setBulkUpdateUnit(e.target.value)}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none font-medium text-slate-800 transition-all"
                >
                  <option value="all">All Units</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-600 mb-2">
                  Temperature (°C)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={bulkUpdateTemp}
                    onChange={(e) => setBulkUpdateTemp(e.target.value)}
                    className="w-full p-3.5 pr-12 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none font-bold text-slate-800 transition-all text-lg"
                    placeholder="e.g. 4.0"
                    inputMode="decimal"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg pointer-events-none">
                    °C
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowBulkUpdate(false)}
                className="flex-1 py-3.5 text-slate-600 hover:bg-slate-100 font-bold rounded-xl transition-all active:scale-[0.97]"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkUpdate}
                disabled={!bulkUpdateTemp || !bulkDateFrom || !bulkDateTo}
                className="flex-1 py-3.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-40 font-bold shadow-sm transition-all active:scale-[0.97]"
              >
                Apply Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
