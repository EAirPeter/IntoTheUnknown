class Lock {
    constructor() {
        this.locked = false;       
    }

    request(uid) {
        console.log("send lock");
        const response = 
        {
            type: "lock",
            uid: uid,
            lockid: MR.playerid
        };
        //console.log("Lock Message");
        //console.log(response);
        MR.syncClient.send(response);
        return true;
    }

    release(uid) {
        const response = 
        {
            type: "release",
            uid: uid,
            lockid: MR.playerid
        };
        //console.log("release Message");
        //console.log(response);
        MR.syncClient.send(response);
        return true;
    }

    onLock() {
        this.locked = true;
    }
};