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
        console.error('Tavily hatası:', error.message);
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

        let finalMessages = messages;
        if (web_search && webContext) {
            const contextMessage = {
                role: 'system',
                content: `Web araması sonucunda şu bilgileri elde ettim:\n${webContext}\n${webAnswer ? `Özet cevap: ${webAnswer}` : ''}\n\nBu bilgilere dayanarak kullanıcıya doğru ve güncel cevap ver.`
            };
            finalMessages = [contextMessage, ...messages];
        }

        const response = await axios.post(
            `${NEMOTRON_API}/api/chat`,
            {
                messages: finalMessages,
                web_search: false
            },
            {
                headers: { 'Content-Type': 'application/json' }
            }
        );

        res.json({
            success: true,
            response: response.data.response,
            model: response.data.model,
            ai_name: response.data.ai_name,
            web_used: web_search,
            sources: sources
        });

    } catch (error) {
        console.error('API hatası:', error.message);
        res.status(500).json({
            success: false,
            error: 'Nemotron Ultra cevap üretirken bir hata oluştu.'
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
    console.log(`🚀 Proxy sunucu çalışıyor: http://localhost:${PORT}`);
    console.log(`📡 Mevcut API: ${NEMOTRON_API}/api/chat`);
});
