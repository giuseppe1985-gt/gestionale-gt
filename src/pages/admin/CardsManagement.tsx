import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  CreditCard,
  Plus,
  Edit2,
  Trash2,
  Euro,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Receipt,
  DollarSign,
} from 'lucide-react';
import { Database } from '../../lib/database.types';

type PaymentCard = Database['public']['Tables']['payment_cards']['Row'];
type CardTransaction = Database['public']['Tables']['card_transactions']['Row'];

interface CardWithTransactions extends PaymentCard {
  transactions?: CardTransaction[];
  monthlyTotal?: number;
  monthlyVat?: number;      // IVA inclusa nel totale (22%)
  monthlyTaxable?: number;  // Imponibile (totale - IVA)
}

export default function CardsManagement() {
  const { profile } = useAuth();
  const [cards, setCards] = useState<CardWithTransactions[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCardModal, setShowCardModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [editingCard, setEditingCard] = useState<PaymentCard | null>(null);
  const [selectedCard, setSelectedCard] = useState<PaymentCard | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<CardTransaction | null>(null);

  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  const [cardForm, setCardForm] = useState({
    name: '',
    type: 'card' as 'card' | 'telepass',
    info: '',
  });

  const [transactionForm, setTransactionForm] = useState({
    amount: '',
    transaction_date: new Date().toISOString().split('T')[0],
    description: '',
  });

  useEffect(() => {
    loadCards();
  }, [selectedMonth, selectedYear]);

  const loadCards = async () => {
    setLoading(true);
    try {
      const { data: cardsData } = await supabase
        .from('payment_cards')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (cardsData) {
        const startDate = new Date(selectedYear, selectedMonth, 1);
        const endDate = new Date(selectedYear, selectedMonth + 1, 0);

        const cardsWithData = await Promise.all(
          cardsData.map(async (card) => {
            const { data: transactions } = await supabase
              .from('card_transactions')
              .select('*')
              .eq('card_id', card.id)
              .gte('transaction_date', startDate.toISOString().split('T')[0])
              .lte('transaction_date', endDate.toISOString().split('T')[0])
              .order('transaction_date', { ascending: false });

            const monthlyTotal = transactions?.reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0) || 0;
            // IVA 22% inclusa nel totale: imponibile = totale / 1.22, IVA = totale - imponibile
            const monthlyTaxable = monthlyTotal / 1.22;
            const monthlyVat = monthlyTotal - monthlyTaxable;

            return {
              ...card,
              transactions: transactions || [],
              monthlyTotal,
              monthlyTaxable,
              monthlyVat,
            };
          })
        );

        setCards(cardsWithData);
      }
    } catch (error) {
      console.error('Error loading cards:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCard) {
        await supabase
          .from('payment_cards')
          .update({
            name: cardForm.name,
            type: cardForm.type,
            info: cardForm.info,
          })
          .eq('id', editingCard.id);
      } else {
        await supabase.from('payment_cards').insert({
          name: cardForm.name,
          type: cardForm.type,
          info: cardForm.info,
          organization_id: profile?.organization_id!,
        });
      }

      setCardForm({ name: '', type: 'card', info: '' });
      setShowCardModal(false);
      setEditingCard(null);
      loadCards();
    } catch (error) {
      console.error('Error saving card:', error);
      alert('Errore nel salvataggio della carta');
    }
  };

  const handleDeleteCard = async (id: string) => {
    if (!confirm('Sei sicuro di voler eliminare questa carta?')) return;
    try {
      await supabase.from('payment_cards').update({ is_active: false }).eq('id', id);
      loadCards();
    } catch (error) {
      console.error('Error deleting card:', error);
    }
  };

  const handleEditCard = (card: PaymentCard) => {
    setEditingCard(card);
    setCardForm({
      name: card.name,
      type: card.type as 'card' | 'telepass',
      info: card.info || '',
    });
    setShowCardModal(true);
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCard) return;

    try {
      if (editingTransaction) {
        await supabase
          .from('card_transactions')
          .update({
            amount: parseFloat(transactionForm.amount),
            transaction_date: transactionForm.transaction_date,
            description: transactionForm.description,
          })
          .eq('id', editingTransaction.id);
      } else {
        await supabase.from('card_transactions').insert({
          card_id: selectedCard.id,
          amount: parseFloat(transactionForm.amount),
          transaction_date: transactionForm.transaction_date,
          description: transactionForm.description,
          organization_id: profile?.organization_id!,
          created_by: profile?.id,
        });
      }

      // Sincronizza il mese della transazione con la contabilità
      const transactionDate = new Date(transactionForm.transaction_date);
      await syncSpecificMonthWithAccounting(transactionDate.getFullYear(), transactionDate.getMonth());

      setTransactionForm({
        amount: '',
        transaction_date: new Date().toISOString().split('T')[0],
        description: '',
      });
      setShowTransactionModal(false);
      setEditingTransaction(null);
      loadCards();
    } catch (error) {
      console.error('Error saving transaction:', error);
      alert('Errore nel salvataggio della transazione');
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!confirm('Sei sicuro di voler eliminare questa transazione?')) return;
    try {
      // Prima recupera la transazione per ottenere la data
      const { data: transaction } = await supabase
        .from('card_transactions')
        .select('transaction_date')
        .eq('id', id)
        .single();
      
      // Elimina la transazione
      await supabase.from('card_transactions').delete().eq('id', id);
      
      // Sincronizza il mese della transazione eliminata
      if (transaction) {
        const transactionDate = new Date(transaction.transaction_date);
        await syncSpecificMonthWithAccounting(transactionDate.getFullYear(), transactionDate.getMonth());
      }
      
      loadCards();
    } catch (error) {
      console.error('Error deleting transaction:', error);
    }
  };

  const handleEditTransaction = (transaction: CardTransaction, card: PaymentCard) => {
    setSelectedCard(card);
    setEditingTransaction(transaction);
    setTransactionForm({
      amount: transaction.amount.toString(),
      transaction_date: transaction.transaction_date,
      description: transaction.description || '',
    });
    setShowTransactionModal(true);
  };

  const previousMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const nextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const getMonthName = (month: number) => {
    const months = [
      'Gennaio',
      'Febbraio',
      'Marzo',
      'Aprile',
      'Maggio',
      'Giugno',
      'Luglio',
      'Agosto',
      'Settembre',
      'Ottobre',
      'Novembre',
      'Dicembre',
    ];
    return months[month];
  };

  const getCardTypeLabel = (type: string) => {
    return type === 'card' ? 'Carta' : 'Telepass';
  };

  const getCardTypeIcon = (type: string) => {
    return type === 'card' ? CreditCard : Receipt;
  };

  const grandTotal = cards.reduce((sum, card) => sum + (card.monthlyTotal || 0), 0);
  const grandTotalVat = cards.reduce((sum, card) => sum + (card.monthlyVat || 0), 0);
  const grandTotalTaxable = cards.reduce((sum, card) => sum + (card.monthlyTaxable || 0), 0);

  // Sincronizza un mese specifico con la contabilità
  const syncSpecificMonthWithAccounting = async (year: number, month: number) => {
    if (!profile?.organization_id) return;
    
    try {
      // Calcola le date del mese specifico
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);
      
      // Carica tutte le transazioni per questo mese specifico
      const { data: allCards } = await supabase
        .from('payment_cards')
        .select('id')
        .eq('is_active', true);
      
      if (!allCards || allCards.length === 0) return;
      
      const cardIds = allCards.map(c => c.id);
      
      const { data: transactions } = await supabase
        .from('card_transactions')
        .select('amount')
        .in('card_id', cardIds)
        .gte('transaction_date', startDate.toISOString().split('T')[0])
        .lte('transaction_date', endDate.toISOString().split('T')[0]);
      
      const monthTotal = transactions?.reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0) || 0;
      const monthTaxable = monthTotal / 1.22;
      const monthVat = monthTotal - monthTaxable;
      
      const monthYear = `${year}-${String(month + 1).padStart(2, '0')}`;
      const invoiceNumber = `CARTE-${monthYear}`;
      
      // Controlla se esiste già una fattura per questo mese
      const { data: existing } = await supabase
        .from('invoice_calculations')
        .select('id')
        .eq('invoice_number', invoiceNumber)
        .maybeSingle();

      const lastDayOfMonth = new Date(year, month + 1, 0);
      
      const invoiceData = {
        organization_id: profile.organization_id,
        type: 'expense' as const,
        invoice_number: invoiceNumber,
        invoice_date: lastDayOfMonth.toISOString().split('T')[0],
        client_name: 'Carte e Telepass Aziendali',
        amount: monthTaxable,
        vat_rate: 22,
        vat_amount: monthVat,
      };

      if (monthTotal <= 0) {
        if (existing) {
          await supabase
            .from('invoice_calculations')
            .delete()
            .eq('id', existing.id);
        }
        return;
      }

      if (existing) {
        await supabase
          .from('invoice_calculations')
          .update(invoiceData)
          .eq('id', existing.id);
      } else {
        await supabase
          .from('invoice_calculations')
          .insert(invoiceData);
      }
    } catch (error) {
      console.error('Error syncing specific month with accounting:', error);
    }
  };

  // Sincronizza con la contabilità - aggiorna/crea fattura spese per carte (mese visualizzato)
  const syncWithAccounting = async () => {
    if (!profile?.organization_id) return;
    
    const monthYear = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
    const invoiceNumber = `CARTE-${monthYear}`;
    
    try {
      // Controlla se esiste già una fattura per questo mese
      const { data: existing } = await supabase
        .from('invoice_calculations')
        .select('id')
        .eq('invoice_number', invoiceNumber)
        .maybeSingle();

      // Data fattura = ultimo giorno del mese selezionato
      const lastDayOfMonth = new Date(selectedYear, selectedMonth + 1, 0);
      
      const invoiceData = {
        organization_id: profile.organization_id,
        type: 'expense' as const,
        invoice_number: invoiceNumber,
        invoice_date: lastDayOfMonth.toISOString().split('T')[0],
        client_name: 'Carte e Telepass Aziendali',
        amount: grandTotalTaxable,
        vat_rate: 22,
        vat_amount: grandTotalVat,
      };

      if (grandTotal <= 0) {
        // Se il totale è 0, elimina la fattura esistente se c'è
        if (existing) {
          await supabase
            .from('invoice_calculations')
            .delete()
            .eq('id', existing.id);
        }
        return;
      }

      if (existing) {
        // Aggiorna fattura esistente
        await supabase
          .from('invoice_calculations')
          .update(invoiceData)
          .eq('id', existing.id);
      } else {
        // Crea nuova fattura
        await supabase
          .from('invoice_calculations')
          .insert(invoiceData);
      }
    } catch (error) {
      console.error('Error syncing with accounting:', error);
    }
  };

  // Sincronizza automaticamente quando cambiano i totali o il mese
  useEffect(() => {
    if (!loading && profile?.organization_id) {
      syncWithAccounting();
    }
  }, [grandTotal, grandTotalVat, grandTotalTaxable, selectedMonth, selectedYear, loading, profile?.organization_id]);

  // Sincronizza tutti i mesi con transazioni esistenti (una volta all'avvio)
  useEffect(() => {
    const syncAllMonthsWithTransactions = async () => {
      if (!profile?.organization_id) return;
      
      try {
        // Trova tutti i mesi distinti che hanno transazioni
        const { data: transactions } = await supabase
          .from('card_transactions')
          .select('transaction_date');
        
        if (!transactions || transactions.length === 0) return;
        
        // Estrai mesi unici
        const uniqueMonths = new Set<string>();
        transactions.forEach(t => {
          const date = new Date(t.transaction_date);
          uniqueMonths.add(`${date.getFullYear()}-${date.getMonth()}`);
        });
        
        // Sincronizza ogni mese
        for (const monthKey of uniqueMonths) {
          const [year, month] = monthKey.split('-').map(Number);
          await syncSpecificMonthWithAccounting(year, month);
        }
      } catch (error) {
        console.error('Error syncing all months:', error);
      }
    };
    
    if (profile?.organization_id) {
      syncAllMonthsWithTransactions();
    }
  }, [profile?.organization_id]);

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
          <h1 className="text-3xl font-bold text-gray-900">Gestione Carte e Telepass</h1>
          <p className="text-gray-600 mt-1">Monitora le spese delle carte aziendali</p>
        </div>
        <button
          onClick={() => {
            setEditingCard(null);
            setCardForm({ name: '', type: 'card', info: '' });
            setShowCardModal(true);
          }}
          className="flex items-center space-x-2 bg-gradient-to-r from-blue-900 to-blue-700 text-white px-6 py-3 rounded-lg hover:from-blue-800 hover:to-blue-600 transition-all shadow-lg"
        >
          <Plus className="w-5 h-5" />
          <span>Aggiungi Carta</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={previousMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">
              {getMonthName(selectedMonth)} {selectedYear}
            </h2>
            <p className="text-sm text-gray-600 mt-1">Seleziona mese per visualizzare i totali</p>
          </div>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-white border-l-4 border-l-emerald-500 border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-3">
              <div>
                <p className="text-emerald-600 text-sm font-medium">Totale Spese Mensili (IVA inclusa)</p>
                <p className="text-4xl font-bold mt-1 text-emerald-600">{grandTotal.toFixed(2)} €</p>
              </div>
              <div className="flex gap-6 pt-2 border-t border-gray-200">
                <div>
                  <p className="text-gray-500 text-xs">Imponibile</p>
                  <p className="text-lg font-semibold text-gray-900">{grandTotalTaxable.toFixed(2)} €</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">IVA 22%</p>
                  <p className="text-lg font-semibold text-amber-500">{grandTotalVat.toFixed(2)} €</p>
                </div>
              </div>
            </div>
            <DollarSign className="w-16 h-16 text-emerald-500/30" />
          </div>
        </div>
      </div>

      {cards.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <CreditCard className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500 text-lg">Nessuna carta o telepass registrato</p>
          <p className="text-gray-400 text-sm mt-2">Aggiungi la prima carta per iniziare</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {cards.map((card) => {
            const Icon = getCardTypeIcon(card.type);
            return (
              <div key={card.id} className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-3">
                      <Icon className="w-8 h-8" />
                      <div>
                        <h3 className="text-xl font-bold">{card.name}</h3>
                        <p className="text-blue-100 text-sm">{getCardTypeLabel(card.type)}</p>
                        {card.info && (
                          <p className="text-blue-200 text-xs mt-1">{card.info}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditCard(card)}
                        className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCard(card.id)}
                        className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-6">
                    <p className="text-blue-100 text-sm">Totale Mensile (IVA inclusa)</p>
                    <p className="text-3xl font-bold mt-1">{card.monthlyTotal?.toFixed(2)} €</p>
                    <div className="flex gap-4 mt-2 text-blue-200 text-xs">
                      <span>Imponibile: {card.monthlyTaxable?.toFixed(2)} €</span>
                      <span>IVA 22%: {card.monthlyVat?.toFixed(2)} €</span>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-semibold text-gray-900">Transazioni</h4>
                    <button
                      onClick={() => {
                        setSelectedCard(card);
                        setEditingTransaction(null);
                        setTransactionForm({
                          amount: '',
                          transaction_date: new Date().toISOString().split('T')[0],
                          description: '',
                        });
                        setShowTransactionModal(true);
                      }}
                      className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Aggiungi</span>
                    </button>
                  </div>

                  {card.transactions && card.transactions.length > 0 ? (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {card.transactions.map((transaction) => (
                        <div
                          key={transaction.id}
                          className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <Euro className="w-4 h-4 text-gray-500" />
                              <span className="font-semibold text-gray-900">
                                {parseFloat(transaction.amount.toString()).toFixed(2)} €
                              </span>
                            </div>
                            <div className="flex items-center space-x-2 mt-1">
                              <Calendar className="w-3 h-3 text-gray-400" />
                              <span className="text-xs text-gray-500">
                                {new Date(transaction.transaction_date).toLocaleDateString('it-IT')}
                              </span>
                            </div>
                            {transaction.description && (
                              <p className="text-sm text-gray-600 mt-1">{transaction.description}</p>
                            )}
                          </div>
                          <div className="flex space-x-1">
                            <button
                              onClick={() => handleEditTransaction(transaction, card)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteTransaction(transaction.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <Receipt className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Nessuna transazione per questo mese</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCardModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {editingCard ? 'Modifica Carta' : 'Aggiungi Carta'}
            </h2>
            <form onSubmit={handleAddCard} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nome Carta</label>
                <input
                  type="text"
                  required
                  placeholder="es. Carta Q8"
                  value={cardForm.name}
                  onChange={(e) => setCardForm({ ...cardForm, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
                <select
                  value={cardForm.type}
                  onChange={(e) => setCardForm({ ...cardForm, type: e.target.value as 'card' | 'telepass' })}
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-no-repeat bg-right bg-[length:20px] cursor-pointer"
                  style={{ backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")", backgroundPosition: "right 0.5rem center" }}
                >
                  <option value="card">Carta</option>
                  <option value="telepass">Telepass</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Info</label>
                <input
                  type="text"
                  placeholder={cardForm.type === 'card' ? 'Es. Numero Carta' : 'Es. Targa Telepass'}
                  value={cardForm.info}
                  onChange={(e) => setCardForm({ ...cardForm, info: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCardModal(false);
                    setEditingCard(null);
                    setCardForm({ name: '', type: 'card', info: '' });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-blue-900 to-blue-700 text-white px-4 py-2 rounded-lg hover:from-blue-800 hover:to-blue-600 transition-all"
                >
                  {editingCard ? 'Aggiorna' : 'Aggiungi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showTransactionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {editingTransaction ? 'Modifica Transazione' : 'Aggiungi Transazione'}
            </h2>
            <form onSubmit={handleAddTransaction} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Importo (€)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={transactionForm.amount}
                  onChange={(e) => setTransactionForm({ ...transactionForm, amount: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Data Transazione</label>
                <input
                  type="date"
                  required
                  value={transactionForm.transaction_date}
                  onChange={(e) => setTransactionForm({ ...transactionForm, transaction_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrizione (opzionale)
                </label>
                <textarea
                  value={transactionForm.description}
                  onChange={(e) => setTransactionForm({ ...transactionForm, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="es. Rifornimento, Pedaggio autostrada..."
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowTransactionModal(false);
                    setEditingTransaction(null);
                    setSelectedCard(null);
                    setTransactionForm({
                      amount: '',
                      transaction_date: new Date().toISOString().split('T')[0],
                      description: '',
                    });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-blue-900 to-blue-700 text-white px-4 py-2 rounded-lg hover:from-blue-800 hover:to-blue-600 transition-all"
                >
                  {editingTransaction ? 'Aggiorna' : 'Aggiungi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
