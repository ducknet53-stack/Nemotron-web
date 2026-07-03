const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Frontend dosyalarını serve et
app.use(express.static(path.join(__dirname, 'public')));

// Sadece Tavily API key (OpenRouter key yok!)
const TAVILY_API_KEY = process.env.TAVILY_API_KEY;

// Mevcut API adresi (DOĞRU!)
const NEMOTRON_API = 'https://nemotron-ultra-api.onrender.com';

// ----------------------
// 1. Web Araması (Tavily)
// ----------------------
async function searchWeb(query) {
    try {
        const response = await axios.post(
            'https://api.tavily.com/search',
            {
                query: query,
                max_results: 5,
                search_depth: 'basic',
                include_answer: true
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

// ----------------------
// 2. Ana Sohbet Endpoint'i
// ----------------------
app.post('/api/chat', async (req, res) => {
    try {
        const { messages, web_search } = req.body;

        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({
                success: false,
                error: 'Gecersiz istek. messages array gonderin.'
            });
        }

        const userMessage = messages[messages.length - 1].content;
        let webContext = '';
        let webAnswer = '';

        // Eger web aramasi aktifse Tavily ile ara
        if (web_search) {
            const searchResult = await searchWeb(userMessage);
            if (searchResult && searchResult.results) {
                webContext = searchResult.results
                    .map(r => `- ${r.content}`)
                    .join('\n');
                webAnswer = searchResult.answer || '';
            }
        }

        // Web sonuçlarını mesaja ekle
        let finalMessages = messages;
        if (web_search && webContext) {
            const contextMessage = {
                role: 'system',
                content: `Web aramasi sonucunda su bilgileri elde ettim:\n${webContext}\n${webAnswer ? `Ozet cevap: ${webAnswer}` : ''}\n\nBu bilgilere dayanarak kullaniciya dogru ve guncel cevap ver.`
            };
            finalMessages = [contextMessage, ...messages];
        }

        // Mevcut API'ye istek yap (DOĞRU ENDPOINT!)
        const response = await axios.post(
            `${NEMOTRON_API}/api/chat`,  // https://nemotron-ultra-api.onrender.com/api/chat
            {
                messages: finalMessages,
                web_search: false // API'ye tekrar arama yapma, zaten biz yaptık
            },
            {
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

        res.json({
            success: true,
            response: response.data.response,
            model: response.data.model,
            ai_name: response.data.ai_name,
            web_used: web_search
        });

    } catch (error) {
        console.error('API hatasi:', error.message);
        res.status(500).json({
            success: false,
            error: 'Nemotron Ultra cevap uretirken bir hata olustu.'
        });
    }
});

// ----------------------
// 3. Sağlık Kontrolü
// ----------------------
app.get('/api/health', (req, res) => {
    res.json({
        status: 'online',
        tavily_connected: !!TAVILY_API_KEY,
        nemotron_api: NEMOTRON_API
    });
});

// ----------------------
// 4. Ana Sayfa (Frontend)
// ----------------------
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Proxy sunucu calisiyor: http://localhost:${PORT}`);
    console.log(`📡 Mevcut API: ${NEMOTRON_API}/api/chat`);
});
