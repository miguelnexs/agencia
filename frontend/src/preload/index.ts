import { contextBridge, ipcRenderer } from 'electron';

const api = {};

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', {
      ipcRenderer: {
        send: (channel: string, ...args: any[]) => ipcRenderer.send(channel, ...args),
        on: (channel: string, func: (...args: any[]) => void) => {
          const subscription = (_event: any, ...args: any[]) => func(...args);
          ipcRenderer.on(channel, subscription);
          return () => ipcRenderer.removeListener(channel, subscription);
        },
        once: (channel: string, func: (...args: any[]) => void) =>
          ipcRenderer.once(channel, (_event: any, ...args: any[]) => func(...args))
      }
    });
    contextBridge.exposeInMainWorld('api', api);
  } catch (error) {
    console.error(error);
  }
} else {
  // @ts-ignore
  window.electron = { ipcRenderer };
  // @ts-ignore
  window.api = api;
}

