import { redirect } from 'next/navigation'

/** Neue Transaktion nur über Modal auf /transactions */
export default function NewTransactionPage() {
  redirect('/transactions?new=1')
}
