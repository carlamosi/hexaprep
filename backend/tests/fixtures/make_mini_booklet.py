"""Genera mini_booklet.pdf: 4 caras A4 apaisadas con 2 paginas A5 cada una (T=8), impuestas para grapar.

Cada linea (salvo las de la portada, que lleva el indice) empieza por [pN] (N = indice A5 0-based) para comprobar que no se mezclan las dos mitades.
Uso: python make_mini_booklet.py   (requiere reportlab; el PDF resultante esta versionado)
"""
from pathlib import Path

from reportlab.lib.pagesizes import A4, landscape
from reportlab.pdfgen import canvas

T = 8
CONTENT = {
    0: ["Booklet de prueba", "ECONOMÍA 1º BACHILLERATO", "Tema 1", "Intro 1–2", "Segundo bloque 3–5", "Tercero 6"],
    1: ["Intro: escasez y elección", "La economía estudia cómo decidimos.", "Ejemplo con acentos: oferta y demanda"],
    2: ["Intro: coste de oportunidad", "Lo que se deja de ganar al elegir."],
    3: ["Segundo bloque: sistemas", "Economía de mercado y planificada."],
    4: ["Segundo bloque: flujo circular", "Familias y empresas intercambian."],
    5: ["Segundo bloque: áreas de estudio", "Micro y macroeconomía."],
    6: ["Tercero: conclusiones", "Aprender a elegir bien."],
    7: ["Contraportada", "Carla Monté Sihuro"],
}


def imposition(n_faces):
    out = []
    for f in range(n_faces):
        i = f // 2
        out.append((T - 1 - 2 * i, 2 * i) if f % 2 == 0 else (2 * i + 1, T - 2 - 2 * i))
    return out


def draw_half(c, idx, x0):
    y = 520
    for line in CONTENT[idx]:
        c.drawString(x0 + 30, y, line if idx == 0 else f"[p{idx}] {line}")  # la portada lleva el indice tal cual
        y -= 22


def main():
    w, h = landscape(A4)
    c = canvas.Canvas(str(Path(__file__).with_name("mini_booklet.pdf")), pagesize=(w, h))
    c.setFont("Helvetica", 12)
    for left, right in imposition(T // 2):
        draw_half(c, left, 0)
        draw_half(c, right, w / 2)
        c.showPage()
    c.save()


if __name__ == "__main__":
    main()
