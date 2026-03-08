import { safeId } from "./functionHelper.js";
import { marked } from "marked";
import path from "path";
import Groq from "groq-sdk";
// Advanced Mermaid diagram generation
const generateMermaidDiagram = (analysis, callGraph) => {
  // Helper to sanitize labels for mindmap
  const clean = (str) => {
    if (!str) return "Unknown";
    return str.replace(/["()[\],]/g, "").trim().substring(0, 30);
  };

  let mermaid = `mindmap\n`;
  mermaid += `  root((Repository))\n`;

  // --- Frontend Branch ---
  if (analysis.components && analysis.components.length > 0) {
    mermaid += `    Frontend\n`;
    // Limit to top 20 components to keep it readable
    const components = analysis.components.slice(0, 20);
    for (const comp of components) {
      mermaid += `      ${clean(comp.name)}\n`;
    }
    if (analysis.components.length > 20) {
      mermaid += `      ...and ${analysis.components.length - 20} more\n`;
    }
  }

  // --- Backend Branch ---
  const hasFunctions = analysis.functions && analysis.functions.length > 0;
  const hasClasses = analysis.classes && analysis.classes.length > 0;

  if (hasFunctions || hasClasses) {
    mermaid += `    Backend\n`;

    // Group by file or type could be nice, but let's stick to simple lists for now
    if (hasClasses) {
      mermaid += `      Classes\n`;
      const classes = analysis.classes.slice(0, 15);
      for (const cls of classes) {
        mermaid += `        ${clean(cls.name)}\n`;
      }
    }

    if (hasFunctions) {
      // Only show top-level functions or interesting ones (not just every utility)
      // For now, simple slice
      mermaid += `      Functions\n`;
      const functions = analysis.functions.slice(0, 15);
      for (const func of functions) {
        mermaid += `        ${clean(func.name)}\n`;
      }
    }
  }

  // --- API Branch ---
  if (analysis.endpoints && analysis.endpoints.length > 0) {
    mermaid += `    API\n`;
    // Group by method
    const methods = {};
    for (const ep of analysis.endpoints) {
      const m = ep.method || "GET";
      if (!methods[m]) methods[m] = [];
      methods[m].push(ep);
    }

    for (const [method, eps] of Object.entries(methods)) {
      mermaid += `      ${method}\n`;
      for (const ep of eps.slice(0, 8)) {
        mermaid += `        ${clean(ep.path)}\n`;
      }
    }
  }

  // --- Data Branch ---
  const hasModels = analysis.models && analysis.models.length > 0;
  const hasDBs = analysis.databases && analysis.databases.length > 0;

  if (hasModels || hasDBs) {
    mermaid += `    Data\n`;

    if (hasDBs) {
      mermaid += `      Databases\n`;
      for (const db of analysis.databases) {
        mermaid += `        ${clean(db.type)} [${clean(db.orm)}]\n`;
      }
    }

    if (hasModels) {
      mermaid += `      Models\n`;
      const models = analysis.models.slice(0, 15);
      for (const model of models) {
        mermaid += `        ${clean(model.name)}\n`;
      }
    }
  }

  return mermaid;
};


// Markdown digest generation
const generateMarkdownDigest = (files, analysis, repoInfo) => {
  let markdown = `# ${repoInfo.name} - Code Analysis Digest

## Repository Information
- **Owner**: ${repoInfo.owner}
- **Description**: ${repoInfo.description || 'No description provided'}
- **Primary Language**: ${repoInfo.language || 'Mixed'}
- **Stars**: ${repoInfo.stars}
- **Forks**: ${repoInfo.forks}
- **Size**: ${repoInfo.size} KB
- **Created**: ${new Date(repoInfo.createdAt).toLocaleDateString()}
- **Last Updated**: ${new Date(repoInfo.updatedAt).toLocaleDateString()}

## Table of Contents
1. [File Structure](#file-structure)
2. [Code Analysis](#code-analysis)
3. [API Endpoints](#api-endpoints)
4. [Data Models](#data-models)
5. [Architecture Overview](#architecture-overview)

## File Structure

### By Language
`;

  // Group files by language
  const filesByLanguage = {};
  for (const file of files) {
    if (!filesByLanguage[file.language]) {
      filesByLanguage[file.language] = [];
    }
    filesByLanguage[file.language].push(file);
  }

  for (const [language, fileList] of Object.entries(filesByLanguage)) {
    markdown += `\n#### ${language.charAt(0).toUpperCase() + language.slice(1)} Files (${fileList.length})\n`;
    for (const file of fileList) {
      markdown += `- ${file.icon} \`${file.path}\` (${file.size} bytes)\n`;
    }
  }

  markdown += `
## Code Analysis

### Functions (${(analysis.functions || []).length})
`;

  for (const func of (analysis.functions || [])) {
    markdown += `- \`${func.name}\` in \`${func.file}\` (line ${func.line})${func.async ? ' (async)' : ''}\n`;
  }

  markdown += `
### Classes (${(analysis.classes || []).length})
`;

  for (const cls of (analysis.classes || [])) {
    markdown += `- \`${cls.name}\` in \`${cls.file}\` (line ${cls.line})\n`;
  }

  markdown += `
### Components (${(analysis.components || []).length})
`;

  for (const comp of (analysis.components || [])) {
    markdown += `- \`${comp.name}\` in \`${comp.file}\`\n`;
  }

  markdown += `
## API Endpoints (${(analysis.endpoints || []).length})
`;

  for (const endpoint of (analysis.endpoints || [])) {
    markdown += `- **${endpoint.method}** \`${endpoint.path}\` (${endpoint.framework}) in \`${endpoint.file}\`\n`;
  }

  markdown += `
## Data Models (${(analysis.models || []).length})
`;

  for (const model of (analysis.models || [])) {
    markdown += `- \`${model.name}\` (${model.orm}) in \`${model.file}\`\n`;
  }

  markdown += `
## Databases (${(analysis.databases || []).length})
`;

  for (const db of (analysis.databases || [])) {
    markdown += `- **${db.type}** using ${db.orm} (found in \`${db.file}\`)\n`;
  }

  markdown += `
## Architecture Overview

This repository appears to be a ${(analysis.endpoints || []).length > 0 ? 'web application' : 'library/utility'} with the following characteristics:

- **Frontend**: ${(analysis.components || []).length > 0 ? `${(analysis.components || []).length} React/Vue components detected` : 'No frontend components detected'}
- **Backend**: ${(analysis.functions || []).length} functions and ${(analysis.classes || []).length} classes
- **API Layer**: ${(analysis.endpoints || []).length} endpoints using ${(analysis.endpoints || [])[0]?.framework || 'various'} frameworks
- **Data Layer**: ${(analysis.models || []).length} models and ${(analysis.databases || []).length} database connections
- **Architecture Pattern**: ${(analysis.controllers || []).length > 0 ? 'MVC/Controller-based' : 'Function-based'}

### Key Technologies
- **Primary Language**: ${repoInfo.language || 'Mixed'}
- **Frameworks**: ${[...new Set(analysis.endpoints.map(e => e.framework))].join(', ') || 'Not detected'}
- **Databases**: ${[...new Set(analysis.databases.map(d => d.type))].join(', ') || 'Not detected'}
- **ORMs**: ${[...new Set(analysis.models.map(m => m.orm))].join(', ') || 'Not detected'}

---
*Generated by CodeKhaao Code Analyzer*
`;

  return markdown;
};

// AI-powered analysis using Groq (fallbacks to heuristic if no key)
const generateAIAnalysis = async (analysis, repoInfo, files) => {
  const concisePrompt = `You are a senior software architect.
Summarize this repository concisely. Use tight Markdown with bullets, max ~12 lines.
Prefer high-signal insights over verbosity.

Repo: ${repoInfo.owner}/${repoInfo.name}
Main language: ${repoInfo.language || 'Mixed'}, Files: ${files.length}
Functions: ${analysis.functions.length}, Classes: ${analysis.classes.length}, Components: ${analysis.components.length}
Endpoints: ${analysis.endpoints.length}, Models: ${analysis.models.length}, DBs: ${analysis.databases.length}

Deliver:
- Architecture style
- Tech stack
- Key risks
- Top improvements (3-5)
- Scalability notes`;

  const fallback = () => {
    const aiAnalysis = `
## AI-Powered Analysis

- **Architecture**: ${analysis.controllers.length > 0 ? 'MVC/Controller-based' : 'Function-oriented'}; ${analysis.endpoints.length > 0 ? 'Web/API present' : 'Library/CLI leaning'}
- **Stack**: ${repoInfo.language || 'Mixed'}; ${[...new Set(analysis.endpoints.map(e => e.framework))].filter(Boolean).join(', ') || 'Frameworks: n/a'}; DB: ${[...new Set(analysis.databases.map(d => d.type))].join(', ') || 'n/a'}
- **Risks**: ${analysis.functions.length > 200 ? 'Large surface' : 'Small/medium size'}; ${analysis.models.length === 0 ? 'No data layer detected' : 'Data layer present'}
- **Improvements**:
  - Add tests and CI for critical paths
  - Enforce lint/types; reduce complexity hotspots
  - Harden security (authz, validation, secrets)
  - Observability (logs, metrics, traces)
- **Scale**: ${analysis.functions.length > 100 ? 'Moderate' : 'Low'} complexity; consider modularization and caching.
`;
    return { analysis: aiAnalysis.trim(), source: "Heuristic" };
  };

  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return fallback();
    const client = new Groq({ apiKey });
    const resp = await client.chat.completions.create({
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      temperature: 0.1,
      messages: [
        { role: "system", content: "You are concise and precise. No fluff." },
        { role: "user", content: concisePrompt }
      ]
    });
    const content = resp?.choices?.[0]?.message?.content?.trim();
    if (!content) return fallback();
    return { analysis: content, source: `Groq:${resp?.model || 'llama-3.3-70b-versatile'}` };
  } catch (err) {
    console.error("Groq analysis error:", err?.message || err);
    return fallback();
  }
};

// Build a Mermaid module dependency graph between files in the repo
const generateModuleDependencyDiagram = (files, allAnalysis) => {
  const exts = [".js", ".ts", ".jsx", ".tsx", ".mjs", ".cjs", ".py"];
  const normalize = (p) => (p || "").replace(/\\/g, "/");
  const fileSet = new Set(files.map((f) => normalize(f.path)));

  // Map base (without extension) -> full path
  const baseToFull = new Map();
  for (const f of files) {
    const np = normalize(f.path);
    const ext = path.posix.extname(np);
    const base = np.slice(0, ext.length ? -ext.length : undefined);
    baseToFull.set(base, np);
    // index mapping: dir/index -> dir
    if (base.endsWith("/index")) {
      baseToFull.set(base.slice(0, -"/index".length), np);
    }
  }

  const join = (...parts) => normalize(path.posix.join(...parts));
  const dirname = (p) => normalize(path.posix.dirname(p));

  const tryResolveBase = (base) => {
    // exact base match
    if (baseToFull.has(base)) return baseToFull.get(base);
    // with extension
    for (const ext of exts) {
      const cand = `${base}${ext}`;
      if (fileSet.has(cand)) return cand;
    }
    // index file
    for (const ext of exts) {
      const cand = `${base}/index${ext}`;
      if (fileSet.has(cand)) return cand;
    }
    return null;
  };

  const resolveImport = (fromPath, spec) => {
    if (!spec) return null;
    let s = String(spec).trim();
    if (!s) return null;
    // Python dotted to path-like
    const isPythonLike = s.includes(".") && !s.startsWith(".");
    if (!s.startsWith(".") && isPythonLike) {
      s = s.replace(/\./g, "/");
    }
    if (s.startsWith(".")) {
      const base = path.posix.normalize(join(dirname(fromPath), s));
      const resolved = tryResolveBase(base);
      return resolved;
    }
    // Non-relative: try to find a file ending with this path
    const cleaned = s.replace(/^@\//, "");
    // exact base match
    const exact = tryResolveBase(cleaned);
    if (exact) return exact;
    // suffix search
    for (const [base, full] of baseToFull.entries()) {
      if (base.endsWith(`/${cleaned}`) || base === cleaned) {
        return full;
      }
    }
    return null;
  };

  const edges = [];
  const usedFiles = new Set();
  for (const imp of allAnalysis.imports || []) {
    const from = normalize(imp.file);
    const to = resolveImport(from, imp.module);
    if (to && fileSet.has(from) && fileSet.has(to) && from !== to) {
      edges.push([from, to]);
      usedFiles.add(from);
      usedFiles.add(to);
    }
  }

  // Limit graph size to keep Mermaid responsive
  const MAX_EDGES = 400;
  const limitedEdges = edges.slice(0, MAX_EDGES);

  let mermaid = `graph LR\n` +
    `  classDef file fill:#0ea5e9,stroke:#0c4a6e,stroke-width:2px,color:#001219;\n`;

  const idFor = (p) => safeId(`file_${p}`);
  const labelFor = (p) => p.replace(/"/g, "'");

  // Declare nodes
  const declared = new Set();
  for (const p of usedFiles) {
    const id = idFor(p);
    if (!declared.has(id)) {
      mermaid += `  ${id}("${labelFor(p)}"):::file\n`;
      declared.add(id);
    }
  }

  for (const [a, b] of limitedEdges) {
    mermaid += `  ${idFor(a)} --> ${idFor(b)}\n`;
  }

  if (edges.length > MAX_EDGES) {
    mermaid += `  %% truncated ${edges.length - MAX_EDGES} edges for size\n`;
  }

  return mermaid;
};

// Build a Mermaid directory tree diagram of the repository
const generateDirectoryTreeDiagram = (files) => {
  const MAX_FILES = 200; // keep diagram manageable
  const normalize = (p) => (p || "").replace(/\\/g, "/");
  const rootId = safeId("dir:/");
  let mermaid = `graph TD\n` +
    `  classDef dir fill:#22c55e,stroke:#14532d,stroke-width:2px,color:#052e16;\n` +
    `  classDef file fill:#eab308,stroke:#713f12,stroke-width:2px,color:#1f1300;\n` +
    `  ${rootId}("/"):::dir\n`;

  const nodeDeclared = new Set([rootId]);
  const edgeDeclared = new Set();

  const nodeForDir = (dirPath) => safeId(`dir:${dirPath}`);
  const nodeForFile = (filePath) => safeId(`file:${filePath}`);

  const declareNode = (id, label, cls) => {
    if (nodeDeclared.has(id)) return;
    const safeLabel = String(label).replace(/"/g, "'");
    mermaid += `  ${id}("${safeLabel}"):::${cls}\n`;
    nodeDeclared.add(id);
  };

  const declareEdge = (a, b) => {
    const key = `${a}->${b}`;
    if (edgeDeclared.has(key)) return;
    mermaid += `  ${a} --> ${b}\n`;
    edgeDeclared.add(key);
  };

  for (const f of files.slice(0, MAX_FILES)) {
    const full = normalize(f.path);
    const parts = full.split("/").filter(Boolean);
    let parentId = rootId;
    let walkPath = "";
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      walkPath = walkPath ? `${walkPath}/${part}` : part;
      const isLast = i === parts.length - 1;
      if (isLast) {
        const fileId = nodeForFile(walkPath);
        declareNode(fileId, part, "file");
        declareEdge(parentId, fileId);
      } else {
        const dirId = nodeForDir(walkPath);
        declareNode(dirId, part + "/", "dir");
        declareEdge(parentId, dirId);
        parentId = dirId;
      }
    }
  }

  if (files.length > MAX_FILES) {
    mermaid += `  %% truncated ${(files.length - MAX_FILES)} files for size\n`;
  }

  return mermaid;
};

// Deep AI-powered file analysis
const analyzeFileWithAI = async (content, filePath, language) => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  try {
    const client = new Groq({ apiKey });
    const prompt = `Analyze this ${language} file: "${filePath}"
Identify:
1. Architectural role (e.g., service, controller, utility, middleware, component)
2. Complex logic or patterns (e.g., singleton, factory, observer, custom hooks)
3. Key dependencies and their purpose
4. Potential issues or technical debt
5. Summary of functionality

Return ONLY a JSON object with these keys: 
{
  "role": string,
  "patterns": string[],
  "purpose": string,
  "technicalDebt": string[],
  "insights": string[]
}

File content:
\`\`\`${language}
${content.substring(0, 10000)} // Truncated to 10k chars for token limits
\`\`\``;

    const resp = await client.chat.completions.create({
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      temperature: 0,
      messages: [
        { role: "system", content: "You are a code analysis expert. Output ONLY valid JSON." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(resp?.choices?.[0]?.message?.content || "{}");
    return result;
  } catch (error) {
    console.error(`AI Analysis error for ${filePath}:`, error.message);
    return null;
  }
};

export {
  generateAIAnalysis,
  generateMarkdownDigest,
  generateMermaidDiagram,
  generateModuleDependencyDiagram,
  generateDirectoryTreeDiagram,
  analyzeFileWithAI
};
