-- Step 1: Add username column as nullable
ALTER TABLE "User" ADD COLUMN "username" TEXT;

-- Step 2: Populate username from email (take the part before @ symbol)
-- For users without email, use their user ID as username
UPDATE "User"
SET "username" = COALESCE(
  SPLIT_PART("email", '@', 1),
  CONCAT('user_', "id")
)
WHERE "username" IS NULL;

-- Step 3: Make username required and unique
ALTER TABLE "User" ALTER COLUMN "username" SET NOT NULL;

-- Step 4: Drop email index
DROP INDEX IF EXISTS "User_email_idx";

-- Step 5: Drop email unique constraint
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_email_key";

-- Step 6: Drop email column
ALTER TABLE "User" DROP COLUMN "email";

-- Step 7: Create unique constraint on username
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- Step 8: Create index on username
CREATE INDEX "User_username_idx" ON "User"("username");
