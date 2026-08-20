import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window';
import { listen } from '@tauri-apps/api/event';
import { BaseDirectory, exists, mkdir, readFile, writeFile } from '@tauri-apps/plugin-fs';
import { getUIElement } from './core-definitions.ts';

const appWindow = getCurrentWindow();
const urlParams = new URLSearchParams(window.location.search);
const btnShade = getUIElement('btn-shade');
const btnPin = getUIElement('btn-pin');
const mapBody = getUIElement('map-body');
const mapImg = getUIElement<HTMLImageElement>('zone-map-img');
const flag = getUIElement('map-flag');

let isShaded = false;
let originalHeight = 530;
let isPinned = urlParams.get('pinned') === 'true';

async function applyVisualState(pinned: boolean, opacity: string) {
  isPinned = pinned;
  await appWindow.setAlwaysOnTop(isPinned);
  btnPin.style.opacity = isPinned ? '1' : '0.5';
  mapBody.style.opacity = opacity;
}

applyVisualState(isPinned, urlParams.get('opacity') || '1.0');

function updateFlag(x: number, y: number) {
  flag.style.left = `${((x - 1) / 40) * 100}%`;
  flag.style.top = `${((y - 1) / 40) * 100}%`;
}

let mapTrackingId = 0;

async function loadMap(zoneName: string) {
  const currentId = ++mapTrackingId;
  const spinner = getUIElement('map-spinner');
  spinner.style.display = 'block';

  const searchZone = zoneName.includes(':') ? zoneName.split(':')[1].trim() : zoneName;
  const searchZoneLower = searchZone.toLowerCase();

  try {
    const csvResponse = await fetch('/TerritoryType_Filtered.csv');
    if (!csvResponse.ok) throw new Error('Failed to load local map data');
    const csvText = await csvResponse.text();
    
    let territoryId: number | undefined;
    const lines = csvText.split('\n');
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',');
      if (cols.length >= 4 && (cols[2].trim().toLowerCase() === searchZoneLower || cols[3].trim().toLowerCase() === searchZoneLower)) {
        territoryId = parseInt(cols[0].trim(), 10);
        break;
      }
    }

    if (territoryId === undefined) throw new Error(`No TerritoryType found for "${zoneName}"`);

    const territoryResponse = await fetch(`https://v2.xivapi.com/api/sheet/TerritoryType/${territoryId}`);
    if (!territoryResponse.ok) throw new Error(`TerritoryType request failed: ${territoryResponse.status}`);

    const territoryData = JSON.parse(await territoryResponse.text());
    const mapReference = territoryData.fields?.Map
    let mapId: number | undefined;

    if (typeof mapReference === 'number') mapId = mapReference;
    else if (mapReference?.row_id && typeof mapReference.row_id === 'number') mapId = mapReference.row_id;

    if (mapId === undefined) throw new Error('Could not determine Map row ID');

    const mapResponse = await fetch(`https://v2.xivapi.com/api/sheet/Map/${mapId}`);
    if (!mapResponse.ok) throw new Error(`Map request failed: ${mapResponse.status}`);

    const mapData = JSON.parse(await mapResponse.text());
    const mapAssetId = mapData.fields?.Id ?? mapData.fields?.ID ?? mapData.Id;

    if (typeof mapAssetId !== 'string' || !mapAssetId) throw new Error('Map row does not contain a valid Id');

    const safeMapAssetId = String(mapAssetId).replace(/\//g, '-');
    const cacheDir = 'BeastieBuddy_Map_Download_Cache';
    const fileName = `${cacheDir}/map_${safeMapAssetId}.png`;
    
    const dirExists = await exists(cacheDir, { baseDir: BaseDirectory.AppLocalData });
    if (!dirExists) {await mkdir(cacheDir, { baseDir: BaseDirectory.AppLocalData, recursive: true});
}

    const fileExists = await exists(fileName, { baseDir: BaseDirectory.AppLocalData });
    let imageUrl = '';

    if (fileExists) {
      const fileData = await readFile(fileName, { baseDir: BaseDirectory.AppLocalData });
      const blob = new Blob([fileData], { type: 'image/jpeg' });
      imageUrl = URL.createObjectURL(blob);
    } else {
      const imgResponse = await fetch(`https://v2.xivapi.com/api/asset/map/${mapAssetId}`);
      const buffer = await imgResponse.arrayBuffer();
      await writeFile(fileName, new Uint8Array(buffer), { baseDir: BaseDirectory.AppLocalData });
      const blob = new Blob([buffer], { type: 'image/jpeg' });
      imageUrl = URL.createObjectURL(blob);
    }

    if (currentId !== mapTrackingId) {
      URL.revokeObjectURL(imageUrl);
      return;
    }

    mapImg.onload = () => { spinner.style.display = 'none'; };
    mapImg.onerror = () => { spinner.style.display = 'none'; };
    mapImg.src = imageUrl;

  } catch (err) {
    if (currentId === mapTrackingId) spinner.style.display = 'none';
        alert(`Map failed: ${err}`);
  }
}

const initialZone = urlParams.get('zone') ?? '';
const initialX = parseFloat(urlParams.get('x') || '1');
const initialY = parseFloat(urlParams.get('y') || '1');

updateFlag(initialX, initialY);
if (initialZone) loadMap(initialZone);

listen<{ opacity: string; pinned: boolean }>('update-settings', async (event) => {
  await applyVisualState(event.payload.pinned, event.payload.opacity);
});

listen<{ x: number; y: number; zone: string; pinned: boolean; opacity: string }>('map-update', async (event) => {
  const { x, y, zone, pinned, opacity } = event.payload;
  updateFlag(x, y);
  await applyVisualState(pinned, opacity);
  await loadMap(zone);
});

getUIElement('btn-close').addEventListener('click', () => appWindow.close());

btnPin.addEventListener('click', async (e) => {
  isPinned = !isPinned;
  await appWindow.setAlwaysOnTop(isPinned);
  (e.target as HTMLElement).style.opacity = isPinned ? '1' : '0.5';
});

btnShade.addEventListener('click', async () => {
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