# Codex Chat History Exporter for macOS

这是一个面向 **macOS ChatGPT Desktop** 的独立桌面应用，用于把本机 Codex 会话导出为便于阅读和归档的 Markdown 文件。

项目只提供 macOS Electron 桌面应用。

## 参考项目

本项目的初始实现参考了 [Semtea1/codex-chat-history-exporter](https://github.com/Semtea1/codex-chat-history-exporter)，并在此基础上重构为面向 macOS ChatGPT Desktop 的独立桌面应用。

## 功能

- 从 ChatGPT Desktop 的本地会话日志读取聊天记录
- 导出用户消息、助手回复、图片、工具轨迹和隐藏上下文
- 支持阅读版、审计版、取证版导出模式
- 支持按标题、路径、时间和会话关系筛选
- 支持把子会话作为主会话附录导出
- 支持选择 Codex 数据目录和导出目录
- 支持 Apple Silicon 与 Intel Mac 的 Universal DMG/ZIP

## 数据目录

应用优先读取环境变量 `CODEX_HOME` 指向的目录；未设置时使用：

```text
~/.codex
```

ChatGPT Desktop 的会话文件位于该目录下的 `sessions/`。应用只读取会话日志，不修改原始 Codex 数据。

## 本地运行

需要 macOS、Node.js 18+ 和 npm。

```bash
git clone https://github.com/Xnidada/codex-chat-history-exporter-mac.git
cd codex-chat-history-exporter-mac
npm install
npm run desktop:dev
```

## 构建安装包

```bash
npm run desktop:package
```

构建结果位于 `release/`：

- `Codex-Chat-Exporter-Desktop-<version>-universal.dmg`
- `Codex-Chat-Exporter-Desktop-<version>-universal.zip`

当前构建使用 Electron 的临时签名，分发到其他 Mac 时可能需要用户在“系统设置 → 隐私与安全性”中允许打开。

## 开发检查

```bash
npm test
npm run build
```

## 项目结构

```text
src/core/       会话扫描、时间线解析、Markdown 导出
src/desktop/    Electron 主进程、预加载脚本和桌面导出界面
tests/core/     核心逻辑测试
media/          macOS 应用图标
```

## 许可证

MIT
