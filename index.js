process.env.NODE_OPTIONS = '--no-experimental-fetch';
const express = require('express');
const line = require('@line/bot-sdk');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();

const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const lineClient = new line.messagingApi.MessagingApiClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
});

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

app.post('/webhook', express.json(), async (req, res) => {
  const signature = req.headers['x-line-signature'];
  if (!line.validateSignature(JSON.stringify(req.body), lineConfig.channelSecret, signature)) {
    return res.status(403).send('Invalid signature');
  }
  res.json({ status: 'ok' });
  const events = req.body.events || [];
  for (const event of events) {
    if (event.type === 'message' && event.message.type === 'text') {
      await handleMessage(event);
    }
  }
});

async function handleMessage(event) {
  const userMessage = event.message.text;
  const userId = event.source.userId;

  try {
    await lineClient.pushMessage({
      to: userId,
      messages: [{ type: 'text', text: '๐” เธเธณเธฅเธฑเธเธงเธดเน€เธเธฃเธฒเธฐเธซเน... เธฃเธญเธชเธฑเธเธเธฃเธนเนเธเธฃเธฑเธ' }],
    });

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      system: `เธเธธเธ“เธเธทเธญเธเธนเนเธเนเธงเธขเธงเธดเน€เธเธฃเธฒเธฐเธซเนเธเธธเธฃเธเธดเธเนเธฅเธฐเธเนเธฒเธงเธชเธฒเธฃเธชเธณเธซเธฃเธฑเธเธเธฃเธดเธฉเธฑเธ—เธเธฒเธเธเธฑเธ•เธขเน เธเธณเธเธฑเธ”
เธเธธเธฃเธเธดเธ: เธฃเธฑเธเธชเธฃเนเธฒเธเธเนเธฒเธ เธญเธญเธเนเธเธเธเนเธฒเธ Interior Design Built-in Furniture เธเธฒเธเธฃเธฐเธเธเนเธเธเนเธฒ Renovation
เธเธทเนเธเธ—เธตเน: เนเธกเนเธชเธฒเธข เนเธกเนเธเธฑเธ เน€เธกเธทเธญเธเน€เธเธตเธขเธเธฃเธฒเธข เน€เธเธตเธขเธเนเธชเธ (เธเธฑเธเธซเธงเธฑเธ”เน€เธเธตเธขเธเธฃเธฒเธขเน€เธ—เนเธฒเธเธฑเนเธ)
เธฅเธนเธเธเนเธฒ: เน€เธเนเธฒเธเธญเธเธ—เธตเนเธ”เธดเธ เธเธฃเธญเธเธเธฃเธฑเธงเธเธขเธฒเธข เน€เธเนเธฒเธเธญเธเธเธธเธฃเธเธดเธ เธเธ 1.5-5 เธฅเนเธฒเธเธเธฒเธ—+
เธเธฃเธดเธเธ—: เธเธฑเธเธซเธฒเธเนเธณเธ—เนเธงเธกเนเธกเนเธชเธฒเธข เน€เธจเธฃเธฉเธเธเธดเธเธเธฒเธขเนเธ”เธ เธฅเธนเธเธเนเธฒเธ•เนเธญเธเธเธฒเธฃเธเนเธฒเธเธ”เธนเนเธเธเนเธ•เนเธเธธเนเธก

เน€เธกเธทเนเธญเนเธ”เนเธฃเธฑเธเธเธณเธ–เธฒเธกเนเธซเนเธงเธดเน€เธเธฃเธฒเธฐเธซเนเนเธฅเธฐเธ•เธญเธเนเธ format เธเธตเน:
๐“ เธชเธฃเธธเธเธชเธ–เธฒเธเธเธฒเธฃเธ“เน
๐’ก Insight เธชเธณเธเธฑเธ
๐ฏ เนเธญเธเธฒเธชเธชเธณเธซเธฃเธฑเธเธเธฒเธเธเธฑเธ•เธขเน
โก เธชเธดเนเธเธ—เธตเนเธเธงเธฃเธ—เธณเธ—เธฑเธเธ—เธต

เธ•เธญเธเธ เธฒเธฉเธฒเนเธ—เธข เธเธฃเธฐเธเธฑเธ เน€เธเนเธฒเนเธเธเนเธฒเธข เนเธกเนเน€เธเธดเธ 5 เธเธฃเธฃเธ—เธฑเธ”เธ•เนเธญเธซเธฑเธงเธเนเธญ`,
      messages: [{ role: 'user', content: userMessage }],
    });

    const reply = response.content[0].text;

    const chunks = reply.match(/[\s\S]{1,4000}/g) || [reply];
    for (const chunk of chunks) {
      await lineClient.pushMessage({
        to: userId,
        messages: [{ type: 'text', text: chunk }],
      });
    }
  } catch (error) {
    console.error('Error:', error.message);
    await lineClient.pushMessage({
      to: userId,
      messages: [{ type: 'text', text: 'โ เน€เธเธดเธ”เธเนเธญเธเธดเธ”เธเธฅเธฒเธ” เธเธฃเธธเธ“เธฒเธฅเธญเธเนเธซเธกเนเธเธฃเธฑเธ' }],
    });
  }
}

app.get('/', (req, res) => res.send('LINE Bot AI is running!'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Bot running on port ${PORT}`));
