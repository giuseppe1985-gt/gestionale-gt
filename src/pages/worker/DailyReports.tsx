import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { FileText, Plus, Calendar, Clock, MapPin, Edit2, Trash2 } from 'lucide-react';

interface Worksite {
  id: string;
  name: string;
  address: string;
}

interface DailyReport {
  id: string;
  worker_id: string;
  worksite_id: string;
  report_date: string;
  report_time: string;
  description: string;
  notes: string | null;
  hours_worked: number | null;
  materials_used: string | null;
  equipment_used: string | null;
  weather_conditions: string | null;
  created_at: string;
  worksites: {
    name: string;
    address: string;
  };
}

export default function DailyReports() {
  const { profile } = useAuth();
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [worksites, setWorksites] = useState<Worksite[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingReport, setEditingReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    worksite_id: '',
    description: '',
    notes: '',
    hours_worked: '',
    materials_used: '',
    equipment_used: '',
    weather_conditions: '',
  });

  useEffect(() => {
    loadWorksites();
    loadReports();
  }, []);

  const loadWorksites = async () => {
    try {
      const { data, error } = await supabase
        .from('worksites')
        .select('id, name, address')
        .order('name');

      if (error) {
        console.error('Error loading worksites:', error);
        alert('Errore nel caricamento dei cantieri: ' + error.message);
        return;
      }

      console.log('Cantieri caricati:', data);
      setWorksites(data || []);
    } catch (error) {
      console.error('Error loading worksites:', error);
      alert('Errore nel caricamento dei cantieri');
    }
  };

  const loadReports = async () => {
    try {
      const { data } = await supabase
        .from('daily_reports')
        .select(`
          *,
          worksites (
            name,
            address
          )
        `)
        .eq('worker_id', profile?.id)
        .order('report_date', { ascending: false })
        .order('report_time', { ascending: false });

      setReports(data || []);
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingReport) {
        const { error } = await supabase
          .from('daily_reports')
          .update({
            worksite_id: formData.worksite_id,
            description: formData.description,
            notes: formData.notes || null,
            hours_worked: formData.hours_worked ? parseFloat(formData.hours_worked) : null,
            materials_used: formData.materials_used || null,
            equipment_used: formData.equipment_used || null,
            weather_conditions: formData.weather_conditions || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingReport.id);

        if (error) throw error;
      } else {
        const now = new Date();
        const { error } = await supabase.from('daily_reports').insert({
          worker_id: profile?.id,
          worksite_id: formData.worksite_id,
          organization_id: profile?.organization_id,
          report_date: now.toISOString().split('T')[0],
          report_time: now.toTimeString().split(' ')[0],
          description: formData.description,
          notes: formData.notes || null,
          hours_worked: formData.hours_worked ? parseFloat(formData.hours_worked) : null,
          materials_used: formData.materials_used || null,
          equipment_used: formData.equipment_used || null,
          weather_conditions: formData.weather_conditions || null,
        });

        if (error) throw error;
      }

      setShowModal(false);
      resetForm();
      loadReports();
    } catch (error) {
      console.error('Error saving report:', error);
      alert('Errore durante il salvataggio del rapportino');
    }
  };

  const handleDelete = async (reportId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo rapportino?')) return;

    try {
      const { error } = await supabase
        .from('daily_reports')
        .delete()
        .eq('id', reportId);

      if (error) throw error;

      loadReports();
    } catch (error) {
      console.error('Error deleting report:', error);
      alert('Errore durante l\'eliminazione del rapportino');
    }
  };

  const openEditModal = (report: DailyReport) => {
    const reportDate = new Date(report.report_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    reportDate.setHours(0, 0, 0, 0);

    if (reportDate.getTime() !== today.getTime()) {
      alert('Puoi modificare solo i rapportini di oggi');
      return;
    }

    setEditingReport(report);
    setFormData({
      worksite_id: report.worksite_id,
      description: report.description,
      notes: report.notes || '',
      hours_worked: report.hours_worked?.toString() || '',
      materials_used: report.materials_used || '',
      equipment_used: report.equipment_used || '',
      weather_conditions: report.weather_conditions || '',
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingReport(null);
    setFormData({
      worksite_id: '',
      description: '',
      notes: '',
      hours_worked: '',
      materials_used: '',
      equipment_used: '',
      weather_conditions: '',
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (timeString: string) => {
    return timeString.substring(0, 5);
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
          <h1 className="text-3xl font-bold text-gray-900">Rapportini Giornalieri</h1>
          <p className="text-gray-600 mt-1">Compila e visualizza i tuoi rapportini di lavoro</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center space-x-2 bg-gradient-to-r from-blue-900 to-blue-700 text-white px-6 py-3 rounded-lg hover:from-blue-800 hover:to-blue-600 transition-all shadow-lg"
        >
          <Plus className="w-5 h-5" />
          <span>Nuovo Rapportino</span>
        </button>
      </div>

      <div className="grid gap-6">
        {reports.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Nessun rapportino</h3>
            <p className="text-gray-600 mb-6">Non hai ancora compilato nessun rapportino giornaliero</p>
            <button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-900 to-blue-700 text-white px-6 py-3 rounded-lg hover:from-blue-800 hover:to-blue-600 transition-all"
            >
              <Plus className="w-5 h-5" />
              <span>Compila il primo rapportino</span>
            </button>
          </div>
        ) : (
          reports.map((report) => (
            <div key={report.id} className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="bg-gradient-to-r from-blue-900 to-blue-700 text-white p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4 mb-2">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-5 h-5" />
                        <span className="font-semibold">{formatDate(report.report_date)}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock className="w-5 h-5" />
                        <span>{formatTime(report.report_time)}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-5 h-5" />
                      <span className="font-medium">{report.worksites.name}</span>
                      <span className="text-blue-200">-</span>
                      <span className="text-blue-200">{report.worksites.address}</span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    {new Date(report.report_date).toDateString() === new Date().toDateString() && (
                      <button
                        onClick={() => openEditModal(report)}
                        className="p-2 hover:bg-blue-800 rounded-lg transition-colors"
                        title="Modifica rapportino"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(report.id)}
                      className="p-2 hover:bg-blue-800 rounded-lg transition-colors"
                      title="Elimina rapportino"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-gray-500 uppercase mb-2">Descrizione Lavoro</h4>
                  <p className="text-gray-900 whitespace-pre-wrap">{report.description}</p>
                </div>

                {report.hours_worked && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-500 uppercase mb-2">Ore Lavorate</h4>
                    <p className="text-gray-900">{report.hours_worked} ore</p>
                  </div>
                )}

                {report.materials_used && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-500 uppercase mb-2">Materiali Utilizzati</h4>
                    <p className="text-gray-900 whitespace-pre-wrap">{report.materials_used}</p>
                  </div>
                )}

                {report.equipment_used && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-500 uppercase mb-2">Attrezzature Utilizzate</h4>
                    <p className="text-gray-900 whitespace-pre-wrap">{report.equipment_used}</p>
                  </div>
                )}

                {report.weather_conditions && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-500 uppercase mb-2">Condizioni Meteo</h4>
                    <p className="text-gray-900">{report.weather_conditions}</p>
                  </div>
                )}

                {report.notes && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-500 uppercase mb-2">Note Aggiuntive</h4>
                    <p className="text-gray-900 whitespace-pre-wrap">{report.notes}</p>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {editingReport ? 'Modifica Rapportino' : 'Nuovo Rapportino'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cantiere *
                </label>
                {worksites.length === 0 ? (
                  <div className="w-full px-4 py-2 border border-yellow-300 bg-yellow-50 rounded-lg text-yellow-800">
                    Nessun cantiere disponibile. Contatta l'amministratore.
                  </div>
                ) : (
                  <select
                    value={formData.worksite_id}
                    onChange={(e) => setFormData({ ...formData, worksite_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Seleziona cantiere</option>
                    {worksites.map((worksite) => (
                      <option key={worksite.id} value={worksite.id}>
                        {worksite.name} - {worksite.address}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrizione Lavoro *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={4}
                  required
                  placeholder="Descrivi il lavoro svolto oggi..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ore Lavorate
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="24"
                  value={formData.hours_worked}
                  onChange={(e) => setFormData({ ...formData, hours_worked: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="8"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Materiali Utilizzati
                </label>
                <textarea
                  value={formData.materials_used}
                  onChange={(e) => setFormData({ ...formData, materials_used: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={2}
                  placeholder="Es: Cemento, mattoni, sabbia..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Attrezzature Utilizzate
                </label>
                <textarea
                  value={formData.equipment_used}
                  onChange={(e) => setFormData({ ...formData, equipment_used: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={2}
                  placeholder="Es: Betoniera, trapano, ponteggio..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Condizioni Meteo
                </label>
                <input
                  type="text"
                  value={formData.weather_conditions}
                  onChange={(e) => setFormData({ ...formData, weather_conditions: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Es: Soleggiato, nuvoloso, piovoso..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Note Aggiuntive
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Altre informazioni o note particolari..."
                />
              </div>

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
                  {editingReport ? 'Aggiorna' : 'Salva Rapportino'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
