# database/connection.py
"""
PostgreSQL database connection module
"""

import psycopg2
from psycopg2.extras import RealDictCursor
from contextlib import contextmanager
import os

# Database configuration
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': os.getenv('DB_PORT', '5432'),
    'database': os.getenv('DB_NAME', 'predictionsystem_db'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD', 'ensiensi')
}


class Database:
    def __init__(self):
        self.conn = None
    
    def connect(self):
        """Create database connection"""
        try:
            self.conn = psycopg2.connect(**DB_CONFIG)
            print("✅ Connected to PostgreSQL")
            return self.conn
        except Exception as e:
            print(f"❌ Database connection failed: {e}")
            raise
    
    @contextmanager
    def cursor(self, dict_cursor=True):
        """Get database cursor"""
        if not self.conn or self.conn.closed:
            self.connect()
        
        cursor_class = RealDictCursor if dict_cursor else None
        cur = self.conn.cursor(cursor_factory=cursor_class)
        try:
            yield cur
            self.conn.commit()
        except Exception as e:
            self.conn.rollback()
            raise e
        finally:
            cur.close()
    
    def execute(self, query, params=None):
        """Execute a query"""
        with self.cursor(dict_cursor=False) as cur:
            cur.execute(query, params or ())
            if cur.description:
                return cur.fetchall()
            return []
    
    def close(self):
        """Close connection"""
        if self.conn and not self.conn.closed:
            self.conn.close()
            print("Database connection closed")


# Singleton instance
db = Database()