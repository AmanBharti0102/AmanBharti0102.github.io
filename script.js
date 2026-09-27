const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;

// Footer year
document.getElementById("year").textContent = new Date().getFullYear();

// Dark / light toggle (remembered per browser)
const root = document.documentElement;
try {
  const saved = localStorage.getItem("theme");
  if (saved) root.dataset.theme = saved;
} catch (e) {}
document.getElementById("themeToggle").addEventListener("click", () => {
  const isDark = root.dataset.theme
    ? root.dataset.theme === "dark"
    : matchMedia("(prefers-color-scheme: dark)").matches;
  root.dataset.theme = isDark ? "light" : "dark";
  try { localStorage.setItem("theme", root.dataset.theme); } catch (e) {}
});

// Buttery smooth scrolling (Lenis). Falls back to native scrolling if unavailable.
let lenis = null;
if (!reduceMotion && window.Lenis) {
  lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 1, anchors: { offset: -64 } });
  (function raf(time) { lenis.raf(time); requestAnimationFrame(raf); })(performance.now());
} else {
  root.style.scrollBehavior = "smooth";
}

// Split section headings into words for a staggered rise
document.querySelectorAll("h2.split").forEach((h) => {
  let i = 0;
  const wrapWords = (node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.append(part); return; }
          const w = document.createElement("span");
          w.className = "word";
          w.innerHTML = `<span style="--i:${i++}"></span>`;
          w.firstChild.textContent = part;
          frag.append(w);
        });
        child.replaceWith(frag);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const w = document.createElement("span");
        w.className = "word";
        const inner = document.createElement("span");
        inner.style.setProperty("--i", i++);
        child.replaceWith(w);
        w.append(inner);
        inner.append(child);
      }
    });
  };
  wrapWords(h);
});

// Reveal elements as they scroll into view
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    const el = entry.target;
    el.classList.add("visible");
    el.querySelectorAll(".tags li").forEach((tag, i) => {
      tag.style.transitionDelay = `${350 + i * 45}ms`;
    });
    revealObserver.unobserve(el);
  });
}, { threshold: 0.15, rootMargin: "0px 0px -50px 0px" });
document.querySelectorAll(".reveal, .split").forEach((el) => revealObserver.observe(el));

// Count-up numbers in the hero
function countUp(el) {
  const target = parseFloat(el.dataset.count);
  const decimals = parseInt(el.dataset.decimals || "0", 10);
  const suffix = el.dataset.suffix || "";
  if (reduceMotion) { el.textContent = target.toFixed(decimals) + suffix; return; }
  const start = performance.now();
  const duration = 2000;
  (function tick(now) {
    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 4);
    el.textContent = (target * eased).toFixed(decimals) + suffix;
    if (t < 1) requestAnimationFrame(tick);
  })(start);
}
setTimeout(() => document.querySelectorAll("[data-count]").forEach(countUp), 800);

// Magnetic buttons: gently follow the cursor
if (finePointer && !reduceMotion) {
  document.querySelectorAll(".magnetic").forEach((btn) => {
    btn.addEventListener("mousemove", (e) => {
      const r = btn.getBoundingClientRect();
      const x = e.clientX - r.left - r.width / 2;
      const y = e.clientY - r.top - r.height / 2;
      btn.style.transform = `translate(${x * 0.25}px, ${y * 0.35}px)`;
    });
    btn.addEventListener("mouseleave", () => { btn.style.transform = ""; });
  });

  // Soft 3D tilt on project cards
  document.querySelectorAll(".tilt").forEach((card) => {
    card.addEventListener("mousemove", (e) => {
      if (!card.classList.contains("visible")) return;
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `rotateY(${px * 8}deg) rotateX(${-py * 8}deg) translateY(-6px)`;
    });
    card.addEventListener("mouseleave", () => { card.style.transform = ""; });
  });
}

// Scroll-linked effects
const progress = document.getElementById("progress");
const nav = document.getElementById("nav");
const hero = document.getElementById("hero");
const heroMedia = document.querySelector(".hero-media");
const heroContent = document.getElementById("heroContent");
const heroVideo = heroMedia.querySelector("video");
const timeline = document.getElementById("timeline");
const parallaxEls = [...document.querySelectorAll(".parallax")];
const navLinks = [...document.querySelectorAll(".nav nav a")];
const sections = navLinks.map((a) => document.querySelector(a.getAttribute("href")));
let lastY = 0;

function update() {
  const y = window.scrollY;
  const vh = innerHeight;
  const max = document.documentElement.scrollHeight - vh;
  progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;

  // Nav: transparent over the hero video, hides on scroll down, returns on scroll up
  const heroH = hero.offsetHeight;
  nav.classList.toggle("on-dark", y < heroH - 80);
  nav.classList.toggle("compact", y > 40);
  nav.classList.toggle("hidden", y > heroH && y > lastY + 2);
  if (y < lastY - 2) nav.classList.remove("hidden");
  lastY = y;

  if (!reduceMotion) {
    // Hero: video drifts slower, content lifts and fades
    if (y < heroH) {
      const p = y / heroH;
      heroMedia.style.transform = `translate3d(0, ${y * 0.4}px, 0) scale(${1 + p * 0.12})`;
      heroContent.style.transform = `translate3d(0, ${y * -0.15}px, 0)`;
      heroContent.style.opacity = String(1 - p * 1.3);
    }

    // Parallax images
    parallaxEls.forEach((el) => {
      const r = el.parentElement.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      const offset = (r.top + r.height / 2 - vh / 2) * -parseFloat(el.dataset.speed || 0.2);
      el.style.transform = `translate3d(0, ${offset}px, 0)`;
    });

    // Timeline line draws as you scroll
    const tr = timeline.getBoundingClientRect();
    const tp = (vh * 0.7 - tr.top) / tr.height;
    timeline.style.setProperty("--line-progress", Math.max(0, Math.min(1, tp)).toFixed(4));
  }

  // Pause the video when it is off-screen to save battery
  if (y > heroH) { if (!heroVideo.paused) heroVideo.pause(); }
  else if (heroVideo.paused && !reduceMotion) heroVideo.play().catch(() => {});

  // Highlight the current section in the nav
  let current = -1;
  sections.forEach((s, i) => { if (s && s.getBoundingClientRect().top < vh * 0.4) current = i; });
  navLinks.forEach((a, i) => a.classList.toggle("active", i === current));
}

if (lenis) {
  lenis.on("scroll", update);
} else {
  let ticking = false;
  window.addEventListener("scroll", () => {
    if (!ticking) { requestAnimationFrame(() => { update(); ticking = false; }); ticking = true; }
  }, { passive: true });
}
window.addEventListener("resize", update);
update();

if (reduceMotion) heroVideo.pause();
