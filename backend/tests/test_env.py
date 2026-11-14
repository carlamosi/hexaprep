import importlib
import sys


def test_dependencies_import():
    for mod in ["fastapi", "sqlalchemy", "alembic", "fsrs", "pydantic"]:
        importlib.import_module(mod)


def test_python_version():
    assert sys.version_info >= (3, 13)
