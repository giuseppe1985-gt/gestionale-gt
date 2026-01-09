import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  FileText, Calendar, AlertCircle, TrendingUp, CreditCard,
  Plus, Trash2, Edit2, CheckCircle, X, DollarSign, Filter
} from 'lucide-react';

interface IssuedInvoice {
  id: string;
  invoice_number: string;
  client_name: string;
  amount: number;
  issue_date: string;
  due_date: string;
  payment_status: 'pending' | 'paid' | 'overdue';
  notes: string;
  created_at: string;
}

interface PaymentScheduleItem {
  id: string;
  title: string;
  type: 'bill' | 'invoice' | 'payment' | 'other';
  amount: number;
  due_date: string;
  payment_status: 'pending' | 'paid' | 'overdue';
  notes: string;
  created_at: string;
}

interface SupplierRiba {
  id: string;
  supplier_name: string;
  riba_number: string;
  amount: number;
  due_date: string;
  payment_status: 'pending' | 'paid' | 'overdue';
  notification_sent: boolean;
  notes: string;
  created_at: string;
}

interface InvoiceAdvance {
  id: string;
  invoice_reference: string;
  amount: number;
  advance_date: string;
  bank_name: string;
  payment_status: 'pending' | 'received' | 'rejected';
  notes: string;
  created_at: string;
}

interface MonthlySummary {
  month: string;
  card_id: string;
  card_name: string;
  card_type: 'card' | 'telepass';
  info: string;
  total_amount: number;
  transaction_count: number;
}

interface InvoiceCalculation {
  id: string;
  type: 'income' | 'expense' | 'estimate';
  invoice_number: string;
  invoice_date: string;
  client_name: string;
  amount: number;
  created_at: string;
}

type TimeFilter = 'all' | 'past' | 'today' | 'week' | 'month' | 'future' | 'custom';

export default function AccountingManagement() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'invoices' | 'schedule' | 'riba' | 'advances' | 'cards' | 'calculations'>('invoices');
  const [loading, setLoading] = useState(true);

  const [issuedInvoices, setIssuedInvoices] = useState<IssuedInvoice[]>([]);
  const [paymentSchedule, setPaymentSchedule] = useState<PaymentScheduleItem[]>([]);
  const [supplierRiba, setSupplierRiba] = useState<SupplierRiba[]>([]);
  const [invoiceAdvances, setInvoiceAdvances] = useState<InvoiceAdvance[]>([]);
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary[]>([]);
  const [invoiceCalculations, setInvoiceCalculations] = useState<InvoiceCalculation[]>([]);

  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showRibaModal, setShowRibaModal] = useState(false);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [showCalculationModal, setShowCalculationModal] = useState(false);

  const [invoiceForm, setInvoiceForm] = useState({
    invoice_number: '',
    client_name: '',
    amount: '',
    issue_date: new Date().toISOString().split('T')[0],
    due_date: '',
    payment_status: 'pending' as 'pending' | 'paid' | 'overdue',
    notes: ''
  });

  const [scheduleForm, setScheduleForm] = useState({
    title: '',
    type: 'bill' as 'bill' | 'invoice' | 'payment' | 'other',
    amount: '',
    due_date: '',
    payment_status: 'pending' as 'pending' | 'paid' | 'overdue',
    notes: ''
  });

  const [ribaForm, setRibaForm] = useState({
    supplier_name: '',
    riba_number: '',
    amount: '',
    due_date: '',
    payment_status: 'pending' as 'pending' | 'paid' | 'overdue',
    notes: ''
  });

  const [advanceForm, setAdvanceForm] = useState({
    invoice_reference: '',
    amount: '',
    advance_date: new Date().toISOString().split('T')[0],
    bank_name: '',
    payment_status: 'pending' as 'pending' | 'received' | 'rejected',
    notes: ''
  });

  const [calculationForm, setCalculationForm] = useState({
    type: 'income' as 'income' | 'expense' | 'estimate',
    invoice_number: '',
    invoice_date: new Date().toISOString().split('T')[0],
    client_name: '',
    amount: ''
  });

  const [editingItem, setEditingItem] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const [invoicesRes, scheduleRes, ribaRes, advancesRes, summaryRes, calculationsRes] = await Promise.all([
        supabase.from('issued_invoices').select('*').order('due_date', { ascending: false }),
        supabase.from('payment_schedule').select('*').order('due_date', { ascending: false }),
        supabase.from('supplier_riba').select('*').order('due_date', { ascending: false }),
        supabase.from('invoice_advances').select('*').order('advance_date', { ascending: false }),
        supabase.from('monthly_cards_summary').select('*'),
        supabase.from('invoice_calculations').select('*').order('invoice_date', { ascending: false })
      ]);

      if (invoicesRes.error) throw invoicesRes.error;
      if (scheduleRes.error) throw scheduleRes.error;
      if (ribaRes.error) throw ribaRes.error;
      if (advancesRes.error) throw advancesRes.error;
      if (summaryRes.error) throw summaryRes.error;
      if (calculationsRes.error) throw calculationsRes.error;

      setIssuedInvoices(invoicesRes.data || []);
      setPaymentSchedule(scheduleRes.data || []);
      setSupplierRiba(ribaRes.data || []);
      setInvoiceAdvances(advancesRes.data || []);
      setMonthlySummary(summaryRes.data || []);
      setInvoiceCalculations(calculationsRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Errore nel caricamento dei dati');
    } finally {
      setLoading(false);
    }
  };

  const handleAddInvoice = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { error } = await supabase.from('issued_invoices').insert({
        invoice_number: invoiceForm.invoice_number,
        client_name: invoiceForm.client_name,
        amount: parseFloat(invoiceForm.amount),
        issue_date: invoiceForm.issue_date,
        due_date: invoiceForm.due_date,
        payment_status: invoiceForm.payment_status,
        notes: invoiceForm.notes,
        organization_id: profile?.organization_id,
        created_by: profile?.id
      });

      if (error) throw error;

      alert('Fattura aggiunta con successo');
      setShowInvoiceModal(false);
      resetInvoiceForm();
      await loadData();
    } catch (error) {
      console.error('Error adding invoice:', error);
      alert('Errore nell\'aggiunta della fattura');
    }
  };

  const handleUpdateInvoice = async (id: string, updates: Partial<IssuedInvoice>) => {
    try {
      const { error } = await supabase
        .from('issued_invoices')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      await loadData();
    } catch (error) {
      console.error('Error updating invoice:', error);
      alert('Errore nell\'aggiornamento della fattura');
    }
  };

  const handleDeleteInvoice = async (id: string) => {
    if (!confirm('Eliminare questa fattura?')) return;

    try {
      const { error } = await supabase
        .from('issued_invoices')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await loadData();
    } catch (error) {
      console.error('Error deleting invoice:', error);
      alert('Errore nell\'eliminazione della fattura');
    }
  };

  const handleAddScheduleItem = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { error } = await supabase.from('payment_schedule').insert({
        title: scheduleForm.title,
        type: scheduleForm.type,
        amount: parseFloat(scheduleForm.amount),
        due_date: scheduleForm.due_date,
        payment_status: scheduleForm.payment_status,
        notes: scheduleForm.notes,
        organization_id: profile?.organization_id,
        created_by: profile?.id
      });

      if (error) throw error;

      alert('Scadenza aggiunta con successo');
      setShowScheduleModal(false);
      resetScheduleForm();
      await loadData();
    } catch (error) {
      console.error('Error adding schedule item:', error);
      alert('Errore nell\'aggiunta della scadenza');
    }
  };

  const handleUpdateScheduleItem = async (id: string, updates: Partial<PaymentScheduleItem>) => {
    try {
      const { error } = await supabase
        .from('payment_schedule')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      await loadData();
    } catch (error) {
      console.error('Error updating schedule item:', error);
      alert('Errore nell\'aggiornamento della scadenza');
    }
  };

  const handleDeleteScheduleItem = async (id: string) => {
    if (!confirm('Eliminare questa scadenza?')) return;

    try {
      const { error } = await supabase
        .from('payment_schedule')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await loadData();
    } catch (error) {
      console.error('Error deleting schedule item:', error);
      alert('Errore nell\'eliminazione della scadenza');
    }
  };

  const handleAddRiba = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { error } = await supabase.from('supplier_riba').insert({
        supplier_name: ribaForm.supplier_name,
        riba_number: ribaForm.riba_number,
        amount: parseFloat(ribaForm.amount),
        due_date: ribaForm.due_date,
        payment_status: ribaForm.payment_status,
        notes: ribaForm.notes,
        organization_id: profile?.organization_id,
        created_by: profile?.id
      });

      if (error) throw error;

      alert('RiBa aggiunto con successo');
      setShowRibaModal(false);
      resetRibaForm();
      await loadData();
    } catch (error) {
      console.error('Error adding riba:', error);
      alert('Errore nell\'aggiunta del RiBa');
    }
  };

  const handleUpdateRiba = async (id: string, updates: Partial<SupplierRiba>) => {
    try {
      const { error } = await supabase
        .from('supplier_riba')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      await loadData();
    } catch (error) {
      console.error('Error updating riba:', error);
      alert('Errore nell\'aggiornamento del RiBa');
    }
  };

  const handleDeleteRiba = async (id: string) => {
    if (!confirm('Eliminare questo RiBa?')) return;

    try {
      const { error } = await supabase
        .from('supplier_riba')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await loadData();
    } catch (error) {
      console.error('Error deleting riba:', error);
      alert('Errore nell\'eliminazione del RiBa');
    }
  };

  const handleAddAdvance = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { error } = await supabase.from('invoice_advances').insert({
        invoice_reference: advanceForm.invoice_reference,
        amount: parseFloat(advanceForm.amount),
        advance_date: advanceForm.advance_date,
        bank_name: advanceForm.bank_name,
        payment_status: advanceForm.payment_status,
        notes: advanceForm.notes,
        organization_id: profile?.organization_id,
        created_by: profile?.id
      });

      if (error) throw error;

      alert('Anticipo aggiunto con successo');
      setShowAdvanceModal(false);
      resetAdvanceForm();
      await loadData();
    } catch (error) {
      console.error('Error adding advance:', error);
      alert('Errore nell\'aggiunta dell\'anticipo');
    }
  };

  const handleUpdateAdvance = async (id: string, updates: Partial<InvoiceAdvance>) => {
    try {
      const { error } = await supabase
        .from('invoice_advances')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      await loadData();
    } catch (error) {
      console.error('Error updating advance:', error);
      alert('Errore nell\'aggiornamento dell\'anticipo');
    }
  };

  const handleDeleteAdvance = async (id: string) => {
    if (!confirm('Eliminare questo anticipo?')) return;

    try {
      const { error } = await supabase
        .from('invoice_advances')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await loadData();
    } catch (error) {
      console.error('Error deleting advance:', error);
      alert('Errore nell\'eliminazione dell\'anticipo');
    }
  };

  const resetInvoiceForm = () => {
    setInvoiceForm({
      invoice_number: '',
      client_name: '',
      amount: '',
      issue_date: new Date().toISOString().split('T')[0],
      due_date: '',
      payment_status: 'pending',
      notes: ''
    });
    setEditingItem(null);
  };

  const resetScheduleForm = () => {
    setScheduleForm({
      title: '',
      type: 'bill',
      amount: '',
      due_date: '',
      payment_status: 'pending',
      notes: ''
    });
    setEditingItem(null);
  };

  const resetRibaForm = () => {
    setRibaForm({
      supplier_name: '',
      riba_number: '',
      amount: '',
      due_date: '',
      payment_status: 'pending',
      notes: ''
    });
    setEditingItem(null);
  };

  const resetAdvanceForm = () => {
    setAdvanceForm({
      invoice_reference: '',
      amount: '',
      advance_date: new Date().toISOString().split('T')[0],
      bank_name: '',
      payment_status: 'pending',
      notes: ''
    });
    setEditingItem(null);
  };

  const handleAddCalculation = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { error } = await supabase.from('invoice_calculations').insert({
        type: calculationForm.type,
        invoice_number: calculationForm.invoice_number,
        invoice_date: calculationForm.invoice_date,
        client_name: calculationForm.client_name,
        amount: parseFloat(calculationForm.amount),
        organization_id: profile?.organization_id,
        created_by: profile?.id
      });

      if (error) throw error;

      setShowCalculationModal(false);
      resetCalculationForm();
      await loadData();
    } catch (error) {
      console.error('Error adding calculation:', error);
      alert('Errore nell\'aggiunta del calcolo');
    }
  };

  const handleDeleteCalculation = async (id: string) => {
    if (!confirm('Eliminare questo elemento?')) return;

    try {
      const { error } = await supabase
        .from('invoice_calculations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await loadData();
    } catch (error) {
      console.error('Error deleting calculation:', error);
      alert('Errore nell\'eliminazione del calcolo');
    }
  };

  const resetCalculationForm = () => {
    setCalculationForm({
      type: 'income',
      invoice_number: '',
      invoice_date: new Date().toISOString().split('T')[0],
      client_name: '',
      amount: ''
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('it-IT');
  };

  const getStatusColor = (status: string, type: 'invoice' | 'schedule' | 'riba' | 'advance') => {
    if (type === 'advance') {
      switch (status) {
        case 'received': return 'bg-green-100 text-green-800';
        case 'rejected': return 'bg-red-100 text-red-800';
        default: return 'bg-yellow-100 text-yellow-800';
      }
    }

    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getStatusLabel = (status: string, type: 'invoice' | 'schedule' | 'riba' | 'advance') => {
    if (type === 'advance') {
      switch (status) {
        case 'received': return 'Ricevuto';
        case 'rejected': return 'Rifiutato';
        default: return 'In Attesa';
      }
    }

    switch (status) {
      case 'paid': return 'Pagato';
      case 'overdue': return 'Scaduto';
      default: return 'In Attesa';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'bill': return 'Bolletta';
      case 'invoice': return 'Fattura';
      case 'payment': return 'Pagamento';
      default: return 'Altro';
    }
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date() && new Date(dueDate).toDateString() !== new Date().toDateString();
  };

  const getDateRange = (): { start: Date | null; end: Date | null } => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (timeFilter) {
      case 'past':
        return { start: null, end: new Date(today.getTime() - 1) };

      case 'today':
        const endOfToday = new Date(today);
        endOfToday.setHours(23, 59, 59, 999);
        return { start: today, end: endOfToday };

      case 'week':
        const weekEnd = new Date(today);
        weekEnd.setDate(today.getDate() + 7);
        weekEnd.setHours(23, 59, 59, 999);
        return { start: today, end: weekEnd };

      case 'month':
        const monthEnd = new Date(today);
        monthEnd.setMonth(today.getMonth() + 1);
        monthEnd.setHours(23, 59, 59, 999);
        return { start: today, end: monthEnd };

      case 'future':
        return { start: today, end: null };

      case 'custom':
        if (customStartDate && customEndDate) {
          const start = new Date(customStartDate);
          const end = new Date(customEndDate);
          end.setHours(23, 59, 59, 999);
          return { start, end };
        }
        return { start: null, end: null };

      default:
        return { start: null, end: null };
    }
  };

  const filterByDate = <T extends { due_date?: string; issue_date?: string; advance_date?: string; invoice_date?: string }>(
    items: T[]
  ): T[] => {
    if (timeFilter === 'all') return items;

    const { start, end } = getDateRange();

    return items.filter(item => {
      const dateStr = item.due_date || item.issue_date || item.advance_date || item.invoice_date;
      if (!dateStr) return false;

      const itemDate = new Date(dateStr);

      if (start && end) {
        return itemDate >= start && itemDate <= end;
      } else if (start) {
        return itemDate >= start;
      } else if (end) {
        return itemDate <= end;
      }

      return true;
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Caricamento...</div>
      </div>
    );
  }

  const pendingRiba = supplierRiba.filter(r => r.payment_status === 'pending');
  const upcomingRiba = pendingRiba.filter(r => {
    const daysUntilDue = Math.ceil((new Date(r.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilDue <= 7 && daysUntilDue > 0;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Amministrazione Contabile</h1>
        <p className="text-gray-600 mt-1">Gestione contabilità e pagamenti</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-3 mb-3">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">Filtro Temporale</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="col-span-1 md:col-span-2 lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Periodo
            </label>
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value as TimeFilter)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Tutti</option>
              <option value="past">Passato (prima di oggi)</option>
              <option value="today">Oggi</option>
              <option value="week">Prossimi 7 giorni</option>
              <option value="month">Prossimi 30 giorni</option>
              <option value="future">Futuro (da oggi in poi)</option>
              <option value="custom">Periodo Personalizzato</option>
            </select>
          </div>

          {timeFilter === 'custom' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data Inizio
                </label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data Fine
                </label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </>
          )}
        </div>

        {timeFilter !== 'all' && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Filtro attivo:</strong> {
                timeFilter === 'past' ? 'Visualizzazione transazioni passate' :
                timeFilter === 'today' ? 'Visualizzazione transazioni di oggi' :
                timeFilter === 'week' ? 'Visualizzazione prossimi 7 giorni' :
                timeFilter === 'month' ? 'Visualizzazione prossimi 30 giorni' :
                timeFilter === 'future' ? 'Visualizzazione transazioni future' :
                timeFilter === 'custom' && customStartDate && customEndDate ?
                  `Dal ${new Date(customStartDate).toLocaleDateString('it-IT')} al ${new Date(customEndDate).toLocaleDateString('it-IT')}` :
                'Seleziona le date personalizzate'
              }
            </p>
          </div>
        )}
      </div>

      {upcomingRiba.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-orange-900">RiBa in Scadenza</h3>
              <p className="text-sm text-orange-800 mt-1">
                Hai {upcomingRiba.length} RiBa fornitore in scadenza nei prossimi 7 giorni
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex overflow-x-auto">
            <button
              onClick={() => setActiveTab('invoices')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'invoices'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <FileText className="w-4 h-4 inline mr-2" />
              Fatture Emesse
            </button>
            <button
              onClick={() => setActiveTab('schedule')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'schedule'
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Calendar className="w-4 h-4 inline mr-2" />
              Scadenziario
            </button>
            <button
              onClick={() => setActiveTab('riba')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'riba'
                  ? 'border-orange-600 text-orange-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <AlertCircle className="w-4 h-4 inline mr-2" />
              RiBa Fornitori
              {upcomingRiba.length > 0 && (
                <span className="ml-2 bg-orange-100 text-orange-800 text-xs font-semibold px-2 py-0.5 rounded-full">
                  {upcomingRiba.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('advances')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'advances'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <TrendingUp className="w-4 h-4 inline mr-2" />
              Anticipi Fatture
            </button>
            <button
              onClick={() => setActiveTab('cards')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'cards'
                  ? 'border-teal-600 text-teal-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <CreditCard className="w-4 h-4 inline mr-2" />
              Carte & Telepass
            </button>
            <button
              onClick={() => setActiveTab('calculations')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'calculations'
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <DollarSign className="w-4 h-4 inline mr-2" />
              Calcolo Fatture
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'invoices' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">
                  Fatture Emesse
                  {timeFilter !== 'all' && (
                    <span className="ml-2 text-sm font-normal text-gray-600">
                      ({filterByDate(issuedInvoices).length} di {issuedInvoices.length})
                    </span>
                  )}
                </h2>
                <button
                  onClick={() => setShowInvoiceModal(true)}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  Nuova Fattura
                </button>
              </div>

              {filterByDate(issuedInvoices).length > 0 ? (
                <div className="space-y-2">
                  {filterByDate(issuedInvoices).map((invoice) => (
                    <div
                      key={invoice.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-4">
                          <p className="font-semibold text-gray-900">{invoice.invoice_number}</p>
                          <p className="text-sm text-gray-600">{invoice.client_name}</p>
                          <p className="font-bold text-blue-600">{formatCurrency(parseFloat(invoice.amount.toString()))}</p>
                          <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(invoice.payment_status, 'invoice')}`}>
                            {getStatusLabel(invoice.payment_status, 'invoice')}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                          <span>Emessa: {formatDate(invoice.issue_date)}</span>
                          <span className={isOverdue(invoice.due_date) && invoice.payment_status === 'pending' ? 'text-red-600 font-semibold' : ''}>
                            Scadenza: {formatDate(invoice.due_date)}
                          </span>
                          {invoice.notes && <span className="text-xs italic">Note: {invoice.notes}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={invoice.payment_status}
                          onChange={(e) => handleUpdateInvoice(invoice.id, { payment_status: e.target.value as any })}
                          className="text-sm border border-gray-300 rounded px-2 py-1 pr-8 appearance-none bg-no-repeat bg-right bg-[length:16px] cursor-pointer"
                          style={{ backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")", backgroundPosition: "right 0.25rem center" }}
                        >
                          <option value="pending">In Attesa</option>
                          <option value="paid">Pagato</option>
                          <option value="overdue">Scaduto</option>
                        </select>
                        <button
                          onClick={() => handleDeleteInvoice(invoice.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">
                  {timeFilter !== 'all' && issuedInvoices.length > 0
                    ? 'Nessuna fattura nel periodo selezionato'
                    : 'Nessuna fattura emessa'}
                </p>
              )}
            </div>
          )}

          {activeTab === 'schedule' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">
                  Scadenziario
                  {timeFilter !== 'all' && (
                    <span className="ml-2 text-sm font-normal text-gray-600">
                      ({filterByDate(paymentSchedule).length} di {paymentSchedule.length})
                    </span>
                  )}
                </h2>
                <button
                  onClick={() => setShowScheduleModal(true)}
                  className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                >
                  <Plus className="w-4 h-4" />
                  Nuova Scadenza
                </button>
              </div>

              {filterByDate(paymentSchedule).length > 0 ? (
                <div className="space-y-2">
                  {filterByDate(paymentSchedule).map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-4">
                          <p className="font-semibold text-gray-900">{item.title}</p>
                          <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                            {getTypeLabel(item.type)}
                          </span>
                          <p className="font-bold text-green-600">{formatCurrency(parseFloat(item.amount.toString()))}</p>
                          <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(item.payment_status, 'schedule')}`}>
                            {getStatusLabel(item.payment_status, 'schedule')}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                          <span className={isOverdue(item.due_date) && item.payment_status === 'pending' ? 'text-red-600 font-semibold' : ''}>
                            Scadenza: {formatDate(item.due_date)}
                          </span>
                          {item.notes && <span className="text-xs italic">Note: {item.notes}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={item.payment_status}
                          onChange={(e) => handleUpdateScheduleItem(item.id, { payment_status: e.target.value as any })}
                          className="text-sm border border-gray-300 rounded px-2 py-1 pr-8 appearance-none bg-no-repeat bg-right bg-[length:16px] cursor-pointer"
                          style={{ backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")", backgroundPosition: "right 0.25rem center" }}
                        >
                          <option value="pending">In Attesa</option>
                          <option value="paid">Pagato</option>
                          <option value="overdue">Scaduto</option>
                        </select>
                        <button
                          onClick={() => handleDeleteScheduleItem(item.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">
                  {timeFilter !== 'all' && paymentSchedule.length > 0
                    ? 'Nessuna scadenza nel periodo selezionato'
                    : 'Nessuna scadenza registrata'}
                </p>
              )}
            </div>
          )}

          {activeTab === 'riba' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">
                  RiBa Fornitori
                  {timeFilter !== 'all' && (
                    <span className="ml-2 text-sm font-normal text-gray-600">
                      ({filterByDate(supplierRiba).length} di {supplierRiba.length})
                    </span>
                  )}
                </h2>
                <button
                  onClick={() => setShowRibaModal(true)}
                  className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700"
                >
                  <Plus className="w-4 h-4" />
                  Nuovo RiBa
                </button>
              </div>

              {filterByDate(supplierRiba).length > 0 ? (
                <div className="space-y-2">
                  {filterByDate(supplierRiba).map((riba) => {
                    const daysUntilDue = Math.ceil((new Date(riba.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                    const isUpcoming = daysUntilDue <= 7 && daysUntilDue > 0 && riba.payment_status === 'pending';

                    return (
                      <div
                        key={riba.id}
                        className={`flex items-center justify-between p-4 rounded-lg hover:bg-gray-100 ${
                          isUpcoming ? 'bg-orange-50 border border-orange-200' : 'bg-gray-50'
                        }`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-4">
                            {isUpcoming && <AlertCircle className="w-5 h-5 text-orange-600" />}
                            <p className="font-semibold text-gray-900">{riba.supplier_name}</p>
                            <p className="text-sm text-gray-600">{riba.riba_number}</p>
                            <p className="font-bold text-orange-600">{formatCurrency(parseFloat(riba.amount.toString()))}</p>
                            <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(riba.payment_status, 'riba')}`}>
                              {getStatusLabel(riba.payment_status, 'riba')}
                            </span>
                            {riba.notification_sent && (
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                Notificato
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                            <span className={isOverdue(riba.due_date) && riba.payment_status === 'pending' ? 'text-red-600 font-semibold' : isUpcoming ? 'text-orange-600 font-semibold' : ''}>
                              Scadenza: {formatDate(riba.due_date)}
                              {isUpcoming && ` (fra ${daysUntilDue} giorni)`}
                            </span>
                            {riba.notes && <span className="text-xs italic">Note: {riba.notes}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            value={riba.payment_status}
                            onChange={(e) => handleUpdateRiba(riba.id, { payment_status: e.target.value as any })}
                            className="text-sm border border-gray-300 rounded px-2 py-1 pr-8 appearance-none bg-no-repeat bg-right bg-[length:16px] cursor-pointer"
                            style={{ backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")", backgroundPosition: "right 0.25rem center" }}
                          >
                            <option value="pending">In Attesa</option>
                            <option value="paid">Pagato</option>
                            <option value="overdue">Scaduto</option>
                          </select>
                          <button
                            onClick={() => handleDeleteRiba(riba.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">
                  {timeFilter !== 'all' && supplierRiba.length > 0
                    ? 'Nessun RiBa nel periodo selezionato'
                    : 'Nessun RiBa registrato'}
                </p>
              )}
            </div>
          )}

          {activeTab === 'advances' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">
                  Anticipi Fatture
                  {timeFilter !== 'all' && (
                    <span className="ml-2 text-sm font-normal text-gray-600">
                      ({filterByDate(invoiceAdvances).length} di {invoiceAdvances.length})
                    </span>
                  )}
                </h2>
                <button
                  onClick={() => setShowAdvanceModal(true)}
                  className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
                >
                  <Plus className="w-4 h-4" />
                  Nuovo Anticipo
                </button>
              </div>

              {filterByDate(invoiceAdvances).length > 0 ? (
                <div className="space-y-2">
                  {filterByDate(invoiceAdvances).map((advance) => (
                    <div
                      key={advance.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-4">
                          <p className="font-semibold text-gray-900">{advance.invoice_reference}</p>
                          <p className="text-sm text-gray-600">{advance.bank_name}</p>
                          <p className="font-bold text-purple-600">{formatCurrency(parseFloat(advance.amount.toString()))}</p>
                          <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(advance.payment_status, 'advance')}`}>
                            {getStatusLabel(advance.payment_status, 'advance')}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                          <span>Data: {formatDate(advance.advance_date)}</span>
                          {advance.notes && <span className="text-xs italic">Note: {advance.notes}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={advance.payment_status}
                          onChange={(e) => handleUpdateAdvance(advance.id, { payment_status: e.target.value as any })}
                          className="text-sm border border-gray-300 rounded px-2 py-1 pr-8 appearance-none bg-no-repeat bg-right bg-[length:16px] cursor-pointer"
                          style={{ backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")", backgroundPosition: "right 0.25rem center" }}
                        >
                          <option value="pending">In Attesa</option>
                          <option value="received">Ricevuto</option>
                          <option value="rejected">Rifiutato</option>
                        </select>
                        <button
                          onClick={() => handleDeleteAdvance(advance.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">
                  {timeFilter !== 'all' && invoiceAdvances.length > 0
                    ? 'Nessun anticipo nel periodo selezionato'
                    : 'Nessun anticipo registrato'}
                </p>
              )}
            </div>
          )}

          {activeTab === 'cards' && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Riepilogo Mensile Carte & Telepass</h2>

              {monthlySummary.length > 0 ? (
                <div className="space-y-6">
                  {Array.from(new Set(monthlySummary.map(s => s.month))).map((month) => {
                    const monthData = monthlySummary.filter(s => s.month === month);
                    const cards = monthData.filter(s => s.card_type === 'card');
                    const telepasses = monthData.filter(s => s.card_type === 'telepass');
                    const totalCards = cards.reduce((sum, c) => sum + parseFloat(c.total_amount.toString()), 0);
                    const totalTelepasses = telepasses.reduce((sum, t) => sum + parseFloat(t.total_amount.toString()), 0);

                    return (
                      <div key={month} className="border border-gray-200 rounded-lg p-4">
                        <h3 className="text-lg font-semibold mb-4">
                          {new Date(month).toLocaleDateString('it-IT', { year: 'numeric', month: 'long' })}
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-center gap-3">
                              <CreditCard className="w-8 h-8 text-blue-600" />
                              <div>
                                <p className="text-sm text-blue-600 font-medium">Totale Carte</p>
                                <p className="text-2xl font-bold text-blue-900">{formatCurrency(totalCards)}</p>
                                <p className="text-xs text-blue-700 mt-1">{cards.length} carte attive</p>
                              </div>
                            </div>
                          </div>

                          <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
                            <div className="flex items-center gap-3">
                              <DollarSign className="w-8 h-8 text-teal-600" />
                              <div>
                                <p className="text-sm text-teal-600 font-medium">Totale Telepass</p>
                                <p className="text-2xl font-bold text-teal-900">{formatCurrency(totalTelepasses)}</p>
                                <p className="text-xs text-teal-700 mt-1">{telepasses.length} telepass attivi</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          {monthData.map((item) => (
                            <div key={item.card_id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                              <div className="flex items-center gap-3">
                                {item.card_type === 'card' ? (
                                  <CreditCard className="w-4 h-4 text-blue-600" />
                                ) : (
                                  <DollarSign className="w-4 h-4 text-teal-600" />
                                )}
                                <div>
                                  <p className="font-medium text-gray-900">{item.card_name}</p>
                                  {item.info && <p className="text-xs text-gray-600">{item.info}</p>}
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-gray-900">{formatCurrency(parseFloat(item.total_amount.toString()))}</p>
                                <p className="text-xs text-gray-600">{item.transaction_count} transazioni</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">Nessuna transazione registrata</p>
              )}
            </div>
          )}

          {activeTab === 'calculations' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">
                  Calcolo Fatture
                  {timeFilter !== 'all' && (
                    <span className="ml-2 text-sm font-normal text-gray-600">
                      ({filterByDate(invoiceCalculations).length} di {invoiceCalculations.length})
                    </span>
                  )}
                </h2>
                <button
                  onClick={() => setShowCalculationModal(true)}
                  className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700"
                >
                  <Plus className="w-4 h-4" />
                  Nuovo Elemento
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-green-900 mb-4">Fatture Incasso</h3>
                  <div className="space-y-2 mb-4">
                    {filterByDate(invoiceCalculations).filter(c => c.type === 'income').map((calc) => (
                      <div key={calc.id} className="flex items-center justify-between p-3 bg-white rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{calc.invoice_number}</p>
                          <p className="text-xs text-gray-600">{calc.client_name}</p>
                          <p className="text-xs text-gray-500">{formatDate(calc.invoice_date)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-green-600">{formatCurrency(parseFloat(calc.amount.toString()))}</p>
                          <button
                            onClick={() => handleDeleteCalculation(calc.id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-green-300 pt-4">
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-medium text-green-900">Totale Incassi:</p>
                      <p className="text-2xl font-bold text-green-700">
                        {formatCurrency(
                          filterByDate(invoiceCalculations)
                            .filter(c => c.type === 'income')
                            .reduce((sum, c) => sum + parseFloat(c.amount.toString()), 0)
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-red-900 mb-4">Fatture Spese</h3>
                  <div className="space-y-2 mb-4">
                    {filterByDate(invoiceCalculations).filter(c => c.type === 'expense').map((calc) => (
                      <div key={calc.id} className="flex items-center justify-between p-3 bg-white rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{calc.invoice_number}</p>
                          <p className="text-xs text-gray-600">{calc.client_name}</p>
                          <p className="text-xs text-gray-500">{formatDate(calc.invoice_date)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-red-600">{formatCurrency(parseFloat(calc.amount.toString()))}</p>
                          <button
                            onClick={() => handleDeleteCalculation(calc.id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-red-300 pt-4">
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-medium text-red-900">Totale Spese:</p>
                      <p className="text-2xl font-bold text-red-700">
                        {formatCurrency(
                          filterByDate(invoiceCalculations)
                            .filter(c => c.type === 'expense')
                            .reduce((sum, c) => sum + parseFloat(c.amount.toString()), 0)
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-blue-900 mb-4">Preventivi</h3>
                  <div className="space-y-2 mb-4">
                    {filterByDate(invoiceCalculations).filter(c => c.type === 'estimate').map((calc) => (
                      <div key={calc.id} className="flex items-center justify-between p-3 bg-white rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{calc.invoice_number}</p>
                          <p className="text-xs text-gray-600">{calc.client_name}</p>
                          <p className="text-xs text-gray-500">{formatDate(calc.invoice_date)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-blue-600">{formatCurrency(parseFloat(calc.amount.toString()))}</p>
                          <button
                            onClick={() => handleDeleteCalculation(calc.id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-blue-300 pt-4">
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-medium text-blue-900">Totale Preventivi:</p>
                      <p className="text-2xl font-bold text-blue-700">
                        {formatCurrency(
                          filterByDate(invoiceCalculations)
                            .filter(c => c.type === 'estimate')
                            .reduce((sum, c) => sum + parseFloat(c.amount.toString()), 0)
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {timeFilter !== 'all' && (
                <div className="mt-6 p-4 bg-gradient-to-r from-emerald-50 to-blue-50 border border-emerald-200 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">Riepilogo Periodo Filtrato</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Incassi Totali</p>
                      <p className="text-xl font-bold text-green-700">
                        {formatCurrency(
                          filterByDate(invoiceCalculations)
                            .filter(c => c.type === 'income')
                            .reduce((sum, c) => sum + parseFloat(c.amount.toString()), 0)
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Spese Totali</p>
                      <p className="text-xl font-bold text-red-700">
                        {formatCurrency(
                          filterByDate(invoiceCalculations)
                            .filter(c => c.type === 'expense')
                            .reduce((sum, c) => sum + parseFloat(c.amount.toString()), 0)
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Bilancio Netto</p>
                      <p className="text-xl font-bold text-blue-700">
                        {formatCurrency(
                          filterByDate(invoiceCalculations)
                            .filter(c => c.type === 'income')
                            .reduce((sum, c) => sum + parseFloat(c.amount.toString()), 0) -
                          filterByDate(invoiceCalculations)
                            .filter(c => c.type === 'expense')
                            .reduce((sum, c) => sum + parseFloat(c.amount.toString()), 0)
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showInvoiceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Nuova Fattura Emessa</h2>
            <form onSubmit={handleAddInvoice} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Numero Fattura *
                  </label>
                  <input
                    type="text"
                    value={invoiceForm.invoice_number}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, invoice_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cliente *
                  </label>
                  <input
                    type="text"
                    value={invoiceForm.client_name}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, client_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Importo (€) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={invoiceForm.amount}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stato *
                  </label>
                  <select
                    value={invoiceForm.payment_status}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, payment_status: e.target.value as any })}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg appearance-none bg-no-repeat bg-right bg-[length:20px] cursor-pointer"
                    style={{ backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")", backgroundPosition: "right 0.5rem center" }}
                    required
                  >
                    <option value="pending">In Attesa</option>
                    <option value="paid">Pagato</option>
                    <option value="overdue">Scaduto</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data Emissione *
                  </label>
                  <input
                    type="date"
                    value={invoiceForm.issue_date}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, issue_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data Scadenza *
                  </label>
                  <input
                    type="date"
                    value={invoiceForm.due_date}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, due_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Note
                </label>
                <textarea
                  value={invoiceForm.notes}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={3}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowInvoiceModal(false);
                    resetInvoiceForm();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Aggiungi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showScheduleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Nuova Scadenza</h2>
            <form onSubmit={handleAddScheduleItem} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Titolo *
                  </label>
                  <input
                    type="text"
                    value={scheduleForm.title}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo *
                  </label>
                  <select
                    value={scheduleForm.type}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, type: e.target.value as any })}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg appearance-none bg-no-repeat bg-right bg-[length:20px] cursor-pointer"
                    style={{ backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")", backgroundPosition: "right 0.5rem center" }}
                    required
                  >
                    <option value="bill">Bolletta</option>
                    <option value="invoice">Fattura</option>
                    <option value="payment">Pagamento</option>
                    <option value="other">Altro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Importo (€) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={scheduleForm.amount}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stato *
                  </label>
                  <select
                    value={scheduleForm.payment_status}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, payment_status: e.target.value as any })}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg appearance-none bg-no-repeat bg-right bg-[length:20px] cursor-pointer"
                    style={{ backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")", backgroundPosition: "right 0.5rem center" }}
                    required
                  >
                    <option value="pending">In Attesa</option>
                    <option value="paid">Pagato</option>
                    <option value="overdue">Scaduto</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data Scadenza *
                  </label>
                  <input
                    type="date"
                    value={scheduleForm.due_date}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, due_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Note
                </label>
                <textarea
                  value={scheduleForm.notes}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={3}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowScheduleModal(false);
                    resetScheduleForm();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                >
                  Aggiungi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showRibaModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Nuovo RiBa Fornitore</h2>
            <form onSubmit={handleAddRiba} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome Fornitore *
                  </label>
                  <input
                    type="text"
                    value={ribaForm.supplier_name}
                    onChange={(e) => setRibaForm({ ...ribaForm, supplier_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Numero RiBa *
                  </label>
                  <input
                    type="text"
                    value={ribaForm.riba_number}
                    onChange={(e) => setRibaForm({ ...ribaForm, riba_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Importo (€) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={ribaForm.amount}
                    onChange={(e) => setRibaForm({ ...ribaForm, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stato *
                  </label>
                  <select
                    value={ribaForm.payment_status}
                    onChange={(e) => setRibaForm({ ...ribaForm, payment_status: e.target.value as any })}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg appearance-none bg-no-repeat bg-right bg-[length:20px] cursor-pointer"
                    style={{ backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")", backgroundPosition: "right 0.5rem center" }}
                    required
                  >
                    <option value="pending">In Attesa</option>
                    <option value="paid">Pagato</option>
                    <option value="overdue">Scaduto</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data Scadenza *
                  </label>
                  <input
                    type="date"
                    value={ribaForm.due_date}
                    onChange={(e) => setRibaForm({ ...ribaForm, due_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Note
                </label>
                <textarea
                  value={ribaForm.notes}
                  onChange={(e) => setRibaForm({ ...ribaForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={3}
                />
              </div>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <p className="text-sm text-orange-800">
                  Riceverai una notifica automatica 7 giorni prima della scadenza
                </p>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowRibaModal(false);
                    resetRibaForm();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700"
                >
                  Aggiungi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAdvanceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Nuovo Anticipo Fattura</h2>
            <form onSubmit={handleAddAdvance} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Riferimento Fattura *
                  </label>
                  <input
                    type="text"
                    value={advanceForm.invoice_reference}
                    onChange={(e) => setAdvanceForm({ ...advanceForm, invoice_reference: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome Banca *
                  </label>
                  <input
                    type="text"
                    value={advanceForm.bank_name}
                    onChange={(e) => setAdvanceForm({ ...advanceForm, bank_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Importo (€) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={advanceForm.amount}
                    onChange={(e) => setAdvanceForm({ ...advanceForm, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stato *
                  </label>
                  <select
                    value={advanceForm.payment_status}
                    onChange={(e) => setAdvanceForm({ ...advanceForm, payment_status: e.target.value as any })}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg appearance-none bg-no-repeat bg-right bg-[length:20px] cursor-pointer"
                    style={{ backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")", backgroundPosition: "right 0.5rem center" }}
                    required
                  >
                    <option value="pending">In Attesa</option>
                    <option value="received">Ricevuto</option>
                    <option value="rejected">Rifiutato</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data Anticipo *
                  </label>
                  <input
                    type="date"
                    value={advanceForm.advance_date}
                    onChange={(e) => setAdvanceForm({ ...advanceForm, advance_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Note
                </label>
                <textarea
                  value={advanceForm.notes}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={3}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAdvanceModal(false);
                    resetAdvanceForm();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
                >
                  Aggiungi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCalculationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Nuovo Elemento</h2>
            <form onSubmit={handleAddCalculation} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Categoria *
                  </label>
                  <select
                    value={calculationForm.type}
                    onChange={(e) => setCalculationForm({ ...calculationForm, type: e.target.value as any })}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg appearance-none bg-no-repeat bg-right bg-[length:20px] cursor-pointer"
                    style={{ backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")", backgroundPosition: "right 0.5rem center" }}
                    required
                  >
                    <option value="income">Fattura Incasso</option>
                    <option value="expense">Fattura Spesa</option>
                    <option value="estimate">Preventivo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Numero Fattura/Preventivo *
                  </label>
                  <input
                    type="text"
                    value={calculationForm.invoice_number}
                    onChange={(e) => setCalculationForm({ ...calculationForm, invoice_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data *
                  </label>
                  <input
                    type="date"
                    value={calculationForm.invoice_date}
                    onChange={(e) => setCalculationForm({ ...calculationForm, invoice_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome Cliente *
                  </label>
                  <input
                    type="text"
                    value={calculationForm.client_name}
                    onChange={(e) => setCalculationForm({ ...calculationForm, client_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Inserisci nome cliente"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Importo (€) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={calculationForm.amount}
                    onChange={(e) => setCalculationForm({ ...calculationForm, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCalculationModal(false);
                    resetCalculationForm();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700"
                >
                  Aggiungi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
