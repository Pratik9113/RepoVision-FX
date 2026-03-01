const express = require('express');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const axios = require('axios');
const { OpenAI } = require('openai');
const { parse } = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const crypto = require('crypto');

// Configuration
const PORT = process.env.PORT || 3000;
const TEMP_DIR = path.join(__dirname, 'temp_repos');
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'your-openai-key';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || 'your-github-token';

// Initialize OpenAI
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// Create Express app
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Create temp directory if it doesn't exist
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// Helper functions
function generateUniqueId() {
  return crypto.randomBytes(8).toString('hex');
}

function cleanTempDir() {
  const files = fs.readdirSync(TEMP_DIR);
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;

  files.forEach(file => {
    const filePath = path.join(TEMP_DIR, file);
    const stat = fs.statSync(filePath);
    if (now - stat.mtimeMs > oneHour) {
      fs.rmSync(filePath, { recursive: true, force: true });
    }
  });
}

async function cloneRepository(repoUrl) {
  cleanTempDir();
  const repoId = generateUniqueId();
  const repoPath = path.join(TEMP_DIR, repoId);

  try {
    const cloneCommand = `git clone ${repoUrl} ${repoPath}`;
    execSync(cloneCommand, { stdio: 'pipe' });
    return repoPath;
  } catch (error) {
    console.error('Error cloning repository:', error);
    throw new Error('Failed to clone repository');
  }
}

function detectTechStack(repoPath) {
  const packageJsonPath = path.join(repoPath, 'package.json');
  const requirementsPath = path.join(repoPath, 'requirements.txt');
  const pomXmlPath = path.join(repoPath, 'pom.xml');
  const gemfilePath = path.join(repoPath, 'Gemfile');
  const composerJsonPath = path.join(repoPath, 'composer.json');

  let techStack = [];

  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    techStack.push('JavaScript/Node.js');
    if (packageJson.dependencies && packageJson.dependencies.react) {
      techStack.push('React');
    }
  }

  if (fs.existsSync(requirementsPath)) {
    techStack.push('Python');
  }

  if (fs.existsSync(pomXmlPath)) {
    techStack.push('Java');
  }

  if (fs.existsSync(gemfilePath)) {
    techStack.push('Ruby');
  }

  if (fs.existsSync(composerJsonPath)) {
    techStack.push('PHP');
  }

  return techStack.length > 0 ? techStack : ['Unknown'];
}

function analyzeJavaScriptCode(filePath) {
  const code = fs.readFileSync(filePath, 'utf-8');
  const ast = parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript']
  });

  const functions = [];
  const imports = [];
  const exports = [];
  const apiEndpoints = [];

  traverse(ast, {
    FunctionDeclaration(path) {
      functions.push({
        name: path.node.id?.name || 'anonymous',
        params: path.node.params.map(p => p.name),
        start: path.node.loc.start.line,
        end: path.node.loc.end.line
      });
    },
    ImportDeclaration(path) {
      imports.push({
        source: path.node.source.value,
        specifiers: path.node.specifiers.map(s => ({
          local: s.local.name,
          imported: s.imported?.name || 'default'
        }))
      });
    },
    ExportNamedDeclaration(path) {
      exports.push({
        source: path.node.source?.value,
        declaration: path.node.declaration?.type,
        specifiers: path.node.specifiers?.map(s => s.exported.name)
      });
    },
    CallExpression(path) {
      if (path.node.callee.type === 'MemberExpression' &&
          path.node.callee.object.name === 'app' &&
          ['get', 'post', 'put', 'delete', 'patch'].includes(path.node.callee.property.name)) {
        apiEndpoints.push({
          method: path.node.callee.property.name,
          path: path.node.arguments[0]?.value,
          handler: path.node.arguments[1]?.name || 'anonymous'
        });
      }
    }
  });

  return { functions, imports, exports, apiEndpoints };
}

function analyzePythonCode(filePath) {
  const code = fs.readFileSync(filePath, 'utf-8');
  const functions = [];
  const imports = [];
  const apiEndpoints = [];
  const lines = code.split('\n');

  lines.forEach((line, i) => {
    if (line.trim().startsWith('import ') || line.trim().startsWith('from ')) {
      imports.push(line.trim());
    }
    else if (line.trim().startsWith('def ')) {
      const match = line.match(/def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/);
      if (match) {
        functions.push({
          name: match[1],
          start: i + 1
        });
      }
    }
    else if (line.includes('@app.route') || line.includes('@route')) {
      const routeMatch = line.match(/@app\.route\(['"]([^'"]+)['"]/);
      if (routeMatch) {
        apiEndpoints.push({
          path: routeMatch[1],
          start: i + 1
        });
      }
    }
  });

  return { functions, imports, apiEndpoints };
}

async function analyzeRepository(repoPath) {
  const techStack = detectTechStack(repoPath);
  const analysis = {
    techStack,
    files: [],
    apiEndpoints: [],
    functions: [],
    imports: [],
    exports: []
  };

  function walkDir(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        walkDir(filePath);
      } else {
        const ext = path.extname(filePath);
        if (['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.rb', '.php'].includes(ext)) {
          try {
            let fileAnalysis = {};
            if (ext === '.js' || ext === '.jsx' || ext === '.ts' || ext === '.tsx') {
              fileAnalysis = analyzeJavaScriptCode(filePath);
            } else if (ext === '.py') {
              fileAnalysis = analyzePythonCode(filePath);
            }

            analysis.files.push({
              path: filePath.replace(repoPath, ''),
              ...fileAnalysis
            });

            if (fileAnalysis.apiEndpoints && fileAnalysis.apiEndpoints.length > 0) {
              analysis.apiEndpoints.push(...fileAnalysis.apiEndpoints.map(ep => ({
                ...ep,
                file: filePath.replace(repoPath, '')
              })));
            }

            analysis.functions.push(...(fileAnalysis.functions || []).map(fn => ({
              ...fn,
              file: filePath.replace(repoPath, '')
            })));

            analysis.imports.push(...(fileAnalysis.imports || []).map(imp => ({
              ...imp,
              file: filePath.replace(repoPath, '')
            })));

            analysis.exports.push(...(fileAnalysis.exports || []).map(exp => ({
              ...exp,
              file: filePath.replace(repoPath, '')
            })));
          } catch (error) {
            console.error(`Error analyzing ${filePath}:`, error);
          }
        }
      }
    });
  }

  walkDir(repoPath);
  return analysis;
}

async function generateMermaidDiagram(analysis) {
  let mermaidCode = 'graph TD\n';
  
  analysis.files.forEach(file => {
    if (file.functions && file.functions.length > 0) {
      const shortPath = file.path.split('/').slice(-2).join('/');
      mermaidCode += `  subgraph ${shortPath}\n`;
      file.functions.forEach(fn => {
        mermaidCode += `    ${fn.name}[${fn.name}]\n`;
      });
      mermaidCode += '  end\n';
    }
  });

  if (analysis.apiEndpoints.length > 0) {
    mermaidCode += '  subgraph API\n';
    analysis.apiEndpoints.forEach(ep => {
      mermaidCode += `    ${ep.method.toUpperCase()}_${ep.path.replace(/\//g, '_')}[${ep.method.toUpperCase()} ${ep.path}]\n`;
    });
    mermaidCode += '  end\n';
  }

  if (analysis.functions.length > 0 && analysis.apiEndpoints.length > 0) {
    mermaidCode += `  ${analysis.functions[0].name} --> ${analysis.apiEndpoints[0].method.toUpperCase()}_${analysis.apiEndpoints[0].path.replace(/\//g, '_')}\n`;
  }

  return mermaidCode;
}

async function generateAiExplanation(analysis) {
  try {
    const prompt = `Explain the architecture of this code repository based on the following analysis:
    
Tech Stack: ${analysis.techStack.join(', ')}
Files: ${analysis.files.length}
API Endpoints: ${analysis.apiEndpoints.length}
Functions: ${analysis.functions.length}

Please provide a clear explanation of the likely architecture, main components, and how they might interact. Focus on the high-level structure and key patterns.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a senior software architect analyzing code repositories.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error generating AI explanation:', error);
    return 'Could not generate AI explanation. Please try again later.';
  }
}

// API Routes
app.post('/api/analyze', async (req, res) => {
  try {
    const { repoUrl } = req.body;
    
    if (!repoUrl) {
      return res.status(400).json({ error: 'Repository URL is required' });
    }

    const repoPath = await cloneRepository(repoUrl);
    const analysis = await analyzeRepository(repoPath);
    const diagram = await generateMermaidDiagram(analysis);
    const explanation = await generateAiExplanation(analysis);

    res.json({
      success: true,
      analysis,
      diagram,
      explanation
    });
  } catch (error) {
    console.error('Error analyzing repository:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to analyze repository'
    });
  }
});

module.exports = app;