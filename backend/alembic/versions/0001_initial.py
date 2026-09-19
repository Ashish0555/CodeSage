"""Create the SQLAlchemy schema used by the migrated API.

Revision ID: 0001_initial
"""
from alembic import op
from app.db.database import Base
from app.models import models  # noqa: F401

revision = '0001_initial'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    Base.metadata.create_all(bind=op.get_bind())


def downgrade():
    Base.metadata.drop_all(bind=op.get_bind())
