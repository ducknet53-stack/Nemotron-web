const chatBox = document.getElementById('chatBox');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const webBtn = document.getElementById('webBtn');
const globe = document.getElementById('globe');
const searchStatus = document.getElementById('searchStatus');
const searchText = document.getElementById('searchText');

let currentMode = 'normal';
let isProcessing = false;

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
            searchText.innerHTML = '<span>Hazir</span>';
            globe.classList.add('paused');
        }
    });
});

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

async function sendMessage(msg, useWebSearch) {
    if (isProcessing) return;
    isProcessing = true;
    sendBtn.disabled = true;
    webBtn.disabled = true;
    userInput.disabled = true;

    addMessage('user', msg);
    userInput.value = '';

    if (useWebSearch || currentMode === 'web') {
        await startWebAnimation();
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
        searchText.innerHTML = '<span>Hazir</span>';
        globe.classList.add('paused');
    }
}

function startWebAnimation() {
    return new Promise((resolve) => {
        searchStatus.classList.remove('idle');
        globe.classList.remove('paused');
        const messages = [
            'Web\'de arastiriliyor',
            'Sayfalar taranıyor',
            'Bilgiler toplaniyor',
            'Sonuclar isleniyor'
        ];
        let index = 0;

        searchText.innerHTML = `<span>${messages[0]}<span class="dots"></span></span>`;

        const interval = setInterval(() => {
            index++;
            if (index < messages.length) {
                searchText.innerHTML = `<span>${messages[index]}<span class="dots"></span></span>`;
            } else {
                clearInterval(interval);
                searchText.innerHTML = '<span>Web\'den bilgiler alindi! Cevap hazirlaniyor...</span>';
                setTimeout(() => resolve(), 600);
            }
        }, 1200);
    });
}

function addMessage(role, content) {
    const div = document.createElement('div');
    div.className = `message ${role}`;
    const label = document.createElement('span');
    label.className = 'label';
    label.textContent = role === 'user' ? 'Sen' : 'Nemotron';
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.textContent = content;
    div.appendChild(label);
    div.appendChild(bubble);
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
}

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
        const speed = 20;

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
            return data.response;
        } else {
            return 'Uzgunum, bir hata olustu. Lutfen tekrar dener misin?';
        }
    } catch (error) {
        console.error('API hatasi:', error);
        return 'Baglanti hatasi. Lutfen daha sonra tekrar dene.';
    }
}
