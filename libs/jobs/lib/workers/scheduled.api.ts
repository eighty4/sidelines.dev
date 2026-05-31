export type ScheduledJobExecContext = {
    lastRun?: Date
}

export type ScheduledJobExec = {
    onSchedule(
        ghToken: string,
        context: ScheduledJobExecContext,
    ): Promise<void> | void
}

export function registerScheduledJob(_exec: ScheduledJobExec): void {}
