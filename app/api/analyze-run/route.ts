import { NextResponse } from "next/server";
import { z } from "zod";
import { getRequestContext } from "@/lib/context";
import { getRunDetail } from "@/lib/pipeline-data";

const bodySchema = z.object({ runId: z.string() });

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }

  const context = await getRequestContext();
  if (!context) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const detail = await getRunDetail(parsed.data.runId, context.orgId, context.projectId);
  if (!detail) {
    return NextResponse.json({ message: "Run not found" }, { status: 404 });
  }

  return NextResponse.json(detail.analysis);
}
