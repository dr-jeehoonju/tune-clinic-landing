// All static, page-independent data extracted from the original
// monolithic render.js. Importing from here keeps render.js focused
// on rendering logic.

const { SITE_URL } = require("../url-helpers");

// All supported locales. `ko` is now a full locale (all pages translated).
const languageOrder = ["en", "ja", "zh", "th", "de", "fr", "ru", "vi", "ko"];

const SITE_NAME = "Tune Clinic";
const DEFAULT_OG_IMAGE = `${SITE_URL}/.netlify/images?url=/main.jpeg&w=1200&fm=webp&q=75`;
const GA_MEASUREMENT_ID = "G-P68CDTNEV1";

// Empty by default; set when registering with Google Search Console.
const GOOGLE_SEARCH_CONSOLE_VERIFICATION = "";

const CONSENT_COPY = {
  en: {
    title: "Cookie Preferences",
    body: "We use analytics cookies to understand traffic and improve the experience for international patients.",
    accept: "Accept Analytics",
    reject: "Reject",
  },
  ja: {
    title: "クッキー設定",
    body: "アクセス解析クッキーを使用して、訪問状況を把握し、海外患者向けの体験を改善します。",
    accept: "分析を許可",
    reject: "拒否",
  },
  zh: {
    title: "Cookie 偏好设置",
    body: "我们使用分析 Cookie 来了解访问情况，并持续优化国际患者的浏览体验。",
    accept: "接受分析",
    reject: "拒绝",
  },
  th: {
    title: "การตั้งค่าคุกกี้",
    body: "เราใช้คุกกี้วิเคราะห์เพื่อทำความเข้าใจการเข้าชมและปรับปรุงประสบการณ์สำหรับผู้ป่วยต่างชาติ",
    accept: "ยอมรับการวิเคราะห์",
    reject: "ปฏิเสธ",
  },
  de: {
    title: "Cookie-Einstellungen",
    body: "Wir verwenden Analyse-Cookies, um den Datenverkehr zu verstehen und die Erfahrung für internationale Patienten zu verbessern.",
    accept: "Analyse akzeptieren",
    reject: "Ablehnen",
  },
  fr: {
    title: "Préférences de cookies",
    body: "Nous utilisons des cookies d'analyse pour comprendre le trafic et améliorer l'expérience des patients internationaux.",
    accept: "Accepter l'analyse",
    reject: "Refuser",
  },
  ru: {
    title: "Настройки файлов cookie",
    body: "Мы используем аналитические файлы cookie для понимания трафика и улучшения опыта для международных пациентов.",
    accept: "Принять аналитику",
    reject: "Отклонить",
  },
  vi: {
    title: "Tùy chọn Cookie",
    body: "Chúng tôi sử dụng cookie phân tích để hiểu lưu lượng truy cập và cải thiện trải nghiệm cho bệnh nhân quốc tế.",
    accept: "Chấp nhận phân tích",
    reject: "Từ chối",
  },
};

const PHYSICIANS = [
  {
    slug: "cha-seung-yeon",
    name: "Dr. Seung Yeon Cha",
    image: `${SITE_URL}/.netlify/images?url=/cha.jpg&w=900&fm=webp&q=75`,
    jobTitle: "Medical Director",
    medicalSpecialty: "Aesthetic Medicine",
    description:
      "Physician-led aesthetic planning focused on lifting, structural balance, and travel-conscious treatment design.",
  },
  {
    slug: "kim-kwang-yeon",
    name: "Dr. Kwang Yeon Kim",
    image: `${SITE_URL}/.netlify/images?url=/kim_ky.jpg&w=500&fm=webp&q=75`,
    jobTitle: "Medical Director",
    medicalSpecialty: "Aesthetic Medicine",
    description:
      "Facial design strategy and physician supervision for structural protocols and international patient care.",
  },
  {
    slug: "ju-jee-hoon",
    name: "Dr. Jee Hoon Ju",
    image: `${SITE_URL}/.netlify/images?url=/ju.jpg&w=600&fm=webp&q=75`,
    avatarPosition: "object-top",
    jobTitle: "Aesthetic Medicine Physician",
    medicalSpecialty: "Aesthetic Medicine",
    description:
      "Aesthetic medicine, hair treatment, and regenerative planning with international communication support.",
  },
  {
    slug: "jo-dong-hyun",
    name: "Dr. Dong Hyun Jo",
    image: `${SITE_URL}/.netlify/images?url=/jo.jpg&w=600&fm=webp&q=75`,
    jobTitle: "Regenerative Medicine Physician",
    medicalSpecialty: "Regenerative Medicine",
    description:
      "Stem cell and regenerative strategy for tissue quality, recovery, and longer-term restoration planning.",
  },
  {
    slug: "kim-beom-jin",
    name: "Dr. Beom Jin Kim",
    image: `${SITE_URL}/.netlify/images?url=/kim_bj.jpg&w=600&fm=webp&q=75`,
    jobTitle: "Plastic Surgery Advisor",
    medicalSpecialty: "Plastic Surgery",
    description:
      "Plastic surgery depth supporting structural assessment, referral judgment, and reconstructive context.",
  },
  {
    slug: "jang-seung-woo",
    name: "Dr. Seung Woo Jang",
    image: `${SITE_URL}/.netlify/images?url=/jang.jpg&w=600&fm=webp&q=75`,
    jobTitle: "Medical Advisor",
    medicalSpecialty: "General Medicine",
    description:
      "MD, PhD advisory depth for broader medical evaluation and safety-focused treatment review.",
  },
];

const LOCALE_META = {
  en: { ogLocale: "en_US", ogAlternates: ["ja_JP", "zh_CN", "th_TH", "de_DE", "fr_FR", "ru_RU", "vi_VN", "ko_KR"] },
  ja: { ogLocale: "ja_JP", ogAlternates: ["en_US", "zh_CN", "th_TH", "de_DE", "fr_FR", "ru_RU", "vi_VN", "ko_KR"] },
  zh: { ogLocale: "zh_CN", ogAlternates: ["en_US", "ja_JP", "th_TH", "de_DE", "fr_FR", "ru_RU", "vi_VN", "ko_KR"] },
  th: { ogLocale: "th_TH", ogAlternates: ["en_US", "ja_JP", "zh_CN", "de_DE", "fr_FR", "ru_RU", "vi_VN", "ko_KR"] },
  de: { ogLocale: "de_DE", ogAlternates: ["en_US", "ja_JP", "zh_CN", "th_TH", "fr_FR", "ru_RU", "vi_VN", "ko_KR"] },
  fr: { ogLocale: "fr_FR", ogAlternates: ["en_US", "ja_JP", "zh_CN", "th_TH", "de_DE", "ru_RU", "vi_VN", "ko_KR"] },
  ru: { ogLocale: "ru_RU", ogAlternates: ["en_US", "ja_JP", "zh_CN", "th_TH", "de_DE", "fr_FR", "vi_VN", "ko_KR"] },
  vi: { ogLocale: "vi_VN", ogAlternates: ["en_US", "ja_JP", "zh_CN", "th_TH", "de_DE", "fr_FR", "ru_RU", "ko_KR"] },
  ko: { ogLocale: "ko_KR", ogAlternates: ["en_US", "ja_JP", "zh_CN", "th_TH", "de_DE", "fr_FR", "ru_RU", "vi_VN"] },
};

// Locale → BCP-47 tag for `Date.toLocaleDateString`.
const DATE_LOCALE_MAP = {
  en: "en-US",
  ja: "ja-JP",
  zh: "zh-CN",
  th: "th-TH",
  de: "de-DE",
  fr: "fr-FR",
  ru: "ru-RU",
  vi: "vi-VN",
  ko: "ko-KR",
};

// og:locale → ISO short code (used for hreflang filtering).
const OG_LOCALE_TO_CODE = {
  en_US: "en",
  ja_JP: "ja",
  zh_CN: "zh",
  th_TH: "th",
  de_DE: "de",
  fr_FR: "fr",
  ru_RU: "ru",
  vi_VN: "vi",
  ko_KR: "ko",
};

// Vendored CSS asset hrefs (relative URLs are served from /dist).
const SITE_CSS_HREF = "/css/site.css";
const FA_CSS_HREF = "/css/fontawesome-all.min.css";
// Latin: Playfair Display (display) + Lato (body).
// Korean: Noto Serif KR (display fallback for .font-serif) — body uses
// Pretendard, which is loaded separately from jsDelivr below.
const GOOGLE_FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=Lato:wght@300;400;700&family=Noto+Serif+KR:wght@400;600;700&display=swap";
// Pretendard is the de-facto premium Korean UI font and is not hosted on
// Google Fonts, so we serve the variable subset from jsDelivr.
const PRETENDARD_CSS_HREF =
  "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css";

const BRAND_INLINE_CSS =
  // Latin pages keep Lato; Korean characters fall through to Pretendard /
  // Apple SD Gothic Neo. `.font-serif` adds Noto Serif KR as a Korean
  // fallback so Playfair Display headings still look intentional in ko.
  "body{font-family:'Lato','Pretendard Variable','Pretendard','Apple SD Gothic Neo','Malgun Gothic',sans-serif}" +
  ".font-serif{font-family:'Playfair Display','Noto Serif KR',serif}" +
  // Korean web typography convention: never break in the middle of a word
  // and prefer wrapping at spaces. Scoped to :lang(ko) so other locales
  // are unaffected.
  ":lang(ko){word-break:keep-all;overflow-wrap:break-word;line-break:strict;letter-spacing:-0.01em}" +
  ":lang(ko) body,:lang(ko) p,:lang(ko) li,:lang(ko) span,:lang(ko) a,:lang(ko) h1,:lang(ko) h2,:lang(ko) h3,:lang(ko) h4,:lang(ko) h5,:lang(ko) h6{font-family:'Pretendard Variable','Pretendard','Apple SD Gothic Neo','Malgun Gothic',sans-serif}" +
  ":lang(ko) .font-serif{font-family:'Pretendard Variable','Pretendard','Noto Serif KR',serif;font-weight:700;letter-spacing:-0.02em}" +
  ".text-gold{color:#C5A059}.bg-gold{background-color:#C5A059}.border-gold{border-color:#C5A059}.bg-gold-light{background-color:#F9F5F0}";

const BLOG_PROSE_CSS =
  ".prose h2{font-family:'Playfair Display',serif;font-size:1.75rem;font-weight:600;color:#0f172a;margin-top:2.5rem;margin-bottom:1rem}" +
  ".prose h3{font-size:1.25rem;font-weight:700;color:#1e293b;margin-top:2rem;margin-bottom:0.75rem}" +
  ".prose p{color:#475569;line-height:1.8;margin-bottom:1.25rem}" +
  ".prose ul,.prose ol{color:#475569;margin-bottom:1.25rem;padding-left:1.5rem}.prose li{margin-bottom:0.5rem;line-height:1.7}.prose ul{list-style-type:disc}.prose ol{list-style-type:decimal}" +
  ".prose blockquote{border-left:4px solid #C5A059;padding:1rem 1.5rem;margin:1.5rem 0;background:#F9F5F0;color:#334155;font-style:italic}" +
  ".prose img{border-radius:0.75rem;margin:1.5rem 0;max-width:100%}" +
  ".prose a{color:#C5A059;text-decoration:underline;text-underline-offset:2px}.prose a:hover{color:#b8913f}" +
  ".prose table{width:100%;border-collapse:collapse;margin:1.5rem 0}.prose th,.prose td{border:1px solid #e2e8f0;padding:0.75rem 1rem;text-align:left;font-size:0.875rem}.prose th{background:#f8fafc;font-weight:700}" +
  ".prose hr{border:none;border-top:1px solid #e2e8f0;margin:2rem 0}.prose code{background:#f1f5f9;padding:0.15rem 0.4rem;border-radius:0.25rem;font-size:0.875rem}";

const LINE_CLAMP_CSS =
  ".line-clamp-2{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}";

module.exports = {
  languageOrder,
  SITE_NAME,
  SITE_URL,
  DEFAULT_OG_IMAGE,
  GA_MEASUREMENT_ID,
  GOOGLE_SEARCH_CONSOLE_VERIFICATION,
  CONSENT_COPY,
  PHYSICIANS,
  LOCALE_META,
  DATE_LOCALE_MAP,
  OG_LOCALE_TO_CODE,
  SITE_CSS_HREF,
  FA_CSS_HREF,
  GOOGLE_FONTS_HREF,
  PRETENDARD_CSS_HREF,
  BRAND_INLINE_CSS,
  BLOG_PROSE_CSS,
  LINE_CLAMP_CSS,
};
