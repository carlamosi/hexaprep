import uuid


def new_id() -> str:
    """UUIDv7: ordenable por tiempo (stdlib en Python 3.14)."""
    return str(uuid.uuid7())
