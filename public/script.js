const chatBox = document.getElementById('chatBox');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const webBtn = document.getElementById('webBtn');
const globe = document.getElementById('globe');
const searchStatus = document.getElementById('searchStatus');
const searchText = document.getElementById('searchText');

let currentMode = 'normal';
let isProcessing = false;
let reasoningSteps = [];

// ----- MOD DEĞİŞTİRME -----
document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        currentMode = this.dataset.mode;

        if (currentMode === 'web') {
            webBtn.classList.add('active');
            searchStatus.classList.remove('idle');
            searchText.innerHTML = '<span>⚛ Web modu aktif</span>';
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
    reasoningSteps = [];

    if (useWebSearch || currentMode === 'web') {
        await startWebAnimation(msg);
    }

    // Reasoning kutusunu oluştur (önce boş, sonra doldurulacak)
    const reasoningContainer = createReasoningBox();

    // AI cevabını al (reasoning ile birlikte)
    const data = await getAIResponse(msg, useWebSearch || currentMode === 'web');

    // Reasoning varsa doldur
    if (data.reasoning && data.reasoning.trim().length > 0) {
        const steps = data.reasoning.split('\n').filter(s => s.trim().length > 0);
        steps.forEach((step, index) => {
            setTimeout(() => {
                addReasoningStep(reasoningContainer, step, index + 1);
                // Otomatik açık tut
                const body = reasoningContainer.querySelector('.reasoning-body');
                const toggle = reasoningContainer.querySelector('.reasoning-toggle');
                if (body) body.classList.add('open');
                if (toggle) toggle.classList.add('open');
            }, index * 300);
        });
    } else {
        // Reasoning yoksa kutuyu gizle veya kaldır
        if (reasoningContainer) {
            reasoningContainer.style.display = 'none';
        }
    }

    // Final cevabı yaz (reasoning kutusunun altına)
    await typeMessage(data.response);

    // Kaynakları göster
    if (data.sources && data.sources.length > 0) {
        addSources(data.sources);
    }

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

// ============================================================
// 🧠 REASONING KUTUSU OLUŞTUR
// ============================================================
function createReasoningBox() {
    const container = document.createElement('div');
    container.className = 'reasoning-box';

    container.innerHTML = `
        <div class="reasoning-header">
            <div class="reasoning-header-left">
                <span class="reasoning-icon">🧠</span>
                <span class="reasoning-title">Düşünüyor...</span>
            </div>
            <button class="reasoning-toggle open">▼</button>
        </div>
        <div class="reasoning-body open"></div>
    `;

    // Toggle işlevi
    const toggle = container.querySelector('.reasoning-toggle');
    const body = container.querySelector('.reasoning-body');
    toggle.addEventListener('click', function(e) {
        e.stopPropagation();
        body.classList.toggle('open');
        this.classList.toggle('open');
        this.textContent = body.classList.contains('open') ? '▼' : '▶';
    });

    // Header'a tıklayınca da aç/kapa
    const header = container.querySelector('.reasoning-header');
    header.addEventListener('click', function(e) {
        if (e.target === toggle) return;
        body.classList.toggle('open');
        toggle.classList.toggle('open');
        toggle.textContent = body.classList.contains('open') ? '▼' : '▶';
    });

    chatBox.appendChild(container);
    chatBox.scrollTop = chatBox.scrollHeight;

    return container;
}

// ============================================================
// REASONING ADIMI EKLE (sırayla)
// ============================================================
function addReasoningStep(container, text, num) {
    const body = container.querySelector('.reasoning-body');
    if (!body) return;

    const step = document.createElement('div');
    step.className = 'reasoning-step';
    step.innerHTML = `
        <span class="step-num">${num}.</span>
        <span class="step-text">${renderMarkdown(text)}</span>
    `;
    body.appendChild(step);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// ----- WEB ANİMASYONU -----
async function startWebAnimation(query) {
    return new Promise((resolve) => {
        searchStatus.classList.remove('idle');
        globe.classList.remove('paused');
        globe.classList.add('searching');

        const steps = [
            `Kullanıcı "${query}" hakkında bilgi istiyor.`,
            'En güncel kaynaklar taranıyor...',
            'Veriler doğrulanıyor ve analiz ediliyor...',
            'Cevap hazırlanıyor...'
        ];

        let index = 0;
        // Önce reasoning kutusunu oluştur
        const container = createReasoningBox();

        function showStep() {
            if (index < steps.length) {
                searchText.innerHTML = `<span>⚛ ${steps[index]}</span>`;
                addReasoningStep(container, steps[index], index + 1);
                index++;
                setTimeout(showStep, 1200);
            } else {
                searchText.innerHTML = '<span>✅ Bilgiler toplandı. Cevap oluşturuluyor...</span>';
                setTimeout(() => resolve(), 500);
            }
        }
        showStep();
    });
}

// ----- MARKDOWN RENDER -----
function renderMarkdown(text) {
    if (!text) return '';
    let html = text;
    html = html.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
    html = html.replace(/\*(.*?)\*/g, '<i>$1</i>');
    html = html.replace(/`(.*?)`/g, '<code>$1</code>');
    html = html.replace(/\n/g, '<br>');
    return html;
}

// ----- MESAJ EKLE -----
function addMessage(role, content) {
    const div = document.createElement('div');
    div.className = `message ${role}`;
    const label = document.createElement('span');
    label.className = 'label';
    label.textContent = role === 'user' ? 'Sen' : 'Nemotron';
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.innerHTML = renderMarkdown(content);
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
        try {
            const hostname = new URL(src.url).hostname;
            a.innerHTML = `
                <img class="favicon" src="https://www.google.com/s2/favicons?domain=${hostname}" />
                ${src.title || hostname}
            `;
        } catch {
            a.textContent = src.title || src.url;
        }
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

        const html = renderMarkdown(text);
        const plainText = text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1').replace(/`(.*?)`/g, '$1');
        
        let index = 0;

        function typeChar() {
            if (index < html.length) {
                // HTML etiketlerini kontrol et
                if (html[index] === '<') {
                    let tag = '';
                    while (index < html.length && html[index] !== '>') {
                        tag += html[index];
                        index++;
                    }
                    tag += '>';
                    index++;
                    bubble.innerHTML += tag;
                    setTimeout(typeChar, 0);
                } else {
                    // Normal karakter
                    let display = html.substring(0, index + 1);
                    bubble.innerHTML = display + '<span class="typing-cursor"></span>';
                    index++;
                    chatBox.scrollTop = chatBox.scrollHeight;
                    setTimeout(typeChar, 15);
                }
            } else {
                bubble.innerHTML = html;
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
            return data;
        } else {
            return { response: 'Üzgünüm, bir hata oluştu. Lütfen tekrar dener misin?', reasoning: '' };
        }
    } catch (error) {
        console.error('API hatası:', error);
        return { response: 'Bağlantı hatası. Lütfen daha sonra tekrar dene.', reasoning: '' };
    }
}
