import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { buildChildSessionMap, classifySessionKind, scanSessions } from "../../src/core/session-index";

const tempRoots: string[] = [];

async function writeJsonl(path: string, rows: unknown[]): Promise<void> {
  const content = rows.map((row) => JSON.stringify(row)).join("\n");
  await writeFile(path, `${content}\n`, "utf8");
}

describe("session-index", () => {
  afterEach(async () => {
    const { rm } = await import("node:fs/promises");
    await Promise.all(
      tempRoots.splice(0).map(async (root) => {
        await rm(root, { recursive: true, force: true });
      })
    );
  });

  it("classifies ChatGPT Desktop sessions", () => {
    expect(classifySessionKind("Codex Desktop")).toBe("desktop");
    expect(classifySessionKind("Other")).toBe("unknown");
  });

  it("returns no sessions when the Codex sessions directory is not present", async () => {
    const root = await mkdtemp(join(tmpdir(), "codex-chat-history-"));
    tempRoots.push(root);

    await expect(scanSessions(join(root, ".codex"))).resolves.toEqual([]);
  });

  it("scans session summaries from .codex root", async () => {
    const root = await mkdtemp(join(tmpdir(), "codex-chat-history-"));
    tempRoots.push(root);

    const codexRoot = join(root, ".codex");
    const sessionsDir = join(codexRoot, "sessions", "2026", "03", "24");
    await mkdir(sessionsDir, { recursive: true });

    await writeJsonl(join(codexRoot, "session_index.jsonl"), [
      { id: "desktop-1", thread_name: "Desktop session", updated_at: "2026-03-24T10:00:00Z" }
    ]);

    await writeJsonl(join(codexRoot, "history.jsonl"), [
      { session_id: "desktop-1", ts: 1, text: "Desktop fallback title" }
    ]);

    await writeJsonl(join(sessionsDir, "desktop.jsonl"), [
      {
        timestamp: "2026-03-24T10:00:00Z",
        type: "session_meta",
        payload: {
          id: "desktop-1",
          timestamp: "2026-03-24T10:00:00Z",
          cwd: "C:/work",
          originator: "Codex Desktop",
          source: "exec"
        }
      }
    ]);

    const sessions = await scanSessions(codexRoot);

    expect(sessions.map((item) => item.sessionId)).toEqual(["desktop-1"]);
    expect(sessions[0]?.title).toBe("Desktop session");
    expect(sessions[0]?.kind).toBe("desktop");
    expect(sessions[0]?.firstMessageAt).toBe("2026-03-24T10:00:00Z");
    expect(sessions[0]?.lastMessageAt).toBe("2026-03-24T10:00:00Z");
  });

  it("handles object-valued source metadata", async () => {
    const root = await mkdtemp(join(tmpdir(), "codex-chat-history-"));
    tempRoots.push(root);

    const codexRoot = join(root, ".codex");
    const sessionsDir = join(codexRoot, "sessions", "2026", "03", "24");
    await mkdir(sessionsDir, { recursive: true });

    await writeJsonl(join(sessionsDir, "subagent.jsonl"), [
      {
        timestamp: "2026-03-24T13:00:00Z",
        type: "session_meta",
        payload: {
          id: "desktop-subagent",
          timestamp: "2026-03-24T13:00:00Z",
          cwd: "C:/repo",
          originator: "Codex Desktop",
          source: { subagent: "memory_consolidation" }
        }
      }
    ]);

    const sessions = await scanSessions(codexRoot);

    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.kind).toBe("desktop");
    expect(sessions[0]?.source).toContain("memory_consolidation");
    expect(sessions[0]?.isInternal).toBe(true);
    expect(sessions[0]?.internalCategory).toBe("memory_consolidation");
    expect(sessions[0]?.firstMessageAt).toBe("2026-03-24T13:00:00Z");
  });

  it("extracts parent-child links from subagent sessions", async () => {
    const root = await mkdtemp(join(tmpdir(), "codex-chat-history-"));
    tempRoots.push(root);

    const codexRoot = join(root, ".codex");
    const sessionsDir = join(codexRoot, "sessions", "2026", "03", "24");
    await mkdir(sessionsDir, { recursive: true });

    await writeJsonl(join(sessionsDir, "parent.jsonl"), [
      {
        timestamp: "2026-03-24T11:00:00Z",
        type: "session_meta",
        payload: {
          id: "parent-1",
          timestamp: "2026-03-24T11:00:00Z",
          cwd: "C:/repo",
          originator: "Codex Desktop",
          source: "exec"
        }
      }
    ]);

    await writeJsonl(join(sessionsDir, "child.jsonl"), [
      {
        timestamp: "2026-03-24T11:05:00Z",
        type: "session_meta",
        payload: {
          id: "child-1",
          timestamp: "2026-03-24T11:05:00Z",
          cwd: "C:/repo",
          originator: "Codex Desktop",
          source: {
            subagent: {
              thread_spawn: {
                parent_thread_id: "parent-1",
                depth: 1
              }
            }
          },
          agent_nickname: "Erdos",
          agent_role: "worker"
        }
      }
    ]);

    const sessions = await scanSessions(codexRoot);
    const childSession = sessions.find((session) => session.sessionId === "child-1");
    const parentSession = sessions.find((session) => session.sessionId === "parent-1");

    expect(childSession?.parentSessionId).toBe("parent-1");
    expect(childSession?.internalCategory).toBe("subagent");
    expect(parentSession?.childSessionCount).toBe(1);

    const childMap = buildChildSessionMap(sessions);
    expect(childMap.get("parent-1")?.map((session) => session.sessionId)).toEqual(["child-1"]);
  });

  it("falls back to the first user message when no stored title exists", async () => {
    const root = await mkdtemp(join(tmpdir(), "codex-chat-history-"));
    tempRoots.push(root);

    const codexRoot = join(root, ".codex");
    const sessionsDir = join(codexRoot, "sessions", "2026", "03", "24");
    await mkdir(sessionsDir, { recursive: true });

    await writeJsonl(join(sessionsDir, "untitled.jsonl"), [
      {
        timestamp: "2026-03-24T11:00:00Z",
        type: "session_meta",
        payload: {
          id: "untitled-1",
          timestamp: "2026-03-24T11:00:00Z",
          cwd: "C:/repo",
          originator: "Codex Desktop",
          source: "exec"
        }
      },
      {
        timestamp: "2026-03-24T11:00:01Z",
        type: "event_msg",
        payload: {
          type: "user_message",
          message: "这个会话没有标题，请用我来做标题\n后面还有第二行"
        }
      }
    ]);

    const sessions = await scanSessions(codexRoot);

    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.title).toBe("这个会话没有标题，请用我来做标题");
  });

  it("does not use injected AGENTS wrapper text as fallback title when a real user_message exists later", async () => {
    const root = await mkdtemp(join(tmpdir(), "codex-chat-history-"));
    tempRoots.push(root);

    const codexRoot = join(root, ".codex");
    const sessionsDir = join(codexRoot, "sessions", "2026", "03", "24");
    await mkdir(sessionsDir, { recursive: true });

    await writeJsonl(join(sessionsDir, "real-title.jsonl"), [
      {
        timestamp: "2026-03-24T11:00:00Z",
        type: "session_meta",
        payload: {
          id: "real-title-1",
          timestamp: "2026-03-24T11:00:00Z",
          cwd: "C:/repo",
          originator: "Codex Desktop",
          source: "exec"
        }
      },
      {
        timestamp: "2026-03-24T11:00:00Z",
        type: "response_item",
        payload: {
          type: "message",
          role: "user",
          content: [{ type: "input_text", text: "# AGENTS.md instructions for C:\\repo" }]
        }
      },
      {
        timestamp: "2026-03-24T11:00:01Z",
        type: "event_msg",
        payload: {
          type: "user_message",
          message: "真正的标题应该是这句"
        }
      }
    ]);

    const sessions = await scanSessions(codexRoot);

    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.title).toBe("真正的标题应该是这句");
  });
  it("sanitizes image placeholders in inferred session titles", async () => {
    const root = await mkdtemp(join(tmpdir(), "codex-chat-history-"));
    tempRoots.push(root);

    const codexRoot = join(root, ".codex");
    const sessionsDir = join(codexRoot, "sessions", "2026", "04", "10");
    await mkdir(sessionsDir, { recursive: true });

    await writeJsonl(join(sessionsDir, "desktop-image-title.jsonl"), [
      {
        timestamp: "2026-04-10T02:20:57Z",
        type: "session_meta",
        payload: {
          id: "desktop-image-title-1",
          timestamp: "2026-04-10T02:20:57Z",
          cwd: "C:/repo",
          originator: "Codex Desktop",
          source: "exec"
        }
      },
      {
        timestamp: "2026-04-10T02:20:58Z",
        type: "event_msg",
        payload: {
          type: "user_message",
          message: "修复这个 [Image #1] 警告"
        }
      }
    ]);

    const sessions = await scanSessions(codexRoot);

    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.title).toBe("修复这个 （图片） 警告");
  });
});
