/* Portfolio interactions.
 *
 * No framework and no library. Everything here is either an
 * IntersectionObserver or a class toggle, which is what keeps the page fast
 * enough that the animation is the only thing the browser is doing.
 *
 * Motion preference is checked once and honoured everywhere: if someone has
 * asked for less of it, the observers still run so content still arrives -
 * they just arrive already in place.
 */

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ── reveal on scroll ──────────────────────────────────────────────────
   Elements start hidden in CSS and are revealed once. Unobserved after
   firing, so scrolling back up does not replay the animation - a page that
   re-animates on every pass is exhausting to read. */
const revealables = document.querySelectorAll('.reveal');

// data-delay stagger, read once into a custom property the CSS multiplies.
revealables.forEach((el) => {
  const d = el.dataset.delay;
  if (d) el.style.setProperty('--d', d);
});

if (reduced) {
  revealables.forEach((el) => el.classList.add('in'));
} else {
  const revealer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in');
        revealer.unobserve(entry.target);
      });
    },
    // Fires slightly before the element reaches the viewport, so content is
    // already settled by the time it is actually looked at.
    { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
  );
  revealables.forEach((el) => revealer.observe(el));
}

/* ── nav weight on scroll ──────────────────────────────────────────────
   A sentinel at the top of the document rather than a scroll listener: the
   browser reports the crossing itself instead of us asking on every frame. */
const nav = document.getElementById('nav');
const sentinel = document.createElement('div');
sentinel.style.cssText = 'position:absolute;top:0;height:1px;width:1px;';
document.body.prepend(sentinel);

new IntersectionObserver(
  ([entry]) => nav.classList.toggle('scrolled', !entry.isIntersecting)
).observe(sentinel);

/* ── which section am I in ─────────────────────────────────────────────
   The link for the section currently occupying the middle of the screen is
   marked active. rootMargin squeezes the observation box to a band across
   the centre so exactly one section qualifies at a time. */
const links = [...document.querySelectorAll('.nav-links a[href^="#"]')];
const sections = links
  .map((a) => document.querySelector(a.getAttribute('href')))
  .filter(Boolean);

if (sections.length) {
  const spy = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((a) =>
          a.classList.toggle('active', a.getAttribute('href') === `#${entry.target.id}`)
        );
      });
    },
    { rootMargin: '-45% 0px -45% 0px' }
  );
  sections.forEach((s) => spy.observe(s));
}

/* ── pointer-following highlight on cards ──────────────────────────────
   Only two custom properties are written, and the gradient they drive is
   already painted - so this never triggers layout. Skipped entirely for
   coarse pointers, where there is no cursor to follow and the listener
   would fire on every touch for nothing. */
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

if (finePointer && !reduced) {
  document.querySelectorAll('[data-tilt]').forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - r.left}px`);
      card.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
  });
}

/* ── mobile menu ───────────────────────────────────────────────────────── */
const menuBtn = document.getElementById('menuBtn');
const navLinks = document.getElementById('navLinks');

const setMenu = (open) => {
  navLinks.classList.toggle('open', open);
  menuBtn.setAttribute('aria-expanded', String(open));
};

menuBtn.addEventListener('click', () =>
  setMenu(menuBtn.getAttribute('aria-expanded') !== 'true')
);

// Tapping a link should navigate and close, not leave the menu covering the
// section it just scrolled to.
navLinks.addEventListener('click', (e) => {
  if (e.target.tagName === 'A') setMenu(false);
});

// Escape closes it, and returns focus to the button that opened it.
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && menuBtn.getAttribute('aria-expanded') === 'true') {
    setMenu(false);
    menuBtn.focus();
  }
});

// Rotating to landscape can leave the mobile menu open over a desktop layout.
window.matchMedia('(max-width: 720px)').addEventListener('change', (e) => {
  if (!e.matches) setMenu(false);
});

/* ── constellation background ──────────────────────────────────────────
   A slow mesh of dots joined to their near neighbours - the same visual
   language as the day-coloured map in wayfare.

   Sized from the viewport rather than the canvas element. Measuring
   clientWidth here returned near-zero before layout settled, which fed a
   density formula based on area and produced two nodes and one line.

   Deliberately restrained: it should be noticed only if looked for. No
   scroll parallax - offsetting a fixed layer against the page read as the
   background sliding around, which is worse than not moving at all.

   Stops when the tab is hidden. Skipped under reduced motion and on narrow
   screens, where it is noise behind text rather than atmosphere. */
(() => {
  const canvas = document.getElementById('constellation');
  if (!canvas || reduced || window.innerWidth < 640) return;

  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  const ACCENT = [77, 208, 225];
  const VIOLET = [168, 130, 245];

  let nodes = [];
  let w = 0, h = 0;
  let running = true;
  let raf = 0;
  let link = 150;

  function size() {
    // The viewport, not the element. The canvas is fixed and full-bleed, so
    // these are the same thing - and innerWidth is correct before layout.
    w = window.innerWidth;
    h = window.innerHeight;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // One node per ~26k px². About 50 on a laptop, ~20 on a small window.
    const count = Math.max(18, Math.min(60, Math.round((w * h) / 26000)));
    // Connection radius scales with spacing, so density looks the same on a
    // phone and a 27-inch display rather than sparse on one and solid on the
    // other.
    link = Math.min(190, Math.max(110, Math.sqrt((w * h) / count) * 1.5));

    nodes = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.09,
      vy: (Math.random() - 0.5) * 0.09,
      r: Math.random() * 1.3 + 0.9,
      violet: Math.random() < 0.25,
    }));
  }

  function frame() {
    if (!running) return;
    ctx.clearRect(0, 0, w, h);

    for (const n of nodes) {
      n.x += n.vx;
      n.y += n.vy;
      // Wrapped, not bounced - bouncing makes the edges of the field visible.
      if (n.x < -30) n.x = w + 30; else if (n.x > w + 30) n.x = -30;
      if (n.y < -30) n.y = h + 30; else if (n.y > h + 30) n.y = -30;
    }

    // Lines under dots, so each dot sits on top of its own connections.
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 > link * link) continue;

        // Fades with distance so the mesh has depth rather than reading as a
        // wireframe.
        const alpha = (1 - Math.sqrt(d2) / link) * 0.13;
        const c = a.violet || b.violet ? VIOLET : ACCENT;
        ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${alpha.toFixed(3)})`;
        ctx.lineWidth = 0.65;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }

    for (const n of nodes) {
      const c = n.violet ? VIOLET : ACCENT;
      ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},0.42)`;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fill();
    }

    raf = requestAnimationFrame(frame);
  }

  const start = () => { if (!running) { running = true; raf = requestAnimationFrame(frame); } };
  const stop = () => { running = false; cancelAnimationFrame(raf); };

  size();
  raf = requestAnimationFrame(frame);

  // Debounced: a resize fires continuously while a window is dragged, and
  // rebuilding the field on every pixel is pointless work.
  let t;
  window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(size, 160); });

  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
})();

/* ── English / German ──────────────────────────────────────────────────
   Every translatable element carries its German in data-de. The English is
   captured into data-en on first switch, so the markup only ever states one
   of the two and the other is whatever the page already said.

   The page never switches language on its own. A German browser gets English
   with an offer, not a decision made for it - guessing from Accept-Language
   is a guess, and being switched without asking is worse than being asked.

   <html lang> moves with the choice. That matters beyond tidiness: a screen
   reader takes its pronunciation from it, and German read by an English voice
   is close to unusable. */
(() => {
  const btn = document.getElementById('langBtn');
  const nudge = document.getElementById('langNudge');
  if (!btn) return;

  // Nested translations cannot work: replacing a parent's innerHTML destroys
  // the children before their turn arrives, and the child's German is silently
  // lost. Every translation here is plain text, so a translated element should
  // never contain another - filtering them out makes that constraint hold even
  // if someone adds one later.
  const nodes = [...document.querySelectorAll('[data-de]')].filter(
    (el) => !el.parentElement?.closest('[data-de]')
  );
  const KEY = 'lang';

  const META = {
    en: { title: 'Abbas Aamir - Computer Science, Berlin', aria: 'Auf Deutsch umschalten' },
    de: { title: 'Abbas Aamir - Informatik, Berlin',       aria: 'Switch to English' },
  };

  // localStorage throws in private mode on some browsers, so every access is
  // wrapped rather than assumed.
  const store = {
    get() { try { return localStorage.getItem(KEY); } catch { return null; } },
    set(v) { try { localStorage.setItem(KEY, v); } catch { /* ignore */ } },
  };

  function apply(lang, remember = true) {
    nodes.forEach((el) => {
      if (!el.dataset.en) el.dataset.en = el.innerHTML.trim();
      el.innerHTML = lang === 'de' ? el.dataset.de : el.dataset.en;
    });
    document.documentElement.lang = lang;
    document.title = META[lang].title;
    btn.setAttribute('aria-label', META[lang].aria);
    btn.classList.toggle('de', lang === 'de');
    if (remember) store.set(lang);
  }

  btn.addEventListener('click', () => {
    apply(document.documentElement.lang === 'de' ? 'en' : 'de');
    hideNudge();
  });

  /* ── the offer ──────────────────────────────────────────────────────── */
  function hideNudge() {
    if (!nudge) return;
    nudge.classList.remove('show');
    // Removed from the accessibility tree only after it has finished leaving,
    // so the transition is not cut short.
    setTimeout(() => { nudge.hidden = true; }, 600);
  }

  const saved = store.get();
  if (saved) {
    apply(saved, false);
  } else if (nudge && navigator.language?.toLowerCase().startsWith('de')) {
    // Shown a moment after load rather than immediately: arriving at the same
    // instant as the page makes it feel like an interstitial, which is the one
    // thing it must not be.
    setTimeout(() => {
      nudge.hidden = false;
      requestAnimationFrame(() => nudge.classList.add('show'));
    }, 1400);

    document.getElementById('nudgeYes')?.addEventListener('click', () => {
      apply('de');
      hideNudge();
    });
    document.getElementById('nudgeNo')?.addEventListener('click', () => {
      store.set('en');   // asked and answered - do not ask again
      hideNudge();
    });
    // Escape dismisses it too. A prompt that can only be answered is a dialog,
    // and this is not one.
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !nudge.hidden) { store.set('en'); hideNudge(); }
    });
  }
})();
