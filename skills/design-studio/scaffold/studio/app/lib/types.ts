// ---------------------------------------------------------------------------
// Journal types — shared between server (db-journal.ts) and client components
// ---------------------------------------------------------------------------

export type EventType = "created" | "iterated" | "archived" | "moved" | "feedback";
export type InsightType = "preference" | "learning" | "reaction" | "direction" | "decision";
export type InsightStatus = "active" | "superseded" | "killed" | "final";

export interface Event {
  id: string;
  ts: string;
  type: EventType;
  body: string;
  family?: string;
  version?: number;
  tags: string[];
  metadata: Record<string, unknown>;
}

export interface Insight {
  id: string;
  ts: string;
  type: InsightType;
  body: string;
  family?: string;
  tags: string[];
  status: InsightStatus;
  refs: string[];
  superseded_by?: string;
}

export interface QueryParams {
  search?: string;
  type?: string;
  status?: string;
  family?: string;
  tags?: string[];
  since?: string;
  until?: string;
  limit?: number;
  offset?: number;
}

/** ID prefixes for insight types, used by the journal CLI and modal form. */
export const INSIGHT_PREFIXES: Record<InsightType, string> = {
  preference: "pref",
  learning: "lrn",
  reaction: "rxn",
  direction: "dir",
  decision: "dec",
};

// ---------------------------------------------------------------------------
// Features
// ---------------------------------------------------------------------------

export type ConnectionType = "parent" | "related";

export interface Feature {
  id: string;
  area: string;
  name: string;
  description: string;
  notes: string;
  priority: string;
  status: string;
  x: number;
  y: number;
  created_at: string;
  updated_at: string;
}

export interface FeatureConnection {
  a_id: string;
  b_id: string;
  type: ConnectionType;
  note: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Colors — shared across thoughts, families, sections, boards
// ---------------------------------------------------------------------------

export type ThoughtColor =
  | "red" | "orange" | "amber" | "yellow" | "lime"
  | "emerald" | "teal" | "cyan" | "blue" | "indigo"
  | "violet" | "purple" | "pink" | "rose" | "gray";

export const COLOR_PALETTE: Record<ThoughtColor, { bg: string; border: string; text: string; dot: string }> = {
  red:     { bg: "bg-red-50",     border: "border-red-300",     text: "text-red-700",     dot: "bg-red-500" },
  orange:  { bg: "bg-orange-50",  border: "border-orange-300",  text: "text-orange-700",  dot: "bg-orange-500" },
  amber:   { bg: "bg-amber-50",   border: "border-amber-300",   text: "text-amber-700",   dot: "bg-amber-500" },
  yellow:  { bg: "bg-yellow-50",  border: "border-yellow-300",  text: "text-yellow-700",  dot: "bg-yellow-500" },
  lime:    { bg: "bg-lime-50",    border: "border-lime-300",    text: "text-lime-700",    dot: "bg-lime-500" },
  emerald: { bg: "bg-emerald-50", border: "border-emerald-300", text: "text-emerald-700", dot: "bg-emerald-500" },
  teal:    { bg: "bg-teal-50",    border: "border-teal-300",    text: "text-teal-700",    dot: "bg-teal-500" },
  cyan:    { bg: "bg-cyan-50",    border: "border-cyan-300",    text: "text-cyan-700",    dot: "bg-cyan-500" },
  blue:    { bg: "bg-blue-50",    border: "border-blue-300",    text: "text-blue-700",    dot: "bg-blue-500" },
  indigo:  { bg: "bg-indigo-50",  border: "border-indigo-300",  text: "text-indigo-700",  dot: "bg-indigo-500" },
  violet:  { bg: "bg-violet-50",  border: "border-violet-300",  text: "text-violet-700",  dot: "bg-violet-500" },
  purple:  { bg: "bg-purple-50",  border: "border-purple-300",  text: "text-purple-700",  dot: "bg-purple-500" },
  pink:    { bg: "bg-pink-50",    border: "border-pink-300",    text: "text-pink-700",    dot: "bg-pink-500" },
  rose:    { bg: "bg-rose-50",    border: "border-rose-300",    text: "text-rose-700",    dot: "bg-rose-500" },
  gray:    { bg: "bg-gray-50",    border: "border-gray-300",    text: "text-gray-700",    dot: "bg-gray-500" },
};

// ---------------------------------------------------------------------------
// Thoughts
// ---------------------------------------------------------------------------

export type ThoughtKind = "observation" | "question" | "principle" | "reference";
export type SourceType = "video" | "article" | "conversation" | "observation" | "prototype" | "image" | "link";
export type Importance = "invalidated" | "signal" | "assumption" | "guiding" | "foundational";
export type RelationType = "related" | "inspired_by" | "builds_on" | "contradicts";
export type AttachmentType = "image" | "screenshot" | "thumbnail" | "video_ref";

export interface Thought {
  id: string;
  kind: ThoughtKind;
  source_type?: SourceType;
  source_url?: string;
  source_meta: Record<string, unknown>;
  family?: string;
  tags: string[];
  color?: ThoughtColor;
  pinned: boolean;
  importance?: Importance;
  created_at: string;
  updated_at: string;
  layout_w?: number;
  layout_h?: number;
  layout_x?: number;
  layout_y?: number;
}

export interface Revision {
  id: string;
  thought_id: string;
  body?: string;
  seq: number;
  source: string;
  created_at: string;
}

export interface Attachment {
  id: string;
  thought_id: string;
  revision_id?: string;
  type: AttachmentType;
  path: string;
  alt: string;
  created_at: string;
}

export interface ThoughtRelation {
  from_id: string;
  to_id: string;
  type: RelationType;
  created_at: string;
}

export interface ThoughtQueryParams {
  search?: string;
  kind?: ThoughtKind;
  importance?: Importance;
  color?: ThoughtColor;
  family?: string;
  tags?: string[];
  pinned?: boolean;
  limit?: number;
  offset?: number;
}

// ---------------------------------------------------------------------------
// Bank & Boards types
// ---------------------------------------------------------------------------

export interface Board {
  id: string;
  name: string;
  description: string;
  color?: ThoughtColor;
  columns: number;
  created_at: string;
  updated_at: string;
}

export interface BoardItem {
  board_id: string;
  thought_id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  added_at: string;
}

export interface SavedFilter {
  id: string;
  name: string;
  filter_json: FilterState;
  created_at: string;
}

export interface FilterState {
  types?: SourceType[];
  tags?: string[];
  families?: string[];
  timeRange?: { since?: string; until?: string };
  boardId?: string;
  onBoard?: "any" | "none";
  pinned?: boolean;
}
