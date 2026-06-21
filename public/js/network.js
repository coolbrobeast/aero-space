export class Network {
  constructor() {
    this.ws = null;
    this.id = null;
    this.connected = false;
    this.handlers = {};
    this.reconnectTimer = null;
    this.playerData = null;
  }

  on(event, fn) {
    if (!this.handlers[event]) this.handlers[event] = [];
    this.handlers[event].push(fn);
  }

  emit(event, data) {
    for (const fn of this.handlers[event] || []) fn(data);
  }

  connect(playerData) {
    this.playerData = playerData;
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const url = `${proto}://${location.host}`;

    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.connected = true;
      this.send({ type: 'join', ...playerData });
      this.emit('connected');
    };

    this.ws.onmessage = (e) => {
      let msg;
      try { msg = JSON.parse(e.data); } catch { return; }

      switch (msg.type) {
        case 'welcome':
          this.id = msg.id;
          this.emit('welcome', msg);
          break;
        case 'player_join':
          this.emit('player_join', msg.player);
          break;
        case 'player_leave':
          this.emit('player_leave', msg);
          break;
        case 'player_update':
          this.emit('player_update', msg);
          break;
        case 'player_customize':
          this.emit('player_customize', msg);
          break;
        case 'chat':
          this.emit('chat', msg);
          break;
        case 'nudge':
          this.emit('nudge', msg);
          break;
        case 'emote':
          this.emit('emote', msg);
          break;
        case 'mg_state':
          this.emit('mg_state', msg.lobby);
          break;
        case 'mg_event':
          this.emit('mg_event', msg);
          break;
        case 'mg_end':
          this.emit('mg_end', msg);
          break;
        case 'mg_left':
          this.emit('mg_left', msg);
          break;
        default:
          this.emit(msg.type, msg);
      }
    };

    this.ws.onclose = () => {
      this.connected = false;
      this.emit('disconnected');
      this.reconnectTimer = setTimeout(() => this.connect(this.playerData), 3000);
    };

    this.ws.onerror = () => {};
  }

  send(data) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  updatePosition(x, y, z, rotY, anim) {
    this.send({ type: 'update', x, y, z, rotY, anim });
  }

  customize(data) { this.send({ type: 'customize', ...data }); }
  chat(text, channel = 'world', targetId = null) { this.send({ type: 'chat', text, channel, targetId }); }
  nudge(targetId) { this.send({ type: 'nudge', targetId }); }
  emote(emote) { this.send({ type: 'emote', emote }); }

  mgJoin(kioskId, gameType, label) {
    this.send({ type: 'mg_join', kioskId, gameType, label });
  }

  mgStart() { this.send({ type: 'mg_start' }); }
  mgLeave() { this.send({ type: 'mg_leave' }); }
  mgCollect(objectId) { this.send({ type: 'mg_collect', objectId }); }
  mgTag(targetId) { this.send({ type: 'mg_tag', targetId }); }

  disconnect() {
    clearTimeout(this.reconnectTimer);
    if (this.ws) this.ws.close();
  }
}
