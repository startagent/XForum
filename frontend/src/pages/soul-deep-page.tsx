import * as React from 'react';
import {
	AlertTriangle, ArrowRight, Check, Compass, Download, Moon, Orbit, RotateCcw,
	Share2, Sparkles, Star, TrendingUp, Users,
} from 'lucide-react';

import { PageShell } from '@/components/page-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiFetch, getSecurityHeaders } from '@/lib/api';
import { getUser } from '@/lib/auth';

interface Dim { code: string; name: string; pole: string; desc: string; color: string; }
interface Planet {
	code: string; name: string; emoji: string; desc: string; tagline: string; color: string;
	dims: string[]; complementary?: string[]; chemistry?: string[]; friction?: string[]; seeking?: string;
}
interface RelationMode { code: string; name: string; desc: string; tagline: string; emoji: string; }
interface Question { id: number; text: string; options: Array<{ label: string; scores: Record<string, number> }>; }

interface TypesPayload {
	disclaimer: string;
	dims: Dim[];
	planets: Planet[];
	relation_modes: RelationMode[];
	questions: Question[];
}

interface HistoryItem {
	planet_code: string; planet_name: string; relation_mode: string | null; created_at: string;
}

export function SoulDeepPage() {
	const [step, setStep] = React.useState<'intro' | 'quiz' | 'result'>('intro');
	const [data, setData] = React.useState<TypesPayload | null>(null);
	const [current, setCurrent] = React.useState(0);
	const [answers, setAnswers] = React.useState<number[]>([]);
	const [result, setResult] = React.useState<{
		planet: Planet;
		relation: RelationMode;
		scores: Record<string, number>;
		topDims: Array<{ dim: Dim; score: number; pct: number }>;
	} | null>(null);
	const [saved, setSaved] = React.useState(false);
	const [history, setHistory] = React.useState<HistoryItem[]>([]);
	const [existing, setExisting] = React.useState<{ planet_code: string; planet_name: string; relation_mode: string | null } | null>(null);
	const user = React.useMemo(() => getUser(), []);

	React.useEffect(() => {
		apiFetch<TypesPayload>('/soul-deep/types').then(setData).catch(() => {});
		if (user) {
			apiFetch<{ result: { planet_code: string; planet_name: string; relation_mode: string | null } | null }>('/soul-deep')
				.then((r) => { if (r.result) setExisting(r.result); })
				.catch(() => {});
			apiFetch<{ history: HistoryItem[] }>('/soul-deep/history')
				.then((r) => setHistory(r.history || []))
				.catch(() => {});
		}
	}, [user]);

	function start() {
		setStep('quiz');
		setCurrent(0);
		setAnswers([]);
	}

	function answer(optionIndex: number) {
		if (!data) return;
		const next = [...answers, optionIndex];
		setAnswers(next);
		if (current < data.questions.length - 1) {
			setCurrent(current + 1);
		} else {
			// 计算分数
			const s: Record<string, number> = {};
			data.dims.forEach((d) => (s[d.code] = 0));
			for (let i = 0; i < next.length; i++) {
				const opt = data.questions[i].options[next[i]];
				for (const [k, v] of Object.entries(opt.scores)) {
					s[k] = (s[k] || 0) + v;
				}
			}
			// 推算星球
			const sorted = Object.entries(s).sort((a, b) => b[1] - a[1]);
			const topCode = sorted[0]?.[0];
			let planet = data.planets.find((p) => p.dims.includes(topCode || ''));
			if (!planet) {
				const second = sorted[1]?.[0];
				planet = data.planets.find((p) => p.dims.includes(second || '')) || data.planets[0];
			}
			// 推算关系期待
			const bnd = s.BND || 0, int = s.INT || 0, flow = s.FLOW || 0, emp = s.EMP || 0;
			let relation = data.relation_modes[3];
			if (bnd >= 8 && int >= 8) relation = data.relation_modes[0];
			else if (flow >= 8 && int >= 5) relation = data.relation_modes[1];
			else if (bnd <= 5 && emp >= 7) relation = data.relation_modes[2];
			// Top 维度
			const maxScore = sorted[0]?.[1] || 1;
			const topDims = sorted.slice(0, 5).map(([code, sc]) => ({
				dim: data.dims.find((d) => d.code === code) || data.dims[0],
				score: sc,
				pct: Math.round((sc / maxScore) * 100),
			}));
			setResult({ planet, relation, scores: s, topDims });
			setStep('result');
		}
	}

	async function saveResult() {
		if (!result || saved) return;
		try {
			await apiFetch('/soul-deep', {
				method: 'POST',
				headers: getSecurityHeaders('POST'),
				body: JSON.stringify({
					planet_code: result.planet.code,
					planet_name: result.planet.name,
					scores: result.scores,
				}),
			});
			setSaved(true);
			// 刷新历史
			apiFetch<{ history: HistoryItem[] }>('/soul-deep/history')
				.then((r) => setHistory(r.history || []))
				.catch(() => {});
		} catch (e) {
			console.error('Save soul-deep result failed:', e);
		}
	}

	React.useEffect(() => {
		if (step === 'result' && result && !saved && user) saveResult();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [step, result, saved, user]);

	function reset() {
		setStep('intro');
		setCurrent(0);
		setAnswers([]);
		setResult(null);
		setSaved(false);
	}

	function share() {
		if (!result) return;
		const text = `我在「未眠」灵魂深度测试中落在 ${result.planet.emoji} ${result.planet.name}：${result.planet.tagline}\n关系期待：${result.relation.emoji} ${result.relation.name}\n${window.location.origin}/soul-deep.html`;
		if (navigator.share) {
			navigator.share({ title: '未眠 · 灵魂深度', text }).catch(() => {});
		} else {
			navigator.clipboard?.writeText(text);
			alert('结果已复制，去分享给那个人');
		}
	}

	// 生成分享图卡
	function generateShareImage() {
		if (!result) return;
		const W = 1080, H = 1500;
		const canvas = document.createElement('canvas');
		canvas.width = W; canvas.height = H;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;
		// 背景
		const bg = ctx.createLinearGradient(0, 0, W, H);
		bg.addColorStop(0, '#0B0F1E');
		bg.addColorStop(0.4, '#1A0B2E');
		bg.addColorStop(1, '#2A0B1E');
		ctx.fillStyle = bg;
		ctx.fillRect(0, 0, W, H);
		// 光晕
		const glow = ctx.createRadialGradient(W / 2, 360, 50, W / 2, 360, 500);
		glow.addColorStop(0, `${result.planet.color}55`);
		glow.addColorStop(1, 'transparent');
		ctx.fillStyle = glow;
		ctx.fillRect(0, 0, W, 720);
		// 顶部品牌
		ctx.textAlign = 'center';
		ctx.fillStyle = '#A78BFA';
		ctx.font = '500 28px -apple-system, "PingFang SC", sans-serif';
		ctx.fillText('SLEEPLESS · 未眠', W / 2, 100);
		ctx.fillStyle = '#E9D5FF';
		ctx.font = '300 22px -apple-system, "PingFang SC", sans-serif';
		ctx.fillText('Soul Deep · 灵魂深度', W / 2, 140);
		// 星球 emoji
		ctx.font = '180px -apple-system, "Apple Color Emoji", sans-serif';
		ctx.fillText(result.planet.emoji, W / 2, 350);
		// 星球名
		ctx.fillStyle = '#FFFFFF';
		ctx.font = '600 96px "Songti SC", "STSong", serif';
		ctx.fillText(result.planet.name, W / 2, 470);
		// tagline
		ctx.fillStyle = result.planet.color;
		ctx.font = 'italic 30px "Songti SC", serif';
		ctx.fillText(result.planet.tagline, W / 2, 525);
		// 分隔
		ctx.strokeStyle = 'rgba(167, 139, 250, 0.3)';
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(W / 2 - 220, 580);
		ctx.lineTo(W / 2 + 220, 580);
		ctx.stroke();
		// 关系期待
		ctx.fillStyle = '#9CA3AF';
		ctx.font = '400 22px -apple-system';
		ctx.fillText('关系期待', W / 2, 640);
		ctx.font = '40px -apple-system, "Apple Color Emoji", sans-serif';
		ctx.fillText(result.relation.emoji, W / 2 - 160, 695);
		ctx.fillStyle = '#FCD34D';
		ctx.font = '500 40px "Songti SC", serif';
		ctx.textAlign = 'left';
		ctx.fillText(result.relation.name, W / 2 - 100, 700);
		ctx.textAlign = 'center';
		// 描述
		ctx.fillStyle = '#E9D5FF';
		ctx.font = '400 26px "Songti SC", serif';
		ctx.textAlign = 'left';
		wrapText(ctx, result.planet.desc, 140, 800, W - 280, 38);
		// 维度雷达（用条形图替代）
		ctx.textAlign = 'center';
		ctx.fillStyle = '#9CA3AF';
		ctx.font = '400 22px -apple-system';
		ctx.fillText('维度分布 · Top 5', W / 2, 1020);
		const entries = result.topDims.slice(0, 5);
		const maxSc = Math.max(...entries.map((e) => e.score), 1);
		const segH = 32, segGap = 10, startY = 1060;
		entries.forEach((e, i) => {
			const y = startY + i * (segH + segGap);
			const w = (e.score / maxSc) * 580;
			ctx.fillStyle = e.dim.color;
			ctx.fillRect(W / 2 - 290, y, w, segH);
			ctx.fillStyle = '#E9D5FF';
			ctx.font = '400 18px -apple-system';
			ctx.textAlign = 'left';
			ctx.fillText(`${e.dim.code} · ${e.dim.name}`, W / 2 + 300, y + 22);
			ctx.textAlign = 'center';
		});
		// 底部
		ctx.fillStyle = '#A78BFA';
		ctx.font = 'italic 28px "Songti SC", serif';
		ctx.fillText('夜深了，另一个你醒着。', W / 2, 1350);
		ctx.fillStyle = '#6B7280';
		ctx.font = '400 22px -apple-system';
		ctx.fillText(`${window.location.origin}/soul-deep.html`, W / 2, 1410);
		// 触发下载
		const link = document.createElement('a');
		link.download = `sleepless-soul-deep-${result.planet.code}-${Date.now()}.png`;
		link.href = canvas.toDataURL('image/png');
		link.click();
	}

	function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
		const chars = text.split('');
		let line = '';
		let curY = y;
		for (const ch of chars) {
			const test = line + ch;
			if (ctx.measureText(test).width > maxWidth && line) {
				ctx.fillText(line, x, curY);
				line = ch;
				curY += lineHeight;
			} else {
				line = test;
			}
		}
		if (line) ctx.fillText(line, x, curY);
	}

	if (!data) {
		return (
			<PageShell>
				<div className="mx-auto max-w-2xl py-20 text-center text-violet-300/60 text-sm">载入中…</div>
			</PageShell>
		);
	}

	const progress = data ? Math.round(((current + (step === 'result' ? 1 : 0)) / data.questions.length) * 100) : 0;
	const currentQ = data.questions[current];

	return (
		<PageShell>
			<div className="mx-auto max-w-2xl space-y-6">
				{/* 顶部品牌 */}
				<div className="text-center space-y-2 py-4">
					<div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-[11px] tracking-[0.2em] text-violet-200 uppercase">
						<Moon className="h-3 w-3" />
						Soul Deep · 灵魂深度
					</div>
					<h1 className="font-serif text-3xl text-transparent bg-clip-text bg-gradient-to-r from-white via-violet-100 to-amber-100">
						今夜的你，落在哪颗星球？
					</h1>
					<p className="text-xs text-violet-300/60">8 维度 · 40 题 · 5 个灵魂星球</p>
				</div>

				{/* 已有结果提示 */}
				{existing && step === 'intro' && (
					<Card className="border-amber-500/30 bg-amber-500/5 text-amber-100">
						<CardContent className="py-3 flex items-center gap-3 text-sm">
							<Star className="h-4 w-4 text-amber-300 flex-shrink-0" />
							<div className="flex-1">
								你已测过：<span className="font-serif text-amber-200">{existing.planet_name}</span>
								{existing.relation_mode ? <span className="text-amber-100/70"> · {data.relation_modes.find((r) => r.code === existing.relation_mode)?.name}</span> : null}
							</div>
							<Button onClick={start} variant="outline" size="sm" className="border-amber-400/40 text-amber-200 hover:bg-amber-500/10">
								重测
							</Button>
						</CardContent>
					</Card>
				)}

				{/* intro */}
				{step === 'intro' && (
					<Card className="border-violet-900/30 bg-gradient-to-br from-[#0B0F1E] via-[#13102B] to-[#1A0B2E] text-violet-50">
						<CardHeader>
							<CardTitle className="font-serif text-2xl text-center">灵魂深度测试</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-200/80 flex gap-2">
								<AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
								<div>
									{data.disclaimer}
								</div>
							</div>
							<p className="text-sm text-violet-100/80 leading-relaxed text-center">
								比 BDSM 更深一层。
								<br />
								测关系风格、情绪底色，以及——你在等怎样的人。
							</p>
							<div className="grid grid-cols-3 gap-2 pt-2">
								{[
									{ n: String(data.dims.length), l: '维度' },
									{ n: String(data.questions.length), l: '道题' },
									{ n: String(data.planets.length), l: '星球' },
								].map((x) => (
									<div key={x.l} className="rounded-md border border-violet-500/20 bg-white/5 p-3 text-center">
										<div className="font-serif text-xl text-violet-200">{x.n}</div>
										<div className="text-[10px] text-violet-300/50 mt-0.5">{x.l}</div>
									</div>
								))}
							</div>
							{/* 5 星球预览 */}
							<div className="grid grid-cols-5 gap-2 pt-1">
								{data.planets.map((p) => (
									<div key={p.code} className="text-center" title={p.name}>
										<div className="text-2xl">{p.emoji}</div>
										<div className="text-[10px] text-violet-200/70 mt-0.5 truncate">{p.name}</div>
									</div>
								))}
							</div>
							{/* 4 关系模式预览 */}
							<div className="grid grid-cols-4 gap-2 pt-1">
								{data.relation_modes.map((r) => (
									<div key={r.code} className="text-center rounded-md border border-amber-500/20 bg-amber-500/5 p-2">
										<div className="text-lg">{r.emoji}</div>
										<div className="text-[10px] text-amber-200/80 mt-0.5 truncate">{r.name}</div>
									</div>
								))}
							</div>
							<Button
								onClick={start}
								className="mt-4 w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500"
							>
								<Sparkles className="h-4 w-4 mr-2" />
								开始测定
							</Button>
							<p className="text-[11px] text-violet-300/50 pt-1 text-center">
								结果仅自己可见 · 可查看与他人的契合度
							</p>
						</CardContent>
					</Card>
				)}

				{/* quiz */}
				{step === 'quiz' && currentQ && (
					<Card className="border-violet-900/30 bg-gradient-to-br from-[#0B0F1E] via-[#13102B] to-[#1A0B2E] text-violet-50">
						<CardContent className="space-y-4 pt-6">
							<div className="space-y-1">
								<div className="flex justify-between text-[11px] text-violet-300/60">
									<span>{current + 1} / {data.questions.length}</span>
									<span>{progress}%</span>
								</div>
								<div className="h-1 w-full overflow-hidden rounded-full bg-violet-900/40">
									<div
										className="h-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-amber-500 transition-all"
										style={{ width: `${progress}%` }}
									/>
								</div>
							</div>
							<h2 className="pt-2 font-serif text-xl leading-relaxed text-violet-50">{currentQ.text}</h2>
							<div className="space-y-2">
								{currentQ.options.map((opt, i) => (
									<button
										key={i}
										onClick={() => answer(i)}
										className="w-full rounded-lg border border-violet-900/40 bg-white/5 px-4 py-3 text-left text-sm text-violet-100 transition hover:border-fuchsia-500/50 hover:bg-fuchsia-500/10"
									>
										{opt.label}
									</button>
								))}
							</div>
						</CardContent>
					</Card>
				)}

				{/* result */}
				{step === 'result' && result && (
					<>
						{/* 星球卡 */}
						<Card className="border-violet-900/30 bg-gradient-to-br from-[#0B0F1E] via-[#13102B] to-[#1A0B2E] text-violet-50 overflow-hidden">
							<div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${result.planet.color}, transparent)` }} />
							<CardHeader>
								<CardTitle className="text-sm font-normal text-violet-200/70">你的灵魂星球</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="flex items-baseline gap-4">
									<span className="text-7xl">{result.planet.emoji}</span>
									<div>
										<div className="font-serif text-3xl text-white">{result.planet.name}</div>
										<div className="text-xs italic" style={{ color: result.planet.color }}>{result.planet.tagline}</div>
									</div>
								</div>
								<p className="text-sm leading-relaxed text-violet-100/80 font-serif">{result.planet.desc}</p>
								{result.planet.seeking ? (
									<div className="rounded-md border border-fuchsia-500/20 bg-fuchsia-500/5 p-3 text-xs text-fuchsia-100/80 flex gap-2">
										<Compass className="h-4 w-4 flex-shrink-0 mt-0.5 text-fuchsia-300" />
										<div>
											<span className="text-fuchsia-200/60">你在寻找：</span>
											{result.planet.seeking}
										</div>
									</div>
								) : null}
							</CardContent>
						</Card>

						{/* 关系期待 */}
						<Card className="border-amber-900/30 bg-gradient-to-br from-[#0B0F1E] to-[#1A1208] text-violet-50">
							<CardHeader>
								<CardTitle className="text-sm font-normal text-amber-200/70">你的关系期待</CardTitle>
							</CardHeader>
							<CardContent className="space-y-3">
								<div className="flex items-center gap-3">
									<span className="text-4xl">{result.relation.emoji}</span>
									<div>
										<div className="font-serif text-2xl text-amber-100">{result.relation.name}</div>
										<div className="text-xs italic text-amber-200/60">{result.relation.tagline}</div>
									</div>
								</div>
								<p className="text-sm text-amber-100/70 leading-relaxed">{result.relation.desc}</p>
							</CardContent>
						</Card>

						{/* 维度分布 */}
						<Card className="border-violet-900/30 bg-[#0B0F1E] text-violet-50">
							<CardHeader>
								<CardTitle className="text-sm font-normal text-violet-200/70">维度光谱 · Top 5</CardTitle>
							</CardHeader>
							<CardContent className="space-y-2">
								{result.topDims.map((td, i) => (
									<div key={td.dim.code} className="flex items-center gap-3">
										<span className="font-serif text-lg w-6 text-center text-violet-200/60">
											{i === 0 ? '①' : i === 1 ? '②' : i === 2 ? '③' : i === 3 ? '④' : '⑤'}
										</span>
										<div className="flex-1 min-w-0">
											<div className="flex items-baseline gap-2">
												<span className="font-serif text-sm text-white">{td.dim.name}</span>
												<span className="text-[10px] text-violet-300/50">{td.dim.code}</span>
											</div>
											<div className="text-[10px] italic text-violet-200/50 truncate">{td.dim.pole}</div>
											<div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-violet-900/30">
												<div className="h-full rounded-full" style={{ width: `${td.pct}%`, background: td.dim.color }} />
											</div>
										</div>
										<span className="text-xs text-violet-300/50 w-8 text-right">{td.pct}%</span>
									</div>
								))}
							</CardContent>
						</Card>

						{/* 匹配映射 */}
						<Card className="border-fuchsia-900/30 bg-gradient-to-br from-[#0B0F1E] to-[#1A0B2E] text-violet-50">
							<CardHeader>
								<CardTitle className="text-sm font-normal text-fuchsia-200/70 flex items-center gap-2">
									<Users className="h-4 w-4" />
									谁会与你共鸣
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-3 text-xs">
								{result.planet.chemistry && result.planet.chemistry.length > 0 && (
									<div className="flex items-start gap-2">
										<span className="text-fuchsia-300/70 w-16 flex-shrink-0">化学共鸣</span>
										<div className="flex flex-wrap gap-2">
											{result.planet.chemistry.map((code) => {
												const p = data.planets.find((x) => x.code === code);
												return p ? (
													<span key={code} className="inline-flex items-center gap-1 rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 px-2 py-0.5 text-fuchsia-200">
														{p.emoji} {p.name}
													</span>
												) : null;
											})}
										</div>
									</div>
								)}
								{result.planet.complementary && result.planet.complementary.length > 0 && (
									<div className="flex items-start gap-2">
										<span className="text-amber-300/70 w-16 flex-shrink-0">互补契合</span>
										<div className="flex flex-wrap gap-2">
											{result.planet.complementary.map((code) => {
												const p = data.planets.find((x) => x.code === code);
												return p ? (
													<span key={code} className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-amber-200">
														{p.emoji} {p.name}
													</span>
												) : null;
											})}
										</div>
									</div>
								)}
								{result.planet.friction && result.planet.friction.length > 0 && (
									<div className="flex items-start gap-2">
										<span className="text-rose-300/70 w-16 flex-shrink-0">张力摩擦</span>
										<div className="flex flex-wrap gap-2">
											{result.planet.friction.map((code) => {
												const p = data.planets.find((x) => x.code === code);
												return p ? (
													<span key={code} className="inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-rose-200">
														{p.emoji} {p.name}
													</span>
												) : null;
											})}
										</div>
									</div>
								)}
							</CardContent>
						</Card>

						{/* 测试轨迹 */}
						{history.length > 1 && (
							<Card className="border-violet-900/30 bg-[#0B0F1E] text-violet-50">
								<CardHeader>
									<CardTitle className="text-sm font-normal text-violet-200/70 flex items-center gap-2">
										<TrendingUp className="h-4 w-4" />
										你的灵魂轨迹
									</CardTitle>
								</CardHeader>
								<CardContent>
									<div className="flex flex-wrap gap-2">
										{history.slice(0, 8).map((h, i) => {
											const p = data.planets.find((x) => x.code === h.planet_code);
											return (
												<div key={i} className="rounded-md border border-violet-500/20 bg-white/5 px-2 py-1 text-[10px] text-violet-100/70">
													{p?.emoji || '🌙'} {h.planet_name}
													<div className="text-[9px] text-violet-300/40 mt-0.5">
														{new Date(h.created_at).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
													</div>
												</div>
											);
										})}
									</div>
								</CardContent>
							</Card>
						)}

						{/* 操作按钮 */}
						<div className="flex flex-wrap gap-3">
							<Button onClick={share} className="flex-1 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500">
								<Share2 className="h-4 w-4 mr-2" />
								分享
							</Button>
							<Button onClick={generateShareImage} variant="outline" className="flex-1 border-fuchsia-500/40 text-fuchsia-200 hover:bg-fuchsia-500/10">
								<Download className="h-4 w-4 mr-2" />
								保存图卡
							</Button>
							<Button onClick={reset} variant="outline" className="border-violet-500/30 text-violet-200 hover:bg-violet-500/10">
								<RotateCcw className="h-4 w-4 mr-2" />
								重测
							</Button>
						</div>

						{saved && (
							<div className="text-center text-xs text-violet-300/60 flex items-center justify-center gap-1">
								<Check className="h-3 w-3" />
								结果已保存（仅自己可见）
							</div>
						)}

						{/* 入口：夜剧场 */}
						<Card className="border-violet-900/30 bg-gradient-to-br from-[#0B0F1E] to-[#13102B] text-violet-50">
							<CardContent className="py-4 flex items-center gap-3">
								<Orbit className="h-5 w-5 text-violet-300" />
								<div className="flex-1 text-sm">
									<div className="font-serif text-violet-100">基于你的星球，进入夜剧场</div>
									<div className="text-[11px] text-violet-300/60">挑一个为你推荐的剧本</div>
								</div>
								<a href="/scenarios.html" className="inline-flex items-center gap-1 text-xs text-fuchsia-300 hover:underline">
									去夜剧场 <ArrowRight className="h-3 w-3" />
								</a>
							</CardContent>
						</Card>

						{!user ? (
							<div className="text-center text-xs text-violet-300/50">
								<a href="/login.html" className="text-fuchsia-300 hover:underline">登入</a> 后结果会保存到你的资料，并能查看与他人的匹配度
							</div>
						) : null}
					</>
				)}
			</div>
		</PageShell>
	);
}
