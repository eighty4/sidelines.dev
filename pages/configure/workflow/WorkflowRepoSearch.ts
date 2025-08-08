import { type Observable, Subject } from 'rxjs'
import type {
    ActionsCallToActionsRequest,
    ActionsCallToActionsUpdate,
    CicdCallToAction,
    WorkflowCallToAction,
} from '@sidelines/data/web'
import { type Language, type Repository } from '@sidelines/model'
import {
    type PackageSearchResult,
    searchForPackages,
} from './searchForPackages.ts'

const GH_ACTIONS_WORKER = '/lib/sidelines/callToActions/ghActions.js'

export type CallToAction =
    | {
          kind: 'cicd'
          problem: CicdCallToAction
      }
    | {
          kind: 'workflow'
          workflow: string
          problem: WorkflowCallToAction
      }

export type SearchEvent =
    | {
          kind: 'repos'
          languages: Array<Language>
          repos: Partial<Record<Language, Array<Repository>>>
      }
    | {
          kind: 'callToAction'
          repo: string
          callToActions: Array<CallToAction>
      }
    | {
          kind: 'done'
      }

export class WorkflowRepoSearch {
    #ghToken: string
    #ghLogin: string
    #s: Subject<SearchEvent> = new Subject()
    #searchResults?: PackageSearchResult
    #workers: Record<string, Worker> = {}

    constructor(ghToken: string, ghLogin: string) {
        this.#ghToken = ghToken
        this.#ghLogin = ghLogin
        this.#initialize()
    }

    get events(): Observable<SearchEvent> {
        return this.#s.asObservable()
    }

    #initialize() {
        searchForPackages(
            this.#ghToken,
            this.#ghLogin,
            this.#onPackageSearchUpdate,
        )
            .then()
            .catch(console.error)
    }

    #onPackageSearchUpdate = (update: PackageSearchResult) => {
        const firstUpdate = typeof this.#searchResults === 'undefined'
        this.#searchResults = update
        if (firstUpdate) {
            this.#reposWithPackages.forEach(this.#launchGhActionsWorker)
        }
    }

    #launchGhActionsWorker = (repo: string) => {
        const w = (this.#workers[repo] = new Worker(GH_ACTIONS_WORKER))
        w.onmessage = this.#onGhActionsWorkerMessage
        const request: ActionsCallToActionsRequest = {
            ghToken: this.#ghToken,
            ghLogin: this.#ghLogin,
            repo,
        }
        w.postMessage(request)
    }

    #onGhActionsWorkerMessage = (
        e: MessageEvent<ActionsCallToActionsUpdate>,
    ) => {
        const update = e.data
        if (update.kind === 'done') {
            const w: Worker = e.target as Worker
            w.terminate()
            delete this.#workers[update.repo]
            if (Object.keys(this.#workers).length) {
                this.#s.next({ kind: 'done' })
            }
        } else if (update.kind === 'cicd') {
            this.#nextCallToActionEvent(
                update.repo,
                update.callToActions.map(problem => ({
                    kind: 'cicd',
                    problem,
                })),
            )
        } else if (update.kind === 'workflow' && update.state !== 'good') {
            this.#nextCallToActionEvent(update.repo, [
                {
                    kind: 'workflow',
                    workflow: update.workflow,
                    problem: update.state,
                },
            ])
        }
    }

    #nextCallToActionEvent(repo: string, callToActions: Array<CallToAction>) {
        this.#s.next({
            kind: 'callToAction',
            repo,
            callToActions,
        })
    }

    get #reposWithPackages(): Set<string> {
        if (!this.#searchResults) {
            throw Error()
        }
        switch (this.#searchResults.state) {
            case 'orderable':
                return new Set(
                    this.#searchResults.data.flatMap(({ repos }) =>
                        repos.map(repo => repo.name),
                    ),
                )
            case 'prerelevance':
                return new Set(
                    this.#searchResults.data.flatMap(({ repos }) => repos),
                )
            default:
                throw Error()
        }
    }
}
