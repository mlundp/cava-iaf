ALTER TABLE projects ADD COLUMN IF NOT EXISTS invoice_date date;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS cost_dkk numeric;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS booking_year integer;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS invoiced boolean DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS cost_paid boolean DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_paid boolean DEFAULT false;
