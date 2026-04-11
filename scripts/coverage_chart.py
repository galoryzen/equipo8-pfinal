#!/usr/bin/env python3
"""
Coverage Chart Generator — Cobertura por capa y drill-downs.

Uso:
    python scripts/coverage_chart.py                        # genera las 4 gráficas
    python scripts/coverage_chart.py --only consolidated    # solo la headline
    python scripts/coverage_chart.py --only backend         # solo drill-down backend
    python scripts/coverage_chart.py --only web             # solo drill-down web
    python scripts/coverage_chart.py --only mobile          # solo drill-down mobile
    python scripts/coverage_chart.py --output-dir docs/p1/  # custom output dir

Lee los JSON de cobertura generados por pytest-cov (backend, uno por servicio),
Vitest v8 (web) y Jest (mobile) y produce gráficas de barras con el umbral
del 70% marcado como línea de meta (OBJ-002).

Prerrequisitos:
  - Backend: correr `make coverage` dentro de backend/ (genera
    backend/services/{svc}/coverage.json por servicio).
  - Web: correr `pnpm test:coverage` dentro de frontend/travel-hub/.
  - Mobile: correr `npm run test:coverage` dentro de mobile/.

Genera:
    docs/coverage_chart.png           (3 barras: Backend / Web / Mobile)
    docs/coverage_chart_backend.png   (5 barras: microservicios)
    docs/coverage_chart_web.png       (N barras: áreas de app/)
    docs/coverage_chart_mobile.png    (N barras: features + shared)
"""

import argparse
import json
import os
import sys

import matplotlib.pyplot as plt
import matplotlib.ticker as ticker

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
DEFAULT_OUTPUT_DIR = os.path.join(PROJECT_ROOT, "docs")

THRESHOLD = 70.0

# ── Configuración por capa ────────────────────────────────────────────

BACKEND_SERVICES = ["auth", "catalog", "booking", "payment", "notification"]

# Frontend: (label visible, prefijo relativo dentro de frontend/travel-hub/)
WEB_GROUPS: list[tuple[str, str]] = [
    ("Auth", "app/(auth)/"),
    ("Traveler", "app/traveler/"),
    ("Manager", "app/manager/"),
    ("Components", "app/components/"),
    ("Lib", "app/lib/"),
]

# Mobile: (label visible, prefijo relativo dentro de mobile/)
MOBILE_GROUPS: list[tuple[str, str]] = [
    ("Auth", "src/features/auth/"),
    ("Catalog", "src/features/catalog/"),
    ("Booking", "src/features/booking/"),
    ("Notifications", "src/features/notifications/"),
    ("UI", "src/shared/ui/"),
    ("Hooks", "src/shared/hooks/"),
    ("Utils", "src/shared/utils/"),
    ("Services", "src/services/"),
]

# ── Paleta (alineada con velocity_chart.py) ───────────────────────────

COLOR_OK = "#7ED321"      # verde "Realizado" de velocity_chart
COLOR_BELOW = "#E57373"   # rojo suave para <70%
COLOR_NA = "#BDBDBD"      # gris para N/A (sin datos)
COLOR_TARGET = "#4A90D9"  # azul "Proyectado" para la línea de meta
COLOR_TEXT = "#555"


# ═══════════════════════════════════════════════════════════════════════
# Lectura de datos
# ═══════════════════════════════════════════════════════════════════════


def read_backend_service(svc: str) -> tuple[float, int, int] | None:
    """Lee coverage.json de un microservicio backend.

    Returns (percent, covered_lines, num_statements) o None si no existe.
    """
    path = os.path.join(PROJECT_ROOT, "backend", "services", svc, "coverage.json")
    if not os.path.exists(path):
        return None
    try:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
    except (OSError, json.JSONDecodeError) as e:
        print(f"  WARN: no se pudo leer {path}: {e}")
        return None

    totals = data.get("totals", {})
    pct = float(totals.get("percent_covered", 0.0))
    covered = int(totals.get("covered_lines", 0))
    total = int(totals.get("num_statements", 0))
    return (pct, covered, total)


def read_summary_json(path: str) -> dict | None:
    """Lee un coverage-summary.json (istanbul/v8 format)."""
    if not os.path.exists(path):
        return None
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, json.JSONDecodeError) as e:
        print(f"  WARN: no se pudo leer {path}: {e}")
        return None


def summary_total_pct(summary: dict) -> float | None:
    """Extrae el porcentaje total de líneas de un coverage-summary.json."""
    try:
        return float(summary["total"]["lines"]["pct"])
    except (KeyError, TypeError, ValueError):
        return None


def group_by_prefix(
    summary: dict,
    groups: list[tuple[str, str]],
    root_path: str,
) -> list[tuple[str, float | None]]:
    """Agrupa archivos del coverage-summary.json por prefijo de path.

    Para cada grupo, suma líneas cubiertas y totales y computa el porcentaje.
    Si un grupo no tiene archivos (total == 0), retorna None para ese grupo.

    Args:
        summary: el dict completo de coverage-summary.json
        groups: lista de (label, prefijo_relativo)
        root_path: prefijo absoluto a remover de las claves del summary
    """
    # Normalizar root_path (siempre con trailing slash para removeprefix limpio)
    root_path = os.path.normpath(root_path) + os.sep

    results: list[tuple[str, float | None]] = []
    for label, prefix in groups:
        covered = 0
        total = 0
        for abs_path, entry in summary.items():
            if abs_path == "total":
                continue
            # Path del archivo relativo al root del proyecto
            normalized = os.path.normpath(abs_path)
            if normalized.startswith(root_path):
                rel = normalized[len(root_path):]
            else:
                # Fallback: algunos reporters usan paths relativos
                rel = normalized.lstrip("/")
            if rel.startswith(prefix):
                try:
                    covered += int(entry["lines"]["covered"])
                    total += int(entry["lines"]["total"])
                except (KeyError, TypeError, ValueError):
                    continue
        pct: float | None = (100.0 * covered / total) if total > 0 else None
        results.append((label, pct))
    return results


# ═══════════════════════════════════════════════════════════════════════
# Renderizado
# ═══════════════════════════════════════════════════════════════════════


def _bar_color(pct: float | None) -> str:
    if pct is None:
        return COLOR_NA
    return COLOR_OK if pct >= THRESHOLD else COLOR_BELOW


def _annotate_bars(ax, bars, values: list[float | None]):
    """Pone el % sobre cada barra. Usa 'N/A' para valores None."""
    for bar, v in zip(bars, values):
        h = bar.get_height()
        if v is None:
            label = "N/A"
            y = 2
        else:
            label = f"{v:.1f}%"
            y = h
        ax.annotate(
            label,
            xy=(bar.get_x() + bar.get_width() / 2, y),
            xytext=(0, 4),
            textcoords="offset points",
            ha="center",
            va="bottom",
            fontsize=10,
            fontweight="bold",
            color=COLOR_TEXT if v is None else "black",
        )


def _draw_threshold_line(ax):
    ax.axhline(
        y=THRESHOLD,
        color=COLOR_TARGET,
        linestyle="--",
        linewidth=2,
        alpha=0.8,
        label=f"Meta OBJ-002 ({int(THRESHOLD)}%)",
        zorder=3,
    )


def _setup_axes(ax, title: str, xlabel: str | None = None):
    ax.set_ylabel("Cobertura de líneas (%)", fontsize=12)
    if xlabel:
        ax.set_xlabel(xlabel, fontsize=12)
    ax.set_title(title, fontsize=14, fontweight="bold")
    ax.set_ylim(0, 110)
    ax.yaxis.set_major_locator(ticker.MultipleLocator(10))
    ax.grid(axis="y", alpha=0.3)
    ax.set_axisbelow(True)
    ax.legend(fontsize=11, loc="upper right")


def build_consolidated(
    backend_pct: float | None,
    web_pct: float | None,
    mobile_pct: float | None,
    output: str,
):
    """Chart headline: 3 barras (Backend / Web / Mobile) + línea de meta."""
    labels = ["Backend", "Web", "Mobile"]
    values: list[float | None] = [backend_pct, web_pct, mobile_pct]
    plot_values = [v if v is not None else 0.0 for v in values]
    colors = [_bar_color(v) for v in values]

    fig, ax = plt.subplots(figsize=(12, 6))
    bars = ax.bar(labels, plot_values, width=0.5, color=colors, edgecolor="white")
    _draw_threshold_line(ax)
    _annotate_bars(ax, bars, values)
    _setup_axes(
        ax,
        title="Cobertura por Capa — Sprint 1 (OBJ-002)",
    )
    ax.tick_params(axis="x", labelsize=12)

    fig.tight_layout()
    os.makedirs(os.path.dirname(output), exist_ok=True)
    fig.savefig(output, dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"Chart generado: {output}")


def build_drilldown(
    title: str,
    bars_data: list[tuple[str, float | None]],
    output: str,
    rotate_labels: bool = False,
):
    """Drill-down reutilizable: N barras con colores por threshold + línea de meta."""
    labels = [b[0] for b in bars_data]
    values: list[float | None] = [b[1] for b in bars_data]
    plot_values = [v if v is not None else 0.0 for v in values]
    colors = [_bar_color(v) for v in values]

    width = 0.55 if len(labels) <= 5 else 0.65
    fig, ax = plt.subplots(figsize=(12, 6))
    bars = ax.bar(labels, plot_values, width=width, color=colors, edgecolor="white")
    _draw_threshold_line(ax)
    _annotate_bars(ax, bars, values)
    _setup_axes(ax, title=title)

    if rotate_labels:
        ax.tick_params(axis="x", labelsize=10)
        plt.setp(ax.get_xticklabels(), rotation=15, ha="right")
    else:
        ax.tick_params(axis="x", labelsize=11)

    fig.tight_layout()
    os.makedirs(os.path.dirname(output), exist_ok=True)
    fig.savefig(output, dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"Chart generado: {output}")


# ═══════════════════════════════════════════════════════════════════════
# Main
# ═══════════════════════════════════════════════════════════════════════


def gather_backend() -> tuple[float | None, list[tuple[str, float | None]]]:
    """Lee los 5 microservicios backend. Retorna (total_pct, drill_down_bars)."""
    print("  Backend:")
    drill: list[tuple[str, float | None]] = []
    total_covered = 0
    total_statements = 0
    any_found = False

    for svc in BACKEND_SERVICES:
        result = read_backend_service(svc)
        if result is None:
            print(f"    {svc:<13} → coverage.json no encontrado (corre `make coverage s={svc}`)")
            drill.append((svc, None))
            continue
        pct, covered, statements = result
        print(f"    {svc:<13} → coverage.json ✓  ({pct:.1f}%)")
        drill.append((svc, pct))
        total_covered += covered
        total_statements += statements
        any_found = True

    if not any_found or total_statements == 0:
        print("    (no hay datos suficientes para el total backend)")
        return (None, drill)

    total_pct = 100.0 * total_covered / total_statements
    print(f"    Total backend (line-weighted): {total_pct:.1f}%")
    return (total_pct, drill)


def gather_web() -> tuple[float | None, list[tuple[str, float | None]]]:
    print("  Web:")
    path = os.path.join(
        PROJECT_ROOT, "frontend", "travel-hub", "coverage", "coverage-summary.json"
    )
    summary = read_summary_json(path)
    if summary is None:
        print(f"    coverage-summary.json no encontrado en {path}")
        print("    (corre `pnpm test:coverage` dentro de frontend/travel-hub/)")
        return (None, [(label, None) for label, _ in WEB_GROUPS])

    total_pct = summary_total_pct(summary)
    print(f"    coverage-summary.json ✓  (total: {total_pct:.1f}% líneas)" if total_pct is not None else "    coverage-summary.json ✓ (sin total parseable)")

    root = os.path.join(PROJECT_ROOT, "frontend", "travel-hub")
    drill = group_by_prefix(summary, WEB_GROUPS, root)
    for label, pct in drill:
        if pct is None:
            print(f"    {label:<12} → sin archivos instrumentados (N/A)")
        else:
            print(f"    {label:<12} → {pct:.1f}%")
    return (total_pct, drill)


def gather_mobile() -> tuple[float | None, list[tuple[str, float | None]]]:
    print("  Mobile:")
    path = os.path.join(PROJECT_ROOT, "mobile", "coverage", "coverage-summary.json")
    summary = read_summary_json(path)
    if summary is None:
        print(f"    coverage-summary.json no encontrado en {path}")
        print("    (corre `npm run test:coverage` dentro de mobile/)")
        return (None, [(label, None) for label, _ in MOBILE_GROUPS])

    total_pct = summary_total_pct(summary)
    print(f"    coverage-summary.json ✓  (total: {total_pct:.1f}% líneas)" if total_pct is not None else "    coverage-summary.json ✓ (sin total parseable)")

    root = os.path.join(PROJECT_ROOT, "mobile")
    drill = group_by_prefix(summary, MOBILE_GROUPS, root)
    for label, pct in drill:
        if pct is None:
            print(f"    {label:<14} → sin archivos instrumentados (N/A)")
        else:
            print(f"    {label:<14} → {pct:.1f}%")
    return (total_pct, drill)


def main():
    parser = argparse.ArgumentParser(
        description="Genera gráficas de cobertura por capa (OBJ-002)",
    )
    parser.add_argument(
        "--only",
        choices=["all", "consolidated", "backend", "web", "mobile"],
        default="all",
        help="Qué gráfica generar (default: all)",
    )
    parser.add_argument(
        "--output-dir",
        default=DEFAULT_OUTPUT_DIR,
        help="Directorio donde guardar los PNGs (default: docs/)",
    )
    args = parser.parse_args()

    output_dir = os.path.abspath(args.output_dir)

    print("Procesando cobertura...")
    backend_total, backend_drill = gather_backend()
    web_total, web_drill = gather_web()
    mobile_total, mobile_drill = gather_mobile()
    print()

    any_written = False

    if args.only in ("all", "consolidated"):
        output = os.path.join(output_dir, "coverage_chart.png")
        build_consolidated(backend_total, web_total, mobile_total, output)
        any_written = True

    if args.only in ("all", "backend"):
        output = os.path.join(output_dir, "coverage_chart_backend.png")
        build_drilldown(
            title="Cobertura Backend por Microservicio",
            bars_data=backend_drill,
            output=output,
        )
        any_written = True

    if args.only in ("all", "web"):
        output = os.path.join(output_dir, "coverage_chart_web.png")
        build_drilldown(
            title="Cobertura Web por Área",
            bars_data=web_drill,
            output=output,
        )
        any_written = True

    if args.only in ("all", "mobile"):
        output = os.path.join(output_dir, "coverage_chart_mobile.png")
        build_drilldown(
            title="Cobertura Mobile por Módulo",
            bars_data=mobile_drill,
            output=output,
            rotate_labels=True,
        )
        any_written = True

    if not any_written:
        print("No se generó ninguna gráfica.", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
