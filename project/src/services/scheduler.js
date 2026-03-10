const { getTasks, updateTask } = require('../models/task');
const { getAgents } = require('../models/agent');

// 复杂度匹配规则
const COMPLEXITY_MATCH = {
    'simple': ['simple', 'medium', 'complex'],
    'medium': ['medium', 'complex'],
    'complex': ['complex']
};

// 配置
const CONFIG = {
    maxRetries: 3,           // 最大重试次数
    retryDelay: 30000,      // 重试延迟(毫秒)
    loadCheckInterval: 5000  // 负载检查间隔
};

// 获取 Agent 当前负载
function getAgentLoad(agentId) {
    const tasks = getTasks({ status: 'assigned' });
    return tasks.filter(t => t.assignedAgent === agentId).length;
}

function findBestAgent(taskComplexity) {
    // 获取所有在线 Agent
    const agents = getAgents({ status: 'online' });
    
    // 获取该复杂度可以使用的 Agent 能力列表
    const allowedCapabilities = COMPLEXITY_MATCH[taskComplexity] || ['medium'];
    
    // 过滤出符合能力的 Agent
    let suitableAgents = agents.filter(agent => {
        const caps = typeof agent.capabilities === 'string' 
            ? JSON.parse(agent.capabilities) 
            : agent.capabilities || [];
        return allowedCapabilities.some(cap => caps.includes(cap));
    });
    
    if (suitableAgents.length === 0) {
        return null;
    }
    
    // 负载均衡：选择负载最低的 Agent
    suitableAgents = suitableAgents.map(agent => ({
        ...agent,
        load: getAgentLoad(agent.id)
    })).sort((a, b) => a.load - b.load);
    
    return suitableAgents[0];
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
    
    console.log(`任务 ${task.id} 已分配给 Agent ${bestAgent.id} (负载: ${bestAgent.load})`);
    return bestAgent;
}

function handleRetries() {
    // 处理失败任务的重试
    const failedTasks = getTasks({ status: 'failed' });
    const now = Math.floor(Date.now() / 1000);
    
    for (const task of failedTasks) {
        const retries = task.retries || 0;
        
        if (retries >= CONFIG.maxRetries) {
            console.log(`任务 ${task.id} 已达到最大重试次数(${CONFIG.maxRetries})，不再重试`);
            continue;
        }
        
        // 检查是否在重试冷却期
        const lastAttempt = task.completedAt || 0;
        if (now - lastAttempt < CONFIG.retryDelay / 1000) {
            continue;
        }
        
        // 重试任务
        updateTask(task.id, {
            status: 'pending',
            retries: retries + 1,
            assignedAgent: null,
            startedAt: null,
            completedAt: null
        });
        
        console.log(`任务 ${task.id} 重新入队重试 (第${retries + 1}次)`);
    }
}

function scanAndSchedule() {
    // 处理重试
    handleRetries();
    
    // 获取所有 pending 任务，按优先级排序
    let pendingTasks = getTasks({ status: 'pending' });
    
    // 按优先级(降序)和创建时间(升序)排序
    pendingTasks = pendingTasks.sort((a, b) => {
        if (b.priority !== a.priority) {
            return (b.priority || 0) - (a.priority || 0); // 优先级高的在前
        }
        return (a.createdAt || 0) - (b.createdAt || 0); // 创建早的在前
    });
    
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
    
    console.log('任务调度器已启动 (优先级+自动重试+负载均衡)');
}

module.exports = { startScheduler, scanAndSchedule, scheduleTask };
