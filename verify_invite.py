import urllib.request, ssl, json, time, uuid
ctx = ssl.create_default_context(); ctx.check_hostname=False; ctx.verify_mode=ssl.CERT_NONE
BASE = 'https://724club.dpdns.org'

def post(path, body, token=None):
    hdr = {'User-Agent': 'Mozilla/5.0 Chrome/120.0.0.0', 'Content-Type': 'application/json', 'Accept': 'application/json', 'Referer': BASE + '/'}
    if token: hdr['Authorization'] = 'Bearer ' + token
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

# 用普通邮箱注册测试
test_email = f'tester{int(time.time())%10000}@protonmail.com'
test_pwd = 'Test1234!'
username = f'user{int(time.time())%100000}'

code, body = post('/api/register', {'email': test_email, 'password': test_pwd, 'username': username})
print(f'[register] HTTP {code} | {body[:250]}')
if code not in (200, 201):
    raise SystemExit('register failed')

code, body = post('/api/login', {'email': test_email, 'password': test_pwd})
print(f'[login] HTTP {code} | {body[:200]}')
if code != 200:
    raise SystemExit('login failed')

token = json.loads(body).get('token')

# 验证码查询接口测试 - 先看 redeem 一个有效码
code, body = post('/api/creator/redeem', {'code': 'NITE7248'}, token=token)
print(f'[redeem NITE7248] HTTP {code} | {body[:200]}')
if code == 200:
    print('  >> 邀请码 NITE7248 兑换成功！测试账户已升级为 creator')
    # 验证 status
    req = urllib.request.Request(BASE + '/api/creator/status', headers={'User-Agent': 'Mozilla/5.0', 'Authorization': 'Bearer ' + token, 'Accept': 'application/json', 'Referer': BASE + '/'})
    r = urllib.request.urlopen(req, timeout=15, context=ctx)
    print(f'[status] HTTP {r.status} | {r.read().decode()[:250]}')

# 用过的码不能再兑
code, body = post('/api/creator/redeem', {'code': 'NITE7248'}, token=token)
print(f'[redeem NITE7248 again] HTTP {code} | {body[:200]}')

# 不存在的码
code, body = post('/api/creator/redeem', {'code': 'FAKE1234'}, token=token)
print(f'[redeem FAKE1234] HTTP {code} | {body[:200]}')

print('\n=== 剩余可用邀请码 ===')
for c in ['MOON7248', 'PLAY7248']:
    print(f'  {c}')
