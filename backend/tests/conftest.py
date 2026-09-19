import os

# Configure the test database before importing the cached SQLAlchemy engine.
os.environ['DATABASE_URL'] = 'sqlite:///./test.db'

import pytest
from app.db.database import Base, engine
from app.models import models  # noqa: F401


@pytest.fixture(autouse=True)
def sqlite_database():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
