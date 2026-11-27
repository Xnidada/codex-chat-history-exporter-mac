import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { resolveCodexRoot } from "../../src/core/codex-root";

describe("resolveCodexRoot", () => {
  it("prefers CODEX_HOME", () => {
    expect(resolveCodexRoot({ CODEX_HOME: "/custom/codex", HOME: "/home/test" })).toBe("/custom/codex");
  });

  it("uses HOME on macOS and other Unix-like systems", () => {
    expect(resolveCodexRoot({ HOME: "/Users/test" })).toBe(join("/Users/test", ".codex"));
  });

  it("supports USERPROFILE when HOME is unavailable", () => {
    expect(resolveCodexRoot({ USERPROFILE: "C:/Users/test" })).toBe(join("C:/Users/test", ".codex"));
  });

  it("falls back to the current working directory", () => {
    expect(resolveCodexRoot({}, "/tmp/project")).toBe(join("/tmp/project", ".codex"));
  });
});
