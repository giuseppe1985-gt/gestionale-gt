import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Calendar, Clock, FileText, CheckCircle, XCircle, AlertCircle, Upload, CalendarClock, MessageSquare, RefreshCw } from 'lucide-react';
import { Database } from '../../lib/database.types';
import { notifyLeaveRequest, notifyCounterProposal } from '../../lib/notifications';

type LeaveBalance = Database['public']['Tables']['leave_balances']['Row'];
type LeaveRequest = Database['public']['Tables']['leave_requests']['Row'] & {
  reviewer?: Database['public']['Tables']['profiles']['Row'];
  counter_proposer?: Database['public']['Tables']['profiles']['Row'];
};

export default function LeaveRequests() {
  const { user, profile } = useAuth();
  const [balance, setBalance] = useState<LeaveBalance | null>(null);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showCounterModal, setShowCounterModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [certificate, setCertificate] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    request_type: 'vacation' as 'vacation' | 'rol' | 'sick_leave' | 'appointment',
    start_date: '',
    end_date: '',
    hours_requested: 8,
    reason: '',
    appointment_time: '',
  });

  const [counterFormData, setCounterFormData] = useState({
    counter_date: '',
    counter_time: '',
    counter_reason: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: balanceData } = await supabase
        .from('leave_balances')
        .select('*')
        .eq('worker_id', user?.id)
        .maybeSingle();

      const { data: requestsData } = await supabase
        .from('leave_requests')
        .select('*, reviewer:profiles!leave_requests_reviewed_by_fkey(*), counter_proposer:profiles!leave_requests_counter_by_fkey(*)')
        .eq('worker_id', user?.id)
        .order('created_at', { ascending: false });

      setBalance(balanceData);
      setRequests(requestsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDays = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (formData.request_type === 'sick_leave' && !certificate) {
        alert('Il certificato di malattia è obbligatorio');
        return;
      }

      let hoursToRequest = formData.hours_requested;

      if (formData.request_type === 'vacation' || formData.request_type === 'sick_leave') {
        if (!formData.start_date || !formData.end_date) {
          alert('Seleziona le date di inizio e fine');
          return;
        }
        const days = calculateDays(formData.start_date, formData.end_date);
        hoursToRequest = days * 8;
      }

      if (formData.request_type === 'appointment') {
        if (!formData.start_date || !formData.appointment_time) {
          alert('Seleziona data e ora dell\'appuntamento');
          return;
        }
        hoursToRequest = 0;
      }

      if (formData.request_type === 'vacation' && balance && hoursToRequest > balance.vacation_hours) {
        alert('Non hai abbastanza ore di ferie disponibili');
        return;
      }

      if (formData.request_type === 'rol' && balance && hoursToRequest > balance.rol_hours) {
        alert('Non hai abbastanza ore di ROL disponibili');
        return;
      }

      setUploading(true);

      let certificateUrl: string | null = null;

      if (formData.request_type === 'sick_leave' && certificate) {
        const fileExt = certificate.name.split('.').pop();
        const fileName = `${user!.id}_${Date.now()}.${fileExt}`;
        const filePath = `certificates/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('leave-certificates')
          .upload(filePath, certificate);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          alert('Errore durante il caricamento del certificato');
          setUploading(false);
          return;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('leave-certificates')
          .getPublicUrl(filePath);

        certificateUrl = publicUrl;
      }

      const requestData: any = {
        worker_id: user!.id,
        request_type: formData.request_type,
        hours_requested: hoursToRequest,
        organization_id: profile?.organization_id,
        pending_response_from: 'reviewer',
      };

      if (formData.request_type === 'vacation' || formData.request_type === 'sick_leave') {
        requestData.start_date = formData.start_date;
        requestData.end_date = formData.end_date;
      }

      if (formData.request_type === 'appointment') {
        requestData.start_date = formData.start_date;
        requestData.appointment_time = formData.appointment_time;
      }

      if (formData.reason) {
        requestData.reason = formData.reason;
      }

      if (certificateUrl) {
        requestData.certificate_url = certificateUrl;
      }

      const { data: newRequest, error } = await supabase
        .from('leave_requests')
        .insert(requestData)
        .select()
        .single();

      if (error) throw error;

      if (newRequest && profile?.organization_id && profile?.full_name) {
        const { data: admins } = await supabase
          .from('profiles')
          .select('id')
          .eq('organization_id', profile.organization_id)
          .in('role', ['admin', 'administrator']);

        if (admins && admins.length > 0) {
          const adminIds = admins.map(a => a.id);
          await notifyLeaveRequest(adminIds, profile.full_name, newRequest.id);
        }
      }

      setShowModal(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error submitting request:', error);
      alert('Errore durante l\'invio della richiesta');
    } finally {
      setUploading(false);
    }
  };

  // Accetta la controproposta ricevuta
  const handleAcceptCounterProposal = async (request: LeaveRequest) => {
    try {
      const { error } = await supabase
        .from('leave_requests')
        .update({
          status: 'approved',
          start_date: request.counter_date,
          appointment_time: request.counter_time,
          reason: request.counter_reason || request.reason,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', request.id);

      if (error) throw error;

      // Notifica chi ha fatto la controproposta
      if (request.counter_by) {
        await notifyCounterProposal(request.counter_by, 'accepted', request.id);
      }

      loadData();
    } catch (error) {
      console.error('Error accepting counter proposal:', error);
      alert('Errore durante l\'accettazione della controproposta');
    }
  };

  // Rifiuta la controproposta (rifiuto definitivo)
  const handleRejectCounterProposal = async (request: LeaveRequest) => {
    try {
      const { error } = await supabase
        .from('leave_requests')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', request.id);

      if (error) throw error;

      // Notifica chi ha fatto la controproposta
      if (request.counter_by) {
        await notifyCounterProposal(request.counter_by, 'rejected', request.id);
      }

      loadData();
    } catch (error) {
      console.error('Error rejecting counter proposal:', error);
      alert('Errore durante il rifiuto della controproposta');
    }
  };

  // Apri modal per fare controproposta (come worker)
  const openCounterProposalModal = (request: LeaveRequest) => {
    setSelectedRequest(request);
    setCounterFormData({
      counter_date: '',
      counter_time: '',
      counter_reason: '',
    });
    setShowCounterModal(true);
  };

  // Invia controproposta come worker
  const handleSubmitCounterProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;

    try {
      const { error } = await supabase
        .from('leave_requests')
        .update({
          status: 'counter_proposal',
          counter_date: counterFormData.counter_date,
          counter_time: counterFormData.counter_time,
          counter_reason: counterFormData.counter_reason,
          counter_by: user?.id,
          pending_response_from: 'reviewer',
        })
        .eq('id', selectedRequest.id);

      if (error) throw error;

      // Notifica gli admin della nuova controproposta
      if (profile?.organization_id) {
        const { data: admins } = await supabase
          .from('profiles')
          .select('id')
          .eq('organization_id', profile.organization_id)
          .in('role', ['admin', 'administrator']);

        if (admins && admins.length > 0) {
          for (const admin of admins) {
            await notifyCounterProposal(admin.id, 'new', selectedRequest.id);
          }
        }
      }

      setShowCounterModal(false);
      setSelectedRequest(null);
      loadData();
    } catch (error) {
      console.error('Error submitting counter proposal:', error);
      alert('Errore durante l\'invio della controproposta');
    }
  };

  const resetForm = () => {
    setFormData({
      request_type: 'vacation',
      start_date: '',
      end_date: '',
      hours_requested: 8,
      reason: '',
      appointment_time: '',
    });
    setCertificate(null);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatTime = (time: string) => {
    return time.substring(0, 5);
  };

  const getRequestTypeLabel = (type: string) => {
    switch (type) {
      case 'vacation': return 'Ferie';
      case 'rol': return 'ROL';
      case 'sick_leave': return 'Malattia';
      case 'appointment': return 'Appuntamento';
      default: return type;
    }
  };

  const getStatusBadge = (status: string, pendingResponseFrom?: string | null) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            In Attesa
          </span>
        );
      case 'counter_proposal':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
            <MessageSquare className="w-3 h-3 mr-1" />
            {pendingResponseFrom === 'worker' ? 'Controproposta Ricevuta' : 'Controproposta Inviata'}
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approvata
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            Rifiutata
          </span>
        );
      default:
        return null;
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Richieste Permessi</h1>
          <p className="text-gray-600 mt-1">Gestisci le tue richieste di ferie, ROL e appuntamenti</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center space-x-2 bg-gradient-to-r from-blue-900 to-blue-700 text-white px-6 py-3 rounded-lg hover:from-blue-800 hover:to-blue-600 transition-all shadow-lg"
        >
          <Plus className="w-5 h-5" />
          <span>Nuova Richiesta</span>
        </button>
      </div>

      {balance && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-md p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold">Ferie</h3>
              <Calendar className="w-6 h-6 opacity-80" />
            </div>
            <p className="text-3xl font-bold">{balance.vacation_hours}h</p>
            <p className="text-sm opacity-80 mt-1">Ore disponibili</p>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-md p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold">ROL</h3>
              <Clock className="w-6 h-6 opacity-80" />
            </div>
            <p className="text-3xl font-bold">{balance.rol_hours}h</p>
            <p className="text-sm opacity-80 mt-1">Ore disponibili</p>
          </div>
        </div>
      )}

      {!balance && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div className="text-sm text-gray-700">
              <p className="font-semibold">Monte ore non configurato</p>
              <p>Contatta l'amministratore per configurare il tuo monte ore disponibile.</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Le Mie Richieste</h2>
        <div className="space-y-4">
          {requests.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Nessuna richiesta effettuata</p>
            </div>
          ) : (
            requests.map((request) => (
              <div
                key={request.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {getRequestTypeLabel(request.request_type)}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {request.request_type === 'appointment' ? (
                        <>
                          {request.start_date && formatDate(request.start_date)}
                          {request.appointment_time && ` alle ${formatTime(request.appointment_time)}`}
                        </>
                      ) : (
                        <>
                          {request.hours_requested} ore
                          {request.start_date && request.end_date && (
                            <> · {formatDate(request.start_date)} - {formatDate(request.end_date)}</>
                          )}
                        </>
                      )}
                    </p>
                  </div>
                  {getStatusBadge(request.status, request.pending_response_from)}
                </div>

                {request.reason && (
                  <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-700">{request.reason}</p>
                  </div>
                )}

                {/* Mostra controproposta ricevuta (worker deve rispondere) */}
                {request.status === 'counter_proposal' && request.pending_response_from === 'worker' && request.counter_date && (
                  <div className="mb-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <RefreshCw className="w-4 h-4 text-orange-600" />
                      <p className="text-sm font-semibold text-orange-800">Controproposta Ricevuta</p>
                    </div>
                    <div className="space-y-1 text-sm text-gray-700">
                      <p><strong>Data:</strong> {formatDate(request.counter_date)}</p>
                      {request.counter_time && <p><strong>Ora:</strong> {formatTime(request.counter_time)}</p>}
                      {request.counter_reason && <p><strong>Motivazione:</strong> {request.counter_reason}</p>}
                      {request.counter_proposer && (
                        <p className="text-xs text-gray-500 mt-2">
                          Proposto da <strong>{request.counter_proposer.full_name}</strong>
                        </p>
                      )}
                    </div>

                    {/* Bottoni azione per controproposta ricevuta */}
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => handleAcceptCounterProposal(request)}
                        className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Accetta
                      </button>
                      <button
                        onClick={() => openCounterProposalModal(request)}
                        className="flex-1 flex items-center justify-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Controproposta
                      </button>
                      <button
                        onClick={() => handleRejectCounterProposal(request)}
                        className="flex-1 flex items-center justify-center gap-2 bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200 transition-colors"
                      >
                        <XCircle className="w-4 h-4" />
                        Rifiuta
                      </button>
                    </div>
                  </div>
                )}

                {/* Mostra controproposta inviata (in attesa di risposta) */}
                {request.status === 'counter_proposal' && request.pending_response_from === 'reviewer' && request.counter_date && (
                  <div className="mb-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <p className="text-sm font-semibold text-blue-800">Tua Controproposta (In Attesa)</p>
                    </div>
                    <div className="space-y-1 text-sm text-gray-700">
                      <p><strong>Data:</strong> {formatDate(request.counter_date)}</p>
                      {request.counter_time && <p><strong>Ora:</strong> {formatTime(request.counter_time)}</p>}
                      {request.counter_reason && <p><strong>Motivazione:</strong> {request.counter_reason}</p>}
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center text-xs text-gray-500">
                  <span>Richiesta il {formatDate(request.created_at)}</span>
                  {request.reviewed_at && request.reviewer && (
                    <span>
                      {request.status === 'approved' ? '✅ Approvata' : '❌ Rifiutata'} da <strong>{request.reviewer.full_name}</strong>
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal Nuova Richiesta */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Nuova Richiesta</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo di Richiesta *
                </label>
                <select
                  value={formData.request_type}
                  onChange={(e) => {
                    setFormData({ 
                      ...formData, 
                      request_type: e.target.value as any,
                      start_date: '',
                      end_date: '',
                      appointment_time: '',
                      reason: '',
                    });
                    setCertificate(null);
                  }}
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-no-repeat bg-right bg-[length:20px] cursor-pointer"
                  style={{ backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")", backgroundPosition: "right 0.5rem center" }}
                  required
                >
                  <option value="vacation">Ferie</option>
                  <option value="rol">ROL</option>
                  <option value="sick_leave">Malattia</option>
                  <option value="appointment">Appuntamento</option>
                </select>
              </div>

              {formData.request_type === 'appointment' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Data Appuntamento *
                    </label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ora Appuntamento *
                    </label>
                    <input
                      type="time"
                      value={formData.appointment_time}
                      onChange={(e) => setFormData({ ...formData, appointment_time: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Note
                    </label>
                    <textarea
                      value={formData.reason}
                      onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={3}
                      placeholder="Inserisci eventuali dettagli sull'appuntamento..."
                    />
                  </div>
                </>
              )}

              {(formData.request_type === 'vacation' || formData.request_type === 'sick_leave') && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Data Inizio *
                    </label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Data Fine *
                    </label>
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  {formData.start_date && formData.end_date && (
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-gray-700">
                        Giorni richiesti: <strong>{calculateDays(formData.start_date, formData.end_date)}</strong>
                      </p>
                      <p className="text-sm text-gray-700">
                        Ore totali: <strong>{calculateDays(formData.start_date, formData.end_date) * 8}h</strong>
                      </p>
                    </div>
                  )}
                </>
              )}

              {formData.request_type === 'sick_leave' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Certificato di Malattia *
                  </label>
                  <div className="mt-1">
                    <label className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 transition-colors">
                      <div className="flex items-center space-x-2">
                        <Upload className="w-5 h-5 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {certificate ? certificate.name : 'Carica certificato (PDF, JPG, PNG)'}
                        </span>
                      </div>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 5 * 1024 * 1024) {
                              alert('Il file non può superare i 5MB');
                              e.target.value = '';
                              return;
                            }
                            setCertificate(file);
                          }
                        }}
                        className="hidden"
                        required
                      />
                    </label>
                    {certificate && (
                      <p className="text-xs text-green-600 mt-1">
                        File selezionato: {certificate.name} ({(certificate.size / 1024).toFixed(0)} KB)
                      </p>
                    )}
                  </div>
                </div>
              )}

              {formData.request_type === 'rol' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ore Richieste *
                    </label>
                    <select
                      value={formData.hours_requested}
                      onChange={(e) =>
                        setFormData({ ...formData, hours_requested: Number(e.target.value) })
                      }
                      className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-no-repeat bg-right bg-[length:20px] cursor-pointer"
                      style={{ backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")", backgroundPosition: "right 0.5rem center" }}
                      required
                    >
                      {Array.from({ length: 24 }, (_, i) => i + 1).map(num => (
                        <option key={num} value={num}>{num} ore</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Motivazione *
                    </label>
                    <textarea
                      value={formData.reason}
                      onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={3}
                      placeholder="Specifica il motivo della richiesta..."
                      required
                    />
                  </div>
                </>
              )}

              {(formData.request_type === 'vacation' || formData.request_type === 'sick_leave') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Motivazione
                  </label>
                  <textarea
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Specifica il motivo della richiesta..."
                  />
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
                  disabled={uploading}
                  className="flex-1 bg-gradient-to-r from-blue-900 to-blue-700 text-white px-4 py-2 rounded-lg hover:from-blue-800 hover:to-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? 'Caricamento...' : 'Invia Richiesta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Controproposta (Worker) */}
      {showCounterModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Nuova Controproposta</h2>
            <p className="text-gray-600 mb-6">Proponi una nuova data e ora per l'appuntamento</p>

            <form onSubmit={handleSubmitCounterProposal} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data Proposta *
                </label>
                <input
                  type="date"
                  value={counterFormData.counter_date}
                  onChange={(e) => setCounterFormData({ ...counterFormData, counter_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ora Proposta *
                </label>
                <input
                  type="time"
                  value={counterFormData.counter_time}
                  onChange={(e) => setCounterFormData({ ...counterFormData, counter_time: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Motivazione
                </label>
                <textarea
                  value={counterFormData.counter_reason}
                  onChange={(e) => setCounterFormData({ ...counterFormData, counter_reason: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Spiega il motivo della tua controproposta..."
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCounterModal(false);
                    setSelectedRequest(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-all"
                >
                  Invia Controproposta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
