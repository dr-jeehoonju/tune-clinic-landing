#!/usr/bin/env python3
"""
Build the 2026-04-27 clinic photo shotlist (Korean staff-facing text).

Outputs:
    docs/photo-shotlist-2026-04-27.xlsx  (3시트: 샷리스트, 페이지 요약, 촬영 일정)
    docs/photo-shotlist-2026-04-27.md   (엑셀 1시트 기준, 마크다운 + 안내)

Row data: `scripts/photo-shotlist-ko.json` (merge from `merge_shotlist_ko.py` + p0/p1/p2 maps).
To edit, update `shotlist_ko_p0.py` / `p1` / `p2`, run `python3 merge_shotlist_ko.py`, then this script.
"""
from __future__ import annotations

import json
import os
from collections import OrderedDict, defaultdict
from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill, Border, Side
from openpyxl.utils import get_column_letter

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir))
OUT_XLSX = os.path.join(REPO_ROOT, "docs", "photo-shotlist-2026-04-27.xlsx")
OUT_MD = os.path.join(REPO_ROOT, "docs", "photo-shotlist-2026-04-27.md")

# ---------------------------------------------------------------------------
# Column schema — (key, Excel header in Korean, width)
# ---------------------------------------------------------------------------
COLUMNS: list[tuple[str, str, int]] = [
    ("id", "ID", 10),
    ("priority", "우선순위 (P0=최우선)", 14),
    ("page", "페이지(URL/범주)", 24),
    ("page_file", "소스 파일(개발)", 40),
    ("section", "섹션·촬영 위치", 34),
    ("current_state", "현재 웹 상태", 20),
    ("photo_subject", "촬영·연출(무엇을 담을지)", 58),
    ("composition", "구도", 12),
    ("orientation", "화면 비율", 20),
    ("min_resolution", "최소 해상도", 16),
    ("mood_lighting", "조명·무드", 28),
    ("must_include", "반드시 포함", 44),
    ("must_avoid", "절대 피할 것", 40),
    ("consent_required", "초상·동의", 20),
    ("suggested_filename", "제안 파일 경로(개발)", 50),
    ("count", "촬영 장수", 14),
    ("notes", "비고", 52),
]
COL_KEYS: list[str] = [c[0] for c in COLUMNS]

WRAP_COLS = {"photo_subject", "must_include", "must_avoid", "notes", "section"}

PRIORITY_FILL = {
    "P0": PatternFill("solid", fgColor="FECACA"),
    "P1": PatternFill("solid", fgColor="FED7AA"),
    "P2": PatternFill("solid", fgColor="E2E8F0"),
}

# ---------------------------------------------------------------------------
# Shotlist rows — Korean (`scripts/photo-shotlist-ko.json`)
# ---------------------------------------------------------------------------
_KO_JSON = os.path.join(os.path.dirname(__file__), "photo-shotlist-ko.json")
with open(_KO_JSON, encoding="utf-8") as f:
    ROWS: list[dict] = json.load(f)

# ---------------------------------------------------------------------------
# Assign sequential IDs grouped by priority (preserve insertion order within
# each priority bucket since that order roughly tracks page-then-section).
# ---------------------------------------------------------------------------
priority_order = ["P0", "P1", "P2"]
counters = defaultdict(int)
# First pass: stable index per priority
sorted_rows: list[dict] = []
for pr in priority_order:
    for r in ROWS:
        if r["priority"] == pr:
            counters[pr] += 1
            r["id"] = f"{pr}-{counters[pr]:03d}"
            sorted_rows.append(r)

# ---------------------------------------------------------------------------
# Sheet 3: shoot day blocks. Rows are resolved by substring match against
# `suggested_filename` so the plan stays accurate even if rows are reordered.
# ---------------------------------------------------------------------------
def find_id(keyword: str) -> str:
    for r in sorted_rows:
        if keyword in r["suggested_filename"]:
            return r["id"]
    raise SystemExit(f"shoot-day-plan: no row matches keyword '{keyword}'")


def ids(*keywords: str) -> list[str]:
    return [find_id(k) for k in keywords]


BLOCKS = [
    {
        "block": "A구간 — 외부 전경 + 압구정 맥락",
        "time_window": "09:30–11:00 (아침 자연광)",
        "lighting": "자연광, 섬광 비권장, 유리면은 편광 필터(선택).",
        "rows": ids(
            "home/hero-clinic-exterior-golden-hour",
            "location/building-exterior-wide",
            "location/apgujeong-rodeo-street",
            "apgujeong/hero-district-clinic",
            "location/window-view-apgujeong",
            "global/footer-dusk",
        ),
        "duration_min": 90,
        "kit": "24–70mm, 16–35mm(와이드), 편광, ND8, 삼각대 생략 가능(핸드헬드).",
    },
    {
        "block": "B구간 — 5층 동선 + 리셉션 + 대기",
        "time_window": "11:00–12:30 (오픈 전 공실 권장)",
        "lighting": "자연광+웜 텅, 소형 바운스·소프트박스.",
        "rows": ids(
            "home/visit-us-5f-arrival",
            "location/reception-waiting-wide",
            "home/inside-clinic-reception",
            "menu/hero-printed-menu",
            "concierge/english-support-candid",
            "aftercare/product-set",
        ),
        "duration_min": 90,
        "kit": "24–70mm, 35mm 프라임, 삼각대, 소프트박스1, 흰 반사.",
    },
    {
        "block": "C구간 — 상담실 + 시술실 + 문서/플랜 연출",
        "time_window": "13:00–15:00 (점심·환자 인수인계 피할 것)",
        "lighting": "데이+텅, 촬영 시 환자·동선 충돌 없게.",
        "rows": ids(
            "rooms/treatment-room-wide",
            "rooms/consultation-room-wide",
            "gallery/hero-documentation-process",
            "booking/hero-consultation-desk-overhead",
            "decision-protection/hero-planning-desk",
            "design-method/hero-vector-mapping",
            "design-method/workflow-step",
            "how-to-choose/hero-indication-mapping",
        ),
        "duration_min": 120,
        "kit": "탑뷨용 리그·삼각대, 35/50mm, 컬러체커, 마네킨(가능 시).",
    },
    {
        "block": "D구간 — 장비 클로즈업(울/써/스킨부스터·필·두피 등)",
        "time_window": "15:00–16:30 (시술 슬롯 틈, 간호와 협의)",
        "lighting": "클리니컬 중성 + 웜 림 1.",
        "rows": ids(
            "metacell/equipment-prp-centrifuge",
            "metacell/build-",
            "signature-lifting/hero-ultherapy-handpiece",
            "structural-reset/hero-thermage-tip",
            "collagen-builder/hero-skin-booster-tray",
            "faq/hero-concierge-english-support",
            "korean-lifting-guide/hero-devices-lineup",
            "ultherapy-vs-thermage/hero-side-by-side",
            "dermal-fillers/hero-filler-tray",
            "skin-boosters/hero-vial-tray",
            "hair-loss/hero-scalp-treatment",
            "equipment/ultherapy-handpiece",
            "equipment/thermage-flx-tip",
            "equipment/onda-lifting",
        ),
        "duration_min": 90,
        "kit": "매크로 100mm, 50mm, 삼각대, 소프트2, 젤, 멸균매트, 컬러체커.",
    },
    {
        "block": "D-2구간 — PBM + 쥬베/리쥬 스틸",
        "time_window": "16:30–17:15",
        "lighting": "D구간과 동일 셋업.",
        "rows": ids(
            "equipment/pbm-device",
            "equipment/juvelook-rejuran-still",
        ),
        "duration_min": 45,
        "kit": "D구간 연장(같은 조명).",
    },
    {
        "block": "E구간 — 의료진 포트(차·주)",
        "time_window": "17:30–19:00 (진료·환자 희소 시간대)",
        "lighting": "창가 자연광+반사판, 흐리면 소프트박스 백업.",
        "rows": ids(
            "doctors/dr-cha-portrait-formal",
            "doctors/dr-cha-consultation",
            "doctors/dr-ju-portrait-formal",
            "doctors/dr-ju-international-consult",
            "filler-chamaka-se/hero-design-mapping",
            "international-guide/hero-trip-planning-desk",
            "booking/success-welcome-florals",
        ),
        "duration_min": 90,
        "kit": "85mm(인물), 50mm, 대형 반사, 소프트, B롤·영상 시 라벨/클립 마이크.",
    },
    {
        "block": "F구간 — IV·라운지(퇴근 후)",
        "time_window": "19:00–19:45 (웜조명, 라운지 캄)",
        "lighting": "웜 텅+소프트 필.",
        "rows": ids(
            "comfort/iv-sedation-chair",
            "comfort/recovery-lounge",
        ),
        "duration_min": 45,
        "kit": "24–70mm, 삼각대, 소프트1.",
    },
    {
        "block": "G구간 — 블로그 범용 + 잔여 컷(백스톱)",
        "time_window": "다른 구간·여유에 따라 탄력 운용",
        "lighting": "씬에 맞게.",
        "rows": ids(
            "blog/blog-hero-generic",
            "booking-manage/header-calendar",
            "consult/hero-followup",
        ),
        "duration_min": 30,
        "kit": "앞선 셋업 재활용.",
    },
]

# ---------------------------------------------------------------------------
# Page-summary notes (Sheet 2)
# ---------------------------------------------------------------------------
PAGE_NOTES = {
    "/": "메인 — 재촬·재활용 최다. A(외부)+E(의료진)로 5/6 광고 런칭 핵심을 커버.",
    "/booking.html": "E의 상담·환경과 맞출 것. 히어로+완료: 탑뷰 데스크 1장이면 둘 다 대응 가능.",
    "/metacell-protocol.html": "핵심 LP. D시작 직전 차/주+장갑, 3빌드(울/써/PBM)는 같은 조명으로 연촬.",
    "(전역)": "한 번 촬영해 사이트 여러 섹션에 연결(개발팀이 배치).",
    "(장비·라이브러리)": "D·D-2 — 간호와 협의, 환자 시술과 시간 겹침 방지.",
    "(블로그)": "P2(우선순위 낮음) — 앞 구간에 지면 금지.",
    "(푸터·전역)": "18:00 전후 ‘황혼+창빛’ 외부 1장(옵션이지만 톤 좋음).",
}

# ---------------------------------------------------------------------------
# Build the workbook
# ---------------------------------------------------------------------------
def build_xlsx() -> None:
    wb = Workbook()

    # --- 시트1: 샷리스트 ---
    ws = wb.active
    ws.title = "샷리스트"
    header_labels = [c[1] for c in COLUMNS]
    ws.append(header_labels)
    header_font = Font(bold=True, color="FFFFFF")
    header_fill = PatternFill("solid", fgColor="0F172A")
    thin = Side(border_style="thin", color="CBD5E1")
    border = Border(left=thin, right=thin, top=thin, bottom=thin)
    for col_idx, (key, label, _w) in enumerate(COLUMNS, start=1):
        cell = ws.cell(row=1, column=col_idx)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(vertical="center", horizontal="left", wrap_text=True)
        cell.border = border

    for r in sorted_rows:
        ws.append([r.get(c[0], "") for c in COLUMNS])

    # column widths + wrapping
    for col_idx, (key, label, w) in enumerate(COLUMNS, start=1):
        letter = get_column_letter(col_idx)
        ws.column_dimensions[letter].width = w

    last_row = ws.max_row
    last_col = len(COLUMNS)
    for row in ws.iter_rows(min_row=2, max_row=last_row, min_col=1, max_col=last_col):
        for cell in row:
            col_key = COLUMNS[cell.column - 1][0]
            cell.alignment = Alignment(
                vertical="top",
                horizontal="left",
                wrap_text=col_key in WRAP_COLS,
            )
            cell.border = border

    # 우선순위 열 강조
    pri_col_idx = COL_KEYS.index("priority") + 1
    for row in ws.iter_rows(min_row=2, max_row=last_row, min_col=1, max_col=last_col):
        pri = row[pri_col_idx - 1].value
        fill = PRIORITY_FILL.get(pri)
        if fill:
            row[pri_col_idx - 1].fill = fill
            row[pri_col_idx - 1].font = Font(bold=True)

    ws.freeze_panes = "A2"
    ws.auto_filter.ref = f"A1:{get_column_letter(last_col)}{last_row}"
    ws.row_dimensions[1].height = 30

    # --- 시트2: 페이지별 요약 ---
    ws2 = wb.create_sheet("페이지별 요약")
    ws2.append(["페이지(URL/범주)", "소스 파일", "P0", "P1", "P2", "합계", "촬영·편집 메모"])
    for c in ws2[1]:
        c.font = header_font
        c.fill = header_fill
        c.alignment = Alignment(vertical="center", horizontal="left", wrap_text=True)
        c.border = border

    bucket: "OrderedDict[tuple[str,str], dict]" = OrderedDict()
    for r in sorted_rows:
        key = (r["page"], r["page_file"])
        b = bucket.setdefault(
            key,
            {"P0": 0, "P1": 0, "P2": 0, "total": 0},
        )
        b[r["priority"]] += 1
        b["total"] += 1

    for (page, page_file), counts in bucket.items():
        note = PAGE_NOTES.get(page, "")
        ws2.append(
            [page, page_file, counts["P0"], counts["P1"], counts["P2"], counts["total"], note]
        )

    widths_summary = [22, 50, 6, 6, 6, 8, 60]
    for i, w in enumerate(widths_summary, start=1):
        ws2.column_dimensions[get_column_letter(i)].width = w
    for row in ws2.iter_rows(min_row=2, max_row=ws2.max_row, min_col=1, max_col=7):
        for cell in row:
            cell.alignment = Alignment(vertical="top", horizontal="left", wrap_text=True)
            cell.border = border
    ws2.freeze_panes = "A2"

    # totals row
    p0 = sum(b["P0"] for b in bucket.values())
    p1 = sum(b["P1"] for b in bucket.values())
    p2 = sum(b["P2"] for b in bucket.values())
    total = p0 + p1 + p2
    ws2.append(["합계", "", p0, p1, p2, total, ""])
    for cell in ws2[ws2.max_row]:
        cell.font = Font(bold=True)
        cell.fill = PatternFill("solid", fgColor="F1F5F9")
        cell.border = border

    # --- 시트3: 촬영 일정 ---
    ws3 = wb.create_sheet("촬영 일정")
    ws3.append(["구간", "시간대", "소요(분)", "조명·장비", "포함 행 ID", "행 수"])
    for c in ws3[1]:
        c.font = header_font
        c.fill = header_fill
        c.alignment = Alignment(vertical="center", horizontal="left", wrap_text=True)
        c.border = border

    total_minutes = 0
    total_rows_covered = 0
    for blk in BLOCKS:
        ids = blk["rows"]
        ws3.append(
            [
                blk["block"],
                blk["time_window"],
                blk["duration_min"],
                f"조명: {blk['lighting']}\n장비: {blk['kit']}",
                ", ".join(ids),
                len(ids),
            ]
        )
        total_minutes += blk["duration_min"]
        total_rows_covered += len(ids)

    widths_plan = [40, 30, 14, 60, 60, 12]
    for i, w in enumerate(widths_plan, start=1):
        ws3.column_dimensions[get_column_letter(i)].width = w
    for row in ws3.iter_rows(min_row=2, max_row=ws3.max_row, min_col=1, max_col=6):
        for cell in row:
            cell.alignment = Alignment(vertical="top", horizontal="left", wrap_text=True)
            cell.border = border
    ws3.freeze_panes = "A2"

    ws3.append([])
    ws3.append([f"총 예정 시간(분, 장비·이동은 별도)", "", total_minutes, "", "", total_rows_covered])
    for cell in ws3[ws3.max_row]:
        cell.font = Font(bold=True)
        cell.fill = PatternFill("solid", fgColor="F1F5F9")

    os.makedirs(os.path.dirname(OUT_XLSX), exist_ok=True)
    wb.save(OUT_XLSX)
    print(f"wrote {OUT_XLSX}  ({len(sorted_rows)} rows)")


# ---------------------------------------------------------------------------
# Build the markdown file
# ---------------------------------------------------------------------------
INTRO = """# 압구정 튠의원 촬영 샷리스트 (2026-04-27)

촬영·편집·운영팀이 **엑셀 3시트**(`photo-shotlist-2026-04-27.xlsx`)로 작업하시고, 이 MD는 1시트(샷리스트)를 Cursor/드라이브에서 가볍게 훑을 때용입니다.

1. **P0 먼저**: 5/6 광고·런칭 흐름의 병목 구간. P0 누락 시 P1 전에 일정을 다시 잡을 것.
2. **개발팀 핸드오프**: 완성본은 `src/img/photos/{슬럭}/{파일명}.webp` 경로(제안 파일 경로 열)에 둡니다. 추후 퍼블·코드는 별 PR로 연결합니다.
3. **초상·동의** (`초상·동의` 열): 얼굴·식별 가능 시 서명 동의(리셉션). 스탠드인(뒷모습, 손만)은 행마다 가이드 따름.
4. **최종 납품**: `.webp`, sRGB, 품질 약 80% 권장. RAW/HEIC는 공용 드라이브 `photo-shoot-2026-04-27/raw/` 등.
5. **조명·매칭**: 완벽한 한 컷보다, 같은 셋업으로 **연촬**(메타셀 3빌드, 디자인 6스텝 등)이 훨씬 중요.
6. **정책·컴플라이언스**: 제품 트레이는 브랜드끼리 **동일 비중(오해·편승 없이)**. PRP/PBM 관련 촬영·문구는 **의료/광고(메타 등) 가이드**에 맞게(과장·오해·금지 표현 방지). 제품·기기 **시리얼·로트**는 촬영·보정에서 가릴 것.

➤ **촬영·일정(구간 A~G)**: 엑셀 3시트(촬영 일정)를 보시면 전체 600분(약 10시간) 단위 묶음이 있습니다.

---

## 샷리스트
"""


def md_escape(v) -> str:
    s = str(v) if v is not None else ""
    return s.replace("|", "\\|").replace("\n", " ")


def build_md() -> None:
    out = [INTRO]
    header_ko = [c[1] for c in COLUMNS]
    out.append("| " + " | ".join(header_ko) + " |")
    out.append("|" + "|".join(["---"] * len(COLUMNS)) + "|")
    for r in sorted_rows:
        out.append("| " + " | ".join(md_escape(r.get(c, "")) for c in COL_KEYS) + " |")

    # priority counts
    p0 = sum(1 for r in sorted_rows if r["priority"] == "P0")
    p1 = sum(1 for r in sorted_rows if r["priority"] == "P1")
    p2 = sum(1 for r in sorted_rows if r["priority"] == "P2")
    out.append("")
    out.append(f"**총 {len(sorted_rows)}행** (P0: {p0} / P1: {p1} / P2: {p2})")
    out.append("")

    os.makedirs(os.path.dirname(OUT_MD), exist_ok=True)
    with open(OUT_MD, "w") as f:
        f.write("\n".join(out) + "\n")
    print(f"wrote {OUT_MD}")


if __name__ == "__main__":
    build_xlsx()
    build_md()
