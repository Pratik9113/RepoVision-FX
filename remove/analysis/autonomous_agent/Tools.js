import fs from 'fs-extra';
import path from 'path';
import fg from 'fast-glob';

// Phase 2 Tool Definitions
export class AgentTools {
    constructor(workspaceManager, workspacePath) {
        this.wm = workspaceManager;
        this.wp = workspacePath;
    }

    getSchemas() {
        return [
            {
                type: "function",
                function: {
                    name: "search_code",
                    description: "Search for a string pattern across the codebase.",
                    parameters: {
                        type: "object",
                        properties: {
                            query: { type: "string", description: "The keyword or method to find" },
                            filePattern: { type: "string", description: "Glob pattern (e.g., '**/*.js')" },
                        },
                        required: ["query"],
                    },
                },
            },
            {
                type: "function",
                function: {
                    name: "read_file",
                    description: "Read a specific file's content entirely by path.",
                    parameters: {
                        type: "object",
                        properties: {
                            filePath: { type: "string", description: "Relative path inside repo" },
                        },
                        required: ["filePath"],
                    },
                },
            },
            {
                type: "function",
                function: {
                    name: "write_file",
                    description: "Overwrites a specific file's content to fix logic errors.",
                    parameters: {
                        type: "object",
                        properties: {
                            filePath: { type: "string", description: "Relative path inside repo" },
                            content: { type: "string", description: "The new fully complete code context" },
                        },
                        required: ["filePath", "content"],
                    },
                },
            },
            {
                type: "function",
                function: {
                    name: "run_command",
                    description: "Execute a command in the sandboxed terminal (like npm test or eslint).",
                    parameters: {
                        type: "object",
                        properties: {
                            cmd: { type: "string", description: "The script or command string" },
                        },
                        required: ["cmd"],
                    },
                },
            }
        ];
    }

    async executeToolCall(name, argsInput) {
        const args = typeof argsInput === "string" ? JSON.parse(argsInput) : argsInput;
        console.log(`[Tool] Called ${name} with`, args);

        try {
            switch (name) {
                case "search_code": {
                    // Simple search implementation via fs reading matching files
                    const pattern = args.filePattern || '**/*.{js,ts,jsx,tsx,py,json,md}';
                    const files = await fg(pattern, { cwd: this.wp, ignore: ['**/node_modules/**', '**/venv/**', '**/.git/**'] });
                    let results = [];
                    for (let f of files) {
                        const content = await fs.readFile(path.join(this.wp, f), 'utf-8');
                        if (content.includes(args.query)) {
                            results.push(`Found in -> ${f}`);
                        }
                    }
                    return results.length ? results.join('\n') : "No matches found.";
                }
                case "read_file": {
                    const absPath = path.join(this.wp, args.filePath);
                    if (!await fs.pathExists(absPath)) return `File missing: ${args.filePath}`;
                    const content = await fs.readFile(absPath, 'utf-8');
                    // Truncate to save context limits if too large
                    return content.length > 10000 ? content.slice(0, 10000) + "\n...[TRUNCATED]" : content;
                }
                case "write_file": {
                    const absPath = path.join(this.wp, args.filePath);
                    await fs.outputFile(absPath, args.content);
                    return `File ${args.filePath} rewritten successfully.`;
                }
                case "run_command": {
                    const result = await this.wm.runCommand(args.cmd, this.wp);
                    return result.error
                        ? `Command Error:\nOutput:\n${result.output}`
                        : `Command Executed Success:\nOutput:\n${result.output.slice(0, 2000)}`; // limit length
                }
                default:
                    return `Unknown tool name ${name}`;
            }
        } catch (e) {
            return `[Tool Error] While executing ${name}: ${e.message}`;
        }
    }
}
