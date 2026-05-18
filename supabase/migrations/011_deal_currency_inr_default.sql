-- Default deal currency to INR (₹) for new leads
ALTER TABLE deals ALTER COLUMN currency SET DEFAULT 'INR';
