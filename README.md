# Spouse House

A simple app to manage and sync all your bills, accounts, and subscriptions in one place with your spouse.

## Features

- Add accounts manually or via email forwarding
- Search through all accounts
- Categorize accounts (banking, utility, subscription, insurance)
- Track autopay status and billing cycles
- Store related emails for each account
- Simple, mobile-responsive UI
- Shared access for couples

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Email**: Resend (inbound email parsing)

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

## Usage

### Adding Accounts Manually

1. Click "Add Account" on the dashboard
2. Fill in the account details
3. Click "Add Account" to save

### Adding Accounts via Email

1. Forward any bill or account email to `bills@yourdomain.com`
2. The app will automatically:
   - Extract the sender's email domain
   - Create a new account (or match to existing)
   - Store the email content
   - Parse bill amount if found

### Managing Accounts

- Click the `+` button on any account card to expand details
- Click "Edit" to update account information
- Click "Delete" to remove an account
- Use the search bar to find accounts by name, category, or notes

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
- Email domain for auto-matching
- Billing info: autopay, cycle, due date
- Notes for additional context

### Emails Table
- Linked to accounts
- Stores email content and metadata
- Extracts bill amounts and due dates

## Authentication

The app uses Supabase Auth with email/password authentication. Both you and your spouse can create accounts and access the same data (as long as you use the same Supabase project).

To share accounts between users, you would need to modify the Row Level Security policies to allow sharing based on a "household" or "partner" relationship.

## Future Enhancements

- iOS share sheet extension
- iCloud Keychain integration
- Plaid integration for financial accounts
- Due date reminders/notifications
- AI-powered email parsing (GPT-4)
- Spending analytics
- Multi-user household management
