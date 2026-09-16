import sys
from pathlib import Path

import pytest

STARTER_DIR = Path(__file__).resolve().parents[1] / "starter"
sys.path.insert(0, str(STARTER_DIR))

from app import app


@pytest.fixture
def client():
    app.config.update(TESTING=True)
    with app.test_client() as test_client:
        yield test_client