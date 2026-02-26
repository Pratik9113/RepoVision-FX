/**
 * @typedef {Object} RepoMeta
 * @property {string} owner
 * @property {string} repo
 * @property {string} branchTried
 * @property {string} name
 * @property {string} [description]
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {number} size
 * @property {string} [language]
 * @property {number} stars
 * @property {number} forks
 * @property {string} [license]
 * @property {Object.<string, number>} [fileCountsByLanguage]
 */

/**
 * @typedef {Object} Stats
 * @property {number} files
 * @property {number} functions
 * @property {number} classes
 * @property {number} components
 * @property {number} apis
 * @property {number} models
 * @property {number} databases
 */

/**
 * @typedef {Object} RepoFile
 * @property {string} path
 * @property {string} name
 * @property {string} [language]
 * @property {string} [icon]
 */

/**
 * @typedef {Object} FileContent
 * @property {string} content
 * @property {string} language
 */

/**
 * @typedef {Object} FileTreeNode
 * @property {string} name
 * @property {'file'|'dir'} type
 * @property {string} path
 * @property {FileTreeNode[]} [children]
 * @property {string} [language]
 * @property {string} [icon]
 * @property {number} [size]
 * @property {boolean} [isText]
 */

/**
 * @typedef {Object} GraphNode
 * @property {string} id
 * @property {string} name
 * @property {string} layer
 * @property {number} group
 * @property {number} val
 * @property {number} inDegree
 * @property {number} outDegree
 */

/**
 * @typedef {Object} GraphLink
 * @property {string} source
 * @property {string} target
 * @property {string} type
 * @property {number} width
 */

/**
 * @typedef {Object} ThreeDGraph
 * @property {{ nodes: GraphNode[], links: GraphLink[] }} graph
 * @property {Object} insights
 */

/**
 * @typedef {Object} RepoData
 * @property {RepoMeta} repoMeta
 * @property {Stats} stats
 * @property {RepoFile[]} files
 * @property {FileTreeNode[]} fileTree
 * @property {Object[]} endpoints
 * @property {Object[]} models
 * @property {Object[]} controllers
 * @property {Object[]} databases
 * @property {Object[]} functions
 * @property {string} [mermaidDiagram]
 * @property {string} [markdownDigest]
 * @property {string} [aiAnalysis]
 * @property {string} [aiAnalysisSource]
 * @property {string} [moduleDependencyDiagram]
 * @property {string} [directoryTreeDiagram]
 * @property {ThreeDGraph} [threeDGraph]
 */

/**
 * @typedef {Object} Tab
 * @property {string} id
 * @property {string} label
 * @property {string} icon
 */

export { };
