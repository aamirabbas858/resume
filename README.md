# abbasaamir.vercel.app

My portfolio. Plain HTML, one stylesheet, one JavaScript file — no framework,
no dependencies, no build step.

**Live: https://abbasaamir.vercel.app**

```
index.html        the whole page
css/styles.css    tokens, layout, motion
js/main.js        reveal-on-scroll, language toggle, canvas mesh
vercel.json       security headers
```

33 KB gzipped in total. Nothing is fetched at runtime except the two webfonts.

## Bilingual without a router

Every translatable element carries its German in `data-de`. The English is
captured into `data-en` on first switch, so each string is written once in the
markup and the other language is whatever the page already said.

**The page never switches language on its own.** A German-language browser gets
English with a dismissible offer, because inferring from `Accept-Language` is a
guess, and being switched without being asked is worse than being asked.
`<html lang>` moves with the choice — a screen reader takes its pronunciation
from that, and German read in an English voice is close to unusable.

Nested translations are filtered out. One existed: the `<h1>` carried a
translation *and* contained a `<span>` with its own, so replacing the parent
destroyed the child before its turn — half a headline, and no error anywhere.

The German addresses the reader nowhere. No *Sie*, no *du*. `Kontakt aufnehmen`
rather than `Melden Sie sich`, because you cannot know whether the person
opening the link expects a Konzern's formality or a startup's informality, and
an infinitive expects neither.

## Thirty brand marks, and what they cost

Inlined from Simple Icons rather than loaded from a CDN. Monochrome at rest —
thirty coloured logos at once turns a section into a sticker album — and each
takes its real brand colour on hover.

Brand palettes are designed against white, and five were unusable here. Vercel
and Next.js are literally `#000000`. Each was lifted toward white until it
cleared **4.5:1** against the background, hue and chroma untouched, which is
what those brands' own dark-mode marks do anyway.

Those colours began as inline `style` attributes. A CSP without `'unsafe-inline'`
in `style-src` blocks those outright — so they worked on localhost and would
have silently failed in production. They are attribute selectors in the
stylesheet instead of a weakened policy.

## Contrast is measured, not judged

The palette is oklch, so the check converts to sRGB and computes real ratios
rather than trusting how it looks on one screen. `--text-faint` came out at
**4.29:1** — under the 4.5 small text needs — and its lightness was raised to
0.575 for **4.56:1**. Body text sits at 16.7:1.

## Headers

`vercel.json` sets a CSP with no `unsafe-inline` anywhere, `default-src 'none'`,
HSTS with preload, `nosniff`, `DENY` framing, and a Permissions-Policy that
turns off camera, microphone, geolocation and payment — none of which a page
like this has any business asking for.

## Motion

Reveal-on-scroll and the background mesh are `IntersectionObserver` and a
`requestAnimationFrame` loop that stops when the tab is hidden. Node count
scales with viewport area, so a phone draws a fraction of what a desktop does,
and nothing reads layout during scroll.

All of it off under `prefers-reduced-motion`, and the cursor-following
highlight is skipped entirely on touch devices, where there is no cursor to
follow.

---

Built in Berlin. No analytics, no cookies, no tracking.
