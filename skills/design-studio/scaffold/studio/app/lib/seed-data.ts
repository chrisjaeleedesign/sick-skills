/**
 * Stub seed data for legacy prototypes (e.g. unified-refined-v3).
 * Provides minimal data to satisfy imports and prevent build errors.
 */

export type Item = {
  id: string;
  title: string;
  kind: string;
  body?: string;
  source?: string;
};

export type Place = {
  id: string;
  title: string;
  items: Item[];
};

export type Home = {
  id: string;
  title: string;
  emoji?: string;
  places: Place[];
  items: Item[];
};

export type Assistant = {
  id: string;
  name: string;
  homeId: string;
};

type SeedData = {
  homes: Home[];
  assistants: Assistant[];
};

export const seedData: SeedData = {
  homes: [
    {
      id: "life",
      title: "Life",
      emoji: "🌿",
      places: [
        {
          id: "general",
          title: "General",
          items: [
            { id: "item-1", title: "Morning routine", kind: "Note", body: "Wake up, stretch, journal." },
            { id: "item-2", title: "Weekly goals", kind: "Checklist", body: "Review every Sunday." },
          ],
        },
        {
          id: "health",
          title: "Health",
          items: [
            { id: "item-3", title: "Running log", kind: "Note", body: "3 runs this week." },
          ],
        },
      ],
      items: [
        { id: "item-4", title: "Big picture", kind: "Note", body: "What matters most right now?" },
      ],
    },
    {
      id: "work",
      title: "Work",
      emoji: "💼",
      places: [
        {
          id: "projects",
          title: "Projects",
          items: [
            { id: "item-5", title: "Q2 roadmap", kind: "Document", body: "Draft in progress." },
            { id: "item-6", title: "Team retro notes", kind: "Note", body: "From last Friday." },
          ],
        },
      ],
      items: [],
    },
  ],
  assistants: [
    { id: "asst-1", name: "Pebble", homeId: "life" },
    { id: "asst-2", name: "Work Coach", homeId: "work" },
  ],
};

export function assistantsForHome(data: SeedData, homeId: string): Assistant[] {
  return data.assistants.filter((a) => a.homeId === homeId);
}

export function allItems(data: SeedData): Item[] {
  return data.homes.flatMap((home) => [
    ...home.items,
    ...home.places.flatMap((place) => place.items),
  ]);
}
