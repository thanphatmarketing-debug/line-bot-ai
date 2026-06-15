const express = require('express');
const https = require('https');
const crypto = require('crypto');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();

const LINE_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const LINE_SECRET = process.env.LINE_CHANNEL_SECRET;
const CLAUDE_KEY = process.env.CLAUDE_API_KEY;

const anthropic = new Anthropic({ apiKey: CLAUDE_KEY });

app.use(express.json());

app.post('/webhook', (req, res) => {
  const body = JSON.stringify(req.body);
  const sig = req.headers['x-line-signature'];
  const hash = crypto.createHmac('sha256', LINE_SECRET).update(body).digest('base64');
  if (hash !== sig) return res.status(403).send('Invalid signature');

  res.json({ status: 'ok' });

  const events = req.body.events || [];
  for (const event of events) {
    if (event.type === 'message' && event.message.type === 'text') {
      handleMessage(event).catch(console.error);
    }
  }
});

async function sendLine(userId, text) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      to: userId,
      messages: [{ type: 'text', text: text }]
    });
    const buf = Buffer.from(payload, 'utf8');
    const options = {
      hostname: 'api.line.me',
      path: '/v2/bot/message/push',
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + LINE_TOKEN,
        'Content-Type': 'application/json; charset=UTF-8',
        'Content-Length': buf.length
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.write(buf);
    req.end();
  });
}

async function handleMessage(event) {
  const userMessage = event.message.text;
  const userId = event.source.userId;

  await sendLine(userId, '๐” เธเธณเธฅเธฑเธเธงเธดเน€เธเธฃเธฒเธฐเธซเน... เธฃเธญเธชเธฑเธเธเธฃเธนเนเธเธฃเธฑเธ');

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2000,
    system: `เธเธธเธ“เธเธทเธญเธเธนเนเธเนเธงเธขเธงเธดเน€เธเธฃเธฒเธฐเธซเนเธเธธเธฃเธเธดเธเธชเธณเธซเธฃเธฑเธเธเธฃเธดเธฉเธฑเธ—เธเธฒเธเธเธฑเธ•เธขเน เธเธณเธเธฑเธ”
เธเธธเธฃเธเธดเธ: เธฃเธฑเธเธชเธฃเนเธฒเธเธเนเธฒเธ เธญเธญเธเนเธเธเธเนเธฒเธ Interior Design Built-in Furniture เธเธฒเธเธฃเธฐเธเธเนเธเธเนเธฒ Renovation
เธเธทเนเธเธ—เธตเน: เนเธกเนเธชเธฒเธข เนเธกเนเธเธฑเธ เน€เธกเธทเธญเธเน€เธเธตเธขเธเธฃเธฒเธข เน€เธเธตเธขเธเนเธชเธ (เธเธฑเธเธซเธงเธฑเธ”เน€เธเธตเธขเธเธฃเธฒเธขเน€เธ—เนเธฒเธเธฑเนเธ)
เธฅเธนเธเธเนเธฒ: เน€เธเนเธฒเธเธญเธเธ—เธตเนเธ”เธดเธ เธเธฃเธญเธเธเธฃเธฑเธงเธเธขเธฒเธข เน€เธเนเธฒเธเธญเธเธเธธเธฃเธเธดเธ เธเธ 1.5-5 เธฅเนเธฒเธเธเธฒเธ—+
เธเธฃเธดเธเธ—: เธเธฑเธเธซเธฒเธเนเธณเธ—เนเธงเธกเนเธกเนเธชเธฒเธข เน€เธจเธฃเธฉเธเธเธดเธเธเธฒเธขเนเธ”เธ เธฅเธนเธเธเนเธฒเธ•เนเธญเธเธเธฒเธฃเธเนเธฒเธเธ”เธนเนเธเธเนเธ•เนเธเธธเนเธก

เธ•เธญเธเนเธเธฃเธนเธเนเธเธเธเธตเน:
๐“ เธชเธฃเธธเธเธชเธ–เธฒเธเธเธฒเธฃเธ“เน
๐’ก Insight เธชเธณเธเธฑเธ
๐ฏ เนเธญเธเธฒเธชเธชเธณเธซเธฃเธฑเธเธเธฒเธเธเธฑเธ•เธขเน
โก เธชเธดเนเธเธ—เธตเนเธเธงเธฃเธ—เธณเธ—เธฑเธเธ—เธต

เธ•เธญเธเธ เธฒเธฉเธฒเนเธ—เธข เธเธฃเธฐเธเธฑเธ เน€เธเนเธฒเนเธเธเนเธฒเธข`,
    messages: [{ role: 'user', content: userMessage }]
  });

  const reply = response.content[0].text;
  const chunks = reply.match(/[\s\S]{1,4000}/g) || [reply];
  for (const chunk of chunks) {
    await sendLine(userId, chunk);
  }
}

app.get('/', (req, res) => res.send('LINE Bot AI is running!'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Bot running on port ' + PORT));
