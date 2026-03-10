const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('../config.json');
const { initDatabase } = require('./models/db');

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

// 启动服务器
async function startServer() {
    try {
        await initDatabase();
        console.log('数据库初始化完成');
        
        // 启动心跳检查
        const { startHeartbeatCheck } = require('./services/heartbeat');
        startHeartbeatCheck();
        
        const PORT = config.server.port || 3000;
        app.listen(PORT, () => {
            console.log(`服务器运行在 http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('启动失败:', error);
        process.exit(1);
    }
}

startServer();

module.exports = app;
