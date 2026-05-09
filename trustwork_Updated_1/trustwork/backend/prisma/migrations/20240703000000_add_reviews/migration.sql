-- Migration: add_reviews
-- Run AFTER add_search_fields migration

CREATE TABLE "Review" (
    "id"          TEXT             NOT NULL,
    "jobId"       TEXT             NOT NULL,
    "fromId"      TEXT             NOT NULL,
    "toId"        TEXT             NOT NULL,
    "quality"     INTEGER          NOT NULL,
    "communication" INTEGER        NOT NULL,
    "timeliness"  INTEGER          NOT NULL,
    "overall"     DOUBLE PRECISION NOT NULL,
    "comment"     TEXT,
    "createdAt"   TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- One review per direction per job (client reviews freelancer, freelancer reviews client)
CREATE UNIQUE INDEX "Review_jobId_fromId_key" ON "Review"("jobId", "fromId");

CREATE INDEX "Review_toId_idx"   ON "Review"("toId");
CREATE INDEX "Review_jobId_idx"  ON "Review"("jobId");

ALTER TABLE "Review"
    ADD CONSTRAINT "Review_jobId_fkey"
    FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Review"
    ADD CONSTRAINT "Review_fromId_fkey"
    FOREIGN KEY ("fromId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Review"
    ADD CONSTRAINT "Review_toId_fkey"
    FOREIGN KEY ("toId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
