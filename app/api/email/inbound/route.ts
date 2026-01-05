import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function extractDomain(email: string): string {
  const match = email.match(/@(.+)$/)
  return match ? match[1].toLowerCase() : ''
}

function extractServiceName(subject: string, fromAddress: string, emailDomain: string): string {
  // Try to extract service name from subject line first
  const subjectPatterns = [
    /(?:Your|New)\s+(.+?)\s+(?:bill|statement|invoice|payment|account)/i,
    /(.+?)\s+(?:bill|statement|invoice|payment)\s+(?:is|for)/i,
  ]

  for (const pattern of subjectPatterns) {
    const match = subject.match(pattern)
    if (match && match[1]) {
      return match[1].trim()
    }
  }

  // Extract company name from domain
  const domainParts = emailDomain.split('.')
  if (domainParts.length >= 2) {
    const companyName = domainParts[domainParts.length - 2]
    // Capitalize first letter
    return companyName.charAt(0).toUpperCase() + companyName.slice(1)
  }

  return emailDomain
}

function detectCategory(serviceName: string, emailBody: string, emailDomain: string): string {
  const text = (serviceName + ' ' + emailBody + ' ' + emailDomain).toLowerCase()

  // Banking keywords
  if (text.match(/bank|credit\s+union|checking|savings|mortgage|loan/i)) {
    return 'banking'
  }

  // Utility keywords
  if (text.match(/electric|gas|water|power|utility|energy|internet|cable|phone|wireless|mobile/i)) {
    return 'utility'
  }

  // Subscription keywords
  if (text.match(/subscription|streaming|netflix|spotify|hulu|disney|prime|membership/i)) {
    return 'subscription'
  }

  // Insurance keywords
  if (text.match(/insurance|policy|coverage|premium|health|auto|home|life\s+insurance/i)) {
    return 'insurance'
  }

  return 'other'
}

function detectAutopay(emailBody: string): boolean {
  const text = emailBody.toLowerCase()

  // Look for autopay indicators
  if (text.match(/auto.?pay|automatic\s+payment|recurring\s+payment|will\s+be\s+automatically\s+charged/i)) {
    return true
  }

  // Look for manual payment indicators (suggests NOT autopay)
  if (text.match(/please\s+pay|payment\s+due|pay\s+now|make\s+a\s+payment|action\s+required/i)) {
    return false
  }

  return false
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
    const emailBody = emailText || emailHtml || 'No content'

    // Extract intelligent data from email
    const serviceName = extractServiceName(subject || '', fromAddress, emailDomain)
    const category = detectCategory(serviceName, emailBody, emailDomain)
    const autopay = detectAutopay(emailBody)

    // Get the first user to assign the account to (for household sharing)
    const { data: users, error: userError } = await supabase
      .from('accounts')
      .select('user_id')
      .limit(1)

    let userId: string | null = null

    if (users && users.length > 0) {
      userId = users[0].user_id
    } else {
      // If no accounts exist yet, get the first user from auth
      const { data: authUsers } = await supabase.auth.admin.listUsers()
      if (authUsers.users && authUsers.users.length > 0) {
        userId = authUsers.users[0].id
      } else {
        console.error('No users found in system')
        return NextResponse.json({ error: 'No users found to assign account' }, { status: 500 })
      }
    }

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
      // Create a new account with intelligent parsing
      const { data: newAccount, error } = await supabase
        .from('accounts')
        .insert({
          user_id: userId,
          name: serviceName,
          email_domain: emailDomain,
          category: category,
          autopay: autopay,
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

    // Extract bill amount from email
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
