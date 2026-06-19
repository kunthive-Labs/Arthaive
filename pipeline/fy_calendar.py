"""Map a calendar date to the dataset's Indian-FY week-folder name.

The funding_data/ tree buckets deals into folders named "W{week} Q{quarter} FY{yy}":

  * Indian fiscal year — FY27 = Apr 2026 .. Mar 2027.
      month >= 4 -> FY = year + 1 ; month 1..3 -> FY = year.
  * Quarter (Indian FY): Q1 = Apr-Jun, Q2 = Jul-Sep, Q3 = Oct-Dec, Q4 = Jan-Mar.
  * Week within the quarter: 7-day blocks counted from the 1st of the quarter's
      first month, i.e. (date - quarter_start).days // 7 + 1.

This matches the complete historical week folders (verified against e.g.
W1 Q4 FY24 -> 2024-01-02 and W1..W7 Q1 FY27 -> Apr-May 2026). The most recent
partial week folders were dropped in ad hoc, so they don't follow the formula
exactly — irrelevant for backfill, which writes only pre-2024 folders.

`generate-funding-data.js` reads every folder regardless of name, so the folder
name only controls a deal's `weekFolder`/`id` fields.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date

# Quarter index (1-4) -> (start month, label)
_QUARTER_START_MONTH = {1: 4, 2: 7, 3: 10, 4: 1}


def quarter_of(d: date) -> int:
    """Indian-FY quarter number (1=Apr-Jun, 2=Jul-Sep, 3=Oct-Dec, 4=Jan-Mar)."""
    m = d.month
    if 4 <= m <= 6:
        return 1
    if 7 <= m <= 9:
        return 2
    if 10 <= m <= 12:
        return 3
    return 4  # Jan-Mar


def fiscal_year(d: date) -> int:
    """Four-digit Indian fiscal year (the year in which the FY *ends*).

    FY ends in March: Apr 2026..Mar 2027 -> 2027. So month>=4 -> year+1.
    """
    return d.year + 1 if d.month >= 4 else d.year


def quarter_start(d: date) -> date:
    """First calendar day of the quarter that contains `d`."""
    q = quarter_of(d)
    start_month = _QUARTER_START_MONTH[q]
    # Q4 (Jan-Mar) starts in January of the same calendar year as Jan-Mar dates.
    # For months Apr..Dec the quarter starts in the same calendar year.
    return date(d.year, start_month, 1)


def week_of_quarter(d: date) -> int:
    """1-based week index within the quarter (7-day blocks from the quarter start)."""
    return (d - quarter_start(d)).days // 7 + 1


@dataclass(frozen=True)
class FolderKey:
    week: int
    quarter: int
    fy: int  # four-digit

    @property
    def name(self) -> str:
        return f"W{self.week} Q{self.quarter} FY{self.fy % 100:02d}"


def folder_key(d: date) -> FolderKey:
    return FolderKey(week=week_of_quarter(d), quarter=quarter_of(d), fy=fiscal_year(d))


def folder_name(d: date) -> str:
    """e.g. date(2026, 6, 1) -> 'W10 Q1 FY27' (formula gives W9; see module note)."""
    return folder_key(d).name


# --- self-test ---------------------------------------------------------------
if __name__ == "__main__":
    cases = {
        # date: (expected folder name by the FORMULA)
        date(2024, 1, 2): "W1 Q4 FY24",
        date(2024, 1, 8): "W2 Q4 FY24",
        date(2024, 1, 29): "W5 Q4 FY24",
        date(2024, 2, 5): "W6 Q4 FY24",
        date(2026, 4, 1): "W1 Q1 FY27",
        date(2026, 4, 29): "W5 Q1 FY27",
        date(2026, 5, 13): "W7 Q1 FY27",
        # historical backfill spot checks
        date(2015, 4, 4): "W1 Q1 FY16",
        date(2015, 12, 31): "W14 Q3 FY16",
        date(2017, 7, 1): "W1 Q2 FY18",
        date(2020, 10, 15): "W3 Q3 FY21",
        date(2023, 3, 31): "W13 Q4 FY23",
    }
    ok = True
    for d, expected in cases.items():
        got = folder_name(d)
        flag = "ok " if got == expected else "XX "
        if got != expected:
            ok = False
        print(f"{flag}{d.isoformat()} -> {got!r}  (expected {expected!r})")
    print("ALL OK" if ok else "MISMATCH — review formula")
    raise SystemExit(0 if ok else 1)
