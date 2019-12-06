"use strict"

/*--------------------------------------------------------------------------------

The proportions below just happen to match the dimensions of my physical space
and the tables in that space.

Note that I measured everything in inches, and then converted to units of meters
(which is what VR requires) by multiplying by 0.0254.

--------------------------------------------------------------------------------*/

const inchesToMeters = inches => inches * 0.0254;
const metersToInches = meters => meters / 0.0254;

const EYE_HEIGHT       = inchesToMeters( 69);
const HALL_LENGTH      = inchesToMeters(306);
const HALL_WIDTH       = inchesToMeters(215);
const RING_RADIUS      = 0.0425;
const TABLE_DEPTH      = inchesToMeters( 30);
const TABLE_HEIGHT     = inchesToMeters( 29);
const TABLE_WIDTH      = inchesToMeters( 60);
const TABLE_THICKNESS  = inchesToMeters( 11/8);
const LEG_THICKNESS    = inchesToMeters(  2.5);

let enableModeler = true;

/*Example Grabble Object*/
let grabbableCube = new Obj(CG.torus);

let lathe = CG.createMeshVertices(10, 16, CG.uvToLathe,
             [ CG.bezierToCubic([-1.0,-1.0,-0.7,-0.3,-0.1 , 0.1, 0.3 , 0.7 , 1.0 ,1.0]),
               CG.bezierToCubic([ 0.0, 0.5, 0.8, 1.1, 1.25, 1.4, 1.45, 1.55, 1.7 ,0.0]) ]);
// let lathe = CG.cube;
////////////////////////////// SCENE SPECIFIC CODE

const WOOD = 0,
      TILES = 1,
      NOISY_BUMP = 2;

let noise = new ImprovedNoise();
let m = new Matrix();

/*--------------------------------------------------------------------------------

I wrote the following to create an abstraction on top of the left and right
controllers, so that in the onStartFrame() function we can detect press()
and release() events when the user depresses and releases the trigger.

The field detecting the trigger being pressed is buttons[1].pressed.
You can detect pressing of the other buttons by replacing the index 1
by indices 0 through 5.

You might want to try more advanced things with the controllers.
As we discussed in class, there are many more fields in the Gamepad object,
such as linear and angular velocity and acceleration. Using the browser
based debugging tool, you can do something like console.log(leftController)
to see what the options are.

--------------------------------------------------------------------------------*/

function HeadsetHandler(headset) {
   this.orientation = () => headset.pose.orientation;
   this.position    = () => headset.pose.position;
}

function ControllerHandler(controller) {
   this.isDown      = () => controller.buttons[1].pressed;
   this.onEndFrame  = () => wasDown = this.isDown();
   this.orientation = () => controller.pose.orientation;
   this.position    = () => controller.pose.position;
   this.press       = () => ! wasDown && this.isDown();
   this.release     = () => wasDown && ! this.isDown();
   this.tip         = () => {
      let P = this.position();          // THIS CODE JUST MOVES
      m.identity();                     // THE "HOT SPOT" OF THE
      m.translate(P);                   // CONTROLLER TOWARD ITS
      m.rotateQ(this.orientation());    // FAR TIP (FURTHER AWAY
      m.translate(0,0,-.03);            // FROM THE USER'S HAND).
      let v = m.value();
      return [v[12],v[13],v[14]];
   }
   this.center = () => {
      let P = this.position();
      m.identity();
      m.translate(P);
      m.rotateQ(this.orientation());
      m.translate(0,.02,-.005);
      let v = m.value();
      return [v[12],v[13],v[14]];
   }
   let wasDown = false;
}

// (New Info): constants can be reloaded without worry
// let VERTEX_SIZE = 8;

// (New Info): temp save modules as global "namespaces" upon loads
// let gfx;

// (New Info):
// handle reloading of imports (called in setup() and in onReload())
async function initCommon(state) {
   // (New Info): use the previously loaded module saved in state, use in global scope
   // TODO automatic re-setting of loaded libraries to reduce boilerplate?
   // gfx = state.gfx;
   // state.m = new CG.Matrix();
   // noise = state.noise;
}

// (New Info):
async function onReload(state) {
   // called when this file is reloaded
   // re-initialize imports, objects, and state here as needed
   await initCommon(state);

   // Note: you can also do some run-time scripting here.
   // For example, do some one-time modifications to some objects during
   // a performance, then remove the code before subsequent reloads
   // i.e. like coding in the browser console
}

// (New Info):
async function onExit(state) {
   // called when world is switched
   // de-initialize / close scene-specific resources here
   console.log("Goodbye! =)");
}

async function setup(state) {
   hotReloadFile(getPath('week10.js'));
   // (New Info): Here I am loading the graphics module once
   // This is for the sake of example:
   // I'm making the arbitrary decision not to support
   // reloading for this particular module. Otherwise, you should
   // do the import in the "initCommon" function that is also called
   // in onReload, just like the other import done in initCommon
   // the gfx module is saved to state so I can recover it
   // after a reload
   // state.gfx = await MR.dynamicImport(getPath('lib/graphics.js'));
   state.noise = new ImprovedNoise();
   await initCommon(state);

   // (New Info): input state in a sub-object that can be cached
   // for convenience
   // e.g. const input = state.input; 
   state.input = {
      turnAngle : 0,
      tiltAngle : 0,
      cursor : ScreenCursor.trackCursor(MR.getCanvas()),
      cursorPrev : [0,0,0],
      LC : null,
      RC : null
   }

   // I propose adding a dictionary mapping texture strings to locations, so that drawShapes becomes clearer
   const images = await imgutil.loadImagesPromise([
      getPath("textures/wood.png"),
      getPath("textures/tiles.jpg"),
      getPath("textures/noisy_bump.jpg")
   ]);

   let libSources = await MREditor.loadAndRegisterShaderLibrariesForLiveEditing(gl, "libs", [
      { key : "pnoise"    , path : "shaders/noise.glsl"     , foldDefault : true },
      { key : "sharedlib1", path : "shaders/sharedlib1.glsl", foldDefault : true },      
   ]);
   if (! libSources)
      throw new Error("Could not load shader library");

   function onNeedsCompilationDefault(args, libMap, userData) {
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
   }

   // load vertex and fragment shaders from the server, register with the editor
   let shaderSource = await MREditor.loadAndRegisterShaderForLiveEditing(
      gl,
      "mainShader",
      {   
         // (New Info): example of how the pre-compilation function callback
         // could be in the standard library instead if I put the function defintion
         // elsewhere
         onNeedsCompilationDefault : onNeedsCompilationDefault,
         onAfterCompilation : (program) => {
               gl.useProgram(state.program = program);
               state.uColorLoc    = gl.getUniformLocation(program, 'uColor');
               state.uCursorLoc   = gl.getUniformLocation(program, 'uCursor');
               state.uModelLoc    = gl.getUniformLocation(program, 'uModel');
               state.uProjLoc     = gl.getUniformLocation(program, 'uProj');
               state.uTexScale    = gl.getUniformLocation(program, 'uTexScale');
               state.uTexIndexLoc = gl.getUniformLocation(program, 'uTexIndex');
               state.uTimeLoc     = gl.getUniformLocation(program, 'uTime');
               state.uToonLoc     = gl.getUniformLocation(program, 'uToon');
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

   let aTan = gl.getAttribLocation(state.program, 'aTan');
   gl.enableVertexAttribArray(aTan);
   gl.vertexAttribPointer(aTan, 3, gl.FLOAT, false, bpe * VERTEX_SIZE, bpe * 6);

   let aUV  = gl.getAttribLocation(state.program, 'aUV');
   gl.enableVertexAttribArray(aUV);
   gl.vertexAttribPointer(aUV , 2, gl.FLOAT, false, bpe * VERTEX_SIZE, bpe * 9);


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

   // (New Info): editor state in a sub-object that can be cached
   // for convenience
   // e.g. const editor = state.editor; 
   // state.editor = {
   //     menuShape : [gfx.cube, gfx.sphere, gfx.cylinder, gfx.torus],
   //     objs : [],
   //     menuChoice : -1,
   //     enableModeler : false
   // };

   state.calibrationCount = 0;

   Input.initKeyEvents();

   // load files into a spatial audio context for playback later - the path will be needed to reference this source later
   this.audioContext1 = new SpatialAudioContext([
   'assets/audio/blop.wav'
   ]);

   this.audioContext2 = new SpatialAudioContext([
   'assets/audio/peacock.wav'
   ]);


   /************************************************************************

   Here we show an example of how to create a grabbable object.
   First instatiate object using Obj() constructor, and add the following  
   variables. Then send a spawn message. This will allow the server to keep
   track of objects that need to be synchronized.

   ************************************************************************/

   MR.objs.push(grabbableCube);
   grabbableCube.position    = [0,0,-0.5].slice();
   grabbableCube.orientation = [1,0,0,1].slice();
   grabbableCube.uid = 0;
   grabbableCube.lock = new Lock();
   sendSpawnMessage(grabbableCube);
}

/************************************************************************

This is an example of a spawn message we send to the server.

************************************************************************/

function sendSpawnMessage(object){
   const response = 
      {
         type: "spawn",
         uid: object.uid,
         lockid: -1,
         state: {
            position: object.position,
            orientation: object.orientation,
         }
      };

   MR.syncClient.send(response);
}

function onStartFrame(t, state) {

   /*-----------------------------------------------------------------

   Whenever the user enters VR Mode, create the left and right
   controller handlers.

   Also, for my particular use, I have set up a particular transformation
   so that the virtual room would match my physical room, putting the
   resulting matrix into state.calibrate. If you want to do something
   similar, you would need to do a different calculation based on your
   particular physical room.

   -----------------------------------------------------------------*/

   const input  = state.input;
   const editor = state.editor;

   if (! state.avatarMatrixForward) {
      // MR.avatarMatrixForward is because i need accesss to this in callback.js, temp hack
      MR.avatarMatrixForward = state.avatarMatrixForward = CG.matrixIdentity();
      MR.avatarMatrixInverse = state.avatarMatrixInverse = CG.matrixIdentity();
   } 

   if (MR.VRIsActive()) {
      if (!input.HS) input.HS = new HeadsetHandler(MR.headset);
      if (!input.LC) input.LC = new ControllerHandler(MR.leftController);
      if (!input.RC) input.RC = new ControllerHandler(MR.rightController);

      if (! state.calibrate) {
         m.identity();
         m.rotateY(Math.PI/2);
         m.translate(-2.01,.04,0);
         state.calibrate = m.value().slice();
      }
   }

   if (! state.tStart)
      state.tStart = t;
   state.time = (t - state.tStart) / 1000;

    // THIS CURSOR CODE IS ONLY RELEVANT WHEN USING THE BROWSER MOUSE, NOT WHEN IN VR MODE.

   let cursorValue = () => {
      let p = state.cursor.position(), canvas = MR.getCanvas();
      return [ p[0] / canvas.clientWidth * 2 - 1, 1 - p[1] / canvas.clientHeight * 2, p[2] ];
   }

   let cursorXYZ = cursorValue();
   if (state.cursorPrev === undefined)
      state.cursorPrev = [0,0,0];
   if (state.turnAngle === undefined)
      state.turnAngle = state.tiltAngle = 0;
   if (cursorXYZ[2] && state.cursorPrev[2]) {
      state.turnAngle -= Math.PI/2 * (cursorXYZ[0] - state.cursorPrev[0]);
      state.tiltAngle += Math.PI/2 * (cursorXYZ[1] - state.cursorPrev[1]);
   }
   state.cursorPrev = cursorXYZ;

   if (state.position === undefined)
      state.position = [0,0,0];
   let fx = -.01 * Math.sin(state.turnAngle),
       fz =  .01 * Math.cos(state.turnAngle);
   if (Input.keyIsDown(Input.KEY_UP)) {
      state.position[0] += fx;
      state.position[2] += fz;
   }
   if (Input.keyIsDown(Input.KEY_DOWN)) {
      state.position[0] -= fx;
      state.position[2] -= fz;
   }

// SET UNIFORMS AND GRAPHICAL STATE BEFORE DRAWING.

   gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
   gl.clearColor(0.0, 0.0, 0.0, 1.0);

   gl.uniform3fv(state.uCursorLoc, cursorXYZ);
   gl.uniform1f (state.uTimeLoc  , state.time);

   gl.enable(gl.DEPTH_TEST);
   gl.enable(gl.CULL_FACE);

   /*-----------------------------------------------------------------

   Below is the logic for my little toy geometric modeler example.
   You should do something more or different for your assignment. 
   Try modifying the size or color or texture of objects. Try
   deleting objects or adding constraints to make objects align
   when you bring them together. Try adding controls to animate
   objects. There are lots of possibilities.

   -----------------------------------------------------------------*/
   if (enableModeler && input.LC) {
      if (input.RC.isDown()) {
         menuChoice = findInMenu(input.RC.position(), input.LC.tip());
         if (menuChoice >= 0 && input.LC.press()) {
            state.isNewObj = true;
               let newObject = new Obj(menuShape[menuChoice]);
               /*Should you want to support grabbing, refer to the
               above example in setup()*/ 
            MR.objs.push(newObject);
               sendSpawnMessage(newObject);
         }
      }
      if (state.isNewObj) {
         let obj = MR.objs[MR.objs.length - 1];
         obj.position    = input.LC.tip().slice();
         obj.orientation = input.LC.orientation().slice();
         //Create lock object for each new obj.
         obj.lock = new Lock();
      }
      if (input.LC.release())
         state.isNewObj = false;
   }

   if (input.LC) {
      let LP = input.LC.center();
      let RP = input.RC.center();
      let D  = CG.subtract(LP, RP);
      let d  = metersToInches(CG.norm(D));
      let getX = C => {
         m.save();
            m.identity();
            m.rotateQ(CG.matrixFromQuaternion(C.orientation()));
            m.rotateX(.75);
            let x = (m.value())[1];
         m.restore();
         return x;
      }
      let lx = getX(input.LC);
      let rx = getX(input.RC);
      let sep = metersToInches(TABLE_DEPTH - 2 * RING_RADIUS);
      if (d >= sep - 1 && d <= sep + 1 && Math.abs(lx) < .03 && Math.abs(rx) < .03) {
         if (state.calibrationCount === undefined)
            state.calibrationCount = 0;
         if (++state.calibrationCount == 30) {
            m.save();
               m.identity();
               m.translate(CG.mix(LP, RP, .5));
               m.rotateY(Math.atan2(D[0], D[2]) + Math.PI/2);
               m.translate(-2.35,1.00,-.72);
               state.avatarMatrixForward = CG.matrixInverse(m.value());
               state.avatarMatrixInverse = m.value();
            m.restore();
            state.calibrationCount = 0;
         }
      }
   }

    /*-----------------------------------------------------------------

    This function releases stale locks. Stale locks are locks that
    a user has already lost ownership over by letting go

    -----------------------------------------------------------------*/

    releaseLocks(state);

    /*-----------------------------------------------------------------

    This function checks for intersection and if user has ownership over 
    object then sends a data stream of position and orientation.

    -----------------------------------------------------------------*/

    pollGrab(state);
}

let menuX = [-.2,-.1,-.2,-.1];
let menuY = [ .1, .1,  0,  0];
let menuShape = [ CG.cube, CG.sphere, CG.cylinder, CG.torus ];
let menuChoice = -1;

/*-----------------------------------------------------------------

If the controller tip is near to a menu item, return the index
of that item. If the controller tip is not near to any menu
item, return -1.

mp == position of the menu origin (position of the right controller).
p  == the position of the left controller tip.

-----------------------------------------------------------------*/

let findInMenu = (mp, p) => {
   let x = p[0] - mp[0];
   let y = p[1] - mp[1];
   let z = p[2] - mp[2];
   for (let n = 0 ; n < 4 ; n++) {
      let dx = x - menuX[n];
      let dy = y - menuY[n];
      let dz = z;
      if (dx * dx + dy * dy + dz * dz < .03 * .03)
         return n;
   }
   return -1;
}

function Obj(shape) {
   this.shape = shape;
};


function onDraw(t, projMat, viewMat, state, eyeIdx) {
   m.identity();
   m.rotateX(state.tiltAngle);
   m.rotateY(state.turnAngle);
   let P = state.position;
   m.translate(P[0],P[1],P[2]);

   m.save();
      myDraw(t, projMat, viewMat, state, eyeIdx, false);
   m.restore();

   m.save();
      m.translate(HALL_WIDTH/2 - TABLE_DEPTH/2, -TABLE_HEIGHT*1.048, TABLE_WIDTH/6.7);
      m.rotateY(Math.PI);
      m.scale(.1392);
      myDraw(t, projMat, viewMat, state, eyeIdx, true);
   m.restore();
}

function myDraw(t, projMat, viewMat, state, eyeIdx, isMiniature) {
   viewMat = CG.matrixMultiply(viewMat, state.avatarMatrixInverse);
   gl.uniformMatrix4fv(state.uViewLoc, false, new Float32Array(viewMat));
   gl.uniformMatrix4fv(state.uProjLoc, false, new Float32Array(projMat));

   let prev_shape = null;

   const input  = state.input;

    /*-----------------------------------------------------------------

    The drawShape() function below is optimized in that it only downloads
    new vertices to the GPU if the vertices (the "shape" argument) have
    changed since the previous call.

    Also, currently we only draw gl.TRIANGLES if this is a cube. In all
    other cases, we draw gl.TRIANGLE_STRIP. You might want to change
    this if you create other kinds of shapes that are not triangle strips.

    -----------------------------------------------------------------*/

   let drawShape = (shape, color, texture, textureScale) => {
      gl.uniform4fv(state.uColorLoc, color.length == 4 ? color : color.concat([1]));
      gl.uniformMatrix4fv(state.uModelLoc, false, m.value());
      gl.uniform1i(state.uTexIndexLoc, texture === undefined ? -1 : texture);
      gl.uniform1f(state.uTexScale, textureScale === undefined ? 1 : textureScale);
      if (shape != prev_shape)
         gl.bufferData(gl.ARRAY_BUFFER, new Float32Array( shape ), gl.STATIC_DRAW);
      if (state.isToon) {
         gl.uniform1f (state.uToonLoc, .3 * CG.norm(m.value().slice(0,3)));
         gl.cullFace(gl.FRONT);
         gl.drawArrays(shape == CG.cube ? gl.TRIANGLES : gl.TRIANGLE_STRIP, 0, shape.length / VERTEX_SIZE);
         gl.cullFace(gl.BACK);
         gl.uniform1f (state.uToonLoc, 0);
      }
      gl.drawArrays(shape == CG.cube ? gl.TRIANGLES : gl.TRIANGLE_STRIP, 0, shape.length / VERTEX_SIZE);
      prev_shape = shape;
   }

   let drawAvatar = (avatar, pos, rot, scale, state) => {
      m.save();
      //   m.identity();
         m.translate(pos[0],pos[1],pos[2]);
         m.rotateQ(rot);
         m.scale(scale,scale,scale);
         drawShape(avatar.headset.vertices, [1,1,1], 0);
      m.restore();
   }

    /*-----------------------------------------------------------------

    In my little toy geometric modeler, the pop-up menu of objects only
    appears while the right controller trigger is pressed. This is just
    an example. Feel free to change things, depending on what you are
    trying to do in your homework.

    -----------------------------------------------------------------*/

   let showMenu = p => {
      let x = p[0], y = p[1], z = p[2];
      for (let n = 0 ; n < 4 ; n++) {
         m.save();
            m.multiply(state.avatarMatrixForward);
            m.translate(x + menuX[n], y + menuY[n], z);
            m.scale(.03, .03, .03);
            drawShape(menuShape[n], n == menuChoice ? [1,.5,.5] : [1,1,1]);
         m.restore();
      }
   }

    /*-----------------------------------------------------------------

    drawTable() just happens to model the physical size and shape of the
    tables in my lab (measured in meters). If you want to model physical
    furniture, you will probably want to do something different.

    -----------------------------------------------------------------*/

   let drawTable = id => {
      m.save();
         m.translate(0, TABLE_HEIGHT - TABLE_THICKNESS/2, 0);
         m.scale(TABLE_DEPTH/2, TABLE_THICKNESS/2, TABLE_WIDTH/2);
         drawShape(CG.cube, [1,1,1], 0);
      m.restore();
      m.save();
         let h  = (TABLE_HEIGHT - TABLE_THICKNESS) / 2;
         let dx = (TABLE_DEPTH  - LEG_THICKNESS  ) / 2;
         let dz = (TABLE_WIDTH  - LEG_THICKNESS  ) / 2;
         for (let x = -dx ; x <= dx ; x += 2 * dx)
         for (let z = -dz ; z <= dz ; z += 2 * dz) {
            m.save();
               m.translate(x, h, z);
               m.scale(LEG_THICKNESS/2, h, LEG_THICKNESS/2);
               drawShape(CG.cube, [.5,.5,.5]);
            m.restore();
         }
      m.restore();
   }

    /*-----------------------------------------------------------------

    The below is just my particular "programmer art" for the size and
    shape of a controller. Feel free to create a different appearance
    for the controller. You might also want the controller appearance,
    as well as the way it animates when you press the trigger or other
    buttons, to change with different functionality.

    For example, you might want to have one appearance when using it as
    a selection tool, a resizing tool, a tool for drawing in the air,
    and so forth.

    -----------------------------------------------------------------*/
    
   let drawHeadset = (position, orientation) => {
      //  let P = HS.position();'
      let P = position;

      m.save();
         m.multiply(state.avatarMatrixForward);
         m.translate(P[0],P[1],P[2]);
         m.rotateQ(orientation);
         m.scale(.1);
         m.save();
            m.scale(1,1.5,1);
            drawShape(CG.sphere, [0,0,0]);
         m.restore();
         for (let s = -1 ; s <= 1 ; s += 2) {
            m.save();
               m.translate(s*.4,.2,-.8);
               m.scale(.4,.4,.1);
               drawShape(CG.sphere, [10,10,10]);
            m.restore();
         }
      m.restore();
   }

   let drawController = (C, hand) => {
      let P = C.position();
      m.save();
         m.multiply(state.avatarMatrixForward);
         m.translate(P[0],P[1],P[2]);
         m.rotateQ(C.orientation());
         m.translate(0,.02,-.005);
         m.rotateX(.75);
         m.save();
            m.translate(0,0,-.0095).scale(.004,.004,.003);
            drawShape(CG.sphere, C.isDown() ? [10,0,0] : [.5,0,0]);
         m.restore();
         m.save();
            m.translate(0,0,-.01).scale(.04,.04,.13);
            drawShape(CG.torus1, [0,0,0]);
         m.restore();
         m.save();
            m.translate(0,-.0135,-.008).scale(.04,.0235,.0015);
            drawShape(CG.cylinder, [0,0,0]);
         m.restore();
         m.save();
            m.translate(0,-.01,.03).scale(.012,.02,.037);
            drawShape(CG.cylinder, [0,0,0]);
         m.restore();
         m.save();
            m.translate(0,-.01,.067).scale(.012,.02,.023);
            drawShape(CG.sphere, [0,0,0]);
         m.restore();
      m.restore();
   }

   let drawSyncController = (pos, rot, color) => {
      let P = pos;
      m.save();
      // m.identity();
         m.translate(P[0], P[1], P[2]);
         m.rotateQ(rot);
         m.translate(0,.02,-.005);
         m.rotateX(.75);
         m.save();
               m.translate(0,0,-.0095).scale(.004,.004,.003);
         m.restore();
         m.save();
               m.translate(0,0,-.01).scale(.04,.04,.13);
               drawShape(CG.torus1, [0,0,0]);
         m.restore();
         m.save();
               m.translate(0,-.0135,-.008).scale(.04,.0235,.0015);
               drawShape(CG.cylinder, [0,0,0]);
         m.restore();
         m.save();
               m.translate(0,-.01,.03).scale(.012,.02,.037);
               drawShape(CG.cylinder, [0,0,0]);
         m.restore();
         m.save();
               m.translate(0,-.01,.067).scale(.012,.02,.023);
               drawShape(CG.sphere, [0,0,0]);
         m.restore();
      m.restore();
   }

   if (input.LC) {
      if (isMiniature)
         drawHeadset(input.HS.position(), input.HS.orientation());
      m.save();

      let P = state.position;
      m.translate(-P[0],-P[1],-P[2]);
      m.rotateY(-state.turnAngle);
      m.rotateX(-state.tiltAngle);

      drawController(input.LC, 0);
      drawController(input.RC, 1);
      if (enableModeler && input.RC.isDown())
         showMenu(input.RC.position());
      m.restore();
   }


    /*-----------------------------------------------------------------

    This is where I draw the objects that have been created.

    If I were to make these objects interactive (that is, responsive
    to the user doing things with the controllers), that logic would
    need to go into onStartFrame(), not here.

    -----------------------------------------------------------------*/

   for (let n = 0 ; n < MR.objs.length ; n++) {
      let obj = MR.objs[n], P = obj.position;
      m.save();
         m.multiply(state.avatarMatrixForward);
         m.translate(P[0], P[1], P[2]);
         m.rotateQ(obj.orientation);
         m.scale(.03,.03,.03);
         drawShape(obj.shape, [1,1,1]);
         
      m.restore();
   }

   m.translate(0, -EYE_HEIGHT, 0);
 
    /*-----------------------------------------------------------------

    Notice that I make the room itself as an inside-out cube, by
    scaling x,y and z by negative amounts. This negative scaling
    is a useful general trick for creating interiors.

    -----------------------------------------------------------------*/

   m.save();
      let dy = isMiniature ? 0 : HALL_WIDTH/2;
      m.translate(0, dy, 0);
      m.scale(-HALL_WIDTH/2, -dy, -HALL_LENGTH/2);
      drawShape(CG.cube, [1,1,1], 1,4, 2,4);
   m.restore();

   m.save();
      m.translate((HALL_WIDTH - TABLE_DEPTH) / 2, 0, 0);
      drawTable(0);
   m.restore();

   m.save();
      m.translate((TABLE_DEPTH - HALL_WIDTH) / 2, 0, 0);
      drawTable(1);
   m.restore();

   // DRAW TEST SHAPE

   m.save();
      m.translate(0, 2 * TABLE_HEIGHT, (TABLE_DEPTH - HALL_WIDTH) / 2);
      //m.aimZ([Math.cos(state.time),Math.sin(state.time),0]);
      m.rotateY(state.time);
      m.scale(.06,.06,.6);
      //drawShape(lathe, [1,.2,0]);
      m.restore();

      let A = [0,0,0];
      let B = [1+.4*Math.sin(2 * state.time),.4*Math.cos(2 * state.time),0];
      let C = CG.ik(.7,.7,B,[0,-1,-2]);

      m.save();
      m.translate(-.5, 2.5 * TABLE_HEIGHT, (TABLE_DEPTH - HALL_WIDTH) / 2);
      //m.rotateY(state.time);
      /*
      m.save();
         m.translate(A[0],A[1],A[2]).scale(.07);
         drawShape(CG.sphere, [1,1,1]);
      m.restore();

      m.save();
         m.translate(B[0],B[1],B[2]).scale(.07);
         drawShape(CG.sphere, [1,1,1]);
      m.restore();

      m.save();
         m.translate(C[0],C[1],C[2]).scale(.07);
         drawShape(CG.sphere, [1,1,1]);
      m.restore();
      */
      state.isToon = true;
      let skinColor = [1,.5,.3], D;
      m.save();
         D = CG.mix(A,C,.5);
         m.translate(D[0],D[1],D[2]);
         m.aimZ(CG.subtract(A,C));
         m.scale(.05,.05,.37);
         drawShape(lathe, skinColor, -1,1, 2,1);
      m.restore();

      m.save();
         D = CG.mix(C,B,.5);
         m.translate(D[0],D[1],D[2]).aimZ(CG.subtract(C,B)).scale(.03,.03,.37);
         drawShape(lathe, skinColor, -1,1, 2,1);
      m.restore();
      state.isToon = false;

   m.restore();
      /*-----------------------------------------------------------------
        Here is where we draw avatars and controllers.
      -----------------------------------------------------------------*/
   
   for (let id in MR.avatars) {
      
      const avatar = MR.avatars[id];

      if (avatar.mode == MR.UserType.vr) {
         if (MR.playerid == avatar.playerid)
            continue;
         
         let headsetPos = avatar.headset.position;
         let headsetRot = avatar.headset.orientation;

         if(headsetPos == null || headsetRot == null)
            continue;

         if (typeof headsetPos == 'undefined') {
            console.log(id);
            console.log("not defined");
         }
         
         const rcontroller = avatar.rightController;
         const lcontroller = avatar.leftController;
         
         let hpos = headsetPos.slice();
         hpos[1] += EYE_HEIGHT;

         drawHeadset(hpos, headsetRot);
         let lpos = lcontroller.position.slice();
         lpos[1] += EYE_HEIGHT;
         let rpos = rcontroller.position.slice();
         rpos[1] += EYE_HEIGHT;

         drawSyncController(rpos, rcontroller.orientation, [1,0,0]);
         drawSyncController(lpos, lcontroller.orientation, [0,1,1]);
      }
   }
}

function onEndFrame(t, state) {
   pollAvatarData();

   /*-----------------------------------------------------------------

   The below two lines are necessary for making the controller handler
   logic work properly -- in particular, detecting press() and release()
   actions.

   -----------------------------------------------------------------*/

   const input  = state.input;

   if (input.HS != null) {

      // Here is an example of updating each audio context with the most
      // recent headset position - otherwise it will not be spatialized

      this.audioContext1.updateListener(input.HS.position(), input.HS.orientation());
      this.audioContext2.updateListener(input.HS.position(), input.HS.orientation());
   
      // Here you initiate the 360 spatial audio playback from a given position,
      // in this case controller position, this can be anything,
      // i.e. a speaker, or an drum in the room.
      // You must provide the path given, when you construct the audio context.

      if (input.LC && input.LC.press())
         this.audioContext1.playFileAt('assets/audio/blop.wav', input.LC.position());

      if (input.RC && input.RC.press())
         this.audioContext2.playFileAt('assets/audio/peacock.wav', input.RC.position());
   }

   if (input.LC) input.LC.onEndFrame();
   if (input.RC) input.RC.onEndFrame();
}

export default function main() {
   const def = {
      name: 'YOUR_NAME_HERE week10',
      setup: setup,
      onStartFrame: onStartFrame,
      onEndFrame: onEndFrame,
      onDraw: onDraw,

      // (New Info): New callbacks:

      // VR-specific drawing callback
      // e.g. for when the UI must be different 
      //      in VR than on desktop
      //      currently setting to the same callback as on desktop
      onDrawXR: onDraw,
      // call upon reload
      onReload: onReload,
      // call upon world exit
      onExit: onExit
   };

   return def;
}


//////////////EXTRA TOOLS

// A better approach for this would be to define a unit sphere and
// apply the proper transform w.r.t. corresponding grabbable object

function checkIntersection(point, verts) {
   const bb = calcBoundingBox(verts);
   const min = bb[0];
   const max = bb[1];

   if (point[0] > min[0] && point[0] < max[0] &&
      point[1] > min[1] && point[1] < max[1] &&
      point[2] > min[2] && point[2] < max[2]) return true;

   return false;
}

// see above

function calcBoundingBox(verts) {
   const min = [Number.MAX_VALUE,Number.MAX_VALUE,Number.MAX_VALUE];
   const max = [Number.MIN_VALUE,Number.MIN_VALUE,Number.MIN_VALUE];
    
   for(let i = 0; i < verts.length; i+=2){

      if(verts[i] < min[0]) min[0] = verts[i];
      if(verts[i+1] < min[1]) min[1] = verts[i+1];
      if(verts[i+2] < min[2]) min[2] = verts[i+2];

      if(verts[i] > max[0]) max[0] = verts[i];
      if(verts[i+1] > max[1]) max[1] = verts[i+1];
      if(verts[i+2] > max[2]) max[2] = verts[i+2];
   }

   return [min, max];
}

function pollGrab(state) {
   let input = state.input;
   if ((input.LC && input.LC.isDown()) || (input.RC && input.RC.isDown())) {

      let controller = input.LC.isDown() ? input.LC : input.RC;
      for (let i = 0; i < MR.objs.length; i++) {
         //ALEX: Check if grabbable.
         let isGrabbed = checkIntersection(controller.position(), MR.objs[i].shape);
         //requestLock(MR.objs[i].uid);
         if (isGrabbed == true) {
            if (MR.objs[i].lock.locked) {
               MR.objs[i].position = controller.position();
               const response =
               {
                  type: "object",
                  uid: MR.objs[i].uid,
                  state: {
                     position: MR.objs[i].position,
                     orientation: MR.objs[i].orientation,
                  },
                  lockid: MR.playerid,

               };

               MR.syncClient.send(response);
            } else {
               MR.objs[i].lock.request(MR.objs[i].uid);
            }
         }
      }
   }
}

function releaseLocks(state) {
   let input = state.input;
   if ((input.LC && !input.LC.isDown()) && (input.RC && !input.RC.isDown())) {
      for (let i = 0; i < MR.objs.length; i++) {
         if (MR.objs[i].lock.locked == true) {
            MR.objs[i].lock.locked = false;
            MR.objs[i].lock.release(MR.objs[i].uid);
         }
      }
   }
}
