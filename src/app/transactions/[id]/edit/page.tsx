import EditTransactionForm from '@/components/EditTransactionForm'
import { notFound } from 'next/navigation'

export default async function EditTransactionPage({
  params
}: {
  params: Promise<{ id: string }> | { id: string }
}) {
  const resolvedParams = await Promise.resolve(params)
  
  if (!resolvedParams?.id) {
    notFound()
  }
  
  return <EditTransactionForm id={resolvedParams.id} />
} 