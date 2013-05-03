module('lively.net.WebSockets').requires().toRun(function() {

Object.subclass('lively.net.WebSocket',
'documentation', {
    example: function() {
        // This is a very simple wrapper for the native WebSocket object.
        // It will internally use a WebSocket object and manage (re)opening
        // connections on its own
        // For the server code see the WebSocketExample subserver
        var url = new URL(Config.nodeJSURL + '/WebSocketExample/connect');
        var ws = new lively.net.WebSocket(url, {protocol: 'lively-json'});
        connect(ws, 'closed', Global, 'show', {converter: function() { return 'websocket closed'; }});
        connect(ws, 'helloWorldReply', Global, 'show');
        ws.send({action: 'helloWorld', data: 'message from Lively'});
    }
},
'properties', {
    CONNECTING:   0,
    OPEN:         1,
    CLOSING:      2,
    CLOSED:       3,
    doNotSerialize: ['socket', '_open']
},
'initializing', {
    initialize: function(uri, options) {
        options = options || {};
        uri = uri.isURL ? uri.toString() : uri;
        uri = uri.replace(/^http/, 'ws');
        this.uri = uri;
        this.messages = [];
        this.socket = null;
        this.reopenClosedConnection = options.enableReconnect || false;
        this._open = false;
        this.sendTimeout = options.timeout || 3 * 1000; // when to stop trying to send
        this.protocol = options.protocol ? options.protocol : null;
    },

    enableReconnect: function() { this.reopenClosedConnection = true; },
    disableReconnect: function() { this.reopenClosedConnection = false; }
},
'events', {
    onError: function(evt) {
        console.log('%s got error %s', this, evt.data ? evt.data : evt);
        lively.bindings.signal(this, 'error', evt);
    },
    onOpen: function(evt) {
        this._open = true;
        lively.bindings.signal(this, 'opened', evt);
    },
    onClose: function(evt) {
        lively.bindings.signal(this, 'closed', evt);
        // reopen makes only sense if connection was open before
        if (this._open && this.reopenClosedConnection) this.connect();
        this._open = false;
    },
    onMessage: function(evt) {
        this.messages.push(evt.data);
        lively.bindings.signal(this, 'message', evt.data);
        if (this.protocol !== 'lively-json') return;
        try {
            var msg = JSON.parse(evt.data);
            if (msg && msg.action) lively.bindings.signal(this, msg.action, msg);
        } catch(e) {
            console.warn('%s failed to JSON parse message and dispatch %s: %s', this, evt.data, e);
        }
    }
},
'network', {

    isOpen: function() { return this.socket && this.socket.readyState === this.OPEN; },
    isConnecting: function() { return this.socket && this.socket.readyState === this.CONNECTING; },
    isClosed: function() { return !this.socket || this.socket.readyState >= this.CLOSING; },

    connect: function() {
        if (this.isOpen() || this.isConnecting()) return this;
        if (this.socket) this.socket.close();
        var self = this;
        this.socket = Object.extend(new WebSocket(this.uri), {
            onerror: function(evt) { return self.onError(evt); },
            onopen: function(evt) { return self.onOpen(evt); },
            onclose: function(evt) { return self.onClose(evt); },
            onmessage: function(evt) { return self.onMessage(evt); }
        });
    },

    send: function(data) {
        if (this.isClosed()) this.connect();
        if (!this.isOpen()) { this.retrySendIn(data, 20); return; }
        if (typeof data !== 'string') data = JSON.stringify(data);
        return this.socket.send(data);
    },

    close: function() {
        this.reopenClosedConnection = false;
        if (!this.isClosed()) this.socket.close();
    },

    retrySendIn: function(data, waitTimeForNextAttempt, startTime) {
        startTime = startTime || Date.now();
        waitTimeForNextAttempt = waitTimeForNextAttempt || 100;
        if (this.sendTimeout && Date.now() - startTime > this.sendTimeout) {
            this.onError({error: 'send attempt timedout', type: 'timeout'});
            return;
        }
        Global.setTimeout(this.send.bind(this, data), waitTimeForNextAttempt);
    }

},
'debugging', {
    toString: function() {
        return Strings.format('lively.net.WebSocket(%s, connection: %s, %s messages',
            this.uri, this.isOpen() ? 'open' : 'closed', this.messages.length);
    }
});

}) // end of module