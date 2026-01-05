# Spouse House

A simple app to manage and sync all your bills, accounts, and subscriptions in one place with your spouse.

## Features

### Core Functionality
- Add accounts manually or via email forwarding
- **Intelligent email parsing** that extracts service names, categories, autopay status, and URLs
- **Forwarded email detection** - correctly identifies original senders from me.com, gmail.com, etc.
- Search through all accounts
- Categorize accounts (banking, utility, subscription, insurance)
- Track autopay status and billing cycles
- Store related emails for each account with clickable viewer
- Shared access for households - all authenticated users can view all accounts

### User Experience
- **Custom emoji icons** - set any emoji as your account icon with native OS emoji picker support
- **HTML email rendering** - view emails in their original formatted HTML
- **Clickable account cards** - click anywhere on a card to expand and view details
- **Instant updates** - all changes immediately refresh the page to show updated content
- Simple, mobile-responsive UI with warm neutral color palette

### Progressive Web App (PWA)
- **Add to Home Screen** - install as a native-like app on iOS and Android
- **Automatic silent updates** - app automatically updates in the background without user intervention
- **Offline support** - cached content available when offline
- **Update checks every 60 seconds** - ensures you always have the latest features and fixes
- Proper app icons and metadata for seamless installation

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Email**: Resend (inbound email parsing)
- **PWA**: Service Worker for offline support and automatic updates
- **Deployment**: Vercel

## Setup Instructions

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Once created, go to Settings → API to get your keys:
   - Project URL
   - Anon/Public key
   - Service Role key (keep this secret!)

### 2. Set Up Database

1. In your Supabase project, go to the SQL Editor
2. Copy the contents of `supabase/schema.sql` and run it
3. This will create:
   - `accounts` table
   - `emails` table
   - Row Level Security policies
   - Necessary indexes

### 3. Configure Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.local.example .env.local
   ```

2. Fill in your environment variables in `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-project-url.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   RESEND_API_KEY=your-resend-api-key
   ```

### 4. Set Up Resend (Email Forwarding)

1. Go to [resend.com](https://resend.com) and create an account
2. Add and verify your domain
3. Create an inbound route:
   - Email: `bills@yourdomain.com`
   - Forward to: `https://yourdomain.com/api/email/inbound`
4. Copy your API key to `.env.local`

### 5. Install Dependencies and Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### 6. Deploy to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and import your repository
3. Add the environment variables in Vercel project settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `RESEND_API_KEY`
4. Deploy!

**Important**: Ensure environment variables are properly configured in Vercel before deployment to avoid prerendering errors.

### 7. Run Database Migration (for emoji support)

If you're upgrading from a previous version, run this SQL in your Supabase SQL Editor:

```sql
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS emoji text;
```

## PWA Installation

### iOS (iPhone/iPad)
1. Open the app in Safari
2. Tap the Share button (square with arrow pointing up)
3. Scroll down and tap "Add to Home Screen"
4. Tap "Add" in the top right
5. The app will now appear on your home screen like a native app

### Android
1. Open the app in Chrome
2. Tap the three dots menu
3. Tap "Add to Home Screen" or "Install App"
4. Tap "Add" or "Install"
5. The app will appear in your app drawer

### Automatic Updates
- The app checks for updates every 60 seconds while running
- When a new version is deployed, it automatically downloads in the background
- Once downloaded, the app silently activates the update and reloads the page
- No manual refresh or "update available" prompts - always get the latest version automatically
- Works seamlessly whether you're using the browser or installed PWA version

## Usage

### Adding Accounts Manually

1. Click "Add Account" on the dashboard
2. Fill in the account details
3. **Set a custom emoji icon** by clicking the icon button (press ⌘⌃Space on Mac to open emoji picker)
4. Click "Add Account" to save
5. The page will automatically refresh to show your new account

### Adding Accounts via Email

1. Forward any bill or account email to `bills@yourdomain.com`
2. The app will automatically:
   - **Extract the original sender** from forwarded emails (works with me.com, icloud.com, gmail.com, etc.)
   - **Detect service name** from subject line or domain
   - **Categorize accounts** (banking, insurance, utility, subscription) using intelligent keyword matching
   - **Detect autopay status** by analyzing email content
   - **Extract URLs** from email body (prioritizes login/account pages)
   - **Parse bill amounts** from email content
   - **Match to existing accounts** or create new ones
   - **Progressively update accounts** with new information from subsequent emails

### Managing Accounts

- **Click anywhere on an account card** to expand and view details
- **View emails in HTML** - see formatted email content with proper styling
- Click "Edit" to update account information (including changing the emoji icon)
- Click "Delete" to remove an account
- Use the search bar to find accounts by name, category, or notes
- All changes automatically refresh the page to show updated content

### Setting Up Gmail Auto-Forward

1. In Gmail, go to Settings → Filters and Blocked Addresses
2. Create a new filter with criteria like:
   - Subject contains: "bill", "statement", "invoice"
   - Or From: specific billing emails
3. Choose "Forward to" and enter `bills@yourdomain.com`
4. Bills will now automatically sync to your app!

## Database Schema

### Accounts Table
- Basic info: name, URL, category
- Custom emoji icon (optional)
- Email domain for auto-matching
- Billing info: autopay, cycle, due date
- Notes for additional context

### Emails Table
- Linked to accounts
- Stores email content in HTML format for rich display
- Metadata including sender, subject, and received date
- Extracts bill amounts and due dates

## Authentication

The app uses Supabase Auth with email/password authentication. All authenticated users can view and manage all accounts - perfect for household sharing. Both you and your spouse can create accounts and access the same data using the same Supabase project.

Row Level Security policies are configured to allow all authenticated users to access all accounts and emails.

## Future Enhancements

- iOS share sheet extension
- iCloud Keychain integration
- Plaid integration for financial accounts
- Due date reminders/notifications
- Enhanced AI-powered email parsing with GPT-4 for complex scenarios
- Spending analytics and trends
- Bill payment tracking (paid vs unpaid)
- Recurring bill predictions
