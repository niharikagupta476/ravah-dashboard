import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequestContext } from "@/lib/context";
import { z } from "zod";

export async function GET() {
  const context = await getRequestContext();
  if (!context) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const [pipelines, alerts, incidents, activities] = await Promise.all([
    prisma.pipeline.findMany({
      where: {
        orgId: { in: context.orgIds },
        ...(context.projectIds.length ? { projectId: { in: context.projectIds } } : {})
      }
    }),
    prisma.alertGroup.findMany(),
    prisma.incident.findMany(),
    prisma.activity.findMany({
      where: {
        orgId: { in: context.orgIds },
        ...(context.projectIds.length ? { projectId: { in: context.projectIds } } : {})
      },
      orderBy: { createdAt: "desc" },
      take: 5
    })
  ]);

  const cards = {
    activePipelines: pipelines.length,
    openAlerts: alerts.filter((alert) => alert.status !== "resolved").length,
    ongoingIncidents: incidents.filter((incident) => incident.status !== "resolved").length
  };

  const recentActivity = activities.map((activity) => ({
    id: activity.id,
    title: activity.message,
    detail: new Date(activity.createdAt).toLocaleString()
  }));

  const attention = pipelines
    .filter((pipeline) => pipeline.status.toLowerCase() !== "success")
    .slice(0, 5)
    .map((pipeline) => ({
      id: pipeline.id,
      name: pipeline.name,
      lastRun: pipeline.lastRunAt,
      status: pipeline.status,
      owner: pipeline.owner
    }));

  const responseSchema = z.object({
    cards: z.object({
      activePipelines: z.number(),
      openAlerts: z.number(),
      ongoingIncidents: z.number()
    }),
    recentActivity: z.array(
      z.object({
        id: z.string(),
        title: z.string(),
        detail: z.string()
      })
    ),
    attention: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        lastRun: z.date(),
        status: z.string(),
        owner: z.string()
      })
    )
  });

  return NextResponse.json(responseSchema.parse({ cards, recentActivity, attention }));
}
