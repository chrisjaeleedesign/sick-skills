# Deployment

Use this reference only when deployment or hosted configuration belongs in the requested `AGENTS.md` work. It describes stable boundaries, not permission to deploy or alter infrastructure.

## Environment Separation

Prove changes in this order:

1. local;
2. Railway development;
3. Railway production.

Railway development should mirror the production application shape while using separate environment configuration. Keep development and production databases, R2 buckets or prefixes, auth origins and callbacks, provider keys, and other secrets separate. Do not use production data or credentials for development unless the user explicitly approves the exception and its risk.

## Configuration Safety

- Validate required hosted configuration at startup and fail closed when it is absent or unsafe.
- Never print secret values or raw environment dumps.
- Keep origins, callback URLs, storage configuration, database URLs, and auth secrets environment-specific.
- Run migrations against the intended environment and seed only data that is safe there.
- Record operational facts in the repository's existing runbook or deployment documentation; do not invent a new documentation hierarchy.

## Proof Expectations

A local pass is not deployment proof. Before production, verify the Railway development URL and inspect the relevant logs. Smoke-test only the paths the application actually has, typically:

- application health and startup;
- authentication and callbacks;
- durable data reads and writes;
- object upload and retrieval;
- the core user flow affected by the change.

In `AGENTS.md`, include only stable instructions that future agents need. Keep transient URLs, individual deployment results, and incident notes in the repository's existing operational record.
