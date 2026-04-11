#!/usr/bin/env python3
"""
Business Value Acumulado — Linea de tiempo por fecha de resolución.

Uso:
    python scripts/bv_chart.py                      # usa Jira.csv por defecto
    python scripts/bv_chart.py --csv path/to.csv    # CSV custom

Lee el BV de cada historia y las fechas de resolución del CSV de Jira.
Genera un line chart donde cada punto es una historia completada y el
BV acumulado sube progresivamente.

Genera: docs/bv_chart.png
"""

import argparse
import csv
import os
import sys
from datetime import datetime, date, timedelta

import matplotlib.pyplot as plt
import matplotlib.dates as mdates

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)

DEFAULT_CSV = os.path.join(PROJECT_ROOT, "Jira.csv")
OUTPUT_FILE = os.path.join(PROJECT_ROOT, "docs", "bv_chart.png")

# ── Calendario del proyecto ───────────────────────────────────────────
PROJECT_START = date(2026, 3, 23)
PROJECT_END = date(2026, 5, 17)
RECESS_START = datetime(2026, 3, 30)  # inicio del receso
RECESS_DAYS = 7                        # días a colapsar

SPRINTS = [
    ("Sprint 1", date(2026, 3, 23), date(2026, 4, 12)),
    ("Sprint 2", date(2026, 4, 13), date(2026, 4, 26)),
    ("Sprint 3", date(2026, 4, 27), date(2026, 5, 17)),
]


def collapse(dt) -> datetime:
    """Desplaza fechas posteriores al receso 7 días hacia atrás."""
    if isinstance(dt, date) and not isinstance(dt, datetime):
        dt = datetime.combine(dt, datetime.min.time())
    if dt >= RECESS_START + timedelta(days=RECESS_DAYS):
        return dt - timedelta(days=RECESS_DAYS)
    if dt >= RECESS_START:
        return RECESS_START  # fechas dentro del receso se pegan al borde
    return dt

# ── Business Value por historia (suma = 100%) ────────────────────────
BV = {
    # Sprint 1
    "SCRUM-170": 2.0, "SCRUM-173": 2.0,
    "SCRUM-73": 3.5, "SCRUM-74": 2.5, "SCRUM-75": 2.5, "SCRUM-76": 2.0, "SCRUM-77": 2.5,
    "SCRUM-78": 1.0, "SCRUM-79": 1.0, "SCRUM-80": 0.5, "SCRUM-81": 1.0, "SCRUM-82": 1.0,
    "SCRUM-87": 0.5,
    "SCRUM-110": 1.5, "SCRUM-113": 1.0, "SCRUM-115": 1.5, "SCRUM-116": 1.0,
    "SCRUM-117": 0.5, "SCRUM-118": 0.5, "SCRUM-119": 0.5,
    # Sprint 2
    "SCRUM-83": 6.0, "SCRUM-123": 3.0, "SCRUM-122": 1.5, "SCRUM-124": 1.5,
    "SCRUM-84": 5.0, "SCRUM-86": 3.0, "SCRUM-125": 3.0, "SCRUM-107": 2.0,
    "SCRUM-127": 1.0, "SCRUM-128": 1.0, "SCRUM-160": 1.5,
    "SCRUM-172": 2.0, "SCRUM-199": 3.5, "SCRUM-200": 2.5, "SCRUM-185": 1.5,
    "SCRUM-188": 1.5, "SCRUM-190": 1.0,
    # Sprint 3
    "SCRUM-94": 2.5, "SCRUM-106": 1.5, "SCRUM-93": 1.5,
    "SCRUM-174": 1.0, "SCRUM-178": 2.0, "SCRUM-180": 0.5, "SCRUM-138": 0.5, "SCRUM-137": 0.5,
    "SCRUM-183": 1.5, "SCRUM-184": 1.5, "SCRUM-196": 1.5, "SCRUM-198": 1.5,
    "SCRUM-191": 1.0, "SCRUM-189": 1.0, "SCRUM-193": 0.5, "SCRUM-194": 0.5, "SCRUM-195": 0.5,
    "SCRUM-201": 0.5, "SCRUM-202": 0.5,
    "SCRUM-156": 1.0, "SCRUM-164": 1.0, "SCRUM-161": 0.5, "SCRUM-165": 0.5, "SCRUM-166": 0.5,
    "SCRUM-126": 1.5, "SCRUM-112": 0.5, "SCRUM-111": 0.5, "SCRUM-120": 0.5,
    "SCRUM-131": 1.0, "SCRUM-132": 0.5, "SCRUM-134": 0.5,
    "SCRUM-91": 2.0,
}


def parse_resolved_date(date_str: str) -> datetime | None:
    """Parsea fechas tipo '28/Mar/26 11:01 PM' conservando la hora."""
    for fmt in ("%d/%b/%y %I:%M %p", "%d/%b/%y %H:%M"):
        try:
            return datetime.strptime(date_str, fmt)
        except ValueError:
            continue
    return None


def parse_csv(csv_path: str) -> list[tuple[datetime, str, float]]:
    """Lee CSV y retorna lista de (datetime, key, bv) ordenada por fecha+hora."""
    events = []

    with open(csv_path, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            itype = row.get("Issue Type", "").strip()
            sprint = row.get("Sprint", "").strip()
            status = row.get("Status", "").strip()
            key = row.get("Issue key", "").strip()
            resolved_str = row.get("Resolved", "").strip()

            if itype != "Story" or not sprint or status != "Done":
                continue
            if key not in BV:
                continue
            if not resolved_str:
                continue

            resolved = parse_resolved_date(resolved_str)
            if not resolved:
                print(f"  WARN: no se pudo parsear fecha de {key}: {resolved_str}")
                continue

            events.append((resolved, key, BV[key]))
            print(f"  {key} → {resolved} (+{BV[key]}% BV)")

    events.sort(key=lambda e: e[0])
    return events


def build_chart(events: list[tuple[date, str, float]], output: str):
    """Genera line chart de BV acumulado con fechas reales en eje X."""

    # Punto inicial: inicio del proyecto, 0%
    dates = [collapse(PROJECT_START)]
    cumulative = [0.0]

    acc = 0.0
    for resolved_dt, key, bv_val in events:
        acc += bv_val
        dates.append(collapse(resolved_dt))
        cumulative.append(acc)

    # Linea proyectada: de inicio a fin, 0% → 100%
    proj_dates = [collapse(PROJECT_START), collapse(PROJECT_END)]
    proj_values = [0.0, 100.0]

    fig, ax = plt.subplots(figsize=(13, 6))

    # Proyectado
    ax.plot(
        proj_dates, proj_values,
        linewidth=2, linestyle="--", color="#4A90D9",
        label="Proyectado (lineal)", zorder=3,
    )

    # Realizado — linea continua con puntos en cada historia
    ax.plot(
        dates, cumulative,
        linewidth=2.5, color="#7ED321",
        label="Realizado", zorder=4,
    )
    ax.scatter(
        dates[1:], cumulative[1:],
        s=40, color="#7ED321", zorder=5, edgecolors="white", linewidths=0.5,
    )

    # Etiqueta del último punto acumulado
    if len(cumulative) > 1:
        ax.annotate(
            f"{cumulative[-1]:.1f}%",
            xy=(dates[-1], cumulative[-1]),
            xytext=(10, 5), textcoords="offset points",
            ha="left", fontsize=10, fontweight="bold", color="#4a8c1c",
        )

    # Separadores de sprint con shading alterno
    colors_bg = ["#e8f0fe", "#fff8e1", "#e8f5e9"]
    for i, (name, start, end) in enumerate(SPRINTS):
        cs, ce = collapse(start), collapse(end)
        ax.axvspan(cs, ce, alpha=0.15, color=colors_bg[i], zorder=0)
        ax.axvline(x=cs, color="gray", linestyle="--", alpha=0.3, zorder=1)
        mid = cs + (ce - cs) / 2
        ax.text(
            mid, 102, name,
            ha="center", va="bottom", fontsize=10, fontweight="bold", color="#555",
        )

    # Eje X: labels de semana (colapsadas)
    WEEKS = [
        ("S1-W1", date(2026, 3, 23), date(2026, 3, 29)),
        ("S1-W2", date(2026, 4, 6),  date(2026, 4, 12)),
        ("S2-W1", date(2026, 4, 13), date(2026, 4, 19)),
        ("S2-W2", date(2026, 4, 20), date(2026, 4, 26)),
        ("S3-W1", date(2026, 4, 27), date(2026, 5, 3)),
        ("S3-W2", date(2026, 5, 4),  date(2026, 5, 10)),
        ("S3-W3", date(2026, 5, 11), date(2026, 5, 17)),
    ]
    week_mids = [collapse(s) + (collapse(e) - collapse(s)) / 2 for _, s, e in WEEKS]
    week_labels = [w[0] for w in WEEKS]

    # Divisores verticales entre semanas
    for _, ws, we in WEEKS:
        ax.axvline(x=collapse(ws), color="#cccccc", linestyle="-", alpha=0.5, linewidth=0.8, zorder=1)
    # Borde final de la última semana
    ax.axvline(x=collapse(WEEKS[-1][2]), color="#cccccc", linestyle="-", alpha=0.5, linewidth=0.8, zorder=1)

    ax.set_xticks(week_mids)
    ax.set_xticklabels(week_labels, fontsize=10)

    ax.set_xlim(
        collapse(PROJECT_START) - timedelta(days=2),
        collapse(PROJECT_END) + timedelta(days=2),
    )
    ax.set_ylim(0, 110)
    ax.set_xlabel("Semana", fontsize=12)
    ax.set_ylabel("Business Value Acumulado (%)", fontsize=12)
    ax.set_title(
        "Business Value Acumulado — Proyectado vs Realizado",
        fontsize=14, fontweight="bold",
    )
    ax.legend(fontsize=11, loc="upper left")
    ax.grid(axis="y", alpha=0.3)
    ax.set_axisbelow(True)

    fig.tight_layout()
    os.makedirs(os.path.dirname(output), exist_ok=True)
    fig.savefig(output, dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"\nChart generado: {output}")


def main():
    parser = argparse.ArgumentParser(description="Genera chart de BV acumulado")
    parser.add_argument("--csv", default=DEFAULT_CSV, help="Ruta al CSV de Jira")
    parser.add_argument("--output", default=OUTPUT_FILE, help="Ruta de salida del PNG")
    args = parser.parse_args()

    if not os.path.exists(args.csv):
        print(f"Error: no se encontro {args.csv}", file=sys.stderr)
        sys.exit(1)

    print("Procesando historias completadas...")
    events = parse_csv(args.csv)

    total_bv = sum(e[2] for e in events)
    print(f"\nHistorias completadas: {len(events)}")
    print(f"BV acumulado: {total_bv:.1f}%")

    build_chart(events, args.output)


if __name__ == "__main__":
    main()