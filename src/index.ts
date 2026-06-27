
import { sendEmail } from './smtp';
import { generateIdenticon } from './identicon';
import { uploadImage, deleteImage, listAllKeys, getPublicUrl, getKeyFromUrl, S3Env } from './s3';
import * as OTPAuth from 'otpauth';
import { Security, UserPayload } from './security';
import { BDSM_DISCLAIMER, BDSM_TYPES, BDSM_QUESTIONS } from './bdsm-data';

interface DBUser {
    id: number;
    email: string;
    username: string;
    password: string;
    verified: number;
    role?: string;
    avatar_url?: string;
    totp_secret?: string;
    totp_enabled?: number;
    email_notifications?: number;
    reset_token?: string;
    reset_token_expires?: number;
    pending_email?: string;
    verification_token?: string;
    email_change_token?: string;
    gender?: string | null;
}

interface PostAuthorInfo {
    title: string;
    author_id: number;
    email: string;
    email_notifications: number;
    username: string;
}

interface DBUserEmail { email: string; }
interface DBUserTotp { totp_secret: string; }
interface DBCount { count: number; }
interface DBSetting { value: string; }

// Utility to extract image URLs from Markdown content
function extractImageUrls(content: string): string[] {
	if (!content) return [];
	const urls: string[] = [];
	const regex = /!\[.*?\]\((.*?)\)/g;
	let match;
	while ((match = regex.exec(content)) !== null) {
		urls.push(match[1]);
	}
	return urls;
}

// Utility to hash password
async function hashPassword(password: string): Promise<string> {
	const myText = new TextEncoder().encode(password);
	const myDigest = await crypto.subtle.digest(
		{
			name: 'SHA-256',
		},
		myText
	);
	const hashArray = Array.from(new Uint8Array(myDigest));
	const hashHex = hashArray
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
	return hashHex;
}

function generateToken(): string {
	return crypto.randomUUID();
}

function hasControlCharacters(str: string): boolean {
	return /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(str);
}

function isVisuallyEmpty(str: string): boolean {
	if (!str) return true;
	const stripped = str.replace(/[\s\u200B-\u200F\uFEFF\u2028\u2029\u180E\u3164\u115F\u1160\x00-\x1F\x7F]+/g, '');
	return stripped.length === 0;
}

function hasInvisibleCharacters(str: string): boolean {
	return /[\u200B-\u200F\uFEFF\u2028\u2029\u180E\u3164\u115F\u1160]/.test(str);
}

function hasRestrictedKeywords(username: string): boolean {
	const restricted = ['管理', 'admin', 'sudo', 'test'];
	return restricted.some(keyword => username.toLowerCase().includes(keyword.toLowerCase()));
}

async function verifyTurnstile(token: string, ip: string, secretKey: string): Promise<boolean> {
	const formData = new FormData();
	formData.append('secret', secretKey);
	formData.append('response', token);
	formData.append('remoteip', ip);

	const url = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
	const result = await fetch(url, {
		body: formData,
		method: 'POST',
	});

	const outcome = await result.json() as any;
	return outcome.success;
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);
		const method = request.method;

		// Helper function to get base URL
		const getBaseUrl = () => {
			// Priority: 1. Env var 2. X-Original-URL header (from Pages Functions) 3. Request origin
			if (env.BASE_URL) {
				console.log(`✅ Using BASE_URL from env: ${env.BASE_URL}`);
				return env.BASE_URL;
			}
			
			const xOriginalUrl = request.headers.get('X-Original-URL');
			if (xOriginalUrl) {
				console.log(`✅ Using X-Original-URL from Pages Functions: ${xOriginalUrl}`);
				return xOriginalUrl;
			}
			
			console.warn(`⚠️ BASE_URL not configured and no X-Original-URL header, falling back to request origin: ${url.origin}`);
			return url.origin;
		};

		// CORS headers helper
		const corsHeaders = {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS, DELETE, PUT',
			'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Timestamp, X-Nonce',
		};

		// Handle OPTIONS (CORS preflight)
		if (method === 'OPTIONS') {
			return new Response(null, {
				headers: corsHeaders,
			});
		}

		// Helper to return JSON response with CORS
		const jsonResponse = (data: any, status = 200) => {
			return Response.json(data, {
				status,
				headers: corsHeaders,
			});
		};

		// Serve R2/B2 objects through Worker (R2 binding or S3-compatible fallback)
		if (url.pathname.startsWith('/r2/') && (method === 'GET' || method === 'HEAD')) {
			const key = decodeURIComponent(url.pathname.slice('/r2/'.length));
			if (!key) return new Response('Not Found', { status: 404 });

			// 1. Try R2 binding first
			const bucket = (env as any).BUCKET as R2Bucket | undefined;
			if (bucket) {
				const object = await bucket.get(key);
				if (!object) return new Response('Not Found', { status: 404 });
				const headers = new Headers();
				object.writeHttpMetadata(headers);
				if (object.httpEtag) headers.set('etag', object.httpEtag);
				headers.set('Cache-Control', 'public, max-age=2592000');
				return new Response(method === 'HEAD' ? null : object.body, { headers });
			}

			// 2. Fall back to S3-compatible storage (e.g. B2 Private bucket)
			const s3Env = env as any;
			if (s3Env.AWS_ENDPOINT && s3Env.AWS_BUCKET && s3Env.AWS_ACCESS_KEY_ID && s3Env.AWS_SECRET_ACCESS_KEY) {
				const { AwsClient } = await import('aws4fetch');
				const s3 = new AwsClient({
					accessKeyId: s3Env.AWS_ACCESS_KEY_ID,
					secretAccessKey: s3Env.AWS_SECRET_ACCESS_KEY,
					region: s3Env.AWS_REGION,
					service: 's3',
				});
				const endpoint = s3Env.AWS_ENDPOINT.replace(/\/+$/, '');
				const objectUrl = `${endpoint}/${s3Env.AWS_BUCKET}/${key}`;
				const upstream = await s3.fetch(objectUrl, { method });
				if (!upstream.ok) {
					return new Response(`Object fetch failed: ${upstream.status}`, { status: upstream.status });
				}
				const headers = new Headers(upstream.headers);
				headers.set('Cache-Control', 'public, max-age=2592000');
				headers.set('Access-Control-Allow-Origin', corsHeaders['Access-Control-Allow-Origin'] || '*');
				return new Response(method === 'HEAD' ? null : upstream.body, {
					status: upstream.status,
					headers,
				});
			}

			return new Response('Storage not configured', { status: 404 });
		}

		// Ensure the database schema exists before anything else.
		const ensureSchema = async () => {
			try {
				await env.cforum_db.prepare('SELECT 1 FROM posts LIMIT 1').first();
				return;
			} catch (err: any) {
				console.warn('Database schema missing, initializing', err);
			}

			// using prepare().run() instead of exec ensures each statement is committed
			const stmts = [
				`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  verified INTEGER DEFAULT 0,
  verification_token TEXT,
  totp_secret TEXT,
  totp_enabled INTEGER DEFAULT 0,
  reset_token TEXT,
  reset_token_expires INTEGER,
  pending_email TEXT,
  email_change_token TEXT,
  avatar_url TEXT,
  nickname TEXT,
  email_notifications INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`,
				`CREATE TABLE IF NOT EXISTS creator_invitations (
  code TEXT PRIMARY KEY,
  created_by INTEGER NOT NULL,
  used_by INTEGER,
  note TEXT,
  expires_at INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (used_by) REFERENCES users(id)
);`,
				`CREATE TABLE IF NOT EXISTS bdsm_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  scores TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);`,
				`CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  slug TEXT,
  description TEXT,
  icon TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`,
				`CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  author_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category_id INTEGER,
  is_pinned INTEGER DEFAULT 0,
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (author_id) REFERENCES users(id),
  FOREIGN KEY (category_id) REFERENCES categories(id)
);`,
				`CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  parent_id INTEGER,
  author_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id),
  FOREIGN KEY (parent_id) REFERENCES comments(id),
  FOREIGN KEY (author_id) REFERENCES users(id)
);`,
				`CREATE TABLE IF NOT EXISTS likes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(post_id, user_id),
  FOREIGN KEY (post_id) REFERENCES posts(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);`,
				`CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);`,
				`CREATE TABLE IF NOT EXISTS nonces (
  nonce TEXT PRIMARY KEY,
  expires_at INTEGER NOT NULL
);`,
				`CREATE TABLE IF NOT EXISTS sessions (
  jti TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);`,
				`CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  details TEXT,
  ip_address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`,
				`CREATE TABLE IF NOT EXISTS soul_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  scores TEXT NOT NULL,
  tone TEXT,
  contrast_level INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);`,
				`CREATE TABLE IF NOT EXISTS enneagram_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type_code INTEGER NOT NULL,
  type_name TEXT NOT NULL,
  wing_code INTEGER,
  wing_name TEXT,
  scores TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);`,
				`INSERT OR IGNORE INTO settings (key, value) VALUES ('turnstile_enabled', '0');`,
				// 雅痞化板块命名 + 描述
				`INSERT OR IGNORE INTO categories (name, slug, description, icon) VALUES ('夜笺', 'notes', '枕边的字，写给自己，也写给不想睡的人', 'moon');`,
				`INSERT OR IGNORE INTO categories (name, slug, description, icon) VALUES ('私语', 'treehole', '说给不会说出去的人听，他若听见，便算你赢', 'lock');`,
				`INSERT OR IGNORE INTO categories (name, slug, description, icon) VALUES ('晚妆', 'gaze', '妆化好了，灯也调低了，只差一个不在场的人', 'eye');`,
				`INSERT OR IGNORE INTO categories (name, slug, description, icon) VALUES ('心相', 'soul', '灵魂的另一面，留在这里，等一个认得的人', 'sparkles');`,
				`INSERT OR IGNORE INTO categories (name, slug, description, icon) VALUES ('夜会', 'salon', '留个暗号，等一个人对上来', 'flame');`,
				// 已存在的板块做更新（重命名 + 描述升级）
				`UPDATE categories SET name='夜笺', description='枕边的字，写给自己，也写给不想睡的人', icon='moon' WHERE slug='notes';`,
				`UPDATE categories SET name='私语', description='说给不会说出去的人听，他若听见，便算你赢', icon='lock' WHERE slug='treehole';`,
				`UPDATE categories SET name='晚妆', description='妆化好了，灯也调低了，只差一个不在场的人', icon='eye' WHERE slug='gaze';`,
				`UPDATE categories SET name='心相', description='灵魂的另一面，留在这里，等一个认得的人', icon='sparkles' WHERE slug='soul';`,
				`UPDATE categories SET name='夜会', description='留个暗号，等一个人对上来', icon='flame' WHERE slug='salon';`,
				// users 表加 gender 字段（向后兼容）
				`ALTER TABLE users ADD COLUMN gender TEXT;`,
				// soul_results 表加 tone / contrast_level 字段（向后兼容，重复执行会报错但被 catch）
				`ALTER TABLE soul_results ADD COLUMN tone TEXT;`,
				`ALTER TABLE soul_results ADD COLUMN contrast_level INTEGER;`,
				`INSERT OR IGNORE INTO users (email, username, password, role, verified, nickname) VALUES 
('admin@adysec.com', 'Admin', 'e86f78a8a3caf0b60d8e74e5942aa6d86dc150cd3c03338aef25b7d2d7e3acc7', 'admin', 1, 'System Admin');`
			];
			for (const stmt of stmts) {
				try {
					await env.cforum_db.prepare(stmt).run();
				} catch (e) {
					console.error('Error running schema statement', e, stmt);
				}
			}
			// verify posts table exists now
			try {
				await env.cforum_db.prepare('SELECT 1 FROM posts LIMIT 1').first();
			} catch (e) {
				console.error('Failed to verify posts table after init', e);
			}
		};

		// perform initialization before security setup
		await ensureSchema();

		let security: Security;
		try {
			security = new Security(env);
		} catch (e) {
			console.error('Security initialization failed:', e);
			return Response.json(
				{ error: 'Server misconfigured' },
				{ status: 500, headers: corsHeaders }
			);
		}

		// authentication helper - throws on failure
		const authenticate = async (req: Request) => {
			const authHeader = req.headers.get('Authorization');
			if (!authHeader || !authHeader.startsWith('Bearer ')) {
				throw new Error('Unauthorized');
			}
			const token = authHeader.split(' ')[1];
			const payload = await security.verifyToken(token);
			if (!payload) {
				throw new Error('Unauthorized');
			}
			return payload;
		};

		// Helper to handle errors
		const handleError = (e: any) => {
			const errString = String(e);
			if (errString.includes('Unauthorized') || errString.includes('Invalid Token')) {
				return jsonResponse({ error: 'Unauthorized' }, 401);
			}
			return jsonResponse({ error: errString }, 500);
		};


        const publicPaths = [
            '/api/config', '/api/login', '/api/register', '/api/verify', 
            '/api/auth/forgot-password', '/api/auth/reset-password', '/api/verify-email-change',
             // Static/Public GETs
            '/api/posts', '/api/categories', '/api/users' 
        ];
        
        // Relax check for public GETs that don't need nonce
        const isPublicGet = method === 'GET' && (
            publicPaths.includes(url.pathname) || 
            url.pathname.match(/^\/api\/posts\/\d+$/) || 
            url.pathname.match(/^\/api\/posts\/\d+\/comments$/)
        );

        // However, user specifically asked for "Replay protection for sensitive operations".
        // We will apply strict checks for mutation methods (POST, PUT, DELETE)
        if (['POST', 'PUT', 'DELETE'].includes(method)) {
             const validation = await security.validateRequest(request);
             if (!validation.valid) {
                 return jsonResponse({ error: validation.error || 'Security check failed' }, 400);
             }
        }

		// GET /api/config
		if (url.pathname === '/api/config' && method === 'GET') {
			try {
				const [setting, userCount] = await Promise.all([
					env.cforum_db.prepare("SELECT value FROM settings WHERE key = 'turnstile_enabled'").first<DBSetting>(),
					env.cforum_db.prepare('SELECT COUNT(*) as count FROM users').first('count')
				]);
				
				// 只有数据库设置为启用，且两个环境变量都配置时，才启用 Turnstile
				const dbEnabled = setting ? setting.value === '1' : false;
				const siteKey = (env as any).TURNSTILE_SITE_KEY || '';
				const secretKey = (env as any).TURNSTILE_SECRET_KEY || '';
				const turnstileFullyConfigured = !!(dbEnabled && siteKey && secretKey);
				
				return jsonResponse({
					turnstile_enabled: turnstileFullyConfigured,
					turnstile_site_key: siteKey,
					user_count: userCount || 0,
					jwt_secret_configured: !!env.JWT_SECRET && String(env.JWT_SECRET).length >= 32
				});
			} catch (e) {
				return handleError(e);
			}
		}

		// GET /api/admin/settings
		if (url.pathname === '/api/admin/settings' && method === 'GET') {
			try {
				const userPayload = await authenticate(request);
				if (userPayload.role !== 'admin') return jsonResponse({ error: 'Unauthorized' }, 403);

				const settings = await env.cforum_db.prepare("SELECT key, value FROM settings").all();
				const config: any = {
					turnstile_enabled: false,
					notify_on_user_delete: false,
					notify_on_username_change: false,
					notify_on_avatar_change: false,
					notify_on_manual_verify: false
				};
				
				if (settings.results) {
					for (const row of settings.results) {
						config[row.key as string] = row.value === '1';
					}
				}
				
				return jsonResponse(config);
			} catch (e) {
				return handleError(e);
			}
		}

		// POST /api/admin/settings
		if (url.pathname === '/api/admin/settings' && method === 'POST') {
			try {
				const userPayload = await authenticate(request);
				if (userPayload.role !== 'admin') return jsonResponse({ error: 'Unauthorized' }, 403);

				const body = await request.json() as any;
				const { turnstile_enabled, notify_on_user_delete, notify_on_username_change, notify_on_avatar_change, notify_on_manual_verify } = body;
				
				const stmt = env.cforum_db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");
				const batch = [];

				if (turnstile_enabled !== undefined) batch.push(stmt.bind('turnstile_enabled', turnstile_enabled ? '1' : '0'));
				if (notify_on_user_delete !== undefined) batch.push(stmt.bind('notify_on_user_delete', notify_on_user_delete ? '1' : '0'));
				if (notify_on_username_change !== undefined) batch.push(stmt.bind('notify_on_username_change', notify_on_username_change ? '1' : '0'));
				if (notify_on_avatar_change !== undefined) batch.push(stmt.bind('notify_on_avatar_change', notify_on_avatar_change ? '1' : '0'));
				if (notify_on_manual_verify !== undefined) batch.push(stmt.bind('notify_on_manual_verify', notify_on_manual_verify ? '1' : '0'));
				
				if (batch.length > 0) await env.cforum_db.batch(batch);

				return jsonResponse({ success: true });
			} catch (e) {
				return handleError(e);
			}
		}
		
		// Helper to check Turnstile if enabled
		const checkTurnstile = async (reqBody: any, ip: string) => {
			const setting = await env.cforum_db.prepare("SELECT value FROM settings WHERE key = 'turnstile_enabled'").first<DBSetting>();
			// 只有数据库启用且两个环境变量都配置时才要求验证（与前端逻辑一致）
			const dbEnabled = setting && setting.value === '1';
			const siteKey = (env as any).TURNSTILE_SITE_KEY;
			const secretKey = (env as any).TURNSTILE_SECRET_KEY;
			const fullyConfigured = dbEnabled && siteKey && secretKey;
			
			if (fullyConfigured) {
				const token = reqBody['cf-turnstile-response'];
				if (!token) return false;
				return await verifyTurnstile(token, ip, secretKey);
			}
			return true;
		};

		// POST /api/upload (Image Upload)
		if (url.pathname === '/api/upload' && method === 'POST') {
			try {
				const user = await authenticate(request);
				
				const formData = await request.formData();
				const file = formData.get('file');
				const userId = user.id.toString(); // Use verified user ID
				const postId = formData.get('post_id') || 'general';
				const type = formData.get('type') || 'post';

				if (!file || !(file instanceof File)) {
					return jsonResponse({ error: 'No file uploaded' }, 400);
				}

				if (!file.type.startsWith('image/')) {
					return jsonResponse({ error: 'Only images are allowed' }, 400);
				}

// Check file size (2MB = 2 * 1024 * 1024 bytes)
			const MAX_SIZE = 2 * 1024 * 1024;
			if (file.size > MAX_SIZE) {
				return jsonResponse({ error: 'File size too large (Max 2MB)' }, 400);
				}

				const imageKey = await uploadImage(env as unknown as S3Env, file, userId, postId.toString(), type as 'post' | 'avatar');
			const publicBase = (env as any).BUCKET ? `${getBaseUrl()}/r2` : undefined;
			const imageUrl = getPublicUrl(env as unknown as S3Env, imageKey, publicBase);
				return jsonResponse({ success: true, url: imageUrl });
			} catch (e) {
				console.error('Upload error:', e);
				return handleError(e); // 401/403 will be caught here if auth fails
			}
		}

		// --- AUTH ROUTES ---

		// POST /api/login
		if (url.pathname === '/api/login' && method === 'POST') {
			try {
				const body = await request.json() as any;
				
				// Turnstile Check
				const ip = request.headers.get('CF-Connecting-IP') || '127.0.0.1';
				if (!(await checkTurnstile(body, ip))) {
					return jsonResponse({ error: 'Turnstile verification failed' }, 403);
				}

				const { email, password, totp_code } = body;
				if (!email || !password) {
					return jsonResponse({ error: 'Missing email or password' }, 400);
				}

				const user = await env.cforum_db
					.prepare('SELECT * FROM users WHERE email = ?')
					.bind(email)
					.first<DBUser>();
				if (!user) {
					return jsonResponse({ error: 'Username or Password Error' }, 401);
				}

				if (!user.verified) {
					return jsonResponse({ error: 'Please verify your email first' }, 403);
				}

				const passwordHash = await hashPassword(password);
				if (user.password !== passwordHash) {
					return jsonResponse({ error: 'Username or Password Error' }, 401);
				}

				// TOTP Check
				if (user.totp_enabled) {
					if (!totp_code) {
						return jsonResponse({ error: 'TOTP_REQUIRED' }, 403);
					}
					if (!user.totp_secret) {
						return jsonResponse({ error: 'TOTP not configured' }, 500);
					}

					const totp = new OTPAuth.TOTP({
						algorithm: 'SHA1',
						digits: 6,
						period: 30,
						secret: OTPAuth.Secret.fromBase32(String(user.totp_secret)),
					});

					const delta = totp.validate({ token: totp_code, window: 1 });
					if (delta === null) {
						return jsonResponse({ error: 'Invalid TOTP code' }, 401);
					}
				}

				const { token, jti, expiresAt } = await security.generateToken({
					id: user.id,
					role: user.role || 'user',
					email: user.email
				});

				await env.cforum_db.prepare('INSERT INTO sessions (jti, user_id, expires_at) VALUES (?, ?, ?)').bind(jti, user.id, expiresAt).run();
				await security.logAudit(user.id, 'LOGIN', 'user', String(user.id), { email }, request);

				return jsonResponse({
					token,
					user: {
						id: user.id,
						email: user.email,
						username: user.username,
						avatar_url: user.avatar_url,
						role: user.role || 'user',
						totp_enabled: !!user.totp_enabled,
					email_notifications: user.email_notifications === 1,
					gender: user.gender || null
				}
			});
		} catch (e) {
			return handleError(e);
		}
	}

		// POST /api/user/profile
		if (url.pathname === '/api/user/profile' && method === 'POST') {
			try {
				const userPayload = await authenticate(request);
				const body = await request.json() as any;
				const { username, avatar_url, email_notifications, gender } = body;
				
				const user_id = userPayload.id;

				// Validate gender if provided
				let newGender: string | null | undefined = undefined;
				if (gender !== undefined) {
					if (gender === '' || gender === null) {
						newGender = null;
					} else if (gender === 'female' || gender === 'male') {
						newGender = gender;
					} else {
						return jsonResponse({ error: 'Invalid gender value' }, 400);
					}
				}

				if (username) {
					if (username.length > 20) return jsonResponse({ error: 'Username too long (Max 20 chars)' }, 400);
					if (isVisuallyEmpty(username)) return jsonResponse({ error: 'Username cannot be empty' }, 400);
					if (hasInvisibleCharacters(username)) return jsonResponse({ error: 'Username contains invalid invisible characters' }, 400);
					if (hasControlCharacters(username)) return jsonResponse({ error: 'Username contains invalid control characters' }, 400);
					if (hasRestrictedKeywords(username)) return jsonResponse({ error: 'Username contains restricted keywords' }, 400);
					
					// Check Uniqueness
					const existingUser = await env.cforum_db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').bind(username, user_id).first<{id:number}>();
					if (existingUser) {
						return jsonResponse({ error: 'Username already taken' }, 409);
					}
				}

				// Fetch current user
				const currentUser = await env.cforum_db.prepare('SELECT * FROM users WHERE id = ?').bind(user_id).first<DBUser>();
			if (!currentUser) return jsonResponse({ error: 'User not found' }, 404);
				if (!currentUser) return jsonResponse({ error: 'User not found' }, 404);

				let newUsername = currentUser.username;
				if (username !== undefined) {
					newUsername = username;
				}

				let newAvatarUrl = currentUser.avatar_url;
				if (avatar_url !== undefined) {
					if (avatar_url === '' || avatar_url === null) {
						// Generate Identicon
						newAvatarUrl = await generateIdenticon(String(user_id));
					} else {
						if (avatar_url.length > 500) return jsonResponse({ error: 'Avatar URL too long (Max 500 chars)' }, 400);
						if (!/^https?:\/\//i.test(avatar_url) && !avatar_url.startsWith('data:image/svg+xml')) return jsonResponse({ error: 'Invalid Avatar URL (Must start with http:// or https://)' }, 400);
						newAvatarUrl = avatar_url;
					}
				}

				let newEmailNotif = currentUser.email_notifications;
				if (email_notifications !== undefined) {
					newEmailNotif = email_notifications ? 1 : 0;
				}

				if (newGender !== undefined) {
					await env.cforum_db.prepare('UPDATE users SET username = ?, avatar_url = ?, email_notifications = ?, gender = ? WHERE id = ?')
						.bind(newUsername, newAvatarUrl, newEmailNotif, newGender, user_id).run();
				} else {
					await env.cforum_db.prepare('UPDATE users SET username = ?, avatar_url = ?, email_notifications = ? WHERE id = ?')
						.bind(newUsername, newAvatarUrl, newEmailNotif, user_id).run();
				}

			const user = await env.cforum_db.prepare('SELECT * FROM users WHERE id = ?').bind(user_id).first<DBUser>();
			if (!user) return jsonResponse({ error: 'User not found' }, 404);
				return jsonResponse({
					success: true,
					user: {
						id: user.id,
						email: user.email,
						username: user.username,
						avatar_url: user.avatar_url,
						role: user.role || 'user',
						totp_enabled: !!user.totp_enabled,
						email_notifications: user.email_notifications === 1,
						gender: user.gender || null
					}
				});
			} catch (e) {
				return handleError(e);
			}
		}

		// POST /api/user/delete
		if (url.pathname === '/api/user/delete' && method === 'POST') {
			try {
				const userPayload = await authenticate(request);
				const body = await request.json() as any;
				const { password, totp_code } = body;
				
				if (!password) return jsonResponse({ error: 'Missing credentials' }, 400);

				const user_id = userPayload.id;

				const user = await env.cforum_db.prepare('SELECT * FROM users WHERE id = ?').bind(user_id).first<DBUser>();
				if (!user) return jsonResponse({ error: 'User not found' }, 404);

				// Verify Password (Double check for sensitive delete op)
				const passwordHash = await hashPassword(password);
				if (user.password !== passwordHash) {
					return jsonResponse({ error: 'Invalid password' }, 401);
				}

				// Verify TOTP if enabled
				if (user.totp_enabled) {
					if (!totp_code) return jsonResponse({ error: 'TOTP_REQUIRED' }, 403);
					if (!user.totp_secret) return jsonResponse({ error: 'TOTP not configured' }, 500);
					const totp = new OTPAuth.TOTP({
						algorithm: 'SHA1',
						digits: 6,
						period: 30,
						secret: OTPAuth.Secret.fromBase32(String(user.totp_secret))
					});
					if (totp.validate({ token: totp_code, window: 1 }) === null) {
						return jsonResponse({ error: 'Invalid TOTP code' }, 401);
					}
				}

				// Delete User and Data
				
				// 1. Delete images (Avatar + Post images)
				const posts: any = await env.cforum_db.prepare('SELECT content FROM posts WHERE author_id = ?').bind(user_id).all();
				const deletionPromises: Promise<any>[] = [];
				
				if (user.avatar_url) {
					deletionPromises.push(deleteImage(env as unknown as S3Env, user.avatar_url, user_id));
				}
				
				if (posts.results) {
					for (const post of posts.results) {
						const imageUrls = extractImageUrls(post.content as string);
						imageUrls.forEach(url => deletionPromises.push(deleteImage(env as unknown as S3Env, url, user_id)));
					}
				}
				
				if (deletionPromises.length > 0) {
					 ctx.waitUntil(Promise.all(deletionPromises).catch(err => console.error('Failed to delete user images', err)));
				}

				// 2. Delete likes/comments ON user's posts (Cascade manually)
				await env.cforum_db.prepare('DELETE FROM likes WHERE post_id IN (SELECT id FROM posts WHERE author_id = ?)').bind(user_id).run();
				await env.cforum_db.prepare('DELETE FROM comments WHERE post_id IN (SELECT id FROM posts WHERE author_id = ?)').bind(user_id).run();

				// 3. Delete user's activity
				await env.cforum_db.prepare('DELETE FROM likes WHERE user_id = ?').bind(user_id).run();
				await env.cforum_db.prepare('DELETE FROM comments WHERE author_id = ?').bind(user_id).run();
				
				// 4. Delete posts and user
				await env.cforum_db.prepare('DELETE FROM posts WHERE author_id = ?').bind(user_id).run();
				await env.cforum_db.prepare('DELETE FROM users WHERE id = ?').bind(user_id).run();
				
				await security.logAudit(userPayload.id, 'DELETE_ACCOUNT', 'user', String(user_id), {}, request);

				return jsonResponse({ success: true });
			} catch (e) {
				return handleError(e);
			}
		}

		// POST /api/user/totp/setup
		if (url.pathname === '/api/user/totp/setup' && method === 'POST') {
			try {
				const userPayload = await authenticate(request);
				const user_id = userPayload.id; // Force use of authenticated ID
				
				const secret = new OTPAuth.Secret({ size: 20 });
				const secretBase32 = secret.base32;

				await env.cforum_db.prepare('UPDATE users SET totp_secret = ?, totp_enabled = 0 WHERE id = ?').bind(secretBase32, user_id).run();

				const user = await env.cforum_db.prepare('SELECT email FROM users WHERE id = ?').bind(user_id).first<DBUserEmail>();
			if (!user) return jsonResponse({ error: 'User not found' }, 404);
				
				await security.logAudit(userPayload.id, 'SETUP_TOTP', 'user', String(user_id), {}, request);

				const totp = new OTPAuth.TOTP({
					issuer: 'CloudflareForum',
					label: user.email,
					algorithm: 'SHA1',
					digits: 6,
					period: 30,
					secret: secret
				});

				return jsonResponse({ 
					secret: secretBase32,
					uri: totp.toString() 
				});
			} catch (e) {
				return handleError(e);
			}
		}

		// POST /api/user/totp/verify
		if (url.pathname === '/api/user/totp/verify' && method === 'POST') {
			try {
				const userPayload = await authenticate(request);
				const body = await request.json() as any;
				const { token } = body;
				const user_id = userPayload.id; // Force use of authenticated ID

				if (!token) return jsonResponse({ error: 'Missing parameters' }, 400);

				const user = await env.cforum_db.prepare('SELECT totp_secret FROM users WHERE id = ?').bind(user_id).first<DBUserTotp>();
				
				if (!user || !user.totp_secret) return jsonResponse({ error: 'TOTP not setup' }, 400);

				const totp = new OTPAuth.TOTP({
					algorithm: 'SHA1',
					digits: 6,
					period: 30,
					secret: OTPAuth.Secret.fromBase32(user.totp_secret)
				});

				const delta = totp.validate({ token: token, window: 1 });

				if (delta !== null) {
					await env.cforum_db.prepare('UPDATE users SET totp_enabled = 1 WHERE id = ?').bind(user_id).run();
					await security.logAudit(userPayload.id, 'ENABLE_TOTP', 'user', String(user_id), {}, request);
					return jsonResponse({ success: true });
				} else {
					return jsonResponse({ error: 'Invalid code' }, 400);
				}
			} catch (e) {
				return handleError(e);
			}
		}

		// POST /api/auth/forgot-password
		if (url.pathname === '/api/auth/forgot-password' && method === 'POST') {
			try {
				const body = await request.json() as any;

				// Turnstile Check
				const ip = request.headers.get('CF-Connecting-IP') || '127.0.0.1';
				if (!(await checkTurnstile(body, ip))) {
					return jsonResponse({ error: 'Turnstile verification failed' }, 403);
				}

				const { email } = body;
				if (!email) return jsonResponse({ error: 'Missing email' }, 400);

				const user = await env.cforum_db.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
				if (!user) return jsonResponse({ success: true }); // Silent fail

				const token = generateToken();
				const expires = Date.now() + 3600000; // 1 hour

				await env.cforum_db.prepare('UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?')
					.bind(token, expires, user.id).run();

				const baseUrl = getBaseUrl();
				const resetLink = `${baseUrl}/reset?token=${token}`;
				
				const emailHtml = `
					<h1>密码重置请求</h1>
					<p>请点击下方链接重置您的密码：</p>
					<a href="${resetLink}">重置密码</a>
					<p>如果您未请求此操作，请忽略此邮件。</p>
					<p>此链接将在 1 小时后失效。</p>
				`;

				ctx.waitUntil(sendEmail(email, '密码重置请求', emailHtml, env).catch(console.error));
				return jsonResponse({ success: true });
			} catch (e) {
				return handleError(e);
			}
		}

		// POST /auth/reset-password
		if (url.pathname === '/api/auth/reset-password' && method === 'POST') {
			try {
				const body = await request.json() as any;

				// Turnstile Check
				const ip = request.headers.get('CF-Connecting-IP') || '127.0.0.1';
				if (!(await checkTurnstile(body, ip))) {
					return jsonResponse({ error: 'Turnstile verification failed' }, 403);
				}

				const { token, new_password, totp_code } = body;
				if (!token || !new_password) return jsonResponse({ error: 'Missing parameters' }, 400);

				if (new_password.length < 8 || new_password.length > 16) return jsonResponse({ error: 'Password must be 8-16 characters' }, 400);

				// Verify token
				const user = await env.cforum_db.prepare('SELECT * FROM users WHERE reset_token = ?').bind(token).first<DBUser>();
				if (!user) return jsonResponse({ error: 'Invalid token' }, 400);
				if (!user.reset_token_expires || Date.now() > user.reset_token_expires) return jsonResponse({ error: 'Token expired' }, 400);

				// If user has 2FA, require it
				if (user.totp_enabled) {
					if (!totp_code) return jsonResponse({ error: 'TOTP_REQUIRED' }, 403);
					if (!user.totp_secret) return jsonResponse({ error: 'TOTP not configured' }, 500);
					const totp = new OTPAuth.TOTP({
						algorithm: 'SHA1',
						digits: 6,
						period: 30,
						secret: OTPAuth.Secret.fromBase32(String(user.totp_secret))
					});
					if (totp.validate({ token: totp_code, window: 1 }) === null) {
						return jsonResponse({ error: 'Invalid TOTP code' }, 401);
					}
				}

				const passwordHash = await hashPassword(new_password);
				await env.cforum_db.prepare('UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?')
					.bind(passwordHash, user.id).run();

				return jsonResponse({ success: true });
			} catch (e) {
				return handleError(e);
			}
		}

		// POST /api/user/change-email
		if (url.pathname === '/api/user/change-email' && method === 'POST') {
			try {
				const userPayload = await authenticate(request);
				const body = await request.json() as any;
				const { new_email, totp_code } = body; 
				
				if (!new_email) return jsonResponse({ error: 'Missing parameters' }, 400);
				
				if (new_email.length > 50) return jsonResponse({ error: 'Email too long (Max 50 chars)' }, 400);
				
				const user_id = userPayload.id;

const user = await env.cforum_db.prepare('SELECT * FROM users WHERE id = ?').bind(user_id).first<DBUser>();
				if (!user) return jsonResponse({ error: 'User not found' }, 404);

				// Verify 2FA if enabled
				if (user.totp_enabled) {
					if (!totp_code) return jsonResponse({ error: 'TOTP_REQUIRED' }, 403);
					if (!user.totp_secret) return jsonResponse({ error: 'TOTP not configured' }, 500);
					const totp = new OTPAuth.TOTP({
						algorithm: 'SHA1',
						digits: 6,
						period: 30,
						secret: OTPAuth.Secret.fromBase32(String(user.totp_secret))
					});
					if (totp.validate({ token: totp_code, window: 1 }) === null) {
						return jsonResponse({ error: 'Invalid TOTP code' }, 401);
					}
				}

				// Check if email already exists
				const exists = await env.cforum_db.prepare('SELECT id FROM users WHERE email = ?').bind(new_email).first();
				if (exists) return jsonResponse({ error: 'Email already in use' }, 400);

				const token = generateToken();
				await env.cforum_db.prepare('UPDATE users SET pending_email = ?, email_change_token = ? WHERE id = ?')
					.bind(new_email, token, user.id).run();
				
				await security.logAudit(userPayload.id, 'CHANGE_EMAIL_INIT', 'user', String(user_id), { new_email }, request);

				const baseUrl = getBaseUrl();
				const verifyLink = `${baseUrl}/api/verify-email-change?token=${token}`;
				const emailHtml = `
					<h1>确认更换邮箱</h1>
					<p>请点击下方链接确认将您的邮箱更换为 ${new_email}：</p>
					<a href="${verifyLink}">确认更换</a>
				`;

				ctx.waitUntil(sendEmail(new_email, '确认更换邮箱', emailHtml, env).catch(console.error));
				return jsonResponse({ success: true });
			} catch (e) {
				return handleError(e);
			}
		}

		// GET /api/verify-email-change
		if (url.pathname === '/api/verify-email-change' && method === 'GET') {
			const token = url.searchParams.get('token');
			if (!token) return new Response('Missing token', { status: 400 });

			try {
const user = await env.cforum_db.prepare('SELECT * FROM users WHERE email_change_token = ?').bind(token).first<DBUser>();
				if (!user) return new Response('Invalid token', { status: 400 });

				await env.cforum_db.prepare('UPDATE users SET email = ?, pending_email = NULL, email_change_token = NULL WHERE id = ?')
					.bind(user.pending_email, user.id).run();

				return Response.redirect(`${getBaseUrl()}/?email_changed=true`, 302);
			} catch (e) {
				return new Response('Failed', { status: 500 });
			}
		}

		// POST /api/admin/users/:id/update (Admin direct update)
		if (url.pathname.match(/^\/api\/admin\/users\/\d+\/update$/) && method === 'POST') {
			const id = url.pathname.split('/')[4];
			try {
				const userPayload = await authenticate(request);
				if (userPayload.role !== 'admin') return jsonResponse({ error: 'Unauthorized' }, 403);

				const body = await request.json() as any;
				const { password, email, username, avatar_url } = body;

				if (password && (password.length < 8 || password.length > 16)) return jsonResponse({ error: 'Password must be 8-16 characters' }, 400);

				if (password) {
					const hash = await hashPassword(password);
					await env.cforum_db.prepare('UPDATE users SET password = ? WHERE id = ?').bind(hash, id).run();
				}
				if (email) {
					if (email.length > 50) return jsonResponse({ error: 'Email too long (Max 50 chars)' }, 400);
					await env.cforum_db.prepare('UPDATE users SET email = ? WHERE id = ?').bind(email, id).run();
				}
				if (avatar_url !== undefined) {
					// Allow clearing avatar with empty string or null -> Force Regenerate Default
					if (!avatar_url) {
						// Reset to Default
						const identicon = await generateIdenticon(String(id));
						await env.cforum_db.prepare('UPDATE users SET avatar_url = ? WHERE id = ?').bind(identicon, id).run();
					} else {
						if (avatar_url.length > 500) return jsonResponse({ error: 'Avatar URL too long (Max 500 chars)' }, 400);
						if (!/^https?:\/\//i.test(avatar_url) && !avatar_url.startsWith('data:image/svg+xml')) return jsonResponse({ error: 'Invalid Avatar URL' }, 400);
						await env.cforum_db.prepare('UPDATE users SET avatar_url = ? WHERE id = ?').bind(avatar_url, id).run();
					}

					// Notify Avatar Change
					const notifyAvatar = await env.cforum_db.prepare("SELECT value FROM settings WHERE key = 'notify_on_avatar_change'").first<DBSetting>();
					if (notifyAvatar && notifyAvatar.value === '1') {
						const user = await env.cforum_db.prepare('SELECT email, username FROM users WHERE id = ?').bind(id).first<{email:string;username:string}>();
						if (user) {
							const emailHtml = `
								<h1>头像已更新</h1>
								<p>您的头像已被管理员更新。</p>
							`;
							ctx.waitUntil(sendEmail(user.email, '您的头像已更新', emailHtml, env).catch(console.error));
						}
					}
				}
				if (username) {
					if (username.length > 20) return jsonResponse({ error: 'Username too long (Max 20 chars)' }, 400);
					if (isVisuallyEmpty(username)) return jsonResponse({ error: 'Username cannot be empty' }, 400);
					if (hasInvisibleCharacters(username)) return jsonResponse({ error: 'Username contains invalid invisible characters' }, 400);
					if (hasControlCharacters(username)) return jsonResponse({ error: 'Username contains invalid control characters' }, 400);
					
					await env.cforum_db.prepare('UPDATE users SET username = ? WHERE id = ?').bind(username, id).run();

					// Notify user about username change
					const notifyUsername = await env.cforum_db.prepare("SELECT value FROM settings WHERE key = 'notify_on_username_change'").first<DBSetting>();
					if (notifyUsername && notifyUsername.value === '1') {
						const user = await env.cforum_db.prepare('SELECT email, username FROM users WHERE id = ?').bind(id).first<{email:string;username:string}>();
						if (user) {
							const emailHtml = `
								<h1>用户名已修改</h1>
								<p>您的用户名已被管理员修改为 <strong>${username}</strong>。</p>
								<p>如有疑问，请联系管理员。</p>
							`;
							ctx.waitUntil(sendEmail(user.email, '您的用户名已修改', emailHtml, env).catch(console.error));
						}
					}
				}
				
				await security.logAudit(userPayload.id, 'ADMIN_UPDATE_USER', 'user', id, { username, email, avatar_url, passwordChanged: !!password }, request);

				return jsonResponse({ success: true });
			} catch (e) {
				return handleError(e);
			}
		}

		// GET /api/categories
		if (url.pathname === '/api/categories' && method === 'GET') {
			try {
				const { results } = await env.cforum_db.prepare('SELECT id, name, slug, description, icon, created_at FROM categories ORDER BY id ASC').all();
				return jsonResponse(results);
			} catch (e) {
				return handleError(e);
			}
		}

		// GET /api/square/:slug - 获取板块信息
		if (url.pathname.startsWith('/api/square/') && method === 'GET') {
			try {
				const slug = url.pathname.slice('/api/square/'.length);
				const row = await env.cforum_db.prepare(
					'SELECT id, name, slug, description, icon FROM categories WHERE slug = ?'
				).bind(slug).first<any>();
				if (!row) return jsonResponse({ error: 'Square not found' }, 404);
				return jsonResponse(row);
			} catch (e) {
				return handleError(e);
			}
		}

		// POST /api/admin/categories
		if (url.pathname === '/api/admin/categories' && method === 'POST') {
			try {
				const userPayload = await authenticate(request);
				if (userPayload.role !== 'admin') return jsonResponse({ error: 'Unauthorized' }, 403);

				const body = await request.json() as any;
				const { name } = body;
				if (!name) return jsonResponse({ error: 'Missing name' }, 400);
				
				const { success } = await env.cforum_db.prepare('INSERT INTO categories (name) VALUES (?)').bind(name).run();
				await security.logAudit(userPayload.id, 'CREATE_CATEGORY', 'category', name, {}, request);
				return jsonResponse({ success });
			} catch (e) {
				return handleError(e);
			}
		}

		// PUT /api/admin/categories/:id
		if (url.pathname.match(/^\/api\/admin\/categories\/\d+$/) && method === 'PUT') {
			const id = url.pathname.split('/')[4];
			try {
				const userPayload = await authenticate(request);
				if (userPayload.role !== 'admin') return jsonResponse({ error: 'Unauthorized' }, 403);

				const body = await request.json() as any;
				const { name } = body;
				if (!name) return jsonResponse({ error: 'Missing name' }, 400);
				
				await env.cforum_db.prepare('UPDATE categories SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(name, id).run();
				await security.logAudit(userPayload.id, 'UPDATE_CATEGORY', 'category', id, { name }, request);
				return jsonResponse({ success: true });
			} catch (e) {
				return handleError(e);
			}
		}

		// DELETE /api/admin/categories/:id
		if (url.pathname.match(/^\/api\/admin\/categories\/\d+$/) && method === 'DELETE') {
			const id = url.pathname.split('/')[4];
			try {
				const userPayload = await authenticate(request);
				if (userPayload.role !== 'admin') return jsonResponse({ error: 'Unauthorized' }, 403);

				// Check if there are posts in this category
				const count = await env.cforum_db.prepare('SELECT COUNT(*) as count FROM posts WHERE category_id = ?').bind(id).first<number>('count');
				if ((count ?? 0) > 0) {
					return jsonResponse({ error: 'Cannot delete category with existing posts' }, 400);
				}
				
				await env.cforum_db.prepare('DELETE FROM categories WHERE id = ?').bind(id).run();
				await security.logAudit(userPayload.id, 'DELETE_CATEGORY', 'category', id, {}, request);
				return jsonResponse({ success: true });
			} catch (e) {
				return handleError(e);
			}
		}

		// --- ADMIN ROUTES ---

		// GET /api/admin/stats
		if (url.pathname === '/api/admin/stats' && method === 'GET') {
			try {
				const userPayload = await authenticate(request);
				if (userPayload.role !== 'admin') return jsonResponse({ error: 'Unauthorized' }, 403);

				const [userCount, postCount, commentCount] = await Promise.all([
					env.cforum_db.prepare('SELECT COUNT(*) as count FROM users').first<number>('count'),
					env.cforum_db.prepare('SELECT COUNT(*) as count FROM posts').first<number>('count'),
					env.cforum_db.prepare('SELECT COUNT(*) as count FROM comments').first<number>('count')
				]);
				
				return jsonResponse({
					users: userCount,
					posts: postCount,
					comments: commentCount
				});
			} catch (e) {
				return handleError(e);
			}
		}

		// GET /api/admin/users
		if (url.pathname === '/api/admin/users' && method === 'GET') {
			try {
				const userPayload = await authenticate(request);
				if (userPayload.role !== 'admin') return jsonResponse({ error: 'Unauthorized' }, 403);

				const { results } = await env.cforum_db.prepare('SELECT id, email, username, role, verified, created_at, avatar_url FROM users ORDER BY created_at DESC').all();
				return jsonResponse(results);
			} catch (e) {
				return handleError(e);
			}
		}

		// POST /api/admin/users/:id/verify (Manual Verify)
		if (url.pathname.match(/^\/api\/admin\/users\/\d+\/verify$/) && method === 'POST') {
			const id = url.pathname.split('/')[4];
			try {
				const userPayload = await authenticate(request);
				if (userPayload.role !== 'admin') return jsonResponse({ error: 'Unauthorized' }, 403);

				const { success } = await env.cforum_db.prepare('UPDATE users SET verified = 1, verification_token = NULL WHERE id = ?').bind(id).run();
				await security.logAudit(userPayload.id, 'MANUAL_VERIFY_USER', 'user', id, {}, request);

				// Notification
				const setting = await env.cforum_db.prepare("SELECT value FROM settings WHERE key = 'notify_on_manual_verify'").first<DBSetting>();
				if (setting && setting.value === '1') {
					const user = await env.cforum_db.prepare('SELECT email, username FROM users WHERE id = ?').bind(id).first<{email:string;username:string}>();
					if (!user) throw new Error('User unexpectedly missing');
					const emailHtml = `
						<h1>账户已验证</h1>
						<p>您的账户 (用户名: <strong>${user.username}</strong>) 已通过管理员手动验证。</p>
						<p>您现在可以登录并使用所有功能。</p>
					`;
					ctx.waitUntil(sendEmail(user.email as string, '您的账户已通过验证', emailHtml, env).catch(console.error));
				}

				return jsonResponse({ success });
			} catch (e) {
				return handleError(e);
			}
		}

		// POST /api/admin/users/:id/resend (Resend Verification Email)
		if (url.pathname.match(/^\/api\/admin\/users\/\d+\/resend$/) && method === 'POST') {
			const id = url.pathname.split('/')[4];
			try {
				const userPayload = await authenticate(request);
				if (userPayload.role !== 'admin') return jsonResponse({ error: 'Unauthorized' }, 403);

				const user = await env.cforum_db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<DBUser>();
				if (!user) return jsonResponse({ error: 'User not found' }, 404);
				if (user.verified) return jsonResponse({ error: 'User already verified' }, 400);

				// Generate new token if needed, or use existing
				let token = user.verification_token;
				if (!token) {
					token = generateToken();
					await env.cforum_db.prepare('UPDATE users SET verification_token = ? WHERE id = ?').bind(token, id).run();
				}

				const baseUrl = getBaseUrl();
				const verifyLink = `${baseUrl}/api/verify?token=${token}`;
				const emailHtml = `
					<h1>欢迎加入论坛，${user.username}！</h1>
					<p>请点击下方链接验证您的邮箱地址：</p>
					<a href="${verifyLink}">验证邮箱</a>
					<p>如果您未请求此操作，请忽略此邮件。</p>
				`;

				ctx.waitUntil(
					sendEmail(user.email, '请验证您的邮箱', emailHtml, env)
						.catch(err => console.error('[Background Email Error]', err))
				);
				
				await security.logAudit(userPayload.id, 'RESEND_VERIFY_EMAIL', 'user', id, {}, request);

				return jsonResponse({ success: true, message: '验证邮件已发送' });
			} catch (e) {
				return handleError(e);
			}
		}

		// DELETE /api/admin/users/:id
		if (url.pathname.startsWith('/api/admin/users/') && method === 'DELETE') {
			const id = url.pathname.split('/').pop();
			try {
				const userPayload = await authenticate(request);
				if (userPayload.role !== 'admin') return jsonResponse({ error: 'Unauthorized' }, 403);

				// 0. Delete user avatar and post images
				const user = await env.cforum_db.prepare('SELECT avatar_url FROM users WHERE id = ?').bind(id).first<{avatar_url?: string}>();
				const posts = await env.cforum_db.prepare('SELECT content FROM posts WHERE author_id = ?').bind(id).all();
				
				const deletionPromises: Promise<any>[] = [];
				if (user && user.avatar_url) {
					deletionPromises.push(deleteImage(env as unknown as S3Env, user.avatar_url, id));
				}
				if (posts.results) {
					for (const post of posts.results) {
						const imageUrls = extractImageUrls(post.content as string);
						imageUrls.forEach(url => deletionPromises.push(deleteImage(env as unknown as S3Env, url, id)));
					}
				}
				if (deletionPromises.length > 0) {
					ctx.waitUntil(Promise.all(deletionPromises).catch(err => console.error('Failed to delete user images', err)));
				}

				// 1. Delete likes and comments ON the user's posts (to avoid orphans)
				await env.cforum_db.prepare('DELETE FROM likes WHERE post_id IN (SELECT id FROM posts WHERE author_id = ?)').bind(id).run();
				await env.cforum_db.prepare('DELETE FROM comments WHERE post_id IN (SELECT id FROM posts WHERE author_id = ?)').bind(id).run();

				// 2. Delete the user's own activity (likes and comments they made)
				await env.cforum_db.prepare('DELETE FROM likes WHERE user_id = ?').bind(id).run();
				await env.cforum_db.prepare('DELETE FROM comments WHERE author_id = ?').bind(id).run();

				// 3. Delete the user's posts
				await env.cforum_db.prepare('DELETE FROM posts WHERE author_id = ?').bind(id).run();

				// 4. Finally, delete the user
				const userToDelete = await env.cforum_db.prepare('SELECT email, username FROM users WHERE id = ?').bind(id).first();
				await env.cforum_db.prepare('DELETE FROM users WHERE id = ?').bind(id).run();
				
				await security.logAudit(userPayload.id, 'ADMIN_DELETE_USER', 'user', String(id), {}, request);

				// Notification
				if (userToDelete) {
					const setting = await env.cforum_db.prepare("SELECT value FROM settings WHERE key = 'notify_on_user_delete'").first();
					if (setting && setting.value === '1') {
						const emailHtml = `
							<h1>账户已删除</h1>
							<p>您的账户 (用户名: <strong>${userToDelete.username}</strong>) 已被管理员删除。</p>
							<p>如果您认为这是误操作，请联系管理员。</p>
						`;
						ctx.waitUntil(sendEmail(userToDelete.email as string, '您的账户已被删除', emailHtml, env).catch(console.error));
					}
				}

				return jsonResponse({ success: true });
			} catch (e) {
				return handleError(e);
			}
		}

		// DELETE /api/admin/posts/:id
		if (url.pathname.startsWith('/api/admin/posts/') && method === 'DELETE') {
			const id = url.pathname.split('/').pop();
			try {
				const userPayload = await authenticate(request);
				if (userPayload.role !== 'admin') return jsonResponse({ error: 'Unauthorized' }, 403);

				// Delete images in post
				const post = await env.cforum_db.prepare('SELECT content, author_id FROM posts WHERE id = ?').bind(id).first();
				if (post) {
					const imageUrls = extractImageUrls(post.content as string);
					if (imageUrls.length > 0) {
						ctx.waitUntil(Promise.all(imageUrls.map(url => deleteImage(env as unknown as S3Env, url, post.author_id as number))).catch(err => console.error('Failed to delete post images', err)));
					}
				}

				await env.cforum_db.prepare('DELETE FROM likes WHERE post_id = ?').bind(id).run();
				await env.cforum_db.prepare('DELETE FROM comments WHERE post_id = ?').bind(id).run();
				await env.cforum_db.prepare('DELETE FROM posts WHERE id = ?').bind(id).run();
				
				await security.logAudit(userPayload.id, 'ADMIN_DELETE_POST', 'post', String(id), {}, request);
				return jsonResponse({ success: true });
			} catch (e) {
				return handleError(e);
			}
		}

		// DELETE /api/admin/comments/:id
		if (url.pathname.startsWith('/api/admin/comments/') && method === 'DELETE') {
			const id = url.pathname.split('/').pop();
			try {
				const userPayload = await authenticate(request);
				if (userPayload.role !== 'admin') return jsonResponse({ error: 'Unauthorized' }, 403);

				// Delete the comment AND its children (orphans prevention)
				await env.cforum_db.prepare('DELETE FROM comments WHERE parent_id = ?').bind(id).run();
				await env.cforum_db.prepare('DELETE FROM comments WHERE id = ?').bind(id).run();
				
				await security.logAudit(userPayload.id, 'ADMIN_DELETE_COMMENT', 'comment', String(id), {}, request);
				return jsonResponse({ success: true });
			} catch (e) {
				return handleError(e);
			}
		}

		// POST /api/admin/posts/:id/pin
		if (url.pathname.match(/^\/api\/admin\/posts\/\d+\/pin$/) && method === 'POST') {
			const id = url.pathname.split('/')[4];
			try {
				const userPayload = await authenticate(request);
				if (userPayload.role !== 'admin') return jsonResponse({ error: 'Unauthorized' }, 403);

				const body = await request.json() as any;
				const { pinned } = body;
				await env.cforum_db.prepare('UPDATE posts SET is_pinned = ? WHERE id = ?').bind(pinned ? 1 : 0, id).run();
				
				await security.logAudit(userPayload.id, 'ADMIN_PIN_POST', 'post', id, { pinned }, request);
				return jsonResponse({ success: true });
			} catch (e) {
				return handleError(e);
			}
		}

		// POST /api/admin/posts/:id/move
		if (url.pathname.match(/^\/api\/admin\/posts\/\d+\/move$/) && method === 'POST') {
			const id = url.pathname.split('/')[4];
			try {
				const userPayload = await authenticate(request);
				if (userPayload.role !== 'admin') return jsonResponse({ error: 'Unauthorized' }, 403);

				const body = await request.json() as any;
				const { category_id } = body;
				
				// Validate category exists if provided
				if (category_id) {
					const category = await env.cforum_db.prepare('SELECT id FROM categories WHERE id = ?').bind(category_id).first();
					if (!category) return jsonResponse({ error: 'Category not found' }, 404);
				}

				await env.cforum_db.prepare('UPDATE posts SET category_id = ? WHERE id = ?').bind(category_id || null, id).run();
				
				await security.logAudit(userPayload.id, 'ADMIN_MOVE_POST', 'post', id, { category_id }, request);
				return jsonResponse({ success: true });
			} catch (e) {
				return handleError(e);
			}
		}

		// GET /api/admin/cleanup/analyze
		if (url.pathname === '/api/admin/cleanup/analyze' && method === 'GET') {
			try {
				const userPayload = await authenticate(request);
				if (userPayload.role !== 'admin') return jsonResponse({ error: 'Unauthorized' }, 403);
                                
				// 1. List all S3 objects
				const allKeys = await listAllKeys(env as unknown as S3Env);
				
				// 2. Gather used URLs
				const usedKeys = new Set<string>();

				// Users avatars
				const users = await env.cforum_db.prepare('SELECT avatar_url FROM users WHERE avatar_url IS NOT NULL').all();
				for (const u of users.results) {
					const uUrl = u.avatar_url as string;
					const key = uUrl ? getKeyFromUrl(env as unknown as S3Env, uUrl) : null;
					if (key) usedKeys.add(key);
				}

				// Posts images
				const posts = await env.cforum_db.prepare('SELECT content FROM posts').all();
				for (const p of posts.results) {
					const urls = extractImageUrls(p.content as string);
					for (const uUrl of urls) {
						const key = uUrl ? getKeyFromUrl(env as unknown as S3Env, uUrl) : null;
						if (key) usedKeys.add(key);
					}
				}

				// 3. Find orphans
				const orphans = allKeys.filter(key => !usedKeys.has(key));

				return jsonResponse({ 
					total_files: allKeys.length,
					used_files: usedKeys.size,
					orphaned_files: orphans.length,
					orphans: orphans
				});

			} catch (e) {
				return handleError(e);
			}
		}

		// POST /api/admin/cleanup/execute
		if (url.pathname === '/api/admin/cleanup/execute' && method === 'POST') {
			try {
				const userPayload = await authenticate(request);
				if (userPayload.role !== 'admin') return jsonResponse({ error: 'Unauthorized' }, 403);
				
				const body = await request.json() as any;
				const { orphans } = body;
				
				if (!orphans || !Array.isArray(orphans)) return jsonResponse({ error: 'Invalid parameters' }, 400);

				const deletePromises = orphans.map(key => deleteImage(env as unknown as S3Env, key));
				
				ctx.waitUntil(Promise.all(deletePromises).catch(err => console.error('Cleanup failed', err)));
				
				return jsonResponse({ success: true, message: `Deletion of ${orphans.length} files started` });
			} catch (e) {
				return handleError(e);
			}
		}

		// --- END ADMIN ROUTES ---

		// TEST: Email Debug
		if (url.pathname === '/api/test-email' && method === 'POST') {
			try {
				const body = await request.json() as any;
				const { to } = body;
				if (!to) return jsonResponse({ error: '缺少收件人地址' }, 400);

				console.log('[DEBUG] Starting test email to:', to);
				await sendEmail(to, '测试邮件', '<h1>你好</h1><p>这是一封测试邮件。</p>', env);
				console.log('[DEBUG] Test email sent successfully');
				
				return jsonResponse({ success: true, message: '邮件已发送' });
			} catch (e) {
				console.error('[DEBUG] Test email failed:', e);
				return handleError(e);
			}
		}

		// AUTH: Register
		if (url.pathname === '/api/register' && method === 'POST') {
			try {
				const body = await request.json() as any;

				// Turnstile Check
				const ip = request.headers.get('CF-Connecting-IP') || '127.0.0.1';
				if (!(await checkTurnstile(body, ip))) {
					return jsonResponse({ error: 'Turnstile verification failed' }, 403);
				}

				const { email, username, password, gender } = body;
				if (!email || !username || !password) {
					return jsonResponse({ error: 'Missing email, username or password' }, 400);
				}

				// Validate gender (optional, only 'female' or 'male' allowed)
				const safeGender = (gender === 'female' || gender === 'male') ? gender : null;

				if (email.length > 50) return jsonResponse({ error: 'Email too long (Max 50 chars)' }, 400);

				if (username.length > 20) return jsonResponse({ error: 'Username too long (Max 20 chars)' }, 400);
				if (isVisuallyEmpty(username)) return jsonResponse({ error: 'Username cannot be empty' }, 400);
				if (hasInvisibleCharacters(username)) return jsonResponse({ error: 'Username contains invalid invisible characters' }, 400);
				if (hasControlCharacters(username)) return jsonResponse({ error: 'Username contains invalid control characters' }, 400);
				if (hasRestrictedKeywords(username)) return jsonResponse({ error: 'Username contains restricted keywords' }, 400);

				if (password.length < 8 || password.length > 16) return jsonResponse({ error: 'Password must be 8-16 characters' }, 400);

				// Check Uniqueness (Combined Query for Performance)
				const existing = await env.cforum_db.prepare('SELECT email, username FROM users WHERE email = ? OR username = ?').bind(email, username).first();
				if (existing) {
					if (existing.email === email) return jsonResponse({ error: 'Email already exists' }, 409);
					return jsonResponse({ error: 'Username already taken' }, 409);
				}

				const passwordHash = await hashPassword(password);
				const verificationToken = generateToken();

				// Pre-check email deliverability (Send a test email first)
				// Note: We don't insert user yet. If email fails, we abort.
				const baseUrl = getBaseUrl();
				const verifyLink = `${baseUrl}/api/verify?token=${verificationToken}`;
				
				const emailHtml = `
					<h1>欢迎加入论坛，${username}！</h1>
					<p>请点击下方链接验证您的邮箱地址：</p>
					<a href="${verifyLink}">验证邮箱</a>
					<p>如果您未请求此操作，请忽略此邮件。</p>
				`;

				try {
					await sendEmail(email, '请验证您的邮箱', emailHtml, env);
				} catch (e) {
					console.error('[Registration Email Error]', e);
					const errorMsg = e instanceof Error ? e.message : '未知错误';
					return jsonResponse({ 
						error: `验证邮件发送失败: ${errorMsg}`,
						details: '请检查邮箱地址或联系管理员检查 SMTP 配置'
					}, 400);
				}

				const { success, meta } = await env.cforum_db.prepare(
					'INSERT INTO users (email, username, password, role, verified, verification_token, gender) VALUES (?, ?, ?, "user", 0, ?, ?)'
				).bind(email, username, passwordHash, verificationToken, safeGender).run();

				if (success) {
					// Generate Default Avatar (Identicon)
					// Use ID if available, otherwise fallback to Username
					const userId = meta?.last_row_id;
					if (userId) {
						const identicon = await generateIdenticon(String(userId));
						await env.cforum_db.prepare('UPDATE users SET avatar_url = ? WHERE id = ?').bind(identicon, userId).run();
					} else {
						// Fallback if ID retrieval fails (rare in D1)
						const identicon = await generateIdenticon(username);
						// We don't have ID easily without query, but we can update by username or just skip
						await env.cforum_db.prepare('UPDATE users SET avatar_url = ? WHERE username = ?').bind(identicon, username).run();
					}
				}

				return jsonResponse({ success, message: '注册成功，请前往邮箱完成验证。' }, 201);
			} catch (e: any) {
				if (e.message && e.message.includes('UNIQUE constraint failed')) {
					return jsonResponse({ error: 'Email already exists' }, 409);
				}
				return handleError(e);
			}
		}

		// AUTH: Verify Email
		if (url.pathname === '/api/verify' && method === 'GET') {
			const token = url.searchParams.get('token');
			if (!token) {
				return new Response('缺少 token', { status: 400 });
			}

			try {
				const { success } = await env.cforum_db.prepare(
					'UPDATE users SET verified = 1, verification_token = NULL WHERE verification_token = ?'
				).bind(token).run();

				if (success) {
					// Redirect to home page with verified param
					return Response.redirect(`${getBaseUrl()}/?verified=true`, 302);
				} else {
					return new Response('token 无效或已过期', { status: 400 });
				}
			} catch (e) {
				return new Response('验证失败', { status: 500 });
			}
		}

		// POST /api/soul - 保存灵魂测定结果
		if (url.pathname === '/api/soul' && method === 'POST') {
			try {
				const userPayload = await authenticate(request);
				const body = await request.json() as any;
				const { code, name, scores, tone, contrast_level } = body;
				if (!code || !name || !scores) {
					return jsonResponse({ error: 'Missing fields' }, 400);
				}
				// 保留最近一条，旧的删除（可选：保留历史）
				await env.cforum_db.prepare(
					'DELETE FROM soul_results WHERE user_id = ?'
				).bind(userPayload.id).run();
				await env.cforum_db.prepare(
					'INSERT INTO soul_results (user_id, code, name, scores, tone, contrast_level) VALUES (?, ?, ?, ?, ?, ?)'
				).bind(
					userPayload.id,
					String(code),
					String(name),
					JSON.stringify(scores),
					tone ? String(tone) : null,
					typeof contrast_level === 'number' ? contrast_level : null
				).run();
				return jsonResponse({ success: true });
			} catch (e) {
				return handleError(e);
			}
		}

		// GET /api/soul - 获取当前用户的灵魂测定结果
		if (url.pathname === '/api/soul' && method === 'GET') {
			try {
				const userPayload = await authenticate(request);
				const row = await env.cforum_db.prepare(
					'SELECT code, name, scores, tone, contrast_level, created_at FROM soul_results WHERE user_id = ? ORDER BY id DESC LIMIT 1'
				).bind(userPayload.id).first<any>();
				if (!row) return jsonResponse({ result: null });
				return jsonResponse({
					result: {
						code: row.code,
						name: row.name,
						scores: JSON.parse(row.scores),
						tone: row.tone,
						contrast_level: row.contrast_level,
						created_at: row.created_at,
					},
				});
			} catch (e) {
				return handleError(e);
			}
		}

		// GET /api/soul/types - 公开：返回所有灵魂类型/底色/等级定义（供首页展示）
		if (url.pathname === '/api/soul/types' && method === 'GET') {
			return jsonResponse({
				soul_types: [
					{ code: 'FL', name: '炽夜玫瑰', tagline: '夜里盛放，被注视才完整', color: '#E11D48' },
					{ code: 'NH', name: '暗夜猎手', tagline: '不是被注视，是你在挑选', color: '#9D174D' },
					{ code: 'SR', name: '书房尤物', tagline: '读着严肃的书，写着潮湿的字', color: '#B45309' },
					{ code: 'IS', name: '私语者', tagline: '把欲望说给不会说出去的人', color: '#6366F1' },
					{ code: 'MB', name: '镜中困兽', tagline: '想被看见，又害怕被看穿', color: '#A21CAF' },
					{ code: 'MO', name: '月下凝眸', tagline: '渴望被注视，又害怕被看穿', color: '#F59E0B' },
					{ code: 'ST', name: '静水深流', tagline: '理性是表象，深海在底下', color: '#64748B' },
					{ code: 'TW', name: '薄暮之人', tagline: '白天与夜晚之间的过渡带', color: '#8B5CF6' },
				],
				tones: [
					{ code: 'ash', name: '晨灰', hex: '#9CA3AF' },
					{ code: 'gold', name: '午金', hex: '#F59E0B' },
					{ code: 'dusk', name: '暮紫', hex: '#A855F7' },
					{ code: 'ink', name: '夜墨', hex: '#1E1B4B' },
					{ code: 'rose', name: '欲红', hex: '#E11D48' },
					{ code: 'blue', name: '寂蓝', hex: '#3B82F6' },
				],
				contrast_levels: [
					{ level: 0, label: '端庄', desc: '你是白天的代名词，但夜还没真正来过' },
					{ level: 1, label: '微光', desc: '端庄开始松动，偶尔有一丝缝隙' },
					{ level: 2, label: '薄暮', desc: '你正站在白天与夜晚的过渡带' },
					{ level: 3, label: '暗涌', desc: '表面平静，底下已经有人在下坠' },
					{ level: 4, label: '反差', desc: '白天与夜晚是两个你，你自己也分不清' },
					{ level: 5, label: '炽夜', desc: '你已经醒了，并且不再想回去' },
				],
			});
		}

		// GET /api/soul/stats - 公开：返回统计（参与人数 + 各类型分布）
		if (url.pathname === '/api/soul/stats' && method === 'GET') {
			try {
				const totalRow = await env.cforum_db.prepare(
					'SELECT COUNT(*) as c FROM soul_results'
				).first<any>();
				const distRows = await env.cforum_db.prepare(
					'SELECT code, name, COUNT(*) as c FROM soul_results GROUP BY code ORDER BY c DESC'
				).all<any>();
				const toneRows = await env.cforum_db.prepare(
					'SELECT tone, COUNT(*) as c FROM soul_results WHERE tone IS NOT NULL GROUP BY tone ORDER BY c DESC'
				).all<any>();
				return jsonResponse({
					total: totalRow?.c || 0,
					by_type: (distRows.results || []).map((r: any) => ({ code: r.code, name: r.name, count: r.c })),
					by_tone: (toneRows.results || []).map((r: any) => ({ tone: r.tone, count: r.c })),
				});
			} catch (e) {
				return handleError(e);
			}
		}

		// ===== 九型人格（Enneagram）接口 =====

		// GET /api/enneagram/types - 公开：9 型定义
		if (url.pathname === '/api/enneagram/types' && method === 'GET') {
			return jsonResponse({
				types: [
					{ code: 1, name: '戒律者', tagline: '白天的规矩，夜里还在守', desc: '你有一个不肯妥协的内核。白天你为规矩而活，夜里你为完美的幻影而醒。你最大的痛苦是——世界总不达标。' },
					{ code: 2, name: '供养者', tagline: '给所有人光，自己摸黑', desc: '你的爱是主动的、是溢出的。你给所有人光，却很少让自己被看见。夜深时你会问：我这样付出，谁会来接住我？' },
					{ code: 3, name: '聚光灯', tagline: '镜头停不下，夜里也妆没卸', desc: '你是别人眼里的成功者。你习惯了被注视，也害怕不被注视。夜里卸妆那一刻，你最陌生。' },
					{ code: 4, name: '孤本', tagline: '与众不同的痛，与众不同的美', desc: '你活在一种独特的缺失感里。别人有的你不稀罕，你要的别人给不了。你的悲剧感是你的美学。' },
					{ code: 5, name: '壁上观', tagline: '看透一切，包括自己的孤独', desc: '你站在世界之外观察世界。你不缺知识，你缺的是——一个让你愿意走下来的理由。' },
					{ code: 6, name: '守夜人', tagline: '怀疑一切，但仍守着一个位置', desc: '你疑心很重，但忠诚更深。你夜里醒着，是因为你在守一个不确定是否值得的位置。' },
					{ code: 7, name: '浪子', tagline: '尝遍世间，唯独不尝自己', desc: '你用新鲜感逃避痛。你什么都尝过，唯独不肯尝自己内心那个洞。夜深了，洞还在。' },
					{ code: 8, name: '执剑', tagline: '白天的王，夜晚的困兽', desc: '你掌控一切，因为害怕被掌控。白天你是王，夜晚你是一只不肯承认自己困的兽。' },
					{ code: 9, name: '薄雾', tagline: '谁都不得罪，自己也消失了', desc: '你太擅长和谐了。你把所有棱角都磨平，最后把自己也磨没了。夜里你想不起自己是谁。' },
				],
			});
		}

		// POST /api/enneagram - 保存九型测定结果
		if (url.pathname === '/api/enneagram' && method === 'POST') {
			try {
				const userPayload = await authenticate(request);
				const body = await request.json() as any;
				const { type_code, type_name, wing_code, wing_name, scores } = body;
				if (!type_code || !type_name || !scores) {
					return jsonResponse({ error: 'Missing fields' }, 400);
				}
				await env.cforum_db.prepare(
					'DELETE FROM enneagram_results WHERE user_id = ?'
				).bind(userPayload.id).run();
				await env.cforum_db.prepare(
					'INSERT INTO enneagram_results (user_id, type_code, type_name, wing_code, wing_name, scores) VALUES (?, ?, ?, ?, ?, ?)'
				).bind(
					userPayload.id,
					Number(type_code),
					String(type_name),
					wing_code ? Number(wing_code) : null,
					wing_name ? String(wing_name) : null,
					JSON.stringify(scores)
				).run();
				return jsonResponse({ success: true });
			} catch (e) {
				return handleError(e);
			}
		}

		// GET /api/enneagram - 获取当前用户九型结果
		if (url.pathname === '/api/enneagram' && method === 'GET') {
			try {
				const userPayload = await authenticate(request);
				const row = await env.cforum_db.prepare(
					'SELECT type_code, type_name, wing_code, wing_name, scores, created_at FROM enneagram_results WHERE user_id = ? ORDER BY id DESC LIMIT 1'
				).bind(userPayload.id).first<any>();
				if (!row) return jsonResponse({ result: null });
				return jsonResponse({
					result: {
						type_code: row.type_code,
						type_name: row.type_name,
						wing_code: row.wing_code,
						wing_name: row.wing_name,
						scores: JSON.parse(row.scores),
						created_at: row.created_at,
					},
				});
			} catch (e) {
				return handleError(e);
			}
		}

		// GET /api/enneagram/stats - 公开：九型分布
		if (url.pathname === '/api/enneagram/stats' && method === 'GET') {
			try {
				const totalRow = await env.cforum_db.prepare(
					'SELECT COUNT(*) as c FROM enneagram_results'
				).first<any>();
				const distRows = await env.cforum_db.prepare(
					'SELECT type_code, type_name, COUNT(*) as c FROM enneagram_results GROUP BY type_code ORDER BY type_code ASC'
				).all<any>();
				return jsonResponse({
					total: totalRow?.c || 0,
					by_type: (distRows.results || []).map((r: any) => ({ code: r.type_code, name: r.type_name, count: r.c })),
				});
			} catch (e) {
				return handleError(e);
			}
		}

		// ===== 夜作者（Creator）邀请制接口 =====

		// POST /api/creator/redeem - 兑换邀请码，升级为 creator
		if (url.pathname === '/api/creator/redeem' && method === 'POST') {
			try {
				const userPayload = await authenticate(request);
				const body = await request.json() as any;
				const code = String(body.code || '').trim().toUpperCase();
				if (!code) return jsonResponse({ error: '请输入邀请码' }, 400);

				const inv = await env.cforum_db.prepare(
					'SELECT code, used_by, expires_at FROM creator_invitations WHERE code = ?'
				).bind(code).first<any>();
				if (!inv) return jsonResponse({ error: '邀请码不存在' }, 404);
				if (inv.used_by) return jsonResponse({ error: '邀请码已被使用' }, 400);
				if (inv.expires_at && inv.expires_at < Date.now()) return jsonResponse({ error: '邀请码已过期' }, 400);

				await env.cforum_db.batch([
					env.cforum_db.prepare(
						'UPDATE users SET role = ? WHERE id = ?'
					).bind('creator', userPayload.id),
					env.cforum_db.prepare(
						'UPDATE creator_invitations SET used_by = ? WHERE code = ?'
					).bind(userPayload.id, code),
				]);
				return jsonResponse({ success: true, role: 'creator' });
			} catch (e) {
				return handleError(e);
			}
		}

		// POST /api/creator/invitations - admin/creator 生成邀请码
		if (url.pathname === '/api/creator/invitations' && method === 'POST') {
			try {
				const userPayload = await authenticate(request);
				if (userPayload.role !== 'admin' && userPayload.role !== 'creator') {
					return jsonResponse({ error: '无权生成邀请码' }, 403);
				}
				const body = await request.json().catch(() => ({})) as any;
				const note = body.note ? String(body.note).slice(0, 200) : null;
				const expiresInDays = Number(body.expires_in_days) || 0;
				const expiresAt = expiresInDays > 0 ? Math.floor(Date.now() / 1000) + expiresInDays * 86400 : null;

				// 生成 8 位码：大写字母+数字，避开易混字符
				const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
				let code = '';
				const rand = new Uint32Array(8);
				crypto.getRandomValues(rand);
				for (let i = 0; i < 8; i++) code += chars[rand[i] % chars.length];

				await env.cforum_db.prepare(
					'INSERT INTO creator_invitations (code, created_by, note, expires_at) VALUES (?, ?, ?, ?)'
				).bind(code, userPayload.id, note, expiresAt).run();
				return jsonResponse({ code, expires_at: expiresAt });
			} catch (e) {
				return handleError(e);
			}
		}

		// GET /api/creator/invitations - 列出自己生成的邀请码
		if (url.pathname === '/api/creator/invitations' && method === 'GET') {
			try {
				const userPayload = await authenticate(request);
				if (userPayload.role !== 'admin' && userPayload.role !== 'creator') {
					return jsonResponse({ error: '无权查看' }, 403);
				}
				const rows = await env.cforum_db.prepare(
					`SELECT i.code, i.note, i.expires_at, i.created_at, i.used_by,
					   u.username as used_username
					 FROM creator_invitations i
					 LEFT JOIN users u ON u.id = i.used_by
					 WHERE i.created_by = ?
					 ORDER BY i.created_at DESC`
				).bind(userPayload.id).all<any>();
				return jsonResponse({ invitations: rows.results || [] });
			} catch (e) {
				return handleError(e);
			}
		}

		// GET /api/creator/status - 当前用户是否为 creator + 统计
		if (url.pathname === '/api/creator/status' && method === 'GET') {
			try {
				const userPayload = await authenticate(request);
				const user = await env.cforum_db.prepare(
					'SELECT role FROM users WHERE id = ?'
				).bind(userPayload.id).first<any>();
				const postsCount = await env.cforum_db.prepare(
					'SELECT COUNT(*) as c FROM posts WHERE author_id = ? AND deleted_at IS NULL'
				).bind(userPayload.id).first<any>();
				return jsonResponse({
					is_creator: (user?.role || 'user') === 'creator' || (user?.role || 'user') === 'admin',
					role: user?.role || 'user',
					posts_count: postsCount?.c || 0,
				});
			} catch (e) {
				return handleError(e);
			}
		}

		// ===== BDSM 夜人格测试（仅初期迎流，藏深入口）=====

		// GET /api/bdsm/types - 公开：返回测试题与型定义
		if (url.pathname === '/api/bdsm/types' && method === 'GET') {
			return jsonResponse({
				disclaimer: BDSM_DISCLAIMER,
				types: BDSM_TYPES,
				questions: BDSM_QUESTIONS,
			});
		}

		// POST /api/bdsm - 保存 BDSM 测试结果（不公开统计、不进主页）
		if (url.pathname === '/api/bdsm' && method === 'POST') {
			try {
				const userPayload = await authenticate(request);
				const body = await request.json() as any;
				const { code, name, scores } = body;
				if (!code || !name || !scores) return jsonResponse({ error: 'Missing fields' }, 400);
				await env.cforum_db.prepare(
					'DELETE FROM bdsm_results WHERE user_id = ?'
				).bind(userPayload.id).run();
				await env.cforum_db.prepare(
					'INSERT INTO bdsm_results (user_id, code, name, scores) VALUES (?, ?, ?, ?)'
				).bind(userPayload.id, String(code), String(name), JSON.stringify(scores)).run();
				return jsonResponse({ success: true });
			} catch (e) {
				return handleError(e);
			}
		}

		// GET /api/bdsm - 当前用户结果（仅自己可见）
		if (url.pathname === '/api/bdsm' && method === 'GET') {
			try {
				const userPayload = await authenticate(request);
				const row = await env.cforum_db.prepare(
					'SELECT code, name, scores, created_at FROM bdsm_results WHERE user_id = ? ORDER BY id DESC LIMIT 1'
				).bind(userPayload.id).first<any>();
				if (!row) return jsonResponse({ result: null });
				return jsonResponse({
					result: {
						code: row.code,
						name: row.name,
						scores: JSON.parse(row.scores),
						created_at: row.created_at,
					},
				});
			} catch (e) {
				return handleError(e);
			}
		}

		// GET /api/users
		if (url.pathname === '/api/users' && method === 'GET') {
			try {
				const { results } = await env.cforum_db.prepare(
					'SELECT id, email, username, created_at FROM users'
				).all();
				return jsonResponse(results);
			} catch (e) {
				return handleError(e);
			}
		}

		// GET /api/user/likes (Get all post IDs liked by user)
		if (url.pathname === '/api/user/likes' && method === 'GET') {
			try {
				const userPayload = await authenticate(request);
				const { results } = await env.cforum_db.prepare('SELECT post_id FROM likes WHERE user_id = ?').bind(userPayload.id).all();
				return jsonResponse(results.map((r: any) => r.post_id));
			} catch (e) {
				return handleError(e);
			}
		}

		// GET /posts
		// GET /api/posts/featured - 今夜精选：关联灵魂测定结果，按反差等级 + 点赞排序
		if (url.pathname === '/api/posts/featured' && method === 'GET') {
			try {
				const limit = Math.min(parseInt(url.searchParams.get('limit') || '6'), 20);
				// JOIN soul_results 拿到作者的反差等级；没测过的给 -1（排后）
				// 仅取最近 7 天、未匿名的帖子
				const rows = await env.cforum_db.prepare(
					`SELECT p.id, p.title, p.excerpt, p.category_id, p.author_id, p.created_at,
						p.likes_count, p.comments_count, p.views_count,
						u.username, u.avatar_url,
						c.name as category_name, c.slug as category_slug,
						sr.contrast_level, sr.code as soul_code, sr.name as soul_name
					 FROM posts p
					 LEFT JOIN users u ON u.id = p.author_id
					 LEFT JOIN categories c ON c.id = p.category_id
					 LEFT JOIN soul_results sr ON sr.user_id = p.author_id
					 WHERE p.deleted_at IS NULL
						AND p.created_at >= datetime('now', '-7 days')
						AND (p.is_anonymous IS NULL OR p.is_anonymous = 0)
						AND p.views_count > 5
					 ORDER BY COALESCE(sr.contrast_level, -1) DESC, p.likes_count DESC, p.views_count DESC
					 LIMIT ?`
				).bind(limit).all<any>();
				return jsonResponse({ posts: rows.results || [] });
			} catch (e) {
				return handleError(e);
			}
		}

		if (url.pathname === '/api/posts' && method === 'GET') {
			try {
				const limit = parseInt(url.searchParams.get('limit') || '20');
				const offset = parseInt(url.searchParams.get('offset') || '0');
				const categoryId = url.searchParams.get('category_id');
				const q = (url.searchParams.get('q') || url.searchParams.get('query') || '').trim();
				const sortByRaw = (url.searchParams.get('sort_by') || 'time').trim().toLowerCase();
				const sortDirRaw = (url.searchParams.get('sort_dir') || 'desc').trim().toLowerCase();
				const sortDir = sortDirRaw === 'asc' ? 'ASC' : 'DESC';
				
				let query = `SELECT 
                        posts.*, 
                        users.username as author_name, 
                        users.avatar_url as author_avatar,
                        users.role as author_role,
                        categories.name as category_name,
                        (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id) as like_count,
                        (SELECT COUNT(*) FROM comments WHERE comments.post_id = posts.id) as comment_count
                     FROM posts 
                     JOIN users ON posts.author_id = users.id 
                     LEFT JOIN categories ON posts.category_id = categories.id`;
                
                let countQuery = `SELECT COUNT(*) as total FROM posts`;

                const params: any[] = [];
                const countParams: any[] = [];
				const conditions: string[] = [];

                if (categoryId) {
                    if (categoryId === 'uncategorized') {
						conditions.push(`posts.category_id IS NULL`);
                    } else {
						conditions.push(`posts.category_id = ?`);
                        params.push(categoryId);
                        countParams.push(categoryId);
                    }
                }

				if (q) {
					conditions.push(`(posts.title LIKE ? OR posts.content LIKE ?)`);
					const like = `%${q}%`;
					params.push(like, like);
					countParams.push(like, like);
				}

				if (conditions.length) {
					query += ` WHERE ${conditions.join(' AND ')}`;
					countQuery += ` WHERE ${conditions.join(' AND ')}`;
				}

				const sortExpr =
					sortByRaw === 'likes'
						? `like_count ${sortDir}`
						: sortByRaw === 'comments'
							? `comment_count ${sortDir}`
							: sortByRaw === 'views'
								? `posts.view_count ${sortDir}`
								: `posts.created_at ${sortDir}`;

                query += ` ORDER BY is_pinned DESC, ${sortExpr}, posts.created_at DESC LIMIT ? OFFSET ?`;
                params.push(limit, offset);
				
				const [postsResult, countResult] = await Promise.all([
                    env.cforum_db.prepare(query).bind(...params).all(),
                    env.cforum_db.prepare(countQuery).bind(...countParams).first()
                ]);

				return jsonResponse({
                    posts: postsResult.results,
                    total: countResult ? countResult.total : 0
                });
			} catch (e) {
				return handleError(e);
			}
		}

		// GET /api/posts/:id
		if (url.pathname.match(/^\/api\/posts\/\d+$/) && method === 'GET') {
			const postId = url.pathname.split('/')[3];
			try {
				const post = await env.cforum_db.prepare(
					`SELECT 
                        posts.*, 
                        users.username as author_name, 
                        users.avatar_url as author_avatar,
                        users.role as author_role,
                        categories.name as category_name,
                        (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id) as like_count,
                        (SELECT COUNT(*) FROM comments WHERE comments.post_id = posts.id) as comment_count
                     FROM posts 
                     JOIN users ON posts.author_id = users.id 
                     LEFT JOIN categories ON posts.category_id = categories.id
                     WHERE posts.id = ?`
				).bind(postId).first();
				
				if (!post) return jsonResponse({ error: 'Post not found' }, 404);

				try {
					await env.cforum_db.prepare('UPDATE posts SET view_count = COALESCE(view_count, 0) + 1 WHERE id = ?').bind(postId).run();
					(post as any).view_count = Number((post as any).view_count || 0) + 1;
				} catch {}
				
				// Check like status if user_id provided
				const userId = url.searchParams.get('user_id');
				if (userId) {
					const like = await env.cforum_db.prepare('SELECT id FROM likes WHERE post_id = ? AND user_id = ?').bind(postId, userId).first();
					(post as any).liked = !!like;
				}

				return jsonResponse(post);
			} catch (e) {
				return handleError(e);
			}
		}

		// PUT /api/posts/:id
		if (url.pathname.match(/^\/api\/posts\/\d+$/) && method === 'PUT') {
			const postId = url.pathname.split('/')[3];
			try {
				const userPayload = await authenticate(request);
				const body = await request.json() as any;
				const { title, content, category_id } = body; // user_id not needed from body

				if (!title || !content) {
					return jsonResponse({ error: 'Missing parameters' }, 400);
				}

				if (isVisuallyEmpty(title) || isVisuallyEmpty(content)) return jsonResponse({ error: 'Title or content cannot be empty' }, 400);

				if (hasInvisibleCharacters(title) || hasInvisibleCharacters(content)) return jsonResponse({ error: 'Title or content contains invalid invisible characters' }, 400);

				// Check ownership or admin
				const post = await env.cforum_db.prepare('SELECT author_id FROM posts WHERE id = ?').bind(postId).first();
				if (!post) return jsonResponse({ error: 'Post not found' }, 404);

				// Use userPayload for RBAC
				if (post.author_id !== userPayload.id && userPayload.role !== 'admin') {
					return jsonResponse({ error: 'Unauthorized' }, 403);
				}

				// Validate Lengths
				if (title.length > 30) return jsonResponse({ error: 'Title too long (Max 30 chars)' }, 400);
				if (content.length > 3000) return jsonResponse({ error: 'Content too long (Max 3000 chars)' }, 400);
				if (hasControlCharacters(title) || hasControlCharacters(content)) return jsonResponse({ error: 'Title or content contains invalid control characters' }, 400);

				// Validate Category
				if (category_id) {
					const category = await env.cforum_db.prepare('SELECT id FROM categories WHERE id = ?').bind(category_id).first();
					if (!category) return jsonResponse({ error: 'Category not found' }, 400);
				}

				await env.cforum_db.prepare(
					'UPDATE posts SET title = ?, content = ?, category_id = ? WHERE id = ?'
				).bind(title.trim(), content.trim(), category_id || null, postId).run();
				
				await security.logAudit(userPayload.id, 'UPDATE_POST', 'post', postId, { title_length: title.length }, request);

				return jsonResponse({ success: true });
			} catch (e) {
				return handleError(e);
			}
		}

		// DELETE /api/posts/:id (User delete own post)
		if (url.pathname.match(/^\/api\/posts\/\d+$/) && method === 'DELETE') {
			const id = url.pathname.split('/')[3];
			try {
				const userPayload = await authenticate(request);
				
				// Check ownership
				const post = await env.cforum_db.prepare('SELECT author_id, content FROM posts WHERE id = ?').bind(id).first();
				if (!post) return jsonResponse({ error: 'Post not found' }, 404);
				
				if (post.author_id !== userPayload.id) {
					return jsonResponse({ error: 'Unauthorized' }, 403);
				}

				// Delete images in post
				const imageUrls = extractImageUrls(post.content as string);
				if (imageUrls.length > 0) {
					ctx.waitUntil(Promise.all(imageUrls.map(url => deleteImage(env as unknown as S3Env, url, userPayload.id))).catch(err => console.error('Failed to delete post images', err)));
				}

				await env.cforum_db.prepare('DELETE FROM likes WHERE post_id = ?').bind(id).run();
				await env.cforum_db.prepare('DELETE FROM comments WHERE post_id = ?').bind(id).run();
				await env.cforum_db.prepare('DELETE FROM posts WHERE id = ?').bind(id).run();
				
				await security.logAudit(userPayload.id, 'DELETE_POST', 'post', id, {}, request);
				return jsonResponse({ success: true });
			} catch (e) {
				return handleError(e);
			}
		}

		// GET /api/posts/:id/comments
		if (url.pathname.match(/^\/api\/posts\/\d+\/comments$/) && method === 'GET') {
			const postId = url.pathname.split('/')[3];
			try {
				const { results } = await env.cforum_db.prepare(
					`SELECT comments.*, users.username, users.avatar_url, users.role 
                     FROM comments 
                     JOIN users ON comments.author_id = users.id 
                     WHERE post_id = ? 
                     ORDER BY created_at ASC`
				).bind(postId).all();
				return jsonResponse(results);
			} catch (e) {
				return handleError(e);
			}
		}

		// DELETE /api/comments/:id
		if (url.pathname.match(/^\/api\/comments\/\d+$/) && method === 'DELETE') {
			const id = url.pathname.split('/').pop();
			try {
				const userPayload = await authenticate(request);
				
				// Fetch comment to check ownership
				const comment = await env.cforum_db.prepare('SELECT author_id FROM comments WHERE id = ?').bind(id).first();
				
				if (!comment) return jsonResponse({ error: 'Comment not found' }, 404);

				// Allow deletion if user is author OR admin
				if (comment.author_id !== userPayload.id && userPayload.role !== 'admin') {
					return jsonResponse({ error: 'Unauthorized' }, 403);
				}

				// Delete the comment AND its children (orphans prevention)
				await env.cforum_db.prepare('DELETE FROM comments WHERE parent_id = ?').bind(id).run();
				await env.cforum_db.prepare('DELETE FROM comments WHERE id = ?').bind(id).run();
				
				await security.logAudit(userPayload.id, 'DELETE_COMMENT', 'comment', String(id), {}, request);
				return jsonResponse({ success: true });
			} catch (e) {
				return handleError(e);
			}
		}

		// POST /api/posts/:id/like
		if (url.pathname.match(/^\/api\/posts\/\d+\/like$/) && method === 'POST') {
			const postId = url.pathname.split('/')[3];
			try {
				const userPayload = await authenticate(request);
				const userId = userPayload.id;

				// Toggle like
				const existing = await env.cforum_db.prepare(
					'SELECT id FROM likes WHERE post_id = ? AND user_id = ?'
				).bind(postId, userId).first();

				if (existing) {
					await env.cforum_db.prepare('DELETE FROM likes WHERE id = ?').bind(existing.id).run();
					return jsonResponse({ liked: false });
				} else {
					await env.cforum_db.prepare('INSERT INTO likes (post_id, user_id) VALUES (?, ?)').bind(postId, userId).run();
					return jsonResponse({ liked: true });
				}
			} catch (e) {
				return handleError(e);
			}
		}
		
		// GET /api/posts/:id/like-status
		if (url.pathname.match(/^\/api\/posts\/\d+\/like-status$/) && method === 'GET') {
			const postId = url.pathname.split('/')[3];
			
			try {
				const userPayload = await authenticate(request);
				const existing = await env.cforum_db.prepare(
					'SELECT id FROM likes WHERE post_id = ? AND user_id = ?'
				).bind(postId, userPayload.id).first();
				return jsonResponse({ liked: !!existing });
			} catch (e) {
				return handleError(e);
			}
		}

		// POST /posts (Protected - in real app check token)
		if (url.pathname === '/api/posts' && method === 'POST') {
			try {
				const userPayload = await authenticate(request);
				const body = await request.json() as any;

				// Turnstile Check
				const ip = request.headers.get('CF-Connecting-IP') || '127.0.0.1';
				if (!(await checkTurnstile(body, ip))) {
					return jsonResponse({ error: 'Turnstile verification failed' }, 403);
				}

				const { title, content: rawContent, category_id } = body;
				let content = rawContent;
				
				if (!title || !content) {
					return jsonResponse({ error: 'Missing title or content' }, 400);
				}
				
				// --- Input Sanitization & Validation (Sync with Frontend) ---
				if (isVisuallyEmpty(title) || isVisuallyEmpty(content)) return jsonResponse({ error: 'Title or content cannot be empty' }, 400);
				
				if (hasInvisibleCharacters(title) || hasInvisibleCharacters(content)) return jsonResponse({ error: 'Title or content contains invalid invisible characters' }, 400);

				// Validate Lengths
				if (title.length > 30) return jsonResponse({ error: 'Title too long (Max 30 chars)' }, 400);
				if (content.length > 3000) return jsonResponse({ error: 'Content too long (Max 3000 chars)' }, 400);

				if (hasControlCharacters(title) || hasControlCharacters(content)) return jsonResponse({ error: 'Title or content contains invalid control characters' }, 400);

				// HTML Escape Content (Backend Enforcement)
				content = content
					.replace(/&/g, '&amp;')
					.replace(/</g, '&lt;')
					.replace(/>/g, '&gt;')
					.replace(/"/g, '&quot;')
					.replace(/'/g, '&#039;');
				
				// Escape Title as well just in case
				const safeTitle = title
					.replace(/&/g, '&amp;')
					.replace(/</g, '&lt;')
					.replace(/>/g, '&gt;')
					.replace(/"/g, '&quot;')
					.replace(/'/g, '&#039;');

				// Validate Category
				if (category_id) {
					const category = await env.cforum_db.prepare('SELECT id, slug FROM categories WHERE id = ?').bind(category_id).first<any>();
					if (!category) return jsonResponse({ error: 'Category not found' }, 400);
					// 「晚妆」板块限女性发帖（男性可看可点赞，不可发）
					if (category.slug === 'gaze') {
						const author = await env.cforum_db.prepare('SELECT gender FROM users WHERE id = ?').bind(userPayload.id).first<any>();
						if (!author || author.gender !== 'female') {
							return jsonResponse({ error: '晚妆是她的妆台，男士请到一旁欣赏' }, 403);
						}
					}
				}

				const { success } = await env.cforum_db.prepare(
					'INSERT INTO posts (author_id, title, content, category_id) VALUES (?, ?, ?, ?)'
				).bind(userPayload.id, safeTitle.trim(), content.trim(), category_id || null).run();
				
				await security.logAudit(userPayload.id, 'CREATE_POST', 'post', 'new', { title_length: safeTitle.length }, request);

				return jsonResponse({ success }, 201);
			} catch (e) {
				return handleError(e);
			}
		}

		if (method === 'GET' && !url.pathname.startsWith('/api')) {
			const pathname = url.pathname;
			const postMatch = pathname.match(/^\/posts\/(\d+)$/);
			if (postMatch) {
				const redirectUrl = new URL(request.url);
				redirectUrl.pathname = '/post';
				redirectUrl.search = `?id=${postMatch[1]}`;
				return Response.redirect(redirectUrl.toString(), 302);
			}
			const postAltMatch = pathname.match(/^\/post\/(\d+)$/);
			if (postAltMatch) {
				const redirectUrl = new URL(request.url);
				redirectUrl.pathname = '/post';
				redirectUrl.search = `?id=${postAltMatch[1]}`;
				return Response.redirect(redirectUrl.toString(), 302);
			}

			if (!(env as any).ASSETS?.fetch) return new Response('Not Found', { status: 404 });
			const mapped =
				pathname === '/login' ? '/login.html' :
				pathname === '/register' ? '/register.html' :
				pathname === '/forgot' ? '/forgot.html' :
				pathname === '/reset' ? '/reset.html' :
				pathname === '/settings' ? '/settings.html' :
				pathname === '/admin' ? '/admin.html' :
				pathname === '/post' ? '/post.html' :
				pathname;

			const assetUrl = new URL(request.url);
			assetUrl.pathname = mapped;
			const assetRes = await (env as any).ASSETS.fetch(new Request(assetUrl, request));
			if (assetRes.status !== 404) return assetRes;
			if (mapped !== pathname) {
				const directRes = await (env as any).ASSETS.fetch(request);
				if (directRes.status !== 404) return directRes;
			}
			return new Response('Not Found', { status: 404 });
		}

		return new Response('Not Found', { status: 404 });
	}
};
