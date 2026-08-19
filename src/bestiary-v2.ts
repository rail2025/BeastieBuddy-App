import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window';
// @ts-ignore
import './bestiary-v2.css';

const appWindow = getCurrentWindow();
let isExpanded = false;

const htmlTemplate = `
  <div class="bestiary-top">
    <div class="b-journal-title">BEASTMASTER JOURNAL</div>
    <div class="b-progress-row">
      <div class="b-progress-bar-bg"><div class="b-progress-bar-fill" style="width: 0%;"></div></div>
      <div class="b-progress-text">0/0 Captured</div>
    </div>
    <div class="b-journal-subtitle">Novice Tracker</div>
    
    <div class="b-controls">
      <div class="b-radios">
        <label><input type="radio" name="b-filter" value="all" checked> All</label>
        <label><input type="radio" name="b-filter" value="captured"> Captured</label>
        <label><input type="radio" name="b-filter" value="uncaptured"> Uncaptured</label>
        <div class="b-spacer"></div>
        <label><input type="radio" name="b-view" value="list" checked> List</label>
       <label><input type="radio" name="b-view" value="cards"> Cards</label>
      </div>
    </div>
  </div>

  
    <div class="bestiary-left-wrapper">
      <div class="b-search-filter">
        <input type="text" id="bestiary-search" placeholder="Search beasts..." autocomplete="off" />
        <button id="btn-b-filters">Filters...</button>
        
        <div id="b-filter-popup" class="hidden">
          <div class="b-filter-grid">
            <div class="b-filter-col" id="filter-col-elements"><strong>Elements</strong></div>
            <div class="b-filter-col" id="filter-col-class"><strong>Classifications</strong></div>
            <div class="b-filter-col" id="filter-col-status"><strong>Status</strong></div>
          </div>
          <div class="b-filter-actions">
            <button id="b-btn-reset-filters">Reset All</button>
            <button id="b-btn-apply-filters">Apply/Close</button>
          </div>
        </div>
      </div>
      
      <div class="b-pagination-bar">
    <span id="b-page-info">Page 1/1</span>
    <div class="b-page-controls">
      <button id="b-btn-prev">◀</button>
      <button id="b-btn-next">▶</button>
    </div>
  </div>

  <div class="bestiary-split">
    <div id="bestiary-left" class="b-list-mode"></div>
    <div id="bestiary-right" class="hidden">
      <div id="bestiary-placeholder">Select a creature card to view its habitat, abilities, and collection details.</div>
      <div id="bestiary-details" class="hidden"></div>
    </div>
  </div>
`;

const ICONS = [234401, 234402, 234403, 234404, 234405, 234412, 234413, 234414, 234415, 234416, 234417, 234419, 234420, 234421, 234422, 234424, 234429, 234430, 234431, 234432, 234433, 234434, 234435, 234436, 234437, 234439, 234441, 234442, 234443];
const ELEMENTS = ["Fire", "Ice", "Wind", "Earth", "Lightning", "Water", "Slashing", "Blunt", "Piercing"];
const CLASSIFICATIONS = ["Beastkin", "Vilekin", "Cloudkin", "Seedkin", "Wavekin", "Scalekin", "Soulkin", "Ashkin"];
const STATUSES = ["Slow", "Paralyze", "Silence", "Interrupt", "Blind", "Knockdown", "Sleep", "Bind", "Heavy", "Doom", "Death", "Poison", "Petrify"];
const KEYWORDS = [...ELEMENTS, ...CLASSIFICATIONS, ...STATUSES];

const IRREGULARS: Record<string, string> = {
  paralysis: "paralyze", paralyzed: "paralyze", paralyzing: "paralyze",
  petrifies: "petrify", petrified: "petrify", petrification: "petrify",
  muted: "silence", mutes: "silence", silenced: "silence",
  slept: "sleep", bound: "bind"
};

function normalizeKeyword(word: string) {
  const w = word.toLowerCase();
  if (IRREGULARS[w]) return IRREGULARS[w];
  if (w.length < 4) return w;
  if (w.endsWith("ies")) return w.slice(0, -3) + "y";
  if (w.endsWith("ing")) return w.slice(0, -3);
  if (w.endsWith("ed")) return w.slice(0, -2);
  if (w.endsWith("es")) return w.slice(0, -2);
  if (w.endsWith("s")) return w.slice(0, -1);
  return w;
}
import { loadSaveData, saveSaveData } from './save.ts';
import { getUIElement, Beast } from './core-definitions.ts';

let allBeasts: Beast[] = [];
let capturedSet = new Set<string>();
let activeFilters = new Set<string>();
let currentPage = 1;
const itemsPerPage = 25;

export async function initBestiaryV2(container: HTMLElement) {
  container.innerHTML = htmlTemplate;
  buildFilters();
  const leftPane = getUIElement('bestiary-left');
  leftPane.innerHTML = '<div class="b-loading">Loading Bestiary...</div>';

  try {
    const res = await fetch('https://aetherdraw-server.onrender.com/beastiebuddy/bestiary.json');
    const data = await res.json();
    
    allBeasts = Object.entries(data.Beasts).map(([id, beast], index) => {
      return { id, index, ...(beast as any) };
    });

    const saveData = await loadSaveData();
    saveData.beasts.forEach((b: string) => capturedSet.add(b));

    setupEventListeners();
    updateProgress();
    renderData();
  } catch (err) {
    leftPane.innerHTML = '<div class="b-loading">Failed to load data.</div>';
  }
}

function buildFilters() {
  const buildCol = (id: string, items: string[]) => {
    const col = document.getElementById(id)!;
    items.forEach(item => {
      col.insertAdjacentHTML('beforeend', `<label><input type="checkbox" value="${item}"> ${item}</label>`);
    });
  };
  buildCol('filter-col-elements', ELEMENTS);
  buildCol('filter-col-class', CLASSIFICATIONS);
  buildCol('filter-col-status', STATUSES);
}

function setupEventListeners() {
  document.querySelectorAll('input[name="b-view"], input[name="b-filter"]').forEach(r => {
    r.addEventListener('change', () => { currentPage = 1; renderData(); });
  });

  const searchInput = document.getElementById('bestiary-search') as HTMLInputElement;
  searchInput.addEventListener('input', () => { currentPage = 1; renderData(); });

  document.getElementById('b-btn-prev')?.addEventListener('click', () => {
    if (currentPage > 1) { currentPage--; renderData(); }
  });
  document.getElementById('b-btn-next')?.addEventListener('click', () => {
    const totalPages = Math.ceil(getFilteredData().length / itemsPerPage) || 1;
    if (currentPage < totalPages) { currentPage++; renderData(); }
  });

  const filterPopup = document.getElementById('b-filter-popup')!;
  document.getElementById('btn-b-filters')?.addEventListener('click', () => {
    filterPopup.classList.toggle('hidden');
  });

  document.getElementById('b-btn-reset-filters')?.addEventListener('click', () => {
    activeFilters.clear();
    document.querySelectorAll('.b-filter-grid input[type="checkbox"]').forEach(cb => (cb as HTMLInputElement).checked = false);
    currentPage = 1;
    renderData();
  });

  document.getElementById('b-btn-apply-filters')?.addEventListener('click', () => {
    activeFilters.clear();
    document.querySelectorAll('.b-filter-grid input[type="checkbox"]:checked').forEach(cb => {
      activeFilters.add((cb as HTMLInputElement).value.toLowerCase());
    });
    filterPopup.classList.add('hidden');
    currentPage = 1;
    renderData();
  });
}

function escapeHTML(str: string): string {
  return str.replace(/[&<>'"]/g, tag => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[tag] || tag));
}

function highlightKeywords(text: string) {
  if (!text) return '';
  const safeText = escapeHTML(text);
  const map = new Map(KEYWORDS.map(k => [normalizeKeyword(k), k.toLowerCase()]));
  return safeText.replace(/\b[\w'-]+\b/g, m => {
    const k = map.get(normalizeKeyword(m));
    return k ? `<span class="kw-${k}">${m}</span>` : m;
  });
}

function updateProgress() {
  const total = allBeasts.length;
  const caps = capturedSet.size;
  const pct = total === 0 ? 0 : caps / total;

  let rank = "Novice Tracker";
  if (pct >= 0.75) rank = "Living Bestiary";
  else if (pct >= 0.50) rank = "Master Beastmaster";
  else if (pct >= 0.25) rank = "Experienced Hunter";

  document.querySelector('.b-journal-subtitle')!.textContent = rank;
  document.querySelector('.b-progress-text')!.textContent = `${caps}/${total} Captured`;
  (document.querySelector('.b-progress-bar-fill') as HTMLElement).style.width = `${pct * 100}%`;
}

function getFilteredData() {
  const filterMode = (document.querySelector('input[name="b-filter"]:checked') as HTMLInputElement).value;
  const filterText = (document.getElementById('bestiary-search') as HTMLInputElement).value.toLowerCase();

  return allBeasts.filter(b => {
    if (filterMode === 'captured' && !capturedSet.has(b.id)) return false;
    if (filterMode === 'uncaptured' && capturedSet.has(b.id)) return false;

    let searchStr = `${b.Name} ${b.AutoAttackElement} ${b.Trick?.Name} ${b.Trick?.Effect} ${b.TemperedRelease?.Name} ${b.TemperedRelease?.Effect}`.toLowerCase();
    
    searchStr = searchStr.split(/\s+/).map(normalizeKeyword).join(' ');

    if (filterText && !searchStr.includes(filterText)) return false;

    if (activeFilters.size > 0) {
      let match = false;
      for (const f of activeFilters) {
        if (searchStr.includes(f)) { match = true; break; }
      }
      if (!match) return false;
    }
    return true;
  });
}

function renderData() {
  const leftPane = document.getElementById('bestiary-left')!;
  const filtered = getFilteredData();
  
  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  if (currentPage > totalPages) currentPage = totalPages;
  document.getElementById('b-page-info')!.textContent = `Page ${currentPage}/${totalPages}`;

  const startIdx = (currentPage - 1) * itemsPerPage;
  const pageData = filtered.slice(startIdx, startIdx + itemsPerPage);

  const viewMode = (document.querySelector('input[name="b-view"]:checked') as HTMLInputElement).value;
  leftPane.className = viewMode === 'list' ? 'b-list-mode' : 'b-card-mode';
  leftPane.innerHTML = '';

  pageData.forEach(beast => {
    const el = document.createElement('div');
    el.className = viewMode === 'list' ? 'b-list-item' : 'b-card-item';
    const colorClass = `kw-${(beast.AutoAttackElement || '').toLowerCase()}`;
    const iconId = ICONS[beast.index % ICONS.length];
    const iconHtml = `<img src="https://xivapi.com/i/234000/${iconId}.png" style="width: 32px; height: 32px;" onerror="this.style.display='none'"/>`;
    const isChecked = capturedSet.has(beast.id) ? 'checked' : '';

    if (viewMode === 'list') {
      el.innerHTML = `
        <input type="checkbox" class="b-cap-check" data-id="${beast.id}" ${isChecked} />
        ${iconHtml}
        <div class="b-list-name" style="margin-left: 8px;">${beast.id.padStart(2, '0')}. ${beast.Name}</div>
        <div class="b-list-family">Unknown</div>
        <div class="b-list-element ${colorClass}">${beast.AutoAttackElement}</div>
      `;
    } else {
      el.innerHTML = `
        <div class="b-card-top"><span>#${beast.id.padStart(2, '0')}</span><input type="checkbox" class="b-cap-check" data-id="${beast.id}" ${isChecked} /></div>
        <div class="b-card-icon">${iconHtml}</div>
        <div class="b-card-name">${beast.Name}</div>
        <div class="b-card-family">Unknown</div>
        <div class="b-card-element ${colorClass}">${beast.AutoAttackElement}</div>
      `;
    }

    el.addEventListener('click', async (e) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT') {
        const cb = target as HTMLInputElement;
        if (cb.checked) capturedSet.add(beast.id);
        else capturedSet.delete(beast.id);
        updateProgress();

        loadSaveData().then(data => {
          saveSaveData(Array.from(capturedSet), data.spells);
        });
        
        const filterMode = (document.querySelector('input[name="b-filter"]:checked') as HTMLInputElement).value;
        if (filterMode === 'captured' || filterMode === 'uncaptured') {
          renderData();
        }
        return;
      }

      if (el.classList.contains('selected')) {
        el.classList.remove('selected');
        document.getElementById('bestiary-right')?.classList.add('hidden');
        if (isExpanded) {
          await appWindow.setSize(new LogicalSize(460, 600));
          isExpanded = false;
        }
        return;
      }
      
      document.querySelectorAll('.b-list-item, .b-card-item').forEach(i => i.classList.remove('selected'));
      el.classList.add('selected');
      
      document.getElementById('bestiary-right')?.classList.remove('hidden');
      if (!isExpanded) {
        await appWindow.setSize(new LogicalSize(950, 940));
        isExpanded = true;
      }

      showBestiaryDetails(beast.id, beast, colorClass, iconHtml);
    });
    leftPane.appendChild(el);
  });
}

function showBestiaryDetails(id: string, beast: any, colorClass: string, iconHtml: string) {
  document.getElementById('bestiary-placeholder')?.classList.add('hidden');
  const details = document.getElementById('bestiary-details')!;
  details.classList.remove('hidden');

  details.innerHTML = `
    <div class="b-detail-header">No. ${id.padStart(2, '0')} ${beast.Name}</div>
    <div class="b-detail-image-box">${iconHtml.replace('32px', '80px').replace('32px', '80px')}</div>
    <div class="b-detail-box"><span class="b-detail-box-label">Habitat</span> = ${highlightKeywords(beast.Location)}</div>
    <div class="b-detail-box"><span class="b-detail-box-label">Element</span> <span class="${colorClass}">${beast.AutoAttackElement}</span></div>
    <button class="btn-spawn" id="b-btn-spawn">Find Spawn Locations</button>
    
   <div class="b-ability-row"><span class="b-ability-name label-trick">Trick</span><span>${highlightKeywords(beast.Trick?.Name || 'Unknown')}</span></div>
    <div class="b-ability-desc">${highlightKeywords(beast.Trick?.Effect || '')}</div>
    <div class="b-ability-row"><span class="b-ability-name label-release">Tempered Release</span><span>${highlightKeywords(beast.TemperedRelease?.Name || 'Unknown')}</span></div>
    <div class="b-ability-desc">${highlightKeywords(beast.TemperedRelease?.Effect || '')}</div>
    <div class="b-ability-row"><span class="b-ability-name label-borrow">Borrow</span><span>${highlightKeywords(beast.Borrow?.Name || 'Unknown')}</span></div>
    <div class="b-ability-desc">${highlightKeywords(beast.Borrow?.Effect || '')}</div>
    <div class="b-ability-row"><span class="b-ability-name label-parting">Parting Blow</span><span>${highlightKeywords(beast.PartingBlow?.Name || 'Unknown')}</span></div>
    <div class="b-ability-desc">${highlightKeywords(beast.PartingBlow?.Effect || '')}</div>
  `;

  document.getElementById('b-btn-spawn')?.addEventListener('click', () => {
    const searchTab = document.getElementById('tab-search');
    const searchInput = document.getElementById('search-input') as HTMLInputElement;
    if (searchTab && searchInput) {
      searchTab.click();
      searchInput.value = beast.Name;
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
}