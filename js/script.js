/* =========================================================
   HACIENDA LA AMALIA — interacciones
   ========================================================= */
(function () {
  "use strict";

  const hasGSAP = typeof window.gsap !== "undefined";
  const hasLenis = typeof window.Lenis !== "undefined";
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

  /* ---------- PRELOADER ---------- */
  function endPreloader() {
    const pre = $("#preloader");
    document.body.classList.remove("is-loading");
    if (pre) pre.classList.add("done");
    document.dispatchEvent(new Event("amalia:ready"));
  }
  window.addEventListener("load", () => setTimeout(endPreloader, 1400));
  // Failsafe en caso de que 'load' tarde demasiado
  setTimeout(endPreloader, 4200);

  /* ---------- SMOOTH SCROLL (Lenis) + GSAP ---------- */
  let lenis = null;
  if (hasLenis && !reduce) {
    lenis = new Lenis({ duration: 1.15, smoothWheel: true, lerp: 0.09 });
    window.lenis = lenis;
    // Un SOLO driver para Lenis. Con GSAP, lo maneja el ticker (no usar también
    // un requestAnimationFrame propio: el doble rAF le da deltas inconsistentes
    // y congela el scroll).
    if (hasGSAP && window.ScrollTrigger) {
      lenis.on("scroll", window.ScrollTrigger.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (time) => { lenis.raf(time); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }

  /* Navegación interna respetando Lenis */
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (id.length < 2) return;
      const target = $(id);
      if (!target) return;
      e.preventDefault();
      closeMenu();
      if (lenis) lenis.scrollTo(target, { offset: -10, duration: 1.3 });
      else target.scrollIntoView({ behavior: "smooth" });
    });
  });

  /* ---------- NAV scrolled state ---------- */
  const nav = $("#nav");
  function onScroll() {
    const y = window.scrollY || window.pageYOffset;
    if (nav) nav.classList.toggle("scrolled", y > 70);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- MENÚ móvil ---------- */
  const burger = $("#burger");
  function closeMenu() {
    if (!nav) return;
    nav.classList.remove("menu-open");
    if (burger) burger.setAttribute("aria-expanded", "false");
  }
  if (burger) {
    burger.addEventListener("click", () => {
      const open = nav.classList.toggle("menu-open");
      burger.setAttribute("aria-expanded", String(open));
    });
  }

  /* ---------- REVEAL (IntersectionObserver, robusto) ---------- */
  function initReveals() {
    const items = $$(".reveal, .reveal-img");
    if (!("IntersectionObserver" in window)) {
      items.forEach((el) => el.classList.add("in"));
      $$("[data-tone]").forEach((el) => el.classList.add("toned"));
      return;
    }
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          if (entry.target.matches("[data-tone]")) entry.target.classList.add("toned");
          const tone = entry.target.querySelector ? entry.target : null;
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.16, rootMargin: "0px 0px -8% 0px" });
    items.forEach((el) => io.observe(el));

    // data-tone en figuras que no son .reveal-img
    const toneIO = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { entry.target.classList.add("toned"); obs.unobserve(entry.target); }
      });
    }, { threshold: 0.2 });
    $$("[data-tone]").forEach((el) => toneIO.observe(el));
  }

  /* ---------- PARALLAX + GSAP scenes ---------- */
  function initGSAP() {
    if (!hasGSAP || !window.ScrollTrigger || reduce) return;
    gsap.registerPlugin(window.ScrollTrigger);

    // Parallax estándar
    $$("[data-parallax]").forEach((el) => {
      const img = el.querySelector("img") || el;
      gsap.fromTo(img, { yPercent: -8 }, {
        yPercent: 8, ease: "none",
        scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true },
      });
    });
    $$("[data-parallax-slow]").forEach((el) => {
      const img = el.querySelector("img") || el;
      gsap.fromTo(img, { yPercent: -4 }, {
        yPercent: 6, ease: "none",
        scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true },
      });
    });

    // Moneda giratoria
    const coin = $("#coin");
    if (coin) {
      gsap.to(coin, {
        rotateY: 720, ease: "none",
        scrollTrigger: { trigger: ".moneda", start: "top bottom", end: "bottom top", scrub: 1 },
      });
    }

    initHeroScrub();
    initTimelineFill();

    setTimeout(() => window.ScrollTrigger.refresh(), 300);
  }

  /* Línea de tiempo vertical: el hilo de latón se "desenrolla" con el scroll.
     Scrub de ScrollTrigger (sin pin) → robusto y reversible. */
  function initTimelineFill() {
    if (!hasGSAP || !window.ScrollTrigger || reduce) return;
    var fill = $("#tl-fill");
    var rail = $(".timeline__rail");
    if (!fill || !rail) return;
    gsap.fromTo(fill, { scaleY: 0 }, {
      scaleY: 1, ease: "none", transformOrigin: "top center",
      scrollTrigger: { trigger: rail, start: "top 78%", end: "bottom 72%", scrub: true },
    });
  }

  /* ---------- CONTADORES ---------- */
  function initCounters() {
    const nums = $$("[data-count]");
    if (!nums.length || !("IntersectionObserver" in window)) {
      nums.forEach((n) => (n.textContent = (+n.dataset.count).toLocaleString("es-CO")));
      return;
    }
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const target = +el.dataset.count;
        const dur = 1500;
        const start = performance.now();
        function tick(now) {
          const p = Math.min(1, (now - start) / dur);
          const eased = 1 - Math.pow(1 - p, 3);
          const val = Math.round(eased * target);
          el.textContent = target >= 1000 ? String(val) : val.toLocaleString("es-CO");
          if (p < 1) requestAnimationFrame(tick);
          else el.textContent = target >= 1000 ? String(target) : target.toLocaleString("es-CO");
        }
        requestAnimationFrame(tick);
        obs.unobserve(el);
      });
    }, { threshold: 0.6 });
    nums.forEach((n) => io.observe(n));
  }

  /* ---------- CALENDARIO (mockup dashboard) ---------- */
  function buildCalendar() {
    const cal = $("#cal");
    if (!cal) return;
    const heads = ["L", "M", "M", "J", "V", "S", "D"];
    heads.forEach((h) => {
      const s = document.createElement("span");
      s.className = "head"; s.textContent = h; cal.appendChild(s);
    });
    // Junio 2026 empieza lunes; 30 días
    const busy = [4, 5, 6, 11, 12, 13, 18, 19, 20, 26, 27];
    const soft = [7, 14, 21, 25, 28];
    for (let d = 1; d <= 30; d++) {
      const s = document.createElement("span");
      s.textContent = d;
      if (busy.includes(d)) s.classList.add("busy");
      else if (soft.includes(d)) s.classList.add("soft");
      cal.appendChild(s);
    }
  }

  /* ---------- FORMULARIO → WHATSAPP ---------- */
  function initForm() {
    const form = $("#rsv-form");
    if (!form) return;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const data = new FormData(form);
      const name = (data.get("name") || "").toString().trim();
      const type = (data.get("type") || "información").toString();
      const date = (data.get("date") || "").toString();
      const people = (data.get("people") || "").toString();
      const msg = (data.get("msg") || "").toString().trim();

      if (!name) {
        const f = $("#f-name");
        if (f) { f.focus(); f.style.borderColor = "var(--cereza)"; }
        return;
      }

      let text = `Hola, soy ${name}. Quiero ${type} en Hacienda La Amalia.`;
      if (date) text += ` Fecha: ${date}.`;
      if (people) text += ` Personas: ${people}.`;
      if (msg) text += ` ${msg}`;

      const url = "https://wa.me/573006405986?text=" + encodeURIComponent(text);
      window.open(url, "_blank", "noopener");
    });
  }

  /* ---------- HERO: scroll-scrub de video (secuencia de frames en <img>) ---------- */
  // Set de frames según dispositivo: ≤1024px (móvil/tablet/landscape) = liviano (60 @ 1024px),
  // desktop = 120 @ 1280px. Cubre teléfonos en horizontal y tablets sin bajar 9 MB.
  var HERO_MOBILE = window.matchMedia("(max-width: 1024px)").matches;
  var HERO_DIR = HERO_MOBILE ? "assets/hero-frames-m" : "assets/hero-frames";
  var HERO_FRAMES = HERO_MOBILE ? 60 : 120;
  var heroSeq = $("#hero-seq");
  var heroPreload = [];
  var heroMode = "scrub";
  var heroCurrent = -1;

  function heroFramePath(i) {
    return HERO_DIR + "/frame_" + String(i).padStart(4, "0") + ".jpg";
  }
  function heroIsStatic() {
    // El scrub SÍ corre en móvil (touch). Solo estático si el usuario pide menos
    // movimiento, está en ahorro de datos, o no hay GSAP.
    if (reduce) return true;
    var c = navigator.connection || navigator.webkitConnection;
    if (c && c.saveData) return true;
    return !hasGSAP || !heroSeq;
  }
  function preloadHeroFrames() {
    // Calienta la caché HTTP. NO forzamos decode de todos los frames: mantener
    // cientos de bitmaps decodificados (1280x720 ≈ 3.7 MB c/u) reventaría la RAM en móvil.
    // El navegador decodifica bajo demanda al asignar src y gestiona su propia caché.
    for (var i = 0; i < HERO_FRAMES; i++) {
      var img = new Image();
      img.src = heroFramePath(i + 1);
      heroPreload.push(img);
    }
  }
  function showHeroFrame(i) {
    i = Math.max(0, Math.min(HERO_FRAMES - 1, i | 0));
    if (i === heroCurrent || !heroSeq) return;
    heroCurrent = i;
    heroSeq.src = heroFramePath(i + 1);
  }
  function initHero() {
    var hero = $(".hero");
    if (!hero) return;
    // Poster del set correcto (en móvil evita arrastrar el frame desktop del HTML).
    if (HERO_MOBILE && heroSeq) heroSeq.src = heroFramePath(1);
    if (heroIsStatic()) {
      heroMode = "static";
      hero.classList.add("hero--static");
      return;
    }
    heroMode = "scrub";
    preloadHeroFrames();
  }
  function initHeroScrub() {
    if (heroMode !== "scrub" || !heroSeq || !window.ScrollTrigger) return;
    var heroContent = $(".hero__content");
    var heroScroll = $(".hero__scroll");
    window.ScrollTrigger.create({
      trigger: ".hero", start: "top top", end: "bottom bottom", scrub: true,
      onUpdate: function (self) {
        var p = self.progress;
        showHeroFrame(Math.round(p * (HERO_FRAMES - 1)));
        if (heroContent) {
          heroContent.style.opacity = String(Math.max(0, 1 - p / 0.4));
          heroContent.style.transform = "translateY(" + (-50 * p) + "px)";
        }
        if (heroScroll) heroScroll.style.opacity = String(Math.max(0, 1 - p / 0.12));
      },
    });
  }

  /* ---------- INIT ---------- */
  function init() {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    if (window.lenis) window.lenis.scrollTo(0, { immediate: true });
    initHero();
    initReveals();
    initCounters();
    buildCalendar();
    initForm();
    // GSAP después de que el preloader libere el scroll
    if (document.body.classList.contains("is-loading")) {
      document.addEventListener("amalia:ready", initGSAP, { once: true });
    } else {
      initGSAP();
    }
    window.addEventListener("resize", () => {
      if (hasGSAP && window.ScrollTrigger) window.ScrollTrigger.refresh();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
