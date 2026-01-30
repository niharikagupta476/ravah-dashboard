import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { analyzeLogs } from "@/lib/insights";
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

  let insight = await prisma.insight.findFirst({
    where: {
      entityType: parsed.entityType,
      entityId: parsed.entityId
    }
  });

  if (!insight && parsed.entityType === "pipelineRun") {
    const run = await prisma.pipelineRun.findUnique({
      where: { id: parsed.entityId }
    });

    if (run) {
      const generated = analyzeLogs(run.logsText);
      if (generated) {
        insight = await prisma.insight.create({
          data: {
            entityType: "pipelineRun",
            entityId: run.id,
            rootCause: generated.rootCause,
            confidence: generated.confidence,
            suggestedFixJson: JSON.stringify(generated.suggestedFix),
            riskImpact: generated.riskImpact,
            relatedChange: generated.relatedChange
          }
        });
      }
    }
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
