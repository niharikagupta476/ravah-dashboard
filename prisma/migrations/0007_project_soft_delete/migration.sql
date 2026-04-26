-- Add isActive flag to Project for soft-delete (disconnect) support.
-- Existing projects default to true (active).
ALTER TABLE "Project" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
