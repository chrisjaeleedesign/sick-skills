# Devil's Advocate Challenge: Microservices Architecture for a 3-Person Team's MVP

**Persona:** Devil's Advocate
**Prompt:** "We decided to go with a microservices architecture for our 3-person team's MVP. Challenge this."
**Tool used:** Claude Code (no special skill, default reasoning)

---

## The Challenge

You have 3 engineers and you chose to build an MVP using microservices. I'm going to push back hard on this, because nearly every force in play here argues against that decision.

---

### 1. You are optimizing for a problem you don't have yet

Microservices exist to solve *organizational scaling* problems -- independent teams shipping independently. You have three people. You don't have team coordination overhead. You don't have conflicting deploy schedules. You don't have 15 services that each need an owner. You have three humans who can talk to each other across a desk (or a Slack channel). A monolith lets all three of you work in one codebase, run one test suite, and deploy one artifact. Microservices solve the problem of *too many people touching the same thing*. You have the opposite problem: *too few people spread across too many things*.

### 2. The operational tax will consume your bandwidth

Each microservice needs:
- Its own deployment pipeline
- Its own monitoring and alerting
- Its own logging configuration
- Health checks, readiness probes, restart policies
- Network configuration (service discovery, load balancing, API gateways)
- Independent database(s) or a shared database with careful boundary management

With 3 engineers, who is on-call for all of these? Who debugs a distributed trace at 2 AM when a request fails somewhere between service A, service B, and the message queue? You're building an MVP -- your job is to validate a product hypothesis as fast as possible, not to operate a distributed system. Every hour spent on infrastructure plumbing is an hour not spent learning whether customers actually want what you're building.

### 3. Distributed systems are genuinely harder to reason about

A function call in a monolith is a function call. It's fast, typed, and if it fails you get a stack trace. A call between microservices is an HTTP request (or gRPC call, or message on a queue). It can timeout. It can fail silently. It can succeed on the remote end but the response can be lost. You now need to think about:
- Retries and idempotency
- Circuit breakers
- Eventual consistency
- Distributed transactions (or sagas)
- API versioning between services
- Contract testing

For an MVP. Where you're still figuring out what the product *is*. This is overhead that buys you nothing at this stage.

### 4. Your domain boundaries are almost certainly wrong

The entire point of service boundaries in microservices is to encapsulate well-understood domains. But you're building an MVP. By definition, you don't understand your domain well yet. You're going to discover in week 3 that Feature A and Feature B, which you put in separate services, actually share a core concept and need to pass data back and forth constantly. In a monolith, you refactor. In microservices, you're now building synchronous cross-service calls or event pipelines to paper over a boundary you drew too early. Martin Fowler's first law of microservices: "Don't start with microservices." Even he -- someone who helped popularize the concept -- says to begin with a monolith and extract services later when you have real evidence for where the boundaries should be.

### 5. Development velocity will crater

In a monolith, to build a feature you open one repo, write code, run tests, and ship. In microservices:
- You spin up 3-5 services locally (or use docker-compose, or connect to a shared dev environment)
- You make a change in service A, realize you need a new field from service B
- You update service B's API, redeploy it, update service A's client, test the integration
- Something breaks in the contract between them, and now you're debugging network calls instead of business logic

Your iteration speed -- the single most important thing for an MVP -- just dropped by 2-5x. You're not Netflix. You're not Amazon. Those companies adopted microservices because they had hundreds of teams and thousands of engineers. You have three.

### 6. The "we'll need to rewrite later" argument is a fallacy

People say: "If we build a monolith, we'll just have to rewrite it as microservices later." Two problems with this:
- **Most startups never reach the scale where microservices become necessary.** Most MVPs fail. You're pre-optimizing for a future that statistically won't arrive.
- **Extracting a service from a well-structured monolith is vastly easier than you think.** If you build a clean monolith with good module boundaries, pulling a module into its own service later is a well-understood, incremental process. Going the other direction -- collapsing poorly-drawn microservice boundaries -- is far more painful.

### 7. What you should do instead

Build a modular monolith. One deployable. One database. One repo. Clean internal module boundaries. Good separation of concerns *within* the codebase. You get 80% of the organizational benefit of microservices (clear ownership boundaries, separation of concerns) with almost none of the operational cost.

When -- *if* -- you reach the point where you have 20 engineers and a specific module that needs to scale independently or deploy on a different cadence, *then* extract that module into a service. You'll have real data about where the boundaries should be, real traffic patterns to inform your scaling decisions, and enough people to actually operate a distributed system.

---

## Summary

| Factor | Microservices | Monolith |
|--------|--------------|----------|
| Operational overhead | High (multiplied per service) | Low (one thing to run) |
| Development velocity | Slower (cross-service coordination) | Faster (everything local) |
| Debugging | Distributed tracing, partial failures | Stack traces, local debugging |
| Domain boundary accuracy | Locked in early, expensive to change | Refactorable modules |
| Team size fit | Large orgs (50+ engineers) | Small teams (3-15 engineers) |
| Time to MVP | Weeks longer | Days to weeks faster |

The decision to use microservices for a 3-person MVP team is a classic case of resume-driven development or premature architecture. It optimizes for scale you don't have, at the cost of speed you desperately need. Build the monolith. Prove the product. Extract services when the evidence demands it.

---

*Generated by Claude Code (Opus 4.6) acting as a devil's advocate, without any specialized skill.*
