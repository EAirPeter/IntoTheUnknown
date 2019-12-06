"use strict";

//code.iamkate.com
function Queue(){var a=[],b=0;this.getLength=function(){return a.length-b};this.isEmpty=function(){return 0==a.length};this.enqueue=function(b){a.push(b)};this.dequeue=function(){if(0!=a.length){var c=a[b];2*++b>=a.length&&(a=a.slice(b),b=0);return c}};this.peek=function(){return 0<a.length?a[b]:void 0}};


window.Input = {};
window.Input.INPUT_TYPE_KEYDOWN = "keydown";
window.Input.INPUT_TYPE_KEYUP   = "keyup";

window.Input.initKeyEvents = function(keypoll) {

    MR._keypoll = keypoll;

    MR.input.keyPrev = new Uint8Array(512);
    MR.input.keyCurr = new Uint8Array(512);

    for (let i = 0; i < 512; i += 1) {
        MR.input.keyPrev[i] = 0;
    }
    for (let i = 0; i < 512; i += 1) {
        MR.input.keyCurr[i] = 0;
    }

    if (!MR.input.isInit) {
        document.addEventListener("keydown", (e) => {
            if (e.target != document.body) { return; }

            MR._keyQueue.enqueue(e);

            if (MR._keydown) {
                MR._keydown(e);
            }
        }, false);
        document.addEventListener("keyup", (e) => {
            if (e.target != document.body) { return; }

            MR._keyQueue.enqueue(e);

            if (MR._keyup) {
                MR._keyup(e);
            }
        }, false);

        MR.input.isInit = true;
    }
};


window.Input.updateKeyState = function() {
    const keyPrev    = MR.input.keyPrev;
    const keyPrevLen = MR.input.keyPrev.length;
    const keyCurr    = MR.input.keyCurr;

    for (let i = 0; i < keyPrevLen; i += 1) {
        keyPrev[i] = keyCurr[i];
    }

    const Q = MR._keyQueue;
    const currState = MR.input.keyCurr;
    while (!Q.isEmpty()) {
        const e = Q.dequeue();
        const keyCode = e.keyCode;
        switch (e.type) {
            case Input.INPUT_TYPE_KEYDOWN: {
                keyCurr[keyCode] = 1;
                break;
            }
            case Input.INPUT_TYPE_KEYUP: {
                keyCurr[keyCode] = 0;
                break;
            }
            default: {

            }
        }
    }
};

window.Input.keyWentDown = function(code) {
    return !MR.input.keyPrev[code] && MR.input.keyCurr[code];
};
window.Input.keyWentDownNum = function(code) {
    return (~MR.input.keyPrev[code]) & MR.input.keyCurr[code];
};

window.Input.keyIsDown = function(code) {
    return MR.input.keyCurr[code];
};
window.Input.keyIsDownNum = function(code) {
    return MR.input.keyCurr[code];
};
window.Input.keyIsUp = function(code) {
    return !MR.input.keyCurr[code];
};
window.Input.keyIsUpNum = function(code) {
    return ~MR.input.keyCurr[code];
};

window.Input.keyWentUp = function(code) {
    return MR.input.keyPrev[code] && !MR.input.keyCurr[code];
};
window.Input.keyWentUpNum = function(code) {
    return MR.input.keyPrev[code] & (~MR.input.keyCurr[code]);
};

window.Input.registerKeyDownHandler = function(handler) {
    MR._keydown = handler;
}
window.Input.registerKeyUpHandler = function(handler) {
    MR._keyup = handler;
}
window.Input.deregisterKeyHandlers = function() {
    MR._keydown = null;
    MR._keyup   = null;
}

window.Input.KEY_LEFT  = 37;
window.Input.KEY_UP    = 38;
window.Input.KEY_RIGHT = 39;
window.Input.KEY_DOWN  = 40;
window.Input.KEY_SHIFT = 16; // shift
window.Input.KEY_ZERO  = 48; // 0
window.Input.KEY_CONTROL = 17; // control
window.Input.KEY_A = 65;
window.Input.KEY_W = 87
window.Input.KEY_D = 68;
window.Input.KEY_S = 83;


Input.updateControllerState = () => {
    if (MR.VRIsActive()) {
        MR.headset = MR.frameData();
        let left_is_0 = MR.controllers[0].id.indexOf('Left') > 0;
        if (MR.controllers) {
            MR.leftController  = MR.controllers[left_is_0 ? 0 : 1];
            MR.rightController = MR.controllers[left_is_0 ? 1 : 0];
        }
    }
}





