// TODO: change this if else block to a one liner callback with registered handlers
//       i.e. handle[messageType](messageQueue, socket, ...)
// TODO: rooms / lobby system
//       temporary workaround could be maintaining several datastores or processes, one for each room
// TODO: decide about ownership
// TODO: option for reliable / unreliable sync
// TODO: destroy object when owner or last player leaves
// TODO: owned by world? is that useful?
// TODO: prevent ownership takeover - like I created something that is MINE
// TODO: check - provide some server function returning a bool to verify a condition is met
//               the hope being that this could be as generic as possible for plug and play
// TODO: some utility client that allows me to explore / control the state from the server
// TODO: handle spawning similarly to other projects
// TODO: allow sparse sync with server side smoothing / interpolation
// TODO: real-time view smoothing
// TODO: consider dynamic parent - child relationships being enforced in terms of hierarchical
//       transformations, avatar vs transforms, etcetera
// TODO: considerations for spatial audio
// TODO: two phase commit - then integrate to core library
// TODO: dynamic update rates for different objects
// TODO: broadcast text messages from world periodically, re: old school multiplayer FPS
//       could support scoreboard type things
// TODO: VALIDATION!!!
// TODO: handle all classes of errors (at least documented by ws implementation) client & server
// TODO: send procedural shapes back and forth - ensure you allow for editing them
// TODO: linting
// TODO: auto format
// TODO: persistent state beyond when last client leaves
// TODO: streaming audio
// TODO: procedural audio
// TODO: audio event
// TODO: quantization
// TODO: prediction (given vel/acc)
// TODO: roles
// TODO: each user, multiple streams (this should be implicitly handled)
// TODO: also consider authority of physics and owned objects affecting other non-owned objects
// TODO: clock sync
// TODO: add ping pong heartbeart to keep connections alive
// TODO: add guaranteed delivery for certain message types, in other words, keep sending these messages, don't let them fall out of the message queue,
//       for instance, initialization messages

const argparse = require("argparse");
const WebSocket = require("ws");

// TODO: Is it possible to make this cleaner?
const DataStore = require("./DataStore.js");
const datastore = new DataStore();

const Calibrator = require("./calibrator.js");

const parser = new argparse.ArgumentParser({
  version: "0.0.1",
  addHelp:true,
  description: "webxr server"
});
parser.addArgument(
  [ "-p", "--port" ],
  {
    help: "port to listen on",
    defaultValue: 11235
  }
);
parser.addArgument(
    [ "-t", "--tick" ],
    {
      help: "interval to broadcast server time 'tick' to clients (in ms)",
      defaultValue: 2000
    }
);
parser.addArgument(
    [ "-a", "--avatar" ],
    {
      help: "interval to broadcast avatars to clients (in ms)",
      defaultValue: 10
    }
);
parser.addArgument(
    [ "-b", "--broadcast" ],
    {
      help: "interval to broadcast messages to clients (in ms)",
      defaultValue: 1
    }
);
parser.addArgument(
    [ "-hb", "--heartbeat" ],
    {
      help: "interval to heartbeat ping pong messages to clients (in ms)",
      defaultValue: 300
    }
);

const args = parser.parseArgs();

const port = args.port;

const TICK_RATE = args.tick;
const BROADCAST_RATE = args.broadcast;
const AVATAR_RATE = args.avatar;
const HEARTBEAT_RATE = args.heartbeat;

let messageQueue = [];

let websocketMap = new Map();
let timers = {};
let avatars = {};

setInterval(() => {
    console.log("current connections:");
    console.log(Array.from(websocketMap.keys() ));
    console.log("avatars: ");
    console.log(avatars);
}, 5000);
// avatar state:
// user:
// {
// pos {x,y,z}
// rot {x,y,z,w}
// ?vel {x,y,z}
// ?acc {x,y,z}
// controllerState {
    // left:{
        // back trigger
        // side trigger
        // one
        // two
        // stick {
            // x,y
        // }
    // }
    // right:
    // same as above
// }
// }


function noop() {}
 
function heartbeat() {
    this.isAlive = true;
}

function send(to, from, message) {
    if (to == "*") {
        messageQueue.push({
                "src": from,
                "dst": "*", 
                "message": message
            });
    } else {
        messageQueue.push({
                "src": from,
                "dst": to,
                "message": message
            });
    }
}

try {

    const wss = new WebSocket.Server({ port: port });

    // timers["interval"] = setInterval(function ping() {
    //     wss.clients.forEach(function each(ws) {
    //         if (ws.isAlive == false) {
    //             console.log("died at index: ", ws.index);
    //             // leave(ws.index);
    //             return ws.terminate();
    //         }

    //         ws.isAlive = false;
    //         ws.ping(noop);
    //     });
    // }, HEARTBEAT_RATE);

    // write the pending messages
    function flush() {

        for (const entry of messageQueue) {
            if (entry["dst"] == "*") {

                // send to all
                wss.clients.forEach(function each(client) {
                    if (!client.isAlive) {
                        // leave(client.index);
                        return;
                    }

                    if (entry["src"] == client.index) {
                        return;
                    }

                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify(entry["message"]));
                    } else if (client.readyState === WebSocket.CLOSING) {
                        console.log("ws not open:", client.index, entry);
                    } else if (client.readyState === WebSocket.CLOSED) {
                        console.log("ws not open:", client.index, entry);
                    } else if (client.readyState === WebSocket.CONNECTING) {
                        console.log("ws not open:", client.index, entry);
                    }
                });

            } else {
                console.log("sending to:", entry);
                const dst = websocketMap.get(entry["dst"]);
                if (dst) {
                    dst.send(JSON.stringify(entry["message"]));
                }
                // if (!dst.isAlive) {
                //     return;
                // }
                
            }
        }

        messageQueue = [];
    }

    function leave(index, username) {
        
        console.log("close: websocketMap.keys():", Array.from(websocketMap.keys() ));
        
        if (!websocketMap.get(index)) {
            return;
        }

        delete avatars[index];
        console.log(avatars);
        // clearInterval(timerID);
        // TODO: change ip to username
        console.log(index);
        const response = { "type": "leave", "user": index };
        send("*", index, response);
        websocketMap.get(index).close();
        websocketMap.delete(index);
    }

    // TODO: map wsIndex to user - i.e. there can be multiple sockets per user
    let wsIndex = 0;

    // int to string
    let index2userid = {};
    // string to list of ints
    let userid2index = {};

    timers["flushRate"] = setInterval(flush, BROADCAST_RATE);

    console.log("WebXR server is listening on port:", port);
    console.log("broadcasting rate:", TICK_RATE);

    wss.on("connection", (ws, req) => {

        const ip = req.connection.remoteAddress;

        let timerID = null;

        ws.index = wsIndex++;
        websocketMap.set(ws.index, ws);

        ws.isAlive = true;
        ws.on("pong", heartbeat);

        console.log("connection: ", ip);

        // avatars[ws.index] =
        // {
        //     'user': ws.index,
        //     'state': {
        //         'pos': [ 0, 0, 0 ],
        //         'rot': [ 0, 0, 0 ]
        //     }
        // };

        const payload = { "type": "initialize", "id": ws.index, "objects": datastore.state["objects"], "avatars": avatars };
        send(ws.index, -1, payload);

        // notify the world that a player joined, should be a separate process from initialize
        // TODO: change id to username or something
        send("*", -1, { "type": "join", "id": ws.index });

        ws.on("message", (data) => {

            // console.log(data);

            let json = {}

            try {
                json = JSON.parse(data.toString());
            } catch(err) {
                // console.log(err);
                return;
            }

            if (json["type"] == "object") {

                const key = json["uid"];
                const lockid = json["lockid"];
                const state = json["state"];

                if(datastore.acquire(key, lockid)) {
                    datastore.setObjectData(key, state);
                    // console.log(datastore.state);

                    // tell everyone else about this update
                    const response = {
                        "type": "object",
                        "uid": key,
                        "state": state,
                        "lockid": lockid,
                        "success": true
                    };

                    send("*", -1, response);
                } else {
                    // respond to sender only with failure, only need to indicate what uid is
                    const response = {
                        "type": "object",
                        "uid": key,
                        "success": false
                    };

                    send(ws.index, -1, response);
                    console.log("object in use.");
                }

            } else if(json["type"] == "spawn") {
                // This depends on the spawn logic we want to add.
                const key = json["uid"];
                const lockid = json["lockid"];
                const state = json["state"];

                if (!datastore.exists(key)) {
                    datastore.add(key);
                    datastore.setObjectData(key, state);
                    datastore.lock(key,lockid);

                    const response = {
                        "type": "spawn",
                        "uid": key,
                        "state": state,
                        "success": true
                    }; //vel / acc , ...

                    send("*", -1, response);

                } else {
                    const response = {
                        "type": "spawn",
                        "uid": key,
                        "success": false
                    };
                    send(ws.index, -1, response);
                }

            } else if (json["type"] == "delete") {

                const key = json["uid"];

                // TODO: do i have permission?
                if (datastore.get(key) && datastore.acquire(key, ws.index)) {
                    // if true send to everyone
                    const response = {
                        "type": "delete",
                        "uid": key,
                        "success": true
                    };

                    send("*", -1, response);
                } else {
                    // if false only send to requester
                    const response = {
                        "type": "delete",
                        "uid": key,
                        "success": false
                    };

                    send(ws.index, -1, response);
                }

            } else if (json["type"] == "lock") {
          
                const key = json["uid"];
                const lockid = json["lockid"];

                // if successful, broadcast success to everyone
                if (datastore.acquire(key, lockid)) {
                    datastore.lock(key, lockid);
                   
                    const response = {
                        "type": "lock",
                        "uid": key,
                        "success": true
                    };

                    send("*", -1, response);
                // else respond with failure to sender only
                } else {

                    const response = {
                        "type": "lock",
                        "uid": key,
                        "success": false
                    };

                    send(ws.index, -1, response);
                }

            } else if(json["type"] == "release") {

                const key = json["uid"];
                const lockid = json["lockid"];

                // if successful, broadcast success to everyone
                if (datastore.acquire(key, lockid)) {
                    datastore.unlock(key);

                    const response = {
                        "type": "release",
                        "uid": key,
                        "success": true
                    };

                    send("*", -1, response);
                // else respond with failure to sender only
                } else {

                    const response = {
                        "type": "release",
                        "uid": key,
                        "success": false
                    };

                    send(ws.index, -1, response);
                }

            } else if(json["type"] == "activate") {

                const key = json["uid"];

                // TODO:
                // check if it"s already active, or if you have permission to do so
                if (datastore.active(key)) {

                    const response = {
                        "type": "activate",
                        "success": true,
                        "uid": key
                    }

                    datastore.activate(key);

                    send("*", -1, response);

                } else {

                    const response = {
                        "type": "activate",
                        "success": false,
                        "uid": key
                    }

                    send(ws.index, -1, response);
                }

            } else if(json["type"] == "deactivate") {

                const key = json["uid"];
                // TODO:
                // check if it"s already active, or if you have permission to do so
                const response = {
                    "type": "deactivate",
                    "success": true,
                    "uid": key
                }

                datastore.deactivate(key);

                send("*", -1, response);

            } else if(json["type"] == "restart") {

                const response = {
                    "type": "clear"
                };

                datastore.clear();

                send("*", -1, response);

            } else if (json["type"] == "schedule") {
                // schedule a broadcast in the future, once or on an interval
                // expected input
                // { type: "schedule", lockid: ..., mode: [once, repeat, cancel]}
            } else if (json["type"] == "event") {
                // generic message type to allow more flexibility to the client"s implementation
            } else if (json["type"] == "world") {

            } else if (json["type"] == "avatar") {

                const userid = json["user"];
                const state = json["state"];

                avatars[userid] = {
                    'user': userid,
                    'state': state
                };

            } else if (json["type"] == "objectMode") {
                // change object mode [static | dynamic | stream]
            } else if (json["type"] == "calibrate") {
                // TODO:
                // expected message:
                // { slotid: int, ... }
                // { type: "calibrate", fixedPoints: [], inputPoints: [] }
                const inputPoints = json["inputPoints"];
                const fixedPoints = json["fixedPoints"];

                const calibrator = new Calibrator(fixedPoints);

                const ret = calibrator.calibrate(inputPoints);

                if (ret) {
                    const response = {
                        "type": "calibrate",
                        "x": ret.x,
                        "z": ret.z,
                        "theta": ret.theta,
                        "success": true
                    };

                    send(ws.index, -1, response);
                } else {
                    const response = {
                        "type": "calibrate",
                        "success": false
                    };
                    
                    send(ws.index, -1, response);
                }

            } else if (json["type"] == "evaluate") {
                // pass stuff around for passing code between clients
            } else if (json["type"] == "users") {
                // list connected users
            }

            // TODO: outgoing messages
            //  text broadcast
            //  { "type": "broadcast", "origin": user, "message" }
            //  direct text message
            //  { "type": "pm", "origin": user, "message" }

        });

        ws.on("close", () => {
            console.log(".");
            leave(ws.index);
        });

        // broadcast server tick to all clients
        timers["tick"] = setInterval(() => {
            const response = { "type": "tick", "time": Date.now() };
            send("*", -1, response);
        }, TICK_RATE);

        timers["avatar"] = setInterval(() => {

            if (Object.keys(avatars).length === 0) {
                return;
            }

            const response = {
                "type": "avatar",
                "data": avatars
            };

            send("*", -1, response);
        }, AVATAR_RATE);

   });
} catch (err) {
   console.log("couldn't load websocket: ", err);
}