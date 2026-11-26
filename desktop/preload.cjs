const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('feedbackDesktop', Object.freeze({
  info: () => ipcRenderer.invoke('feedback:info'),
  sources: () => ipcRenderer.invoke('feedback:sources'),
  select: (id) => ipcRenderer.invoke('feedback:select', id),
  capture: () => ipcRenderer.invoke('feedback:capture'),
  stop: () => ipcRenderer.invoke('feedback:stop'),
  mode: (mode) => ipcRenderer.invoke('feedback:mode', mode),
  load: () => ipcRenderer.invoke('feedback:load'),
  save: (draft) => ipcRenderer.invoke('feedback:save', draft),
  submit: (payload) => ipcRenderer.invoke('feedback:submit', payload),
  onCapture: (listener) => { const handler = (_, frame) => listener(frame); ipcRenderer.on('feedback:captured', handler); return () => ipcRenderer.removeListener('feedback:captured', handler); },
  onError: (listener) => { const handler = (_, message) => listener(message); ipcRenderer.on('feedback:error', handler); return () => ipcRenderer.removeListener('feedback:error', handler); },
}));
