import { useState, useEffect } from 'react';
import { format, startOfWeek, addDays, subWeeks, addWeeks, startOfYear, endOfYear, eachDayOfInterval } from 'date-fns';
import { Plus, Download, FileSpreadsheet, Settings, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Types
interface Unit {
  id: string;
  name: string;
}

interface TemperatureRecord {
  unitId: string;
  date: string; // YYYY-MM-DD
  temperature: string;
}

function App() {
  const [units, setUnits] = useState<Unit[]>(() => {
    const saved = localStorage.getItem('temperature-units');
    return saved ? JSON.parse(saved) : [
      { id: '1', name: 'Fridge 1' },
      { id: '2', name: 'Chiller 1' }
    ];
  });

  const [records, setRecords] = useState<TemperatureRecord[]>(() => {
    const saved = localStorage.getItem('temperature-records');
    return saved ? JSON.parse(saved) : [];
  });

  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    return startOfWeek(new Date(), { weekStartsOn: 1 }); // Week starts on Monday
  });

  const [newUnitName, setNewUnitName] = useState('');
  const [showAddUnit, setShowAddUnit] = useState(false);
  
  const [showBulkUpdate, setShowBulkUpdate] = useState(false);
  const [bulkUpdateTemp, setBulkUpdateTemp] = useState('');
  const [bulkUpdateUnit, setBulkUpdateUnit] = useState('all');
  const [bulkUpdateScope, setBulkUpdateScope] = useState<'week' | 'year'>('week');

  // Save to local storage whenever units or records change
  useEffect(() => {
    localStorage.setItem('temperature-units', JSON.stringify(units));
  }, [units]);

  useEffect(() => {
    localStorage.setItem('temperature-records', JSON.stringify(records));
  }, [records]);

  const daysOfWeek = Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i));

  const handleTemperatureChange = (unitId: string, date: string, value: string) => {
    setRecords(prev => {
      const existing = prev.findIndex(r => r.unitId === unitId && r.date === date);
      if (existing >= 0) {
        const newRecords = [...prev];
        newRecords[existing] = { ...newRecords[existing], temperature: value };
        return newRecords;
      }
      return [...prev, { unitId, date, temperature: value }];
    });
  };

  const getTemperature = (unitId: string, date: string) => {
    return records.find(r => r.unitId === unitId && r.date === date)?.temperature || '';
  };

  const addUnit = () => {
    if (!newUnitName.trim()) return;
    const newUnit = {
      id: Date.now().toString(),
      name: newUnitName.trim()
    };
    setUnits([...units, newUnit]);
    setNewUnitName('');
    setShowAddUnit(false);
  };

  const deleteUnit = (id: string) => {
    if (confirm('Are you sure you want to delete this unit?')) {
      setUnits(units.filter(u => u.id !== id));
      setRecords(records.filter(r => r.unitId !== id));
    }
  };

  const handleBulkUpdate = () => {
    if (!bulkUpdateTemp) return;
    
    const newRecords = [...records];
    let datesToUpdate: Date[] = [];

    if (bulkUpdateScope === 'week') {
      datesToUpdate = daysOfWeek;
    } else {
      const yearStart = startOfYear(currentWeekStart);
      const yearEnd = endOfYear(currentWeekStart);
      datesToUpdate = eachDayOfInterval({ start: yearStart, end: yearEnd });
    }
    
    const unitsToUpdate = bulkUpdateUnit === 'all' ? units : units.filter(u => u.id === bulkUpdateUnit);
    
    datesToUpdate.forEach(dateObj => {
      const dateStr = format(dateObj, 'yyyy-MM-dd');
      unitsToUpdate.forEach(unit => {
        const existingIdx = newRecords.findIndex(r => r.unitId === unit.id && r.date === dateStr);
        if (existingIdx >= 0) {
          newRecords[existingIdx].temperature = bulkUpdateTemp;
        } else {
          newRecords.push({
            unitId: unit.id,
            date: dateStr,
            temperature: bulkUpdateTemp
          });
        }
      });
    });
    
    setRecords(newRecords);
    setShowBulkUpdate(false);
    setBulkUpdateTemp('');
  };

  const exportToExcel = () => {
    const data = units.map(unit => {
      const rowData: any = { 'Fridge/Chiller': unit.name };
      daysOfWeek.forEach(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        rowData[format(day, 'EEE dd/MM')] = getTemperature(unit.id, dateStr) ? `${getTemperature(unit.id, dateStr)}°C` : '';
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
    doc.setTextColor(30, 64, 175); // Blue-800
    doc.setFont("helvetica", "bold");
    doc.text('Fridge/Chiller Temperature Checks', 14, 22);
    
    doc.setFontSize(12);
    doc.setTextColor(75, 85, 99); // Gray-600
    doc.setFont("helvetica", "normal");
    doc.text(`Date week starts: ${format(currentWeekStart, 'dd/MM/yyyy')}`, 14, 32);

    const tableColumn = ['Fridge / Chiller', ...daysOfWeek.map(d => format(d, 'EEE'))];
    const tableRows = units.map(unit => {
      return [
        unit.name,
        ...daysOfWeek.map(day => {
          const temp = getTemperature(unit.id, format(day, 'yyyy-MM-dd'));
          return temp ? `${temp}°C` : '';
        })
      ];
    });

    (doc as any).autoTable({
      startY: 40,
      head: [tableColumn],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [243, 244, 246] },
      styles: { halign: 'center', font: 'helvetica', fontSize: 11, cellPadding: 6 },
      columnStyles: { 0: { halign: 'left', fontStyle: 'bold', textColor: [31, 41, 55] } }
    });

    doc.save(`Temperature_Log_${format(currentWeekStart, 'yyyy-MM-dd')}.pdf`);
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto bg-white shadow-xl rounded-xl overflow-hidden border border-slate-200">
        
        {/* Header - Brand Colors */}
        <div className="bg-blue-800 text-white p-6 md:p-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Fridge/Chiller Temperature Checks</h1>
              <p className="text-blue-200 mt-2 text-sm font-medium">Food Control Plan &bull; Daily Record Log</p>
            </div>
            <div className="flex flex-wrap gap-3 mt-4 md:mt-0 print:hidden">
              <button onClick={() => setShowAddUnit(true)} className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-lg text-sm font-semibold transition-all">
                <Plus size={18} /> Add Unit
              </button>
              <button onClick={() => setShowBulkUpdate(true)} className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-lg text-sm font-semibold transition-all">
                <Settings size={18} /> Bulk Update
              </button>
              <button onClick={exportToExcel} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500/50 rounded-lg text-sm font-semibold transition-all shadow-sm">
                <FileSpreadsheet size={18} /> Excel
              </button>
              <button onClick={exportToPDF} className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white border border-red-500/50 rounded-lg text-sm font-semibold transition-all shadow-sm">
                <Download size={18} /> PDF
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 md:p-8">
          {/* Date Selection */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex items-center gap-4">
              <span className="font-semibold text-slate-700 text-lg">Date week starts:</span>
              <div className="flex items-center bg-white rounded-lg border border-slate-300 shadow-sm overflow-hidden">
                <button onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))} className="p-2 hover:bg-slate-100 text-slate-600 border-r border-slate-300 transition-colors">
                  <ChevronLeft size={20} />
                </button>
                <span className="px-6 py-2 font-bold text-blue-900 min-w-[140px] text-center">
                  {format(currentWeekStart, 'dd/MM/yyyy')}
                </span>
                <button onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))} className="p-2 hover:bg-slate-100 text-slate-600 border-l border-slate-300 transition-colors">
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
            <button onClick={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))} className="px-4 py-2 text-sm font-semibold text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 border border-blue-200 transition-colors">
              Go to Current Week
            </button>
          </div>

          {/* Styled Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-300 shadow-sm">
            <table className="w-full text-slate-800">
              <thead>
                <tr>
                  <th className="bg-slate-100 border-b-2 border-slate-300 p-4 text-left font-bold w-56 text-slate-700 uppercase tracking-wider text-sm">Fridge / Chiller</th>
                  {daysOfWeek.map(day => (
                    <th key={day.toISOString()} className="bg-slate-100 border-b-2 border-slate-300 border-l border-slate-200 p-3 text-center w-28">
                      <div className="font-bold text-slate-800 text-lg">{format(day, 'EEE')}</div>
                      <div className="font-medium text-slate-500 text-sm mt-1">{format(day, 'dd/MM')}</div>
                    </th>
                  ))}
                  <th className="bg-slate-100 border-b-2 border-slate-300 border-l border-slate-200 p-3 w-16 print:hidden"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {units.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-12 text-center text-slate-500 font-medium bg-slate-50">
                      No units added. Click "Add Unit" to begin logging temperatures.
                    </td>
                  </tr>
                ) : (
                  units.map((unit, index) => (
                    <tr key={unit.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="p-4 font-bold text-slate-700 border-r border-slate-200">
                        {unit.name}
                      </td>
                      {daysOfWeek.map(day => {
                        const dateStr = format(day, 'yyyy-MM-dd');
                        const temp = getTemperature(unit.id, dateStr);
                        return (
                          <td key={dateStr} className="p-2 border-r border-slate-200 relative group">
                            <input
                              type="number"
                              step="0.1"
                              value={temp}
                              onChange={(e) => handleTemperatureChange(unit.id, dateStr, e.target.value)}
                              className="w-full h-12 text-center text-lg font-semibold bg-transparent focus:bg-blue-50 focus:ring-2 focus:ring-blue-500 rounded-md outline-none transition-all placeholder-slate-300 text-blue-900"
                              placeholder="-"
                            />
                            {temp && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold pointer-events-none text-sm group-focus-within:text-blue-500">°C</span>}
                          </td>
                        );
                      })}
                      <td className="p-2 text-center print:hidden">
                        <button onClick={() => deleteUnit(unit.id)} className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-all w-full flex justify-center">
                          <Trash2 size={20} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm font-medium">
            <span className="text-lg">ℹ️</span>
            <p>
              Remember to record temperatures daily. If the temperature is outside the safe range (typically above 5°C for cold storage), take immediate corrective action and document it in your Food Control Plan diary.
            </p>
          </div>
        </div>
      </div>

      {/* Modern Modals */}
      {showAddUnit && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 print:hidden">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-slate-200 transform transition-all">
            <h2 className="text-xl font-bold text-slate-800 mb-5 flex items-center gap-2">
              <Plus className="text-blue-600" /> Add Fridge/Chiller
            </h2>
            <div className="mb-6">
              <label className="block text-sm font-semibold text-slate-700 mb-2">Unit Name</label>
              <input
                type="text"
                value={newUnitName}
                onChange={(e) => setNewUnitName(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-800 font-medium transition-all"
                placeholder="e.g. Walk-in Chiller 1"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && addUnit()}
              />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowAddUnit(false)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 font-semibold rounded-xl transition-colors">
                Cancel
              </button>
              <button onClick={addUnit} className="px-5 py-2.5 bg-blue-700 text-white rounded-xl hover:bg-blue-800 font-semibold shadow-sm transition-colors">
                Add Unit
              </button>
            </div>
          </div>
        </div>
      )}

      {showBulkUpdate && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 print:hidden">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-slate-200">
            <h2 className="text-xl font-bold text-slate-800 mb-5 flex items-center gap-2">
              <Settings className="text-purple-600" /> Bulk Update
            </h2>
            
            <div className="space-y-5 mb-8">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Time Period</label>
                <div className="flex gap-3">
                  <label className="flex-1 flex items-center justify-center gap-2 p-3 border border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors has-[:checked]:border-purple-500 has-[:checked]:bg-purple-50 has-[:checked]:text-purple-700">
                    <input 
                      type="radio" 
                      checked={bulkUpdateScope === 'week'} 
                      onChange={() => setBulkUpdateScope('week')} 
                      className="hidden"
                    />
                    <span className="font-semibold text-sm">This Week</span>
                  </label>
                  <label className="flex-1 flex items-center justify-center gap-2 p-3 border border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors has-[:checked]:border-purple-500 has-[:checked]:bg-purple-50 has-[:checked]:text-purple-700">
                    <input 
                      type="radio" 
                      checked={bulkUpdateScope === 'year'} 
                      onChange={() => setBulkUpdateScope('year')} 
                      className="hidden"
                    />
                    <span className="font-semibold text-sm">Whole Year</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Select Unit</label>
                <select
                  value={bulkUpdateUnit}
                  onChange={(e) => setBulkUpdateUnit(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none font-medium text-slate-800 transition-all"
                >
                  <option value="all">All Units</option>
                  {units.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Temperature (°C)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={bulkUpdateTemp}
                    onChange={(e) => setBulkUpdateTemp(e.target.value)}
                    className="w-full p-3 pr-10 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none font-semibold text-slate-800 transition-all"
                    placeholder="e.g. 4.0"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">°C</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => setShowBulkUpdate(false)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 font-semibold rounded-xl transition-colors">
                Cancel
              </button>
              <button onClick={handleBulkUpdate} disabled={!bulkUpdateTemp} className="px-5 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 font-semibold shadow-sm transition-colors">
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