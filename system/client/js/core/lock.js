class Lock {
  constructor(uid) {
    this.lockedBy = -1;
    this.uid = uid;
  }

  locked() {
    return this.lockedBy == MR.playerid;
  }

  available() {
    return this.lockedBy == -1;
  }

  lock() {
    if (this.locked())
      return true;
    if (!this.available())
      return false;
    const response = {
      type: "lock",
      uid: this.uid,
      lockid: MR.playerid
    };
    MR.syncClient.send(response);
    return false;
  }

  unlock() {
    if (!this.locked())
      return;
    this.lockedBy = -1;
    const response = {
      type: "release",
      uid: this.uid,
      lockid: MR.playerid
    };
    MR.syncClient.send(response);
  }
};
