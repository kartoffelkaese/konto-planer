import EditTransactionForm from './EditTransactionForm'
import { notFound } from 'next/navigation'

export default async function EditTransactionPage({
  params
}: {
  params: { id: string }
}) {
  if (!params?.id) {
    notFound()
  }
  
  return <EditTransactionForm id={params.id} />
} 