import type { Page } from '@playwright/test'
import { GraphqlResponses } from './graphQuerying.ts'

type UserAppInstallation = {
    id: number
    repos: 'all' | 'selected'
}

// todo separate the "user story" from the GitHub API data
export class UserStory {
    static login(ghLogin: string): UserStory {
        return new UserStory(ghLogin)
    }

    #ghLogin: string
    #appInstallation: UserAppInstallation | null = null
    #graphqlResponses = new GraphqlResponses()

    constructor(ghLogin: string) {
        this.#ghLogin = ghLogin
    }

    withAppInstallation(appInstallation: UserAppInstallation): this {
        this.#appInstallation = appInstallation
        return this
    }

    withGraphqlResponse(
        queryName: string,
        vars: Record<string, any> | null,
        data: any,
    ): this {
        this.#graphqlResponses.addQueryResponse(queryName, vars, data)
        return this
    }

    async configureRoutes(page: Page) {
        await routeGitHubAuth(page)
        await routeGitHubGraphqlQuery(page, this.#graphqlResponses)
        await routeGitHubGetUrlInstallations(page, this.#appInstallation)
    }

    get ghLogin(): string {
        return this.#ghLogin
    }

    get appInstallation(): UserAppInstallation | null {
        return this.#appInstallation
    }
}

async function routeGitHubAuth(page: Page) {
    await page.route('/github/redirect/user/login', async route => {
        const ghToken = 'ght'
        const expiresIn = 1000 * 60 * 60 * 24
        await route.fulfill({
            status: 302,
            headers: {
                Location: 'http://127.0.0.1:3000/configure',
                'Set-Cookie': `ght=${ghToken}; Secure; SameSite=Strict; Path=/; Max-Age=${expiresIn}`,
            },
        })
    })
}

// todo verify do named queries still use {data: {viewer: {}}} or is it namespaced by the query name?
// todo verify can a single request have several queries is there only one query root?
async function routeGitHubGraphqlQuery(
    page: Page,
    graphqlResponses: GraphqlResponses,
) {
    await page.route('https://api.github.com/graphql', async (route, req) => {
        const { query, vars } = req.postDataJSON()
        await route.fulfill({
            json: {
                data: graphqlResponses.resolveQueryResponse(
                    query,
                    vars || null,
                ),
            },
        })
    })
}

async function routeGitHubGetUrlInstallations(
    page: Page,
    installation: UserAppInstallation | null,
) {
    // todo GH API types wouldn't hurt
    const installations: Array<any> = []
    if (installation) {
        installations.push({
            id: installation.id,
            app_id: 1144785, // for sidelines-dev-dev
            repository_selection: installation.repos,
        })
    }
    await page.route(
        'https://api.github.com/user/installations',
        async route => {
            await route.fulfill({ json: { installations } })
        },
    )
}
