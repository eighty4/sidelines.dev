export function findLatestFloatingMajorTag(tags: Array<string>): string | null {
    const pattern = /^v\d+$/
    const floatingMajorTags = tags.filter(tag => pattern.test(tag))
    if (floatingMajorTags.length) {
        floatingMajorTags.sort()
        return floatingMajorTags[floatingMajorTags.length - 1]
    } else {
        return null
    }
}
