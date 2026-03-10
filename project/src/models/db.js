const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const config = require('../../config.json');

let db = null;

async function initDatabase() {
    const SQL = await initSqlJs();
    
    const dbPath = path.resolve(__dirname, '../../', config.database.path);
    
    // 如果数据库文件存在，加载它
    let data = null;
    if (fs.existsSync(dbPath)) {
        data = fs.readFileSync(dbPath);
    }
    
    db = new SQL.Database(data);
    
    // 创建表
    createTables();
    
    // 保存到文件
    saveDatabase();
    
    console.log('数据库初始化完成:', dbPath);
    return db;
}

function createTables() {
    // Agent 表
    db.run(`
        CREATE TABLE IF NOT EXISTS agents (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            model TEXT,
            params INTEGER,
            context INTEGER,
            capabilities TEXT,
            status TEXT DEFAULT 'offline',
            lastHeartbeat INTEGER,
            createdAt INTEGER DEFAULT (strftime('%s', 'now'))
        )
    `);
           
    // 任务表
    db.run(`
        CREATE TABLE IF NOT EXISTS tasks (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            complexity TEXT DEFAULT 'medium',
            status TEXT DEFAULT 'pending',
            assignedAgent TEXT,
            priority INTEGER DEFAULT 0,
            retries INTEGER DEFAULT 0,
            createdAt INTEGER,
            startedAt INTEGER,
            completedAt INTEGER,
            result TEXT,
            FOREIGN KEY (assignedAgent) REFERENCES agents(id)
        )
    `);
    
    // 日志表
    db.run(`
        CREATE TABLE IF NOT EXISTS logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            agentId TEXT,
            taskId TEXT,
            level TEXT DEFAULT 'info',
            message TEXT,
            createdAt INTEGER DEFAULT (strftime('%s', 'now')),
            FOREIGN KEY (agentId) REFERENCES agents(id),
            FOREIGN KEY (taskId) REFERENCES tasks(id)
        )
    `);
    
    console.log('表创建完成');
}

function saveDatabase() {
    const dbPath = path.resolve(__dirname, '../../', config.database.path);
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
}

function getDb() {
    return db;
}

module.exports = { initDatabase, getDb, saveDatabase };
