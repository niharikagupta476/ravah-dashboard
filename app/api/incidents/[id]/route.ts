import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const paramsSchema = z.object({
  id: z.string()
});

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = paramsSchema.parse(params);
  const incident = await prisma.incident.findUnique({
    where: { id },
    include: { events: { orderBy: { timestamp: "desc" } } }
  });

  if (!incident) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: incident.id,
    title: incident.title,
    env: incident.env,
    severity: incident.severity,
    status: incident.status,
    startedAt: incident.startedAt,
    resolvedAt: incident.resolvedAt,
    owner: incident.owner,
    events: incident.events.map((event) => ({
      id: event.id,
      timestamp: event.timestamp,
      type: event.type,
      message: event.message
    }))
  });
}
