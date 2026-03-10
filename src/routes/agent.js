const express = require('express');
const router = express.Router();
const { registerAgent, getAgents, heartbeat, updateAgentStatus } = require('../models/agent');

// 注册 Agent
router.post('/register', (req, res) => {
    try {
        console.log('Register request body:', req.body);
        const { id, name, model, params, context, capabilities } = req.body;
        
        if (!id || !name) {
            return res.status(400).json({ error: '缺少必要字段' });
        }
        
        const result = registerAgent({ id, name, model, params, context, capabilities });
        console.log('Agent registered:', result);
        res.json({ success: true, agentId: result });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 获取 Agent 列表
router.get('/', (req, res) => {
    try {
        const { status } = req.query;
        const agents = getAgents({ status });
        
        // 解析 capabilities
        const result = agents.map(a => ({
            ...a,
            capabilities: JSON.parse(a.capabilities || '[]')
        }));
        
        res.json(result);
    } catch (error) {
        console.error('Get agents error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 心跳
router.post('/heartbeat', (req, res) => {
    try {
        const { id } = req.body;
        
        if (!id) {
            return res.status(400).json({ error: '缺少Agent ID' });
        }
        
        heartbeat(id);
        res.json({ success: true });
    } catch (error) {
        console.error('Heartbeat error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
