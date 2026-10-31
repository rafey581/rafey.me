// Content pages: mobile menu + sticky-nav shading (no WebGL here)
const nav = document.querySelector('.nav');
const burger = document.getElementById('hamburger');
const menu = document.getElementById('mobileMenu');
const onScroll = () => nav.classList.toggle('scrolled', scrollY > 30);
addEventListener('scroll', onScroll, { passive: true });
onScroll();
burger.addEventListener('click', () => {
  const open = !menu.classList.contains('open');
  menu.classList.toggle('open', open);
  burger.classList.toggle('open', open);
  burger.setAttribute('aria-expanded', String(open));
});
document.querySelectorAll('#year').forEach(el => { el.textContent = new Date().getFullYear(); });
