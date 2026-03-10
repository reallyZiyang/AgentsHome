const { getAgents, updateAgentStatus } = require('../models/agent');

const HEARTBEAT_TIMEOUT = 30; // 30秒超时

function startHeartbeatCheck() {
    setInterval(() => {
        const agents = getAgents({ status: 'online' });
        const now = Math.floor(Date.now() / 1000);
        
        for (const agent of agents) {
            const lastHeartbeat = agent.lastHeartbeat || 0;
            if (now - lastHeartbeat > HEARTBEAT_TIMEOUT) {
                console.log(`Agent ${agent.id} 超时离线`);
                updateAgentStatus(agent.id, 'offline');
            }
        }
    }, 5000); // 每5秒检查一次
    
    console.log('心跳检查服务已启动');
}

module.exports = { startHeartbeatCheck };
