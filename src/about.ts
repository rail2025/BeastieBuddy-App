import { getCurrentWindow } from '@tauri-apps/api/window';
import { openUrl } from '@tauri-apps/plugin-opener';
import { getVersion } from '@tauri-apps/api/app';

const appWindow = getCurrentWindow();

getVersion().then(version => {
  const versionSpan = document.getElementById('app-version');
  if (versionSpan) {
    versionSpan.textContent = version;
  }
});

document.getElementById('btn-close')?.addEventListener('click', () => appWindow.close());

document.getElementById('titlebar')?.addEventListener('mousedown', (e) => {
  if (e.button === 0 && !(e.target as HTMLElement).closest('.window-controls')) {
    appWindow.startDragging();
  }
});

document.querySelectorAll('.repo-link').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const url = (e.target as HTMLElement).getAttribute('data-url');
    if (url) openUrl(url);
  });
});

document.getElementById('btn-bug')?.addEventListener('click', () => {
  openUrl('https://github.com/rail2025/beastiebuddy-app/issues');
});

document.getElementById('btn-donate')?.addEventListener('click', () => {
  openUrl('https://ko-fi.com/rail2025');
});