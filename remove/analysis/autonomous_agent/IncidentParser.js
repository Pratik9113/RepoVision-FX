import { LLMClient } from './LLMClient.js';
import { WorkspaceManager } from './WorkspaceManager.js';
import { AgentTools } from './Tools.js';

export class IncidentParser {
    constructor() {
        this.llm = new LLMClient();
        this.wm = new WorkspaceManager();
        this.maxIterations = 8;
    }

    /**
     * Entry hook from Express API
     */
    async processIncidentPipeline(incidentTicket) {
        let executionLogs = [];

        try {
            // STEP 1: Understand the issue (Phase 1)
            executionLogs.push("Parsing natural language ticket...");
            const contextJson = await this.llm.parseIncidentTicket(incidentTicket);
            const suspects = Array.isArray(contextJson.suspected_files) ? contextJson.suspected_files.join(', ') : 'None';
            executionLogs.push(`Context parsed successfully:\nRepo: ${contextJson.repository}\nError Focus: ${contextJson.error_type}\nSuspects: ${suspects}`);

            if (
                !contextJson.repository ||
                typeof contextJson.repository !== 'string' ||
                contextJson.repository === "<https link or path>" ||
                contextJson.repository.toLowerCase().includes("not provided") ||
                !contextJson.repository.startsWith("http")
            ) {
                contextJson.repository = "https://github.com/Pratik9113/RAG-Powered-Chatbot-for-News-Websites"; // Fallback demo target
            }

            // STEP 2: Clone repository to dynamic Workspace Sandbox
            executionLogs.push(`Provisioning Sandbox and Cloning Repo...`);
            const { workspaceId, workspacePath } = await this.wm.createWorkspace(contextJson.repository);
            executionLogs.push(`Sandbox ready -> ID [${workspaceId.split('-')[0]}]`);

            // STEP 3: Setup tools (Phase 2)
            const toolsInstance = new AgentTools(this.wm, workspacePath);

            // STEP 4: Start ReAct Autonomous Loop
            let messages = [
                {
                    role: "system",
                    content: `You are an Autonomous Software Engineer. The user has assigned you a ticket. 
You can use tools to navigate codebase, view logs, rewrite files, and run commands like 'npm test'. 
Your goal: Root Cause the bug -> Search related code -> Create/Rewrite exact fixes -> Test. 
If tests fail, iterate! Limit to ${this.maxIterations} steps.`
                },
                {
                    role: "user",
                    content: `Here is my Incident Report:\n${incidentTicket}\n\nStart investigating based on our parsed info: ${JSON.stringify(contextJson, null, 2)}`
                }
            ];

            let iteration = 0;
            let success = false;

            while (iteration < this.maxIterations) {
                iteration++;
                executionLogs.push(`[Loop ${iteration}/${this.maxIterations}] Thinking...`);

                // Get AI Reason/Action decision
                const aiMessage = await this.llm.reasonAndActTask(messages, toolsInstance);
                messages.push(aiMessage);

                // If AI uses a tool
                if (aiMessage.tool_calls && aiMessage.tool_calls.length > 0) {
                    const call = aiMessage.tool_calls[0]; // execute first toolcall
                    const args = JSON.parse(call.function.arguments);

                    executionLogs.push(`[Action] Executing ${call.function.name} -> ${JSON.stringify(args)}`);

                    const resultOut = await toolsInstance.executeToolCall(call.function.name, call.function.arguments);

                    // Feed result back
                    messages.push({
                        role: "tool",
                        content: typeof resultOut === 'string' ? resultOut : JSON.stringify(resultOut),
                        tool_call_id: call.id,
                    });

                    executionLogs.push(`[Result] returned ${resultOut.length} bytes of data.`);
                } else if (aiMessage.content) {
                    // LLM decided to reply purely with text -> Assumed resolved or stopped
                    success = true;
                    executionLogs.push(`[Resolution] AI Concluded: ${aiMessage.content}`);
                    break;
                }
            }

            if (!success) {
                executionLogs.push("Agent reached maximum loop iterations. Aborting logic.");
            }

            // STEP 5: Cleanup Workspace
            await this.wm.cleanup(workspaceId);

            return {
                status: success ? "Resolved" : "Failed",
                logs: executionLogs,
                context: contextJson
            };

        } catch (err) {
            console.error(err);
            executionLogs.push(`CRITICAL ABORT: ${err.message}`);
            return {
                status: "Error",
                logs: executionLogs,
                error: err.message
            };
        }
    }
}
