import urllib.request, ssl, json, time, uuid
ctx = ssl.create_default_context(); ctx.check_hostname=False; ctx.verify_mode=ssl.CERT_NONE

BASE = 'https://724club.dpdns.org'

def post(path, body, token=None):
    hdr = {'User-Agent': 'Mozilla/5.0 Chrome/120.0.0.0', 'Content-Type': 'application/json', 'Accept': 'application/json', 'Referer': BASE + '/'}
    if token:
        hdr['Authorization'] = 'Bearer ' + token
    # 安全头
    hdr['X-Timestamp'] = str(int(time.time()))
    hdr['X-Nonce'] = str(uuid.uuid4())
    req = urllib.request.Request(BASE + path, data=json.dumps(body).encode(), headers=hdr, method='POST')
    try:
        r = urllib.request.urlopen(req, timeout=15, context=ctx)
        return r.status, r.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()
    except Exception as e:
        return 0, str(e)

# 1. 登录 admin
code, body = post('/api/login', {'email': 'admin@adysec.com', 'password': 'Admin@123'})
print(f'[login] HTTP {code} | {body[:300]}')
if code != 200:
    raise SystemExit('login failed')

token = json.loads(body).get('token')
if not token:
    raise SystemExit('no token in response')

# 2. 生成 3 个邀请码
codes = []
for i in range(3):
    code, body = post('/api/creator/invitations', {'note': f'initial-{i+1}'}, token=token)
    print(f'[gen {i+1}] HTTP {code} | {body[:200]}')
    if code == 200:
        c = json.loads(body).get('code')
        if c: codes.append(c)

# 3. 列出当前所有邀请码
req = urllib.request.Request(BASE + '/api/creator/invitations', headers={'User-Agent': 'Mozilla/5.0', 'Authorization': 'Bearer ' + token, 'Accept': 'application/json', 'Referer': BASE + '/'})
try:
    r = urllib.request.urlopen(req, timeout=15, context=ctx)
    data = json.loads(r.read().decode())
    print(f'\n[list] HTTP {r.status} | total {len(data.get("invitations", []))}')
    for inv in data.get('invitations', []):
        status = 'USED' if inv.get('used_by') else 'AVAILABLE'
        print(f'  {inv.get("code")} | {status} | note={inv.get("note")} | created={inv.get("created_at")}')
except urllib.error.HTTPError as e:
    print(f'[list] HTTP {e.code} | {e.read().decode()}')

print('\n=== 新生成的可用邀请码 ===')
for c in codes:
    print(f'  {c}')
