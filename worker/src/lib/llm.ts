import Anthropic from "@anthropic-ai/sdk";

export type LLMProvider = "anthropic" | "openrouter" | "gemini";

export interface MCPServer {
  name: string;          // 'hubspot', 'gmail', etc.
  type: "url" | "stdio";
  url?: string;          // for url-type
  command?: string;      // for stdio-type
  args?: string[];
  env?: Record<string, string>;
}

export interface LLMResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  toolsUsed: string[];   // names of tools the model invoked
}

const PROVIDER: LLMProvider = (process.env.LLM_PROVIDER as LLMProvider) || "anthropic";
const anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });

const DEFAULT_MODEL: Record<LLMProvider, string> = {
  anthropic: process.env.ANTHROPIC_AGENT_MODEL || "claude-sonnet-4-6",
  openrouter: process.env.OPENROUTER_MODEL || "anthropic/claude-sonnet-4.5",
  gemini: process.env.GEMINI_MODEL || "gemini-2.5-flash",
};

// Build MCP server config for Anthropic Messages API (mcp_servers param)
function buildAnthropicMCPServers(servers: MCPServer[]): Array<Record<string, unknown>> {
  return servers
    .filter((s) => s.type === "url" && s.url)
    .map((s) => ({
      type: "url",
      url: s.url!,
      name: s.name,
    }));
}

async function callAnthropic(systemPrompt: string, userPrompt: string, model: string, mcpServers: MCPServer[]): Promise<LLMResult> {
  const useMcp = mcpServers.length > 0;
  // Anthropic's MCP integration goes through extra_body.mcp_servers (beta).
  // If no MCP, just call standard messages.
  // deno-lint-ignore no-explicit-any
  const params: any = {
    model,
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  };
  if (useMcp) {
    // Anthropic supports MCP via 'mcp_servers' beta — pass as additional param
    // (Will fall through harmlessly if SDK doesn't recognize it.)
    params.mcp_servers = buildAnthropicMCPServers(mcpServers);
  }
  const response = await anthropicClient.messages.create(params);
  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("\n");
  const toolsUsed = response.content
    .filter((b) => b.type === "tool_use" || (b as { type: string }).type === "mcp_tool_use")
    .map((b) => (b as { name: string }).name)
    .filter(Boolean);
  const inputTokens = response.usage.input_tokens;
  const outputTokens = response.usage.output_tokens;
  const costUsd = (inputTokens / 1_000_000) * 3 + (outputTokens / 1_000_000) * 15;
  return { text, inputTokens, outputTokens, costUsd, toolsUsed };
}

async function callOpenRouter(systemPrompt: string, userPrompt: string, model: string): Promise<LLMResult> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://employtheagent.com",
      "X-Title": "Employ the Agent — Platform",
    },
    body: JSON.stringify({
      model, max_tokens: 1024,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || "";
  const inputTokens = data.usage?.prompt_tokens || 0;
  const outputTokens = data.usage?.completion_tokens || 0;
  const costUsd = data.usage?.total_cost ?? (inputTokens / 1_000_000) * 3 + (outputTokens / 1_000_000) * 15;
  return { text, inputTokens, outputTokens, costUsd, toolsUsed: [] };
}

async function callGemini(systemPrompt: string, userPrompt: string, model: string): Promise<LLMResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GOOGLE_AI_API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: { maxOutputTokens: 1024 },
    }),
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const inputTokens = data.usageMetadata?.promptTokenCount || 0;
  const outputTokens = data.usageMetadata?.candidatesTokenCount || 0;
  const costUsd = (inputTokens / 1_000_000) * 0.075 + (outputTokens / 1_000_000) * 0.3;
  return { text, inputTokens, outputTokens, costUsd, toolsUsed: [] };
}

export async function callLLM(
  systemPrompt: string,
  userPrompt: string,
  mcpServers: MCPServer[] = []
): Promise<LLMResult> {
  const model = DEFAULT_MODEL[PROVIDER];
  switch (PROVIDER) {
    case "openrouter": return callOpenRouter(systemPrompt, userPrompt, model);
    case "gemini": return callGemini(systemPrompt, userPrompt, model);
    case "anthropic":
    default: return callAnthropic(systemPrompt, userPrompt, model, mcpServers);
  }
}

export function getProvider(): LLMProvider { return PROVIDER; }

// Resolve a tenant agent's mcp_tools jsonb config into MCPServer objects.
// Reads endpoint URLs and credentials from env (per-tenant secrets in v2).
export function resolveMCPServers(rawConfig: Array<{ name: string; server_url?: string }>): MCPServer[] {
  return rawConfig.map((c) => {
    // Pull credentials from env: each MCP gets <NAME>_MCP_URL
    const envKey = `${c.name.toUpperCase()}_MCP_URL`;
    return {
      name: c.name,
      type: "url",
      url: c.server_url || process.env[envKey],
    };
  }).filter((s) => !!s.url);
}
