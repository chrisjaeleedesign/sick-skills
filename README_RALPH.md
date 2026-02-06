# Ralph Loop Template Guide 🌀

This template provides a standardized, agent-driven development loop ("Ralph Loop") for new projects.

## Structure

- **`loop.sh`**: The main driver script. It runs the agent in a loop until all tasks in `IMPLEMENTATION_PLAN.md` are complete.
- **`ralph_prompts/`**: Contains the system prompts used by the loop.
    - `LOOP.md`: The core instruction set for each iteration (Read specs -> Implement -> Update Plan).
    - `COMMIT.md`: Instructions for committing changes after each successful iteration.
    - `CLEANUP.md`: Instructions for archiving completed tasks when the plan is finished.
- **`IMPLEMENTATION_PLAN.md`**: The source of truth for work. Starts with Phase 0 (Setup).
- **`COMPLETED.md`**: Archive for finished tasks phases.
- **`SPECS/`**: Directory for project requirements.
- **`AGENTS.md`**: Conventions and rules for the agent to follow.

## Setup Instructions (For Agents)

1.  **Seed the Project**:
    Copy the contents of this template to the root of your new project.

2.  **Define Requirements**:
    - Edit `SPECS/project_spec.md` with the project's specific goals, features, and stack.
    - Create additional spec files in `SPECS/` if needed.

3.  **Adjust Conventions**:
    - Update `AGENTS.md` if the technology stack requires different commands (e.g., `npm` vs `bun`, python commands, etc.).

4.  **Initialize Plan**:
    - Update Phase 0 in `IMPLEMENTATION_PLAN.md` with the specific setup steps required for this project (e.g., `npx create-next-app`, `pip install django`).

5.  **Run the Loop**:
    - Execute `./loop.sh` in the terminal.
    - The agent will start performing tasks one by one, committing progress, and eventually cleaning up after itself.

## Workflow

1.  **Plan**: Add new features/phases to `IMPLEMENTATION_PLAN.md` (manually or via a planning workflow).
2.  **Execute**: Run `./loop.sh`.
3.  **Verify**: The agent handles verification steps defined in `PROMPT.md` (Quality Gates).
4.  **Repeat**.

## Agent Bootstrap Protocol 🤖

If you are an agent asked to "use this template" to start a new project:

1.  **Analyze Request**: Understand the user's desired application/feature.
2.  **Scaffold**:
    - Copy `ralph-loop-template/*` to the target directory.
    - Copy `ralph-loop-template/.agent` to the target directory.
3.  **Define**:
    - Write a detailed `SPECS/project.md` based on the user's request.
    - Update `IMPLEMENTATION_PLAN.md` Phase 0 to include the actual initialization commands (e.g., `bun create vite ...`).
4.  **Handover**:
    - Inform the user the setup is ready and they (or you) can run `./loop.sh` to begin implementation.
