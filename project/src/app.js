const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('../config.json');

const app = express();

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// 基础路由
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
});

// API 路由
const agentRoutes = require('./routes/agent');
app.use('/api/agents', agentRoutes);

// 根据配置选择调度器
const USE_GIT_SCHEDULER = process.env.USE_GIT_SCHEDULER === 'true';

if (USE_GIT_SCHEDULER) {
    // Git 任务清单调度器 (无需数据库)
    console.log('使用 Git 任务清单调度器');
    const { startScheduler, getTasks, getTaskById, updateTaskStatus, TASK_STATUS } = require('./services/git-scheduler');
    
    // 任务 API (读写 Git 文件)
    app.get('/api/tasks', (req, res) => {
        const { status, complexity } = req.query;
        const tasks = getTasks({ status, complexity });
        res.json(tasks);
    });
    
    app.get('/api/tasks/:id', (req, res) => {
        const task = getTaskById(req.params.id);
        if (!task) return res.status(404).json({ error: '任务不存在' });
        res.json(task);
    });
    
    app.post('/api/tasks', (req, res) => {
        res.json({ message: 'Git 模式下请直接编辑 tasks/ 目录下的 JSON 文件' });
    });
    
    app.post('/api/tasks/:id/status', (req, res) => {
        const { status, result, agentId } = req.body;
        const task = getTaskById(req.params.id);
        if (!task) return res.status(404).json({ error: '任务不存在' });
        
        const updates = { status };
        if (result) updates.result = JSON.stringify(result);
        if (status === 'completed' || status === 'failed') {
            updates.completedAt = Date.now();
        }
        
        updateTaskStatus(req.params.id, updates);
        res.json({ success: true });
    });
    
    // 启动 Git 调度器
    startScheduler(5000);
    
} else {
    // 数据库调度器 (原有)
    const { initDatabase } = require('./models/db');
    
    const taskRoutes = require('./routes/task');
    app.use('/api/tasks', taskRoutes);
    
    async function startServer() {
        await initDatabase();
        console.log('数据库初始化完成');
        
        // 启动心跳检查
        const { startHeartbeatCheck } = require('./services/heartbeat');
        startHeartbeatCheck();
        
        // 启动数据库调度器
        const { startScheduler } = require('./services/scheduler');
        startScheduler(5000);
        
        const PORT = config.server.port || 3000;
        app.listen(PORT, () => {
            console.log(`服务器运行在 http://localhost:${PORT}`);
        });
    }
    
    startServer();
}

const PORT = config.server.port || 3000;
app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
});

module.exports = app;
