// @ts-ignore
import './bluemage.css';
import { bluData } from './bluemage-data';
import { htmlTemplate } from './bluemage-layout.ts';

import { loadSaveData, saveSaveData } from './save.ts';

let learnedSet = new Set<number>();

export async function initBlu(container: HTMLElement) {
  container.innerHTML = htmlTemplate;
  
  const saveData = await loadSaveData();
  saveData.spells.forEach((s: number) => learnedSet.add(s));

  setupEventListeners();
  renderList();
}

function setupEventListeners() {
  document.querySelectorAll('input[name="blu-filter"]').forEach(r => {
    r.addEventListener('change', renderList);
  });
  getUIElement('blu-search').addEventListener('input', renderList);
}

import { getUIElement, Spell, SpellSource } from './core-definitions.ts';

function getFilteredSpells(): Spell[] {
  const filterMode = (document.querySelector('input[name="blu-filter"]:checked') as HTMLInputElement).value;
  const filterText = getUIElement<HTMLInputElement>('blu-search').value.toLowerCase();

  return bluData.filter((spell: Spell) => {
    if (filterMode === 'learned' && !learnedSet.has(spell.Number)) return false;
    if (filterMode === 'unlearned' && learnedSet.has(spell.Number)) return false;

    const searchStr = `${spell.Name} ${spell.Sources.map((s: SpellSource) => s.Name + ' ' + s.Location).join(' ')}`.toLowerCase();
    if (filterText && !searchStr.includes(filterText)) return false;
    return true;
  });
}

function buildListItemHtml(spell: Spell, isChecked: boolean): string {
  return `
    <input type="checkbox" ${isChecked ? 'checked' : ''} />
    <span class="blu-list-number">${spell.Number}.</span>
    <span class="blu-list-name">${spell.Name}</span>
  `;
}

function renderList() {
  const leftPane = getUIElement('blu-left');
  leftPane.innerHTML = '';
  const filtered = getFilteredSpells();

  filtered.forEach((spell: Spell) => {
    const el = document.createElement('div');
    el.className = 'blu-list-item';
    el.innerHTML = buildListItemHtml(spell, learnedSet.has(spell.Number));

    el.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT') {
        if ((target as HTMLInputElement).checked) learnedSet.add(spell.Number);
        else learnedSet.delete(spell.Number);
        
        loadSaveData().then(data => {
          saveSaveData(data.beasts, Array.from(learnedSet));
        });

        const currentFilterMode = (document.querySelector('input[name="blu-filter"]:checked') as HTMLInputElement).value;
        if (currentFilterMode !== 'all') renderList();
        return;
      }
      
      document.querySelectorAll('.blu-list-item').forEach(i => i.classList.remove('selected'));
      el.classList.add('selected');
      showDetails(spell);
    });

    leftPane.appendChild(el);
  });
}

function buildDetailsHtml(spell: Spell): string {
  let sourcesHtml = '';
  
  const groupedSources = spell.Sources.reduce((acc: Record<string, SpellSource[]>, curr: SpellSource) => {
    if (!acc[curr.Type]) acc[curr.Type] = [];
    acc[curr.Type].push(curr);
    return acc;
  }, {});

  Object.entries(groupedSources).forEach(([type, sources]: [string, SpellSource[]]) => {
    sourcesHtml += `<div class="blu-source-group"><div class="blu-source-type">${type}</div>`;
    sources.forEach((s: SpellSource) => {
      sourcesHtml += `
        <div class="blu-source-item">
          <div>&bull; Source: ${s.Name}</div>
          <div>&bull; Location: ${s.Location} ${s.X ? `(${s.X}, ${s.Y})` : ''}</div>
          ${s.X ? `<button class="blu-btn-map" data-x="${s.X}" data-y="${s.Y}" data-zone="${s.Location}">Show on Map</button>` : ''}
          ${!s.IsRecommended && s.IsRecommended !== undefined ? `<div class="blu-not-rec">* Not Recommended</div>` : ''}
        </div>
      `;
    });
    sourcesHtml += `</div>`;
  });

  return `
    <div class="blu-detail-header">${spell.Number}. ${spell.Name}</div>
    <div class="blu-detail-rank">Rank: ${spell.Rank}</div>
    <hr class="blu-hr" />
    <div class="blu-sources">${sourcesHtml}</div>
  `;
}

function showDetails(spell: Spell) {
  const rightPane = getUIElement('blu-right');
  rightPane.classList.remove('hidden');
  rightPane.innerHTML = buildDetailsHtml(spell);

  rightPane.querySelectorAll('.blu-btn-map').forEach(btn => {
    btn.addEventListener('click', () => {
      const el = btn as HTMLElement;
      const x = parseFloat(el.dataset.x!);
      const y = parseFloat(el.dataset.y!);
      const zone = el.dataset.zone!;
      window.dispatchEvent(new CustomEvent('open-map', { detail: { x, y, zone } }));
    });
  });
}