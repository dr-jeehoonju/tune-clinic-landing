#!/usr/bin/env python3
"""Merge English shotlist with Korean field map; write photo-shotlist-ko.json."""
from __future__ import annotations

import json
import os

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir))

from shotlist_ko_p0 import P0
from shotlist_ko_p1 import P1
from shotlist_ko_p2 import P2

PAGE_KO: dict[str, str] = {
    "(global)": "(전역)",
    "(equipment library)": "(장비·라이브러리)",
    "(blog)": "(블로그)",
    "(global footer)": "(푸터·전역)",
}

FIELD_KEYS: tuple[str, ...] = (
    "section",
    "current_state",
    "photo_subject",
    "composition",
    "orientation",
    "mood_lighting",
    "must_include",
    "must_avoid",
    "consent_required",
    "count",
    "notes",
)


def main() -> None:
    en_path = os.path.join(REPO, "scripts", "photo-shotlist-base-en.json")
    out_path = os.path.join(REPO, "scripts", "photo-shotlist-ko.json")

    with open(en_path, encoding="utf-8") as f:
        en: list[dict] = json.load(f)

    book: dict[str, dict[str, str]] = {**P0, **P1, **P2}
    out: list[dict] = []
    for r in en:
        fn = r["suggested_filename"]
        if fn not in book:
            raise SystemExit(f"merge_shotlist_ko: missing Korean map for {fn!r}")
        r2 = dict(r)
        if r2.get("page") in PAGE_KO:
            r2["page"] = PAGE_KO[r2["page"]]
        for k in FIELD_KEYS:
            r2[k] = book[fn][k]
        out.append(r2)

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print(f"wrote {out_path} ({len(out)} rows)")


if __name__ == "__main__":
    main()
