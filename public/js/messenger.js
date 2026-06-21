export class Messenger {
  constructor(game) {
    this.game = game;
    this.friends = new Map();
    this.activeChatId = null;
    this.privateMessages = new Map();
    this.worldMessages = [];
    this.minimized = false;
    this.init();
  }

  init() {
    this.el = document.getElementById('wim-messenger');
    this.friendsList = document.getElementById('friends-list');
    this.onlineCount = document.getElementById('online-count');
    this.myName = document.getElementById('wim-my-name');
    this.myStatus = document.getElementById('wim-my-status');
    this.myAvatar = document.getElementById('wim-my-avatar');
    this.chatWindow = document.getElementById('wim-chat-window');
    this.chatMessages = document.getElementById('chat-messages');
    this.chatWithName = document.getElementById('chat-with-name');
    this.chatInput = document.getElementById('chat-input');
    this.worldChatLog = document.getElementById('world-chat-log');
    this.worldChatInput = document.getElementById('world-chat-input');

    this.bindEvents();
  }

  bindEvents() {
    document.getElementById('wim-minimize').addEventListener('click', () => this.toggleMinimize());
    document.getElementById('chat-close').addEventListener('click', () => this.closeChat());
    document.getElementById('chat-send').addEventListener('click', () => this.sendPrivateMessage());
    document.getElementById('chat-nudge').addEventListener('click', () => this.sendNudge());
    document.getElementById('world-chat-send').addEventListener('click', () => this.sendWorldMessage());

    this.chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.sendPrivateMessage();
    });
    this.worldChatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.sendWorldMessage();
    });

    document.getElementById('btn-customizer').addEventListener('click', () => {
      this.game.customizer.show();
    });
    document.getElementById('btn-emote-wave').addEventListener('click', () => {
      this.game.doEmote('wave');
    });
    document.getElementById('btn-emote-dance').addEventListener('click', () => {
      this.game.doEmote('dance');
    });
    document.getElementById('btn-float').addEventListener('click', () => {
      this.game.doEmote('float');
    });
  }

  show() {
    this.el.classList.remove('hidden');
    document.getElementById('world-chat').classList.remove('hidden');
  }

  setProfile(name, color, status) {
    this.myName.textContent = name;
    this.myStatus.textContent = status;
    this.myAvatar.style.background = `linear-gradient(135deg, ${color}, ${adjustColor(color, -30)})`;
  }

  updateProfile(status) {
    this.myStatus.textContent = status;
  }

  addFriend(player) {
    this.friends.set(player.id, player);
    this.renderFriends();
  }

  removeFriend(id) {
    this.friends.delete(id);
    if (this.activeChatId === id) this.closeChat();
    this.renderFriends();
  }

  updateFriend(id, data) {
    const friend = this.friends.get(id);
    if (friend) {
      Object.assign(friend, data);
      this.renderFriends();
    }
  }

  renderFriends() {
    this.friendsList.innerHTML = '';
    const count = this.friends.size;
    this.onlineCount.textContent = count;

    if (count === 0) {
      this.friendsList.innerHTML = '<div class="wim-empty">No other Webiies online yet...<br>Invite friends to hang out!</div>';
      return;
    }

    for (const [id, friend] of this.friends) {
      const el = document.createElement('div');
      el.className = 'wim-friend';
      el.innerHTML = `
        <div class="online-dot"></div>
        <div class="wim-friend-avatar" style="background: linear-gradient(135deg, ${friend.color}, ${adjustColor(friend.color, -30)})"></div>
        <div class="wim-friend-info">
          <div class="wim-friend-name">${escapeHtml(friend.name)}</div>
          <div class="wim-friend-status">${escapeHtml(friend.status || 'Online')}</div>
        </div>
      `;
      el.addEventListener('click', () => this.openChat(id, friend.name));
      this.friendsList.appendChild(el);
    }
  }

  openChat(id, name) {
    this.activeChatId = id;
    this.chatWithName.textContent = name;
    this.chatWindow.classList.remove('hidden');
    this.chatMessages.innerHTML = '';

    const history = this.privateMessages.get(id) || [];
    for (const msg of history) {
      this.appendChatBubble(msg.text, msg.mine, msg.sender);
    }

    this.chatInput.focus();
  }

  closeChat() {
    this.activeChatId = null;
    this.chatWindow.classList.add('hidden');
  }

  appendChatBubble(text, mine, sender) {
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${mine ? 'mine' : 'theirs'}`;
    if (!mine && sender) {
      bubble.innerHTML = `<div class="chat-sender">${escapeHtml(sender)}</div>${escapeHtml(text)}`;
    } else {
      bubble.textContent = text;
    }
    this.chatMessages.appendChild(bubble);
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
  }

  sendPrivateMessage() {
    const text = this.chatInput.value.trim();
    if (!text || !this.activeChatId) return;

    this.game.network.chat(text, 'private', this.activeChatId);
    this.storePrivateMessage(this.activeChatId, { text, mine: true });
    this.appendChatBubble(text, true);
    this.chatInput.value = '';
  }

  sendWorldMessage() {
    const text = this.worldChatInput.value.trim();
    if (!text) return;

    this.game.network.chat(text, 'world');
    this.worldChatInput.value = '';
  }

  sendNudge() {
    if (this.activeChatId) {
      this.game.network.nudge(this.activeChatId);
      this.appendChatBubble('⚡ You nudged them!', false, 'System');
    }
  }

  onChat(msg) {
    if (msg.channel === 'world') {
      this.addWorldMessage(msg.name, msg.text);
    } else if (msg.channel === 'private') {
      const isFromMe = msg.id === this.game.network.id;
      const otherId = isFromMe ? msg.targetId : msg.id;

      if (this.activeChatId === otherId || this.activeChatId === msg.id) {
        this.appendChatBubble(msg.text, isFromMe, isFromMe ? null : msg.name);
      }

      if (!isFromMe) {
        this.storePrivateMessage(msg.id, { text: msg.text, mine: false, sender: msg.name });
        if (!this.activeChatId) {
          this.showNotification(`${msg.name} sent you a message!`);
        }
      }
    }
  }

  storePrivateMessage(id, msg) {
    if (!this.privateMessages.has(id)) this.privateMessages.set(id, []);
    this.privateMessages.get(id).push(msg);
  }

  addWorldMessage(name, text) {
    const el = document.createElement('div');
    el.className = 'world-chat-msg';
    el.innerHTML = `<span class="sender">${escapeHtml(name)}:</span> ${escapeHtml(text)}`;
    this.worldChatLog.appendChild(el);

    while (this.worldChatLog.children.length > 8) {
      this.worldChatLog.removeChild(this.worldChatLog.firstChild);
    }

    this.worldMessages.push({ name, text });
  }

  onNudge(msg) {
    this.showNudgeEffect();
    this.addWorldMessage('System', `⚡ ${msg.fromName} nudged you!`);
  }

  showNudgeEffect() {
    const flash = document.getElementById('nudge-flash');
    flash.classList.remove('hidden');
    setTimeout(() => flash.classList.add('hidden'), 600);
  }

  showNotification(text) {
    this.addWorldMessage('WIM', text);
  }

  toggleMinimize() {
    this.minimized = !this.minimized;
    document.getElementById('wim-main').classList.toggle('hidden', this.minimized);
  }

  toggle() {
    this.el.classList.toggle('hidden');
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function adjustColor(hex, amount) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
