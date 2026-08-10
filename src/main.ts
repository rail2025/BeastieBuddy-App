import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';

const appWindow = getCurrentWindow();
const searchInput = document.getElementById('search-input') as HTMLInputElement;
const resultsContainer = document.getElementById('results-container') as HTMLElement;
const opacityMenu = document.getElementById('opacity-menu') as HTMLElement;
const opacitySlider = document.getElementById('opacity-slider') as HTMLInputElement;
const btnShade = document.getElementById('btn-shade') as HTMLElement;
const titlebar = document.getElementById('titlebar') as HTMLElement;

let waitTimer: number;
let currentRequest: AbortController | null = null;
let isShaded = false;
let originalHeight = 600;
let isPinned = false;
let currentOpacity = "1.0";

searchInput.value = '';

titlebar.addEventListener('mousedown', (e) => {
  if (e.button === 0 && !(e.target as HTMLElement).closest('.window-controls')) {
    appWindow.startDragging();
  }
});

document.getElementById('btn-minimize')?.addEventListener('click', () => appWindow.minimize());
document.getElementById('btn-close')?.addEventListener('click', () => appWindow.close());

document.getElementById('btn-pin')?.addEventListener('click', async (e) => {
  isPinned = !isPinned;
  await appWindow.setAlwaysOnTop(isPinned);
  const target = e.target as HTMLElement;
  target.style.opacity = isPinned ? '1' : '0.5';
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
  document.getElementById('app')!.style.opacity = currentOpacity;
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
        
        const name = document.createElement('span');
        name.className = 'result-name';
        name.textContent = item.Name;
        
        const location = document.createElement('span');
        location.className = 'result-loc';
        location.textContent = `${item.Zone} (~${item.X}, ${item.Y})`;
        
        row.appendChild(name);
        row.appendChild(location);
        resultsContainer.appendChild(row);

        row.addEventListener('click', async () => {
        const mapData = {
        x: item.X,
        y: item.Y,
        zone: item.Zone,
        pinned: isPinned,
        opacity: currentOpacity
        };

        
        const existingMap = await WebviewWindow.getByLabel('map-window');

        if (existingMap) {
            await existingMap.setTitle(`Map - ${item.Zone}`);
            await existingMap.setAlwaysOnTop(isPinned);
            await existingMap.emit('map-update', mapData);
            return;
        }

        const pos = await appWindow.outerPosition();
        const size = await appWindow.outerSize();

        new WebviewWindow('map-window', {
            url:
                `map.html?x=${item.X}` +
                `&y=${item.Y}` +
                `&pinned=${isPinned}` +
                `&opacity=${currentOpacity}` +
                `&zone=${encodeURIComponent(item.Zone)}`,
            title: `Map - ${item.Zone}`,
            width: 500,
            height: 530,
            x: pos.x + size.width + 10,
            y: pos.y,
            decorations: false,
            parent: appWindow.label,
            alwaysOnTop: isPinned
        });
        
      });

      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        resultsContainer.innerHTML = '<div>Server connection failed.</div>';
      }
    }
  }, 500);
});