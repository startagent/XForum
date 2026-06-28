import * as React from 'react';
import {
	ArrowLeft, Award, BookOpen, Clock, Crown, Lock, Play,
	RotateCcw, Sparkles, Star, Tag, Users,
} from 'lucide-react';

import { PageShell } from '@/components/page-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiFetch, getSecurityHeaders } from '@/lib/api';
import { getUser } from '@/lib/auth';

interface ScenarioDetail {
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
	variables: any;
	status: string;
	play_count: number;
	ending_count: number;
	author_name: string;
	author_avatar: string | null;
	author_role?: 'admin' | 'user' | 'creator';
}

interface Choice {
	id: number;
	node_id: number;
	label: string;
	target_node_id: number | null;
	required_state: Record<string, number> | null;
	sort_order: number;
}

interface PlayNode {
	id: number;
	scenario_id: number;
	parent_id: number | null;
	node_key: string;
	title: string | null;
	body: string;
	mood: string | null;
	is_ending: number;
	ending_type: string | null;
	ending_title: string | null;
	state_effects: Record<string, number> | null;
	letter: string | null;
}

interface PlayState {
	id: number;
	user_id: number;
	scenario_id: number;
	current_node_id: number;
	state_snapshot: Record<string, number>;
	reached_endings: Array<{ node_id: number; ending_type: string; ending_title: string }>;
}

interface EndingItem {
	id: number;
	node_key: string;
	ending_type: string;
	ending_title: string;
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

const ENDING_EMOJI: Record<string, string> = {
	good: '🌸', bad: '🥀', secret: '🌙', normal: '⭐', true: '💎',
};

function getQueryParam(name: string): string {
	const params = new URLSearchParams(window.location.search);
	return params.get(name) || '';
}

export function ScenarioPlayPage() {
	const slug = getQueryParam('slug') || getQueryParam('id');
	const [scenario, setScenario] = React.useState<ScenarioDetail | null>(null);
	const [endings, setEndings] = React.useState<EndingItem[]>([]);
	const [node, setNode] = React.useState<PlayNode | null>(null);
	const [choices, setChoices] = React.useState<Choice[]>([]);
	const [play, setPlay] = React.useState<PlayState | null>(null);
	const [loading, setLoading] = React.useState(true);
	const [error, setError] = React.useState('');
	const [busy, setBusy] = React.useState(false);
	const [toast, setToast] = React.useState<string>('');
	const [needsLogin, setNeedsLogin] = React.useState(false);
	const user = React.useMemo(() => getUser(), []);

	React.useEffect(() => {
		if (!slug) {
			setError('缺少剧本参数');
			setLoading(false);
			return;
		}
		// 加载剧本详情
		apiFetch<{ scenario: ScenarioDetail }>(`/scenarios/${encodeURIComponent(slug)}`)
			.then((r) => {
				setScenario(r.scenario);
				// 加载结局列表
				apiFetch<{ endings: EndingItem[] }>(`/scenarios/${r.scenario.id}/endings`)
					.then((er) => setEndings(er.endings || []))
					.catch(() => {});
			})
			.catch((e) => setError(String(e?.message || e)))
			.finally(() => setLoading(false));
	}, [slug]);

	function showToast(msg: string) {
		setToast(msg);
		setTimeout(() => setToast(''), 3200);
	}

	async function startPlay() {
		if (!scenario) return;
		if (!user) {
			setNeedsLogin(true);
			return;
		}
		setBusy(true);
		try {
			const res = await apiFetch<{ play: PlayState; node: PlayNode; choices: Choice[] }>(
				`/scenarios/${scenario.id}/play/start`,
				{ method: 'POST', headers: getSecurityHeaders('POST') }
			);
			setPlay(res.play);
			setNode(res.node);
			setChoices(res.choices || []);
		} catch (e: any) {
			showToast(e?.message || '开始失败');
		} finally {
			setBusy(false);
		}
	}

	async function chooseChoice(choice: Choice) {
		if (!scenario || !play || busy) return;
		// 校验前置条件
		if (choice.required_state) {
			for (const [k, v] of Object.entries(choice.required_state)) {
				if ((play.state_snapshot[k] || 0) < v) {
					showToast('此时此刻，你还不能这样选');
					return;
				}
			}
		}
		setBusy(true);
		try {
			const res = await apiFetch<{
				play: PlayState;
				node: PlayNode;
				choices: Choice[];
				badge_awarded: boolean;
			}>(`/scenarios/${scenario.id}/play/choose`, {
				method: 'POST',
				headers: getSecurityHeaders('POST'),
				body: JSON.stringify({ choice_id: choice.id }),
			});
			setPlay(res.play);
			setNode(res.node);
			setChoices(res.choices || []);
			if (res.badge_awarded && res.node?.is_ending) {
				showToast(`✨ 解锁结局：${res.node.ending_title || '未命名结局'}`);
			}
		} catch (e: any) {
			showToast(e?.message || '推进失败');
		} finally {
			setBusy(false);
		}
	}

	async function resetPlay() {
		if (!scenario || !play) return;
		if (!confirm('确定要重置游玩进度吗？已解锁的结局徽章会保留。')) return;
		setBusy(true);
		try {
			await apiFetch(`/scenarios/${scenario.id}/play/reset`, {
				method: 'POST', headers: getSecurityHeaders('POST'),
			});
			await startPlay();
			showToast('已重置，重新开始');
		} catch (e: any) {
			showToast(e?.message || '重置失败');
		} finally {
			setBusy(false);
		}
	}

	if (loading) {
		return (
			<PageShell>
				<div className="mx-auto max-w-3xl py-20 text-center text-violet-300/60 text-sm">载入剧本中…</div>
			</PageShell>
		);
	}
	if (error || !scenario) {
		return (
			<PageShell>
				<div className="mx-auto max-w-3xl space-y-4 py-10">
					<Card className="border-rose-900/40 bg-rose-950/40 text-rose-100">
						<CardContent className="py-4 text-sm">{error || '剧本不存在'}</CardContent>
					</Card>
					<a href="/scenarios.html" className="inline-flex items-center gap-2 text-sm text-violet-300/70 hover:text-violet-200">
						<ArrowLeft className="h-4 w-4" />
						返回夜剧场
					</a>
				</div>
			</PageShell>
		);
	}

	// 进入页面但未开始游玩
	if (!play && !needsLogin) {
		return (
			<PageShell>
				<div className="mx-auto max-w-3xl space-y-5">
					<a href="/scenarios.html" className="inline-flex items-center gap-2 text-xs text-violet-300/60 hover:text-violet-200">
						<ArrowLeft className="h-3.5 w-3.5" />
						夜剧场
					</a>

					{/* 剧本封面 */}
					<Card className="border-violet-900/30 bg-gradient-to-br from-[#0B0F1E] via-[#13102B] to-[#1A0B2E] text-violet-50 overflow-hidden">
						<div className="h-1.5 w-full bg-gradient-to-r from-fuchsia-600 via-rose-500 to-amber-500" />
						<CardContent className="pt-6 space-y-4">
							<div className="flex gap-4">
								<div className="flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-xl border border-violet-500/30 bg-white/5 text-6xl">
									{scenario.cover_emoji || '🌙'}
								</div>
								<div className="flex-1 space-y-2">
									<div className="flex flex-wrap items-center gap-2">
										<h1 className="font-serif text-2xl text-white">{scenario.title}</h1>
										<span className={`rounded-full border px-2 py-0.5 text-[10px] ${CONTENT_LEVEL_STYLE[scenario.content_level] || CONTENT_LEVEL_STYLE['微光']}`}>
											{scenario.content_level}
										</span>
									</div>
									<p className="text-sm leading-relaxed text-violet-100/70">
										{scenario.summary || '夜作者未留下简介。直接进入剧本，让叙事带你走。'}
									</p>
								</div>
							</div>

							{/* 元信息 */}
							<div className="grid grid-cols-2 gap-2 sm:grid-cols-4 border-t border-violet-500/10 pt-3 text-xs">
								<div>
									<div className="text-[10px] tracking-[0.15em] text-violet-300/50 uppercase">剧本编号</div>
									<div className="text-violet-100">#{scenario.id}</div>
								</div>
								<div>
									<div className="text-[10px] tracking-[0.15em] text-violet-300/50 uppercase">结局数</div>
									<div className="text-amber-200">{endings.length || scenario.ending_count || 0} 个</div>
								</div>
								<div>
									<div className="text-[10px] tracking-[0.15em] text-violet-300/50 uppercase">已上演</div>
									<div className="text-violet-100">{scenario.play_count || 0} 次</div>
								</div>
								<div>
									<div className="text-[10px] tracking-[0.15em] text-violet-300/50 uppercase">作者</div>
									<div className="text-violet-100 flex items-center gap-1">
										{scenario.author_name}
										{scenario.author_role === 'creator' ? (
											<span className="inline-flex items-center gap-0.5 text-amber-200">
												<Crown className="h-2.5 w-2.5" />
											</span>
										) : null}
									</div>
								</div>
							</div>

							{/* 推荐星球 */}
							{scenario.recommended_planets && scenario.recommended_planets.length > 0 ? (
								<div className="rounded-md border border-fuchsia-500/20 bg-fuchsia-500/5 p-3 text-xs">
									<div className="flex items-center gap-1.5 text-fuchsia-200/70 mb-1">
										<Users className="h-3.5 w-3.5" />
										<span>推荐星球</span>
									</div>
									<div className="flex flex-wrap gap-2">
										{scenario.recommended_planets.map((p) => (
											<span key={p} className="rounded-full bg-fuchsia-500/10 px-2 py-0.5 text-fuchsia-200">
												{PLANET_EMOJI[p] || '🪐'} {p}
											</span>
										))}
									</div>
								</div>
							) : null}

							{/* 标签 */}
							{scenario.tags && scenario.tags.length > 0 ? (
								<div className="flex flex-wrap gap-1.5">
									{scenario.tags.map((t) => (
										<span key={t} className="inline-flex items-center gap-0.5 rounded-full bg-violet-500/10 px-2 py-0.5 text-[11px] text-violet-300/70">
											<Tag className="h-2.5 w-2.5" />
											{t}
										</span>
									))}
								</div>
							) : null}

							{/* 开放时段提示 */}
							{scenario.open_hour_start != null && scenario.open_hour_end != null ? (
								<div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-200/80 flex gap-2">
									<Clock className="h-4 w-4 flex-shrink-0 mt-0.5" />
									<div>
										本剧本仅在 <strong>{String(scenario.open_hour_start).padStart(2, '0')}:00 - {String(scenario.open_hour_end).padStart(2, '0')}:00</strong> 开放
									</div>
								</div>
							) : null}

							{/* 结局预览 */}
							{endings.length > 0 ? (
								<div className="space-y-1.5">
									<div className="text-[10px] tracking-[0.15em] text-violet-300/50 uppercase">可能结局</div>
									<div className="flex flex-wrap gap-1.5">
										{endings.map((e) => (
											<span key={e.id} className="inline-flex items-center gap-1 rounded-full border border-violet-500/20 bg-white/5 px-2 py-0.5 text-[11px] text-violet-200/60">
												{ENDING_EMOJI[e.ending_type] || '⭐'}
												<span className="truncate max-w-[8rem]">{e.ending_title || '未命名'}</span>
											</span>
										))}
									</div>
								</div>
							) : null}

							<Button
								onClick={startPlay}
								disabled={busy}
								className="w-full mt-2 bg-gradient-to-r from-fuchsia-600 to-rose-600 hover:from-fuchsia-500 hover:to-rose-500"
							>
								<Play className="h-4 w-4 mr-2" />
								{scenario.open_hour_start != null && scenario.open_hour_end != null ? (
									<>进入剧本</>
								) : (
									<>开始剧本</>
								)}
							</Button>
							<p className="text-[11px] text-violet-300/50 text-center">
								每个选择都会推进剧情，解锁的结局会被永久记录为徽章
							</p>
						</CardContent>
					</Card>
				</div>
			</PageShell>
		);
	}

	if (needsLogin) {
		return (
			<PageShell>
				<div className="mx-auto max-w-md py-16 text-center space-y-4">
					<Lock className="mx-auto h-10 w-10 text-violet-300/60" />
					<h2 className="font-serif text-xl text-violet-100">登录后才能开始</h2>
					<p className="text-sm text-violet-300/60">游玩进度和结局徽章需要绑定到你的账号</p>
					<a
						href={`/login.html?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`}
						className="inline-flex items-center gap-2 rounded-md bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm text-white"
					>
						前往登录
					</a>
				</div>
			</PageShell>
		);
	}

	// 游玩中
	const isEnding = node?.is_ending === 1;
	return (
		<PageShell>
			<div className="mx-auto max-w-3xl space-y-4">
				{/* 顶部：返回 + 标题 */}
				<div className="flex items-center justify-between">
					<a href={`/scenario-play.html?slug=${encodeURIComponent(scenario.slug)}`} onClick={(e) => { e.preventDefault(); if (confirm('要退出本次游玩吗？进度会保留。')) window.location.href = '/scenarios.html'; }} className="inline-flex items-center gap-1.5 text-xs text-violet-300/60 hover:text-violet-200">
						<ArrowLeft className="h-3.5 w-3.5" />
						退出
					</a>
					<div className="text-xs text-violet-300/50 flex items-center gap-2">
						<span>{scenario.cover_emoji}</span>
						<span className="font-serif text-violet-100">{scenario.title}</span>
					</div>
					{play ? (
						<button onClick={resetPlay} disabled={busy} className="inline-flex items-center gap-1 text-xs text-violet-300/60 hover:text-amber-200">
							<RotateCcw className="h-3 w-3" />
							重置
						</button>
					) : <span />}
				</div>

				{/* Toast */}
				{toast ? (
					<div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-100 text-center animate-pulse">
						{toast}
					</div>
				) : null}

				{/* 节点叙事 */}
				{node ? (
					<Card className={`border-violet-900/30 bg-gradient-to-br ${isEnding ? 'from-[#1A0B1E] via-[#2A0B2E] to-[#0B0F1E]' : 'from-[#0B0F1E] via-[#13102B] to-[#1A0B2E]'} text-violet-50`}>
						<div className={`h-1 w-full ${isEnding ? 'bg-gradient-to-r from-amber-500 via-rose-500 to-fuchsia-600' : 'bg-gradient-to-r from-violet-600 via-fuchsia-600 to-rose-500'}`} />
						<CardContent className="pt-6 space-y-4">
							{node.mood ? (
								<div className="text-[11px] tracking-[0.2em] uppercase text-violet-300/50">{node.mood}</div>
							) : null}
							{node.title ? (
								<h2 className="font-serif text-xl text-violet-50">{node.title}</h2>
							) : null}
							{/* 叙事正文 */}
							<div className="prose prose-invert max-w-none">
								{node.body.split(/\n+/).map((line, i) => (
									<p key={i} className="text-sm leading-relaxed text-violet-100/85 font-serif whitespace-pre-wrap">{line}</p>
								))}
							</div>

							{/* 状态变量可视化 */}
							{play && play.state_snapshot && Object.keys(play.state_snapshot).length > 0 ? (
								<StateVariables state={play.state_snapshot} />
							) : null}

							{/* 结局信件 */}
							{isEnding && node.letter ? (
								<div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
									<div className="flex items-center gap-1.5 text-[11px] tracking-[0.15em] uppercase text-amber-300/80">
										<Sparkles className="h-3 w-3" />
										一封留下的信
									</div>
									<div className="text-sm leading-relaxed text-amber-100/85 font-serif whitespace-pre-wrap">
										{node.letter}
									</div>
								</div>
							) : null}

							{/* 选项 */}
							{!isEnding && choices.length > 0 ? (
								<div className="space-y-2 pt-2">
									<div className="text-[11px] tracking-[0.15em] uppercase text-violet-300/50">你怎么选</div>
									{choices.map((c, idx) => {
										const locked = !!c.required_state && Object.entries(c.required_state).some(([k, v]) => (play?.state_snapshot[k] || 0) < v);
										return (
											<button
												key={c.id}
												onClick={() => chooseChoice(c)}
												disabled={busy || locked}
												className={`w-full rounded-lg border px-4 py-3 text-left text-sm transition ${locked
													? 'border-violet-900/30 bg-white/[0.02] text-violet-300/30 cursor-not-allowed'
													: 'border-violet-900/40 bg-white/5 text-violet-100 hover:border-fuchsia-500/50 hover:bg-fuchsia-500/10'
													}`}
											>
												<span className="text-violet-300/50 mr-2">{String.fromCharCode(65 + idx)}.</span>
												{c.label}
												{locked ? <Lock className="inline h-3 w-3 ml-1.5 text-violet-400/40" /> : null}
											</button>
										);
									})}
								</div>
							) : null}

							{/* 结局操作 */}
							{isEnding ? (
								<div className="space-y-3 pt-2">
									<div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-center space-y-1">
										<Award className="mx-auto h-8 w-8 text-amber-300" />
										<div className="text-[11px] tracking-[0.2em] uppercase text-amber-300/70">结局达成</div>
										<div className="font-serif text-lg text-amber-100">{node.ending_title || '未命名结局'}</div>
										<div className="text-[11px] text-amber-200/60">{ENDING_EMOJI[node.ending_type || 'normal'] || '⭐'} {node.ending_type || 'normal'}</div>
									</div>
									<div className="flex gap-2">
										<Button onClick={resetPlay} variant="outline" className="flex-1 border-violet-400/30 text-violet-200 hover:bg-violet-500/10">
											<RotateCcw className="h-3.5 w-3.5 mr-1.5" />
											再来一次
										</Button>
										<a
											href="/scenarios.html"
											className="flex-1 inline-flex items-center justify-center rounded-md border border-fuchsia-400/30 bg-fuchsia-500/10 px-4 py-2 text-sm text-fuchsia-200 hover:bg-fuchsia-500/20"
										>
											<BookOpen className="h-3.5 w-3.5 mr-1.5" />
											回到剧场
										</a>
									</div>
								</div>
							) : null}
						</CardContent>
					</Card>
				) : null}

				{/* 已达结局列表 */}
				{play && play.reached_endings && play.reached_endings.length > 0 ? (
					<Card className="border-amber-900/30 bg-[#0B0F1E]/60">
						<CardHeader>
							<CardTitle className="text-sm font-normal text-amber-200/70 flex items-center gap-2">
								<Star className="h-4 w-4" />
								已收集结局 · {play.reached_endings.length} / {endings.length || '?'}
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="grid gap-2 sm:grid-cols-2">
								{play.reached_endings.map((e, i) => (
									<div key={i} className="rounded-md border border-amber-500/20 bg-amber-500/5 p-2 text-xs text-amber-100/80 flex items-center gap-2">
										<span className="text-base">{ENDING_EMOJI[e.ending_type] || '⭐'}</span>
										<span className="truncate">{e.ending_title || '未命名结局'}</span>
									</div>
								))}
							</div>
						</CardContent>
					</Card>
				) : null}
			</div>
		</PageShell>
	);
}

function StateVariables({ state }: { state: Record<string, number> }) {
	const entries = Object.entries(state).filter(([, v]) => typeof v === 'number' && v !== 0);
	if (entries.length === 0) return null;
	const maxAbs = Math.max(...entries.map(([, v]) => Math.abs(v)), 1);
	return (
		<div className="rounded-md border border-violet-500/20 bg-white/5 p-3 space-y-1.5">
			<div className="text-[10px] tracking-[0.15em] uppercase text-violet-300/50">此刻的你</div>
			<div className="flex flex-wrap gap-x-3 gap-y-1.5">
				{entries.map(([k, v]) => {
					const pct = Math.min(100, Math.abs(v) / maxAbs * 100);
					const positive = v >= 0;
					return (
						<div key={k} className="flex items-center gap-1.5 text-[11px]">
							<span className="text-violet-300/60">{k}</span>
							<div className="relative h-1.5 w-12 rounded-full bg-violet-900/40 overflow-hidden">
								<div
									className={`absolute top-0 ${positive ? 'left-1/2 bg-fuchsia-400' : 'right-1/2 bg-violet-400'}`}
									style={{ width: `${pct / 2}%` }}
								/>
								<div className="absolute left-1/2 top-0 h-full w-px bg-violet-200/30" />
							</div>
							<span className={positive ? 'text-fuchsia-200' : 'text-violet-300'}>
								{v > 0 ? '+' : ''}{v}
							</span>
						</div>
					);
				})}
			</div>
		</div>
	);
}
