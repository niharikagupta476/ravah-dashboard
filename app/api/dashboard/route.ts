import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function GET() {
  const [pipelines, alerts, incidents, pipelineRuns] = await Promise.all([
    prisma.pipeline.findMany(),
    prisma.alertGroup.findMany(),
    prisma.incident.findMany(),
    prisma.pipelineRun.findMany({
      orderBy: { startedAt: "desc" },
      take: 5,
      include: { pipeline: true }
    })
  ]);

  const cards = {
    activePipelines: pipelines.length,
    openAlerts: alerts.filter((alert) => alert.status !== "resolved").length,
    ongoingIncidents: incidents.filter((incident) => incident.status !== "resolved").length
  };

  const recentActivity = pipelineRuns.map((run) => ({
    id: run.id,
    title: `${run.pipeline.name} ${run.status === "success" ? "completed" : "failed"}`,
    detail: `${run.pipeline.env} · ${Math.round(run.durationSec / 60)} min`
  }));

  const attention = pipelines
    .filter((pipeline) => pipeline.lastRunStatus !== "success")
    .slice(0, 5)
    .map((pipeline) => ({
      id: pipeline.id,
      name: pipeline.name,
      lastRun: pipeline.updatedAt,
      status: pipeline.lastRunStatus,
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
