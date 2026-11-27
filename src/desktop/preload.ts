import { contextBridge, ipcRenderer } from "electron";

const IPC_CHANNEL = "codex-chat-exporter:message";
const webviewState: { value: unknown } = { value: undefined };

function acquireDesktopApi() {
  return {
    postMessage(message: unknown) {
      ipcRenderer.send(IPC_CHANNEL, message);
    },
    setState(value: unknown) {
      webviewState.value = value;
    },
    getState() {
      return webviewState.value;
    }
  };
}

contextBridge.exposeInMainWorld("acquireDesktopApi", acquireDesktopApi);

ipcRenderer.on(IPC_CHANNEL, (_event, message) => {
  window.dispatchEvent(new MessageEvent("message", { data: message }));
});
