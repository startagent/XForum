-- =========================================
-- 迁移 0002: 添加悬疑推理剧本
-- =========================================

-- 检查是否已存在该剧本，避免重复插入
INSERT INTO scenarios (author_id, title, slug, summary, cover_emoji, content_level, tags, recommended_planets, status)
SELECT 1, '消失的第七夜', 'mystery-seventh-night', '你在一座与世隔绝的雪山庄园中醒来，发现记忆全无。接下来的七天，每晚都有人神秘死亡，而凶手就藏在你身边。七天之内找到真相，否则你将成为下一个受害者。', '🗝️', '暗涌', '["悬疑","推理","惊悚","密室","限时"]', '["ECHO","VEIL"]', 'published'
WHERE NOT EXISTS (SELECT 1 FROM scenarios WHERE slug = 'mystery-seventh-night');

-- 节点1: 起点
INSERT INTO scenario_nodes (scenario_id, node_key, title, body, mood, is_ending)
SELECT id, 'start', '雪山庄园', '你睁开眼睛，入目的是一片陌生的天花板。

窗外雪花纷纷扬扬，壁炉里的火焰正噼啪作响。你躺在柔软的床上，却感到一阵彻骨的寒意——不是因为天气，而是因为你完全不记得自己是谁，为什么会在这里。

床头柜上放着一封信：

"欢迎来到白鹭庄园。你将在此度过七天。在此期间，请遵守以下规则：

1. 每晚十点前必须回到自己的房间
2. 不要相信任何人
3. 找到真相，或者成为真相的一部分

——庄园主人"

门外传来脚步声，有人正在走近。', 'cold', 0
FROM scenarios WHERE slug = 'mystery-seventh-night'
AND NOT EXISTS (SELECT 1 FROM scenario_nodes WHERE node_key = 'start' AND scenario_id = (SELECT id FROM scenarios WHERE slug = 'mystery-seventh-night'));

-- 节点2: 大厅
INSERT INTO scenario_nodes (scenario_id, parent_id, node_key, title, body, mood, is_ending)
SELECT id, (SELECT id FROM scenario_nodes WHERE node_key = 'start'), 'investigate_lobby', '大厅', '你走出房间，来到庄园的大厅。

壁炉火光摇曳，照亮了墙上的油画——七幅一模一样的肖像画，画中人的面容模糊不清。

大厅里已经聚集了几个人：管家、医生、神秘女子和商人。他们看到你，眼神中闪过一丝异样。

"又来了一位客人，"管家开口，"请节哀，第一夜的事情......很遗憾。"

你意识到：已经有人死了。

你要怎么做？', 'tense', 0
FROM scenarios WHERE slug = 'mystery-seventh-night'
AND NOT EXISTS (SELECT 1 FROM scenario_nodes WHERE node_key = 'investigate_lobby' AND scenario_id = (SELECT id FROM scenarios WHERE slug = 'mystery-seventh-night'));

-- 节点3: 询问管家
INSERT INTO scenario_nodes (scenario_id, parent_id, node_key, title, body, mood, is_ending)
SELECT id, (SELECT id FROM scenario_nodes WHERE node_key = 'investigate_lobby'), 'talk_butler', '询问管家', '管家是个五十多岁的男人，眼神锐利，举止得体。

"死者是林小姐，一位钢琴家，"他低声说道，"被发现死在琴房，琴键上放着......一张塔罗牌。"

他递给你一张卡片，上面画着"死神"。

"这是第七夜的第一张牌，"他说，"庄园主人说，七天之内，会有七张牌出现。"

他凑近你耳边："有些事情，我不能在这里说。今晚十点，书房。"

你要怎么做？', 'secret', 0
FROM scenarios WHERE slug = 'mystery-seventh-night'
AND NOT EXISTS (SELECT 1 FROM scenario_nodes WHERE node_key = 'talk_butler' AND scenario_id = (SELECT id FROM scenarios WHERE slug = 'mystery-seventh-night'));

-- 节点4: 琴房
INSERT INTO scenario_nodes (scenario_id, parent_id, node_key, title, body, mood, is_ending)
SELECT id, (SELECT id FROM scenario_nodes WHERE node_key = 'investigate_lobby'), 'investigate_piano_room', '琴房', '你来到琴房，发现门没有锁。

月光透过窗户洒在钢琴上，琴键整齐排列——除了中央的七个键被按下了。

你仔细观察，发现琴键下压着一张纸条："第四个键有秘密。"

你按下那个键，琴键弹起，露出一个小小的暗格。里面是一把钥匙，和一张照片——照片上是你自己，但你完全不记得拍过这张照片。

照片背面写着："相信你自己的记忆。"

脚步声从走廊传来。', 'mystery', 0
FROM scenarios WHERE slug = 'mystery-seventh-night'
AND NOT EXISTS (SELECT 1 FROM scenario_nodes WHERE node_key = 'investigate_piano_room' AND scenario_id = (SELECT id FROM scenarios WHERE slug = 'mystery-seventh-night'));

-- 节点5: 第二夜
INSERT INTO scenario_nodes (scenario_id, parent_id, node_key, title, body, mood, is_ending)
SELECT id, (SELECT id FROM scenario_nodes WHERE node_key = 'talk_butler'), 'night_two', '第二夜', '子夜时分，你被一声尖叫惊醒。

你冲出房间，在走廊里看到了恐怖的一幕——商人大张着嘴，死在楼梯口，手里紧紧攥着一张塔罗牌。

医生蹲下来检查，很快站起身，脸色惨白："毒杀......和昨天一样的手法。"

神秘女子递给你那张牌："审判"，她的声音冰冷，"这意味着什么？"

地牢般的恐惧笼罩着你。两天，两人死亡。还有五天，你会是下一个吗？', 'horror', 0
FROM scenarios WHERE slug = 'mystery-seventh-night'
AND NOT EXISTS (SELECT 1 FROM scenario_nodes WHERE node_key = 'night_two' AND scenario_id = (SELECT id FROM scenarios WHERE slug = 'mystery-seventh-night'));

-- 节点6: 记忆碎片
INSERT INTO scenario_nodes (scenario_id, parent_id, node_key, title, body, mood, is_ending)
SELECT id, (SELECT id FROM scenario_nodes WHERE node_key = 'investigate_piano_room'), 'night_three_clue', '记忆碎片', '你回到房间，拿出那把钥匙和照片。

钥匙可以打开床底的一个暗格。里面是一本日记——是你自己的笔迹。

"第一天：我必须找到她。"
"第二天：白鹭庄园......第七夜仪式......"
"第三天：他们不知道我已经知道了真相。"
"第四天：......"

后面的页面被撕掉了。

你突然头痛欲裂，一些模糊的画面闪过脑海——一个女孩，哭泣着，被关在某个地方......

你需要做出选择。', 'revelation', 0
FROM scenarios WHERE slug = 'mystery-seventh-night'
AND NOT EXISTS (SELECT 1 FROM scenario_nodes WHERE node_key = 'night_three_clue' AND scenario_id = (SELECT id FROM scenarios WHERE slug = 'mystery-seventh-night'));

-- 节点7: 抉择时刻
INSERT INTO scenario_nodes (scenario_id, parent_id, node_key, title, body, mood, is_ending)
SELECT id, (SELECT id FROM scenario_nodes WHERE node_key = 'night_three_clue'), 'night_four_choice', '抉择时刻', '第四夜，死亡如期而至。这次是医生。

管家找到你，神色慌张："我们必须合作。你知道些什么，对吗？"

与此同时，神秘女子也找上你："别相信管家。他才是凶手。"

真相就在眼前，但危险也近在咫尺。

你要怎么做？', 'critical', 0
FROM scenarios WHERE slug = 'mystery-seventh-night'
AND NOT EXISTS (SELECT 1 FROM scenario_nodes WHERE node_key = 'night_four_choice' AND scenario_id = (SELECT id FROM scenarios WHERE slug = 'mystery-seventh-night'));

-- 节点8: 真相浮现
INSERT INTO scenario_nodes (scenario_id, parent_id, node_key, title, body, mood, is_ending)
SELECT id, (SELECT id FROM scenario_nodes WHERE node_key = 'night_four_choice'), 'night_five_revelation', '真相浮现', '你偷偷潜入管家的房间，发现了一本账簿——上面记录着多年来被带到这座庄园"消失"的人。

"白鹭仪式......需要七个灵魂......"

就在这时，你听到了脚步声。门被推开......

来人是谁？', 'danger', 0
FROM scenarios WHERE slug = 'mystery-seventh-night'
AND NOT EXISTS (SELECT 1 FROM scenario_nodes WHERE node_key = 'night_five_revelation' AND scenario_id = (SELECT id FROM scenarios WHERE slug = 'mystery-seventh-night'));

-- 节点9: 最终对峙
INSERT INTO scenario_nodes (scenario_id, parent_id, node_key, title, body, mood, is_ending)
SELECT id, (SELECT id FROM scenario_nodes WHERE node_key = 'night_five_revelation'), 'night_six_confrontation', '最终对峙', '神秘女子站在门口，但她的表情变了。

"我就知道你会来这里，"她轻声说，"你是唯一有机会阻止这一切的人。"

她递给你一把钥匙——和你找到的那把一模一样。

"我们是双胞胎，"她说出了一句改变一切的话，"而你忘记的那段记忆......是关于如何阻止第七夜仪式。"', 'dramatic', 0
FROM scenarios WHERE slug = 'mystery-seventh-night'
AND NOT EXISTS (SELECT 1 FROM scenario_nodes WHERE node_key = 'night_six_confrontation' AND scenario_id = (SELECT id FROM scenarios WHERE slug = 'mystery-seventh-night'));

-- 节点10: 第七夜
INSERT INTO scenario_nodes (scenario_id, parent_id, node_key, title, body, mood, is_ending)
SELECT id, (SELECT id FROM scenario_nodes WHERE node_key = 'night_six_confrontation'), 'night_seven_final', '第七夜', '今夜是第七夜，也是仪式之夜。

管家正站在祭坛前，周围环绕着六具尸体。"终于到齐了，"他笑着说，"七张牌，七个灵魂，永恒的......"

你必须做出选择。', 'final', 0
FROM scenarios WHERE slug = 'mystery-seventh-night'
AND NOT EXISTS (SELECT 1 FROM scenario_nodes WHERE node_key = 'night_seven_final' AND scenario_id = (SELECT id FROM scenarios WHERE slug = 'mystery-seventh-night'));

-- 节点11: 好结局 - 破晓
INSERT INTO scenario_nodes (scenario_id, parent_id, node_key, title, body, mood, is_ending, ending_type, ending_title)
SELECT id, (SELECT id FROM scenario_nodes WHERE node_key = 'night_seven_final'), 'ending_good', '破晓', '你按下手中钥匙的机关，一道金光射向管家。

"第七张牌......命运之轮！"你喊出日记最后一页的咒语。

管家的仪式被打断，他痛苦地倒下，化为灰烬。

当第一缕阳光照进庄园，一切如梦初醒。

你的记忆恢复了——你是来阻止这场仪式的调查员，而那位女子......是你的搭档。

"任务完成，"她笑着说，"欢迎回来。"

——好结局·破晓', 'redemption', 1, 'good', '破晓'
FROM scenarios WHERE slug = 'mystery-seventh-night'
AND NOT EXISTS (SELECT 1 FROM scenario_nodes WHERE node_key = 'ending_good' AND scenario_id = (SELECT id FROM scenarios WHERE slug = 'mystery-seventh-night'));

-- 节点12: 普通结局 - 轮回
INSERT INTO scenario_nodes (scenario_id, parent_id, node_key, title, body, mood, is_ending, ending_type, ending_title)
SELECT id, (SELECT id FROM scenario_nodes WHERE node_key = 'night_seven_final'), 'ending_normal', '轮回', '你选择了另一条路——试图独自逃跑。

但庄园的门紧紧关闭。你意识到，这里只有两种结局：阻止仪式，或者成为仪式的一部分。

当第七夜的钟声敲响，你成为了祭坛上的第七个灵魂。

或许，下一个失忆的调查员会来到这里，发现真相......

——普通结局·轮回', 'tragic', 1, 'normal', '轮回'
FROM scenarios WHERE slug = 'mystery-seventh-night'
AND NOT EXISTS (SELECT 1 FROM scenario_nodes WHERE node_key = 'ending_normal' AND scenario_id = (SELECT id FROM scenarios WHERE slug = 'mystery-seventh-night'));

-- 节点13: 坏结局 - 黑暗
INSERT INTO scenario_nodes (scenario_id, parent_id, node_key, title, body, mood, is_ending, ending_type, ending_title)
SELECT id, (SELECT id FROM scenario_nodes WHERE node_key = 'night_seven_final'), 'ending_bad', '黑暗', '你被管家抓住了。

"又一个完美的灵魂，"他笑着，"七夜仪式，终于完成了。"

你感到意识逐渐模糊，眼前的景象变得扭曲。

当你再次睁开眼睛，你已经成为了庄园的一部分——挂在墙上的第八幅肖像画。

第七夜已经结束，而庄园等待着下一个失忆的受害者。

——坏结局·黑暗', 'doom', 1, 'bad', '黑暗'
FROM scenarios WHERE slug = 'mystery-seventh-night'
AND NOT EXISTS (SELECT 1 FROM scenario_nodes WHERE node_key = 'ending_bad' AND scenario_id = (SELECT id FROM scenarios WHERE slug = 'mystery-seventh-night'));

-- 节点14: 真结局 - 永恒的守护者
INSERT INTO scenario_nodes (scenario_id, parent_id, node_key, title, body, mood, is_ending, ending_type, ending_title)
SELECT id, (SELECT id FROM scenario_nodes WHERE node_key = 'night_seven_final'), 'ending_true', '永恒的守护者', '你和双胞胎姐妹联手，不仅阻止了仪式，还解开了这座庄园百年的诅咒。

原来你们是白鹭家族的后裔，这座庄园曾是为守护人类免受黑暗力量侵害而建。但管家的祖先背叛了家族，将这里变成了献祭灵魂的魔窟。

你们姐妹联手，用血脉的力量将庄园彻底净化。

"从今以后，"姐姐说，"我们是这座庄园真正的主人。"

"而你，"妹妹看着你，笑着说，"会成为我们的守护者吗？"

当黎明到来，你发现自己站在阳光下，但记忆依然清晰——你知道真相，你也选择了新的使命。

——真结局·永恒的守护者', 'triumph', 1, 'true', '永恒的守护者'
FROM scenarios WHERE slug = 'mystery-seventh-night'
AND NOT EXISTS (SELECT 1 FROM scenario_nodes WHERE node_key = 'ending_true' AND scenario_id = (SELECT id FROM scenarios WHERE slug = 'mystery-seventh-night'));

-- 添加选项
-- 选项1: start -> investigate_lobby
INSERT INTO scenario_choices (node_id, label, target_node_id, sort_order)
SELECT n.id, '走出房间，去大厅看看', t.id, 0
FROM scenario_nodes n, scenario_nodes t
WHERE n.node_key = 'start' AND t.node_key = 'investigate_lobby'
AND n.scenario_id = (SELECT id FROM scenarios WHERE slug = 'mystery-seventh-night')
AND NOT EXISTS (SELECT 1 FROM scenario_choices WHERE node_id = n.id AND label = '走出房间，去大厅看看');

-- 选项2: investigate_lobby -> talk_butler
INSERT INTO scenario_choices (node_id, label, target_node_id, sort_order)
SELECT n.id, '向管家了解情况', t.id, 0
FROM scenario_nodes n, scenario_nodes t
WHERE n.node_key = 'investigate_lobby' AND t.node_key = 'talk_butler'
AND n.scenario_id = (SELECT id FROM scenarios WHERE slug = 'mystery-seventh-night')
AND NOT EXISTS (SELECT 1 FROM scenario_choices WHERE node_id = n.id AND label = '向管家了解情况');

-- 选项3: investigate_lobby -> investigate_piano_room
INSERT INTO scenario_choices (node_id, label, target_node_id, sort_order)
SELECT n.id, '去琴房调查', t.id, 1
FROM scenario_nodes n, scenario_nodes t
WHERE n.node_key = 'investigate_lobby' AND t.node_key = 'investigate_piano_room'
AND n.scenario_id = (SELECT id FROM scenarios WHERE slug = 'mystery-seventh-night')
AND NOT EXISTS (SELECT 1 FROM scenario_choices WHERE node_id = n.id AND label = '去琴房调查');

-- 选项4: talk_butler -> night_two
INSERT INTO scenario_choices (node_id, label, target_node_id, sort_order)
SELECT n.id, '赴约去书房', t.id, 0
FROM scenario_nodes n, scenario_nodes t
WHERE n.node_key = 'talk_butler' AND t.node_key = 'night_two'
AND n.scenario_id = (SELECT id FROM scenarios WHERE slug = 'mystery-seventh-night')
AND NOT EXISTS (SELECT 1 FROM scenario_choices WHERE node_id = n.id AND label = '赴约去书房');

-- 选项5: talk_butler -> investigate_piano_room
INSERT INTO scenario_choices (node_id, label, target_node_id, sort_order)
SELECT n.id, '觉得可疑，先去调查其他人', t.id, 1
FROM scenario_nodes n, scenario_nodes t
WHERE n.node_key = 'talk_butler' AND t.node_key = 'investigate_piano_room'
AND n.scenario_id = (SELECT id FROM scenarios WHERE slug = 'mystery-seventh-night')
AND NOT EXISTS (SELECT 1 FROM scenario_choices WHERE node_id = n.id AND label = '觉得可疑，先去调查其他人');

-- 选项6: investigate_piano_room -> night_three_clue
INSERT INTO scenario_choices (node_id, label, target_node_id, sort_order)
SELECT n.id, '深入调查这把钥匙的来历', t.id, 0
FROM scenario_nodes n, scenario_nodes t
WHERE n.node_key = 'investigate_piano_room' AND t.node_key = 'night_three_clue'
AND n.scenario_id = (SELECT id FROM scenarios WHERE slug = 'mystery-seventh-night')
AND NOT EXISTS (SELECT 1 FROM scenario_choices WHERE node_id = n.id AND label = '深入调查这把钥匙的来历');

-- 选项7: investigate_piano_room -> night_two
INSERT INTO scenario_choices (node_id, label, target_node_id, sort_order)
SELECT n.id, '把这个发现告诉其他人', t.id, 1
FROM scenario_nodes n, scenario_nodes t
WHERE n.node_key = 'investigate_piano_room' AND t.node_key = 'night_two'
AND n.scenario_id = (SELECT id FROM scenarios WHERE slug = 'mystery-seventh-night')
AND NOT EXISTS (SELECT 1 FROM scenario_choices WHERE node_id = n.id AND label = '把这个发现告诉其他人');

-- 选项8: night_two -> night_four_choice
INSERT INTO scenario_choices (node_id, label, target_node_id, sort_order)
SELECT n.id, '尝试与管家合作', t.id, 0
FROM scenario_nodes n, scenario_nodes t
WHERE n.node_key = 'night_two' AND t.node_key = 'night_four_choice'
AND n.scenario_id = (SELECT id FROM scenarios WHERE slug = 'mystery-seventh-night')
AND NOT EXISTS (SELECT 1 FROM scenario_choices WHERE node_id = n.id AND label = '尝试与管家合作');

-- 选项9: night_two -> night_three_clue
INSERT INTO scenario_choices (node_id, label, target_node_id, sort_order)
SELECT n.id, '独自调查', t.id, 1
FROM scenario_nodes n, scenario_nodes t
WHERE n.node_key = 'night_two' AND t.node_key = 'night_three_clue'
AND n.scenario_id = (SELECT id FROM scenarios WHERE slug = 'mystery-seventh-night')
AND NOT EXISTS (SELECT 1 FROM scenario_choices WHERE node_id = n.id AND label = '独自调查');

-- 选项10: night_three_clue -> night_four_choice
INSERT INTO scenario_choices (node_id, label, target_node_id, sort_order)
SELECT n.id, '相信管家，联手调查', t.id, 0
FROM scenario_nodes n, scenario_nodes t
WHERE n.node_key = 'night_three_clue' AND t.node_key = 'night_four_choice'
AND n.scenario_id = (SELECT id FROM scenarios WHERE slug = 'mystery-seventh-night')
AND NOT EXISTS (SELECT 1 FROM scenario_choices WHERE node_id = n.id AND label = '相信管家，联手调查');

-- 选项11: night_three_clue -> night_five_revelation
INSERT INTO scenario_choices (node_id, label, target_node_id, sort_order)
SELECT n.id, '去找神秘女子对质', t.id, 1
FROM scenario_nodes n, scenario_nodes t
WHERE n.node_key = 'night_three_clue' AND t.node_key = 'night_five_revelation'
AND n.scenario_id = (SELECT id FROM scenarios WHERE slug = 'mystery-seventh-night')
AND NOT EXISTS (SELECT 1 FROM scenario_choices WHERE node_id = n.id AND label = '去找神秘女子对质');

-- 选项12: night_four_choice -> night_five_revelation
INSERT INTO scenario_choices (node_id, label, target_node_id, sort_order)
SELECT n.id, '先去管家房间查看', t.id, 0
FROM scenario_nodes n, scenario_nodes t
WHERE n.node_key = 'night_four_choice' AND t.node_key = 'night_five_revelation'
AND n.scenario_id = (SELECT id FROM scenarios WHERE slug = 'mystery-seventh-night')
AND NOT EXISTS (SELECT 1 FROM scenario_choices WHERE node_id = n.id AND label = '先去管家房间查看');

-- 选项13: night_four_choice -> night_six_confrontation
INSERT INTO scenario_choices (node_id, label, target_node_id, sort_order)
SELECT n.id, '相信神秘女子', t.id, 1
FROM scenario_nodes n, scenario_nodes t
WHERE n.node_key = 'night_four_choice' AND t.node_key = 'night_six_confrontation'
AND n.scenario_id = (SELECT id FROM scenarios WHERE slug = 'mystery-seventh-night')
AND NOT EXISTS (SELECT 1 FROM scenario_choices WHERE node_id = n.id AND label = '相信神秘女子');

-- 选项14: night_five_revelation -> night_six_confrontation
INSERT INTO scenario_choices (node_id, label, target_node_id, sort_order)
SELECT n.id, '原来如此......联手吧', t.id, 0
FROM scenario_nodes n, scenario_nodes t
WHERE n.node_key = 'night_five_revelation' AND t.node_key = 'night_six_confrontation'
AND n.scenario_id = (SELECT id FROM scenarios WHERE slug = 'mystery-seventh-night')
AND NOT EXISTS (SELECT 1 FROM scenario_choices WHERE node_id = n.id AND label = '原来如此......联手吧');

-- 选项15: night_six_confrontation -> night_seven_final
INSERT INTO scenario_choices (node_id, label, target_node_id, sort_order)
SELECT n.id, '接受真相，准备最终对决', t.id, 0
FROM scenario_nodes n, scenario_nodes t
WHERE n.node_key = 'night_six_confrontation' AND t.node_key = 'night_seven_final'
AND n.scenario_id = (SELECT id FROM scenarios WHERE slug = 'mystery-seventh-night')
AND NOT EXISTS (SELECT 1 FROM scenario_choices WHERE node_id = n.id AND label = '接受真相，准备最终对决');

-- 选项16: night_seven_final -> ending_good
INSERT INTO scenario_choices (node_id, label, target_node_id, sort_order)
SELECT n.id, '使用命运之轮的咒语', t.id, 0
FROM scenario_nodes n, scenario_nodes t
WHERE n.node_key = 'night_seven_final' AND t.node_key = 'ending_good'
AND n.scenario_id = (SELECT id FROM scenarios WHERE slug = 'mystery-seventh-night')
AND NOT EXISTS (SELECT 1 FROM scenario_choices WHERE node_id = n.id AND label = '使用命运之轮的咒语');

-- 选项17: night_seven_final -> ending_normal
INSERT INTO scenario_choices (node_id, label, target_node_id, sort_order)
SELECT n.id, '试图逃跑', t.id, 1
FROM scenario_nodes n, scenario_nodes t
WHERE n.node_key = 'night_seven_final' AND t.node_key = 'ending_normal'
AND n.scenario_id = (SELECT id FROM scenarios WHERE slug = 'mystery-seventh-night')
AND NOT EXISTS (SELECT 1 FROM scenario_choices WHERE node_id = n.id AND label = '试图逃跑');

-- 选项18: night_seven_final -> ending_bad
INSERT INTO scenario_choices (node_id, label, target_node_id, sort_order)
SELECT n.id, '正面对抗管家', t.id, 2
FROM scenario_nodes n, scenario_nodes t
WHERE n.node_key = 'night_seven_final' AND t.node_key = 'ending_bad'
AND n.scenario_id = (SELECT id FROM scenarios WHERE slug = 'mystery-seventh-night')
AND NOT EXISTS (SELECT 1 FROM scenario_choices WHERE node_id = n.id AND label = '正面对抗管家');

-- 选项19: night_seven_final -> ending_true
INSERT INTO scenario_choices (node_id, label, target_node_id, sort_order)
SELECT n.id, '与双胞胎姐妹联手', t.id, 3
FROM scenario_nodes n, scenario_nodes t
WHERE n.node_key = 'night_seven_final' AND t.node_key = 'ending_true'
AND n.scenario_id = (SELECT id FROM scenarios WHERE slug = 'mystery-seventh-night')
AND NOT EXISTS (SELECT 1 FROM scenario_choices WHERE node_id = n.id AND label = '与双胞胎姐妹联手');
