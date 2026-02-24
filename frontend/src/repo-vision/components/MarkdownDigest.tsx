import React, { useState, useEffect, type FC } from "react";
import { marked } from "marked";

interface MarkdownDigestProps {
  content: string;
}

export const MarkdownDigest: FC<MarkdownDigestProps> = ({ content }) => {
  const [htmlContent, setHtmlContent] = useState<string>("");

 useEffect(() => {
  if (!content) return;

  const parseMarkdown = async () => {
    const html: string = await marked.parse(content, { gfm: true, breaks: true });
    setHtmlContent(html); // ✅ html is now string
  };

  void parseMarkdown();
}, [content]);

  return (
    <div className="rounded-lg bg-white/5 border border-white/10 overflow-hidden">
      <div className="bg-slate-800 px-4 py-2 border-b border-white/10">
        <h3 className="text-sm font-medium text-slate-300">Markdown Digest</h3>
      </div>
      <div
        className="p-4 prose prose-invert prose-sm max-w-none"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    </div>
  );
};
