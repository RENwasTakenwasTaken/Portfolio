/* ── Card Magnetic Tilt ──
   Hover: 60ms CSS ease-out for a smooth entry feel (no perceptible lag).
   Leave: immediately set flat transform → CSS 0.35s ease-out handles return (no LERP freeze).
   Nearby: magnetic pull via LERP while not hovering. */

(function () {
  'use strict';

  var MAX_ROTATION = 8;
  var MAGNETIC_RANGE = 120;
  var MAGNETIC_ROTATION = 2.5;
  var MAGNETIC_LERP = 0.12;

  var cards = [];
  var mouseX = 0;
  var mouseY = 0;

  function initCardTilt() {
    var elements = document.querySelectorAll('.signal-reactive');
    cards = [];

    for (var i = 0; i < elements.length; i++) {
      var el = elements[i];
      var rect = el.getBoundingClientRect();
      cards.push({
        el: el,
        cx: rect.left + rect.width / 2,
        cy: rect.top + rect.height / 2,
        hw: rect.width / 2,
        hh: rect.height / 2,
        currentRotateX: 0,
        currentRotateY: 0,
        targetRotateX: 0,
        targetRotateY: 0,
        hovering: false
      });

      el.addEventListener('mouseenter', createEnterHandler(i));
      el.addEventListener('mouseleave', createLeaveHandler(i));
      el.addEventListener('mousemove', createMoveHandler(i));
    }
  }

  function refreshRects() {
    for (var i = 0; i < cards.length; i++) {
      var rect = cards[i].el.getBoundingClientRect();
      cards[i].cx = rect.left + rect.width / 2;
      cards[i].cy = rect.top + rect.height / 2;
      cards[i].hw = rect.width / 2;
      cards[i].hh = rect.height / 2;
    }
  }

  function createEnterHandler(index) {
    return function () {
      var card = cards[index];
      card.hovering = true;
      // Short transition so tilt entry feels smooth but not laggy
      card.el.style.transition = 'transform 60ms ease-out, box-shadow 0.25s ease, border-color 0.25s ease';
    };
  }

  function createLeaveHandler(index) {
    return function () {
      var card = cards[index];
      card.hovering = false;
      card.currentRotateX = 0;
      card.currentRotateY = 0;
      card.targetRotateX = 0;
      card.targetRotateY = 0;
      // Set transition then immediately clear transform — CSS animates return to flat
      card.el.style.transition = 'transform 0.35s ease-out, box-shadow 0.25s ease, border-color 0.25s ease';
      card.el.style.transform = '';
    };
  }

  function createMoveHandler(index) {
    return function (e) {
      var card = cards[index];
      var relX = (e.clientX - card.cx) / card.hw;
      var relY = (e.clientY - card.cy) / card.hh;

      card.targetRotateX = -relY * MAX_ROTATION;
      card.targetRotateY = relX * MAX_ROTATION;
      card.currentRotateX = card.targetRotateX;
      card.currentRotateY = card.targetRotateY;
      card.el.style.transform =
        'perspective(800px) rotateX(' + card.currentRotateX.toFixed(2) + 'deg) rotateY(' + card.currentRotateY.toFixed(2) + 'deg)';
    };
  }

  function updateCardTilt() {
    for (var i = 0; i < cards.length; i++) {
      var card = cards[i];

      if (card.hovering) continue;  // hover handled instantly by mousemove

      // Magnetic pull when nearby but not hovering
      var dx = mouseX - card.cx;
      var dy = mouseY - card.cy;
      var dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < MAGNETIC_RANGE && dist > 0) {
        var strength = 1 - dist / MAGNETIC_RANGE;
        card.targetRotateX = -(dy / dist) * MAGNETIC_ROTATION * strength;
        card.targetRotateY = (dx / dist) * MAGNETIC_ROTATION * strength;
      } else {
        card.targetRotateX = 0;
        card.targetRotateY = 0;
      }

      card.currentRotateX += (card.targetRotateX - card.currentRotateX) * MAGNETIC_LERP;
      card.currentRotateY += (card.targetRotateY - card.currentRotateY) * MAGNETIC_LERP;

      var atRest = Math.abs(card.currentRotateX) < 0.01 && Math.abs(card.currentRotateY) < 0.01
                   && card.targetRotateX === 0 && card.targetRotateY === 0;
      if (atRest) {
        card.currentRotateX = 0;
        card.currentRotateY = 0;
        if (card.el.style.transform) {
          card.el.style.transform = '';
          card.el.style.transition = '';
        }
        continue;
      }

      // Magnetic: no CSS transition (direct apply)
      card.el.style.transition = 'box-shadow 0.25s ease, border-color 0.25s ease';
      card.el.style.transform =
        'perspective(800px) rotateX(' + card.currentRotateX.toFixed(2) + 'deg) rotateY(' + card.currentRotateY.toFixed(2) + 'deg)';
    }
  }

  window.addEventListener('mousemove', function (e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  window.CardTilt = {
    init: initCardTilt,
    update: updateCardTilt,
    refreshRects: refreshRects
  };
})();
