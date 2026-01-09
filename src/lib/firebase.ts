import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyAypGalE7GARbp2wADeUnusv9GubeXwFDQ",
  authDomain: "gestionale-gt.firebaseapp.com",
  projectId: "gestionale-gt",
  storageBucket: "gestionale-gt.firebasestorage.app",
  messagingSenderId: "889495386974",
  appId: "1:889495386974:web:cd98812fa112e5c16cadcf"
};

const VAPID_KEY = "BHMiWQSW8YU7Ihb2oscZ_uQ-XwBcyoDksKtgUDdCj0mITRvFNNGuPgwEF7iiCQAouUmrZqR_kwLofmKvk0gqq64";

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Cloud Messaging
let messaging: any = null;

export const initializeFirebaseMessaging = async () => {
  try {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      messaging = getMessaging(app);
      return messaging;
    }
  } catch (error) {
    console.error('Error initializing Firebase Messaging:', error);
  }
  return null;
};

export const requestNotificationPermission = async (): Promise<string | null> => {
  try {
    if (!messaging) {
      await initializeFirebaseMessaging();
    }
    
    if (!messaging) {
      console.error('Messaging not initialized');
      return null;
    }

    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY
      });
      console.log('FCM Token:', token);
      return token;
    } else {
      console.log('Notification permission denied');
      return null;
    }
  } catch (error) {
    console.error('Error getting notification permission:', error);
    return null;
  }
};

export const onMessageListener = () => {
  return new Promise((resolve) => {
    if (messaging) {
      onMessage(messaging, (payload) => {
        console.log('Message received:', payload);
        resolve(payload);
      });
    }
  });
};

export { app, messaging };
