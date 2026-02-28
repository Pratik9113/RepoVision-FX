import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

// Initialize Groq API Client
// Important: Ensure GROQ_API_KEY is defined in analysis/.env
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

export class LLMClient {
    constructor(model = "llama-3.1-8b-instant") {
        this.model = model;
    }

    async parseIncidentTicket(ticketText) {
        console.log("[LLM] Parsing incident ticket...");
        try {
            const systemPrompt = `You are an expert Incident Parsing AI. Extract the exact nature of the bug, the affected files/components, the environment context, and the repository URL from a user's bug report. Return the result strictly in this JSON format mapping keys identically:
{
  "repository": "<https link or path>",
  "error_type": "<e.g., TypeError, Timeout, Logic>",
  "description": "<Concise breakdown of issue>",
  "suspected_files": ["<list of possible broken files>"]
}

Output ONLY raw valid JSON, without Markdown blocks formatting or comments.`;

            const completion = await groq.chat.completions.create({
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: `Bug Report:\n\n${ticketText}` },
                ],
                model: this.model,
                temperature: 0.1,
                response_format: { type: "json_object" },
            });

            const content = completion.choices[0]?.message?.content || "{}";
            return JSON.parse(content);
        } catch (error) {
            console.error("[LLM] Parsing failed:", error);
            throw error;
        }
    }

    async reasonAndActTask(messages, toolsObj) {
        console.log("[LLM] Running ReAct reasoning step...");

        // Define function schema mapping dynamic tools for Groq/OpenAI function API
        const toolsDefinition = toolsObj.getSchemas();

        try {
            const completion = await groq.chat.completions.create({
                messages: messages,
                model: this.model,
                temperature: 0.2, // Low temp for logic/coding accuracy
                tools: toolsDefinition,
                tool_choice: "auto",
            });

            return completion.choices[0]?.message;
        } catch (error) {
            console.error("[LLM] Reasoning failed:", error);
            throw error;
        }
    }
}
