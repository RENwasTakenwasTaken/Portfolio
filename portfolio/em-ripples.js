/* ── Electromagnetic Ripple Cursor Effect ──
   Ripple intensity scales with pointer speed:
   - Slow:   1 ring, small radius, low alpha, long interval
   - Medium: 2 rings, medium radius, medium alpha
   - Fast:   3 rings, large radius, high alpha, short interval */

(function () {
  'use strict';

  var ripples = [];
  var MAX_RIPPLES = 8;
  var RIPPLE_LIFE = 1100;

  var lastSpawn = 0;
  var lastMouseX = 0;
  var lastMouseY = 0;
  var minMoveDist = 8;

  var cardCentersRef = null;

  // speed is in px/ms from script.js pointer.speed
  function spawnRipple(x, y, speed) {
    var now = performance.now();
    var spd = speed || 0;

    // Dynamic spawn interval: fast = 130ms, medium = 240ms, slow = 480ms
    var interval = spd > 1.0 ? 130 : spd > 0.3 ? 240 : 480;
    if (now - lastSpawn < interval) return;

    var dx = x - lastMouseX;
    var dy = y - lastMouseY;
    if (Math.sqrt(dx * dx + dy * dy) < minMoveDist && ripples.length > 0) return;

    lastSpawn = now;
    lastMouseX = x;
    lastMouseY = y;

    // Per-ripple properties baked in at spawn time
    var rings    = spd > 1.0 ? 3 : spd > 0.3 ? 2 : 1;
    var maxR     = spd > 1.0 ? 200 : spd > 0.3 ? 130 : 72;
    var aScale   = spd > 1.0 ? 0.48 : spd > 0.3 ? 0.32 : 0.18;

    ripples.push({
      x: x, y: y,
      born: now,
      life: RIPPLE_LIFE,
      hitCards: {},
      rings: rings,
      maxR: maxR,
      aScale: aScale
    });

    if (ripples.length > MAX_RIPPLES) {
      ripples.shift();
    }
  }

  function drawRipples(ctx, time, carrierColor, glowColor, cardCenters) {
    if (ripples.length === 0) return;

    cardCentersRef = cardCenters;
    ctx.save();

    for (var i = ripples.length - 1; i >= 0; i--) {
      var ripple = ripples[i];
      var age = time - ripple.born;

      if (age >= ripple.life) {
        ripples.splice(i, 1);
        continue;
      }

      var progress = age / ripple.life;
      var eased = 1 - Math.pow(1 - progress, 2);

      for (var ring = 0; ring < ripple.rings; ring++) {
        var ringDelay = ring * 0.15;
        var ringProgress = Math.max(0, eased - ringDelay);
        if (ringProgress <= 0) continue;

        var radius = ringProgress * ripple.maxR;
        var fadeStart = 0.3;
        var alpha;
        if (progress < fadeStart) {
          alpha = progress / fadeStart;
        } else {
          alpha = 1 - (progress - fadeStart) / (1 - fadeStart);
        }
        alpha *= ripple.aScale * (1 - ring * 0.22);
        if (alpha <= 0) continue;

        ctx.beginPath();
        ctx.arc(ripple.x, ripple.y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = hexToRgba(carrierColor, alpha);
        ctx.lineWidth = 1.3 - ring * 0.3;
        ctx.shadowBlur = 7 - ring * 2;
        ctx.shadowColor = glowColor;
        ctx.stroke();

        checkCardHits(ripple, radius, ring, time);
      }
    }

    ctx.shadowBlur = 0;
    ctx.restore();
  }

  function checkCardHits(ripple, radius, ring, time) {
    if (ring !== 0 || !cardCentersRef) return;

    for (var j = 0; j < cardCentersRef.length; j++) {
      var card = cardCentersRef[j];
      var dx = card.x - ripple.x;
      var dy = card.y - ripple.y;
      var dist = Math.sqrt(dx * dx + dy * dy);

      var hitKey = j + '';
      if (Math.abs(dist - radius) < 45 && !ripple.hitCards[hitKey]) {
        ripple.hitCards[hitKey] = true;
        card.el.classList.add('signal-hit');
        clearTimeout(card.el.__signalTimer);
        card.el.__signalTimer = setTimeout(function (el) {
          return function () { el.classList.remove('signal-hit'); };
        }(card.el), 300);
      }
    }
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

  window.EmRipples = {
    spawn: spawnRipple,
    draw: drawRipples
  };
})();
