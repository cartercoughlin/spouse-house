-- Add icon_url column to accounts table
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS icon_url TEXT;

-- Add an index for better performance
CREATE INDEX IF NOT EXISTS accounts_icon_url_idx ON accounts(icon_url);

-- Update existing accounts to have favicon URLs based on their email domain
UPDATE accounts
SET icon_url = 'https://www.google.com/s2/favicons?domain=' || email_domain || '&sz=128'
WHERE email_domain IS NOT NULL AND icon_url IS NULL;
