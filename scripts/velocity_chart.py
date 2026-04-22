#!/usr/bin/env python3
"""
Velocity Chart Generator — Proyectado vs Realizado (por semana).

Uso:
    python scripts/velocity_chart.py                        # usa Jira.csv
    python scripts/velocity_chart.py --csv path/to.csv      # CSV custom

Lee las fechas de resolución y story points del CSV de Jira,
agrupa por semana y genera el bar chart.

Genera: docs/velocity_chart.png
"""

import argparse
import csv
import os
import sys
from datetime import datetime, date

import matplotlib.pyplot as plt
import matplotlib.ticker as ticker

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)

DEFAULT_CSV = os.path.join(PROJECT_ROOT, "Jira.csv")
OUTPUT_FILE = os.path.join(PROJECT_ROOT, "docs", "velocity_chart.png")

VELOCITY = 16  # pts por semana proyectados (default)

# Overrides puntuales cuando una semana cambia su capacidad proyectada.
# Ej: S2-W1 = 18 porque entraron 2 HU nuevas al sprint sobre la estimacion base.
VELOCITY_OVERRIDES = {
    "S2-W1": 18,
}

# ── Semanas del proyecto ──────────────────────────────────────────────
WEEKS = [
    ("S1-W1", "Sprint 1", date(2026, 3, 23), date(2026, 3, 29)),
    ("S1-W2", "Sprint 1", date(2026, 4, 6),  date(2026, 4, 12)),
    ("S2-W1", "Sprint 2", date(2026, 4, 13), date(2026, 4, 19)),
    ("S2-W2", "Sprint 2", date(2026, 4, 20), date(2026, 4, 26)),
    ("S3-W1", "Sprint 3", date(2026, 4, 27), date(2026, 5, 3)),
    ("S3-W2", "Sprint 3", date(2026, 5, 4),  date(2026, 5, 10)),
    ("S3-W3", "Sprint 3", date(2026, 5, 11), date(2026, 5, 17)),
]


def parse_resolved_date(date_str: str) -> date | None:
    """Parsea fechas tipo '28/Mar/26 11:01 PM'."""
    for fmt in ("%d/%b/%y %I:%M %p", "%d/%b/%y %H:%M"):
        try:
            return datetime.strptime(date_str, fmt).date()
        except ValueError:
            continue
    return None


def assign_week(resolved: date) -> str | None:
    """Asigna una fecha resuelta a la semana correspondiente."""
    for label, _, start, end in WEEKS:
        if start <= resolved <= end:
            return label
    # Receso 30/03-05/04 → asignar a S1-W1
    if date(2026, 3, 30) <= resolved <= date(2026, 4, 5):
        return "S1-W1"
    return None


def parse_csv(csv_path: str) -> dict[str, float]:
    """Lee CSV y retorna story points completados por semana."""
    week_pts: dict[str, float] = {w[0]: 0.0 for w in WEEKS}

    with open(csv_path, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            itype = row.get("Issue Type", "").strip()
            sprint = row.get("Sprint", "").strip()
            status = row.get("Status", "").strip()
            key = row.get("Issue key", "").strip()
            resolved_str = row.get("Resolved", "").strip()
            pts_raw = row.get("Custom field (Story point estimate)", "").strip()

            if itype != "Story" or not sprint or status != "Done":
                continue
            if not resolved_str or not pts_raw:
                continue

            resolved = parse_resolved_date(resolved_str)
            if not resolved:
                print(f"  WARN: no se pudo parsear fecha de {key}: {resolved_str}")
                continue

            pts = float(pts_raw)
            week = assign_week(resolved)
            if week:
                week_pts[week] += pts
                print(f"  {key} → {resolved} → {week} (+{pts:.0f} pts)")
            else:
                print(f"  WARN: {key} resuelto {resolved} no cae en ninguna semana")

    return week_pts


def build_chart(week_pts: dict[str, float], velocity: int, output: str):
    """Genera el velocity bar chart."""
    labels = [w[0] for w in WEEKS]
    realized = [week_pts[label] for label in labels]
    projected = [VELOCITY_OVERRIDES.get(label, velocity) for label in labels]

    # Sprint boundaries
    sprint_boundaries = []
    sprint_names = []
    prev_sprint = None
    for i, (_, sprint, _, _) in enumerate(WEEKS):
        if sprint != prev_sprint:
            sprint_boundaries.append(i)
            sprint_names.append(sprint)
            prev_sprint = sprint

    x = range(len(labels))
    width = 0.35

    fig, ax = plt.subplots(figsize=(12, 6))

    bars_proj = ax.bar(
        [i - width / 2 for i in x], projected, width,
        label=f"Proyectado ({velocity} pts/sem)", color="#4A90D9", edgecolor="white",
    )
    bars_real = ax.bar(
        [i + width / 2 for i in x], realized, width,
        label="Realizado", color="#7ED321", edgecolor="white",
    )

    # Etiquetas de valor
    for bars in (bars_proj, bars_real):
        for bar in bars:
            h = bar.get_height()
            if h > 0:
                ax.annotate(
                    f"{h:.0f}",
                    xy=(bar.get_x() + bar.get_width() / 2, h),
                    xytext=(0, 4), textcoords="offset points",
                    ha="center", va="bottom", fontsize=10, fontweight="bold",
                )

    # Separadores verticales entre sprints
    for i, boundary in enumerate(sprint_boundaries[1:], 1):
        ax.axvline(x=boundary - 0.5, color="gray", linestyle="--", alpha=0.4)

    # Labels de sprint
    for i, boundary in enumerate(sprint_boundaries):
        end = sprint_boundaries[i + 1] if i + 1 < len(sprint_boundaries) else len(labels)
        mid = (boundary + end - 1) / 2
        ax.text(
            mid, -0.12, sprint_names[i],
            transform=ax.get_xaxis_transform(),
            ha="center", va="top", fontsize=10, fontweight="bold", color="#555",
        )

    ax.set_xlabel("Semana", fontsize=12, labelpad=25)
    ax.set_ylabel("Story Points", fontsize=12)
    ax.set_title("Velocity Chart — Proyectado vs Realizado", fontsize=14, fontweight="bold")
    ax.set_xticks(list(x))
    ax.set_xticklabels(labels, fontsize=10)
    ax.yaxis.set_major_locator(ticker.MultipleLocator(4))
    ax.legend(fontsize=11, loc="upper right")
    ax.grid(axis="y", alpha=0.3)
    ax.set_axisbelow(True)
    ax.set_ylim(0, max(max(projected), max(realized, default=0)) + 6)

    fig.tight_layout()
    os.makedirs(os.path.dirname(output), exist_ok=True)
    fig.savefig(output, dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"Chart generado: {output}")


def main():
    parser = argparse.ArgumentParser(description="Genera velocity chart semanal desde Jira CSV")
    parser.add_argument("--csv", default=DEFAULT_CSV, help="Ruta al CSV de Jira")
    parser.add_argument("--velocity", type=int, default=VELOCITY, help="Story points por semana proyectados")
    parser.add_argument("--output", default=OUTPUT_FILE, help="Ruta de salida del PNG")
    args = parser.parse_args()

    if not os.path.exists(args.csv):
        print(f"Error: no se encontro {args.csv}", file=sys.stderr)
        print("Exporta el CSV desde Jira y colocalo en la raiz del proyecto como Jira.csv", file=sys.stderr)
        sys.exit(1)

    print("Procesando historias completadas...")
    week_pts = parse_csv(args.csv)

    print(f"\nStory points por semana:")
    for label, pts in week_pts.items():
        print(f"  {label}: {pts:.0f} pts")
    print(f"  Total: {sum(week_pts.values()):.0f} pts")

    build_chart(week_pts, args.velocity, args.output)


if __name__ == "__main__":
    main()