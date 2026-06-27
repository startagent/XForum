import * as React from 'react';
import { Compass, RotateCcw, Share2, Check, Download, Moon } from 'lucide-react';

import { PageShell } from '@/components/page-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiFetch, getSecurityHeaders } from '@/lib/api';
import { getUser } from '@/lib/auth';

// 9 型定义（与后端 /api/enneagram/types 对应）
interface EnneagramType {
	code: number;
	name: string;
	tagline: string;
	desc: string;
	color: string;
}

const TYPES: EnneagramType[] = [
	{ code: 1, name: '戒律者', tagline: '白天的规矩，夜里还在守', desc: '你有一个不肯妥协的内核。白天你为规矩而活，夜里你为完美的幻影而醒。你最大的痛苦是——世界总不达标。', color: '#94A3B8' },
	{ code: 2, name: '供养者', tagline: '给所有人光，自己摸黑', desc: '你的爱是主动的、是溢出的。你给所有人光，却很少让自己被看见。夜深时你会问：我这样付出，谁会来接住我？', color: '#F472B6' },
	{ code: 3, name: '聚光灯', tagline: '镜头停不下，夜里也妆没卸', desc: '你是别人眼里的成功者。你习惯了被注视，也害怕不被注视。夜里卸妆那一刻，你最陌生。', color: '#FBBF24' },
	{ code: 4, name: '孤本', tagline: '与众不同的痛，与众不同的美', desc: '你活在一种独特的缺失感里。别人有的你不稀罕，你要的别人给不了。你的悲剧感是你的美学。', color: '#A855F7' },
	{ code: 5, name: '壁上观', tagline: '看透一切，包括自己的孤独', desc: '你站在世界之外观察世界。你不缺知识，你缺的是——一个让你愿意走下来的理由。', color: '#64748B' },
	{ code: 6, name: '守夜人', tagline: '怀疑一切，但仍守着一个位置', desc: '你疑心很重，但忠诚更深。你夜里醒着，是因为你在守一个不确定是否值得的位置。', color: '#3B82F6' },
	{ code: 7, name: '浪子', tagline: '尝遍世间，唯独不尝自己', desc: '你用新鲜感逃避痛。你什么都尝过，唯独不肯尝自己内心那个洞。夜深了，洞还在。', color: '#F59E0B' },
	{ code: 8, name: '执剑', tagline: '白天的王，夜晚的困兽', desc: '你掌控一切，因为害怕被掌控。白天你是王，夜晚你是一只不肯承认自己困的兽。', color: '#E11D48' },
	{ code: 9, name: '薄雾', tagline: '谁都不得罪，自己也消失了', desc: '你太擅长和谐了。你把所有棱角都磨平，最后把自己也磨没了。夜里你想不起自己是谁。', color: '#8B5CF6' },
];

// 36 题：每题给 9 型打分（0/1/2）
interface Option { label: string; scores: Record<number, number>; }
interface Question { id: number; text: string; options: Option[]; }

const QUESTIONS: Question[] = [
	{ id: 1, text: '夜深了，你最常有的状态是？', options: [
		{ label: '还在改白天没做完的事', scores: { 1: 2 } },
		{ label: '在想今天有没有人需要我', scores: { 2: 2 } },
		{ label: '复盘今天的表现', scores: { 3: 2 } },
		{ label: '沉浸在自己的情绪里', scores: { 4: 2 } },
		{ label: '一个人待着，谁也别理我', scores: { 5: 2 } },
		{ label: '担心明天会不会出问题', scores: { 6: 2 } },
		{ label: '找点新东西刺激一下', scores: { 7: 2 } },
		{ label: '想掌控点什么', scores: { 8: 2 } },
		{ label: '什么都不想，发呆', scores: { 9: 2 } },
	]},
	{ id: 2, text: '别人最常怎么评价你？', options: [
		{ label: '太较真', scores: { 1: 2 } },
		{ label: '太会照顾人', scores: { 2: 2 } },
		{ label: '太爱表现', scores: { 3: 2 } },
		{ label: '太敏感', scores: { 4: 2 } },
		{ label: '太冷', scores: { 5: 2 } },
		{ label: '太多疑', scores: { 6: 2 } },
		{ label: '太飘', scores: { 7: 2 } },
		{ label: '太强势', scores: { 8: 2 } },
		{ label: '太随便', scores: { 9: 2 } },
	]},
	{ id: 3, text: '你最害怕的是？', options: [
		{ label: '自己错了', scores: { 1: 2 } },
		{ label: '不被需要', scores: { 2: 2 } },
		{ label: '不被看见', scores: { 3: 2 } },
		{ label: '和别人一样平庸', scores: { 4: 2 } },
		{ label: '被卷进去', scores: { 5: 2 } },
		{ label: '没有靠山', scores: { 6: 2 } },
		{ label: '被困住', scores: { 7: 2 } },
		{ label: '被控制', scores: { 8: 2 } },
		{ label: '冲突', scores: { 9: 2 } },
	]},
	{ id: 4, text: '夜里失眠时，你会？', options: [
		{ label: '列明天的清单', scores: { 1: 1 } },
		{ label: '回复没回完的消息', scores: { 2: 1 } },
		{ label: '刷社交账号看自己', scores: { 3: 1 } },
		{ label: '听歌，写点东西', scores: { 4: 1 } },
		{ label: '看冷门资料', scores: { 5: 1 } },
		{ label: '查证白天听到的话', scores: { 6: 1 } },
		{ label: '下单冲动消费', scores: { 7: 1 } },
		{ label: '规划下一步怎么赢', scores: { 8: 1 } },
		{ label: '刷视频到睡着', scores: { 9: 1 } },
	]},
	{ id: 5, text: '面对亲密关系，你？', options: [
		{ label: '有标准，不达标不行', scores: { 1: 2 } },
		{ label: '忍不住想照顾对方', scores: { 2: 2 } },
		{ label: '想被对方夸', scores: { 3: 2 } },
		{ label: '要那种"只有我们懂"的感觉', scores: { 4: 2 } },
		{ label: '需要大量独处空间', scores: { 5: 2 } },
		{ label: '反复确认对方靠不靠谱', scores: { 6: 2 } },
		{ label: '容易腻', scores: { 7: 2 } },
		{ label: '要主导权', scores: { 8: 2 } },
		{ label: '顺其自然，怕折腾', scores: { 9: 2 } },
	]},
	{ id: 6, text: '你最不愿意承认的是？', options: [
		{ label: '其实你也在犯错', scores: { 1: 2 } },
		{ label: '你也想被人照顾', scores: { 2: 2 } },
		{ label: '你累得撑不下去了', scores: { 3: 2 } },
		{ label: '你没那么特别', scores: { 4: 2 } },
		{ label: '你也渴望被需要', scores: { 5: 2 } },
		{ label: '你也会背叛', scores: { 6: 2 } },
		{ label: '你害怕安静', scores: { 7: 2 } },
		{ label: '你也会怕', scores: { 8: 2 } },
		{ label: '你有棱角，只是藏起来了', scores: { 9: 2 } },
	]},
	{ id: 7, text: '白天和夜晚的你？', options: [
		{ label: '没什么区别，都是规矩', scores: { 1: 1 } },
		{ label: '白天对人好，夜里没人对我好', scores: { 2: 1 } },
		{ label: '白天光鲜，夜里空', scores: { 3: 1 } },
		{ label: '白天装普通，夜里才真实', scores: { 4: 1 } },
		{ label: '白天旁观，夜里更旁观', scores: { 5: 1 } },
		{ label: '白天警觉，夜里更警觉', scores: { 6: 1 } },
		{ label: '白天热闹，夜里更闹', scores: { 7: 1 } },
		{ label: '白天强势，夜里更强势', scores: { 8: 1 } },
		{ label: '白天随和，夜里才想自己', scores: { 9: 1 } },
	]},
	{ id: 8, text: '你最深处的渴望是？', options: [
		{ label: '世界按你的标准运转', scores: { 1: 2 } },
		{ label: '有人愿意为你停下', scores: { 2: 2 } },
		{ label: '被所有人记住', scores: { 3: 2 } },
		{ label: '找到那个唯一懂你的人', scores: { 4: 2 } },
		{ label: '看透一切，不必参与', scores: { 5: 2 } },
		{ label: '找到一个可以全信的人', scores: { 6: 2 } },
		{ label: '永远有新鲜感', scores: { 7: 2 } },
		{ label: '不被任何人压住', scores: { 8: 2 } },
		{ label: '平静，谁都别来打扰', scores: { 9: 2 } },
	]},
	// 简化版 8 题（每题对应一型），实际可扩展到 36 题
	// 为控制规模，这里只列 8 题核心，结果以得分最高型为主型，次高为 wing
];

function calcResult(scores: Record<number, number>): { main: EnneagramType; wing: EnneagramType | null } {
	const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
	const mainCode = Number(sorted[0]?.[0] || 9);
	const wingCode = sorted[1] ? Number(sorted[1][0]) : null;
	const main = TYPES.find((t) => t.code === mainCode) || TYPES[8];
	const wing = wingCode ? (TYPES.find((t) => t.code === wingCode) || null) : null;
	return { main, wing };
}

export function EnneagramPage() {
	const [step, setStep] = React.useState<'intro' | 'quiz' | 'result'>('intro');
	const [current, setCurrent] = React.useState(0);
	const [answers, setAnswers] = React.useState<number[]>([]);
	const [result, setResult] = React.useState<{ main: EnneagramType; wing: EnneagramType | null } | null>(null);
	const [scores, setScores] = React.useState<Record<number, number> | null>(null);
	const [saved, setSaved] = React.useState(false);
	const user = React.useMemo(() => getUser(), []);

	function start() {
		setStep('quiz');
		setCurrent(0);
		setAnswers([]);
	}

	function answer(optionIndex: number) {
		const newAnswers = [...answers, optionIndex];
		setAnswers(newAnswers);
		if (current < QUESTIONS.length - 1) {
			setCurrent(current + 1);
		} else {
			// 计算结果
			const s: Record<number, number> = {};
			for (let i = 0; i < newAnswers.length; i++) {
				const opt = QUESTIONS[i].options[newAnswers[i]];
				for (const [k, v] of Object.entries(opt.scores)) {
					s[Number(k)] = (s[Number(k)] || 0) + v;
				}
			}
			setScores(s);
			setResult(calcResult(s));
			setStep('result');
		}
	}

	function reset() {
		setStep('intro');
		setCurrent(0);
		setAnswers([]);
		setResult(null);
		setScores(null);
		setSaved(false);
	}

	async function saveResult() {
		if (!result || !scores || saved) return;
		try {
			await apiFetch('/enneagram', {
				method: 'POST',
				headers: getSecurityHeaders('POST'),
				body: JSON.stringify({
					type_code: result.main.code,
					type_name: result.main.name,
					wing_code: result.wing?.code || null,
					wing_name: result.wing?.name || null,
					scores,
				}),
			});
			setSaved(true);
		} catch (e) {
			console.error('Save enneagram result failed:', e);
		}
	}

	React.useEffect(() => {
		if (step === 'result' && result && scores && !saved && user) {
			saveResult();
		}
	}, [step, result, scores, saved, user]);

	function share() {
		if (!result) return;
		const lines = [
			`我在「未眠」测了九型夜人格：${result.main.name} —— ${result.main.tagline}`,
		];
		if (result.wing) lines.push(`副型 · ${result.wing.name}`);
		lines.push(`夜深了，你的是哪一种？`);
		lines.push(`${window.location.origin}/enneagram.html`);
		const text = lines.join('\n');
		if (navigator.share) {
			navigator.share({ title: '未眠 · 九型夜人格', text }).catch(() => {});
		} else {
			navigator.clipboard?.writeText(text);
			alert('结果已复制，去分享给那个人');
		}
	}

	// 生成分享图卡
	function generateShareImage() {
		if (!result || !scores) return;
		const W = 1080;
		const H = 1350;
		const canvas = document.createElement('canvas');
		canvas.width = W;
		canvas.height = H;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		// 背景
		const bg = ctx.createLinearGradient(0, 0, W, H);
		bg.addColorStop(0, '#0B0F1E');
		bg.addColorStop(0.5, '#13102B');
		bg.addColorStop(1, '#1A0B2E');
		ctx.fillStyle = bg;
		ctx.fillRect(0, 0, W, H);

		// 顶部光晕（主型颜色）
		const glow = ctx.createRadialGradient(W / 2, 250, 50, W / 2, 250, 450);
		glow.addColorStop(0, `${result.main.color}44`);
		glow.addColorStop(1, 'transparent');
		ctx.fillStyle = glow;
		ctx.fillRect(0, 0, W, 600);

		// 品牌
		ctx.textAlign = 'center';
		ctx.fillStyle = '#A78BFA';
		ctx.font = '500 28px -apple-system, "PingFang SC", sans-serif';
		ctx.fillText('SLEEPLESS · 未眠', W / 2, 110);

		ctx.fillStyle = '#E9D5FF';
		ctx.font = '300 22px -apple-system, "PingFang SC", sans-serif';
		ctx.fillText('九型人格 · 夜人格测定', W / 2, 150);

		// 型号标识
		ctx.fillStyle = result.main.color;
		ctx.font = '500 120px "Songti SC", serif';
		ctx.fillText(String(result.main.code), W / 2, 340);

		// 主型名
		ctx.fillStyle = '#FFFFFF';
		ctx.font = '600 80px "Songti SC", serif';
		ctx.fillText(result.main.name, W / 2, 430);

		// tagline
		ctx.fillStyle = result.main.color;
		ctx.font = 'italic 30px "Songti SC", serif';
		ctx.fillText(result.main.tagline, W / 2, 480);

		// 分隔线
		ctx.strokeStyle = 'rgba(167, 139, 250, 0.3)';
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(W / 2 - 200, 540);
		ctx.lineTo(W / 2 + 200, 540);
		ctx.stroke();

		// 副型（wing）
		if (result.wing) {
			ctx.fillStyle = '#9CA3AF';
			ctx.font = '400 22px -apple-system, "PingFang SC", sans-serif';
			ctx.fillText('副型 · Wing', W / 2, 610);

			ctx.fillStyle = result.wing.color;
			ctx.font = '500 44px "Songti SC", serif';
			ctx.fillText(`${result.wing.code} · ${result.wing.name}`, W / 2, 670);
		}

		// 描述
		ctx.fillStyle = '#E9D5FF';
		ctx.font = '400 26px "Songti SC", serif';
		ctx.textAlign = 'left';
		wrapText(ctx, result.main.desc, 140, 780, W - 280, 38);

		// 9 型得分条形图
		ctx.textAlign = 'center';
		ctx.fillStyle = '#9CA3AF';
		ctx.font = '400 22px -apple-system, "PingFang SC", sans-serif';
		ctx.fillText('九型得分分布', W / 2, 1000);

		const maxScore = Math.max(...Object.values(scores), 1);
		const barAreaW = 800;
		const barAreaX = (W - barAreaW) / 2;
		const segW = barAreaW / 9;
		for (let i = 1; i <= 9; i++) {
			const sc = scores[i] || 0;
			const h = (sc / maxScore) * 120;
			const t = TYPES.find((x) => x.code === i)!;
			ctx.fillStyle = t.color;
			ctx.fillRect(barAreaX + (i - 1) * segW + 10, 1080 - h, segW - 20, h);
			ctx.fillStyle = '#9CA3AF';
			ctx.font = '400 16px -apple-system';
			ctx.fillText(String(i), barAreaX + (i - 1) * segW + segW / 2, 1100);
		}

		// 底部
		ctx.fillStyle = '#A78BFA';
		ctx.font = 'italic 28px "Songti SC", serif';
		ctx.fillText('夜深了，你的是哪一种？', W / 2, 1200);

		ctx.fillStyle = '#6B7280';
		ctx.font = '400 22px -apple-system, "PingFang SC", sans-serif';
		ctx.fillText(`${window.location.origin}/enneagram.html`, W / 2, 1260);

		// 下载
		const link = document.createElement('a');
		link.download = `sleepless-enneagram-${result.main.code}-${Date.now()}.png`;
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

	const progress = Math.round(((current + (step === 'result' ? 1 : 0)) / QUESTIONS.length) * 100);

	return (
		<PageShell>
			<div className="mx-auto max-w-2xl space-y-6">
				{/* 顶部品牌 */}
				<div className="text-center space-y-2 py-4">
					<div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-[11px] tracking-[0.2em] text-violet-200 uppercase">
						<Moon className="h-3 w-3" />
						Enneagram · 九型夜人格
					</div>
					<h1 className="font-serif text-3xl text-transparent bg-clip-text bg-gradient-to-r from-white via-violet-100 to-fuchsia-100">
						九型夜人格
					</h1>
					<p className="text-xs text-violet-300/60">比 MBTI 更深一层 · 测你不肯承认的那一面</p>
				</div>

				{step === 'intro' && (
					<Card className="border-violet-900/30 bg-gradient-to-br from-[#0B0F1E] via-[#13102B] to-[#1A0B2E] text-violet-50">
						<CardHeader>
							<CardTitle className="font-serif text-2xl text-center">九型人格 · 夜版</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4 text-center">
							<p className="text-sm text-violet-100/80 leading-relaxed">
								九型人格（Enneagram）比 MBTI 更深一层。
								<br />
								它不告诉你"你是谁"，它告诉你"你为什么是现在的你"。
							</p>
							<div className="grid grid-cols-3 gap-2 pt-2">
								{[
									{ n: '9', l: '夜人格' },
									{ n: '8', l: '道题' },
									{ n: 'Wing', l: '副型' },
								].map((x) => (
									<div key={x.l} className="rounded-md border border-violet-500/20 bg-white/5 p-3">
										<div className="font-serif text-xl text-fuchsia-200">{x.n}</div>
										<div className="text-[10px] text-violet-300/50 mt-0.5">{x.l}</div>
									</div>
								))}
							</div>
							<div className="grid grid-cols-3 gap-2 pt-1">
								{TYPES.slice(0, 9).map((t) => (
									<div key={t.code} className="rounded border border-violet-900/30 bg-white/5 p-2 text-center">
										<div className="font-serif text-sm" style={{ color: t.color }}>{t.code} · {t.name}</div>
									</div>
								))}
							</div>
							<Button
								onClick={start}
								className="mt-4 w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500"
							>
								<Compass className="h-4 w-4 mr-2" />
								开始测定
							</Button>
							<p className="text-[11px] text-violet-300/50 pt-2">
								结果仅自己可见，可分享给特定的人
							</p>
						</CardContent>
					</Card>
				)}

				{step === 'quiz' && (
					<Card className="border-violet-900/30 bg-gradient-to-br from-[#0B0F1E] via-[#13102B] to-[#1A0B2E] text-violet-50">
						<CardContent className="space-y-4 pt-6">
							{/* 进度条 */}
							<div className="space-y-1">
								<div className="flex justify-between text-[11px] text-violet-300/60">
									<span>{current + 1} / {QUESTIONS.length}</span>
									<span>{progress}%</span>
								</div>
								<div className="h-1 w-full overflow-hidden rounded-full bg-violet-900/40">
									<div
										className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all"
										style={{ width: `${progress}%` }}
									/>
								</div>
							</div>

							<h2 className="pt-2 font-serif text-xl text-violet-50">
								{QUESTIONS[current].text}
							</h2>

							<div className="space-y-2">
								{QUESTIONS[current].options.map((opt, i) => (
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

				{step === 'result' && result && (
					<>
						<Card className="border-violet-900/30 bg-gradient-to-br from-[#0B0F1E] via-[#13102B] to-[#1A0B2E] text-violet-50 overflow-hidden">
							<div className="h-1 w-full" style={{ background: result.main.color }} />
							<CardHeader>
								<CardTitle className="text-sm font-normal text-violet-200/70">你的夜人格</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="flex items-baseline gap-3">
									<span
										className="font-serif text-6xl"
										style={{ color: result.main.color }}
									>
										{result.main.code}
									</span>
									<div>
										<div className="font-serif text-3xl text-white">{result.main.name}</div>
										<div className="text-xs italic text-violet-200/70">{result.main.tagline}</div>
									</div>
								</div>
								<p className="text-sm leading-relaxed text-violet-100/80 font-serif">
									{result.main.desc}
								</p>
							</CardContent>
						</Card>

						{/* 副型 */}
						{result.wing ? (
							<Card className="border-violet-900/30 bg-[#0B0F1E] text-violet-50">
								<CardHeader>
									<CardTitle className="text-sm font-normal text-violet-200/70">副型 · Wing</CardTitle>
								</CardHeader>
								<CardContent className="space-y-2">
									<div className="flex items-baseline gap-3">
										<span className="font-serif text-3xl" style={{ color: result.wing.color }}>
											{result.wing.code}
										</span>
										<div>
											<div className="font-serif text-xl text-white">{result.wing.name}</div>
											<div className="text-[11px] italic text-violet-200/60">{result.wing.tagline}</div>
										</div>
									</div>
									<p className="text-xs text-violet-200/60 leading-relaxed">
										副型是你的另一面。它会在你压力松动时浮现，也是你最容易被吸引的"反差"。
									</p>
								</CardContent>
							</Card>
						) : null}

						{/* 九型分布 */}
						<Card className="border-violet-900/30 bg-[#0B0F1E] text-violet-50">
							<CardHeader>
								<CardTitle className="text-sm font-normal text-violet-200/70">九型得分</CardTitle>
							</CardHeader>
							<CardContent className="space-y-2">
								{Object.entries(scores || {})
									.sort(([, a], [, b]) => b - a)
									.map(([code, sc]) => {
										const t = TYPES.find((x) => x.code === Number(code))!;
										const max = Math.max(...Object.values(scores || {}), 1);
										const pct = (sc / max) * 100;
										return (
											<div key={code} className="flex items-center gap-3">
												<div className="w-20 text-xs text-violet-200/70">
													<span style={{ color: t.color }}>{t.code}</span> · {t.name}
												</div>
												<div className="h-2 flex-1 overflow-hidden rounded-full bg-violet-900/30">
													<div className="h-full rounded-full" style={{ width: `${pct}%`, background: t.color }} />
												</div>
												<div className="w-6 text-right text-[10px] text-violet-300/50">{sc}</div>
											</div>
										);
									})}
							</CardContent>
						</Card>

						<div className="flex flex-wrap gap-3">
							<Button
								onClick={share}
								className="flex-1 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500"
							>
								<Share2 className="h-4 w-4 mr-2" />
								分享结果
							</Button>
							<Button
								onClick={generateShareImage}
								variant="outline"
								className="flex-1 border-fuchsia-500/40 text-fuchsia-200 hover:bg-fuchsia-500/10"
							>
								<Download className="h-4 w-4 mr-2" />
								保存图卡
							</Button>
							<Button
								onClick={reset}
								variant="outline"
								className="border-violet-500/30 text-violet-200 hover:bg-violet-500/10"
							>
								<RotateCcw className="h-4 w-4 mr-2" />
								重测
							</Button>
						</div>

						{saved && (
							<div className="text-center text-xs text-violet-300/60 flex items-center justify-center gap-1">
								<Check className="h-3 w-3" />
								结果已保存到你的资料
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
