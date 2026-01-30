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
  const alert = await prisma.alertGroup.findUnique({
    where: { id },
    include: { instances: { orderBy: { timestamp: "desc" } } }
  });

  if (!alert) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: alert.id,
    name: alert.name,
    service: alert.service,
    env: alert.env,
    severity: alert.severity,
    count: alert.count,
    lastSeenAt: alert.lastSeenAt,
    status: alert.status,
    instances: alert.instances.map((instance) => ({
      id: instance.id,
      timestamp: instance.timestamp,
      message: instance.message,
      fingerprint: instance.fingerprint
    }))
  });
}
