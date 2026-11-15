"""pregunta: grupo, contexto y apartado (problemas con apartados)

Revision ID: 0002
Revises: 0001
"""
from alembic import op
import sqlalchemy as sa


revision = '0002'
down_revision = '0001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('pregunta', sa.Column('grupo', sa.String(length=100), nullable=True))
    op.add_column('pregunta', sa.Column('contexto', sa.Text(), nullable=True))
    op.add_column('pregunta', sa.Column('apartado', sa.String(length=5), nullable=True))
    op.create_index(op.f('ix_pregunta_grupo'), 'pregunta', ['grupo'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_pregunta_grupo'), table_name='pregunta')
    op.drop_column('pregunta', 'apartado')
    op.drop_column('pregunta', 'contexto')
    op.drop_column('pregunta', 'grupo')
