const chatBox = document.getElementById('chatBox');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const webBtn = document.getElementById('webBtn');
const globe = document.getElementById('globe');
const searchStatus = document.getElementById('searchStatus');
const searchText = document.getElementById('searchText');

let currentMode = 'normal';
let isProcessing = false;

// ----- MOD DEĞİŞTİRME -----
document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        currentMode = this.dataset.mode;

        if (currentMode === 'web') {
            webBtn.classList.add('active');
            searchStatus.classList.remove('idle');
            searchText.innerHTML = '<span>Web modu aktif</span>';
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
        userInput.placeholder = 'Once bir mesaj yaz...';
        userInput.style.borderColor = '#EA4335';
        setTimeout(() => {
            userInput.style.borderColor = '';
            userInput.placeholder = 'Mesajini yaz...';
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
        userInput.placeholder = 'Bir sey yaz...';
        userInput.style.borderColor = '#EA4335';
        setTimeout(() => {
            userInput.style.borderColor = '';
            userInput.placeholder = 'Mesajini yaz...';
        }, 2000);
        return;
    }
    sendMessage(msg, false);
});

userInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') sendBtn.click();
});

// ----- MESAJ GONDERME -----
async function sendMessage(msg, useWebSearch) {
    if (isProcessing) return;
    isProcessing = true;
    sendBtn.disabled = true;
    webBtn.disabled = true;
    userInput.disabled = true;

    addMessage('user', msg);
    userInput.value = '';

    if (useWebSearch || currentMode === 'web') {
        await startWebAnimation(msg);
    }

    // "Nemotron Yazıyor..." göster
    showTypingIndicator();

    const aiResponse = await getAIResponse(msg, useWebSearch || currentMode === 'web');
    
    // "Yazıyor..." u kaldır
    removeTypingIndicator();
    
    await typeMessage(aiResponse);

    isProcessing = false;
    sendBtn.disabled = false;
    webBtn.disabled = false;
    userInput.disabled = false;
    userInput.focus();

    if (currentMode !== 'web') {
        searchStatus.classList.add('idle');
        searchText.innerHTML = '<span>Hazir</span>';
        globe.classList.add('paused');
    }
}

// ----- YAZIYOR... GÖSTER -----
function showTypingIndicator() {
    const div = document.createElement('div');
    div.id = 'typingIndicator';
    div.className = 'typing-indicator';
    div.innerHTML = `
        <span class="typing-text">Nemotron yaziyor<span class="typing-dots"></span></span>
    `;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function removeTypingIndicator() {
    const el = document.getElementById('typingIndicator');
    if (el) el.remove();
}

// ----- WEB ANIMASYONU (Kaliteli Düşünme Adımları) -----
async function startWebAnimation(query) {
    return new Promise((resolve) => {
        searchStatus.classList.remove('idle');
        globe.classList.remove('paused');
        globe.classList.add('searching');

        // Kaliteli reasoning adımları
        const steps = [
            { icon: '⚛', text: `Kullanici "${query}" hakkinda bilgi istiyor. Bu konuyu detayli arastirmam gerekiyor.` },
            { icon: '⚛', text: `Once en guncel kaynaklari tarayayim. Hava durumu icin dogru ve guvenilir bilgi bulmaliyim.` },
            { icon: '⚛', text: `Meteoroloji verilerini ve yerel kaynaklari karsilastiriyorum...` },
            { icon: '⚛', text: `Bilgileri dogruluyorum ve anlamli bir butun haline getiriyorum.` },
            { icon: '⚛', text: `Cevabi hazirliyorum, kullaniciya en net sekilde aktaracagim.` }
        ];

        let index = 0;

        function showStep() {
            if (index < steps.length) {
                addThinkingStep(steps[index].icon, steps[index].text);
                searchText.innerHTML = `<span>${steps[index].icon} ${steps[index].text}</span>`;
                index++;
                setTimeout(showStep, 1400);
            } else {
                searchText.innerHTML = '<span>Bilgiler toplandi. Cevap olusturuluyor...</span>';
                setTimeout(() => resolve(), 500);
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
    label.textContent = role === 'user' ? 'Sen' : 'Nemotron';
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    
    // Bold işleme ( **metin** -> <b>metin</b> )
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
        const hostname = new URL(src.url).hostname;
        a.innerHTML = `
            <img class="favicon" src="https://www.google.com/s2/favicons?domain=${hostname}" />
            ${src.title || hostname}
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
        label.textContent = 'Nemotron';
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
            if (data.sources) {
                addSources(data.sources);
            }
            return data.response;
        } else {
            return 'Uzgunum, bir hata olustu. Lutfen tekrar dener misin?';
        }
    } catch (error) {
        console.error('API hatasi:', error);
        return 'Baglanti hatasi. Lutfen daha sonra tekrar dene.';
    }
}
