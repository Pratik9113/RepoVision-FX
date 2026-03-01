
import express from "express";
import {
    generateRootCauseHypothesis,
    generateFixPatch,
    reflectOnFailure,
    runTests,
    applyPatch,
    rankFiles
} from "../utils/incidentFixUtils.js";
import { analyzeJavaScript, analyzePython } from "../utils/analyzeLanguageHelper.js";
import { buildCallGraph } from "../utils/buildGraphFunction.js";
import fs from "fs-extra";
import path from "path";
import { parseGitHubUrl } from "../utils/functionHelper.js";
import simpleGit from "simple-git";
import { Octokit } from "@octokit/rest";


const router = express.Router();

router.post("/fix-incident", async (req, res) => {
    const { ticket, repoUrl, commitId } = req.body;
    const maxIterations = 5;
    let iteration = 0;
    let bestPatch = null;
    let bestScore = 0;
    let bestHypothesis = null;


    const tmpDir = path.join(process.cwd(), 'tmp', `fix-${Date.now()}`);

    try {
        fs.mkdirSync(tmpDir, { recursive: true });

        // 1. Initialization
        const git = simpleGit();
        await git.clone(repoUrl, tmpDir);
        if (commitId) {
            await git.cwd(tmpDir).checkout(commitId);
        }

        // 2. Root Cause Analysis Phase
        // Simple code search for keywords in the ticket
        const keywords = ticket.title.split(' ').concat(ticket.description.split(' ')).filter(w => w.length > 4);

        // Perform initial analysis of the repo to build dependency graph
        const allAnalysis = { functions: [], classes: [], imports: [], calls: [], endpoints: [], models: [], controllers: [] };
        const files = [];

        const walk = (dir) => {
            fs.readdirSync(dir).forEach(f => {
                const fullPath = path.join(dir, f);
                if (fs.statSync(fullPath).isDirectory() && !f.includes('node_modules') && !f.startsWith('.')) {
                    walk(fullPath);
                } else if (f.endsWith('.js') || f.endsWith('.py')) {
                    const content = fs.readFileSync(fullPath, 'utf8');
                    const relPath = path.relative(tmpDir, fullPath);
                    const analysis = f.endsWith('.js') ? analyzeJavaScript(content, relPath) : analyzePython(content, relPath);

                    Object.keys(allAnalysis).forEach(key => {
                        if (analysis[key]) allAnalysis[key].push(...analysis[key]);
                    });
                    files.push({ path: relPath, content });
                }
            });
        };
        walk(tmpDir);

        const dependencyGraph = buildCallGraph(allAnalysis);

        // Find suspect files based on keywords
        const suspectFiles = files.filter(f => keywords.some(k => f.content.includes(k))).map(f => f.path);
        const rankedFiles = rankFiles(suspectFiles, dependencyGraph);

        let context = ""; // Accumulating reflection/history

        // 3. Iterative Fix Loop
        while (iteration < maxIterations) {
            iteration++;
            console.log(`Starting iteration ${iteration}...`);

            const fileContext = files.filter(f => rankedFiles.slice(0, 5).includes(f.path))
                .map(f => `FILE: ${f.path}\nCONTENT:\n${f.content}`)
                .join("\n\n");

            const testResult = runTests(tmpDir);

            const hypothesis = await generateRootCauseHypothesis(ticket, fileContext + "\n" + context, testResult.logs);

            const patch = await generateFixPatch(hypothesis, fileContext);

            if (patch) {
                const applied = applyPatch(tmpDir, patch);
                if (applied) {
                    const newTestResult = runTests(tmpDir);
                    if (newTestResult.success) {
                        console.log("Tests passed!");
                        bestPatch = patch;
                        bestHypothesis = hypothesis;
                        break;
                    } else {
                        const reflection = await reflectOnFailure(patch, newTestResult.logs, "");
                        context += `\nIteration ${iteration} reflection: ${reflection}`;
                    }
                }
            }
        }

        // 4. Finalization
        if (bestPatch) {
            let prUrl = null;
            try {
                const githubToken = process.env.GITHUB_TOKEN;
                if (githubToken && repoUrl.includes('github.com')) {
                    const octokit = new Octokit({ auth: githubToken });
                    const { owner, repo } = parseGitHubUrl(repoUrl);

                    const branchName = `fix/incident-${Date.now()}`;
                    await git.cwd(tmpDir).checkoutLocalBranch(branchName);
                    await git.cwd(tmpDir).add('.');
                    await git.cwd(tmpDir).commit('Fix: automated incident fix');
                    await git.cwd(tmpDir).push('origin', branchName);

                    const pr = await octokit.rest.pulls.create({
                        owner,
                        repo,
                        title: `Automated Fix: ${ticket.title}`,
                        body: `This is an automated fix generated for the following incident:\n\n### Title\n${ticket.title}\n\n### Description\n${ticket.description}\n\n### Root Cause Hypothesis\n${bestHypothesis}`,
                        head: branchName,
                        base: 'main'
                    });
                    prUrl = pr.data.html_url;
                }
            } catch (prError) {
                console.error("Failed to create PR:", prError.message);
            }

            res.json({
                success: true,
                patch: bestPatch,
                prUrl,
                message: "Incident fixed successfully!"
            });
        } else {
            res.json({ success: false, message: "Could not fix the incident within max iterations." });
        }
    }

    catch (error) {
        console.error("Error in fix-incident:", error);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        // Cleanup if needed
        // fs.rmSync(tmpDir, { recursive: true, force: true });
    }
});

export default router;
