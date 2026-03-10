// Git任务清单调度器
// 直接从 Git 任务清单读取，不使用数据库

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 配置
const CONFIG = {
    workspacePath: process.env.WORKSPACE_PATH || path.join(__dirname, '../..'),
    tasksDir: 'tasks',
    pollInterval: 5000,     // 5秒扫描一次
    maxRetries: 3,          // 最大重试次数
    retryDelay: 30000       // 重试延迟
};

// 复杂度匹配
const COMPLEXITY_MATCH = {
    'simple': ['simple', 'medium', 'complex'],
    'medium': ['medium', 'complex'],
    'complex': ['complex']
};

// 任务状态枚举
const TASK_STATUS = {
    PENDING: 'pending',
    ASSIGNED: 'assigned',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    FAILED: 'failed'
};

// 任务缓存 (内存)
let taskCache = new Map();

// 扫描所有任务文件
function scanTaskFiles() {
    const tasks = [];
    const tasksPath = path.join(CONFIG.workspacePath, CONFIG.tasksDir);
    
    if (!fs.existsSync(tasksPath)) {
        console.log('任务目录不存在:', tasksPath);
        return tasks;
    }
    
    function scanDir(dir) {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                scanDir(fullPath);
            } else if (file.endsWith('.json')) {
                try {
                    const content = fs.readFileSync(fullPath, 'utf8');
                    const task = JSON.parse(content);
                    taskCache.set(task.id, { ...task, _filePath: fullPath });
                    tasks.push(task);
                } catch (e) {
                    console.error('读取任务文件失败:', fullPath, e.message);
                }
            }
        }
    }
    
    scanDir(tasksPath);
    return tasks;
}

// 获取任务列表
function getTasks(filter = {}) {
    const tasks = scanTaskFiles();
    
    return tasks.filter(task => {
        if (filter.status && task.status !== filter.status) return false;
        if (filter.complexity && task.complexity !== filter.complexity) return false;
        return true;
    });
}

// 获取单个任务
function getTaskById(id) {
    scanTaskFiles(); // 刷新缓存
    return taskCache.get(id);
}

// 更新任务状态
function updateTaskStatus(taskId, updates) {
    const task = taskCache.get(taskId);
    if (!task) {
        console.log('任务不存在:', taskId);
        return false;
    }
    
    const taskPath = task._filePath;
    
    // 合并更新
    const updatedTask = { ...task, ...updates };
    
    // 移除内部字段
    delete updatedTask._filePath;
    
    // 写回文件
    fs.writeFileSync(taskPath, JSON.stringify(updatedTask, null, 2), 'utf8');
    
    // 更新缓存
    taskCache.set(taskId, { ...updatedTask, _filePath: taskPath });
    
    // Git 提交
    try {
        execSync(`git add "${taskPath}" && git commit -m "chore(${taskId}): 更新状态为 ${updates.status}"`, {
            cwd: CONFIG.workspacePath,
            stdio: 'pipe'
        });
        console.log('Git 提交成功:', taskId, updates.status);
    } catch (e) {
        // 忽略提交失败（可能没有变更）
    }
    
    return true;
}

// 获取 Agent 当前负载
function getAgentLoad(agentId) {
    const tasks = getTasks({ status: TASK_STATUS.ASSIGNED });
    return tasks.filter(t => t.assignedAgent === agentId).length;
}

// 查找最佳 Agent
function findBestAgent(taskComplexity) {
    const { getAgents } = require('../models/agent');
    const agents = getAgents({ status: 'online' });
    
    const allowedCapabilities = COMPLEXITY_MATCH[taskComplexity] || ['medium'];
    
    let suitableAgents = agents.filter(agent => {
        const caps = typeof agent.capabilities === 'string' 
            ? JSON.parse(agent.capabilities) 
            : agent.capabilities || [];
        return allowedCapabilities.some(cap => caps.includes(cap));
    });
    
    if (suitableAgents.length === 0) return null;
    
    // 负载均衡
    suitableAgents = suitableAgents.map(agent => ({
        ...agent,
        load: getAgentLoad(agent.id)
    })).sort((a, b) => a.load - b.load);
    
    return suitableAgents[0];
}

// 处理失败重试
function handleRetries() {
    const failedTasks = getTasks({ status: TASK_STATUS.FAILED });
    const now = Date.now();
    
    for (const task of failedTasks) {
        const retries = task.retries || 0;
        
        if (retries >= CONFIG.maxRetries) {
            console.log(`任务 ${task.id} 已达最大重试次数`);
            continue;
        }
        
        // 检查重试冷却
        const lastAttempt = task.completedAt || 0;
        if (now - lastAttempt < CONFIG.retryDelay) {
            continue;
        }
        
        // 重试
        updateTaskStatus(task.id, {
            status: TASK_STATUS.PENDING,
            retries: retries + 1,
            assignedAgent: null,
            startedAt: null,
            completedAt: null
        });
        
        console.log(`任务 ${task.id} 重新入队 (第${retries + 1}次)`);
    }
}

// 调度主循环
function scanAndSchedule() {
    handleRetries();
    
    // 按优先级排序
    let pendingTasks = getTasks({ status: TASK_STATUS.PENDING });
    pendingTasks = pendingTasks.sort((a, b) => {
        if ((b.priority || 0) !== (a.priority || 0)) {
            return (b.priority || 0) - (a.priority || 0);
        }
        return (a.createdAt || 0) - (b.createdAt || 0);
    });
    
    console.log(`扫描到 ${pendingTasks.length} 个 pending 任务`);
    
    for (const task of pendingTasks) {
        if (task.assignedAgent) continue;
        
        const bestAgent = findBestAgent(task.complexity || 'medium');
        
        if (!bestAgent) {
            console.log(`任务 ${task.id} 没有可用 Agent`);
            continue;
        }
        
        updateTaskStatus(task.id, {
            status: TASK_STATUS.ASSIGNED,
            assignedAgent: bestAgent.id,
            startedAt: Date.now()
        });
        
        console.log(`任务 ${task.id} 已分配给 ${bestAgent.id} (负载: ${bestAgent.load})`);
    }
}

// 启动调度器
function startScheduler(intervalMs = CONFIG.pollInterval) {
    console.log('=== Git 任务清单调度器启动 ===');
    console.log('工作区:', CONFIG.workspacePath);
    console.log('任务目录:', CONFIG.tasksDir);
    
    scanAndSchedule();
    setInterval(scanAndSchedule, intervalMs);
    
    console.log('调度器运行中...');
}

module.exports = { 
    startScheduler, 
    scanAndSchedule, 
    getTasks, 
    getTaskById, 
    updateTaskStatus,
    TASK_STATUS
};
