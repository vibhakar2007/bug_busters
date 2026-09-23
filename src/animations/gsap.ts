import gsap from 'gsap';

export function isReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Apple-style subtle page entrance
 */
export function animatePageEntrance(container: HTMLElement | null) {
  if (!container || isReducedMotion()) return;

  gsap.fromTo(
    container,
    { opacity: 0, y: 12 },
    {
      opacity: 1,
      y: 0,
      duration: 0.45,
      ease: 'power2.out',
    }
  );
}

/**
 * Staggered card list reveal
 */
export function animateStaggerCards(selector: string | Element[]) {
  if (isReducedMotion()) return;

  gsap.fromTo(
    selector,
    { opacity: 0, y: 16 },
    {
      opacity: 1,
      y: 0,
      duration: 0.4,
      stagger: 0.06,
      ease: 'power2.out',
    }
  );
}

/**
 * Smooth transition when switching questions
 */
export function animateQuestionTransition(
  element: HTMLElement | null,
  direction: 'next' | 'prev' = 'next',
  onComplete?: () => void
) {
  if (!element || isReducedMotion()) {
    onComplete?.();
    return;
  }

  const offset = direction === 'next' ? 24 : -24;

  const tl = gsap.timeline({ onComplete });
  tl.fromTo(
    element,
    { opacity: 0, x: offset },
    { opacity: 1, x: 0, duration: 0.35, ease: 'power3.out' }
  );
}

/**
 * Smooth progress bar width tweening
 */
export function animateProgressBar(barElement: HTMLElement | null, percentage: number) {
  if (!barElement) return;
  if (isReducedMotion()) {
    barElement.style.width = `${percentage}%`;
    return;
  }

  gsap.to(barElement, {
    width: `${percentage}%`,
    duration: 0.4,
    ease: 'power2.out',
  });
}

/**
 * Subtle pulse for violation warning toast
 */
export function animateViolationAlert(element: HTMLElement | null) {
  if (!element || isReducedMotion()) return;

  gsap.fromTo(
    element,
    { opacity: 0, scale: 0.96, y: -10 },
    {
      opacity: 1,
      scale: 1,
      y: 0,
      duration: 0.3,
      ease: 'back.out(1.4)',
    }
  );
}

/**
 * Result score reveal count-up and entrance
 */
export function animateResultReveal(
  scoreElement: HTMLElement | null,
  targetScore: number,
  onUpdate?: (val: number) => void
) {
  if (!scoreElement) return;

  if (isReducedMotion()) {
    if (onUpdate) onUpdate(targetScore);
    return;
  }

  const counter = { val: 0 };
  gsap.to(counter, {
    val: targetScore,
    duration: 1.2,
    ease: 'power2.out',
    onUpdate: () => {
      if (onUpdate) {
        onUpdate(Math.round(counter.val));
      }
    },
  });
}

/**
 * Modal dialog entrance
 */
export function animateModalEntrance(element: HTMLElement | null) {
  if (!element || isReducedMotion()) return;

  gsap.fromTo(
    element,
    { opacity: 0, scale: 0.97, y: 8 },
    {
      opacity: 1,
      scale: 1,
      y: 0,
      duration: 0.25,
      ease: 'power2.out',
    }
  );
}
