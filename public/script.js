const chatBox = document.getElementById('chatBox');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const webBtn = document.getElementById('webBtn');
const globe = document.getElementById('globe');
const searchStatus = document.getElementById('searchStatus');
const searchText = document.getElementById('searchText');

let currentMode = 'normal';
let isProcessing = false;
let thinkingSteps = [];

// ----- MOD DEĞİŞTİRME -----
document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        currentMode = this.dataset.mode;

        if (currentMode === 'web') {
            webBtn.classList.add('active');
            searchStatus.classList.remove('idle');
            searchText.innerHTML = '<span>🔍 Web modu aktif</span>';
            globe.classList.remove('paused');
        } else {
            webBtn.classList.remove('active');
            searchStatus.classList.add('idle');
            searchText.innerHTML = '<span>Hazır</span>';
            globe.classList.add('paused');
        }
    });
});

// ----- BUTONLAR -----
webBtn.addEventListener('click', function() {
    if (isProcessing) return;
    const msg = userInput.value.trim();
    if (!msg) {
        userInput.placeholder = 'Önce bir mesaj yaz...';
        userInput.style.borderColor = '#EA4335';
        setTimeout(() => {
            userInput.style.borderColor = '';
            userInput.placeholder = 'Mesajını yaz...';
        }, 2000);
        return;
    }
    document.querySelector('.mode-btn[data-mode="web"]').click();
    sendMessage(msg, true);
});

sendBtn.addEventListener('click', function() {
    if (isProcessing) return;
    const msg = userInput.value.trim();
    if (!msg) {
        userInput.placeholder = 'Bir şey yaz...';
        userInput.style.borderColor = '#EA4335';
        setTimeout(() => {
            userInput.style.borderColor = '';
            userInput.placeholder = 'Mesajını yaz...';
        }, 2000);
        return;
    }
    sendMessage(msg, false);
});

userInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') sendBtn.click();
});

// ----- MESAJ GÖNDERME -----
async function sendMessage(msg, useWebSearch) {
    if (isProcessing) return;
    isProcessing = true;
    sendBtn.disabled = true;
    webBtn.disabled = true;
    userInput.disabled = true;

    addMessage('user', msg);
    userInput.value = '';
    thinkingSteps = [];

    if (useWebSearch || currentMode === 'web') {
        await startWebAnimation(msg);
    }

    const aiResponse = await getAIResponse(msg, useWebSearch || currentMode === 'web');
    await typeMessage(aiResponse);

    isProcessing = false;
    sendBtn.disabled = false;
    webBtn.disabled = false;
    userInput.disabled = false;
    userInput.focus();

    if (currentMode !== 'web') {
        searchStatus.classList.add('idle');
        searchText.innerHTML = '<span>Hazır</span>';
        globe.classList.add('paused');
    }
}

// ----- WEB ANİMASYONU (Düşünme Adımları) -----
async function startWebAnimation(query) {
    return new Promise((resolve) => {
        searchStatus.classList.remove('idle');
        globe.classList.remove('paused');
        globe.classList.add('searching');

        const steps = [
            { icon: '🤔', text: `Kullanıcı "${query}" hakkında bilgi istiyor.` },
            { icon: '🔍', text: 'Web\'de araştırma yapıyorum...' },
            { icon: '📄', text: 'Sayfalar taranıyor ve bilgiler toplanıyor...' },
            { icon: '🧠', text: 'Toplanan bilgiler analiz ediliyor...' },
            { icon: '✍️', text: 'Cevap hazırlanıyor...' }
        ];

        let index = 0;

        function showStep() {
            if (index < steps.length) {
                addThinkingStep(steps[index].icon, steps[index].text);
                searchText.innerHTML = `<span>${steps[index].icon} ${steps[index].text}</span>`;
                index++;
                setTimeout(showStep, 1200);
            } else {
                searchText.innerHTML = '<span>✅ Bilgiler toplandı! Cevap oluşturuluyor...</span>';
                globe.classList.remove('searching');
                setTimeout(() => resolve(), 600);
            }
        }
        showStep();
    });
}

// ----- DÜŞÜNME ADIMI EKLE -----
function addThinkingStep(icon, text) {
    const div = document.createElement('div');
    div.className = 'thinking-step';
    div.innerHTML = `
        <span class="step-icon">${icon}</span>
        <span class="step-text">${text}</span>
    `;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// ----- MESAJ EKLE (Bold Desteği) -----
function addMessage(role, content) {
    const div = document.createElement('div');
    div.className = `message ${role}`;
    const label = document.createElement('span');
    label.className = 'label';
    label.textContent = role === 'user' ? '👤 Sen' : '🧠 Nemotron';
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    
    // Bold işleme
    if (content.includes('**')) {
        const parts = content.split(/\*\*(.*?)\*\*/g);
        let html = '';
        for (let i = 0; i < parts.length; i++) {
            if (i % 2 === 1) {
                html += `<b>${parts[i]}</b>`;
            } else {
                html += parts[i];
            }
        }
        bubble.innerHTML = html;
    } else {
        bubble.textContent = content;
    }
    
    div.appendChild(label);
    div.appendChild(bubble);
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// ----- KAYNAK EKLE -----
function addSources(sources) {
    if (!sources || sources.length === 0) return;
    const div = document.createElement('div');
    div.className = 'sources';
    sources.forEach(src => {
        const a = document.createElement('a');
        a.className = 'source-item';
        a.href = src.url;
        a.target = '_blank';
        a.innerHTML = `
            <img class="favicon" src="https://www.google.com/s2/favicons?domain=${new URL(src.url).hostname}" />
            ${src.title || src.url.replace(/^https?:\/\//, '').slice(0, 30)}
        `;
        div.appendChild(a);
    });
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// ----- HARF HARF YAZMA -----
function typeMessage(text) {
    return new Promise((resolve) => {
        const div = document.createElement('div');
        div.className = 'message ai';
        const label = document.createElement('span');
        label.className = 'label';
        label.textContent = '🧠 Nemotron';
        const bubble = document.createElement('div');
        bubble.className = 'bubble';
        div.appendChild(label);
        div.appendChild(bubble);
        chatBox.appendChild(div);

        let index = 0;
        const speed = 15;

        function typeChar() {
            if (index < text.length) {
                bubble.textContent += text.charAt(index);
                index++;
                chatBox.scrollTop = chatBox.scrollHeight;
                setTimeout(typeChar, speed);
            } else {
                resolve();
            }
        }
        typeChar();
    });
}

// ----- AI CEVABI AL -----
async function getAIResponse(msg, useWeb) {
    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: [{ role: 'user', content: msg }],
                web_search: useWeb
            })
        });

        const data = await response.json();
        if (data.success) {
            // Kaynakları göster
            if (data.sources) {
                addSources(data.sources);
            }
            return data.response;
        } else {
            return 'Üzgünüm, bir hata oluştu. Lütfen tekrar dener misin?';
        }
    } catch (error) {
        console.error('API hatası:', error);
        return 'Bağlantı hatası. Lütfen daha sonra tekrar dene.';
    }
}
