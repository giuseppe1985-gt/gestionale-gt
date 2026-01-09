import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Calendar, Plus, Trash2, Building2, User, Clock, Edit, Truck } from 'lucide-react';
import { Database } from '../../lib/database.types';
import { notifyNewAssignment } from '../../lib/notifications';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Worksite = Database['public']['Tables']['worksites']['Row'];
type Vehicle = Database['public']['Tables']['vehicles']['Row'];
type Assignment = Database['public']['Tables']['assignments']['Row'] & {
  worker: Profile;
  worksite: Worksite;
  second_worksite?: Worksite;
  vehicle?: Vehicle;
};

export default function AssignmentsManagement() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [workers, setWorkers] = useState<Profile[]>([]);
  const [worksites, setWorksites] = useState<Worksite[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    worker_id: '',
    worksite_id: '',
    vehicle_id: '',
    assigned_date: new Date().toISOString().split('T')[0],
    start_time: '08:00',
    end_time: '17:00',
    has_double_site: false,
    second_worksite_id: '',
    second_start_time: '14:00',
    second_end_time: '18:00',
    instructions: '',
  });

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  const loadData = async () => {
    try {
      const { data: workersData } = await supabase
        .from('profiles')
        .select('*')
        .in('role', ['worker', 'sales_manager', 'administrator', 'org_manager', 'admin'])
        .order('full_name');

      const { data: worksitesData } = await supabase
        .from('worksites')
        .select('*')
        .order('name');

      const { data: vehiclesData } = await supabase
        .from('vehicles')
        .select('*')
        .order('plate');

      const { data: assignmentsData } = await supabase
        .from('assignments')
        .select('*, worker:profiles!assignments_worker_id_fkey(*), worksite:worksites!assignments_worksite_id_fkey(*), second_worksite:worksites!assignments_second_worksite_id_fkey(*), vehicle:vehicles(*)')
        .eq('assigned_date', selectedDate)
        .order('created_at', { ascending: false });

      setWorkers(workersData || []);
      setWorksites(worksitesData || []);
      setVehicles(vehiclesData || []);
      setAssignments(assignmentsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const assignmentData = {
        worker_id: formData.worker_id,
        worksite_id: formData.worksite_id,
        vehicle_id: formData.vehicle_id || null,
        assigned_date: formData.assigned_date,
        start_time: formData.start_time,
        end_time: formData.end_time,
        has_double_site: formData.has_double_site,
        second_worksite_id: formData.has_double_site ? formData.second_worksite_id : null,
        second_start_time: formData.has_double_site ? formData.second_start_time : null,
        second_end_time: formData.has_double_site ? formData.second_end_time : null,
        instructions: formData.instructions,
      };

      let error;

      if (editingId) {
        const result = await supabase
          .from('assignments')
          .update(assignmentData)
          .eq('id', editingId);
        error = result.error;
      } else {
        const { data: newAssignment, error: insertError } = await supabase
          .from('assignments')
          .insert({
            ...assignmentData,
            created_by: user?.id,
          })
          .select()
          .single();

        error = insertError;

        if (!insertError && newAssignment) {
          const worksite = worksites.find(w => w.id === formData.worksite_id);
          if (worksite) {
            await notifyNewAssignment(
              formData.worker_id,
              worksite.name,
              newAssignment.id
            );
          }
        }
      }

      if (error) throw error;

      setShowModal(false);
      resetForm();
      setEditingId(null);
      loadData();
    } catch (error) {
      console.error('Error saving assignment:', error);
      alert('Errore durante il salvataggio dell\'assegnazione');
    }
  };

  const handleEdit = (assignment: Assignment) => {
    setFormData({
      worker_id: assignment.worker_id,
      worksite_id: assignment.worksite_id,
      vehicle_id: assignment.vehicle_id || '',
      assigned_date: assignment.assigned_date,
      start_time: assignment.start_time || '08:00',
      end_time: assignment.end_time || '17:00',
      has_double_site: assignment.has_double_site || false,
      second_worksite_id: assignment.second_worksite_id || '',
      second_start_time: assignment.second_start_time || '14:00',
      second_end_time: assignment.second_end_time || '18:00',
      instructions: assignment.instructions || '',
    });
    setEditingId(assignment.id);
    setShowModal(true);
  };

  const handleDelete = async (assignmentId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questa assegnazione?')) return;

    try {
      const { error } = await supabase.from('assignments').delete().eq('id', assignmentId);

      if (error) throw error;

      loadData();
    } catch (error) {
      console.error('Error deleting assignment:', error);
      alert('Errore durante l\'eliminazione dell\'assegnazione');
    }
  };

  const resetForm = () => {
    setFormData({
      worker_id: '',
      worksite_id: '',
      vehicle_id: '',
      assigned_date: selectedDate,
      start_time: '08:00',
      end_time: '17:00',
      has_double_site: false,
      second_worksite_id: '',
      second_start_time: '14:00',
      second_end_time: '18:00',
      instructions: '',
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestione Assegnazioni</h1>
          <p className="text-gray-600 mt-1">Assegna personale ai cantieri</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setEditingId(null);
            setShowModal(true);
          }}
          className="flex items-center space-x-2 bg-gradient-to-r from-blue-900 to-blue-700 text-white px-6 py-3 rounded-lg hover:from-blue-800 hover:to-blue-600 transition-all shadow-lg"
        >
          <Plus className="w-5 h-5" />
          <span>Nuova Assegnazione</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-md p-4">
        <div className="flex items-center space-x-3">
          <Calendar className="w-5 h-5 text-blue-600" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <span className="text-gray-600">{formatDate(selectedDate)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {assignments.length === 0 ? (
          <div className="col-span-2 text-center py-12 bg-white rounded-xl shadow-md">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Nessuna assegnazione per questa data</p>
          </div>
        ) : (
          assignments.map((assignment) => (
            <div
              key={assignment.id}
              className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {assignment.worker.full_name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{assignment.worker.full_name}</h3>
                    <p className="text-sm text-gray-600">{assignment.worker.position}</p>
                  </div>
                </div>
                <div className="flex space-x-1">
                  <button
                    onClick={() => handleEdit(assignment)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Modifica"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(assignment.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Elimina"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-start space-x-2">
                  <Building2 className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-600">Cantiere {assignment.has_double_site ? 'Mattutino' : ''}</p>
                    <p className="font-medium text-gray-900">{assignment.worksite.name}</p>
                    <p className="text-sm text-gray-600">{assignment.worksite.address}</p>
                  </div>
                </div>

                {assignment.start_time && (
                  <div className="flex items-center space-x-2">
                    <Clock className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">Orario</p>
                      <p className="font-medium text-gray-900">
                        {assignment.start_time.substring(0, 5)} - {assignment.end_time?.substring(0, 5) || '...'}
                      </p>
                    </div>
                  </div>
                )}

                {assignment.has_double_site && assignment.second_worksite && (
                  <>
                    <div className="border-t border-gray-200 my-3 pt-3"></div>
                    <div className="flex items-start space-x-2">
                      <Building2 className="w-5 h-5 text-blue-500 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-gray-600">Cantiere Pomeridiano</p>
                        <p className="font-medium text-gray-900">{assignment.second_worksite.name}</p>
                        <p className="text-sm text-gray-600">{assignment.second_worksite.address}</p>
                      </div>
                    </div>

                    {assignment.second_start_time && (
                      <div className="flex items-center space-x-2">
                        <Clock className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-600">Orario</p>
                          <p className="font-medium text-gray-900">
                            {assignment.second_start_time.substring(0, 5)} - {assignment.second_end_time?.substring(0, 5) || '...'}
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {assignment.vehicle && (
                  <div className="flex items-center space-x-2">
                    <Truck className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">Furgone</p>
                      <p className="font-medium text-gray-900">{assignment.vehicle.plate}</p>
                    </div>
                  </div>
                )}

                {assignment.instructions && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Istruzioni</p>
                    <p className="text-sm text-gray-900">{assignment.instructions}</p>
                  </div>
                )}

                <div className="pt-3 border-t border-gray-200">
                  {assignment.confirmed ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      ✓ Confermato
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      In Attesa di Conferma
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 max-h-screen overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {editingId ? 'Modifica Assegnazione' : 'Nuova Assegnazione'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Personale *
                </label>
                <select
                  value={formData.worker_id}
                  onChange={(e) => setFormData({ ...formData, worker_id: e.target.value })}
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-no-repeat bg-right bg-[length:20px] cursor-pointer"
                  style={{ backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")", backgroundPosition: "right 0.5rem center" }}
                  required
                >
                  <option value="">Seleziona personale</option>
                  {workers.map((worker) => (
                    <option key={worker.id} value={worker.id}>
                      {worker.full_name} {worker.position && `- ${worker.position}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cantiere *
                </label>
                <select
                  value={formData.worksite_id}
                  onChange={(e) => setFormData({ ...formData, worksite_id: e.target.value })}
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-no-repeat bg-right bg-[length:20px] cursor-pointer"
                  style={{ backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")", backgroundPosition: "right 0.5rem center" }}
                  required
                >
                  <option value="">Seleziona cantiere</option>
                  {worksites.map((worksite) => (
                    <option key={worksite.id} value={worksite.id}>
                      {worksite.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Furgone
                </label>
                <select
                  value={formData.vehicle_id}
                  onChange={(e) => setFormData({ ...formData, vehicle_id: e.target.value })}
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-no-repeat bg-right bg-[length:20px] cursor-pointer"
                  style={{ backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")", backgroundPosition: "right 0.5rem center" }}
                >
                  <option value="">Nessun furgone</option>
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.plate} {vehicle.details && `- ${vehicle.details}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data *
                </label>
                <input
                  type="date"
                  value={formData.assigned_date}
                  onChange={(e) => setFormData({ ...formData, assigned_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ora Inizio
                  </label>
                  <input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ora Fine
                  </label>
                  <input
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                <input
                  type="checkbox"
                  id="double_site"
                  checked={formData.has_double_site}
                  onChange={(e) => setFormData({ ...formData, has_double_site: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="double_site" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Doppio Cantiere (mattina e pomeriggio)
                </label>
              </div>

              {formData.has_double_site && (
                <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h3 className="font-semibold text-gray-900">Secondo Cantiere</h3>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cantiere Pomeridiano *
                    </label>
                    <select
                      value={formData.second_worksite_id}
                      onChange={(e) => setFormData({ ...formData, second_worksite_id: e.target.value })}
                      className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-no-repeat bg-right bg-[length:20px] cursor-pointer"
                      style={{ backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")", backgroundPosition: "right 0.5rem center" }}
                      required={formData.has_double_site}
                    >
                      <option value="">Seleziona cantiere</option>
                      {worksites.map((worksite) => (
                        <option key={worksite.id} value={worksite.id}>
                          {worksite.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ora Inizio
                      </label>
                      <input
                        type="time"
                        value={formData.second_start_time}
                        onChange={(e) => setFormData({ ...formData, second_start_time: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ora Fine
                      </label>
                      <input
                        type="time"
                        value={formData.second_end_time}
                        onChange={(e) => setFormData({ ...formData, second_end_time: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Istruzioni
                </label>
                <textarea
                  value={formData.instructions}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Istruzioni speciali per il lavoratore..."
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                    setEditingId(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-blue-900 to-blue-700 text-white px-4 py-2 rounded-lg hover:from-blue-800 hover:to-blue-600 transition-all"
                >
                  {editingId ? 'Salva Modifiche' : 'Crea'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
