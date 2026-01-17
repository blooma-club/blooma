import json
import os
import urllib.request
from pathlib import Path


ENV_PATH = Path('.env')


def load_env(path: Path) -> None:
    if not path.exists():
        return
    for line in path.read_text(encoding='utf-8').splitlines():
        line = line.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue
        key, value = line.split('=', 1)
        if key not in os.environ:
            os.environ[key] = value


def request_json(url: str, method: str = 'GET', headers: dict | None = None, payload: dict | None = None):
    data = None
    if payload is not None:
        data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, data=data, method=method)
    for key, value in (headers or {}).items():
        req.add_header(key, value)
    with urllib.request.urlopen(req) as resp:
        body = resp.read()
    return json.loads(body) if body else {}


def fetch_auth_users(auth_admin_url: str, headers: dict[str, str]) -> list[dict]:
    users: list[dict] = []
    page = 1
    per_page = 200

    while True:
        url = f"{auth_admin_url}?page={page}&per_page={per_page}"
        data = request_json(url, headers=headers)
        batch = data.get('users', []) if isinstance(data, dict) else []
        users.extend(batch)
        if len(batch) < per_page:
            break
        page += 1

    return users


def main() -> int:
    load_env(ENV_PATH)

    supabase_url = os.environ.get('SUPABASE_URL') or os.environ.get('NEXT_PUBLIC_SUPABASE_URL')
    service_role_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')

    if not supabase_url or not service_role_key:
        print('Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
        return 1

    base_url = supabase_url.rstrip('/')
    rest_url = f"{base_url}/rest/v1/users"
    auth_admin_url = f"{base_url}/auth/v1/admin/users"

    headers = {
        'apikey': service_role_key,
        'Authorization': f'Bearer {service_role_key}',
        'Content-Type': 'application/json',
    }

    users = request_json(f"{rest_url}?select=id,email,name,image_url,avatar_url,legacy_user_id", headers=headers)
    auth_users = fetch_auth_users(auth_admin_url, headers)
    auth_by_email: dict[str, dict] = {}

    for auth_user in auth_users:
        email = auth_user.get('email')
        if not email:
            continue
        auth_by_email[email.lower()] = auth_user

    mapping: list[dict[str, str]] = []

    for user in users:
        email = user.get('email')
        if not email:
            continue

        auth_user = auth_by_email.get(email.lower())

        if not auth_user:
            metadata = {}
            name = user.get('name')
            avatar_url = user.get('image_url') or user.get('avatar_url')
            if name:
                metadata['full_name'] = name
            if avatar_url:
                metadata['avatar_url'] = avatar_url

            payload = {
                'email': email,
                'email_confirm': True,
                'user_metadata': metadata,
            }

            auth_user = request_json(auth_admin_url, method='POST', headers=headers, payload=payload)
            if isinstance(auth_user, dict) and auth_user.get('id'):
                auth_by_email[email.lower()] = auth_user

        auth_id = auth_user.get('id')
        legacy_id = user.get('legacy_user_id') or user.get('id')

        if not auth_id or not legacy_id:
            continue

        mapping.append({
            'legacy_id': legacy_id,
            'auth_id': auth_id,
        })

    print(json.dumps(mapping, indent=2))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
