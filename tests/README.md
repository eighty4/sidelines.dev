# Playwright testing

## IndexedDB hacking

Here's a snippet for writing to IndexedDB for debugging:

```typescript
await page.evaluate(async () => {
    await new Promise((res, rej) => {
        const opening = indexedDB.open('sidelines-dev', 1)
        opening.onsuccess = e => {
            const db: IDBDatabase = e.target.result
            const tx = db.transaction('job-log', 'readwrite')
            const os = tx.objectStore('job-log')
            os.add({
                jobExecId: 'asdgasdgasdg',
                encoded: [{ foo: 'bar' }, null, new Date()],
            })
            os.add({
                jobExecId: 'lkjkljkljklj',
                json: [{ foo: 'bar' }, null],
            })
            tx.oncomplete = res
            tx.onerror = rej
        }
    })
})
```
