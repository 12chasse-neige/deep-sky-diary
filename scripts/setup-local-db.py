#!/usr/bin/env python3
"""Create an isolated local PostgreSQL cluster; never modify another project's server."""
import os
from pathlib import Path
import secrets
import shutil
import subprocess

ROOT = Path(__file__).resolve().parent.parent
LOCAL = ROOT / '.local'
DATA = LOCAL / 'postgres'
PG_BIN = Path(os.environ.get('PG_BIN', '/opt/homebrew/opt/postgresql@18/bin'))
if not (PG_BIN / 'initdb').exists():
    found = shutil.which('initdb')
    if not found:
        raise SystemExit('Install PostgreSQL 18 and set PG_BIN to its bin directory.')
    PG_BIN = Path(found).parent

def run(name, *args, **kwargs):
    return subprocess.run([str(PG_BIN / name), *args], check=True, **kwargs)

LOCAL.mkdir(mode=0o700, exist_ok=True)
admin_file = LOCAL / 'db-admin-password'
env_file = ROOT / '.env.local'
if not DATA.exists():
    if env_file.exists():
        raise SystemExit('.env.local already exists; configure your existing database manually (see README).')
    admin_file.write_text(secrets.token_hex(32) + '\n')
    admin_file.chmod(0o600)
    run('initdb', '-D', str(DATA), '-U', 'postgres', '--auth=scram-sha-256',
        '--pwfile=' + str(admin_file), '--encoding=UTF8', '--locale=C')
    with (DATA / 'postgresql.conf').open('a') as handle:
        handle.write("\nlisten_addresses = '127.0.0.1'\nport = 5432\nunix_socket_directories = ''\n")
if subprocess.run([str(PG_BIN / 'pg_ctl'), '-D', str(DATA), 'status'], stdout=subprocess.DEVNULL).returncode:
    run('pg_ctl', '-D', str(DATA), '-l', str(LOCAL / 'postgres.log'), 'start', '-w')
if not env_file.exists():
    app_password = secrets.token_hex(32)
    admin_env = dict(os.environ, PGPASSWORD=admin_file.read_text().strip())
    run('psql', '-h', '127.0.0.1', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1',
        input=f"CREATE ROLE deep_sky LOGIN PASSWORD '{app_password}';\nCREATE DATABASE deep_sky OWNER deep_sky;\nCREATE DATABASE deep_sky_test OWNER deep_sky;\n",
        text=True, env=admin_env)
    env_file.write_text(f'''DB_URL=jdbc:postgresql://127.0.0.1:5432/deep_sky
DB_USER=deep_sky
DB_PASSWORD={app_password}
API_HOST=127.0.0.1
API_PORT=8080
APP_ORIGINS=http://127.0.0.1:5173,http://localhost:5173
COOKIE_SECURE=false
TEST_DB_URL=jdbc:postgresql://127.0.0.1:5432/deep_sky_test
''')
    env_file.chmod(0o600)
print('Local PostgreSQL is ready. Credentials are in .env.local (not printed).')
