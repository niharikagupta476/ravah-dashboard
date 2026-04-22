ALTER TABLE "Pipeline" ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'github-actions';
ALTER TABLE "Pipeline" ADD COLUMN "repo" TEXT NOT NULL DEFAULT 'unknown/repo';
ALTER TABLE "Pipeline" ADD COLUMN "branch" TEXT NOT NULL DEFAULT 'main';

ALTER TABLE "PipelineRun" ADD COLUMN "duration" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Stage" ADD COLUMN "duration" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "Job" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pipelineRunId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "logs" TEXT NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Job_pipelineRunId_fkey" FOREIGN KEY ("pipelineRunId") REFERENCES "PipelineRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Job_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Job_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "Job_pipelineRunId_idx" ON "Job"("pipelineRunId");
