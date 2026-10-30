import { Card } from '../../components/ui/Card'

const ROWS: Array<[string, string, string]> = [
  ['Edit exhibitions, artists, fairs, news, locations, about', 'Yes', 'Yes'],
  ['Publish and unpublish', 'Yes', 'Yes'],
  ['Upload, edit and delete media', 'Yes', 'Yes'],
  ['Delete records', 'Yes', 'Yes'],
  ['Home & settings', 'View', 'Yes'],
  ['Invite and disable users', '—', 'Yes'],
]

export function RoleCapabilities() {
  return (
    <Card title="What each role can do">
      <table className="w-full border-collapse text-13">
        <thead>
          <tr className="text-left text-11 uppercase tracking-eyebrow text-muted">
            <th scope="col" className="py-2 font-medium">Capability</th>
            <th scope="col" className="py-2 font-medium">Editor</th>
            <th scope="col" className="py-2 font-medium">Admin</th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map(([what, editor, admin]) => (
            <tr key={what} className="border-t border-line align-top">
              <th scope="row" className="py-2 pr-3 text-left font-normal">{what}</th>
              <td className="py-2 pr-3">{editor}</td>
              <td className="py-2 text-success">{admin}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}
