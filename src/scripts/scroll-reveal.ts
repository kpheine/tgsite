/**
 * Scroll-reveal engine.
 *
 * Watches every `[data-reveal]` element and adds `is-revealed` once it scrolls
 * into view (one-shot — no reverse on scroll-up). Containers tagged
 * `[data-reveal-stagger]` get an incrementing `--reveal-i` on their direct
 * `[data-reveal]` children so grids cascade in without hand-numbering.
 *
 * Honors prefers-reduced-motion by revealing everything immediately and never
 * starting the observer.
 */

const REVEAL_SELECTOR = '[data-reveal]';

function revealAll(): void {
  document
    .querySelectorAll<HTMLElement>(REVEAL_SELECTOR)
    .forEach((el) => el.classList.add('is-revealed'));
}

function assignStaggerIndices(): void {
  document
    .querySelectorAll<HTMLElement>('[data-reveal-stagger]')
    .forEach((group) => {
      const children = group.querySelectorAll<HTMLElement>(':scope > [data-reveal]');
      children.forEach((child, i) => {
        if (child.style.getPropertyValue('--reveal-i') === '') {
          child.style.setProperty('--reveal-i', String(i));
        }
      });
    });
}

function init(): void {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  if (reduceMotion.matches || !('IntersectionObserver' in window)) {
    revealAll();
    return;
  }

  assignStaggerIndices();

  const observer = new IntersectionObserver(
    (entries, obs) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          obs.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.15, rootMargin: '0px 0px -10% 0px' },
  );

  document
    .querySelectorAll<HTMLElement>(REVEAL_SELECTOR)
    .forEach((el) => observer.observe(el));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
