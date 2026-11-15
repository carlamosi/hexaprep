"""Entrada del backend en Vercel (FastAPI): la base es Postgres si existe DATABASE_URL y el acceso va con HEXAPREP_PASSWORD."""
from hexaprep.api import create_app

app = create_app()
