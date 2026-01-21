import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Calendar, Plus, Trash2, Building2, User, Clock, Edit, Truck, Users, Check } from 'lucide-react';
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
  const [showWorkerDropdown, setShowWorkerDropdown] = useState(false);

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
    multi_select_mode: false,
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

      if (editingId) {
        // Modifica singola assegnazione
        const { error } = await supabase
          .from('assignments')
          .update({ ...baseAssignmentData, worker_id: formData.worker_id })
          .eq('id', editingId);

        if (error) throw error;
      } else if (formData.multi_select_mode && formData.worker_ids.length > 0) {
        // Crea assegnazioni multiple
        const assignments = formData.worker_ids.map(workerId => ({
          ...baseAssignmentData,
          worker_id: workerId,
          created_by: user?.id,
        }));

        const { error } = await supabase
          .from('assignments')
          .insert(assignments);

        if (error) throw error;

        // Notifica tutti i lavoratori
        const worksite = worksites.find(w => w.id === formData.worksite_id);
        if (worksite) {
          for (const workerId of formData.worker_ids) {
            await notifyNewAssignment(workerId, worksite.name, '');
          }
        }
      } else {
        // Crea singola assegnazione
        const { data: newAssignment, error } = await supabase
          .from('assignments')
          .insert({
            ...baseAssignmentData,
            worker_id: formData.worker_id,
            created_by: user?.id,
          })
          .select()
          .single();

        if (error) throw error;

        if (newAssignment) {
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
      multi_select_mode: false,
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
      multi_select_mode: false,
    });
    setShowWorkerDropdown(false);
  };

  const toggleWorkerSelection = (workerId: string) => {
    setFormData(prev => ({
      ...prev,
      worker_ids: prev.worker_ids.includes(workerId)
        ? prev.worker_ids.filter(id => id !== workerId)
        : [...prev.worker_ids, workerId]
    }));
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('it-IT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const changeDate = (days: number) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + days);
    setSelectedDate(date.toISOString().split('T')[0]);
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
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold text-gray-900">Assegnazioni</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Gestisci le assegnazioni dei lavoratori ai cantieri</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-900 to-blue-700 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg hover:from-blue-800 hover:to-blue-600 transition-all w-full sm:w-auto"
        >
          <Plus className="w-5 h-5" />
          <span>Nuova Assegnazione</span>
        </button>
      </div>

      {/* Date Navigation */}
      <div className="bg-white rounded-xl shadow-md p-3 sm:p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => changeDate(-1)}
            className="px-3 sm:px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-sm sm:text-base"
          >
            ← Giorno
          </button>
          <div className="text-center">
            <p className="text-base sm:text-lg font-semibold text-gray-900 capitalize">
              {formatDate(selectedDate)}
            </p>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="mt-1 text-xs sm:text-sm text-blue-600 border-none focus:ring-0 cursor-pointer bg-transparent"
            />
          </div>
          <button
            onClick={() => changeDate(1)}
            className="px-3 sm:px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-sm sm:text-base"
          >
            Giorno →
          </button>
        </div>
      </div>

      {/* Assignments Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {assignments.length === 0 ? (
          <div className="col-span-full text-center py-8 sm:py-12 bg-white rounded-xl shadow-md">
            <Calendar className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Nessuna assegnazione per questa data</p>
          </div>
        ) : (
          assignments.map((assignment) => (
            <div key={assignment.id} className="bg-white rounded-xl shadow-md p-4 sm:p-5">
              <div className="flex justify-between items-start mb-3 sm:mb-4">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    {assignment.worker.avatar_url ? (
                      <img
                        src={assignment.worker.avatar_url}
                        alt={assignment.worker.full_name}
                        className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover"
                      />
                    ) : (
                      <User className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">{assignment.worker.full_name}</h3>
                    <p className="text-xs sm:text-sm text-gray-600 truncate">{assignment.worker.position || 'Operaio'}</p>
                  </div>
                </div>
                <div className="flex space-x-1 flex-shrink-0">
                  <button
                    onClick={() => handleEdit(assignment)}
                    className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Edit className="w-4 h-4 text-gray-600" />
                  </button>
                  <button
                    onClick={() => handleDelete(assignment.id)}
                    className="p-1.5 sm:p-2 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-start space-x-2">
                  <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm text-gray-600">Cantiere</p>
                    <p className="font-medium text-gray-900 text-sm sm:text-base truncate">{assignment.worksite.name}</p>
                    <p className="text-xs sm:text-sm text-gray-600 truncate">{assignment.worksite.address}</p>
                  </div>
                </div>

                {assignment.start_time && (
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0" />
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600">Orario</p>
                      <p className="font-medium text-gray-900 text-sm sm:text-base">
                        {assignment.start_time.substring(0, 5)} - {assignment.end_time?.substring(0, 5) || '...'}
                      </p>
                    </div>
                  </div>
                )}

                {assignment.has_double_site && assignment.second_worksite && (
                  <>
                    <div className="border-t border-gray-200 my-2 sm:my-3 pt-2 sm:pt-3"></div>
                    <div className="flex items-start space-x-2">
                      <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm text-gray-600">Cantiere Pomeridiano</p>
                        <p className="font-medium text-gray-900 text-sm sm:text-base truncate">{assignment.second_worksite.name}</p>
                      </div>
                    </div>
                  </>
                )}

                {assignment.vehicle && (
                  <div className="flex items-center space-x-2">
                    <Truck className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0" />
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600">Furgone</p>
                      <p className="font-medium text-gray-900 text-sm sm:text-base">{assignment.vehicle.plate}</p>
                    </div>
                  </div>
                )}

                {assignment.instructions && (
                  <div className="mt-2 sm:mt-3 p-2 sm:p-3 bg-blue-50 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">Istruzioni</p>
                    <p className="text-xs sm:text-sm text-gray-900 line-clamp-2">{assignment.instructions}</p>
                  </div>
                )}

                <div className="pt-2 sm:pt-3 border-t border-gray-200">
                  {assignment.confirmed ? (
                    <span className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      ✓ Confermato
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      In Attesa
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
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">
              {editingId ? 'Modifica Assegnazione' : 'Nuova Assegnazione'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Toggle Multi-Select Mode (solo per nuove assegnazioni) */}
              {!editingId && (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">Assegnazione multipla</span>
                  <button
                    type="button"
                    onClick={() => setFormData({ 
                      ...formData, 
                      multi_select_mode: !formData.multi_select_mode,
                      worker_id: '',
                      worker_ids: []
                    })}
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      formData.multi_select_mode ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                        formData.multi_select_mode ? 'translate-x-5' : ''
                      }`}
                    />
                  </button>
                </div>
              )}

              {/* Single Worker Select */}
              {!formData.multi_select_mode && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Personale *
                  </label>
                  <select
                    value={formData.worker_id}
                    onChange={(e) => setFormData({ ...formData, worker_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required={!formData.multi_select_mode}
                  >
                    <option value="">Seleziona personale</option>
                    {workers.map((worker) => (
                      <option key={worker.id} value={worker.id}>
                        {worker.full_name} {worker.position && `- ${worker.position}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Multi Worker Select */}
              {formData.multi_select_mode && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Personale * ({formData.worker_ids.length} selezionati)
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowWorkerDropdown(!showWorkerDropdown)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-left flex items-center justify-between"
                    >
                      <span className="text-gray-700">
                        {formData.worker_ids.length === 0
                          ? 'Seleziona personale...'
                          : `${formData.worker_ids.length} selezionati`}
                      </span>
                      <Users className="w-4 h-4 text-gray-500" />
                    </button>
                    
                    {showWorkerDropdown && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        <div className="p-2 border-b border-gray-200">
                          <button
                            type="button"
                            onClick={() => {
                              if (formData.worker_ids.length === workers.length) {
                                setFormData({ ...formData, worker_ids: [] });
                              } else {
                                setFormData({ ...formData, worker_ids: workers.map(w => w.id) });
                              }
                            }}
                            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                          >
                            {formData.worker_ids.length === workers.length ? 'Deseleziona tutti' : 'Seleziona tutti'}
                          </button>
                        </div>
                        {workers.map((worker) => (
                          <div
                            key={worker.id}
                            onClick={() => toggleWorkerSelection(worker.id)}
                            className={`flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-gray-100 ${
                              formData.worker_ids.includes(worker.id) ? 'bg-blue-50' : ''
                            }`}
                          >
                            <span className="text-sm text-gray-700 truncate">
                              {worker.full_name} {worker.position && `- ${worker.position}`}
                            </span>
                            {formData.worker_ids.includes(worker.id) && (
                              <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cantiere *
                </label>
                <select
                  value={formData.worksite_id}
                  onChange={(e) => setFormData({ ...formData, worksite_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

              {/* Double Site Toggle */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="double-site"
                  checked={formData.has_double_site}
                  onChange={(e) => setFormData({ ...formData, has_double_site: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="double-site" className="text-sm text-gray-700">
                  Doppio cantiere (mattina/pomeriggio)
                </label>
              </div>

              {formData.has_double_site && (
                <div className="space-y-4 p-3 bg-gray-50 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cantiere Pomeridiano
                    </label>
                    <select
                      value={formData.second_worksite_id}
                      onChange={(e) => setFormData({ ...formData, second_worksite_id: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                        Inizio PM
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
                        Fine PM
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
                  placeholder="Istruzioni opzionali per il lavoratore..."
                />
              </div>

              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                    setEditingId(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors order-2 sm:order-1"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={formData.multi_select_mode && formData.worker_ids.length === 0}
                  className="flex-1 bg-gradient-to-r from-blue-900 to-blue-700 text-white px-4 py-2 rounded-lg hover:from-blue-800 hover:to-blue-600 transition-all disabled:opacity-50 order-1 sm:order-2"
                >
                  {editingId ? 'Salva Modifiche' : formData.multi_select_mode ? `Crea ${formData.worker_ids.length} Assegnazioni` : 'Crea Assegnazione'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
