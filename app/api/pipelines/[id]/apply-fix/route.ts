import { NextResponse } from "next/server";
import { applyFix } from "@/lib/pipeline-data";
import { getRequestContext } from "@/lib/context";
import { z } from "zod";

const paramsSchema = z.object({
  id: z.string()
});

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = paramsSchema.parse(params);
  const context = await getRequestContext();
  if (!context) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const detail = await applyFix(id, context.orgId, context.projectId);

  if (!detail) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  return NextResponse.json(detail);
}
