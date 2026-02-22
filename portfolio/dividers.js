/* ── Section Dividers ──
   Three modes:
   1. "am"      – Animated AM waveform (carrier modulated by envelope)
   2. "digital" – Digital square/clock waveform with data bits
   3. "txrx"    – Tx antenna → propagating wave → Rx antenna */

(function () {
  'use strict';

  var dividers = [];
  var carrierColor = '#3a86ff';
  var modulationColor = '#7b2cbf';

  function initDividers() {
    var elements = document.querySelectorAll('.signal-divider');

    for (var i = 0; i < elements.length; i++) {
      var el = elements[i];
      var canvas = el.querySelector('.divider-canvas');
      var ctx = canvas.getContext('2d', { alpha: true });
      var strength = parseFloat(el.dataset.strength) || 0.2;
      var mode = el.dataset.mode || 'am';

      dividers.push({
        el: el,
        canvas: canvas,
        ctx: ctx,
        strength: strength,
        mode: mode,
        width: 0,
        height: 0,
        scrollProgress: 0
      });
    }

    resizeDividers();
  }

  function resizeDividers() {
    for (var i = 0; i < dividers.length; i++) {
      var d = dividers[i];
      var rect = d.canvas.getBoundingClientRect();
      var dpr = window.devicePixelRatio || 1;
      d.canvas.width = Math.floor(rect.width * dpr);
      d.canvas.height = Math.floor(rect.height * dpr);
      d.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      d.width = rect.width;
      d.height = rect.height;
    }
  }

  function updateScrollProgress(scrollY, viewportHeight) {
    for (var i = 0; i < dividers.length; i++) {
      var d = dividers[i];
      var rect = d.el.getBoundingClientRect();
      var enterPoint = viewportHeight;
      var exitPoint = -rect.height;
      var range = enterPoint - exitPoint;
      if (range > 0) {
        d.scrollProgress = Math.max(0, Math.min(1, (enterPoint - rect.top) / range));
      }
    }
  }

  function drawDividers(time) {
    var t = time * 0.001;

    for (var i = 0; i < dividers.length; i++) {
      var d = dividers[i];
      if (!d.width) continue;

      var rect = d.el.getBoundingClientRect();
      if (rect.bottom < -50 || rect.top > window.innerHeight + 50) continue;

      d.ctx.clearRect(0, 0, d.width, d.height);

      switch (d.mode) {
        case 'am':
          drawAmDivider(d, t);
          break;
        case 'digital':
          drawDigitalDivider(d, t);
          break;
        case 'txrx':
          drawTxRxDivider(d, t);
          break;
      }
    }
  }

  // ── Mode 1: AM Waveform ──
  function drawAmDivider(d, t) {
    var ctx = d.ctx;
    var w = d.width;
    var h = d.height;
    var mid = h / 2;
    var envFreq = 0.008 + d.strength * 0.008;
    var envAmp = 8 + d.strength * 18;
    var carrierFreq = 0.06 + d.strength * 0.08;

    // Envelope lines
    ctx.beginPath();
    var dEnvTop = '';
    var dEnvBot = '';
    for (var x = 0; x <= w; x += 3) {
      var envelope = 8 + envAmp * (0.5 + 0.5 * Math.sin(x * envFreq + t * 0.8));
      var yTop = mid - envelope;
      var yBot = mid + envelope;
      if (x === 0) {
        ctx.moveTo(x, yTop);
      } else {
        ctx.lineTo(x, yTop);
      }
    }
    ctx.strokeStyle = hexToRgba(modulationColor, 0.3);
    ctx.lineWidth = 1.1;
    ctx.stroke();

    ctx.beginPath();
    for (var x2 = 0; x2 <= w; x2 += 3) {
      var env2 = 8 + envAmp * (0.5 + 0.5 * Math.sin(x2 * envFreq + t * 0.8));
      var yBot2 = mid + env2;
      if (x2 === 0) ctx.moveTo(x2, yBot2);
      else ctx.lineTo(x2, yBot2);
    }
    ctx.strokeStyle = hexToRgba(modulationColor, 0.3);
    ctx.lineWidth = 1.1;
    ctx.stroke();

    // AM carrier
    ctx.beginPath();
    for (var x3 = 0; x3 <= w; x3 += 2) {
      var env3 = 8 + envAmp * (0.5 + 0.5 * Math.sin(x3 * envFreq + t * 0.8));
      var am = 1 + 0.58 * Math.sin(x3 * envFreq + t * 0.8);
      var yC = mid + am * env3 * 0.82 * Math.sin(x3 * carrierFreq + t * (1.2 + d.strength * 0.8));
      if (x3 === 0) ctx.moveTo(x3, yC);
      else ctx.lineTo(x3, yC);
    }
    ctx.strokeStyle = hexToRgba(carrierColor, 0.65);
    ctx.lineWidth = 1.4;
    ctx.shadowBlur = 5;
    ctx.shadowColor = hexToRgba(carrierColor, 0.3);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // ── Mode 2: Digital Waveform ──
  function drawDigitalDivider(d, t) {
    var ctx = d.ctx;
    var w = d.width;
    var h = d.height;
    var mid = h / 2;
    var amplitude = h * 0.28;
    var bitWidth = 40 + d.strength * 20;
    var phase = t * 30;

    // Grid lines (faint)
    ctx.strokeStyle = hexToRgba(carrierColor, 0.06);
    ctx.lineWidth = 1;
    for (var gx = 0; gx < w; gx += bitWidth) {
      var gridX = ((gx - phase % bitWidth) + w * 2) % w;
      ctx.beginPath();
      ctx.moveTo(gridX, mid - amplitude - 5);
      ctx.lineTo(gridX, mid + amplitude + 5);
      ctx.stroke();
    }

    // Baseline
    ctx.beginPath();
    ctx.moveTo(0, mid);
    ctx.lineTo(w, mid);
    ctx.strokeStyle = hexToRgba(carrierColor, 0.08);
    ctx.lineWidth = 1;
    ctx.stroke();

    // Digital signal — pseudo-random pattern based on position
    ctx.beginPath();
    var prevHigh = false;
    for (var x = 0; x <= w; x += 1) {
      var shifted = x + phase;
      var bitIndex = Math.floor(shifted / bitWidth);
      // Deterministic "random" from bit index
      var high = (Math.sin(bitIndex * 127.1 + 311.7) > 0.0);
      var y = high ? mid - amplitude : mid + amplitude;

      if (x === 0) {
        ctx.moveTo(x, y);
        prevHigh = high;
      } else if (high !== prevHigh) {
        // Vertical transition
        ctx.lineTo(x, y);
        prevHigh = high;
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.strokeStyle = hexToRgba(carrierColor, 0.6);
    ctx.lineWidth = 1.8;
    ctx.shadowBlur = 6;
    ctx.shadowColor = hexToRgba(carrierColor, 0.25);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Clock signal (smaller, faster, below)
    ctx.beginPath();
    var clockAmp = amplitude * 0.3;
    var clockWidth = bitWidth / 2;
    for (var cx = 0; cx <= w; cx += 1) {
      var cShifted = cx + phase;
      var clockBit = Math.floor(cShifted / clockWidth);
      var clockHigh = clockBit % 2 === 0;
      var cy = mid + amplitude + 12 + (clockHigh ? -clockAmp : clockAmp);
      if (cx === 0) ctx.moveTo(cx, cy);
      else ctx.lineTo(cx, cy);
    }
    ctx.strokeStyle = hexToRgba(modulationColor, 0.35);
    ctx.lineWidth = 1;
    ctx.stroke();

    // "CLK" label
    ctx.font = '9px "Share Tech Mono", monospace';
    ctx.fillStyle = hexToRgba(modulationColor, 0.3);
    ctx.fillText('CLK', 6, mid + amplitude + 12 + clockAmp + 12);

    // "DATA" label
    ctx.fillStyle = hexToRgba(carrierColor, 0.3);
    ctx.fillText('DATA', 6, mid - amplitude - 6);
  }

  // ── Mode 3: Tx → Rx with antennas ──
  function drawTxRxDivider(d, t) {
    var ctx = d.ctx;
    var w = d.width;
    var h = d.height;
    var mid = h / 2;
    var antennaW = 28;
    var antennaH = h * 0.7;
    var txX = 40;
    var rxX = w - 40;
    var waveLeft = txX + antennaW + 10;
    var waveRight = rxX - antennaW - 10;
    var waveSpan = waveRight - waveLeft;
    var amplitude = h * 0.22;
    var cycles = 4.5;
    var freq = cycles / waveSpan;

    // Draw Tx antenna (left side)
    drawAntenna(ctx, txX, mid, antennaW, antennaH, carrierColor, 0.35, true);

    // Draw Rx antenna (right side)
    drawAntenna(ctx, rxX, mid, antennaW, antennaH, carrierColor, 0.25, false);

    // "Tx" / "Rx" labels
    ctx.font = '10px "Share Tech Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = hexToRgba(carrierColor, 0.4);
    ctx.fillText('Tx', txX, mid + antennaH / 2 + 14);
    ctx.fillText('Rx', rxX, mid + antennaH / 2 + 14);
    ctx.textAlign = 'start';

    // Propagating sine wave from Tx to Rx
    // Phase shifts slowly to create rightward-to-leftward propagation illusion
    var phaseShift = t * 1.8;

    ctx.beginPath();
    for (var x = waveLeft; x <= waveRight; x += 2) {
      var normX = (x - waveLeft) / waveSpan;
      // Fade at edges
      var edgeFade = Math.min(normX / 0.08, 1) * Math.min((1 - normX) / 0.08, 1);
      var y = mid + Math.sin((x - waveLeft) * freq * Math.PI * 2 - phaseShift) * amplitude * edgeFade;
      if (x === waveLeft) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = hexToRgba(carrierColor, 0.55);
    ctx.lineWidth = 1.6;
    ctx.shadowBlur = 8;
    ctx.shadowColor = hexToRgba(carrierColor, 0.3);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Propagation ripples from Tx (concentric arcs)
    for (var ring = 0; ring < 3; ring++) {
      var ringPhase = (t * 0.8 + ring * 0.6) % 2.0;
      if (ringPhase > 1.0) continue;
      var ringR = 10 + ringPhase * 50;
      var ringAlpha = (1 - ringPhase) * 0.15;
      ctx.beginPath();
      ctx.arc(txX + antennaW / 2, mid, ringR, -Math.PI * 0.4, Math.PI * 0.4);
      ctx.strokeStyle = hexToRgba(carrierColor, ringAlpha);
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  function drawAntenna(ctx, x, y, w, h, color, alpha, isTx) {
    var topY = y - h / 2;
    var botY = y + h / 2;
    var halfW = w / 2;

    ctx.save();
    ctx.strokeStyle = hexToRgba(color, alpha);
    ctx.lineWidth = 1.5;

    // Vertical mast
    ctx.beginPath();
    ctx.moveTo(x, botY);
    ctx.lineTo(x, topY + h * 0.25);
    ctx.stroke();

    // Dipole arms (V shape)
    ctx.beginPath();
    ctx.moveTo(x - halfW, topY);
    ctx.lineTo(x, topY + h * 0.25);
    ctx.lineTo(x + halfW, topY);
    ctx.stroke();

    // Small circle at feed point
    ctx.beginPath();
    ctx.arc(x, topY + h * 0.25, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = hexToRgba(color, alpha * 0.8);
    ctx.fill();

    // Signal indicator for Tx
    if (isTx) {
      ctx.beginPath();
      ctx.arc(x, topY + h * 0.25, 5, 0, Math.PI * 2);
      ctx.strokeStyle = hexToRgba(color, alpha * 0.5);
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.restore();
  }

  function updatePalette(carrier, modulation) {
    carrierColor = carrier;
    modulationColor = modulation;
  }

  function hexToRgba(color, alpha) {
    if (color.startsWith('rgba') || color.startsWith('rgb')) {
      var match = color.match(/[\d.]+/g);
      if (match && match.length >= 3) {
        return 'rgba(' + match[0] + ',' + match[1] + ',' + match[2] + ',' + alpha + ')';
      }
      return color;
    }
    var cleaned = color.replace('#', '').trim();
    if (cleaned.length !== 6) return 'rgba(58,134,255,' + alpha + ')';
    var r = parseInt(cleaned.slice(0, 2), 16);
    var g = parseInt(cleaned.slice(2, 4), 16);
    var b = parseInt(cleaned.slice(4, 6), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
  }

  window.Dividers = {
    init: initDividers,
    resize: resizeDividers,
    updateScroll: updateScrollProgress,
    draw: drawDividers,
    updatePalette: updatePalette
  };
})();
