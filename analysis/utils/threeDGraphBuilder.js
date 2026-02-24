import path from "path";

// Normalizes path for matching
const normalize = (p) => (p || "").replace(/\\/g, "/");

// Layer identification based on path and content
const determineLayer = (filePath) => {
    const p = filePath.toLowerCase();
    if (p.includes('frontend') || p.includes('src/components') || p.includes('src/pages') || p.includes('src/views') || p.endsWith('.jsx') || p.endsWith('.tsx') || p.endsWith('.vue')) {
        return 'frontend';
    }
    if (p.includes('config') || p.endsWith('.env') || p.includes('settings')) {
        return 'config';
    }
    if (p.includes('middleware') || p.includes('middlewares')) {
        return 'middleware';
    }
    if (p.includes('database') || p.includes('model') || p.includes('schema') || p.includes('migration')) {
        return 'database';
    }
    if (p.includes('service') || p.includes('provider') || p.includes('utils') || p.includes('helper')) {
        return 'service';
    }
    if (p.includes('controller') || p.includes('route') || p.includes('api')) {
        return 'backend';
    }
    return 'common';
};

const mapLayerToGroup = (layer) => {
    const groups = {
        'frontend': 1,
        'backend': 2,
        'database': 3,
        'middleware': 4,
        'config': 5,
        'service': 6,
        'common': 7
    };
    return groups[layer] || 7;
};

export const generate3DGraphData = (files, allAnalysis) => {
    const exts = [".js", ".ts", ".jsx", ".tsx", ".mjs", ".cjs", ".py"];
    const fileSet = new Set(files.map((f) => normalize(f.path)));

    const baseToFull = new Map();
    for (const f of files) {
        const np = normalize(f.path);
        const ext = path.posix.extname(np);
        const base = np.slice(0, ext.length ? -ext.length : undefined);
        baseToFull.set(base, np);
        if (base.endsWith("/index")) {
            baseToFull.set(base.slice(0, -"/index".length), np);
        }
    }

    const dirname = (p) => normalize(path.posix.dirname(p));
    const join = (...parts) => normalize(path.posix.join(...parts));

    const tryResolveBase = (base) => {
        if (baseToFull.has(base)) return baseToFull.get(base);
        for (const ext of exts) {
            const cand = `${base}${ext}`;
            if (fileSet.has(cand)) return cand;
        }
        for (const ext of exts) {
            const cand = `${base}/index${ext}`;
            if (fileSet.has(cand)) return cand;
        }
        return null;
    };

    const resolveImport = (fromPath, spec) => {
        if (!spec) return null;
        let s = String(spec).trim();
        if (!s) return null;
        const isPythonLike = s.includes(".") && !s.startsWith(".");
        if (!s.startsWith(".") && isPythonLike) {
            s = s.replace(/\./g, "/");
        }
        if (s.startsWith(".")) {
            const base = path.posix.normalize(join(dirname(fromPath), s));
            return tryResolveBase(base);
        }
        const cleaned = s.replace(/^@\//, "");
        const exact = tryResolveBase(cleaned);
        if (exact) return exact;
        for (const [base, full] of baseToFull.entries()) {
            if (base.endsWith(`/${cleaned}`) || base === cleaned) {
                return full;
            }
        }
        return null;
    };

    // 1. Build Nodes
    const nodesMap = new Map();
    for (const f of files) {
        const np = normalize(f.path);
        const layer = determineLayer(np);
        nodesMap.set(np, {
            id: np,
            name: path.posix.basename(np),
            layer: layer,
            group: mapLayerToGroup(layer),
            val: 1, // Will increase based on dependency weight
            inDegree: 0,
            outDegree: 0
        });
    }

    // 2. Build Edges mapping
    const linksMap = new Map();

    // Add import dependencies
    for (const imp of allAnalysis.imports || []) {
        const from = normalize(imp.file);
        const to = resolveImport(from, imp.module);

        if (to && from !== to && nodesMap.has(from) && nodesMap.has(to)) {
            const linkId = `${from}->${to}`;
            if (!linksMap.has(linkId)) {
                linksMap.set(linkId, { source: from, target: to, type: 'import', width: 1 });
                nodesMap.get(from).outDegree += 1;
                nodesMap.get(to).inDegree += 1;
                nodesMap.get(to).val += 1; // Increase size of highly referenced files
            }
        }
    }

    // Identify entry points
    const entryPointNames = ['server.js', 'app.js', 'index.js', 'main.py', 'main.js', 'index.ts', 'main.ts', 'app.tsx'];
    const entryPoints = [];
    const unusedFiles = [];
    let highestWeightFile = null;

    for (const [id, node] of nodesMap.entries()) {
        const isEntryName = entryPointNames.includes(node.name.toLowerCase());
        if (node.inDegree === 0 && (node.outDegree > 0 || isEntryName)) {
            entryPoints.push(id);
        } else if (node.inDegree === 0 && node.outDegree === 0) {
            unusedFiles.push(id);
        }

        if (!highestWeightFile || node.val > highestWeightFile.val) {
            highestWeightFile = node;
        }
    }

    // Circular Dependency Detection (DFS)
    const adjacencyList = new Map();
    for (const id of nodesMap.keys()) adjacencyList.set(id, []);
    for (const link of linksMap.values()) {
        adjacencyList.get(link.source).push(link.target);
    }

    const circularDependencies = [];
    const visited = new Set();
    const stack = new Set();

    const dfs = (nodeId, currentPath) => {
        visited.add(nodeId);
        stack.add(nodeId);

        for (const neighbor of adjacencyList.get(nodeId) || []) {
            if (!visited.has(neighbor)) {
                dfs(neighbor, [...currentPath, neighbor]);
            } else if (stack.has(neighbor)) {
                // Cycle detected
                const cycleStartIndex = currentPath.indexOf(neighbor);
                const cycle = currentPath.slice(cycleStartIndex);
                circularDependencies.push(cycle);
            }
        }
        stack.delete(nodeId);
    };

    for (const id of nodesMap.keys()) {
        if (!visited.has(id)) {
            dfs(id, [id]);
        }
    }

    // Critical Core files (High inDegree combined with reasonable outDegree)
    const coreFiles = Array.from(nodesMap.values())
        .filter(n => n.inDegree > 2 && n.outDegree > 0)
        .sort((a, b) => b.val - a.val)
        .map(n => n.id)
        .slice(0, 10);

    const mostReferenced = Array.from(nodesMap.values())
        .sort((a, b) => b.inDegree - a.inDegree)
        .map(n => n.id)
        .slice(0, 10);

    return {
        graph: {
            nodes: Array.from(nodesMap.values()),
            links: Array.from(linksMap.values())
        },
        insights: {
            entryPoints,
            circularDependencies: circularDependencies.slice(0, 20), // limit to first 20 cycles
            unusedFiles,
            coreFiles,
            mostReferenced,
            highestWeightFile: highestWeightFile ? highestWeightFile.id : null,
            architectureImprovementSuggestions: [
                "1. If circular dependencies are found, refactor by extracting shared logic into separate utility modules.",
                "2. Review 'unusedFiles' to remove dead code and reduce bundle size.",
                "3. 'coreFiles' are heavily relied upon. Ensure they have high test coverage.",
                "4. Make sure UI components are not importing backend controllers directly."
            ],
            dataFlowExplanation: "Frontend UI calls → API Endpoints (Routes) → Controllers → Services (Business Logic) → Database/Models. Data bubbles back up the same way."
        }
    };
};
