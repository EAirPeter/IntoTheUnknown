// TODO: add ping pong heartbeart to keep connections alive
// TODO: finish automatic reconnection
// TODO: max retries + timeout

class Client
{

    constructor(heartbeat = 30000) {
        this.eventBus = new EventBus();
        this.locks = {};
        this.heartbeatTick = heartbeat;
        this.ws = null;
    }

    backoff(t) {
        if (t == 0) {
            t = 1;
        } else {
            t *= 2
        }

        return t;
    }

    // TODO: verify this is working
    heartbeat() {
        clearTimeout(this.pingTimeout);

        // Delay should be equal to the interval at which your server
        // sends out pings plus a conservative assumption of the latency.
        this.pingTimeout = setTimeout(() => {
        // this.close(); // i.e. revisit this...
        }, this.heartbeatTick + 1000);
    }

    // expected as a js object
    // TODO:
    // add guaranteed delivery
    send(message) {
       this.ws.send(JSON.stringify(message));
    }

    connect(ip, port) {
        try {

            console.log('ws://' + ip + ':' + port);
            this.ws = new WebSocket('ws://' + ip + ':' + port);
            console.log('connected');
            //ws.on('ping', this.heartbeat);

            let reconnectTimeout = null;
            this.t = 0;

            // function reconnect

            this.ws.onopen = () => {

                this.heartbeat();
                // reset t, clean up later
                this.t = 0;
                console.log('websocket is connected ...');
                if (this.ws.readyState == WebSocket.OPEN) {
                    // TODO:
                    // send message with client side config if needed
                } else {
                    // setTimeout((ws) => {if (ws.readyState == WebSocket.OPEN) {
                    // }, 10);
                }
                // ws.send('connected');
            };

            this.ws.onmessage = (ev) => {
                try {
                    //console.log(ev);
                    let json = JSON.parse(ev.data);
                    this.eventBus.publish(json["type"], json);
                } catch(err) {
                    // console.log("bad json:", json);
                    console.error(err);
                }
                //console.log(JSON.parse(ev));

            };

            //const payload = {'translation': [0.0, 1.0, 0.0], 'orientation': [0.0, 0.0, 0.0, 1.0]};
            //const payload = {'type': 'object', 'uid': 1};
            // const payload = {'type': 'restart', 'uid': 1};

            // const interval = setInterval(() => ws.send(JSON.stringify(payload)), args.interval);

            this.ws.onclose = (event) => {
                switch (event.code) {
                    // CLOSE_NORMAL
                    case 1000:
                        console.log("WebSocket: closed");
                        break;
                    // Abnormal closure
                    default:
                        // console.log(event);
                        // reconnect(event);
                        console.log('reconnecting...');
                        // /*
                        // this.ws = null;
                        /*
                        reconnectTimeout = setTimeout(() => {
                            try {
                                // this.backoff(this.t);
                                this.connect(ip, port);
                                clearTimeout(reconnectTimeout);
                            } catch(err) {
                                console.log(err);
                                // console.log('.');
                                // clearInterval(reconnectTimeout);
                                // reconnectTimeout = setTimeout(reconnect, t);
                            }
                            
                        }, this.t);
                        */
                        break;
                        // */
                    }
                console.log("disconnected");
                // clearInterval(interval);
                clearTimeout(this.pingTimeout);
            };

            this.ws.onerror = (e) => {
                switch (e.code) {
                    case 'ECONNREFUSED':
                        console.error(e);
                        // reconnect(e);
                        this.ws.close();
                        break;
                    default:
                        // this.onerror(e);
                        break;
                }
            };

        } catch (err) {
            console.error("Couldn't load websocket", err);
        }
    }
    // TODO:
    // register event for lock and release, that return true or false from onlock in Lock class
    createLock(uid) {
        this.locks[uid] = new Lock();
        return this.locks[uid];
    }
};