// TapTill guided tour: one step at a time, with arrow keys, swipe, dots and hotspots.
(function () {
  'use strict';
  var steps = Array.prototype.slice.call(document.querySelectorAll('.step'));
  if (!steps.length) return;
  var prev = document.getElementById('prev');
  var next = document.getElementById('next');
  var dots = document.getElementById('dots');
  var counter = document.getElementById('counter');
  var live = document.getElementById('live');
  var chapters = document.getElementById('chapters');
  var current = -1;

  function title(i) { return steps[i].querySelector('h2').textContent; }

  // progress dots
  var dotButtons = steps.map(function (s, i) {
    var li = document.createElement('li');
    var b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', 'Step ' + (i + 1) + ': ' + title(i));
    b.addEventListener('click', function () { go(i, true); });
    li.appendChild(b);
    dots.appendChild(li);
    return b;
  });

  // chapter buttons (first step of each chapter)
  var chapterFirst = [];
  steps.forEach(function (s, i) {
    var c = s.getAttribute('data-chapter');
    if (!chapterFirst.length || chapterFirst[chapterFirst.length - 1].name !== c) chapterFirst.push({ name: c, index: i });
  });
  var chapterButtons = chapterFirst.map(function (c) {
    var li = document.createElement('li');
    var b = document.createElement('button');
    b.type = 'button';
    b.textContent = c.name;
    b.addEventListener('click', function () { go(c.index, true); });
    li.appendChild(b);
    chapters.appendChild(li);
    return b;
  });

  function clearMarks(step) {
    step.querySelectorAll('.on').forEach(function (el) { el.classList.remove('on'); });
  }

  function mark(step, n) {
    clearMarks(step);
    step.querySelectorAll('[data-n="' + n + '"]').forEach(function (el) { el.classList.add('on'); });
  }

  function preload(i) {
    var s = steps[i];
    if (!s) return;
    var img = s.querySelector('img');
    if (img && img.loading === 'lazy') img.loading = 'eager';
  }

  function go(i, fromUser) {
    if (i < 0 || i >= steps.length || i === current) return;
    if (current >= 0) { steps[current].classList.remove('is-current'); clearMarks(steps[current]); }
    current = i;
    var s = steps[i];
    s.classList.add('is-current');
    preload(i); preload(i + 1); preload(i - 1);
    dotButtons.forEach(function (b, k) {
      if (k === i) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
      b.classList.toggle('done', k < i);
    });
    var chap = s.getAttribute('data-chapter');
    chapterButtons.forEach(function (b) {
      var on = b.textContent === chap;
      b.setAttribute('aria-current', on ? 'true' : 'false');
      if (on && fromUser && b.scrollIntoView) b.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
    prev.disabled = i === 0;
    next.disabled = i === steps.length - 1;
    counter.textContent = (i + 1) + ' / ' + steps.length;
    if (fromUser) {
      live.textContent = 'Step ' + (i + 1) + ' of ' + steps.length + ': ' + title(i);
      if (history.replaceState) history.replaceState(null, '', '#' + s.id);
      var top = document.querySelector('.tour-bar').getBoundingClientRect().bottom;
      if (top < 0 || s.getBoundingClientRect().top < 0) {
        window.scrollTo({ top: window.scrollY + document.querySelector('.tour-bar').getBoundingClientRect().top - 64, behavior: 'auto' });
      }
    }
  }

  prev.addEventListener('click', function () { go(current - 1, true); });
  next.addEventListener('click', function () { go(current + 1, true); });

  document.addEventListener('keydown', function (e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    var t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    if (e.key === 'ArrowRight') { go(current + 1, true); e.preventDefault(); }
    else if (e.key === 'ArrowLeft') { go(current - 1, true); e.preventDefault(); }
    else if (e.key === 'Home') { go(0, true); e.preventDefault(); }
    else if (e.key === 'End') { go(steps.length - 1, true); e.preventDefault(); }
  });

  // hotspots and notes highlight each other
  steps.forEach(function (s) {
    s.querySelectorAll('.hs').forEach(function (b) {
      var n = b.getAttribute('data-n');
      b.addEventListener('click', function () { mark(s, n); });
      b.addEventListener('mouseenter', function () { mark(s, n); });
      b.addEventListener('focus', function () { mark(s, n); });
    });
    s.querySelectorAll('.points li[data-n]').forEach(function (li) {
      var n = li.getAttribute('data-n');
      li.addEventListener('mouseenter', function () { mark(s, n); });
      li.addEventListener('click', function () { mark(s, n); });
    });
  });

  // swipe on the picture area
  var stage = document.getElementById('stage');
  var sx = null, sy = null, st = 0;
  stage.addEventListener('touchstart', function (e) {
    if (e.touches.length !== 1) { sx = null; return; }
    sx = e.touches[0].clientX; sy = e.touches[0].clientY; st = Date.now();
  }, { passive: true });
  stage.addEventListener('touchend', function (e) {
    if (sx === null) return;
    var t = e.changedTouches[0];
    var dx = t.clientX - sx, dy = t.clientY - sy;
    sx = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5 && Date.now() - st < 800) {
      go(current + (dx < 0 ? 1 : -1), true);
    }
  }, { passive: true });

  function fromHash() {
    var id = (location.hash || '').slice(1);
    for (var i = 0; i < steps.length; i++) if (steps[i].id === id) return i;
    return 0;
  }
  window.addEventListener('hashchange', function () { go(fromHash(), false); });
  go(fromHash(), false);
})();
