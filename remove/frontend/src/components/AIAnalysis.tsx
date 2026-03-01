import type { FC } from "react";
import { marked } from "marked";
import { Badge } from "../repo-vision/components/Badge";

interface AIAnalysisProps {
  analysis: string;
  source: string;
}

export const AIAnalysis: FC<AIAnalysisProps> = ({ analysis, source }) => {
  return (
    <div className="rounded-lg bg-white/5 border border-white/10 overflow-hidden">
      <div className="bg-slate-800 px-4 py-2 border-b border-white/10 flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-300">AI-Powered Analysis</h3>
        <Badge variant="primary">{source}</Badge>
      </div>
      <div className="p-4">
        <div
          className="prose prose-invert prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: marked(analysis) }}
        />
      </div>
    </div>
  );
};
