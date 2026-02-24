import React, { useState, useEffect, type FC } from "react";
import hljs from "highlight.js";
import { Badge } from "./Badge";

interface CodeViewerProps {
  content: string;
  language: string;
  filename: string;
}

export const CodeViewer: FC<CodeViewerProps> = ({ content, language, filename }) => {
  const [highlightedContent, setHighlightedContent] = useState<string>("");

  useEffect(() => {
    if (!content) return;

    try {
      const result = (hljs.highlight as any)(content, { language });
      setHighlightedContent(result.value);
    } catch {
      // fallback to auto-detection
      const result = hljs.highlightAuto(content);
      setHighlightedContent(result.value);
    }
  }, [content, language]);

  return (
    <div className="rounded-lg bg-slate-900 border border-white/10 overflow-hidden">
      <div className="bg-slate-800 px-4 py-2 border-b border-white/10 flex items-center justify-between">
        <span className="text-sm text-slate-300">{filename}</span>
        <Badge variant="primary">{language}</Badge>
      </div>
      <pre className="p-4 overflow-x-auto">
        <code
          className={`language-${language}`}
          dangerouslySetInnerHTML={{ __html: highlightedContent }}
        />
      </pre>
    </div>
  );
};
