import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateInsightForRun } from "@/lib/pipeline-data";
import { getRequestContext } from "@/lib/context";
import { z } from "zod";

const querySchema = z.object({
  entityType: z.string(),
  entityId: z.string()
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.parse({
    entityType: searchParams.get("entityType"),
    entityId: searchParams.get("entityId")
  });

  const context = await getRequestContext();
  if (!context) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  let insight = await prisma.insight.findFirst({
    where: {
      entityType: parsed.entityType,
      entityId: parsed.entityId,
      orgId: { in: context.orgIds },
      ...(context.projectIds.length ? { projectId: { in: context.projectIds } } : {})
    }
  });

  if (!insight && parsed.entityType === "pipelineRun") {
    const insightProjectId = context.projectId ?? context.projectIds[0];
    if (!insightProjectId) {
      return NextResponse.json({ message: "Project context not found" }, { status: 404 });
    }
    insight = await getOrCreateInsightForRun(parsed.entityId, context.orgId, insightProjectId);
  }

  if (!insight) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: insight.id,
    entityType: insight.entityType,
    entityId: insight.entityId,
    rootCause: insight.rootCause,
    confidence: insight.confidence,
    suggestedFix: JSON.parse(insight.suggestedFixJson) as string[],
    riskImpact: insight.riskImpact,
    relatedChange: insight.relatedChange
  });
}
