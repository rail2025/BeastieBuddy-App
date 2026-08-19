import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { listen } from '@tauri-apps/api/event';
import { loadSaveData, saveSettingsData } from './save.ts';
import { getUIElement } from './core-definitions.ts';

const appWindow = getCurrentWindow();
const searchInput = getUIElement<HTMLInputElement>('search-input');
const resultsContainer = getUIElement('results-container');
const opacityMenu = getUIElement('opacity-menu');
const opacitySlider = getUIElement<HTMLInputElement>('opacity-slider');
const btnShade = getUIElement('btn-shade');
const titlebar = getUIElement('titlebar');

let waitTimer: number;
let currentRequest: AbortController | null = null;
let isShaded = false;
let originalHeight = 600;
let isPinned = false;
let currentOpacity = "1.0";
let currentTheme = "dark";

loadSaveData().then(async (data) => {
  currentOpacity = data.settings.opacity;
  isPinned = data.settings.pinned;
  currentTheme = data.settings.theme || "dark";
  
  document.documentElement.setAttribute('data-theme', currentTheme);
  getUIElement('app').style.opacity = currentOpacity;
  opacitySlider.value = currentOpacity;
  
  await appWindow.setAlwaysOnTop(isPinned);
  const pinBtn = getUIElement('btn-pin');
  pinBtn.style.opacity = isPinned ? '1' : '0.5';
});

searchInput.value = '';

titlebar.addEventListener('mousedown', (e) => {
  if (e.button === 0 && !(e.target as HTMLElement).closest('.window-controls')) {
    appWindow.startDragging();
  }
});

getUIElement('btn-theme').addEventListener('click', () => {
  currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', currentTheme);
  saveSettingsData({ opacity: currentOpacity, pinned: isPinned, theme: currentTheme });
});

getUIElement('btn-minimize').addEventListener('click', () => appWindow.minimize());
getUIElement('btn-close').addEventListener('click', () => appWindow.close());

listen<{ opacity: string, pinned: boolean, theme: string }>('update-settings', async (event) => {
  currentOpacity = event.payload.opacity;
  getUIElement('app').style.opacity = currentOpacity;
  opacitySlider.value = currentOpacity;
  
  currentTheme = event.payload.theme;
  document.documentElement.setAttribute('data-theme', currentTheme);

  isPinned = event.payload.pinned;
  await appWindow.setAlwaysOnTop(isPinned);
  const pinBtn = getUIElement('btn-pin');
  pinBtn.style.opacity = isPinned ? '1' : '0.5';
  
  saveSettingsData({ opacity: currentOpacity, pinned: isPinned, theme: currentTheme });
});

getUIElement('btn-pin').addEventListener('click', async (e) => {
  isPinned = !isPinned;
  await appWindow.setAlwaysOnTop(isPinned);
  const target = e.target as HTMLElement;
  target.style.opacity = isPinned ? '1' : '0.5';
  
  saveSettingsData({ opacity: currentOpacity, pinned: isPinned, theme: currentTheme });
});

btnShade?.addEventListener('click', async () => {
  isShaded = !isShaded;
  const currentSize = await appWindow.innerSize();
  
  if (isShaded) {
    originalHeight = currentSize.height;
    await appWindow.setSize(new LogicalSize(currentSize.width / window.devicePixelRatio, 30));
    btnShade.classList.add('shaded');
  } else {
    await appWindow.setSize(new LogicalSize(currentSize.width / window.devicePixelRatio, originalHeight / window.devicePixelRatio));
    btnShade.classList.remove('shaded');
  }
});

titlebar.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  opacityMenu.classList.toggle('hidden');
});

document.addEventListener('click', (e) => {
  if (!opacityMenu.contains(e.target as Node) && !titlebar.contains(e.target as Node)) {
    opacityMenu.classList.add('hidden');
  }
});

opacitySlider.addEventListener('input', (e) => {
  currentOpacity = (e.target as HTMLInputElement).value;
  getUIElement('app').style.opacity = currentOpacity;
});

opacitySlider.addEventListener('change', () => {
  saveSettingsData({ opacity: currentOpacity, pinned: isPinned, theme: currentTheme });
});

searchInput.addEventListener('input', (e) => {
  clearTimeout(waitTimer);
  
  if (currentRequest) {
    currentRequest.abort();
  }

  const text = (e.target as HTMLInputElement).value.trim();

  if (text === '') {
    resultsContainer.innerHTML = '';
    return;
  }

  waitTimer = window.setTimeout(async () => {
    currentRequest = new AbortController();
    
    try {
      const response = await fetch(
        `https://aetherdraw-server.onrender.com/beastiebuddy/search?query=${encodeURIComponent(text)}`,
        { signal: currentRequest.signal }
      );
      
      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const data = await response.json();
      resultsContainer.innerHTML = '';
      
      if (!data.results || data.results.length === 0) {
        resultsContainer.innerHTML = '<div class="no-results">No results found.</div>';
        return;
      }
      
      for (const item of data.results) {
        const row = document.createElement('div');
        row.className = 'result-row';
        row.style.cursor = 'pointer';
        
        const coords = item.coordinates?.[0] || {};
        const itemName = item.name || item.Name || 'Unknown';
        const itemZone = item.zone || item.Zone || coords.zone || 'Unknown';
        const itemX = item.x ?? item.X ?? coords.x ?? 1;
        const itemY = item.y ?? item.Y ?? coords.y ?? 1;

        const name = document.createElement('span');
        name.className = 'result-name';
        name.textContent = itemName;
        
        const location = document.createElement('span');
        location.className = 'result-loc';
        location.textContent = `${itemZone} (~${itemX}, ${itemY})`;
        
        row.appendChild(name);
        row.appendChild(location);
        resultsContainer.appendChild(row);

        row.addEventListener('click', async () => {
          await openMapWindow(itemX, itemY, itemZone);
        });

      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        resultsContainer.innerHTML = '<div>Server connection failed.</div>';
      }
    }
  }, 500);
});

async function openMapWindow(x: number, y: number, zone: string) {
  const mapData = { x, y, zone, pinned: isPinned, opacity: currentOpacity };
  const existingMap = await WebviewWindow.getByLabel('map-window');

  if (existingMap) {
    await existingMap.setTitle(`Map - ${zone}`);
    await existingMap.setAlwaysOnTop(isPinned);
    await existingMap.emit('map-update', mapData);
    return;
  }

  const pos = await appWindow.outerPosition();
  const size = await appWindow.outerSize();

  new WebviewWindow('map-window', {
    url: `map.html?x=${x}&y=${y}&pinned=${isPinned}&opacity=${currentOpacity}&zone=${encodeURIComponent(zone)}`,
    title: `Map - ${zone}`,
    width: 500,
    height: 530,
    x: pos.x + size.width + 10,
    y: pos.y,
    decorations: false,
    transparent: true,
    parent: appWindow.label,
    alwaysOnTop: isPinned
  });
}

async function toggleWindow(label: string, url: string, title: string, width: number, height: number) {
  const existing = await WebviewWindow.getByLabel(label);
  if (existing) {
    await existing.close();
    return;
  }
 const pos = await appWindow.outerPosition();
  new WebviewWindow(label, {
    url, title, width, height,
    x: pos.x + 50, y: pos.y + 50,
    decorations: false,
    parent: appWindow.label,
    alwaysOnTop: isPinned
  });
}

getUIElement('btn-settings').addEventListener('click', () => {
  toggleWindow('settings-window', `settings.html?opacity=${currentOpacity}&pinned=${isPinned}&theme=${currentTheme}`, 'Configuration', 340, 210);
});

getUIElement('btn-about').addEventListener('click', () => {
  toggleWindow('about-window', 'about.html', 'About BeastieBuddy', 380, 280);
});

const viewSearch = getUIElement('view-search');
const viewBestiaryV2 = getUIElement('view-bestiary-v2');
const viewBlu = getUIElement('view-blu');
const tabs = document.querySelectorAll('#tabs button');

window.addEventListener('open-map', async (e: any) => {
  const { x, y, zone } = e.detail;
  await openMapWindow(x, y, zone);
});

getUIElement('tab-search').addEventListener('click', async (e) => {
  tabs.forEach(t => t.classList.remove('active'));
  (e.target as HTMLElement).classList.add('active');
  viewSearch.classList.remove('hidden');
  viewBestiaryV2.classList.add('hidden');
  viewBlu.classList.add('hidden');
  await appWindow.setSize(new LogicalSize(600, 400));
});

getUIElement('tab-blu').addEventListener('click', async (e) => {
  await appWindow.setSize(new LogicalSize(900, 750));
  tabs.forEach(t => t.classList.remove('active'));
  (e.target as HTMLElement).classList.add('active');
  viewSearch.classList.add('hidden');
  viewBestiaryV2.classList.add('hidden');
  viewBlu.classList.remove('hidden');

  if (!viewBlu.hasChildNodes()) {
    const module = await import('./bluemage.ts');
    module.initBlu(viewBlu);
  }
});


getUIElement('tab-bestiary-v2').addEventListener('click', async (e) => {
  await appWindow.setSize(new LogicalSize(950, 700));
  tabs.forEach(t => t.classList.remove('active'));
  (e.target as HTMLElement).classList.add('active');
  viewSearch.classList.add('hidden');
  viewBlu.classList.add('hidden');
  viewBestiaryV2.classList.remove('hidden');

  if (!viewBestiaryV2.hasChildNodes()) {
    const module = await import('./bestiary-v2.ts');
    module.initBestiaryV2(viewBestiaryV2);
  }
});