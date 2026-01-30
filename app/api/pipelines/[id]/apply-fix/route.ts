import { NextResponse } from "next/server";
import { applyFix } from "@/lib/pipeline-data";
import { z } from "zod";

const paramsSchema = z.object({
  id: z.string()
});

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = paramsSchema.parse(params);
  const detail = await applyFix(id);

  if (!detail) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  return NextResponse.json(detail);
}
