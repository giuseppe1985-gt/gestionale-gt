import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Clock, Calendar, User, Search, Activity } from 'lucide-react';
import { Database } from '../../lib/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type TimeEntry = Database['public']['Tables']['time_entries']['Row'] & {
  worker: Profile;
  worksite?: { name: string } | null;
};
type LeaveRequest = Database['public']['Tables']['leave_requests']['Row'];

export default function TimeEntriesView() {
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [sickLeaveRequests, setSickLeaveRequests] = useState<LeaveRequest[]>([]);
  const [workers, setWorkers] = useState<Profile[]>([]);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedWorker, setSelectedWorker] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorkers();
  }, []);

  useEffect(() => {
    loadTimeEntries();
    loadSickLeaveRequests();
  }, [startDate, endDate, selectedWorker]);

  const loadWorkers = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .neq('role', 'admin')
        .order('full_name');

      setWorkers(data || []);
    } catch (error) {
      console.error('Error loading workers:', error);
    }
  };

  const loadTimeEntries = async () => {
    try {
      let query = supabase
        .from('time_entries')
        .select('*, worker:profiles!time_entries_worker_id_fkey(*), worksite:worksites!time_entries_worksite_id_fkey(*)')
        .gte('timestamp', `${startDate}T00:00:00`)
        .lte('timestamp', `${endDate}T23:59:59`)
        .order('timestamp', { ascending: false });

      if (selectedWorker !== 'all') {
        query = query.eq('worker_id', selectedWorker);
      }

      const { data } = await query;
      setTimeEntries(data || []);
    } catch (error) {
      console.error('Error loading time entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSickLeaveRequests = async () => {
    try {
      let query = supabase
        .from('leave_requests')
        .select('*')
        .eq('request_type', 'sick_leave')
        .eq('status', 'approved')
        .gte('start_date', startDate)
        .lte('end_date', endDate);

      if (selectedWorker !== 'all') {
        query = query.eq('worker_id', selectedWorker);
      }

      const { data } = await query;
      setSickLeaveRequests(data || []);
    } catch (error) {
      console.error('Error loading sick leave requests:', error);
    }
  };

  const setCurrentMonth = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(lastDay.toISOString().split('T')[0]);
  };

  const getEntryTypeLabel = (type: string) => {
    const labels = {
      work_start: 'Inizio Lavoro',
      lunch_start: 'Inizio Pausa',
      lunch_end: 'Fine Pausa',
      work_end: 'Fine Lavoro',
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getEntryTypeColor = (type: string) => {
    const colors = {
      work_start: 'bg-green-100 text-green-800',
      lunch_start: 'bg-orange-100 text-orange-800',
      lunch_end: 'bg-blue-100 text-blue-800',
      work_end: 'bg-red-100 text-red-800',
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('it-IT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const calculateWorkerSickLeaveHours = (workerId: string) => {
    const workerSickLeave = sickLeaveRequests.filter(req => req.worker_id === workerId);
    const totalHours = workerSickLeave.reduce((sum, req) => sum + req.hours_requested, 0);
    return totalHours;
  };

  const calculateWorkerHours = (workerId: string) => {
    const workerEntries = timeEntries.filter(e => e.worker_id === workerId);

    const entriesByDate = new Map<string, TimeEntry[]>();
    workerEntries.forEach(entry => {
      const date = entry.timestamp.split('T')[0];
      if (!entriesByDate.has(date)) {
        entriesByDate.set(date, []);
      }
      entriesByDate.get(date)?.push(entry);
    });

    let totalMinutes = 0;

    entriesByDate.forEach(dayEntries => {
      let workStart: Date | null = null;
      let lunchStart: Date | null = null;
      let lunchEnd: Date | null = null;
      let workEnd: Date | null = null;

      dayEntries.forEach(entry => {
        const timestamp = new Date(entry.timestamp);
        switch (entry.entry_type) {
          case 'work_start':
            workStart = timestamp;
            break;
          case 'lunch_start':
            lunchStart = timestamp;
            break;
          case 'lunch_end':
            lunchEnd = timestamp;
            break;
          case 'work_end':
            workEnd = timestamp;
            break;
        }
      });

      if (workStart && workEnd) {
        let dayMinutes = (workEnd.getTime() - workStart.getTime()) / (1000 * 60);

        if (lunchStart && lunchEnd) {
          const lunchMinutes = (lunchEnd.getTime() - lunchStart.getTime()) / (1000 * 60);
          dayMinutes -= lunchMinutes;
        }

        totalMinutes += dayMinutes;
      }
    });

    const sickLeaveHours = calculateWorkerSickLeaveHours(workerId);
    totalMinutes += sickLeaveHours * 60;

    if (totalMinutes === 0) return null;

    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.floor(totalMinutes % 60);

    return `${hours}h ${minutes}m`;
  };

  const groupByWorker = () => {
    const grouped = new Map<string, TimeEntry[]>();
    timeEntries.forEach(entry => {
      if (!grouped.has(entry.worker_id)) {
        grouped.set(entry.worker_id, []);
      }
      grouped.get(entry.worker_id)?.push(entry);
    });

    sickLeaveRequests.forEach(request => {
      if (!grouped.has(request.worker_id)) {
        grouped.set(request.worker_id, []);
      }
    });

    return grouped;
  };

  const workerGroups = groupByWorker();

  const calculateTotalHours = () => {
    let totalMinutes = 0;

    const allWorkerIds = new Set<string>();
    timeEntries.forEach(e => allWorkerIds.add(e.worker_id));
    sickLeaveRequests.forEach(r => allWorkerIds.add(r.worker_id));

    Array.from(allWorkerIds).forEach(workerId => {
      const workerEntries = timeEntries.filter(e => e.worker_id === workerId);

      const entriesByDate = new Map<string, TimeEntry[]>();
      workerEntries.forEach(entry => {
        const date = entry.timestamp.split('T')[0];
        if (!entriesByDate.has(date)) {
          entriesByDate.set(date, []);
        }
        entriesByDate.get(date)?.push(entry);
      });

      entriesByDate.forEach(dayEntries => {
        let workStart: Date | null = null;
        let lunchStart: Date | null = null;
        let lunchEnd: Date | null = null;
        let workEnd: Date | null = null;

        dayEntries.forEach(entry => {
          const timestamp = new Date(entry.timestamp);
          switch (entry.entry_type) {
            case 'work_start':
              workStart = timestamp;
              break;
            case 'lunch_start':
              lunchStart = timestamp;
              break;
            case 'lunch_end':
              lunchEnd = timestamp;
              break;
            case 'work_end':
              workEnd = timestamp;
              break;
          }
        });

        if (workStart && workEnd) {
          let dayMinutes = (workEnd.getTime() - workStart.getTime()) / (1000 * 60);

          if (lunchStart && lunchEnd) {
            const lunchMinutes = (lunchEnd.getTime() - lunchStart.getTime()) / (1000 * 60);
            dayMinutes -= lunchMinutes;
          }

          totalMinutes += dayMinutes;
        }
      });

      const sickLeaveHours = calculateWorkerSickLeaveHours(workerId);
      totalMinutes += sickLeaveHours * 60;
    });

    if (totalMinutes === 0) return null;

    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.floor(totalMinutes % 60);

    return `${hours}h ${minutes}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Timbrature</h1>
        <p className="text-gray-600 mt-1">Visualizza e gestisci le timbrature e le ore di malattia</p>
      </div>

      <div className="bg-white rounded-xl shadow-md p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex flex-col space-y-2">
            <label className="text-sm font-medium text-gray-700">Data Inizio</label>
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex flex-col space-y-2">
            <label className="text-sm font-medium text-gray-700">Data Fine</label>
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex flex-col space-y-2">
            <label className="text-sm font-medium text-gray-700">Utente</label>
            <div className="flex items-center space-x-2">
              <User className="w-5 h-5 text-blue-600" />
              <select
                value={selectedWorker}
                onChange={(e) => setSelectedWorker(e.target.value)}
                className="flex-1 px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-no-repeat bg-right bg-[length:20px] cursor-pointer"
                style={{ backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")", backgroundPosition: "right 0.5rem center" }}
              >
                <option value="all">Tutti gli utenti</option>
                {workers.map((worker) => (
                  <option key={worker.id} value={worker.id}>
                    {worker.full_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <button
            onClick={setCurrentMonth}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Seleziona Mese Corrente
          </button>
        </div>
      </div>

      {timeEntries.length > 0 && (
        <div className="bg-gradient-to-br from-blue-900 to-blue-700 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-200 text-sm font-medium">Totale Ore nel Periodo</p>
              <p className="text-4xl font-bold mt-1">{calculateTotalHours()}</p>
              <p className="text-blue-200 text-sm mt-2">
                Dal {new Date(startDate).toLocaleDateString('it-IT')} al {new Date(endDate).toLocaleDateString('it-IT')}
              </p>
            </div>
            <div className="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <Clock className="w-10 h-10" />
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {Array.from(workerGroups).map(([workerId, entries]) => {
          const worker = entries.length > 0 ? entries[0].worker : workers.find(w => w.id === workerId);
          if (!worker) return null;

          const totalHours = calculateWorkerHours(workerId);
          const sickLeaveHours = calculateWorkerSickLeaveHours(workerId);

          return (
            <div key={workerId} className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {worker.full_name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{worker.full_name}</h3>
                    <p className="text-sm text-gray-600">{worker.position}</p>
                  </div>
                </div>
                <div className="text-right space-y-1">
                  {totalHours && (
                    <>
                      <p className="text-sm text-gray-600">Ore Totali nel Periodo</p>
                      <p className="text-2xl font-bold text-blue-900">{totalHours}</p>
                    </>
                  )}
                  {sickLeaveHours > 0 && (
                    <div className="flex items-center justify-end space-x-2 mt-2">
                      <Activity className="w-4 h-4 text-orange-600" />
                      <p className="text-sm text-orange-600 font-medium">
                        {sickLeaveHours}h Malattia
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                {entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                        <Clock className="w-5 h-5 text-gray-600" />
                      </div>
                      <div>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEntryTypeColor(
                            entry.entry_type
                          )}`}
                        >
                          {getEntryTypeLabel(entry.entry_type)}
                        </span>
                        {entry.worksite && (
                          <p className="text-sm text-gray-600 mt-1">{entry.worksite.name}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-gray-900">
                        {formatTime(entry.timestamp)}
                      </p>
                      {entry.edited_by && (
                        <p className="text-xs text-orange-600">Modificato</p>
                      )}
                    </div>
                  </div>
                ))}

                {sickLeaveRequests.filter(req => req.worker_id === workerId).map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between py-3 px-4 bg-orange-50 rounded-lg border border-orange-200"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                        <Activity className="w-5 h-5 text-orange-600" />
                      </div>
                      <div>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                          Malattia
                        </span>
                        {request.start_date && request.end_date && (
                          <p className="text-sm text-gray-600 mt-1">
                            {formatDate(request.start_date)} - {formatDate(request.end_date)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-orange-600">
                        {request.hours_requested}h
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {timeEntries.length === 0 && sickLeaveRequests.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl shadow-md">
          <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Nessuna timbratura o malattia nel periodo selezionato</p>
        </div>
      )}
    </div>
  );
}
