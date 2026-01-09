import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Users, Building2, Clock, AlertCircle, UserCheck, Coffee, Calendar } from 'lucide-react';
import { Database } from '../../lib/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type TimeEntry = Database['public']['Tables']['time_entries']['Row'];
type Assignment = Database['public']['Tables']['assignments']['Row'] & {
  worker: Profile;
  worksite: { name: string };
};

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalWorkers: 0,
    activeWorkers: 0,
    onBreak: 0,
    todayAssignments: 0,
  });
  const [recentTimeEntries, setRecentTimeEntries] = useState<(TimeEntry & { worker: Profile })[]>([]);
  const [todayAssignments, setTodayAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      const { data: workers } = await supabase
        .from('profiles')
        .select('*')
        .in('role', ['worker', 'sales_manager', 'administrator', 'org_manager', 'admin']);

      const activeCount = workers?.filter(w => w.status === 'active').length || 0;
      const onBreakCount = workers?.filter(w => w.status === 'on_break').length || 0;

      const { data: assignments } = await supabase
        .from('assignments')
        .select('*, worker:profiles!assignments_worker_id_fkey(*), worksite:worksites!assignments_worksite_id_fkey(*)')
        .eq('assigned_date', today);

      const { data: timeEntries } = await supabase
        .from('time_entries')
        .select('*, worker:profiles!time_entries_worker_id_fkey(*)')
        .gte('timestamp', `${today}T00:00:00`)
        .order('timestamp', { ascending: false })
        .limit(5);

      setStats({
        totalWorkers: workers?.length || 0,
        activeWorkers: activeCount,
        onBreak: onBreakCount,
        todayAssignments: assignments?.length || 0,
      });

      setTodayAssignments(assignments || []);
      setRecentTimeEntries(timeEntries || []);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
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

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit',
    });
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
        <h1 className="text-3xl font-bold text-gray-900">Pannello di Controllo</h1>
        <p className="text-gray-600 mt-1">Riepilogo attività e statistiche</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Totale Personale</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalWorkers}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Attivi Oggi</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.activeWorkers}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <UserCheck className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-orange-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">In Pausa</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.onBreak}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Coffee className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Assegnazioni Oggi</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.todayAssignments}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Clock className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Timbrature Recenti</h2>
          </div>
          <div className="space-y-3">
            {recentTimeEntries.length === 0 ? (
              <p className="text-gray-500 text-sm py-4 text-center">Nessuna timbratura oggi</p>
            ) : (
              recentTimeEntries.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="font-medium text-gray-900">{entry.worker.full_name}</p>
                    <p className="text-sm text-gray-600">{getEntryTypeLabel(entry.entry_type)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{formatTime(entry.timestamp)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Calendar className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Assegnazioni Oggi</h2>
          </div>
          <div className="space-y-3">
            {todayAssignments.length === 0 ? (
              <p className="text-gray-500 text-sm py-4 text-center">Nessuna assegnazione per oggi</p>
            ) : (
              todayAssignments.map((assignment) => (
                <div key={assignment.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="font-medium text-gray-900">{assignment.worker.full_name}</p>
                    <p className="text-sm text-gray-600">{assignment.worksite.name}</p>
                  </div>
                  <div className="text-right">
                    {assignment.confirmed ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Confermato
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        In Attesa
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
