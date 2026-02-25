-- Add manual enrollment tracking fields to existing enrollments table
-- Run this to extend the current enrollments table

-- Add new columns for manual enrollment tracking
ALTER TABLE public.enrollments 
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid',
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS admin_notes TEXT,
ADD COLUMN IF NOT EXISTS enrolled_by TEXT DEFAULT 'user',
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS enrolled_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_enrollments_user_id ON enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_partner_id ON enrollments(partner_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON enrollments(status);
CREATE INDEX IF NOT EXISTS idx_enrollments_payment_status ON enrollments(payment_status);
CREATE INDEX IF NOT EXISTS idx_enrollments_enrolled_by ON enrollments(enrolled_by);

-- Add comments
COMMENT ON COLUMN enrollments.enrolled_by IS 'Tracks whether enrollment was done by user or admin manually';
COMMENT ON COLUMN enrollments.admin_notes IS 'Notes added by admin for manual enrollments';
COMMENT ON COLUMN enrollments.payment_status IS 'Payment status: paid, unpaid, complimentary';
COMMENT ON COLUMN enrollments.status IS 'Enrollment status: active, cancelled, expired';
