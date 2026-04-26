import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const alerts = await prisma.alertGroup.findMany({
    orderBy: { lastSeenAt: "desc" }
  });

  return NextResponse.json(
    alerts.map((alert) => ({
      id: alert.id,
      name: alert.name,
      service: alert.service,
      env: alert.env,
      severity: alert.severity,
      count: alert.count,
      lastSeenAt: alert.lastSeenAt,
      status: alert.status
    }))
  );
}
