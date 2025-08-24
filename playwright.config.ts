import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
    outputDir: '.playwright/results',
    testDir: 'testing',
    testMatch: '*.pw.ts',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: [['html', { outputFolder: '.playwright/report' }]],
    use: {
        baseURL: 'http://127.0.0.1:3000',
        trace: 'on-first-retry',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    webServer: [
        {
            command: 'pnpm dev',
            env: {},
            url: 'http://127.0.0.1:3000',
            reuseExistingServer: false,
            stdout: 'pipe',
            stderr: 'pipe',
        },
    ],
})
