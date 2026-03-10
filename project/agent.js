// Agent 端脚本
// 运行在其他机器上，自动拉取任务、执行、回调

const http = require('http');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// 配置
const CONFIG = {
    schedulerUrl: process.env.SCHEDULER_URL || 'http://localhost:3000',
    agentId: process.env.AGENT_ID || 'agent-' + Math.random().toString(36).substr(2, 9),
    agentName: process.env.AGENT_NAME || 'Local Agent',
    model: process.env.MODEL || 'qwen2.5-7b',
    params: parseInt(process.env.PARAMS || '7'),
    context: parseInt(process.env.CONTEXT || '32'),
    capabilities: (process.env.CAPABILITIES || 'simple,medium').split(','),
    pollInterval: parseInt(process.env.POLL_INTERVAL || '5000'), // 5秒拉取一次
    heartbeatInterval: parseInt(process.env.HEARTBEAT_INTERVAL || '10000'), // 10秒心跳一次
    workspacePath: process.env.WORKSPACE_PATH || path.join(__dirname, '..'), // 工作区路径
};

console.log('=== Agent 启动配置 ===');
console.log('调度中心:', CONFIG.schedulerUrl);
console.log('Agent ID:', CONFIG.agentId);
console.log('Agent Name:', CONFIG.agentName);
console.log('模型:', CONFIG.model);
console.log('能力:', CONFIG.capabilities.join(', '));
console.log('========================');

// HTTP 请求辅助函数
function request(method, path, data = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, CONFIG.schedulerUrl);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
            method: method,
            headers: { 'Content-Type': 'application/json' }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch {
                    resolve(body);
                }
            });
        });

        req.on('error', reject);
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

// 1. 注册 Agent
async function registerAgent() {
    console.log('📝 注册 Agent...');
    try {
        await request('POST', '/api/agents/register', {
            id: CONFIG.agentId,
            name: CONFIG.agentName,
            model: CONFIG.model,
            params: CONFIG.params,
            context: CONFIG.context,
            capabilities: CONFIG.capabilities
        });
        console.log('✅ Agent 注册成功');
    } catch (e) {
        console.error('❌ Agent 注册失败:', e.message);
    }
}

// 2. 心跳
async function heartbeat() {
    try {
        await request('POST', '/api/agents/heartbeat', { id: CONFIG.agentId });
    } catch (e) {
        console.error('❌ 心跳失败:', e.message);
    }
}

// 3. 拉取任务
async function fetchTask() {
    try {
        const tasks = await request('GET', '/api/tasks?status=assigned');
        
        // 找分配给自己的任务
        const myTask = tasks.find(t => t.assignedAgent === CONFIG.agentId);
        
        if (myTask) {
            console.log(`📋 收到任务: ${myTask.title} (${myTask.id})`);
            await executeTask(myTask);
        }
    } catch (e) {
        console.error('❌ 拉取任务失败:', e.message);
    }
}

// 4. 执行任务
async function executeTask(task) {
    console.log(`🔄 执行任务: ${task.title}`);
    
    try {
        // TODO: 根据任务类型执行不同的逻辑
        // 这里模拟执行
        const result = await simulateExecution(task);
        
        // 5. 完成任务回调
        await completeTask(task.id, 'completed', result);
        console.log(`✅ 任务完成: ${task.title}`);
        
    } catch (e) {
        console.error(`❌ 任务执行失败: ${e.message}`);
        await completeTask(task.id, 'failed', { error: e.message });
    }
}

// 模拟任务执行
function simulateExecution(task) {
    return new Promise((resolve) => {
        // 模拟执行时间 1-3 秒
        const delay = 1000 + Math.random() * 2000;
        setTimeout(() => {
            resolve({
                output: `任务 "${task.title}" 执行完成`,
                timestamp: Date.now(),
                agent: CONFIG.agentId
            });
        }, delay);
    });
}

// 6. 完成任务回调
async function completeTask(taskId, status, result) {
    try {
        // 回调调度中心
        await request('POST', `/api/tasks/${taskId}/status`, {
            status: status,
            result: result,
            agentId: CONFIG.agentId
        });
        
        // 更新 Git 任务清单状态
        await updateGitTaskStatus(taskId, status);
        
    } catch (e) {
        console.error('❌ 完成任务回调失败:', e.message);
    }
}

// 更新 Git 任务清单状态
async function updateGitTaskStatus(taskId, status) {
    const taskPath = path.join(CONFIG.workspacePath, 'tasks');
    
    // 查找任务 JSON 文件
    if (!fs.existsSync(taskPath)) {
        console.log('任务清单目录不存在，跳过 Git 更新');
        return;
    }
    
    // 递归查找匹配的任务文件
    const files = fs.readdirSync(taskPath, { recursive: true });
    const taskFile = files.find(f => f && f.toString().includes(taskId));
    
    if (!taskFile) {
        console.log(`未找到任务 ${taskId} 的 JSON 文件`);
        return;
    }
    
    const fullPath = path.join(taskPath, taskFile.toString());
    
    try {
        const content = fs.readFileSync(fullPath, 'utf8');
        const task = JSON.parse(content);
        
        // 更新状态
        task.status = status;
        
        // 写回文件
        fs.writeFileSync(fullPath, JSON.stringify(task, null, 2), 'utf8');
        
        // Git 提交
        const gitPath = CONFIG.workspacePath;
        const commitMsg = `chore(${taskId}): 更新任务状态为 ${status}`;
        
        exec(`git add "${fullPath}" && git commit -m "${commitMsg}"`, { cwd: gitPath }, (err, stdout, stderr) => {
            if (err) {
                console.error('Git 提交失败:', stderr);
            } else {
                console.log('✅ Git 任务清单已更新:', commitMsg);
            }
        });
        
    } catch (e) {
        console.error('更新 Git 任务状态失败:', e.message);
    }
}

// 主循环
async function main() {
    // 立即注册
    await registerAgent();
    
    // 立即拉取一次任务
    await fetchTask();
    
    // 定时心跳
    setInterval(() => {
        heartbeat();
    }, CONFIG.heartbeatInterval);
    
    // 定时拉取任务
    setInterval(() => {
        fetchTask();
    }, CONFIG.pollInterval);
    
    console.log(`🚀 Agent 运行中，每 ${CONFIG.pollInterval/1000} 秒拉取任务`);
}

main();
