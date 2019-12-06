"use strict"

let cubeVertices  = null;
let m             = null;
let noise         = null;
let gfx           = null;

const VERTEX_SIZE = 8;
const FRICTION    = 0.002;

////////////////////////////// SCENE SPECIFIC CODE

async function setup(state) {
    hotReloadFile(getPath('week8.js'));

    const images = await imgutil.loadImagesPromise([
       getPath("textures/brick.png"),
       getPath("textures/tiles.jpg"),
    ]);

    let libSources = await MREditor.loadAndRegisterShaderLibrariesForLiveEditing(gl, "libs", [
        { key : "pnoise"    , path : "shaders/noise.glsl"     , foldDefault : true }, 
    ]);
    if (! libSources)
        throw new Error("Could not load shader library");

    // load vertex and fragment shaders from the server, register with the editor
    let shaderSource = await MREditor.loadAndRegisterShaderForLiveEditing(
        gl,
        "mainShader",
        { 
            onNeedsCompilation : (args, libMap, userData) => {
                const stages = [args.vertex, args.fragment];
                const output = [args.vertex, args.fragment];
                const implicitNoiseInclude = true;
                if (implicitNoiseInclude) {
                    let libCode = MREditor.libMap.get('pnoise');
                    for (let i = 0; i < 2; i++) {
                        const stageCode = stages[i];
                        const hdrEndIdx = stageCode.indexOf(';');
                        const hdr = stageCode.substring(0, hdrEndIdx + 1);
                        output[i] = hdr + '\n#line 2 1\n' + 
                                    '#include<pnoise>\n#line ' + (hdr.split('\n').length + 1) + ' 0' + 
                                    stageCode.substring(hdrEndIdx + 1);
                    }
                }
                MREditor.preprocessAndCreateShaderProgramFromStringsAndHandleErrors(
                    output[0],
                    output[1],
                    libMap
                );
            },
            onAfterCompilation : (program) => {
                gl.useProgram(state.program = program);

                state.uColorLoc    = gl.getUniformLocation(program, 'uColor');
                state.uCursorLoc   = gl.getUniformLocation(program, 'uCursor');
                state.uModelLoc    = gl.getUniformLocation(program, 'uModel');
                state.uProjLoc     = gl.getUniformLocation(program, 'uProj');
                state.uTexIndexLoc = gl.getUniformLocation(program, 'uTexIndex');
                state.uTimeLoc     = gl.getUniformLocation(program, 'uTime');
                state.uViewLoc     = gl.getUniformLocation(program, 'uView');
                state.uTexLoc = [];
                for (let n = 0 ; n < 8 ; n++) {
                   state.uTexLoc[n] = gl.getUniformLocation(program, 'uTex' + n);
                               gl.uniform1i(state.uTexLoc[n], n);
                }
            } 
        },
        {
            paths : {
                vertex   : "shaders/vertex.vert.glsl",
                fragment : "shaders/fragment.frag.glsl"
            },
            foldDefault : {
                vertex   : true,
                fragment : false
            }
        }
    );
    if (! shaderSource)
        throw new Error("Could not load shader");

    state.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, state.buffer);

    let bpe = Float32Array.BYTES_PER_ELEMENT;

    let aPos = gl.getAttribLocation(state.program, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, bpe * VERTEX_SIZE, bpe * 0);

    let aNor = gl.getAttribLocation(state.program, 'aNor');
    gl.enableVertexAttribArray(aNor);
    gl.vertexAttribPointer(aNor, 3, gl.FLOAT, false, bpe * VERTEX_SIZE, bpe * 3);

    let aUV  = gl.getAttribLocation(state.program, 'aUV');
    gl.enableVertexAttribArray(aUV);
    gl.vertexAttribPointer(aUV , 2, gl.FLOAT, false, bpe * VERTEX_SIZE, bpe * 6);

    for (let i = 0 ; i < images.length ; i++) {
        gl.activeTexture (gl.TEXTURE0 + i);
        gl.bindTexture   (gl.TEXTURE_2D, gl.createTexture());
        gl.texParameteri (gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri (gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        gl.texParameteri (gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
        gl.texParameteri (gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texImage2D    (gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, images[i]);
        gl.generateMipmap(gl.TEXTURE_2D);
    }

    state.bgColor = [0.529, 0.808, 0.922, 1.0];

    // (New): /////////////////////////////////////////
    // initialize keyboard events
    Input.initKeyEvents();

    // load modules (assuming these won't be reloaded for now for simplicity)
    state.gfx = await MR.dynamicImport(getPath("lib/graphics.js"));
    gfx = state.gfx;
    // module containing default camera/movement controllers
    state.MovementController = await MR.dynamicImport(
        getPath("lib/simple_movement_controller.js")
    );

    // week 9 K.P. VR controller object type, takes a controller + matrix
    state.OCTouchControllerHandler = await MR.dynamicImport(
        getPath("lib/MetaNook_OCtouchcontroller.js")
    ).ControllerHandler;

    // create a matrix stack
    state.m = new state.gfx.Matrix();
    m       = state.m;

    // generate cube vertices (other shapes in the library available in week9)
    state.cubeVertices = state.gfx.createCubeVertices();
    cubeVertices       = state.cubeVertices;

    state.noise = new ImprovedNoise();
    noise       = state.noise;

    // everything related to input in this sub-object
    state.input = {
        cursor     : ScreenCursor.trackCursor(MR.getCanvas()),
        turnAngle  : 0,
        cursorPrev : [0, 0, 0]
    }
    // create an instance of the default 
    // keyboard + mouse first-person controller
    state.userCam = new state.MovementController.BasicFirstPerson({
        startPosition  : [0.0, 0.0, 0.0],
        acceleration   : 100.0,
        maxSpeed       : 7
    });
    /////////////////////////////////////////
}

async function onReload(state) {
    // upon reload, these globals are wiped, 
    // so the references must be copied
    // from state
    gfx          = state.gfx;
    m            = state.m;
    cubeVertices = state.cubeVertices;
    noise        = state.noise;
}

const USE_OLD_MOUSE_CONTROLS = false;
function onStartFrame(t, state) {
    // (New): ///////////////////////////////
    // More time updates here to support the desktop cam,
    // update time and delta time
    let tStartMS = t;
    if (!state.tStart) {
        state.tStart = t;
        state.timeMS = t;
    }

    tStartMS = state.tStart;

    const timeNow = (t - tStartMS);

    // update time delta between frames (ms and s)
    state.deltaTimeMS = timeNow - state.timeMS;
    state.deltaTime   = state.deltaTimeMS / 1000.0;
    // update elapsed time (ms and s)
    state.timeMS = timeNow;
    state.time   = state.timeMS / 1000.0;

    const time      = state.time;
    const deltaTime = state.deltaTime;
    //////////////////////////////////////////////

    const input  = state.input;
    const cursor = input.cursor;

    // update keyboard controls
    Input.updateKeyState();
    // update left/right controller (based on KP hw 9)
    Input.updateControllerState();

    let cursorValue = () => {
       let p = cursor.position(), canvas = MR.getCanvas();
       return [ p[0] / canvas.clientWidth * 2 - 1, 1 - p[1] / canvas.clientHeight * 2, p[2] ];
    }
    
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.clearColor(state.bgColor[0], state.bgColor[1], state.bgColor[2], state.bgColor[3]);

    if (USE_OLD_MOUSE_CONTROLS) {
        let cursorXYZ = cursorValue();
        if (cursorXYZ[2] && input.cursorPrev[2]) {
            input.turnAngle += 2 * (cursorXYZ[0] - input.cursorPrev[0]);
        }
        input.cursorPrev = cursorXYZ;

        gl.uniform3fv(state.uCursorLoc, cursorXYZ);
    } else {

        // (New): update the desktop camera
        state.userCam.speed = 2;
        state.userCam.updateUsingDefaults(
            deltaTime, FRICTION, 
            Input, cursor, MR.getCanvas()
        );
    }

    gl.uniform1f (state.uTimeLoc, state.time);

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
}

function drawAvatar(id, pos, rot, scale, state) {
  let drawShape = (color, type, vertices, texture) => {
    gl.uniform3fv(state.uColorLoc, color);
    gl.uniformMatrix4fv(state.uModelLoc, false, m.value());
    // gl.uniform1i(state.uTexIndexLoc, texture === undefined ? -1 : texture);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array( vertices ), gl.STATIC_DRAW);
    gl.drawArrays(type, 0, vertices.length / VERTEX_SIZE);
 }
m.save();
  m.translate(pos[0],pos[1],pos[2]);
  m.rotateX(rot[0]);
  m.rotateY(rot[1]);
  m.rotateZ(rot[2]);
  m.scale(scale,scale,scale);
  drawShape([1,1,1], gl.TRIANGLES, MR.avatars[id].vertices, 1);
m.restore();
}

// (New): in onDraw there's a similar logic loop,
// so the logic in this basicDrawUsers can be taken for
// the extra cases
function drawUsers(m, state, drawOwnAvatarCallback, drawRemoteAvatarCallback) {
    const avatars = MR.avatars;
    drawOwnAvatarCallback    = drawOwnAvatarCallback    || function() {};
    drawRemoteAvatarCallback = drawRemoteAvatarCallback || function() {};

    // draw remote users
    for (let id in MR.avatars) {
        const user = MR.avatars[id];

        // draw self
        if (MR.playerid == avatars.playerid) {
            m.save();
            {

                // TODO use local information for drawing?
                if (MR.VRIsActive()) {

                } else {
                    // draw whatever you'd like on desktop
                }

                // param drawCallback takes a matrix and state and draws
                // the avatar however specified (e.g. pass a version of the drawAvatar
                // callback for the simple test)
                drawOwnAvatarCallback(m, state);
            
            }
            m.restore();

            continue;
        }

        // draw someone else
        m.save();
        {
            m.identity();

            // if desktop, render with the client-specific object
            // (in this example, the first-person camera position)
            const modeType = user.modeType;
            switch (modeType) {
            case "VR": {
                // TODO reuse drawAvatar params here?
                //m.translate(world.localWorldPosition);
                //m.rotateQ(world.localWorldOrientation);
                break;
            }
            // if VR, render self
            default: {
                /*
                TODO
                m.translate(userCam.position);

                m.rotateX(-userCam.rotateX);
                m.rotateY(-userCam.angle + userCam.rotateY);
                */
                break;       
            }
            }

            // param drawCallback takes a matrix and state and draws
            // the avatar however specified (e.g. pass a version of the drawAvatar
            // callback for the simple test)
            drawRemoteAvatarCallback(m, state);
        }
        m.restore();           
    }
}

function onDraw(t, projMat, viewMat, state, eyeIdx) {
    gl.uniformMatrix4fv(state.uViewLoc, false, new Float32Array(viewMat));
    gl.uniformMatrix4fv(state.uProjLoc, false, new Float32Array(projMat));
    let drawShape = (color, type, vertices, texture) => {
       gl.uniform3fv(state.uColorLoc, color);
       gl.uniformMatrix4fv(state.uModelLoc, false, m.value());
       gl.uniform1i(state.uTexIndexLoc, texture === undefined ? -1 : texture);
       gl.bufferData(gl.ARRAY_BUFFER, new Float32Array( vertices ), gl.STATIC_DRAW);
       gl.drawArrays(type, 0, vertices.length / VERTEX_SIZE);
    }

    const input = state.input;

    m.identity();
    m.rotateY(input.turnAngle);

    // (New): temporarily (to show it's working) 
    // when in non-VR mode,
    // always calculate the view matrix based on the user cam
    if (!MR.VRIsActive()) {
        // (New): this logic will probably be placed in 
        // one of the default functions from before
        const userCam = state.userCam;
        // you'd need to modify this function 
        // to use a different matrix library implementation
        gl.uniformMatrix4fv(state.uViewLoc, false, 
            userCam.calcViewMatrixUsingDefaultMatrixStack(m)
        );
    }

    // (New): show a remote viewpoint
    if (MR.viewpointController.shouldShowAlternativeView()) {
        // TODO calculate matrix of remote user
        // This is copied from part of the example draw users
        // function from before... maybe could be part of the same thing
        const user = MR.avatars[MR.viewpointController.playerid];

        // TODO move to function
        if (user) {
            m.save();
            {
                m.identity();

                // if desktop, render with the client-specific object
                // (in this example, the first-person camera position)
                const modeType = user.modeType;
                switch (modeType) {
                case "VR": {
                    // TODO reuse drawAvatar params here?
                    //m.translate(world.localWorldPosition);
                    //m.rotateQ(world.localWorldOrientation);
                    break;
                }
                default: {
                    /*
                    TODO
                    m.translate(userCam.position);

                    m.rotateX(-userCam.rotateX);
                    m.rotateY(-userCam.angle + userCam.rotateY);
                    */
                    break;       
                }
                }

                // TODO use the calculated view matrix for the remote user
                // This is how I previously did it:
                /*
                function calculateSelfOrPeerViewMatrix(M, viewMat, state) {
                    const world          = state.world;
                    const userCam        = world.userCam;
                    const remoteUserInfo = world.remoteUserInfo;
                    const activeplayerid   = MR.viewpointController.playerid;

                    // calculate the view matrix from your perspective -- non VR so it's
                    // using the fly camera again
                    if (activeplayerid == -1) {
                        Mat.rotateX(viewMat,
                            userCam.rotateX
                        );
                        Mat.rotateY(viewMat,
                            userCam.angle - userCam.rotateY
                        );
                        Mat.translate(viewMat, 
                            -userCam.position[0],
                            -userCam.position[1],
                            -userCam.position[2]
                        );
                    // calculate the view matrix from another user's perspective
                    } else {
                        
                        const userInfo = remoteUserInfo[activeplayerid];
                    
                        if (!userInfo.isVR) {
                            Mat.rotateX(viewMat,
                                userInfo.rotateX
                            );
                            Mat.rotateY(viewMat,
                                userInfo.angle - userInfo.rotateY
                            );
                            Mat.translate(viewMat, 
                                -userInfo.pos[0],
                                -userInfo.pos[1],
                                -userInfo.pos[2]
                            ); 
                        } else {
                            // WebVR uses quaternions for orientation

                            Mat.identity(fromQuatMat);

                            const quat = userInfo.angle;
                            fromQuat(fromQuatMat, quat);

                            Mat.inverse(fromQuatMat, fromQuatMat);

                            Mat.multiply(
                                viewMat,
                                fromQuatMat,
                                viewMat
                            );

                            Mat.translate(viewMat, 
                                -userInfo.pos[0],
                                -userInfo.pos[1],
                                -userInfo.pos[2]
                            );
                        }

                    }

                    return viewMat;
                }
                const altViewMatrix = calculateSelfOrPeerViewMatrix(m, state)
                */
                // gl.uniformMatrix4fv(state.uViewLoc, false, altViewMatrix);
            }
            m.restore();
        }
    }

    m.save();
       m.translate(0,-2,0);
       m.scale(6,.01,6);
       drawShape([1,1,1], gl.TRIANGLES, cubeVertices, 1);
    m.restore();

    for (let z = -3 ; z <= 3 ; z += 2)
    for (let x = -3 ; x <= 3 ; x += 2) {
       m.save();
          let y = Math.max(Math.abs(x),Math.abs(z)) / 3 - 1 +
            noise.noise(x, 0, 100 * z + state.time / 2) / 5;
          m.translate(x, y, z);
          m.scale(.3,.3,.3);
          drawShape([1,1,1], gl.TRIANGLES, cubeVertices, 0);
       m.restore();
    }

    //Cube that represents avatar.
    // uncomment three following three lines once testing off headset is done
     if (MR.VRIsActive()) {
      let frameData = MR.frameData();
      if (frameData != null) {
        for (let id in MR.avatars) {

          // if (!headsetPos) {
            
          //   console.log(id);
          //   console.log("not defined");
          // }
          // if self
          if(MR.playerid == MR.avatars[id].playerid) {

            let headsetPos = frameData.pose.position;
            let headsetRot = frameData.pose.orientation;

            const rcontroller = MR.controllers[0];
            const lcontroller = MR.controllers[1];
            //console.log("user");
            //console.log(headsetPos);
            //console.log(headsetRot);

            drawAvatar(id, headsetPos, headsetRot, .1, state);
            drawAvatar(id, rcontroller.pose.position, rcontroller.pose.orientation, 0.05, state);
            drawAvatar(id, lcontroller.pose.position, lcontroller.pose.orientation, 0.05, state);
            // m.save();
            //   m.translate(headsetPos[0],headsetPos[1],headsetPos[2]);
            //   m.rotateX(headsetRot[0]);
            //   m.rotateY(headsetRot[1]);
            //   m.rotateZ(headsetRot[2]);
            //   m.scale(.1,.1,.1);
            //   drawShape([1,1,1], gl.TRIANGLES, MR.avatars[id].vertices, 1);
            // m.restore();

          // if not self
          } else {
            let headsetPos = MR.avatars[id].translate;
            let headsetRot = MR.avatars[id].rotate;
            if (typeof headsetPos == 'undefined') {
              console.log(id);
              console.log("not defined");
            }
            //console.log("other user");
            // console.log(headsetPos);
            // console.log(headsetRot);
            //console.log(MR.avatars[id]);
            const rcontroller = MR.avatars[id].rightController;
            const lcontroller = MR.avatars[id].leftController;
            //console.log("user");
            //console.log(headsetPos);
            //console.log(headsetRot);
            drawAvatar(id, headsetPos, headsetRot, .1, state);
            drawAvatar(id, rcontroller.translate, rcontroller.rotate, 0.05, state);
            drawAvatar(id, lcontroller.translate, lcontroller.rotate, 0.05, state);
          }
        
        }

    }
  } 
  // else {
  //   for (let id in MR.avatars) {
  //     let headsetPos = MR.avatars[id].translate;
  //     let headsetRot = MR.avatars[id].rotate;
  //     if (!headsetPos) {
        
  //       console.log(id);
  //       console.log("not defined");
  //     }
  //     if(MR.playerid == MR.avatars[id].playerid){

  //       // let headsetPos = frameData.pose.position;
  //       // let headsetRot = frameData.pose.orientation;
  //       //console.log("user");
  //       //console.log(headsetPos);
  //       //console.log(headsetRot);
  //       m.save();
  //         m.translate(headsetPos[0],headsetPos[1],headsetPos[2]);
  //         m.rotateX(headsetRot[0]);
  //         m.rotateY(headsetRot[1]);
  //         m.rotateZ(headsetRot[2]);
  //         m.scale(.3,.3,.3);
  //         drawShape([1,1,1], gl.TRIANGLES, MR.avatars[id].vertices, 1);
  //       m.restore();
  //     }
  //     else{
        
  //       //console.log("other user");
  //       // console.log(headsetPos);
  //       // console.log(headsetRot);

  //       m.save();
  //         m.translate(headsetPos[0],headsetPos[1],headsetPos[2]);
  //         m.rotateX(headsetRot[0]);
  //         m.rotateY(headsetRot[1]);
  //         m.rotateZ(headsetRot[2]);
  //         m.scale(.3,.3,.3);
  //         drawShape([1,1,1], gl.TRIANGLES, MR.avatars[id].vertices, 1);
  //       m.restore();
  //     }
    
  //   }
  // }

}

function onEndFrame(t, state) {
  //synchronize objects
  syncAvatarData();

  //Objects
  //Sample message:
  const response = {
     type: "object",
     uid: 0,
     lockid: 0,
     state:{
     pos: [0,0,0],
     rot: [0,0,0],
     }
  };
  
  // // Lock
  // //Sample message:
  // const response = {
  //   type: "lock",
  //   uid: 0,
  //   lockid: 0
  // };

  // // Release
  // //Sample message:
  // const response = {
  //   type: "release",
  //   uid: 0,
  //   lockid: 0
  // };

  // // Calibration
  // // Sample message:
  // you should use 2 points, 2 known anchors in your world (fixedPoints) that map to real space and 2 points that represent your clicks in world space (inputPoints)
  // const response = {
    // type: "calibrate",
    // fixedPoints: [],
    // inputPoints: []
  // }

  // MR.syncClient.ws.send(JSON.stringify(response));
  // FAKE STAND IN FOR DEBUGGING, remove once we have real data
  // if(MR.playerid == -1) {
  //   return;
  // }

  // const headsetPos = [Math.sin(Date.now()), 0.0, 0.0];
  // const headsetRot = [Math.sin(Date.now()), 0.0, 0.0];
  //   const avatar_message = {
  //     type: "avatar",
  //     user: MR.playerid,
  //     state: {
  //       pos: headsetPos,
  //       rot: headsetRot
  //     }
  //   };

  //   try {
  //     MR.syncClient.send(avatar_message);
  //   } catch(err) {
  //     console.log(err);
  //   }
  //   // console.log(avatar_message);

}

export default function main() {
    const def = {
        name         : 'week8 views',
        setup        : setup,
        onStartFrame : onStartFrame,
        onEndFrame   : onEndFrame,
        onDraw       : onDraw,
        onReload     : onReload,
    };

    return def;
}

