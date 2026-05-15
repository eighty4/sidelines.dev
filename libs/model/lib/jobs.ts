export const RepoJobIds = ['UPGRADE_ACTIONS'] as const

export type RepoJobId = (typeof RepoJobIds)[number]

export type RepoJobWorkflowUpgradeActions = 'UPGRADE_ACTIONS'

export type RepoJobStatus =
    | {
          state: 'done'
          when: Date
      }
    | {
          state: 'error'
          when: Date
          error: string
          stack: string
      }
    | {
          state: 'review'
          commitId?: string
          when: Date
      }
