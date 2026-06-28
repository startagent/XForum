import * as React from 'react';
import {
	AlertTriangle, ArrowLeft, BookOpen, Check, ChevronDown, ChevronRight, Crown,
	Edit3, Eye, GitBranch, Loader2, Lock, Moon, Plus, Save, Sparkles, Star,
	Tag, Trash2, Upload, X,
} from 'lucide-react';

import { PageShell } from '@/components/page-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
	variables: Record<string, number> | null;
	status: string;
	play_count: number;
	ending_count: number;
	author_name?: string;
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

const PLANET_OPTIONS = [
	{ code: 'NOVA', name: '炽星', emoji: '🔥' },
	{ code: 'EBB', name: '潮汐', emoji: '🌊' },
	{ code: 'ECHO', name: '回声', emoji: '🌌' },
	{ code: 'DUSK', name: '薄暮', emoji: '🌑' },
	{ code: 'VEIL', name: '面纱', emoji: '🎭' },
];

const CONTENT_LEVELS = ['微光', '薄暮', '暗涌', '炽夜'];

const ENDING_TYPES = [
	{ code: 'normal', name: '普通结局', emoji: '⭐' },
	{ code: 'good', name: '好结局', emoji: '🌸' },
	{ code: 'bad', name: '坏结局', emoji: '🥀' },
	{ code: 'secret', name: '隐藏结局', emoji: '🌙' },
	{ code: 'true', name: '真结局', emoji: '💎' },
];

function getQueryParam(name: string): string {
	const params = new URLSearchParams(window.location.search);
	return params.get(name) || '';
}

export function ScenarioEditorPage() {
	const user = React.useMemo(() => getUser(), []);
	const scenarioIdParam = getQueryParam('id');
	const initialId = scenarioIdParam ? parseInt(scenarioIdParam) : null;

	const [scenario, setScenario] = React.useState<ScenarioDetail | null>(null);
	const [nodes, setNodes] = React.useState<PlayNode[]>([]);
	const [choices, setChoices] = React.useState<Choice[]>([]);
	const [selectedNodeId, setSelectedNodeId] = React.useState<number | null>(null);
	const [loading, setLoading] = React.useState(true);
	const [error, setError] = React.useState('');
	const [savingMeta, setSavingMeta] = React.useState(false);
	const [metaSaved, setMetaSaved] = React.useState(false);
	const [tab, setTab] = React.useState<'meta' | 'nodes' | 'preview'>('meta');

	const isCreator = user?.role === 'creator' || user?.role === 'admin';

	React.useEffect(() => {
		if (!isCreator) {
			setLoading(false);
			setError('只有夜作者可以打开剧本编辑器');
			return;
		}
		if (initialId) {
			loadScenario(initialId);
		} else {
			// 新建空白剧本（仅前端，待保存）
			setScenario({
				id: 0, title: '', slug: '', summary: '', cover_emoji: '🌙',
				content_level: '微光', tags: [], recommended_planets: [],
				open_hour_start: null, open_hour_end: null, variables: {}, status: 'draft',
				play_count: 0, ending_count: 0,
			});
			setLoading(false);
		}
	}, [initialId, isCreator]);

	async function loadScenario(id: number) {
		try {
			const res = await apiFetch<{ scenario: ScenarioDetail; nodes: PlayNode[]; choices: Choice[] }>(`/scenarios/${id}`);
			setScenario(res.scenario);
			setNodes(res.nodes || []);
			setChoices(res.choices || []);
			// 默认选中起点节点（parent_id 为 null 的第一个）
			const startNode = (res.nodes || []).find((n) => n.parent_id == null);
			setSelectedNodeId(startNode?.id ?? (res.nodes[0]?.id || null));
		} catch (e: any) {
			setError(String(e?.message || e));
		} finally {
			setLoading(false);
		}
	}

	function updateMeta<K extends keyof ScenarioDetail>(key: K, value: ScenarioDetail[K]) {
		if (!scenario) return;
		setScenario({ ...scenario, [key]: value });
		setMetaSaved(false);
	}

	async function saveMeta() {
		if (!scenario) return;
		setSavingMeta(true);
		try {
			if (scenario.id === 0) {
				// 创建新剧本
				const res = await apiFetch<{ id: number; slug: string }>('/scenarios', {
					method: 'POST', headers: getSecurityHeaders('POST'),
					body: JSON.stringify({
						title: scenario.title || '未命名剧本',
						slug: scenario.slug || undefined,
						summary: scenario.summary,
						cover_emoji: scenario.cover_emoji,
						content_level: scenario.content_level,
						tags: scenario.tags,
						recommended_planets: scenario.recommended_planets,
						open_hour_start: scenario.open_hour_start,
						open_hour_end: scenario.open_hour_end,
						variables: scenario.variables,
						status: scenario.status,
					}),
				});
				// 跳转到带 id 的 URL
				window.location.replace(`/scenario-editor.html?id=${res.id}`);
				return;
			}
			await apiFetch(`/scenarios/${scenario.id}`, {
				method: 'PUT', headers: getSecurityHeaders('PUT'),
				body: JSON.stringify({
					title: scenario.title,
					slug: scenario.slug,
					summary: scenario.summary,
					cover_emoji: scenario.cover_emoji,
					content_level: scenario.content_level,
					tags: scenario.tags,
					recommended_planets: scenario.recommended_planets,
					open_hour_start: scenario.open_hour_start,
					open_hour_end: scenario.open_hour_end,
					variables: scenario.variables,
					status: scenario.status,
				}),
			});
			setMetaSaved(true);
			setTimeout(() => setMetaSaved(false), 2000);
		} catch (e: any) {
			alert(e?.message || '保存失败');
		} finally {
			setSavingMeta(false);
		}
	}

	async function publish() {
		if (!scenario) return;
		if (!scenario.title.trim()) {
			alert('请先填写标题');
			return;
		}
		if (nodes.length === 0) {
			alert('至少需要一个起点节点才能发布');
			return;
		}
		if (!confirm('发布后所有用户都能看到这个剧本。确定发布？')) return;
		// 先保存
		setSavingMeta(true);
		try {
			await apiFetch(`/scenarios/${scenario.id}`, {
				method: 'PUT', headers: getSecurityHeaders('PUT'),
				body: JSON.stringify({ status: 'published' }),
			});
			setScenario({ ...scenario, status: 'published' });
			setMetaSaved(true);
		} catch (e: any) {
			alert(e?.message || '发布失败');
		} finally {
			setSavingMeta(false);
		}
	}

	async function unpublish() {
		if (!scenario) return;
		if (!confirm('撤回后用户将无法游玩。确定？')) return;
		try {
			await apiFetch(`/scenarios/${scenario.id}`, {
				method: 'PUT', headers: getSecurityHeaders('PUT'),
				body: JSON.stringify({ status: 'draft' }),
			});
			setScenario({ ...scenario, status: 'draft' });
		} catch (e: any) {
			alert(e?.message || '撤回失败');
		}
	}

	// ===== 节点操作 =====
	async function createNode(parentId: number | null) {
		if (!scenario) return;
		try {
			const res = await apiFetch<{ id: number; node_key: string }>(`/scenarios/${scenario.id}/nodes`, {
				method: 'POST', headers: getSecurityHeaders('POST'),
				body: JSON.stringify({
					parent_id: parentId,
					node_key: `n-${Date.now().toString(36)}`,
					title: '新节点',
					body: '在这里写下叙事内容…',
					mood: '',
					is_ending: 0,
				}),
			});
			await loadScenario(scenario.id);
			setSelectedNodeId(res.id);
		} catch (e: any) {
			alert(e?.message || '创建失败');
		}
	}

	async function updateNode(nodeId: number, patch: Partial<PlayNode>) {
		if (!scenario) return;
		try {
			await apiFetch(`/scenarios/${scenario.id}/nodes/${nodeId}`, {
				method: 'PUT', headers: getSecurityHeaders('PUT'),
				body: JSON.stringify(patch),
			});
			setNodes((arr) => arr.map((n) => n.id === nodeId ? { ...n, ...patch } as PlayNode : n));
		} catch (e: any) {
			alert(e?.message || '保存失败');
		}
	}

	async function deleteNode(nodeId: number) {
		if (!scenario) return;
		if (!confirm('删除节点会同时删除其所有选项和子节点。确定？')) return;
		try {
			await apiFetch(`/scenarios/${scenario.id}/nodes/${nodeId}`, {
				method: 'DELETE', headers: getSecurityHeaders('DELETE'),
			});
			await loadScenario(scenario.id);
			if (selectedNodeId === nodeId) setSelectedNodeId(null);
		} catch (e: any) {
			alert(e?.message || '删除失败');
		}
	}

	// ===== 选项操作 =====
	async function createChoice(nodeId: number) {
		if (!scenario) return;
		try {
			await apiFetch(`/scenarios/${scenario.id}/choices`, {
				method: 'POST', headers: getSecurityHeaders('POST'),
				body: JSON.stringify({
					node_id: nodeId,
					label: '新选项',
					target_node_id: null,
					sort_order: 0,
				}),
			});
			await loadScenario(scenario.id);
		} catch (e: any) {
			alert(e?.message || '创建失败');
		}
	}

	async function updateChoice(choiceId: number, patch: Partial<Choice>) {
		if (!scenario) return;
		try {
			await apiFetch(`/scenarios/${scenario.id}/choices/${choiceId}`, {
				method: 'PUT', headers: getSecurityHeaders('PUT'),
				body: JSON.stringify(patch),
			});
			setChoices((arr) => arr.map((c) => c.id === choiceId ? { ...c, ...patch } as Choice : c));
		} catch (e: any) {
			alert(e?.message || '保存失败');
		}
	}

	async function deleteChoice(choiceId: number) {
		if (!scenario) return;
		if (!confirm('删除这个选项？')) return;
		try {
			await apiFetch(`/scenarios/${scenario.id}/choices/${choiceId}`, {
				method: 'DELETE', headers: getSecurityHeaders('DELETE'),
			});
			setChoices((arr) => arr.filter((c) => c.id !== choiceId));
		} catch (e: any) {
			alert(e?.message || '删除失败');
		}
	}

	if (!isCreator) {
		return (
			<PageShell>
				<div className="mx-auto max-w-md py-16 text-center space-y-4">
					<Lock className="mx-auto h-10 w-10 text-violet-300/60" />
					<h2 className="font-serif text-xl text-violet-100">仅夜作者可访问</h2>
					<p className="text-sm text-violet-300/60">剧本编辑器仅对拥有 creator 权限的夜作者开放</p>
					<a href="/settings.html" className="inline-flex items-center gap-2 rounded-md border border-violet-400/30 bg-violet-500/10 px-4 py-2 text-sm text-violet-200">
						前往设置兑换邀请码
					</a>
				</div>
			</PageShell>
		);
	}

	if (loading) {
		return (
			<PageShell>
				<div className="py-20 text-center text-violet-300/60 text-sm">载入编辑器…</div>
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

	const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null;
	const startNode = nodes.find((n) => n.parent_id == null);

	return (
		<PageShell>
			<div className="mx-auto max-w-6xl space-y-4">
				{/* 顶部条 */}
				<div className="flex flex-wrap items-center justify-between gap-2">
					<a href="/scenarios.html" className="inline-flex items-center gap-1.5 text-xs text-violet-300/60 hover:text-violet-200">
						<ArrowLeft className="h-3.5 w-3.5" />
						夜剧场
					</a>
					<div className="flex items-center gap-2">
						{scenario.status === 'published' ? (
							<span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-200">
								<Eye className="h-3 w-3" /> 已发布
							</span>
						) : (
							<span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-200">
								<Edit3 className="h-3 w-3" /> 草稿
							</span>
						)}
						<Button onClick={saveMeta} disabled={savingMeta} size="sm" className="bg-violet-600 hover:bg-violet-500">
							{savingMeta ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : metaSaved ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
							{metaSaved ? '已保存' : '保存'}
						</Button>
						{scenario.id !== 0 ? (
							scenario.status === 'published' ? (
								<Button onClick={unpublish} variant="outline" size="sm" className="border-amber-400/30 text-amber-200">
									撤回
								</Button>
							) : (
								<Button onClick={publish} size="sm" className="bg-gradient-to-r from-fuchsia-600 to-rose-600 hover:from-fuchsia-500 hover:to-rose-500">
									<Upload className="h-3.5 w-3.5" />
									发布
								</Button>
							)
						) : null}
					</div>
				</div>

				{/* 标题 + Tab */}
				<Card className="border-violet-900/30 bg-gradient-to-br from-[#0B0F1E] via-[#13102B] to-[#1A0B2E] text-violet-50">
					<CardContent className="py-4 space-y-3">
						<div className="flex items-center gap-3">
							<span className="text-3xl">{scenario.cover_emoji || '🌙'}</span>
							<input
								value={scenario.title}
								onChange={(e) => updateMeta('title', e.target.value)}
								placeholder="剧本标题"
								className="flex-1 bg-transparent border-none text-2xl font-serif text-violet-50 outline-none placeholder:text-violet-300/30"
							/>
							<span className="text-[11px] text-violet-300/40">#{scenario.id || '新'}</span>
						</div>
						<div className="flex gap-1 border-b border-violet-500/10">
							{(['meta', 'nodes', 'preview'] as const).map((t) => (
								<button
									key={t}
									onClick={() => setTab(t)}
									className={`px-3 py-1.5 text-xs transition ${tab === t ? 'text-fuchsia-200 border-b-2 border-fuchsia-400' : 'text-violet-300/60 hover:text-violet-200'}`}
								>
									{t === 'meta' ? '剧本信息' : t === 'nodes' ? '节点图' : '预览'}
								</button>
							))}
						</div>
					</CardContent>
				</Card>

				{tab === 'meta' ? (
					<MetaEditor scenario={scenario} update={updateMeta} />
				) : null}

				{tab === 'nodes' ? (
					<div className="grid gap-4 lg:grid-cols-[280px_1fr]">
						<NodeListPanel
							nodes={nodes}
							choices={choices}
							selectedNodeId={selectedNodeId}
							startNodeId={startNode?.id || null}
							onSelect={setSelectedNodeId}
							onCreateRoot={() => createNode(null)}
							onCreateChild={(pid) => createNode(pid)}
							onDelete={deleteNode}
							scenarioId={scenario.id}
						/>
						{selectedNode ? (
							<NodeEditor
								node={selectedNode}
								nodes={nodes}
								choices={choices.filter((c) => c.node_id === selectedNode.id)}
								onUpdate={(patch) => updateNode(selectedNode.id, patch)}
								onCreateChoice={() => createChoice(selectedNode.id)}
								onUpdateChoice={updateChoice}
								onDeleteChoice={deleteChoice}
							/>
						) : (
							<Card className="border-violet-900/30 bg-[#0B0F1E]/60">
								<CardContent className="py-16 text-center text-violet-300/50 text-sm">
									<GitBranch className="mx-auto h-8 w-8 mb-3 opacity-50" />
									{nodes.length === 0 ? (
										<>
											<p>从起点节点开始构建你的剧本</p>
											<Button onClick={() => createNode(null)} size="sm" className="mt-3 bg-violet-600 hover:bg-violet-500">
												<Plus className="h-3.5 w-3.5" />
												创建起点节点
											</Button>
										</>
									) : (
										<p>从左侧选择一个节点开始编辑</p>
									)}
								</CardContent>
							</Card>
						)}
					</div>
				) : null}

				{tab === 'preview' ? (
					<PreviewPanel scenario={scenario} nodes={nodes} choices={choices} />
				) : null}
			</div>
		</PageShell>
	);
}

// ===== 剧本信息编辑器 =====
function MetaEditor({ scenario, update }: {
	scenario: ScenarioDetail;
	update: <K extends keyof ScenarioDetail>(key: K, value: ScenarioDetail[K]) => void;
}) {
	const [tagInput, setTagInput] = React.useState('');
	const [varKey, setVarKey] = React.useState('');
	const [varVal, setVarVal] = React.useState('');

	return (
		<Card className="border-violet-900/30 bg-[#0B0F1E]/60">
			<CardHeader>
				<CardTitle className="text-base font-serif text-violet-100">剧本信息</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="grid gap-4 sm:grid-cols-2">
					<div className="space-y-1.5">
						<Label className="text-xs text-violet-300/70">封面 Emoji</Label>
						<Input
							value={scenario.cover_emoji}
							onChange={(e) => update('cover_emoji', e.target.value.slice(0, 4))}
							placeholder="🌙"
							className="bg-violet-950/30 border-violet-700/30 text-violet-100"
						/>
					</div>
					<div className="space-y-1.5">
						<Label className="text-xs text-violet-300/70">URL Slug（可选）</Label>
						<Input
							value={scenario.slug}
							onChange={(e) => update('slug', e.target.value)}
							placeholder="auto"
							className="bg-violet-950/30 border-violet-700/30 text-violet-100"
						/>
					</div>
				</div>

				<div className="space-y-1.5">
					<Label className="text-xs text-violet-300/70">简介</Label>
					<Textarea
						value={scenario.summary || ''}
						onChange={(e) => update('summary', e.target.value)}
						placeholder="一句话告诉玩家这是一个怎样的剧本"
						rows={3}
						className="bg-violet-950/30 border-violet-700/30 text-violet-100"
					/>
				</div>

				<div className="space-y-1.5">
					<Label className="text-xs text-violet-300/70">内容尺度</Label>
					<div className="flex flex-wrap gap-1.5">
						{CONTENT_LEVELS.map((l) => (
							<button
								key={l}
								onClick={() => update('content_level', l)}
								className={`rounded-full border px-3 py-1 text-xs transition ${scenario.content_level === l ? 'border-fuchsia-500/40 bg-fuchsia-500/20 text-fuchsia-100' : 'border-violet-500/20 bg-white/5 text-violet-300/60'}`}
							>
								{l}
							</button>
						))}
					</div>
				</div>

				<div className="space-y-1.5">
					<Label className="text-xs text-violet-300/70">推荐星球（基于灵魂深度测试结果）</Label>
					<div className="flex flex-wrap gap-1.5">
						{PLANET_OPTIONS.map((p) => {
							const active = (scenario.recommended_planets || []).includes(p.code);
							return (
								<button
									key={p.code}
									onClick={() => {
										const cur = scenario.recommended_planets || [];
										update('recommended_planets', active ? cur.filter((x) => x !== p.code) : [...cur, p.code]);
									}}
									className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition ${active ? 'border-fuchsia-500/40 bg-fuchsia-500/20 text-fuchsia-100' : 'border-violet-500/20 bg-white/5 text-violet-300/60'}`}
								>
									{p.emoji} {p.name}
								</button>
							);
						})}
					</div>
				</div>

				<div className="space-y-1.5">
					<Label className="text-xs text-violet-300/70">标签</Label>
					<div className="flex flex-wrap gap-1.5 mb-1.5">
						{(scenario.tags || []).map((t) => (
							<span key={t} className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2 py-0.5 text-xs text-violet-200">
								{t}
								<button onClick={() => update('tags', (scenario.tags || []).filter((x) => x !== t))}>
									<X className="h-2.5 w-2.5" />
								</button>
							</span>
						))}
					</div>
					<div className="flex gap-2">
						<Input
							value={tagInput}
							onChange={(e) => setTagInput(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === 'Enter' && tagInput.trim()) {
									e.preventDefault();
									update('tags', [...(scenario.tags || []), tagInput.trim()]);
									setTagInput('');
								}
							}}
							placeholder="输入标签后回车"
							className="bg-violet-950/30 border-violet-700/30 text-violet-100"
						/>
					</div>
				</div>

				<div className="grid gap-4 sm:grid-cols-2">
					<div className="space-y-1.5">
						<Label className="text-xs text-violet-300/70">开放时段·起（24h，留空则全天）</Label>
						<Input
							type="number"
							min={0}
							max={23}
							value={scenario.open_hour_start ?? ''}
							onChange={(e) => update('open_hour_start', e.target.value === '' ? null : parseInt(e.target.value))}
							placeholder="如 22"
							className="bg-violet-950/30 border-violet-700/30 text-violet-100"
						/>
					</div>
					<div className="space-y-1.5">
						<Label className="text-xs text-violet-300/70">开放时段·止</Label>
						<Input
							type="number"
							min={0}
							max={23}
							value={scenario.open_hour_end ?? ''}
							onChange={(e) => update('open_hour_end', e.target.value === '' ? null : parseInt(e.target.value))}
							placeholder="如 4"
							className="bg-violet-950/30 border-violet-700/30 text-violet-100"
						/>
					</div>
				</div>

				<div className="space-y-1.5">
					<Label className="text-xs text-violet-300/70">状态变量（用于条件判断，如 {`{chemistry: 0, trust: 0}`})</Label>
					<div className="rounded-md border border-violet-700/30 bg-violet-950/30 p-2 space-y-2">
						<div className="flex flex-wrap gap-1.5">
							{scenario.variables ? Object.entries(scenario.variables).map(([k, v]) => (
								<span key={k} className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2 py-0.5 text-xs text-violet-200">
									{k} = {v}
									<button onClick={() => {
										const next = { ...scenario.variables };
										delete next[k];
										update('variables', next);
									}}>
										<X className="h-2.5 w-2.5" />
									</button>
								</span>
							)) : null}
						</div>
						<div className="flex gap-2">
							<Input
								value={varKey}
								onChange={(e) => setVarKey(e.target.value)}
								placeholder="变量名"
								className="bg-violet-950/30 border-violet-700/30 text-violet-100 text-xs"
							/>
							<Input
								type="number"
								value={varVal}
								onChange={(e) => setVarVal(e.target.value)}
								placeholder="0"
								className="bg-violet-950/30 border-violet-700/30 text-violet-100 text-xs w-24"
							/>
							<Button
								onClick={() => {
									if (!varKey.trim()) return;
									update('variables', { ...(scenario.variables || {}), [varKey.trim()]: parseInt(varVal || '0') });
									setVarKey('');
									setVarVal('');
								}}
								size="sm"
								variant="outline"
								className="border-violet-400/30 text-violet-200"
							>
								<Plus className="h-3 w-3" />
							</Button>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

// ===== 节点列表面板 =====
function NodeListPanel({
	nodes, choices, selectedNodeId, startNodeId, onSelect, onCreateRoot, onCreateChild, onDelete, scenarioId,
}: {
	nodes: PlayNode[];
	choices: Choice[];
	selectedNodeId: number | null;
	startNodeId: number | null;
	onSelect: (id: number) => void;
	onCreateRoot: () => void;
	onCreateChild: (parentId: number) => void;
	onDelete: (id: number) => void;
	scenarioId: number;
}) {
	// 构建树形结构：每个节点列出直接子节点
	const childrenOf = (pid: number | null) => nodes.filter((n) => n.parent_id === pid);

	function renderNode(node: PlayNode, depth: number): React.ReactNode {
		const childNodes = childrenOf(node.id);
		const isSelected = node.id === selectedNodeId;
		const isStart = node.id === startNodeId;
		return (
			<div key={node.id}>
				<div
					className={`group flex items-center gap-1 rounded-md px-2 py-1.5 text-xs cursor-pointer transition ${isSelected ? 'bg-fuchsia-500/20 text-fuchsia-100' : 'hover:bg-white/5 text-violet-200/80'}`}
					style={{ paddingLeft: `${depth * 12 + 8}px` }}
					onClick={() => onSelect(node.id)}
				>
					{isStart ? <Sparkles className="h-3 w-3 text-amber-300 flex-shrink-0" /> : null}
					{node.is_ending ? <Star className="h-3 w-3 text-amber-300 flex-shrink-0" /> : <BookOpen className="h-3 w-3 text-violet-300/50 flex-shrink-0" />}
					<span className="flex-1 truncate">{node.title || '未命名节点'}</span>
					<button
						onClick={(e) => { e.stopPropagation(); onCreateChild(node.id); }}
						className="opacity-0 group-hover:opacity-100 text-violet-300/60 hover:text-violet-100"
						title="添加子节点"
					>
						<Plus className="h-3 w-3" />
					</button>
					<button
						onClick={(e) => { e.stopPropagation(); onDelete(node.id); }}
						className="opacity-0 group-hover:opacity-100 text-rose-300/60 hover:text-rose-200"
						title="删除"
					>
						<Trash2 className="h-3 w-3" />
					</button>
				</div>
				{childNodes.map((c) => renderNode(c, depth + 1))}
			</div>
		);
	}

	const roots = childrenOf(null);

	return (
		<Card className="border-violet-900/30 bg-[#0B0F1E]/60 lg:sticky lg:top-4">
			<CardHeader className="pb-2">
				<CardTitle className="text-sm font-serif text-violet-100 flex items-center justify-between">
					<span>节点图</span>
					<Button onClick={onCreateRoot} size="sm" variant="outline" className="h-7 border-violet-400/30 text-violet-200">
						<Plus className="h-3 w-3" />
						根节点
					</Button>
				</CardTitle>
			</CardHeader>
			<CardContent className="pt-0 space-y-1 max-h-[70vh] overflow-y-auto">
				<div className="text-[10px] text-violet-300/40 px-2 py-1 flex gap-3">
					<span><Sparkles className="inline h-2.5 w-2.5 text-amber-300 mr-1" />起点</span>
					<span><Star className="inline h-2.5 w-2.5 text-amber-300 mr-1" />结局</span>
					<span><BookOpen className="inline h-2.5 w-2.5 text-violet-300/50 mr-1" />普通</span>
				</div>
				{roots.length === 0 ? (
					<div className="py-6 text-center text-xs text-violet-300/40">
						暂无节点
					</div>
				) : roots.map((n) => renderNode(n, 0))}
			</CardContent>
		</Card>
	);
}

// ===== 节点编辑器 =====
function NodeEditor({
	node, nodes, choices, onUpdate, onCreateChoice, onUpdateChoice, onDeleteChoice,
}: {
	node: PlayNode;
	nodes: PlayNode[];
	choices: Choice[];
	onUpdate: (patch: Partial<PlayNode>) => void;
	onCreateChoice: () => void;
	onUpdateChoice: (id: number, patch: Partial<Choice>) => void;
	onDeleteChoice: (id: number) => void;
}) {
	const [varKey, setVarKey] = React.useState('');
	const [varVal, setVarVal] = React.useState('');
	const [reqKey, setReqKey] = React.useState('');
	const [reqVal, setReqVal] = React.useState('');

	const effects = node.state_effects || {};
	const parentOptions = nodes.filter((n) => n.id !== node.id);

	return (
		<Card className="border-violet-900/30 bg-[#0B0F1E]/60">
			<CardHeader className="pb-2">
				<CardTitle className="text-sm font-serif text-violet-100 flex items-center justify-between">
					<span>编辑节点 · {node.node_key}</span>
					{node.is_ending ? (
						<span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-200">
							<Star className="h-2.5 w-2.5" />
							结局节点
						</span>
					) : null}
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="grid gap-3 sm:grid-cols-2">
					<div className="space-y-1.5">
						<Label className="text-xs text-violet-300/70">节点标题</Label>
						<Input
							value={node.title || ''}
							onChange={(e) => onUpdate({ title: e.target.value })}
							placeholder="（可选）"
							className="bg-violet-950/30 border-violet-700/30 text-violet-100"
						/>
					</div>
					<div className="space-y-1.5">
						<Label className="text-xs text-violet-300/70">氛围标签</Label>
						<Input
							value={node.mood || ''}
							onChange={(e) => onUpdate({ mood: e.target.value })}
							placeholder="如 月色 / 暧昧 / 紧张"
							className="bg-violet-950/30 border-violet-700/30 text-violet-100"
						/>
					</div>
				</div>

				<div className="space-y-1.5">
					<Label className="text-xs text-violet-300/70">叙事正文（支持多段）</Label>
					<Textarea
						value={node.body}
						onChange={(e) => onUpdate({ body: e.target.value })}
						placeholder="夜色里，你和他（她）……"
						rows={6}
						className="bg-violet-950/30 border-violet-700/30 text-violet-100 font-serif"
					/>
				</div>

				{/* 状态效果 */}
				<div className="space-y-1.5">
					<Label className="text-xs text-violet-300/70">状态效果（进入此节点时改变变量）</Label>
					<div className="rounded-md border border-violet-700/30 bg-violet-950/30 p-2 space-y-2">
						<div className="flex flex-wrap gap-1.5">
							{Object.entries(effects).map(([k, v]) => (
								<span key={k} className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2 py-0.5 text-xs text-violet-200">
									{k} {v > 0 ? '+' : ''}{v}
									<button onClick={() => {
										const next = { ...effects };
										delete next[k];
										onUpdate({ state_effects: next });
									}}>
										<X className="h-2.5 w-2.5" />
									</button>
								</span>
							))}
						</div>
						<div className="flex gap-2">
							<Input
								value={varKey}
								onChange={(e) => setVarKey(e.target.value)}
								placeholder="变量名"
								className="bg-violet-950/30 border-violet-700/30 text-violet-100 text-xs"
							/>
							<Input
								type="number"
								value={varVal}
								onChange={(e) => setVarVal(e.target.value)}
								placeholder="1 或 -1"
								className="bg-violet-950/30 border-violet-700/30 text-violet-100 text-xs w-28"
							/>
							<Button
								onClick={() => {
									if (!varKey.trim()) return;
									onUpdate({ state_effects: { ...effects, [varKey.trim()]: parseInt(varVal || '0') } });
									setVarKey('');
									setVarVal('');
								}}
								size="sm"
								variant="outline"
								className="border-violet-400/30 text-violet-200"
							>
								<Plus className="h-3 w-3" />
							</Button>
						</div>
					</div>
				</div>

				{/* 结局设置 */}
				<div className="space-y-1.5">
					<Label className="flex items-center gap-2 text-xs text-violet-300/70 cursor-pointer">
						<input
							type="checkbox"
							checked={node.is_ending === 1}
							onChange={(e) => onUpdate({ is_ending: e.target.checked ? 1 : 0 })}
							className="accent-fuchsia-500"
						/>
						这是结局节点
					</Label>
					{node.is_ending === 1 ? (
						<div className="grid gap-3 sm:grid-cols-2 pl-6">
							<div className="space-y-1.5">
								<Label className="text-[11px] text-violet-300/60">结局类型</Label>
								<select
									value={node.ending_type || 'normal'}
									onChange={(e) => onUpdate({ ending_type: e.target.value })}
									className="h-9 w-full rounded-md border border-violet-700/30 bg-violet-950/30 px-2 text-sm text-violet-100"
								>
									{ENDING_TYPES.map((t) => (
										<option key={t.code} value={t.code}>{t.emoji} {t.name}</option>
									))}
								</select>
							</div>
							<div className="space-y-1.5">
								<Label className="text-[11px] text-violet-300/60">结局标题</Label>
								<Input
									value={node.ending_title || ''}
									onChange={(e) => onUpdate({ ending_title: e.target.value })}
									placeholder="如 月下相认"
									className="bg-violet-950/30 border-violet-700/30 text-violet-100"
								/>
							</div>
							<div className="space-y-1.5 sm:col-span-2">
								<Label className="text-[11px] text-violet-300/60">结局信件（可选，给玩家的一段话）</Label>
								<Textarea
									value={node.letter || ''}
									onChange={(e) => onUpdate({ letter: e.target.value })}
									placeholder="亲爱的你，如果你走到这里……"
									rows={3}
									className="bg-violet-950/30 border-violet-700/30 text-violet-100 font-serif"
								/>
							</div>
						</div>
					) : null}
				</div>

				{/* 选项管理 */}
				{node.is_ending !== 1 ? (
					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<Label className="text-xs text-violet-300/70">选项（玩家从这里走向下一个节点）</Label>
							<Button onClick={onCreateChoice} size="sm" variant="outline" className="h-7 border-violet-400/30 text-violet-200">
								<Plus className="h-3 w-3" />
								添加选项
							</Button>
						</div>
						{choices.length === 0 ? (
							<div className="rounded-md border border-dashed border-violet-700/30 p-4 text-center text-xs text-violet-300/40">
								还没有选项 · 玩家将无法推进
							</div>
						) : (
							<div className="space-y-2">
								{choices.map((c, i) => (
									<div key={c.id} className="rounded-md border border-violet-700/30 bg-violet-950/20 p-2 space-y-2">
										<div className="flex gap-2">
											<span className="text-[11px] text-violet-300/50 mt-1.5">{String.fromCharCode(65 + i)}.</span>
											<Input
												value={c.label}
												onChange={(e) => onUpdateChoice(c.id, { label: e.target.value })}
												placeholder="选项文本"
												className="bg-violet-950/40 border-violet-700/30 text-violet-100 text-xs h-8"
											/>
											<select
												value={c.target_node_id || ''}
												onChange={(e) => onUpdateChoice(c.id, { target_node_id: e.target.value ? parseInt(e.target.value) : null })}
												className="h-8 rounded-md border border-violet-700/30 bg-violet-950/40 px-2 text-xs text-violet-100 max-w-[12rem]"
											>
												<option value="">未指定目标</option>
												{parentOptions.map((n) => (
													<option key={n.id} value={n.id}>
														{n.title || `节点 #${n.id}`} {n.is_ending ? '★' : ''}
													</option>
												))}
											</select>
											<button
												onClick={() => onDeleteChoice(c.id)}
												className="text-rose-300/60 hover:text-rose-200 px-1"
											>
												<Trash2 className="h-3.5 w-3.5" />
											</button>
										</div>
										{/* 前置条件 */}
										<div className="pl-6 space-y-1">
											<div className="text-[10px] text-violet-300/40">前置条件（变量 ≥ 值）</div>
											<div className="flex flex-wrap gap-1">
												{c.required_state ? Object.entries(c.required_state).map(([k, v]) => (
													<span key={k} className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-200">
														{k} ≥ {v}
														<button onClick={() => {
															const next = { ...c.required_state };
															delete next[k];
															onUpdateChoice(c.id, { required_state: Object.keys(next).length ? next : null });
														}}>
															<X className="h-2.5 w-2.5" />
														</button>
													</span>
												)) : null}
											</div>
											<div className="flex gap-1.5">
												<Input
													value={reqKey}
													onChange={(e) => setReqKey(e.target.value)}
													placeholder="变量"
													className="bg-violet-950/40 border-violet-700/30 text-violet-100 text-[11px] h-7 w-24"
												/>
												<Input
													type="number"
													value={reqVal}
													onChange={(e) => setReqVal(e.target.value)}
													placeholder="1"
													className="bg-violet-950/40 border-violet-700/30 text-violet-100 text-[11px] h-7 w-16"
												/>
												<Button
													onClick={() => {
														if (!reqKey.trim()) return;
														const cur = c.required_state || {};
														onUpdateChoice(c.id, { required_state: { ...cur, [reqKey.trim()]: parseInt(reqVal || '0') } });
														setReqKey('');
														setReqVal('');
													}}
													size="sm"
													variant="outline"
													className="h-7 border-violet-400/30 text-violet-200 px-2"
												>
													<Plus className="h-3 w-3" />
												</Button>
											</div>
										</div>
									</div>
								))}
							</div>
						)}
					</div>
				) : null}
			</CardContent>
		</Card>
	);
}

// ===== 预览面板 =====
function PreviewPanel({ scenario, nodes, choices }: {
	scenario: ScenarioDetail;
	nodes: PlayNode[];
	choices: Choice[];
}) {
	const endingCount = nodes.filter((n) => n.is_ending).length;
	const orphanChoices = choices.filter((c) => !c.target_node_id);
	const orphanNodes = nodes.filter((n) => !n.is_ending && !choices.some((c) => c.target_node_id === n.id) && n.parent_id !== null);
	const startNode = nodes.find((n) => n.parent_id == null);

	return (
		<div className="space-y-4">
			<Card className="border-violet-900/30 bg-[#0B0F1E]/60">
				<CardHeader>
					<CardTitle className="text-base font-serif text-violet-100">剧本概览</CardTitle>
				</CardHeader>
				<CardContent className="grid gap-3 sm:grid-cols-4 text-sm">
					<div>
						<div className="text-[10px] text-violet-300/50 uppercase">节点总数</div>
						<div className="text-violet-100 text-lg font-serif">{nodes.length}</div>
					</div>
					<div>
						<div className="text-[10px] text-violet-300/50 uppercase">结局总数</div>
						<div className="text-amber-200 text-lg font-serif">{endingCount}</div>
					</div>
					<div>
						<div className="text-[10px] text-violet-300/50 uppercase">选项总数</div>
						<div className="text-violet-100 text-lg font-serif">{choices.length}</div>
					</div>
					<div>
						<div className="text-[10px] text-violet-300/50 uppercase">起点节点</div>
						<div className="text-violet-100 text-sm font-serif truncate">{startNode?.title || '未设置'}</div>
					</div>
				</CardContent>
			</Card>

			{orphanChoices.length > 0 ? (
				<Card className="border-amber-900/30 bg-amber-950/20">
					<CardContent className="py-3 text-xs text-amber-200/80 flex gap-2">
						<AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5 text-amber-300" />
						<div>
							有 <strong>{orphanChoices.length}</strong> 个选项没有目标节点。玩家选择后会无法推进。
						</div>
					</CardContent>
				</Card>
			) : null}

			{orphanNodes.length > 0 ? (
				<Card className="border-amber-900/30 bg-amber-950/20">
					<CardContent className="py-3 text-xs text-amber-200/80 flex gap-2">
						<AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5 text-amber-300" />
						<div>
							有 <strong>{orphanNodes.length}</strong> 个非结局节点没有任何选项指向它。这些节点玩家无法到达。
						</div>
					</CardContent>
				</Card>
			) : null}

			{scenario.status === 'published' ? (
				<Card className="border-emerald-900/30 bg-emerald-950/20">
					<CardContent className="py-3 flex items-center justify-between gap-3">
						<div className="text-xs text-emerald-200/80">
							剧本已发布。用户可通过 <code className="px-1 rounded bg-emerald-950/40">/scenario-play.html?slug={scenario.slug}</code> 游玩。
						</div>
						<a
							href={`/scenario-play.html?slug=${encodeURIComponent(scenario.slug)}`}
							target="_blank"
							rel="noreferrer"
							className="inline-flex items-center gap-1.5 rounded-md border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200"
						>
							<Eye className="h-3.5 w-3.5" />
							试玩
						</a>
					</CardContent>
				</Card>
			) : null}
		</div>
	);
}
