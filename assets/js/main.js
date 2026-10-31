// ═══════════════════════════════════════════════════════════
// rafey.me — UI layer (loader, cursor, text FX, scroll wiring)
// ═══════════════════════════════════════════════════════════
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
const body = document.body;

const sections = $$('main > section');
const projectEls = $$('#projectList .project');
const projects = projectEls.map(li => ({ tex: li.dataset.tex, url: li.querySelector('.p-links a').href }));
const skillEls = $$('#skillList li');
const skills = skillEls.map(li => ({ name: li.querySelector('span').textContent, group: li.dataset.group }));

// ── Boot loader ─────────────────────────────────────────
const bootLines = [
  ['> init rafey.me --mode=3d', ''],
  ['  resolving host ............ ', 'ok', '[ok]'],
  ['  TLS 1.3 handshake ......... ', 'ok', '[secure]'],
  ['  compiling GLSL shaders .... ', 'ok', '[ok]'],
  ['  spawning 18,000 particles . ', 'ok', '[ok]'],
  ['  loading project textures .. ', 'gd', '[ok]'],
  ['  firewall rules ............ ', 'ok', '[armed]'],
  ['> welcome, visitor.', 'gd'],
];
const bootLog = $('#bootLog'), bar = $('#loaderBar'), pct = $('#loaderPct');
let realProgress = 0, fakeProgress = 0;
function setBar() {
  const p = Math.round(Math.min(realProgress, fakeProgress) * 100);
  bar.style.width = p + '%'; pct.textContent = p;
}
async function typeBoot() {
  const fast = reducedMotion ? 0 : 1;
  for (let i = 0; i < bootLines.length; i++) {
    const [txt, cls, tag] = bootLines[i];
    const line = document.createElement('div');
    bootLog.appendChild(line);
    line.textContent = txt; if (fast) await wait(35);
    if (tag) { await wait(40 * fast); const s = document.createElement('span'); s.className = cls; s.textContent = tag; line.appendChild(s); }
    else if (cls) line.className = cls;
    fakeProgress = (i + 1) / bootLines.length; setBar();
    await wait(25 * fast);
  }
}
const wait = ms => new Promise(r => setTimeout(r, ms));

// ── Split hero letters ──────────────────────────────────
$$('[data-split]').forEach(el => {
  // keep the real word for crawlers & screen readers; animate aria-hidden letters
  const txt = el.textContent; el.textContent = '';
  const sr = document.createElement('span'); sr.className = 'sr-only'; sr.textContent = txt; el.appendChild(sr);
  const vis = document.createElement('span'); vis.setAttribute('aria-hidden', 'true'); el.appendChild(vis);
  // letters are drawn via CSS content so the word exists once in the DOM text
  [...txt].forEach(c => { const s = document.createElement('span'); s.className = 'ch'; s.dataset.c = c; vis.appendChild(s); });
});
const chars = $$('.hero-name .ch');

// ── Boot sequence ───────────────────────────────────────
let world = null;
(async () => {
  const fonts = Promise.race([document.fonts.ready, wait(2500)]);
  const typing = typeBoot();
  await fonts;
  try {
    const { createWorld } = await import('./scene.js');
    world = await createWorld({
      canvas: $('#webgl'), sections, projects, skills, reducedMotion,
      onProgress: p => { realProgress = p; setBar(); },
    });
    wireWorld();
  } catch (err) {
    console.warn('[rafey.me] WebGL disabled:', err);
    body.classList.add('no-webgl');
    $('#webgl').style.display = 'none';
  }
  realProgress = 1;
  await typing; setBar();
  await wait(120);
  finishBoot();
})();

function finishBoot() {
  const loader = $('#loader');
  loader.classList.add('done');
  body.classList.remove('is-loading');
  chars.forEach((c, i) => {
    c.style.animationDelay = (0.25 + i * 0.05) + 's';
    c.classList.add('in');
    c.addEventListener('animationend', () => { c.classList.remove('in'); c.style.animationDelay = ''; }, { once: true });
  });
  world && world.start();
  setTimeout(() => loader.classList.add('gone'), 1500);
  startTyping();
  onScroll();
}

// ── World wiring ────────────────────────────────────────
const cursor = $('.cursor'), cursorLabel = $('.cursor-label');
let worldHover = null;
function wireWorld() {
  world.on('hover', kind => {
    worldHover = kind;
    const label = { core: 'pulse', card: 'open', skill: 'drag' }[kind] || '';
    setCursor(!!label, label);
  });
  world.on('skillHover', i => skillEls.forEach((li, k) => li.classList.toggle('hot', k === i)));
  world.on('cardClick', i => {
    if (i === activeProject) openProject(projects[i].url);
    else goToProject(i);
  });
}

// mailto: links (demo requests) open the mail client instead of a blank tab
function openProject(url) {
  if (url.startsWith('mailto:')) location.href = url;
  else window.open(url, '_blank', 'noopener');
}

// ── Cursor ──────────────────────────────────────────────
const dot = $('.cursor-dot'), ring = $('.cursor-ring');
let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my, domHover = false;
function setCursor(on, label = '') {
  cursor.classList.toggle('hover', on || domHover);
  cursorLabel.textContent = label;
}
if (fine) {
  addEventListener('pointermove', e => { mx = e.clientX; my = e.clientY; dot.style.transform = `translate3d(${mx}px,${my}px,0)`; }, { passive: true });
  (function loop() {
    rx += (mx - rx) * 0.16; ry += (my - ry) * 0.16;
    ring.style.transform = `translate3d(${rx}px,${ry}px,0)`;
    requestAnimationFrame(loop);
  })();
  document.addEventListener('pointerover', e => {
    const el = e.target.closest('a, button, input, textarea, .tilt, .skill-list li');
    domHover = !!el;
    const label = el ? (el.matches('a, button') ? '' : el.matches('input, textarea') ? 'type' : '') : '';
    cursor.classList.toggle('hover', domHover || !!worldHover);
    if (domHover) cursorLabel.textContent = label;
    else if (!worldHover) cursorLabel.textContent = '';
  });
}

// ── Magnetic buttons ────────────────────────────────────
if (fine) $$('[data-magnetic]').forEach(el => {
  el.addEventListener('pointermove', e => {
    const r = el.getBoundingClientRect();
    const x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2;
    el.style.transform = `translate(${x * 0.3}px, ${y * 0.4}px)`;
  });
  el.addEventListener('pointerleave', () => { el.style.transform = ''; });
});

// ── 3D tilt cards with glare ────────────────────────────
if (fine && !reducedMotion) $$('.tilt').forEach(el => {
  el.addEventListener('pointermove', e => {
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
    el.classList.add('tilting');
    el.style.transform = `perspective(900px) rotateX(${(0.5 - py) * 14}deg) rotateY(${(px - 0.5) * 18}deg) translateZ(10px)`;
    el.style.setProperty('--gx', px * 100 + '%'); el.style.setProperty('--gy', py * 100 + '%');
  });
  el.addEventListener('pointerleave', () => { el.classList.remove('tilting'); el.style.transform = ''; });
});

// ── Hero letters lean toward the pointer ────────────────
if (fine && !reducedMotion) {
  let raf = 0;
  addEventListener('pointermove', e => {
    if (raf || scrollY > innerHeight) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      chars.forEach(c => {
        if (c.classList.contains('in')) return;
        const r = c.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        const d = Math.hypot(dx, dy), f = clamp(1 - d / 380);
        c.style.transform = f ? `translate3d(0, ${-f * 18}px, ${f * 120}px) rotateY(${dx * 0.06 * f}deg) rotateX(${-dy * 0.06 * f}deg)` : '';
      });
    });
  }, { passive: true });
}

// ── Typing role line ────────────────────────────────────
function startTyping() {
  const roles = ['Senior developer & problem solver', 'Penetration tester', 'Cloud & DevSecOps', 'Harvard CS50 certified', 'Open to freelance work'];
  const el = $('#typeRole');
  let i = 0;
  (async function cycle() {
    while (true) {
      const word = roles[i++ % roles.length];
      for (let k = 0; k <= word.length; k++) { el.textContent = word.slice(0, k); await wait(55); }
      await wait(1800);
      for (let k = word.length; k >= 0; k--) { el.textContent = word.slice(0, k); await wait(25); }
      await wait(250);
    }
  })();
}

// ── Decrypt / scramble headings ─────────────────────────
const GLYPHS = '!<>-_\\/[]{}—=+*^?#$%&01';
function scramble(el) {
  const final = el.dataset.final || (el.dataset.final = el.textContent);
  const len = final.length, start = performance.now(), dur = reducedMotion ? 1 : 900;
  (function tick(now) {
    const p = clamp((now - start) / dur);
    let out = '';
    for (let i = 0; i < len; i++) {
      const reveal = p * len * 1.25 - i * 0.25;
      out += final[i] === ' ' || reveal >= 1 ? final[i] : GLYPHS[(Math.random() * GLYPHS.length) | 0];
    }
    el.textContent = out;
    if (p < 1) requestAnimationFrame(tick); else el.textContent = final;
  })(start);
}

// ── Reveal + scramble observers ─────────────────────────
const io = new IntersectionObserver(entries => entries.forEach(e => {
  if (!e.isIntersecting) return;
  if (e.target.hasAttribute('data-scramble')) scramble(e.target);
  else e.target.classList.add('visible');
  io.unobserve(e.target);
}), { threshold: 0.15, rootMargin: '0px 0px -5% 0px' });
$$('.reveal, [data-scramble]').forEach(el => io.observe(el));

// ── Counters ────────────────────────────────────────────
$$('[data-count]').forEach(el => {
  const target = +el.dataset.count; let n = 0;
  setTimeout(() => {
    const t = setInterval(() => { n++; el.textContent = n + '+'; if (n >= target) clearInterval(t); }, 140);
  }, 2600);
});

// ── HUD rail ────────────────────────────────────────────
const rail = $('#hudRail');
sections.forEach(s => {
  const li = document.createElement('li');
  li.innerHTML = `<a href="#${s.id}"><span>${s.dataset.label}</span><i></i></a>`;
  rail.appendChild(li);
});
const railLinks = $$('#hudRail a'), navLinks = $$('.nav-links a');

// ── Projects: pinned scroll → carousel index ────────────
const projSection = $('#projects');
let activeProject = 0;
function projectProgress() {
  const top = projSection.offsetTop, len = projSection.offsetHeight - innerHeight;
  return clamp((scrollY - top) / len);
}
function goToProject(i) {
  const top = projSection.offsetTop, len = projSection.offsetHeight - innerHeight;
  window.scrollTo({ top: top + (i / (projects.length - 1)) * len + 2, behavior: reducedMotion ? 'auto' : 'smooth' });
}
$('#projPrev').addEventListener('click', () => goToProject(Math.max(0, activeProject - 1)));
$('#projNext').addEventListener('click', () => goToProject(Math.min(projects.length - 1, activeProject + 1)));

// ── Scroll loop ─────────────────────────────────────────
const nav = $('.nav'), progress = $('#progress');
let currentSection = '';
function onScroll() {
  const y = scrollY, max = document.documentElement.scrollHeight - innerHeight;
  progress.style.transform = `scaleX(${clamp(y / max)})`;
  nav.classList.toggle('scrolled', y > 40);

  // pinned carousel — sticky "magnet" between items
  const n = projects.length, raw = projectProgress() * (n - 1);
  const base = Math.floor(raw), frac = raw - base;
  const snapped = Math.min(n - 1, base + (frac < 0.3 ? 0 : frac > 0.7 ? 1 : (frac - 0.3) / 0.4));
  world && world.setProject(snapped);
  const idx = Math.round(snapped);
  if (idx !== activeProject || !projectEls[idx].classList.contains('active')) {
    activeProject = idx;
    projectEls.forEach((li, k) => li.classList.toggle('active', k === idx));
    $('#projIdx').textContent = String(idx + 1).padStart(2, '0');
  }

  // active section
  let cur = sections[0].id;
  sections.forEach(s => { if (y + innerHeight * 0.45 >= s.offsetTop) cur = s.id; });
  if (cur !== currentSection) {
    currentSection = cur;
    railLinks.forEach(a => a.classList.toggle('on', a.hash === '#' + cur));
    navLinks.forEach(a => a.classList.toggle('on', a.hash === '#' + cur));
    $('#hudSection').textContent = $('#' + cur).dataset.label;
  }
}
addEventListener('scroll', onScroll, { passive: true });
addEventListener('resize', onScroll);

// HUD readouts
setInterval(() => {
  $('#hudClock').textContent = new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Karachi' });
  if (world) { $('#hudDepth').textContent = (-world.state.depth).toFixed(2); $('#hudFps').textContent = world.state.fps; }
}, 250);

// ── Anchor links ────────────────────────────────────────
$$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
  const t = document.querySelector(a.getAttribute('href'));
  if (!t) return;
  e.preventDefault();
  closeMenu();
  window.scrollTo({ top: t.id === 'hero' ? 0 : t.offsetTop, behavior: reducedMotion ? 'auto' : 'smooth' });
}));

// ── Mobile menu ─────────────────────────────────────────
const burger = $('#hamburger'), menu = $('#mobileMenu');
function closeMenu() { menu.classList.remove('open'); burger.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); }
burger.addEventListener('click', () => {
  const open = !menu.classList.contains('open');
  menu.classList.toggle('open', open); burger.classList.toggle('open', open); burger.setAttribute('aria-expanded', String(open));
});

// ── Contact form → opens the visitor's mail client ──────
$('#contactForm').addEventListener('submit', e => {
  e.preventDefault();
  const f = e.target;
  const subject = f.subject.value || `Project enquiry from ${f.name.value}`;
  const bodyTxt = `${f.message.value}\n\n— ${f.name.value} (${f.email.value})`;
  world && world.pulse();
  $('#formNote').textContent = '> payload encrypted · opening your mail client…';
  location.href = `mailto:itsrafey.official@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyTxt)}`;
});

$('#year').textContent = new Date().getFullYear();
$('#projTotal').textContent = String(projects.length).padStart(2, '0');

// ── Terminal easter egg ─────────────────────────────────
const term = $('#term'), out = $('#termOut'), input = $('#termIn');
const print = (html) => { const d = document.createElement('div'); d.innerHTML = html; out.appendChild(d); out.scrollTop = out.scrollHeight; };
const esc = s => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const history = []; let hIdx = 0;
const commands = {
  help: () => print(`<span class="c">available commands</span>
  whoami      who is this guy
  skills      list the stack
  projects    list projects  ·  open &lt;n&gt; to launch one
  certs       credentials
  contact     how to reach me
  goto &lt;s&gt;    fly to a section (about, certifications, skills, projects, services, contact)
  pulse       poke the core
  sudo hire-rafey
  clear · exit`),
  whoami: () => print('<span class="t">Abdul Rafey</span> — Senior Developer, Pentester & Cybersecurity Specialist · Sahiwal, Pakistan · Harvard CS50x + CS50 Cybersecurity'),
  skills: () => print(skills.map(s => `  <span class="${s.group === 'sec' ? 't' : 'c'}">▹</span> ${esc(s.name)}`).join('\n')),
  projects: () => print(projectEls.map((li, i) => `  <span class="c">${i + 1}</span>  ${esc(li.querySelector('h3').textContent)}`).join('\n') + '\n  → type <span class="t">open 3</span>'),
  certs: () => print($$('.cert h3').map(h => '  ✓ ' + esc(h.textContent)).join('\n')),
  contact: () => print('  email  <span class="t">itsrafey.official@gmail.com</span>\n  phone  +92 320 6912491\n  github github.com/rafey581'),
  open: n => { const p = projects[+n - 1]; if (p) { print('  launching ' + esc(p.url)); openProject(p.url); } else print(`<span class="r">  usage: open 1-${projects.length}</span>`); },
  goto: s => { const el = s && document.getElementById(s); if (el) { toggleTerm(false); window.scrollTo({ top: el.offsetTop, behavior: 'smooth' }); } else print('<span class="r">  unknown section</span>'); },
  pulse: () => { world && world.pulse(); print('  <span class="t">core destabilised ⚡</span>'); },
  sudo: a => a === 'hire-rafey'
    ? (print('<span class="t">  [sudo] access granted. drafting offer letter…</span>'), setTimeout(() => location.href = 'mailto:itsrafey.official@gmail.com?subject=' + encodeURIComponent("Let's work together"), 700))
    : print('<span class="r">  guest is not in the sudoers file. This incident will be reported.</span>'),
  ls: () => print('  ' + sections.map(s => s.id + '/').join('  ')),
  clear: () => { out.innerHTML = ''; },
  exit: () => toggleTerm(false),
};
function toggleTerm(force) {
  const open = force ?? !term.classList.contains('open');
  term.classList.toggle('open', open);
  term.setAttribute('aria-hidden', String(!open));
  if (open) { if (!out.childElementCount) print('<span class="c">rafey.me shell v3.0</span> — type <span class="t">help</span>'); setTimeout(() => input.focus(), 50); }
  else input.blur();
}
addEventListener('keydown', e => {
  if ((e.key === '`' || e.key === '~') && !(e.target.matches('input, textarea') && e.target !== input)) { e.preventDefault(); toggleTerm(); }
  else if (e.key === 'Escape' && term.classList.contains('open')) toggleTerm(false);
});
$('#termClose').addEventListener('click', () => toggleTerm(false));
term.addEventListener('click', e => { if (e.target === term) toggleTerm(false); });
input.addEventListener('keydown', e => {
  if (e.key === 'ArrowUp') { hIdx = Math.max(0, hIdx - 1); input.value = history[hIdx] || ''; e.preventDefault(); return; }
  if (e.key === 'ArrowDown') { hIdx = Math.min(history.length, hIdx + 1); input.value = history[hIdx] || ''; e.preventDefault(); return; }
  if (e.key !== 'Enter') return;
  const raw = input.value.trim(); input.value = '';
  if (!raw) return;
  history.push(raw); hIdx = history.length;
  print(`<span class="t">guest@rafey.me:~$</span> ${esc(raw)}`);
  const [cmd, ...args] = raw.split(/\s+/);
  (commands[cmd.toLowerCase()] || (() => print(`<span class="r">  command not found: ${esc(cmd)}</span> — try help`)))(args.join(' '));
});

console.log('%c rafey.me ', 'background:#e8b84b;color:#000;font:700 14px monospace;padding:4px 8px', '\nCurious dev? Press ` for the terminal. Built with Three.js + custom GLSL.');
