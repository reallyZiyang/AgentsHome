# TASK_GUIDE.md - 任务执行规范

## 执行流程

1. **读取任务 JSON** - 从 `tasks/` 目录读取当前任务
2. **理解需求** - 明确验收标准
3. **最小实现** - 只写必要代码
4. **浏览器验证** - 打开页面截图确认，触发交互测试
5. **Git 提交** - 先项目后任务清单
6. **更新状态** - JSON 改为 completed

---

## 任务结构 (JSON)

```json
{
  "id": "T-001",
  "title": "任务标题",
  "description": "详细描述",
  "complexity": "simple|medium|complex",
  "metrics": {
    "codeLines": 100,
    "dependencies": 2,
    "interactions": 2,
    "states": 1
  },
  "priority": 5,
  "dependencies": [],
  "acceptanceCriteria": ["标准1", "标准2"],
  "status": "pending|in-progress|completed|blocked"
}
```

---

## 状态流转

```
pending → in-progress → completed
         ↓ (阻塞)
       blocked
```

---

## Git 提交规范

```bash
# 项目代码
cd {工作区}/project
git add .
git commit -m "feat(T-001): 完成xxx"

# 任务清单
cd {工作区}
git add tasks/
git commit -m "chore(T-001): 更新任务状态"
```

---

## 验收检查

每个任务完成后：
1. 浏览器打开页面
2. 截图验证 UI
3. 触发交互测试
4. 对照 acceptanceCriteria 逐项确认
