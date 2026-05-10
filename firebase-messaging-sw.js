// Firebase Messaging Background Handler & PWA Service Worker
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js');


const CACHE_VERSION = 'v2.6.0'; // Updated for Data-Only Push Notifications
const CACHE_NAME = `readings-app-${CACHE_VERSION}`;

const firebaseConfig = {
    apiKey: "AIzaSyCP6bkrgWn5Nx7BE7sYJmrUm7w06XYlmKA",
    authDomain: "recording-readings.firebaseapp.com",
    projectId: "recording-readings",
    storageBucket: "recording-readings.firebasestorage.app",
    messagingSenderId: "69093256665",
    appId: "1:69093256665:web:2e6409903746c37cd07dc8"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[sw.js] Received background message ', payload);
  
  // بما أننا نرسل رسائل بيانات فقط (Data-Only Messages)،
  // سنقوم دائماً بإنشاء الإشعار يدوياً لضمان ظهوره على أندرويد
  const notificationTitle = payload.data.title || 'إشعار جديد';
  const notificationOptions = {
    body: payload.data.body || '',
    icon: './icons/icon.png',
    badge: './icons/icon.png',
    data: payload.data,
    vibrate: [200, 100, 200],
    requireInteraction: true // بقاء الإشعار حتى يتفاعل معه المستخدم
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// التعامل مع النقر على الإشعار
self.addEventListener('notificationclick', (event) => {
  console.log('[sw.js] Notification click received.', event);
  event.notification.close();

  // استخراج بيانات الإشعار للتوجيه الصحيح
  const notifData = event.notification.data || {};
  const notifType = notifData.type || notifData.notification_type || '';
  const role = notifData.role || '';

  // =====================================================
  // تحديد الصفحة الصحيحة حسب نوع الإشعار والدور
  // =====================================================
  const BASE_URL = self.location.origin;
  let targetUrl = BASE_URL + '/tech.html'; // افتراضي للفني

  if (notifType === 'murashaha_plan_update') {
    targetUrl = BASE_URL + '/tech_op_units.html';
  } else if (role === 'lab') {
    targetUrl = BASE_URL + '/lab.html';
  } else if (role === 'ops') {
    targetUrl = BASE_URL + '/ops.html';
  } else if (role === 'tech' || notifType === 'lab_update' || notifType === 'ops_plan_update') {
    targetUrl = BASE_URL + '/tech.html';
  }

  console.log('[sw.js] Navigating to:', targetUrl);
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // البحث عن نافذة مفتوحة على الصفحة المطلوبة أو أي صفحة من التطبيق
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      // لا توجد نافذة على الصفحة المطلوبة — ابحث عن أي نافذة من التطبيق
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(BASE_URL) && 'navigate' in client) {
          client.focus();
          return client.navigate(targetUrl);
        }
      }
      // التطبيق مغلق تماماً — افتح الصفحة الصحيحة
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});


const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './lab.html',
  './ops.html',
  './tech.html',
  './tech_op_units.html',
  './Operation_of_units.html',
  './css/style.css',
  './css/pwa.css',
  './js/auth.js',
  './js/firebase-messaging.js',
  './manifest.json',
  './icons/icon.png',
  './splash/splash.png',
  './splash/logo.png',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css',
  'https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js',
  'https://www.gstatic.com/firebasejs/8.10.1/firebase-auth.js',
  'https://www.gstatic.com/firebasejs/8.10.1/firebase-firestore.js',
  'https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js'
];

// Install Event
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching app shell');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) => {
        return Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
        );
      })
    ])
  );
});

// Fetch Event - Stale-While-Revalidate Strategy
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests (except CDN assets already in cache)
  if (!event.request.url.startsWith(self.location.origin) && 
      !event.request.url.includes('cdnjs.cloudflare.com') &&
      !event.request.url.includes('gstatic.com')) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((response) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          // Only cache successful requests
          if (networkResponse && networkResponse.status === 200) {
             cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => {
          // If network fails and no cache, return index.html for navigation
          if (event.request.mode === 'navigate') {
            return cache.match('./index.html');
          }
        });
        return response || fetchPromise;
      });
    })
  );
});

// Handle skip waiting message
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
