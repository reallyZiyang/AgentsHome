const { getDb, saveDatabase } = require('./db');
const { v4: uuidv4 } = require('uuid');

function createTask(task) {
    const db = getDb();
    const id = task.id || uuidv4();
    const now = Math.floor(Date.now() / 1000);
    
    db.run(`
        INSERT INTO tasks (id, title, description, complexity, status, priority, createdAt)
        VALUES (?, ?, ?, ?, 'pending', ?, ?)
    `, [id, task.title, task.description, task.complexity || 'medium', task.priority || 0, now]);
    
    saveDatabase();
    return id;
}

function getTasks(filters = {}) {
    const db = getDb();
    let sql = 'SELECT * FROM tasks WHERE 1=1';
    const params = [];
    
    if (filters.status) {
        sql += ' AND status = ?';
        params.push(filters.status);
    }
    if (filters.complexity) {
        sql += ' AND complexity = ?';
        params.push(filters.complexity);
    }
    sql += ' ORDER BY priority DESC, createdAt ASC';
    
    const stmt = db.prepare(sql);
    if (params.length > 0) {
        stmt.bind(params);
    }
    
    const results = [];
    while (stmt.step()) {
        results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
}

function getTaskById(id) {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM tasks WHERE id = ?');
    stmt.bind([id]);
    
    let result = null;
    if (stmt.step()) {
        result = stmt.getAsObject();
    }
    stmt.free();
    return result;
}

function updateTask(id, updates) {
    const db = getDb();
    const fields = [];
    const values = [];
    
    for (const [key, value] of Object.entries(updates)) {
        fields.push(`${key} = ?`);
        values.push(value);
    }
    values.push(id);
    
    db.run(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`, values);
    saveDatabase();
}

module.exports = { createTask, getTasks, getTaskById, updateTask };
