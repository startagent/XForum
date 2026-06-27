import * as React from 'react';
import { Sparkles, Moon, Eye, Flame, Droplet, RotateCcw, Share2, Check, Download } from 'lucide-react';

import { PageShell } from '@/components/page-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiFetch, getSecurityHeaders } from '@/lib/api';
import { getUser } from '@/lib/auth';

// 灵魂测定的 4 个维度：
// N (Night)   夜晚人格：白天端庄 vs 夜晚释放
// D (Desire)  欲望释放度：压抑 vs 流动
// G (Gaze)    被注视渴求：独处 vs 被凝视
// E (Emotion) 情绪浓度：理性 vs 浓烈

type Dim = 'N' | 'D' | 'G' | 'E';

interface Question {
	id: number;
	text: string;
	options: { label: string; scores: Partial<Record<Dim, number>> }[];
}

const QUESTIONS: Question[] = [
	{
		id: 1,
		text: '深夜十一点，独处时你最想做的事是？',
		options: [
			{ label: '看一本严肃的书或处理工作', scores: { N: 0, D: 0 } },
			{ label: '换上丝绸睡衣，倒一杯酒，放点暧昧的音乐', scores: { N: 2, D: 2 } },
			{ label: '刷陌生人发的内容，想象他们的夜晚', scores: { N: 1, G: 2 } },
			{ label: '写一些不会发出去的字', scores: { N: 1, E: 2 } },
		],
	},
	{
		id: 2,
		text: '白天端庄的你在什么瞬间最想"坏"一下？',
		options: [
			{ label: '会议中走神，想象对面那人的领带下面', scores: { N: 2, D: 2 } },
			{ label: '电梯里只有你和陌生人，空气安静', scores: { N: 1, G: 2 } },
			{ label: '看到镜子里穿着正装的自己', scores: { N: 1, E: 1 } },
			{ label: '几乎没有，我喜欢一直得体', scores: { N: 0, D: 0 } },
		],
	},
	{
		id: 3,
		text: '关于"被注视"，你最真实的状态是？',
		options: [
			{ label: '渴望，但我不会承认', scores: { G: 2, E: 1 } },
			{ label: '渴望，且我希望被特定的人注视', scores: { G: 2, D: 1 } },
			{ label: '无所谓，我更享受独处', scores: { G: 0 } },
			{ label: '害怕被注视，但又忍不住期待', scores: { G: 1, E: 2 } },
		],
	},
	{
		id: 4,
		text: '当欲望升起时，你的本能是？',
		options: [
			{ label: '压抑它，等它过去', scores: { D: 0 } },
			{ label: '写下来，用文字释放', scores: { D: 1, E: 2 } },
			{ label: '找一个安全的地方让它流动', scores: { D: 2, N: 1 } },
			{ label: '想象有一个人在陪我一起', scores: { D: 2, G: 2 } },
		],
	},
	{
		id: 5,
		text: '你最容易被哪种文字击中？',
		options: [
			{ label: '冷静、克制、有距离感的', scores: { E: 0, N: 0 } },
			{ label: '潮湿、暧昧、欲言又止的', scores: { E: 2, D: 2 } },
			{ label: '锋利、直接、不掩饰的', scores: { E: 2, N: 2 } },
			{ label: '温柔、注视、被理解的', scores: { E: 1, G: 2 } },
		],
	},
	{
		id: 6,
		text: '想象一个陌生人凝视你的眼睛十秒，你会？',
		options: [
			{ label: '先移开视线', scores: { G: 0, E: 1 } },
			{ label: '迎上去，看谁先输', scores: { G: 2, N: 2 } },
			{ label: '心跳加速，但表面平静', scores: { G: 2, E: 2 } },
			{ label: '想象他在想什么', scores: { G: 1, D: 1 } },
		],
	},
	{
		id: 7,
		text: '夜晚的你和白天相比？',
		options: [
			{ label: '几乎一样，我从不分裂', scores: { N: 0 } },
			{ label: '完全不同的两个人', scores: { N: 2, E: 1 } },
			{ label: '夜晚的我更柔软，也更危险', scores: { N: 2, D: 2 } },
			{ label: '夜晚的我更真实', scores: { N: 1, E: 2 } },
		],
	},
	{
		id: 8,
		text: '如果有人能接住你全部的"反差"，你会？',
		options: [
			{ label: '警惕，保持距离', scores: { D: 0, G: 0 } },
			{ label: '试探，慢慢展开', scores: { D: 1, E: 1 } },
			{ label: '渴望，但害怕失去控制', scores: { D: 2, E: 2 } },
			{ label: '愿意，把自己交出去一次', scores: { D: 2, G: 2 } },
		],
	},
	{
		id: 9,
		text: '今夜此刻，你的"底色"更接近？',
		options: [
			{ label: '晨灰 —— 清醒，但没有什么情绪', scores: { N: 0, E: 0 } },
			{ label: '午金 —— 还在世界的规则里运转', scores: { N: 0, D: 0 } },
			{ label: '暮紫 —— 一天结束，欲望开始苏醒', scores: { N: 1, D: 1 } },
			{ label: '夜墨 —— 已经是另一个我了', scores: { N: 2, D: 1 } },
		],
	},
	{
		id: 10,
		text: '如果今晚有人对你说"我都在"，你会？',
		options: [
			{ label: '回一句"嗯"，然后继续独处', scores: { D: 0, G: 0 } },
			{ label: '心里动一下，但不会主动找他', scores: { D: 1, E: 1 } },
			{ label: '把今晚的字发给他看', scores: { D: 1, G: 2 } },
			{ label: '想知道他在哪里，能不能过来', scores: { D: 2, G: 2 } },
		],
	},
];

// 灵魂类型：根据 4 维总分映射（8 种小众人格）
interface SoulType {
	code: string;
	name: string;
	tagline: string;
	desc: string;
	color: string;
}

// 今日底色：基于情绪浓度 E 与欲望 D 的组合
interface TodayTone {
	code: string;
	name: string;
	hex: string;
	word: string;
}

const TODAY_TONES: TodayTone[] = [
	{ code: 'ash', name: '晨灰', hex: '#9CA3AF', word: '清醒而疏离，世界还没真正靠近你' },
	{ code: 'gold', name: '午金', hex: '#F59E0B', word: '还在规则里运转，端庄是你最好的盔甲' },
	{ code: 'dusk', name: '暮紫', hex: '#A855F7', word: '欲望开始苏醒，你知道今晚不会平静' },
	{ code: 'ink', name: '夜墨', hex: '#1E1B4B', word: '另一个你已经醒了，没有人看见' },
	{ code: 'rose', name: '欲红', hex: '#E11D48', word: '有什么在流动，你不再想压住它' },
	{ code: 'blue', name: '寂蓝', hex: '#3B82F6', word: '深处的海在波动，但水面平静' },
];

function calcTodayTone(scores: Record<Dim, number>): TodayTone {
	const d = scores.D;
	const e = scores.E;
	if (d <= 1 && e <= 1) return TODAY_TONES[0]; // 晨灰
	if (d <= 1 && e >= 2) return TODAY_TONES[5]; // 寂蓝
	if (d === 2 && e <= 1) return TODAY_TONES[1]; // 午金
	if (d >= 2 && e >= 2 && d + e >= 5) return TODAY_TONES[4]; // 欲红
	if (scores.N >= 2 && d >= 1) return TODAY_TONES[3]; // 夜墨
	return TODAY_TONES[2]; // 暮紫
}

// 反差等级 L0-L5
function calcContrastLevel(scores: Record<Dim, number>): { level: number; label: string; desc: string } {
	const total = scores.N + scores.D + scores.G + scores.E;
	if (total <= 4) return { level: 0, label: 'L0 · 端庄', desc: '你是白天的代名词，但夜还没真正来过' };
	if (total <= 7) return { level: 1, label: 'L1 · 微光', desc: '端庄开始松动，偶尔有一丝缝隙' };
	if (total <= 10) return { level: 2, label: 'L2 · 薄暮', desc: '你正站在白天与夜晚的过渡带' };
	if (total <= 13) return { level: 3, label: 'L3 · 暗涌', desc: '表面平静，底下已经有人在下坠' };
	if (total <= 16) return { level: 4, label: 'L4 · 反差', desc: '白天与夜晚是两个你，你自己也分不清' };
	return { level: 5, label: 'L5 · 炽夜', desc: '你已经醒了，并且不再想回去' };
}

function calcSoulType(scores: Record<Dim, number>): SoulType {
	const total = scores.N + scores.D + scores.G + scores.E;
	// 主轴：N+D 夜晚释放度，G+E 被注视渴求
	const night = scores.N + scores.D;
	const gaze = scores.G + scores.E;
	// 副轴：N 单独高低（分裂度），D 单独高低（欲望清晰度）

	// 8 种小众人格
	if (night >= 6 && gaze >= 6 && scores.N >= 3) {
		return {
			code: 'FL',
			name: '炽夜玫瑰',
			tagline: '夜里盛放，被注视才完整',
			desc: '你拥有最锋利的反差。白天的端庄是你的盔甲，夜晚的盛放是你的真相。你渴望被一个值得的人注视，在他眼里做完整的自己。',
			color: 'from-rose-500 to-fuchsia-600',
		};
	}
	if (night >= 6 && gaze >= 6) {
		return {
			code: 'NH',
			name: '暗夜猎手',
			tagline: '不是被注视，是你在挑选',
			desc: '你不被动等待目光，你主动出击。你看人很准，下钩很慢，收线很果断。你是夜晚的捕手，也是自己欲望的主人。',
			color: 'from-rose-700 to-purple-800',
		};
	}
	if (night >= 6 && gaze < 6 && scores.E >= 3) {
		return {
			code: 'SR',
			name: '书房尤物',
			tagline: '读着严肃的书，写着潮湿的字',
			desc: '你的反差藏在文字里。白天读哲学，夜里写欲望。你的端庄是真的，你的潮湿也是真的。能读懂你的人，会同时爱上这两个你。',
			color: 'from-amber-600 to-rose-700',
		};
	}
	if (night >= 6 && gaze < 6) {
		return {
			code: 'IS',
			name: '私语者',
			tagline: '把欲望说给不会说出去的人',
			desc: '你的夜晚属于文字与低语。你不需要被看见，你只需要被听见。一个能接住你全部暗面的人，会让你交出自己。',
			color: 'from-violet-500 to-indigo-600',
		};
	}
	if (night < 6 && gaze >= 6 && scores.E >= 3) {
		return {
			code: 'MB',
			name: '镜中困兽',
			tagline: '想被看见，又害怕被看穿',
			desc: '你在镜子前练习端庄，也在镜子前幻想崩塌。你期待有人看穿你，又害怕他真的看穿。你是被困在自我审视里的兽。',
			color: 'from-fuchsia-500 to-purple-700',
		};
	}
	if (night < 6 && gaze >= 6) {
		return {
			code: 'MO',
			name: '月下凝眸',
			tagline: '渴望被注视，又害怕被看穿',
			desc: '你的欲望安静，但你的渴求很深。你期待有人的目光停在你身上，又害怕他看穿你的端庄之下藏着什么。',
			color: 'from-amber-400 to-rose-500',
		};
	}
	if (total < 8 && scores.N <= 1) {
		return {
			code: 'ST',
			name: '静水深流',
			tagline: '理性是表象，深海在底下',
			desc: '你压抑得很好，但你自己知道底下是什么。也许某一天，会有一个人让你愿意让水面波动一次。',
			color: 'from-slate-400 to-slate-600',
		};
	}
	return {
		code: 'TW',
		name: '薄暮之人',
		tagline: '白天与夜晚之间的过渡带',
		desc: '你正在觉醒。端庄开始松动，夜晚开始有光。你是未醒之人，也是将醒之人。',
		color: 'from-purple-400 to-violet-600',
	};
}

export function SoulPage() {
	const [step, setStep] = React.useState<'intro' | 'quiz' | 'result'>('intro');
	const [current, setCurrent] = React.useState(0);
	const [answers, setAnswers] = React.useState<number[]>([]);
	const [soul, setSoul] = React.useState<SoulType | null>(null);
	const [scores, setScores] = React.useState<Record<Dim, number> | null>(null);
	const [tone, setTone] = React.useState<TodayTone | null>(null);
	const [contrast, setContrast] = React.useState<{ level: number; label: string; desc: string } | null>(null);
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

		if (current + 1 < QUESTIONS.length) {
			setCurrent(current + 1);
		} else {
			// 计算分数
			const s: Record<Dim, number> = { N: 0, D: 0, G: 0, E: 0 };
			newAnswers.forEach((ans, i) => {
				const sc = QUESTIONS[i].options[ans].scores;
				(Object.keys(sc) as Dim[]).forEach((k) => {
					s[k] += sc[k] || 0;
				});
			});
			setScores(s);
			setSoul(calcSoulType(s));
			setTone(calcTodayTone(s));
			setContrast(calcContrastLevel(s));
			setStep('result');
		}
	}

	async function saveResult() {
		if (!soul || !scores || saved) return;
		try {
			await apiFetch('/soul', {
				method: 'POST',
				headers: getSecurityHeaders('POST'),
				body: JSON.stringify({
					code: soul.code,
					name: soul.name,
					scores,
					tone: tone?.code || null,
					contrast_level: contrast?.level ?? null,
				}),
			});
			setSaved(true);
		} catch (e) {
			// 静默失败，不影响用户体验
			console.error('Save soul result failed:', e);
		}
	}

	React.useEffect(() => {
		if (step === 'result' && soul && user) {
			saveResult();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [step, soul, user]);

	function reset() {
		setStep('intro');
		setCurrent(0);
		setAnswers([]);
		setSoul(null);
		setScores(null);
		setTone(null);
		setContrast(null);
		setSaved(false);
	}

	function share() {
		if (!soul) return;
		const lines = [
			`我在「未眠」测了灵魂：${soul.name} —— ${soul.tagline}`,
		];
		if (tone) lines.push(`今日底色 · ${tone.name}`);
		if (contrast) lines.push(`反差等级 · ${contrast.label}`);
		lines.push(`夜深了，另一个你醒着。`);
		lines.push(`${window.location.origin}/soul.html`);
		const text = lines.join('\n');
		if (navigator.share) {
			navigator.share({ title: '未眠 · 灵魂测定', text }).catch(() => {});
		} else {
			navigator.clipboard?.writeText(text);
			alert('结果已复制，去分享给那个人');
		}
	}

	// 生成分享图卡：canvas 绘制 → 下载
	function generateShareImage() {
		if (!soul || !contrast || !tone) return;
		const W = 1080;
		const H = 1350;
		const canvas = document.createElement('canvas');
		canvas.width = W;
		canvas.height = H;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		// 背景渐变（深紫到玫瑰）
		const bg = ctx.createLinearGradient(0, 0, W, H);
		bg.addColorStop(0, '#0B0F1E');
		bg.addColorStop(0.5, '#1A0B2E');
		bg.addColorStop(1, '#2A0B1E');
		ctx.fillStyle = bg;
		ctx.fillRect(0, 0, W, H);

		// 顶部光晕
		const glow = ctx.createRadialGradient(W / 2, 200, 50, W / 2, 200, 400);
		glow.addColorStop(0, `${tone.hex}33`);
		glow.addColorStop(1, 'transparent');
		ctx.fillStyle = glow;
		ctx.fillRect(0, 0, W, 500);

		// 顶部品牌
		ctx.textAlign = 'center';
		ctx.fillStyle = '#A78BFA';
		ctx.font = '500 28px -apple-system, "PingFang SC", sans-serif';
		ctx.fillText('SLEEPLESS · 未眠', W / 2, 110);

		ctx.fillStyle = '#E9D5FF';
		ctx.font = '300 22px -apple-system, "PingFang SC", sans-serif';
		ctx.fillText('灵魂测定 · 今夜的你', W / 2, 150);

		// 主标题：人格名
		ctx.fillStyle = '#FFFFFF';
		ctx.font = '600 88px "Songti SC", "STSong", serif';
		ctx.fillText(soul.name, W / 2, 320);

		// tagline
		ctx.fillStyle = '#F0ABFC';
		ctx.font = 'italic 32px "Songti SC", "STSong", serif';
		ctx.fillText(soul.tagline, W / 2, 380);

		// 分隔线
		ctx.strokeStyle = 'rgba(167, 139, 250, 0.3)';
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(W / 2 - 200, 440);
		ctx.lineTo(W / 2 + 200, 440);
		ctx.stroke();

		// 今日底色卡（圆形色块 + 名称）
		ctx.fillStyle = '#9CA3AF';
		ctx.font = '400 22px -apple-system, "PingFang SC", sans-serif';
		ctx.fillText('今日底色', W / 2 - 200, 510);

		ctx.beginPath();
		ctx.arc(W / 2 - 80, 555, 28, 0, Math.PI * 2);
		ctx.fillStyle = tone.hex;
		ctx.shadowColor = tone.hex;
		ctx.shadowBlur = 30;
		ctx.fill();
		ctx.shadowBlur = 0;

		ctx.fillStyle = '#FFFFFF';
		ctx.font = '500 36px "Songti SC", serif';
		ctx.textAlign = 'left';
		ctx.fillText(tone.name, W / 2 - 30, 568);

		// 反差等级条
		ctx.textAlign = 'center';
		ctx.fillStyle = '#9CA3AF';
		ctx.font = '400 22px -apple-system, "PingFang SC", sans-serif';
		ctx.fillText('反差等级', W / 2, 700);

		ctx.fillStyle = '#FCD34D';
		ctx.font = '500 48px -apple-system, "PingFang SC", sans-serif';
		ctx.fillText(contrast.label, W / 2, 760);

		// 等级条
		const barW = 600;
		const barX = (W - barW) / 2;
		const barY = 800;
		ctx.fillStyle = 'rgba(139, 92, 246, 0.2)';
		ctx.fillRect(barX, barY, barW, 8);
		const segW = barW / 6;
		for (let i = 0; i <= contrast.level; i++) {
			const grad = ctx.createLinearGradient(barX + i * segW, 0, barX + (i + 1) * segW, 0);
			grad.addColorStop(0, '#F59E0B');
			grad.addColorStop(1, '#E11D48');
			ctx.fillStyle = grad;
			ctx.fillRect(barX + i * segW, barY, segW, 8);
		}

		// 描述文字（多行折行）
		ctx.fillStyle = '#E9D5FF';
		ctx.font = '400 26px "Songti SC", serif';
		ctx.textAlign = 'left';
		wrapText(ctx, soul.desc, 140, 900, W - 280, 38);

		// 底部
		ctx.textAlign = 'center';
		ctx.fillStyle = '#A78BFA';
		ctx.font = 'italic 28px "Songti SC", serif';
		ctx.fillText('夜深了，另一个你醒着。', W / 2, 1180);

		ctx.fillStyle = '#6B7280';
		ctx.font = '400 22px -apple-system, "PingFang SC", sans-serif';
		ctx.fillText(`${window.location.origin}/soul.html`, W / 2, 1240);

		// 触发下载
		const link = document.createElement('a');
		link.download = `sleepless-${soul.code}-${Date.now()}.png`;
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

	return (
		<PageShell>
			<div className="mx-auto max-w-2xl space-y-6">
				{/* 顶部品牌 */}
				<div className="text-center space-y-2 py-4">
					<div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-[11px] tracking-[0.2em] text-violet-200 uppercase">
						<Moon className="h-3 w-3" />
						Sleepless · 灵魂测定
					</div>
				</div>

				{step === 'intro' && (
					<Card className="border-violet-900/30 bg-gradient-to-br from-[#0B0F1E] via-[#13102B] to-[#1A0B2E] text-violet-50">
						<CardHeader>
							<CardTitle className="font-serif text-2xl text-center">灵魂测定</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4 text-center">
							<p className="text-sm text-violet-100/80 leading-relaxed">
								十个问题，没有标准答案。
								<br />
								测出夜晚的你，是哪一种灵魂。
							</p>
							<div className="grid grid-cols-3 gap-2 text-[11px] text-violet-200/70 pt-2">
								<div className="rounded-md border border-violet-500/20 bg-white/5 p-3">
									<Sparkles className="h-4 w-4 mx-auto mb-1 text-fuchsia-300" />
									小众人格
									<div className="text-[10px] text-violet-300/40 mt-0.5">8 种</div>
								</div>
								<div className="rounded-md border border-violet-500/20 bg-white/5 p-3">
									<Droplet className="h-4 w-4 mx-auto mb-1 text-sky-300" />
									今日底色
									<div className="text-[10px] text-violet-300/40 mt-0.5">6 色</div>
								</div>
								<div className="rounded-md border border-violet-500/20 bg-white/5 p-3">
									<Flame className="h-4 w-4 mx-auto mb-1 text-amber-300" />
									反差等级
									<div className="text-[10px] text-violet-300/40 mt-0.5">L0-L5</div>
								</div>
							</div>
							<Button
								onClick={start}
								className="mt-4 w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500"
							>
								<Sparkles className="h-4 w-4 mr-2" />
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
						<CardHeader>
							<div className="flex items-center justify-between text-xs text-violet-300/70">
								<span>问题 {current + 1} / {QUESTIONS.length}</span>
								<span>未眠 · 灵魂测定</span>
							</div>
							<div className="h-1 w-full bg-violet-900/40 rounded-full overflow-hidden mt-2">
								<div
									className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all"
									style={{ width: `${((current + 1) / QUESTIONS.length) * 100}%` }}
								/>
							</div>
						</CardHeader>
						<CardContent className="space-y-4">
							<h2 className="font-serif text-xl leading-relaxed text-violet-50">
								{QUESTIONS[current].text}
							</h2>
							<div className="space-y-2">
								{QUESTIONS[current].options.map((opt, i) => (
									<button
										key={i}
										onClick={() => answer(i)}
										className="w-full text-left rounded-md border border-violet-500/20 bg-white/5 px-4 py-3 text-sm text-violet-100/90 transition hover:border-violet-400/60 hover:bg-violet-500/10"
									>
										{opt.label}
									</button>
								))}
							</div>
						</CardContent>
					</Card>
				)}

				{step === 'result' && soul && scores && (
					<>
						<Card className={`relative overflow-hidden border-violet-900/30 bg-gradient-to-br ${soul.color} text-white`}>
							<div className="absolute inset-0 bg-[#0B0F1E]/60" />
							<div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
							<CardContent className="relative space-y-4 py-10 text-center">
								<div className="text-[11px] tracking-[0.3em] uppercase text-white/70">
									你的灵魂类型
								</div>
								<h2 className="font-serif text-4xl tracking-tight">{soul.name}</h2>
								<p className="text-sm text-white/80 italic">「{soul.tagline}」</p>
								<p className="max-w-md mx-auto text-sm leading-relaxed text-white/90 pt-2">
									{soul.desc}
								</p>
							</CardContent>
						</Card>

					{/* 今日底色 */}
					{tone && (
						<Card className="border-violet-900/30 bg-[#0B0F1E] text-violet-50 overflow-hidden">
							<div className="h-1 w-full" style={{ background: tone.hex }} />
							<CardHeader>
								<CardTitle className="text-sm font-normal text-violet-200/70">今日底色</CardTitle>
							</CardHeader>
							<CardContent className="space-y-3">
								<div className="flex items-center gap-3">
									<div
										className="h-10 w-10 rounded-full shadow-lg"
										style={{ background: tone.hex, boxShadow: `0 0 18px 2px ${tone.hex}66` }}
									/>
									<div>
										<div className="font-serif text-xl" style={{ color: tone.hex }}>{tone.name}</div>
										<div className="text-[11px] text-violet-200/50">Today&apos;s Tone</div>
									</div>
								</div>
								<p className="text-sm text-violet-100/80 leading-relaxed font-serif italic">
									「{tone.word}」
								</p>
							</CardContent>
						</Card>
					)}

					{/* 反差等级 */}
					{contrast && (
						<Card className="border-violet-900/30 bg-gradient-to-br from-[#1A0F1E] via-[#2A0B2E] to-[#3A1B3A] text-violet-50">
							<CardHeader>
								<CardTitle className="text-sm font-normal text-violet-200/70">反差等级</CardTitle>
							</CardHeader>
							<CardContent className="space-y-3">
								<div className="flex items-baseline gap-2">
									<span className="font-serif text-2xl text-amber-200">{contrast.label}</span>
								</div>
								<div className="flex gap-1">
									{[0, 1, 2, 3, 4, 5].map((i) => (
										<div
											key={i}
											className={`h-1.5 flex-1 rounded-full ${i <= contrast.level ? 'bg-gradient-to-r from-amber-400 to-rose-500' : 'bg-violet-900/40'}`}
										/>
									))}
								</div>
								<p className="text-xs text-violet-100/70 leading-relaxed">{contrast.desc}</p>
							</CardContent>
						</Card>
					)}

					<Card className="border-violet-900/30 bg-[#0B0F1E] text-violet-50">
							<CardHeader>
								<CardTitle className="text-sm font-normal text-violet-200/70">四维分数</CardTitle>
							</CardHeader>
							<CardContent className="space-y-3">
								{([
									{ key: 'N' as Dim, label: '夜晚人格', icon: Moon },
									{ key: 'D' as Dim, label: '欲望释放', icon: Flame },
									{ key: 'G' as Dim, label: '被注视渴求', icon: Eye },
									{ key: 'E' as Dim, label: '情绪浓度', icon: Droplet },
								]).map(({ key, label, icon: Icon }) => {
									const max = 8;
									const v = scores[key];
									return (
										<div key={key} className="space-y-1">
											<div className="flex items-center justify-between text-xs text-violet-200/70">
												<span className="flex items-center gap-2">
													<Icon className="h-3 w-3" />
													{label}
												</span>
												<span>{v} / {max}</span>
											</div>
											<div className="h-1.5 w-full bg-violet-900/40 rounded-full overflow-hidden">
												<div
													className="h-full bg-gradient-to-r from-violet-400 to-fuchsia-400"
													style={{ width: `${(v / max) * 100}%` }}
												/>
											</div>
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
								结果已保存到你的灵魂角落
							</div>
						)}

						<div className="rounded-md border border-violet-500/20 bg-violet-500/5 p-4 text-center text-xs text-violet-200/70">
							<span className="font-serif text-sm">夜深了，另一个你醒着。</span>
							<br />
							<a href="/" className="underline hover:text-violet-100">回到未眠 →</a>
						</div>

						<div className="pt-4 text-center text-[10px] text-violet-300/30">
							<span>·</span>
							<a href="/enneagram.html" className="mx-2 hover:text-violet-300/60">九型夜人格</a>
							<span>·</span>
							<a href="/bdsm.html" className="mx-2 hover:text-violet-300/60">深度版</a>
							<span>·</span>
						</div>
					</>
				)}
			</div>
		</PageShell>
	);
}
