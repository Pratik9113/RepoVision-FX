import { analyzeJavaScript, analyzePython } from "../utils/analyzeLanguageHelper.js";
import { buildCallGraph } from "../utils/buildGraphFunction.js";
import { detectDatabases } from "../utils/databaseFunction.js";
import { downloadFile, fetchRepoInfo, getAllFiles } from "../utils/fetchHelper.js";
import { parseGitHubUrl } from "../utils/functionHelper.js";
import {
  generateAIAnalysis,
  generateMarkdownDigest,
  generateMermaidDiagram,
  generateModuleDependencyDiagram,
  generateDirectoryTreeDiagram,
  analyzeFileWithAI
} from "../utils/generateFunction.js";
import express from "express";

const AnalyzeRouter = express.Router();

// Helper for concurrency limit
const limitConcurrency = async (tasks, limit) => {
  const results = [];
  const executing = new Set();
  for (const task of tasks) {
    const p = task().finally(() => executing.delete(p));
    results.push(p);
    executing.add(p);
    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  }
  return Promise.all(results);
};

AnalyzeRouter.post("/", async (req, res) => {
  try {
    const { repoUrl, useDeepAI = false } = req.body;

    if (!repoUrl) {
      return res.status(400).json({ error: "Repository URL is required" });
    }

    // Parse GitHub URL
    const { owner, repo, branch } = parseGitHubUrl(repoUrl);

    console.log(`🚀 Analyzing repository: ${owner}/${repo} (branch: ${branch})`);

    // Fetch repository information
    const repoInfo = await fetchRepoInfo(owner, repo);
    if (!repoInfo) {
      return res.status(404).json({ error: "Repository not found or not accessible" });
    }

    // Add owner and repo to repoInfo
    repoInfo.owner = owner;
    repoInfo.repo = repo;

    // Get all files in the repository
    const files = await getAllFiles(owner, repo, branch);
    console.log(`📁 Found ${files.length} files to analyze`);

    // Analyze each file in parallel with concurrency limit
    const allAnalysis = {
      functions: [],
      classes: [],
      imports: [],
      endpoints: [],
      models: [],
      controllers: [],
      databases: [],
      components: [],
      hooks: [],
      types: [],
      decorators: [],
      calls: [],
      deepAiInsights: []
    };

    const fileContents = [];

    // Build hierarchical file tree
    const buildFileTree = (files) => {
      const root = { name: "root", type: "dir", children: {} };
      files.forEach(file => {
        const parts = file.path.split("/");
        let current = root;
        parts.forEach((part, index) => {
          const isLast = index === parts.length - 1;
          if (isLast) {
            current.children[part] = { ...file, type: "file" };
          } else {
            if (!current.children[part]) {
              current.children[part] = { name: part, type: "dir", children: {} };
            }
            current = current.children[part];
          }
        });
      });

      const convertToNested = (node) => {
        if (node.type === "file") return node;
        return {
          name: node.name,
          type: "dir",
          children: Object.values(node.children)
            .sort((a, b) => {
              if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
              return a.name.localeCompare(b.name);
            })
            .map(convertToNested)
        };
      };

      return convertToNested(root).children;
    };

    const fileTree = buildFileTree(files);

    const analysisTasks = files.filter(f => f.isText).map(file => async () => {
      try {
        const content = await downloadFile(owner, repo, branch, file.path);
        if (content) {
          fileContents.push({ ...file, content });

          let analysis;
          try {
            if (file.language === "javascript" || file.language === "typescript") {
              analysis = analyzeJavaScript(content, file.path);
            } else if (file.language === "python") {
              analysis = analyzePython(content, file.path);
            }
          } catch (analysisError) {
            console.error(`Error analyzing ${file.path}:`, analysisError.message);
          }

          if (analysis) {
            allAnalysis.functions.push(...(analysis.functions || []));
            allAnalysis.classes.push(...(analysis.classes || []));
            allAnalysis.imports.push(...(analysis.imports || []));
            allAnalysis.endpoints.push(...(analysis.endpoints || []));
            allAnalysis.models.push(...(analysis.models || []));
            allAnalysis.controllers.push(...(analysis.controllers || []));
            allAnalysis.components.push(...(analysis.components || []));
            allAnalysis.hooks.push(...(analysis.hooks || []));
            allAnalysis.types.push(...(analysis.types || []));
            allAnalysis.decorators.push(...(analysis.decorators || []));
            allAnalysis.calls.push(...(analysis.calls || []));
          }

          // Optional Deep AI Analysis per file
          if (useDeepAI) {
            const aiInsight = await analyzeFileWithAI(content, file.path, file.language);
            if (aiInsight) {
              allAnalysis.deepAiInsights.push({
                file: file.path,
                ...aiInsight
              });
            }
          }
        }
      } catch (error) {
        console.error(`Error analyzing file ${file.path}:`, error.message);
      }
    });

    // Run analysis tasks with concurrency limit of 10
    await limitConcurrency(analysisTasks, 10);

    // Detect databases
    allAnalysis.databases = detectDatabases(fileContents, allAnalysis);

    // Build call graph
    const callGraph = buildCallGraph(allAnalysis);

    // Map calls back to functions for tree view
    allAnalysis.functions = allAnalysis.functions.map(f => {
      const nodeId = `${f.file}:${f.name}`;
      const outgoingEdges = callGraph.edges.filter(e => e.from === nodeId && e.type === "call");
      const calls = outgoingEdges.map(e => {
        const targetNode = callGraph.nodes.find(n => n.id === e.to);
        return targetNode ? targetNode.label : e.to;
      });
      return { ...f, calls: [...new Set(calls)] };
    });

    // Generate Mermaid diagrams
    const mermaidDiagram = generateMermaidDiagram(allAnalysis, callGraph);
    const moduleDependencyDiagram = generateModuleDependencyDiagram(files, allAnalysis);
    const directoryTreeDiagram = generateDirectoryTreeDiagram(files);

    // Generate markdown digest
    const markdownDigest = generateMarkdownDigest(files, allAnalysis, repoInfo);

    // Generate AI analysis
    const aiAnalysis = await generateAIAnalysis(allAnalysis, repoInfo, files);

    // Prepare comprehensive response
    const response = {
      repoMeta: {
        name: repoInfo.name,
        owner,
        repo,
        description: repoInfo.description,
        language: repoInfo.language,
        defaultBranch: repoInfo.defaultBranch,
        branchTried: branch,
        stars: repoInfo.stars,
        forks: repoInfo.forks,
        size: repoInfo.size,
        createdAt: repoInfo.createdAt,
        updatedAt: repoInfo.updatedAt,
        topics: repoInfo.topics,
        license: repoInfo.license,
        homepage: repoInfo.homepage,
        fileCount: files.length,
        fileCountsByLanguage: files.reduce((acc, file) => {
          acc[file.language] = (acc[file.language] || 0) + 1;
          return acc;
        }, {})
      },
      stats: {
        files: files.length,
        functions: (allAnalysis.functions || []).length,
        classes: (allAnalysis.classes || []).length,
        components: (allAnalysis.components || []).length,
        hooks: (allAnalysis.hooks || []).length,
        types: (allAnalysis.types || []).length,
        imports: (allAnalysis.imports || []).length,
        calls: (callGraph.edges || []).length,
        apis: (allAnalysis.endpoints || []).length,
        databases: (allAnalysis.databases || []).length,
        models: (allAnalysis.models || []).length,
        controllers: (allAnalysis.controllers || []).length,
        decorators: (allAnalysis.decorators || []).length
      },
      files: files.map(f => ({
        path: f.path,
        name: f.name,
        size: f.size,
        language: f.language,
        icon: f.icon,
        url: f.url,
        isText: f.isText
      })),
      fileTree,
      functions: allAnalysis.functions,
      classes: allAnalysis.classes,
      components: allAnalysis.components,
      hooks: allAnalysis.hooks,
      types: allAnalysis.types,
      imports: allAnalysis.imports,
      endpoints: allAnalysis.endpoints,
      models: allAnalysis.models,
      controllers: allAnalysis.controllers,
      databases: allAnalysis.databases,
      decorators: allAnalysis.decorators,
      deepAiInsights: allAnalysis.deepAiInsights,
      callGraph,
      mermaidDiagram,
      moduleDependencyDiagram,
      directoryTreeDiagram,
      markdownDigest,
      aiAnalysis: aiAnalysis.analysis,
      aiAnalysisSource: aiAnalysis.source
    };

    console.log(`✅ Analysis complete for ${owner}/${repo}`);
    res.json(response);

  } catch (error) {
    console.error("❌ Analysis error:", error);
    res.status(500).json({
      error: "Failed to analyze repository",
      details: error.message
    });
  }
});

export default AnalyzeRouter;