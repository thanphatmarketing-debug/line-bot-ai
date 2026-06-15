const express = require('express');
const https = require('https');
const crypto = require('crypto');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
const LINE_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const LINE_SECRET = process.env.LINE_CHANNEL_SECRET;
const anthropic = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });

const SYSTEM_PROMPT = [
  'You are a business analyst assistant for Thanpat Co., Ltd.',
  'Business: home construction, home design, interior design, built-in furniture, electrical systems, renovation.',
  'Service area: Mae Sai, Mae Chan, Mueang Chiang Rai, Chiang Saen (Chiang Rai province only).',
  'Target customers: landowners, expanding families, business owners, people returning to their hometown, real estate investors, budget 1.5-5 million baht+.',
  'Context: flood issues in Mae Sai, border economy, customers want homes that look expensive but are worth the price.',
  '',
  'IMPORTANT: You MUST respond in Thai language ONLY. Never use English in your response.',
  'Use this format every time:',
  '\u{1F4CD} สรุปสถานการณ์',
  '\u{1F4A1} Insight สำคัญ',
  '\u{1F3AF} โอกาสสำหรับฐานปัตย์',
  '⚡ สิ่งที่ควรทำทันที',
  '',
  'Keep answers concise, practical, and 100% in Thai language only.'
].join('\n');

app.use(express.json());

app.post('/webhook', (req, res) => {
  const sig = req.headers['x-line-signature'];
  const hash = crypto.createHmac('sha256', LINE_SECRET).update(JSON.stringify(req.body)).digest('base64');
  if (hash !== sig) return res.status(403).send('Invalid signature');
  res.json({ status: 'ok' });
  (req.body.events || []).forEach(event => {
    if (event.type === 'message' && event.message.type === 'text') {
      handleMessage(event).catch(console.error);
    }
  });
});

async function sendLine(userId, text) {
  return new Promise((resolve, reject) => {
    const buf = Buffer.from(JSON.stringify({ to: userId, messages: [{ type: 'text', text }] }), 'utf8');
    const req = https.request({
      hostname: 'api.line.me',
      path: '/v2/bot/message/push',
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + LINE_TOKEN,
        'Content-Type': 'application/json; charset=UTF-8',
        'Content-Length': buf.length
      }
    }, res => { res.resume(); res.on('end', resolve); });
    req.on('error', reject);
    req.write(buf);
    req.end();
  });
}

async function handleMessage(event) {
  const userId = event.source.userId;
  const userMessage = event.message.text;
  await sendLine(userId, '\u{1F50D} กำลังวิเคราะห์... รอสักครู่ครับ');
  try {
    const resp = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }]
    });
    const reply = resp.content[0].text;
    const chunks = reply.match(/[\s\S]{1,4000}/g) || [reply];
    for (const chunk of chunks) await sendLine(userId, chunk);
  } catch (err) {
    console.error('Claude error:', err.message);
    await sendLine(userId, 'ERROR: ' + err.message);
  }
}

app.get('/', (_, res) => res.send('LINE Bot AI is running!'));
app.listen(process.env.PORT || 3000, () => console.log('Bot started'));
