export type AgentFilterMode = "only" | "except";

export interface AgentFilter {
  mode: AgentFilterMode;
  agents: string[];
}

const NAME_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/;

function cleanAgents(values: string[]): string[] {
  return [...new Set(values.map((v) => v.trim()).filter((v) => NAME_RE.test(v)))].sort((a, b) =>
    a.localeCompare(b),
  );
}

export function parseAgentFilter(search: string): AgentFilter {
  const params = new URLSearchParams(search);
  const rawAgents = params.getAll("agent").flatMap((value) => value.split(","));
  const mode = params.get("agentMode") === "except" ? "except" : "only";
  return { mode, agents: cleanAgents(rawAgents) };
}

export function agentFilterSearch(filter: AgentFilter): string {
  const params = new URLSearchParams();
  if (filter.agents.length === 0) return "";
  params.set("agent", filter.agents.join(","));
  if (filter.mode === "except") params.set("agentMode", "except");
  return params.toString();
}

export function toggleAgent(filter: AgentFilter, agent: string): AgentFilter {
  const agents = filter.agents.includes(agent)
    ? filter.agents.filter((name) => name !== agent)
    : [...filter.agents, agent];
  return { ...filter, agents: cleanAgents(agents) };
}

export function matchesAgentFilter(senderName: string, filter: AgentFilter): boolean {
  if (filter.agents.length === 0) return true;
  const selected = filter.agents.includes(senderName);
  return filter.mode === "only" ? selected : !selected;
}

export function filterByAgent<T extends { sender: { name: string } }>(items: T[], filter: AgentFilter): T[] {
  if (filter.agents.length === 0) return items;
  return items.filter((item) => matchesAgentFilter(item.sender.name, filter));
}
