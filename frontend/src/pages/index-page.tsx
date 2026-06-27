import * as React from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Compass, Eye, EyeOff, Flame, Heart, Lock, MessageCircle, Moon, MoreVertical, Pin, RefreshCw, Search, Shield, Sparkles, Trash2, User, X, ArrowRight } from 'lucide-react';

import { TurnstileWidget } from '@/components/turnstile';
import { PageShell } from '@/components/page-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useConfig } from '@/hooks/use-config';
import { apiFetch, formatDate, getSecurityHeaders, type Category, type Post } from '@/lib/api';
import { getToken, getUser } from '@/lib/auth';
import { attachFancybox, highlightCodeBlocks, renderMarkdownToHtml } from '@/lib/markdown';
import { validateText } from '@/lib/validators';

// 8 种灵魂人格（与后端 /api/soul/types 对应）
const SOUL_TYPES_PREVIEW = [
	{ code: 'FL', name: '炽夜玫瑰', color: '#E11D48' },
	{ code: 'NH', name: '暗夜猎手', color: '#9D174D' },
	{ code: 'SR', name: '书房尤物', color: '#B45309' },
	{ code: 'IS', name: '私语者', color: '#6366F1' },
	{ code: 'MB', name: '镜中困兽', color: '#A21CAF' },
	{ code: 'MO', name: '月下凝眸', color: '#F59E0B' },
	{ code: 'ST', name: '静水深流', color: '#64748B' },
	{ code: 'TW', name: '薄暮之人', color: '#8B5CF6' },
];

const TONES_PREVIEW = [
	{ code: 'ash', name: '晨灰', hex: '#9CA3AF' },
	{ code: 'gold', name: '午金', hex: '#F59E0B' },
	{ code: 'dusk', name: '暮紫', hex: '#A855F7' },
	{ code: 'ink', name: '夜墨', hex: '#1E1B4B' },
	{ code: 'rose', name: '欲红', hex: '#E11D48' },
	{ code: 'blue', name: '寂蓝', hex: '#3B82F6' },
];

const CONTRAST_LEVELS = ['端庄', '微光', '薄暮', '暗涌', '反差', '炽夜'];

function soul_name_badge(name: string | null): React.ReactNode {
	if (!name) return null;
	return (
		<span className="ml-auto flex items-center gap-1 text-fuchsia-300/70">
			<Sparkles className="h-3 w-3" />
			{name}
		</span>
	);
}

export function IndexPage() {
	const { config } = useConfig();
	const token = getToken();
	const user = React.useMemo(() => getUser(), [token]);
	const [banner, setBanner] = React.useState<string>('');
	const [categories, setCategories] = React.useState<Category[]>([]);
	const [selectedCategory, setSelectedCategory] = React.useState<string>('');
	const [searchInput, setSearchInput] = React.useState<string>('');
	const [searchQuery, setSearchQuery] = React.useState<string>('');
	const [posts, setPosts] = React.useState<Post[]>([]);
	const [totalPosts, setTotalPosts] = React.useState<number>(0);
	const [pageOffset, setPageOffset] = React.useState<number>(0);
	const [loading, setLoading] = React.useState<boolean>(true);
	const [error, setError] = React.useState<string>('');
	const pageLimit = 10;
	const [jumpTo, setJumpTo] = React.useState<string>('');

	const [newTitle, setNewTitle] = React.useState('');
	const [newContent, setNewContent] = React.useState('');
	const [newCategoryId, setNewCategoryId] = React.useState<string>('');
	const [previewOpen, setPreviewOpen] = React.useState(true);
	const [createOpen, setCreateOpen] = React.useState(false);
	const [createLoading, setCreateLoading] = React.useState(false);
	const [createError, setCreateError] = React.useState('');
	const [uploadLoading, setUploadLoading] = React.useState(false);
	const [uploadError, setUploadError] = React.useState('');

	// 灵魂测定统计（公开数据，用于首页灯火墙）
	const [soulStats, setSoulStats] = React.useState<{ total: number; by_type: Array<{ code: string; name: string; count: number }>; by_tone: Array<{ tone: string; count: number }> } | null>(null);

	// 今夜精选：按反差等级 + 点赞排序的帖子
	type FeaturedPost = {
		id: number; title: string; excerpt: string | null;
		category_slug: string; category_name: string;
		author_id: number; username: string; avatar_url: string | null;
		likes_count: number; comments_count: number; views_count: number;
		contrast_level: number | null; soul_name: string | null;
		created_at: string;
	};
	const [featured, setFeatured] = React.useState<FeaturedPost[]>([]);

	React.useEffect(() => {
		apiFetch<{ total: number; by_type: Array<{ code: string; name: string; count: number }>; by_tone: Array<{ tone: string; count: number }> }>('/soul/stats')
			.then(setSoulStats)
			.catch(() => {});
		apiFetch<{ posts: FeaturedPost[] }>('/posts/featured?limit=6')
			.then((r) => setFeatured(r.posts || []))
			.catch(() => {});
	}, []);

	// insert text at current cursor position in the textarea (or append)
	function insertIntoContent(insertText: string) {
		if (newContentRef.current) {
			const el = newContentRef.current;
			const start = el.selectionStart;
			const end = el.selectionEnd;
			const before = newContent.slice(0, start);
			const after = newContent.slice(end);
			const updated = before + insertText + after;
			setNewContent(updated);
			// reposition cursor immediately after inserted text
			setTimeout(() => {
				el.selectionStart = el.selectionEnd = start + insertText.length;
				el.focus();
			}, 0);
		} else {
			setNewContent(newContent + insertText);
		}
	}

	function applyEdit(transform: (text: string, start: number, end: number) => { text: string; selectionStart: number; selectionEnd: number }) {
		const el = newContentRef.current;
		const start = el ? el.selectionStart : newContent.length;
		const end = el ? el.selectionEnd : newContent.length;
		const result = transform(newContent, start, end);
		setNewContent(result.text);
		setTimeout(() => {
			const target = newContentRef.current;
			if (!target) return;
			target.selectionStart = result.selectionStart;
			target.selectionEnd = result.selectionEnd;
			target.focus();
		}, 0);
	}

	function wrapSelection(prefix: string, suffix: string, placeholder: string) {
		applyEdit((text, start, end) => {
			const selected = text.slice(start, end) || placeholder;
			const next = text.slice(0, start) + prefix + selected + suffix + text.slice(end);
			const selectionStart = start + prefix.length;
			const selectionEnd = selectionStart + selected.length;
			return { text: next, selectionStart, selectionEnd };
		});
	}

	function wrapBlock(fence: string) {
		applyEdit((text, start, end) => {
			const selected = text.slice(start, end);
			const block = `${fence}\n${selected}\n${fence}`;
			const next = text.slice(0, start) + block + text.slice(end);
			const selectionStart = start + fence.length + 1;
			const selectionEnd = selectionStart + selected.length;
			return { text: next, selectionStart, selectionEnd };
		});
	}

	function transformLines(transform: (line: string, index: number, lines: string[]) => string) {
		applyEdit((text, start, end) => {
			const lineStart = text.lastIndexOf('\n', start - 1) + 1;
			const lineEnd = text.indexOf('\n', end);
			const endIndex = lineEnd === -1 ? text.length : lineEnd;
			const segment = text.slice(lineStart, endIndex);
			const lines = segment.split('\n');
			const nextSegment = lines.map(transform).join('\n');
			const next = text.slice(0, lineStart) + nextSegment + text.slice(endIndex);
			return { text: next, selectionStart: lineStart, selectionEnd: lineStart + nextSegment.length };
		});
	}

	function setHeading(level: number) {
		transformLines((line) => {
			const cleaned = line.replace(/^\s{0,3}#{1,6}\s+/, '');
			if (level === 0) return cleaned;
			return `${'#'.repeat(level)} ${cleaned}`;
		});
	}

	function toggleLinePrefix(prefix: string, matcher: RegExp) {
		transformLines((line) => {
			if (matcher.test(line)) return line.replace(matcher, '');
			return `${prefix}${line}`;
		});
	}

	function toggleBlockquote() {
		transformLines((line) => (line.startsWith('> ') ? line.slice(2) : `> ${line}`));
	}

	function toggleList(ordered: boolean) {
		transformLines((line, index, lines) => {
			if (ordered) {
				if (/^\d+\.\s+/.test(line)) return line.replace(/^\d+\.\s+/, '');
				return `${index + 1}. ${line}`;
			}
			if (/^[-*+]\s+/.test(line)) return line.replace(/^[-*+]\s+/, '');
			return `- ${line}`;
		});
	}

	function indentLines() {
		transformLines((line) => `  ${line}`);
	}

	function outdentLines() {
		transformLines((line) => line.replace(/^(\t| {1,2})/, ''));
	}

	function insertLink(isImage: boolean) {
		applyEdit((text, start, end) => {
			const selected = text.slice(start, end) || (isImage ? 'alt' : 'text');
			const link = isImage ? `![${selected}](url)` : `[${selected}](url)`;
			const next = text.slice(0, start) + link + text.slice(end);
			const urlStart = start + (isImage ? 2 : 1) + selected.length + 2;
			const urlEnd = urlStart + 3;
			return { text: next, selectionStart: urlStart, selectionEnd: urlEnd };
		});
	}

	function insertTable() {
		applyEdit((text, start, end) => {
			const table = `| Header | Header |\n| --- | --- |\n| Cell | Cell |`;
			const next = text.slice(0, start) + table + text.slice(end);
			const selectionStart = start + 2;
			const selectionEnd = selectionStart + 6;
			return { text: next, selectionStart, selectionEnd };
		});
	}

	function handleEditorKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
		const isMod = e.ctrlKey || e.metaKey;
		if (!isMod) return;
		const key = e.key.toLowerCase();
		const shift = e.shiftKey;
		if (!shift && key === 'b') {
			e.preventDefault();
			wrapSelection('**', '**', 'text');
			return;
		}
		if (!shift && key === 'i') {
			e.preventDefault();
			wrapSelection('*', '*', 'text');
			return;
		}
		if (!shift && key === 'u') {
			e.preventDefault();
			wrapSelection('<u>', '</u>', 'text');
			return;
		}
		if (!shift && key === 'k') {
			e.preventDefault();
			insertLink(false);
			return;
		}
		if (!shift && key === 't') {
			e.preventDefault();
			insertTable();
			return;
		}
		if (shift && key === 'i') {
			e.preventDefault();
			insertLink(true);
			return;
		}
		if (!shift && key === '0') {
			e.preventDefault();
			setHeading(0);
			return;
		}
		if (!shift && key === '1') {
			e.preventDefault();
			setHeading(1);
			return;
		}
		if (!shift && key === '2') {
			e.preventDefault();
			setHeading(2);
			return;
		}
		if (!shift && key === '3') {
			e.preventDefault();
			setHeading(3);
			return;
		}
		if (shift && key === 'k') {
			e.preventDefault();
			wrapBlock('```');
			return;
		}
		if (shift && key === 'm') {
			e.preventDefault();
			wrapBlock('$$');
			return;
		}
		if (shift && key === 'q') {
			e.preventDefault();
			toggleBlockquote();
			return;
		}
		if (shift && key === '[') {
			e.preventDefault();
			toggleList(true);
			return;
		}
		if (shift && key === ']') {
			e.preventDefault();
			toggleList(false);
			return;
		}
		if (!shift && key === '[') {
			e.preventDefault();
			outdentLines();
			return;
		}
		if (!shift && key === ']') {
			e.preventDefault();
			indentLines();
			return;
		}
		if (shift && (e.code === 'Backquote' || key === '`')) {
			e.preventDefault();
			wrapSelection('`', '`', 'code');
			return;
		}
		if (e.altKey && shift && e.code === 'Digit5') {
			e.preventDefault();
			wrapSelection('~~', '~~', 'text');
			return;
		}
	}
	const [turnstileToken, setTurnstileToken] = React.useState('');
	const [turnstileResetKey, setTurnstileResetKey] = React.useState(0);
	const previewRef = React.useRef<HTMLDivElement | null>(null);
	const newContentRef = React.useRef<HTMLTextAreaElement | null>(null);
	const [adminMenuPostId, setAdminMenuPostId] = React.useState<number | null>(null);
	const [adminActionPostId, setAdminActionPostId] = React.useState<number | null>(null);
	const [sortOption, setSortOption] = React.useState('time_desc');
	const listTopRef = React.useRef<HTMLDivElement | null>(null);
	const lastOffsetRef = React.useRef<number | null>(null);

	const enabled = !!config?.turnstile_enabled;
	const siteKey = config?.turnstile_site_key || '';
	const turnstileActive = enabled && !!siteKey;

	const fetchCategories = React.useCallback(async () => {
		try {
			const list = await apiFetch<Category[]>('/categories');
			setCategories(list);
		} catch {
			setCategories([]);
		}
	}, []);

	const fetchPosts = React.useCallback(
		async (offset: number) => {
			setLoading(true);
			setError('');
			try {
				const sortBy =
					sortOption === 'likes_desc'
						? 'likes'
						: sortOption === 'comments_desc'
							? 'comments'
							: sortOption === 'views_desc'
								? 'views'
								: 'time';
				const sortDir = sortOption === 'time_asc' ? 'asc' : 'desc';
				const categoryParam = selectedCategory ? `&category_id=${encodeURIComponent(selectedCategory)}` : '';
				const searchParam = searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : '';
				const sortParam = `&sort_by=${encodeURIComponent(sortBy)}&sort_dir=${encodeURIComponent(sortDir)}`;
				const res = await fetch(`/api/posts?limit=${pageLimit}&offset=${offset}${categoryParam}${searchParam}${sortParam}`);
				if (!res.ok) {
					let msg = `加载帖子失败 (${res.status})`;
					try {
						const body = await res.text();
						if (body) msg += `: ${body}`;
					} catch {}
					throw new Error(msg);
				}
				const data = (await res.json()) as any;
				const list: Post[] = Array.isArray(data) ? data : (data.posts as Post[]);
				const total = Array.isArray(data) ? list.length : Number(data.total || 0);

				const processed = list.map((p) => ({
					...p,
					like_count: p.like_count || 0,
					comment_count: p.comment_count || 0
				}));

				setPosts(processed);
				setTotalPosts(total);
				setPageOffset(offset);
			} catch (e: any) {
				setError(String(e?.message || e));
			} finally {
				setLoading(false);
			}
		},
		[selectedCategory, searchQuery, sortOption]
	);

	React.useEffect(() => {
		fetchCategories();
	}, [fetchCategories]);

	React.useEffect(() => {
		fetchPosts(0);
	}, [fetchPosts]);

	React.useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		if (params.get('verified') === 'true') {
			setBanner('邮箱验证成功，现在可以登录。');
			params.delete('verified');
			window.history.replaceState({}, document.title, `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`);
		} else if (params.get('email_changed') === 'true') {
			setBanner('邮箱更换成功。');
			params.delete('email_changed');
			window.history.replaceState({}, document.title, `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`);
		}
	}, []);

	React.useEffect(() => {
		if (!previewOpen) return;
		const el = previewRef.current;
		if (!el) return;
		highlightCodeBlocks(el);
		const cleanup = attachFancybox(el);
		return cleanup;
	}, [previewOpen, newContent]);

	React.useEffect(() => {
		if (adminMenuPostId == null) return;
		function close() {
			setAdminMenuPostId(null);
		}
		document.addEventListener('mousedown', close);
		document.addEventListener('touchstart', close);
		return () => {
			document.removeEventListener('mousedown', close);
			document.removeEventListener('touchstart', close);
		};
	}, [adminMenuPostId]);

	React.useEffect(() => {
		if (lastOffsetRef.current !== null && lastOffsetRef.current !== pageOffset && !loading) {
			listTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}
		lastOffsetRef.current = pageOffset;
	}, [pageOffset, loading]);

	async function adminTogglePin(post: Post) {
		if (!user || user.role !== 'admin') return;
		setAdminActionPostId(post.id);
		try {
			const next = !post.is_pinned;
			await apiFetch(`/admin/posts/${post.id}/pin`, {
				method: 'POST',
				headers: getSecurityHeaders('POST'),
				body: JSON.stringify({ pinned: next })
			});
			setAdminMenuPostId(null);
			await fetchPosts(pageOffset);
		} catch {
			return;
		} finally {
			setAdminActionPostId(null);
		}
	}

	async function adminDeletePost(post: Post) {
		if (!user || user.role !== 'admin') return;
		if (!confirm('确定要删除这个帖子吗？此操作无法撤销。')) return;
		setAdminActionPostId(post.id);
		try {
			await apiFetch(`/admin/posts/${post.id}`, {
				method: 'DELETE',
				headers: getSecurityHeaders('DELETE')
			});
			setAdminMenuPostId(null);
			await fetchPosts(pageOffset);
		} catch {
			return;
		} finally {
			setAdminActionPostId(null);
		}
	}

	async function adminMovePost(post: Post, categoryId: number | null) {
		if (!user || user.role !== 'admin') return;
		setAdminActionPostId(post.id);
		try {
			await apiFetch(`/admin/posts/${post.id}/move`, {
				method: 'POST',
				headers: getSecurityHeaders('POST'),
				body: JSON.stringify({ category_id: categoryId })
			});
			setAdminMenuPostId(null);
			await fetchPosts(pageOffset);
		} catch {
			return;
		} finally {
			setAdminActionPostId(null);
		}
	}

	async function createPost(e: React.FormEvent) {
		e.preventDefault();
		if (!user) {
			window.location.href = '/login';
			return;
		}

		setCreateError('');
		const titleErr = validateText(newTitle, '标题');
		if (titleErr) return setCreateError(titleErr);
		const contentErr = validateText(newContent, '内容');
		if (contentErr) return setCreateError(contentErr);
		if (newTitle.length > 30) return setCreateError('标题过长 (最多 30 字符)');
		if (newContent.length > 3000) return setCreateError('内容过长 (最多 3000 字符)');
		if (turnstileActive && !turnstileToken) return setCreateError('请完成验证码验证');

		setCreateLoading(true);
		try {
			await apiFetch<{ success: boolean }>('/posts', {
				method: 'POST',
				headers: getSecurityHeaders('POST'),
				body: JSON.stringify({
					title: newTitle,
					content: newContent,
					category_id: newCategoryId ? Number(newCategoryId) : null,
					'cf-turnstile-response': turnstileToken
				})
			});
			setNewTitle('');
			setNewContent('');
			setNewCategoryId('');
			setTurnstileToken('');
			setTurnstileResetKey((v) => v + 1);
			setCreateOpen(false);
			await fetchPosts(0);
		} catch (e: any) {
			setCreateError(String(e?.message || e));
			setTurnstileToken('');
			setTurnstileResetKey((v) => v + 1);
		} finally {
			setCreateLoading(false);
		}
	}

	const currentPage = Math.floor(pageOffset / pageLimit) + 1;
	const totalPages = Math.max(1, Math.ceil(totalPosts / pageLimit));
	const pages: Array<number | 'ellipsis'> = [];
	if (totalPages <= 7) {
		for (let p = 1; p <= totalPages; p++) pages.push(p);
	} else {
		const start = Math.max(2, currentPage - 2);
		const end = Math.min(totalPages - 1, currentPage + 2);
		pages.push(1);
		if (start > 2) pages.push('ellipsis');
		for (let p = start; p <= end; p++) pages.push(p);
		if (end < totalPages - 1) pages.push('ellipsis');
		pages.push(totalPages);
	}

	function getCoverImageUrl(markdown: string) {
		const mdMatch = markdown.match(/!\[[^\]]*\]\(([^)\s]+)\)/i);
		const htmlMatch = markdown.match(/<img[^>]+src=["']([^"']+)["']/i);
		let url = mdMatch?.[1] || htmlMatch?.[1] || '';
		if (!url) return '';
		if (!/^https?:\/\//i.test(url) && !url.startsWith('/') && !url.startsWith('data:')) {
			url = `/r2/${url.replace(/^\/+/, '')}`;
		}
		return url;
	}

	return (
		<PageShell>
			{/* Hero Section - 未眠品牌视觉 */}
			<section className="relative overflow-hidden rounded-xl border border-violet-900/30 bg-gradient-to-br from-[#0B0F1E] via-[#13102B] to-[#1A0B2E] px-6 py-10 sm:px-12 sm:py-14">
				<div className="pointer-events-none absolute inset-0 opacity-30" aria-hidden>
					<div className="absolute -top-10 -right-10 h-48 w-48 rounded-full bg-violet-600/20 blur-3xl" />
					<div className="absolute -bottom-10 -left-10 h-56 w-56 rounded-full bg-amber-500/10 blur-3xl" />
				</div>
				<div className="relative space-y-4">
					<div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-[11px] tracking-[0.2em] text-violet-200 uppercase">
						<span className="h-1.5 w-1.5 rounded-full bg-amber-300 shadow-[0_0_8px_2px_rgba(252,211,77,0.7)]" />
						Sleepless · 未眠
					</div>
					<h1 className="font-serif text-4xl sm:text-5xl tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-violet-100 to-amber-100">
						夜深了，另一个你醒着。
					</h1>
					<p className="max-w-xl text-sm sm:text-base leading-relaxed text-violet-100/70">
						白天的端庄留给世界，夜晚的未眠留给自己。
						<br />
						在这里，把不能说的，说给不会说出去的人。
					</p>
					<div className="flex flex-wrap items-center gap-3 pt-2">
					<a
						href="/soul.html"
						className="inline-flex items-center gap-2 rounded-md bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-violet-900/40 transition hover:from-violet-500 hover:to-fuchsia-500"
					>
						<Sparkles className="h-4 w-4" />
						测一测今夜的你
					</a>
					<a
						href="/register.html"
						className="inline-flex items-center gap-2 rounded-md border border-violet-400/30 bg-white/5 px-4 py-2 text-sm text-violet-100 backdrop-blur transition hover:bg-white/10"
					>
						成为未眠者
						<ArrowRight className="h-3.5 w-3.5" />
					</a>
				</div>

				{/* 灯火墙 · 实时数据条 */}
				<div className="mt-6 grid grid-cols-3 gap-3 border-t border-violet-500/10 pt-4 text-center">
					<div>
						<div className="font-serif text-2xl text-amber-200">{soulStats?.total ?? '—'}</div>
						<div className="text-[10px] tracking-[0.2em] text-violet-200/50 uppercase">已测灵魂</div>
					</div>
					<div>
						<div className="font-serif text-2xl text-fuchsia-200">8</div>
						<div className="text-[10px] tracking-[0.2em] text-violet-200/50 uppercase">小众人格</div>
					</div>
					<div>
						<div className="font-serif text-2xl text-violet-200">L0-L5</div>
						<div className="text-[10px] tracking-[0.2em] text-violet-200/50 uppercase">反差等级</div>
					</div>
				</div>
				</div>
			</section>

			{/* 灵魂测定入口卡 · 引流利器 */}
			<section className="relative overflow-hidden rounded-xl border border-fuchsia-900/30 bg-gradient-to-br from-[#1A0B2E] via-[#2A0B3E] to-[#1A0B1E] p-5 sm:p-7">
				<div className="pointer-events-none absolute inset-0 opacity-40" aria-hidden>
					<div className="absolute -top-10 right-1/4 h-40 w-40 rounded-full bg-fuchsia-500/20 blur-3xl" />
					<div className="absolute -bottom-10 left-1/4 h-40 w-40 rounded-full bg-amber-500/10 blur-3xl" />
				</div>
				<div className="relative grid gap-5 sm:grid-cols-[1fr_auto] sm:items-center">
					<div className="space-y-2">
						<div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 px-3 py-1 text-[11px] tracking-[0.2em] text-fuchsia-200 uppercase">
							<Sparkles className="h-3 w-3" />
							Soul Test · 灵魂测定
						</div>
						<h2 className="font-serif text-2xl sm:text-3xl text-transparent bg-clip-text bg-gradient-to-r from-white via-fuchsia-100 to-amber-100">
							今夜的你，是哪一种灵魂？
						</h2>
						<p className="max-w-xl text-sm leading-relaxed text-fuchsia-100/70">
							十题问答，测出三种结果：<span className="text-fuchsia-200">小众人格</span>、<span className="text-sky-200">今日底色</span>、<span className="text-amber-200">反差等级</span>。
							<br />
							测完可分享，作为外站引流的暗号。
						</p>
					</div>
					<a
						href="/soul.html"
						className="inline-flex items-center gap-2 self-start rounded-md bg-gradient-to-r from-fuchsia-600 to-rose-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-fuchsia-900/40 transition hover:from-fuchsia-500 hover:to-rose-500 sm:self-auto"
					>
						开始测定
						<ArrowRight className="h-4 w-4" />
					</a>
					<a
						href="/enneagram.html"
						className="inline-flex items-center gap-2 self-start rounded-md border border-amber-500/30 bg-amber-500/5 px-4 py-2.5 text-sm text-amber-200 backdrop-blur transition hover:bg-amber-500/10 sm:self-auto"
					>
						<Compass className="h-4 w-4" />
						九型夜人格
					</a>
				</div>

				{/* 8 人格预览 */}
				<div className="relative mt-5 grid grid-cols-4 gap-2 border-t border-fuchsia-500/10 pt-4 sm:grid-cols-8">
					{SOUL_TYPES_PREVIEW.map((s) => (
						<div key={s.code} className="text-center">
							<div
								className="mx-auto mb-1 h-2 w-2 rounded-full"
								style={{ background: s.color, boxShadow: `0 0 8px 1px ${s.color}80` }}
							/>
							<div className="truncate text-[10px] text-violet-100/70">{s.name}</div>
						</div>
					))}
				</div>

				{/* 6 底色 + 反差等级 */}
				<div className="relative mt-4 flex flex-wrap items-center justify-between gap-3">
					<div className="flex items-center gap-2">
						<span className="text-[10px] tracking-[0.2em] text-violet-200/50 uppercase">今日底色</span>
						<div className="flex items-center gap-1.5">
							{TONES_PREVIEW.map((t) => (
								<div
									key={t.code}
									className="h-4 w-4 rounded-full"
									style={{ background: t.hex }}
									title={t.name}
								/>
							))}
						</div>
					</div>
					<div className="flex items-center gap-2">
						<span className="text-[10px] tracking-[0.2em] text-violet-200/50 uppercase">反差等级</span>
						<div className="flex items-center gap-1">
							{CONTRAST_LEVELS.map((l, i) => (
								<span key={l} className="text-[10px] text-violet-100/60">
									{i > 0 ? <span className="text-violet-500/40 mx-0.5">·</span> : null}
									{l}
								</span>
							))}
						</div>
					</div>
				</div>

				{/* 灵魂分布（如有数据） */}
				{soulStats && soulStats.by_type.length > 0 ? (
					<div className="relative mt-4 border-t border-fuchsia-500/10 pt-3">
						<div className="text-[10px] tracking-[0.2em] text-violet-200/50 uppercase mb-2">今夜的灵魂分布</div>
						<div className="flex h-2 w-full overflow-hidden rounded-full bg-violet-900/30">
							{soulStats.by_type.map((t) => {
								const meta = SOUL_TYPES_PREVIEW.find((s) => s.code === t.code);
								const total = soulStats.total || 1;
								const pct = (t.count / total) * 100;
								return (
									<div
										key={t.code}
										style={{ width: `${pct}%`, background: meta?.color || '#6366F1' }}
										title={`${t.name}: ${t.count}`}
									/>
								);
							})}
						</div>
					</div>
				) : null}
			</section>
			<div className="space-y-6">
				{banner ? <div className="rounded-md border bg-muted/40 p-3 text-sm">{banner}</div> : null}

			{/* 今夜精选 · 按反差等级排序 */}
			{featured.length > 0 ? (
				<section className="space-y-3">
					<div className="flex items-baseline justify-between">
						<h2 className="font-serif text-lg text-violet-100">
							今夜精选
							<span className="ml-2 text-[11px] font-normal text-violet-300/50">按反差等级 · 夜里更新</span>
						</h2>
					</div>
					<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
						{featured.map((p) => (
							<a
								key={p.id}
								href={`/post/${p.id}.html`}
								className="group relative overflow-hidden rounded-lg border border-violet-900/30 bg-gradient-to-br from-[#0B0F1E]/90 to-[#13102B]/90 p-4 backdrop-blur transition hover:border-violet-400/50 hover:shadow-lg hover:shadow-violet-900/20"
							>
								{/* 反差等级角标 */}
								{p.contrast_level != null ? (
									<div className="absolute right-3 top-3 flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-200">
										<Flame className="h-3 w-3" />
										L{p.contrast_level}
									</div>
								) : null}
								<div className="mb-2 text-[11px] text-violet-300/60">{p.category_name}</div>
								<h3 className="line-clamp-2 font-serif text-sm text-violet-50 group-hover:text-white">
									{p.title}
								</h3>
								{p.excerpt ? (
									<p className="mt-1.5 line-clamp-2 text-xs text-violet-200/60">{p.excerpt}</p>
								) : null}
								<div className="mt-3 flex items-center gap-3 text-[10px] text-violet-300/50">
									<span className="flex items-center gap-1">
										<Heart className="h-3 w-3" />
										{p.likes_count || 0}
									</span>
									<span className="flex items-center gap-1">
										<MessageCircle className="h-3 w-3" />
										{p.comments_count || 0}
									</span>
									<span className="flex items-center gap-1">
										<Eye className="h-3 w-3" />
										{p.views_count || 0}
									</span>
									{soul_name_badge(p.soul_name)}
								</div>
							</a>
						))}
					</div>
				</section>
			) : null}

			{/* 二级广场入口 */}
				<div id="squares" className="grid grid-cols-2 gap-3 sm:grid-cols-5 scroll-mt-4">
					{([
						{ slug: 'notes', name: '夜笺', desc: '枕边的字，写给不想睡的人', icon: Moon, color: 'from-violet-600/30 to-indigo-600/20', iconColor: 'text-violet-300' },
						{ slug: 'treehole', name: '私语', desc: '说给不会说出去的人', icon: Lock, color: 'from-slate-700/40 to-violet-900/20', iconColor: 'text-slate-300' },
						{ slug: 'gaze', name: '晚妆', desc: '妆化好了，差一个人', icon: Eye, color: 'from-amber-600/20 to-rose-600/20', iconColor: 'text-amber-300' },
						{ slug: 'soul', name: '心相', desc: '灵魂的另一面，等认得的人', icon: Sparkles, color: 'from-fuchsia-600/20 to-violet-600/20', iconColor: 'text-fuchsia-300' },
						{ slug: 'salon', name: '夜会', desc: '留个暗号，等一个人对上', icon: Flame, color: 'from-rose-700/30 to-fuchsia-700/20', iconColor: 'text-rose-300' },
					]).map(({ slug, name, desc, icon: Icon, color, iconColor }) => (
						<a
							key={slug}
							href={`/square/${slug}.html`}
							className={`group relative overflow-hidden rounded-lg border border-violet-900/30 bg-gradient-to-br ${color} p-4 backdrop-blur transition hover:border-violet-400/60 hover:shadow-lg hover:shadow-violet-900/20`}
						>
							<div className="pointer-events-none absolute -top-6 -right-6 h-20 w-20 rounded-full bg-white/5 blur-2xl opacity-0 transition group-hover:opacity-100" />
							<Icon className={`h-5 w-5 ${iconColor} mb-2`} />
							<div className="font-serif text-base text-violet-50">{name}</div>
							<div className="mt-0.5 text-[11px] leading-tight text-violet-200/60">{desc}</div>
						</a>
					))}
				</div>

				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div>
							<h1 className="text-2xl font-semibold tracking-tight">未眠</h1>
						<p className="text-sm text-muted-foreground">深夜的树洞，另一个你的栖息地。</p>
					</div>
					<div className="flex items-center gap-2">
						<label className="text-sm text-muted-foreground" htmlFor="category-filter">
							分类
						</label>
						<select
							id="category-filter"
							className="h-9 rounded-md border bg-background px-3 text-sm"
							value={selectedCategory}
							onChange={(e) => {
								setSelectedCategory(e.target.value);
								setPageOffset(0);
							}}
						>
							<option value="">全部</option>
							<option value="uncategorized">未分类</option>
							{categories.map((c) => (
								<option key={c.id} value={String(c.id)}>
									{c.name}
								</option>
							))}
						</select>
						<label className="text-sm text-muted-foreground" htmlFor="sort-filter">
							排序
						</label>
						<select
							id="sort-filter"
							className="h-9 rounded-md border bg-background px-3 text-sm"
							value={sortOption}
							onChange={(e) => {
								setSortOption(e.target.value);
								setPageOffset(0);
							}}
						>
							<option value="time_desc">最新发布</option>
							<option value="time_asc">最早发布</option>
							<option value="likes_desc">最多点赞</option>
							<option value="comments_desc">最多评论</option>
							<option value="views_desc">最多观看</option>
						</select>
						<form
							className="flex items-center gap-2"
							onSubmit={(e) => {
								e.preventDefault();
								setPageOffset(0);
								setSearchQuery(searchInput.trim());
							}}
						>
							<Input
								value={searchInput}
								onChange={(e) => setSearchInput(e.target.value)}
								placeholder="搜索标题/内容"
								className="h-9 w-48"
							/>
							<Button variant="outline" size="sm" type="submit" disabled={loading}>
								<Search className="h-4 w-4" />
								<span className="sr-only">搜索</span>
							</Button>
							{searchInput || searchQuery ? (
								<Button
									variant="outline"
									size="sm"
									type="button"
									onClick={() => {
										setSearchInput('');
										setSearchQuery('');
										setPageOffset(0);
									}}
									disabled={loading}
								>
									<X className="h-4 w-4" />
									<span className="sr-only">清除</span>
								</Button>
							) : null}
						</form>
						<Button variant="outline" size="sm" onClick={() => fetchPosts(0)} disabled={loading}>
							<RefreshCw className="h-4 w-4" />
							<span className="sr-only">刷新</span>
						</Button>
					</div>
				</div>

				{user ? (
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
								<div className="space-y-4">
									<div className="space-y-2">
										<Label htmlFor="new-title">标题</Label>
										<Input id="new-title" maxLength={30} value={newTitle} onChange={(e) => setNewTitle(e.target.value)} required />
									</div>
									<div className="space-y-2">
										<Label htmlFor="new-category">分类 (可选)</Label>
										<select
											id="new-category"
											className="h-9 w-full rounded-md border bg-background px-3 text-sm"
											value={newCategoryId}
											onChange={(e) => setNewCategoryId(e.target.value)}
										>
											<option value="">无分类</option>
											{categories.map((c) => (
												<option key={c.id} value={String(c.id)}>
													{c.name}
												</option>
											))}
										</select>
									</div>
								</div>
								<div className="space-y-2">
								<div className="flex flex-wrap items-center justify-between gap-2">
									<Label htmlFor="new-content">内容 (支持 Markdown)</Label>
									<div className="flex items-center gap-2">
										<span className="text-xs text-muted-foreground">快捷键：Ctrl+1/2/3、Ctrl+B/I/U、Ctrl+K、Ctrl+Shift+K</span>
										<Button type="button" variant="outline" size="sm" onClick={() => setPreviewOpen((v) => !v)}>
											{previewOpen ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
											<span className="sr-only">{previewOpen ? '关闭预览' : '打开预览'}</span>
										</Button>
									</div>
								</div>
								<div className={previewOpen ? 'grid gap-3 lg:grid-cols-2' : 'space-y-2'}>
									<div className="space-y-2">
										<Textarea
											id="new-content"
											ref={newContentRef}
											value={newContent}
											onChange={(e) => setNewContent(e.target.value)}
											onKeyDown={handleEditorKeyDown}
											rows={10}
											className="min-h-[220px]"
											required
										/>
										<div className="text-xs text-muted-foreground">Ctrl+T 表格，Ctrl+Shift+M 公式，Ctrl+Shift+Q 引用，Alt+Shift+5 删除线</div>
									</div>
									{previewOpen ? (
										<div className="rounded-md border bg-muted/20 p-3">
											<div className="mb-2 text-xs font-medium text-muted-foreground">预览</div>
											<div
												ref={previewRef}
												className="prose max-w-none break-words [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1"
												dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(newContent || '') }}
											/>
										</div>
									) : null}
								</div>
							</div>
								{/* image upload button */}
		<div className="space-y-2">
			<label className="block text-sm font-medium text-muted-foreground">上传图片</label>
			<input
				type="file"
				accept="image/*"
				className="block w-full text-sm"
				onChange={async (e) => {
					const file = e.target.files && e.target.files[0];
					if (!file) return;
					setUploadError('');
					// allow up to 2MB
					if (file.size > 2 * 1024 * 1024) {
						setUploadError('文件过大 (最大 2MB)');
						return;
					}
					setUploadLoading(true);
					try {
						const formData = new FormData();
						formData.append('file', file);
						formData.append('type', 'post');
						const res = await fetch('/api/upload', {
							method: 'POST',
							headers: getSecurityHeaders('POST', null),
							body: formData
						});
						const data = await res.json();
						if (!res.ok) throw new Error(data?.error || '上传失败');
                        // insert markdown link at cursor and ensure preview is visible
                        insertIntoContent(`

![](${data.url})

`);
                        setPreviewOpen(true);
					} catch (err: any) {
						setUploadError(String(err?.message || err));
					} finally {
						setUploadLoading(false);
					}
				}}
			/>
			{uploadError ? <div className="text-sm text-destructive">{uploadError}</div> : null}
			{uploadLoading ? <div className="text-sm text-muted-foreground">上传中…</div> : null}
		</div>
		<TurnstileWidget enabled={turnstileActive} siteKey={siteKey} onToken={setTurnstileToken} resetKey={turnstileResetKey} />

								<Button type="submit" disabled={createLoading}>
									{createLoading ? '发布中...' : '发布'}
								</Button>
							</form>
							)}
						</CardContent>
					</Card>
				) : (
					<Card>
						<CardContent className="py-6 text-sm text-muted-foreground">
							<a className="text-foreground underline" href="/login">
								登录
							</a>{' '}
							后可发布、点赞和评论。
						</CardContent>
					</Card>
				)}

				{error ? <div className="rounded-md border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive">{error}</div> : null}

				<div className="space-y-4">
					<div ref={listTopRef} />
					{loading ? (
						<Card className="border-violet-900/30 bg-gradient-to-br from-[#0B0F1E]/95 via-[#13102B]/95 to-[#1A0B2E]/95 text-violet-50 backdrop-blur">
							<CardContent className="py-6 text-sm text-violet-200/60">未眠者正在醒来...</CardContent>
						</Card>
					) : posts.length === 0 ? (
						<Card className="border-violet-900/30 bg-gradient-to-br from-[#0B0F1E]/95 via-[#13102B]/95 to-[#1A0B2E]/95 text-violet-50 backdrop-blur">
						<CardContent className="py-8 text-center text-sm text-violet-200/60 font-serif">夜还没有故事</CardContent>
					</Card>
				) : (
					posts.map((p) => {
						const coverUrl = getCoverImageUrl(p.content || '');
						const isAdmin = user?.role === 'admin';
						const menuOpen = adminMenuPostId === p.id;
						const actionLoading = adminActionPostId === p.id;
						return (
							<Card key={p.id} className="group relative overflow-hidden border-violet-900/30 bg-gradient-to-br from-[#0B0F1E]/95 via-[#13102B]/95 to-[#1A0B2E]/95 text-violet-50 backdrop-blur transition hover:border-violet-500/50 hover:shadow-lg hover:shadow-violet-900/20">
								<div className="pointer-events-none absolute -top-8 -right-8 h-32 w-32 rounded-full bg-violet-600/10 blur-2xl opacity-0 transition group-hover:opacity-100" />
								<CardContent className="relative py-5">
										<div className="flex gap-4">
											{coverUrl ? (
												<img
													src={coverUrl}
													alt=""
													className="h-20 w-28 shrink-0 rounded-md object-cover ring-1 ring-violet-500/20"
													loading="lazy"
													referrerPolicy="no-referrer"
												/>
											) : null}
											<div className="min-w-0 flex-1 space-y-1.5">
												<div className="flex items-start justify-between gap-2">
													<div className="flex min-w-0 items-center gap-2">
														{p.is_pinned ? (
															<span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-300">
																<Pin className="h-3.5 w-3.5" />
																置顶
															</span>
														) : null}
														<a className="truncate font-serif text-lg text-violet-50 transition hover:text-fuchsia-200 hover:underline" href={`/posts/${p.id}`}>
															{p.title}
														</a>
													</div>
													{isAdmin ? (
														<div className="relative">
															<Button
																type="button"
																variant="ghost"
																size="sm"
																disabled={actionLoading}
																onMouseDown={(e) => e.stopPropagation()}
																onTouchStart={(e) => e.stopPropagation()}
																onClick={(e) => {
																	e.preventDefault();
																	e.stopPropagation();
																	setAdminMenuPostId((cur) => (cur === p.id ? null : p.id));
																}}
																aria-haspopup="menu"
																aria-expanded={menuOpen}
															>
																<MoreVertical className="h-4 w-4" />
																<span className="sr-only">更多</span>
															</Button>
															{menuOpen ? (
																<div
																	className="absolute right-0 top-full z-50 mt-1 w-40 rounded-md border bg-background p-1 shadow-md"
																	onMouseDown={(e) => e.stopPropagation()}
																	onTouchStart={(e) => e.stopPropagation()}
																	onClick={(e) => e.stopPropagation()}
																>
																	<button
																		type="button"
																		disabled={actionLoading}
																		className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-muted disabled:opacity-50"
																		onClick={() => void adminTogglePin(p)}
																	>
																		<Pin className="h-4 w-4" />
																		{p.is_pinned ? '取消置顶' : '置顶'}
																	</button>
																	<button
																		type="button"
																		disabled={actionLoading}
																		className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-destructive hover:bg-destructive/10 disabled:opacity-50"
																		onClick={() => void adminDeletePost(p)}
																	>
																		<Trash2 className="h-4 w-4" />
																		删除
																	</button>
																	<div className="my-1 h-px bg-border" />
																	<div className="px-2 py-1 text-xs font-medium text-muted-foreground">移动到分类</div>
																	<button
																		type="button"
																		disabled={actionLoading}
																		className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-muted disabled:opacity-50"
																		onClick={() => void adminMovePost(p, null)}
																	>
																		未分类
																	</button>
																	{categories.map((c) => (
																		<button
																			key={c.id}
																			type="button"
																			disabled={actionLoading}
																			className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-muted disabled:opacity-50"
																			onClick={() => void adminMovePost(p, c.id)}
																		>
																			{c.name}
																		</button>
																	))}
																</div>
															) : null}
														</div>
													) : null}
												</div>
												<div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-violet-200/60">
													<span className="inline-flex items-center gap-2">
														{p.author_avatar ? (
															<img
																src={p.author_avatar}
																alt=""
																className="h-6 w-6 rounded-full object-cover ring-1 ring-violet-500/20"
																loading="lazy"
																referrerPolicy="no-referrer"
															/>
														) : (
															<span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-violet-900/40 text-[10px] text-violet-200">
																<User className="h-4 w-4" />
															</span>
														)}
														<span className="truncate text-violet-100">{p.author_name}</span>
														{p.author_role === 'admin' ? (
														<span className="inline-flex items-center gap-1 rounded border border-fuchsia-500/30 bg-fuchsia-500/10 px-1.5 py-0.5 text-[10px] font-medium text-fuchsia-300">
															<Shield className="h-3 w-3" />
															<span className="sr-only">管理员</span>
														</span>
													) : null}
													{p.author_role === 'creator' ? (
														<span className="inline-flex items-center gap-1 rounded border border-violet-500/30 bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-medium text-violet-300">
															<Sparkles className="h-3 w-3 text-fuchsia-400" />
															夜作者
														</span>
													) : null}
													</span>
													{p.category_name ? (
														<>
															<span>·</span>
															<span className="truncate">{p.category_name}</span>
														</>
													) : null}
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

				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex items-center gap-2">
						<Button
							variant="outline"
							size="sm"
							disabled={currentPage <= 1 || loading}
							onClick={() => fetchPosts(Math.max(0, pageOffset - pageLimit))}
						>
							<ChevronLeft className="h-4 w-4" />
							<span className="sr-only">上一页</span>
						</Button>
						<div className="flex items-center gap-1">
							{pages.map((p, idx) =>
								p === 'ellipsis' ? (
									<span key={`e-${idx}`} className="px-2 text-sm text-muted-foreground">
										…
									</span>
								) : (
									<Button
										key={p}
										variant={p === currentPage ? 'secondary' : 'outline'}
										size="sm"
										disabled={loading}
										onClick={() => fetchPosts((p - 1) * pageLimit)}
									>
										{p}
									</Button>
								)
							)}
						</div>
						<Button
							variant="outline"
							size="sm"
							disabled={currentPage >= totalPages || loading}
							onClick={() => fetchPosts(pageOffset + pageLimit)}
						>
							<ChevronRight className="h-4 w-4" />
							<span className="sr-only">下一页</span>
						</Button>
					</div>
					<form
						className="flex items-center gap-2"
						onSubmit={(e) => {
							e.preventDefault();
							const parsed = Number.parseInt(jumpTo, 10);
							if (!Number.isFinite(parsed)) return;
							const next = Math.min(Math.max(parsed, 1), totalPages);
							setJumpTo(String(next));
							fetchPosts((next - 1) * pageLimit);
						}}
					>
						<div className="text-sm text-muted-foreground">
							第 {currentPage} / {totalPages} 页
						</div>
						<Input
							value={jumpTo}
							onChange={(e) => setJumpTo(e.target.value)}
							inputMode="numeric"
							placeholder="跳页"
							className="h-9 w-20"
						/>
						<Button variant="outline" size="sm" type="submit" disabled={loading}>
							跳转
						</Button>
					</form>
				</div>
			</div>

			{/* 品牌 Footer */}
			<footer className="mt-10 border-t border-violet-900/20 pt-6 pb-4 text-center space-y-2">
				<div className="font-serif text-sm text-violet-200/60">
					夜深了，另一个你醒着。
				</div>
				<div className="text-[11px] text-violet-300/40">
					未眠 · Sleepless — 一个写给夜晚的、装着反差灵魂的角落
				</div>
				<div className="flex items-center justify-center gap-4 pt-2 text-[11px] text-violet-300/40">
					<a href="/soul.html" className="hover:text-violet-200 transition">灵魂测定</a>
					<span className="text-violet-500/30">·</span>
					<a href="/register.html" className="hover:text-violet-200 transition">成为未眠者</a>
					<span className="text-violet-500/30">·</span>
					<a href="/login.html" className="hover:text-violet-200 transition">登入</a>
				</div>
			</footer>
		</PageShell>
	);
}
