const { getDb, saveDatabase } = require('./db');

function registerAgent(agent) {
    const db = getDb();
    const now = Math.floor(Date.now() / 1000);
    
    db.run(`
        INSERT OR REPLACE INTO agents (id, name, model, params, context, capabilities, status, lastHeartbeat, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, 'online', ?, ?)
    `, [agent.id, agent.name, agent.model, agent.params, agent.context, JSON.stringify(agent.capabilities || []), now, now]);
    
    saveDatabase();
    return agent.id;
}

function getAgents(filters = {}) {
    const db = getDb();
    let sql = 'SELECT * FROM agents WHERE 1=1';
    const params = [];
    
    if (filters.status) {
        sql += ' AND status = ?';
        params.push(filters.status);
    }
    sql += ' ORDER BY createdAt DESC';
    
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

function updateAgentStatus(id, status) {
    const db = getDb();
    const now = Math.floor(Date.now() / 1000);
    
    db.run('UPDATE agents SET status = ?, lastHeartbeat = ? WHERE id = ?', [status, now, id]);
    saveDatabase();
}

function heartbeat(id) {
    const db = getDb();
    const now = Math.floor(Date.now() / 1000);
    
    db.run('UPDATE agents SET status = ?, lastHeartbeat = ? WHERE id = ?', ['online', now, id]);
    saveDatabase();
}

module.exports = { registerAgent, getAgents, updateAgentStatus, heartbeat };
