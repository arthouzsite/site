import { useState, type ComponentProps } from 'react'
import { Icon } from '../../components/ui/Icon'
import { Input } from '../../components/ui/Input'

export function PasswordInput(props: Omit<ComponentProps<'input'>, 'type'>) {
  const [visible, setVisible] = useState(false)
  const id = props.id
  return (
    <div className="relative">
      <Input {...props} type={visible ? 'text' : 'password'} className="pr-12" />
      <button
        type="button"
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        aria-controls={id}
        onClick={() => setVisible((v) => !v)}
        className="absolute right-0 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center border-0 bg-transparent text-muted hover:text-ink"
      >
        <Icon name={visible ? 'eyeOff' : 'eye'} />
      </button>
    </div>
  )
}
