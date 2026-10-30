import { useState } from 'react'
import { PageHead } from '../../components/PageHead'
import { Card } from '../../components/ui/Card'
import { Icon } from '../../components/ui/Icon'
import { LinkButton } from '../../components/ui/LinkButton'
import { useSession } from '../auth/useSession'
import { dateLine, greeting } from './dates'
import { DashboardTiles } from './DashboardTiles'
import { HomeNow } from './HomeNow'
import { RecentlyEdited } from './RecentlyEdited'
import { useDashboard } from './useDashboard'

export default function DashboardPage() {
  const { user } = useSession()
  const dash = useDashboard()
  const [now] = useState(() => new Date())
  const firstName = user?.name.split(/\s+/)[0] ?? ''

  return (
    <>
      <PageHead title={greeting(now, firstName)} subtitle={dateLine(now)} />
      <DashboardTiles dash={dash} />
      <div className="grid grid-cols-1 items-start gap-6 min-[1100px]:grid-cols-[1.4fr_1fr]">
        <RecentlyEdited items={dash.recent.data} isError={dash.recent.isError} now={now} />
        <div className="flex flex-col gap-6">
          <HomeNow dash={dash} />
          <Card title="Quick actions" bodyClassName="flex-row flex-wrap gap-2">
            <LinkButton to="/exhibitions/new" variant="primary"><Icon name="plus" />New exhibition</LinkButton>
            <LinkButton to="/artists/new"><Icon name="plus" />New artist</LinkButton>
            <LinkButton to="/news"><Icon name="plus" />Add news</LinkButton>
            <LinkButton to="/media"><Icon name="upload" />Upload media</LinkButton>
          </Card>
        </div>
      </div>
    </>
  )
}
