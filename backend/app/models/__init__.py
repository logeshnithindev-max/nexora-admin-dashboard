"""Database/ORM models.

This project does not use SQLAlchemy ORM entity classes. Every database
operation is written as raw SQL (via `sqlalchemy.text()` or `pymysql`)
inside the services layer, against tables that are managed by the SQL
files in /migrations rather than by ORM-declared models.

This package is kept as an empty placeholder so the project matches the
requested layer structure, and so ORM models have an obvious home if they
are introduced later. Nothing was invented here to avoid misrepresenting
logic that actually lives in the services layer.
"""
