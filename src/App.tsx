import { useState, useEffect } from 'react';
import {
  format,
  startOfWeek,
  addDays,
  addWeeks,
  subWeeks,
  eachDayOfInterval,
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
  Pencil,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface Unit {
  id: string;
  name: string;
}

interface TemperatureRecord {
  unitId: string;
  date: string;
  temperature: string;
}

interface DailyNote {
  date: string;
  note: string;
  recorder: string;
}

function App() {
  const [units, setUnits] = useState<Unit[]>(() => {
    const saved = localStorage.getItem('temperature-units');
    return saved ? JSON.parse(saved) : [
      { id: '1', name: '1' },
      { id: '2', name: '2' },
    ];
  });

  const [records, setRecords] = useState<TemperatureRecord[]>(() => {
    const saved = localStorage.getItem('temperature-records');
    return saved ? JSON.parse(saved) : [];
  });

  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

  const [recorderName, setRecorderName] = useState(() =>
    localStorage.getItem('temperature-recorder') || ''
  );

  const [dailyNotes, setDailyNotes] = useState<DailyNote[]>(() => {
    const saved = localStorage.getItem('temperature-notes');
    return saved ? JSON.parse(saved) : [];
  });

  const [showAddUnit, setShowAddUnit] = useState(false);
  const [newUnitName, setNewUnitName] = useState('');

  const [showEditUnit, setShowEditUnit] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [editName, setEditName] = useState('');

  const [showBulkUpdate, setShowBulkUpdate] = useState(false);
  const [bulkUpdateTemp, setBulkUpdateTemp] = useState('');
  const [bulkUpdateUnit, setBulkUpdateUnit] = useState('all');
  const [bulkDateFrom, setBulkDateFrom] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [bulkDateTo, setBulkDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));

  const [showNotesFor, setShowNotesFor] = useState<string | null>(null);

  useEffect(() => { localStorage.setItem('temperature-units', JSON.stringify(units)); }, [units]);
  useEffect(() => { localStorage.setItem('temperature-records', JSON.stringify(records)); }, [records]);
  useEffect(() => { localStorage.setItem('temperature-recorder', recorderName); }, [recorderName]);
  useEffect(() => { localStorage.setItem('temperature-notes', JSON.stringify(dailyNotes)); }, [dailyNotes]);

  const daysOfWeek = Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i));
  const dayLabels = ['Mon', 'Tues', 'Wed', 'Thur', 'Fri', 'Sat', 'Sun'];

  const getTemperature = (unitId: string, date: string) =>
    records.find((r) => r.unitId === unitId && r.date === date)?.temperature || '';

  const handleTemperatureChange = (unitId: string, date: string, value: string) => {
    setRecords((prev) => {
      const idx = prev.findIndex((r) => r.unitId === unitId && r.date === date);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], temperature: value };
        return updated;
      }
      return [...prev, { unitId, date, temperature: value }];
    });
  };

  const getDailyNote = (date: string) => dailyNotes.find((n) => n.date === date);

  const handleNoteChange = (date: string, note: string) => {
    setDailyNotes((prev) => {
      const idx = prev.findIndex((n) => n.date === date);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], note, recorder: recorderName };
        return updated;
      }
      return [...prev, { date, note, recorder: recorderName }];
    });
  };

  const addUnit = () => {
    if (!newUnitName.trim()) return;
    setUnits([...units, { id: Date.now().toString(), name: newUnitName.trim() }]);
    setNewUnitName('');
    setShowAddUnit(false);
  };

  const openEditUnit = (unit: Unit) => {
    setEditingUnit(unit);
    setEditName(unit.name);
    setShowEditUnit(true);
  };

  const saveEditUnit = () => {
    if (!editingUnit || !editName.trim()) return;
    setUnits(units.map((u) => u.id === editingUnit.id ? { ...u, name: editName.trim() } : u));
    setShowEditUnit(false);
    setEditingUnit(null);
  };

  const deleteUnit = (id: string) => {
    if (confirm('Delete this unit and all its records?')) {
      setUnits(units.filter((u) => u.id !== id));
      setRecords(records.filter((r) => r.unitId !== id));
    }
  };

  const handleBulkUpdate = () => {
    if (!bulkUpdateTemp || !bulkDateFrom || !bulkDateTo) return;
    const from = parseISO(bulkDateFrom);
    const to = parseISO(bulkDateTo);
    if (from > to) return;
    const dates = eachDayOfInterval({ start: from, end: to });
    const toUpdate = bulkUpdateUnit === 'all' ? units : units.filter((u) => u.id === bulkUpdateUnit);
    const newRecords = [...records];
    dates.forEach((d) => {
      const dateStr = format(d, 'yyyy-MM-dd');
      toUpdate.forEach((unit) => {
        const idx = newRecords.findIndex((r) => r.unitId === unit.id && r.date === dateStr);
        if (idx >= 0) newRecords[idx].temperature = bulkUpdateTemp;
        else newRecords.push({ unitId: unit.id, date: dateStr, temperature: bulkUpdateTemp });
      });
    });
    setRecords(newRecords);
    setShowBulkUpdate(false);
    setBulkUpdateTemp('');
  };

  const exportToExcel = () => {
    const tempData = units.map((unit) => {
      const row: Record<string, string> = { 'Fridge': unit.name };
      daysOfWeek.forEach((day, i) => {
        const temp = getTemperature(unit.id, format(day, 'yyyy-MM-dd'));
        row[dayLabels[i]] = temp ? `${temp}°C` : '';
      });
      return row;
    });
    const noteData = daysOfWeek.map((day) => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const note = getDailyNote(dateStr);
      return { Day: format(day, 'EEEE dd/MM'), 'Recorded By': note?.recorder || '', Notes: note?.note || '' };
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(tempData), 'Temperatures');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(noteData), 'Notes');
    XLSX.writeFile(wb, `Fridge_Temp_Log_${format(currentWeekStart, 'yyyy-MM-dd')}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF('portrait', 'mm', 'a4');
    const teal = [0, 128, 128] as [number, number, number];
    const pageW = doc.internal.pageSize.getWidth();

    // Page number circle
    doc.setFillColor(...teal);
    doc.circle(pageW - 18, 16, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('18', pageW - 18, 16, { align: 'center', baseline: 'middle' });

    // Title
    doc.setTextColor(...teal);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('Fridge/chiller', 14, 20);
    doc.text('temperature checks', 14, 30);

    // Date week starts
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('Date week starts:', 14, 42);
    doc.setFont('helvetica', 'bold');
    doc.text(format(currentWeekStart, 'dd/MM/yy'), 55, 42);

    if (recorderName) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Recorded by: ${recorderName}`, 14, 48);
    }

    const startY = recorderName ? 54 : 48;
    const headers = ['Fridge', ...dayLabels];
    const body = units.map((unit) => [
      unit.name,
      ...daysOfWeek.map((day) => {
        const temp = getTemperature(unit.id, format(day, 'yyyy-MM-dd'));
        return temp ? `${temp}°c` : '°C';
      }),
    ]);

    (doc as any).autoTable({
      startY,
      head: [headers],
      body,
      theme: 'grid',
      headStyles: {
        fillColor: [230, 230, 230],
        textColor: [50, 50, 50],
        fontStyle: 'bold',
        fontSize: 10,
        lineColor: [180, 180, 180],
        lineWidth: 0.3,
      },
      bodyStyles: {
        fontSize: 10,
        lineColor: [180, 180, 180],
        lineWidth: 0.3,
        textColor: [60, 60, 60],
        cellPadding: 4,
      },
      alternateRowStyles: { fillColor: [248, 248, 248] },
      styles: { halign: 'center', font: 'helvetica' },
      columnStyles: {
        0: { halign: 'left', fontStyle: 'bold', fillColor: [240, 240, 240] },
      },
    });

    // Notes section
    const notesForWeek = daysOfWeek
      .map((day) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const note = getDailyNote(dateStr);
        return note?.note ? [format(day, 'EEEE'), note.recorder || '', note.note] : null;
      })
      .filter(Boolean) as string[][];

    if (notesForWeek.length > 0) {
      const lastY = (doc as any).lastAutoTable?.finalY || 120;
      doc.setFontSize(13);
      doc.setTextColor(...teal);
      doc.setFont('helvetica', 'bold');
      doc.text('Notes / Problems', 14, lastY + 12);

      (doc as any).autoTable({
        startY: lastY + 16,
        head: [['Day', 'Recorded By', 'Notes / Action Taken']],
        body: notesForWeek,
        theme: 'grid',
        headStyles: {
          fillColor: [230, 230, 230],
          textColor: [50, 50, 50],
          fontStyle: 'bold',
          fontSize: 9,
          lineColor: [180, 180, 180],
          lineWidth: 0.3,
        },
        bodyStyles: { fontSize: 9, lineColor: [180, 180, 180], lineWidth: 0.3, cellPadding: 3 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 30 }, 1: { cellWidth: 30 } },
      });
    }

    doc.save(`Fridge_Temp_Log_${format(currentWeekStart, 'yyyy-MM-dd')}.pdf`);
  };

  const TEAL = '#008080';

  return (
    <div className="min-h-screen p-4 md:p-6" style={{ backgroundColor: '#e8e8e8' }}>
      <div className="max-w-5xl mx-auto">

        {/* Paper page */}
        <div className="bg-white shadow-lg border border-gray-300 relative" style={{ minHeight: '100vh' }}>

          {/* Page number circle */}
          <div
            className="absolute top-4 right-4 w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
            style={{ backgroundColor: TEAL }}
          >
            18
          </div>

          {/* Content */}
          <div className="p-6 md:p-10">

            {/* Title */}
            <h1 className="text-3xl md:text-4xl font-bold leading-tight" style={{ color: TEAL }}>
              Fridge/chiller<br />temperature checks
            </h1>

            {/* Toolbar */}
            <div className="mt-4 flex flex-wrap items-center gap-2 no-print">
              <button onClick={() => setShowAddUnit(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold border border-gray-400 rounded hover:bg-gray-100 transition-colors">
                <Plus size={15} /> Add Fridge
              </button>
              <button onClick={() => setShowBulkUpdate(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold border border-gray-400 rounded hover:bg-gray-100 transition-colors">
                <Calendar size={15} /> Bulk Update
              </button>
              <button onClick={exportToExcel} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold border border-gray-400 rounded hover:bg-gray-100 transition-colors" style={{ color: '#16a34a' }}>
                <FileSpreadsheet size={15} /> Excel
              </button>
              <button onClick={exportToPDF} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold border border-gray-400 rounded hover:bg-gray-100 transition-colors" style={{ color: '#dc2626' }}>
                <Download size={15} /> PDF
              </button>
            </div>

            {/* Recorder Name */}
            <div className="mt-5 flex items-center gap-3">
              <label className="text-sm font-semibold text-gray-600 whitespace-nowrap">Recorded by:</label>
              <input
                type="text"
                value={recorderName}
                onChange={(e) => setRecorderName(e.target.value)}
                className="flex-1 max-w-xs px-3 py-1.5 border-b-2 border-gray-300 bg-transparent text-gray-800 font-medium outline-none focus:border-teal-600 transition-colors"
                placeholder="Your name"
              />
            </div>

            {/* Week Navigation */}
            <div className="mt-6 flex items-center gap-3">
              <span className="text-sm font-semibold text-gray-600">Date week starts:</span>
              <div className="flex items-center gap-1 no-print">
                <button onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))} className="p-1 hover:bg-gray-100 rounded transition-colors">
                  <ChevronLeft size={18} />
                </button>
                <span className="font-bold text-gray-800 min-w-[90px] text-center">
                  {format(currentWeekStart, 'dd/MM/yy')}
                </span>
                <button onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))} className="p-1 hover:bg-gray-100 rounded transition-colors">
                  <ChevronRight size={18} />
                </button>
              </div>
              <button
                onClick={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
                className="text-xs font-semibold underline no-print"
                style={{ color: TEAL }}
              >
                This week
              </button>
            </div>

            {/* Temperature Table */}
            <div className="mt-4 overflow-x-auto">
              <table className="w-full border-collapse" style={{ borderColor: '#b0b0b0' }}>
                <thead>
                  <tr>
                    <th className="border border-gray-300 bg-gray-100 px-3 py-2.5 text-left text-sm font-bold text-gray-700 w-28">
                      Fridge
                    </th>
                    {dayLabels.map((label, i) => (
                      <th key={i} className="border border-gray-300 bg-gray-100 px-2 py-2.5 text-center text-sm font-bold text-gray-700">
                        {label}
                      </th>
                    ))}
                    <th className="border border-gray-300 bg-gray-100 px-2 py-2.5 w-16 no-print"></th>
                  </tr>
                </thead>
                <tbody>
                  {units.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="border border-gray-300 p-6 text-center text-gray-400 text-sm">
                        No fridges added. Click "Add Fridge" to start.
                      </td>
                    </tr>
                  ) : (
                    units.map((unit) => (
                      <tr key={unit.id} className="hover:bg-gray-50 transition-colors">
                        <td className="border border-gray-300 px-3 py-1.5 font-bold text-gray-700 text-sm bg-gray-50">
                          {unit.name}
                        </td>
                        {daysOfWeek.map((day) => {
                          const dateStr = format(day, 'yyyy-MM-dd');
                          const temp = getTemperature(unit.id, dateStr);
                          return (
                            <td key={dateStr} className="border border-gray-300 px-1 py-0 text-center relative">
                              <div className="flex items-center justify-center">
                                <input
                                  type="number"
                                  step="0.1"
                                  value={temp}
                                  onChange={(e) => handleTemperatureChange(unit.id, dateStr, e.target.value)}
                                  className="w-14 text-center py-2 bg-transparent outline-none text-gray-800 font-medium text-sm placeholder-gray-300 focus:bg-teal-50 transition-colors"
                                  placeholder="--"
                                  inputMode="decimal"
                                />
                                <span className="text-gray-400 text-xs font-medium">°C</span>
                              </div>
                            </td>
                          );
                        })}
                        <td className="border border-gray-300 px-1 py-0 text-center no-print">
                          <div className="flex items-center justify-center gap-0.5">
                            <button onClick={() => openEditUnit(unit)} className="p-1 text-gray-400 hover:text-teal-700 transition-colors" title="Edit">
                              <Pencil size={13} />
                            </button>
                            <button onClick={() => deleteUnit(unit.id)} className="p-1 text-gray-400 hover:text-red-600 transition-colors" title="Delete">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Weekly Notes */}
            <div className="mt-8">
              <h2 className="text-lg font-bold mb-3" style={{ color: TEAL }}>
                Notes / Problems &amp; Actions
              </h2>
              <div className="border border-gray-300">
                {daysOfWeek.map((day, i) => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const note = getDailyNote(dateStr);
                  const isOpen = showNotesFor === dateStr;
                  return (
                    <div key={dateStr} className={`${i > 0 ? 'border-t border-gray-300' : ''}`}>
                      <button
                        onClick={() => setShowNotesFor(isOpen ? null : dateStr)}
                        className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-gray-50 transition-colors no-print"
                      >
                        <span className="text-sm font-semibold text-gray-700">
                          {dayLabels[i]} <span className="font-normal text-gray-400 ml-1">{format(day, 'dd/MM')}</span>
                        </span>
                        <div className="flex items-center gap-2">
                          {note?.note && (
                            <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: '#e0f2f1', color: TEAL }}>
                              Has note
                            </span>
                          )}
                          <ChevronRight size={14} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                        </div>
                      </button>
                      {isOpen && (
                        <div className="px-4 pb-3">
                          <textarea
                            value={note?.note || ''}
                            onChange={(e) => handleNoteChange(dateStr, e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded text-sm text-gray-700 outline-none focus:border-teal-600 transition-colors resize-none"
                            rows={3}
                            placeholder="Any problems or changes – what were they and what did you do?"
                          />
                          {note?.recorder && (
                            <p className="text-xs text-gray-400 mt-1">Noted by: {note.recorder}</p>
                          )}
                        </div>
                      )}
                      {/* Print version: always show notes */}
                      <div className="hidden print:block px-4 pb-2">
                        <p className="text-xs text-gray-500 min-h-[20px]">{note?.note || ''}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Signature line */}
            <div className="mt-8 flex items-end gap-8 text-sm text-gray-600">
              <div className="flex-1">
                <p className="font-semibold mb-1">Name:</p>
                <div className="border-b-2 border-gray-300 pb-1 min-h-[24px] font-medium text-gray-800">
                  {recorderName || ''}
                </div>
              </div>
              <div className="flex-1">
                <p className="font-semibold mb-1">Signed:</p>
                <div className="border-b-2 border-gray-300 pb-1 min-h-[24px]"></div>
              </div>
              <div className="w-32">
                <p className="font-semibold mb-1">Date:</p>
                <div className="border-b-2 border-gray-300 pb-1 min-h-[24px] font-medium text-gray-800">
                  {format(new Date(), 'dd/MM/yyyy')}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ==================== MODALS ==================== */}

      {showAddUnit && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 no-print" onClick={() => setShowAddUnit(false)}>
          <div className="bg-white rounded-lg p-6 w-full max-w-sm shadow-xl border border-gray-300" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4" style={{ color: TEAL }}>Add Fridge/Chiller</h2>
            <label className="block text-sm font-semibold text-gray-600 mb-1">Name or Number</label>
            <input
              type="text"
              value={newUnitName}
              onChange={(e) => setNewUnitName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded outline-none focus:border-teal-600 text-gray-800 font-medium mb-4"
              placeholder="e.g. 3 or Walk-in Chiller"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && addUnit()}
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowAddUnit(false)} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded transition-colors">Cancel</button>
              <button onClick={addUnit} className="px-4 py-2 text-sm font-bold text-white rounded transition-colors" style={{ backgroundColor: TEAL }}>Add</button>
            </div>
          </div>
        </div>
      )}

      {showEditUnit && editingUnit && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 no-print" onClick={() => { setShowEditUnit(false); setEditingUnit(null); }}>
          <div className="bg-white rounded-lg p-6 w-full max-w-sm shadow-xl border border-gray-300" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4" style={{ color: TEAL }}>Edit Unit</h2>
            <label className="block text-sm font-semibold text-gray-600 mb-1">Name or Number</label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded outline-none focus:border-teal-600 text-gray-800 font-medium mb-4"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && saveEditUnit()}
            />
            <div className="flex justify-between">
              <button onClick={() => deleteUnit(editingUnit.id)} className="px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 rounded transition-colors">Delete</button>
              <div className="flex gap-2">
                <button onClick={() => { setShowEditUnit(false); setEditingUnit(null); }} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded transition-colors">Cancel</button>
                <button onClick={saveEditUnit} className="px-4 py-2 text-sm font-bold text-white rounded transition-colors" style={{ backgroundColor: TEAL }}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showBulkUpdate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 no-print" onClick={() => setShowBulkUpdate(false)}>
          <div className="bg-white rounded-lg p-6 w-full max-w-sm shadow-xl border border-gray-300" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4" style={{ color: TEAL }}>Bulk Update</h2>
            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1">From Date</label>
                <input type="date" value={bulkDateFrom} onChange={(e) => setBulkDateFrom(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded outline-none focus:border-teal-600 font-medium text-gray-800" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1">To Date</label>
                <input type="date" value={bulkDateTo} onChange={(e) => setBulkDateTo(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded outline-none focus:border-teal-600 font-medium text-gray-800" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1">Unit</label>
                <select value={bulkUpdateUnit} onChange={(e) => setBulkUpdateUnit(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded outline-none focus:border-teal-600 font-medium text-gray-800 bg-white">
                  <option value="all">All Units</option>
                  {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1">Temperature (°C)</label>
                <input type="number" step="0.1" value={bulkUpdateTemp} onChange={(e) => setBulkUpdateTemp(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded outline-none focus:border-teal-600 font-bold text-gray-800" placeholder="e.g. 4" inputMode="decimal" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowBulkUpdate(false)} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded transition-colors">Cancel</button>
              <button onClick={handleBulkUpdate} disabled={!bulkUpdateTemp} className="px-4 py-2 text-sm font-bold text-white rounded transition-colors disabled:opacity-40" style={{ backgroundColor: TEAL }}>Apply</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;