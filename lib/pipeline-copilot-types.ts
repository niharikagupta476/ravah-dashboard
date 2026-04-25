export type PipelineModel = {
  id: string;
  name: string;
  provider: string;
  repo: string;
  branch: string;
  owner: string;
  status: string;
  lastRunAt: Date;
  durationSec: number;
};

export type PipelineRunModel = {
  id: string;
  pipelineId: string;
  status: string;
  duration: number;
  startedAt: Date;
  finishedAt: Date | null;
};

export type StageModel = {
  id: string;
  name: string;
  status: string;
  duration: number;
};

export type JobModel = {
  id: string;
  name: string;
  status: string;
  logs: string;
  duration: number;
};
