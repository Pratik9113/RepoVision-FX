
// GitHub API functions
import octokit from "../octokit/octokit.js"
import { detectLanguage, getFileIcon, isTextFile } from "./functionHelper.js";
const fetchRepoInfo = async (owner, repo) => {
  try {
    const { data } = await octokit.repos.get({ owner, repo });
    return {
      name: data.name,
      description: data.description,
      language: data.language,
      defaultBranch: data.default_branch,
      stars: data.stargazers_count,
      forks: data.forks_count,
      size: data.size,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      topics: data.topics || [],
      license: data.license?.name,
      homepage: data.homepage,
      hasIssues: data.has_issues,
      hasWiki: data.has_wiki,
      hasPages: data.has_pages,
      archived: data.archived,
      disabled: data.disabled
    };
  } catch (error) {
    console.error("Error fetching repo info:", error.message);
    return null;
  }
};

const fetchRepoContents = async (owner, repo, branch, path = "") => {
  try {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path,
      ref: branch
    });
    return data;
  } catch (error) {
    console.error(`Error fetching contents for ${path}:`, error.message);
    return null;
  }
};

const downloadFile = async (owner, repo, branch, filePath) => {
  try {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path: filePath,
      ref: branch
    });

    if (data.type === "file") {
      if (data.encoding === "base64") {
        return Buffer.from(data.content, "base64").toString("utf-8");
      } else {
        return data.content;
      }
    }
    return null;
  } catch (error) {
    console.error(`Error downloading ${filePath}:`, error.message);
    return null;
  }
};

const getAllFiles = async (owner, repo, branch, basePath = "") => {
  const files = [];
  const skipDirs = ["node_modules", ".git", "dist", "build", "__pycache__", ".pytest_cache", "target", "bin", "obj", ".next", ".nuxt", ".output", "coverage", ".nyc_output", ".gemini", "vendor"];

  const traverse = async (currentPath) => {
    const contents = await fetchRepoContents(owner, repo, branch, currentPath);
    if (!contents || !Array.isArray(contents)) return;

    // Process items in parallel for this directory level
    await Promise.all(contents.map(async (item) => {
      if (item.type === "file") {
        files.push({
          path: item.path,
          name: item.name,
          size: item.size,
          language: detectLanguage(item.name),
          icon: getFileIcon(item.name),
          sha: item.sha,
          url: item.html_url,
          isText: isTextFile(item.name)
        });
      } else if (item.type === "dir") {
        if (!skipDirs.includes(item.name)) {
          await traverse(item.path);
        }
      }
    }));
  };

  await traverse(basePath);
  return files;
};


export { getAllFiles, downloadFile, fetchRepoContents, fetchRepoInfo }