
const buildCallGraph = (allAnalysis) => {
  const callGraph = {
    nodes: [],
    edges: [],
    clusters: {
      functions: [],
      classes: [],
      components: [],
      models: [],
      controllers: [],
      endpoints: []
    }
  };

  // Add all functions as nodes
  for (const func of (allAnalysis.functions || [])) {
    const nodeId = `${func.file}:${func.name}`;
    callGraph.nodes.push({
      id: nodeId,
      label: func.name,
      file: func.file,
      type: "function",
      async: func.async || false,
      line: func.line
    });
    callGraph.clusters.functions.push(nodeId);
  }

  for (const cls of (allAnalysis.classes || [])) {
    const nodeId = `${cls.file}:${cls.name}`;
    callGraph.nodes.push({
      id: nodeId,
      label: cls.name,
      file: cls.file,
      type: "class"
    });
    callGraph.clusters.classes.push(nodeId);
  }

  for (const comp of (allAnalysis.components || [])) {
    const nodeId = `${comp.file}:${comp.name}`;
    callGraph.nodes.push({
      id: nodeId,
      label: comp.name,
      file: comp.file,
      type: "component"
    });
    callGraph.clusters.components.push(nodeId);
  }

  for (const model of (allAnalysis.models || [])) {
    const nodeId = `${model.file}:${model.name}`;
    callGraph.nodes.push({
      id: nodeId,
      label: model.name,
      file: model.file,
      type: "model"
    });
    callGraph.clusters.models.push(nodeId);
  }

  for (const controller of (allAnalysis.controllers || [])) {
    const nodeId = `${controller.file}:${controller.name}`;
    callGraph.nodes.push({
      id: nodeId,
      label: controller.name,
      file: controller.file,
      type: "controller"
    });
    callGraph.clusters.controllers.push(nodeId);
  }

  // Create a definition map for fast lookup: name -> nodeId
  const defMap = new Map();
  for (const node of callGraph.nodes) {
    if (node.type === "function") {
      // If multiple functions have the same name, we might need a better heuristic, 
      // but for now, we'll map names to their most likely definition.
      defMap.set(node.label, node.id);
    }
  }

  // Add edges based on static function calls
  for (const call of (allAnalysis.calls || [])) {
    const toId = defMap.get(call.name);
    if (toId) {
      // Find the parent function based on line number proximity
      // The parent function must be in the same file and start before the call
      const fileFunctions = callGraph.nodes.filter(n =>
        n.file === call.file &&
        n.type === "function" &&
        n.line <= call.line
      );

      // Sort to find the closest preceding function
      fileFunctions.sort((a, b) => b.line - a.line);
      const parentFunc = fileFunctions[0];

      // If we found a parent function, link from it. Otherwise it's a top-level call (linked from file)
      const fromId = parentFunc ? parentFunc.id : call.file;
      const type = parentFunc ? "call" : "top-level-call";

      if (fromId !== toId) {
        callGraph.edges.push({
          from: fromId,
          to: toId,
          type: type,
          line: call.line
        });
      }
    }
  }

  // Add edges based on imports
  for (const imp of (allAnalysis.imports || [])) {
    callGraph.edges.push({
      from: imp.file,
      to: imp.module,
      type: "import"
    });
  }

  return callGraph;
};


export { buildCallGraph };