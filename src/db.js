const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const config = require('../config.json');

const dbPath = path.resolve(__dirname, '../', config.database.path);

// 确保目录存在
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

let db;

async function initDB() {
    const SQL = await initSqlJs();
    
    // 尝试加载现有数据库
    if (fs.existsSync(dbPath)) {
        const fileBuffer = fs.readFileSync(dbPath);
        db = new SQL.Database(fileBuffer);
        console.log('SQLite 连接成功 (已存在):', dbPath);
    } else {
        db = new SQL.Database();
        console.log('SQLite 连接成功 (新建):', dbPath);
    }
    
    return db;
}

function getDB() {
    if (!db) {
        throw new Error('数据库未初始化，请先调用 initDB()');
    }
    return db;
}

// 保存数据库到文件
function saveDB() {
    if (db) {
        const data = db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(dbPath, buffer);
    }
}

module.exports = { initDB, getDB, saveDB };
