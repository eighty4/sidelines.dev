import {
    defineConfig,
    devices,
    type PlaywrightTestConfig,
} from '@playwright/test'

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
            reuseExistingServer: !process.env.CI,
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
    testDir: 'tests',
    testMatch: '*.test.ts',
    projects: projects(),
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 2 : undefined,
    reporter: [['html', { outputFolder: '.playwright/report' }]],
    use: {
        baseURL: mode.baseURL,
        serviceWorkers: 'block',
        trace: 'on-first-retry',
    },
    webServer: webServer(),
})

function projects(): PlaywrightTestConfig['projects'] {
    return [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
        {
            name: 'firefox',
            use: { ...devices['Desktop Firefox'] },
        },
        {
            name: 'webkit',
            use: { ...devices['Desktop Safari'] },
        },
    ]
}

function webServer(): PlaywrightTestConfig['webServer'] {
    if (mode.webServer) {
        const { command, reuseExistingServer } = mode.webServer
        return {
            command,
            env: {},
            url: mode.baseURL,
            reuseExistingServer,
            stdout: 'pipe',
            stderr: 'pipe',
        }
    }
}
