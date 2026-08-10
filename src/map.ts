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

if (isPinned) {
    btnPin.style.opacity = '1';
}

function updateFlag(x: number, y: number) {
    const leftPct = ((x - 1) / 40) * 100;
    const topPct = ((y - 1) / 40) * 100;

    flag.style.left = `${leftPct}%`;
    flag.style.top = `${topPct}%`;
}

async function loadMap(zoneName: string) {
    try {
        console.log('[Map] Looking up:', zoneName);

        // Find the TerritoryType whose PlaceName matches the zone.
        const query = `PlaceName.Name="${zoneName}"`;

        const searchUrl =
            `https://v2.xivapi.com/api/search` +
            `?language=en` +
            `&sheets=TerritoryType` +
            `&fields=Map,PlaceName.Name` +
            `&query=${encodeURIComponent(query)}` +
            `&limit=5`;

        const searchResponse = await fetch(searchUrl);
        const searchText = await searchResponse.text();

        if (!searchResponse.ok) {
            throw new Error(
                `Territory search failed: ${searchResponse.status}`
            );
        }

        const searchData = JSON.parse(searchText);

        if (
            !searchData.results ||
            searchData.results.length === 0
        ) {
            throw new Error(
                `No TerritoryType found for "${zoneName}"`
            );
        }

        const territory = searchData.results[0];
        const territoryId = territory.row_id;

        // Get the complete TerritoryType row.
        const territoryUrl =
            `https://v2.xivapi.com/api/sheet/TerritoryType/${territoryId}`;

        const territoryResponse = await fetch(territoryUrl);
        const territoryText = await territoryResponse.text();

        if (!territoryResponse.ok) {
            throw new Error(
                `TerritoryType request failed: ${territoryResponse.status}`
            );
        }

        const territoryData = JSON.parse(territoryText);

        // Extract Map row ID.
        const mapReference =
            territoryData.fields?.Map ??
            territoryData.Map;

        let mapId: number | undefined;

        if (typeof mapReference === 'number') {
            mapId = mapReference;
        } else if (
            mapReference &&
            typeof mapReference.row_id === 'number'
        ) {
            mapId = mapReference.row_id;
        } else if (
            mapReference &&
            typeof mapReference.RowId === 'number'
        ) {
            mapId = mapReference.RowId;
        } else if (
            mapReference &&
            typeof mapReference.value === 'number'
        ) {
            mapId = mapReference.value;
        }

        if (mapId === undefined) {
            throw new Error(
                'Could not determine Map row ID'
            );
        }

        // Get Map row.
        const mapUrl =
            `https://v2.xivapi.com/api/sheet/Map/${mapId}`;

        const mapResponse = await fetch(mapUrl);
        const mapText = await mapResponse.text();

        console.log(
            '[Map] Map status:',
            mapResponse.status
        );

        if (!mapResponse.ok) {
            throw new Error(
                `Map request failed: ${mapResponse.status}`
            );
        }

        const mapData = JSON.parse(mapText);

        // Map.Id is the asset ID
        const mapAssetId =
            mapData.fields?.Id ??
            mapData.fields?.ID ??
            mapData.Id;

        if (
            typeof mapAssetId !== 'string' ||
            !mapAssetId
        ) {
            throw new Error(
                'Map row does not contain a valid Id'
            );
        }

        // XIVAPI v2 map asset endpoint.
        const imageUrl =
            `https://v2.xivapi.com/api/asset/map/${mapAssetId}`;

        mapImg.onload = () => {
            console.log(
                '[Map] Map image loaded successfully'
            );
        };

        mapImg.onerror = () => {
            console.error(
                '[Map] Map image failed to load:',
                imageUrl
            );
        };

        mapImg.src = imageUrl;

    } catch (err) {
        console.error(
            '[Map] Failed:',
            err
        );
    }
}

const initialZone = urlParams.get('zone') ?? '';
const initialX = parseFloat(urlParams.get('x') || '1');
const initialY = parseFloat(urlParams.get('y') || '1');

updateFlag(initialX, initialY);

if (initialZone) {
    loadMap(initialZone);
}

listen<{
    x: number;
    y: number;
    zone: string;
    pinned: boolean;
    opacity: string;
}>('map-update', async (event) => {
    const {
        x,
        y,
        zone,
        pinned,
        opacity
    } = event.payload;

    // Move flag.
    updateFlag(x, y);

    // Update pin state.
    isPinned = pinned;

    await appWindow.setAlwaysOnTop(isPinned);

    btnPin.style.opacity =
        isPinned ? '1' : '0.5';

    // Update opacity.
    mapBody.style.opacity = opacity;

    // Load the new zone into this same window.
    await loadMap(zone);
});

document.getElementById('btn-close')?.addEventListener(
    'click',
    () => {
        appWindow.close();
    }
);

btnPin?.addEventListener(
    'click',
    async (e) => {
        isPinned = !isPinned;

        await appWindow.setAlwaysOnTop(isPinned);

        const target = e.target as HTMLElement;

        target.style.opacity =
            isPinned ? '1' : '0.5';
    }
);

btnShade?.addEventListener(
    'click',
    async () => {
        isShaded = !isShaded;

        const currentSize =
            await appWindow.innerSize();

        if (isShaded) {
            originalHeight = currentSize.height;

            await appWindow.setSize(
                new LogicalSize(
                    currentSize.width /
                        window.devicePixelRatio,
                    30
                )
            );

            btnShade.classList.add('shaded');

        } else {
            await appWindow.setSize(
                new LogicalSize(
                    currentSize.width /
                        window.devicePixelRatio,
                    originalHeight /
                        window.devicePixelRatio
                )
            );

            btnShade.classList.remove('shaded');
        }
    }
);
