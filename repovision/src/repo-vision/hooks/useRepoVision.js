import { useState } from "react";

export function useRepoVision() {
    const [repoUrl, setRepoUrl] = useState("https://github.com/Pratik9113/repoFXError");
    const [isLoading, setIsLoading] = useState(false);
    const [data, setData] = useState(null);
    const [error, setError] = useState("");
    const [activeTab, setActiveTab] = useState("overview");
    const [selectedFile, setSelectedFile] = useState(null);
    const [fileContent, setFileContent] = useState(null);

    const analyze = async (url) => {
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

            const normalizedData = {
                ...j,
                repoMeta: {
                    ...j.repoMeta,
                    createdAt: String(j.repoMeta.createdAt),
                    updatedAt: String(j.repoMeta.updatedAt),
                },
            };

            setData(normalizedData);
        } catch (e) {
            setError(e.message || "Request failed");
        } finally {
            setIsLoading(false);
        }
    };

    const fetchFileContent = async (file) => {
        if (!data) return;

        try {
            const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:6060";
            const encodedPath = encodeURIComponent(file.path);
            const res = await fetch(
                `${apiUrl}/file/${data.repoMeta.owner}/${data.repoMeta.repo}?branch=${data.repoMeta.branchTried}&path=${encodedPath}`
            );
            const result = await res.json();

            if (res.ok) {
                setFileContent(result);
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
