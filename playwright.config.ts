import { defineConfig, devices } from '@playwright/test'

type TestMode = 'localDev' | 'localPreview'

type TestConfig = {
    baseURL: string
    webServer?: { command: string; reuseExistingServer: boolean }
}

const modes: Record<TestMode, TestConfig> = {
    localDev: {
        baseURL: 'http://127.0.0.1:3000',
        webServer: {
            command: 'pnpm dev',
            reuseExistingServer: true,
        },
    },
    localPreview: {
        baseURL: 'http://127.0.0.1:4000',
        webServer: {
            command: 'pnpm dev --preview',
            reuseExistingServer: false,
        },
    },
}

const mode: TestConfig = process.env.TARGET_URL?.length
    ? { baseURL: process.env.TARGET_URL }
    : process.env.PREVIEW === 'true'
      ? modes.localPreview
      : modes.localDev

export default defineConfig({
    outputDir: '.playwright/results',
    projects: [
        {
            name: 'database',
            testDir: 'libs/data/lib/transactions',
            testMatch: '*.dbtest.ts',
        },
        {
            name: 'pages',
            testDir: 'pages',
            testMatch: '*.pagetest.ts',
        },
    ],
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: [['html', { outputFolder: '.playwright/report' }]],
    use: {
        baseURL: mode.baseURL,
        serviceWorkers: 'block',
        trace: 'on-first-retry',
    },
    webServer: mode.webServer
        ? {
              command: mode.webServer.command,
              env: {},
              url: mode.baseURL,
              reuseExistingServer: mode.webServer.reuseExistingServer,
              stdout: 'pipe',
              stderr: 'pipe',
          }
        : undefined,
})
