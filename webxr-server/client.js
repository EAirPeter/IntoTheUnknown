const WebSocket = require('ws');
const argparse = require('argparse');


const parser = new argparse.ArgumentParser({
    version: '0.0.1',
    addHelp: true,
    description: 'webxr client'
});

parser.addArgument(
    [ '--host' ],
    {
        help: 'hostname',
        defaultValue: '0.0.0.0'
    }
);

parser.addArgument(
    [ '-p', '--port' ],
    {
        help: 'port to listen on',
        defaultValue: 11235
    }
);

parser.addArgument(
    [ '-i', '--interval' ],
    {
        help: 'interval to broadcast to clients',
        defaultValue: 20
    }
);

const args = parser.parseArgs();

// TODO: add ping pong heartbeart to keep connections alive
// TODO: finish automatic reconnection
// TODO: max retries + timeout
// TODO: abstract out into a class for easy use in client side code
// TODO: and register callbacks with above class

function backoff(t) {
    if (t == 0) {
        t = 1;
    } else {
        t *= 2
    }

    return t;
}

class Client {

    constructor() {
        this.callbacks = {};
    }

    registerEventHandler(eventName, callback) {
        if (eventName in this.callbacks) {
            return false;
        }

        this.callbacks[eventName] = callback;
        return true;
    }

    // connect(host);
};

const heartbeatTick = 30000;

// TODO: verify this is working
function heartbeat() {
    clearTimeout(this.pingTimeout);

    // Delay should be equal to the interval at which your server
    // sends out pings plus a conservative assumption of the latency.
    this.pingTimeout = setTimeout(() => {
        // this.close(); // i.e. revisit this...
    }, heartbeatTick + 1000);
}

function connect() {
    try {

        console.log('ws://' + args.host + ':' + args.port);
        let ws = new WebSocket('ws://' + args.host + ':' + args.port);

        ws.on('ping', heartbeat);

        let reconnectInterval = null;
        let t = 0;
    
        function reconnect() {
            try {
                connect();
            } catch(err) {
                console.log(err);
                // console.log('.');
                // clearInterval(reconnectInterval);
                // reconnectInterval = setTimeout(reconnect, t);
            }
        }

        ws.on('open', () => {

            heartbeat();
            // reset t, clean up later
            t = 0;
            console.log('websocket is connected ...');
            if (ws.readyState == WebSocket.OPEN) {
                
            } else {
                // setTimeout((ws) => {if (ws.readyState == WebSocket.OPEN) {
                // }, 10);
            }
            // ws.send('connected');
            const payload = { "type": "calibrate", "inputPoints": [[1.0+ .01, 0,2.0], [-1.0, 0, 2.0 + .01]], "fixedPoints": [[1.0, 0, 2.0], [-1.0, 0, 2.0]] };
            // const interval = setInterval(() => ws.send(JSON.stringify(payload)), args.interval);
            ws.send(JSON.stringify(payload));
        });
    
        ws.on('message', (ev) => {
            try {
                
                json = JSON.parse(ev.toString());
    
                // json = JSON.parse(ev.toString());
                // console.log(json);
                // TODO:
                // execute registered callback
                // if (!(json["type"] in this.callbacks)) {
                //     console.log("no handler registered for type [" + json["type"] + "]");
                //     return;
                // }

                switch(json["type"]) {
                    case "join":
                        console.log(json);
                        break;
                    case "leave":
                        console.log(json);
                        break;
                    case "tick":
                        console.log(json);
                        break;
                    case "lock":
                        console.log(json);
                        break;
                    case "release":
                        console.log(json);
                        break;
                    case "activate":
                        console.log(json);
                        break;
                    case "deactivate":
                        console.log(json);
                        break;
                    case "clear":
                        console.log("delete lief");
                        break;
                    case "calibrate":
                        console.log(json);
                        break;
                }
            } catch(err) {
                // console.log("bad json:", json);
                console.log(err);
            }
            //console.log(JSON.parse(ev));
        });
    
        //const payload = {'translation': [0.0, 1.0, 0.0], 'orientation': [0.0, 0.0, 0.0, 1.0]};
        //const payload = {'type': 'object', 'uid': 1};
        // const payload = {'type': 'restart', 'uid': 1};
        
        ws.on('close', (event) => {
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
                    ws = null;
                    reconnectInterval = setTimeout(reconnect, t);
                    break;
                }
            // console.log("disconnected");
            // clearInterval(interval);
            clearTimeout(this.pingTimeout);
        });
    
        ws.on('error', (e) => {
            switch (e.code) {
                case 'ECONNREFUSED':
                    // reconnect(e);
                    break;
                default:
                    // this.onerror(e);
                    break;
            }
        });
    
    } catch (err) {
        console.log("Couldn't load websocket", err);
    }
}
connect();