import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window';
import { listen } from '@tauri-apps/api/event';

const appWindow = getCurrentWindow();
const urlParams = new URLSearchParams(window.location.search);
const btnShade = document.getElementById('btn-shade') as HTMLElement;
const btnPin = document.getElementById('btn-pin') as HTMLElement;
const mapBody = document.getElementById('map-body') as HTMLElement;
const mapImg = document.getElementById('zone-map-img') as HTMLImageElement;
const flag = document.getElementById('map-flag') as HTMLElement;

let isShaded = false;
let originalHeight = 530;
let isPinned = urlParams.get('pinned') === 'true';

mapBody.style.opacity = urlParams.get('opacity') || '1.0';
if (isPinned) btnPin.style.opacity = '1';

function updateFlag(x: number, y: number) {
  flag.style.left = `${((x - 1) / 40) * 100}%`;
  flag.style.top = `${((y - 1) / 40) * 100}%`;
}

async function loadMap(zoneName: string) {
  try {
    const query = `PlaceName.Name="${zoneName}"`;
    const searchUrl = `https://v2.xivapi.com/api/search?language=en&sheets=TerritoryType&fields=Map,PlaceName.Name&query=${encodeURIComponent(query)}&limit=5`;
    const searchResponse = await fetch(searchUrl);
    if (!searchResponse.ok) throw new Error(`Territory search failed: ${searchResponse.status}`);

    const searchData = JSON.parse(await searchResponse.text());
    if (!searchData.results || searchData.results.length === 0) throw new Error(`No TerritoryType found for "${zoneName}"`);

    const territoryId = searchData.results[0].row_id;
    const territoryResponse = await fetch(`https://v2.xivapi.com/api/sheet/TerritoryType/${territoryId}`);
    if (!territoryResponse.ok) throw new Error(`TerritoryType request failed: ${territoryResponse.status}`);

    const territoryData = JSON.parse(await territoryResponse.text());
    const mapReference = territoryData.fields?.Map ?? territoryData.Map;
    let mapId: number | undefined;

    if (typeof mapReference === 'number') mapId = mapReference;
    else if (mapReference?.row_id && typeof mapReference.row_id === 'number') mapId = mapReference.row_id;
    else if (mapReference?.RowId && typeof mapReference.RowId === 'number') mapId = mapReference.RowId;
    else if (mapReference?.value && typeof mapReference.value === 'number') mapId = mapReference.value;

    if (mapId === undefined) throw new Error('Could not determine Map row ID');

    const mapResponse = await fetch(`https://v2.xivapi.com/api/sheet/Map/${mapId}`);
    if (!mapResponse.ok) throw new Error(`Map request failed: ${mapResponse.status}`);

    const mapData = JSON.parse(await mapResponse.text());
    const mapAssetId = mapData.fields?.Id ?? mapData.fields?.ID ?? mapData.Id;

    if (typeof mapAssetId !== 'string' || !mapAssetId) throw new Error('Map row does not contain a valid Id');

    const imageUrl = `https://v2.xivapi.com/api/asset/map/${mapAssetId}`;
    mapImg.onload = () => console.log('[Map] Map image loaded successfully');
    mapImg.onerror = () => console.error('[Map] Map image failed to load:', imageUrl);
    mapImg.src = imageUrl;
  } catch (err) {
    console.error('[Map] Failed:', err);
  }
}

const initialZone = urlParams.get('zone') ?? '';
const initialX = parseFloat(urlParams.get('x') || '1');
const initialY = parseFloat(urlParams.get('y') || '1');

updateFlag(initialX, initialY);
if (initialZone) loadMap(initialZone);

listen<{ opacity: string; pinned: boolean }>('update-settings', async (event) => {
  isPinned = event.payload.pinned;
  await appWindow.setAlwaysOnTop(isPinned);
  btnPin.style.opacity = isPinned ? '1' : '0.5';
  mapBody.style.opacity = event.payload.opacity;
});

listen<{ x: number; y: number; zone: string; pinned: boolean; opacity: string }>('map-update', async (event) => {
  const { x, y, zone, pinned, opacity } = event.payload;
  updateFlag(x, y);
  isPinned = pinned;
  await appWindow.setAlwaysOnTop(isPinned);
  btnPin.style.opacity = isPinned ? '1' : '0.5';
  mapBody.style.opacity = opacity;
  await loadMap(zone);
});

document.getElementById('btn-close')?.addEventListener('click', () => appWindow.close());

btnPin?.addEventListener('click', async (e) => {
  isPinned = !isPinned;
  await appWindow.setAlwaysOnTop(isPinned);
  (e.target as HTMLElement).style.opacity = isPinned ? '1' : '0.5';
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