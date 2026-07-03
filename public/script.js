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

// ----- MESAJ GÖNDERME -----
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

    // "Nemotron düşünüyor..." göster
    showThinkingIndicator();

    const data = await getAIResponse(msg, useWebSearch || currentMode === 'web');
    
    // Düşünme indicator'unu kaldır
    removeThinkingIndicator();

    // Reasoning'i göster (eğer varsa)
    if (data.reasoning) {
        addReasoning(data.reasoning);
    }

    // Final cevabı yaz
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
        searchText.innerHTML = '<span>Hazir</span>';
        globe.classList.add('paused');
    }
}

// ----- DÜŞÜNÜYOR... GÖSTER -----
function showThinkingIndicator() {
    const div = document.createElement('div');
    div.id = 'thinkingIndicator';
    div.className = 'thinking-indicator';
    div.innerHTML = `
        <div class="thinking-content">
            <span class="thinking-icon">⚛</span>
            <span class="thinking-text">Nemotron düşünüyor<span class="thinking-dots"></span></span>
        </div>
    `;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function removeThinkingIndicator() {
    const el = document.getElementById('thinkingIndicator');
    if (el) el.remove();
}

// ----- REASONING GÖSTER -----
function addReasoning(reasoningText) {
    const div = document.createElement('div');
    div.className = 'reasoning-container';
    div.innerHTML = `
        <div class="reasoning-header">
            <span class="reasoning-icon">⚛</span>
            <span class="reasoning-title">Nemotron düşünüyordu...</span>
        </div>
        <div class="reasoning-content">${reasoningText}</div>
    `;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// ----- WEB ANİMASYONU -----
async function startWebAnimation(query) {
    return new Promise((resolve) => {
        searchStatus.classList.remove('idle');
        globe.classList.remove('paused');
        globe.classList.add('searching');

        const steps = [
            { icon: '⚛', text: `Kullanici "${query}" hakkinda bilgi istiyor.` },
            { icon: '⚛', text: 'En guncel kaynaklari taranıyor...' },
            { icon: '⚛', text: 'Veriler dogrulanıyor ve analiz ediliyor...' },
            { icon: '⚛', text: 'Cevap hazirlaniyor...' }
        ];

        let index = 0;

        function showStep() {
            if (index < steps.length) {
                searchText.innerHTML = `<span>${steps[index].icon} ${steps[index].text}</span>`;
                index++;
                setTimeout(showStep, 1200);
            } else {
                searchText.innerHTML = '<span>Bilgiler toplandi. Cevap olusturuluyor...</span>';
                setTimeout(() => resolve(), 500);
            }
        }
        showStep();
    });
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
    
    // Markdown işleme
    if (content.includes('**') || content.includes('*') || content.includes('`')) {
        bubble.innerHTML = renderMarkdown(content);
    } else {
        bubble.textContent = content;
    }
    
    div.appendChild(label);
    div.appendChild(bubble);
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// ----- MARKDOWN RENDER -----
function renderMarkdown(text) {
    let html = text;
    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
    // Italic
    html = html.replace(/\*(.*?)\*/g, '<i>$1</i>');
    // Code
    html = html.replace(/`(.*?)`/g, '<code>$1</code>');
    // Newline to br
    html = html.replace(/\n/g, '<br>');
    return html;
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

        // Markdown işleme
        const html = renderMarkdown(text);
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        const textNodes = [];
        
        // HTML'yi parçalara ayır
        const walker = document.createTreeWalker(tempDiv, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, null, false);
        let node;
        while (node = walker.nextNode()) {
            textNodes.push(node);
        }

        let currentIndex = 0;
        let currentText = '';
        let isTagOpen = false;
        let tagStack = [];

        function typeChar() {
            if (currentIndex < html.length) {
                // HTML etiketlerini kontrol et
                if (html[currentIndex] === '<') {
                    // Etiket başlangıcı
                    let tag = '';
                    while (currentIndex < html.length && html[currentIndex] !== '>') {
                        tag += html[currentIndex];
                        currentIndex++;
                    }
                    tag += '>';
                    currentIndex++;
                    bubble.innerHTML += tag;
                    setTimeout(typeChar, 0);
                } else {
                    // Normal karakter
                    bubble.textContent += html[currentIndex];
                    currentIndex++;
                    chatBox.scrollTop = chatBox.scrollHeight;
                    setTimeout(typeChar, 15);
                }
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
            return data;
        } else {
            return { response: 'Uzgunum, bir hata olustu. Lutfen tekrar dener misin?' };
        }
    } catch (error) {
        console.error('API hatasi:', error);
        return { response: 'Baglanti hatasi. Lutfen daha sonra tekrar dene.' };
    }
}
