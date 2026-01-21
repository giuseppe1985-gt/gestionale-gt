import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, Plus, Trash2, Download, Euro, FileText, Wallet, Receipt, Calculator } from 'lucide-react';

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
  vat_rate: number;
  vat_amount: number;
  file_path: string | null;
  file_name: string | null;
  created_at: string;
}

interface ExpenseInvoice {
  id: string;
  amount: number;
  invoice_number: string;
  description: string;
  date: string;
  vat_rate: number;
  vat_amount: number;
  supplier_name: string | null;
  file_path: string | null;
  file_name: string | null;
  created_at: string;
}

interface BudgetItem {
  id: string;
  amount: number;
  description: string;
  date: string;
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

// Funzione per calcolare IVA (IVA inclusa nel totale)
const calculateVatFromTotal = (totalAmount: number, vatRate: number): number => {
  if (vatRate === 0) return 0;
  return totalAmount - (totalAmount / (1 + vatRate / 100));
};

export default function WorksiteFinancials({ worksiteId, onBack }: Props) {
  const { profile } = useAuth();
  const [worksite, setWorksite] = useState<Worksite | null>(null);
  const [revenues, setRevenues] = useState<Revenue[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenseInvoices, setExpenseInvoices] = useState<ExpenseInvoice[]>([]);
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
  const [liquidAssets, setLiquidAssets] = useState<LiquidAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'budget' | 'revenues' | 'invoices' | 'expenses' | 'liquid'>('budget');

  const [revenueForm, setRevenueForm] = useState({
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [invoiceForm, setInvoiceForm] = useState({
    amount: '',
    invoice_number: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    vat_rate: '22'
  });

  const [expenseForm, setExpenseForm] = useState({
    amount: '',
    invoice_number: '',
    description: '',
    supplier_name: '',
    date: new Date().toISOString().split('T')[0],
    vat_rate: '22'
  });

  const [budgetForm, setBudgetForm] = useState({
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [liquidForm, setLiquidForm] = useState({
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [uploadingInvoice, setUploadingInvoice] = useState(false);
  const [uploadingExpense, setUploadingExpense] = useState(false);

  useEffect(() => {
    loadData();
  }, [worksiteId]);

  const loadData = async () => {
    try {
      setLoading(true);

      const [worksiteResult, revenuesResult, invoicesResult, expensesResult, budgetResult, liquidResult] = await Promise.all([
        supabase.from('worksites').select('id, name').eq('id', worksiteId).single(),
        supabase.from('worksite_revenues').select('*').eq('worksite_id', worksiteId).order('date', { ascending: false }),
        supabase.from('worksite_invoices').select('*').eq('worksite_id', worksiteId).order('date', { ascending: false }),
        supabase.from('worksite_expense_invoices').select('*').eq('worksite_id', worksiteId).order('date', { ascending: false }),
        supabase.from('worksite_budget_items').select('*').eq('worksite_id', worksiteId).order('date', { ascending: false }),
        supabase.from('worksite_liquid_assets').select('*').eq('worksite_id', worksiteId).order('date', { ascending: false })
      ]);

      if (worksiteResult.error) throw worksiteResult.error;
      if (revenuesResult.error) throw revenuesResult.error;
      if (invoicesResult.error) throw invoicesResult.error;
      if (expensesResult.error) throw expensesResult.error;
      if (budgetResult.error) throw budgetResult.error;
      if (liquidResult.error) throw liquidResult.error;

      setWorksite(worksiteResult.data);
      setRevenues(revenuesResult.data || []);
      setInvoices(invoicesResult.data || []);
      setExpenseInvoices(expensesResult.data || []);
      setBudgetItems(budgetResult.data || []);
      setLiquidAssets(liquidResult.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Errore nel caricamento dei dati');
    } finally {
      setLoading(false);
    }
  };

  const handleAddBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!budgetForm.amount || !budgetForm.date) {
      alert('Compila tutti i campi obbligatori');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !profile?.organization_id) throw new Error('User not authenticated');

      const { error } = await supabase.from('worksite_budget_items').insert({
        worksite_id: worksiteId,
        amount: parseFloat(budgetForm.amount),
        description: budgetForm.description,
        date: budgetForm.date,
        created_by: user.id,
        organization_id: profile.organization_id
      });

      if (error) throw error;

      alert('Importo cantiere aggiunto con successo');
      setBudgetForm({
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0]
      });
      await loadData();
    } catch (error) {
      console.error('Error adding budget:', error);
      alert('Errore nell\'aggiunta dell\'importo cantiere');
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

      const amount = parseFloat(invoiceForm.amount);
      const vatRate = parseInt(invoiceForm.vat_rate);
      const vatAmount = calculateVatFromTotal(amount, vatRate);

      const { error } = await supabase.from('worksite_invoices').insert({
        worksite_id: worksiteId,
        amount: amount,
        invoice_number: invoiceForm.invoice_number,
        description: invoiceForm.description,
        date: invoiceForm.date,
        vat_rate: vatRate,
        vat_amount: vatAmount,
        created_by: user.id,
        organization_id: profile.organization_id
      });

      if (error) throw error;

      alert('Fattura aggiunta con successo');
      setInvoiceForm({
        amount: '',
        invoice_number: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        vat_rate: '22'
      });
      await loadData();
    } catch (error) {
      console.error('Error adding invoice:', error);
      alert('Errore nell\'aggiunta della fattura');
    }
  };

  const handleAddExpenseInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.amount || !expenseForm.invoice_number || !expenseForm.date) {
      alert('Compila tutti i campi obbligatori');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !profile?.organization_id) throw new Error('User not authenticated');

      const amount = parseFloat(expenseForm.amount);
      const vatRate = parseInt(expenseForm.vat_rate);
      const vatAmount = calculateVatFromTotal(amount, vatRate);

      const { error } = await supabase.from('worksite_expense_invoices').insert({
        worksite_id: worksiteId,
        amount: amount,
        invoice_number: expenseForm.invoice_number,
        description: expenseForm.description,
        supplier_name: expenseForm.supplier_name,
        date: expenseForm.date,
        vat_rate: vatRate,
        vat_amount: vatAmount,
        created_by: user.id,
        organization_id: profile.organization_id
      });

      if (error) throw error;

      alert('Fattura spesa aggiunta con successo');
      setExpenseForm({
        amount: '',
        invoice_number: '',
        description: '',
        supplier_name: '',
        date: new Date().toISOString().split('T')[0],
        vat_rate: '22'
      });
      await loadData();
    } catch (error) {
      console.error('Error adding expense invoice:', error);
      alert('Errore nell\'aggiunta della fattura spesa');
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

  const handleUploadExpenseFile = async (invoiceId: string, file: File) => {
    try {
      setUploadingExpense(true);

      const fileExt = file.name.split('.').pop();
      const fileName = `expenses/${worksiteId}/${invoiceId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('worksite-invoices')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { error: updateError } = await supabase
        .from('worksite_expense_invoices')
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
      setUploadingExpense(false);
    }
  };

  const handleDownloadInvoiceFile = async (invoice: Invoice | ExpenseInvoice) => {
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

  const handleDeleteBudget = async (id: string) => {
    if (!confirm('Eliminare questo importo cantiere?')) return;

    try {
      const { error } = await supabase
        .from('worksite_budget_items')
        .delete()
        .eq('id', id);

      if (error) throw error;

      alert('Importo cantiere eliminato con successo');
      await loadData();
    } catch (error) {
      console.error('Error deleting budget:', error);
      alert('Errore nell\'eliminazione dell\'importo cantiere');
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

  const handleDeleteExpenseInvoice = async (invoice: ExpenseInvoice) => {
    if (!confirm('Eliminare questa fattura spesa?')) return;

    try {
      if (invoice.file_path) {
        await supabase.storage
          .from('worksite-invoices')
          .remove([invoice.file_path]);
      }

      const { error } = await supabase
        .from('worksite_expense_invoices')
        .delete()
        .eq('id', invoice.id);

      if (error) throw error;

      alert('Fattura spesa eliminata con successo');
      await loadData();
    } catch (error) {
      console.error('Error deleting expense invoice:', error);
      alert('Errore nell\'eliminazione della fattura spesa');
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

  const totalBudget = budgetItems.reduce((sum, b) => sum + parseFloat(b.amount.toString()), 0);
  const totalRevenues = revenues.reduce((sum, r) => sum + parseFloat(r.amount.toString()), 0);
  const totalInvoices = invoices.reduce((sum, i) => sum + parseFloat(i.amount.toString()), 0);
  const totalExpenses = expenseInvoices.reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0);
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
          <p className="text-gray-600 mt-1">Gestisci importi, incassi, fatture e spese del cantiere</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Calculator className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-orange-600 font-medium">Importo Cantiere</p>
              <p className="text-xl font-bold text-orange-900">{formatCurrency(totalBudget)}</p>
            </div>
          </div>
        </div>

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
              <p className="text-sm text-blue-600 font-medium">Fatture Emesse</p>
              <p className="text-xl font-bold text-blue-900">{formatCurrency(totalInvoices)}</p>
            </div>
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <Receipt className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-red-600 font-medium">Fatture Spese</p>
              <p className="text-xl font-bold text-red-900">{formatCurrency(totalExpenses)}</p>
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
          <nav className="flex flex-wrap">
            <button
              onClick={() => setActiveTab('budget')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'budget'
                  ? 'border-orange-600 text-orange-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Importo Cantiere
            </button>
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
              Fatture Emesse
            </button>
            <button
              onClick={() => setActiveTab('expenses')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'expenses'
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Fatture Spese Cantiere
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
          {/* TAB IMPORTO CANTIERE */}
          {activeTab === 'budget' && (
            <div className="space-y-4 sm:space-y-6">
              <form onSubmit={handleAddBudget} className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Aggiungi Importo Cantiere
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Importo (€) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={budgetForm.amount}
                      onChange={(e) => setBudgetForm({ ...budgetForm, amount: e.target.value })}
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
                      value={budgetForm.date}
                      onChange={(e) => setBudgetForm({ ...budgetForm, date: e.target.value })}
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
                      value={budgetForm.description}
                      onChange={(e) => setBudgetForm({ ...budgetForm, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="Es: Preventivo iniziale"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="mt-4 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                >
                  Aggiungi Importo
                </button>
              </form>

              <div>
                <h3 className="text-lg font-semibold mb-3">Storico Importi Cantiere</h3>
                {budgetItems.length > 0 ? (
                  <div className="space-y-2">
                    {budgetItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-4">
                            <p className="text-lg font-bold text-orange-600">
                              {formatCurrency(parseFloat(item.amount.toString()))}
                            </p>
                            <p className="text-sm text-gray-600">
                              {new Date(item.date).toLocaleDateString('it-IT')}
                            </p>
                          </div>
                          {item.description && (
                            <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeleteBudget(item.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">Nessun importo cantiere registrato</p>
                )}
              </div>
            </div>
          )}

          {/* TAB INCASSI */}
          {activeTab === 'revenues' && (
            <div className="space-y-4 sm:space-y-6">
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

          {/* TAB FATTURE EMESSE */}
          {activeTab === 'invoices' && (
            <div className="space-y-4 sm:space-y-6">
              <form onSubmit={handleAddInvoice} className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Aggiungi Fattura Emessa
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Importo Totale (€) *
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
                      % IVA *
                    </label>
                    <select
                      value={invoiceForm.vat_rate}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, vat_rate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="0">0%</option>
                      <option value="4">4%</option>
                      <option value="10">10%</option>
                      <option value="22">22%</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      € IVA (calcolato)
                    </label>
                    <input
                      type="text"
                      value={invoiceForm.amount ? formatCurrency(calculateVatFromTotal(parseFloat(invoiceForm.amount), parseInt(invoiceForm.vat_rate))) : '€ 0,00'}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-100"
                      disabled
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
                <h3 className="text-lg font-semibold mb-3">Storico Fatture Emesse</h3>
                {invoices.length > 0 ? (
                  <div className="space-y-2">
                    {invoices.map((invoice) => (
                      <div
                        key={invoice.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-4 flex-wrap">
                            <p className="text-lg font-bold text-blue-600">
                              {formatCurrency(parseFloat(invoice.amount.toString()))}
                            </p>
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                              IVA {invoice.vat_rate}% = {formatCurrency(invoice.vat_amount || 0)}
                            </span>
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
                  <p className="text-center text-gray-500 py-8">Nessuna fattura emessa registrata</p>
                )}
              </div>
            </div>
          )}

          {/* TAB FATTURE SPESE CANTIERE */}
          {activeTab === 'expenses' && (
            <div className="space-y-4 sm:space-y-6">
              <form onSubmit={handleAddExpenseInvoice} className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Aggiungi Fattura Spesa Cantiere
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Importo Totale (€) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={expenseForm.amount}
                      onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      % IVA *
                    </label>
                    <select
                      value={expenseForm.vat_rate}
                      onChange={(e) => setExpenseForm({ ...expenseForm, vat_rate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="0">0%</option>
                      <option value="4">4%</option>
                      <option value="10">10%</option>
                      <option value="22">22%</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      € IVA (calcolato)
                    </label>
                    <input
                      type="text"
                      value={expenseForm.amount ? formatCurrency(calculateVatFromTotal(parseFloat(expenseForm.amount), parseInt(expenseForm.vat_rate))) : '€ 0,00'}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-100"
                      disabled
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fornitore
                    </label>
                    <input
                      type="text"
                      value={expenseForm.supplier_name}
                      onChange={(e) => setExpenseForm({ ...expenseForm, supplier_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="Es: Fornitore Materiali Srl"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Numero Fattura *
                    </label>
                    <input
                      type="text"
                      value={expenseForm.invoice_number}
                      onChange={(e) => setExpenseForm({ ...expenseForm, invoice_number: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="Es: FT-FORN-001"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Data *
                    </label>
                    <input
                      type="date"
                      value={expenseForm.date}
                      onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Descrizione
                    </label>
                    <input
                      type="text"
                      value={expenseForm.description}
                      onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="Es: Materiali edili"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Aggiungi Fattura Spesa
                </button>
              </form>

              <div>
                <h3 className="text-lg font-semibold mb-3">Storico Fatture Spese Cantiere</h3>
                {expenseInvoices.length > 0 ? (
                  <div className="space-y-2">
                    {expenseInvoices.map((invoice) => (
                      <div
                        key={invoice.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-4 flex-wrap">
                            <p className="text-lg font-bold text-red-600">
                              {formatCurrency(parseFloat(invoice.amount.toString()))}
                            </p>
                            <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
                              IVA {invoice.vat_rate}% = {formatCurrency(invoice.vat_amount || 0)}
                            </span>
                            <p className="text-sm font-medium text-gray-900">
                              {invoice.invoice_number}
                            </p>
                            <p className="text-sm text-gray-600">
                              {new Date(invoice.date).toLocaleDateString('it-IT')}
                            </p>
                          </div>
                          {invoice.supplier_name && (
                            <p className="text-sm text-gray-700 mt-1 font-medium">Fornitore: {invoice.supplier_name}</p>
                          )}
                          {invoice.description && (
                            <p className="text-sm text-gray-600 mt-1">{invoice.description}</p>
                          )}
                          {invoice.file_name && (
                            <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              {invoice.file_name}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {invoice.file_path ? (
                            <button
                              onClick={() => handleDownloadInvoiceFile(invoice)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
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
                                  if (file) handleUploadExpenseFile(invoice.id, file);
                                }}
                                disabled={uploadingExpense}
                              />
                            </label>
                          )}
                          <button
                            onClick={() => handleDeleteExpenseInvoice(invoice)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">Nessuna fattura spesa registrata</p>
                )}
              </div>
            </div>
          )}

          {/* TAB DISPONIBILITÀ LIQUIDE */}
          {activeTab === 'liquid' && (
            <div className="space-y-4 sm:space-y-6">
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
