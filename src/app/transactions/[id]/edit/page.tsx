import EditTransactionForm from './EditTransactionForm'

export default function EditTransactionPage({
  params
}: {
  params: { id: string }
}) {
  return <EditTransactionForm id={params.id} />
} 