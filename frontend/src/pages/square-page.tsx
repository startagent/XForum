import * as React from 'react';
import { ChevronDown, ChevronUp, Eye, EyeOff, Flame, Heart, MessageCircle, Moon, Lock, Sparkles, User } from 'lucide-react';

import { PageShell } from '@/components/page-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { apiFetch, formatDate, getSecurityHeaders, type Post } from '@/lib/api';
import { getToken, getUser } from '@/lib/auth';
import { attachFancybox, highlightCodeBlocks, renderMarkdownToHtml } from '@/lib/markdown';

interface SquareInfo {
	id: number;
	name: string;
	slug: string;
	description?: string;
	icon?: string;
}

interface StoredUser {
	id: number;
	username: string;
	email?: string;
	avatar_url?: string | null;
	role?: string;
	gender?: string | null;
}

const SQUARE_META: Record<string, { tagline: string; gradient: string; iconColor: string; Icon: React.ComponentType<{ className?: string }>; femaleOnly?: boolean }> = {
	notes: {
		tagline: '枕边的字，写给自己，也写给不想睡的人',
		gradient: 'from-[#0B0F1E] via-[#13102B] to-[#1A1B3E]',
		iconColor: 'text-violet-300',
		Icon: Moon,
	},
	treehole: {
		tagline: '说给不会说出去的人听，他若听见，便算你赢',
		gradient: 'from-[#0B0F1E] via-[#0F1320] to-[#1A0B2E]',
		iconColor: 'text-slate-300',
		Icon: Lock,
	},
	gaze: {
		tagline: '妆化好了，灯也调低了，只差一个不在场的人',
		gradient: 'from-[#1A0F1E] via-[#1A0B2E] to-[#2E1B3A]',
		iconColor: 'text-amber-300',
		Icon: Eye,
		femaleOnly: true,
	},
	soul: {
		tagline: '灵魂的另一面，留在这里，等一个认得的人',
		gradient: 'from-[#0B0F1E] via-[#1B0B2E] to-[#2E0B3A]',
		iconColor: 'text-fuchsia-300',
		Icon: Sparkles,
	},
	salon: {
		tagline: '留个暗号，等一个人对上来',
		gradient: 'from-[#1E0B15] via-[#2E0B1F] to-[#3A0B2E]',
		iconColor: 'text-rose-300',
		Icon: Flame,
	},
};

function getSlugFromUrl(): string {
	const match = window.location.pathname.match(/\/square\/([a-z]+)/);
	return match ? match[1] : 'notes';
}

function getCoverImageUrl(content: string): string | null {
	const html = renderMarkdownToHtml(content || '');
	const imgMatch = html.match(/<img[^>]+src="([^"]+)"/);
	return imgMatch ? imgMatch[1] : null;
}

export function SquarePage() {
	const slug = getSlugFromUrl();
	const meta = SQUARE_META[slug] || SQUARE_META.notes;
	const [info, setInfo] = React.useState<SquareInfo | null>(null);
	const [posts, setPosts] = React.useState<Post[]>([]);
	const [loading, setLoading] = React.useState(true);
	const [error, setError] = React.useState('');

	// 发帖
	const [createOpen, setCreateOpen] = React.useState(false);
	const [newTitle, setNewTitle] = React.useState('');
	const [newContent, setNewContent] = React.useState('');
	const [newCategoryId, setNewCategoryId] = React.useState('');
	const [createError, setCreateError] = React.useState('');
	const [previewOpen, setPreviewOpen] = React.useState(false);
	const newContentRef = React.useRef<HTMLTextAreaElement>(null);

	const token = getToken();
	const user = React.useMemo<StoredUser | null>(() => getUser() as StoredUser | null, [token]);

	// 晚妆板块限女性发帖
	const canPost = !meta.femaleOnly || (user?.gender === 'female');
	const femaleOnlyHint = meta.femaleOnly && !canPost;

	async function fetchSquare() {
		setLoading(true);
		setError('');
		try {
			const squareInfo = await apiFetch<SquareInfo>(`/square/${slug}`);
			setInfo(squareInfo);
			setNewCategoryId(String(squareInfo.id));
			const data = await apiFetch<{ posts: Post[] }>(`/posts?category_id=${squareInfo.id}&limit=20`);
			setPosts(data.posts || []);
		} catch (e: any) {
			setError(String(e?.message || e));
		} finally {
			setLoading(false);
		}
	}

	React.useEffect(() => {
		void fetchSquare();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [slug]);

	React.useEffect(() => {
		if (!previewOpen) return;
		const root = document.querySelector('.prose-invert');
		attachFancybox(root as HTMLElement | null);
		highlightCodeBlocks(root);
	}, [previewOpen, newContent]);

	async function createPost(e: React.FormEvent) {
		e.preventDefault();
		setCreateError('');
		if (!newTitle.trim() || !newContent.trim()) {
			setCreateError('标题和内容不能为空');
			return;
		}
		try {
			await apiFetch('/posts', {
				method: 'POST',
				headers: getSecurityHeaders('POST'),
				body: JSON.stringify({ title: newTitle, content: newContent, category_id: Number(newCategoryId) || null }),
			});
			setNewTitle('');
			setNewContent('');
			setCreateOpen(false);
			void fetchSquare();
		} catch (e: any) {
			setCreateError(String(e?.message || e));
		}
	}

	return (
		<PageShell>
			<div className="mx-auto max-w-3xl space-y-6">
				{/* 板块 Hero */}
				<section className={`relative overflow-hidden rounded-xl border border-violet-900/30 bg-gradient-to-br ${meta.gradient} px-6 py-8 sm:px-10`}>
					<div className="pointer-events-none absolute -top-8 -right-8 h-32 w-32 rounded-full bg-violet-600/20 blur-3xl" />
					<div className="relative space-y-3">
						<a href="/" className="text-[11px] tracking-[0.2em] text-violet-300/70 uppercase hover:text-violet-200">
							← 未眠
						</a>
						<div className="flex items-center gap-3">
							<meta.Icon className={`h-6 w-6 ${meta.iconColor}`} />
							<h1 className="font-serif text-3xl text-violet-50">{info?.name || '加载中'}</h1>
						</div>
						<p className="text-sm text-violet-100/70">{info?.description || meta.tagline}</p>
					</div>
				</section>

				{error ? <div className="rounded-md border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive">{error}</div> : null}

				{/* 发帖 */}
				{!user ? (
					<Card className="border-violet-900/30 bg-gradient-to-br from-[#0B0F1E]/95 via-[#13102B]/95 to-[#1A0B2E]/95 text-violet-50 backdrop-blur">
						<CardContent className="py-6 text-center text-sm text-violet-200/70 font-serif">
							<a href="/login.html" className="text-fuchsia-300 hover:underline">登入</a> 之后，再把字落下。
						</CardContent>
					</Card>
				) : femaleOnlyHint ? (
					<Card className="border-amber-900/30 bg-gradient-to-br from-[#1A0F1E]/95 via-[#2A0B2E]/95 to-[#3A1B2E]/95 text-amber-50 backdrop-blur">
						<CardContent className="space-y-2 py-6 text-center">
							<p className="text-sm font-serif text-amber-100/90">「晚妆」是她的妆台</p>
							<p className="text-xs text-amber-200/60">男士请到一旁欣赏——点赞、送花，皆可，但妆，由她来化。</p>
						</CardContent>
					</Card>
				) : (
					<Card className="border-violet-900/30 bg-gradient-to-br from-[#0B0F1E]/95 via-[#13102B]/95 to-[#1A0B2E]/95 text-violet-50 backdrop-blur">
						<CardHeader>
							<CardTitle className="flex items-center justify-between gap-2 font-serif text-violet-100">
								<span>写下今夜</span>
								<Button type="button" variant="outline" size="sm" onClick={() => setCreateOpen((v) => !v)} className="border-violet-500/30 bg-white/5 text-violet-100 hover:bg-violet-500/10">
									{createOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
									<span className="sr-only">{createOpen ? '收起' : '展开'}</span>
								</Button>
							</CardTitle>
						</CardHeader>
						<CardContent>
							{!createOpen ? (
								<div className="text-sm text-violet-200/60">夜深了，把另一个自己写出来。</div>
							) : (
								<form className="space-y-4" onSubmit={createPost}>
									{createError ? <div className="rounded-md border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive">{createError}</div> : null}
									<div className="space-y-2">
										<Label htmlFor="new-title" className="text-violet-100">标题</Label>
										<Input id="new-title" maxLength={30} value={newTitle} onChange={(e) => setNewTitle(e.target.value)} required className="border-violet-500/30 bg-white/5 text-violet-50" />
									</div>
									<div className="space-y-2">
										<div className="flex items-center justify-between">
											<Label htmlFor="new-content" className="text-violet-100">内容 (支持 Markdown)</Label>
											<Button type="button" variant="outline" size="sm" onClick={() => setPreviewOpen((v) => !v)} className="border-violet-500/30 bg-white/5 text-violet-100 hover:bg-violet-500/10">
												{previewOpen ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
												<span className="sr-only">{previewOpen ? '关闭预览' : '打开预览'}</span>
											</Button>
										</div>
										<div className={previewOpen ? 'grid gap-3 lg:grid-cols-2' : 'space-y-2'}>
											<Textarea
												id="new-content"
												ref={newContentRef}
												value={newContent}
												onChange={(e) => setNewContent(e.target.value)}
												rows={10}
												className="min-h-[220px] border-violet-500/30 bg-white/5 text-violet-50"
												required
											/>
											{previewOpen ? (
												<div className="prose prose-invert max-w-none rounded-md border border-violet-500/20 bg-white/5 p-3 text-sm" dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(newContent) }} />
											) : null}
										</div>
									</div>
									<Button type="submit" className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500">
										发布
									</Button>
								</form>
							)}
						</CardContent>
					</Card>
				)}

				{/* 帖子列表 */}
				<div className="space-y-4">
					{loading ? (
						<Card className="border-violet-900/30 bg-gradient-to-br from-[#0B0F1E]/95 via-[#13102B]/95 to-[#1A0B2E]/95 text-violet-50 backdrop-blur">
							<CardContent className="py-6 text-sm text-violet-200/60">未眠者正在醒来...</CardContent>
						</Card>
					) : posts.length === 0 ? (
						<Card className="border-violet-900/30 bg-gradient-to-br from-[#0B0F1E]/95 via-[#13102B]/95 to-[#1A0B2E]/95 text-violet-50 backdrop-blur">
							<CardContent className="py-8 text-center text-sm text-violet-200/60 font-serif">这里还没有故事</CardContent>
						</Card>
					) : (
						posts.map((p) => {
							const coverUrl = getCoverImageUrl(p.content || '');
							return (
								<Card key={p.id} className="group relative overflow-hidden border-violet-900/30 bg-gradient-to-br from-[#0B0F1E]/95 via-[#13102B]/95 to-[#1A0B2E]/95 text-violet-50 backdrop-blur transition hover:border-violet-500/50 hover:shadow-lg hover:shadow-violet-900/20">
									<div className="pointer-events-none absolute -top-8 -right-8 h-32 w-32 rounded-full bg-violet-600/10 blur-2xl opacity-0 transition group-hover:opacity-100" />
									<CardContent className="relative py-5">
										<div className="flex gap-4">
											{coverUrl ? (
												<img src={coverUrl} alt="" className="h-20 w-28 shrink-0 rounded-md object-cover ring-1 ring-violet-500/20" loading="lazy" referrerPolicy="no-referrer" />
											) : null}
											<div className="min-w-0 flex-1 space-y-1.5">
												<a className="truncate font-serif text-lg text-violet-50 transition hover:text-fuchsia-200 hover:underline" href={`/posts/${p.id}`}>
													{p.title}
												</a>
												<div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-violet-200/60">
													<span className="inline-flex items-center gap-2">
														{p.author_avatar ? (
															<img src={p.author_avatar} alt="" className="h-6 w-6 rounded-full object-cover ring-1 ring-violet-500/20" loading="lazy" referrerPolicy="no-referrer" />
														) : (
															<span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-violet-900/40 text-[10px] text-violet-200">
																<User className="h-4 w-4" />
															</span>
														)}
														<span className="truncate text-violet-100">{p.author_name}</span>
													</span>
													<span>·</span>
													<span className="whitespace-nowrap">{formatDate(p.created_at)}</span>
												</div>
												<div className="flex items-center gap-4 text-xs text-violet-300/70">
													<span className="inline-flex items-center gap-1" title="心动">
														<Heart className="h-3.5 w-3.5 text-rose-400" />
														<span className="text-violet-200/80">{p.like_count || 0}</span>
													</span>
													<span className="inline-flex items-center gap-1" title="回响">
														<MessageCircle className="h-3.5 w-3.5 text-sky-400" />
														<span className="text-violet-200/80">{p.comment_count || 0}</span>
													</span>
													<span className="inline-flex items-center gap-1" title="凝视">
														<Eye className="h-3.5 w-3.5 text-amber-300" />
														<span className="text-violet-200/80">{p.view_count || 0}</span>
													</span>
												</div>
											</div>
										</div>
									</CardContent>
								</Card>
							);
						})
					)}
				</div>
			</div>
		</PageShell>
	);
}
