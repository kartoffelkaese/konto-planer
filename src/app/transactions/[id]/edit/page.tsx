import { redirect } from 'next/navigation'

/** Bearbeiten nur über Modal auf /transactions */
export default async function EditTransactionPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string }
}) {
  const resolvedParams = await Promise.resolve(params)
  const id = resolvedParams?.id
  if (!id) {
    redirect('/transactions')
  }
  redirect(`/transactions?edit=${encodeURIComponent(id)}`)
}
