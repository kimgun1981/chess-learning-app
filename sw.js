const CACHE_PREFIX = 'chess-classroom-'
const CACHE_NAME = `${CACHE_PREFIX}v5`
const APP_ROOT = new URL('./', self.registration.scope).href
const CORE_FILES = [
  APP_ROOT,
  new URL('manifest.webmanifest', APP_ROOT).href,
  new URL('favicon.svg', APP_ROOT).href,
  new URL('icon-192.png', APP_ROOT).href,
  new URL('icon-512.png', APP_ROOT).href,
]

async function addToCache(cache, url) {
  const request = new Request(url, { cache: 'reload' })

  try {
    const response = await fetch(request)

    if (response.ok) {
      await cache.put(url, response.clone())
      return response
    }
  } catch {
    // 설치 중 일부 파일을 받지 못해도 다음 온라인 접속 때 다시 저장합니다.
  }

  return null
}

async function cacheAppShell() {
  const cache = await caches.open(CACHE_NAME)
  const htmlResponse = await addToCache(cache, APP_ROOT)

  if (!htmlResponse) throw new Error('app shell unavailable')

  await Promise.all(CORE_FILES.slice(1).map((url) => addToCache(cache, url)))

  const html = await htmlResponse.text()
  const linkedFiles = Array.from(
    html.matchAll(/(?:src|href)=["']([^"'#]+)["']/g),
    (match) => new URL(match[1], APP_ROOT),
  ).filter(
    (url) =>
      url.origin === self.location.origin &&
      url.pathname.startsWith(new URL(APP_ROOT).pathname),
  )

  const linkedResponses = await Promise.all(
    linkedFiles.map((url) => addToCache(cache, url.href)),
  )

  if (linkedResponses.some((response) => !response)) {
    throw new Error('linked app asset unavailable')
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(cacheAppShell().then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
            .map((name) => caches.delete(name)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

function fetchWithTimeout(request, timeoutMs) {
  const controller = new AbortController()
  let timeoutId
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      controller.abort()
      reject(new Error('network timeout'))
    }, timeoutMs)
  })

  return Promise.race([fetch(request, { signal: controller.signal }), timeout]).finally(
    () => clearTimeout(timeoutId),
  )
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME)

  try {
    if (self.navigator.onLine === false) throw new Error('offline')

    const response = await fetchWithTimeout(
      request,
      request.mode === 'navigate' ? 2500 : 3500,
    )

    if (!response.ok) throw new Error(`network response ${response.status}`)

    if (response.type === 'basic') {
      await cache.put(request, response.clone())
    }

    return response
  } catch {
    const cachedResponse = await cache.match(request, {
      ignoreSearch: request.mode === 'navigate',
      ignoreVary: true,
    })

    if (cachedResponse) return cachedResponse

    if (request.mode === 'navigate') {
      const appShell = await cache.match(APP_ROOT)
      if (appShell) return appShell
    }

    return new Response('인터넷 연결 후 다시 시도해 주세요.', {
      status: 503,
      statusText: 'Offline',
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  if (
    request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    !url.pathname.startsWith(new URL(APP_ROOT).pathname)
  ) return

  event.respondWith(networkFirst(request))
})
