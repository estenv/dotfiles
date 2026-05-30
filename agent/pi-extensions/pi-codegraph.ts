import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { spawn } from "node:child_process";
import * as readline from "node:readline";
import { pathToFileURL } from "node:url";

/**
 * CodeGraph Extension for Pi Agent — MCP Edition
 *
 * Connects to CodeGraph via the Model Context Protocol (MCP) using JSON-RPC over stdio.
 * Spawns `codegraph serve --mcp` as a child process. Supports all 9 CodeGraph tools
 * with full cross-project query support via the optional `projectPath` parameter.
 */

const REQUEST_TIMEOUT_MS = 30000;

class MCPClient {
  private proc: ReturnType<typeof spawn>;
  private rl: readline.Interface;
  private pending = new Map<string, (msg: any) => void>();
  private timers = new Map<string, NodeJS.Timeout>();
  private idCounter = 0;
  private closed = false;

  constructor(cwd: string) {
    this.proc = spawn("codegraph", [
      "serve",
      "--mcp",
    ], {
      cwd,
      stdio: ["pipe", "pipe", "pipe"],
    });

    this.rl = readline.createInterface({
      input: this.proc.stdout,
      terminal: false,
    });

    this.rl.on("line", (line) => this.onLine(line));

    this.proc.stderr.on("data", (data) => {
      const text = data.toString().trim();
      if (text) console.error("[CodeGraph MCP]", text);
    });

    this.proc.on("error", (err) => {
      console.error("[CodeGraph MCP] Process error:", err);
    });

    this.proc.on("exit", (code) => {
      this.closed = true;
      for (const [id, handler] of this.pending) {
        clearTimeout(this.timers.get(id)!);
        handler({ error: { message: `MCP server exited with code ${code}` } });
      }
      this.pending.clear();
      this.timers.clear();
    });
  }

  private onLine(line: string): void {
    try {
      const msg = JSON.parse(line);
      if (msg.id != null && this.pending.has(String(msg.id))) {
        const id = String(msg.id);
        clearTimeout(this.timers.get(id)!);
        this.timers.delete(id);
        const handler = this.pending.get(id)!;
        this.pending.delete(id);
        handler(msg);
      }
    } catch {
      // Ignore non-JSON lines
    }
  }

  async initialize(rootUri: string): Promise<any> {
    const result = await this.request("initialize", { rootUri });
    this.notify("initialized", {});
    return result;
  }

  async callTool(name: string, args: Record<string, unknown>, signal?: AbortSignal): Promise<any> {
    return this.request("tools/call", { name, arguments: args }, signal);
  }

  private request(method: string, params: unknown, signal?: AbortSignal): Promise<any> {
    return new Promise((resolve, reject) => {
      if (this.closed) {
        reject(new Error("MCP server connection is closed"));
        return;
      }

      const id = ++this.idCounter;
      const msg = JSON.stringify({ jsonrpc: "2.0", id, method, params });
      this.proc.stdin.write(msg + "\n");

      const timer = setTimeout(() => {
        cleanup();
        reject(new Error(`MCP request timeout (${REQUEST_TIMEOUT_MS}ms): ${method}`));
      }, REQUEST_TIMEOUT_MS);

      const onAbort = () => {
        cleanup();
        this.close();
        reject(new Error("MCP request cancelled by user"));
      };

      const cleanup = () => {
        this.pending.delete(String(id));
        this.timers.delete(String(id));
        clearTimeout(timer);
        signal?.removeEventListener("abort", onAbort);
      };

      signal?.addEventListener("abort", onAbort);
      this.timers.set(String(id), timer);

      this.pending.set(String(id), (msg: any) => {
        cleanup();
        if (msg.error) {
          reject(new Error(msg.error.message || JSON.stringify(msg.error)));
        } else {
          resolve(msg.result);
        }
      });
    });
  }

  private notify(method: string, params: unknown): void {
    if (this.closed) return;
    const msg = JSON.stringify({ jsonrpc: "2.0", method, params });
    this.proc.stdin.write(msg + "\n");
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    for (const [id, handler] of this.pending) {
      clearTimeout(this.timers.get(id)!);
      handler({ error: { message: "MCP client closed" } });
    }
    this.pending.clear();
    this.timers.clear();
    this.rl.close();
    this.proc.kill();
  }
}

async function runMCPTool(
  cwd: string,
  toolName: string,
  args: Record<string, unknown>,
  signal?: AbortSignal
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  const client = new MCPClient(cwd);
  try {
    const rootUri = pathToFileURL(cwd).href;
    await client.initialize(rootUri);
    const result = await client.callTool(toolName, args, signal);
    return result as { content: Array<{ type: "text"; text: string }>; isError?: boolean };
  } finally {
    client.close();
  }
}

function handleError(err: unknown, toolName: string): {
  content: Array<{ type: "text"; text: string }>;
  isError: true;
  details: { error: string; tool: string };
} {
  let message = err instanceof Error ? err.message : String(err);

  if (message.includes("ENOENT") || message.includes("spawn")) {
    message =
      "CodeGraph CLI not found. Install with: npm install -g @colbymchenry/codegraph\n" +
      "Or in your project: pnpm add -D @colbymchenry/codegraph";
  } else if (message.includes("not initialized")) {
    message =
      `${message}\n\nRun 'codegraph init -i' in your project directory to initialize CodeGraph.`;
  }

  return {
    content: [{ type: "text" as const, text: `CodeGraph ${toolName} failed: ${message}` }],
    isError: true,
    details: { error: message, tool: toolName },
  };
}

const projectPathProperty = Type.Optional(
  Type.String({
    description:
      "Path to a different project with .codegraph/ initialized. If omitted, uses current project.",
  })
);

export default function (pi: ExtensionAPI) {
  // ──────────────────────────────────────────────────────────────────────────
  // Tool: codegraph_search
  // ──────────────────────────────────────────────────────────────────────────
  pi.registerTool({
    name: "codegraph_search",
    label: "CodeGraph Search",
    description: "Search for symbols across the codebase using CodeGraph's semantic index",
    promptSnippet: "Search codebase symbols via CodeGraph",
    promptGuidelines: [
      "Use codegraph_search when you need to find symbols by name across the codebase",
      "Use for: finding function definitions, class implementations, types, routes",
      "Prefer codegraph_context for exploration tasks — it composes multiple searches in one call",
    ],
    parameters: Type.Object({
      query: Type.String({ description: "Symbol name or partial name (e.g., 'auth', 'UserService')" }),
      kind: Type.Optional(
        Type.Union(
          [
            Type.Literal("function"),
            Type.Literal("method"),
            Type.Literal("class"),
            Type.Literal("interface"),
            Type.Literal("type"),
            Type.Literal("variable"),
            Type.Literal("route"),
            Type.Literal("component"),
          ],
          { description: "Filter by node kind" }
        )
      ),
      limit: Type.Optional(Type.Number({ description: "Maximum results (default: 20)", default: 20 })),
      projectPath: projectPathProperty,
    }),
    async execute(toolCallId, params, signal, _onUpdate, ctx) {
      try {
        const result = await runMCPTool(
          ctx.cwd,
          "codegraph_search",
          {
            query: params.query,
            kind: params.kind,
            limit: params.limit ?? 20,
            projectPath: params.projectPath,
          },
          signal
        );
        return {
          content: result.content,
          isError: result.isError,
          details: { tool: "search", query: params.query },
        };
      } catch (err) {
        return handleError(err, "search");
      }
    },
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Tool: codegraph_context
  // ──────────────────────────────────────────────────────────────────────────
  pi.registerTool({
    name: "codegraph_context",
    label: "CodeGraph Context",
    description:
      "Build comprehensive code context for a task. PRIMARY tool — composes search, node, callers, and callees in one call.",
    promptSnippet: "Build code context via CodeGraph",
    promptGuidelines: [
      "Use codegraph_context as the PRIMARY tool for understanding code areas",
      "Returns large context — often enough without additional tool calls",
      "Use for: onboarding, feature exploration, bug investigation",
    ],
    parameters: Type.Object({
      task: Type.String({ description: "Task description, bug, or feature to build context for" }),
      maxNodes: Type.Optional(Type.Number({ description: "Maximum symbols to include (default: 20)", default: 20 })),
      includeCode: Type.Optional(Type.Boolean({ description: "Include code snippets (default: true)", default: true })),
      projectPath: projectPathProperty,
    }),
    async execute(toolCallId, params, signal, _onUpdate, ctx) {
      try {
        const result = await runMCPTool(
          ctx.cwd,
          "codegraph_context",
          {
            task: params.task,
            maxNodes: params.maxNodes ?? 20,
            includeCode: params.includeCode ?? true,
            projectPath: params.projectPath,
          },
          signal
        );
        return {
          content: result.content,
          isError: result.isError,
          details: { tool: "context", task: params.task },
        };
      } catch (err) {
        return handleError(err, "context");
      }
    },
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Tool: codegraph_callers
  // ─────────────────────────────────────────────────────────────────────────
  pi.registerTool({
    name: "codegraph_callers",
    label: "CodeGraph Callers",
    description: "Find all functions/methods that call a specific symbol",
    promptSnippet: "Find callers of a symbol",
    promptGuidelines: [
      "Use codegraph_callers before modifying a function to see call sites",
      "Use for: understanding usage patterns, impact analysis",
    ],
    parameters: Type.Object({
      symbol: Type.String({ description: "Function, method, or class name to find callers for" }),
      limit: Type.Optional(Type.Number({ description: "Maximum callers (default: 20)", default: 20 })),
      projectPath: projectPathProperty,
    }),
    async execute(toolCallId, params, signal, _onUpdate, ctx) {
      try {
        const result = await runMCPTool(
          ctx.cwd,
          "codegraph_callers",
          {
            symbol: params.symbol,
            limit: params.limit ?? 20,
            projectPath: params.projectPath,
          },
          signal
        );
        return {
          content: result.content,
          isError: result.isError,
          details: { tool: "callers", symbol: params.symbol },
        };
      } catch (err) {
        return handleError(err, "callers");
      }
    },
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Tool: codegraph_callees
  // ──────────────────────────────────────────────────────────────────────────
  pi.registerTool({
    name: "codegraph_callees",
    label: "CodeGraph Callees",
    description: "Find all functions/methods that a specific symbol calls",
    promptSnippet: "Find callees of a symbol",
    promptGuidelines: [
      "Use codegraph_callees to understand dependencies and code flow",
      "Use for: tracing execution paths, understanding what a function depends on",
    ],
    parameters: Type.Object({
      symbol: Type.String({ description: "Function, method, or class name to find callees for" }),
      limit: Type.Optional(Type.Number({ description: "Maximum callees (default: 20)", default: 20 })),
      projectPath: projectPathProperty,
    }),
    async execute(toolCallId, params, signal, _onUpdate, ctx) {
      try {
        const result = await runMCPTool(
          ctx.cwd,
          "codegraph_callees",
          {
            symbol: params.symbol,
            limit: params.limit ?? 20,
            projectPath: params.projectPath,
          },
          signal
        );
        return {
          content: result.content,
          isError: result.isError,
          details: { tool: "callees", symbol: params.symbol },
        };
      } catch (err) {
        return handleError(err, "callees");
      }
    },
  });

  // ────────────────────────────────────────────────────────────────────────
  // Tool: codegraph_impact
  // ────────────────────────────────────────────────────────────────────────
  pi.registerTool({
    name: "codegraph_impact",
    label: "CodeGraph Impact",
    description: "Analyze the impact radius of changing a symbol",
    promptSnippet: "Analyze impact of changes",
    promptGuidelines: [
      "Use codegraph_impact before making changes to see affected code",
      "Use for: refactor planning, assessing blast radius of modifications",
    ],
    parameters: Type.Object({
      symbol: Type.String({ description: "Symbol to analyze impact for" }),
      depth: Type.Optional(Type.Number({ description: "Dependency traversal depth (default: 2)", default: 2 })),
      projectPath: projectPathProperty,
    }),
    async execute(toolCallId, params, signal, _onUpdate, ctx) {
      try {
        const result = await runMCPTool(
          ctx.cwd,
          "codegraph_impact",
          {
            symbol: params.symbol,
            depth: params.depth ?? 2,
            projectPath: params.projectPath,
          },
          signal
        );
        return {
          content: result.content,
          isError: result.isError,
          details: { tool: "impact", symbol: params.symbol },
        };
      } catch (err) {
        return handleError(err, "impact");
      }
    },
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Tool: codegraph_node
  // ──────────────────────────────────────────────────────────────────────────
  pi.registerTool({
    name: "codegraph_node",
    label: "CodeGraph Node",
    description: "Get detailed information about a specific code symbol",
    promptSnippet: "Get symbol details via CodeGraph",
    promptGuidelines: [
      "Use codegraph_node when you need full source code of a symbol",
      "Set includeCode=true only when needed — it increases token usage",
      "Use codegraph_search first to find the exact symbol name",
    ],
    parameters: Type.Object({
      symbol: Type.String({ description: "Symbol name to get details for" }),
      includeCode: Type.Optional(Type.Boolean({ description: "Include full source code (default: false)", default: false })),
      projectPath: projectPathProperty,
    }),
    async execute(toolCallId, params, signal, _onUpdate, ctx) {
      try {
        const result = await runMCPTool(
          ctx.cwd,
          "codegraph_node",
          {
            symbol: params.symbol,
            includeCode: params.includeCode ?? false,
            projectPath: params.projectPath,
          },
          signal
        );
        return {
          content: result.content,
          isError: result.isError,
          details: { tool: "node", symbol: params.symbol },
        };
      } catch (err) {
        return handleError(err, "node");
      }
    },
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Tool: codegraph_explore
  // ──────────────────────────────────────────────────────────────────────────
  pi.registerTool({
    name: "codegraph_explore",
    label: "CodeGraph Explore",
    description:
      "Deep exploration tool — returns comprehensive context for a topic in a SINGLE call. Groups source code by file with relationship maps.",
    promptSnippet: "Deep exploration via CodeGraph",
    promptGuidelines: [
      "Use codegraph_explore for thorough understanding of unfamiliar topics",
      "Use specific symbol names, file names, or short code terms — NOT natural language sentences",
      "Use codegraph_search first to discover relevant symbol names",
      "Respect the explore budget — don't make more calls than recommended",
    ],
    parameters: Type.Object({
      query: Type.String({
        description:
          'Symbol names, file names, or short code terms to explore. Bad: "how are prompts loaded". Good: "readAgentsFromDirectory createClaudeSession"',
      }),
      maxFiles: Type.Optional(Type.Number({ description: "Maximum files to include source from (default: 12)", default: 12 })),
      projectPath: projectPathProperty,
    }),
    async execute(toolCallId, params, signal, _onUpdate, ctx) {
      try {
        const result = await runMCPTool(
          ctx.cwd,
          "codegraph_explore",
          {
            query: params.query,
            maxFiles: params.maxFiles ?? 12,
            projectPath: params.projectPath,
          },
          signal
        );
        return {
          content: result.content,
          isError: result.isError,
          details: { tool: "explore", query: params.query },
        };
      } catch (err) {
        return handleError(err, "explore");
      }
    },
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Tool: codegraph_status
  // ──────────────────────────────────────────────────────────────────────────
  pi.registerTool({
    name: "codegraph_status",
    label: "CodeGraph Status",
    description: "Get the status of the CodeGraph index — files, nodes, edges, backend type",
    promptSnippet: "Check CodeGraph index status",
    promptGuidelines: [
      "Use codegraph_status to verify the index is ready before other operations",
      "Check backend type — 'wasm' fallback is 5-10x slower than native",
    ],
    parameters: Type.Object({
      projectPath: projectPathProperty,
    }),
    async execute(toolCallId, params, signal, _onUpdate, ctx) {
      try {
        const result = await runMCPTool(
          ctx.cwd,
          "codegraph_status",
          {
            projectPath: params.projectPath,
          },
          signal
        );
        return {
          content: result.content,
          isError: result.isError,
          details: { tool: "status" },
        };
      } catch (err) {
        return handleError(err, "status");
      }
    },
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Tool: codegraph_files
  // ─────────────────────────────────────────────────────────────────────────
  pi.registerTool({
    name: "codegraph_files",
    label: "CodeGraph Files",
    description:
      "Get project file structure from the CodeGraph index. Faster than filesystem scanning. Use FIRST when exploring project structure.",
    promptSnippet: "List project files via CodeGraph",
    promptGuidelines: [
      "Use codegraph_files FIRST when exploring project structure or finding files",
      "Much faster than Glob/filesystem scanning",
      "Use 'tree' format for overview, 'grouped' for language breakdown",
    ],
    parameters: Type.Object({
      path: Type.Optional(Type.String({ description: "Filter to files under this directory (e.g., 'src/components')" })),
      pattern: Type.Optional(Type.String({ description: "Glob pattern filter (e.g., '*.tsx', '**/*.test.ts')" })),
      format: Type.Optional(
        Type.Union([Type.Literal("tree"), Type.Literal("flat"), Type.Literal("grouped")], {
          description: "Output format (default: tree)",
        })
      ),
      includeMetadata: Type.Optional(Type.Boolean({ description: "Include language and symbol count (default: true)", default: true })),
      maxDepth: Type.Optional(Type.Number({ description: "Maximum directory depth" })),
      projectPath: projectPathProperty,
    }),
    async execute(toolCallId, params, signal, _onUpdate, ctx) {
      try {
        const args: Record<string, unknown> = {
          projectPath: params.projectPath,
        };
        if (params.path != null) args.path = params.path;
        if (params.pattern != null) args.pattern = params.pattern;
        if (params.format != null) args.format = params.format;
        if (params.includeMetadata != null) args.includeMetadata = params.includeMetadata;
        if (params.maxDepth != null) args.maxDepth = params.maxDepth;

        const result = await runMCPTool(ctx.cwd, "codegraph_files", args, signal);
        return {
          content: result.content,
          isError: result.isError,
          details: { tool: "files", args },
        };
      } catch (err) {
        return handleError(err, "files");
      }
    },
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Command: codegraph-status
  // ──────────────────────────────────────────────────────────────────────────
  pi.registerCommand("codegraph-status", {
    description: "Check CodeGraph MCP server connectivity",
    handler: async (_args, ctx) => {
      try {
        const result = await runMCPTool(ctx.cwd, "codegraph_status", {});
        const text = result.content.map((c) => c.text).join("\n");
        ctx.ui.notify(`CodeGraph MCP connected.\n${text}`, "success");
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        ctx.ui.notify(`CodeGraph MCP connection failed: ${message}`, "error");
      }
    },
  });
}
