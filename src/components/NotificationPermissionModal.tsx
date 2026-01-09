import { useState } from 'react';
import { Bell, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface NotificationPermissionModalProps {
  onClose: () => void;
  userId: string;
}

export default function NotificationPermissionModal({ onClose, userId }: NotificationPermissionModalProps) {
  const [loading, setLoading] = useState(false);

  const handleEnableNotifications = async () => {
    setLoading(true);

    try {
      if (!('Notification' in window)) {
        alert('Il tuo browser non supporta le notifiche push');
        onClose();
        return;
      }

      const permission = await Notification.requestPermission();

      if (permission === 'granted') {
        const deviceType = /iPhone|iPad|iPod/.test(navigator.userAgent)
          ? 'ios'
          : /Android/.test(navigator.userAgent)
          ? 'android'
          : 'web';

        const dummyToken = `web_${userId}_${Date.now()}`;

        await supabase.from('push_notification_tokens').insert({
          user_id: userId,
          token: dummyToken,
          device_type: deviceType,
          device_name: navigator.userAgent.substring(0, 100),
          enabled: true,
        });

        localStorage.setItem('notificationPermissionAsked', 'true');
        onClose();
      } else if (permission === 'denied') {
        localStorage.setItem('notificationPermissionAsked', 'true');
        onClose();
      }
    } catch (error) {
      console.error('Errore durante la richiesta dei permessi:', error);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('notificationPermissionAsked', 'true');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative animate-fade-in">
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mb-4 shadow-lg">
            <Bell className="w-8 h-8 text-white" />
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Attiva le Notifiche
          </h2>

          <p className="text-gray-600 mb-6">
            Ricevi notifiche in tempo reale per:
          </p>

          <div className="bg-blue-50 rounded-lg p-4 mb-6 w-full text-left">
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">•</span>
                <span>Nuove assegnazioni di cantiere</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">•</span>
                <span>Annunci importanti dall'amministrazione</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">•</span>
                <span>Modifiche agli orari di lavoro</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">•</span>
                <span>Aggiornamenti urgenti</span>
              </li>
            </ul>
          </div>

          <div className="flex flex-col w-full space-y-3">
            <button
              onClick={handleEnableNotifications}
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-900 to-blue-700 text-white py-3 px-6 rounded-lg hover:from-blue-800 hover:to-blue-600 transition-all font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Attivazione...' : 'Attiva Notifiche'}
            </button>

            <button
              onClick={handleDismiss}
              className="w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-lg hover:bg-gray-200 transition-all font-medium"
            >
              Non Ora
            </button>
          </div>

          <p className="text-xs text-gray-500 mt-4">
            Puoi modificare questa impostazione in qualsiasi momento dalle impostazioni del browser
          </p>
        </div>
      </div>
    </div>
  );
}
