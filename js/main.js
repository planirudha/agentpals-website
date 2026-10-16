/* =========================================================
   AgentPals — interactions
   ========================================================= */

// ---- Config: set this to your form endpoint (e.g. https://formspree.io/f/xxxxxxx).
// Left empty, the waitlist form falls back to opening the visitor's email client.
const FORM_ENDPOINT = '';
const CONTACT_EMAIL = 'hello@example.com';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------------- Theme ---------------- */
(() => {
  const root = document.documentElement;
  $('#themeToggle').addEventListener('click', () => {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch (e) {}
    $('meta[name="theme-color"]').setAttribute('content', next === 'dark' ? '#07070c' : '#fafaff');
  });
})();

/* ---------------- Nav: scrolled state, mobile menu, current section ---------------- */
(() => {
  const nav = $('#nav');
  const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 20);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  const btn = $('#menuBtn');
  const links = $('#navLinks');
  const setOpen = (open) => {
    links.classList.toggle('is-open', open);
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  };
  btn.addEventListener('click', () => setOpen(!links.classList.contains('is-open')));
  links.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });

  const navAnchors = $$('a', links);
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      navAnchors.forEach((a) => a.classList.toggle('is-current', a.getAttribute('href') === '#' + en.target.id));
    });
  }, { rootMargin: '-50% 0px -50% 0px' });
  navAnchors.forEach((a) => { const s = $(a.getAttribute('href')); if (s) io.observe(s); });
})();

/* ---------------- Reveal on scroll ---------------- */
(() => {
  $$('.spark i').forEach((b, i) => b.style.setProperty('--i', i));
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add('is-visible'); io.unobserve(en.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  // Stagger siblings slightly for a polished cascade
  $$('.reveal').forEach((el) => {
    const sibs = [...el.parentElement.children].filter((c) => c.classList.contains('reveal'));
    el.style.transitionDelay = `${Math.min(sibs.indexOf(el), 6) * 70}ms`;
    io.observe(el);
  });
})();

/* ---------------- Hero: agent network canvas ---------------- */
(() => {
  const canvas = $('#netCanvas');
  const ctx = canvas.getContext('2d');
  let w, h, dpr, nodes = [], packets = [], raf, visible = true;
  const mouse = { x: -9999, y: -9999 };
  const LINK = 140;

  const rgb = () => getComputedStyle(document.documentElement).getPropertyValue('--net-rgb').trim();

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.round(Math.min(90, (w * h) / 16000));
    nodes = Array.from({ length: count }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35,
      r: Math.random() * 1.6 + 0.8, hub: Math.random() < 0.08,
    }));
    packets = [];
  }

  function step() {
    const c = rgb();
    ctx.clearRect(0, 0, w, h);

    for (const n of nodes) {
      n.x += n.vx; n.y += n.vy;
      if (n.x < 0 || n.x > w) n.vx *= -1;
      if (n.y < 0 || n.y > h) n.vy *= -1;
      // gentle attraction to cursor
      const dx = mouse.x - n.x, dy = mouse.y - n.y, d = Math.hypot(dx, dy);
      if (d < 180) { n.x += dx * 0.004; n.y += dy * 0.004; }
    }

    // edges
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < LINK) {
          ctx.strokeStyle = `rgba(${c},${(1 - d / LINK) * 0.22})`;
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          // occasionally spawn a "message" packet travelling along an edge
          if (packets.length < 14 && Math.random() < 0.0006) packets.push({ a, b, t: 0 });
        }
      }
    }

    // nodes
    for (const n of nodes) {
      ctx.fillStyle = `rgba(${c},${n.hub ? 0.9 : 0.55})`;
      ctx.beginPath(); ctx.arc(n.x, n.y, n.hub ? n.r + 1.6 : n.r, 0, Math.PI * 2); ctx.fill();
      if (n.hub) {
        ctx.strokeStyle = `rgba(${c},.25)`;
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r + 6, 0, Math.PI * 2); ctx.stroke();
      }
    }

    // packets
    packets = packets.filter((p) => (p.t += 0.012) < 1);
    for (const p of packets) {
      const x = p.a.x + (p.b.x - p.a.x) * p.t, y = p.a.y + (p.b.y - p.a.y) * p.t;
      const g = ctx.createRadialGradient(x, y, 0, x, y, 8);
      g.addColorStop(0, 'rgba(34,211,238,.95)'); g.addColorStop(1, 'rgba(34,211,238,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fill();
    }

    if (visible && !reduceMotion) raf = requestAnimationFrame(step);
  }

  resize();
  step();
  window.addEventListener('resize', () => { cancelAnimationFrame(raf); resize(); step(); });
  canvas.parentElement.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
  });
  canvas.parentElement.addEventListener('pointerleave', () => { mouse.x = mouse.y = -9999; });
  new IntersectionObserver(([en]) => {
    visible = en.isIntersecting;
    cancelAnimationFrame(raf);
    if (visible) step();
  }).observe(canvas);
  // repaint on theme change so colors update even when paused
  new MutationObserver(() => { if (reduceMotion) step(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
})();

/* ---------------- Hero: live agent console ---------------- */
(() => {
  const body = $('#consoleBody');
  const bar = $('#consoleProgress');
  const stepLbl = $('#consoleStep');
  const script = [
    ['goal',  'plan',  'Prepare Q3 churn analysis and email the summary to leadership'],
    ['plan',  'plan',  'Split into 4 subtasks → research · query · write · review'],
    ['think', 'think', 'Need churn data by segment; warehouse has billing.events'],
    ['tool',  'tool',  'sql.query("SELECT segment, churn_rate FROM …")  ✓ 2.1s'],
    ['tool',  'tool',  'docs.search("Q2 retention review")  ✓ 3 results'],
    ['think', 'think', 'SMB churn up 2.4pts — correlates with onboarding drop-off'],
    ['tool',  'tool',  'charts.render(churn_by_segment)  ✓'],
    ['review','ok',    'Reviewer: numbers verified against source tables'],
    ['ask',   'ask',   'Approval needed: send email to leadership@ (3 recipients)'],
    ['done',  'ok',    'Approved by you · email sent · report saved to Docs'],
  ];
  const milestones = { 1: 1, 3: 2, 6: 3, 7: 4, 8: 5, 9: 6 };
  const MAX_LINES = 11;

  async function run() {
    body.innerHTML = ''; bar.style.width = '0'; stepLbl.textContent = 'step 0/6';
    for (let i = 0; i < script.length; i++) {
      const [tag, cls, text] = script[i];
      const line = document.createElement('div');
      line.className = 'console__line';
      line.innerHTML = `<span class="tag tag--${cls}">${tag}</span><span class="txt caret"></span>`;
      body.appendChild(line);
      while (body.children.length > MAX_LINES) body.firstChild.remove();
      const txt = line.lastChild;
      if (reduceMotion) txt.textContent = text;
      else for (let c = 0; c < text.length; c++) { txt.textContent += text[c]; await sleep(14 + Math.random() * 18); }
      txt.classList.remove('caret');
      if (milestones[i]) { bar.style.width = `${(milestones[i] / 6) * 100}%`; stepLbl.textContent = `step ${milestones[i]}/6`; }
      await sleep(cls === 'ask' ? 1400 : 420);
    }
    if (reduceMotion) return;
    await sleep(3500);
    run();
  }
  run();
})();

/* ---------------- How it works: step activation ---------------- */
(() => {
  const steps = $$('.loop__step');
  const nodes = $$('.orbit__node');
  const label = $('#loopCoreLabel');
  const names = ['Understand', 'Plan', 'Act', 'Verify'];
  let current = 0;

  function activate(i) {
    if (i === current) return;
    current = i;
    steps.forEach((s, k) => s.classList.toggle('is-active', k === i));
    nodes.forEach((n, k) => n.classList.toggle('is-on', k === i));
    label.style.opacity = 0;
    setTimeout(() => { label.textContent = names[i]; label.style.opacity = 1; }, 200);
  }
  steps.forEach((s, i) => s.addEventListener('click', () => activate(i)));

  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) activate(+en.target.dataset.step); });
  }, { rootMargin: '-45% 0px -45% 0px' });
  steps.forEach((s) => io.observe(s));
})();

/* ---------------- Cursor spotlight on cards ---------------- */
$$('.spotlight').forEach((card) => {
  card.addEventListener('pointermove', (e) => {
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${e.clientX - r.left}px`);
    card.style.setProperty('--my', `${e.clientY - r.top}px`);
  });
});

/* ---------------- Magnetic buttons ---------------- */
if (!reduceMotion && window.matchMedia('(hover: hover)').matches) {
  $$('.magnetic').forEach((b) => {
    b.addEventListener('pointermove', (e) => {
      const r = b.getBoundingClientRect();
      b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.18}px, ${(e.clientY - r.top - r.height / 2) * 0.3}px)`;
    });
    b.addEventListener('pointerleave', () => { b.style.transform = ''; });
  });
}

/* ---------------- Playground: multi-agent simulation ---------------- */
(() => {
  const AGENTS = {
    planner:  { name: 'Planner',    av: '🧭' },
    research: { name: 'Researcher', av: '🔍' },
    builder:  { name: 'Builder',    av: '⚙️' },
    review:   { name: 'Reviewer',   av: '✅' },
    you:      { name: 'You',        av: '🙋' },
  };
  // [from, to, message, kind]
  const MISSIONS = {
    research: [
      ['planner', 'research', 'Goal received. Researcher: gather pricing, features and positioning for the top 5 competitors.'],
      ['research', 'research', 'Browsed 23 pages, extracted pricing tables and changelogs from the last 6 months.'],
      ['research', 'builder', 'Hand-off: structured dataset of 5 competitors × 18 attributes.'],
      ['builder', 'builder', 'Drafted a 6-page report with a comparison matrix and 3 positioning gaps.'],
      ['builder', 'review', 'Ready for review.'],
      ['review', 'builder', 'Two prices are outdated — re-checked sources and corrected them.'],
      ['review', 'planner', 'Report verified. Saved to Docs and shared with #strategy.', 'done'],
    ],
    support: [
      ['planner', 'research', 'Backlog has 142 open tickets. Researcher: cluster them by root cause.'],
      ['research', 'planner', 'Found 4 clusters. 61% are password-reset loops after the last release.'],
      ['planner', 'builder', 'Builder: draft replies per cluster and prepare account fixes.'],
      ['builder', 'builder', 'Drafted 4 reply templates · prepared 61 account resets.'],
      ['builder', 'you', 'Approval needed: apply 61 account resets and send replies?', 'ask'],
      ['you', 'builder', 'Approved.'],
      ['review', 'planner', '118 tickets resolved, 24 escalated to humans with full context.', 'done'],
    ],
    code: [
      ['planner', 'builder', 'CI is red on main: test_checkout_total fails. Builder: investigate.'],
      ['builder', 'builder', 'Reproduced locally. Rounding error introduced in currency util (commit 9f3a1c).'],
      ['builder', 'research', 'Researcher: check how other call sites rely on this function.'],
      ['research', 'builder', '7 call sites; 2 depend on the old behavior. Listed them.'],
      ['builder', 'review', 'Patched util + 2 call sites, added regression tests. All 412 tests pass.'],
      ['review', 'builder', 'LGTM. Suggest one extra edge case for zero amounts — added.'],
      ['review', 'planner', 'Pull request #318 opened and linked to the incident.', 'done'],
    ],
  };

  const graph = $('#pgGraph'), wires = $('#pgWires'), msgs = $('#pgMsgs'), runBtn = $('#pgRun');
  const chips = $$('.chip');
  const els = Object.fromEntries($$('.agent', graph).map((a) => [a.dataset.agent, a]));
  const pos = (k) => { const s = els[k].style; return [s.getPropertyValue('--x'), s.getPropertyValue('--y')]; };
  let mission = 'research', runId = 0;

  // draw static wires between every pair of agents
  const keys = Object.keys(els);
  const svgNS = 'http://www.w3.org/2000/svg';
  keys.forEach((a, i) => keys.slice(i + 1).forEach((b) => {
    const l = document.createElementNS(svgNS, 'line');
    const [x1, y1] = pos(a), [x2, y2] = pos(b);
    Object.entries({ x1, y1, x2, y2 }).forEach(([k, v]) => l.setAttribute(k, v));
    wires.appendChild(l);
  }));

  function pulse(from, to) {
    if (from === to || !els[from] || !els[to] || reduceMotion) return Promise.resolve();
    const [x1, y1] = pos(from).map(parseFloat), [x2, y2] = pos(to).map(parseFloat);
    const c = document.createElementNS(svgNS, 'circle');
    c.setAttribute('class', 'pulse'); c.setAttribute('r', '5');
    wires.appendChild(c);
    return new Promise((res) => {
      const t0 = performance.now(), D = 650;
      (function frame(t) {
        const p = Math.min(1, (t - t0) / D), e = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        c.setAttribute('cx', `${x1 + (x2 - x1) * e}%`); c.setAttribute('cy', `${y1 + (y2 - y1) * e}%`);
        if (p < 1) requestAnimationFrame(frame); else { c.remove(); res(); }
      })(t0);
    });
  }

  function addMsg(who, text, kind) {
    const a = AGENTS[who];
    const li = document.createElement('li');
    li.className = `msg${kind ? ' msg--' + kind : ''}`;
    li.innerHTML = `<span class="msg__av">${a.av}</span><div><span class="msg__who">${a.name}</span><div class="msg__body"></div></div>`;
    const bodyEl = $('.msg__body', li);
    bodyEl.innerHTML = '<span class="typing"><i></i><i></i><i></i></span>';
    msgs.appendChild(li);
    msgs.scrollTop = msgs.scrollHeight;
    return (t) => { bodyEl.textContent = t; msgs.scrollTop = msgs.scrollHeight; };
  }

  async function run() {
    const id = ++runId;
    const steps = MISSIONS[mission];
    msgs.innerHTML = '';
    Object.values(els).forEach((e) => e.classList.remove('is-busy', 'is-done'));
    runBtn.disabled = true; runBtn.textContent = '● Running…';

    for (const [from, to, text, kind] of steps) {
      if (id !== runId) return;
      els[from]?.classList.add('is-busy');
      const fill = addMsg(from, text, kind);
      await sleep(reduceMotion ? 0 : 700 + text.length * 8);
      if (id !== runId) return;
      fill(text);
      await pulse(from, to);
      els[from]?.classList.remove('is-busy');
      els[from]?.classList.add('is-done');
      await sleep(reduceMotion ? 0 : 250);
    }
    runBtn.disabled = false; runBtn.textContent = '↻ Run again';
  }

  chips.forEach((chip) => chip.addEventListener('click', () => {
    chips.forEach((c) => { c.classList.toggle('is-active', c === chip); c.setAttribute('aria-checked', String(c === chip)); });
    mission = chip.dataset.mission;
    run();
  }));
  runBtn.addEventListener('click', run);

  // auto-start the first time the playground scrolls into view
  const io = new IntersectionObserver(([en]) => { if (en.isIntersecting) { run(); io.disconnect(); } }, { threshold: 0.4 });
  io.observe(graph);
})();

/* ---------------- Multiplayer AI: single vs multi toggle ---------------- */
(() => {
  const viz = $('#mpViz');
  const seg = $('.seg');
  const btns = $$('button', seg);
  const ink = $('.seg__ink', seg);
  const caps = $$('.mp__cap');
  let touched = false;

  const moveInk = (b) => { ink.style.width = `${b.offsetWidth}px`; ink.style.transform = `translateX(${b.offsetLeft}px)`; };
  function setMode(mode) {
    viz.dataset.mode = mode;
    btns.forEach((b) => b.setAttribute('aria-checked', String(b.dataset.mode === mode)));
    caps.forEach((c) => c.classList.toggle('is-on', c.dataset.for === mode));
    moveInk(btns.find((b) => b.dataset.mode === mode));
  }
  btns.forEach((b) => b.addEventListener('click', () => { touched = true; setMode(b.dataset.mode); }));
  window.addEventListener('resize', () => moveInk(btns.find((b) => b.getAttribute('aria-checked') === 'true')));
  document.fonts?.ready.then(() => moveInk(btns.find((b) => b.getAttribute('aria-checked') === 'true')));

  if (reduceMotion) { setMode('multi'); return; }
  // Tell the story once: start siloed, then bring everyone into the shared room.
  setMode('single');
  const io = new IntersectionObserver(([en]) => {
    if (!en.isIntersecting) return;
    io.disconnect();
    setTimeout(() => { if (!touched) setMode('multi'); }, 1800);
  }, { threshold: 0.5 });
  io.observe(viz);
})();

/* ---------------- Multiplayer AI: live incident room ---------------- */
(() => {
  const feed = $('#roomFeed'), time = $('#roomTime'), state = $('#roomState'), replay = $('#roomReplay');
  const stages = $$('#roomStages li');
  const P = {
    system:   { name: 'PagerAlert',     av: '🚨', kind: 'system' },
    triage:   { name: 'Triage agent',   av: '🛰️', kind: 'agent' },
    diagnose: { name: 'Diagnose agent', av: '🔬', kind: 'agent' },
    fix:      { name: 'Fix agent',      av: '🛠️', kind: 'agent' },
    priya:    { name: 'Priya',          av: 'PR', kind: 'human' },
    marco:    { name: 'Marco',          av: 'MA', kind: 'human' },
  };
  // [simulated seconds, who, text, style, stage reached]
  const SCRIPT = [
    [0,   'system',   'checkout-api p95 latency is 2.4s (SLO 300ms). Error rate 3.1%.', 'alert', 0],
    [40,  'triage',   'Opened #inc-2417 and paged Priya. ~18% of checkouts are slower than 2s. The spike started 3 min after deploy v4.12.0.', '', 1],
    [95,  'priya',    'On it 👋 @Diagnose can you check the database and that deploy?'],
    [190, 'diagnose', 'Root cause: v4.12.0 added an N+1 query in cart pricing. DB connection pool at 96%. Evidence (3 slow traces + query log) pinned to this room.', '', 2],
    [250, 'marco',    "Confirmed, that's my change. Rollback is safest. I'll fix forward after."],
    [300, 'fix',      'Rollback plan ready: v4.12.0 → v4.11.3, canary 10% then 100%. Waiting for human approval.', 'ask'],
    [345, 'priya',    '✅ Approved. Go ahead.', 'approve', 3],
    [470, 'fix',      'Canary healthy for 2 min → rolled out to 100%. p95 back to 210ms, errors 0.02%.', '', 4],
    [600, 'triage',   'Resolved and verified. Postmortem draft + regression-test PR #912 shared with the whole team.', 'done', 5],
  ];
  const SPEED = 32; // simulated seconds per real second
  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  let runId = 0;

  function setStage(i) {
    stages.forEach((li, k) => { li.classList.toggle('is-done', k <= i); li.classList.toggle('is-active', k === i + 1); });
  }
  function post([at, who, text, style = '']) {
    const p = P[who];
    const li = document.createElement('li');
    li.className = `rmsg rmsg--${p.kind}${style ? ' rmsg--' + style : ''}`;
    const badge = p.kind === 'system' ? '' : `<span class="badge badge--${p.kind}">${p.kind}</span>`;
    li.innerHTML = `<span class="rmsg__av">${p.av}</span><div><div class="rmsg__meta"><b>${p.name}</b>${badge}<time>${fmt(at)}</time></div><div class="rmsg__body"></div></div>`;
    $('.rmsg__body', li).textContent = text;
    feed.appendChild(li);
    feed.scrollTop = feed.scrollHeight;
  }
  function finish() {
    state.classList.add('is-done');
    state.innerHTML = '<span class="live"></span>Resolved · everyone saw every step';
  }
  function reset() {
    feed.innerHTML = ''; time.textContent = '00:00'; setStage(-1);
    state.classList.remove('is-done'); state.innerHTML = '<span class="live"></span>Investigating';
  }

  function run() {
    const id = ++runId;
    reset();
    if (reduceMotion) {
      SCRIPT.forEach(post); setStage(5); time.textContent = fmt(SCRIPT.at(-1)[0]); finish(); return;
    }
    let next = 0, t0 = performance.now();
    (function tick(now) {
      if (id !== runId) return;
      const sim = Math.min((now - t0) / 1000 * SPEED, SCRIPT.at(-1)[0]);
      time.textContent = fmt(sim);
      while (next < SCRIPT.length && SCRIPT[next][0] <= sim) {
        const m = SCRIPT[next++];
        post(m);
        if (m[4] !== undefined) setStage(m[4]);
      }
      if (next < SCRIPT.length) requestAnimationFrame(tick); else finish();
    })(t0);
  }

  replay.addEventListener('click', run);
  const io = new IntersectionObserver(([en]) => { if (en.isIntersecting) { run(); io.disconnect(); } }, { threshold: 0.35 });
  io.observe($('#room'));
})();

/* ---------------- Tabs (accessible, with sliding ink) ---------------- */
(() => {
  const list = $('.tabs__list');
  const tabs = $$('[role="tab"]', list);
  const ink = $('.tabs__ink', list);

  const moveInk = (tab) => { ink.style.width = `${tab.offsetWidth}px`; ink.style.transform = `translateX(${tab.offsetLeft}px)`; };
  function select(tab, focus) {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      $('#' + t.getAttribute('aria-controls')).hidden = !on;
    });
    moveInk(tab);
    tab.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
    if (focus) tab.focus();
  }
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(t));
    t.addEventListener('keydown', (e) => {
      const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (d) { e.preventDefault(); select(tabs[(i + d + tabs.length) % tabs.length], true); }
    });
  });
  const init = () => moveInk(tabs.find((t) => t.getAttribute('aria-selected') === 'true'));
  window.addEventListener('resize', init);
  document.fonts?.ready.then(init);
  init();
})();

/* ---------------- Waitlist form ---------------- */
(() => {
  const form = $('#waitlistForm'), note = $('#formNote'), input = $('#email');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = input.value.trim();
    note.className = 'cta__note';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      note.textContent = 'Please enter a valid email address.'; note.classList.add('err'); input.focus(); return;
    }
    if (!FORM_ENDPOINT) {
      window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('AgentPals early access')}&body=${encodeURIComponent('Please add me to the waitlist: ' + email)}`;
      note.textContent = 'Opening your email app to finish the request…'; note.classList.add('ok');
      return;
    }
    const btn = $('button', form); btn.disabled = true;
    try {
      const res = await fetch(FORM_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ email }) });
      if (!res.ok) throw new Error();
      note.textContent = "You're on the list! We'll be in touch soon. 🎉"; note.classList.add('ok'); form.reset();
    } catch {
      note.textContent = 'Something went wrong — please try again.'; note.classList.add('err');
    } finally { btn.disabled = false; }
  });
})();

$('#year').textContent = new Date().getFullYear();
