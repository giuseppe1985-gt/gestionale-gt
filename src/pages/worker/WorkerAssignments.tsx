import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Calendar, MapPin, Clock, CheckCircle, Building2, Truck } from 'lucide-react';
import { Database } from '../../lib/database.types';

type Assignment = Database['public']['Tables']['assignments']['Row'] & {
  worksite: { name: string; address: string };
  second_worksite?: { name: string; address: string };
  vehicle?: { plate: string; details: string };
};

export default function WorkerAssignments() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadAssignments();
    }
  }, [user]);

  const loadAssignments = async () => {
    if (!user) return;

    try {
      const today = new Date().toISOString().split('T')[0];

      const { data } = await supabase
        .from('assignments')
        .select('*, worksite:worksites!assignments_worksite_id_fkey(*), second_worksite:worksites!assignments_second_worksite_id_fkey(*), vehicle:vehicles(*)')
        .eq('worker_id', user.id)
        .gte('assigned_date', today)
        .order('assigned_date', { ascending: true });

      setAssignments(data || []);
    } catch (error) {
      console.error('Error loading assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (assignmentId: string) => {
    try {
      const { error } = await supabase
        .from('assignments')
        .update({
          confirmed: true,
          confirmed_at: new Date().toISOString(),
        })
        .eq('id', assignmentId);

      if (error) throw error;

      loadAssignments();
    } catch (error) {
      console.error('Error confirming assignment:', error);
      alert('Errore durante la conferma');
    }
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (d.toDateString() === today.toDateString()) {
      return 'Oggi';
    } else if (d.toDateString() === tomorrow.toDateString()) {
      return 'Domani';
    } else {
      return d.toLocaleDateString('it-IT', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    }
  };

  const formatTime = (time: string | null) => {
    if (!time) return '';
    return time.substring(0, 5);
  };

  const isToday = (date: string) => {
    return date === new Date().toISOString().split('T')[0];
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
        <h1 className="text-3xl font-bold text-gray-900">Le Mie Assegnazioni</h1>
        <p className="text-gray-600 mt-1">Visualizza e conferma le tue assegnazioni</p>
      </div>

      <div className="space-y-4">
        {assignments.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-md">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Nessuna assegnazione programmata</p>
          </div>
        ) : (
          assignments.map((assignment) => (
            <div
              key={assignment.id}
              className={`bg-white rounded-xl shadow-md p-6 border-l-4 ${
                isToday(assignment.assigned_date)
                  ? 'border-blue-600'
                  : 'border-gray-300'
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      isToday(assignment.assigned_date)
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {formatDate(assignment.assigned_date)}
                  </span>
                </div>
                {assignment.confirmed ? (
                  <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    <CheckCircle className="w-4 h-4" />
                    <span>Confermato</span>
                  </span>
                ) : (
                  <button
                    onClick={() => handleConfirm(assignment.id)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    Conferma
                  </button>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Cantiere {assignment.has_double_site ? 'Mattutino' : ''}</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {assignment.worksite.name}
                  </p>
                </div>

                <div className="flex items-start space-x-2">
                  <MapPin className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-600">Indirizzo</p>
                    <p className="text-gray-900">{assignment.worksite.address}</p>
                  </div>
                </div>

                {assignment.start_time && (
                  <div className="flex items-center space-x-2">
                    <Clock className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">Orario</p>
                      <p className="text-lg font-medium text-gray-900">
                        {formatTime(assignment.start_time)} - {formatTime(assignment.end_time)}
                      </p>
                    </div>
                  </div>
                )}

                {assignment.vehicle && (
                  <div className="flex items-center space-x-2 bg-gray-50 p-3 rounded-lg">
                    <Truck className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-sm text-gray-600">Furgone Assegnato</p>
                      <p className="text-lg font-bold text-gray-900">{assignment.vehicle.plate}</p>
                      {assignment.vehicle.details && (
                        <p className="text-sm text-gray-600">{assignment.vehicle.details}</p>
                      )}
                    </div>
                  </div>
                )}

                {assignment.has_double_site && assignment.second_worksite && (
                  <>
                    <div className="border-t border-gray-200 my-4 pt-4"></div>

                    <div>
                      <p className="text-sm text-gray-600">Cantiere Pomeridiano</p>
                      <p className="text-xl font-semibold text-gray-900">
                        {assignment.second_worksite.name}
                      </p>
                    </div>

                    <div className="flex items-start space-x-2">
                      <MapPin className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-gray-600">Indirizzo</p>
                        <p className="text-gray-900">{assignment.second_worksite.address}</p>
                      </div>
                    </div>

                    {assignment.second_start_time && (
                      <div className="flex items-center space-x-2">
                        <Clock className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-600">Orario</p>
                          <p className="text-lg font-medium text-gray-900">
                            {formatTime(assignment.second_start_time)} - {formatTime(assignment.second_end_time)}
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {assignment.instructions && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Istruzioni</p>
                    <p className="text-gray-900">{assignment.instructions}</p>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
