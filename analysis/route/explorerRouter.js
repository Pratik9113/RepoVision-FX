import express from "express"
import { fetchRepoContents } from "../utils/fetchHelper.js";
import { detectLanguage, getFileIcon } from "../utils/functionHelper.js";
const ExplorerRouter = express.Router();
// Repository explorer endpoint
ExplorerRouter.get("/:owner/:repo", async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const { branch = "main", path = "" } = req.query;
    
    const contents = await fetchRepoContents(owner, repo, branch, path);
    if (!contents) {
      return res.status(404).json({ error: "Path not found" });
    }
    
    res.json({
      owner,
      repo,
      branch,
      path,
      contents: contents.map(item => ({
        name: item.name,
        path: item.path,
        type: item.type,
        size: item.size,
        language: item.type === "file" ? detectLanguage(item.name) : null,
        icon: item.type === "file" ? getFileIcon(item.name) : "📁",
        url: item.html_url,
        sha: item.sha
      }))
    });
  } catch (error) {
    console.error("Explorer error:", error);
    res.status(500).json({ error: "Failed to explore repository" });
  }
});

export default ExplorerRouter;