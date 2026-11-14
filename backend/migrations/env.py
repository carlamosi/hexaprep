from alembic import context
from sqlalchemy import create_engine

from hexaprep.models import Base

config = context.config
target_metadata = Base.metadata


def run_migrations_online() -> None:
    connection = config.attributes.get("connection")
    if connection is None:
        connection = create_engine(config.get_main_option("sqlalchemy.url")).connect()
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


run_migrations_online()
