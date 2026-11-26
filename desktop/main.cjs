const { app, BrowserWindow, desktopCapturer, globalShortcut, ipcMain, screen, session, systemPreferences } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
const { normalizedPoint, allowedURL } = require('./geometry.cjs');
const origin = new URL(process.env.VIBEBOARD_URL || 'http://127.0.0.1:3015').origin;
if (!['127.0.0.1', 'localhost', '[::1]'].includes(new URL(origin).hostname)) throw new Error('VIBEBOARD_URL must be loopback.');
app.commandLine.appendSwitch('enable-features', 'GlobalShortcutsPortal');
let window, selected = null, capturing = false, mini = false, saveChain = Promise.resolve();
const shortcuts = {toggle: 'CommandOrControl+Shift+F', capture: 'CommandOrControl+Shift+A'};
const registered = {};
const draftPath = () => path.join(app.getPath('userData'), 'feedback-draft.json');
function assertSender(event) { if (event.sender !== window?.webContents || event.senderFrame !== window?.webContents.mainFrame || !allowedURL(event.senderFrame?.url, origin)) throw Error('Untrusted desktop request.'); }
function setMode(value) {
  mini = value === 'floating';
  window.setAlwaysOnTop(mini, 'floating');
  window.setMinimumSize(mini ? 420 : 840, mini ? 300 : 600);
  window.setSize(mini ? 500 : 1260, mini ? 460 : 840);
  if (mini && process.env.XDG_SESSION_TYPE !== 'wayland') { const a = screen.getPrimaryDisplay().workArea; window.setPosition(a.x + a.width - 520, a.y + 40); }
  else if (!mini) window.center();
  window.show();
}
async function getSources() {
  const sources = await desktopCapturer.getSources({types: ['screen'], thumbnailSize: {width: 480, height: 300}});
  return sources.map(s => ({id: s.id, name: s.name, displayId: s.display_id, thumbnail: s.thumbnail.toDataURL()}));
}
async function capture(trackPointer = false) {
  if (capturing) throw Error('A screenshot is already being captured.');
  if (!selected) throw Error('Choose a screen first.');
  capturing = true;
  const cursor = screen.getCursorScreenPoint();
  const display = screen.getAllDisplays().find(d => String(d.id) === selected.displayId);
  const wasVisible = window.isVisible();
  try {
    window.hide();
    await new Promise(resolve => setTimeout(resolve, 180));
    const size = display ? {width: Math.round(display.size.width * display.scaleFactor), height: Math.round(display.size.height * display.scaleFactor)} : {width: 2560, height: 1600};
    const sources = await desktopCapturer.getSources({types: ['screen'], thumbnailSize: size});
    const source = sources.find(s => s.id === selected.id);
    if (!source || source.thumbnail.isEmpty()) throw Error('Screen capture unavailable. Allow screen recording in system privacy settings, then restart the companion.');
    return {image: source.thumbnail.toDataURL(), point: trackPointer && display ? normalizedPoint(cursor, display.bounds) : null, capturedAt: new Date().toISOString(), source: selected.name};
  } finally {capturing = false; if (wasVisible) window.showInactive();}
}
function register(channel, fn) { ipcMain.handle(`feedback:${channel}`, (event, ...args) => {assertSender(event); return fn(...args);}); }
if (!app.requestSingleInstanceLock()) app.quit();
else {
app.on('second-instance', () => {window?.show(); window?.focus();});
app.whenReady().then(async () => {
  session.defaultSession.setPermissionCheckHandler((webContents, permission, requestingOrigin) => webContents === window?.webContents && requestingOrigin === origin && permission === 'media');
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback, details) => {
    const trusted = webContents === window?.webContents && allowedURL(details.requestingUrl || webContents.getURL(), origin);
    if (!trusted || permission !== 'media' || details.mediaTypes?.includes('video')) return callback(false);
    if (process.platform === 'darwin') systemPreferences.askForMediaAccess('microphone').then(callback).catch(() => callback(false));
    else callback(true);
  });
  window = new BrowserWindow({width:1260,height:840,minWidth:840,minHeight:600,title:'VibeBoard · Feedback',backgroundColor:'#11151b',webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
  window.webContents.setWindowOpenHandler(() => ({action:'deny'}));
  window.webContents.on('will-navigate', (event, url) => {if (!allowedURL(url, origin)) event.preventDefault();});
  register('info', () => ({platform:process.platform,wayland:process.env.XDG_SESSION_TYPE === 'wayland',shortcuts,registered,origin}));
  register('sources', getSources);
  register('select', async id => {const sources = await getSources(); selected = sources.find(s => s.id === id); if (!selected) throw Error('Screen no longer available.'); return selected;});
  register('capture', () => capture(false));
  register('stop', () => {selected = null;});
  register('mode', mode => {if (!['floating','review'].includes(mode)) throw Error('Invalid window mode'); setMode(mode);});
  register('load', async () => {try {return JSON.parse(await fs.readFile(draftPath(),'utf8'));} catch(error) {if(error.code==='ENOENT') return null; throw Error('Saved draft could not be read. It has not been overwritten.');}});
  register('save', draft => {const text=JSON.stringify(draft); if(text.length > 100*1024*1024) throw Error('Draft exceeds 100 MB. Submit a smaller round.'); const write = saveChain.catch(()=>{}).then(async()=>{await fs.mkdir(path.dirname(draftPath()),{recursive:true}); await fs.writeFile(draftPath()+'.tmp',text,{mode:0o600});await fs.rename(draftPath()+'.tmp',draftPath());}); saveChain=write;return write;});
  register('submit', async payload => {const body=JSON.stringify(payload); if(body.length > 80*1024*1024) throw Error('Package exceeds 80 MB. Split it into smaller rounds.'); const response = await fetch(origin+'/api/vision-feedback',{method:'POST',headers:{'Content-Type':'application/json','Origin':origin},body,signal:AbortSignal.timeout(60000)});const result=await response.json();if(!response.ok) throw Error(result.error || 'Submission failed. Your draft is preserved.');return result;});
  registered.toggle = globalShortcut.register(shortcuts.toggle, () => {window.show();window.focus();});
  registered.capture = globalShortcut.register(shortcuts.capture, async () => {try {window.webContents.send('feedback:captured',await capture(true));} catch(error) {window.webContents.send('feedback:error',error.message);window.show();}});
  await window.loadURL(origin+'/vision/capture');
});
app.on('window-all-closed', () => app.quit());
app.on('will-quit', () => globalShortcut.unregisterAll());
}
