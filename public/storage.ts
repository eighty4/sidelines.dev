import { getCookie, GH_TOKEN } from "../cookie.ts"

export interface SessionCache<T> {
  clear(): void

  hasValue(): boolean

  read(): T | null

  readThrough(fb: () => Promise<T | null>): Promise<T | null>

  write(data: T): void
}

async function readThroughImpl<T>(cache: SessionCache<T>, fb: () => Promise<T | null>): Promise<T | null> {
  const read = cache.read()
  if (read) {
    return read
  }
  const created = await fb()
  if (created) {
    cache.write(created)
  }
  return created
}

type StorageApi = typeof globalThis.localStorage | typeof globalThis.sessionStorage

export function createCache(storage: StorageApi, key: string): SessionCache<string> {
  return {
    clear() {
      storage.removeItem(key)
    },
    hasValue() {
      return storage.getItem(key) !== null
    },
    read() {
      return storage.getItem(key)
    },
    readThrough(fb: () => Promise<string | null>) {
      return readThroughImpl(this, fb)
    },
    write(data: string) {
      storage.setItem(key, data)
    },
  }
}

export function createJsonCache<T>(storage: StorageApi, key: string): SessionCache<T> {
  return {
    clear() {
      storage.removeItem(key)
    },
    hasValue() {
      return storage.getItem(key) !== null
    },
    read() {
      const data = storage.getItem(key)
      return data === null ? null : JSON.parse(data)
    },
    async readThrough(fb: () => Promise<T | null>) {
      return readThroughImpl(this, fb)
    },
    write(data: T) {
      storage.setItem(key, JSON.stringify(data))
    },
  }
}

export const ghLoginCache = createCache(localStorage, 'sld.user.gh.login')

export function readGhTokenCookie(): string {
  const ghToken = getCookie(document.cookie, GH_TOKEN)
  if (!ghToken) {
    location.assign('/logout')
  }
  return ghToken!
}
