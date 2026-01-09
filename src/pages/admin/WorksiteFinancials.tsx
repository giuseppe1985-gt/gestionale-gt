import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, Plus, Trash2, Download, Euro, FileText, Wallet } from 'lucide-react';

interface Worksite {
  id: string;
  name: string;
}

interface Revenue {
  id: string;
  amount: number;
  description: string;
  date: string;
  created_at: string;
}

interface Invoice {
  id: string;
  amount: number;
  invoice_number: string;
  description: string;
  date: string;
  file_path: string | null;
  file_name: string | null;
  created_at: string;
}

interface LiquidAsset {
  id: string;
  amount: number;
  description: string;
  date: string;
  created_at: string;
}

interface Props {
  worksiteId: string;
  onBack: () => void;
}

export default function WorksiteFinancials({ worksiteId, onBack }: Props) {
  const { profile } = useAuth();
  const [worksite, setWorksite] = useState<Worksite | null>(null);
  const [revenues, setRevenues] = useState<Revenue[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [liquidAssets, setLiquidAssets] = useState<LiquidAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'revenues' | 'invoices' | 'liquid'>('revenues');

  const [revenueForm, setRevenueForm] = useState({
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [invoiceForm, setInvoiceForm] = useState({
    amount: '',
    invoice_number: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [liquidForm, setLiquidForm] = useState({
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [uploadingInvoice, setUploadingInvoice] = useState(false);

  useEffect(() => {
    loadData();
  }, [worksiteId]);

  const loadData = async () => {
    try {
      setLoading(true);

      const [worksiteResult, revenuesResult, invoicesResult, liquidResult] = await Promise.all([
        supabase.from('worksites').select('id, name').eq('id', worksiteId).single(),
        supabase.from('worksite_revenues').select('*').eq('worksite_id', worksiteId).order('date', { ascending: false }),
        supabase.from('worksite_invoices').select('*').eq('worksite_id', worksiteId).order('date', { ascending: false }),
        supabase.from('worksite_liquid_assets').select('*').eq('worksite_id', worksiteId).order('date', { ascending: false })
      ]);

      if (worksiteResult.error) throw worksiteResult.error;
      if (revenuesResult.error) throw revenuesResult.error;
      if (invoicesResult.error) throw invoicesResult.error;
      if (liquidResult.error) throw liquidResult.error;

      setWorksite(worksiteResult.data);
      setRevenues(revenuesResult.data || []);
      setInvoices(invoicesResult.data || []);
      setLiquidAssets(liquidResult.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Errore nel caricamento dei dati');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRevenue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revenueForm.amount || !revenueForm.date) {
      alert('Compila tutti i campi obbligatori');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !profile?.organization_id) throw new Error('User not authenticated');

      const { error } = await supabase.from('worksite_revenues').insert({
        worksite_id: worksiteId,
        amount: parseFloat(revenueForm.amount),
        description: revenueForm.description,
        date: revenueForm.date,
        created_by: user.id,
        organization_id: profile.organization_id
      });

      if (error) throw error;

      alert('Incasso aggiunto con successo');
      setRevenueForm({
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0]
      });
      await loadData();
    } catch (error) {
      console.error('Error adding revenue:', error);
      alert('Errore nell\'aggiunta dell\'incasso');
    }
  };

  const handleAddInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceForm.amount || !invoiceForm.invoice_number || !invoiceForm.date) {
      alert('Compila tutti i campi obbligatori');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !profile?.organization_id) throw new Error('User not authenticated');

      const { error } = await supabase.from('worksite_invoices').insert({
        worksite_id: worksiteId,
        amount: parseFloat(invoiceForm.amount),
        invoice_number: invoiceForm.invoice_number,
        description: invoiceForm.description,
        date: invoiceForm.date,
        created_by: user.id,
        organization_id: profile.organization_id
      });

      if (error) throw error;

      alert('Fattura aggiunta con successo');
      setInvoiceForm({
        amount: '',
        invoice_number: '',
        description: '',
        date: new Date().toISOString().split('T')[0]
      });
      await loadData();
    } catch (error) {
      console.error('Error adding invoice:', error);
      alert('Errore nell\'aggiunta della fattura');
    }
  };

  const handleAddLiquidAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!liquidForm.amount || !liquidForm.date) {
      alert('Compila tutti i campi obbligatori');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !profile?.organization_id) throw new Error('User not authenticated');

      const { error } = await supabase.from('worksite_liquid_assets').insert({
        worksite_id: worksiteId,
        amount: parseFloat(liquidForm.amount),
        description: liquidForm.description,
        date: liquidForm.date,
        created_by: user.id,
        organization_id: profile.organization_id
      });

      if (error) throw error;

      alert('Disponibilità liquida aggiunta con successo');
      setLiquidForm({
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0]
      });
      await loadData();
    } catch (error) {
      console.error('Error adding liquid asset:', error);
      alert('Errore nell\'aggiunta della disponibilità liquida');
    }
  };

  const handleUploadInvoiceFile = async (invoiceId: string, file: File) => {
    try {
      setUploadingInvoice(true);

      const fileExt = file.name.split('.').pop();
      const fileName = `${worksiteId}/${invoiceId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('worksite-invoices')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { error: updateError } = await supabase
        .from('worksite_invoices')
        .update({
          file_path: fileName,
          file_name: file.name
        })
        .eq('id', invoiceId);

      if (updateError) throw updateError;

      alert('File caricato con successo');
      await loadData();
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Errore nel caricamento del file');
    } finally {
      setUploadingInvoice(false);
    }
  };

  const handleDownloadInvoiceFile = async (invoice: Invoice) => {
    if (!invoice.file_path) return;

    try {
      const { data, error } = await supabase.storage
        .from('worksite-invoices')
        .download(invoice.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = invoice.file_name || 'fattura';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Errore nel download del file');
    }
  };

  const handleDeleteRevenue = async (id: string) => {
    if (!confirm('Eliminare questo incasso?')) return;

    try {
      const { error } = await supabase
        .from('worksite_revenues')
        .delete()
        .eq('id', id);

      if (error) throw error;

      alert('Incasso eliminato con successo');
      await loadData();
    } catch (error) {
      console.error('Error deleting revenue:', error);
      alert('Errore nell\'eliminazione dell\'incasso');
    }
  };

  const handleDeleteInvoice = async (invoice: Invoice) => {
    if (!confirm('Eliminare questa fattura?')) return;

    try {
      if (invoice.file_path) {
        await supabase.storage
          .from('worksite-invoices')
          .remove([invoice.file_path]);
      }

      const { error } = await supabase
        .from('worksite_invoices')
        .delete()
        .eq('id', invoice.id);

      if (error) throw error;

      alert('Fattura eliminata con successo');
      await loadData();
    } catch (error) {
      console.error('Error deleting invoice:', error);
      alert('Errore nell\'eliminazione della fattura');
    }
  };

  const handleDeleteLiquidAsset = async (id: string) => {
    if (!confirm('Eliminare questa disponibilità liquida?')) return;

    try {
      const { error } = await supabase
        .from('worksite_liquid_assets')
        .delete()
        .eq('id', id);

      if (error) throw error;

      alert('Disponibilità liquida eliminata con successo');
      await loadData();
    } catch (error) {
      console.error('Error deleting liquid asset:', error);
      alert('Errore nell\'eliminazione della disponibilità liquida');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const totalRevenues = revenues.reduce((sum, r) => sum + parseFloat(r.amount.toString()), 0);
  const totalInvoices = invoices.reduce((sum, i) => sum + parseFloat(i.amount.toString()), 0);
  const totalLiquidAssets = liquidAssets.reduce((sum, l) => sum + parseFloat(l.amount.toString()), 0);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Caricamento...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dati Finanziari - {worksite?.name}</h1>
          <p className="text-gray-600 mt-1">Gestisci incassi, fatture e disponibilità liquide del cantiere</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Euro className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-green-600 font-medium">Totale Incassi</p>
              <p className="text-xl font-bold text-green-900">{formatCurrency(totalRevenues)}</p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-blue-600 font-medium">Totale Fatturato</p>
              <p className="text-xl font-bold text-blue-900">{formatCurrency(totalInvoices)}</p>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Wallet className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-purple-600 font-medium">Disponibilità Liquide</p>
              <p className="text-xl font-bold text-purple-900">{formatCurrency(totalLiquidAssets)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('revenues')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'revenues'
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Incassi
            </button>
            <button
              onClick={() => setActiveTab('invoices')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'invoices'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Fatture
            </button>
            <button
              onClick={() => setActiveTab('liquid')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'liquid'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Disponibilità Liquide
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'revenues' && (
            <div className="space-y-6">
              <form onSubmit={handleAddRevenue} className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Aggiungi Incasso
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Importo (€) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={revenueForm.amount}
                      onChange={(e) => setRevenueForm({ ...revenueForm, amount: e.target.value })}
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
                      value={revenueForm.date}
                      onChange={(e) => setRevenueForm({ ...revenueForm, date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Descrizione
                    </label>
                    <input
                      type="text"
                      value={revenueForm.description}
                      onChange={(e) => setRevenueForm({ ...revenueForm, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="Es: Pagamento cliente"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Aggiungi Incasso
                </button>
              </form>

              <div>
                <h3 className="text-lg font-semibold mb-3">Storico Incassi</h3>
                {revenues.length > 0 ? (
                  <div className="space-y-2">
                    {revenues.map((revenue) => (
                      <div
                        key={revenue.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-4">
                            <p className="text-lg font-bold text-green-600">
                              {formatCurrency(parseFloat(revenue.amount.toString()))}
                            </p>
                            <p className="text-sm text-gray-600">
                              {new Date(revenue.date).toLocaleDateString('it-IT')}
                            </p>
                          </div>
                          {revenue.description && (
                            <p className="text-sm text-gray-600 mt-1">{revenue.description}</p>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeleteRevenue(revenue.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">Nessun incasso registrato</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'invoices' && (
            <div className="space-y-6">
              <form onSubmit={handleAddInvoice} className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Aggiungi Fattura
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      Numero Fattura *
                    </label>
                    <input
                      type="text"
                      value={invoiceForm.invoice_number}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, invoice_number: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="Es: FT-2026-001"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Data *
                    </label>
                    <input
                      type="date"
                      value={invoiceForm.date}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Descrizione
                    </label>
                    <input
                      type="text"
                      value={invoiceForm.description}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="Es: Lavori dicembre"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Aggiungi Fattura
                </button>
              </form>

              <div>
                <h3 className="text-lg font-semibold mb-3">Storico Fatture</h3>
                {invoices.length > 0 ? (
                  <div className="space-y-2">
                    {invoices.map((invoice) => (
                      <div
                        key={invoice.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-4">
                            <p className="text-lg font-bold text-blue-600">
                              {formatCurrency(parseFloat(invoice.amount.toString()))}
                            </p>
                            <p className="text-sm font-medium text-gray-900">
                              {invoice.invoice_number}
                            </p>
                            <p className="text-sm text-gray-600">
                              {new Date(invoice.date).toLocaleDateString('it-IT')}
                            </p>
                          </div>
                          {invoice.description && (
                            <p className="text-sm text-gray-600 mt-1">{invoice.description}</p>
                          )}
                          {invoice.file_name && (
                            <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              {invoice.file_name}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {invoice.file_path ? (
                            <button
                              onClick={() => handleDownloadInvoiceFile(invoice)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                              title="Scarica file"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          ) : (
                            <label className="p-2 text-green-600 hover:bg-green-50 rounded-lg cursor-pointer" title="Carica file">
                              <Plus className="w-4 h-4" />
                              <input
                                type="file"
                                className="hidden"
                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleUploadInvoiceFile(invoice.id, file);
                                }}
                                disabled={uploadingInvoice}
                              />
                            </label>
                          )}
                          <button
                            onClick={() => handleDeleteInvoice(invoice)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">Nessuna fattura registrata</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'liquid' && (
            <div className="space-y-6">
              <form onSubmit={handleAddLiquidAsset} className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Aggiungi Disponibilità Liquida
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Importo (€) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={liquidForm.amount}
                      onChange={(e) => setLiquidForm({ ...liquidForm, amount: e.target.value })}
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
                      value={liquidForm.date}
                      onChange={(e) => setLiquidForm({ ...liquidForm, date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Descrizione
                    </label>
                    <input
                      type="text"
                      value={liquidForm.description}
                      onChange={(e) => setLiquidForm({ ...liquidForm, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="Es: Cassa contanti"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Aggiungi Disponibilità
                </button>
              </form>

              <div>
                <h3 className="text-lg font-semibold mb-3">Storico Disponibilità Liquide</h3>
                {liquidAssets.length > 0 ? (
                  <div className="space-y-2">
                    {liquidAssets.map((asset) => (
                      <div
                        key={asset.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-4">
                            <p className="text-lg font-bold text-purple-600">
                              {formatCurrency(parseFloat(asset.amount.toString()))}
                            </p>
                            <p className="text-sm text-gray-600">
                              {new Date(asset.date).toLocaleDateString('it-IT')}
                            </p>
                          </div>
                          {asset.description && (
                            <p className="text-sm text-gray-600 mt-1">{asset.description}</p>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeleteLiquidAsset(asset.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">Nessuna disponibilità liquida registrata</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
