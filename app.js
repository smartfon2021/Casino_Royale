'use strict';

// ==============================
// CONSTANTS
// ==============================
const INITIAL_BALANCE = 1000;

const DICE_MULTIPLIERS = {
  2: 30, 3: 15, 4: 10, 5: 7, 6: 6,
  7: 5,
  8: 6, 9: 7, 10: 10, 11: 15, 12: 30
};

const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

const SLOT_SYMBOLS = ['🍒', '🍋', '🔔', '7️⃣', '⭐', '💎'];

const DICE_PIP_POSITIONS = {
  1: [4], 2: [2, 6], 3: [2, 4, 6],
  4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8]
};

// ==============================
// STORAGE MODULE
// ==============================
const Storage = {
  save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
  },
  load(key, fallback) {
    try {
      const val = localStorage.getItem(key);
      return val !== null ? JSON.parse(val) : fallback;
    } catch (_) { return fallback; }
  }
};

// ==============================
// SOUND MODULE
// ==============================
const Sound = (() => {
  let ctx = null;

  function getCtx() {
    if (!ctx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      ctx = new C();
    }
    return ctx;
  }

  function tone(freq, duration, type, startTime) {
    const c = getCtx();
    if (!c) return;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq, startTime);
    gain.gain.setValueAtTime(0.08, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  return {
    click() {
      const c = getCtx();
      if (!c) return;
      tone(800, 0.04, 'sine', c.currentTime);
    },
    win() {
      const c = getCtx();
      if (!c) return;
      const t = c.currentTime;
      tone(523, 0.12, 'square', t);
      tone(659, 0.12, 'square', t + 0.12);
      tone(784, 0.25, 'square', t + 0.24);
    },
    lose() {
      const c = getCtx();
      if (!c) return;
      const t = c.currentTime;
      tone(350, 0.18, 'sawtooth', t);
      tone(250, 0.25, 'sawtooth', t + 0.18);
    },
    spin() {
      const c = getCtx();
      if (!c) return;
      const t = c.currentTime;
      for (let i = 0; i < 8; i++) {
        tone(200 + i * 30, 0.04, 'sine', t + i * 0.06);
      }
    },
    jackpot() {
      const c = getCtx();
      if (!c) return;
      const t = c.currentTime;
      tone(523, 0.1, 'sine', t);
      tone(659, 0.1, 'sine', t + 0.1);
      tone(784, 0.1, 'sine', t + 0.2);
      tone(1047, 0.4, 'sine', t + 0.3);
    }
  };
})();

// ==============================
// GAME STATE MODULE
// ==============================
const Game = (() => {
  let _balance = Storage.load('cr_balance', INITIAL_BALANCE);
  let _record = Storage.load('cr_record', INITIAL_BALANCE);
  let _autoActive = false;

  function save() { Storage.save('cr_balance', _balance); }
  function saveRecord() { Storage.save('cr_record', _record); }

  function updateUI() {
    const el = document.getElementById('balance');
    if (el) el.textContent = formatNumber(_balance);
    const rel = document.getElementById('record');
    if (rel) rel.textContent = formatNumber(_record);
  }

  function formatNumber(n) {
    return Math.floor(n).toLocaleString('ru-RU');
  }

  return {
    get balance() { return _balance; },
    get record() { return _record; },
    get autoActive() { return _autoActive; },
    set autoActive(v) { _autoActive = v; },

    canBet(amount) {
      return Number.isFinite(amount) && amount > 0 && amount <= _balance;
    },

    deduct(amount) {
      _balance -= amount;
      save();
      updateUI();
    },

    addWin(amount) {
      _balance += amount;
      if (_balance > _record) {
        _record = _balance;
        saveRecord();
      }
      save();
      updateUI();
    },

    push(amount) {
      _balance += amount;
      save();
      updateUI();
    },

    reset() {
      _balance = INITIAL_BALANCE;
      save();
      updateUI();
      return _balance;
    },

    formatNumber,
    updateUI
  };
})();

// ==============================
// UI MODULE
// ==============================
const UI = (() => {
  let toastTimer = null;

  function showToast(message, type) {
    const container = document.getElementById('toasts');
    if (!container) return;

    if (toastTimer) clearTimeout(toastTimer);

    container.innerHTML = '';
    const toast = document.createElement('div');
    toast.className = 'toast toast-' + (type || 'info');
    toast.textContent = message;
    container.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => { if (toast.parentNode) toast.remove(); }, 300);
    }, 2800);
  }

  function showConfetti() {
    const colors = ['#ffd700', '#ff1744', '#00e676', '#2979ff', '#ff9100', '#e040fb', '#00e5ff'];
    const container = document.body;

    for (let i = 0; i < 60; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetti';
      piece.style.left = Math.random() * 100 + 'vw';
      piece.style.background = colors[Math.floor(Math.random() * colors.length)];
      piece.style.width = (6 + Math.random() * 6) + 'px';
      piece.style.height = (6 + Math.random() * 6) + 'px';
      piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
      piece.style.animationDuration = (1.5 + Math.random() * 2) + 's';
      piece.style.animationDelay = Math.random() * 0.6 + 's';
      container.appendChild(piece);
      setTimeout(() => { if (piece.parentNode) piece.remove(); }, 4000);
    }
  }

  function switchPanel(id) {
    document.querySelectorAll('.game-panel').forEach(p => p.classList.remove('active'));
    const panel = document.getElementById('panel-' + id);
    if (panel) panel.classList.add('active');
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    const tab = document.querySelector('.tab[data-panel="' + id + '"]');
    if (tab) tab.classList.add('active');
  }

  return { showToast, showConfetti, switchPanel };
})();

// ==============================
// DICE GAME
// ==============================
const Dice = (() => {
  let autoTimer = null;

  function getEl(id) { return document.getElementById(id); }

  function createPips(faceId) {
    const face = getEl(faceId);
    if (!face) return;
    face.innerHTML = '';
    for (let i = 0; i < 9; i++) {
      const pip = document.createElement('div');
      pip.className = 'pip';
      pip.dataset.pos = i;
      face.appendChild(pip);
    }
  }

  function setDieValue(containerId, value) {
    const container = getEl(containerId);
    if (!container) return;
    const pips = container.querySelectorAll('.pip');
    const active = DICE_PIP_POSITIONS[value] || [];
    pips.forEach((pip, i) => {
      pip.classList.toggle('active', active.includes(i));
    });
  }

  function doRoll() {
    const betEl = getEl('dice-bet-amount');
    const predEl = getEl('dice-prediction');
    const resultEl = getEl('dice-result');

    const amount = parseInt(betEl.value);
    const prediction = parseInt(predEl.value);

    if (!amount || amount < 1) { UI.showToast('Введите корректную ставку', 'error'); return; }
    if (!Game.canBet(amount)) { UI.showToast('Недостаточно фишек!', 'error'); return; }
    if (!prediction || prediction < 2 || prediction > 12) { UI.showToast('Сумма должна быть от 2 до 12', 'error'); return; }

    Game.deduct(amount);

    const die1 = getEl('die-1');
    const die2 = getEl('die-2');
    die1.classList.add('shaking');
    die2.classList.add('shaking');
    if (resultEl) resultEl.textContent = '?';
    Sound.spin();

    setTimeout(() => {
      const d1 = Math.floor(Math.random() * 6) + 1;
      const d2 = Math.floor(Math.random() * 6) + 1;
      const sum = d1 + d2;

      setDieValue('die-face-1', d1);
      setDieValue('die-face-2', d2);
      die1.classList.remove('shaking');
      die2.classList.remove('shaking');

      if (resultEl) resultEl.textContent = sum;

      if (sum === prediction) {
        const mult = DICE_MULTIPLIERS[sum] || 1;
        const winAmount = amount * mult;
        Game.addWin(winAmount);
        UI.showToast('🎉 Вы выиграли ' + winAmount + ' фишек! (x' + mult + ')', 'success');
        Sound.win();
      } else {
        UI.showToast('😞 Выпало ' + sum + '. Проигрыш ' + amount + ' фишек.', 'error');
        Sound.lose();
      }
    }, 700);
  }

  function startAuto() {
    if (Game.autoActive) return;
    Game.autoActive = true;
    const btn = getEl('dice-auto-btn');
    let count = 0;
    const max = 10;

    btn.disabled = true;

    function step() {
      if (!Game.autoActive || count >= max) {
        stopAuto(btn);
        return;
      }
      count++;
      btn.textContent = 'Авто ' + count + '/' + max;
      doRoll();
      autoTimer = setTimeout(step, 1300);
    }

    step();
  }

  function stopAuto(btn) {
    Game.autoActive = false;
    if (autoTimer) { clearTimeout(autoTimer); autoTimer = null; }
    const b = btn || getEl('dice-auto-btn');
    if (b) { b.disabled = false; b.textContent = 'Авто x10'; }
  }

  function init() {
    createPips('die-face-1');
    createPips('die-face-2');
    setDieValue('die-face-1', 1);
    setDieValue('die-face-2', 1);

    getEl('dice-roll-btn').addEventListener('click', doRoll);
    getEl('dice-auto-btn').addEventListener('click', startAuto);
  }

  return { init, doRoll };
})();

// ==============================
// ROULETTE GAME
// ==============================
const Roulette = (() => {
  let autoTimer = null;
  let _selectedNumber = null;

  function getEl(id) { return document.getElementById(id); }

  function isRed(n) { return RED_NUMBERS.includes(n); }

  function drawWheel() {
    const canvas = getEl('roulette-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H / 2;
    const R = Math.min(W, H) / 2 - 10;
    const sectors = 37;
    const sectorAngle = (2 * Math.PI) / sectors;

    ctx.clearRect(0, 0, W, H);

    // Outer rings
    ctx.beginPath();
    ctx.arc(cx, cy, R + 6, 0, 2 * Math.PI);
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, R + 2, 0, 2 * Math.PI);
    ctx.strokeStyle = '#8b6914';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const pocketGrad = ctx.createRadialGradient(cx, cy, R * 0.85, cx, cy, R);
    pocketGrad.addColorStop(0, 'rgba(0,0,0,0)');
    pocketGrad.addColorStop(1, 'rgba(0,0,0,0.2)');

    for (let i = 0; i < sectors; i++) {
      const start = -Math.PI / 2 + i * sectorAngle;
      const end = start + sectorAngle;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, R, start, end);
      ctx.closePath();

      if (i === 0) ctx.fillStyle = '#2e7d32';
      else ctx.fillStyle = isRed(i) ? '#c62828' : '#1a1a1a';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 0.5;
      ctx.stroke();

      const mid = start + sectorAngle / 2;
      const tr = R * 0.66;
      const tx = cx + Math.cos(mid) * tr;
      const ty = cy + Math.sin(mid) * tr;

      ctx.save();
      ctx.translate(tx, ty);
      ctx.rotate(mid + Math.PI / 2);
      if (mid > Math.PI / 2 && mid < 3 * Math.PI / 2) {
        ctx.rotate(Math.PI);
      }
      ctx.fillStyle = i === 0 ? '#a5d6a7' : '#f5f5f5';
      ctx.font = 'bold 9px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(i.toString(), 0, 0);
      ctx.restore();
    }

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, 2 * Math.PI);
    ctx.fillStyle = pocketGrad;
    ctx.fill();
    ctx.restore();

    // Center hub
    const grad = ctx.createRadialGradient(cx - 3, cy - 3, 0, cx, cy, R * 0.16);
    grad.addColorStop(0, '#3a3a5c');
    grad.addColorStop(0.7, '#1a1a2e');
    grad.addColorStop(1, '#0d0d1a');
    ctx.beginPath();
    ctx.arc(cx, cy, R * 0.14, 0, 2 * Math.PI);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function createBoard() {
    const board = getEl('roulette-board');
    if (!board) return;
    board.innerHTML = '';

    const grid = document.createElement('div');
    grid.className = 'number-grid';

    // Zero button
    const zeroBtn = document.createElement('button');
    zeroBtn.className = 'num-btn zero green';
    zeroBtn.dataset.num = '0';
    zeroBtn.textContent = '0';
    zeroBtn.addEventListener('click', () => selectNumber(zeroBtn, 0));
    grid.appendChild(zeroBtn);

    // Numbers 1-36 in 3 columns x 12 rows
    for (let row = 0; row < 12; row++) {
      for (let col = 0; col < 3; col++) {
        const num = row * 3 + col + 1;
        const btn = document.createElement('button');
        btn.className = 'num-btn ' + (isRed(num) ? 'red' : 'black');
        btn.dataset.num = num;
        btn.textContent = num;
        btn.addEventListener('click', () => selectNumber(btn, num));
        grid.appendChild(btn);
      }
    }

    board.appendChild(grid);

    // Update bet type appearance
    document.querySelectorAll('.bet-type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.bet-type-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const betType = btn.dataset.bet;
        const numBtns = document.querySelectorAll('.num-btn');
        if (betType === 'number') {
          numBtns.forEach(b => b.style.display = '');
          board.style.display = '';
        } else {
          numBtns.forEach(b => b.style.display = 'none');
          board.style.display = 'none';
        }
      });
    });
  }

  function selectNumber(btn, num) {
    document.querySelectorAll('.num-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    _selectedNumber = num;
    Sound.click();
  }

  function doSpin() {
    const amount = parseInt(getEl('roulette-bet-amount').value);
    if (!amount || amount < 1) { UI.showToast('Введите корректную ставку', 'error'); return; }
    if (!Game.canBet(amount)) { UI.showToast('Недостаточно фишек!', 'error'); return; }

    const activeBet = document.querySelector('.bet-type-btn.active');
    if (!activeBet) { UI.showToast('Выберите тип ставки!', 'error'); return; }

    const betType = activeBet.dataset.bet;
    if (betType === 'number' && _selectedNumber === null) {
      UI.showToast('Выберите число на поле!', 'error');
      return;
    }

    Game.deduct(amount);

    // Spin wheel
    const wheelWrapper = getEl('roulette-wheel-wrapper');
    const result = Math.floor(Math.random() * 37);
    const sectorAngle = 360 / 37;
    const extraSpins = 5 + Math.floor(Math.random() * 3);
    const offset = sectorAngle * (0.1 + Math.random() * 0.8);
    const currentRotation = parseFloat(wheelWrapper.dataset.rotation) || 0;
    const currentSpins = Math.floor(Math.abs(currentRotation) / 360);
    const targetMod = (37 - result) * sectorAngle - offset;
    const totalRotation = (currentSpins + extraSpins) * 360 + targetMod;

    wheelWrapper.style.transition = 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)';
    wheelWrapper.style.transform = 'rotate(' + totalRotation + 'deg)';
    wheelWrapper.dataset.rotation = totalRotation;

    const resultBox = getEl('roulette-result');
    resultBox.innerHTML = '<span class="rr-number" style="color:#888">???</span><span class="rr-label">крутится...</span>';

    Sound.spin();

    setTimeout(() => {
      const color = result === 0 ? 'зелёный' : (isRed(result) ? 'красный' : 'чёрный');
      const colorHex = result === 0 ? '#69f0ae' : (isRed(result) ? '#ff5252' : '#ccc');
      const parity = result === 0 ? '' : (result % 2 === 0 ? ' (чёт)' : ' (нечет)');

      resultBox.innerHTML = '<span class="rr-number" style="color:' + colorHex + '">' + result + '</span>'
        + '<span class="rr-label">' + color + parity + '</span>';

      let win = false;
      let multiplier = 0;

      switch (betType) {
        case 'number':
          if (result === _selectedNumber) { win = true; multiplier = 36; }
          break;
        case 'red':
          if (isRed(result)) { win = true; multiplier = 2; }
          break;
        case 'black':
          if (result !== 0 && !isRed(result)) { win = true; multiplier = 2; }
          break;
        case 'even':
          if (result !== 0 && result % 2 === 0) { win = true; multiplier = 2; }
          break;
        case 'odd':
          if (result !== 0 && result % 2 === 1) { win = true; multiplier = 2; }
          break;
        case 'dozen1':
          if (result >= 1 && result <= 12) { win = true; multiplier = 3; }
          break;
        case 'dozen2':
          if (result >= 13 && result <= 24) { win = true; multiplier = 3; }
          break;
        case 'dozen3':
          if (result >= 25 && result <= 36) { win = true; multiplier = 3; }
          break;
      }

      if (win) {
        const winAmount = amount * multiplier;
        Game.addWin(winAmount);
        UI.showToast('🎉 Выигрыш ' + winAmount + ' фишек! (x' + multiplier + ')', 'success');
        Sound.win();
        if (multiplier >= 10) UI.showConfetti();
      } else {
        UI.showToast('😞 Выпало ' + result + '. Проигрыш.', 'error');
        Sound.lose();
      }
    }, 4200);
  }

  function startAuto() {
    if (Game.autoActive) return;
    Game.autoActive = true;
    const btn = getEl('roulette-auto-btn');
    let count = 0;
    const max = 10;

    btn.disabled = true;

    function step() {
      if (!Game.autoActive || count >= max) {
        stopAuto(btn);
        return;
      }
      count++;
      btn.textContent = 'Авто ' + count + '/' + max;
      doSpin();
      autoTimer = setTimeout(step, 5000);
    }

    step();
  }

  function stopAuto(btn) {
    Game.autoActive = false;
    if (autoTimer) { clearTimeout(autoTimer); autoTimer = null; }
    const b = btn || getEl('roulette-auto-btn');
    if (b) { b.disabled = false; b.textContent = 'Авто x10'; }
  }

  function init() {
    drawWheel();
    createBoard();
    getEl('roulette-spin-btn').addEventListener('click', doSpin);
    getEl('roulette-auto-btn').addEventListener('click', startAuto);
  }

  return { init, doSpin, drawWheel };
})();

// ==============================
// SLOT GAME
// ==============================
const Slots = (() => {
  let autoTimer = null;

  function getEl(id) { return document.getElementById(id); }

  function doSpin() {
    const amount = parseInt(getEl('slot-bet-amount').value);
    if (!amount || amount < 1) { UI.showToast('Введите корректную ставку', 'error'); return; }
    if (!Game.canBet(amount)) { UI.showToast('Недостаточно фишек!', 'error'); return; }

    Game.deduct(amount);

    const result = [
      Math.floor(Math.random() * SLOT_SYMBOLS.length),
      Math.floor(Math.random() * SLOT_SYMBOLS.length),
      Math.floor(Math.random() * SLOT_SYMBOLS.length)
    ];

    const resultEl = getEl('slot-result');
    resultEl.textContent = '⏳ Крутится...';
    Sound.spin();

    // Staggered reel animation
    let stopped = 0;
    for (let i = 0; i < 3; i++) {
      const symEl = getEl('slot-' + (i + 1));
      const interval = setInterval(() => {
        symEl.textContent = SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)];
      }, 50 + i * 10);

      const stopDelay = 600 + i * 350;
      setTimeout(() => {
        clearInterval(interval);
        symEl.textContent = SLOT_SYMBOLS[result[i]];
        stopped++;

        if (stopped === 3) {
          evaluateResult(result, amount);
        }
      }, stopDelay);
    }
  }

  function evaluateResult(result, amount) {
    const [a, b, c] = result;
    const symA = SLOT_SYMBOLS[a];
    const symB = SLOT_SYMBOLS[b];
    const symC = SLOT_SYMBOLS[c];

    const resultEl = getEl('slot-result');

    if (a === b && b === c) {
      const multiplier = symA === '7️⃣' ? 20 : 5;
      const winAmount = amount * multiplier;
      Game.addWin(winAmount);
      resultEl.textContent = '🎉 ДЖЕКПОТ! ' + symA + ' ' + symB + ' ' + symC + ' (+' + winAmount + ')';
      UI.showToast('🎰 Джекпот! ' + winAmount + ' фишек! (x' + multiplier + ')', 'success');
      Sound.jackpot();
      UI.showConfetti();
    } else if (a === b || b === c || a === c) {
      Game.push(amount);
      resultEl.textContent = '🤝 Два совпали — возврат ' + amount + ' фишек';
      UI.showToast('🤝 Два совпадения — возврат ставки', 'info');
      Sound.click();
    } else {
      resultEl.textContent = '😞 Не повезло';
      UI.showToast('😞 Не совпало. Проигрыш ' + amount + ' фишек.', 'error');
      Sound.lose();
    }
  }

  function startAuto() {
    if (Game.autoActive) return;
    Game.autoActive = true;
    const btn = getEl('slot-auto-btn');
    let count = 0;
    const max = 10;

    btn.disabled = true;

    function step() {
      if (!Game.autoActive || count >= max) {
        stopAuto(btn);
        return;
      }
      count++;
      btn.textContent = 'Авто ' + count + '/' + max;
      doSpin();
      autoTimer = setTimeout(step, 2500);
    }

    step();
  }

  function stopAuto(btn) {
    Game.autoActive = false;
    if (autoTimer) { clearTimeout(autoTimer); autoTimer = null; }
    const b = btn || getEl('slot-auto-btn');
    if (b) { b.disabled = false; b.textContent = 'Авто x10'; }
  }

  function init() {
    getEl('slot-spin-btn').addEventListener('click', doSpin);
    getEl('slot-auto-btn').addEventListener('click', startAuto);
  }

  return { init, doSpin };
})();

// ==============================
// APP INIT
// ==============================
document.addEventListener('DOMContentLoaded', () => {

  // Tab switching
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const id = tab.dataset.panel;
      if (Game.autoActive) {
        UI.showToast('Дождитесь окончания авто-игры', 'info');
        return;
      }
      UI.switchPanel(id);
    });
  });

  // Reset button
  document.getElementById('reset-btn').addEventListener('click', () => {
    if (Game.autoActive) {
      UI.showToast('Дождитесь окончания авто-игры', 'info');
      return;
    }
    Game.reset();
    UI.showToast('🔄 Баланс сброшен до ' + Game.formatNumber(INITIAL_BALANCE) + ' фишек', 'info');
  });

  // Init games
  Dice.init();
  Roulette.init();
  Slots.init();

  // Update initial UI
  Game.updateUI();

  console.log('🎰 Casino Royale loaded. Balance:', Game.balance);
  console.log('🏆 Record:', Game.record);
});
