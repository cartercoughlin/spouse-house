import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function extractDomain(email: string): string {
  const match = email.match(/@(.+)$/)
  return match ? match[1].toLowerCase() : ''
}

function extractOriginalSender(subject: string, emailBody: string, fromAddress: string): string {
  // Check if this is a forwarded email
  if (subject.match(/^(fwd?|forwarded?):/i)) {
    // Try to extract original sender from email body
    // Look for patterns like "From: sender@domain.com" or "From: Name <sender@domain.com>"
    const fromPattern = /From:\s*(?:.*?<)?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})(?:>)?/i
    const match = emailBody.match(fromPattern)
    if (match && match[1]) {
      return match[1].toLowerCase()
    }

    // Try to extract from subject line patterns like "Fwd: Your State Farm bill"
    // Look for known company patterns in subject
    const companyPatterns = [
      /state\s*farm/i,
      /allstate/i,
      /geico/i,
      /progressive/i,
      /usaa/i,
      // Add more as needed
    ]

    for (const pattern of companyPatterns) {
      if (subject.match(pattern)) {
        const company = subject.match(pattern)?.[0].replace(/\s+/g, '').toLowerCase()
        return `noreply@${company}.com`
      }
    }
  }

  return fromAddress
}

function extractURLFromEmail(emailBody: string, emailDomain: string): string | null {
  // Look for login URLs or account URLs
  const urlPatterns = [
    /https?:\/\/(?:www\.|login\.|account\.|my\.)?([a-zA-Z0-9-]+\.[a-zA-Z0-9.-]+)(?:\/[^\s<>"]*)?/gi,
  ]

  const urls: string[] = []
  for (const pattern of urlPatterns) {
    const matches = emailBody.matchAll(pattern)
    for (const match of matches) {
      if (match[0]) {
        urls.push(match[0])
      }
    }
  }

  // Prefer URLs that match the email domain
  const domainBase = emailDomain.split('.').slice(-2).join('.')
  const matchingUrl = urls.find(url => url.includes(domainBase))
  if (matchingUrl) return matchingUrl

  // Prefer login/account URLs
  const loginUrl = urls.find(url => url.match(/login|account|signin|my\./i))
  if (loginUrl) return loginUrl

  // Return first URL from the company domain
  return urls[0] || null
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

  // Insurance keywords and companies
  if (text.match(/insurance|policy|coverage|premium|state\s*farm|allstate|geico|progressive|usaa|farmers|nationwide|liberty\s*mutual/i)) {
    return 'insurance'
  }

  // Banking keywords
  if (text.match(/bank|credit\s+union|checking|savings|mortgage|loan|chase|wells\s*fargo|bofa|citibank/i)) {
    return 'banking'
  }

  // Utility keywords
  if (text.match(/electric|gas|water|power|utility|energy|internet|cable|phone|wireless|mobile|comcast|at&t|verizon/i)) {
    return 'utility'
  }

  // Subscription keywords
  if (text.match(/subscription|streaming|netflix|spotify|hulu|disney|prime|membership/i)) {
    return 'subscription'
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
    const emailHtml = html || html_body
    const emailText = text || text_body
    const emailBody = emailText || emailHtml || 'No content'

    // Extract original sender (handles forwarded emails)
    const originalSender = extractOriginalSender(subject || '', emailBody, fromAddress)
    const emailDomain = extractDomain(originalSender)

    // Extract intelligent data from email
    const serviceName = extractServiceName(subject || '', originalSender, emailDomain)
    const category = detectCategory(serviceName, emailBody, emailDomain)
    const autopay = detectAutopay(emailBody)
    const extractedUrl = extractURLFromEmail(emailBody, emailDomain)

    // Generate favicon URL
    const iconUrl = `https://www.google.com/s2/favicons?domain=${emailDomain}&sz=128`

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
      // Account exists - update it with any new information
      const existingAccount = accounts[0]
      accountId = existingAccount.id

      const updates: any = {}

      // Update URL if we found one and account doesn't have one
      if (extractedUrl && !existingAccount.url) {
        updates.url = extractedUrl
      }

      // Update category if account is 'other' and we detected a specific category
      if (category !== 'other' && existingAccount.category === 'other') {
        updates.category = category
      }

      // Update name if the extracted name is better (longer/more specific)
      if (serviceName.length > (existingAccount.name?.length || 0)) {
        updates.name = serviceName
      }

      // Update autopay if detected and different from current
      if (autopay !== existingAccount.autopay) {
        updates.autopay = autopay
      }

      // Update notes to remove "Auto-created" message if present
      if (existingAccount.notes?.includes('Auto-created from email')) {
        updates.notes = null
      }

      // Apply updates if any
      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabase
          .from('accounts')
          .update(updates)
          .eq('id', accountId)

        if (updateError) {
          console.error('Error updating account:', updateError)
        } else {
          console.log('Updated account with new information:', updates)
        }
      }
    } else {
      // Create a new account with intelligent parsing
      const { data: newAccount, error } = await supabase
        .from('accounts')
        .insert({
          user_id: userId,
          name: serviceName,
          url: extractedUrl,
          email_domain: emailDomain,
          category: category,
          autopay: autopay,
          notes: 'Auto-created from email.',
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
