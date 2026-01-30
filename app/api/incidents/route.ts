import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const incidents = await prisma.incident.findMany({
    orderBy: { startedAt: "desc" }
  });

  return NextResponse.json(
    incidents.map((incident) => ({
      id: incident.id,
      title: incident.title,
      env: incident.env,
      severity: incident.severity,
      status: incident.status,
      startedAt: incident.startedAt,
      resolvedAt: incident.resolvedAt,
      owner: incident.owner
    }))
  );
}
