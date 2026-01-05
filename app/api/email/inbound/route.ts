import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function extractDomain(email: string): string {
  const match = email.match(/@(.+)$/)
  return match ? match[1].toLowerCase() : ''
}

export async function POST(request: Request) {
  // Create a Supabase client with service role for API routes
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  try {
    const body = await request.json()
    console.log('Received webhook payload:', JSON.stringify(body, null, 2))

    // Resend wraps the email data in a 'data' object
    const emailData = body.data || body

    const {
      from,
      subject,
      html,
      text,
      html_body,
      text_body,
    } = emailData

    const fromAddress = from?.email || from
    const emailDomain = extractDomain(fromAddress || '')

    // Use either html/text or html_body/text_body (different webhook formats)
    const emailHtml = html || html_body
    const emailText = text || text_body

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
      const accountName = from?.name || emailDomain.split('@')[0] || 'Unknown'
      const { data: newAccount, error } = await supabase
        .from('accounts')
        .insert({
          name: accountName,
          email_domain: emailDomain,
          category: 'other',
          notes: 'Auto-created from email. Please review and update.',
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating account:', error)
        return NextResponse.json({ error: 'Failed to create account', details: error.message }, { status: 500 })
      }

      accountId = newAccount.id
    }

    // Extract potential bill amount and due date from email
    // Simple regex patterns - can be enhanced with AI later
    const emailBody = emailText || emailHtml || 'No content'
    const amountMatch = emailBody?.match(/\$[\d,]+\.?\d*/)?.[0]
    const amount = amountMatch ? parseFloat(amountMatch.replace(/[$,]/g, '')) : null

    // Store the email
    const { error: emailError } = await supabase
      .from('emails')
      .insert({
        account_id: accountId,
        subject: subject || 'No subject',
        from_address: fromAddress,
        body: emailBody,
        amount,
      })

    if (emailError) {
      console.error('Error storing email:', emailError)
      return NextResponse.json({ error: 'Failed to store email' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error processing email:', error)
    return NextResponse.json({
      error: 'Internal server error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
}
