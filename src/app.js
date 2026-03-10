const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('../config.json');
const { initDB } = require('./db');

const app = express();

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// 基础路由
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
});

// 启动服务器
async function startServer() {
    try {
        await initDB();
        console.log('数据库初始化完成');
        
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
