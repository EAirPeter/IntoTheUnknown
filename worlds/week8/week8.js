"use strict"
////////////////////////////// MATRIX SUPPORT

let cos = t => Math.cos(t);
let sin = t => Math.sin(t);
let identity = ()       => [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];
let rotateX = t         => [1,0,0,0, 0,cos(t),sin(t),0, 0,-sin(t),cos(t),0, 0,0,0,1];
let rotateY = t         => [cos(t),0,-sin(t),0, 0,1,0,0, sin(t),0,cos(t),0, 0,0,0,1];
let rotateZ = t         => [cos(t),sin(t),0,0, -sin(t),cos(t),0,0, 0,0,1,0, 0,0,0,1];
let scale = (x,y,z)     => [x,0,0,0, 0,y,0,0, 0,0,z,0, 0,0,0,1];
let translate = (x,y,z) => [1,0,0,0, 0,1,0,0, 0,0,1,0, x,y,z,1];
let multiply = (a, b)   => {
   let c = [];
   for (let n = 0 ; n < 16 ; n++)
      c.push( a[n&3     ] * b[    n&12] +
              a[n&3 |  4] * b[1 | n&12] +
              a[n&3 |  8] * b[2 | n&12] +
              a[n&3 | 12] * b[3 | n&12] );
   return c;
}

let Matrix = function() {
   let topIndex = 0,
       stack = [ identity() ],
       getVal = () => stack[topIndex],
       setVal = m => stack[topIndex] = m;

   this.identity  = ()      => setVal(identity());
   this.restore   = ()      => --topIndex;
   this.rotateX   = t       => setVal(multiply(getVal(), rotateX(t)));
   this.rotateY   = t       => setVal(multiply(getVal(), rotateY(t)));
   this.rotateZ   = t       => setVal(multiply(getVal(), rotateZ(t)));
   this.save      = ()      => stack[++topIndex] = stack[topIndex-1].slice();
   this.scale     = (x,y,z) => setVal(multiply(getVal(), scale(x,y,z)));
   this.translate = (x,y,z) => setVal(multiply(getVal(), translate(x,y,z)));
   this.value     = ()      => getVal();
}

////////////////////////////// SUPPORT FOR CREATING 3D SHAPES

// const VERTEX_SIZE = 8;

let createCubeVertices = () => {
   let V = [], P = [ -1,-1, 1, 0,0, 1, 0,0,   1, 1, 1, 0,0, 1, 1,1,  -1, 1, 1, 0,1, 1, 0,1,
                      1, 1, 1, 0,0, 1, 1,1,  -1,-1, 1, 0,0, 1, 0,0,   1,-1, 1, 0,0, 1, 1,0,
                      1, 1,-1, 0,0,-1, 0,0,  -1,-1,-1, 0,0,-1, 1,1,  -1, 1,-1, 0,0,-1, 1,0,
                     -1,-1,-1, 0,0,-1, 1,1,   1, 1,-1, 0,0,-1, 0,0,   1,-1,-1, 0,0,-1, 0,1 ];
   for (let n = 0 ; n < 3 ; n++)
      for (let i = 0 ; i < P.length ; i += 8) {
         let p0 = [P[i],P[i+1],P[i+2]], p1 = [P[i+3],P[i+4],P[i+5]], uv = [P[i+6],P[i+7]];
	 V = V.concat(p0).concat(p1).concat(uv);
	 for (let j = 0 ; j < 3 ; j++) {
	    P[i   + j] = p0[(j+1) % 3];
	    P[i+3 + j] = p1[(j+1) % 3];
         }
      }
   return V;
}
let cubeVertices = createCubeVertices();

////////////////////////////// SCENE SPECIFIC CODE

async function setup(state) {
    hotReloadFile(getPath('week8.js'));

    const images = await imgutil.loadImagesPromise([
       getPath("textures/brick.png"),
       getPath("textures/tiles.jpg"),
    ]);

    let libSources = await MREditor.loadAndRegisterShaderLibrariesForLiveEditing(gl, "libs", [
        { key : "pnoise"    , path : "shaders/noise.glsl"     , foldDefault : true },
        { key : "sharedlib1", path : "shaders/sharedlib1.glsl", foldDefault : true },      
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

    state.cursor = ScreenCursor.trackCursor(MR.getCanvas());

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

    this.audioContext = new SpatialAudioContext([
      'https://raw.githubusercontent.com/bmahlbrand/wav/master/internet7-16.wav',
      'https://raw.githubusercontent.com/bmahlbrand/wav/master/SuzVega-16.wav',
      'assets/audio/Blop-Mark_DiAngelo-79054334.wav'
    ]);

    // TODO: stupid hack for testing, since user must interact before context is unsuspended, figure out something clean
    document.querySelector('body').addEventListener('click', () => {
      this.audioContext.playFileAt('assets/audio/Blop-Mark_DiAngelo-79054334.wav', {x: 0, y: 0, z: 0}, {x: 0, y: 0, z: 0}, {x: 0, y: 0, z: 0}, {x: 0, y: 0, z: 0});
      
      this.audioContext.resume().then(() => {
        console.log('Playback resumed successfully');
      });
      
    });

}

let noise = new ImprovedNoise();
let m = new Matrix();
let turnAngle = 0, cursorPrev = [0,0,0];

function onStartFrame(t, state) {
    if (! state.tStart)
        state.tStart = t;
    state.time = (t - state.tStart) / 1000;

    let cursorValue = () => {
       let p = state.cursor.position(), canvas = MR.getCanvas();
       return [ p[0] / canvas.clientWidth * 2 - 1, 1 - p[1] / canvas.clientHeight * 2, p[2] ];
    }
    
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.clearColor(state.bgColor[0], state.bgColor[1], state.bgColor[2], state.bgColor[3]);


    let cursorXYZ = cursorValue();
    if (cursorXYZ[2] && cursorPrev[2])
        turnAngle += 2 * (cursorXYZ[0] - cursorPrev[0]);
    cursorPrev = cursorXYZ;

    gl.uniform3fv(state.uCursorLoc     , cursorXYZ);
    gl.uniform1f (state.uTimeLoc       , state.time);

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

    m.identity();
    m.rotateY(turnAngle);

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

     if (MR.VRIsActive()) {
      let frameData = MR.frameData();
      if (frameData != null) {
        for (let id in MR.avatars) {

          if(MR.playerid == MR.avatars[id].playerid && MR.avatars[id].mode == MR.UserType.vr){
            let frameData = MR.frameData();
            if (frameData != null) {
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
            }
            // m.save();
            //   m.translate(headsetPos[0],headsetPos[1],headsetPos[2]);
            //   m.rotateX(headsetRot[0]);
            //   m.rotateY(headsetRot[1]);
            //   m.rotateZ(headsetRot[2]);
            //   m.scale(.1,.1,.1);
            //   drawShape([1,1,1], gl.TRIANGLES, MR.avatars[id].vertices, 1);
            // m.restore();
          } else if(MR.avatars[id].mode == MR.UserType.vr) {
            let headsetPos = MR.avatars[id].position;
            let headsetRot = MR.avatars[id].orientation;
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
            drawAvatar(id, rcontroller.position, rcontroller.orientation, 0.05, state);
            drawAvatar(id, lcontroller.position, lcontroller.orientation, 0.05, state);
          }
        
        }
      }
    }
}

function onEndFrame(t, state) {
  //synchronize objects
  pollAvatarData();

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

  // this.audioContext.playFileAt()
  this.audioContext.resume();
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
        name         : 'week8',
        setup        : setup,
        onStartFrame : onStartFrame,
        onEndFrame   : onEndFrame,
        onDraw       : onDraw,
    };

    return def;
}