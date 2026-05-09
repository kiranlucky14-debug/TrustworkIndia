-- Run this if demo users are stuck at /register
-- Sets profileCompleted = true for all seeded demo users

UPDATE "User"
SET "profileCompleted" = true
WHERE phone IN ('9876543210','9876543211','9876543212','9876543213','9876543214');

-- Verify
SELECT name, phone, role, "profileCompleted" FROM "User"
WHERE phone IN ('9876543210','9876543211','9876543212','9876543213','9876543214')
ORDER BY phone;
