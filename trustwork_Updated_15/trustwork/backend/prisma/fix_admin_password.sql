-- =============================================================================
-- TrustWork: Fix admin password
-- Run this on your existing database to fix the admin login.
-- Password: Admin@123
-- =============================================================================

UPDATE "User"
SET 
  "passwordHash"    = '$2a$12$WRWpgTaRMxD0nk6COyzm1.O8ccrhs/XKS.GGRmP99tFkzVln6m.nO',
  "profileCompleted" = true,
  "isVerified"      = true
WHERE phone = '9876543214' AND role = 'ADMIN';

-- Also ensure all demo users have profileCompleted = true
UPDATE "User"
SET "profileCompleted" = true
WHERE phone IN ('9876543210','9876543211','9876543212','9876543213','9876543214');

-- Confirm
SELECT id, name, phone, role, 
  CASE WHEN "passwordHash" IS NOT NULL THEN 'SET' ELSE 'MISSING' END as password_status,
  "profileCompleted"
FROM "User"
WHERE phone IN ('9876543210','9876543211','9876543212','9876543213','9876543214')
ORDER BY phone;
