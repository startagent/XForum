import * as React from 'react';
import {
	ArrowRight, BookOpen, Clock, Crown, Flame, Moon, Play, Plus, Sparkles, Star, Tag, Users,
} from 'lucide-react';

import { PageShell } from '@/components/page-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiFetch } from '@/lib/api';
import { getUser } from '@/lib/auth';

interface ScenarioItem {
	id: number;
	title: string;
	slug: string;
	summary: string | null;
	cover_emoji: string;
	content_level: string;
	tags: string[];
	recommended_planets: string[];
	open_hour_start: number | null;
	open_hour_end: number | null;
	open_now: boolean;
	play_count: number;
	ending_count: number;
	updated_at: string;
	author_name: string;
	author_avatar: string | null;
	author_role?: 'admin' | 'user' | 'creator';
}

const PLANET_EMOJI: Record<string, string> = {
	NOVA: '🔥', EBB: '🌊', ECHO: '🌌', DUSK: '🌑', VEIL: '🎭',
};

const CONTENT_LEVEL_STYLE: Record<string, string> = {
	'微光': 'border-violet-500/30 bg-violet-500/10 text-violet-200',
	'薄暮': 'border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-200',
	'暗涌': 'border-rose-500/30 bg-rose-500/10 text-rose-200',
	'炽夜': 'border-amber-500/40 bg-amber-500/15 text-amber-200',
};

function formatHour(h: number) {
	return `${String(h).padStart(2, '0')}:00`;
}

function formatRelative(dateStr: string) {
	const d = new Date(dateStr.endsWith('Z') ? dateStr : `${dateStr}Z`);
	const now = Date.now();
	const diff = now - d.getTime();
	const m = Math.floor(diff / 60000);
	if (m < 1) return '刚刚';
	if (m < 60) return `${m} 分钟前`;
	const h = Math.floor(m / 60);
	if (h < 24) return `${h} 小时前`;
	const day = Math.floor(h / 24);
	if (day < 30) return `${day} 天前`;
	return d.toLocaleDateString('zh-CN');
}

export function ScenariosPage() {
	const [scenarios, setScenarios] = React.useState<ScenarioItem[]>([]);
	const [loading, setLoading] = React.useState(true);
	const [error, setError] = React.useState('');
	const [filterPlanet, setFilterPlanet] = React.useState<string>('');
	const [filterLevel, setFilterLevel] = React.useState<string>('');
	const user = React.useMemo(() => getUser(), []);

	React.useEffect(() => {
		apiFetch<{ scenarios: ScenarioItem[] }>('/scenarios')
			.then((r) => setScenarios(r.scenarios || []))
			.catch((e) => setError(String(e?.message || e)))
			.finally(() => setLoading(false));
	}, []);

	const isCreator = user?.role === 'creator' || user?.role === 'admin';

	const planets = Array.from(new Set(scenarios.flatMap((s) => s.recommended_planets || [])));
	const levels = Array.from(new Set(scenarios.map((s) => s.content_level)));

	const filtered = scenarios.filter((s) => {
		if (filterPlanet && !(s.recommended_planets || []).includes(filterPlanet)) return false;
		if (filterLevel && s.content_level !== filterLevel) return false;
		return true;
	});

	return (
		<PageShell>
			<div className="mx-auto max-w-5xl space-y-6">
				{/* 顶部品牌 */}
				<section className="relative overflow-hidden rounded-xl border border-violet-900/30 bg-gradient-to-br from-[#0B0F1E] via-[#13102B] to-[#1A0B2E] px-6 py-8">
					<div className="pointer-events-none absolute inset-0 opacity-30" aria-hidden>
						<div className="absolute -top-10 -right-10 h-48 w-48 rounded-full bg-fuchsia-600/20 blur-3xl" />
						<div className="absolute -bottom-10 -left-10 h-56 w-56 rounded-full bg-amber-500/10 blur-3xl" />
					</div>
					<div className="relative space-y-3">
						<div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 px-3 py-1 text-[11px] tracking-[0.2em] text-fuchsia-200 uppercase">
							<Moon className="h-3 w-3" />
							Night Theater · 夜剧场
						</div>
						<h1 className="font-serif text-3xl sm:text-4xl tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-fuchsia-100 to-amber-100">
							今夜的剧本，等你来演
						</h1>
						<p className="max-w-2xl text-sm sm:text-base leading-relaxed text-violet-100/70">
							不是阅读，是潜入。
							<br />
							每个剧本都是一段夜里的相遇，由夜作者执笔，由你的选择推进。
						</p>
						<div className="flex flex-wrap items-center gap-3 pt-2">
							<span className="inline-flex items-center gap-1.5 text-xs text-violet-200/60">
								<BookOpen className="h-3.5 w-3.5" />
								{scenarios.length} 个剧本
							</span>
							<span className="inline-flex items-center gap-1.5 text-xs text-violet-200/60">
								<Play className="h-3.5 w-3.5" />
								{scenarios.reduce((a, s) => a + (s.play_count || 0), 0)} 次上演
							</span>
							<span className="inline-flex items-center gap-1.5 text-xs text-violet-200/60">
								<Sparkles className="h-3.5 w-3.5" />
								{scenarios.reduce((a, s) => a + (s.ending_count || 0), 0)} 个结局
							</span>
						</div>
						{isCreator ? (
							<div className="pt-2">
								<a
									href="/scenario-editor.html"
									className="inline-flex items-center gap-2 rounded-md bg-gradient-to-r from-fuchsia-600 to-rose-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-fuchsia-900/40 transition hover:from-fuchsia-500 hover:to-rose-500"
								>
									<Plus className="h-4 w-4" />
									新建剧本
								</a>
							</div>
						) : null}
					</div>
				</section>

				{/* 过滤器 */}
				<Card className="border-violet-900/30 bg-[#0B0F1E]/60">
					<CardContent className="py-3 flex flex-wrap items-center gap-3">
						<div className="flex items-center gap-2">
							<span className="text-[11px] tracking-[0.15em] text-violet-200/50 uppercase">星球</span>
							<div className="flex flex-wrap gap-1.5">
								<button
									onClick={() => setFilterPlanet('')}
									className={`rounded-full px-2.5 py-0.5 text-xs transition ${filterPlanet === '' ? 'bg-violet-500/30 text-violet-100' : 'bg-white/5 text-violet-300/60 hover:bg-white/10'}`}
								>
									全部
								</button>
								{planets.map((p) => (
									<button
										key={p}
										onClick={() => setFilterPlanet(filterPlanet === p ? '' : p)}
										className={`rounded-full px-2.5 py-0.5 text-xs transition ${filterPlanet === p ? 'bg-fuchsia-500/30 text-fuchsia-100' : 'bg-white/5 text-violet-300/60 hover:bg-white/10'}`}
									>
										{PLANET_EMOJI[p] || '🪐'} {p}
									</button>
								))}
							</div>
						</div>
						<div className="ml-auto flex items-center gap-2">
							<span className="text-[11px] tracking-[0.15em] text-violet-200/50 uppercase">尺度</span>
							<div className="flex flex-wrap gap-1.5">
								<button
									onClick={() => setFilterLevel('')}
									className={`rounded-full px-2.5 py-0.5 text-xs transition ${filterLevel === '' ? 'bg-violet-500/30 text-violet-100' : 'bg-white/5 text-violet-300/60 hover:bg-white/10'}`}
								>
									全部
								</button>
								{levels.map((l) => (
									<button
										key={l}
										onClick={() => setFilterLevel(filterLevel === l ? '' : l)}
										className={`rounded-full border px-2.5 py-0.5 text-xs transition ${filterLevel === l ? CONTENT_LEVEL_STYLE[l] || 'border-violet-500/30 bg-violet-500/10 text-violet-200' : 'border-white/10 bg-white/5 text-violet-300/60 hover:bg-white/10'}`}
									>
										{l}
									</button>
								))}
							</div>
						</div>
					</CardContent>
				</Card>

				{/* 剧本列表 */}
				{loading ? (
					<div className="py-20 text-center text-violet-300/60 text-sm">载入中…</div>
				) : error ? (
					<Card className="border-rose-900/40 bg-rose-950/40 text-rose-100">
						<CardContent className="py-4 text-sm">{error}</CardContent>
					</Card>
				) : filtered.length === 0 ? (
					<Card className="border-violet-900/30 bg-[#0B0F1E]/60">
						<CardContent className="py-16 text-center space-y-3">
							<BookOpen className="mx-auto h-10 w-10 text-violet-300/40" />
							<p className="text-violet-200/70 text-sm">还没有剧本落在这片夜里。</p>
							{isCreator ? (
								<a
									href="/scenario-editor.html"
									className="inline-flex items-center gap-2 rounded-md border border-fuchsia-400/40 bg-fuchsia-500/10 px-4 py-2 text-sm text-fuchsia-200 hover:bg-fuchsia-500/20"
								>
									<Plus className="h-4 w-4" />
									成为第一个夜作者
								</a>
							) : (
								<p className="text-xs text-violet-300/40">夜作者邀请制开放中</p>
							)}
						</CardContent>
					</Card>
				) : (
					<div className="grid gap-4 sm:grid-cols-2">
						{filtered.map((s) => (
							<a
								key={s.id}
								href={`/scenario-play.html?slug=${encodeURIComponent(s.slug)}`}
								className="group relative overflow-hidden rounded-xl border border-violet-900/30 bg-gradient-to-br from-[#0B0F1E] via-[#13102B] to-[#1A0B2E] p-5 transition hover:border-fuchsia-500/50 hover:shadow-xl hover:shadow-fuchsia-900/20"
							>
								<div className="pointer-events-none absolute -top-8 -right-8 h-32 w-32 rounded-full bg-fuchsia-500/10 blur-3xl opacity-0 transition group-hover:opacity-100" />
								<div className="relative flex gap-4">
									{/* 封面 emoji */}
									<div className="flex-shrink-0">
										<div className="flex h-20 w-20 items-center justify-center rounded-lg border border-violet-500/20 bg-white/5 text-5xl">
											{s.cover_emoji || '🌙'}
										</div>
										{s.ending_count > 0 ? (
											<div className="mt-1.5 text-center text-[10px] text-amber-300/70">
												{s.ending_count} 个结局
											</div>
										) : null}
									</div>
									<div className="flex-1 min-w-0 space-y-1.5">
										<div className="flex items-baseline gap-2">
											<h3 className="font-serif text-lg text-violet-50 truncate group-hover:text-white">
												{s.title}
											</h3>
											<span className={`flex-shrink-0 rounded-full border px-2 py-0.5 text-[10px] ${CONTENT_LEVEL_STYLE[s.content_level] || CONTENT_LEVEL_STYLE['微光']}`}>
												{s.content_level}
											</span>
										</div>
										<p className="text-xs leading-relaxed text-violet-200/60 line-clamp-2">
											{s.summary || '夜作者还没有留下简介'}
										</p>
										{/* 标签 */}
										{s.tags && s.tags.length > 0 ? (
											<div className="flex flex-wrap gap-1 pt-0.5">
												{s.tags.slice(0, 3).map((t) => (
													<span key={t} className="inline-flex items-center gap-0.5 rounded-full bg-violet-500/10 px-1.5 py-0.5 text-[10px] text-violet-300/70">
														<Tag className="h-2.5 w-2.5" />
														{t}
													</span>
												))}
											</div>
										) : null}
										{/* 推荐星球 */}
										{s.recommended_planets && s.recommended_planets.length > 0 ? (
											<div className="flex items-center gap-1.5 text-[11px]">
												<Users className="h-3 w-3 text-fuchsia-300/60" />
												<span className="text-fuchsia-300/50">推荐：</span>
												{s.recommended_planets.map((p) => (
													<span key={p} className="text-fuchsia-200">
														{PLANET_EMOJI[p] || '🪐'} {p}
													</span>
												))}
											</div>
										) : null}
									</div>
								</div>
								<div className="relative mt-4 flex items-center justify-between border-t border-violet-500/10 pt-3 text-[11px] text-violet-300/50">
									<div className="flex items-center gap-2">
										{s.author_avatar ? (
											<img src={s.author_avatar} alt="" className="h-5 w-5 rounded-full" />
										) : (
											<div className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-500/20 text-[10px] text-violet-200">
												{s.author_name?.[0] || '?'}
											</div>
										)}
										<span>{s.author_name}</span>
										{s.author_role === 'creator' ? (
											<span className="inline-flex items-center gap-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-1.5 py-0 text-[9px] text-amber-200">
												<Crown className="h-2.5 w-2.5" />
												夜作者
											</span>
										) : null}
									</div>
									<div className="flex items-center gap-3">
										{s.open_hour_start != null && s.open_hour_end != null ? (
											<span className={`inline-flex items-center gap-1 ${s.open_now ? 'text-amber-300' : 'text-violet-300/40'}`}>
												<Clock className="h-3 w-3" />
												{s.open_now ? '开放中' : `${formatHour(s.open_hour_start)}-${formatHour(s.open_hour_end)}`}
											</span>
										) : null}
										<span className="inline-flex items-center gap-1">
											<Play className="h-3 w-3" />
											{s.play_count || 0}
										</span>
										<span>{formatRelative(s.updated_at)}</span>
									</div>
								</div>
								<div className="relative mt-3 flex items-center justify-end text-fuchsia-300/0 group-hover:text-fuchsia-300/80 transition">
									<span className="inline-flex items-center gap-1 text-xs">
										进入剧本
										<ArrowRight className="h-3 w-3" />
									</span>
								</div>
							</a>
						))}
					</div>
				)}

				{/* 我创作的剧本（创作者） */}
				{isCreator ? (
					<MyScenariosSection />
				) : null}

				{/* 底部说明 */}
				<Card className="border-violet-900/20 bg-[#0B0F1E]/40">
					<CardContent className="py-4 text-xs leading-relaxed text-violet-300/50">
						<p className="mb-1">
							<Star className="inline h-3 w-3 mr-1 text-amber-300/70" />
							夜剧场为邀请制创作者生态。如果你也想成为夜作者，可向社区申请邀请码。
						</p>
						<p>
							<Flame className="inline h-3 w-3 mr-1 text-rose-300/70" />
							每个剧本的结局会被记录为徽章，重玩不影响已收集的结局。
						</p>
					</CardContent>
				</Card>
			</div>
		</PageShell>
	);
}

function MyScenariosSection() {
	const [myList, setMyList] = React.useState<Array<ScenarioItem & { status?: string }>>([]);
	const [loaded, setLoaded] = React.useState(false);

	React.useEffect(() => {
		apiFetch<{ scenarios: any[] }>('/scenarios/my')
			.then((r) => setMyList(r.scenarios || []))
			.catch(() => {})
			.finally(() => setLoaded(true));
	}, []);

	if (!loaded || myList.length === 0) return null;

	return (
		<section className="space-y-3">
			<div className="flex items-baseline justify-between">
				<h2 className="font-serif text-lg text-amber-100 flex items-center gap-2">
					<Crown className="h-4 w-4 text-amber-300" />
					我创作的剧本
				</h2>
				<a
					href="/scenario-editor.html"
					className="text-xs text-fuchsia-300/70 hover:text-fuchsia-200"
				>
					+ 新建
				</a>
			</div>
			<div className="grid gap-2">
				{myList.map((s) => (
					<div
						key={s.id}
						className="flex items-center gap-3 rounded-lg border border-violet-900/30 bg-white/5 p-3 text-sm"
					>
						<span className="text-2xl">{s.cover_emoji || '🌙'}</span>
						<div className="flex-1 min-w-0">
							<div className="font-serif text-violet-50 truncate">{s.title}</div>
							<div className="text-[11px] text-violet-300/50">
								{s.status === 'published' ? (
									<span className="text-emerald-300/70">已发布</span>
								) : (
									<span className="text-amber-300/70">草稿</span>
								)}
								{' · '}
								{s.play_count || 0} 次上演
								{' · '}
								{s.ending_count || 0} 个结局
							</div>
						</div>
						<a
							href={`/scenario-editor.html?id=${s.id}`}
							className="rounded-md border border-violet-400/30 bg-violet-500/10 px-2.5 py-1 text-xs text-violet-200 hover:bg-violet-500/20"
						>
							编辑
						</a>
						{s.status === 'published' ? (
							<a
								href={`/scenario-play.html?slug=${encodeURIComponent(s.slug)}`}
								className="rounded-md border border-fuchsia-400/30 bg-fuchsia-500/10 px-2.5 py-1 text-xs text-fuchsia-200 hover:bg-fuchsia-500/20"
							>
								试玩
							</a>
						) : null}
					</div>
				))}
			</div>
		</section>
	);
}
