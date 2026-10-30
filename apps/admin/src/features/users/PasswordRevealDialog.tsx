import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { useToast } from '../../lib/toast'

type Props = { invite: { name: string; password: string } | null; onClose: () => void }

export function PasswordRevealDialog({ invite, onClose }: Props) {
  const toast = useToast()
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(invite?.password ?? '')
      toast.success('Copied')
    } catch {
      toast.error('Could not copy. Select the password and copy it.')
    }
  }
  return (
    <Dialog
      open={invite !== null}
      title="Invite created"
      onClose={onClose}
      footer={
        <>
          <Button onClick={() => void copy()}>Copy password</Button>
          <Button variant="primary" data-autofocus onClick={onClose}>Done</Button>
        </>
      }
    >
      <p className="mt-0">Share this temporary password with {invite?.name}. It is shown only once.</p>
      <code className="block select-all break-all border border-line bg-surface px-3 py-2.5 text-15">{invite?.password}</code>
    </Dialog>
  )
}
