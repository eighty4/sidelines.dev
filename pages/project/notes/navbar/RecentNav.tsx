import { createJsonCache } from '@sidelines/data/web'
import type { RepositoryId } from '@sidelines/model'
import { type FC, useState, useEffect, useMemo } from 'react'
import { buildProjectUrl } from '../../../nav.ts'
import type { UserDataClient } from '../../../../workers/UserDataClient.ts'

interface RecentNavProps {
    currentPageProject: RepositoryId
    userData: UserDataClient
}

type CacheState = { current: RepositoryId; nav: Array<RepositoryId> }

function sameRepo(one: RepositoryId, two: RepositoryId): boolean {
    return one.owner === two.owner && one.name === two.name
}

// todo on cron background check and cache gh actions of navbar projects
//  show indicator with project name for status of gh actions
export const RecentNav: FC<RecentNavProps> = ({
    currentPageProject,
    userData,
}) => {
    const navCache = useMemo(
        () => createJsonCache<CacheState>(sessionStorage, 'sld.nav'),
        [],
    )
    const [quickNav, setQuickNav] = useState<null | Array<RepositoryId>>(null)

    useEffect(() => {
        const fromCache = navCache.read()
        if (fromCache !== null) {
            if (sameRepo(currentPageProject, fromCache.current)) {
                setQuickNav(fromCache.nav)
            } else {
                navCache.clear()
            }
        }
    }, [])

    useEffect(() => {
        if (quickNav === null) {
            userData
                .navHistory(5)
                .then(projects =>
                    projects
                        .filter(repo => !sameRepo(currentPageProject, repo))
                        .splice(0, 4),
                )
                .then(projects => {
                    navCache.write({
                        current: currentPageProject,
                        nav: projects,
                    })
                    setQuickNav(projects)
                })
        }
    }, [currentPageProject])

    return (
        <div id="project-nav-recent">
            {!!quickNav?.length &&
                quickNav.map(repo => (
                    <div key={repo.name}>
                        <a href={buildProjectUrl(repo)}>{repo.name}</a>
                    </div>
                ))}
        </div>
    )
}
