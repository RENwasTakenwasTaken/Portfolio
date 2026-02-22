(function () {
  'use strict';

  var overlay = document.getElementById('signalLoader');
  var canvas = document.getElementById('loaderCanvas');
  var ctx = canvas.getContext('2d', { alpha: false });
  var statusEl = document.getElementById('loaderStatus');
  var meterEl = document.getElementById('loaderMeter');
  var meterBars = meterEl.querySelectorAll('span');
  var fmDial = document.getElementById('fmDial');
  var fmStrip = document.getElementById('fmStrip');

  // ── FM dial config ──
  var FM_START = 87.5;
  var FM_END = 108.0;
  var FM_TARGET = 95.12;
  var TICK_WIDTH = 36;
  var TICK_STEP = 0.1;

  // Build FM strip ticks (0.1 MHz spacing for dense scale)
  (function buildDial() {
    var freq = FM_START;
    while (freq <= FM_END + 0.01) {
      var tick = document.createElement('div');
      tick.className = 'fm-tick';
      if (Math.abs(freq - FM_TARGET) < 0.06) tick.classList.add('target');
      var isMajor = Math.abs(freq - Math.round(freq)) < 0.02;
      var label = '';
      if (isMajor) {
        label = '<span class="fm-tick__label">' + Math.round(freq).toFixed(1) + '</span>';
      }
      tick.innerHTML =
        '<span class="fm-tick__line' + (isMajor ? ' fm-tick__line--major' : '') + '"></span>' +
        label;
      fmStrip.appendChild(tick);
      freq += TICK_STEP;
    }
  })();

  // ── Phase timing (ms) ──
  // 0: scanning    1: carrier lock    2: reconstructing    3: dissolve
  var PHASES = [2200, 2500, 1200, 800];
  var PHASE_ENDS = [];
  var sum = 0;
  for (var i = 0; i < PHASES.length; i++) {
    sum += PHASES[i];
    PHASE_ENDS.push(sum);
  }

  // ── Colors ──
  var CARRIER_RGB = [58, 134, 255];
  var BG = '#0a0e1a';

  var startTime = 0;
  var finished = false;
  var portfolioStarted = false;
  var width = 0;
  var height = 0;

  // ── Canvas setup ──
  function resize() {
    var rect = canvas.getBoundingClientRect();
    var dpr = window.devicePixelRatio || 1;
    width = rect.width;
    height = rect.height;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function getPhase(elapsed) {
    for (var i = 0; i < PHASE_ENDS.length; i++) {
      if (elapsed < PHASE_ENDS[i]) {
        var phaseStart = i === 0 ? 0 : PHASE_ENDS[i - 1];
        return { index: i, progress: (elapsed - phaseStart) / PHASES[i] };
      }
    }
    return { index: PHASES.length, progress: 1 };
  }

  // ── FM dial position ──
  var SCAN_START = FM_TARGET - 2.0;
  var SCAN_END   = FM_TARGET - 0.6;

  function updateDial(phase, progress) {
    var currentFreq;
    if (phase === 0) {
      currentFreq = SCAN_START + (SCAN_END - SCAN_START) * progress;
    } else if (phase === 1) {
      var ease = 1 - Math.pow(1 - progress, 3);
      currentFreq = SCAN_END + (FM_TARGET - SCAN_END) * ease;
    } else {
      currentFreq = FM_TARGET;
    }

    var freqOffset = currentFreq - FM_START;
    var ticksOffset = freqOffset / TICK_STEP;
    var pixelOffset = ticksOffset * TICK_WIDTH;
    var centerOffset = fmDial.clientWidth / 2;
    fmStrip.style.transform = 'translateX(' + (centerOffset - pixelOffset) + 'px)';

    if (phase >= 1 && progress > 0.75) {
      fmDial.classList.add('locked');
    }
  }

  // ── Drawing functions ──
  function drawNoise(intensity) {
    var count = Math.floor(300 * intensity);
    for (var i = 0; i < count; i++) {
      var x = Math.random() * width;
      var y = Math.random() * height;
      var b = 0.15 + Math.random() * 0.25;
      var s = 1 + Math.random() * 1.5;
      ctx.fillStyle = 'rgba(' + CARRIER_RGB[0] + ',' + CARRIER_RGB[1] + ',' + CARRIER_RGB[2] + ',' + (b * intensity) + ')';
      ctx.fillRect(x, y, s, s);
    }
  }

  function drawBaseline(alpha) {
    var cy = height / 2;
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(width, cy);
    ctx.strokeStyle = 'rgba(' + CARRIER_RGB[0] + ',' + CARRIER_RGB[1] + ',' + CARRIER_RGB[2] + ',' + (alpha * 0.15) + ')';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function drawGrid(alpha) {
    ctx.strokeStyle = 'rgba(' + CARRIER_RGB[0] + ',' + CARRIER_RGB[1] + ',' + CARRIER_RGB[2] + ',' + (alpha * 0.06) + ')';
    ctx.lineWidth = 1;
    var gx = width / 10;
    var gy = height / 6;
    for (var x = gx; x < width; x += gx) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
    }
    for (var y = gy; y < height; y += gy) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }
  }

  function drawCarrier(time, cleanness, ampScale) {
    var cy = height / 2;
    var amp = height * 0.22 * ampScale;
    var freq = 2.67;
    var tOff = time * 0.002;
    // Jitter drops sharply as carrier emerges (cubic falloff)
    var jitterFactor = Math.pow(1 - cleanness, 3);
    var jitter = jitterFactor * height * 0.06;

    ctx.beginPath();
    for (var x = 0; x <= width; x += 2) {
      var t = x / width;
      var baseY = Math.sin(t * Math.PI * 2 * freq + tOff);
      var noise = jitter * (Math.random() - 0.5) * 2;
      var y = cy + amp * baseY + noise;
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = 'rgba(' + CARRIER_RGB[0] + ',' + CARRIER_RGB[1] + ',' + CARRIER_RGB[2] + ',' + (0.5 + cleanness * 0.4) + ')';
    ctx.lineWidth = 1.5 + cleanness * 0.5;
    ctx.shadowBlur = cleanness * 8;
    ctx.shadowColor = 'rgba(' + CARRIER_RGB[0] + ',' + CARRIER_RGB[1] + ',' + CARRIER_RGB[2] + ',0.4)';
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // ── HUD ──
  var STATUS_TEXTS = [
    'SCANNING FM BAND...',
    'CARRIER DETECTED  fc = 95.12 MHz',
    'RECONSTRUCTING WEBPAGE...',
    ''
  ];
  var lastPhaseIndex = -1;

  function updateHUD(phaseIndex) {
    if (phaseIndex !== lastPhaseIndex) {
      lastPhaseIndex = phaseIndex;
      if (phaseIndex < STATUS_TEXTS.length && STATUS_TEXTS[phaseIndex]) {
        statusEl.textContent = STATUS_TEXTS[phaseIndex];
      }
      meterBars.forEach(function (bar, i) {
        bar.classList.toggle('active', i <= phaseIndex);
      });
    }
  }

  // ── Main render ──
  function render(time) {
    if (finished) return;

    var elapsed = time - startTime;
    var result = getPhase(elapsed);
    var phase = result.index;
    var progress = result.progress;

    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, width, height);

    if (phase === 0) {
      // Scanning: noise dominant, faint carrier hint late
      drawNoise(1 - progress * 0.25);
      drawBaseline(progress * 0.4);
      drawGrid(progress * 0.25);
      if (progress > 0.6) {
        var hint = (progress - 0.6) / 0.4;
        var hintEased = hint * hint;
        drawCarrier(time, hintEased * 0.25, hintEased * 0.12);
      }
      updateDial(0, progress);
    } else if (phase === 1) {
      var noiseLevel = Math.max(0, 0.4 - progress * 0.8);
      drawNoise(noiseLevel);
      drawGrid(0.25 + progress * 0.75);
      drawBaseline(1);
      var ampScale = 0.12 + progress * 0.48;
      var cleanness = 0.25 + progress * 0.75;
      drawCarrier(time, cleanness, ampScale);
      updateDial(1, progress);
    } else if (phase === 2) {
      // Reconstructing — carrier holds, HUD shows status
      drawGrid(1);
      drawCarrier(time, 1, 0.6);
      updateDial(2, progress);
      // Init portfolio so it renders behind the overlay
      if (!portfolioStarted) {
        portfolioStarted = true;
        document.body.classList.remove('signal-loading');
        document.body.classList.add('signal-loaded');
        if (typeof window.initPortfolio === 'function') {
          window.initPortfolio();
        }
      }
    } else if (phase === 3) {
      // Dissolve — fade entire overlay smoothly
      drawGrid(1);
      drawCarrier(time, 1, 0.6);
      overlay.style.opacity = String(1 - progress);
    } else {
      finish();
      return;
    }

    updateHUD(phase);
    requestAnimationFrame(render);
  }

  function finish() {
    if (finished) return;
    finished = true;
    overlay.style.opacity = '0';
    // Ensure portfolio is started (for skip case)
    if (!portfolioStarted) {
      portfolioStarted = true;
      document.body.classList.remove('signal-loading');
      document.body.classList.add('signal-loaded');
      if (typeof window.initPortfolio === 'function') {
        window.initPortfolio();
      }
    }
    setTimeout(function () {
      overlay.remove();
    }, 600);
  }

  // ── Skip ──
  function skip() { if (!finished) finish(); }
  overlay.addEventListener('click', skip);
  document.addEventListener('keydown', skip, { once: true });

  // ── Init ──
  window.addEventListener('resize', resize);
  resize();
  startTime = performance.now();
  requestAnimationFrame(render);
})();
