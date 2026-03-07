/**
 * Tune Clinic — Shared Nav + Footer Component
 * Auto-detects language (en / zh / ja) from URL path.
 * Usage: <script src="../common.js"></script> or <script src="common.js"></script>
 */
(function () {
  const path = window.location.pathname;
  const inZh = path.includes('/zh/');
  const inJa = path.includes('/ja/');
  const root = inZh || inJa ? '../' : '';

  /* ── Language copy ──────────────────────────────────────── */
  const L = {
    en: {
      staffBadge: 'English Fluent Staff',
      travelBadge: 'Travel Curated',
      tagline: 'Experience Precise K-Beauty Medicine',
      openToday: 'Open Today',
      monFri: 'Mon-Fri', sat: 'Sat', sun: 'Sun', closed: 'Closed',
      location: 'Apgujeong, Seoul',
      home: 'Home', method: 'Design Method', programs: 'Programs',
      gallery: 'Before/After', faq: 'FAQ', contact: 'Contact',
      sig: 'Signature Lifting', reset: 'Structural Reset Elite',
      collagen: 'The Collagen Builder', filler: 'Filler Chamaka-se',
      footerTitle: "Secure Your 'Chamaka-se' Plan",
      footerSub: 'Connect directly with our English-speaking staff.<br>Send a photo for a preliminary assessment.',
      footerCta: 'Start Consultation',
      footerResponse: 'Typical response time: Within clinic hours (Mon-Sat).',
      footerCopy: '© 2026 Apgujeong Tune Clinic. Evidence-Based Aesthetics.<br><span class="opacity-50">Final payment is processed in KRW at the clinic.</span>',
      mobileCta1: 'Programs', mobileCta2: 'Start Consultation',
      langLabel: 'EN', langActive: 'en',
    },
    zh: {
      staffBadge: '全程中文服务',
      travelBadge: '旅行定制',
      tagline: '体验精准韩国医学美容',
      openToday: '今日营业',
      monFri: '周一至周五', sat: '周六', sun: '周日', closed: '休息',
      location: '首尔 狎鸥亭',
      home: '首页', method: '设计理念', programs: '诊疗方案',
      gallery: '前后对比', faq: '常见问题', contact: '联系我们',
      sig: 'Signature Lifting', reset: 'Structural Reset Elite',
      collagen: 'The Collagen Builder', filler: 'Filler Chamaka-se',
      footerTitle: '预约您的"Chamaka-se"方案',
      footerSub: '直接联系我们的中文工作人员。<br>发送照片进行初步评估。',
      footerCta: '开始咨询',
      footerResponse: '典型回复时间：营业时间内（周一至周六）。',
      footerCopy: '© 2026 狎鸥亭 Tune Clinic. 循证医学美容。<br><span class="opacity-50">最终付款在诊所以韩元结算。</span>',
      mobileCta1: '诊疗方案', mobileCta2: '开始咨询',
      langLabel: '中文', langActive: 'zh',
    },
    ja: {
      staffBadge: '日本語対応スタッフ',
      travelBadge: '旅行者向けカスタム',
      tagline: '精密なK-Beautyを体験',
      openToday: '本日営業中',
      monFri: '月〜金', sat: '土曜', sun: '日曜', closed: '休診',
      location: 'ソウル 狎鸥亭',
      home: 'ホーム', method: 'デザインメソッド', programs: 'プログラム',
      gallery: '症例写真', faq: 'よくある質問', contact: 'お問い合わせ',
      sig: 'Signature Lifting', reset: 'Structural Reset Elite',
      collagen: 'The Collagen Builder', filler: 'Filler Chamaka-se',
      footerTitle: "「Chamaka-se」プランをご予約",
      footerSub: '日本語スタッフに直接お問い合わせください。<br>お写真をお送りいただくと事前評価が可能です。',
      footerCta: '相談を始める',
      footerResponse: '通常の返信時間：診療時間内（月〜土）。',
      footerCopy: '© 2026 狎鸥亭 Tune Clinic. エビデンスに基づく美容医療。<br><span class="opacity-50">最終お支払いはウォン建てにてクリニックにて。</span>',
      mobileCta1: 'プログラム', mobileCta2: '相談を始める',
      langLabel: '日本語', langActive: 'ja',
    },
  };
  const lang = inZh ? 'zh' : inJa ? 'ja' : 'en';
  const t = L[lang];

  /* ── URL helpers ────────────────────────────────────────── */
  const r = (p) => root + p;          // root-relative file
  const lk = {
    home:     lang === 'en' ? r('index.html') : r('index.html'),
    method:   r(lang === 'en' ? 'design-method.html' : '../design-method.html'),
    sig:      r(lang === 'en' ? 'signature-lifting.html' : '../signature-lifting.html'),
    reset:    r(lang === 'en' ? 'structural-reset.html' : '../structural-reset.html'),
    collagen: r(lang === 'en' ? 'collagen-builder.html' : '../collagen-builder.html'),
    filler:   r(lang === 'en' ? 'filler-chamaka-se.html' : '../filler-chamaka-se.html'),
    gallery:  r(lang === 'en' ? 'gallery.html' : '../gallery.html'),
    en:       root === '' ? 'index.html' : '../index.html',
    zh:       root === '' ? 'zh/index.html' : (inZh ? 'index.html' : '../zh/index.html'),
    ja:       root === '' ? 'ja/index.html' : (inJa ? 'index.html' : '../ja/index.html'),
    logo:     r('/.netlify/images?url=/logo.png&w=200&fm=webp&q=90'),
    instagram: 'https://www.instagram.com/tuneclinic_english/',
  };

  /* ── Topbar ─────────────────────────────────────────────── */
  function buildTopbar() {
    const el = document.getElementById('tc-topbar');
    if (!el) return;
    el.className = 'bg-slate-900 text-white text-xs py-3 border-b border-slate-800';
    el.innerHTML = `
<div class="max-w-7xl mx-auto px-6 flex justify-between items-center">
  <div class="flex items-center space-x-6">
    <span class="flex items-center"><i class="fas fa-user-md text-gold mr-2"></i> ${t.staffBadge}</span>
    <span class="hidden sm:inline text-slate-400">${t.travelBadge}</span>
  </div>
  <div class="hidden md:block absolute left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-widest text-gold">
    ${t.tagline}
  </div>
  <div class="flex items-center gap-4">
    <div class="group relative cursor-pointer hidden md:block">
      <span class="hover:text-gold transition font-bold uppercase tracking-wider text-[10px] flex items-center gap-1">
        <i class="far fa-clock"></i> ${t.openToday}
      </span>
      <div class="absolute right-0 top-full mt-2 w-48 bg-white text-slate-800 shadow-xl rounded-sm p-3 hidden group-hover:block z-50 border border-slate-100 text-[10px]">
        <div class="flex justify-between mb-1"><span>${t.monFri}</span><span class="font-bold">10:00 - 21:00</span></div>
        <div class="flex justify-between mb-1"><span>${t.sat}</span><span class="font-bold">10:00 - 16:00</span></div>
        <div class="flex justify-between text-red-400"><span>${t.sun}</span><span class="font-bold">${t.closed}</span></div>
      </div>
    </div>
    <span class="font-bold uppercase tracking-wider text-[10px]">${t.location}</span>
    <div class="group relative cursor-pointer">
      <span class="hover:text-gold transition font-bold text-[10px] flex items-center gap-1">
        <i class="fas fa-globe"></i> ${t.langLabel}
      </span>
      <div class="absolute right-0 top-full pt-2 w-36 hidden group-hover:block z-50">
        <div class="bg-white text-slate-800 shadow-xl rounded-sm border border-slate-100 text-xs">
          <a href="${lk.en}" class="block px-4 py-2.5 ${lang==='en'?'font-bold text-gold border-b border-slate-50':'hover:bg-slate-50 hover:text-gold transition'}">English</a>
          <a href="${lk.zh}" class="block px-4 py-2.5 ${lang==='zh'?'font-bold text-gold border-b border-slate-50':'hover:bg-slate-50 hover:text-gold transition'}">中文</a>
          <a href="${lk.ja}" class="block px-4 py-2.5 ${lang==='ja'?'font-bold text-gold border-b border-slate-50':'hover:bg-slate-50 hover:text-gold transition'}">日本語</a>
        </div>
      </div>
    </div>
  </div>
</div>`;
  }

  /* ── Navbar ─────────────────────────────────────────────── */
  function buildNav() {
    const el = document.getElementById('tc-nav');
    if (!el) return;
    el.id = 'navbar';
    el.className = 'bg-white border-b border-slate-100 sticky top-0 z-40 transition-all duration-300';
    el.innerHTML = `
<div class="max-w-7xl mx-auto px-6">
  <div class="flex justify-between items-center h-16">
    <a href="${lk.home}" class="flex items-center gap-2">
      <img src="${lk.logo}" alt="Tune Clinic" class="h-8">
      <span class="font-serif text-xl font-bold text-slate-900 tracking-tight">Tune Clinic</span>
    </a>
    <div class="hidden md:flex items-center gap-8 text-sm font-bold text-slate-600">
      <a href="${lk.home}" class="hover:text-gold transition">${t.home}</a>
      <a href="${lk.method}" class="hover:text-gold transition">${t.method}</a>
      <div class="relative group h-16 flex items-center">
        <button class="hover:text-gold transition flex items-center gap-1 cursor-pointer focus:outline-none">
          ${t.programs} <i class="fas fa-chevron-down text-[10px] opacity-50"></i>
        </button>
        <div class="absolute top-full left-1/2 -translate-x-1/2 w-56 bg-white shadow-xl border border-slate-100 rounded-b-sm hidden group-hover:block">
          <div class="py-2">
            <a href="${lk.sig}"     class="block px-5 py-3 hover:bg-slate-50 hover:text-gold transition text-left text-slate-700">${t.sig}</a>
            <a href="${lk.reset}"   class="block px-5 py-3 hover:bg-slate-50 hover:text-gold transition text-left text-slate-700">${t.reset}</a>
            <a href="${lk.collagen}"class="block px-5 py-3 hover:bg-slate-50 hover:text-gold transition text-left text-slate-700">${t.collagen}</a>
            <a href="${lk.filler}"  class="block px-5 py-3 hover:bg-slate-50 hover:text-gold transition text-left text-slate-700">${t.filler}</a>
          </div>
        </div>
      </div>
      <a href="${lk.gallery}" class="hover:text-gold transition">${t.gallery}</a>
      <a href="#faq"     class="hover:text-gold transition">${t.faq}</a>
      <a href="#contact" class="hover:text-gold transition">${t.contact}</a>
    </div>
    <button id="mobile-menu-btn" class="md:hidden text-slate-900 text-lg focus:outline-none"><i class="fas fa-bars"></i></button>
  </div>
</div>
<div id="mobile-menu" class="hidden md:hidden border-t border-slate-100 bg-white absolute w-full left-0 shadow-xl">
  <a href="${lk.home}"    class="block px-6 py-4 font-bold border-b border-slate-50 text-slate-800">${t.home}</a>
  <a href="${lk.method}"  class="block px-6 py-4 font-bold border-b border-slate-50 text-slate-800">${t.method}</a>
  <div class="bg-slate-50 px-6 py-4 border-b border-slate-50">
    <p class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">${t.programs}</p>
    <a href="${lk.sig}"     class="block py-2 text-slate-700">${t.sig}</a>
    <a href="${lk.reset}"   class="block py-2 text-slate-700">${t.reset}</a>
    <a href="${lk.collagen}"class="block py-2 text-slate-700">${t.collagen}</a>
    <a href="${lk.filler}"  class="block py-2 text-slate-700">${t.filler}</a>
  </div>
  <a href="${lk.gallery}" class="block px-6 py-4 font-bold border-b border-slate-50 text-slate-800">${t.gallery}</a>
  <a href="#faq"     class="block px-6 py-4 font-bold border-b border-slate-50 text-slate-800">${t.faq}</a>
  <a href="#contact" class="block px-6 py-4 font-bold text-slate-800">${t.contact}</a>
</div>`;
    // Mobile menu toggle
    document.getElementById('mobile-menu-btn')?.addEventListener('click', () => {
      document.getElementById('mobile-menu')?.classList.toggle('hidden');
    });
  }

  /* ── Footer ─────────────────────────────────────────────── */
  function buildFooter() {
    const el = document.getElementById('tc-footer');
    if (!el) return;
    el.id = 'contact';
    el.className = 'bg-slate-900 text-white py-24 text-center border-t border-slate-800';
    el.innerHTML = `
<div class="max-w-xl mx-auto px-6">
  <h2 class="text-3xl font-serif mb-6">${t.footerTitle}</h2>
  <p class="text-slate-400 mb-10 leading-relaxed">${t.footerSub}</p>
  <div class="flex flex-col sm:flex-row gap-4 justify-center">
    <a href="${lk.instagram}" target="_blank"
       class="bg-slate-800 text-white px-10 py-4 font-bold rounded-sm hover:bg-slate-700 transition
              flex items-center justify-center gap-2 shadow-lg w-full sm:w-auto text-lg border border-slate-700">
      <i class="fab fa-instagram"></i> ${t.footerCta}
    </a>
  </div>
  <p class="text-xs text-slate-400 mt-4">${t.footerResponse}</p>
  <p class="text-slate-400 text-sm mt-8">
    <i class="fas fa-map-marker-alt mr-1"></i> 5th floor, 868, Nonhyeon-ro, Gangnam-gu, Seoul
    &nbsp;·&nbsp;
    <i class="fas fa-phone-alt mr-1"></i>
    <a href="tel:+82-507-1438-8022" class="hover:text-gold transition">+82-507-1438-8022</a>
  </p>
  <p class="text-xs text-slate-600 mt-12">${t.footerCopy}</p>
</div>`;
  }

  /* ── Mobile sticky bar ──────────────────────────────────── */
  function buildMobileBar() {
    const el = document.getElementById('tc-mobile-bar');
    if (!el) return;
    el.className = 'fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 md:hidden z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]';
    el.innerHTML = `
<div class="flex gap-3">
  <a href="#programs" class="flex-1 bg-slate-100 text-slate-900 font-bold py-3 rounded-sm text-center text-sm">${t.mobileCta1}</a>
  <a href="${lk.instagram}" target="_blank"
     class="flex-1 bg-slate-900 text-white font-extrabold py-3 rounded-sm text-center text-sm flex items-center justify-center gap-2">
    <i class="fab fa-instagram"></i> ${t.mobileCta2}
  </a>
</div>`;
  }

  document.addEventListener('DOMContentLoaded', () => {
    buildTopbar();
    buildNav();
    buildFooter();
    buildMobileBar();
  });
})();
