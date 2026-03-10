// 任务同步脚本
// 从 Git 任务清单同步到调度中心

const http = require('http');
const fs = require('fs');
const path = require('path');

// 配置
const CONFIG = {
    schedulerUrl: process.env.SCHEDULER_URL || 'http://localhost:3000',
    workspacePath: process.env.WORKSPACE_PATH || path.join(__dirname, '..'),
};

// HTTP 请求
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

// 扫描任务目录
function scanTasks(tasksDir) {
    const tasks = [];
    
    if (!fs.existsSync(tasksDir)) {
        console.log('任务目录不存在:', tasksDir);
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
                    tasks.push(task);
                } catch (e) {
                    console.error('读取任务文件失败:', fullPath, e.message);
                }
            }
        }
    }
    
    scanDir(tasksDir);
    return tasks;
}

// 同步任务到调度中心
async function syncTasks() {
    console.log('=== 开始同步任务 ===');
    
    const tasksDir = path.join(CONFIG.workspacePath, 'tasks');
    const gitTasks = scanTasks(tasksDir);
    
    console.log(`扫描到 ${gitTasks.length} 个 Git 任务`);
    
    // 获取调度中心现有任务
    let schedulerTasks = [];
    try {
        schedulerTasks = await request('GET', '/api/tasks');
    } catch (e) {
        console.error('获取调度中心任务失败:', e.message);
    }
    
    const schedulerTaskIds = new Set(schedulerTasks.map(t => t.id));
    
    let synced = 0;
    let skipped = 0;
    
    for (const task of gitTasks) {
        if (!task.id || !task.title) {
            console.warn('任务缺少必要字段:', task);
            continue;
        }
        
        // 如果调度中心已存在，跳过
        if (schedulerTaskIds.has(task.id)) {
            skipped++;
            continue;
        }
        
        // 创建任务
        try {
            await request('POST', '/api/tasks', {
                id: task.id,
                title: task.title,
                description: task.description || '',
                complexity: task.complexity || 'medium',
                priority: task.priority || 0,
                status: 'pending'
            });
            
            console.log(`✅ 同步任务: ${task.id} - ${task.title}`);
            synced++;
            
        } catch (e) {
            console.error(`❌ 同步任务失败: ${task.id}`, e.message);
        }
    }
    
    console.log(`=== 同步完成: ${synced} 新增, ${skipped} 跳过 ===`);
}

// 运行一次
syncTasks();

// 定时同步 (每5分钟)
setInterval(syncTasks, 5 * 60 * 1000);

console.log('任务同步服务运行中，每5分钟同步一次');
