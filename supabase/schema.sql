-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Accounts table
create table accounts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  url text,
  category text check (category in ('banking', 'utility', 'subscription', 'insurance', 'other')),
  email_domain text,
  autopay boolean default false,
  billing_cycle text,
  due_date integer, -- day of month (1-31)
  average_amount numeric(10, 2),
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Emails table
create table emails (
  id uuid default uuid_generate_v4() primary key,
  account_id uuid references accounts(id) on delete cascade not null,
  subject text not null,
  from_address text not null,
  body text,
  amount numeric(10, 2),
  due_date date,
  received_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table accounts enable row level security;
alter table emails enable row level security;

-- Policies for accounts
create policy "Users can view their own accounts"
  on accounts for select
  using (auth.uid() = user_id);

create policy "Users can insert their own accounts"
  on accounts for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own accounts"
  on accounts for update
  using (auth.uid() = user_id);

create policy "Users can delete their own accounts"
  on accounts for delete
  using (auth.uid() = user_id);

-- Policies for emails
create policy "Users can view emails for their accounts"
  on emails for select
  using (
    exists (
      select 1 from accounts
      where accounts.id = emails.account_id
      and accounts.user_id = auth.uid()
    )
  );

create policy "Users can insert emails for their accounts"
  on emails for insert
  with check (
    exists (
      select 1 from accounts
      where accounts.id = emails.account_id
      and accounts.user_id = auth.uid()
    )
  );

-- Indexes for better performance
create index accounts_user_id_idx on accounts(user_id);
create index accounts_email_domain_idx on accounts(email_domain);
create index emails_account_id_idx on emails(account_id);
create index emails_received_at_idx on emails(received_at desc);

-- Function to update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Trigger to automatically update updated_at
create trigger update_accounts_updated_at
  before update on accounts
  for each row
  execute function update_updated_at_column();
