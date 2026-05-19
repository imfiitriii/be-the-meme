const https = require('https');
const FormData = require('form-data');

const form = new FormData();
form.append('file', Buffer.from('test'), {
    filename: 'test.jpg',
    contentType: 'image/jpeg',
});

const req = https.request('https://file.io', {
    method: 'POST',
    headers: form.getHeaders(),
}, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => console.log('Response:', data));
});

form.pipe(req);
