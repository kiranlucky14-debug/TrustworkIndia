-- Migration: add_skills
-- Adds Skill, JobSkill, UserSkill tables
-- Run AFTER the existing migrations

CREATE TABLE "Skill" (
    "id"        TEXT         NOT NULL,
    "name"      TEXT         NOT NULL,
    "category"  TEXT         NOT NULL DEFAULT 'General',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Skill_name_key" ON "Skill"("name");

CREATE TABLE "JobSkill" (
    "jobId"   TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    CONSTRAINT "JobSkill_pkey" PRIMARY KEY ("jobId","skillId")
);
ALTER TABLE "JobSkill"
    ADD CONSTRAINT "JobSkill_jobId_fkey"
    FOREIGN KEY ("jobId")   REFERENCES "Job"("id")   ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JobSkill"
    ADD CONSTRAINT "JobSkill_skillId_fkey"
    FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "UserSkill" (
    "userId"  TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    CONSTRAINT "UserSkill_pkey" PRIMARY KEY ("userId","skillId")
);
ALTER TABLE "UserSkill"
    ADD CONSTRAINT "UserSkill_userId_fkey"
    FOREIGN KEY ("userId")  REFERENCES "User"("id")  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserSkill"
    ADD CONSTRAINT "UserSkill_skillId_fkey"
    FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;
