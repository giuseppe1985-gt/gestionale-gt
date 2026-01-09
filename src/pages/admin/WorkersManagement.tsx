import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { UserPlus, Search, Edit2, Trash2, Mail, Phone, Briefcase, Eye, EyeOff, FileText, Key } from 'lucide-react';
import { Database } from '../../lib/database.types';
import WorkerDetails from './WorkerDetails';

type Profile = Database['public']['Tables']['profiles']['Row'];

export default function WorkersManagement() {
  const { profile, isAdmin } = useAuth();
  const [workers, setWorkers] = useState<Profile[]>([]);
  const [filteredWorkers, setFilteredWorkers] = useState<Profile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Profile | null>(null);
  const [selectedWorker, setSelectedWorker] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordChangeWorker, setPasswordChangeWorker] = useState<Profile | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: '',
    position: '',
    role: 'worker' as 'worker' | 'administrator' | 'org_manager' | 'sales_manager',
  });

  useEffect(() => {
    loadWorkers();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = workers.filter(
        (w) =>
          w.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          w.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          w.position?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredWorkers(filtered);
    } else {
      setFilteredWorkers(workers);
    }
  }, [searchTerm, workers]);

  const loadWorkers = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      setWorkers(data || []);
      setFilteredWorkers(data || []);
    } catch (error) {
      console.error('Error loading workers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingWorker) {
        const { error } = await supabase
          .from('profiles')
          .update({
            full_name: formData.full_name,
            phone: formData.phone,
            position: formData.position,
          })
          .eq('id', editingWorker.id);

        if (error) throw error;
      } else {
        const { data: { session } } = await supabase.auth.getSession();

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-worker`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session?.access_token}`,
              'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: formData.email,
              password: formData.password,
              full_name: formData.full_name,
              phone: formData.phone,
              position: formData.position,
              role: formData.role,
              organization_id: profile?.organization_id,
            }),
          }
        );

        const result = await response.json();
        console.log('Response:', result);
        console.log('Response status:', response.status);

        if (!response.ok) {
          console.error('Error details:', result);
          throw new Error(result.error || 'Errore durante la creazione del lavoratore');
        }
      }

      setShowModal(false);
      resetForm();
      loadWorkers();
    } catch (error) {
      console.error('Error saving worker:', error);
      alert(error instanceof Error ? error.message : 'Errore durante il salvataggio del lavoratore');
    }
  };

  const handleDelete = async (workerId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo lavoratore?')) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-worker`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            worker_id: workerId,
          }),
        }
      );

      const result = await response.json();
      console.log('Delete response:', result);

      if (!response.ok) {
        console.error('Delete error details:', result);
        throw new Error(result.error || 'Errore durante l\'eliminazione del lavoratore');
      }

      loadWorkers();
    } catch (error) {
      console.error('Error deleting worker:', error);
      alert(error instanceof Error ? error.message : 'Errore durante l\'eliminazione del lavoratore');
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!passwordChangeWorker || !newPassword) return;
    if (newPassword.length < 6) {
      alert('La password deve essere di almeno 6 caratteri');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();

      console.log('Current user role:', profile?.role);
      console.log('Is admin:', isAdmin);

      if (!session?.access_token) {
        throw new Error('Session non valida. Riprova ad effettuare il login.');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/change-password`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: passwordChangeWorker.id,
            new_password: newPassword,
          }),
        }
      );

      const result = await response.json();
      console.log('Change password response:', result);

      if (!response.ok) {
        throw new Error(result.error || `Errore durante il cambio password (${response.status})`);
      }

      alert('Password modificata con successo');
      setShowPasswordModal(false);
      setPasswordChangeWorker(null);
      setNewPassword('');
      setShowNewPassword(false);
    } catch (error) {
      console.error('Error changing password:', error);
      alert(error instanceof Error ? error.message : 'Errore durante il cambio password');
    }
  };

  const openPasswordModal = (worker: Profile) => {
    setPasswordChangeWorker(worker);
    setNewPassword('');
    setShowNewPassword(false);
    setShowPasswordModal(true);
  };

  const openEditModal = (worker: Profile) => {
    setEditingWorker(worker);
    setFormData({
      email: worker.email,
      password: '',
      full_name: worker.full_name,
      phone: worker.phone || '',
      position: worker.position || '',
      role: worker.role as 'worker' | 'administrator' | 'org_manager' | 'sales_manager',
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingWorker(null);
    setShowPassword(false);
    setFormData({
      email: '',
      password: '',
      full_name: '',
      phone: '',
      position: '',
      role: 'worker',
    });
  };

  const getRoleLabel = (role: string) => {
    const labels = {
      worker: 'Operaio',
      administrator: 'Amministratore',
      org_manager: 'Responsabile Organizzazione',
      sales_manager: 'Responsabile Commerciale',
      admin: 'Admin',
    };
    return labels[role as keyof typeof labels] || role;
  };

  const getRoleBadge = (role: string) => {
    const badges = {
      worker: 'bg-blue-100 text-blue-800',
      administrator: 'bg-purple-100 text-purple-800',
      org_manager: 'bg-green-100 text-green-800',
      sales_manager: 'bg-orange-100 text-orange-800',
      admin: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badges[role as keyof typeof badges]}`}>
        {getRoleLabel(role)}
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestione Lavoratori</h1>
          <p className="text-gray-600 mt-1">Aggiungi, modifica e gestisci i lavoratori</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center space-x-2 bg-gradient-to-r from-blue-900 to-blue-700 text-white px-6 py-3 rounded-lg hover:from-blue-800 hover:to-blue-600 transition-all shadow-lg"
        >
          <UserPlus className="w-5 h-5" />
          <span>Aggiungi Lavoratore</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-md p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Cerca per nome, email o posizione..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Lavoratore
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contatti
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ruolo
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Posizione
                </th>
                <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Azioni
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredWorkers.map((worker) => (
                <tr key={worker.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                        {worker.full_name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className="ml-4">
                        <p className="font-medium text-gray-900">{worker.full_name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center text-sm text-gray-600">
                        <Mail className="w-4 h-4 mr-2" />
                        {worker.email}
                      </div>
                      {worker.phone && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Phone className="w-4 h-4 mr-2" />
                          {worker.phone}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">{getRoleBadge(worker.role)}</td>
                  <td className="px-6 py-4">
                    {worker.position && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Briefcase className="w-4 h-4 mr-2" />
                        {worker.position}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => setSelectedWorker(worker)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Visualizza dettagli"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(worker)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Modifica informazioni"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => openPasswordModal(worker)}
                          className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                          title="Cambia password"
                        >
                          <Key className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(worker.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Elimina lavoratore"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedWorker && (
        <WorkerDetails
          worker={selectedWorker}
          onClose={() => setSelectedWorker(null)}
        />
      )}

      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Cambia Password
            </h2>
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>Utente:</strong> {passwordChangeWorker?.full_name}
              </p>
              <p className="text-sm text-blue-800 mt-1">
                {passwordChangeWorker?.email}
              </p>
            </div>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nuova Password *
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    minLength={6}
                    placeholder="Inserisci la nuova password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                    tabIndex={-1}
                  >
                    {showNewPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  La password deve essere di almeno 6 caratteri
                </p>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordChangeWorker(null);
                    setNewPassword('');
                    setShowNewPassword(false);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-yellow-600 to-yellow-500 text-white px-4 py-2 rounded-lg hover:from-yellow-500 hover:to-yellow-400 transition-all"
                >
                  Cambia Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {editingWorker ? 'Modifica Lavoratore' : 'Aggiungi Lavoratore'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              {!editingWorker && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                        minLength={6}
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                        tabIndex={-1}
                      >
                        {showPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefono
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Posizione
                </label>
                <input
                  type="text"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="es. Operaio, Capocantiere, ecc."
                />
              </div>

              {!editingWorker && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ruolo *
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        role: e.target.value as 'worker' | 'administrator' | 'org_manager' | 'sales_manager',
                      })
                    }
                    className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-no-repeat bg-right bg-[length:20px] cursor-pointer"
                    style={{ backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")", backgroundPosition: "right 0.5rem center" }}
                    required
                  >
                    <option value="worker">Operaio</option>
                    <option value="administrator">Amministratore</option>
                    <option value="org_manager">Responsabile Organizzazione</option>
                    <option value="sales_manager">Responsabile Commerciale</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Seleziona il ruolo del dipendente. I permessi specifici saranno configurati successivamente.
                  </p>
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-blue-900 to-blue-700 text-white px-4 py-2 rounded-lg hover:from-blue-800 hover:to-blue-600 transition-all"
                >
                  {editingWorker ? 'Aggiorna' : 'Aggiungi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
