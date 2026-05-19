const fs = require('fs');
const https = require('https');
const FormData = require('form-data');

const form = new FormData();
form.append('reqtype', 'fileupload');
form.append('fileToUpload', Buffer.from('test'), {
    filename: 'test.txt',
    contentType: 'text/plain',
});

const req = https.request('https://catbox.moe/user/api.php', {
    method: 'POST',
    headers: form.getHeaders(),
}, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => console.log('Response:', data));
});

form.pipe(req);
