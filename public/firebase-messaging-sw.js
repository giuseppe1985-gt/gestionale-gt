importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAypGalE7GARbp2wADeUnusv9GubeXwFDQ",
  authDomain: "gestionale-gt.firebaseapp.com",
  projectId: "gestionale-gt",
  storageBucket: "gestionale-gt.firebasestorage.app",
  messagingSenderId: "889495386974",
  appId: "1:889495386974:web:cd98812fa112e5c16cadcf"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('Background message received:', payload);
  
  const notificationTitle = payload.notification?.title || 'Gestione Cantieri';
  const notificationOptions = {
    body: payload.notification?.body || 'Nuova notifica',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    data: payload.data,
    actions: [
      { action: 'open', title: 'Apri' },
      { action: 'close', title: 'Chiudi' }
    ]
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});
