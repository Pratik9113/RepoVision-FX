import fs from 'fs-extra';
import path from 'path';
import { exec } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import { simpleGit } from 'simple-git';

// Phase 1: Workspace Sandbox Manager (Local Simulation for Execution)
export class WorkspaceManager {
    constructor() {
        this.baseDir = path.join(process.cwd(), 'tmp', 'agent-workspaces');
    }

    async createWorkspace(repoUrl) {
        const workspaceId = uuidv4();
        const workspacePath = path.join(this.baseDir, workspaceId);

        // Ensure base directory exists
        await fs.ensureDir(workspacePath);

        console.log(`[Sandbox] Cloning ${repoUrl} into ${workspacePath}...`);
        try {
            const git = simpleGit();
            await git.clone(repoUrl, workspacePath);
            return { workspaceId, workspacePath };
        } catch (err) {
            console.error('[Sandbox] Failed to clone:', err);
            throw new Error(`Git Clone failed: ${err.message}`);
        }
    }

    runCommand(command, workspacePath) {
        return new Promise((resolve, reject) => {
            console.log(`[Sandbox] Execution CMD: ${command} in ${workspacePath}`);
            exec(command, { cwd: workspacePath, timeout: 60000 }, (error, stdout, stderr) => {
                if (error) {
                    console.warn(`[Sandbox] Command Error: ${stderr || error.message}`);
                    resolve({ error: true, output: stderr || error.message }); // Resolve to let agent recover from error
                } else {
                    resolve({ error: false, output: stdout });
                }
            });
        });
    }

    async cleanup(workspaceId) {
        const workspacePath = path.join(this.baseDir, workspaceId);
        try {
            if (await fs.pathExists(workspacePath)) {
                await fs.remove(workspacePath);
                console.log(`[Sandbox] Cleaned up workspace ${workspaceId}`);
            }
        } catch (err) {
            console.error(`[Sandbox] Failed to clean up ${workspaceId}:`, err);
        }
    }
}
