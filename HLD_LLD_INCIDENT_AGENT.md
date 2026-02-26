# Autonomous Incident-to-Fix Agent
## High-Level Design (HLD) & Low-Level Design (LLD)

### 1. High-Level Design (HLD)

The system bridges User Incident Tickets (e.g., Jira, Frontend UI) to Automated Code Fixes and automated PR generation.
The architecture comprises three primary tiers:

*   **Presentation Layer (Frontend - React/Vite):**
    *   **Dashboard UI:** Allows developers to paste an Incident Ticket describing a bug in plain English, define the repository URL, and initiate the autonomous debugging lifecycle.
    *   **Live Console stream:** Displays real-time thought-process logs (ReAct loop progress) of the agent.

*   **Orchestration / Logic Layer (Node.js/Express - `analysis` service):**
    *   **REST API:** Endpoint `/api/agent/incident` triggers the agent pipeline.
    *   **Incident Parser Engine:** An LLM pre-processes the plain text natural language incident to extract repository URL, stack traces, and affected components.
    *   **ReAct Loop Engine (The Brain):** Executes the "Reasoning and Acting" loop.
    *   **Tool Registry:** Provides discrete actions mapping to Node.js / OS capabilities (`readFile`, `writeFile`, `searchCode`, `runTests`).

*   **Execution Layer (Sandboxed Environment):**
    *   **Workspace Manager:** Provisions isolated cloned repositories where code is mutated.
    *   **Command Runner:** Executes testing and linting securely (abstracted to Docker or local isolated processes).

### 2. Low-Level Design (LLD) - Phase 1 & Phase 2 Modules

#### Module: `SandboxManager` (Phase 1)
*   **Responsibility:** Manages isolated ephemeral scratchpads.
*   **Functions:**
    *   `createWorkspace(repoUrl)`: Clones the repo to `tmp/agent-workspaces/{uuid}`.
    *   `runCommand(command, workspaceId)`: Uses `child_process.exec` to run bash scripts inside that specific workspace directory.
    *   `cleanup(workspaceId)`: Deletes the directory.

#### Module: `LLMClient` (Phase 1)
*   **Responsibility:** Wraps the AI Provider (Groq / OpenAI) for structured prompting.
*   **Functions:**
    *   `chatCompletion(systemPrompt, userPrompt, tools)`: Sends a request and parses function calling parameters.

#### Module: `IncidentParser` (Phase 2)
*   **Responsibility:** Takes a vague user bug description and outputs JSON parameters needed for debugging.
*   **Prompt Architecture:** Requests LLM to extract `{"error_signature": "", "suspected_files": [], "repo_url": ""}`.

#### Module: `Tools` (Phase 2)
*   **Responsibility:** Exposes file and execution utilities to the LLM.
*   **Exposed APIs:**
    *   `search_code(query)` -> Uses `fast-glob` and `fs.readFileSync` to string-match queries.
    *   `read_file(filePath)` -> Returns lines of a specific file.
    *   `write_file(filePath, content)` -> Overwrites a file.
    *   `run_tests()` -> Executes the test suite in `SandboxManager`.
