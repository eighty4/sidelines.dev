function createChannel(): BroadcastChannel {
    return new BroadcastChannel()
}

export type SchedulingRequest = {
    id: string
}

export class WebpageScheduler {
    #channel: BroadcastChannel = createChannel()

    constructor() {}
}

export class SchedulingOrchestrator {
    #channel: BroadcastChannel = createChannel()

    constructor() {}
}
