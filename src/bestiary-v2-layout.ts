export const htmlTemplate = `
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