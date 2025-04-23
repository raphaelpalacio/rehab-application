import psycopg2
import psycopg2.extras
from config import settings

conn = psycopg2.connect(
    dbname=settings.db_name,
    user=settings.db_user,
    password=settings.db_password,
    host=settings.db_host,
    port=settings.db_port,
)

def getDictCursor():
    return conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

if __name__ == "__main__":    
    cur = conn.cursor()

    with open("schema.sql", "r") as f:
        sql = f.read()
        cur.execute(sql)

        conn.commit()
        cur.close()
        conn.close()

    print("Schema created successfully.")
