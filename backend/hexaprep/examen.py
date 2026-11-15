"""Fecha de examen opcional por asignatura: días que quedan y conceptos nuevos al día para llegar con el temario cubierto."""
import math
from datetime import date


def plan(fecha: date, hoy: date, total: int, tocados: int) -> dict:
    dias = (fecha - hoy).days
    sin_tocar = max(total - tocados, 0)
    por_dia = None if dias < 0 else math.ceil(sin_tocar / max(dias, 1))
    return {"dias": dias, "total": total, "tocados": tocados, "sin_tocar": sin_tocar, "por_dia": por_dia}
