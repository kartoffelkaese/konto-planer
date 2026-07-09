import { redirect } from 'next/navigation'

/** Bearbeiten nur über Modal auf /transactions */
export default async function EditTransactionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  if (!id) {
    redirect('/transactions')
  }
  redirect(`/transactions?edit=${encodeURIComponent(id)}`)
}
