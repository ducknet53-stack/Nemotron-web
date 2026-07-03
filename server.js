const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
const NEMOTRON_API = 'https://nemotron-ultra-api.onrender.com';

async function searchWeb(query) {
    try {
        const response = await axios.post(
            'https://api.tavily.com/search',
            {
                query: query,
                max_results: 5,
                search_depth: 'basic',
                include_answer: true,
                include_raw_content: false
            },
            {
                headers: {
                    'Authorization': `Bearer ${TAVILY_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        return response.data;
    } catch (error) {
        console.error('Tavily hatasi:', error.message);
        return null;
    }
}

app.post('/api/chat', async (req, res) => {
    try {
        const { messages, web_search } = req.body;
        const userMessage = messages[messages.length - 1].content;
        let webContext = '';
        let webAnswer = '';
        let sources = [];

        // 1. Web araması yap
        if (web_search) {
            const searchResult = await searchWeb(userMessage);
            if (searchResult && searchResult.results) {
                webContext = searchResult.results
                    .map(r => `- ${r.content}`)
                    .join('\n');
                webAnswer = searchResult.answer || '';
                sources = searchResult.results.map(r => ({
                    title: r.title || r.url.replace(/^https?:\/\//, '').slice(0, 30),
                    url: r.url
                }));
            }
        }

        // 2. Reasoning için system prompt
        const reasoningPrompt = {
            role: 'system',
            content: `Sen Nemotron Ultra'sın. NVIDIA tarafından geliştirilmiş son derece zeki bir yapay zekasın.

Kullanıcıya cevap vermeden önce **ayrıntılı reasoning** yapmalısın. Reasoning sırasında:

- Kullanıcının isteğini dikkatlice analiz et.
- Birden fazla çözüm yolunu değerlendir.
- Gerekirse kendi kararını tekrar gözden geçir.
- Mantık hatalarını fark edip düzelt.
- Acele etme; doğal ve ayrıntılı düşün.
- Reasoning birkaç adımdan oluşsun ve gerektiğinde uzun olsun.

REASONING'İ ASLA FİNAL CEVABA EKLEME! Reasoning sadece reasoning alanına ait.

${web_search && webContext ? `\nWeb araması sonucunda şu bilgileri elde ettim:\n${webContext}\n${webAnswer ? `Özet cevap: ${webAnswer}` : ''}` : ''}

Şimdi kullanıcının sorusunu analiz et ve reasoning yap. Reasoning tamamlandıktan sonra final cevabı oluştur.

FİNAL CEVAPTA:
- Markdown kurallarına uy (bold, italik, kod, listeler)
- **Bold** ifadeler gerçekten kalın görünmeli
- Asla \*\*kaçırılmış\*\* Markdown üretme
- Cevabı göndermeden önce Markdown'u doğrula`
        };

        // 3. Final cevap için system prompt
        const finalPrompt = {
            role: 'system',
            content: `Sen Nemotron Ultra'sın. Kullanıcıya doğru, güncel ve yardımsever cevaplar ver.

CEVAP KURALLARI:
- Markdown kullan: **kalın**, *italik*, \`kod\`, kod blokları, listeler
- **Bold** ifadeler gerçekten kalın göster
- Asla \*\*kaçmış\*\* Markdown üretme
- Emoji kullanma
- Kaynak gösterme`

        // 4. Önce reasoning üret
        const reasoningMessages = [
            reasoningPrompt,
            ...messages
        ];

        const reasoningResponse = await axios.post(
            'https://openrouter.ai/api/v1/chat/completions',
            {
                model: 'nvidia/nemotron-3-ultra-550b-a55b:free',
                messages: reasoningMessages,
                max_tokens: 800,
                temperature: 0.7
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const reasoning = reasoningResponse.data.choices[0].message.content;

        // 5. Sonra final cevabı üret
        const finalMessages = [
            finalPrompt,
            ...messages,
            { role: 'assistant', content: reasoning }
        ];

        const finalResponse = await axios.post(
            'https://openrouter.ai/api/v1/chat/completions',
            {
                model: 'nvidia/nemotron-3-ultra-550b-a55b:free',
                messages: finalMessages,
                max_tokens: 600,
                temperature: 0.7
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const finalAnswer = finalResponse.data.choices[0].message.content;

        // 6. Reasoning ve final cevabı birlikte gönder
        res.json({
            success: true,
            reasoning: reasoning,
            response: finalAnswer,
            model: 'Nemotron Ultra',
            ai_name: 'Nemotron Ultra',
            web_used: web_search,
            sources: sources
        });

    } catch (error) {
        console.error('API hatasi:', error.message);
        res.status(500).json({
            success: false,
            error: 'Nemotron Ultra cevap uretirken bir hata olustu.'
        });
    }
});

app.get('/api/health', (req, res) => {
    res.json({
        status: 'online',
        tavily_connected: !!TAVILY_API_KEY,
        nemotron_api: NEMOTRON_API
    });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Proxy sunucu calisiyor: http://localhost:${PORT}`);
});
