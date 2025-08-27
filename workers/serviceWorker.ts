// @ts-ignore - cache.json will be made before esbuild bundles the service worker
import buildManifest from '../build/cache.json' with { type: 'json' }
import { isValidGitHubRepoUrl } from '../pages/ghRepoUrl.ts'

declare const self: ServiceWorkerGlobalScope

self.addEventListener('install', e => e.waitUntil(populateCache()))

self.addEventListener('activate', e => e.waitUntil(cleanupCaches()))

self.addEventListener('fetch', e => e.respondWith(handleRequest(e.request)))

const PREFIX_APP_CACHE_KEY = 'app-'
const APP_CACHE_KEY: string = PREFIX_APP_CACHE_KEY + buildManifest.buildTag

const files: Array<`/${string}`> = buildManifest.files as Array<`/${string}`>

async function populateCache() {
    console.log('sidelines.sw.js install creating cache', APP_CACHE_KEY)
    const cache = await self.caches.open(APP_CACHE_KEY)
    const previousCacheKey = await getMostRecentAppCacheKey()
    if (!previousCacheKey) {
        // todo why is there a workbox github issue about not using Cache.addAll()
        for (const file of files) {
            await cache.add(file)
        }
    } else {
        // todo is the workbox github issue about not using Cache.addAll() applicable
        //  to using Promise.all here for concurrently copying from previousCache?
        const previousCache = await self.caches.open(previousCacheKey)
        for (const file of files) {
            // if a cache entry starts with /lib/ it is versioned with a hash or npm version
            //  and can be retrieved from the previous cache
            if (file.startsWith('/lib/')) {
                const previouslyCached = await previousCache.match(file)
                if (previouslyCached) {
                    await cache.put(file, previouslyCached)
                } else {
                    await cache.add(file)
                }
            } else {
                await cache.add(file)
            }
        }
    }
}

async function getMostRecentAppCacheKey(): Promise<string | null> {
    const cacheKeys = (await self.caches.keys()).filter(k =>
        k.startsWith(PREFIX_APP_CACHE_KEY),
    )
    if (cacheKeys.length) {
        return cacheKeys.sort()[cacheKeys.length - 1]
    } else {
        return null
    }
}

async function cleanupCaches() {
    console.log('sidelines.sw.js activate')
    const cacheKeys = await self.caches.keys()
    for (const cacheKey of cacheKeys) {
        if (cacheKey !== APP_CACHE_KEY) {
            await self.caches.delete(cacheKey)
            console.log('sidelines.sw.js activate deleted cache', cacheKey)
        }
    }
}

async function handleRequest(req: Request): Promise<Response> {
    const url = new URL(req.url)
    console.log('sidelines.sw.js fetch', url.pathname)
    if (req.method === 'GET' && !isApiUrl(url)) {
        if (isValidGitHubRepoUrl(url)) {
            const mapped = url.pathname.endsWith('/notes')
                ? '/notes'
                : '/project'
            console.log(
                'sidelines.sw.js fetch mapping',
                url.pathname,
                'to',
                mapped,
            )
            url.pathname = mapped
        }
        const cache = await caches.open(APP_CACHE_KEY)
        const fromCache = await cache.match(url)
        if (fromCache) {
            return fromCache
        }
    }
    return fetch(req)
}

function isApiUrl(url: URL): boolean {
    return (
        url.host === 'api.github.com' ||
        buildManifest.apiRoutes.includes(url.pathname)
    )
}
