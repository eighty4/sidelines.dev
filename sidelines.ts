import { performBuild } from './dev/build.ts'
import { createFrontendFilesFetcher, createWebServer } from './dev/http.ts'

if (!process.env.WEBAPP_ADDRESS) {
    throw Error('must set WEBAPP_ADDRESS')
}

const PORT = 3000

const { dir, files } = await performBuild()

createWebServer(createFrontendFilesFetcher(dir, files)).listen(PORT)

console.log('sidelines.dev is running at http://127.0.0.1:' + PORT)
