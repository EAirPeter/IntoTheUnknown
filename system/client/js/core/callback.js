'use strict';

MR.syncClient.eventBus.subscribe("platform", (json) => {

});

MR.syncClient.eventBus.subscribe("initialize", (json) => {

    if (!MR.avatars) {
        MR.avatars = {};
    }

    const id = json["id"];

    let headset = new Headset(CG.cylinder);
    let leftController = new Controller(CG.cube);
    let rightController = new Controller(CG.cube);
    let playerAvatar = new Avatar(headset, id, leftController, rightController);

    for (let key in json["avatars"]) {
        const avid = json["avatars"][key]["user"];
        let avatar = new Avatar(headset, avid, leftController, rightController);
        MR.avatars[avid] = avatar;
    }

    // MR.avatars[id] = playerAvatar;
    MR.playerid = id;
    console.log("player id is", id);
    console.log(MR.avatars);
});

MR.syncClient.eventBus.subscribe("join", (json) => {
    console.log(json);
    const id = json["id"];

    if (id in MR.avatars) {

    } else {
        let headset = new Headset(CG.cylinder);
        let leftController = new Controller(CG.cube);
        let rightController = new Controller(CG.cube);
        let avatar = new Avatar(headset, id, leftController, rightController);
        MR.avatars[id] = avatar;
    }

    console.log(MR.avatars);

    MR.updatePlayersMenu();
});

MR.syncClient.eventBus.subscribe("leave", (json) => {
    console.log(json);
    delete MR.avatars[json["user"]];

    MR.updatePlayersMenu();
});

MR.syncClient.eventBus.subscribe("tick", (json) => {
    // console.log("world tick: ", json);
});

MR.syncClient.eventBus.subscribe("avatar", (json) => {
    //if (MR.VRIsActive()) {
    const payload = json["data"];
    //console.log(json);
    //console.log(payload);
    for (let key in payload) {
        //TODO: We should not be handling visible avatars like this.
        //TODO: This is just a temporary bandaid.
        if (payload[key]["user"] in MR.avatars && payload[key]["state"]["mode"] == MR.UserType.vr) {
            MR.avatars[payload[key]["user"]].headset.position = payload[key]["state"]["pos"];
            MR.avatars[payload[key]["user"]].headset.orientation = payload[key]["state"]["rot"];
            //console.log(payload[key]["state"]);
            MR.avatars[payload[key]["user"]].leftController.position = payload[key]["state"].controllers.left.pos;
            MR.avatars[payload[key]["user"]].leftController.orientation = payload[key]["state"].controllers.left.rot;
            MR.avatars[payload[key]["user"]].rightController.position = payload[key]["state"].controllers.right.pos;
            MR.avatars[payload[key]["user"]].rightController.orientation = payload[key]["state"].controllers.right.rot;
            MR.avatars[payload[key]["user"]].mode = payload[key]["state"]["mode"];
        } else {
            // never seen, create
            //ALEX: AVATARS WHO ARE ALSO IN BROWSER MODE GO HERE...
            //console.log("previously unseen user avatar");
            // let avatarCube = createCubeVertices();
            // MR.avatars[payload[key]["user"]] = new Avatar(avatarCube, payload[key]["user"]);
        }
    }
    //}
});

/*
// expected format of message
const response = {
    "type": "lock",
    "uid": key,
    "success": boolean
};

 */

// TODO:
// deal with logic and onlock
MR.syncClient.eventBus.subscribe("lock", (json) => {

    const success = json["success"];
    const key = json["uid"];

    if (success) {
        console.log("acquire lock success: ", key);
        MR.objs[key].lock.locked = true;
    } else {
        console.log("acquire lock failed : ", key);
    }

});

/*
// expected format of message
const response = {
        "type": "release",
        "uid": key,
        "success": boolean
};

 */

// TODO:
// deal with logic and onlock
MR.syncClient.eventBus.subscribe("release", (json) => {

    const success = json["success"];
    const key = json["uid"];

    if (success) {
        console.log("release lock success: ", key);
    } else {
        console.log("release lock failed : ", key);
    }

});

/*
//on success:

const response = {
    "type": "object",
    "uid": key,
    "state": json,
    "lockid": lockid,
    "success": true
};

//on failure:

const response = {
    "type": "object",
    "uid": key,
    "success": false
};
*/

// TODO:
// update to MR.objs
/*
MR.syncClient.eventBus.subscribe("object", (json) => {

    const success = json["success"];

    if (success) {
        console.log("object moved: ", json);
        // update MR.objs
    } else {
        console.log("failed object message", json);
    }

});*/

// TODO:
// add to MR.objs
MR.syncClient.eventBus.subscribe("spawn", (json) => {

    const success = json["success"];

    if (success) {
        console.log("object created ", json);
        // add to MR.objs
    } else {
        console.log("failed spawn message", json);
    }

});

MR.syncClient.eventBus.subscribe("object", (json) => {
    const success = json["success"];
     if (success) {
      console.log("object moved: ", json);
      // update update metadata for next frame's rendering
      let current = MR.objs[json["uid"]];
      console.log(json);
      current.position = [json["state"]["position"][0], json["state"]["position"][1], json["state"]["position"][2]];
    //current.orientation = MR.objs[json["state"]["orientation"]];
    }
    else{
      console.log("failed object message", json);
    }
});

// on success
// const response = {
//   "type": "calibrate",
//   "x": ret.x,
//   "z": ret.z,
//   "theta": ret.theta,
//   "success": true
// };

// on failure:
//   const response = {
//     "type": "calibrate",
//     "success": false
// };

MR.syncClient.eventBus.subscribe("calibration", (json) => {
    console.log("world tick: ", json);
});


function pollAvatarData() 
{
    if (MR.VRIsActive()) 
    {
        const frameData = MR.frameData();
        if (frameData != null) {
            //User Headset
            // const leftInverseView = CG.matrixInverse(frameData.leftViewMatrix);
            // const rightInverseView = CG.matrixInverse(frameData.rightViewMatrix);
            
            // const leftHeadsetPos = CG.matrixTransform(leftInverseView, frameData.pose.position);
            // const rightHeadsetPos = CG.matrixTransform(rightInverseView, frameData.pose.position);
            // const headsetPos = CG.mix(leftHeadsetPos, rightHeadsetPos);
            // console.log(headsetPos);
            const headsetPos = frameData.pose.position;
            const headsetRot = frameData.pose.orientation;
            const headsetTimestamp = frameData.timestamp;

            if (MR.controllers[0] != null && MR.controllers[1] != null) {
                //Controllers
                const controllerRight = MR.controllers[0];
                const controllerRightPos = controllerRight.pose.position;
                const controllerRightRot = controllerRight.pose.orientation;
                const controllerRightButtons = controllerRight.buttons;

                const controllerLeft = MR.controllers[1];
                const controllerLeftPos = controllerLeft.pose.position;
                const controllerLeftRot = controllerLeft.pose.orientation;
                const controllerLeftButtons = controllerLeft.buttons;

                //buttons have a 'pressed' variable that is a boolean.
                /*A quick mapping of the buttons:
                        0: analog stick
                        1: trigger
                        2: side trigger
                        3: x button
                        4: y button
                        5: home button
                */
                const avatar_message = {
                    type: "avatar",
                    user: MR.playerid,
                    state: {
                        mode: MR.UserType.vr,
                        pos: CG.matrixTransform(MR.avatarMatrixInverse, headsetPos),
                        rot: headsetRot,
                        controllers: {
                            left: {
                                pos: CG.matrixTransform(MR.avatarMatrixInverse, [controllerLeftPos[0], controllerLeftPos[1], controllerLeftPos[2]]),
                                rot: [controllerLeftRot[0], controllerLeftRot[1], controllerLeftRot[2], controllerLeftRot[3]],
                                analog: controllerLeftButtons[0].pressed,
                                trigger: controllerLeftButtons[1].pressed,
                                sideTrigger: controllerLeftButtons[2].pressed,
                                x: controllerLeftButtons[3].pressed,
                                y: controllerLeftButtons[4].pressed,
                                home: controllerLeftButtons[5].pressed,
                                analogx: controllerLeft.axes[0],
                                analogy: controllerLeft.axes[1]

                            },
                            right: {
                                pos: CG.matrixTransform(MR.avatarMatrixInverse, [controllerRightPos[0], controllerRightPos[1], controllerRightPos[2]]),
                                rot: [controllerRightRot[0], controllerRightRot[1], controllerRightRot[2], controllerRightRot[3]],
                                analog: controllerRightButtons[0].pressed,
                                trigger: controllerRightButtons[1].pressed,
                                sideTrigger: controllerRightButtons[2].pressed,
                                x: controllerRightButtons[3].pressed,
                                y: controllerRightButtons[4].pressed,
                                home: controllerRightButtons[5].pressed,
                                analogx: controllerRight.axes[0],
                                analogy: controllerRight.axes[1],
                            }
                        }
                    }
                }

                if (MR.playerid == -1) {
                    return;
                }

                try {
                    //console.log(avatar_message);
                    MR.syncClient.send(avatar_message);
                } catch (err) {
                    console.log(err);
                }
            }

        }

    } else {
        let avatar_message = {
            type: "avatar",
            user: MR.playerid,
            state: {
                mode: MR.UserType.browser,
            }
        }
        try {
            //console.log(avatar_message);
            MR.syncClient.send(avatar_message);
        } catch (err) {
            console.log(err);
        }
    }
}