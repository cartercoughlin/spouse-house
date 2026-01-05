import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Create a Supabase client with service role for API routes
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function extractDomain(email: string): string {
  const match = email.match(/@(.+)$/)
  return match ? match[1].toLowerCase() : ''
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const {
      from,
      subject,
      html,
      text,
    } = body

    const fromAddress = from?.email || from
    const emailDomain = extractDomain(fromAddress)

    // Try to find matching account by email domain
    const { data: accounts } = await supabase
      .from('accounts')
      .select('*')
      .eq('email_domain', emailDomain)
      .limit(1)

    let accountId: string | null = null

    if (accounts && accounts.length > 0) {
      accountId = accounts[0].id
    } else {
      // Create a new account in pending status for user to review
      const { data: newAccount, error } = await supabase
        .from('accounts')
        .insert({
          name: from?.name || emailDomain,
          email_domain: emailDomain,
          category: 'other',
          notes: 'Auto-created from email. Please review and update.',
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating account:', error)
        return NextResponse.json({ error: 'Failed to create account' }, { status: 500 })
      }

      accountId = newAccount.id
    }

    // Extract potential bill amount and due date from email
    // Simple regex patterns - can be enhanced with AI later
    const amountMatch = (text || html)?.match(/\$[\d,]+\.?\d*/)?.[0]
    const amount = amountMatch ? parseFloat(amountMatch.replace(/[$,]/g, '')) : null

    // Store the email
    const { error: emailError } = await supabase
      .from('emails')
      .insert({
        account_id: accountId,
        subject,
        from_address: fromAddress,
        body: text || html,
        amount,
      })

    if (emailError) {
      console.error('Error storing email:', emailError)
      return NextResponse.json({ error: 'Failed to store email' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error processing email:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
