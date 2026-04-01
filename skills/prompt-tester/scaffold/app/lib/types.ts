export interface PromptMeta {
  id: string;
  title: string;
  description: string;
  created: string;
  updated: string;
  versions: number[];
  latest_version: number;
}

export interface PromptVersion {
  prompt_id: string;
  version: number;
  content: string;
  created: string;
  parent_run_id?: string;
}

export interface Scenario {
  id: string;
  title: string;
  input: string;
  expected_behavior: string;
  tags: string[];
  eval_rules: string[];
}

export interface RunMeta {
  run_id: string;
  prompt_id: string;
  prompt_version: number;
  model: string;
  scenario_ids: string[];
  created: string;
  status: "running" | "completed";
  avg_score?: number;
  reviewed?: boolean;
}

export interface ScenarioResult {
  scenario_id: string;
  scenario_title: string;
  input: string;
  output: string;
  scores: {
    instruction_following: { score: number; explanation: string };
    eval_rules: {
      score: number;
      explanation: string;
      details: Array<{ rule: string; passed: boolean }>;
    };
    quality: { score: number; explanation: string };
  };
}

export interface Review {
  scenario_id: string;
  rating: "good" | "bad" | "skip";
  note: string;
}

export interface StreamEvent {
  type: "progress" | "result" | "done" | "error";
  scenario_id?: string;
  status?: string;
  output?: string;
  scores?: ScenarioResult["scores"];
  run_id?: string;
  content?: string;
}

export interface AppConfig {
  models: string[];
  thinking_levels: string[];
  default_model: string;
  default_thinking_level: string;
}
