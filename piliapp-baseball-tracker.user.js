
// ==UserScript==
// @name         PiliApp 棒球勝率紀錄器
// @namespace    piliapp-baseball-tracker
// @version      2.1.0
// @description  自動記錄勝敗、勝率、連勝連敗及目標勝率
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

  const save = () => localStorage.setItem(KEY, JSON.stringify(data));

  function readGameResult() {
    const text = document.body.innerText || '';
    if (text.includes('你贏了！') || text.includes('你贏了!')) return 'W';
    if (text.includes('AI獲勝') || text.includes('AI获胜')) return 'L';
    return null;
  }

  let autoRecorded = Boolean(readGameResult());

  const panel = document.createElement('div');
  panel.id = 'piliapp-tracker';
  panel.innerHTML = `
    <div id="pt-head">
      <b>⚾ 棒球勝率紀錄器</b>
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
      <div class="pt-history">
        <b>最近 10 場</b>
        <div id="pt-history"></div>
      </div>
    </div>
  `;

  const style = document.createElement('style');
  style.textContent = `
    #piliapp-tracker {
      position:fixed; z-index:999999; right:10px; bottom:15px;
      width:270px; max-width:calc(100vw - 20px);
      background:#fff; color:#222; border:2px solid #333;
      border-radius:12px; box-shadow:0 3px 15px #0004;
      font:14px Arial,sans-serif; overflow:hidden;
    }
    #pt-head {
      background:#263746; color:white; padding:10px;
      display:flex; justify-content:space-between; align-items:center;
    }
    #piliapp-tracker button {
      border:0; border-radius:6px; padding:8px;
      font-weight:bold; cursor:pointer;
    }
    #pt-hide { background:#fff; }
    #pt-content { padding:10px; }
    .pt-stats {
      display:grid; grid-template-columns:1fr 1fr;
      gap:8px; text-align:center;
    }
    .pt-stats div {
      background:#f0f2f4; padding:8px; border-radius:7px;
    }
    .pt-stats strong {
      display:block; font-size:20px; margin-top:3px;
    }
    .pt-streak { text-align:center; padding:10px 0; font-weight:bold; }
    #pt-auto {
      text-align:center; font-size:12px; color:#17632a;
      padding:0 0 8px;
    }
    .pt-buttons { display:flex; gap:8px; }
    #pt-win { flex:1; background:#d9f5df; color:#17632a; }
    #pt-loss { flex:1; background:#ffe0e0; color:#9b2222; }
    .pt-goals { line-height:1.8; padding:8px 0; }
    .pt-actions { display:flex; gap:6px; }
    .pt-actions button {
      flex:1; background:#e8edf2; font-size:12px;
    }
    #pt-editor { padding:8px 0; }
    #pt-editor label {
      display:flex; justify-content:space-between; margin:6px 0;
    }
    #pt-editor input { width:90px; padding:5px; }
    #pt-apply { width:100%; background:#dce9ff; }
    .pt-history {
      border-top:1px solid #ddd; margin-top:8px; padding-top:8px;
    }
    #pt-history { margin-top:5px; color:#555; line-height:1.6; }
  `;

  document.head.appendChild(style);
  document.body.appendChild(panel);

  const el = id => document.getElementById(id);
  const total = () => data.wins + data.losses;
  const rate = () => total() ? data.wins / total() * 100 : 0;

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

  render();

  // 忽略紀錄器自己的畫面變動，避免反覆觸發
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
