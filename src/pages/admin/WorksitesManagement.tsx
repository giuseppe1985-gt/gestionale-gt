import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Building2, MapPin, Plus, Edit2, Trash2, Search, Euro } from 'lucide-react';
import { Database } from '../../lib/database.types';
import WorksiteFinancials from './WorksiteFinancials';

type Worksite = Database['public']['Tables']['worksites']['Row'];

export default function WorksitesManagement() {
  const { user, profile } = useAuth();
  const [worksites, setWorksites] = useState<Worksite[]>([]);
  const [filteredWorksites, setFilteredWorksites] = useState<Worksite[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingWorksite, setEditingWorksite] = useState<Worksite | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedWorksiteFinancials, setSelectedWorksiteFinancials] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    address: '',
  });

  useEffect(() => {
    loadWorksites();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = worksites.filter(
        (w) =>
          w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          w.address.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredWorksites(filtered);
    } else {
      setFilteredWorksites(worksites);
    }
  }, [searchTerm, worksites]);

  const loadWorksites = async () => {
    try {
      const { data } = await supabase
        .from('worksites')
        .select('*')
        .order('created_at', { ascending: false });

      setWorksites(data || []);
      setFilteredWorksites(data || []);
    } catch (error) {
      console.error('Error loading worksites:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingWorksite) {
        const { error } = await supabase
          .from('worksites')
          .update({
            name: formData.name,
            address: formData.address,
          })
          .eq('id', editingWorksite.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('worksites').insert({
          name: formData.name,
          address: formData.address,
          created_by: user?.id,
          organization_id: profile?.organization_id,
        });

        if (error) throw error;
      }

      setShowModal(false);
      resetForm();
      loadWorksites();
    } catch (error) {
      console.error('Error saving worksite:', error);
      alert('Errore durante il salvataggio del cantiere');
    }
  };

  const handleDelete = async (worksiteId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo cantiere?')) return;

    try {
      const { error } = await supabase.from('worksites').delete().eq('id', worksiteId);

      if (error) throw error;

      loadWorksites();
    } catch (error) {
      console.error('Error deleting worksite:', error);
      alert('Errore durante l\'eliminazione del cantiere');
    }
  };

  const openEditModal = (worksite: Worksite) => {
    setEditingWorksite(worksite);
    setFormData({
      name: worksite.name,
      address: worksite.address,
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingWorksite(null);
    setFormData({
      name: '',
      address: '',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (selectedWorksiteFinancials) {
    return (
      <WorksiteFinancials
        worksiteId={selectedWorksiteFinancials}
        onBack={() => setSelectedWorksiteFinancials(null)}
      />
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-xl sm:text-xl sm:text-3xl font-bold text-gray-900">Gestione Cantieri</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Aggiungi e gestisci i cantieri</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-900 to-blue-700 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg hover:from-blue-800 hover:to-blue-600 transition-all shadow-lg w-full sm:w-auto"
        >
          <Plus className="w-5 h-5" />
          <span>Aggiungi Cantiere</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-md p-3 sm:p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Cerca per nome o indirizzo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-3 sm:gap-6">
        {filteredWorksites.map((worksite) => (
          <div
            key={worksite.id}
            className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-4 sm:p-6"
          >
            <div className="flex items-start justify-between mb-3 sm:mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="flex space-x-1">
                <button
                  onClick={() => setSelectedWorksiteFinancials(worksite.id)}
                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                  title="Dati Finanziari"
                >
                  <Euro className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <button
                  onClick={() => openEditModal(worksite)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <button
                  onClick={() => handleDelete(worksite.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">{worksite.name}</h3>
            <div className="flex items-start space-x-2 text-gray-600">
              <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <p className="text-xs sm:text-sm">{worksite.address}</p>
            </div>
          </div>
        ))}
      </div>

      {filteredWorksites.length === 0 && (
        <div className="text-center py-8 sm:py-8 sm:py-12">
          <Building2 className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-sm sm:text-base">Nessun cantiere trovato</p>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-4 sm:p-6">
            <h2 className="text-xl sm:text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-4 sm:mb-6">
              {editingWorksite ? 'Modifica Cantiere' : 'Aggiungi Cantiere'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome Cantiere *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Indirizzo *
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  required
                />
              </div>

              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-blue-900 to-blue-700 text-white px-4 py-2.5 rounded-lg hover:from-blue-800 hover:to-blue-600 transition-all"
                >
                  {editingWorksite ? 'Aggiorna' : 'Aggiungi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
