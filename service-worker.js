const CACHE_NAME = 'english-quiz-v1.2';
const urlsToCache = [
  './',
  './index.html'
];

// Установка Service Worker и кеширование ресурсов
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker: Установка...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Service Worker: Кеширование файлов');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('✅ Service Worker: Кеш готов');
        return self.skipWaiting();
      })
  );
});

// Активация Service Worker
self.addEventListener('activate', (event) => {
  console.log('⚡ Service Worker: Активация...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑 Service Worker: Удаление старого кеша', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✅ Service Worker: Активирован!');
      return self.clients.claim();
    })
  );
});

// Перехват сетевых запросов
self.addEventListener('fetch', (event) => {
  // Пропускаем non-GET запросы
  if (event.request.method !== 'GET') {
    return;
  }

  // Пропускаем внешние протоколы
  if (!event.request.url.startsWith('http')) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((response) => {
        if (response) {
          console.log('📦 Из кеша:', event.request.url);
          return response;
        }

        console.log('🌐 Загрузка из сети:', event.request.url);
        return fetch(event.request).then((response) => {
          // Проверяем валидность ответа
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Кешируем только файлы с нашего домена
          if (event.request.url.includes(location.origin)) {
            const responseToCache = response.clone();
            cache.put(event.request, responseToCache);
          }

          return response;
        }).catch(() => {
          console.log('🔄 Сеть недоступна, показываем кешированную версию');
          
          // Если это HTML страница и сеть недоступна, возвращаем главную страницу
          if (event.request.destination === 'document') {
            return cache.match('./index.html');
          }
          
          // Для других ресурсов - показываем оффлайн сообщение
          return new Response('🔧 Приложение работает в оффлайн режиме', {
            status: 200,
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
          });
        });
      });
    })
  );
});

// Обработка уведомлений
self.addEventListener('notificationclick', (event) => {
  console.log('📱 Уведомление нажато:', event);
  event.notification.close();

  event.waitUntil(
    clients.matchAll().then((clientList) => {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

console.log('🚀 Service Worker скрипт загружен!');
