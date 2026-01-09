class MessengerApp {
    constructor() {
        this.currentChatId = 1;
        this.currentUser = 'Александр';
        this.chats = new Map();
        this.messages = new Map();
        this.ws = null;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadChats();
        this.loadMessages();
        this.initWebSocket();
        this.setupAutoScroll();
        this.setupKeyboardShortcuts();
    }

    setupEventListeners() {
        // Отправка сообщения
        const sendBtn = document.getElementById('sendBtn');
        const messageInput = document.getElementById('messageInput');
        
        sendBtn.addEventListener('click', () => this.sendMessage());
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Переключение чатов
        document.querySelectorAll('.chat-item').forEach(item => {
            item.addEventListener('click', () => this.switchChat(item));
        });

        // Модальное окно нового чата
        const newChatBtn = document.getElementById('newChatBtn');
        const newChatModal = document.getElementById('newChatModal');
        const closeModal = document.getElementById('closeModal');
        const cancelNewChat = document.getElementById('cancelNewChat');
        const createNewChat = document.getElementById('createNewChat');

        newChatBtn.addEventListener('click', () => this.showModal());
        closeModal.addEventListener('click', () => this.hideModal());
        cancelNewChat.addEventListener('click', () => this.hideModal());
        createNewChat.addEventListener('click', () => this.createNewChat());

        // Закрытие модального окна по клику вне его
        newChatModal.addEventListener('click', (e) => {
            if (e.target === newChatModal) {
                this.hideModal();
            }
        });

        // Поиск чатов
        const searchInput = document.querySelector('.search-input');
        searchInput.addEventListener('input', (e) => this.searchChats(e.target.value));

        // Выбор пользователя из предложений
        document.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', () => {
                const userName = item.querySelector('span').textContent;
                document.getElementById('newChatName').value = userName;
            });
        });

        // Кнопки действий в чате
        document.querySelectorAll('.chat-actions .btn-icon').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleChatAction(e));
        });

        // Эмодзи
        document.querySelector('.emoji-btn').addEventListener('click', () => {
            this.toggleEmojiPicker();
        });
    }

    loadChats() {
        // Инициализация чатов
        this.chats.set(1, {
            id: 1,
            name: 'Мария Иванова',
            avatar: 'https://picsum.photos/seed/chat1/50/50.jpg',
            lastMessage: 'Привет! Как дела?',
            time: '14:30',
            unread: 2,
            online: true
        });

        this.chats.set(2, {
            id: 2,
            name: 'Команда "Разработка"',
            avatar: 'https://picsum.photos/seed/chat2/50/50.jpg',
            lastMessage: 'Дмитрий: Встреча в 15:00',
            time: '12:15',
            unread: 0,
            online: false
        });

        this.chats.set(3, {
            id: 3,
            name: 'Елена Петрова',
            avatar: 'https://picsum.photos/seed/chat3/50/50.jpg',
            lastMessage: 'Спасибо за помощь!',
            time: 'Вчера',
            unread: 0,
            online: false
        });
    }

    loadMessages() {
        // Загрузка сообщений для текущего чата
        this.messages.set(1, [
            { id: 1, text: 'Привет! Как дела?', sent: false, time: '14:30', sender: 'Мария' },
            { id: 2, text: 'Привет! Отлично, спасибо! У тебя как?', sent: true, time: '14:32', sender: 'Александр' },
            { id: 3, text: 'Тоже хорошо! Готова к завтрашней встрече?', sent: false, time: '14:35', sender: 'Мария' }
        ]);
    }

    switchChat(chatElement) {
        // Удаление активного класса
        document.querySelectorAll('.chat-item').forEach(item => {
            item.classList.remove('active');
        });

        // Добавление активного класса
        chatElement.classList.add('active');

        // Получение ID чата
        const chatId = parseInt(chatElement.dataset.chatId);
        this.currentChatId = chatId;

        // Обновление заголовка чата
        this.updateChatHeader(chatId);

        // Загрузка сообщений
        this.loadChatMessages(chatId);

        // Удаление счетчика непрочитанных
        const unreadCount = chatElement.querySelector('.unread-count');
        if (unreadCount) {
            unreadCount.remove();
        }

        // Обновление в данных
        const chat = this.chats.get(chatId);
        if (chat) {
            chat.unread = 0;
        }
    }

    updateChatHeader(chatId) {
        const chat = this.chats.get(chatId);
        if (!chat) return;

        const contactName = document.querySelector('.contact-info h3');
        const contactAvatar = document.querySelector('.contact-avatar img');
        const contactStatus = document.querySelector('.contact-status');

        contactName.textContent = chat.name;
        contactAvatar.src = chat.avatar;
        contactStatus.textContent = chat.online ? 'online' : 'offline';
        contactStatus.style.color = chat.online ? '#28a745' : '#6c757d';
    }

    loadChatMessages(chatId) {
        const messagesContainer = document.getElementById('messagesContainer');
        const messages = this.messages.get(chatId) || [];

        // Очистка контейнера
        messagesContainer.innerHTML = '';

        // Добавление даты
        const dateDiv = document.createElement('div');
        dateDiv.className = 'message-date';
        dateDiv.innerHTML = '<span>Сегодня</span>';
        messagesContainer.appendChild(dateDiv);

        // Добавление сообщений
        messages.forEach(message => {
            this.addMessageToDOM(message);
        });

        // Прокрутка вниз
        this.scrollToBottom();
    }

    sendMessage() {
        const input = document.getElementById('messageInput');
        const text = input.value.trim();

        if (!text) return;

        const message = {
            id: Date.now(),
            text: text,
            sent: true,
            time: this.getCurrentTime(),
            sender: this.currentUser
        };

        // Добавление в DOM
        this.addMessageToDOM(message);

        // Добавление в хранилище
        const chatMessages = this.messages.get(this.currentChatId) || [];
        chatMessages.push(message);
        this.messages.set(this.currentChatId, chatMessages);

        // Обновление последнего сообщения в списке чатов
        this.updateLastMessage(this.currentChatId, text);

        // Отправка через WebSocket
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'message',
                chatId: this.currentChatId,
                message: message
            }));
        }

        // Очистка поля ввода
        input.value = '';

        // Прокрутка вниз
        this.scrollToBottom();

        // Симуляция ответа (для демонстрации)
        this.simulateReply();
    }

    addMessageToDOM(message) {
        const messagesContainer = document.getElementById('messagesContainer');
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${message.sent ? 'sent' : 'received'}`;
        
        if (!message.sent) {
            messageDiv.innerHTML = `
                <div class="message-avatar">
                    <img src="https://picsum.photos/seed/${message.sender}/30/30.jpg" alt="Avatar">
                </div>
                <div class="message-content">
                    <div class="message-text">${this.escapeHtml(message.text)}</div>
                    <div class="message-time">${message.time}</div>
                </div>
            `;
        } else {
            messageDiv.innerHTML = `
                <div class="message-content">
                    <div class="message-text">${this.escapeHtml(message.text)}</div>
                    <div class="message-time">${message.time}</div>
                </div>
            `;
        }
        
        messagesContainer.appendChild(messageDiv);
    }

    updateLastMessage(chatId, text) {
        const chat = this.chats.get(chatId);
        if (chat) {
            chat.lastMessage = text.length > 30 ? text.substring(0, 30) + '...' : text;
            chat.time = this.getCurrentTime();

            // Обновление в DOM
            const chatElement = document.querySelector(`[data-chat-id="${chatId}"]`);
            if (chatElement) {
                const lastMessageElement = chatElement.querySelector('.last-message');
                const timeElement = chatElement.querySelector('.chat-time');
                
                if (lastMessageElement) lastMessageElement.textContent = chat.lastMessage;
                if (timeElement) timeElement.textContent = chat.time;
            }
        }
    }

    simulateReply() {
        const replies = [
            'Отлично! Скоро отвечу.',
            'Понял, спасибо!',
            'Хорошо, давай обсудим.',
            'Интересно, расскажи подробнее.',
            'Согласен, давай сделаем так.',
            'Я подумаю над этим.',
            'Спасибо, что сообщил!'
        ];

        setTimeout(() => {
            const randomReply = replies[Math.floor(Math.random() * replies.length)];
            const message = {
                id: Date.now(),
                text: randomReply,
                sent: false,
                time: this.getCurrentTime(),
                sender: 'Собеседник'
            };

            this.addMessageToDOM(message);

            const chatMessages = this.messages.get(this.currentChatId) || [];
            chatMessages.push(message);
            this.messages.set(this.currentChatId, chatMessages);

            this.updateLastMessage(this.currentChatId, randomReply);
            this.scrollToBottom();

            // Показ уведомления
            this.showNotification('Новое сообщение от ' + this.chats.get(this.currentChatId).name);
        }, 1000 + Math.random() * 2000);
    }

    showModal() {
        const modal = document.getElementById('newChatModal');
        modal.classList.add('show');
        document.getElementById('newChatName').focus();
    }

    hideModal() {
        const modal = document.getElementById('newChatModal');
        modal.classList.remove('show');
        document.getElementById('newChatName').value = '';
    }

    createNewChat() {
        const input = document.getElementById('newChatName');
        const chatName = input.value.trim();

        if (!chatName) {
            this.showError('Введите имя собеседника');
            return;
        }

        const newChatId = Date.now();
        const newChat = {
            id: newChatId,
            name: chatName,
            avatar: `https://picsum.photos/seed/${chatName}/50/50.jpg`,
            lastMessage: 'Начните диалог',
            time: 'Сейчас',
            unread: 0,
            online: Math.random() > 0.5
        };

        // Добавление в хранилище
        this.chats.set(newChatId, newChat);
        this.messages.set(newChatId, []);

        // Добавление в DOM
        this.addChatToDOM(newChat);

        // Переключение на новый чат
        const chatElement = document.querySelector(`[data-chat-id="${newChatId}"]`);
        this.switchChat(chatElement);

        // Закрытие модального окна
        this.hideModal();

        // Показ уведомления
        this.showSuccess(`Чат с ${chatName} создан`);
    }

    addChatToDOM(chat) {
        const chatList = document.getElementById('chatList');
        
        const chatElement = document.createElement('div');
        chatElement.className = 'chat-item';
        chatElement.dataset.chatId = chat.id;
        
        chatElement.innerHTML = `
            <div class="chat-avatar">
                <img src="${chat.avatar}" alt="Chat">
            </div>
            <div class="chat-info">
                <div class="chat-header">
                    <h4>${chat.name}</h4>
                    <span class="chat-time">${chat.time}</span>
                </div>
                <div class="chat-preview">
                    <p class="last-message">${chat.lastMessage}</p>
                </div>
            </div>
        `;

        // Добавление обработчика клика
        chatElement.addEventListener('click', () => this.switchChat(chatElement));

        // Вставка в начало списка
        chatList.insertBefore(chatElement, chatList.firstChild);
    }

    searchChats(query) {
        const chatItems = document.querySelectorAll('.chat-item');
        const lowerQuery = query.toLowerCase();

        chatItems.forEach(item => {
            const chatName = item.querySelector('h4').textContent.toLowerCase();
            const lastMessage = item.querySelector('.last-message').textContent.toLowerCase();

            if (chatName.includes(lowerQuery) || lastMessage.includes(lowerQuery)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    }

    handleChatAction(e) {
        const icon = e.currentTarget.querySelector('i');
        
        if (icon.classList.contains('fa-phone')) {
            this.showNotification('Звонок暂时 недоступен');
        } else if (icon.classList.contains('fa-video')) {
            this.showNotification('Видеозвонок暂时 недоступен');
        } else if (icon.classList.contains('fa-ellipsis-v')) {
            this.showNotification('Дополнительные опции暂时 недоступны');
        }
    }

    toggleEmojiPicker() {
        this.showNotification('Выбор эмодзи暂时 недоступен');
    }

    initWebSocket() {
        // Для демонстрации используем симуляцию
        // В реальном приложении здесь будет подключение к WebSocket серверу
        console.log('WebSocket инициализирован (симуляция)');
    }

    setupAutoScroll() {
        const messagesContainer = document.getElementById('messagesContainer');
        
        // Наблюдение за изменениями контейнера сообщений
        const observer = new MutationObserver(() => {
            this.scrollToBottom();
        });
        
        observer.observe(messagesContainer, { childList: true });
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + N - новый чат
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                this.showModal();
            }
            
            // Ctrl/Cmd + / - поиск
            if ((e.ctrlKey || e.metaKey) && e.key === '/') {
                e.preventDefault();
                document.querySelector('.search-input').focus();
            }
            
            // Escape - закрыть модальное окно
            if (e.key === 'Escape') {
                this.hideModal();
            }
        });
    }

    scrollToBottom() {
        const messagesContainer = document.getElementById('messagesContainer');
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    getCurrentTime() {
        const now = new Date();
        return now.toLocaleTimeString('ru-RU', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showNotification(message) {
        // Создание уведомления
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;

        document.body.appendChild(notification);

        // Автоматическое удаление через 3 секунды
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    showError(message) {
        const notification = document.createElement('div');
        notification.className = 'notification error';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #dc3545;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    showSuccess(message) {
        const notification = document.createElement('div');
        notification.className = 'notification success';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #28a745;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
}

// Добавление CSS анимаций для уведомлений
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    new MessengerApp();
});

// Экспорт для использования в других модулях
window.MessengerApp = MessengerApp;
