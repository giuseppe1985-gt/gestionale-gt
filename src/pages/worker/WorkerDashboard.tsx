import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Calendar, MapPin, Clock, MessageSquare, AlertCircle, Truck } from 'lucide-react';
import { Database } from '../../lib/database.types';

type Assignment = Database['public']['Tables']['assignments']['Row'] & {
  worksite: { name: string; address: string };
  vehicle?: { plate: string; details: string };
};
type Announcement = Database['public']['Tables']['announcements']['Row'];
type TimeEntry = Database['public']['Tables']['time_entries']['Row'];

export default function WorkerDashboard() {
  const { user } = useAuth();
  const [todayAssignment, setTodayAssignment] = useState<Assignment | null>(null);
  const [upcomingAssignments, setUpcomingAssignments] = useState<Assignment[]>([]);
  const [recentAnnouncements, setRecentAnnouncements] = useState<Announcement[]>([]);
  const [todayEntries, setTodayEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      const { data: todayAssign } = await supabase
        .from('assignments')
        .select('*, worksite:worksites!assignments_worksite_id_fkey(*), vehicle:vehicles(*)')
        .eq('worker_id', user.id)
        .eq('assigned_date', today)
        .maybeSingle();

      const { data: upcoming } = await supabase
        .from('assignments')
        .select('*, worksite:worksites!assignments_worksite_id_fkey(*), vehicle:vehicles(*)')
        .eq('worker_id', user.id)
        .gt('assigned_date', today)
        .lte('assigned_date', nextWeek.toISOString().split('T')[0])
        .order('assigned_date', { ascending: true })
        .limit(5);

      const { data: announcements } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      const { data: entries } = await supabase
        .from('time_entries')
        .select('*')
        .eq('worker_id', user.id)
        .gte('timestamp', `${today}T00:00:00`)
        .order('timestamp', { ascending: false });

      setTodayAssignment(todayAssign);
      setUpcomingAssignments(upcoming || []);
      setRecentAnnouncements(announcements || []);
      setTodayEntries(entries || []);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLastEntry = () => {
    if (todayEntries.length === 0) return null;
    return todayEntries[0];
  };

  const getCurrentStatus = () => {
    const lastEntry = getLastEntry();
    if (!lastEntry) return 'non_started';
    return lastEntry.entry_type;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('it-IT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  };

  const formatTime = (time: string | null) => {
    if (!time) return '';
    return time.substring(0, 5);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'important':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
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
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Benvenuto nel tuo portale lavoratore</p>
      </div>

      {todayAssignment ? (
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center space-x-2 mb-4">
            <Calendar className="w-6 h-6" />
            <h2 className="text-xl font-semibold">Assegnazione di Oggi</h2>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-blue-200 text-sm">Cantiere</p>
              <p className="text-2xl font-bold">{todayAssignment.worksite.name}</p>
            </div>
            <div className="flex items-start space-x-2">
              <MapPin className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-blue-200 text-sm">Indirizzo</p>
                <p className="text-lg">{todayAssignment.worksite.address}</p>
              </div>
            </div>
            {todayAssignment.start_time && (
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5" />
                <div>
                  <p className="text-blue-200 text-sm">Orario di Inizio</p>
                  <p className="text-lg font-medium">{formatTime(todayAssignment.start_time)}</p>
                </div>
              </div>
            )}
            {todayAssignment.vehicle && (
              <div className="flex items-center space-x-2 bg-blue-700 bg-opacity-50 rounded-lg p-3">
                <Truck className="w-6 h-6" />
                <div>
                  <p className="text-blue-200 text-sm">Furgone Assegnato</p>
                  <p className="text-2xl font-bold">{todayAssignment.vehicle.plate}</p>
                  {todayAssignment.vehicle.details && (
                    <p className="text-blue-100 text-sm">{todayAssignment.vehicle.details}</p>
                  )}
                </div>
              </div>
            )}
            {todayAssignment.instructions && (
              <div className="mt-4 bg-blue-700 bg-opacity-50 rounded-lg p-4">
                <p className="text-blue-200 text-sm mb-1">Istruzioni</p>
                <p className="text-white">{todayAssignment.instructions}</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-gray-100 rounded-xl p-6 text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">Nessuna assegnazione per oggi</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Calendar className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Prossime Assegnazioni</h2>
          </div>
          <div className="space-y-3">
            {upcomingAssignments.length === 0 ? (
              <p className="text-gray-500 text-sm py-4 text-center">
                Nessuna assegnazione nei prossimi 7 giorni
              </p>
            ) : (
              upcomingAssignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-medium text-gray-900">{assignment.worksite.name}</p>
                    <div className="flex flex-col items-end space-y-1">
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {formatDate(assignment.assigned_date)}
                      </span>
                      {assignment.confirmed ? (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                          Confermata
                        </span>
                      ) : (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                          Da Confermare
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">{assignment.worksite.address}</p>
                  {assignment.start_time && (
                    <p className="text-sm text-gray-500 mt-2">
                      Inizio: {formatTime(assignment.start_time)}
                    </p>
                  )}
                  {assignment.vehicle && (
                    <div className="mt-2 flex items-center space-x-2 text-sm text-gray-600">
                      <Truck className="w-4 h-4" />
                      <span>{assignment.vehicle.plate}</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center space-x-2 mb-4">
            <MessageSquare className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Annunci Recenti</h2>
          </div>
          <div className="space-y-3">
            {recentAnnouncements.length === 0 ? (
              <p className="text-gray-500 text-sm py-4 text-center">Nessun annuncio</p>
            ) : (
              recentAnnouncements.map((announcement) => (
                <div
                  key={announcement.id}
                  className={`border rounded-lg p-4 ${getPriorityColor(announcement.priority)}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-medium">{announcement.title}</p>
                    {announcement.priority === 'urgent' && (
                      <span className="text-xs bg-red-200 text-red-900 px-2 py-0.5 rounded font-medium">
                        URGENTE
                      </span>
                    )}
                  </div>
                  <p className="text-sm line-clamp-2">{announcement.message}</p>
                  <p className="text-xs mt-2 opacity-75">
                    {new Date(announcement.created_at).toLocaleDateString('it-IT')}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
