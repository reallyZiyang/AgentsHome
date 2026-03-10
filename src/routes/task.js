const express = require('express');
const router = express.Router();
const { getTasks, getTaskById, updateTask, createTask } = require('../models/task');

// 获取任务列表
router.get('/', (req, res) => {
    try {
        const { status, complexity } = req.query;
        const tasks = getTasks({ status, complexity });
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 获取单个任务
router.get('/:id', (req, res) => {
    try {
        const task = getTaskById(req.params.id);
        if (!task) {
            return res.status(404).json({ error: '任务不存在' });
        }
        res.json(task);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 创建任务
router.post('/', (req, res) => {
    try {
        const { title, description, complexity, priority } = req.body;
        
        if (!title) {
            return res.status(400).json({ error: '缺少任务标题' });
        }
        
        const id = createTask({ title, description, complexity, priority });
        res.json({ success: true, taskId: id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 任务状态更新 (Agent调用)
router.post('/:id/status', (req, res) => {
    try {
        const { status, result, agentId } = req.body;
        const task = getTaskById(req.params.id);
        
        if (!task) {
            return res.status(404).json({ error: '任务不存在' });
        }
        
        // 验证Agent权限
        if (task.assignedAgent !== agentId) {
            return res.status(403).json({ error: '无权限更新此任务' });
        }
        
        const updates = { status };
        
        if (result) {
            updates.result = JSON.stringify(result);
        }
        
        if (status === 'completed' || status === 'failed') {
            updates.completedAt = Math.floor(Date.now() / 1000);
        }
        
        updateTask(req.params.id, updates);
        
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 重试任务
router.post('/:id/retry', (req, res) => {
    try {
        const task = getTaskById(req.params.id);
        
        if (!task) {
            return res.status(404).json({ error: '任务不存在' });
        }
        
        if (task.status !== 'failed') {
            return res.status(400).json({ error: '只有失败的任务可以重试' });
        }
        
        // 增加重试次数
        const retries = (task.retries || 0) + 1;
        
        updateTask(req.params.id, {
            status: 'pending',
            retries,
            assignedAgent: null,
            startedAt: null,
            completedAt: null,
            result: null
        });
        
        res.json({ success: true, retries });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
