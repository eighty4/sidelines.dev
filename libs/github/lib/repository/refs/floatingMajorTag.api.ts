export function findLatestFloatingMajorTag(
    tags: Array<string>,
): `v${number}` | null {
    const floatingMajorTags = tags.filter(isFloatingMajorTag)
    if (floatingMajorTags.length) {
        floatingMajorTags.sort()
        return floatingMajorTags[floatingMajorTags.length - 1]
    } else {
        return null
    }
}

const pattern = /^v\d+$/

export function isFloatingMajorTag(tag: string): tag is `v${number}` {
    return pattern.test(tag)
}
