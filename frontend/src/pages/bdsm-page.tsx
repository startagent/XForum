import * as React from 'react';
import { RotateCcw, Share2, Check, Download, Moon, AlertTriangle } from 'lucide-react';

import { PageShell } from '@/components/page-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiFetch, getSecurityHeaders } from '@/lib/api';
import { getUser } from '@/lib/auth';

interface BdsmType {
	code: string;
	name: string;
	tagline: string;
	desc: string;
	color: string;
}
interface Question { id: number; text: string; options: Array<{ label: string; scores: Record<string, number> }>; }
interface TypesPayload {
	disclaimer: string;
	types: BdsmType[];
	questions: Question[];
}

export function BdsmPage() {
	const [step, setStep] = React.useState<'intro' | 'quiz' | 'result'>('intro');
	const [data, setData] = React.useState<TypesPayload | null>(null);
	const [current, setCurrent] = React.useState(0);
	const [answers, setAnswers] = React.useState<number[]>([]);
	const [result, setResult] = React.useState<{ main: BdsmType; scores: Record<string, number> } | null>(null);
	const [saved, setSaved] = React.useState(false);
	const user = React.useMemo(() => getUser(), []);

	React.useEffect(() => {
		apiFetch('/bdsm/types').then((r) => r.json() as Promise<TypesPayload>).then(setData).catch(() => {});
	}, []);

	function start() {
		setStep('quiz');
		setCurrent(0);
		setAnswers([]);
	}

	function answer(optionIndex: number) {
		if (!data) return;
		const newAnswers = [...answers, optionIndex];
		setAnswers(newAnswers);
		if (current < data.questions.length - 1) {
			setCurrent(current + 1);
		} else {
			const s: Record<string, number> = {};
			for (let i = 0; i < newAnswers.length; i++) {
				const opt = data.questions[i].options[newAnswers[i]];
				for (const [k, v] of Object.entries(opt.scores)) {
					s[k] = (s[k] || 0) + v;
				}
			}
			const sorted = Object.entries(s).sort((a, b) => b[1] - a[1]);
			const mainCode = sorted[0]?.[0] || 'V';
			const main = data.types.find((t) => t.code === mainCode) || data.types[0];
			setResult({ main, scores: s });
			setStep('result');
		}
	}

	function reset() {
		setStep('intro');
		setCurrent(0);
		setAnswers([]);
		setResult(null);
		setSaved(false);
	}

	async function saveResult() {
		if (!result || saved) return;
		try {
			await apiFetch('/bdsm', {
				method: 'POST',
				headers: getSecurityHeaders('POST'),
				body: JSON.stringify({
					code: result.main.code,
					name: result.main.name,
					scores: result.scores,
				}),
			});
			setSaved(true);
		} catch (e) {
			console.error('Save bdsm result failed:', e);
		}
	}

	React.useEffect(() => {
		if (step === 'result' && result && !saved && user) saveResult();
	}, [step, result, saved, user]);

	function share() {
		if (!result) return;
		const text = `我在「未眠」测了夜人格深度版：${result.main.name} —— ${result.main.tagline}\n${window.location.origin}/bdsm.html`;
		if (navigator.share) {
			navigator.share({ title: '未眠 · 夜人格深度版', text }).catch(() => {});
		} else {
			navigator.clipboard?.writeText(text);
			alert('已复制到剪贴板');
		}
	}

	function generateShareImage() {
		if (!result) return;
		const W = 1080;
		const H = 1350;
		const canvas = document.createElement('canvas');
		canvas.width = W;
		canvas.height = H;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		const bg = ctx.createLinearGradient(0, 0, W, H);
		bg.addColorStop(0, '#0B0F1E');
		bg.addColorStop(0.5, '#1A0B2E');
		bg.addColorStop(1, '#2A0B1E');
		ctx.fillStyle = bg;
		ctx.fillRect(0, 0, W, H);

		const glow = ctx.createRadialGradient(W / 2, 350, 50, W / 2, 350, 500);
		glow.addColorStop(0, `${result.main.color}55`);
		glow.addColorStop(1, 'transparent');
		ctx.fillStyle = glow;
		ctx.fillRect(0, 0, W, 700);

		ctx.textAlign = 'center';
		ctx.fillStyle = '#A78BFA';
		ctx.font = '500 28px -apple-system, "PingFang SC", sans-serif';
		ctx.fillText('SLEEPLESS · 未眠', W / 2, 110);

		ctx.fillStyle = '#E9D5FF';
		ctx.font = '300 22px -apple-system, "PingFang SC", sans-serif';
		ctx.fillText('夜人格 · 深度版', W / 2, 150);

		ctx.fillStyle = result.main.color;
		ctx.font = '500 200px "Songti SC", serif';
		ctx.fillText(result.main.code, W / 2, 400);

		ctx.fillStyle = '#FFFFFF';
		ctx.font = '600 90px "Songti SC", serif';
		ctx.fillText(result.main.name, W / 2, 500);

		ctx.fillStyle = result.main.color;
		ctx.font = 'italic 28px "Songti SC", serif';
		ctx.fillText(result.main.tagline, W / 2, 555);

		ctx.strokeStyle = 'rgba(167, 139, 250, 0.3)';
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(W / 2 - 200, 620);
		ctx.lineTo(W / 2 + 200, 620);
		ctx.stroke();

		ctx.fillStyle = '#E9D5FF';
		ctx.font = '400 26px "Songti SC", serif';
		ctx.textAlign = 'left';
		wrapText(ctx, result.main.desc, 140, 720, W - 280, 38);

		// 分布条
		ctx.textAlign = 'center';
		ctx.fillStyle = '#9CA3AF';
		ctx.font = '400 22px -apple-system';
		ctx.fillText('维度分布', W / 2, 1000);

		const entries = Object.entries(result.scores).sort((a, b) => b[1] - a[1]);
		const maxScore = Math.max(...entries.map((e) => e[1]), 1);
		const segH = 30;
		const segGap = 10;
		const startY = 1040;
		entries.forEach(([code, sc], i) => {
			const t = data?.types.find((x) => x.code === code);
			if (!t) return;
			const y = startY + i * (segH + segGap);
			const w = (sc / maxScore) * 600;
			ctx.fillStyle = t.color;
			ctx.fillRect(W / 2 - 300, y, w, segH);
			ctx.fillStyle = '#E9D5FF';
			ctx.font = '400 18px -apple-system';
			ctx.textAlign = 'left';
			ctx.fillText(`${t.code} · ${t.name}`, W / 2 + 310, y + 22);
			ctx.textAlign = 'center';
		});

		ctx.fillStyle = '#6B7280';
		ctx.font = '400 20px -apple-system';
		ctx.fillText('夜深了，你的是哪一种？', W / 2, 1280);

		const link = document.createElement('a');
		link.download = `sleepless-bdsm-${result.main.code}-${Date.now()}.png`;
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

	return (
		<PageShell>
			<div className="mx-auto max-w-2xl space-y-6">
				<div className="text-center space-y-2 py-4">
					<div className="inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-[11px] tracking-[0.2em] text-rose-200 uppercase">
						<Moon className="h-3 w-3" />
						Deep Night · 深度版
					</div>
					<h1 className="font-serif text-3xl text-transparent bg-clip-text bg-gradient-to-r from-white via-rose-100 to-fuchsia-100">
						夜人格 · 深度版
					</h1>
					<p className="text-xs text-violet-300/60">仅自我探索 · 结果仅自己可见</p>
				</div>

				{step === 'intro' && (
					<Card className="border-rose-900/30 bg-gradient-to-br from-[#0B0F1E] via-[#13102B] to-[#2A0B1E] text-violet-50">
						<CardHeader>
							<CardTitle className="font-serif text-2xl text-center">深度版夜人格</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-200/80 flex gap-2">
								<AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
								<div>
									本测试仅作自我探索用途，不鼓励任何非自愿行为。结果仅自己可见，不会出现在主页或公开统计中。
								</div>
							</div>
							<p className="text-sm text-violet-100/80 leading-relaxed text-center">
								比九型更靠近心底的那一层。
								<br />
								关于掌控、让渡、痛感、信任。
							</p>
							<div className="grid grid-cols-3 gap-2 pt-2">
								{[
									{ n: '6', l: '维度' },
									{ n: String(data.questions.length), l: '道题' },
									{ n: '私密', l: '仅自己可见' },
								].map((x) => (
									<div key={x.l} className="rounded-md border border-rose-500/20 bg-white/5 p-3 text-center">
										<div className="font-serif text-xl text-rose-200">{x.n}</div>
										<div className="text-[10px] text-violet-300/50 mt-0.5">{x.l}</div>
									</div>
								))}
							</div>
							<Button
								onClick={start}
								className="mt-4 w-full bg-gradient-to-r from-rose-700 to-fuchsia-700 hover:from-rose-600 hover:to-fuchsia-600"
							>
								开始测定
							</Button>
							<p className="text-[11px] text-violet-300/50 pt-1 text-center">
								本页面不被搜索引擎索引，也不会出现在站点导航
							</p>
						</CardContent>
					</Card>
				)}

				{step === 'quiz' && (
					<Card className="border-rose-900/30 bg-gradient-to-br from-[#0B0F1E] via-[#13102B] to-[#2A0B1E] text-violet-50">
						<CardContent className="space-y-4 pt-6">
							<div className="space-y-1">
								<div className="flex justify-between text-[11px] text-violet-300/60">
									<span>{current + 1} / {data.questions.length}</span>
									<span>{progress}%</span>
								</div>
								<div className="h-1 w-full overflow-hidden rounded-full bg-rose-900/40">
									<div className="h-full bg-gradient-to-r from-rose-500 to-fuchsia-500 transition-all" style={{ width: `${progress}%` }} />
								</div>
							</div>
							<h2 className="pt-2 font-serif text-xl text-violet-50">{data.questions[current].text}</h2>
							<div className="space-y-2">
								{data.questions[current].options.map((opt, i) => (
									<button
										key={i}
										onClick={() => answer(i)}
										className="w-full rounded-lg border border-rose-900/40 bg-white/5 px-4 py-3 text-left text-sm text-violet-100 transition hover:border-fuchsia-500/50 hover:bg-fuchsia-500/10"
									>
										{opt.label}
									</button>
								))}
							</div>
						</CardContent>
					</Card>
				)}

				{step === 'result' && result && (
					<>
						<Card className="border-rose-900/30 bg-gradient-to-br from-[#0B0F1E] via-[#13102B] to-[#2A0B1E] text-violet-50 overflow-hidden">
							<div className="h-1 w-full" style={{ background: result.main.color }} />
							<CardHeader>
								<CardTitle className="text-sm font-normal text-violet-200/70">你的夜人格 · 深度版</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="flex items-baseline gap-4">
									<span className="font-serif text-6xl" style={{ color: result.main.color }}>{result.main.code}</span>
									<div>
										<div className="font-serif text-3xl text-white">{result.main.name}</div>
										<div className="text-xs italic text-violet-200/70">{result.main.tagline}</div>
									</div>
								</div>
								<p className="text-sm leading-relaxed text-violet-100/80 font-serif">{result.main.desc}</p>
							</CardContent>
						</Card>

						<Card className="border-rose-900/30 bg-[#0B0F1E] text-violet-50">
							<CardHeader>
								<CardTitle className="text-sm font-normal text-violet-200/70">维度分布</CardTitle>
							</CardHeader>
							<CardContent className="space-y-2">
								{Object.entries(result.scores)
									.sort(([, a], [, b]) => b - a)
									.map(([code, sc]) => {
										const t = data.types.find((x) => x.code === code)!;
										const max = Math.max(...Object.values(result.scores), 1);
										const pct = (sc / max) * 100;
										return (
											<div key={code} className="flex items-center gap-3">
												<div className="w-24 text-xs text-violet-200/70">
													<span style={{ color: t.color }}>{t.code}</span> · {t.name}
												</div>
												<div className="h-2 flex-1 overflow-hidden rounded-full bg-rose-900/30">
													<div className="h-full rounded-full" style={{ width: `${pct}%`, background: t.color }} />
												</div>
												<div className="w-6 text-right text-[10px] text-violet-300/50">{sc}</div>
											</div>
										);
									})}
							</CardContent>
						</Card>

						<div className="flex flex-wrap gap-3">
							<Button onClick={share} className="flex-1 bg-gradient-to-r from-rose-700 to-fuchsia-700 hover:from-rose-600 hover:to-fuchsia-600">
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

						{!user ? (
							<div className="text-center text-xs text-violet-300/50">
								<a href="/login.html" className="text-fuchsia-300 hover:underline">登入</a> 后结果会保存到你的资料
							</div>
						) : null}
					</>
				)}
			</div>
		</PageShell>
	);
}
