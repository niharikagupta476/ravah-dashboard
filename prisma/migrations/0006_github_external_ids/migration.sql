ALTER TABLE "PipelineRun" ADD COLUMN "githubRunId" TEXT;
CREATE UNIQUE INDEX "PipelineRun_githubRunId_key" ON "PipelineRun"("githubRunId");

ALTER TABLE "Job" ADD COLUMN "githubJobId" TEXT;
CREATE UNIQUE INDEX "Job_githubJobId_key" ON "Job"("githubJobId");
