import { useState, useMemo } from "react";
import { ChevronRight, ChevronDown, Activity, FileCode, Database } from "lucide-react";
import { FileTree } from './FileTree';
import { CodeViewer } from './CodeViewer';
import { MermaidDiagram } from '../../components/MermaidDiagram';
import { MarkdownDigest } from './MarkdownDigest';
import { AIAnalysis } from '../../components/AIAnalysis';
import { Badge } from './Badge';
import MermaidDiagramRepository from "../../components/MermaidDiagramRepository";

// Helper component for expandable function items
const FunctionItem = ({ func }) => {
    const [isOpen, setIsOpen] = useState(false);
    const hasCalls = func.calls && func.calls.length > 0;

    return (
        <div className="rounded-lg bg-white/5 border border-white/10 overflow-hidden transition-all hover:bg-white/[0.07]">
            <div
                className={`flex items-center gap-3 p-4 cursor-pointer ${hasCalls ? 'hover:bg-indigo-500/5' : ''}`}
                onClick={() => hasCalls && setIsOpen(!isOpen)}
            >
                {hasCalls ? (
                    <span className={`text-slate-400 transition-transform ${isOpen ? 'rotate-90' : ''}`}>
                        <ChevronRight size={18} />
                    </span>
                ) : (
                    <span className="w-[18px]" /> // spacer
                )}

                <div className="flex items-center gap-2 flex-1">
                    <Activity size={16} className={func.async ? "text-amber-400" : "text-blue-400"} />
                    <span className="font-semibold text-slate-200">{func.name}</span>
                    {func.async && <Badge variant="warning">async</Badge>}
                </div>

                <div className="text-xs text-slate-500 font-mono">
                    {func.file}:{func.line}
                </div>
            </div>

            {/* Nested calls */}
            {isOpen && hasCalls && (
                <div className="bg-slate-950/30 border-t border-white/5 pl-11 pr-4 py-3 space-y-2">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Calls</div>
                    {func.calls.map((call, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm text-slate-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
                            <span className="font-mono text-indigo-300">{call}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const FunctionFileGroup = ({ filename, functions }) => {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <div className="border border-white/10 rounded-lg overflow-hidden mb-3">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-3 bg-slate-800/50 hover:bg-slate-800 transition-colors text-left"
            >
                <div className="flex items-center gap-2 text-slate-200">
                    <FileCode size={18} className="text-indigo-400" />
                    <span className="font-medium font-mono text-sm">{filename}</span>
                    <span className="text-xs text-slate-500 ml-2">({functions.length})</span>
                </div>
                <ChevronDown size={16} className={`text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="bg-slate-900/30 p-3 space-y-2">
                    {functions.map((func, idx) => (
                        <FunctionItem key={idx} func={func} />
                    ))}
                </div>
            )}
        </div>
    );
};

const EndpointItem = ({ endpoint }) => {
    return (
        <div className="rounded-lg bg-white/5 border border-white/10 overflow-hidden transition-all hover:bg-white/[0.07] p-4">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                    <Badge variant={endpoint.method === 'GET' ? 'success' : 'primary'}>{endpoint.method}</Badge>
                    <code className="text-indigo-300 font-mono">{endpoint.path}</code>
                </div>
                <Badge variant="outline" className="text-xs">{endpoint.framework}</Badge>
            </div>
        </div>
    );
};

const EndpointFileGroup = ({ filename, endpoints }) => {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <div className="border border-white/10 rounded-lg overflow-hidden mb-3">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-3 bg-slate-800/50 hover:bg-slate-800 transition-colors text-left"
            >
                <div className="flex items-center gap-2 text-slate-200">
                    <FileCode size={18} className="text-indigo-400" />
                    <span className="font-medium font-mono text-sm">{filename}</span>
                    <span className="text-xs text-slate-500 ml-2">({endpoints.length})</span>
                </div>
                <ChevronDown size={16} className={`text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="bg-slate-900/30 p-3 space-y-2">
                    {endpoints.map((endpoint, idx) => (
                        <EndpointItem key={idx} endpoint={endpoint} />
                    ))}
                </div>
            )}
        </div>
    );
};

const DatabaseItem = ({ db }) => {
    return (
        <div className="rounded-lg bg-white/5 border border-white/10 overflow-hidden transition-all hover:bg-white/[0.07] p-4">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                    <Database size={16} className="text-blue-400" />
                    <span className="font-semibold text-slate-200">{db.type}</span>
                </div>
                <Badge variant="primary">{db.orm}</Badge>
            </div>
            <div className="text-xs text-slate-400">
                <span className="opacity-70">Evidence: </span> {db.evidence}
            </div>
        </div>
    );
};

const DatabaseFileGroup = ({ filename, databases }) => {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <div className="border border-white/10 rounded-lg overflow-hidden mb-3">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-3 bg-slate-800/50 hover:bg-slate-800 transition-colors text-left"
            >
                <div className="flex items-center gap-2 text-slate-200">
                    <FileCode size={18} className="text-indigo-400" />
                    <span className="font-medium font-mono text-sm">{filename}</span>
                    <span className="text-xs text-slate-500 ml-2">({databases.length})</span>
                </div>
                <ChevronDown size={16} className={`text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="bg-slate-900/30 p-3 space-y-2">
                    {databases.map((db, idx) => (
                        <DatabaseItem key={idx} db={db} />
                    ))}
                </div>
            )}
        </div>
    );
};

const RepoTabs = ({
    tabs,
    activeTab,
    setActiveTab,
    data,
    fetchFileContent,
    fileContent,
    selectedFile,
}) => {
    const groupedFunctions = useMemo(() => {
        const groups = {};
        if (data && data.functions) {
            data.functions.forEach(func => {
                if (!groups[func.file]) {
                    groups[func.file] = [];
                }

                // Deduplicate: Check if function with same name and line already exists in this file group
                const exists = groups[func.file].some(
                    f => f.name === func.name && f.line === func.line
                );

                if (!exists) {
                    groups[func.file].push(func);
                }
            });
        }
        return groups;
    }, [data]);

    const groupedEndpoints = useMemo(() => {
        const groups = {};
        if (data && data.endpoints) {
            data.endpoints.forEach(endpoint => {
                if (!groups[endpoint.file]) {
                    groups[endpoint.file] = [];
                }
                groups[endpoint.file].push(endpoint);
            });
        }
        return groups;
    }, [data]);

    const groupedDatabases = useMemo(() => {
        const groups = {};
        if (data && data.databases) {
            data.databases.forEach(db => {
                if (!groups[db.file]) {
                    groups[db.file] = [];
                }
                groups[db.file].push(db);
            });
        }
        return groups;
    }, [data]);

    return (
        <section className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl overflow-hidden">
            {/* Tab Buttons */}
            <div className="flex overflow-x-auto border-b border-white/10">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === tab.id
                            ? "border-indigo-500 text-indigo-400 bg-indigo-500/10"
                            : "border-transparent text-slate-400 hover:text-slate-300 hover:bg-white/5"
                            }`}
                    >
                        <span>{tab.icon}</span>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="p-6">
                {/* Overview Tab */}
                {activeTab === "overview" && (
                    <div className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <h3 className="text-lg font-semibold mb-4">Repository Information</h3>
                                <div className="space-y-2 text-sm">
                                    <p><strong>Name:</strong> {data.repoMeta.name}</p>
                                    <p><strong>Description:</strong> {data.repoMeta.description ?? "No description"}</p>
                                    <p><strong>Created:</strong> {new Date(data.repoMeta.createdAt).toLocaleDateString()}</p>
                                    <p><strong>Last Updated:</strong> {new Date(data.repoMeta.updatedAt).toLocaleDateString()}</p>
                                    <p><strong>Size:</strong> {data.repoMeta.size} KB</p>
                                    {data.repoMeta.license && <p><strong>License:</strong> {data.repoMeta.license}</p>}
                                </div>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold mb-4">Quick Stats</h3>
                                <div className="space-y-2 text-sm">
                                    <p><strong>Total Functions:</strong> {data.stats.functions}</p>
                                    <p><strong>Total Classes:</strong> {data.stats.classes}</p>
                                    <p><strong>API Endpoints:</strong> {data.stats.apis}</p>
                                    <p><strong>Data Models:</strong> {data.stats.models}</p>
                                    <p><strong>Database Connections:</strong> {data.stats.databases}</p>
                                    <p><strong>React Components:</strong> {data.stats.components}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Files Tab */}
                {activeTab === "files" && (
                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="md:col-span-1">
                            <h3 className="text-lg font-semibold mb-4">File Explorer</h3>
                            <div className="bg-slate-900 rounded-lg p-4 max-h-96 overflow-y-auto">
                                <FileTree tree={data.fileTree} onFileClick={fetchFileContent} />
                            </div>
                        </div>
                        <div className="md:col-span-2">
                            <h3 className="text-lg font-semibold mb-4">File Content</h3>
                            {fileContent && selectedFile ? (
                                <CodeViewer
                                    content={fileContent.content}
                                    language={fileContent.language ?? "plaintext"}
                                    filename={selectedFile.name}
                                />
                            ) : (
                                <div className="bg-slate-900 rounded-lg p-8 text-center text-slate-400">
                                    <p>Select a file from the explorer to view its content</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Endpoints Tab */}
                {activeTab === "endpoints" && (
                    <div>
                        <h3 className="text-lg font-semibold mb-4">API Endpoints ({data.endpoints.length})</h3>
                        <div className="space-y-3">
                            {Object.keys(groupedEndpoints).length > 0 ? (
                                Object.entries(groupedEndpoints).map(([filename, endpoints], i) => (
                                    <EndpointFileGroup key={i} filename={filename} endpoints={endpoints} />
                                ))
                            ) : (
                                <div className="p-8 text-center text-slate-400 bg-white/5 rounded-lg border border-dashed border-white/10">
                                    <p>No API endpoints detected</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Models Tab */}
                {activeTab === "models" && (
                    <div>
                        <h3 className="text-lg font-semibold mb-4">Data Models ({data.models.length})</h3>
                        <div className="grid gap-3">
                            {data.models.map((model, i) => (
                                <div key={i} className="p-4 rounded-lg bg-white/5 border border-white/10">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="text-lg">🗄️</span>
                                        <h4 className="font-semibold">{model.name}</h4>
                                        <Badge variant="primary">{model.orm}</Badge>
                                    </div>
                                    <div className="text-sm text-slate-400">
                                        <p><strong>File:</strong> {model.file}</p>
                                    </div>
                                </div>
                            ))}
                            {data.models.length === 0 && <p className="text-center text-slate-400 py-8">No data models detected</p>}
                        </div>
                    </div>
                )}

                {/* Controllers Tab */}
                {activeTab === "controllers" && (
                    <div>
                        <h3 className="text-lg font-semibold mb-4">Controllers ({data.controllers.length})</h3>
                        <div className="grid gap-3">
                            {data.controllers.map((controller, i) => (
                                <div key={i} className="p-4 rounded-lg bg-white/5 border border-white/10">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="text-lg">🎮</span>
                                        <h4 className="font-semibold">{controller.name}</h4>
                                        <Badge variant="primary">{controller.type}</Badge>
                                    </div>
                                    <div className="text-sm text-slate-400">
                                        <p><strong>File:</strong> {controller.file}</p>
                                    </div>
                                </div>
                            ))}
                            {data.controllers.length === 0 && <p className="text-center text-slate-400 py-8">No controllers detected</p>}
                        </div>
                    </div>
                )}

                {/* Databases Tab */}
                {activeTab === "databases" && (
                    <div>
                        <h3 className="text-lg font-semibold mb-4">Databases ({data.databases.length})</h3>
                        <div className="space-y-3">
                            {Object.keys(groupedDatabases).length > 0 ? (
                                Object.entries(groupedDatabases).map(([filename, databases], i) => (
                                    <DatabaseFileGroup key={i} filename={filename} databases={databases} />
                                ))
                            ) : (
                                <div className="p-8 text-center text-slate-400 bg-white/5 rounded-lg border border-dashed border-white/10">
                                    <p>No databases detected</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Functions Tab */}
                {/* Functions Tab */}
                {activeTab === "functions" && (
                    <div>
                        <h3 className="text-lg font-semibold mb-4">Functions ({data.functions.length})</h3>
                        <div className="space-y-3">
                            {Object.keys(groupedFunctions).length > 0 ? (
                                Object.entries(groupedFunctions).map(([filename, funcs], i) => (
                                    <FunctionFileGroup key={i} filename={filename} functions={funcs} />
                                ))
                            ) : (
                                <div className="p-8 text-center text-slate-400 bg-white/5 rounded-lg border border-dashed border-white/10">
                                    <p>No functions detected</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === "diagram" && (
                    <div className="h-[600px] w-full">
                        <MermaidDiagramRepository
                            diagram={data.mermaidDiagram ?? ""}
                            title="Repository Architecture"
                        />
                    </div>
                )}


                {activeTab === "modules" && (
                    <MermaidDiagram
                        diagram={data.moduleDependencyDiagram ?? ""}
                        title="Module Dependency Graph"
                    />
                )}

                {activeTab === "directories" && (
                    <MermaidDiagram
                        diagram={data.directoryTreeDiagram ?? ""}
                        title="Directory Tree"
                    />
                )}
                {activeTab === "digest" && <MarkdownDigest content={data.markdownDigest ?? ""} />}
                {activeTab === "ai" && <AIAnalysis analysis={data.aiAnalysis ?? ""} source={data.aiAnalysisSource ?? "AI"} />}

                {/* Raw Data Tab */}
                {activeTab === "raw" && (
                    <div>
                        <h3 className="text-lg font-semibold mb-4">Raw Analysis Data</h3>
                        <div className="bg-slate-900 rounded-lg p-4 overflow-auto max-h-96">
                            <pre className="text-xs text-slate-200 whitespace-pre-wrap">
                                {JSON.stringify(data, null, 2)}
                            </pre>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
};

export default RepoTabs;
