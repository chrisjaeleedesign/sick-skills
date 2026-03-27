/**
 * Shared seed data for design studio prototypes.
 *
 * Every prototype imports from here so explorations are directly comparable.
 * Data is structured around the three use-case domains (Chef, Pebble, Coaching)
 * and exercises the core object model: Home > Place > Item, Chat, Assistants.
 */

/* ── Types ─────────────────────────────────────────────────────────────────── */

export interface Item {
  id: string;
  title: string;
  kind: string;
  summary: string;
  updated: string;
  /** "doc" for text-heavy, "tracker" for stat-heavy, "app" for interactive */
  mode: "doc" | "tracker" | "app";
  sections: { heading: string; body: string }[];
  stats: { label: string; value: string }[];
}

export interface ChatMessage {
  type: "message";
  author: string;
  role: "user" | "assistant";
  time: string;
  text: string;
  /** If author is an assistant, which one */
  assistantId?: string;
  /** @mention of an assistant within the message */
  mention?: string;
}

export interface ChatItemCard {
  type: "item-card";
  item: Item;
}

export type ChatEntry = ChatMessage | ChatItemCard;

export interface FeedMessage {
  type: "feed-message";
  source: string;
  author: string;
  role: "user" | "assistant";
  time: string;
  text: string;
}

export interface FeedItemCard {
  type: "feed-item";
  source: string;
  item: Item;
}

export type FeedEntry = FeedMessage | FeedItemCard;

export interface Assistant {
  id: string;
  name: string;
  description: string;
  /** Domains this assistant is commonly used in (for filtering, not restriction) */
  domains: string[];
}

export interface Place {
  id: string;
  title: string;
  unread: number;
  chat: ChatEntry[];
  items: Item[];
  defaultItemId: string;
}

export interface Home {
  id: string;
  title: string;
  emoji: string;
  feed: FeedEntry[];
  places: Place[];
  items: Item[];
  defaultItemId: string;
}

export interface SeedData {
  workspaceName: string;
  homes: Home[];
  assistants: Assistant[];
}

/* ── Helpers ────────────────────────────────────────────────────────────────── */

function item(props: Omit<Item, "mode" | "sections" | "stats"> & Partial<Pick<Item, "mode" | "sections" | "stats">>): Item {
  return { mode: "doc", sections: [], stats: [], ...props };
}

/* ── Assistants (user-scoped, not home-scoped) ─────────────────────────────── */

export const assistants: Assistant[] = [
  { id: "general", name: "General", description: "Default helper for any context", domains: [] },
  { id: "planner", name: "Planner", description: "Scopes and organizes work into plans", domains: ["pebble", "coaching"] },
  { id: "researcher", name: "Researcher", description: "Finds patterns, gaps, and connections", domains: ["pebble"] },
  { id: "chef", name: "Chef", description: "Creative culinary collaborator", domains: ["chef"] },
  { id: "cost", name: "Cost", description: "Keeps budget and logistics in range", domains: ["chef"] },
  { id: "coach", name: "Coach", description: "Broad life accountability", domains: ["coaching"] },
  { id: "fitness", name: "Fitness", description: "Training, recovery, and performance", domains: ["coaching"] },
  { id: "reflection", name: "Reflection", description: "Pattern recognition and honest challenge", domains: ["coaching"] },
];

/* ── Chef Items ────────────────────────────────────────────────────────────── */

const chefItems = {
  springDinner: item({
    id: "spring-dinner",
    title: "Spring Dinner",
    kind: "Menu",
    summary: "Working artifact for the next dinner party. Lighter, brighter, more playful in the middle.",
    updated: "2h ago",
    sections: [
      { heading: "Direction", body: "Lighter, brighter, more playful in the middle. Avoid repeating the heavy end-loaded arc from the last dinner." },
      { heading: "Current courses", body: "Opening bite \u00b7 cold middle course \u00b7 family-style fish main \u00b7 brighter dessert ending" },
      { heading: "Open questions", body: "Does the menu need more crunch? Is dessert still too safe? Should the middle course have acid or fat as the lead?" },
    ],
  }),
  budgetTracker: item({
    id: "budget-tracker",
    title: "Budget Tracker",
    kind: "Tracker",
    summary: "Live running estimate for spend and per-guest cost.",
    updated: "1h ago",
    mode: "tracker",
    stats: [
      { label: "Total", value: "$176" },
      { label: "Per guest", value: "$22" },
      { label: "Biggest swing", value: "Main" },
    ],
    sections: [
      { heading: "Watchouts", body: "Duck breast pushes the menu above the comfortable range. Fish alternatives or quantity changes would create the biggest savings." },
    ],
  }),
  dessertExperiments: item({
    id: "dessert-experiments",
    title: "Dessert Experiments",
    kind: "Notebook",
    summary: "Explorations around a sharper dessert ending.",
    updated: "Yesterday",
    sections: [
      { heading: "Current direction", body: "Keep panna cotta structure but with a brighter finish and a cleaner acid line. Yuzu curd or passion fruit gel as the top layer." },
      { heading: "Alternatives considered", body: "Chocolate was ruled out (too heavy for the arc). Sorbet felt too simple for a finale." },
    ],
  }),
  lastDinnerReview: item({
    id: "last-dinner-review",
    title: "Review \u2014 Last Dinner",
    kind: "Review",
    summary: "What worked, what dragged, what to avoid repeating.",
    updated: "4d ago",
    sections: [
      { heading: "Worked", body: "The opening bite landed immediately. Fish quality carried the course. Guests loved the presentation on the ceramic plates." },
      { heading: "Didn\u2019t work", body: "The middle got softer and more repetitive than intended. Two courses in a row with similar richness." },
      { heading: "Next time", body: "Need a sharper contrast between courses 2 and 3. Consider something with crunch or acid to break the arc." },
    ],
  }),
  ingredientSourcing: item({
    id: "ingredient-sourcing",
    title: "Ingredient Sourcing",
    kind: "Reference",
    summary: "Suppliers, seasonal availability, and quality notes.",
    updated: "3d ago",
    sections: [
      { heading: "Fish", body: "Catalina Offshore for sashimi-grade. Order by Wednesday for Saturday delivery." },
      { heading: "Produce", body: "Specialty Produce for micro herbs and edible flowers. Farmers market for citrus." },
    ],
  }),
};

/* ── Pebble Items ──────────────────────────────────────────────────────────── */

const pebbleItems = {
  restructureBriefing: item({
    id: "restructure-briefing",
    title: "Restructure Briefing",
    kind: "Spec",
    summary: "Standalone summary of the current shell, target model, and open gaps.",
    updated: "Today",
    sections: [
      { heading: "Target model", body: "Workspace stays. Homes sit inside it. Places live inside homes. Durable things open in one stable panel while the conversation stays visible." },
      { heading: "Why it matters", body: "The current shell already does most of the work. The change is mainly hierarchy, retrieval boundaries, and giving durable things a calmer way to accumulate." },
      { heading: "Open questions", body: "Feed behavior, browser behavior, and the exact relationship between a home, a place, and a durable thing still need final product calls." },
    ],
  }),
  decisionLog: item({
    id: "decision-log",
    title: "Decision Log",
    kind: "Reference",
    summary: "High-signal product decisions that should not get rehashed.",
    updated: "Today",
    sections: [
      { heading: "Locked", body: "Homes are the domain-level layer. Places are focused lanes. Durable things open in the right panel. Threads stay inside chat." },
      { heading: "Still resolving", body: "How the contextual browser behaves, how activity cards appear in the home feed, and what the lightest naming should be in the UI." },
    ],
  }),
  launchBoard: item({
    id: "launch-board",
    title: "Launch Board",
    kind: "Dashboard",
    summary: "Live launch readiness surface for the first customer push.",
    updated: "Today",
    mode: "tracker",
    stats: [
      { label: "Critical", value: "5" },
      { label: "Blocked", value: "1" },
      { label: "Calls booked", value: "3" },
    ],
    sections: [
      { heading: "Focus", body: "The board should tell the team whether the shell, item surface, and one strong end-to-end use case are ready." },
    ],
  }),
  uxRisks: item({
    id: "ux-risks",
    title: "UX Risks",
    kind: "Note",
    summary: "Capture-first vs structure-first tradeoffs and layout concerns.",
    updated: "Yesterday",
    sections: [
      { heading: "Top risks", body: "Too many nouns, too many places to talk, and durable things feeling bolted on rather than native to the flow." },
      { heading: "Mitigation", body: "Keep user-facing language to Homes, Places, and item names. Let the shell be kind-agnostic." },
    ],
  }),
  firstCustomerChecklist: item({
    id: "first-customer-checklist",
    title: "First Customer Checklist",
    kind: "Checklist",
    summary: "What must be ready before outreach begins.",
    updated: "Yesterday",
    sections: [
      { heading: "Before outreach", body: "Working home feed, focused place chat, contextual browser, stable open panel, and one excellent use case demonstrated clearly." },
    ],
  }),
  founderSync: item({
    id: "founder-sync",
    title: "Founder Sync \u2014 Mar 17",
    kind: "Meeting",
    summary: "Live notes, bets, and open questions from the latest sync.",
    updated: "Yesterday",
    sections: [
      { heading: "Main point", body: "The UI should feel more like Apple Notes and Finder had a calm multiplayer child than like a knowledge system with too many concepts." },
      { heading: "Bets", body: "Bet on simplicity. Bet on conversation as the primary surface. Bet on compounding over time." },
    ],
  }),
};

/* ── Coaching Items ─────────────────────────────────────────────────────────── */

const coachingItems = {
  fitnessTracker: item({
    id: "fitness-tracker",
    title: "Fitness Tracker",
    kind: "Tracker",
    summary: "Live view for workouts, recovery, and consistency.",
    updated: "Today",
    mode: "tracker",
    stats: [
      { label: "Sessions", value: "3" },
      { label: "Recovery", value: "2 days" },
      { label: "Streak", value: "6 days" },
    ],
    sections: [
      { heading: "This week", body: "Three climbing sessions. Recovery notes are still sparse on off days, which makes fatigue harder to interpret." },
      { heading: "Pattern", body: "Consistency drops when non-climbing days have no planned activity. Even a short mobility session helps maintain the streak." },
    ],
  }),
  q2Goals: item({
    id: "q2-goals",
    title: "Q2 Goals",
    kind: "Plan",
    summary: "Quarterly goals with tradeoffs and accountability.",
    updated: "Today",
    sections: [
      { heading: "Focus", body: "Build and ship Pebble, keep climbing progress moving, keep dinner parties sustainable." },
      { heading: "Tension", body: "The main constraint is not ambition. It is recovery and bandwidth. Trying to do all three at full intensity leads to burnout." },
      { heading: "Tradeoffs accepted", body: "Climbing stays at maintenance intensity during heavy product sprints. Dinners happen monthly, not biweekly." },
    ],
  }),
  climbingPlan: item({
    id: "climbing-plan",
    title: "8-Week Climbing Plan",
    kind: "Plan",
    summary: "Strength block tuned for consistency over intensity.",
    updated: "Yesterday",
    sections: [
      { heading: "Structure", body: "Mon / Wed / Fri climbing. Non-climbing days are where structure drops and drift starts." },
      { heading: "Current adjustment", body: "Added 15-min mobility on Tue/Thu as a minimum viable off-day activity. Goal is maintaining the streak, not peak performance." },
    ],
  }),
  reflectionJournal: item({
    id: "reflection-journal",
    title: "Reflection Journal",
    kind: "Journal",
    summary: "Living record of patterns, moments, and interpretations.",
    updated: "Today",
    sections: [
      { heading: "Current pattern", body: "Text dynamics still trigger embarrassment and defensiveness more easily than in-person interactions. The delay between send and response creates space for spiraling." },
      { heading: "What\u2019s helping", body: "Naming the pattern in the moment rather than after. Writing it down creates enough distance to see it clearly." },
    ],
  }),
  weeklyReview: item({
    id: "weekly-review",
    title: "Weekly Review \u2014 Mar 17",
    kind: "Review",
    summary: "What went well, what drifted, what to adjust.",
    updated: "2d ago",
    sections: [
      { heading: "Went well", body: "Three solid climbing sessions. Pebble design exploration made real progress. Founder sync was productive." },
      { heading: "Drifted", body: "Sleep consistency dropped mid-week. Skipped mobility on Thursday." },
      { heading: "Adjust", body: "Set a hard wind-down alarm at 10:30pm. Pre-commit to Thursday mobility by leaving the mat out." },
    ],
  }),
};

/* ── Homes ─────────────────────────────────────────────────────────────────── */

const chefHome: Home = {
  id: "chef",
  title: "Chef",
  emoji: "\u{1F30A}",
  items: [chefItems.springDinner, chefItems.budgetTracker, chefItems.ingredientSourcing],
  defaultItemId: "spring-dinner",
  feed: [
    { type: "feed-message", source: "Chef", author: "Chris", role: "user", time: "10:12 AM", text: "I want the next dinner to feel lighter and more playful than the last one." },
    { type: "feed-message", source: "Menus", author: "Chef", role: "assistant", time: "10:18 AM", text: "The middle of the menu needs a stronger idea. Two courses in a row with similar richness will flatten the arc." },
    { type: "feed-item", source: "Menus", item: chefItems.springDinner },
    { type: "feed-message", source: "Logistics", author: "Cost", role: "assistant", time: "10:45 AM", text: "At the current ingredient list, you\u2019re around $22 per guest. Duck breast is the biggest swing item." },
    { type: "feed-item", source: "Logistics", item: chefItems.budgetTracker },
  ],
  places: [
    {
      id: "menus",
      title: "Menus",
      unread: 2,
      items: [chefItems.springDinner, chefItems.lastDinnerReview],
      defaultItemId: "spring-dinner",
      chat: [
        { type: "message", author: "Chris", role: "user", time: "10:18 AM", text: "What is the weakest course right now?" },
        { type: "message", author: "Chef", role: "assistant", time: "10:19 AM", text: "The center of the menu feels least resolved. It lacks a memorable idea and risks repeating the richness of the course before it.", assistantId: "chef" },
        { type: "item-card", item: chefItems.springDinner },
        { type: "message", author: "Chris", role: "user", time: "10:22 AM", text: "@Chef give me three directions that feel lighter but still composed.", mention: "chef" },
        { type: "message", author: "Chef", role: "assistant", time: "10:24 AM", text: "Three directions for the middle course:\n\n1. **Citrus and crudo** \u2014 raw fish with yuzu, radish, and a clean herb oil. Light, bright, textural.\n2. **Chilled soup** \u2014 cucumber-dill with a crunch garnish. Refreshing palate reset.\n3. **Vegetable tartare** \u2014 finely diced beets, apple, and shallot with a mustard vinaigrette. Earthy but lively.", assistantId: "chef" },
      ],
    },
    {
      id: "recipes",
      title: "Recipes",
      unread: 0,
      items: [chefItems.dessertExperiments],
      defaultItemId: "dessert-experiments",
      chat: [
        { type: "message", author: "Chris", role: "user", time: "Yesterday", text: "Start a note for the dessert direction. I want to keep panna cotta but make the ending sharper." },
        { type: "message", author: "Chef", role: "assistant", time: "Yesterday", text: "Started. I\u2019d anchor it around a brighter top layer \u2014 yuzu curd or passion fruit gel to cut through the cream.", assistantId: "chef" },
        { type: "item-card", item: chefItems.dessertExperiments },
      ],
    },
    {
      id: "logistics",
      title: "Logistics",
      unread: 1,
      items: [chefItems.budgetTracker, chefItems.ingredientSourcing],
      defaultItemId: "budget-tracker",
      chat: [
        { type: "message", author: "Chris", role: "user", time: "11:04 AM", text: "@Cost estimate cost per guest for the current draft.", mention: "cost" },
        { type: "message", author: "Cost", role: "assistant", time: "11:05 AM", text: "At the current ingredient list, likely $22\u201327 per guest depending on the main. Duck pushes it to the high end; switching to fish brings it down to ~$20.", assistantId: "cost" },
        { type: "item-card", item: chefItems.budgetTracker },
      ],
    },
  ],
};

const pebbleHome: Home = {
  id: "pebble",
  title: "Pebble",
  emoji: "\u{1F9ED}",
  items: [pebbleItems.decisionLog, pebbleItems.launchBoard],
  defaultItemId: "decision-log",
  feed: [
    { type: "feed-message", source: "Pebble", author: "Chris", role: "user", time: "9:10 AM", text: "We need the product to feel obvious within seconds. If someone has to read instructions, we\u2019ve already failed." },
    { type: "feed-item", source: "Product", item: pebbleItems.restructureBriefing },
    { type: "feed-message", source: "Founder Syncs", author: "Planner", role: "assistant", time: "11:42 AM", text: "Top unresolved questions are feed behavior, browser behavior, and how things should open. These three will shape the shell more than anything else." },
    { type: "feed-item", source: "Launch", item: pebbleItems.firstCustomerChecklist },
    { type: "feed-message", source: "Product", author: "Researcher", role: "assistant", time: "2:15 PM", text: "The simplest framing I can find: Homes are where you scan, Places are where you focus, and Items are what you keep." },
  ],
  places: [
    {
      id: "product",
      title: "Product",
      unread: 4,
      items: [pebbleItems.restructureBriefing, pebbleItems.uxRisks, pebbleItems.decisionLog],
      defaultItemId: "restructure-briefing",
      chat: [
        { type: "message", author: "Chris", role: "user", time: "9:10 AM", text: "The home / place / thing model is right, but artifact organization still feels unresolved." },
        { type: "message", author: "Planner", role: "assistant", time: "9:12 AM", text: "Then the shell should organize homes and places, while durable things get their own calm browser next to navigation.", assistantId: "planner" },
        { type: "item-card", item: pebbleItems.restructureBriefing },
        { type: "message", author: "Chris", role: "user", time: "9:18 AM", text: "And the browser should live near the left, not take over the main pane. Opening something should never make the conversation disappear." },
        { type: "message", author: "Researcher", role: "assistant", time: "9:22 AM", text: "That matches the four-zone model: nav \u2192 browser \u2192 chat \u2192 open panel. Browsing near navigation, opening on the right, conversation always visible.", assistantId: "researcher" },
      ],
    },
    {
      id: "syncs",
      title: "Founder Syncs",
      unread: 0,
      items: [pebbleItems.founderSync, pebbleItems.decisionLog],
      defaultItemId: "founder-sync",
      chat: [
        { type: "message", author: "Chris", role: "user", time: "Yesterday", text: "Distill the last sync into the three real product bets." },
        { type: "message", author: "Researcher", role: "assistant", time: "Yesterday", text: "Three bets from the sync:\n\n1. **Home as retrieval boundary** \u2014 context stays within the domain, never leaks across\n2. **Items replace views** \u2014 flexible kind labels instead of rigid doc/app binary\n3. **Calmer browsing layer** \u2014 durable things accumulate without cluttering the conversation", assistantId: "researcher" },
        { type: "item-card", item: pebbleItems.founderSync },
      ],
    },
    {
      id: "launch",
      title: "Launch",
      unread: 1,
      items: [pebbleItems.launchBoard, pebbleItems.firstCustomerChecklist],
      defaultItemId: "launch-board",
      chat: [
        { type: "message", author: "Chris", role: "user", time: "11:01 AM", text: "What absolutely must be ready before the first customer calls?" },
        { type: "message", author: "Planner", role: "assistant", time: "11:03 AM", text: "Four things: the home feed, the focused place chat, a strong thing browser, and one polished workflow that demonstrates all of them together.", assistantId: "planner" },
        { type: "item-card", item: pebbleItems.firstCustomerChecklist },
        { type: "message", author: "Chris", role: "user", time: "11:08 AM", text: "@Planner turn that into a checklist with owners and dates.", mention: "planner" },
      ],
    },
  ],
};

const coachingHome: Home = {
  id: "coaching",
  title: "Coaching",
  emoji: "\u{1F9E0}",
  items: [coachingItems.fitnessTracker, coachingItems.q2Goals],
  defaultItemId: "fitness-tracker",
  feed: [
    { type: "feed-message", source: "Coaching", author: "Chris", role: "user", time: "8:14 AM", text: "I\u2019m trying to stay consistent on training without burning out everything else." },
    { type: "feed-item", source: "Goals", item: coachingItems.q2Goals },
    { type: "feed-message", source: "Training", author: "Fitness", role: "assistant", time: "8:32 AM", text: "Your plan is workable, but non-climbing days still need more intentional structure. Even 15 minutes of mobility is better than nothing." },
    { type: "feed-item", source: "Training", item: coachingItems.fitnessTracker },
    { type: "feed-message", source: "Reflection", author: "Reflection", role: "assistant", time: "9:05 AM", text: "The consistency problem might not be about discipline. It might be about what you\u2019re avoiding on off days. Worth exploring." },
  ],
  places: [
    {
      id: "goals",
      title: "Goals",
      unread: 1,
      items: [coachingItems.q2Goals, coachingItems.weeklyReview],
      defaultItemId: "q2-goals",
      chat: [
        { type: "message", author: "Chris", role: "user", time: "8:22 AM", text: "What am I overcommitting to?" },
        { type: "message", author: "Coach", role: "assistant", time: "8:24 AM", text: "Probably intensity across too many domains at once. You\u2019re trying to ship a product, maintain a climbing practice, and host dinners \u2014 all at the level you\u2019d give each one if it were the only thing.", assistantId: "coach" },
        { type: "item-card", item: coachingItems.q2Goals },
        { type: "message", author: "Chris", role: "user", time: "8:28 AM", text: "So what gives?" },
        { type: "message", author: "Coach", role: "assistant", time: "8:30 AM", text: "Recovery is the hidden variable. You\u2019re not overcommitted on paper \u2014 you\u2019re under-recovered in practice. The plan needs slack, not fewer goals.", assistantId: "coach" },
      ],
    },
    {
      id: "training",
      title: "Training",
      unread: 3,
      items: [coachingItems.fitnessTracker, coachingItems.climbingPlan],
      defaultItemId: "fitness-tracker",
      chat: [
        { type: "message", author: "Chris", role: "user", time: "8:31 AM", text: "Non-climbing days are still where I lose structure." },
        { type: "message", author: "Fitness", role: "assistant", time: "8:32 AM", text: "Then the tracker needs to support recovery and lightweight check-ins on those days. Right now it only captures climbing sessions, which means off days look like failures instead of intentional rest.", assistantId: "fitness" },
        { type: "item-card", item: coachingItems.fitnessTracker },
        { type: "message", author: "Chris", role: "user", time: "8:35 AM", text: "@Fitness update the climbing plan to include minimum off-day activities.", mention: "fitness" },
      ],
    },
    {
      id: "reflection",
      title: "Reflection",
      unread: 0,
      items: [coachingItems.reflectionJournal, coachingItems.weeklyReview],
      defaultItemId: "reflection-journal",
      chat: [
        { type: "message", author: "Chris", role: "user", time: "Yesterday", text: "Text dynamics seem to trigger embarrassment and defensiveness too easily. I said something awkward in a group chat and spent an hour replaying it." },
        { type: "message", author: "Reflection", role: "assistant", time: "Yesterday", text: "That pattern needs naming and review over time, not just one-off soothing. The replaying is the problem, not the original message. What would it look like to notice the replay starting and interrupt it?", assistantId: "reflection" },
        { type: "item-card", item: coachingItems.reflectionJournal },
        { type: "message", author: "Chris", role: "user", time: "Yesterday", text: "Probably writing it down. Once I name it, the spiral usually loses energy." },
        { type: "message", author: "Reflection", role: "assistant", time: "Yesterday", text: "Then the journal entry is the intervention, not just the record. That\u2019s worth tracking as a pattern: naming \u2192 distance \u2192 de-escalation.", assistantId: "reflection" },
      ],
    },
  ],
};

/* ── Export ─────────────────────────────────────────────────────────────────── */

export const seedData: SeedData = {
  workspaceName: "Pebble",
  homes: [pebbleHome, chefHome, coachingHome],
  assistants,
};

/** Convenience: find all items across all homes and places */
export function allItems(data: SeedData): Item[] {
  const items: Item[] = [];
  for (const home of data.homes) {
    items.push(...home.items);
    for (const place of home.places) {
      items.push(...place.items);
    }
  }
  // deduplicate by id
  const seen = new Set<string>();
  return items.filter((i) => {
    if (seen.has(i.id)) return false;
    seen.add(i.id);
    return true;
  });
}

/** Convenience: get assistants relevant to a home */
export function assistantsForHome(data: SeedData, homeId: string): Assistant[] {
  return data.assistants.filter(
    (a) => a.domains.length === 0 || a.domains.includes(homeId)
  );
}
