import path from "path";
import crypto from "crypto";
// Advanced utility functions
const parseGitHubUrl = (url) => {
  const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)(?:\/tree\/([^\/]+))?/);
  if (!match) throw new Error("Invalid GitHub URL");
  return {
    owner: match[1],
    repo: match[2].replace(/\.git$/, ""),
    branch: match[3] || "main"
  };
};


const safeId = (str) => crypto.createHash("md5").update(str).digest("hex").substring(0, 8);


const detectLanguage = (filename) => {
  const ext = path.extname(filename).toLowerCase();
  const langMap = {
    ".js": "javascript", ".ts": "typescript", ".jsx": "javascript", ".tsx": "typescript",
    ".py": "python", ".pyw": "python", ".pyx": "python",
    ".java": "java", ".kt": "kotlin",
    ".go": "go", ".rs": "rust", ".cpp": "cpp", ".c": "c", ".h": "c",
    ".php": "php", ".rb": "ruby", ".cs": "csharp", ".swift": "swift",
    ".scala": "scala", ".clj": "clojure", ".hs": "haskell",
    ".vue": "vue", ".svelte": "svelte", ".astro": "astro",
    ".html": "html", ".css": "css", ".scss": "scss", ".less": "less",
    ".json": "json", ".yaml": "yaml", ".yml": "yaml", ".toml": "toml",
    ".md": "markdown", ".txt": "text", ".xml": "xml", ".sql": "sql",
    ".sh": "bash", ".ps1": "powershell", ".bat": "batch",
    ".dockerfile": "dockerfile", ".dockerignore": "dockerignore",
    ".gitignore": "gitignore", ".env": "env", ".env.example": "env"
  };
  return langMap[ext] || "unknown";
};



const isTextFile = (filename) => {
  const ext = path.extname(filename).toLowerCase();
  return [".js", ".ts", ".jsx", ".tsx", ".py", ".java", ".go", ".rs", ".cpp", ".c", ".h", ".php", ".rb", ".cs", ".swift", ".scala", ".clj", ".hs", ".vue", ".svelte", ".astro", ".html", ".css", ".scss", ".less", ".json", ".yaml", ".yml", ".toml", ".md", ".txt", ".xml", ".sql", ".sh", ".ps1", ".bat", ".dockerfile", ".gitignore", ".env"].includes(ext);
};

const getFileIcon = (filename) => {
  const ext = path.extname(filename).toLowerCase();
  const iconMap = {
    ".js": "📄", ".ts": "📄", ".jsx": "⚛️", ".tsx": "⚛️",
    ".py": "🐍", ".java": "☕", ".go": "🐹", ".rs": "🦀",
    ".cpp": "⚙️", ".c": "⚙️", ".h": "⚙️", ".php": "🐘",
    ".rb": "💎", ".cs": "🔷", ".swift": "🍎", ".vue": "💚",
    ".svelte": "🟠", ".astro": "🌌", ".html": "🌐", ".css": "🎨",
    ".json": "📋", ".yaml": "📋", ".yml": "📋", ".md": "📝",
    ".sql": "🗄️", ".sh": "💻", ".dockerfile": "🐳", ".gitignore": "🚫"
  };
  return iconMap[ext] || "📄";
};


export {parseGitHubUrl, safeId, detectLanguage, isTextFile, getFileIcon}