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
  const parsedParams = paramsSchema.safeParse(params);
  if (!parsedParams.success) {
    return NextResponse.json({ message: "Invalid id" }, { status: 400 });
  }

  const { id } = parsedParams.data;
  const context = await getRequestContext();
  if (!context) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const selectedProjectId = context.projectId ?? context.projectIds[0];
  if (!selectedProjectId) {
    return NextResponse.json({ message: "Project context not found" }, { status: 404 });
  }

  const detail = await applyFix(id, context.orgId, selectedProjectId);

  if (!detail) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  return NextResponse.json(detail);
}
