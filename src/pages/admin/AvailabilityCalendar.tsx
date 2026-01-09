import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Calendar, CheckCircle, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Database } from '../../lib/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type LeaveRequest = Database['public']['Tables']['leave_requests']['Row'] & {
  worker: Profile;
};

interface WorkerAvailability {
  worker: Profile;
  isAvailable: boolean;
  reason?: string;
  leaveType?: string;
  endDate?: string;
}

export default function AvailabilityCalendar() {
  const { profile } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [workers, setWorkers] = useState<Profile[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [availability, setAvailability] = useState<WorkerAvailability[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [currentDate]);

  useEffect(() => {
    if (workers.length > 0 && leaveRequests.length >= 0) {
      calculateAvailability(workers, leaveRequests, selectedDate);
    }
  }, [selectedDate, workers, leaveRequests]);

  const loadData = async () => {
    try {
      const { data: workersData } = await supabase
        .from('profiles')
        .select('*')
        .in('role', ['worker', 'sales_manager', 'administrator', 'org_manager', 'admin'])
        .eq('organization_id', profile?.organization_id)
        .order('full_name');

      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      const { data: requestsData } = await supabase
        .from('leave_requests')
        .select('*, worker:profiles!leave_requests_worker_id_fkey(*)')
        .eq('organization_id', profile?.organization_id)
        .eq('status', 'approved')
        .gte('end_date', startOfMonth.toISOString().split('T')[0])
        .lte('start_date', endOfMonth.toISOString().split('T')[0]);

      setWorkers(workersData || []);
      setLeaveRequests(requestsData || []);
      calculateAvailability(workersData || [], requestsData || [], selectedDate);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAvailability = (workersData: Profile[], requestsData: LeaveRequest[], checkDate: Date = new Date()) => {
    const targetDate = new Date(checkDate);
    targetDate.setHours(0, 0, 0, 0);

    const availabilityData: WorkerAvailability[] = workersData.map(worker => {
      const activeLeave = requestsData.find(request => {
        if (request.worker_id !== worker.id) return false;

        const startDate = new Date(request.start_date!);
        const endDate = new Date(request.end_date!);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(0, 0, 0, 0);

        return targetDate >= startDate && targetDate <= endDate;
      });

      if (activeLeave) {
        let leaveTypeLabel = '';
        switch (activeLeave.request_type) {
          case 'vacation':
            leaveTypeLabel = 'Ferie';
            break;
          case 'rol':
            leaveTypeLabel = 'ROL';
            break;
          case 'sick_leave':
            leaveTypeLabel = 'Malattia';
            break;
        }

        return {
          worker,
          isAvailable: false,
          reason: `${leaveTypeLabel}${activeLeave.reason ? ` - ${activeLeave.reason}` : ''}`,
          leaveType: activeLeave.request_type,
          endDate: activeLeave.end_date || undefined,
        };
      }

      return {
        worker,
        isAvailable: true,
      };
    });

    setAvailability(availabilityData);
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];

    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const isDateInLeave = (workerId: string, date: Date) => {
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);

    return leaveRequests.some(request => {
      if (request.worker_id !== workerId) return false;

      const startDate = new Date(request.start_date!);
      const endDate = new Date(request.end_date!);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);

      return checkDate >= startDate && checkDate <= endDate;
    });
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'long',
    });
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      active: 'bg-green-100 text-green-800',
      on_break: 'bg-orange-100 text-orange-800',
      off_site: 'bg-gray-100 text-gray-800',
    };
    const labels = {
      active: 'Attivo',
      on_break: 'In Pausa',
      off_site: 'Fuori Sede',
    };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badges[status as keyof typeof badges]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const days = getDaysInMonth();
  const monthName = currentDate.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Calendario Disponibilità</h1>
        <p className="text-gray-600 mt-1">Visualizza lo stato di disponibilità del personale</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 capitalize">{monthName}</h2>
            <div className="flex space-x-2">
              <button
                onClick={previousMonth}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={nextMonth}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 mb-4">
            {['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'].map(day => (
              <div key={day} className="text-center text-sm font-semibold text-gray-600">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {days.map((day, index) => {
              if (!day) {
                return <div key={`empty-${index}`} />;
              }

              const isToday = day.toDateString() === new Date().toDateString();
              const isSelected = day.toDateString() === selectedDate.toDateString();
              const workersOnLeave = workers.filter(worker => isDateInLeave(worker.id, day));

              return (
                <button
                  key={index}
                  onClick={() => setSelectedDate(day)}
                  className={`aspect-square p-2 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                    isSelected
                      ? 'bg-blue-600 border-blue-700 text-white'
                      : isToday
                      ? 'bg-blue-100 border-blue-500'
                      : workersOnLeave.length > 0
                      ? 'bg-red-50 border-red-200 hover:bg-red-100'
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <div className={`text-sm font-medium mb-1 ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                    {day.getDate()}
                  </div>
                  {workersOnLeave.length > 0 && (
                    <div className={`text-xs font-medium ${isSelected ? 'text-blue-100' : 'text-red-600'}`}>
                      {workersOnLeave.length} assente{workersOnLeave.length > 1 ? 'i' : ''}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-gray-900">
              {selectedDate.toDateString() === new Date().toDateString()
                ? 'Stato Attuale (Oggi)'
                : selectedDate.toLocaleDateString('it-IT', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })
              }
            </h2>
          </div>
          <div className="space-y-3">
            {availability.map(({ worker, isAvailable, reason, leaveType, endDate }) => (
              <div
                key={worker.id}
                className={`p-3 rounded-lg border ${
                  isAvailable
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                      {worker.full_name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <p className="font-medium text-gray-900 text-sm">{worker.full_name}</p>
                  </div>
                  {isAvailable ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600" />
                  )}
                </div>
                <div className="mt-2">
                  {getStatusBadge(worker.status)}
                </div>
                {!isAvailable && (
                  <div className="mt-2 text-xs text-gray-700">
                    <p className="font-medium">{reason}</p>
                    {endDate && (
                      <p className="text-gray-500 mt-1">Fino al {formatDate(endDate)}</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="space-y-2 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-50 border border-green-200 rounded"></div>
                <span className="text-gray-700">Disponibile</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-red-50 border border-red-200 rounded"></div>
                <span className="text-gray-700">Non disponibile</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-blue-100 border border-blue-500 rounded"></div>
                <span className="text-gray-700">Oggi</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start space-x-3">
          <Calendar className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-gray-700">
            <p className="font-semibold mb-1">Informazioni:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Il calendario mostra solo le richieste approvate</li>
              <li>Il personale in ferie, ROL o malattia è contrassegnato in rosso</li>
              <li>Lo stato attuale mostra la disponibilità di oggi</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
