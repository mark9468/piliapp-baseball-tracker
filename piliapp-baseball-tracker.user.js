
// ==UserScript==
// @name         PiliApp 棒球勝率紀錄器
// @namespace    piliapp-baseball-tracker
// @version      2.2.0
// @description  自動記錄勝敗、勝率、連勝連敗、個人最佳紀錄及勝率趨勢
// @match        *://*.piliapp.com/*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  if (!location.pathname.toLowerCase().includes('baseball')) return;
  if (document.getElementById('piliapp-tracker')) return;

  const KEY = 'piliapp_baseball_tracker_v1';
  let data;

  try {
    data = JSON.parse(localStorage.getItem(KEY));
  } catch (e) {}

  if (!data || !Array.isArray(data.history)) {
    data = { wins: 157, losses: 103, history: [] };
  }

  data.wins = Math.max(0, Number(data.wins) || 0);
  data.losses = Math.max(0, Number(data.losses) || 0);
  data.history = data.history.filter(v => v === 'W' || v === 'L');

  const save = () => localStorage.setItem(KEY, JSON.stringify(data));

  function readGameResult() {
    const text = (document.body.innerText || '').replace(/\s+/g, '');

    if (text.includes('你贏了！') || text.includes('你贏了!')) return 'W';
    if (text.includes('AI獲勝') || text.includes('AI获胜')) return 'L';

    return null;
  }

  let autoRecorded = Boolean(readGameResult());

  const panel = document.createElement('div');
  panel.id = 'piliapp-tracker';

  panel.innerHTML = `
    <div id="pt-head">
      <b>⚾ 棒球勝率紀錄器 2.2.0</b>
      <button id="pt-hide">－</button>
    </div>

    <div id="pt-content">
      <div class="pt-stats">
        <div>勝場 <strong id="pt-w">0</strong></div>
        <div>敗場 <strong id="pt-l">0</strong></div>
        <div>總場次 <strong id="pt-total">0</strong></div>
        <div>勝率 <strong id="pt-rate">0%</strong></div>
      </div>

      <div class="pt-streak" id="pt-streak"></div>
      <div id="pt-auto">自動偵測：等待比賽結果</div>

      <div class="pt-buttons">
        <button id="pt-win">🏆 勝利 +1</button>
        <button id="pt-loss">❌ 失敗 +1</button>
      </div>

      <div class="pt-goals" id="pt-goals"></div>

      <div class="pt-actions">
        <button id="pt-undo">↩ 撤銷上一場</button>
        <button id="pt-edit">⚙ 修改起始紀錄</button>
      </div>

      <div id="pt-editor" style="display:none">
        <label>勝場 <input id="pt-ew" type="number" min="0"></label>
        <label>敗場 <input id="pt-el" type="number" min="0"></label>
        <button id="pt-apply">套用起始紀錄並清除歷史</button>
      </div>

      <div class="pt-best">
        <b>🏅 個人最佳紀錄</b>
        <div class="pt-best-grid">
          <div>最高連勝<strong id="pt-best-win">0 場</strong></div>
          <div>最長連敗<strong id="pt-best-loss">0 場</strong></div>
          <div>最高歷史勝率<strong id="pt-best-rate">0%</strong></div>
          <div>累積總勝場<strong id="pt-best-total">0 勝</strong></div>
        </div>
        <div class="pt-note" id="pt-best-note"></div>
      </div>

      <div class="pt-chart">
        <b>📈 勝率趨勢圖</b>

        <div class="pt-chart-tabs">
          <button data-range="20" class="active">20場</button>
          <button data-range="50">50場</button>
          <button data-range="100">100場</button>
          <button data-range="all">全部</button>
        </div>

        <div id="pt-chart-summary"></div>
        <div id="pt-chart-area"></div>
      </div>

      <div class="pt-history">
        <b>最近 10 場</b>
        <div id="pt-history"></div>
      </div>
    </div>
  `;

  const style = document.createElement('style');

  style.textContent = `
    #piliapp-tracker {
      position:fixed;
      z-index:999999;
      right:10px;
      bottom:15px;
      width:290px;
      max-width:calc(100vw - 20px);
      max-height:80vh;
      overflow:hidden;
      background:#fff;
      color:#222;
      border:2px solid #333;
      border-radius:12px;
      box-shadow:0 3px 15px #0004;
      font:14px Arial,sans-serif;
    }

    #pt-head {
      background:#263746;
      color:white;
      padding:10px;
      display:flex;
      justify-content:space-between;
      align-items:center;
    }

    #piliapp-tracker button {
      border:0;
      border-radius:6px;
      padding:8px;
      font-weight:bold;
      cursor:pointer;
    }

    #pt-hide { background:#fff; }

    #pt-content {
      padding:10px;
      max-height:calc(80vh - 42px);
      overflow-y:auto;
    }

    .pt-stats {
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:8px;
      text-align:center;
    }

    .pt-stats div {
      background:#f0f2f4;
      padding:8px;
      border-radius:7px;
    }

    .pt-stats strong {
      display:block;
      font-size:20px;
      margin-top:3px;
    }

    .pt-streak {
      text-align:center;
      padding:10px 0;
      font-weight:bold;
    }

    #pt-auto {
      text-align:center;
      font-size:12px;
      color:#17632a;
      padding:0 0 8px;
    }

    .pt-buttons {
      display:flex;
      gap:8px;
    }

    #pt-win {
      flex:1;
      background:#d9f5df;
      color:#17632a;
    }

    #pt-loss {
      flex:1;
      background:#ffe0e0;
      color:#9b2222;
    }

    .pt-goals {
      line-height:1.8;
      padding:8px 0;
    }

    .pt-actions {
      display:flex;
      gap:6px;
    }

    .pt-actions button {
      flex:1;
      background:#e8edf2;
      font-size:12px;
    }

    #pt-editor { padding:8px 0; }

    #pt-editor label {
      display:flex;
      justify-content:space-between;
      margin:6px 0;
    }

    #pt-editor input {
      width:90px;
      padding:5px;
    }

    #pt-apply {
      width:100%;
      background:#dce9ff;
    }

    .pt-best {
      border-top:1px solid #ddd;
      margin-top:12px;
      padding-top:10px;
    }

    .pt-best-grid {
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:7px;
      margin-top:8px;
    }

    .pt-best-grid div {
      background:#f0f2f4;
      padding:9px 5px;
      border-radius:7px;
      text-align:center;
      font-size:12px;
    }

    .pt-best-grid strong {
      display:block;
      font-size:17px;
      margin-top:5px;
    }

    .pt-note {
      color:#777;
      font-size:11px;
      margin-top:7px;
      line-height:1.5;
    }

    .pt-chart {
      border-top:1px solid #ddd;
      margin-top:12px;
      padding-top:10px;
    }

    .pt-chart-tabs {
      display:flex;
      gap:5px;
      margin:9px 0;
    }

    .pt-chart-tabs button {
      flex:1;
      background:#e8edf2;
      font-size:11px;
      padding:7px 2px;
    }

    .pt-chart-tabs button.active {
      background:#263746;
      color:white;
    }

    #pt-chart-summary {
      text-align:center;
      font-size:12px;
      margin:8px 0;
      font-weight:bold;
    }

    #pt-chart-area {
      width:100%;
      min-height:145px;
      background:#f8f9fa;
      border-radius:7px;
      padding:5px;
      box-sizing:border-box;
    }

    #pt-chart-area svg {
      width:100%;
      display:block;
    }

    .pt-empty {
      text-align:center;
      color:#888;
      padding:35px 5px;
      font-size:12px;
    }

    .pt-history {
      border-top:1px solid #ddd;
      margin-top:12px;
      padding-top:8px;
    }

    #pt-history {
      margin-top:5px;
      color:#555;
      line-height:1.8;
      font-size:12px;
    }
  `;

  document.head.appendChild(style);
  document.body.appendChild(panel);

  const el = id => document.getElementById(id);
  const total = () => data.wins + data.losses;
  const rate = () => total() ? data.wins / total() * 100 : 0;

  let chartRange = '20';

  function getBaseRecord() {
    const historyWins = data.history.filter(v => v === 'W').length;
    const historyLosses = data.history.filter(v => v === 'L').length;

    return {
      wins: Math.max(0, data.wins - historyWins),
      losses: Math.max(0, data.losses - historyLosses)
    };
  }

  function streak() {
    if (!data.history.length) return '尚無本次紀錄的連勝／連敗';

    const last = data.history[data.history.length - 1];
    let count = 0;

    for (let i = data.history.length - 1; i >= 0; i--) {
      if (data.history[i] !== last) break;
      count++;
    }

    return (last === 'W' ? '🔥 連勝 ' : '連敗 ') + count + ' 場';
  }

  function winsNeeded(target) {
    if (rate() >= target) return 0;

    let n = 0;
    while ((data.wins + n) / (total() + n) < target / 100) n++;

    return n;
  }

  function getBestRecords() {
    const base = getBaseRecord();

    let currentWins = base.wins;
    let currentLosses = base.losses;
    let highestRate = currentWins + currentLosses
      ? currentWins / (currentWins + currentLosses) * 100
      : 0;

    let currentStreak = 0;
    let streakType = null;
    let bestWins = 0;
    let bestLosses = 0;

    data.history.forEach(result => {
      if (result === 'W') {
        currentWins++;
        if (streakType === 'W') currentStreak++;
        else {
          streakType = 'W';
          currentStreak = 1;
        }
        bestWins = Math.max(bestWins, currentStreak);
      } else {
        currentLosses++;
        if (streakType === 'L') currentStreak++;
        else {
          streakType = 'L';
          currentStreak = 1;
        }
        bestLosses = Math.max(bestLosses, currentStreak);
      }

      const currentRate = currentWins / (currentWins + currentLosses) * 100;
      highestRate = Math.max(highestRate, currentRate);
    });

    return {
      bestWins,
      bestLosses,
      highestRate,
      totalWins: data.wins
    };
  }

  function renderBest() {
    const best = getBestRecords();

    el('pt-best-win').textContent = best.bestWins + ' 場';
    el('pt-best-loss').textContent = best.bestLosses + ' 場';
    el('pt-best-rate').textContent = best.highestRate.toFixed(2) + '%';
    el('pt-best-total').textContent = best.totalWins + ' 勝';

    el('pt-best-note').textContent =
      '連勝、連敗及最高勝率依目前保存的逐場紀錄計算；舊有未保存的場次無法還原。';
  }

  function getChartData() {
    const base = getBaseRecord();
    const history = data.history;

    if (chartRange === 'all') {
      let w = base.wins;
      let l = base.losses;

      const points = [{
        rate: w + l ? w / (w + l) * 100 : 0,
        label: '起始'
      }];

      history.forEach((result, index) => {
        if (result === 'W') w++;
        else l++;

        points.push({
          rate: w / (w + l) * 100,
          label: index + 1
        });
      });

      return {
        points,
        summary: '完整已保存歷史勝率：' + rate().toFixed(2) + '%'
      };
    }

    const count = Number(chartRange);
    const selected = history.slice(-count);

    if (!selected.length) {
      return {
        points: [],
        summary: '目前尚無逐場紀錄'
      };
    }

    let w = 0;
    let l = 0;

    const points = selected.map((result, index) => {
      if (result === 'W') w++;
      else l++;

      return {
        rate: w / (w + l) * 100,
        label: index + 1
      };
    });

    return {
      points,
      summary: '最近 ' + selected.length + ' 場勝率：' +
        (w / (w + l) * 100).toFixed(2) + '%'
    };
  }

  function drawChart() {
    const result = getChartData();

    el('pt-chart-summary').textContent = result.summary;

    const area = el('pt-chart-area');
    area.innerHTML = '';

    document.querySelectorAll('.pt-chart-tabs button').forEach(button => {
      button.classList.toggle(
        'active',
        button.dataset.range === chartRange
      );
    });

    const points = result.points;

    if (points.length < 2) {
      area.innerHTML = '<div class="pt-empty">累積更多比賽後，就會顯示勝率走勢圖。</div>';
      return;
    }

    const width = 260;
    const height = 135;
    const left = 28;
    const right = 8;
    const top = 10;
    const bottom = 22;

    const plotWidth = width - left - right;
    const plotHeight = height - top - bottom;

    const coordinates = points.map((p, i) => {
      const x = left + (i / (points.length - 1)) * plotWidth;
      const y = top + (1 - p.rate / 100) * plotHeight;

      return { x, y };
    });

    const line = coordinates.map(p => `${p.x},${p.y}`).join(' ');

    let grid = '';

    [0, 25, 50, 75, 100].forEach(value => {
      const y = top + (1 - value / 100) * plotHeight;

      grid += `
        <line x1="${left}" y1="${y}" x2="${width - right}" y2="${y}"
          stroke="#ddd" stroke-width="1"/>
        <text x="${left - 4}" y="${y + 3}"
          text-anchor="end" font-size="9" fill="#777">${value}</text>
      `;
    });

    const first = points[0].rate.toFixed(1);
    const last = points[points.length - 1].rate.toFixed(1);

    area.innerHTML = `
      <svg viewBox="0 0 ${width} ${height}" aria-label="勝率趨勢圖">
        ${grid}
        <polyline
          points="${line}"
          fill="none"
          stroke="#23864b"
          stroke-width="2.5"
          stroke-linejoin="round"
          stroke-linecap="round"
        />
        <circle cx="${coordinates[coordinates.length - 1].x}"
          cy="${coordinates[coordinates.length - 1].y}"
          r="3.5" fill="#23864b"/>
        <text x="${left}" y="${height - 5}"
          font-size="9" fill="#777">起點 ${first}%</text>
        <text x="${width - right}" y="${height - 5}"
          text-anchor="end" font-size="9" fill="#777">目前 ${last}%</text>
      </svg>
    `;
  }

  function render() {
    el('pt-w').textContent = data.wins;
    el('pt-l').textContent = data.losses;
    el('pt-total').textContent = total();
    el('pt-rate').textContent = rate().toFixed(2) + '%';
    el('pt-streak').textContent = streak();

    el('pt-goals').innerHTML = [60, 62, 65, 70].map(t => {
      const n = winsNeeded(t);
      return `${t}% 勝率：${n === 0 ? '已達成 🎉' : '還需要連勝 ' + n + ' 場'}`;
    }).join('<br>');

    el('pt-history').textContent = data.history.length
      ? data.history.slice(-10).reverse().map((v, i) =>
          `${data.history.length - i}. ${v === 'W' ? '🏆 勝利' : '❌ 失敗'}`
        ).join('　')
      : '尚無紀錄';

    renderBest();
    drawChart();
    save();
  }

  function add(result) {
    if (result === 'W') data.wins++;
    else data.losses++;

    data.history.push(result);
    render();
  }

  el('pt-win').onclick = () => {
    add('W');
    if (readGameResult()) autoRecorded = true;
  };

  el('pt-loss').onclick = () => {
    add('L');
    if (readGameResult()) autoRecorded = true;
  };

  el('pt-undo').onclick = () => {
    const last = data.history.pop();

    if (!last) return alert('目前沒有可以撤銷的紀錄');

    if (last === 'W') data.wins--;
    else data.losses--;

    render();
  };

  el('pt-edit').onclick = () => {
    el('pt-editor').style.display =
      el('pt-editor').style.display === 'none' ? 'block' : 'none';

    el('pt-ew').value = data.wins;
    el('pt-el').value = data.losses;
  };

  el('pt-apply').onclick = () => {
    const w = Number(el('pt-ew').value);
    const l = Number(el('pt-el').value);

    if (!Number.isInteger(w) || !Number.isInteger(l) || w < 0 || l < 0) {
      return alert('請輸入有效的非負整數');
    }

    if (!confirm('確定修改起始紀錄？這會清除目前的場次歷史。')) return;

    data = { wins: w, losses: l, history: [] };
    el('pt-editor').style.display = 'none';
    render();
  };

  el('pt-hide').onclick = () => {
    const content = el('pt-content');
    content.style.display =
      content.style.display === 'none' ? 'block' : 'none';
  };

  document.querySelectorAll('.pt-chart-tabs button').forEach(button => {
    button.onclick = () => {
      chartRange = button.dataset.range;
      drawChart();
    };
  });

  render();

  // 自動偵測比賽結果
  function checkAutoResult() {
    const result = readGameResult();

    if (!result) {
      autoRecorded = false;
      el('pt-auto').textContent = '自動偵測：等待比賽結果';
      return;
    }

    if (!autoRecorded) {
      autoRecorded = true;
      add(result);
    }

    el('pt-auto').textContent =
      result === 'W'
        ? '自動偵測：🏆 已記錄勝利'
        : '自動偵測：❌ 已記錄失敗';
  }

  const observer = new MutationObserver(records => {
    const pageChanged = records.some(record =>
      !panel.contains(record.target)
    );

    if (pageChanged) checkAutoResult();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });

  checkAutoResult();
})();
