import { getCurrentWindow } from '@tauri-apps/api/window';
import { emit } from '@tauri-apps/api/event';

const appWindow = getCurrentWindow();
const btnClose = document.getElementById('btn-close') as HTMLElement;
const pinCheck = document.getElementById('setting-pin') as HTMLInputElement;
const opacitySlider = document.getElementById('setting-opacity') as HTMLInputElement;

const urlParams = new URLSearchParams(window.location.search);
if (urlParams.has('opacity')) opacitySlider.value = urlParams.get('opacity')!;
if (urlParams.has('pinned')) pinCheck.checked = urlParams.get('pinned') === 'true';

btnClose.addEventListener('click', () => appWindow.close());

document.getElementById('titlebar')?.addEventListener('mousedown', (e) => {
  if (e.button === 0 && !(e.target as HTMLElement).closest('.window-controls')) {
    appWindow.startDragging();
  }
});

async function broadcastSettings() {
  await emit('update-settings', {
    pinned: pinCheck.checked,
    opacity: opacitySlider.value
  });
}

pinCheck.addEventListener('change', broadcastSettings);
opacitySlider.addEventListener('input', broadcastSettings);