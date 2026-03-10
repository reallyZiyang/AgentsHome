# TASK_GUIDE.md - 任务执行规范

## 执行流程

1. **读取任务 JSON** - 从 `tasks/scheduler/` 目录读取当前任务
2. **理解需求** - 明确验收标准
3. **最小实现** - 只写必要代码
4. **浏览器验证** - 打开页面截图确认，触发交互测试
5. **提交** - 每任务一提交

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
    "interactions": 3,
    "states": 2
  },
  "dependencies": [],
  "acceptanceCriteria": ["标准1", "标准2"],
  "status": "pending|in-progress|completed"
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

## 阻塞处理

遇到阻塞时：
1. 记录阻塞原因
2. 升级报告
3. 继续处理其他可执行任务

---

## 提交规范

```
feat(T-001): 完成模块开发

- 实现功能A
- 实现功能B
- 验收: 功能正常
```

---

## 验收检查

每个任务完成后：
1. 浏览器打开页面
2. 截图验证 UI
3. 触发交互测试
4. 对照 acceptanceCriteria 逐项确认
