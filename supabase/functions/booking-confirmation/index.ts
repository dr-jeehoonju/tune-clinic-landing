import "@supabase/functions-js/edge-runtime.d.ts";

import {
  CLINIC_EMAILS,
  notifyAll,
  sendEmail,
} from "../_shared/email.ts";
import { dDayLabel, formatDate, kstToLocal } from "../_shared/format.ts";
import { LOCALE_LABELS_KO, treatmentList } from "../_shared/locale.ts";
import { manageUrl } from "../_shared/booking-urls.ts";
import {
  clinicActionsHtml,
  clinicContactHtml,
  clinicLocationHtml,
  clinicQuickReplyHtml,
} from "../_shared/clinic-html.ts";

interface BookingRecord {
  id: string;
  patient_name: string;
  patient_email: string | null;
  patient_phone: string | null;
  treatment_interest: string[];
  message: string | null;
  locale: string;
  patient_timezone: string;
  appointment_date: string;
  appointment_time: string;
  created_at: string;
  // Optional — only populated when the patient ticked the IV sedation
  // opt-in on the booking form. Drives a fasting + safety-consult
  // reminder block in the patient confirmation email.
  iv_sedation_requested?: boolean | null;
}

interface WebhookPayload {
  type: "INSERT";
  table: string;
  record: BookingRecord;
  schema: string;
}

// ── Patient-facing email i18n ──
//
// Every visible string in the booking-acknowledgement email is sourced
// from this dictionary so adding a new locale is a copy-translate task
// rather than an HTML refactor. Politeness rules per locale:
//   ko — 존댓말
//   ja — 丁寧語 (です/ます/いたします)
//   zh — formal (您 / 请 / 我们)
//   de — Sie-form
//   fr — vous
//   ru — Вы (capital, formal address)
//   th — formal/polite, neutral clinic voice (ค่ะ)
//   vi — Quý khách / formal
//
// Layout note: KO uses the existing two-row messenger CTA (WhatsApp +
// Instagram on row 1, phone on row 2). All other locales keep the
// original four-channel layout (WhatsApp + Instagram on row 1, LINE +
// WeChat on row 2).

interface PatientEmailDict {
  langAttr: string;
  subject: (date: string, time: string) => string;
  headerTitle: string;
  intro: (name: string) => string;
  dateLabel: string;
  timeLabel: string;
  programLabel: string;
  badge: string;
  whatNextHeader: string;
  whatNextSteps: [string, string, string];
  noFurtherAction: string;
  messengerHeader: string;
  messengerHint: string;
  hoursLine: string;
  manageHeader: string;
  manageBtn: string;
  programBtn: string;
  addressHeader: string;
  addressLine1: string;
  addressLine2: string;
  copyright: string;
  // KO uses Phone for the second messenger row; everyone else uses
  // LINE + WeChat. Encoded as a discriminator so the layout decision is
  // localizable rather than hard-coded to `locale === "ko"`.
  messengerRow2: "phone" | "line_wechat";
  // IV sedation safety reminder — only rendered when
  // `iv_sedation_requested === true`. Title shows in the callout header,
  // body is the explanatory paragraph (8h fasting + DM consult).
  ivSedationReminder: { title: string; body: string };
}

const PATIENT_EMAIL_FONT_STACK: Record<string, string> = {
  ko:
    "-apple-system,BlinkMacSystemFont,'Segoe UI','Apple SD Gothic Neo','Malgun Gothic',sans-serif",
  ja:
    "-apple-system,BlinkMacSystemFont,'Segoe UI','Hiragino Sans','Yu Gothic',sans-serif",
  zh:
    "-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif",
  th:
    "-apple-system,BlinkMacSystemFont,'Segoe UI','Sukhumvit Set',Tahoma,sans-serif",
  ru:
    "-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue','PT Sans',sans-serif",
  en: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif",
  de: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif",
  fr: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif",
  vi: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif",
};

const PATIENT_EMAIL_STRINGS: Record<string, PatientEmailDict> = {
  en: {
    langAttr: "en",
    subject: (date, time) => `Booking Request Received — ${date} at ${time} KST`,
    headerTitle: "Booking Request Received",
    intro: (name) =>
      `Hi <strong>${name}</strong>,<br>\n          Thank you for your booking request. Here are the details we received:`,
    dateLabel: "Date",
    timeLabel: "Time",
    programLabel: "Program",
    badge: "✓ Our team will respond shortly",
    whatNextHeader: "What happens next",
    whatNextSteps: [
      "Our concierge team reviews your request (typically within one business day).",
      "We confirm your appointment by email and send treatment-specific preparation notes.",
      "If you're traveling to Seoul, we share travel-conscious scheduling guidance.",
    ],
    noFurtherAction:
      "No further action is required from you — your booking is in our queue.",
    messengerHeader: "For fastest confirmation, you may also message us via:",
    messengerHint: "Optional — your booking is already in our queue.",
    hoursLine:
      "Clinic hours (KST): Mon–Thu 11:00–20:00 · Fri 11:00–21:00 · Sat 10:00–16:00 · Sun closed",
    manageHeader: "Need to change your plans?",
    manageBtn: "Reschedule or Cancel",
    programBtn: "Change Program",
    addressHeader: "📍 Apgujeong Tune Clinic",
    addressLine1: "5th floor, 868 Nonhyeon-ro, Gangnam-gu, Seoul 06022",
    addressLine2: "Mon–Thu 11:00–20:00 · Fri 11:00–21:00 · Sat 10:00–16:00 KST",
    copyright: "© 2026 Apgujeong Tune Clinic · Evidence-Based Aesthetics",
    messengerRow2: "line_wechat",
    ivSedationReminder: {
      title: "IV sedation safety reminder",
      body:
        "You requested IV sedation. An 8-hour fasting period before your appointment is mandatory, and we will confirm pre-appointment safety instructions with you in advance.",
    },
  },
  ko: {
    langAttr: "ko",
    subject: (date, time) =>
      `[튠클리닉] 예약 신청이 접수되었습니다 — ${date} ${time} KST`,
    headerTitle: "예약 신청이 접수되었습니다",
    intro: (name) =>
      `<strong>${name}</strong>님 안녕하세요,<br>\n          튠클리닉을 찾아 주셔서 감사합니다. 신청해 주신 예약 내용은 아래와 같습니다.`,
    dateLabel: "날짜",
    timeLabel: "시간",
    programLabel: "프로그램",
    badge: "✓ 담당 직원이 곧 안내해 드립니다",
    whatNextHeader: "이후 진행 안내",
    whatNextSteps: [
      "튠클리닉 컨시어지 팀이 영업일 1일 이내로 신청 내용을 검토합니다.",
      "예약이 확정되면 확정 안내 메일과 함께 시술별 사전 준비 사항을 보내드립니다.",
      "한국 방문 일정이 있으신 경우, 일정에 맞춘 예약 안내를 함께 드립니다.",
    ],
    noFurtherAction:
      "추가로 진행하실 절차는 없습니다 — 신청은 정상적으로 접수되었습니다.",
    messengerHeader: "더 빠른 확정을 원하시면 아래 채널로 메시지 주세요",
    messengerHint: "선택 사항입니다 — 신청 내역은 이미 접수되었습니다.",
    hoursLine:
      "진료 시간 (KST): 월–목 11:00–20:00 · 금 11:00–21:00 · 토 10:00–16:00 · 일 휴무",
    manageHeader: "예약 일정을 변경하시겠어요?",
    manageBtn: "일정 변경 또는 취소",
    programBtn: "프로그램 변경",
    addressHeader: "📍 압구정 튠클리닉",
    addressLine1: "서울 강남구 논현로 868, 5층 (06022)",
    addressLine2: "월–목 11:00–20:00 · 금 11:00–21:00 · 토 10:00–16:00",
    copyright: "© 2026 압구정 튠클리닉 · 근거 기반 미용 의학",
    messengerRow2: "phone",
    ivSedationReminder: {
      title: "수면 마취 안전 안내",
      body:
        "수면 마취를 요청해 주셨습니다. 시술 당일 8시간 금식이 필수이며, 사전 안전 관련 안내는 예약 확정 후 별도로 드리겠습니다.",
    },
  },
  ja: {
    langAttr: "ja",
    subject: (date, time) =>
      `[Tune Clinic] ご予約のお申込みを受け付けました — ${date} ${time} KST`,
    headerTitle: "ご予約のお申込みを受け付けました",
    intro: (name) =>
      `<strong>${name}</strong>様<br>\n          このたびはチューンクリニックへご予約のお申込みをいただき、誠にありがとうございます。お申込みいただいた内容は以下のとおりです。`,
    dateLabel: "日付",
    timeLabel: "時間",
    programLabel: "プログラム",
    badge: "✓ 担当スタッフより追ってご案内いたします",
    whatNextHeader: "今後の流れ",
    whatNextSteps: [
      "当クリニックのコンシェルジュチームが、原則1営業日以内に内容を確認いたします。",
      "ご予約が確定次第、確定メールおよび治療ごとの事前準備のご案内をお送りいたします。",
      "韓国へのご渡航予定がございましたら、ご日程に合わせた予約のご案内も併せてお送りいたします。",
    ],
    noFurtherAction:
      "お客様側でのお手続きは特にございません — お申込みは正しく受け付けられております。",
    messengerHeader:
      "より早い確定をご希望の場合は、以下のチャンネルからお気軽にメッセージをお送りください",
    messengerHint: "任意です — お申込みはすでに受付済みです。",
    hoursLine:
      "診療時間 (KST): 月〜木 11:00〜20:00 · 金 11:00〜21:00 · 土 10:00〜16:00 · 日休診",
    manageHeader: "ご予定の変更が必要ですか?",
    manageBtn: "日程変更・キャンセル",
    programBtn: "プログラム変更",
    addressHeader: "📍 狎鴎亭 Tune Clinic",
    addressLine1: "ソウル特別市 江南区 論峴路868, 5階 (06022)",
    addressLine2: "月〜木 11:00〜20:00 · 金 11:00〜21:00 · 土 10:00〜16:00 KST",
    copyright: "© 2026 狎鴎亭 Tune Clinic · エビデンスに基づく美容医療",
    messengerRow2: "line_wechat",
    ivSedationReminder: {
      title: "静脈鎮静に関する安全のご案内",
      body:
        "静脈鎮静をご希望いただきました。当日は施術前8時間の絶食が必須となります。施術前の安全に関する詳細なご案内は、別途お送りいたします。",
    },
  },
  zh: {
    langAttr: "zh-Hans",
    subject: (date, time) =>
      `[Tune Clinic] 您的预约申请已收到 — ${date} ${time} KST`,
    headerTitle: "您的预约申请已收到",
    intro: (name) =>
      `<strong>${name}</strong> 您好，<br>\n          感谢您选择 Tune Clinic 提交预约申请。我们已收到您提交的以下信息：`,
    dateLabel: "日期",
    timeLabel: "时间",
    programLabel: "项目",
    badge: "✓ 我们的团队将尽快与您联系",
    whatNextHeader: "后续流程",
    whatNextSteps: [
      "我们的礼宾团队将在通常一个工作日内审核您的预约申请。",
      "预约确认后，我们会通过邮件向您发送确认通知，并附上对应项目的术前准备说明。",
      "如您计划前往首尔，我们也会根据您的行程为您提供更合适的预约安排建议。",
    ],
    noFurtherAction: "您无需再进行其他操作 — 您的预约申请已成功进入处理队列。",
    messengerHeader: "如希望尽快确认，您也可以通过以下方式联系我们：",
    messengerHint: "可选 — 您的预约申请已进入我们的处理队列。",
    hoursLine:
      "营业时间 (KST)：周一至周四 11:00–20:00 · 周五 11:00–21:00 · 周六 10:00–16:00 · 周日休诊",
    manageHeader: "需要调整您的行程吗？",
    manageBtn: "更改日期或取消",
    programBtn: "更改项目",
    addressHeader: "📍 狎鸥亭 Tune Clinic",
    addressLine1: "首尔特别市 江南区 论岘路868, 5楼 (06022)",
    addressLine2: "周一至周四 11:00–20:00 · 周五 11:00–21:00 · 周六 10:00–16:00 KST",
    copyright: "© 2026 狎鸥亭 Tune Clinic · 循证医学美容",
    messengerRow2: "line_wechat",
    // TODO(i18n): native translation by 2026-05-12
    ivSedationReminder: {
      title: "IV sedation safety reminder",
      body:
        "You requested IV sedation. An 8-hour fasting period before your appointment is mandatory, and we will confirm pre-appointment safety instructions with you in advance.",
    },
  },
  de: {
    langAttr: "de",
    subject: (date, time) =>
      `Ihre Buchungsanfrage ist eingegangen — ${date} um ${time} KST`,
    headerTitle: "Buchungsanfrage eingegangen",
    intro: (name) =>
      `Guten Tag <strong>${name}</strong>,<br>\n          vielen Dank für Ihre Buchungsanfrage. Hier sind die uns übermittelten Daten:`,
    dateLabel: "Datum",
    timeLabel: "Uhrzeit",
    programLabel: "Programm",
    badge: "✓ Unser Team meldet sich in Kürze bei Ihnen",
    whatNextHeader: "Wie es weitergeht",
    whatNextSteps: [
      "Unser Concierge-Team prüft Ihre Anfrage in der Regel innerhalb eines Werktags.",
      "Sobald Ihr Termin bestätigt ist, senden wir Ihnen eine Bestätigung per E-Mail sowie behandlungsspezifische Vorbereitungshinweise.",
      "Falls Sie nach Seoul reisen, geben wir Ihnen reisefreundliche Empfehlungen zur Terminplanung.",
    ],
    noFurtherAction:
      "Sie müssen nichts weiter unternehmen — Ihre Anfrage ist bereits in unserer Bearbeitung.",
    messengerHeader:
      "Für eine schnellere Bestätigung können Sie uns auch hier eine Nachricht senden:",
    messengerHint: "Optional — Ihre Anfrage ist bereits in unserer Bearbeitung.",
    hoursLine:
      "Öffnungszeiten (KST): Mo–Do 11:00–20:00 · Fr 11:00–21:00 · Sa 10:00–16:00 · So geschlossen",
    manageHeader: "Müssen Sie Ihre Pläne ändern?",
    manageBtn: "Termin ändern oder stornieren",
    programBtn: "Programm ändern",
    addressHeader: "📍 Apgujeong Tune Clinic",
    addressLine1: "5. Etage, 868 Nonhyeon-ro, Gangnam-gu, Seoul 06022",
    addressLine2: "Mo–Do 11:00–20:00 · Fr 11:00–21:00 · Sa 10:00–16:00 KST",
    copyright: "© 2026 Apgujeong Tune Clinic · Evidenzbasierte Ästhetik",
    messengerRow2: "line_wechat",
    // TODO(i18n): native translation by 2026-05-12
    ivSedationReminder: {
      title: "IV sedation safety reminder",
      body:
        "You requested IV sedation. An 8-hour fasting period before your appointment is mandatory, and we will confirm pre-appointment safety instructions with you in advance.",
    },
  },
  fr: {
    langAttr: "fr",
    subject: (date, time) =>
      `Votre demande de réservation a été reçue — ${date} à ${time} KST`,
    headerTitle: "Demande de réservation reçue",
    intro: (name) =>
      `Bonjour <strong>${name}</strong>,<br>\n          Nous vous remercions de votre demande de réservation. Voici les informations que nous avons reçues :`,
    dateLabel: "Date",
    timeLabel: "Heure",
    programLabel: "Programme",
    badge: "✓ Notre équipe vous répondra sous peu",
    whatNextHeader: "Étapes suivantes",
    whatNextSteps: [
      "Notre équipe conciergerie examine votre demande, généralement sous un jour ouvré.",
      "Dès la confirmation de votre rendez-vous, nous vous adresserons un e-mail de confirmation accompagné des consignes de préparation propres au traitement.",
      "Si vous voyagez à Séoul, nous vous transmettrons des recommandations de planification adaptées à votre séjour.",
    ],
    noFurtherAction:
      "Aucune autre action n'est requise de votre part — votre demande est déjà entre nos mains.",
    messengerHeader:
      "Pour une confirmation plus rapide, vous pouvez également nous écrire via :",
    messengerHint: "Facultatif — votre demande est déjà prise en charge.",
    hoursLine:
      "Horaires de la clinique (KST) : Lun–Jeu 11:00–20:00 · Ven 11:00–21:00 · Sam 10:00–16:00 · Dim fermé",
    manageHeader: "Besoin de modifier vos plans ?",
    manageBtn: "Reporter ou annuler",
    programBtn: "Changer de programme",
    addressHeader: "📍 Apgujeong Tune Clinic",
    addressLine1: "5e étage, 868 Nonhyeon-ro, Gangnam-gu, Séoul 06022",
    addressLine2: "Lun–Jeu 11:00–20:00 · Ven 11:00–21:00 · Sam 10:00–16:00 KST",
    copyright: "© 2026 Apgujeong Tune Clinic · Esthétique fondée sur les preuves",
    messengerRow2: "line_wechat",
    // TODO(i18n): native translation by 2026-05-12
    ivSedationReminder: {
      title: "IV sedation safety reminder",
      body:
        "You requested IV sedation. An 8-hour fasting period before your appointment is mandatory, and we will confirm pre-appointment safety instructions with you in advance.",
    },
  },
  ru: {
    langAttr: "ru",
    subject: (date, time) => `Заявка на запись принята — ${date}, ${time} KST`,
    headerTitle: "Заявка на запись принята",
    intro: (name) =>
      `Здравствуйте, <strong>${name}</strong>!<br>\n          Благодарим Вас за обращение в Tune Clinic. Мы получили Вашу заявку со следующими данными:`,
    dateLabel: "Дата",
    timeLabel: "Время",
    programLabel: "Программа",
    badge: "✓ Наш специалист свяжется с Вами в ближайшее время",
    whatNextHeader: "Что дальше",
    whatNextSteps: [
      "Наша команда консьержей рассмотрит Вашу заявку, как правило, в течение одного рабочего дня.",
      "После подтверждения записи мы направим Вам письмо с подтверждением и рекомендациями по подготовке к выбранной процедуре.",
      "Если Вы планируете поездку в Сеул, мы предложим оптимальное время визита с учётом Вашего маршрута.",
    ],
    noFurtherAction:
      "От Вас никаких дополнительных действий не требуется — Ваша заявка уже принята к обработке.",
    messengerHeader:
      "Для более быстрого подтверждения Вы также можете написать нам:",
    messengerHint: "По желанию — Ваша заявка уже принята к обработке.",
    hoursLine:
      "Часы работы (KST): Пн–Чт 11:00–20:00 · Пт 11:00–21:00 · Сб 10:00–16:00 · Вс — выходной",
    manageHeader: "Нужно изменить планы?",
    manageBtn: "Перенести или отменить",
    programBtn: "Изменить программу",
    addressHeader: "📍 Apgujeong Tune Clinic",
    addressLine1: "5-й этаж, 868 Nonhyeon-ro, Gangnam-gu, Сеул 06022",
    addressLine2: "Пн–Чт 11:00–20:00 · Пт 11:00–21:00 · Сб 10:00–16:00 KST",
    copyright: "© 2026 Apgujeong Tune Clinic · Доказательная эстетика",
    messengerRow2: "line_wechat",
    // TODO(i18n): native translation by 2026-05-12
    ivSedationReminder: {
      title: "IV sedation safety reminder",
      body:
        "You requested IV sedation. An 8-hour fasting period before your appointment is mandatory, and we will confirm pre-appointment safety instructions with you in advance.",
    },
  },
  th: {
    langAttr: "th",
    subject: (date, time) =>
      `[Tune Clinic] รับคำขอจองของคุณเรียบร้อยแล้ว — ${date} ${time} KST`,
    headerTitle: "รับคำขอจองเรียบร้อยแล้ว",
    intro: (name) =>
      `เรียนคุณ <strong>${name}</strong> ค่ะ<br>\n          ขอบคุณที่ส่งคำขอจองมายัง Tune Clinic ค่ะ เราได้รับข้อมูลของคุณดังนี้`,
    dateLabel: "วันที่",
    timeLabel: "เวลา",
    programLabel: "โปรแกรม",
    badge: "✓ ทีมงานของเราจะติดต่อกลับโดยเร็ว",
    whatNextHeader: "ขั้นตอนต่อไป",
    whatNextSteps: [
      "ทีมที่ปรึกษาของคลินิกจะตรวจสอบคำขอจองของคุณ โดยทั่วไปภายใน 1 วันทำการ",
      "เมื่อยืนยันการจองแล้ว เราจะส่งอีเมลยืนยัน พร้อมคำแนะนำการเตรียมตัวเฉพาะของแต่ละหัตถการให้คุณ",
      "หากคุณวางแผนเดินทางมาโซล เราจะแนะนำตารางเวลาที่เหมาะสมกับการเดินทางของคุณด้วยค่ะ",
    ],
    noFurtherAction:
      "คุณไม่ต้องดำเนินการเพิ่มเติมใด ๆ — คำขอจองของคุณอยู่ในระบบของเราเรียบร้อยแล้ว",
    messengerHeader:
      "หากต้องการยืนยันให้เร็วขึ้น คุณสามารถส่งข้อความถึงเราผ่านช่องทางด้านล่างได้ค่ะ",
    messengerHint: "เป็นทางเลือก — คำขอจองของคุณอยู่ในคิวของเราแล้วค่ะ",
    hoursLine:
      "เวลาทำการ (KST): จันทร์–พฤหัสบดี 11:00–20:00 · ศุกร์ 11:00–21:00 · เสาร์ 10:00–16:00 · อาทิตย์ปิด",
    manageHeader: "ต้องการเปลี่ยนแปลงแผนของคุณหรือไม่?",
    manageBtn: "เปลี่ยนเวลา หรือ ยกเลิก",
    programBtn: "เปลี่ยนโปรแกรม",
    addressHeader: "📍 Apgujeong Tune Clinic",
    addressLine1: "ชั้น 5 อาคาร 868 ถนนนนฮยอนโร เขตกังนัม กรุงโซล 06022",
    addressLine2:
      "จันทร์–พฤหัสบดี 11:00–20:00 · ศุกร์ 11:00–21:00 · เสาร์ 10:00–16:00 KST",
    copyright:
      "© 2026 Apgujeong Tune Clinic · เวชศาสตร์ความงามบนพื้นฐานหลักฐานทางการแพทย์",
    messengerRow2: "line_wechat",
    // TODO(i18n): native translation by 2026-05-12
    ivSedationReminder: {
      title: "IV sedation safety reminder",
      body:
        "You requested IV sedation. An 8-hour fasting period before your appointment is mandatory, and we will confirm pre-appointment safety instructions with you in advance.",
    },
  },
  vi: {
    langAttr: "vi",
    subject: (date, time) =>
      `[Tune Clinic] Đã nhận yêu cầu đặt lịch — ${date} lúc ${time} KST`,
    headerTitle: "Đã nhận yêu cầu đặt lịch",
    intro: (name) =>
      `Kính gửi Quý khách <strong>${name}</strong>,<br>\n          Cảm ơn Quý khách đã gửi yêu cầu đặt lịch tới Tune Clinic. Dưới đây là thông tin chúng tôi đã nhận được:`,
    dateLabel: "Ngày",
    timeLabel: "Thời gian",
    programLabel: "Chương trình",
    badge: "✓ Đội ngũ của chúng tôi sẽ phản hồi Quý khách trong thời gian sớm nhất",
    whatNextHeader: "Các bước tiếp theo",
    whatNextSteps: [
      "Đội ngũ chăm sóc khách hàng sẽ xem xét yêu cầu của Quý khách, thường trong vòng một ngày làm việc.",
      "Sau khi xác nhận lịch hẹn, chúng tôi sẽ gửi email xác nhận kèm hướng dẫn chuẩn bị cụ thể cho từng liệu trình.",
      "Nếu Quý khách đang lên kế hoạch tới Seoul, chúng tôi sẽ tư vấn lịch hẹn phù hợp với chuyến đi của Quý khách.",
    ],
    noFurtherAction:
      "Quý khách không cần thực hiện thêm thao tác nào — yêu cầu của Quý khách đã được tiếp nhận.",
    messengerHeader:
      "Để được xác nhận nhanh hơn, Quý khách cũng có thể nhắn tin cho chúng tôi qua:",
    messengerHint: "Tùy chọn — yêu cầu của Quý khách đã được tiếp nhận.",
    hoursLine:
      "Giờ làm việc (KST): T2–T5 11:00–20:00 · T6 11:00–21:00 · T7 10:00–16:00 · CN nghỉ",
    manageHeader: "Cần thay đổi lịch trình?",
    manageBtn: "Đổi lịch hoặc hủy",
    programBtn: "Đổi chương trình",
    addressHeader: "📍 Apgujeong Tune Clinic",
    addressLine1: "Tầng 5, 868 Nonhyeon-ro, Gangnam-gu, Seoul 06022",
    addressLine2: "T2–T5 11:00–20:00 · T6 11:00–21:00 · T7 10:00–16:00 KST",
    copyright: "© 2026 Apgujeong Tune Clinic · Thẩm mỹ dựa trên bằng chứng",
    messengerRow2: "line_wechat",
    // TODO(i18n): native translation by 2026-05-12
    ivSedationReminder: {
      title: "IV sedation safety reminder",
      body:
        "You requested IV sedation. An 8-hour fasting period before your appointment is mandatory, and we will confirm pre-appointment safety instructions with you in advance.",
    },
  },
};

function getPatientEmailDict(locale: string): PatientEmailDict {
  return PATIENT_EMAIL_STRINGS[locale] || PATIENT_EMAIL_STRINGS.en;
}

function getPatientEmailFontStack(locale: string): string {
  return PATIENT_EMAIL_FONT_STACK[locale] || PATIENT_EMAIL_FONT_STACK.en;
}

function messengerRow2Html(variant: "phone" | "line_wechat"): string {
  if (variant === "phone") {
    // KO-only variant. The phone label is intentionally hard-coded in
    // Korean because every other locale uses the LINE+WeChat variant.
    return `
          <div style="margin-top:8px;">
            <a href="tel:+82-507-1438-8022" style="display:inline-block;background:#0ea5e9;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:13px;font-weight:700;margin:4px;">📞 전화</a>
          </div>`;
  }
  return `
          <div style="margin-top:8px;">
            <a href="https://line.me/R/ti/p/@tuneclinic" style="display:inline-block;background:#06c755;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:13px;font-weight:700;margin:4px;">💚 LINE</a>
            <a href="https://wa.me/821076744128" style="display:inline-block;background:#07c160;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:13px;font-weight:700;margin:4px;">🟢 WeChat</a>
          </div>`;
}

async function patientEmailHtml(b: BookingRecord): Promise<string> {
  const dict = getPatientEmailDict(b.locale);
  const fontStack = getPatientEmailFontStack(b.locale);
  const dateFormatted = formatDate(b.appointment_date, b.locale);
  const timeKST = b.appointment_time.slice(0, 5);
  const timeLocal = kstToLocal(
    b.appointment_date,
    b.appointment_time,
    b.patient_timezone,
  );
  const treatments = treatmentList(b.treatment_interest, b.locale);
  const manageHref = await manageUrl(b);

  const stepsHtml = dict.whatNextSteps
    .map((s) => `<li>${s}</li>`)
    .join("\n            ");

  // Only rendered when the patient ticked the IV sedation opt-in. Visual
  // intent matches the inline notice on booking.html: amber border-left
  // callout with a triangle icon — instantly readable as a safety note.
  const ivSedationHtml = b.iv_sedation_requested === true
    ? `
        <div style="background:#fffbeb;border-left:4px solid #f59e0b;border-radius:8px;padding:16px 18px;margin:0 0 24px;">
          <p style="margin:0 0 6px;color:#92400e;font-size:13px;font-weight:700;">⚠ ${dict.ivSedationReminder.title}</p>
          <p style="margin:0;color:#78350f;font-size:12px;line-height:1.6;">${dict.ivSedationReminder.body}</p>
        </div>`
    : "";

  return `
<!DOCTYPE html>
<html lang="${dict.langAttr}">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:${fontStack};">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
    <div style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);">
      <div style="background:#0f172a;padding:32px 28px;text-align:center;">
        <h1 style="margin:0;color:#c9a55a;font-size:14px;letter-spacing:3px;text-transform:uppercase;font-weight:700;">Tune Clinic</h1>
        <p style="margin:12px 0 0;color:#fff;font-size:22px;font-family:Georgia,serif;">${dict.headerTitle}</p>
      </div>

      <div style="padding:32px 28px;">
        <p style="margin:0 0 20px;color:#334155;font-size:15px;line-height:1.6;">
          ${dict.intro(b.patient_name)}
        </p>

        <div style="background:#f8fafc;border-radius:12px;padding:20px;margin:0 0 24px;">
          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="padding:8px 0;color:#64748b;font-size:13px;vertical-align:top;width:100px;">${dict.dateLabel}</td>
              <td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:600;">${dateFormatted}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#64748b;font-size:13px;vertical-align:top;">${dict.timeLabel}</td>
              <td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:600;">${timeKST} KST${timeLocal !== "—" ? ` (${timeLocal} ${b.patient_timezone})` : ""}</td>
            </tr>
            ${treatments ? `<tr>
              <td style="padding:8px 0;color:#64748b;font-size:13px;vertical-align:top;">${dict.programLabel}</td>
              <td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:600;">${treatments}</td>
            </tr>` : ""}
          </table>
        </div>

        <div style="text-align:center;margin:0 0 24px;">
          <span style="display:inline-block;background:#dcfce7;color:#166534;padding:8px 20px;border-radius:20px;font-size:13px;font-weight:700;">${dict.badge}</span>
        </div>
${ivSedationHtml}
        <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:20px;margin:0 0 24px;">
          <p style="margin:0 0 8px;color:#92400e;font-size:14px;font-weight:700;">${dict.whatNextHeader}</p>
          <ol style="margin:0 0 12px;padding:0 0 0 18px;color:#92400e;font-size:13px;line-height:1.8;">
            ${stepsHtml}
          </ol>
          <p style="margin:0;color:#78350f;font-size:12px;font-style:italic;">${dict.noFurtherAction}</p>
        </div>

        <div style="background:#0f172a;border-radius:12px;padding:24px;margin:0 0 24px;text-align:center;">
          <p style="margin:0 0 14px;color:#c9a55a;font-size:14px;font-weight:700;">${dict.messengerHeader}</p>
          <div>
            <a href="https://wa.me/821076744128" style="display:inline-block;background:#22c55e;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:13px;font-weight:700;margin:4px;">💬 WhatsApp</a>
            <a href="https://www.instagram.com/tuneclinic_english/" style="display:inline-block;background:#8b5cf6;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:13px;font-weight:700;margin:4px;">📸 Instagram</a>
          </div>${messengerRow2Html(dict.messengerRow2)}
          <p style="margin:12px 0 0;color:#94a3b8;font-size:11px;">${dict.messengerHint}</p>
          <p style="margin:6px 0 0;color:#94a3b8;font-size:11px;">${dict.hoursLine}</p>
        </div>

        <div style="border-top:1px solid #e2e8f0;padding:20px 0 0;text-align:center;">
          <p style="margin:0 0 10px;color:#64748b;font-size:12px;">${dict.manageHeader}</p>
          <a href="${manageHref}" style="display:inline-block;background:#c9a55a;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:700;margin:0 4px;">${dict.manageBtn}</a>
          <a href="${manageHref}" style="display:inline-block;background:#334155;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:700;margin:0 4px;">${dict.programBtn}</a>
        </div>

        <div style="border-top:1px solid #e2e8f0;padding:20px 0 0;margin-top:8px;">
          <p style="margin:0 0 4px;color:#0f172a;font-size:14px;font-weight:700;">${dict.addressHeader}</p>
          <p style="margin:0;color:#64748b;font-size:13px;line-height:1.5;">
            ${dict.addressLine1}<br>
            ${dict.addressLine2}
          </p>
        </div>
      </div>

      <div style="background:#f8fafc;padding:20px 28px;text-align:center;border-top:1px solid #e2e8f0;">
        <p style="margin:0;color:#94a3b8;font-size:11px;">${dict.copyright}</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

async function clinicNotificationKoHtml(b: BookingRecord): Promise<string> {
  const dateFormatted = formatDate(b.appointment_date);
  const timeKST = b.appointment_time.slice(0, 5);
  const treatments = treatmentList(b.treatment_interest, "en");
  const dday = dDayLabel(b.appointment_date);
  const actions = await clinicActionsHtml(b, true);
  const langLabel = LOCALE_LABELS_KO[b.locale] || b.locale.toUpperCase();

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
    <div style="background:#fff;border-radius:12px;overflow:hidden;border:2px solid #c9a55a;">
      <div style="background:#c9a55a;padding:16px 24px;">
        <table style="width:100%;"><tr>
          <td><h1 style="margin:0;color:#fff;font-size:16px;">🔔 새 예약 접수</h1></td>
          <td style="text-align:right;"><span style="background:rgba(255,255,255,0.25);color:#fff;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:700;">${dday}</span></td>
        </tr></table>
      </div>
      <div style="padding:24px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:6px 0;color:#64748b;font-size:13px;width:110px;">환자명</td><td style="padding:6px 0;color:#0f172a;font-size:14px;font-weight:600;">${b.patient_name}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">이메일</td><td style="padding:6px 0;color:#0f172a;font-size:14px;">${b.patient_email || "—"}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">연락처</td><td style="padding:6px 0;color:#0f172a;font-size:14px;">${b.patient_phone || "—"}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">예약일</td><td style="padding:6px 0;color:#0f172a;font-size:14px;font-weight:600;">${dateFormatted}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">시간</td><td style="padding:6px 0;color:#0f172a;font-size:14px;font-weight:600;">${timeKST} KST</td></tr>
          <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">프로그램</td><td style="padding:6px 0;color:#0f172a;font-size:14px;">${treatments || "미정"}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">언어</td><td style="padding:6px 0;color:#0f172a;font-size:14px;">${langLabel}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">시간대</td><td style="padding:6px 0;color:#0f172a;font-size:14px;">${b.patient_timezone}</td></tr>
          ${b.iv_sedation_requested === true ? `<tr><td style="padding:6px 0;color:#b45309;font-size:13px;font-weight:700;">수면 마취</td><td style="padding:6px 0;color:#b45309;font-size:14px;font-weight:700;">⚠ 요청됨 (8시간 금식 / 사전 안전 안내 필요)</td></tr>` : ""}
          ${b.message ? `<tr><td style="padding:6px 0;color:#64748b;font-size:13px;vertical-align:top;">메모</td><td style="padding:6px 0;color:#0f172a;font-size:14px;">${b.message}</td></tr>` : ""}
        </table>
        ${clinicContactHtml(b)}
        ${clinicQuickReplyHtml(b)}
        ${actions}
        ${clinicLocationHtml()}
      </div>
    </div>
  </div>
</body>
</html>`;
}

// Internal-only function. Deployed with `--no-verify-jwt` so the gateway
// does not reject Supabase's new non-JWT secret keys, but we enforce a
// shared-secret check here: only callers that present the project's
// service role key in the Authorization header are accepted. submit-booking
// (Phase 5) and the legacy bookings INSERT database webhook both already
// send this header.
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
      },
    });
  }

  const auth = req.headers.get("authorization") ?? "";
  if (!SERVICE_ROLE_KEY || auth !== `Bearer ${SERVICE_ROLE_KEY}`) {
    return new Response(
      JSON.stringify({ error: "unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  try {
    const payload: WebhookPayload = await req.json();

    if (payload.type !== "INSERT" || payload.table !== "bookings") {
      return new Response(JSON.stringify({ skipped: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const booking = payload.record;
    const [patientHtml, clinicHtml] = await Promise.all([
      patientEmailHtml(booking),
      clinicNotificationKoHtml(booking),
    ]);

    const results: string[] = [];

    if (booking.patient_email) {
      const dateLabel = formatDate(booking.appointment_date, booking.locale);
      const timeLabel = booking.appointment_time.slice(0, 5);
      const subject = getPatientEmailDict(booking.locale).subject(
        dateLabel,
        timeLabel,
      );
      const { ok, error } = await sendEmail(
        booking.patient_email,
        subject,
        patientHtml,
      );
      results.push(ok ? "patient: sent" : `patient: failed (${error})`);
    } else {
      results.push("patient: skipped (no email)");
    }

    if (CLINIC_EMAILS.length > 0) {
      await new Promise((r) => setTimeout(r, 600));
      const { ok, error } = await sendEmail(
        CLINIC_EMAILS,
        `🔔 새 예약: ${booking.patient_name} — ${booking.appointment_date} ${booking.appointment_time.slice(0, 5)}`,
        clinicHtml,
      );
      results.push(
        ok
          ? `clinic: sent to ${CLINIC_EMAILS.join(", ")}`
          : `clinic: failed (${error})`,
      );
    }

    console.log("Email results:", results.join(" | "));

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("booking-confirmation error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

// Touch unused imports so the bundler keeps them (notifyAll is exported
// from the shared module for consistency with booking-manage).
void notifyAll;
