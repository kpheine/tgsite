/**
 * Cursor-reactive gradient text.
 *
 * Finds every gradient-clipped text element (background-clip: text + a gradient
 * background) and pans its gradient toward the pointer. The pan itself is pure
 * CSS — elements get the `.gradient-follow` class which oversizes the gradient
 * and binds `background-position` to the `--gradient-mx/--gradient-my` custom
 * properties on :root, which this script updates (rAF-throttled) on pointer move.
 *
 * Elements that already drive their own gradient animation (e.g. the hero
 * headline cycle) are left alone, and the whole thing is disabled for
 * pointer-less / reduced-motion users.
 */

const CANDIDATE_SELECTOR = 'h1, h2, h3, h4, h5, h6, span, strong, em, b, a, p';

function isGradientText(el: HTMLElement): boolean {
  const s = getComputedStyle(el);
  const clip = s.getPropertyValue('-webkit-background-clip') || s.backgroundClip;
  return (
    clip.includes('text') &&
    s.backgroundImage.includes('gradient') &&
    s.animationName === 'none'
  );
}

function init(): void {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasHover = window.matchMedia('(hover: hover)').matches;
  if (reduceMotion || !hasHover) return;

  const targets = Array.from(
    document.querySelectorAll<HTMLElement>(CANDIDATE_SELECTOR),
  ).filter(isGradientText);

  if (targets.length === 0) return;

  targets.forEach((el) => el.classList.add('gradient-follow'));

  const root = document.documentElement;
  let mx = 50;
  let my = 50;
  let ticking = false;

  function apply(): void {
    ticking = false;
    root.style.setProperty('--gradient-mx', `${mx}%`);
    root.style.setProperty('--gradient-my', `${my}%`);
  }

  window.addEventListener(
    'pointermove',
    (e) => {
      mx = (e.clientX / window.innerWidth) * 100;
      my = (e.clientY / window.innerHeight) * 100;
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(apply);
      }
    },
    { passive: true },
  );
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

export {};
