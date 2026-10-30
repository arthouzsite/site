import { Field, Textarea } from '../../components/ui'
import { FormCard } from './FormCard'
import type { ExhibitionZodForm } from './formValues'

export function TextCard({ form }: { form: ExhibitionZodForm }) {
  const { register, formState: { errors } } = form
  return (
    <FormCard title="Text">
      <Field name="blurb" label="Blurb" help="One or two lines shown on cards and in search results." error={errors.blurb?.message}>
        <Textarea {...register('blurb')} />
      </Field>
      <Field name="body" label="Body" error={errors.body?.message}>
        <Textarea {...register('body')} rows={10} />
      </Field>
    </FormCard>
  )
}
