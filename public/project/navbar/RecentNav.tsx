import { useMemo, type FC } from 'react'
import { projectHistoryCache } from '../../storage.ts'

interface RecentNavProps {
  ghToken: string
  repo: string
}

// todo on cron background check and cache gh actions of navbar projects
//  show indicator with project name for status of gh actions
export const RecentNav: FC<RecentNavProps> = ({ repo }) => {
  const quickNav = useMemo(() => {
    const read = projectHistoryCache.read() || []
    updateProjectHistoryCache(read, repo)
    return read.filter(qnr => qnr !== repo).splice(0, 3)
  }, [repo])

  return <div id="project-nav-recent">
    {quickNav.map(qnr => <div key={qnr}>
      <a href={`/project?name=${qnr}`}>{qnr}</a>
    </div>)}
  </div>
}

function updateProjectHistoryCache(previous: Array<string>, current: string) {
  const updateCopy = [...previous]
  updateCopy.unshift(current)
  const update = Array.from(new Set(updateCopy))
  projectHistoryCache.write(update.splice(0, 5))
}
