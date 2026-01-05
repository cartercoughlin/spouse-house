import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Dashboard from '@/components/Dashboard'

export default async function Home() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: accounts } = await supabase
    .from('accounts')
    .select(`
      *,
      emails (
        id,
        subject,
        amount,
        received_at
      )
    `)
    .order('updated_at', { ascending: false })

  return <Dashboard initialAccounts={accounts || []} user={user} />
}
