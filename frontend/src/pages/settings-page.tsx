import * as React from 'react';

import QRCode from 'qrcode';

import { PageShell } from '@/components/page-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { apiFetch, getSecurityHeaders } from '@/lib/api';
import { getUser, logout, setUser, type User } from '@/lib/auth';
import { validateText } from '@/lib/validators';

export function SettingsPage() {
	const [user, setUserState] = React.useState<User | null>(() => getUser());
	const [loading, setLoading] = React.useState(false);
	const [error, setError] = React.useState('');

	const [username, setUsername] = React.useState(user?.username || '');
	const [avatarUrl, setAvatarUrl] = React.useState(user?.avatar_url || '');
	const [gender, setGender] = React.useState<string>(user?.gender || '');
	const [emailNotifications, setEmailNotifications] = React.useState<boolean>(user?.email_notifications !== false);

	const [emailNew, setEmailNew] = React.useState('');
	const [emailTotp, setEmailTotp] = React.useState('');

	const [totpSecret, setTotpSecret] = React.useState('');
	const [totpUri, setTotpUri] = React.useState('');
	const [totpCode, setTotpCode] = React.useState('');
	const qrCanvasRef = React.useRef<HTMLCanvasElement | null>(null);

	const [deletePassword, setDeletePassword] = React.useState('');
	const [deleteTotp, setDeleteTotp] = React.useState('');

	// 夜作者邀请制
	const [creatorStatus, setCreatorStatus] = React.useState<{ is_creator: boolean; role: string; posts_count: number } | null>(null);
	const [inviteCode, setInviteCode] = React.useState('');
	const [inviteNote, setInviteNote] = React.useState('');
	const [inviteList, setInviteList] = React.useState<Array<any>>([]);
	const [creatorMsg, setCreatorMsg] = React.useState('');
	const [creatorLoading, setCreatorLoading] = React.useState(false);

	React.useEffect(() => {
		apiFetch('/creator/status').then((d: any) => setCreatorStatus(d)).catch(() => {});
		if (user && (user.role === 'admin' || user.role === 'creator')) {
			apiFetch('/creator/invitations').then((d: any) => setInviteList(d.invitations || [])).catch(() => {});
		}
	}, [user]);

	async function redeemInvite() {
		setCreatorLoading(true);
		setCreatorMsg('');
		try {
			await apiFetch('/creator/redeem', {
				method: 'POST',
				headers: getSecurityHeaders('POST'),
				body: JSON.stringify({ code: inviteCode }),
			});
			setCreatorMsg('✓ 已升级为夜作者');
			setInviteCode('');
			apiFetch('/creator/status').then((d: any) => setCreatorStatus(d)).catch(() => {});
			if (user) {
				setUser({ ...user, role: 'creator' });
			}
		} catch (e: any) {
			setCreatorMsg(e?.message || '兑换失败');
		} finally {
			setCreatorLoading(false);
		}
	}

	async function generateInvite() {
		setCreatorLoading(true);
		setCreatorMsg('');
		try {
			const d = await apiFetch<{ code: string }>('/creator/invitations', {
				method: 'POST',
				headers: getSecurityHeaders('POST'),
				body: JSON.stringify({ note: inviteNote || null, expires_in_days: 0 }),
			});
			setCreatorMsg(`✓ 已生成邀请码：${d.code}`);
			setInviteNote('');
			apiFetch('/creator/invitations').then((d: any) => setInviteList(d.invitations || [])).catch(() => {});
		} catch (e: any) {
			setCreatorMsg(e?.message || '生成失败');
		} finally {
			setCreatorLoading(false);
		}
	}

	React.useEffect(() => {
		if (!user) {
			window.location.href = '/login';
		}
	}, [user]);

	React.useEffect(() => {
		if (!totpUri || !qrCanvasRef.current) return;
		QRCode.toCanvas(qrCanvasRef.current, totpUri).catch(() => {});
	}, [totpUri]);

	async function saveProfile() {
		if (!user) return;
		setError('');
		const err = username ? validateText(username, '用户名') : null;
		if (err) return setError(err);
		if (username.length > 20) return setError('用户名过长 (最多 20 字符)');

		// Only send/validate avatar_url when user actually changed it,
		// otherwise the existing identicon SVG data URL (which is >500 chars)
		// would incorrectly trigger the length check.
		const originalAvatar = user.avatar_url || '';
		const avatarChanged = avatarUrl !== originalAvatar;
		if (avatarChanged && avatarUrl && avatarUrl.length > 500) {
			return setError('头像 URL 过长 (最多 500 字符)');
		}

		setLoading(true);
		try {
			const payload: Record<string, unknown> = {
				username,
				email_notifications: emailNotifications
			};
			if (avatarChanged) {
				payload.avatar_url = avatarUrl;
			}
			if (gender !== (user.gender || '')) {
				payload.gender = gender || null;
			}

			const data = await apiFetch<{ user: User }>('/user/profile', {
				method: 'POST',
				headers: getSecurityHeaders('POST'),
				body: JSON.stringify(payload)
			});
			setUser(data.user);
			setUserState(data.user);
			alert('资料已更新');
		} catch (e: any) {
			setError(String(e?.message || e));
		} finally {
			setLoading(false);
		}
	}

	async function uploadAvatar(file: File) {
		if (!user) return;
		setError('');
		// allow larger avatar images (2MB)
		if (file.size > 2 * 1024 * 1024) return setError('文件过大 (最大 2MB)');

		const formData = new FormData();
		formData.append('file', file);
		formData.append('type', 'avatar');

		setLoading(true);
		try {
			const res = await fetch('/api/upload', {
				method: 'POST',
				headers: getSecurityHeaders('POST', null),
				body: formData
			});
			const data = (await res.json()) as any;
			if (!res.ok) throw new Error(data?.error || '上传失败');
			setAvatarUrl(data.url);
		} catch (e: any) {
			setError(String(e?.message || e));
		} finally {
			setLoading(false);
		}
	}

	async function requestEmailChange() {
		if (!user) return;
		setError('');
		if (!emailNew) return setError('请输入新邮箱');
		setLoading(true);
		try {
			await apiFetch('/user/change-email', {
				method: 'POST',
				headers: getSecurityHeaders('POST'),
				body: JSON.stringify({ new_email: emailNew, totp_code: emailTotp })
			});
			alert('验证邮件已发送至新地址，请前往新邮箱确认。');
			setEmailNew('');
			setEmailTotp('');
		} catch (e: any) {
			setError(String(e?.message || e));
		} finally {
			setLoading(false);
		}
	}

	async function startTotpSetup() {
		setError('');
		setLoading(true);
		try {
			const data = await apiFetch<{ secret: string; uri: string }>('/user/totp/setup', {
				method: 'POST',
				headers: getSecurityHeaders('POST'),
				body: JSON.stringify({})
			});
			setTotpSecret(data.secret);
			setTotpUri(data.uri);
		} catch (e: any) {
			setError(String(e?.message || e));
		} finally {
			setLoading(false);
		}
	}

	async function verifyTotp() {
		setError('');
		setLoading(true);
		try {
			await apiFetch('/user/totp/verify', {
				method: 'POST',
				headers: getSecurityHeaders('POST'),
				body: JSON.stringify({ token: totpCode })
			});
			if (user) {
				const updated = { ...user, totp_enabled: true };
				setUser(updated);
				setUserState(updated);
			}
			setTotpSecret('');
			setTotpUri('');
			setTotpCode('');
			alert('2FA 已启用');
		} catch (e: any) {
			setError(String(e?.message || e));
		} finally {
			setLoading(false);
		}
	}

	async function deleteAccount() {
		if (!user) return;
		setError('');
		if (!confirm('确定要删除您的账号吗？此操作无法撤销。')) return;
		setLoading(true);
		try {
			await apiFetch('/user/delete', {
				method: 'POST',
				headers: getSecurityHeaders('POST'),
				body: JSON.stringify({ password: deletePassword, totp_code: deleteTotp })
			});
			logout();
			window.location.href = '/';
		} catch (e: any) {
			setError(String(e?.message || e));
		} finally {
			setLoading(false);
		}
	}

	return (
		<PageShell>
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-semibold tracking-tight">设置</h1>
						<p className="text-sm text-muted-foreground">对账号资料、邮箱和 2FA 进行管理。</p>
					</div>
					<Button
						variant="outline"
						onClick={() => {
							logout();
							window.location.href = '/';
						}}
					>
						退出登录
					</Button>
				</div>

				{error ? <div className="rounded-md border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive">{error}</div> : null}

				<Card>
					<CardHeader>
						<CardTitle>个人资料</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid gap-4 sm:grid-cols-2">
							<div className="space-y-2">
								<Label htmlFor="profile-username">用户名</Label>
								<Input id="profile-username" value={username} onChange={(e) => setUsername(e.target.value)} maxLength={20} />
							</div>
							<div className="space-y-2">
								<Label htmlFor="profile-avatar">头像 URL</Label>
								<Input id="profile-avatar" value={avatarUrl || ''} onChange={(e) => setAvatarUrl(e.target.value)} />
							</div>
						</div>

						<div className="space-y-2">
							<Label>身份 <span className="text-xs text-muted-foreground">（她的 / 他的，决定「晚妆」落字权）</span></Label>
							<div className="grid grid-cols-2 gap-2">
								<button
									type="button"
									onClick={() => setGender('female')}
									className={`rounded-md border px-3 py-2 text-sm transition ${gender === 'female' ? 'border-fuchsia-500 bg-fuchsia-500/10 text-fuchsia-200' : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted/60'}`}
								>
									她的
								</button>
								<button
									type="button"
									onClick={() => setGender('male')}
									className={`rounded-md border px-3 py-2 text-sm transition ${gender === 'male' ? 'border-sky-500 bg-sky-500/10 text-sky-200' : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted/60'}`}
								>
									他的
								</button>
								{gender ? (
									<button
										type="button"
										onClick={() => setGender('')}
										className="col-span-2 mt-1 text-xs text-muted-foreground hover:underline"
									>
										清除身份
									</button>
								) : null}
							</div>
						</div>

						<div className="space-y-2">
							<Label htmlFor="avatar-file">上传头像 (最大 500KB)</Label>
							<Input
								id="avatar-file"
								type="file"
								accept="image/*"
								onChange={(e) => {
									const f = e.target.files?.[0];
									if (f) uploadAvatar(f);
									e.target.value = '';
								}}
							/>
						</div>

						<label className="flex items-center gap-2 text-sm">
							<input
								type="checkbox"
								className="h-4 w-4"
								checked={emailNotifications}
								onChange={(e) => setEmailNotifications(e.target.checked)}
							/>
							接收邮件通知 (仅限评论)
						</label>

						<Button onClick={saveProfile} disabled={loading}>
							{loading ? '保存中...' : '保存资料'}
						</Button>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>修改邮箱</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid gap-4 sm:grid-cols-2">
							<div className="space-y-2">
								<Label htmlFor="email-new">新邮箱地址</Label>
								<Input id="email-new" type="email" value={emailNew} onChange={(e) => setEmailNew(e.target.value)} />
							</div>
							<div className="space-y-2">
								<Label htmlFor="email-totp">双重验证码 (若开启)</Label>
								<Input
									id="email-totp"
									type="text"
									inputMode="numeric"
									maxLength={6}
									autoComplete="one-time-code"
									value={emailTotp}
									onChange={(e) => setEmailTotp(e.target.value)}
								/>
							</div>
						</div>
						<Button onClick={requestEmailChange} disabled={loading}>
							{loading ? '处理中...' : '发送确认邮件'}
						</Button>
						<div className="text-sm text-muted-foreground">确认链接将发送到新邮箱。</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>双重验证 (2FA)</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						{user?.totp_enabled ? (
							<div className="rounded-md border bg-muted/30 p-3 text-sm">✅ 2FA 已启用</div>
						) : (
							<>
								<div className="text-sm text-muted-foreground">启用 2FA 以保护您的账户。</div>
								<Button onClick={startTotpSetup} disabled={loading || !!totpSecret}>
									{loading ? '处理中...' : '开始启用'}
								</Button>
								{totpSecret ? (
									<div className="space-y-3 rounded-md border p-4">
										<div className="text-sm font-medium">1. 扫描二维码</div>
										<canvas ref={qrCanvasRef} />
										<div className="text-sm text-muted-foreground">或手动输入密钥：{totpSecret}</div>
										<Separator />
										<div className="text-sm font-medium">2. 输入验证码</div>
										<div className="flex flex-wrap items-center gap-2">
											<Input
												value={totpCode}
												onChange={(e) => setTotpCode(e.target.value)}
												placeholder="000000"
												maxLength={6}
												autoComplete="one-time-code"
												className="w-32"
											/>
											<Button onClick={verifyTotp} disabled={loading}>
												{loading ? '验证中...' : '验证并启用'}
											</Button>
										</div>
									</div>
								) : null}
							</>
						)}
					</CardContent>
				</Card>

				<Card className="border-violet-500/30 bg-gradient-to-br from-violet-950/20 to-fuchsia-950/20">
				<CardHeader>
					<CardTitle className="text-violet-200 flex items-center gap-2">
						<span className="inline-block h-2 w-2 rounded-full bg-fuchsia-400" />
						夜作者 · Creator
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					{creatorStatus?.is_creator ? (
						<>
							<div className="rounded-md border border-violet-500/30 bg-violet-500/5 p-3 text-sm">
								<div className="flex items-center gap-2 text-violet-200">
									<span className="font-serif">✦ 夜作者</span>
									<span className="text-xs text-violet-300/60">已激活</span>
								</div>
								<div className="mt-1 text-xs text-violet-300/60">
									已发布 {creatorStatus.posts_count} 篇 · 你可以生成邀请码邀请其他创作者
								</div>
							</div>

							<div className="space-y-2">
								<Label>生成邀请码</Label>
								<Input
									placeholder="备注（可选，给谁用的）"
									value={inviteNote}
									onChange={(e) => setInviteNote(e.target.value)}
								/>
								<Button onClick={generateInvite} disabled={creatorLoading} variant="outline" className="border-violet-500/40 text-violet-200 hover:bg-violet-500/10">
									生成新邀请码
								</Button>
							</div>

							{inviteList.length > 0 && (
								<div className="space-y-1">
									<div className="text-xs text-muted-foreground">已生成的邀请码</div>
									{inviteList.map((inv: any) => (
										<div key={inv.code} className="flex items-center justify-between rounded border border-border bg-muted/30 px-3 py-2 text-sm">
											<div>
												<code className="font-mono text-violet-200">{inv.code}</code>
												{inv.note && <span className="ml-2 text-xs text-muted-foreground">· {inv.note}</span>}
											</div>
											<div className="text-xs">
												{inv.used_by ? (
													<span className="text-amber-400">已被 {inv.used_username || '未知'} 使用</span>
												) : (
													<span className="text-emerald-400">未使用</span>
												)}
											</div>
										</div>
									))}
								</div>
							)}
						</>
					) : (
						<div className="space-y-3">
							<div className="text-sm text-muted-foreground">
								夜作者是邀请制创作者身份，拥有专属徽章与发帖权限加成。如果你有邀请码，可以在此兑换。
							</div>
							<div className="space-y-2">
								<Label htmlFor="invite-code">邀请码</Label>
								<Input
									id="invite-code"
									placeholder="8 位大写字母/数字"
									value={inviteCode}
									onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
									maxLength={8}
								/>
								<Button onClick={redeemInvite} disabled={creatorLoading || inviteCode.length !== 8}>
									兑换
								</Button>
							</div>
						</div>
					)}
					{creatorMsg && <div className="text-xs text-violet-300">{creatorMsg}</div>}
				</CardContent>
			</Card>

			<Card className="border-destructive/40">
					<CardHeader>
						<CardTitle className="text-destructive">危险区域</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="text-sm text-muted-foreground">删除账号后无法恢复。</div>
						<div className="grid gap-4 sm:grid-cols-2">
							<div className="space-y-2">
								<Label htmlFor="delete-password">密码</Label>
								<Input
									id="delete-password"
									type="password"
									autoComplete="current-password"
									value={deletePassword}
									onChange={(e) => setDeletePassword(e.target.value)}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="delete-totp">双重验证码 (若开启)</Label>
								<Input
									id="delete-totp"
									type="text"
									inputMode="numeric"
									maxLength={6}
									autoComplete="one-time-code"
									value={deleteTotp}
									onChange={(e) => setDeleteTotp(e.target.value)}
								/>
							</div>
						</div>
						<Button variant="destructive" onClick={deleteAccount} disabled={loading}>
							{loading ? '处理中...' : '删除账号'}
						</Button>
					</CardContent>
				</Card>
			</div>
		</PageShell>
	);
}
