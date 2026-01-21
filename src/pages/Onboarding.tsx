import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Building2, CheckCircle, LogOut } from 'lucide-react';

interface OnboardingProps {
  userId: string;
  userEmail: string;
  userFullName: string;
  onComplete: () => void;
}

export default function Onboarding({ userId, userEmail, userFullName, onComplete }: OnboardingProps) {
  const [companyName, setCompanyName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  const createSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Verify user session with both session and user
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Sessione non attiva. Effettua nuovamente il login.');
      }

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('Utente non autenticato. Effettua nuovamente il login.');
      }

      console.log('User ID:', user.id);
      console.log('Session valid until:', session.expires_at);

      const slug = createSlug(companyName);

      // Use RPC function to complete onboarding
      const { data, error: rpcError } = await supabase.rpc('complete_onboarding', {
        company_name: companyName,
        company_slug: slug,
      });

      if (rpcError) {
        if (rpcError.code === '23505' || rpcError.message.includes('duplicate')) {
          throw new Error('Questo nome azienda è già in uso. Scegline un altro.');
        }
        throw rpcError;
      }

      console.log('Onboarding completed:', data);

      setStep(2);
      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (err: any) {
      console.error('Onboarding error:', err);
      setError(err.message || 'Errore durante la creazione dell\'azienda');
      setLoading(false);
    }
  };

  if (step === 2) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Tutto Pronto!</h1>
          <p className="text-gray-600 mb-6">
            La tua azienda è stata creata con successo.
            <br />
            Sarai reindirizzato al pannello di controllo...
          </p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="flex justify-end mb-4">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Esci
          </button>
        </div>

        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-900 to-blue-700 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <Building2 className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Configura la Tua Azienda</h1>
          <p className="text-gray-600 text-sm mt-1">Ultimo passo prima di iniziare</p>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-yellow-800">
            <strong>Hai già un account configurato?</strong>
            <br />
            Prova a fare logout e rientrare, oppure cancella la cache del browser.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-2">
              Nome Azienda *
            </label>
            <input
              id="companyName"
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="es. Costruzioni Rossi S.r.l."
              required
            />
            <p className="mt-2 text-xs text-gray-500">
              Il nome della tua impresa edile o società di costruzioni
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">Cosa puoi fare dopo:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>✓ Aggiungere lavoratori al tuo team</li>
              <li>✓ Creare e gestire cantieri</li>
              <li>✓ Assegnare lavoratori ai cantieri</li>
              <li>✓ Monitorare le timbrature</li>
              <li>✓ Inviare comunicazioni</li>
            </ul>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-900 to-blue-700 text-white py-3 px-4 rounded-lg hover:from-blue-800 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium shadow-lg"
          >
            {loading ? 'Creazione in corso...' : 'Crea Azienda'}
          </button>
        </form>
      </div>
    </div>
  );
}
