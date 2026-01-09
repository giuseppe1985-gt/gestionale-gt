import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Clock, Play, Pause, StopCircle, Coffee } from 'lucide-react';
import { Database } from '../../lib/database.types';

type TimeEntry = Database['public']['Tables']['time_entries']['Row'];

export default function TimeTracking() {
  const { user } = useAuth();
  const [todayEntries, setTodayEntries] = useState<TimeEntry[]>([]);
  const [currentStatus, setCurrentStatus] = useState<string>('not_started');
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    if (user) {
      loadTodayEntries();
    }
  }, [user]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const loadTodayEntries = async () => {
    if (!user) return;

    try {
      const today = new Date().toISOString().split('T')[0];

      const { data } = await supabase
        .from('time_entries')
        .select('*')
        .eq('worker_id', user.id)
        .gte('timestamp', `${today}T00:00:00`)
        .order('timestamp', { ascending: true });

      setTodayEntries(data || []);

      if (data && data.length > 0) {
        const lastEntry = data[data.length - 1];
        setCurrentStatus(lastEntry.entry_type);
      } else {
        setCurrentStatus('not_started');
      }
    } catch (error) {
      console.error('Error loading time entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClockEntry = async (entryType: string) => {
    if (!user) return;

    try {
      const { error } = await supabase.from('time_entries').insert({
        worker_id: user.id,
        entry_type: entryType as 'work_start' | 'lunch_start' | 'lunch_end' | 'work_end',
        timestamp: new Date().toISOString(),
      });

      if (error) throw error;

      await supabase
        .from('profiles')
        .update({
          status: entryType === 'work_start' || entryType === 'lunch_end' ? 'active' : entryType === 'lunch_start' ? 'on_break' : 'off_site'
        })
        .eq('id', user.id);

      loadTodayEntries();
    } catch (error) {
      console.error('Error creating time entry:', error);
      alert('Errore durante la timbratura');
    }
  };

  const getEntryStatus = (entryType: string) => {
    const hasEntry = todayEntries.some(entry => entry.entry_type === entryType);
    return hasEntry;
  };

  const canClockEntry = (entryType: string) => {
    const hasWorkStart = getEntryStatus('work_start');
    const hasLunchStart = getEntryStatus('lunch_start');
    const hasLunchEnd = getEntryStatus('lunch_end');
    const hasWorkEnd = getEntryStatus('work_end');

    switch (entryType) {
      case 'work_start':
        return !hasWorkStart;
      case 'lunch_start':
        return hasWorkStart && !hasLunchStart && !hasWorkEnd;
      case 'lunch_end':
        return hasLunchStart && !hasLunchEnd && !hasWorkEnd;
      case 'work_end':
        return hasWorkStart && hasLunchEnd && !hasWorkEnd;
      default:
        return false;
    }
  };

  const timeActions = [
    {
      type: 'work_start',
      label: 'Arrivo Cantiere',
      icon: Play,
      color: 'from-green-600 to-green-700',
      hoverColor: 'hover:from-green-500 hover:to-green-600',
      description: 'Inizia la giornata lavorativa',
    },
    {
      type: 'lunch_start',
      label: 'Inizio Pausa Pranzo',
      icon: Coffee,
      color: 'from-orange-600 to-orange-700',
      hoverColor: 'hover:from-orange-500 hover:to-orange-600',
      description: 'Inizia la pausa pranzo',
    },
    {
      type: 'lunch_end',
      label: 'Fine Pausa Pranzo',
      icon: Play,
      color: 'from-blue-600 to-blue-700',
      hoverColor: 'hover:from-blue-500 hover:to-blue-600',
      description: 'Riprendi il lavoro',
    },
    {
      type: 'work_end',
      label: 'Partenza da Cantiere',
      icon: StopCircle,
      color: 'from-red-600 to-red-700',
      hoverColor: 'hover:from-red-500 hover:to-red-600',
      description: 'Termina la giornata lavorativa',
    },
  ];

  const getEntryTypeLabel = (type: string) => {
    const labels = {
      work_start: 'Inizio Lavoro',
      lunch_start: 'Inizio Pausa',
      lunch_end: 'Fine Pausa',
      work_end: 'Fine Lavoro',
    };
    return labels[type as keyof typeof labels] || type;
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calculateTotalHours = () => {
    let workStart: Date | null = null;
    let lunchStart: Date | null = null;
    let lunchEnd: Date | null = null;
    let workEnd: Date | null = null;

    todayEntries.forEach((entry) => {
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

    if (!workStart) return null;

    const endTime = workEnd || currentTime;
    let totalMinutes = (endTime.getTime() - workStart.getTime()) / (1000 * 60);

    if (lunchStart && lunchEnd) {
      const lunchMinutes = (lunchEnd.getTime() - lunchStart.getTime()) / (1000 * 60);
      totalMinutes -= lunchMinutes;
    } else if (lunchStart && !lunchEnd && !workEnd) {
      const lunchMinutes = (currentTime.getTime() - lunchStart.getTime()) / (1000 * 60);
      totalMinutes -= lunchMinutes;
    }

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
        <h1 className="text-3xl font-bold text-gray-900">Timbratura</h1>
        <p className="text-gray-600 mt-1">Seleziona l'azione da registrare</p>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="mb-6 text-center">
          <Clock className="w-12 h-12 mx-auto text-gray-400 mb-3" />
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            {currentTime.toLocaleDateString('it-IT', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </h2>
          <p className="text-3xl font-bold text-blue-600">
            {currentTime.toLocaleTimeString('it-IT', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </p>
        </div>

        {todayEntries.length > 0 && calculateTotalHours() && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg text-center">
            <p className="text-sm text-gray-600 mb-1">Ore Lavorate Oggi</p>
            <p className="text-2xl font-bold text-blue-900">{calculateTotalHours()}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {timeActions.map((action) => {
            const isCompleted = getEntryStatus(action.type);
            const canClick = canClockEntry(action.type);
            const ActionIcon = action.icon;

            return (
              <button
                key={action.type}
                onClick={() => canClick && handleClockEntry(action.type)}
                disabled={!canClick}
                className={`relative p-6 rounded-xl border-2 transition-all ${
                  isCompleted
                    ? 'bg-gray-50 border-gray-300 cursor-not-allowed'
                    : canClick
                    ? `bg-gradient-to-r ${action.color} ${action.hoverColor} border-transparent text-white shadow-lg transform hover:scale-105`
                    : 'bg-gray-100 border-gray-200 cursor-not-allowed opacity-50'
                }`}
              >
                {isCompleted && (
                  <div className="absolute top-3 right-3 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}

                <div className="flex flex-col items-center text-center">
                  <ActionIcon className={`w-10 h-10 mb-3 ${isCompleted ? 'text-gray-400' : canClick ? 'text-white' : 'text-gray-400'}`} />
                  <h3 className={`text-lg font-bold mb-1 ${isCompleted ? 'text-gray-500' : canClick ? 'text-white' : 'text-gray-400'}`}>
                    {action.label}
                  </h3>
                  <p className={`text-sm ${isCompleted ? 'text-gray-400' : canClick ? 'text-white/80' : 'text-gray-400'}`}>
                    {isCompleted ? 'Completato' : action.description}
                  </p>
                  {isCompleted && todayEntries.find(e => e.entry_type === action.type) && (
                    <p className="text-sm font-semibold text-gray-600 mt-2">
                      {formatTime(todayEntries.find(e => e.entry_type === action.type)!.timestamp)}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {getEntryStatus('work_end') && (
          <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg border-2 border-green-200 text-center">
            <p className="text-green-900 font-semibold">Giornata lavorativa completata</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Timbrature di Oggi</h3>
        <div className="space-y-3">
          {todayEntries.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Nessuna timbratura registrata oggi</p>
          ) : (
            todayEntries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{getEntryTypeLabel(entry.entry_type)}</p>
                    <p className="text-sm text-gray-600">
                      {new Date(entry.timestamp).toLocaleDateString('it-IT')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-gray-900">{formatTime(entry.timestamp)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
