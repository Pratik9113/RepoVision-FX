export interface RepoMeta {
    owner: string;
    repo: string;
    branchTried: string;
    name: string;
    description?: string;
    createdAt: string;
    updatedAt: string;
    size: number;
    language?: string;
    stars: number;
    forks: number;
    license?: string;
    fileCountsByLanguage?: Record<string, number>;
}

export interface Stats {
    files: number;
    functions: number;
    classes: number;
    components: number;
    apis: number;
    models: number;
    databases: number;
}

export interface File {
    path: string;
    name: string;
    language?: string;
    icon?: string;
}

export interface Endpoint {
    method: string;
    path: string;
    framework: string;
    file: string;
}

export interface Model {
    name: string;
    orm: string;
    file: string;
}

export interface Controller {
    name: string;
    type: string;
    file: string;
}

export interface Database {
    type: string;
    orm: string;
    evidence: string;
    file: string;
}

export interface Func {
    name: string;
    async?: boolean;
    file: string;
    line: number;
    calls?: string[];
}

export interface FileContent {
    content: string;
    language: string;
}

export interface FileTreeNode {
    name: string;
    type: 'file' | 'dir';
    path: string;
    children?: FileTreeNode[];
    language?: string;
    icon?: string;
    size?: number;
    isText?: boolean;
}

export interface GraphNode {
    id: string;
    name: string;
    layer: string;
    group: number;
    val: number;
    inDegree: number;
    outDegree: number;
}

export interface GraphLink {
    source: string;
    target: string;
    type: string;
    width: number;
}

export interface GraphInsights {
    entryPoints: string[];
    circularDependencies: string[][];
    unusedFiles: string[];
    coreFiles: string[];
    mostReferenced: string[];
    highestWeightFile: string | null;
    architectureImprovementSuggestions: string[];
    dataFlowExplanation: string;
}

export interface ThreeDGraph {
    graph: {
        nodes: GraphNode[];
        links: GraphLink[];
    };
    insights: GraphInsights;
}

export interface RepoData {
    repoMeta: RepoMeta;
    stats: Stats;
    files: File[];
    fileTree: FileTreeNode[];
    endpoints: Endpoint[];
    models: Model[];
    controllers: Controller[];
    databases: Database[];
    functions: Func[];
    mermaidDiagram?: string;
    markdownDigest?: string;
    aiAnalysis?: string;
    aiAnalysisSource?: string;
    moduleDependencyDiagram?: string;
    directoryTreeDiagram?: string;
    threeDGraph?: ThreeDGraph;
}

export interface Tab {
    id: string;
    label: string;
    icon: string;
}
