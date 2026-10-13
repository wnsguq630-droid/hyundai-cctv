(() => {
  'use strict';
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const hero = document.querySelector('.hero');
  const header = document.querySelector('header');
  const figure = document.querySelector('.hero-visual');
  const running = new Set();
  const observerOptions = { threshold: .08 };
  let revealObserver;
  let heroObserver;
  let framePending = false;
  let motionPaused = false;

  // Independent of Firebase; no customer data or submission handlers here.
  let progress;
  if (header) {
    progress = document.createElement('span');
    progress.className = 'motion-progress';
    progress.setAttribute('aria-hidden', 'true');
    header.append(progress);
  }
  const updateScroll = () => {
    const position = window.scrollY;
    if (header) header.classList.toggle('is-scrolled', position > 12);
    if (progress) {
      const distance = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = distance > 0 ? Math.min(1, Math.max(0, position / distance)) : 0;
      progress.style.transform = `scaleX(${ratio})`;
    }
    framePending = false;
  };
  const scheduleScroll = () => {
    if (framePending) return;
    framePending = true;
    window.requestAnimationFrame(updateScroll);
  };
  window.addEventListener('scroll', scheduleScroll, { passive: true });
  window.addEventListener('resize', scheduleScroll, { passive: true });
  updateScroll();

  const animate = (element, type = 'up', delay = 0) => {
    if (preference.matches || motionPaused || !element.animate || element.contains(document.activeElement)) return;
    const narrow = window.matchMedia('(max-width:900px)').matches;
    let from = 'translateY(36px)';
    let duration = 800;
    if (type === 'headline') { from = 'translateY(42px)'; duration = 900; }
    if (type === 'image') {
      from = narrow ? 'translateY(30px) scale(.95)' : 'translateX(42px) scale(.95)';
      duration = 1100;
    }
    if (type === 'chip') { from = 'translateY(26px)'; duration = 700; }
    if (type === 'left') from = narrow ? 'translateY(30px)' : 'translateX(-34px)';
    if (type === 'right') from = narrow ? 'translateY(30px)' : 'translateX(34px)';
    const animation = element.animate([
      { opacity: 0, transform: from },
      { opacity: 1, transform: 'translate(0,0) scale(1)' }
    ], { duration, delay, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' });
    running.add(animation);
    animation.finished.then(() => running.delete(animation), () => running.delete(animation));
  };

  if (!preference.matches) {
    document.documentElement.classList.add('motion-enabled');
    const productImage = figure?.querySelector('img');
    if (productImage) {
      // Scan stays inside the photograph; the 5MP caption remains below it.
      const screen = document.createElement('div');
      screen.className = 'motion-screen';
      productImage.before(screen);
      screen.append(productImage);
      const scan = document.createElement('span');
      scan.className = 'motion-scan';
      scan.setAttribute('aria-hidden', 'true');
      screen.append(scan);
    }
    const caption = figure?.querySelector('figcaption');
    if (caption) {
      const toggle = document.createElement('button');
      toggle.className = 'motion-toggle';
      toggle.type = 'button';
      toggle.textContent = '효과 끄기';
      toggle.setAttribute('aria-label', '페이지의 모션 효과 끄기');
      toggle.addEventListener('click', () => {
        motionPaused = !motionPaused;
        document.documentElement.classList.toggle('motion-paused', motionPaused);
        toggle.textContent = motionPaused ? '효과 켜기' : '효과 끄기';
        toggle.setAttribute('aria-label', `페이지의 모션 효과 ${motionPaused ? '켜기' : '끄기'}`);
        if (motionPaused) {
          running.forEach(animation => animation.cancel());
          running.clear();
        }
      });
      caption.append(toggle);
    }
    if ('IntersectionObserver' in window) {
      revealObserver = new IntersectionObserver(entries => {
        entries.filter(entry => entry.isIntersecting).forEach(entry => {
          revealObserver.unobserve(entry.target);
          const siblings = Array.from(entry.target.parentElement.children);
          const index = siblings.indexOf(entry.target);
          const stagger = entry.target.matches('.benefit-card,.case-card') ? Math.min(index * 130, 260) : 0;
          const type = entry.target === figure ? 'image'
            : entry.target.matches('.offer-copy') ? 'left'
            : entry.target.matches('.offer-price') ? 'right' : 'up';
          animate(entry.target, type, stagger);
        });
      }, observerOptions);
      document.querySelectorAll('.section-head,.benefit-card,.offer-copy,.offer-price,.case-card,.faq')
        .forEach(element => revealObserver.observe(element));
      if (hero) {
        heroObserver = new IntersectionObserver(entries => {
          entries.forEach(entry => hero.classList.toggle('motion-active', entry.isIntersecting));
        }, { threshold: 0 });
        heroObserver.observe(hero);
      }
    } else if (hero) hero.classList.add('motion-active');

    if (hero && hero.getBoundingClientRect().bottom > 0) {
      const eyebrow = hero.querySelector('.eyebrow');
      if (eyebrow) animate(eyebrow, 'up');
      hero.querySelectorAll('.headline-line').forEach((line, index) => animate(line, 'headline', 100 + index * 150));
      const description = hero.querySelector('.hero-desc');
      if (description) animate(description, 'up', 300);
      hero.querySelectorAll('.hero-points>span').forEach((chip, index) => animate(chip, 'chip', 380 + index * 100));
      hero.querySelectorAll('.hero-price,.hero-actions,.hero-note').forEach((element, index) => animate(element, 'up', 600 + index * 70));
      if (figure) {
        if (figure.getBoundingClientRect().top < window.innerHeight) animate(figure, 'image', 150);
        else if (revealObserver) revealObserver.observe(figure);
      }
    }
  }

  // Focus and anchor navigation take priority over a fade animation.
  const finishInside = container => {
    running.forEach(animation => {
      const target = animation.effect?.target;
      if (target && (container.contains(target) || target.contains(container))) animation.finish();
    });
  };
  document.addEventListener('focusin', event => finishInside(event.target));
  document.addEventListener('click', event => {
    const link = event.target.closest?.('a[href^="#"]');
    if (!link) return;
    const id = link.getAttribute('href').slice(1);
    const destination = id && document.getElementById(id);
    if (!destination) return;
    const revealDestination = id === 'top' && hero ? hero : destination;
    finishInside(revealDestination);
    if (revealObserver) {
      revealObserver.unobserve(revealDestination);
      revealDestination.querySelectorAll('.section-head,.benefit-card,.offer-copy,.offer-price,.case-card,.faq,.hero-visual')
        .forEach(element => revealObserver.unobserve(element));
    }
  });
  const stopMotion = () => {
    if (!preference.matches) return;
    document.documentElement.classList.remove('motion-enabled');
    if (hero) hero.classList.remove('motion-active');
    if (revealObserver) revealObserver.disconnect();
    if (heroObserver) heroObserver.disconnect();
    running.forEach(animation => animation.cancel());
    running.clear();
  };
  if (preference.addEventListener) preference.addEventListener('change', stopMotion);
  document.addEventListener('visibilitychange', () => {
    if (!hero || preference.matches) return;
    if (document.hidden) hero.classList.remove('motion-active');
    else {
      const bounds = hero.getBoundingClientRect();
      hero.classList.toggle('motion-active', bounds.bottom > 0 && bounds.top < window.innerHeight);
    }
  });
})();
