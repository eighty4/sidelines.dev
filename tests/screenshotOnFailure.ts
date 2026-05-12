import type { Page, TestInfo } from '@playwright/test'

export default async function screenshotOnFailure(
    { page }: { page: Page },
    testInfo: TestInfo,
) {
    switch (testInfo.status) {
        case 'failed':
        case 'timedOut':
            const screenshotPath = testInfo.outputPath(`${testInfo.status}.png`)
            testInfo.attachments.push({
                name: 'screenshot',
                path: screenshotPath,
                contentType: 'image/png',
            })
            await page.screenshot({ path: screenshotPath })
            break
    }
}
