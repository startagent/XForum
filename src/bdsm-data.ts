// BDSM 夜人格深度版 · 类型与题库
// 16 维度 · 28 题 — 对标主流测试的丰富度，但语言保持「未眠」的夜色基调

export interface BdsmType {
	code: string;
	name: string;
	tagline: string;
	desc: string;
	color: string;
}

export interface BdsmQuestion {
	id: number;
	text: string;
	options: Array<{ label: string; scores: Record<string, number> }>;
}

export const BDSM_DISCLAIMER =
	'本测试仅作自我探索用途，不鼓励任何非自愿行为。所有结果仅自己可见，不会出现在主页或公开统计中。';

export const BDSM_TYPES: BdsmType[] = [
	{ code: 'D', name: '主导者', tagline: '你享受掌控的快感，也享受被信任的重量', desc: '你天生倾向主导。你享受掌控节奏、设定规则的快感，享受对方在你手里慢慢松开防备。但你也明白：真正的权力，是对方愿意交出来。', color: '#E11D48' },
	{ code: 'S', name: '服从者', tagline: '你享受交出去的轻松，也享受被接住的踏实', desc: '你倾向服从。在合适的信任里，你愿意交出控制权，让自己被引导、被安排。这并非软弱，而是一种主动的让步——你选择把决定权，交给更值得的人。', color: '#3B82F6' },
	{ code: 'T', name: '施虐者', tagline: '痛感是你的语言，节制是你的修养', desc: '你在施加痛感中找到表达。你享受对方因你而颤抖的瞬间，也懂得分寸比强度更重要。节制，是你最性感的武器。', color: '#A855F7' },
	{ code: 'M', name: '受虐者', tagline: '你从痛感里找到存在，从让渡里找到归属', desc: '你在被施加的痛感中找到存在感。痛让你清醒，让你确认自己正在被注视、被在意。这是一种古老的释放方式，它需要极大的信任，也带来极大的平静。', color: '#F472B6' },
	{ code: 'SW', name: '切换者', tagline: '你在两端游走，看尽两个方向的风景', desc: '你是流动的。你既会主导也会服从，取决于对方、情境与那一刻的心境。这让你比单一角色更难被定义，也更难被满足——你需要能与你共舞的人。', color: '#FBBF24' },
	{ code: 'V', name: '旁观者', tagline: '你享受氛围，多于参与', desc: '你更享受场景本身而不是角色扮演。你像一个观察者，被氛围、张力、关系结构所吸引。参与不是必需，看见就够了。', color: '#64748B' },
	{ code: 'E', name: '暴露者', tagline: '被看见的瞬间，你才完整', desc: '你享受被注视。在被他人目光触及的那一刻，你感到自己是活着的、是被渴望的。暴露不是羞耻，是你送给世界的礼物。', color: '#10B981' },
	{ code: 'R', name: '绳师', tagline: '每一道绳结，都是你写的诗', desc: '你着迷于束缚的艺术。绳、布、皮具——你用它们勾勒身体的曲线，也勾勒信任的边界。对你而言，束缚是造型，更是对话。', color: '#0EA5E9' },
	{ code: 'B', name: '绳奴', tagline: '被缚住的瞬间，你才自由', desc: '你渴望被束缚。当绳索贴上皮肤、当活动被限制，你反而感到一种奇异的安宁——你不用再假装自由，可以安心地被困住。', color: '#8B5CF6' },
	{ code: 'P', name: '原始者', tagline: '你追逐，或被追逐，本能先于规则', desc: '你心里住着一头野兽。比起复杂的规则与角色，你更相信本能——追逐、撕咬、臣服于更原始的力量。文明对你而言，是太薄的一层壳。', color: '#F97316' },
	{ code: 'BR', name: '叛逆者', tagline: '你用调皮，试探对方的底线', desc: '你不甘心乖乖听话。你用调皮、顶嘴、小小的违抗，去试探对方愿不愿意、能不能够制住你。你的叛逆，是另一种邀请。', color: '#EC4899' },
	{ code: 'BT', name: '驯服者', tagline: '越是难驯的，你越想征服', desc: '你享受驯服的过程。比起一开始就顺从的，那些顶嘴、挑衅、需要被一点点压服的，更能点燃你。你的耐心，是对方投降的催化剂。', color: '#DC2626' },
	{ code: 'AG', name: '扮演者', tagline: '在另一段时间里，你才是真的你', desc: '你在年龄的扮演中找到安放。有时你变小，回到被照顾的安稳；有时你成为照顾者，承载另一份柔软。这是属于你的、被允许的时光倒流。', color: '#14B8A6' },
	{ code: 'X', name: '实验者', tagline: '没试过的，你都想试一次', desc: '你的好奇心先于偏好。新奇的道具、陌生的场景、没听过的关系结构——你愿意试一次，再决定要不要留下。体验，是你认识自己的方式。', color: '#7C3AED' },
	{ code: 'N', name: '开放者', tagline: '爱不必独占，欲望不必闭门', desc: '你不认为亲密必须排他。你享受关系之外的连接，也愿意让伴侣拥有同样的自由。对你而言，开放不是稀释，是另一种坦诚。', color: '#059669' },
	{ code: 'VN', name: '纯粹者', tagline: '在简单的亲密里，你才放松', desc: '你倾向更朴素的关系。比起复杂的角色与场景，你更珍惜两个人之间 plain 的温度——肌肤、呼吸、彼此的重量。简单，是你的诚实。', color: '#94A3B8' },
];

export const BDSM_QUESTIONS: BdsmQuestion[] = [
	{ id: 1, text: '深夜独处时，你脑海里最常浮现的关系模式是？', options: [
		{ label: '我在主导，对方在跟随我的节奏', scores: { D: 2, T: 1 } },
		{ label: '我在被引导，对方在掌控全局', scores: { S: 2, M: 1 } },
		{ label: '看场景而变，两端我都试过', scores: { SW: 2 } },
		{ label: '更享受氛围，不一定要扮演', scores: { V: 2 } },
		{ label: '两个人简单的拥抱就够了', scores: { VN: 2 } },
	]},
	{ id: 2, text: '让你最着迷的瞬间是？', options: [
		{ label: '对方按我的节奏呼吸', scores: { D: 2, R: 1 } },
		{ label: '对方说"随你，我什么都听"', scores: { D: 1, T: 1, BT: 1 } },
		{ label: '我被按住、不能动的那一秒', scores: { S: 1, M: 2, B: 1 } },
		{ label: '痛感带来的清醒与存在感', scores: { T: 1, M: 2 } },
		{ label: '被很多人注视的那一刻', scores: { E: 2 } },
	]},
	{ id: 3, text: '你对"信任"的态度？', options: [
		{ label: '我给出信任，对方交出控制权', scores: { D: 2 } },
		{ label: '我交出控制权，换取被接住', scores: { S: 2, M: 1 } },
		{ label: '信任是双向的，角色可以互换', scores: { SW: 2 } },
		{ label: '信任让我能放心地承受痛感', scores: { M: 2 } },
		{ label: '信任让我能放心地施加痛感', scores: { T: 2 } },
	]},
	{ id: 4, text: '你害怕的是？', options: [
		{ label: '失控——场面不在我手里', scores: { D: 2, BT: 1 } },
		{ label: '被抛弃——交出去之后没人接', scores: { S: 1, M: 1 } },
		{ label: '被固定——一直只能是一个角色', scores: { SW: 2 } },
		{ label: '没有边界感的混乱场景', scores: { V: 2, VN: 1 } },
		{ label: '无聊——重复同样的剧本', scores: { X: 2 } },
	]},
	{ id: 5, text: '理想的深夜场景？', options: [
		{ label: '我设规则，对方执行', scores: { D: 2 } },
		{ label: '对方设规则，我执行', scores: { S: 2 } },
		{ label: '痛感与快感交织的瞬间', scores: { T: 1, M: 1 } },
		{ label: '不一定要扮演，氛围够了', scores: { V: 2, VN: 1 } },
		{ label: '看心情，今晚可能是另一种我', scores: { SW: 2, X: 1 } },
	]},
	{ id: 6, text: '在亲密关系里，你最享受的是？', options: [
		{ label: '被信任地交出控制权', scores: { D: 2 } },
		{ label: '被稳稳地接住', scores: { S: 2 } },
		{ label: '施加有节制的痛感', scores: { T: 2 } },
		{ label: '在痛感里被看见', scores: { M: 2 } },
		{ label: '在两端游走的自由', scores: { SW: 2 } },
		{ label: '关系结构的张力本身', scores: { V: 2 } },
	]},
	{ id: 7, text: '当对方"不听话"时，你的反应？', options: [
		{ label: '这正是我想看到的，慢慢压服', scores: { BT: 2, D: 1 } },
		{ label: '有点扫兴，希望对方配合', scores: { D: 1, S: 1 } },
		{ label: '我就是这样的人，对方得能接住', scores: { BR: 2 } },
		{ label: '无所谓，氛围对就行', scores: { V: 1, VN: 1 } },
	]},
	{ id: 8, text: '看到绳索、皮具、束缚的画面，你？', options: [
		{ label: '想亲手把它们绕在对方身上', scores: { R: 2, D: 1 } },
		{ label: '想让它们贴上自己的皮肤', scores: { B: 2, S: 1 } },
		{ label: '欣赏美感，但不一定要参与', scores: { V: 2 } },
		{ label: '想试试看是什么感觉', scores: { X: 2 } },
		{ label: '没什么特别感觉', scores: { VN: 2 } },
	]},
	{ id: 9, text: '关于"痛"——', options: [
		{ label: '我想给予它，看对方因我而颤', scores: { T: 2 } },
		{ label: '我想承受它，在痛里找到自己', scores: { M: 2 } },
		{ label: '看情境，给与受都可以', scores: { SW: 2 } },
		{ label: '不太能接受痛感', scores: { VN: 2, V: 1 } },
	]},
	{ id: 10, text: '你更享受哪种"被看见"的方式？', options: [
		{ label: '只被一个人，深深地看见', scores: { VN: 2, S: 1 } },
		{ label: '被许多人注视，因我而兴奋', scores: { E: 2 } },
		{ label: '在场景里被注视，而非日常', scores: { V: 2, E: 1 } },
		{ label: '被看见不如被感受', scores: { M: 1, B: 1 } },
	]},
	{ id: 11, text: '关于"角色扮演"，你？', options: [
		{ label: '想成为照顾者，承载另一份柔软', scores: { AG: 2, D: 1 } },
		{ label: '想回到被照顾的安稳里', scores: { AG: 2, S: 1 } },
		{ label: '对年龄扮演没兴趣', scores: { VN: 1, X: 1 } },
		{ label: '想试各种没演过的角色', scores: { X: 2 } },
	]},
	{ id: 12, text: '你心里的"野兽"是？', options: [
		{ label: '我追逐，本能先于规则', scores: { P: 2, D: 1 } },
		{ label: '我被追逐，臣服于更原始的力量', scores: { P: 2, S: 1 } },
		{ label: '我没什么野兽，更愿意被驯服', scores: { S: 1, M: 1 } },
		{ label: '我享受驯服别人的野兽', scores: { BT: 2 } },
		{ label: '野兽太累了，我喜欢安静', scores: { VN: 2, V: 1 } },
	]},
	{ id: 13, text: '关于亲密关系的排他性——', options: [
		{ label: '必须独占，身体和心都是', scores: { VN: 2 } },
		{ label: '可以开放，连接不必只属于一人', scores: { N: 2, X: 1 } },
		{ label: '看具体情境与协议', scores: { SW: 1, X: 1 } },
		{ label: '我只在意当下的那个人', scores: { V: 1 } },
	]},
	{ id: 14, text: '对方挑逗你时，你的反应？', options: [
		{ label: '反客为主，让对方知道谁在主导', scores: { D: 2, BT: 1 } },
		{ label: '顺势被引导，享受被带', scores: { S: 2 } },
		{ label: '顶回去，看对方能不能制住我', scores: { BR: 2 } },
		{ label: '享受这种张力本身', scores: { V: 1, E: 1 } },
	]},
	{ id: 15, text: '你如何理解"自由"？', options: [
		{ label: '掌控局面，按我的意志来', scores: { D: 2 } },
		{ label: '交出选择，被安排的轻松', scores: { S: 2, B: 1 } },
		{ label: '被束缚时反而最自由', scores: { B: 2, M: 1 } },
		{ label: '流动地在两端切换', scores: { SW: 2 } },
		{ label: '简单的两个人之间', scores: { VN: 2 } },
	]},
	{ id: 16, text: '看到陌生的道具或场景，你？', options: [
		{ label: '想立刻试一次', scores: { X: 2 } },
		{ label: '先观察别人怎么用', scores: { V: 2 } },
		{ label: '想亲手用在对方身上', scores: { D: 1, T: 1, R: 1 } },
		{ label: '想被这样对待', scores: { S: 1, M: 1, B: 1 } },
		{ label: '没什么兴趣', scores: { VN: 2 } },
	]},
	{ id: 17, text: '你更在意场景里的？', options: [
		{ label: '节奏——由我控制', scores: { D: 2 } },
		{ label: '边界——清晰且被尊重', scores: { V: 2, VN: 1 } },
		{ label: '张力——痛感与快感的拉锯', scores: { T: 1, M: 1 } },
		{ label: '新奇——没经历过的体验', scores: { X: 2 } },
		{ label: '温度——两个人简单的连接', scores: { VN: 2 } },
	]},
	{ id: 18, text: '关于"被照顾"——', options: [
		{ label: '我想被稳稳接住、被安排', scores: { S: 2, AG: 1 } },
		{ label: '我更想成为照顾者', scores: { D: 1, AG: 2 } },
		{ label: '不需要被照顾，我自理', scores: { D: 1, VN: 1 } },
		{ label: '只在特定时刻想变小', scores: { AG: 2 } },
	]},
	{ id: 19, text: '对方"挑衅"你时？', options: [
		{ label: '正合我意，慢慢让 ta 投降', scores: { BT: 2, D: 1 } },
		{ label: '会顶回去，看谁先认输', scores: { BR: 2, SW: 1 } },
		{ label: '觉得有趣，但不一定要赢', scores: { V: 1, X: 1 } },
		{ label: '希望对方别这样', scores: { S: 1, VN: 1 } },
	]},
	{ id: 20, text: '你心目中"性感"的代名词是？', options: [
		{ label: '掌控', scores: { D: 2 } },
		{ label: '臣服', scores: { S: 2 } },
		{ label: '痛感', scores: { T: 1, M: 1 } },
		{ label: '束缚', scores: { R: 1, B: 1 } },
		{ label: '被注视', scores: { E: 2 } },
		{ label: '本能', scores: { P: 2 } },
		{ label: '简单', scores: { VN: 2 } },
	]},
	{ id: 21, text: '关于"展示"——', options: [
		{ label: '想被旁观，因被看见而兴奋', scores: { E: 2 } },
		{ label: '想旁观别人，氛围足够', scores: { V: 2 } },
		{ label: '只属于我和对方，不展示', scores: { VN: 2 } },
		{ label: '看情境，可以试', scores: { X: 1, N: 1 } },
	]},
	{ id: 22, text: '你更愿意在关系里？', options: [
		{ label: '成为规则制定者', scores: { D: 2 } },
		{ label: '成为规则遵循者', scores: { S: 2 } },
		{ label: '在两者间流动', scores: { SW: 2 } },
		{ label: '不被规则定义', scores: { X: 2, P: 1 } },
		{ label: '规则不重要，温度才重要', scores: { VN: 2 } },
	]},
	{ id: 23, text: '看到束缚美学（绳艺、皮具）的画面，你最先想？', options: [
		{ label: '这是门艺术，我想学', scores: { R: 2 } },
		{ label: '我想成为那个被绑的人', scores: { B: 2 } },
		{ label: '欣赏，但不参与', scores: { V: 2 } },
		{ label: '想试试看是什么体验', scores: { X: 2 } },
	]},
	{ id: 24, text: '你最容易在哪一刻"卸下防备"？', options: [
		{ label: '对方完全交付控制权', scores: { D: 2 } },
		{ label: '被稳稳接住、被安排', scores: { S: 2, B: 1 } },
		{ label: '在痛感里被看见', scores: { M: 2 } },
		{ label: '在熟悉的两个人之间', scores: { VN: 2 } },
		{ label: '在没试过的陌生里', scores: { X: 2 } },
	]},
	{ id: 25, text: '关于"驯服"——', options: [
		{ label: '我享受驯服的过程', scores: { BT: 2 } },
		{ label: '我就是那个需要被驯服的', scores: { BR: 2 } },
		{ label: '不太需要这种动态', scores: { VN: 2, V: 1 } },
		{ label: '看心情，两端都行', scores: { SW: 2 } },
	]},
	{ id: 26, text: '你最在意关系里的？', options: [
		{ label: '权力结构清晰', scores: { D: 1, S: 1 } },
		{ label: '信任与边界', scores: { V: 2, B: 1, R: 1 } },
		{ label: '新鲜与探索', scores: { X: 2 } },
		{ label: '连接的温度', scores: { VN: 2 } },
		{ label: '开放与自由', scores: { N: 2 } },
	]},
	{ id: 27, text: '深夜的房间，你最想？', options: [
		{ label: '让对方按我的意志来', scores: { D: 2 } },
		{ label: '被对方安排好一切', scores: { S: 2 } },
		{ label: '在痛感与快感的拉锯里', scores: { T: 1, M: 1 } },
		{ label: '被缚住，安心地不动', scores: { B: 2 } },
		{ label: '被注视着', scores: { E: 2 } },
		{ label: '简单地拥抱', scores: { VN: 2 } },
	]},
	{ id: 28, text: '如果只能选一种"被记住"的方式？', options: [
		{ label: '那个让 ta 投降的人', scores: { D: 2, BT: 1 } },
		{ label: '那个安心交付的人', scores: { S: 2 } },
		{ label: '那个让 ta 颤抖的痛', scores: { T: 2 } },
		{ label: '那个在痛里被看见的人', scores: { M: 2 } },
		{ label: '那个流动难定义的人', scores: { SW: 2 } },
		{ label: '那个被注视的人', scores: { E: 2 } },
		{ label: '那个简单的温度', scores: { VN: 2 } },
	]},
];
