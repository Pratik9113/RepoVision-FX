import { useState } from "react";
import type { RepoData, File, FileContent } from "../types";

export function useRepoVision() {
    const [repoUrl, setRepoUrl] = useState<string>("https://github.com/Pratik9113/RAG-Powered-Chatbot-for-News-Websites");
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [data, setData] = useState<RepoData | null>(null);
    const [error, setError] = useState<string>("");
    const [activeTab, setActiveTab] = useState<string>("overview");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [fileContent, setFileContent] = useState<FileContent | null>(null);

    const analyze = async (url: string) => {
        if (!url) {
            setError("Please enter a GitHub repository URL");
            return;
        }

        setIsLoading(true);
        setError("");
        setData(null);
        setSelectedFile(null);
        setFileContent(null);

        try {
            const analysisUrl = import.meta.env.VITE_API_URL || "http://localhost:6060";
            const res = await fetch(`${analysisUrl}/analyze`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ repoUrl: url }),
            });
            const j = await res.json();

            if (!res.ok || j.error) {
                throw new Error(j.error || "Failed to analyze repository");
            }

            const normalizedData: RepoData = {
                ...j,
                repoMeta: {
                    ...j.repoMeta,
                    createdAt: String(j.repoMeta.createdAt),
                    updatedAt: String(j.repoMeta.updatedAt),
                },
            };

            setData(normalizedData);
        } catch (e: any) {
            setError(e.message || "Request failed");
        } finally {
            setIsLoading(false);
        }
    };

    const fetchFileContent = async (file: File) => {
        if (!data) return;

        try {
            const apiUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_URL || "http://localhost:6060";
            const encodedPath = encodeURIComponent(file.path);
            const res = await fetch(
                `${apiUrl}/file/${data.repoMeta.owner}/${data.repoMeta.repo}?branch=${data.repoMeta.branchTried}&path=${encodedPath}`
            );
            const result = await res.json();

            if (res.ok) {
                setFileContent(result as FileContent);
                setSelectedFile(file);
            } else {
                console.error("Failed to fetch file content:", result.error);
            }
        } catch (error) {
            console.error("Error fetching file content:", error);
        }
    };

    const tryDemo = () => {
        const demoUrl = "https://github.com/expressjs/express";
        setRepoUrl(demoUrl);
        setTimeout(() => analyze(demoUrl), 100);
    };

    return {
        repoUrl,
        setRepoUrl,
        isLoading,
        data,
        error,
        activeTab,
        setActiveTab,
        selectedFile,
        fileContent,
        analyze,
        fetchFileContent,
        tryDemo,
    };
}
