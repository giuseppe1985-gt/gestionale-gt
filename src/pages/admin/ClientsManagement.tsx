import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  Clock,
  CheckCircle,
  UserPlus,
  Calendar,
  MapPin,
  Briefcase,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import { Database } from '../../lib/database.types';

type Client = Database['public']['Tables']['clients']['Row'];
type Worksite = Database['public']['Tables']['worksites']['Row'];

interface ClientWithWorksite extends Client {
  worksite?: Worksite;
}

export default function ClientsManagement() {
  const { profile } = useAuth();
  const [clients, setClients] = useState<ClientWithWorksite[]>([]);
  const [worksites, setWorksites] = useState<Worksite[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [activeTab, setActiveTab] = useState<'new' | 'in_progress' | 'completed'>('new');

  const [clientForm, setClientForm] = useState({
    name: '',
    notes: '',
    survey_date: '',
    start_date: '',
    end_date: '',
    worksite_id: '',
    issues: '',
  });

  useEffect(() => {
    loadClients();
    loadWorksites();
  }, []);

  const loadClients = async () => {
    setLoading(true);
    try {
      const { data: clientsData } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (clientsData) {
        const clientsWithWorksites = await Promise.all(
          clientsData.map(async (client) => {
            if (client.worksite_id) {
              const { data: worksite } = await supabase
                .from('worksites')
                .select('*')
                .eq('id', client.worksite_id)
                .maybeSingle();

              return { ...client, worksite };
            }
            return client;
          })
        );

        setClients(clientsWithWorksites);
      }
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadWorksites = async () => {
    try {
      const { data, error } = await supabase
        .from('worksites')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error loading worksites:', error);
        return;
      }

      if (data) {
        setWorksites(data);
      }
    } catch (error) {
      console.error('Error loading worksites:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isNewClient = !editingClient || editingClient.status === 'new';
      const status = isNewClient ? 'new' : editingClient.status;

      if (editingClient) {
        await supabase
          .from('clients')
          .update({
            name: clientForm.name,
            notes: clientForm.notes,
            survey_date: clientForm.survey_date || null,
            start_date: clientForm.start_date || null,
            end_date: clientForm.end_date || null,
            worksite_id: clientForm.worksite_id || null,
            issues: clientForm.issues || null,
          })
          .eq('id', editingClient.id);
      } else {
        await supabase.from('clients').insert({
          name: clientForm.name,
          notes: clientForm.notes,
          survey_date: clientForm.survey_date || null,
          status: status,
          organization_id: profile?.organization_id!,
          created_by: profile?.id!,
        });
      }

      resetForm();
      loadClients();
    } catch (error) {
      console.error('Error saving client:', error);
      alert('Errore nel salvataggio del cliente');
    }
  };

  const handleConfirmClient = async (client: Client) => {
    if (!confirm('Confermare il cliente e spostarlo in "In Corso"?')) return;

    try {
      await supabase
        .from('clients')
        .update({ status: 'in_progress' })
        .eq('id', client.id);

      loadClients();
    } catch (error) {
      console.error('Error confirming client:', error);
    }
  };

  const handleCompleteClient = async (client: Client) => {
    if (!confirm('Segnare i lavori come finiti?')) return;

    try {
      await supabase
        .from('clients')
        .update({ status: 'completed' })
        .eq('id', client.id);

      loadClients();
    } catch (error) {
      console.error('Error completing client:', error);
    }
  };

  const handleDeleteClient = async (id: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo cliente?')) return;

    try {
      await supabase.from('clients').delete().eq('id', id);
      loadClients();
    } catch (error) {
      console.error('Error deleting client:', error);
    }
  };

  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    setClientForm({
      name: client.name,
      notes: client.notes || '',
      survey_date: client.survey_date || '',
      start_date: client.start_date || '',
      end_date: client.end_date || '',
      worksite_id: client.worksite_id || '',
      issues: client.issues || '',
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setClientForm({
      name: '',
      notes: '',
      survey_date: '',
      start_date: '',
      end_date: '',
      worksite_id: '',
      issues: '',
    });
    setShowModal(false);
    setEditingClient(null);
  };

  const filteredClients = clients.filter((c) => c.status === activeTab);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'new':
        return 'Nuovo';
      case 'in_progress':
        return 'In Corso';
      case 'completed':
        return 'Completato';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestione Clienti</h1>
          <p className="text-gray-600 mt-1">Gestisci clienti nuovi, in corso e completati</p>
        </div>
        <button
          onClick={() => {
            setEditingClient(null);
            resetForm();
            setShowModal(true);
          }}
          className="bg-gradient-to-r from-blue-900 to-blue-700 text-white px-6 py-3 rounded-lg hover:from-blue-800 hover:to-blue-600 transition-all flex items-center space-x-2 shadow-lg"
        >
          <Plus className="w-5 h-5" />
          <span>Nuovo Cliente</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-md border border-gray-200">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('new')}
            className={`flex-1 px-6 py-4 text-center font-medium transition-colors flex items-center justify-center space-x-2 ${
              activeTab === 'new'
                ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <UserPlus className="w-5 h-5" />
            <span>Clienti Nuovi</span>
            <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
              {clients.filter((c) => c.status === 'new').length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('in_progress')}
            className={`flex-1 px-6 py-4 text-center font-medium transition-colors flex items-center justify-center space-x-2 ${
              activeTab === 'in_progress'
                ? 'border-b-2 border-yellow-600 text-yellow-600 bg-yellow-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <Clock className="w-5 h-5" />
            <span>In Corso</span>
            <span className="bg-yellow-600 text-white text-xs px-2 py-1 rounded-full">
              {clients.filter((c) => c.status === 'in_progress').length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`flex-1 px-6 py-4 text-center font-medium transition-colors flex items-center justify-center space-x-2 ${
              activeTab === 'completed'
                ? 'border-b-2 border-green-600 text-green-600 bg-green-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <CheckCircle className="w-5 h-5" />
            <span>Lavori Finiti</span>
            <span className="bg-green-600 text-white text-xs px-2 py-1 rounded-full">
              {clients.filter((c) => c.status === 'completed').length}
            </span>
          </button>
        </div>

        <div className="p-6">
          {filteredClients.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 text-lg">Nessun cliente {getStatusLabel(activeTab).toLowerCase()}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredClients.map((client) => (
                <div
                  key={client.id}
                  className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <h3 className="text-xl font-bold text-gray-900">{client.name}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(client.status)}`}>
                          {getStatusLabel(client.status)}
                        </span>
                      </div>

                      {client.notes && (
                        <div className="flex items-start space-x-2 text-gray-600 mb-2">
                          <Briefcase className="w-4 h-4 mt-1 flex-shrink-0" />
                          <p className="text-sm">{client.notes}</p>
                        </div>
                      )}

                      {client.survey_date && client.status === 'new' && (
                        <div className="flex items-center space-x-2 text-gray-600 text-sm">
                          <Calendar className="w-4 h-4" />
                          <span>Sopralluogo: {new Date(client.survey_date).toLocaleDateString('it-IT')}</span>
                        </div>
                      )}

                      {client.status === 'in_progress' && (
                        <div className="space-y-2 mt-3">
                          {client.start_date && (
                            <div className="flex items-center space-x-2 text-gray-600 text-sm">
                              <Calendar className="w-4 h-4" />
                              <span>Inizio: {new Date(client.start_date).toLocaleDateString('it-IT')}</span>
                            </div>
                          )}
                          {client.end_date && (
                            <div className="flex items-center space-x-2 text-gray-600 text-sm">
                              <Calendar className="w-4 h-4" />
                              <span>Fine: {new Date(client.end_date).toLocaleDateString('it-IT')}</span>
                            </div>
                          )}
                          {client.worksite && (
                            <div className="flex items-center space-x-2 text-gray-600 text-sm">
                              <MapPin className="w-4 h-4" />
                              <span>Cantiere: {client.worksite.name}</span>
                            </div>
                          )}
                          {client.issues && (
                            <div className="flex items-start space-x-2 text-amber-700 text-sm bg-amber-50 p-3 rounded-lg mt-3">
                              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                              <div>
                                <span className="font-medium block mb-1">Problemi ed Imprevisti:</span>
                                <p>{client.issues}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {client.status === 'completed' && (
                        <div className="space-y-2 mt-3">
                          {client.worksite && (
                            <div className="flex items-center space-x-2 text-gray-600 text-sm">
                              <MapPin className="w-4 h-4" />
                              <span>Cantiere: {client.worksite.name}</span>
                            </div>
                          )}
                          {client.end_date && (
                            <div className="flex items-center space-x-2 text-gray-600 text-sm">
                              <Calendar className="w-4 h-4" />
                              <span>Completato il: {new Date(client.end_date).toLocaleDateString('it-IT')}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      {client.status === 'new' && (
                        <>
                          <button
                            onClick={() => handleConfirmClient(client)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Conferma Cliente"
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteClient(client.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Elimina Cliente"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {client.status === 'in_progress' && (
                        <>
                          <button
                            onClick={() => handleEditClient(client)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Modifica Cliente"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleCompleteClient(client)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Segna come Completato"
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {editingClient ? 'Modifica Cliente' : 'Nuovo Cliente'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nome Cliente *</label>
                <input
                  type="text"
                  required
                  placeholder="es. Mario Rossi"
                  value={clientForm.name}
                  onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Note / Descrizione Lavori
                </label>
                <textarea
                  rows={4}
                  placeholder="Descrizione dei lavori da fare, indirizzo, note varie..."
                  value={clientForm.notes}
                  onChange={(e) => setClientForm({ ...clientForm, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {(!editingClient || editingClient.status === 'new') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Data Sopralluogo</label>
                  <input
                    type="date"
                    value={clientForm.survey_date}
                    onChange={(e) => setClientForm({ ...clientForm, survey_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}

              {editingClient && editingClient.status === 'in_progress' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Cantiere</label>
                    <select
                      value={clientForm.worksite_id}
                      onChange={(e) => setClientForm({ ...clientForm, worksite_id: e.target.value })}
                      className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-no-repeat bg-right bg-[length:20px] cursor-pointer"
                      style={{ backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")", backgroundPosition: "right 0.5rem center" }}
                    >
                      <option value="">Seleziona cantiere</option>
                      {worksites.map((ws) => (
                        <option key={ws.id} value={ws.id}>
                          {ws.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Data Inizio Lavori</label>
                      <input
                        type="date"
                        value={clientForm.start_date}
                        onChange={(e) => setClientForm({ ...clientForm, start_date: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Data Fine Lavori</label>
                      <input
                        type="date"
                        value={clientForm.end_date}
                        onChange={(e) => setClientForm({ ...clientForm, end_date: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Problemi ed Imprevisti
                    </label>
                    <textarea
                      rows={4}
                      placeholder="Descrivi eventuali problemi riscontrati durante i lavori..."
                      value={clientForm.issues}
                      onChange={(e) => setClientForm({ ...clientForm, issues: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </>
              )}

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-blue-900 to-blue-700 text-white px-4 py-2 rounded-lg hover:from-blue-800 hover:to-blue-600 transition-all"
                >
                  {editingClient ? 'Aggiorna' : 'Aggiungi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
