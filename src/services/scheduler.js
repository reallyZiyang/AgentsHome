const { getTasks, updateTask } = require('../models/task');
const { getAgents } = require('../models/agent');

// 复杂度匹配规则
const COMPLEXITY_MATCH = {
    'simple': ['simple', 'medium', 'complex'],
    'medium': ['medium', 'complex'],
    'complex': ['complex']
};

function findBestAgent(taskComplexity) {
    // 获取所有在线Agent
    const agents = getAgents({ status: 'online' });
    
    // 获取该复杂度可以使用的Agent能力列表
    const allowedCapabilities = COMPLEXITY_MATCH[taskComplexity] || ['medium'];
    
    // 过滤出符合能力的Agent
    const suitableAgents = agents.filter(agent => {
        const caps = agent.capabilities || [];
        return allowedCapabilities.some(cap => caps.includes(cap));
    });
    
    // 返回第一个匹配的Agent
    return suitableAgents.length > 0 ? suitableAgents[0] : null;
}

function scheduleTask(task) {
    const bestAgent = findBestAgent(task.complexity);
    
    if (!bestAgent) {
        console.log(`任务 ${task.id} 没有可用的Agent`);
        return null;
    }
    
    // 分配任务
    updateTask(task.id, {
        status: 'assigned',
        assignedAgent: bestAgent.id,
        startedAt: Math.floor(Date.now() / 1000)
    });
    
    console.log(`任务 ${task.id} 已分配给 Agent ${bestAgent.id}`);
    return bestAgent;
}

function scanAndSchedule() {
    // 获取所有pending任务
    const pendingTasks = getTasks({ status: 'pending' });
    
    console.log(`扫描到 ${pendingTasks.length} 个pending任务`);
    
    for (const task of pendingTasks) {
        // 跳过已经被分配的任务
        if (task.assignedAgent) continue;
        
        scheduleTask(task);
    }
}

// 启动调度器
function startScheduler(intervalMs = 5000) {
    // 立即执行一次
    scanAndSchedule();
    
    // 定时执行
    setInterval(scanAndSchedule, intervalMs);
    
    console.log('任务调度器已启动');
}

module.exports = { startScheduler, scanAndSchedule, scheduleTask };
