export const htmlTemplate = `
  <div class="blu-top">
    <input type="text" id="blu-search" placeholder="Search spells..." autocomplete="off" />
    <div class="blu-radios">
      <label><input type="radio" name="blu-filter" value="all" checked> All</label>
      <label><input type="radio" name="blu-filter" value="learned"> Learned</label>
      <label><input type="radio" name="blu-filter" value="unlearned"> Not Learned</label>
    </div>
  </div>
  <div class="blu-split">
    <div id="blu-left"></div>
    <div id="blu-right" class="hidden"></div>
  </div>
`;