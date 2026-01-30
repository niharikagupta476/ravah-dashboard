import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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

  const insight = await prisma.insight.findFirst({
    where: {
      entityType: parsed.entityType,
      entityId: parsed.entityId
    }
  });

  if (!insight) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: insight.id,
    entityType: insight.entityType,
    entityId: insight.entityId,
    rootCause: JSON.parse(insight.rootCauseJson) as string[],
    confidence: insight.confidence,
    suggestedFix: JSON.parse(insight.suggestedFixJson) as string[],
    riskImpact: insight.riskImpact
  });
}
