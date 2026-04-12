#!/usr/bin/env python3
"""
Release Burndown Chart — Trabajo restante al inicio de cada sprint.

Uso:
    python scripts/release_burndown_chart.py

Genera: docs/release_burndown_chart.png
"""

import os

import matplotlib.pyplot as plt
import matplotlib.ticker as ticker

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
OUTPUT_FILE = os.path.join(PROJECT_ROOT, "docs", "release_burndown_chart.png")

# ── Datos del proyecto ───────────────────────────────────────────────
TOTAL_POINTS = 112

# (label, puntos restantes al inicio del sprint)
# None = sprint futuro sin datos aun
SPRINTS = [
    ("Sprint 1", TOTAL_POINTS),
    ("Sprint 2", TOTAL_POINTS - 32),
    ("Sprint 3", None),
    ("Fin", None),
]


def build_chart(output: str):
    labels = [s[0] for s in SPRINTS]
    values = [s[1] for s in SPRINTS]

    # Separar puntos con datos vs sin datos
    real_labels = [l for l, v in zip(labels, values) if v is not None]
    real_values = [v for v in values if v is not None]

    fig, ax = plt.subplots(figsize=(12, 6))

    # Linea real (solo sprints con datos)
    real_x = list(range(len(real_labels)))
    ax.plot(
        real_x, real_values,
        linewidth=2.5, color="#7ED321",
        marker="o", markersize=12, markeredgecolor="white", markeredgewidth=2,
        label="Real", zorder=4,
    )

    # Etiquetas en los puntos reales
    for i, v in enumerate(real_values):
        ax.annotate(
            f"{v} pts",
            xy=(real_x[i], v),
            xytext=(0, 16), textcoords="offset points",
            ha="center", fontsize=14, fontweight="bold", color="#4a8c1c",
        )

    ax.set_xticks(range(len(labels)))
    ax.set_xticklabels(labels, fontsize=12)
    ax.set_xlabel("Sprint", fontsize=12)
    ax.set_ylabel("Story Points Restantes", fontsize=12)
    ax.set_title("Release Burndown Chart", fontsize=14, fontweight="bold")
    ax.yaxis.set_major_locator(ticker.MultipleLocator(16))
    ax.set_ylim(0, TOTAL_POINTS + 10)
    ax.legend(fontsize=11, loc="upper right")
    ax.grid(axis="y", alpha=0.3)
    ax.set_axisbelow(True)

    fig.tight_layout()
    os.makedirs(os.path.dirname(output), exist_ok=True)
    fig.savefig(output, dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"Chart generado: {output}")


def main():
    print("Generando Release Burndown Chart...")
    for label, pts in SPRINTS:
        status = f"{pts} pts restantes" if pts is not None else "(sin datos)"
        print(f"  {label}: {status}")
    print(f"  Total proyecto: {TOTAL_POINTS} pts")
    build_chart(OUTPUT_FILE)


if __name__ == "__main__":
    main()
