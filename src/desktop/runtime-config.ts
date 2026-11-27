import { join } from "node:path";
import { resolveCodexRoot } from "../core/codex-root";

export interface DesktopRuntimeConfig {
  codexRoot: string;
  defaultOutputDir: string;
  maxSessionsInWizard: number;
}

export function resolveDesktopRuntimeConfig(env: NodeJS.ProcessEnv, documentsDir: string): DesktopRuntimeConfig {
  return {
    codexRoot: resolveCodexRoot(env),
    defaultOutputDir: join(documentsDir, "Codex Chat Exports"),
    maxSessionsInWizard: 1000
  };
}
