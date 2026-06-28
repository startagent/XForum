// 灵魂深度测试 · 8 维度 40 题 + 5 星球 + 关系期待 + 匹配度
// 对标 Soul / 夜聊处CP 的"灵魂星球 + 匹配"机制，作为 BDSM 深度版的补充与升级
// 与 BDSM 不同：BDSM 测欲望角色，灵魂深度测关系风格与情绪底色、关系偏好与匹配契合

export interface SoulDim {
	code: string;
	name: string;
	pole: string; // 维度极性描述
	desc: string;
	color: string;
}

export interface SoulPlanet {
	code: string;
	name: string;
	emoji: string;
	desc: string;
	tagline: string;
	color: string;
	dims: string[]; // 该星球对应的主维度
	// 匹配映射（借鉴夜聊处CP）：互补 / 化学反应 / 摩擦
	complementary?: string[]; // 互补星球：差异中相互补完
	chemistry?: string[]; // 化学星球：天然共鸣
	friction?: string[]; // 摩擦星球：吸引但有张力
	seeking?: string; // 这个星球在关系里寻找什么
}

// 关系期待（借鉴夜聊处CP的"关系阶段"）
export interface RelationMode {
	code: string;
	name: string;
	desc: string;
	tagline: string;
	emoji: string;
}

export const SOUL_DEEP_RELATION_MODES: RelationMode[] = [
	{ code: 'ECHO', name: '一夜相遇', emoji: '🪐', tagline: '一次就够了，记住就好', desc: '你倾向短暂的深度相遇，不期待延续，但希望那一刻是真的。' },
	{ code: 'ORBIT', name: '反复靠近', emoji: '🌗', tagline: '不承诺，但会回来', desc: '你享受反复靠近某个人的感觉，不被定义，但有节奏。' },
	{ code: 'CONSTELL', name: '长期同行', emoji: '⭐', tagline: '稳定是另一种性感', desc: '你期待一段持续的连接，能在时间里慢慢加深。' },
	{ code: 'MIRROR', name: '灵魂镜像', emoji: '🌌', tagline: '找一个能照见自己的人', desc: '你寻找的不是一个对象，而是一面镜子——能让你看清自己。' },
];

export interface SoulDeepQuestion {
	id: number;
	text: string;
	options: Array<{ label: string; scores: Record<string, number> }>;
}

export const SOUL_DEEP_DISCLAIMER =
	'灵魂深度测试探索你的关系风格与情绪底色，结果仅自己可见，不会出现在主页或公开统计。';

// 8 维度（每维度 5 题，共 40 题）
// DOM 主导 / YLD 让渡 / INT 浓烈 / TNL 张力 / FLOW 流动 / RISK 边缘 / BND 开放 / EMP 共情
export const SOUL_DEEP_DIMS: SoulDim[] = [
	{ code: 'DOM', name: '主导', pole: '掌控 ↔ 跟随', desc: '你倾向于掌控局面、设定节奏，还是顺应对方的引导。', color: '#E11D48' },
	{ code: 'YLD', name: '让渡', pole: '交付 ↔ 守住', desc: '在信任里你愿意交出多少自己，又能被接住多少。', color: '#3B82F6' },
	{ code: 'INT', name: '浓烈', pole: '炽烈 ↔ 冷静', desc: '你的情绪浓度——你活在高潮里，还是生活在低声里。', color: '#F59E0B' },
	{ code: 'TNL', name: '张力', pole: '紧绷 ↔ 松弛', desc: '你对痛感、压力、悬而未决的耐受与偏好。', color: '#A855F7' },
	{ code: 'FLOW', name: '流动', pole: '多变 ↔ 专注', desc: '你在不同角色与状态间切换的自由度。', color: '#FBBF24' },
	{ code: 'RISK', name: '边缘', pole: '试探 ↔ 安全', desc: '你愿意走多远，靠近边缘还是停在已知里。', color: '#10B981' },
	{ code: 'BND', name: '开放', pole: '敞开 ↔ 封闭', desc: '你对关系边界的设定——独占还是共享，封闭还是流动。', color: '#06B6D4' },
	{ code: 'EMP', name: '共情', pole: '镜像 ↔ 抽离', desc: '你感受他人的方式——是浸入还是观察。', color: '#EC4899' },
];

// 5 星球：基于维度得分聚类，含匹配映射
export const SOUL_DEEP_PLANETS: SoulPlanet[] = [
	{
		code: 'FLAME',
		name: '赤焰星',
		emoji: '🔥',
		tagline: '你天生倾向主导，掌控是你的语言',
		desc: '你享受掌控局面、设定节奏的快感。在你手里，对方慢慢松开防备——这是你给信任的形状。但你也明白：真正的权力，是对方愿意交出来。',
		color: '#E11D48',
		dims: ['DOM'],
		complementary: ['TIDE'], // 主导 ↔ 让渡 天然互补
		chemistry: ['BOLT'], // 高强度碰撞
		friction: ['VORTEX'], // 流动者让你抓不住
		seeking: '一个愿意把控制权交给你的人',
	},
	{
		code: 'TIDE',
		name: '潮汐星',
		emoji: '🌙',
		tagline: '你在让渡与张力之间，找到归属',
		desc: '你倾向交付自己，在痛感与被接住的瞬间找到存在。你不是软弱，而是选择把决定权交给更值得的人——这是一种主动的让步。',
		color: '#3B82F6',
		dims: ['YLD', 'TNL'],
		complementary: ['FLAME'], // 让渡 ↔ 主导
		chemistry: ['FEATHER'], // 被深深接住
		friction: ['BOLT'], // 太浓烈会让你失衡
		seeking: '一个能稳稳接住你交付的人',
	},
	{
		code: 'VORTEX',
		name: '漩涡星',
		emoji: '🌀',
		tagline: '你在两端游走，看尽两个方向的风景',
		desc: '你是流动的。你不被单一角色定义，会在不同情境里切换节奏。这让你比单一角色更难被满足——你需要能与你共舞的人。',
		color: '#FBBF24',
		dims: ['FLOW'],
		complementary: ['VORTEX', 'BOLT'], // 同样流动的人，或带强度的人
		chemistry: ['VORTEX'], // 镜像共鸣
		friction: ['FEATHER'], // 太专注会让你觉得窄
		seeking: '一个不被角色定义、能与你共舞的人',
	},
	{
		code: 'BOLT',
		name: '雷霆星',
		emoji: '⚡',
		tagline: '你追逐浓烈，靠近边缘才感觉活着',
		desc: '你的情绪浓度高，愿意为体验付代价。你不是不害怕，而是知道——边缘的风景，平庸者永远看不到。',
		color: '#10B981',
		dims: ['RISK', 'INT'],
		complementary: ['FEATHER'], // 浓烈 ↔ 专注，相互拉扯
		chemistry: ['FLAME', 'VORTEX'], // 强度碰撞
		friction: ['TIDE'], // 太脆弱你会怕伤到
		seeking: '一个能与你一起走向边缘的人',
	},
	{
		code: 'FEATHER',
		name: '羽骨星',
		emoji: '🪶',
		tagline: '你在共情里找到自己，在专注里安放',
		desc: '你倾向更深更窄的连接。你不追逐场景与多变，而是珍惜两个人之间 plain 的温度。简单，是你的诚实。',
		color: '#EC4899',
		dims: ['EMP', 'BND'],
		complementary: ['BOLT'], // 共情 ↔ 浓烈，让对方落地
		chemistry: ['TIDE'], // 都倾向深的连接
		friction: ['VORTEX'], // 太流动你接不住
		seeking: '一个能与你深深互相看见的人',
	},
];

// 根据维度得分推算星球
export function derivePlanet(scores: Record<string, number>): SoulPlanet {
	const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
	const top = sorted[0]?.[0];
	for (const p of SOUL_DEEP_PLANETS) {
		if (p.dims.includes(top || '')) return p;
	}
	// 第二高分兜底
	const second = sorted[1]?.[0];
	for (const p of SOUL_DEEP_PLANETS) {
		if (p.dims.includes(second || '')) return p;
	}
	return SOUL_DEEP_PLANETS[4];
}

// 关系期待推算：基于 BND（开放）/ INT（浓烈）/ FLOW（流动）的组合
export function deriveRelationMode(scores: Record<string, number>): RelationMode {
	const bnd = scores.BND || 0;
	const int = scores.INT || 0;
	const flow = scores.FLOW || 0;
	// 高开放 + 高浓烈：一夜相遇
	if (bnd >= 8 && int >= 8) return SOUL_DEEP_RELATION_MODES[0];
	// 高流动 + 中等浓烈：反复靠近
	if (flow >= 8 && int >= 5) return SOUL_DEEP_RELATION_MODES[1];
	// 低开放 + 高共情：长期同行
	if (bnd <= 5 && (scores.EMP || 0) >= 7) return SOUL_DEEP_RELATION_MODES[2];
	// 默认：灵魂镜像
	return SOUL_DEEP_RELATION_MODES[3];
}

// 计算两个用户的匹配度（借鉴夜聊处CP的契合度算法）
// 输入：两组维度得分；输出：{ score: 0-100, type: chemistry|complementary|friction|neutral, label }
export interface MatchResult {
	score: number; // 0-100
	type: 'chemistry' | 'complementary' | 'friction' | 'neutral';
	label: string;
	desc: string;
}

export function calcMatch(
	myScores: Record<string, number>,
	theirScores: Record<string, number>,
	myPlanet?: SoulPlanet,
	theirPlanet?: SoulPlanet
): MatchResult {
	// 维度距离（欧氏距离）转相似度
	const dims = ['DOM', 'YLD', 'INT', 'TNL', 'FLOW', 'RISK', 'BND', 'EMP'];
	let sumSq = 0;
	let valid = 0;
	for (const d of dims) {
		if (myScores[d] != null && theirScores[d] != null) {
			const diff = (myScores[d] || 0) - (theirScores[d] || 0);
			sumSq += diff * diff;
			valid++;
		}
	}
	if (valid === 0) {
		return { score: 0, type: 'neutral', label: '数据不足', desc: '需要双方都完成测试' };
	}
	const distance = Math.sqrt(sumSq);
	// 距离归一化（理论最大约 sqrt(8 * 15^2) ≈ 42）
	const rawScore = Math.max(0, 1 - distance / 30);
	// 星球映射加分
	let bonus = 0;
	let type: MatchResult['type'] = 'neutral';
	let label = '中性';
	let desc = '你们在维度上有一定相似度，没有特别强的化学反应。';
	if (myPlanet && theirPlanet) {
		if (myPlanet.chemistry?.includes(theirPlanet.code)) {
			bonus = 18; type = 'chemistry'; label = '化学反应';
			desc = `${myPlanet.name} × ${theirPlanet.name}：天然共鸣，话不投机半句多，话若投机一句话就够。`;
		} else if (myPlanet.complementary?.includes(theirPlanet.code)) {
			bonus = 14; type = 'complementary'; label = '互补契合';
			desc = `${myPlanet.name} × ${theirPlanet.name}：差异中相互补完，对方有你缺少的那一块。`;
		} else if (myPlanet.friction?.includes(theirPlanet.code)) {
			bonus = -8; type = 'friction'; label = '张力摩擦';
			desc = `${myPlanet.name} × ${theirPlanet.name}：互相吸引又有张力，是一场需要经营的相遇。`;
		} else {
			bonus = 4; type = 'neutral'; label = '温和相似';
			desc = `${myPlanet.name} × ${theirPlanet.name}：你们有相似的部分，也有需要磨合的地方。`;
		}
	}
	const score = Math.max(0, Math.min(100, Math.round(rawScore * 82 + bonus + 18)));
	return { score, type, label, desc };
}

// 40 题：每维度 5 题，每题 4 选项
export const SOUL_DEEP_QUESTIONS: SoulDeepQuestion[] = [
	// ===== DOM 主导 (5 题) =====
	{ id: 1, text: '两个人独处的夜晚，你更倾向？', options: [
		{ label: '由我决定今晚的节奏与方向', scores: { DOM: 3 } },
		{ label: '看对方想做什么，我跟随', scores: { YLD: 2, EMP: 1 } },
		{ label: '两个人一起商量着来', scores: { FLOW: 2, BND: 1 } },
		{ label: '气氛对了再说，谁主导无所谓', scores: { FLOW: 1, INT: 1 } },
	]},
	{ id: 2, text: '面对冲突，你的本能是？', options: [
		{ label: '主动出击，把局面拉回自己手里', scores: { DOM: 3, INT: 1 } },
		{ label: '先退一步，等对方冷静', scores: { YLD: 2, EMP: 1 } },
		{ label: '寻找双方都能接受的方案', scores: { FLOW: 2, BND: 1 } },
		{ label: '把情绪压下去，理性处理', scores: { EMP: 1, TNL: 1 } },
	]},
	{ id: 3, text: '关于"做决定"，你？', options: [
		{ label: '我喜欢做决定，也愿意承担后果', scores: { DOM: 3, RISK: 1 } },
		{ label: '希望对方替我决定，我执行', scores: { YLD: 3 } },
		{ label: '看事情重要程度，分工决定', scores: { FLOW: 2 } },
		{ label: '两个人一起，谁有道理听谁', scores: { EMP: 2, BND: 1 } },
	]},
	{ id: 4, text: '深夜的对话里，你更常？', options: [
		{ label: '主导话题，问出你想知道的', scores: { DOM: 2, INT: 1 } },
		{ label: '让对方说，你听', scores: { YLD: 1, EMP: 2 } },
		{ label: '互相抛话题，节奏均衡', scores: { FLOW: 2 } },
		{ label: '说很少，但每句都到位', scores: { TNL: 1, INT: 1 } },
	]},
	{ id: 5, text: '你心目中"性感"的代名词是？', options: [
		{ label: '掌控', scores: { DOM: 3 } },
		{ label: '臣服', scores: { YLD: 3 } },
		{ label: '流动', scores: { FLOW: 2 } },
		{ label: '专注', scores: { EMP: 2, BND: 1 } },
	]},

	// ===== YLD 让渡 (5 题) =====
	{ id: 6, text: '关于"信任"，你的态度？', options: [
		{ label: '我给出信任，对方交出控制权', scores: { DOM: 2 } },
		{ label: '我交出控制权，换取被接住', scores: { YLD: 3, EMP: 1 } },
		{ label: '信任是双向的，角色可以互换', scores: { FLOW: 2 } },
		{ label: '信任需要长时间积累，不轻易给', scores: { BND: 1, TNL: 1 } },
	]},
	{ id: 7, text: '你害怕的是？', options: [
		{ label: '失控——场面不在我手里', scores: { DOM: 2 } },
		{ label: '被抛弃——交出去之后没人接', scores: { YLD: 3, TNL: 1 } },
		{ label: '被固定——一直只能是一个角色', scores: { FLOW: 2 } },
		{ label: '失去连接——只剩我一个人', scores: { EMP: 2, BND: 1 } },
	]},
	{ id: 8, text: '让你最安心的瞬间是？', options: [
		{ label: '一切按我预期发生', scores: { DOM: 2 } },
		{ label: '对方说"交给我就好"', scores: { YLD: 3, EMP: 1 } },
		{ label: '两个人都知道今晚的剧本', scores: { FLOW: 1, BND: 1 } },
		{ label: '被深深地注视着', scores: { INT: 1, EMP: 2 } },
	]},
	{ id: 9, text: '深夜独处时，你脑海里最常浮现？', options: [
		{ label: '想主导某个场景', scores: { DOM: 2 } },
		{ label: '想被稳稳接住、被安排', scores: { YLD: 3 } },
		{ label: '想象各种可能性', scores: { FLOW: 2, RISK: 1 } },
		{ label: '回忆某个具体的人', scores: { EMP: 2, INT: 1 } },
	]},
	{ id: 10, text: '关于"被照顾"——', options: [
		{ label: '我更想成为照顾者', scores: { DOM: 1, EMP: 2 } },
		{ label: '我想被稳稳接住、被安排', scores: { YLD: 3 } },
		{ label: '看情境，两端都行', scores: { FLOW: 2 } },
		{ label: '不需要被照顾，我自理', scores: { BND: 1, TNL: 1 } },
	]},

	// ===== INT 浓烈 (5 题) =====
	{ id: 11, text: '你的情绪底色更接近？', options: [
		{ label: '炽烈——爱与恨都分明', scores: { INT: 3, RISK: 1 } },
		{ label: '低沉——情绪像潮水，来去无声', scores: { TNL: 2, EMP: 1 } },
		{ label: '明亮——总体是向上的', scores: { BND: 1, FLOW: 1 } },
		{ label: '冷静——很少有情绪起伏', scores: { EMP: 1, BND: 1 } },
	]},
	{ id: 12, text: '看到一段文字被打动，通常因为？', options: [
		{ label: '锋利、直接、不掩饰', scores: { INT: 2, RISK: 1 } },
		{ label: '潮湿、暧昧、欲言又止', scores: { TNL: 2, YLD: 1 } },
		{ label: '温柔、注视、被理解', scores: { EMP: 2, INT: 1 } },
		{ label: '冷静、克制、有距离感', scores: { BND: 1, TNL: 1 } },
	]},
	{ id: 13, text: '关于"心动"——', options: [
		{ label: '一瞬间就被点燃', scores: { INT: 3, RISK: 1 } },
		{ label: '慢慢渗透，回过头才发现', scores: { TNL: 1, EMP: 2 } },
		{ label: '需要反复确认才敢承认', scores: { BND: 1, YLD: 1 } },
		{ label: '心动是稀有的，我很少动', scores: { FLOW: 1, BND: 1 } },
	]},
	{ id: 14, text: '深夜失眠的原因通常是？', options: [
		{ label: '情绪还没消化完', scores: { INT: 2, TNL: 1 } },
		{ label: '想着某个人', scores: { EMP: 2, INT: 1 } },
		{ label: '脑子里各种可能停不下', scores: { FLOW: 2, RISK: 1 } },
		{ label: '习惯了，没什么原因', scores: { BND: 1, TNL: 1 } },
	]},
	{ id: 15, text: '你如何表达在意？', options: [
		{ label: '直接说，让对方知道', scores: { INT: 2, DOM: 1 } },
		{ label: '用行动，不说', scores: { EMP: 2, YLD: 1 } },
		{ label: '写下来，文字比嘴诚实', scores: { TNL: 1, INT: 1 } },
		{ label: '不太会表达，藏在心里', scores: { BND: 2, TNL: 1 } },
	]},

	// ===== TNL 张力 (5 题) =====
	{ id: 16, text: '关于"痛感"——', options: [
		{ label: '我想给予它，看对方因我而颤', scores: { DOM: 1, TNL: 2 } },
		{ label: '我想承受它，在痛里找到自己', scores: { YLD: 1, TNL: 3 } },
		{ label: '看情境，给与受都可以', scores: { FLOW: 2, TNL: 1 } },
		{ label: '不太能接受痛感', scores: { BND: 1, EMP: 1 } },
	]},
	{ id: 17, text: '你最容易在哪种状态里"卸下防备"？', options: [
		{ label: '对方完全交付控制权', scores: { DOM: 2, TNL: 1 } },
		{ label: '在痛感与快感的拉锯里', scores: { TNL: 3, INT: 1 } },
		{ label: '在没试过的陌生里', scores: { FLOW: 1, RISK: 2 } },
		{ label: '在熟悉的两个人之间', scores: { EMP: 2, BND: 1 } },
	]},
	{ id: 18, text: '让你着迷的瞬间是？', options: [
		{ label: '对方按我的节奏呼吸', scores: { DOM: 2, TNL: 1 } },
		{ label: '被按住、不能动的那一秒', scores: { YLD: 1, TNL: 3 } },
		{ label: '两个人都不知道下一步', scores: { FLOW: 2, RISK: 1 } },
		{ label: '被深深地注视', scores: { EMP: 2, INT: 1 } },
	]},
	{ id: 19, text: '关于"危险"——', options: [
		{ label: '危险让我清醒，我靠近它', scores: { RISK: 2, TNL: 1 } },
		{ label: '危险是诱惑，但我会克制', scores: { TNL: 2, BND: 1 } },
		{ label: '看是哪种危险', scores: { FLOW: 2 } },
		{ label: '我远离危险，安全第一', scores: { BND: 2, EMP: 1 } },
	]},
	{ id: 20, text: '看到束缚美学的画面，你最先想？', options: [
		{ label: '亲手把它们绕在对方身上', scores: { DOM: 1, TNL: 2 } },
		{ label: '成为那个被绑的人', scores: { YLD: 1, TNL: 2 } },
		{ label: '欣赏美感，但不一定要参与', scores: { FLOW: 1, BND: 1 } },
		{ label: '想试试看是什么体验', scores: { RISK: 2, FLOW: 1 } },
	]},

	// ===== FLOW 流动 (5 题) =====
	{ id: 21, text: '关于"角色"——', options: [
		{ label: '我有固定倾向，不太变', scores: { DOM: 1, YLD: 1 } },
		{ label: '看对象与情境，两端都行', scores: { FLOW: 3 } },
		{ label: '我喜欢尝试各种角色', scores: { FLOW: 2, RISK: 1 } },
		{ label: '不需要角色，氛围够就行', scores: { BND: 1, EMP: 1 } },
	]},
	{ id: 22, text: '你最讨厌的是？', options: [
		{ label: '失控感', scores: { DOM: 1, TNL: 1 } },
		{ label: '被固定、被定义', scores: { FLOW: 3 } },
		{ label: '无聊、重复', scores: { RISK: 2, FLOW: 1 } },
		{ label: '虚假、不真诚', scores: { EMP: 2, BND: 1 } },
	]},
	{ id: 23, text: '看到陌生的道具或场景，你？', options: [
		{ label: '想立刻试一次', scores: { RISK: 2, FLOW: 1 } },
		{ label: '先观察别人怎么用', scores: { BND: 1, EMP: 1 } },
		{ label: '看情境，可能试可能不试', scores: { FLOW: 2 } },
		{ label: '没什么兴趣', scores: { BND: 2 } },
	]},
	{ id: 24, text: '你的关系节奏更像？', options: [
		{ label: '一开始就稳定，慢慢加深', scores: { BND: 1, EMP: 1 } },
		{ label: '起伏很大，有高潮有低谷', scores: { INT: 2, FLOW: 1 } },
		{ label: '看对象，每个人都不一样', scores: { FLOW: 3 } },
		{ label: '慢慢来，不急', scores: { TNL: 1, BND: 1 } },
	]},
	{ id: 25, text: '你愿意在关系里？', options: [
		{ label: '成为规则制定者', scores: { DOM: 2 } },
		{ label: '成为规则遵循者', scores: { YLD: 2 } },
		{ label: '在两者间流动', scores: { FLOW: 3 } },
		{ label: '不被规则定义', scores: { RISK: 1, FLOW: 1 } },
	]},

	// ===== RISK 边缘 (5 题) =====
	{ id: 26, text: '关于"边界"——', options: [
		{ label: '我喜欢试探边界在哪', scores: { RISK: 3, TNL: 1 } },
		{ label: '边界清晰我才有安全感', scores: { BND: 2, YLD: 1 } },
		{ label: '边界可以协商，弹性更好', scores: { FLOW: 2, BND: 1 } },
		{ label: '不太在意边界，看人', scores: { EMP: 1, FLOW: 1 } },
	]},
	{ id: 27, text: '让你兴奋的是？', options: [
		{ label: '未知的、没试过的', scores: { RISK: 3, FLOW: 1 } },
		{ label: '熟悉的、安心的', scores: { BND: 2, EMP: 1 } },
		{ label: '张力十足的拉锯', scores: { TNL: 2, INT: 1 } },
		{ label: '被深深地理解', scores: { EMP: 2, INT: 1 } },
	]},
	{ id: 28, text: '关于"禁忌"——', options: [
		{ label: '禁忌让我更想试', scores: { RISK: 3, TNL: 1 } },
		{ label: '禁忌是边界，应该尊重', scores: { BND: 2 } },
		{ label: '看是哪种禁忌', scores: { FLOW: 2 } },
		{ label: '不太感兴趣', scores: { EMP: 1, BND: 1 } },
	]},
	{ id: 29, text: '理想的深夜场景？', options: [
		{ label: '安全熟悉的环境', scores: { BND: 2, EMP: 1 } },
		{ label: '没去过的陌生地方', scores: { RISK: 3, FLOW: 1 } },
		{ label: '张力十足的场景', scores: { TNL: 2, INT: 1 } },
		{ label: '两个人简单的房间', scores: { EMP: 2, BND: 1 } },
	]},
	{ id: 30, text: '关于"冒险"——', options: [
		{ label: '我享受冒险，包括情感上的', scores: { RISK: 3, INT: 1 } },
		{ label: '情感上保守，生活上随意', scores: { BND: 1, FLOW: 1 } },
		{ label: '看与谁一起', scores: { EMP: 2, FLOW: 1 } },
		{ label: '我倾向稳定，不冒险', scores: { BND: 2, YLD: 1 } },
	]},

	// ===== BND 开放 (5 题) =====
	{ id: 31, text: '关于亲密关系的排他性——', options: [
		{ label: '必须独占，身体和心都是', scores: { BND: 1, EMP: 1 } },
		{ label: '可以开放，连接不必只属于一人', scores: { BND: 3, FLOW: 1 } },
		{ label: '看具体情境与协议', scores: { FLOW: 2, RISK: 1 } },
		{ label: '我只在意当下的那个人', scores: { EMP: 2, INT: 1 } },
	]},
	{ id: 32, text: '你的社交边界更像？', options: [
		{ label: '开放，认识新朋友是乐趣', scores: { BND: 3, FLOW: 1 } },
		{ label: '封闭，几个深交就够', scores: { EMP: 2, BND: 1 } },
		{ label: '看心情与阶段', scores: { FLOW: 2 } },
		{ label: '工作需要才社交', scores: { TNL: 1, BND: 1 } },
	]},
	{ id: 33, text: '关于"分享"——', options: [
		{ label: '我愿意把感受写出来分享', scores: { BND: 2, INT: 1 } },
		{ label: '只与最亲近的人分享', scores: { EMP: 2, BND: 1 } },
		{ label: '看情境，有时分享有时藏', scores: { FLOW: 2 } },
		{ label: '我倾向把感受留给自己', scores: { TNL: 1, BND: 1 } },
	]},
	{ id: 34, text: '看到伴侣与他人亲近，你？', options: [
		{ label: '嫉妒，希望我是唯一的', scores: { EMP: 1, BND: 1 } },
		{ label: '可以接受，连接不必独占', scores: { BND: 3, FLOW: 1 } },
		{ label: '看具体情境', scores: { FLOW: 2 } },
		{ label: '不在意，各自自由', scores: { RISK: 1, BND: 2 } },
	]},
	{ id: 35, text: '你更享受哪种"被看见"？', options: [
		{ label: '只被一个人，深深地看见', scores: { EMP: 2, BND: 1 } },
		{ label: '被许多人注视', scores: { BND: 2, INT: 1 } },
		{ label: '在场景里被注视，而非日常', scores: { FLOW: 1, TNL: 1 } },
		{ label: '不需要被看见，被感受就行', scores: { TNL: 1, EMP: 1 } },
	]},

	// ===== EMP 共情 (5 题) =====
	{ id: 36, text: '看到他人痛苦，你？', options: [
		{ label: '立刻感同身受，情绪被牵动', scores: { EMP: 3, INT: 1 } },
		{ label: '理解，但保持距离', scores: { BND: 1, FLOW: 1 } },
		{ label: '想帮他解决，而不是共感', scores: { DOM: 1, EMP: 1 } },
		{ label: '不太受影响', scores: { TNL: 1, BND: 1 } },
	]},
	{ id: 37, text: '你如何理解他人？', options: [
		{ label: '设身处地，把自己放进对方的位置', scores: { EMP: 3 } },
		{ label: '观察行为，分析动机', scores: { FLOW: 1, TNL: 1 } },
		{ label: '直接问，听对方说', scores: { BND: 1, INT: 1 } },
		{ label: '凭直觉，不用想', scores: { INT: 1, EMP: 1 } },
	]},
	{ id: 38, text: '关于"倾听"——', options: [
		{ label: '我能听出对方没说出口的', scores: { EMP: 3, INT: 1 } },
		{ label: '我专注听对方说的', scores: { BND: 1, EMP: 1 } },
		{ label: '我倾向给建议，而不是只听', scores: { DOM: 1, FLOW: 1 } },
		{ label: '听一会儿就想转移话题', scores: { FLOW: 1, RISK: 1 } },
	]},
	{ id: 39, text: '你最在意关系里的？', options: [
		{ label: '权力结构清晰', scores: { DOM: 1, YLD: 1 } },
		{ label: '信任与边界', scores: { BND: 1, TNL: 1 } },
		{ label: '新鲜与探索', scores: { RISK: 2, FLOW: 1 } },
		{ label: '连接的温度', scores: { EMP: 3, INT: 1 } },
	]},
	{ id: 40, text: '如果只能选一种"被记住"的方式？', options: [
		{ label: '那个让 ta 投降的人', scores: { DOM: 2, TNL: 1 } },
		{ label: '那个安心交付的人', scores: { YLD: 2, EMP: 1 } },
		{ label: '那个流动难定义的人', scores: { FLOW: 3 } },
		{ label: '那个深深懂 ta 的人', scores: { EMP: 3, INT: 1 } },
	]},
];
