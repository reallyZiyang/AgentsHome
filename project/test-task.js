const http = require('http');

const data = JSON.stringify({
    title: "测试任务",
    description: "测试",
    complexity: "simple"
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/tasks',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = http.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => console.log(body));
});

req.on('error', (e) => console.error(e));
req.write(data);
req.end();
