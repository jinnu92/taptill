// TapTill guide: role picker, search, copy-link, contents highlight, checklists, print.
(function () {
  'use strict';
  var ROLE_KEY = 'tt-guide-role';
  var TICK_KEY = 'tt-guide-ticks';
  var NAMES = { owner: 'an Owner / Admin', cashier: 'a Cashier', waiter: 'a Waiter / Order taker', kitchen: 'Kitchen staff', store: 'a Store manager', ca: 'an Accountant', rider: 'a Delivery rider' };

  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode: not remembered */ } }

  var cards = Array.prototype.slice.call(document.querySelectorAll('.sc'));
  var sections = Array.prototype.slice.call(document.querySelectorAll('.gsec'));
  var roleBtns = Array.prototype.slice.call(document.querySelectorAll('.role-btn'));
  var search = document.getElementById('g-search');
  var count = document.getElementById('g-count');
  var noRes = document.getElementById('no-results');
  var note = document.getElementById('role-note');
  var toast = document.getElementById('g-toast');
  var role = get(ROLE_KEY) || 'all';
  if (!NAMES[role]) role = 'all';

  var norm = function (s) { return s.toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, ' '); };
  cards.forEach(function (c) { c._text = norm(c.textContent); c._roles = (c.getAttribute('data-roles') || '').split(/\s+/); });

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(showToast.t);
    showToast.t = setTimeout(function () { toast.classList.remove('show'); }, 1800);
  }

  function matches(c, r, words) {
    if (r !== 'all' && c._roles.indexOf(r) < 0) return false;
    for (var i = 0; i < words.length; i++) if (c._text.indexOf(words[i]) < 0) return false;
    return true;
  }

  function apply() {
    var q = norm(search.value.trim());
    var words = q ? q.split(' ') : [];
    var shown = 0;
    cards.forEach(function (c) {
      var ok = matches(c, role, words);
      c.classList.toggle('is-hidden', !ok);
      if (ok) shown++;
    });
    sections.forEach(function (s) {
      var any = s.querySelector('.sc:not(.is-hidden)');
      s.classList.toggle('is-hidden', !any);
      var link = document.querySelector('.toc-list a[href="#' + s.id + '"]');
      if (link) link.parentNode.classList.toggle('is-hidden', !any);
    });
    roleBtns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-role') === role)); });
    count.textContent = q ? shown + (shown === 1 ? ' result' : ' results') : '';
    noRes.hidden = shown > 0;
    if (!shown) {
      var elsewhere = words.length && role !== 'all' && cards.some(function (c) { return matches(c, 'all', words); });
      noRes.querySelector('p').innerHTML = elsewhere
        ? '<strong>Nothing for this role.</strong> Other roles have matching topics.'
        : '<strong>Nothing found.</strong> Try another word, like “bill”, “table” or “cash”.';
      document.getElementById('clear-search').textContent = elsewhere ? 'Search all roles' : 'Clear the search';
      document.getElementById('clear-search').dataset.mode = elsewhere ? 'all' : 'clear';
    }
    if (role === 'all') { note.hidden = true; }
    else {
      var n = cards.filter(function (c) { return c._roles.indexOf(role) >= 0; }).length;
      note.hidden = false;
      note.innerHTML = 'Showing the ' + n + ' topics for ' + NAMES[role] + ', including the hand-offs and checklist. <button type="button" id="show-all">Show everything</button>';
    }
  }

  function setRole(r) { role = r; set(ROLE_KEY, r); apply(); }

  roleBtns.forEach(function (b) {
    b.addEventListener('click', function () { setRole(b.getAttribute('data-role')); });
  });
  note.addEventListener('click', function (e) { if (e.target.id === 'show-all') setRole('all'); });
  var timer = null;
  search.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(apply, 120); });
  document.getElementById('clear-search').addEventListener('click', function () {
    if (this.dataset.mode === 'all') { setRole('all'); return; }
    search.value = ''; apply(); search.focus();
  });

  // copy-link buttons
  cards.forEach(function (c) {
    var h = c.querySelector('h3');
    if (!h || !c.id) return;
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'copy-link';
    b.textContent = 'Link';
    b.setAttribute('aria-label', 'Copy link to: ' + h.textContent.trim());
    b.addEventListener('click', function () {
      var url = location.href.split('#')[0] + '#' + c.id;
      if (history.replaceState) history.replaceState(null, '', '#' + c.id);
      var done = function () { showToast('Link copied'); };
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(url).then(done, function () { fallback(url); });
      else fallback(url);
      function fallback(u) {
        var t = document.createElement('textarea');
        t.value = u; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0';
        document.body.appendChild(t); t.select();
        try { document.execCommand('copy'); done(); } catch (e) { showToast('Copy this link: ' + u); }
        t.remove();
      }
    });
    h.appendChild(b);
  });

  // a link to a topic the current role filter hides: show everything
  function revealHash() {
    var id = decodeURIComponent((location.hash || '').slice(1));
    if (!id) return;
    var el = document.getElementById(id);
    if (!el) return;
    var card = el.closest ? el.closest('.sc, .gsec') : null;
    if (card && card.classList.contains('is-hidden')) {
      search.value = '';
      setRole('all');
      el.scrollIntoView();
    }
  }
  window.addEventListener('hashchange', revealHash);

  // contents: collapsed on phones, current section highlighted
  var tocBox = document.getElementById('toc-box');
  var narrow = window.matchMedia('(max-width: 960px)');
  if (narrow.matches) tocBox.removeAttribute('open');
  document.getElementById('toc').addEventListener('click', function (e) {
    if (e.target.closest('a') && narrow.matches) tocBox.removeAttribute('open');
  });
  if ('IntersectionObserver' in window) {
    var links = {};
    Array.prototype.forEach.call(document.querySelectorAll('.toc-list a'), function (a) { links[a.getAttribute('href').slice(1)] = a; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        Object.keys(links).forEach(function (k) { links[k].classList.toggle('on', k === en.target.id); });
      });
    }, { rootMargin: '-20% 0px -70% 0px' });
    sections.forEach(function (s) { io.observe(s); });
  }

  // back to top
  var top = document.getElementById('to-top');
  window.addEventListener('scroll', function () { top.classList.toggle('show', window.scrollY > 700); }, { passive: true });

  // checklists remember ticks in this browser
  var ticks = {};
  try { ticks = JSON.parse(get(TICK_KEY) || '{}') || {}; } catch (e) { ticks = {}; }
  Array.prototype.forEach.call(document.querySelectorAll('.checklist'), function (list) {
    Array.prototype.forEach.call(list.querySelectorAll('input[type=checkbox]'), function (cb, i) {
      var key = list.id + ':' + i;
      cb.checked = !!ticks[key];
      cb.addEventListener('change', function () { ticks[key] = cb.checked; set(TICK_KEY, JSON.stringify(ticks)); });
    });
  });
  document.getElementById('clear-ticks').addEventListener('click', function () {
    ticks = {}; set(TICK_KEY, '{}');
    Array.prototype.forEach.call(document.querySelectorAll('.checklist input'), function (cb) { cb.checked = false; });
    showToast('Ticks cleared');
  });
  document.getElementById('print-btn').addEventListener('click', function () { window.print(); });

  apply();
  revealHash();
})();
