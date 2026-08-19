import { getCurrentWindow } from '@tauri-apps/api/window';
import { emit } from '@tauri-apps/api/event';

const appWindow = getCurrentWindow();
const btnClose = document.getElementById('btn-close') as HTMLElement;
const themeCheck = document.getElementById('setting-theme') as HTMLInputElement;
const pinCheck = document.getElementById('setting-pin') as HTMLInputElement;
const opacitySlider = document.getElementById('setting-opacity') as HTMLInputElement;

const urlParams = new URLSearchParams(window.location.search);
if (urlParams.has('opacity')) opacitySlider.value = urlParams.get('opacity')!;
if (urlParams.has('pinned')) pinCheck.checked = urlParams.get('pinned') === 'true';
if (urlParams.has('theme')) themeCheck.checked = urlParams.get('theme') === 'light';

btnClose.addEventListener('click', () => appWindow.close());

document.getElementById('titlebar')?.addEventListener('mousedown', (e) => {
  if (e.button === 0 && !(e.target as HTMLElement).closest('.window-controls')) {
    appWindow.startDragging();
  }
});

async function broadcastSettings() {
  await emit('update-settings', {
    pinned: pinCheck.checked,
    opacity: opacitySlider.value,
    theme: themeCheck.checked ? 'light' : 'dark'
  });
}

themeCheck.addEventListener('change', broadcastSettings);
pinCheck.addEventListener('change', broadcastSettings);
opacitySlider.addEventListener('input', broadcastSettings);