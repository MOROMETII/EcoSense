import psycopg2 # de ce yellow underline? 
from psycopg2.extras import RealDictCursor

DATABASE_URL = "postgresql://neondb_owner:npg_B87QOcFkZaTu@ep-red-rain-alg43f93-pooler.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

def get_db():
    conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
    return conn