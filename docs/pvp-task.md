# 当前任务

## 本轮目标

本轮只做 PVPBreakpointPanel 的技能选择与预设逻辑微调。

不要改首页。
不要改详情页。
不要重做精灵选择器。
不要做 620 build 概率计算。
不要把技能详情展开在列表里。
不要改图鉴页面、精灵详细页面、阵容编辑页面和其他已有业务页面。
如果后面要继续做新功能，优先新建页面，不要拿旧页面直接改造。

## 任务 1：技能详情改成小窗口

当前技能列表不能内联展开描述。

要求：
- 点击技能主体：选择技能
- 点击详情按钮：打开小窗口
- 小窗口显示完整技能描述、能耗、来源、机制标签
- 阻止详情按钮点击事件冒泡

## 任务 2：谁打我模式显示多技能结果

在“谁打我”模式中，选择敌方精灵后：

默认展示敌方所有 effectivePower >= 80 的输出技能对我方造成的伤害。

每个技能显示：
- 技能名
- 属性
- 类型
- 威力
- 有效威力
- 能耗
- 受到伤害 / 自身生命 / 百分比 / 剩余或溢出

增加开关：
- 只看常见威力技能
- 显示全部输出技能

## 任务 3：commonSkillPresets.json

新增或完善：

src/data/pvp/commonSkillPresets.json

结构：

{
  "default": {
    "minEffectivePower": 80,
    "maxDisplaySkills": 8,
    "sortBy": ["effectivePower", "stab", "consume"]
  },
  "petOverrides": {
    "火神": {
      "preferredSkills": ["火云车", "火焰切割"],
      "minEffectivePower": 80
    }
  }
}

注意：
commonSkillPresets 只影响排序和默认显示，不改变计算公式。
preferredSkills 只用于排序置顶，不改变计算公式。

## 任务 4：迅捷和先手规则确认

确认：
- 迅捷不计入 priority
- 先比较 priority
- priority 相同再比较速度
- 双方都先手+1时比较速度

## 完成后回复

完成后必须说明：
1. 修改了哪些文件
2. 技能详情是否改成弹窗
3. 谁打我模式是否能显示 effectivePower >= 80 的技能
4. commonSkillPresets.json 是否创建
5. 迅捷是否没有被当成先手
6. 怎么测试
