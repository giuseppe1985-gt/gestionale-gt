import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { CheckCircle, XCircle, Clock, Calendar, FileText, AlertCircle, Download, CalendarClock, MessageSquare, RefreshCw } from 'lucide-react';
import { Database } from '../../lib/database.types';
import { notifyLeaveResponse, notifyCounterProposal } from '../../lib/notifications';

type Profile = Database['public']['Tables']['profiles']['Row'];
type LeaveRequest = Database['public']['Tables']['leave_requests']['Row'] & {
  worker: Profile;
  reviewer?: Profile;
  counter_proposer?: Profile;
};

export default function LeaveRequestsApproval() {
  const { user, profile } = useAuth();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'counter_proposal' | 'approved' | 'rejected'>('pending');
  const [showCounterModal, setShowCounterModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);

  const [counterFormData, setCounterFormData] = useState({
    counter_date: '',
    counter_time: '',
    counter_reason: '',
  });

  useEffect(() => {
    loadRequests();
  }, [filter]);

  const loadRequests = async () => {
    try {
      let query = supabase
        .from('leave_requests')
        .select('*, worker:profiles!leave_requests_worker_id_fkey(*), reviewer:profiles!leave_requests_reviewed_by_fkey(*), counter_proposer:profiles!leave_requests_counter_by_fkey(*)')
        .eq('organization_id', profile?.organization_id)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data } = await query;
      setRequests(data || []);
    } catch (error) {
      console.error('Error loading requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveReject = async (requestId: string, status: 'approved' | 'rejected') => {
    setProcessing(requestId);
    try {
      const request = requests.find(r => r.id === requestId);
      if (!request) {
        throw new Error('Richiesta non trovata');
      }

      const { error } = await supabase
        .from('leave_requests')
        .update({
          status,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (error) throw error;

      await notifyLeaveResponse(request.worker_id, status, requestId);

      await loadRequests();
    } catch (error) {
      console.error('Error updating request:', error);
      alert('Errore durante l\'aggiornamento della richiesta');
    } finally {
      setProcessing(null);
    }
  };

  // Apri modal per fare controproposta (come admin)
  const openCounterProposalModal = (request: LeaveRequest) => {
    setSelectedRequest(request);
    setCounterFormData({
      counter_date: '',
      counter_time: '',
      counter_reason: '',
    });
    setShowCounterModal(true);
  };

  // Invia controproposta come admin
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
          pending_response_from: 'worker',
        })
        .eq('id', selectedRequest.id);

      if (error) throw error;

      // Notifica il worker della controproposta
      await notifyCounterProposal(selectedRequest.worker_id, 'new', selectedRequest.id);

      setShowCounterModal(false);
      setSelectedRequest(null);
      loadRequests();
    } catch (error) {
      console.error('Error submitting counter proposal:', error);
      alert('Errore durante l\'invio della controproposta');
    }
  };

  // Accetta la controproposta ricevuta dal worker
  const handleAcceptCounterProposal = async (request: LeaveRequest) => {
    setProcessing(request.id);
    try {
      const { error } = await supabase
        .from('leave_requests')
        .update({
          status: 'approved',
          start_date: request.counter_date,
          appointment_time: request.counter_time,
          reason: request.counter_reason || request.reason,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', request.id);

      if (error) throw error;

      // Notifica il worker
      await notifyCounterProposal(request.worker_id, 'accepted', request.id);

      loadRequests();
    } catch (error) {
      console.error('Error accepting counter proposal:', error);
      alert('Errore durante l\'accettazione della controproposta');
    } finally {
      setProcessing(null);
    }
  };

  // Rifiuta la controproposta (rifiuto definitivo)
  const handleRejectCounterProposal = async (request: LeaveRequest) => {
    setProcessing(request.id);
    try {
      const { error } = await supabase
        .from('leave_requests')
        .update({
          status: 'rejected',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', request.id);

      if (error) throw error;

      // Notifica il worker
      await notifyCounterProposal(request.worker_id, 'rejected', request.id);

      loadRequests();
    } catch (error) {
      console.error('Error rejecting counter proposal:', error);
      alert('Errore durante il rifiuto della controproposta');
    } finally {
      setProcessing(null);
    }
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

  const getRequestTypeColor = (type: string) => {
    switch (type) {
      case 'vacation': return 'bg-blue-50';
      case 'rol': return 'bg-green-50';
      case 'sick_leave': return 'bg-red-50';
      case 'appointment': return 'bg-purple-50';
      default: return 'bg-gray-50';
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
            {pendingResponseFrom === 'reviewer' ? 'Controproposta Ricevuta' : 'Controproposta Inviata'}
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
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-3xl font-bold text-gray-900">Gestione Richieste Permessi</h1>
        <p className="text-gray-600 mt-1">Approva, rifiuta o fai controproposte alle richieste di ferie, ROL, malattia e appuntamenti</p>
      </div>

      <div className="bg-white rounded-xl shadow-md p-4">
        <div className="flex space-x-2 flex-wrap gap-2">
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'pending'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            In Attesa
          </button>
          <button
            onClick={() => setFilter('counter_proposal')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'counter_proposal'
                ? 'bg-orange-100 text-orange-800'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Controproposte
          </button>
          <button
            onClick={() => setFilter('approved')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'approved'
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Approvate
          </button>
          <button
            onClick={() => setFilter('rejected')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'rejected'
                ? 'bg-red-100 text-red-800'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Rifiutate
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Tutte
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {requests.length === 0 ? (
          <div className="col-span-2 text-center py-8 sm:py-12 bg-white rounded-xl shadow-md">
            <FileText className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Nessuna richiesta trovata</p>
          </div>
        ) : (
          requests.map((request) => (
            <div
              key={request.id}
              className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-3">
                  {request.worker.avatar_url ? (
                    <img
                      src={request.worker.avatar_url}
                      alt={request.worker.full_name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {request.worker.full_name.split(' ').map(n => n[0]).join('')}
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold text-gray-900">{request.worker.full_name}</h3>
                    <p className="text-sm text-gray-600">{request.worker.position}</p>
                  </div>
                </div>
                {getStatusBadge(request.status, request.pending_response_from)}
              </div>

              <div className="space-y-3">
                <div className={`p-3 rounded-lg ${getRequestTypeColor(request.request_type)}`}>
                  <p className="text-sm text-gray-600 mb-1">Tipo di Richiesta</p>
                  <p className="font-semibold text-gray-900">{getRequestTypeLabel(request.request_type)}</p>
                </div>

                {request.request_type === 'appointment' ? (
                  <div className="flex items-center space-x-2">
                    <CalendarClock className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">Data e Ora Richiesti</p>
                      <p className="font-medium text-gray-900">
                        {request.start_date && formatDate(request.start_date)}
                        {request.appointment_time && ` alle ${formatTime(request.appointment_time)}`}
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center space-x-2">
                      <Clock className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Ore Richieste</p>
                        <p className="font-medium text-gray-900">{request.hours_requested} ore</p>
                      </div>
                    </div>

                    {request.start_date && request.end_date && (
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-600">Periodo Richiesto</p>
                          <p className="font-medium text-gray-900">
                            {formatDate(request.start_date)} - {formatDate(request.end_date)}
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {request.reason && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">
                      {request.request_type === 'appointment' ? 'Note' : 'Motivazione'}
                    </p>
                    <p className="text-sm text-gray-900">{request.reason}</p>
                  </div>
                )}

                {/* Controproposta RICEVUTA dal worker (admin deve rispondere) */}
                {request.status === 'counter_proposal' && request.pending_response_from === 'reviewer' && request.counter_date && (
                  <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
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
                    <div className="flex flex-wrap gap-2 mt-4">
                      <button
                        onClick={() => handleAcceptCounterProposal(request)}
                        disabled={processing === request.id}
                        className="flex-1 min-w-[80px] flex items-center justify-center gap-1 sm:gap-2 bg-green-600 text-white px-2 sm:px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 text-sm sm:text-base"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>Accetta</span>
                      </button>
                      <button
                        onClick={() => openCounterProposalModal(request)}
                        disabled={processing === request.id}
                        className="flex-1 min-w-[80px] flex items-center justify-center gap-1 sm:gap-2 bg-orange-500 text-white px-2 sm:px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 text-sm sm:text-base"
                      >
                        <RefreshCw className="w-4 h-4" />
                        <span className="hidden sm:inline">Controproposta</span>
                        <span className="sm:hidden">Proposta</span>
                      </button>
                      <button
                        onClick={() => handleRejectCounterProposal(request)}
                        disabled={processing === request.id}
                        className="flex-1 min-w-[80px] flex items-center justify-center gap-1 sm:gap-2 bg-red-100 text-red-700 px-2 sm:px-4 py-2 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50 text-sm sm:text-base"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Rifiuta</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Controproposta INVIATA (in attesa risposta worker) */}
                {request.status === 'counter_proposal' && request.pending_response_from === 'worker' && request.counter_date && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <p className="text-sm font-semibold text-blue-800">Tua Controproposta (In Attesa di Risposta)</p>
                    </div>
                    <div className="space-y-1 text-sm text-gray-700">
                      <p><strong>Data:</strong> {formatDate(request.counter_date)}</p>
                      {request.counter_time && <p><strong>Ora:</strong> {formatTime(request.counter_time)}</p>}
                      {request.counter_reason && <p><strong>Motivazione:</strong> {request.counter_reason}</p>}
                    </div>
                  </div>
                )}

                {request.certificate_url && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-gray-600 mb-2">Certificato di Malattia</p>
                    <a
                      href={request.certificate_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      <Download className="w-4 h-4" />
                      <span>Visualizza Certificato</span>
                    </a>
                  </div>
                )}

                <div className="pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-500">
                    Richiesta il {formatDate(request.created_at)}
                  </p>
                  {request.reviewed_at && request.reviewer && (
                    <p className="text-xs text-gray-500 mt-1">
                      {request.status === 'approved' ? '✅ Approvata' : '❌ Rifiutata'} da <strong>{request.reviewer.full_name}</strong> il {formatDate(request.reviewed_at)}
                    </p>
                  )}
                </div>

                {/* Bottoni per richieste pending (non appuntamenti) */}
                {request.status === 'pending' && request.request_type !== 'appointment' && (
                  <div className="flex space-x-3 pt-3">
                    <button
                      onClick={() => handleApproveReject(request.id, 'rejected')}
                      disabled={processing === request.id}
                      className="flex-1 flex items-center justify-center space-x-2 bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Rifiuta</span>
                    </button>
                    <button
                      onClick={() => handleApproveReject(request.id, 'approved')}
                      disabled={processing === request.id}
                      className="flex-1 flex items-center justify-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Approva</span>
                    </button>
                  </div>
                )}

                {/* Bottoni per richieste pending (appuntamenti - con opzione controproposta) */}
                {request.status === 'pending' && request.request_type === 'appointment' && (
                  <div className="flex space-x-2 pt-3">
                    <button
                      onClick={() => handleApproveReject(request.id, 'rejected')}
                      disabled={processing === request.id}
                      className="flex-1 flex items-center justify-center space-x-1 bg-red-100 text-red-700 px-3 py-2 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Rifiuta</span>
                    </button>
                    <button
                      onClick={() => openCounterProposalModal(request)}
                      disabled={processing === request.id}
                      className="flex-1 flex items-center justify-center space-x-1 bg-orange-500 text-white px-3 py-2 rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Controproposta</span>
                    </button>
                    <button
                      onClick={() => handleApproveReject(request.id, 'approved')}
                      disabled={processing === request.id}
                      className="flex-1 flex items-center justify-center space-x-1 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Approva</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
          <div className="text-sm text-gray-700">
            <p className="font-semibold mb-1">Nota importante:</p>
            <p>Quando approvi una richiesta di ferie o ROL, le ore vengono automaticamente scalate dal monte ore del lavoratore. Gli appuntamenti non scalano ore. Per gli appuntamenti puoi proporre una data/ora alternativa con la funzione Controproposta.</p>
          </div>
        </div>
      </div>

      {/* Modal Controproposta (Admin) */}
      {showCounterModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Controproposta</h2>
            <p className="text-gray-600 mb-4">
              Proponi una nuova data e ora per l'appuntamento di <strong>{selectedRequest.worker.full_name}</strong>
            </p>

            <div className="p-3 bg-gray-100 rounded-lg mb-4">
              <p className="text-xs text-gray-500 mb-1">Richiesta originale:</p>
              <p className="text-sm text-gray-900">
                {selectedRequest.start_date && formatDate(selectedRequest.start_date)}
                {selectedRequest.appointment_time && ` alle ${formatTime(selectedRequest.appointment_time)}`}
              </p>
            </div>

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
                  placeholder="Spiega il motivo della controproposta..."
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
