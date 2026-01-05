import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function extractDomain(email: string): string {
  const match = email.match(/@(.+)$/)
  return match ? match[1].toLowerCase() : ''
}

function extractOriginalSender(subject: string, emailBody: string, fromAddress: string): string {
  console.log('=== EXTRACTING ORIGINAL SENDER ===')
  console.log('From address:', fromAddress)
  console.log('Subject:', subject)
  console.log('Body preview (first 500 chars):', emailBody.substring(0, 500))

  // Decode common HTML entities that might remain after HTML stripping
  const decodedBody = emailBody
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')

  // Known forwarding domains that indicate this is a forwarded email
  const forwardingDomains = ['me.com', 'icloud.com', 'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com']
  const fromDomain = extractDomain(fromAddress)
  const isForwardingDomain = forwardingDomains.some(d => fromDomain.includes(d))
  const isForwardedSubject = subject.match(/^(fwd?|fw|forwarded?):/i)

  console.log('Is forwarding domain:', isForwardingDomain)
  console.log('Is forwarded subject:', !!isForwardedSubject)

  // If this looks like a forwarded email, try to extract the original sender
  if (isForwardingDomain || isForwardedSubject) {
    // Try to find "From:" header
    const fromPattern = /From:\s*(?:.*?<)?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})(?:>)?/im
    const fromMatch = decodedBody.match(fromPattern)
    if (fromMatch && fromMatch[1]) {
      const foundEmail = fromMatch[1].toLowerCase()
      if (foundEmail !== fromAddress.toLowerCase() &&
          !forwardingDomains.some(d => foundEmail.includes(d))) {
        console.log('Found original sender from "From:" header:', foundEmail)
        return foundEmail
      }
    }

    // Try to find "Reply-To:" header
    const replyToPattern = /Reply-To:\s*(?:.*?<)?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})(?:>)?/im
    const replyToMatch = decodedBody.match(replyToPattern)
    if (replyToMatch && replyToMatch[1]) {
      const foundEmail = replyToMatch[1].toLowerCase()
      if (foundEmail !== fromAddress.toLowerCase() &&
          !forwardingDomains.some(d => foundEmail.includes(d))) {
        console.log('Found original sender from "Reply-To:" header:', foundEmail)
        return foundEmail
      }
    }

    // Look for any email addresses in the body
    const emailPattern = /\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/gi
    const matches = decodedBody.matchAll(emailPattern)
    for (const match of matches) {
      if (match[1]) {
        const foundEmail = match[1].toLowerCase()
        // Skip if it's the same as the forwarding address or another known forwarding domain
        if (foundEmail !== fromAddress.toLowerCase() &&
            !forwardingDomains.some(d => foundEmail.includes(d))) {
          console.log('Found original sender from email body:', foundEmail)
          return foundEmail
        }
      }
    }

    // Try to extract from subject line - known company patterns
    const companyPatterns = [
      { pattern: /betterment/i, domain: 'betterment.com' },
      { pattern: /state\s*farm/i, domain: 'statefarm.com' },
      { pattern: /allstate/i, domain: 'allstate.com' },
      { pattern: /geico/i, domain: 'geico.com' },
      { pattern: /progressive/i, domain: 'progressive.com' },
      { pattern: /usaa/i, domain: 'usaa.com' },
      { pattern: /fidelity/i, domain: 'fidelity.com' },
      { pattern: /vanguard/i, domain: 'vanguard.com' },
      { pattern: /charles\s*schwab/i, domain: 'schwab.com' },
      { pattern: /wells\s*fargo/i, domain: 'wellsfargo.com' },
      { pattern: /chase/i, domain: 'chase.com' },
      { pattern: /bank\s*of\s*america/i, domain: 'bankofamerica.com' },
    ]

    // Check both subject and body for company names
    const textToSearch = (subject + ' ' + decodedBody.substring(0, 1000)).toLowerCase()
    for (const { pattern, domain } of companyPatterns) {
      if (textToSearch.match(pattern)) {
        console.log('Matched company pattern, using domain:', domain)
        return `noreply@${domain}`
      }
    }

    // Try to find domain names in URLs within the email
    const urlPattern = /https?:\/\/(?:www\.)?([a-zA-Z0-9-]+\.[a-zA-Z]{2,})/gi
    const urlMatches = decodedBody.matchAll(urlPattern)
    const domains = new Set<string>()

    for (const match of urlMatches) {
      if (match[1] && !forwardingDomains.some(d => match[1].includes(d))) {
        domains.add(match[1].toLowerCase())
      }
    }

    // If we found domains, use the most common one (likely the sender's domain)
    if (domains.size > 0) {
      const domainArray = Array.from(domains)
      console.log('Found domains in URLs:', domainArray)
      return `noreply@${domainArray[0]}`
    }

    console.log('Could not extract original sender, falling back to fromAddress')
  }

  return fromAddress
}

function extractURLFromEmail(emailBody: string, emailDomain: string): string | null {
  // Look for any URLs in the email
  const urlPattern = /https?:\/\/[^\s<>"]+/gi
  const urls: string[] = []

  const matches = emailBody.matchAll(urlPattern)
  for (const match of matches) {
    if (match[0]) {
      // Clean up URLs that might have trailing punctuation
      let url = match[0].replace(/[.,;:!?)]+$/, '')
      urls.push(url)
    }
  }

  if (urls.length === 0) return null

  // Get the base domain (e.g., "statefarm" from "statefarm.com")
  const domainBase = emailDomain.split('.').slice(-2, -1)[0] || emailDomain.split('.')[0]

  console.log('Found URLs:', urls)
  console.log('Looking for domain:', domainBase)

  // First, try to find URLs that match the company domain
  const matchingUrls = urls.filter(url => {
    const urlLower = url.toLowerCase()
    return urlLower.includes(domainBase.toLowerCase())
  })

  if (matchingUrls.length > 0) {
    // Prefer login/account URLs from matching domain
    const loginUrl = matchingUrls.find(url => url.match(/login|account|signin|portal|my\./i))
    if (loginUrl) {
      console.log('Found login URL:', loginUrl)
      return loginUrl
    }

    // Otherwise return first URL from matching domain
    console.log('Using first matching URL:', matchingUrls[0])
    return matchingUrls[0]
  }

  // If no domain match, return first URL
  console.log('Using first URL found:', urls[0])
  return urls[0]
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

  // Banking and investment keywords
  if (text.match(/bank|credit\s+union|checking|savings|mortgage|loan|investment|brokerage|portfolio|betterment|fidelity|vanguard|schwab|chase|wells\s*fargo|bofa|citibank|capital\s*one|td\s*bank|pnc\s*bank/i)) {
    return 'banking'
  }

  // Utility keywords
  if (text.match(/electric|gas|water|power|utility|energy|internet|cable|phone|wireless|mobile|comcast|xfinity|at&t|verizon|t-mobile|spectrum/i)) {
    return 'utility'
  }

  // Subscription keywords
  if (text.match(/subscription|streaming|netflix|spotify|hulu|disney|prime|membership|adobe|dropbox|icloud\s*storage/i)) {
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
      raw,
    } = emailData

    const fromAddress = from?.email || from

    // Try multiple possible field names for email content
    const emailHtml = html || html_body || emailData.htmlBody
    const emailText = text || text_body || emailData.textBody || emailData.plain

    // If we have raw email, that's the full content
    let emailBody = ''
    if (raw) {
      emailBody = raw
    } else if (emailText) {
      emailBody = emailText
    } else if (emailHtml) {
      // Strip HTML tags for storage
      emailBody = emailHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    } else {
      emailBody = 'No content available - Resend may not be configured to send email body in webhooks'
    }

    // Extract original sender (handles forwarded emails)
    const originalSender = extractOriginalSender(subject || '', emailBody, fromAddress)
    const emailDomain = extractDomain(originalSender)

    console.log('Email processing:', {
      fromAddress,
      originalSender,
      emailDomain,
      subject: subject?.substring(0, 50),
      hasHtml: !!emailHtml,
      hasText: !!emailText,
      bodyLength: emailBody.length
    })

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

    // Try to find matching account by email domain OR by service name
    let { data: accounts } = await supabase
      .from('accounts')
      .select('*')
      .eq('email_domain', emailDomain)
      .limit(1)

    // If no match by domain, try matching by name (for accounts created with forwarding addresses)
    if (!accounts || accounts.length === 0) {
      const { data: nameMatches } = await supabase
        .from('accounts')
        .select('*')
        .ilike('name', `%${serviceName}%`)
        .limit(1)

      if (nameMatches && nameMatches.length > 0) {
        accounts = nameMatches
        console.log(`Matched account by name: ${serviceName}`)
      }
    }

    let accountId: string | null = null

    if (accounts && accounts.length > 0) {
      // Account exists - update it with any new information
      const existingAccount = accounts[0]
      accountId = existingAccount.id

      const updates: any = {}

      // Update email_domain if it's a forwarding domain (like me.com) and we found the real one
      if (existingAccount.email_domain !== emailDomain &&
          (existingAccount.email_domain?.includes('me.com') ||
           existingAccount.email_domain?.includes('icloud.com') ||
           existingAccount.email_domain?.includes('gmail.com'))) {
        updates.email_domain = emailDomain
        console.log(`Updating email_domain from ${existingAccount.email_domain} to ${emailDomain}`)
      }

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

    // Store the email with cleaned body
    console.log('Storing email with body length:', emailBody.length)

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
