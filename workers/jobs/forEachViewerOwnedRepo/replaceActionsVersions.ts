import type { RepositorySet, RepositoryValues } from '@sidelines/model'

export default function replaceActionsVersions(
    yaml: string,
    actionsUsed: RepositorySet,
    upToDateVersions: RepositoryValues<`v${number}`>,
): string | null {
    let changed = false
    const pattern = new RegExp(buildPattern(actionsUsed), 'g')
    const result = yaml.replaceAll(pattern, match => {
        const [owner, nameAndVersion] = match.split('/', 2)
        const name = nameAndVersion.substring(0, nameAndVersion.indexOf('@'))
        const upToDateVersion = upToDateVersions.getValue(owner, name)
        if (upToDateVersion === null) {
            console.warn(
                'UpgradeWorkflowActions replaceActionsVersions could not find upToDateVersion for',
                owner,
                name,
                'from yaml match',
                match,
            )
            return match
        } else if (match.endsWith(`@${upToDateVersion}`)) {
            return match
        } else {
            changed = true
            return `${owner}/${name}@${upToDateVersion}`
        }
    })
    return changed ? result : null
}

function buildPattern(actionsUsed: RepositorySet): string {
    return actionsUsed
        .toValuesArray()
        .map(repo => `(${repo.owner})/(${repo.name})@v(\\d+)`)
        .join('|')
}
