-- Set INR for all existing deals (one-time backfill)
UPDATE deals SET currency = 'INR' WHERE currency IS DISTINCT FROM 'INR';
