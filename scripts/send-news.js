const https = require('https');
const Anthropic = require('@anthropic-ai/sdk');

const LINE_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const USER_IDS = [
  'Uc923d0e2fc9fb08ad818f26f1f12def0',
  'Uc7bc813eecd68c0f2540be3a0ce9632d'
];

const anthropic = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });

function getThaiDate() {
  const now = new Date();
  const bkk = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const year = bkk.getUTCFullYear() + 543;
  const dayNames = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์'];
  const monthNames = ['','ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  return {
    dayName: dayNames[bkk.getUTCDay()],
    day: bkk.getUTCDate(),
    month: monthNames[bkk.getUTCMonth() + 1],
    year,
    time: `${String(bkk.getUTCHours()).padStart(2,'0')}:${String(bkk.getUTCMinutes()).padStart(2,'0')}`
  };
}

function fetchURL(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function parseRSS(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null && items.length < 3) {
    const titleMatch = match[1].match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/);
    const linkMatch = match[1].match(/<link>(.*?)<\/link>/);
    const descMatch = match[1].match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/);
    if (titleMatch && linkMatch) {
      items.push({
        title: titleMatch[1].trim(),
        url: linkMatch[1].trim(),
        desc: descMatch ? descMatch[1].replace(/<[^>]*>/g, '').trim().slice(0, 300) : ''
      });
    }
  }
  return items;
}

function sendLine(userId, text) {
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

async function searchAndSummarize(category, query) {
  const resp = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 600,
    tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 2 }],
    messages: [{
      role: 'user',
      content: `ค้นหาข่าวล่าสุดภาษาไทยเกี่ยวกับ: ${query}\n\nสรุปเป็นภาษาไทยในรูปแบบนี้เท่านั้น:\n📌 [ชื่อข่าว]\n\n• [ประเด็นสำคัญ 1]\n• [ประเด็นสำคัญ 2]\n• [ประเด็นสำคัญ 3]\n\n💡 ทำไมต้องรู้: [กระทบชีวิต/ธุรกิจอย่างไร]\n\n🔗 [URL ข่าว]`
    }]
  });
  const textBlock = resp.content.find(c => c.type === 'text');
  return textBlock ? textBlock.text.trim() : 'ไม่พบข่าวใหม่ในหมวดนี้';
}

async function main() {
  console.log('Fetching news...');
  const d = getThaiDate();

  // Tech news from Beartai RSS
  const rssXml = await fetchURL('https://www.beartai.com/feed');
  const rssItems = parseRSS(rssXml);
  const top = rssItems[0];

  const techResp = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    messages: [{
      role: 'user',
      content: `สรุปข่าวต่อไปนี้เป็นภาษาไทยในรูปแบบนี้เท่านั้น:\n📌 ${top.title}\n\n• [ประเด็นสำคัญ 1]\n• [ประเด็นสำคัญ 2]\n• [ประเด็นสำคัญ 3]\n\n💡 ทำไมต้องรู้: [กระทบอะไร]\n\n🔗 ${top.url}\n\nเนื้อหา: ${top.desc}`
    }]
  });
  const techSummary = techResp.content[0].text.trim();

  // Other categories via web search
  const [marketing, home, mindset] = await Promise.all([
    searchAndSummarize('การตลาด', 'การตลาดดิจิทัล SME ธุรกิจ ไทย ล่าสุด'),
    searchAndSummarize('ดีไซน์บ้าน', 'ดีไซน์บ้าน ตกแต่งภายใน เทรนด์ใหม่ ไทย'),
    searchAndSummarize('mindset', 'mindset ผู้ประกอบการ แนวคิดธุรกิจ ประสบความสำเร็จ ไทย')
  ]);

  const messages = [
    `🔔 ข่าวใหม่! — ${d.dayName} ${d.day} ${d.month} ${d.year} | ${d.time} น.\n━━━━━━━━━━━━━━━\nมี 4 หัวข้อวันนี้ 👇`,
    `📱 เทคโนโลยี/AI\n━━━━━━━━━━━━━━━\n${techSummary}`,
    `📈 การตลาดดิจิทัล\n━━━━━━━━━━━━━━━\n${marketing}`,
    `🏠 ดีไซน์บ้าน\n━━━━━━━━━━━━━━━\n${home}`,
    `💡 Mindset ผู้ประกอบการ\n━━━━━━━━━━━━━━━\n${mindset}`
  ];

  for (const userId of USER_IDS) {
    for (const msg of messages) {
      await sendLine(userId, msg);
      await new Promise(r => setTimeout(r, 300));
    }
    console.log('Sent to', userId);
  }

  console.log('Done!');
}

main().catch(err => { console.error(err); process.exit(1); });
