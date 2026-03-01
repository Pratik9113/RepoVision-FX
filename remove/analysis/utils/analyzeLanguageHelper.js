
// Advanced code analysis
import path from "path";

const analyzeJavaScript = (content, filePath) => {
  const analysis = {
    functions: [],
    classes: [],
    imports: [],
    exports: [],
    calls: [],
    endpoints: [],
    models: [],
    controllers: [],
    hooks: [],
    components: [],
    types: [],
    interfaces: [],
    decorators: []
  };

  try {
    const lines = content.split('\n');

    // Function detection with more patterns
    const functionPatterns = [
      /(?:function\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>|(\w+)\s*\([^)]*\)\s*\{|export\s+(?:default\s+)?(?:function\s+)?(\w+))/g,
      /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/g,
      /(?:export\s+)?(?:default\s+)?function\s+(\w+)/g
    ];

    const jsKeywords = ["if", "for", "while", "switch", "catch", "function", "const", "let", "var", "export", "import", "default", "return", "await", "async", "try", "finally", "new", "delete", "typeof", "void", "yield", "class", "extends", "super", "with", "defineConfig"];

    for (const pattern of functionPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const funcName = match[1] || match[2] || match[3] || match[4];
        if (funcName && !jsKeywords.includes(funcName) && funcName.length > 1) {
          const line = content.substring(0, match.index).split('\n').length;

          // Better async detection: check if 'async' is within 20 chars before the match
          const context = content.substring(Math.max(0, match.index - 20), match.index);
          const isAsync = /\basync\b/.test(context);

          analysis.functions.push({
            name: funcName,
            file: filePath,
            line: line,
            type: "function",
            async: isAsync
          });
        }
      }
    }

    // Class detection
    const classRegex = /(?:export\s+)?(?:default\s+)?class\s+(\w+)/g;
    let match;
    while ((match = classRegex.exec(content)) !== null) {
      const className = match[1];
      const line = content.substring(0, match.index).split('\n').length;
      analysis.classes.push({
        name: className,
        file: filePath,
        line: line,
        type: "class"
      });
    }

    // React/Vue component detection
    if (filePath.includes('.jsx') || filePath.includes('.tsx') || filePath.includes('.vue')) {
      const componentRegex = /(?:export\s+)?(?:default\s+)?(?:function|const)\s+(\w+)/g;
      while ((match = componentRegex.exec(content)) !== null) {
        const componentName = match[1];
        if (componentName[0] === componentName[0].toUpperCase()) {
          analysis.components.push({
            name: componentName,
            file: filePath,
            type: "component"
          });
        }
      }
    }

    // Hook detection
    const hookRegex = /(?:export\s+)?(?:const|function)\s+(use\w+)/g;
    while ((match = hookRegex.exec(content)) !== null) {
      analysis.hooks.push({
        name: match[1],
        file: filePath,
        type: "hook"
      });
    }

    // TypeScript types and interfaces
    const typeRegex = /(?:export\s+)?(?:type|interface)\s+(\w+)/g;
    while ((match = typeRegex.exec(content)) !== null) {
      analysis.types.push({
        name: match[1],
        file: filePath,
        type: "type"
      });
    }

    // Import detection (ESM)
    const importRegex = /import\s+(?:{[^}]*}|\*\s+as\s+\w+|\w+)\s+from\s+['"]([^'"]+)['"]/g;
    while ((match = importRegex.exec(content)) !== null) {
      analysis.imports.push({ module: match[1], file: filePath });
    }
    // Dynamic import()
    const dynamicImportRegex = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    while ((match = dynamicImportRegex.exec(content)) !== null) {
      analysis.imports.push({ module: match[1], file: filePath });
    }
    // CommonJS require()
    const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    while ((match = requireRegex.exec(content)) !== null) {
      analysis.imports.push({ module: match[1], file: filePath });
    }

    // Express/API endpoint detection
    const expressPatterns = [
      /(?:app|router)\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g,
      /(?:app|router)\.route\s*\(\s*['"`]([^'"`]+)['"`]\)\.(get|post|put|delete|patch)/g
    ];

    for (const pattern of expressPatterns) {
      while ((match = pattern.exec(content)) !== null) {
        analysis.endpoints.push({
          method: match[1] || match[2],
          path: match[2] || match[1],
          file: filePath,
          framework: "express"
        });
      }
    }

    // Model detection (Mongoose, Sequelize, Prisma, etc.)
    const modelPatterns = [
      /(?:const|let|var)\s+(\w+)\s*=\s*(?:mongoose\.model|sequelize\.define|Model\.extend)/g,
      /(?:export\s+)?(?:default\s+)?(?:class|const)\s+(\w+)\s+extends\s+(?:Model|Document)/g,
      /(?:const|let|var)\s+(\w+)\s*=\s*prisma\./g
    ];

    for (const pattern of modelPatterns) {
      while ((match = pattern.exec(content)) !== null) {
        analysis.models.push({
          name: match[1],
          file: filePath,
          orm: "mongoose/sequelize/prisma"
        });
      }
    }

    // Controller detection
    if (filePath.includes('controller') || filePath.includes('route') || filePath.includes('api')) {
      analysis.controllers.push({
        name: path.basename(filePath, path.extname(filePath)),
        file: filePath,
        type: "controller"
      });
    }

    // Middleware detection (Express)
    const middlewareRegex = /(?:app|router)\.use\s*\(\s*(?:\([^)]*\)|(\w+))\s*(?:,\s*(\w+))?\s*\)/g;
    while ((match = middlewareRegex.exec(content)) !== null) {
      const name = match[1] || match[2];
      if (name && !["express.json", "express.static", "cors", "bodyParser", "cookieParser"].includes(name)) {
        analysis.decorators.push({
          name: name,
          file: filePath,
          type: "middleware"
        });
      }
    }

    // Service/Utility detection based on naming/structure
    if (filePath.toLowerCase().includes('service')) {
      analysis.classes.push({ name: path.basename(filePath, path.extname(filePath)), file: filePath, type: "service" });
    }
    if (filePath.toLowerCase().includes('utils') || filePath.toLowerCase().includes('helper')) {
      analysis.functions.push({ name: path.basename(filePath, path.extname(filePath)), file: filePath, type: "utility" });
    }

    // Function call detection (basic)
    const callRegex = /(\w+)\s*\(/g;
    const callKeywords = [...jsKeywords, "require", "console.log", "console.error", "parseInt", "parseFloat", "String", "Number", "Array", "Object", "Promise", "defineConfig"];
    while ((match = callRegex.exec(content)) !== null) {
      const callName = match[1];
      if (callName && !callKeywords.includes(callName) && callName.length > 2) {
        analysis.calls.push({
          name: callName,
          file: filePath,
          line: content.substring(0, match.index).split('\n').length
        });
      }
    }

  } catch (error) {
    console.error(`Error analyzing JavaScript file ${filePath}:`, error.message);
  }

  // Ensure all arrays exist before returning
  return {
    functions: analysis.functions || [],
    classes: analysis.classes || [],
    imports: analysis.imports || [],
    exports: analysis.exports || [],
    calls: analysis.calls || [],
    endpoints: analysis.endpoints || [],
    models: analysis.models || [],
    controllers: analysis.controllers || [],
    hooks: analysis.hooks || [],
    components: analysis.components || [],
    types: analysis.types || [],
    interfaces: analysis.interfaces || [],
    decorators: analysis.decorators || []
  };
};

const analyzePython = (content, filePath) => {
  const analysis = {
    functions: [],
    classes: [],
    imports: [],
    calls: [],
    endpoints: [],
    models: [],
    controllers: [],
    decorators: []
  };

  try {
    const lines = content.split('\n');

    const pyKeywords = ["def", "class", "if", "elif", "else", "for", "while", "try", "except", "finally", "with", "as", "import", "from", "return", "yield", "raise", "await", "async", "assert", "break", "continue", "pass", "global", "nonlocal", "lambda"];

    // Function detection
    const functionRegex = /def\s+(\w+)\s*\(/g;
    let match;
    while ((match = functionRegex.exec(content)) !== null) {
      const funcName = match[1];
      if (funcName && !pyKeywords.includes(funcName)) {
        const line = content.substring(0, match.index).split('\n').length;

        // Better async detection for Python: check for 'async' just before 'def'
        const context = content.substring(Math.max(0, match.index - 10), match.index);
        const isAsync = /\basync\b/.test(context);

        analysis.functions.push({
          name: funcName,
          file: filePath,
          line: line,
          type: "function",
          async: isAsync
        });
      }
    }

    // Class detection
    const classRegex = /class\s+(\w+)/g;
    while ((match = classRegex.exec(content)) !== null) {
      const className = match[1];
      const line = content.substring(0, match.index).split('\n').length;
      analysis.classes.push({
        name: className,
        file: filePath,
        line: line,
        type: "class"
      });
    }

    // Decorator detection
    const decoratorRegex = /@(\w+)/g;
    while ((match = decoratorRegex.exec(content)) !== null) {
      analysis.decorators.push({
        name: match[1],
        file: filePath,
        type: "decorator"
      });
    }

    // Import detection
    const importRegex = /(?:from\s+([^\s]+)\s+import|import\s+([^\s]+))/g;
    while ((match = importRegex.exec(content)) !== null) {
      analysis.imports.push({
        module: match[1] || match[2],
        file: filePath
      });
    }

    // Function call detection (basic)
    const callRegex = /(\w+)\s*\(/g;
    const pyCallKeywords = [...pyKeywords, "print", "len", "range", "set", "list", "dict", "str", "int", "float", "isinstance", "getattr", "setattr", "hasattr", "open", "exec", "eval", "super"];
    while ((match = callRegex.exec(content)) !== null) {
      const callName = match[1];
      if (callName && !pyCallKeywords.includes(callName) && callName.length > 2) {
        analysis.calls.push({
          name: callName,
          file: filePath,
          line: content.substring(0, match.index).split('\n').length
        });
      }
    }

    // FastAPI/Flask endpoint detection
    const apiPatterns = [
      /@(?:app|router|bp)\.(get|post|put|delete|patch|route)\s*\(\s*['"`]([^'"`]+)['"`]/g,
      /@(?:app|router|bp)\.api_route\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*methods\s*=\s*\[([^\]]+)\]/g,
      /@(?:app|router|bp)\.route\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*methods\s*=\s*\[([^\]]+)\]/g
    ];

    for (const pattern of apiPatterns) {
      while ((match = pattern.exec(content)) !== null) {
        analysis.endpoints.push({
          method: (match[1] || "GET").toUpperCase(),
          path: match[2] || match[1],
          file: filePath,
          framework: content.includes("fastapi") ? "fastapi" : "flask"
        });
      }
    }

    // Django endpoint detection
    const djangoRegex = /path\s*\(\s*['"`]([^'"`]+)['"`]/g;
    while ((match = djangoRegex.exec(content)) !== null) {
      analysis.endpoints.push({
        method: "GET",
        path: match[1],
        file: filePath,
        framework: "django"
      });
    }

    // Model detection (SQLAlchemy, Django ORM, Pydantic)
    const modelPatterns = [
      /class\s+(\w+)\s*\(\s*(?:db\.Model|models\.Model|Base|DeclarativeBase|BaseModel)/g,
    ];

    for (const pattern of modelPatterns) {
      while ((match = pattern.exec(content)) !== null) {
        analysis.models.push({
          name: match[1],
          file: filePath,
          orm: content.includes("models.Model") ? "django" : (content.includes("BaseModel") ? "pydantic" : "sqlalchemy")
        });
      }
    }

    // Controller/View detection
    if (filePath.toLowerCase().includes('view') || filePath.toLowerCase().includes('controller') || filePath.toLowerCase().includes('api')) {
      analysis.controllers.push({
        name: path.basename(filePath, path.extname(filePath)),
        file: filePath,
        type: "controller"
      });
    }

  } catch (error) {
    console.error(`Error analyzing Python file ${filePath}:`, error.message);
  }

  return analysis;
};



export { analyzeJavaScript, analyzePython };