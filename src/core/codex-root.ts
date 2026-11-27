import { join } from "node:path";

export function resolveCodexRoot(env: NodeJS.ProcessEnv, fallbackCwd = process.cwd()): string {
  const configuredRoot = env.CODEX_HOME?.trim();
  if (configuredRoot) {
    return configuredRoot;
  }

  const homeDir = env.HOME?.trim() || env.USERPROFILE?.trim();
  return homeDir ? join(homeDir, ".codex") : join(fallbackCwd, ".codex");
}
