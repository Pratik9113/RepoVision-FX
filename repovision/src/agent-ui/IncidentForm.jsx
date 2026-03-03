import { useState } from 'react';
import { Send, AlertCircle, CheckCircle2, Loader2, Copy, FileCode, ChevronDown, ChevronUp } from 'lucide-react';

function EditedFileCard({ edit }) {
    const [showOriginal, setShowOriginal] = useState(false);
    const [showEdited, setShowEdited] = useState(true);
    const [copied, setCopied] = useState(false);

    const copyEdited = () => {
        navigator.clipboard.writeText(edit.edited_content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const originalLines = (edit.original_content || '').split('\n');
    const editedLines = (edit.edited_content || '').split('\n');
    const affected = edit.affected_lines || [];

    return (
        <div className="bg-slate-800/60 rounded-xl border border-slate-600/50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-slate-800/80 border-b border-slate-600/50">
                <div className="flex items-center gap-2 min-w-0">
                    <FileCode className="text-amber-400 shrink-0" size={18} />
                    <code className="text-sm text-cyan-300 font-mono truncate">{edit.file}</code>
                </div>
                <button
                    onClick={copyEdited}
                    className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 text-xs font-medium"
                >
                    <Copy size={14} />
                    {copied ? 'Copied!' : 'Copy edited'}
                </button>
            </div>
            {edit.change_summary && (
                <div className="px-4 py-2 text-xs text-slate-400 border-b border-slate-700/50">
                    {edit.change_summary}
                </div>
            )}
            {affected.length > 0 && (
                <div className="px-4 py-2 flex flex-wrap gap-1.5 border-b border-slate-700/50">
                    <span className="text-xs text-slate-500">Affected lines:</span>
                    {affected.slice(0, 15).map((lineNum) => (
                        <span key={lineNum} className="bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded font-mono text-xs">
                            L{lineNum}
                        </span>
                    ))}
                    {affected.length > 15 && <span className="text-xs text-slate-500">+{affected.length - 15} more</span>}
                </div>
            )}
            <div className="p-2">
                <button
                    type="button"
                    onClick={() => setShowOriginal(!showOriginal)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-slate-700/50 hover:bg-slate-700/70 text-slate-300 text-sm"
                >
                    <span>Original content</span>
                    {showOriginal ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {showOriginal && (
                    <pre className="mt-2 p-3 rounded-lg bg-black/50 border border-slate-700 text-xs text-slate-300 font-mono overflow-x-auto max-h-64 overflow-y-auto">
                        {originalLines.map((line, i) => (
                            <div key={i} className={affected.includes(i + 1) ? 'bg-red-500/10' : ''}>
                                <span className="text-slate-500 select-none w-8 inline-block">{i + 1}</span> {line || ' '}
                            </div>
                        ))}
                    </pre>
                )}
                <button
                    type="button"
                    onClick={() => setShowEdited(!showEdited)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-slate-700/50 hover:bg-slate-700/70 text-slate-300 text-sm mt-2"
                >
                    <span>Edited content</span>
                    {showEdited ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {showEdited && (
                    <pre className="mt-2 p-3 rounded-lg bg-black/50 border border-green-700/50 text-xs text-slate-300 font-mono overflow-x-auto max-h-64 overflow-y-auto">
                        {editedLines.map((line, i) => (
                            <div key={i} className={affected.includes(i + 1) ? 'bg-green-500/10' : ''}>
                                <span className="text-slate-500 select-none w-8 inline-block">{i + 1}</span> {line || ' '}
                            </div>
                        ))}
                    </pre>
                )}
            </div>
        </div>
    );
}

export default function IncidentForm() {
    const [repoUrl, setRepoUrl] = useState('https://github.com/Pratik9113/repoFXError.git');
    const [description, setDescription] = useState(`
        ReferenceError: embedTexts is not defined
        at embedText (file:///D:/internship/irs_project/backend/src/services/embeddings.js:28:17)
        at retrieveContexts (file:///D:/internship/irs_project/backend/src/services/retrieval.js:10:18)
        at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
        at async file:///D:/internship/irs_project/backend/src/routes/chat.js:56
    `);
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setResult(null);

        try {
            const response = await fetch('http://localhost:8000/incident', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    repo_url: repoUrl,
                    description,
                }),
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.statusText}`);
            }

            const data = await response.json();
            setResult(data);
        } catch (err) {
            const msg = err.message === 'Failed to fetch'
                ? 'Cannot reach the backend. Is the Incident Fix Agent running on http://localhost:8000? Start it with: cd backend/incident-fix-agent/app && uvicorn main:app --reload'
                : err.message;
            setError(msg);
        } finally {
            setIsLoading(false);
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
    };

    return (
        <div className="w-full space-y-6">
            {/* Form Section */}
            <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
                <h2 className="text-2xl font-bold text-white mb-6">🔍 Incident Analyzer</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Repo URL Field */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Repository URL
                        </label>
                        <input
                            type="text"
                            value={repoUrl}
                            onChange={(e) => setRepoUrl(e.target.value)}
                            placeholder="https://github.com/owner/repo"
                            disabled={isLoading}
                            className="w-full px-4 py-3 bg-black/40 border border-slate-700/50 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 disabled:opacity-50"
                        />
                        <p className="text-xs text-slate-400 mt-1">Enter GitHub repository URL</p>
                    </div>

                    {/* Description Field */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Incident Description
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Describe the issue, error messages, or unexpected behavior..."
                            disabled={isLoading}
                            rows="4"
                            className="w-full px-4 py-3 bg-black/40 border border-slate-700/50 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none disabled:opacity-50"
                        />
                        <p className="text-xs text-slate-400 mt-1">Be specific about what's failing</p>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isLoading || !repoUrl || !description}
                        className="w-full flex justify-center items-center gap-2 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 disabled:opacity-50 transition-opacity"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="animate-spin" size={18} />
                                Analyzing...
                            </>
                        ) : (
                            <>
                                <Send size={18} />
                                Analyze Incident
                            </>
                        )}
                    </button>
                </form>
            </div>

            {/* Error Alert */}
            {error && (
                <div className="bg-red-950/40 border border-red-500/50 rounded-xl p-4 flex gap-3 items-start">
                    <AlertCircle className="text-red-400 shrink-0" size={20} />
                    <div>
                        <h3 className="font-bold text-red-300">Error</h3>
                        <p className="text-red-200 text-sm">{error}</p>
                    </div>
                </div>
            )}

            {/* Results Section */}
            {result && (
                <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
                    {result.status === 'success' ? (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-green-400 mb-6">
                                <CheckCircle2 size={24} />
                                <h3 className="text-xl font-bold">Analysis Complete ✅</h3>
                            </div>

                            {/* Error Types */}
                            {result.signals?.error_types && result.signals.error_types.length > 0 && (
                                <div className="bg-black/40 rounded-lg p-4 border border-red-500/30">
                                    <p className="text-xs text-red-400 uppercase tracking-wide mb-2">🚨 Detected Error Types</p>
                                    <div className="flex flex-wrap gap-2">
                                        {result.signals.error_types.map((error, idx) => (
                                            <span key={idx} className="bg-red-500/20 text-red-300 px-3 py-1 rounded-full text-sm font-mono">
                                                {error}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Functions Found */}
                            {result.signals?.functions && result.signals.functions.length > 0 && (
                                <div className="bg-black/40 rounded-lg p-4 border border-blue-500/30">
                                    <p className="text-xs text-blue-400 uppercase tracking-wide mb-2">🔧 Functions Mentioned</p>
                                    <div className="flex flex-wrap gap-2">
                                        {result.signals.functions.map((func, idx) => (
                                            <span key={idx} className="bg-blue-500/20 text-blue-300 px-3 py-1 rounded font-mono text-xs">
                                                {func}()
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Line Numbers */}
                            {result.signals?.line_numbers && result.signals.line_numbers.length > 0 && (
                                <div className="bg-black/40 rounded-lg p-4 border border-yellow-500/30">
                                    <p className="text-xs text-yellow-400 uppercase tracking-wide mb-2">📍 Line Numbers</p>
                                    <div className="flex flex-wrap gap-2">
                                        {result.signals.line_numbers.map((line, idx) => (
                                            <span key={idx} className="bg-yellow-500/20 text-yellow-300 px-3 py-1 rounded font-mono text-xs">
                                                L{line}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Extracted Keywords */}
                            <div className="bg-black/40 rounded-lg p-4 border border-slate-700/30">
                                <p className="text-xs text-slate-400 uppercase tracking-wide mb-3">🔑 Keywords Extracted</p>
                                <div className="flex flex-wrap gap-2">
                                    {result.signals?.keywords?.slice(0, 12).map((keyword, idx) => (
                                        <span key={idx} className="bg-purple-500/30 text-purple-300 px-3 py-1 rounded-full text-sm">
                                            {keyword}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Candidate Files with Details */}
                            {result.candidate_files && result.candidate_files.length > 0 && (
                                <div className="bg-black/40 rounded-lg p-4 border border-slate-700/30">
                                    <p className="text-xs text-slate-400 uppercase tracking-wide mb-3">📄 Files with Matching Content</p>
                                    <div className="space-y-3 max-h-96 overflow-y-auto">
                                        {result.candidate_files.slice(0, 10).map((fileInfo, idx) => (
                                            <div key={idx} className="bg-slate-800/50 rounded border border-slate-700 p-3">
                                                <div className="flex items-start justify-between mb-2">
                                                    <code className="text-sm text-cyan-400 font-mono">{fileInfo.file}</code>
                                                    <span className="text-xs text-slate-400 bg-slate-700 px-2 py-1 rounded">
                                                        {fileInfo.matches?.length || 0} matches
                                                    </span>
                                                </div>
                                                {fileInfo.matches && fileInfo.matches.slice(0, 3).map((match, mIdx) => (
                                                    <div key={mIdx} className="text-xs text-slate-300 ml-2 py-1 border-l-2 border-cyan-500 pl-2">
                                                        <div className="text-cyan-400 font-mono">Line {match.line}:</div>
                                                        <div className="text-slate-400 italic truncate">{match.content}</div>
                                                        <div className="text-slate-500 text-xs">Signal: <span className="text-purple-400">{match.signal}</span></div>
                                                    </div>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Function Matches */}
                            {result.function_matches && result.function_matches.length > 0 && (
                                <div className="bg-black/40 rounded-lg p-4 border border-green-500/30">
                                    <p className="text-xs text-green-400 uppercase tracking-wide mb-3">🎯 Function Definitions Found</p>
                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                        {result.function_matches.slice(0, 5).map((match, idx) => (
                                            <div key={idx} className="text-xs text-slate-300 bg-slate-800/50 p-2 rounded">
                                                <div className="text-green-400 font-mono">{match.file}:{match.line}</div>
                                                <div className="text-slate-400 ml-2 font-mono text-xs truncate">{match.content}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Edited Files (suggested fixes) */}
                            {result.edited_files && result.edited_files.length > 0 && (
                                <div className="bg-black/40 rounded-lg p-4 border border-amber-500/40">
                                    <p className="text-xs text-amber-400 uppercase tracking-wide mb-3">📝 Suggested Edits ({result.edited_files.length} files)</p>
                                    <div className="space-y-4">
                                        {result.edited_files.map((edit, idx) => (
                                            <EditedFileCard key={idx} edit={edit} />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Stats Grid */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-black/40 rounded-lg p-4 border border-slate-700/30 text-center">
                                    <p className="text-xs text-slate-400 uppercase tracking-wide">Total Files</p>
                                    <p className="text-2xl font-bold text-blue-400 mt-1">{result.total_files}</p>
                                </div>
                                <div className="bg-black/40 rounded-lg p-4 border border-slate-700/30 text-center">
                                    <p className="text-xs text-slate-400 uppercase tracking-wide">Matched Files</p>
                                    <p className="text-2xl font-bold text-pink-400 mt-1">{result.total_matches}</p>
                                </div>
                                <div className="bg-black/40 rounded-lg p-4 border border-slate-700/30 text-center">
                                    <p className="text-xs text-slate-400 uppercase tracking-wide">Total Matches</p>
                                    <p className="text-2xl font-bold text-green-400 mt-1">
                                        {result.candidate_files?.reduce((sum, f) => sum + (f.matches?.length || 0), 0) || 0}
                                    </p>
                                </div>
                            </div>

                            {/* Repo Status */}
                            <div className="bg-black/40 rounded-lg p-4 border border-slate-700/30">
                                <p className="text-xs text-slate-400 uppercase tracking-wide">Repo Status</p>
                                <p className="text-lg font-bold text-purple-400 mt-1">{result.repo_status}</p>
                            </div>

                            {/* Sandbox Path */}
                            <div className="bg-black/40 rounded-lg p-4 border border-slate-700/30">
                                <p className="text-xs text-slate-400 uppercase tracking-wide">Sandbox Path</p>
                                <div className="flex items-center justify-between mt-2">
                                    <code className="text-sm text-cyan-300 font-mono break-all">{result.sandbox_path}</code>
                                    <button
                                        onClick={() => copyToClipboard(result.sandbox_path)}
                                        className="ml-2 p-2 hover:bg-slate-700/50 rounded"
                                    >
                                        <Copy size={16} className="text-slate-400" />
                                    </button>
                                </div>
                            </div>

                            {/* Message */}
                            <p className="text-sm text-slate-300 bg-black/40 rounded-lg p-3 border border-slate-700/30">
                                {result.message}
                            </p>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3 text-red-300">
                            <AlertCircle size={24} />
                            <div>
                                <h3 className="font-bold">Analysis Failed</h3>
                                <p className="text-sm">{result.message}</p>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
