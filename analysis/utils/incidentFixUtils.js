
import Groq from "groq-sdk";
import { execSync } from "child_process";
import fs from "fs-extra";
import path from "path";

const generateRootCauseHypothesis = async (ticket, codeContext, errorLogs) => {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("GROQ_API_KEY is missing");

    const groq = new Groq({ apiKey });
    const prompt = `
    You are an expert software engineer. Analyze the following incident ticket and code context to identify the root cause.
    
    TICKET:
    ${JSON.stringify(ticket, null, 2)}
    
    ERROR LOGS / TEST FAILURES:
    ${errorLogs}
    
    RELEVANT CODE CONTEXT:
    ${codeContext}
    
    Provide a detailed root cause hypothesis. Explain why the bug occurs and which files/lines are likely responsible.
  `;

    const response = await groq.chat.completions.create({
        model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
        messages: [
            { role: "system", content: "You are a senior debugger. Be precise and technical." },
            { role: "user", content: prompt }
        ],
        temperature: 0.1
    });

    return response.choices[0]?.message?.content || "Could not generate hypothesis";
};

const generateFixPatch = async (hypothesis, codeContext) => {
    const apiKey = process.env.GROQ_API_KEY;
    const groq = new Groq({ apiKey });

    const prompt = `
    Based on the following root cause hypothesis, generate a minimal patch to fix the issue.
    
    HYPOTHESIS:
    ${hypothesis}
    
    CODE CONTEXT:
    ${codeContext}
    
    Return ONLY the code for a unified diff (patch file) that can be applied to the repository.
    Example format:
    --- filename.js
    +++ filename.js
    @@ -10,5 +10,5 @@
    - old line
    + new line
  `;

    const response = await groq.chat.completions.create({
        model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
        messages: [
            { role: "system", content: "You are an expert software engineer. Output ONLY a unified diff." },
            { role: "user", content: prompt }
        ],
        temperature: 0
    });

    return response.choices[0]?.message?.content || "";
};

const reflectOnFailure = async (previousPatch, testResults, errorTrace) => {
    const apiKey = process.env.GROQ_API_KEY;
    const groq = new Groq({ apiKey });

    const prompt = `
    The previous patch failed to fix the issue or caused regressions.
    
    PREVIOUS PATCH:
    ${previousPatch}
    
    TEST RESULTS:
    ${testResults}
    
    ERROR TRACE:
    ${errorTrace}
    
    Reflect on why the patch failed and what should be done differently in the next iteration.
  `;

    const response = await groq.chat.completions.create({
        model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
        messages: [
            { role: "system", content: "You are a self-reflective debugging agent." },
            { role: "user", content: prompt }
        ],
        temperature: 0.2
    });

    return response.choices[0]?.message?.content || "";
};

const runTests = (repoPath) => {
    try {
        // Basic test detection
        let command = "npm test";
        if (fs.existsSync(path.join(repoPath, 'pytest.ini')) || fs.existsSync(path.join(repoPath, 'tests'))) {
            if (fs.existsSync(path.join(repoPath, 'requirements.txt'))) command = "pytest";
        }

        const output = execSync(command, { cwd: repoPath, encoding: 'utf-8', stdio: 'pipe' });
        return { success: true, logs: output };
    } catch (error) {
        return { success: false, logs: (error.stdout || "") + (error.stderr || "") };
    }
};

const applyPatch = (repoPath, patchContent) => {
    const patchPath = path.join(repoPath, 'fix.patch');
    fs.writeFileSync(patchPath, patchContent);
    try {
        execSync(`git apply fix.patch`, { cwd: repoPath });
        return true;
    } catch (error) {
        console.error("Failed to apply patch:", error.message);
        return false;
    } finally {
        if (fs.existsSync(patchPath)) fs.unlinkSync(patchPath);
    }
};

const rankFiles = (suspectFiles, dependencyGraph) => {
    const scores = (suspectFiles || []).map(file => {
        let score = 1;
        const edges = (dependencyGraph?.edges || []).filter(e =>
            (e.to && e.to.startsWith(file)) || (e.from && e.from.startsWith(file))
        );
        score += edges.length * 0.5;
        return { file, score };
    });

    return scores.sort((a, b) => b.score - a.score).map(s => s.file);
};

export {
    generateRootCauseHypothesis,
    generateFixPatch,
    reflectOnFailure,
    runTests,
    applyPatch,
    rankFiles
};

