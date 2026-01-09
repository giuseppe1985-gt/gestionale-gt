import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Truck, Plus, X, Save, Trash2, AlertCircle, Calendar, Wrench, ClipboardList } from 'lucide-react';

interface Vehicle {
  id: string;
  organization_id: string;
  plate: string;
  details: string;
  kilometers: number;
  inspection_date: string | null;
  issues: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

interface VehicleService {
  id: string;
  vehicle_id: string;
  service_date: string;
  kilometers: number;
  notes: string | null;
  created_at: string;
}

export default function VehiclesManagement() {
  const { profile } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    plate: '',
    details: '',
    kilometers: 0,
    inspection_date: '',
    issues: '',
    notes: '',
  });

  const [isServicesModalOpen, setIsServicesModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [vehicleServices, setVehicleServices] = useState<VehicleService[]>([]);
  const [serviceFormData, setServiceFormData] = useState({
    service_date: '',
    kilometers: 0,
    notes: '',
  });

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .order('plate', { ascending: true });

      if (error) throw error;
      setVehicles(data || []);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVehicleServices = async (vehicleId: string) => {
    try {
      const { data, error } = await supabase
        .from('vehicle_services')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .order('service_date', { ascending: false });

      if (error) throw error;
      setVehicleServices(data || []);
    } catch (error) {
      console.error('Error fetching vehicle services:', error);
    }
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle) return;

    try {
      const { error } = await supabase
        .from('vehicle_services')
        .insert([{
          vehicle_id: selectedVehicle.id,
          service_date: serviceFormData.service_date,
          kilometers: serviceFormData.kilometers,
          notes: serviceFormData.notes || null,
          created_by: profile?.id,
        }]);

      if (error) throw error;

      await fetchVehicleServices(selectedVehicle.id);
      setServiceFormData({
        service_date: '',
        kilometers: 0,
        notes: '',
      });
    } catch (error) {
      console.error('Error adding service:', error);
      alert('Errore durante l\'aggiunta del tagliando');
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo tagliando?')) return;
    if (!selectedVehicle) return;

    try {
      const { error } = await supabase
        .from('vehicle_services')
        .delete()
        .eq('id', serviceId);

      if (error) throw error;
      await fetchVehicleServices(selectedVehicle.id);
    } catch (error) {
      console.error('Error deleting service:', error);
      alert('Errore durante l\'eliminazione del tagliando');
    }
  };

  const openServicesModal = async (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    await fetchVehicleServices(vehicle.id);
    setIsServicesModalOpen(true);
  };

  const closeServicesModal = () => {
    setIsServicesModalOpen(false);
    setSelectedVehicle(null);
    setVehicleServices([]);
    setServiceFormData({
      service_date: '',
      kilometers: 0,
      notes: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingVehicle) {
        const { error } = await supabase
          .from('vehicles')
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingVehicle.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('vehicles')
          .insert([{
            ...formData,
            organization_id: profile?.organization_id,
          }]);

        if (error) throw error;
      }

      await fetchVehicles();
      closeModal();
    } catch (error) {
      console.error('Error saving vehicle:', error);
      alert('Errore durante il salvataggio del veicolo');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo veicolo?')) return;

    try {
      const { error } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchVehicles();
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      alert('Errore durante l\'eliminazione del veicolo');
    }
  };

  const openModal = (vehicle?: Vehicle) => {
    if (vehicle) {
      setEditingVehicle(vehicle);
      setFormData({
        plate: vehicle.plate,
        details: vehicle.details,
        kilometers: vehicle.kilometers,
        inspection_date: vehicle.inspection_date || '',
        issues: vehicle.issues,
        notes: vehicle.notes,
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingVehicle(null);
    setFormData({
      plate: '',
      details: '',
      kilometers: 0,
      inspection_date: '',
      issues: '',
      notes: '',
    });
  };

  const isDateExpiring = (date: string | null) => {
    if (!date) return false;
    const targetDate = new Date(date);
    const today = new Date();
    const daysUntil = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntil <= 30 && daysUntil >= 0;
  };

  const isDateExpired = (date: string | null) => {
    if (!date) return false;
    const targetDate = new Date(date);
    const today = new Date();
    return targetDate < today;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Caricamento...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Truck className="w-8 h-8" />
              Gestione Furgoni
            </h1>
            <p className="text-gray-600 mt-1">Gestisci i veicoli aziendali</p>
          </div>
          <button
            onClick={() => openModal()}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-md"
          >
            <Plus className="w-5 h-5" />
            Aggiungi Furgone
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vehicles.map((vehicle) => (
            <div key={vehicle.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <Truck className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{vehicle.plate}</h3>
                    <p className="text-sm text-gray-600">{vehicle.details || 'Nessun dettaglio'}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openModal(vehicle)}
                    className="text-blue-600 hover:bg-blue-50 p-2 rounded transition-colors"
                  >
                    <Save className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(vehicle.id)}
                    className="text-red-600 hover:bg-red-50 p-2 rounded transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-semibold text-gray-700">Km:</span>
                  <span className="text-gray-900">{vehicle.kilometers.toLocaleString()}</span>
                </div>

                <button
                  onClick={() => openServicesModal(vehicle)}
                  className="w-full flex items-center justify-center gap-2 text-sm p-2 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                >
                  <ClipboardList className="w-4 h-4" />
                  <span className="font-semibold">Storico Tagliandi</span>
                </button>

                {vehicle.inspection_date && (
                  <div className={`flex items-center gap-2 text-sm p-2 rounded ${
                    isDateExpired(vehicle.inspection_date)
                      ? 'bg-red-50 text-red-700'
                      : isDateExpiring(vehicle.inspection_date)
                      ? 'bg-yellow-50 text-yellow-700'
                      : 'bg-gray-50 text-gray-700'
                  }`}>
                    <Calendar className="w-4 h-4" />
                    <span className="font-semibold">Revisione:</span>
                    <span>{new Date(vehicle.inspection_date).toLocaleDateString('it-IT')}</span>
                  </div>
                )}

                {vehicle.issues && (
                  <div className="flex items-start gap-2 text-sm bg-red-50 p-2 rounded">
                    <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
                    <div>
                      <span className="font-semibold text-red-700">Problemi:</span>
                      <p className="text-red-600 mt-1">{vehicle.issues}</p>
                    </div>
                  </div>
                )}

                {vehicle.notes && (
                  <div className="text-sm bg-gray-50 p-2 rounded">
                    <span className="font-semibold text-gray-700">Note:</span>
                    <p className="text-gray-600 mt-1">{vehicle.notes}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {vehicles.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <Truck className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Nessun furgone registrato</h3>
            <p className="text-gray-600 mb-4">Inizia aggiungendo il primo veicolo aziendale</p>
            <button
              onClick={() => openModal()}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Aggiungi Furgone
            </button>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingVehicle ? 'Modifica Furgone' : 'Nuovo Furgone'}
                </h2>
                <button onClick={closeModal} className="text-gray-500 hover:text-gray-700">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Targa *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.plate}
                    onChange={(e) => setFormData({ ...formData, plate: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="ES: AB123CD"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dettagli
                  </label>
                  <input
                    type="text"
                    value={formData.details}
                    onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="ES: Fiat Ducato Bianco"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kilometraggio
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.kilometers}
                    onChange={(e) => setFormData({ ...formData, kilometers: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data Revisione
                  </label>
                  <input
                    type="date"
                    value={formData.inspection_date}
                    onChange={(e) => setFormData({ ...formData, inspection_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    I tagliandi vengono gestiti tramite lo storico tagliandi nella card del veicolo
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Problemi
                  </label>
                  <textarea
                    value={formData.issues}
                    onChange={(e) => setFormData({ ...formData, issues: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    placeholder="Eventuali problemi o guasti da segnalare"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Note
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    placeholder="Note aggiuntive"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {editingVehicle ? 'Salva Modifiche' : 'Aggiungi Furgone'}
                  </button>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Annulla
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {isServicesModalOpen && selectedVehicle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Storico Tagliandi</h2>
                  <p className="text-gray-600 mt-1">
                    {selectedVehicle.plate} - {selectedVehicle.details}
                  </p>
                </div>
                <button onClick={closeServicesModal} className="text-gray-500 hover:text-gray-700">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleAddService} className="mb-6 p-4 bg-blue-50 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Aggiungi Tagliando
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Data Tagliando *
                    </label>
                    <input
                      type="date"
                      required
                      value={serviceFormData.service_date}
                      onChange={(e) => setServiceFormData({ ...serviceFormData, service_date: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Kilometraggio *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={serviceFormData.kilometers}
                      onChange={(e) => setServiceFormData({ ...serviceFormData, kilometers: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Note
                    </label>
                    <input
                      type="text"
                      value={serviceFormData.notes}
                      onChange={(e) => setServiceFormData({ ...serviceFormData, notes: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Note opzionali"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Aggiungi Tagliando
                </button>
              </form>

              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <ClipboardList className="w-5 h-5" />
                  Storico ({vehicleServices.length})
                </h3>

                {vehicleServices.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <Wrench className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">Nessun tagliando registrato</p>
                    <p className="text-sm text-gray-500 mt-1">Aggiungi il primo tagliando utilizzando il form sopra</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {vehicleServices.map((service) => (
                      <div key={service.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-4 mb-2">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-blue-600" />
                                <span className="font-semibold text-gray-900">
                                  {new Date(service.service_date).toLocaleDateString('it-IT', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                  })}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-600">Km:</span>
                                <span className="font-semibold text-gray-900">
                                  {service.kilometers.toLocaleString()}
                                </span>
                              </div>
                            </div>
                            {service.notes && (
                              <p className="text-sm text-gray-600 mt-2">{service.notes}</p>
                            )}
                          </div>
                          <button
                            onClick={() => handleDeleteService(service.id)}
                            className="text-red-600 hover:bg-red-50 p-2 rounded transition-colors ml-4"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t">
                <button
                  onClick={closeServicesModal}
                  className="w-full bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Chiudi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
