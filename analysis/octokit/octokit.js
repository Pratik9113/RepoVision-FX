import { Octokit } from "@octokit/rest";
import { createTokenAuth } from "@octokit/auth-token";
import dotenv from "dotenv";
dotenv.config();
// Initialize Octokit with GitHub token if available
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN || undefined,
  userAgent: "CodeKhaao-analyzer/1.0.0"
});

export default octokit;