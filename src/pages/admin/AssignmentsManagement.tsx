import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Calendar, Plus, Trash2, Building2, User, Clock, Edit, Truck, Check, Users } from 'lucide-react';
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
  const { user, profile } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [workers, setWorkers] = useState<Profile[]>([]);
  const [worksites, setWorksites] = useState<Worksite[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Gestionale GT non ha sistema piani - sempre attivo
  const canPerformActions = true;

  const [formData, setFormData] = useState({
    worker_id: '',
    worker_ids: [] as string[],
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

  const [showWorkerDropdown, setShowWorkerDropdown] = useState(false);

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
      const baseAssignmentData = {
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
        // In modifica, usa il singolo worker_id
        const result = await supabase
          .from('assignments')
          .update({
            ...baseAssignmentData,
            worker_id: formData.worker_id,
          })
          .eq('id', editingId);
        error = result.error;
      } else {
        // In creazione, supporta multipli lavoratori
        const workerIdsToAssign = formData.worker_ids.length > 0 
          ? formData.worker_ids 
          : (formData.worker_id ? [formData.worker_id] : []);

        if (workerIdsToAssign.length === 0) {
          alert('Seleziona almeno un lavoratore');
          return;
        }

        const assignmentsToCreate = workerIdsToAssign.map(workerId => ({
          ...baseAssignmentData,
          worker_id: workerId,
          created_by: user?.id,
        }));

        const { data: newAssignments, error: insertError } = await supabase
          .from('assignments')
          .insert(assignmentsToCreate)
          .select();

        error = insertError;

        // Invia notifiche a tutti i lavoratori assegnati
        if (!insertError && newAssignments) {
          const worksite = worksites.find(w => w.id === formData.worksite_id);
          if (worksite) {
            for (const assignment of newAssignments) {
              await notifyNewAssignment(
                assignment.worker_id,
                worksite.name,
                assignment.id
              );
            }
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
      worker_ids: [],
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
    setShowWorkerDropdown(false);
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
      worker_ids: [],
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
    setShowWorkerDropdown(false);
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
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Gestione Assegnazioni</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">Assegna personale ai cantieri</p>
        </div>
        <button
          onClick={() => {
            if (!canPerformActions) return;
            resetForm();
            setEditingId(null);
            setShowModal(true);
          }}
          disabled={!canPerformActions}
          className={`flex items-center space-x-2 bg-[#4DD0E1] text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg transition-all w-full sm:w-auto justify-center ${!canPerformActions ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gradient-to-r from-blue-900 to-blue-700-hover'}`}
        >
          <Plus className="w-5 h-5" />
          <span>Nuova Assegnazione</span>
        </button>
      </div>

      <div className="bg-white rounded-xl p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center space-x-3">
            <Calendar className="w-5 h-5 text-blue-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="flex-1 sm:flex-none px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <span className="text-gray-600 text-sm sm:text-base">{formatDate(selectedDate)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {assignments.length === 0 ? (
          <div className="col-span-2 text-center py-12 bg-white rounded-xl">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Nessuna assegnazione per questa data</p>
          </div>
        ) : (
          assignments.map((assignment) => (
            <div
              key={assignment.id}
              className="bg-white rounded-xl p-6"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-3">
                  {assignment.worker.avatar_url ? (
  <img 
    src={assignment.worker.avatar_url} 
    alt={assignment.worker.full_name}
    className="w-12 h-12 rounded-full object-cover"
  />
) : (
  <div className="w-12 h-12 bg-gradient-to-br from-[#4DD0E1] to-[#2A7A85] rounded-full flex items-center justify-center text-white font-semibold">
    {assignment.worker.full_name.split(' ').map(n => n[0]).join('')}
  </div>
)}
                  <div>
                    <h3 className="font-semibold text-gray-900">{assignment.worker.full_name}</h3>
                    <p className="text-sm text-gray-600">{assignment.worker.position}</p>
                  </div>
                </div>
                <div className="flex space-x-1">
                  <button
                    onClick={() => handleEdit(assignment)}
                    className="p-2 text-blue-500 hover:bg-[#4DD0E1]/20 rounded-lg transition-colors"
                    title="Modifica"
                  >
                    <Edit className="w-4 h-4 text-black dark:text-white" />
                  </button>
                  <button
                    onClick={() => handleDelete(assignment.id)}
                    className="p-2 text-red-600 hover:bg-red-500/20 rounded-lg transition-colors"
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
                    <div className="border-t border-gray-300 my-3 pt-3"></div>
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
                  <div className="mt-3 p-3 bg-[#4DD0E1]/20 rounded-lg border border-blue-400/30">
                    <p className="text-sm text-gray-600 mb-1">Istruzioni</p>
                    <p className="text-sm text-gray-900">{assignment.instructions}</p>
                  </div>
                )}

                <div className="pt-3 border-t border-gray-300">
                  {assignment.confirmed ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-500 text-white border border-green-500">
  ✓ Confermato
</span>
                  ) : (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white text-black dark:text-white border border-blue-400">
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
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {editingId ? 'Modifica Assegnazione' : 'Nuova Assegnazione'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* In modifica: selettore singolo, In creazione: multi-select */}
              {editingId ? (
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
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
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Personale * ({formData.worker_ids.length} selezionati)
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowWorkerDropdown(!showWorkerDropdown)}
                      className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-left bg-no-repeat bg-right bg-[length:20px] cursor-pointer"
                      style={{ backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")", backgroundPosition: "right 0.5rem center" }}
                    >
                      {formData.worker_ids.length === 0
                        ? 'Seleziona personale...'
                        : `${formData.worker_ids.length} persone selezionate`}
                    </button>
                    
                    {showWorkerDropdown && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        <div className="p-2 border-b border-gray-300">
                          <button
                            type="button"
                            onClick={() => {
                              if (formData.worker_ids.length === workers.length) {
                                setFormData({ ...formData, worker_ids: [] });
                              } else {
                                setFormData({ ...formData, worker_ids: workers.map(w => w.id) });
                              }
                            }}
                            className="text-sm text-blue-600 hover:underline"
                          >
                            {formData.worker_ids.length === workers.length ? 'Deseleziona tutti' : 'Seleziona tutti'}
                          </button>
                        </div>
                        {workers.map((worker) => (
                          <label
                            key={worker.id}
                            className="flex items-center px-4 py-2 hover:bg-gray-100 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={formData.worker_ids.includes(worker.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormData({
                                    ...formData,
                                    worker_ids: [...formData.worker_ids, worker.id],
                                  });
                                } else {
                                  setFormData({
                                    ...formData,
                                    worker_ids: formData.worker_ids.filter(id => id !== worker.id),
                                  });
                                }
                              }}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="ml-3 text-sm text-gray-900">
                              {worker.full_name} {worker.position && `- ${worker.position}`}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  {formData.worker_ids.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {formData.worker_ids.slice(0, 5).map(id => {
                        const worker = workers.find(w => w.id === id);
                        return worker ? (
                          <span
                            key={id}
                            className="inline-flex items-center px-2 py-1 text-xs bg-gradient-to-r from-blue-900 to-blue-700/20 text-blue-600 rounded-full"
                          >
                            {worker.full_name}
                            <button
                              type="button"
                              onClick={() => setFormData({
                                ...formData,
                                worker_ids: formData.worker_ids.filter(wid => wid !== id),
                              })}
                              className="ml-1 hover:text-red-400"
                            >
                              ×
                            </button>
                          </span>
                        ) : null;
                      })}
                      {formData.worker_ids.length > 5 && (
                        <span className="inline-flex items-center px-2 py-1 text-xs bg-gray-500/20 text-gray-400 rounded-full">
                          +{formData.worker_ids.length - 5} altri
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
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
                <label className="block text-sm font-medium text-gray-900 mb-1">
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
                <label className="block text-sm font-medium text-gray-900 mb-1">
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
                  <label className="block text-sm font-medium text-gray-900 mb-1">
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
                  <label className="block text-sm font-medium text-gray-900 mb-1">
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

              <div className="flex items-center space-x-2 p-3 bg-gray-100 rounded-lg">
                <input
                  type="checkbox"
                  id="double_site"
                  checked={formData.has_double_site}
                  onChange={(e) => setFormData({ ...formData, has_double_site: e.target.checked })}
                  className="w-4 h-4 text-blue-500 border-gray-300 rounded focus:ring-[#4DD0E1]"
                />
                <label htmlFor="double_site" className="text-sm font-medium text-gray-900 cursor-pointer">
                  Doppio Cantiere (mattina e pomeriggio)
                </label>
              </div>

              {formData.has_double_site && (
                <div className="space-y-4 p-4 bg-[#4DD0E1]/20 rounded-lg border border-blue-400/30">
                  <h3 className="font-semibold text-gray-900">Secondo Cantiere</h3>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">
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
                      <label className="block text-sm font-medium text-gray-900 mb-1">
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
                      <label className="block text-sm font-medium text-gray-900 mb-1">
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
                <label className="block text-sm font-medium text-gray-900 mb-1">
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
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#4DD0E1] text-white px-4 py-2 rounded-lg hover:bg-gradient-to-r from-blue-900 to-blue-700-hover transition-all"
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
