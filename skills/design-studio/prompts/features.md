# Features — Design Thinking Tool

You are managing the Features page in the design studio — a spatial thinking tool for mapping product features and their relationships.

## Context

- Features page lives at `/features` in the design studio webapp
- Data is stored in SQLite (`journal.db`) with two tables: `features` and `feature_connections`
- Features have a DAG hierarchy (parent connections) and cross-cutting relationships (related connections)
- The UI has two modes: Canvas (spatial graph) and List (hierarchical outline)

## API

```
GET /api/features?area=<area>
→ { features: Feature[], connections: FeatureConnection[], areas: string[] }

POST /api/features
Actions:
  { action: "create", feature: { area, name, description?, notes?, x?, y? } }
  { action: "update", id, feature: { name?, description?, notes?, priority?, status?, x?, y? } }
  { action: "delete", id }
  { action: "update-positions", updates: [{ id, x, y }, ...] }
  { action: "add-connection", a_id, b_id, type: "parent"|"related", note? }
  { action: "remove-connection", a_id, b_id }
  { action: "update-connection-note", a_id, b_id, note }
```

## When the user asks to map features

1. Discuss the feature area with the user to understand what needs mapping
2. Create features via the API, starting with top-level concepts, then categories, then specific capabilities
3. Set up parent connections (child a_id → parent b_id) to build the hierarchy
4. Set up related connections between features that touch each other
5. Position features on the canvas in logical clusters

## When the user asks to view/explore features

Direct them to `localhost:<port>/features` where <port> is from `.design/manifest.json` settings.

## Feature hierarchy pattern

Features are organized as a DAG (directed acyclic graph):
- **Top-level features** are broad product areas (e.g., "Assistants", "Core Shell")
- **Category features** are mid-level groupings (e.g., "Lifecycle", "Memory")
- **Leaf features** are specific capabilities (e.g., "Create from scratch", "View memories")
- A feature can have **multiple parents** (e.g., "Retrieval boundaries" under both "Permissions" and "Memory")

## Connection types

- **parent**: a_id is a child of b_id. Defines the hierarchy.
- **related**: bidirectional conceptual link with an optional note explaining why they're connected.

## Positioning

When creating features, position them in logical clusters:
- Top-level features spread across the canvas
- Category features clustered around their parent (~150px radius)
- Leaf features clustered around their category (~80px radius)
- Use the canvas width (~1400px) and height (~900px) as rough bounds
