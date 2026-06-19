import { redirect } from 'next/navigation'

export default function SplitNewPage() {
  redirect('/split?new=1')
}
