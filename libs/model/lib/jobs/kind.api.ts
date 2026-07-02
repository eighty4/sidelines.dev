export const JobKinds = ['scheduled', 'repos', 'syncedRefs'] as const

export type JobKind = (typeof JobKinds)[number]
