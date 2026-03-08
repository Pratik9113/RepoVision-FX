import express from "express";
import cors from "cors";
import { Octokit } from "@octokit/rest";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import bodyParser from 'body-parser';
import { spawn } from 'child_process';
import fetch from 'node-fetch';
import AdmZip from "adm-zip";
import ExplorerRouter from "./route/explorerRouter.js";
import AnalyzeRouter from "./route/analyzeRoute.js";
import FileContentRouter from "./route/fileContentRoute.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 6060;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());


// Temp directory to save repos
const TMP_DIR = path.join(process.cwd(), 'tmp');
fs.mkdirSync(TMP_DIR, { recursive: true });

const github_API = process.env.GITHUB_TOKEN;
const octokit = new Octokit({ auth: github_API });

app.post('/fetch-repo', async (req, res) => {
  const { owner, repo, branch = 'main' } = req.body ?? {};

  if (!owner || !repo) {
    return res.status(400).json({ error: "Please provide `owner` and `repo` in request body." });
  }

  try {
    // Simple directory name: just repo name
    const repoDir = path.join(TMP_DIR, repo);

    // Clean up any existing folder
    if (fs.existsSync(repoDir)) {
      fs.rmSync(repoDir, { recursive: true, force: true });
    }
    fs.mkdirSync(repoDir, { recursive: true });

    const zipUrl = `https://api.github.com/repos/${owner}/${repo}/zipball/${branch}`;
    console.log(`📦 Downloading ${zipUrl}`);

    const response = await fetch(zipUrl, {
      headers: {
        'Authorization': `token ${process.env.GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'CodeKhaao'
      }
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`GitHub ZIP download failed: ${response.status} ${text}`);
    }

    const buffer = await response.arrayBuffer();
    const zip = new AdmZip(Buffer.from(buffer));

    // Extract to temporary folder first
    const tempExtractDir = path.join(TMP_DIR, `${repo}-temp`);
    fs.mkdirSync(tempExtractDir, { recursive: true });
    zip.extractAllTo(tempExtractDir, true);

    // Find the single extracted folder (e.g., "Pratik9113-government_scheme-40bbdde")
    const extractedRoot = fs.readdirSync(tempExtractDir).find(f =>
      fs.statSync(path.join(tempExtractDir, f)).isDirectory()
    );

    if (!extractedRoot) {
      throw new Error("Unexpected ZIP structure — no top-level folder found.");
    }

    const extractedPath = path.join(tempExtractDir, extractedRoot);

    // Copy *contents* (not folder) directly into repoDir
    fs.readdirSync(extractedPath).forEach(file => {
      const src = path.join(extractedPath, file);
      const dest = path.join(repoDir, file);
      fs.cpSync(src, dest, { recursive: true });
    });

    // Cleanup temp folder
    fs.rmSync(tempExtractDir, { recursive: true, force: true });

    console.log(`✅ Repository extracted directly into ${repoDir}`);
    res.json({ repoDir, message: "Repository fetched and flattened successfully!" });

  } catch (err) {
    console.error("❌ Fetch repo failed:", err);
    res.status(500).json({ error: "Failed to fetch repo", details: err.message });
  }
});


app.post('/run', (req, res) => {
  const { cwd, command } = req.body ?? {};

  if (!cwd || !command) {
    return res.status(400).json({ error: "Please provide `cwd` and `command` in request body." });
  }

  // Basic safety check: restrict cwd to be inside TMP_DIR
  const resolvedCwd = path.resolve(cwd);
  if (!resolvedCwd.startsWith(path.resolve(TMP_DIR))) {
    return res.status(403).json({ error: "Execution not allowed outside the tmp working directory." });
  }

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');

  // spawn with shell:true to allow complex commands, but that increases injection risk.
  // When shell is true, we can pass the full command as a string
  // Use empty array for args and pass command as the executable when shell is true
  const proc = spawn(command, [], { cwd: resolvedCwd, shell: true });

  proc.stdout.on('data', (data) => {
    try { res.write(data.toString()); } catch (e) { }
  });
  proc.stderr.on('data', (data) => {
    try { res.write(data.toString()); } catch (e) { }
  });
  proc.on('close', (code) => {
    try { res.end(`\nProcess exited with code ${code}\n`); } catch (e) { }
  });

  // If the client disconnects, kill the child process
  req.on('close', () => {
    if (!proc.killed) proc.kill();
  });
});



app.use("/analyze", AnalyzeRouter);
app.use("/explore", ExplorerRouter);

// File content endpoint
app.use("/file", FileContentRouter);

// ---------------- Health check ----------------
app.get('/health', (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    features: [
      "GitHub API Integration",
      "Recursive repo fetch",
      "Multi-language Analysis",
      "Shell command execution",
      "AI & ML analysis placeholders",
    ]
  });
});

// ---------------- Root endpoint ----------------
app.get('/', (req, res) => {
  res.json({
    message: "RepoVision - Advanced GitHub Repository Analyzer",
    version: "1.0.0",
    endpoints: {
      "POST /fetch-repo": "Fetch entire GitHub repo recursively",
      "POST /run": "Run shell commands in a directory",
      "GET /health": "Check server health"
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});







// // ---------------- Fetch GitHub Repo ----------------
// app.post('/fetch-repo', async (req, res) => {
//   const { owner, repo, branch = 'main' } = req.body;
//   const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

//   try {
//     const { data: files } = await octokit.rest.repos.getContent({
//       owner, repo, path: '', ref: branch
//     });

//     const repoDir = path.join(TMP_DIR, `${repo}-${Date.now()}`);
//     fs.mkdirSync(repoDir, { recursive: true });

//     for (const file of files) {
//       if (file.type === 'file') {
//         const content = Buffer.from(file.content, 'base64').toString();
//         fs.writeFileSync(path.join(repoDir, file.name), content);
//       }
//     }

//     res.json({ repoDir });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: 'Failed to fetch repo' });
//   }
// });



// // ---------------- Run Command ----------------
// app.post('/run', (req, res) => {
//   const { cwd, command } = req.body;
//   const [cmd, ...args] = command.split(' ');

//   const proc = spawn(cmd, args, { cwd, shell: true });

//   proc.stdout.on('data', (data) => res.write(data.toString()));
//   proc.stderr.on('data', (data) => res.write(data.toString()));
//   proc.on('close', (code) => res.end(`\nProcess exited with code ${code}\n`));
// });
