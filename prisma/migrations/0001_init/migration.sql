-- CreateTable
CREATE TABLE "Pipeline" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "env" TEXT NOT NULL,
    "lastRunStatus" TEXT NOT NULL,
    "lastRunDurationSec" INTEGER NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "PipelineRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pipelineId" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL,
    "endedAt" DATETIME,
    "status" TEXT NOT NULL,
    "durationSec" INTEGER NOT NULL,
    CONSTRAINT "PipelineRun_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "Pipeline" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "PipelineStage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pipelineRunId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL,
    "endedAt" DATETIME,
    "errorCode" TEXT,
    "errorSummary" TEXT,
    CONSTRAINT "PipelineStage_pipelineRunId_fkey" FOREIGN KEY ("pipelineRunId") REFERENCES "PipelineRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "AlertGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "env" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "lastSeenAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL
);

CREATE TABLE "AlertInstance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "alertGroupId" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL,
    "message" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    CONSTRAINT "AlertInstance_alertGroupId_fkey" FOREIGN KEY ("alertGroupId") REFERENCES "AlertGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Incident" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "env" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL,
    "resolvedAt" DATETIME,
    "owner" TEXT NOT NULL
);

CREATE TABLE "IncidentEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "incidentId" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    CONSTRAINT "IncidentEvent_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Insight" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "rootCauseJson" TEXT NOT NULL,
    "confidence" TEXT NOT NULL,
    "suggestedFixJson" TEXT NOT NULL,
    "riskImpact" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
