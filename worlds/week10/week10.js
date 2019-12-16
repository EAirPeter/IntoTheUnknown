"use strict"

/*--------------------------------------------------------------------------------

The proportions below just happen to match the dimensions of my physical space
and the tables in that space.

Note that I measured everything in inches, and then converted to units of meters
(which is what VR requires) by multiplying by 0.0254.

--------------------------------------------------------------------------------*/

const inchesToMeters = inches => inches * 0.0254;
const metersToInches = meters => meters / 0.0254;

const EYE_HEIGHT     = inchesToMeters( 69);
const RING_RADIUS    = 0.0425;
const TABLE_DEPTH    = inchesToMeters( 30);

////////////////////////////// SCENE SPECIFIC CODE
MR.objs = [];

class Obj {
  constructor(state) {
    this.uid = MR.objs.length;
    this.lock = new Lock(this.uid);
    this.state = state;
    MR.objs.push(this);
  }

  spawn(){
    const response = {
      type: "spawn",
      uid: this.uid,
      lockid: -1,
      state: this.state,
    };
    MR.syncClient.send(response);
  }

  synchronize() {
    const response = {
      type: "object",
      uid: this.uid,
      lockid: MR.playerid,
      state: this.state,
    };
    MR.syncClient.send(response);
  }
}

MR.srvid = new Obj(-1);

// pilot stick
let stick = {
  lim: Math.PI * .25,
  min: .04,
  max: .2,
  active: null,
  pos: [-.2, 1.26, -.3],
  Q: new Obj([0, 0, 0, 1]),
};

// thrust lever
let lever = {
  lim: Math.PI * .25,
  wid: .06,
  min: .04,
  max: .2,
  active: null,
  pos: [.2, 1.26, -.3],
  theta: new Obj(0),
};

// spaceship
let ship = {
  maxSpeed: 10, // low speed: 10, high speed: 300
  maxRot: .8,
  //speed: 0,
  loc: new Obj([0, 0, 0]),
  rot: new Obj(CG.matrixIdentity()),
};

let last_time = 0;
let out_side = 0; // 0 means inside; 1 front
let arm_loc = [out_side*3, 0, 0];
let bullet_orientation = [0, 0, -1];

let shoot = false;
let life = 0;
let bullet_loc = [0, 0, 0];


let texs = {
  white:        {img: "white.png"},
  normal:       {img: "normal.png"},
  wood:         {img: "wood.png"},
  // tiles:    {img: "tiles"},
  nb:           {img: "noisy_bump.jpg"},
  stones:       {img: "stones.jpg"},
  brick:        {img: "brick.png"},
  sun:          {img: "0sun.jpg"},
  mercury:      {img: "1mercury.jpg"},
  venus:        {img: "2venus.jpg"},
  earth:        {img: "3earth.jpg"},
  mars:         {img: "4mars.jpg"},
  jupiter:      {img: "5jupiter.jpg"},
  saturn:       {img: "6saturn.jpg"},
  saturn_ring:  {img: "6saturn_ring.png"},
  uranus:       {img: "7uranus.jpg"},
  neptune:      {img: "8neptune.jpg"},
  milky_way:    {img: "milky_way.jpg"},
  asteroid:     {dir: "asteroid"},
  spaceship:    {dir: "spaceship"},
};

let getMats = () => { return {
  trivial:    [texs.white.id[0], texs.white.id[0], texs.normal.id[0], texs.white.id[0]],
  wood:       [texs.wood .id[0], texs.white.id[0], texs.normal.id[0], texs.white.id[0]],
  // tiles:    [texs.tiles.id[0], texs.white.id[0], texs.normal.id[0], texs.white.id[0]],
  sun:        [texs.sun.id[0], texs.white.id[0], texs.normal.id[0], texs.white.id[0]],
  mercury:    [texs.mercury.id[0], texs.white.id[0], texs.normal.id[0], texs.white.id[0]],
  venus:      [texs.venus.id[0], texs.white.id[0], texs.normal.id[0], texs.white.id[0]],
  earth:      [texs.earth.id[0], texs.white.id[0], texs.normal.id[0], texs.white.id[0]],
  mars:       [texs.mars.id[0], texs.white.id[0], texs.normal.id[0], texs.white.id[0]],
  jupiter:    [texs.jupiter.id[0], texs.white.id[0], texs.normal.id[0], texs.white.id[0]],
  saturn:     [texs.saturn.id[0], texs.white.id[0], texs.normal.id[0], texs.white.id[0]],
  saturn_ring:[texs.saturn_ring.id[0], texs.white.id[0], texs.normal.id[0], texs.white.id[0]],
  uranus:     [texs.uranus.id[0], texs.white.id[0], texs.normal.id[0], texs.white.id[0]],
  neptune:    [texs.neptune.id[0], texs.white.id[0], texs.normal.id[0], texs.white.id[0]],
  milky_way:  [texs.milky_way.id[0], texs.white.id[0], texs.normal.id[0], texs.white.id[0]],
  asteroid:   texs.asteroid.id,
  spaceship:  texs.spaceship.id,
}};

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
  this.isDown2     = () => controller.buttons[2].pressed;
  this.isGrasping  = () => controller.buttons[1].pressed;
  this.onEndFrame  = () => { wasDown = this.isDown(); wasDown2 = this.isDown2(); wasGrasping = this.isGrasping(); }
  this.orientation = () => controller.pose.orientation;
  this.position    = () => controller.pose.position;
  this.press       = () => !wasDown && this.isDown();
  this.press2      = () => !wasDown2 && this.isDown2();

  this.release     = () => wasDown && !this.isDown();
  this.grasp       = () => !wasGrasping && this.isGrasping();
  this.tip         = () => {
    let P = this.position();        // THIS CODE JUST MOVES
    m.identity();                   // THE "HOT SPOT" OF THE
    m.translate(P[0],P[1],P[2]);    // CONTROLLER TOWARD ITS
    m.rotateQ(this.orientation());  // FAR TIP (FURTHER AWAY
    m.translate(0,0,-.03);          // FROM THE USER'S HAND).
    let v = m.value();
    return [v[12],v[13],v[14]];
  };
  this.center = () => {
    let P = this.position();
    m.identity();
    m.translate(P[0],P[1],P[2]);
    m.rotateQ(this.orientation());
    m.translate(0,.02,-.005);
    let v = m.value();
    return [v[12],v[13],v[14]];
  };
  let wasDown = false;
  let wasDown2 = false;
  let wasGrasping = false;
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
  };

  let mapped = [];
  let paths = [];
  for (let key in texs) {
    let tex = texs[key];
    tex.id = [];
    if (tex.dir) {
      paths.push(getPath("textures/" + texs[key].dir + "/diff.jpg"));
      paths.push(getPath("textures/" + texs[key].dir + "/spec.jpg"));
      paths.push(getPath("textures/" + texs[key].dir + "/norm.jpg"));
      paths.push(getPath("textures/" + texs[key].dir + "/occl.jpg"));
      mapped.push(tex, tex, tex, tex);
    }
    else {
      paths.push(getPath("textures/" + texs[key].img));
      mapped.push(tex);
    }
  }

  // Load models
  let loadJsonModel = async (modelName) => {
    const model = await axios.get("objs/" + modelName + ".json");
    CG[modelName] = new CG.Model(model.data);
  };
  await loadJsonModel("asteroid");
  await loadJsonModel("spaceship");
  await loadJsonModel("spaceship_interior");
  // const asteroid2 = await axios.get("objs/asteroid2.json");
  // CG.asteroid2 = new CG.Model(asteroid2.data);
  // const asteroid3 = await axios.get("objs/asteroid3.json");
  // CG.asteroid3 = new CG.Model(asteroid3.data);

  const images = await imgutil.loadImagesPromise(paths);

  let libSources = await MREditor.loadAndRegisterShaderLibrariesForLiveEditing(gl, "libs", [
    { key : "pnoise"   , path : "shaders/noise.glsl"    , foldDefault : true },
    { key : "sharedlib1", path : "shaders/sharedlib1.glsl", foldDefault : true },
  ]);
  if (!libSources)
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
        state.uAmbiLoc      = gl.getUniformLocation(program, 'uAmbi');
        state.uDiffLoc      = gl.getUniformLocation(program, 'uDiff');
        state.uSpecLoc      = gl.getUniformLocation(program, 'uSpec');
        state.uCursorLoc    = gl.getUniformLocation(program, 'uCursor');
        state.uModelLoc     = gl.getUniformLocation(program, 'uModel');
        state.uProjLoc      = gl.getUniformLocation(program, 'uProj');
        state.uTimeLoc      = gl.getUniformLocation(program, 'uTime');
        state.uToonLoc      = gl.getUniformLocation(program, 'uToon');
        state.uViewLoc      = gl.getUniformLocation(program, 'uView');
        state.uTexScale     = gl.getUniformLocation(program, 'uTexScale');
        state.uTexDiffLoc   = gl.getUniformLocation(program, 'uTexDiff');
        state.uTexSpecLoc   = gl.getUniformLocation(program, 'uTexSpec');
        state.uTexNormLoc   = gl.getUniformLocation(program, 'uTexNorm');
        state.uTexOcclLoc   = gl.getUniformLocation(program, 'uTexOccl');
        gl.uniform1i(state.uTexDiffLoc, 0);
        gl.uniform1i(state.uTexSpecLoc, 1);
        gl.uniform1i(state.uTexNormLoc, 2);
        gl.uniform1i(state.uTexOcclLoc, 3);
      }
    },
    {
      paths : {
        vertex  : "shaders/vertex.vert.glsl",
        fragment : "shaders/fragment.frag.glsl"
      },
      foldDefault : {
        vertex  : true,
        fragment : false
      }
    }
  );
  if (!shaderSource)
    throw new Error("Could not load shader");

  state.cursor = ScreenCursor.trackCursor(MR.getCanvas());

  CG.aPos = gl.getAttribLocation(state.program, 'aPos');
  CG.aNor = gl.getAttribLocation(state.program, 'aNor');
  CG.aTan = gl.getAttribLocation(state.program, 'aTan');
  CG.aUV  = gl.getAttribLocation(state.program, 'aUV');

  gl.enableVertexAttribArray(CG.aPos);
  gl.enableVertexAttribArray(CG.aNor);
  gl.enableVertexAttribArray(CG.aTan);
  gl.enableVertexAttribArray(CG.aUV);

  for (let i = 0; i < images.length; ++i) {
    let id = gl.createTexture();
    gl.bindTexture   (gl.TEXTURE_2D, id);
    gl.texParameteri (gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri (gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texParameteri (gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
    gl.texParameteri (gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D    (gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, images[i]);
    gl.generateMipmap(gl.TEXTURE_2D);
    mapped[i].id.push(id);
  }
  state.mats = getMats();

  state.calibrationCount = 0;

  Input.initKeyEvents();

  // load files into a spatial audio context for playback later - the path will be needed to reference this source later
  this.audioContext1 = new SpatialAudioContext([
  'assets/audio/blop.wav'
  ]);

  this.audioContext2 = new SpatialAudioContext([
  'assets/audio/peacock.wav'
  ]);

  this.BGM = new SpatialAudioContext([
    'assets/audio/coward.mp3'
  ]);

  for (let i = 0; i < MR.objs.length; ++i)
    MR.objs[i].spawn();
}

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
  (function() {
    if (MR.srvid.state in MR.avatars)
      return;
    if (!MR.srvid.lock.lock())
      return;
    MR.srvid.state = MR.playerid;
    MR.srvid.synchronize();
    MR.srvid.lock.unlock();
  })();

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

  if (!state.avatarMatrixForward) {
    // MR.avatarMatrixForward is because i need accesss to this in callback.js, temp hack
    MR.avatarMatrixForward = state.avatarMatrixForward = CG.matrixIdentity();
    MR.avatarMatrixInverse = state.avatarMatrixInverse = CG.matrixIdentity();
  }

  if(input.LC) {
    if (input.LC.press2()) {
      out_side = 1 - out_side;
    }
  }


  if (MR.VRIsActive()) {
    if (!input.HS) input.HS = new HeadsetHandler(MR.headset);
    if (!input.LC) input.LC = new ControllerHandler(MR.leftController);
    if (!input.RC) input.RC = new ControllerHandler(MR.rightController);

    if (!state.calibrate) {
      m.identity();
      m.rotateY(Math.PI/2);
      m.translate(-2.01,.04,0);
      state.calibrate = m.value().slice();
    }
  }

  if (!state.tStart)
    state.tStart = t;
  state.time = (t - state.tStart) / 1000;

  let dt = state.time - last_time;
  state.dt = dt;
  last_time = state.time;

   // THIS CURSOR CODE IS ONLY RELEVANT WHEN USING THE BROWSER MOUSE, NOT WHEN IN VR MODE.

  let cursorValue = () => {
    let p = state.cursor.position(), canvas = MR.getCanvas();
    return [ p[0] / canvas.clientWidth * 2 - 1, 1 - p[1] / canvas.clientHeight * 2, p[2] ];
  };

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
    };
    let lx = getX(input.LC);
    let rx = getX(input.RC);
    let sep = metersToInches(TABLE_DEPTH - 2 * RING_RADIUS);
    if (d >= sep - 1 && d <= sep + 1 && Math.abs(lx) < .03 && Math.abs(rx) < .03) {
      if (state.calibrationCount === undefined)
        state.calibrationCount = 0;
      if (++state.calibrationCount === 30) {
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

  let Cs = [];
  if (input.LC && input.LC.isGrasping())
    Cs.push(input.LC);
  if (input.RC && input.RC.isGrasping())
    Cs.push(input.RC);
  // pilot stick
  (function() {
    if (stick.active != null && !stick.active.isGrasping())
      stick.active = null;
    for (let i = 0; i < Cs.length; ++i) {
      let C = Cs[i];
      if (stick.active != null && stick.active != C)
        continue;
      let D = CG.add(CG.subtract(C.position(), stick.pos), [0, EYE_HEIGHT + stick.min, 0]);
      let d = CG.norm(D);
      let p = Math.atan2(D[1], Math.hypot(D[2], D[0]));
      let t = Math.atan2(D[0], D[2]);
      if (C.grasp() && stick.min < d && d < stick.max && p >= stick.lim)
        stick.active = C;
      if (stick.active == C) {
        if (!stick.Q.lock.lock())
          continue;
        p = CG.clamp(p, stick.lim, Math.PI * .5);
        let c = Math.cos(p);
        let s = Math.sin(p);
        D = [Math.sin(t) * c, s, Math.cos(t) * c];
        p = (Math.PI * .5 - p) / (Math.PI * .5 - stick.lim);
        let rot = CG.matrixMultiply(CG.matrixRotateZ(+ship.maxRot * Math.sin(t) * p * dt), ship.rot.state);
        ship.rot.state = CG.matrixMultiply(CG.matrixRotateX(-ship.maxRot * Math.cos(t) * p * dt), rot);
        ship.rot.synchronize();
        let A = CG.cross([0, 1, 0], D);
        t = Math.acos(CG.dot([0, 1, 0], D));
        c = Math.cos(t * .5);
        s = Math.sin(t * .5);
        stick.Q.state = [A[0] * s, A[1] * s, A[2] * s, c];
        stick.Q.synchronize();
      }
    }
    if (stick.active == null && stick.Q.lock.locked()) {
      stick.Q.state = [0, 0, 0, 1];
      stick.Q.synchronize();
      stick.Q.lock.unlock();
    }
  })();
  // thrust lever
  (function() {
    if (lever.active != null && !lever.active.isGrasping())
      lever.active = null;
    for (let i = 0; i < Cs.length; ++i) {
      let C = Cs[i];
      if (lever.active != null && lever.active != C)
        continue;
      let D = CG.add(CG.subtract(C.position(), lever.pos), [0, EYE_HEIGHT + lever.min, 0]);
      let d = Math.hypot(D[1], D[2]);
      let t = Math.atan2(-D[2], D[1]);
      if (C.grasp() && lever.min < d && d < lever.max + .02 && Math.abs(D[0]) < lever.wid && Math.abs(t) <= lever.lim)
        lever.active = C;
      if (lever.active == C) {
        if (!lever.theta.lock.lock())
          continue;
        lever.theta.state = CG.clamp(t, -lever.lim, lever.lim);
        lever.theta.synchronize();
      }
    }
    if (lever.active == null && lever.theta.lock.locked())
      lever.theta.lock.unlock();
  })();

  if (MR.srvid.state == MR.playerid) {
    let speed = ship.maxSpeed * lever.theta.state / lever.lim;
    ship.loc.state = CG.add(ship.loc.state, CG.matrixTransform(CG.matrixTranspose(ship.rot.state), [0, 0, -speed * dt, 0]));
    ship.loc.synchronize();
  }

  // /*-----------------------------------------------------------------

  // This function releases stale locks. Stale locks are locks that
  // a user has already lost ownership over by letting go

  // -----------------------------------------------------------------*/

  // releaseLocks(state);

  // /*-----------------------------------------------------------------

  // This function checks for intersection and if user has ownership over
  // object then sends a data stream of position and orientation.

  // -----------------------------------------------------------------*/

  // pollGrab(state);
}

function onDraw(t, projMat, viewMat, state, eyeIdx) {
  m.identity();
  m.rotateX(state.tiltAngle);
  m.rotateY(state.turnAngle);
  let P = state.position;
  m.translate(P[0],P[1],P[2]);

  m.save();
    myDraw(t, projMat, viewMat, state, eyeIdx, false);
  m.restore();
}

function myDraw(t, projMat, viewMat, state, eyeIdx, isMiniature) {
  viewMat = CG.matrixMultiply(viewMat, state.avatarMatrixInverse);
  gl.uniformMatrix4fv(state.uViewLoc, false, new Float32Array(viewMat));
  gl.uniformMatrix4fv(state.uProjLoc, false, new Float32Array(projMat));

  const input  = state.input;
  let LC = input.LC;
  let RC = input.RC;

   /*-----------------------------------------------------------------

   The drawShape() function below is optimized in that it only downloads
   new vertices to the GPU if the vertices (the "shape" argument) have
   changed since the previous call.

   Also, currently we only draw gl.TRIANGLES if this is a cube. In all
   other cases, we draw gl.TRIANGLE_STRIP. You might want to change
   this if you create other kinds of shapes that are not triangle strips.

   -----------------------------------------------------------------*/

  let drawShape = (shape, color, mat, texScale, spec) => {
    if (!mat)
      mat = state.mats.trivial;
    gl.uniform3fv(state.uAmbiLoc, CG.scale(color, .1));
    gl.uniform3fv(state.uDiffLoc, CG.scale(color, .5));
    gl.uniform4fv(state.uSpecLoc, spec ? spec : [0, 0, 0, 1]);
    gl.uniformMatrix4fv(state.uModelLoc, false, m.value());
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, mat[0]);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, mat[1]);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, mat[2]);
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, mat[3]);
    gl.uniform1f(state.uTexScale, texScale === undefined ? 1 : texScale);
    if (state.isToon) {
      gl.uniform1f(state.uToonLoc, .3 * CG.norm(m.value().slice(0,3)));
      gl.cullFace(gl.FRONT);
      shape.draw();
      gl.cullFace(gl.BACK);
      gl.uniform1f(state.uToonLoc, 0);
    }
    shape.draw();
  };

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

    let P = position;

    m.save();
       m.multiply(state.avatarMatrixForward);
       m.translate(P[0],P[1],P[2]);
       m.rotateQ(orientation);
       m.scale(0.1);
       m.save();
          m.scale(1.5,1.5,1.5);
          drawShape(CG.sphere, [0,0,0]);
       m.restore();

       // eyes
       for (let s = -1 ; s <= 1 ; s += 2) {
          m.save();
             m.translate(s*.4,.3,-1.45);
             m.scale(.8,.8,.1);
             drawShape(CG.sphere, [10,10,10]);
          m.restore();
       }

       // eye balls
       for (let s = -1 ; s <= 1 ; s += 2) {
          m.save();
             m.translate(s*.4,.3,-1.5);
             m.scale(.3,.3,.1);
             drawShape(CG.sphere, [1,10,10]);
          m.restore();
       }

       // heli
       m.save();
             m.translate(0,2,0);
             m.rotateX(1.57);
             m.scale(.1,.1,.6);
             drawShape(CG.cylinder, [0,0,0]);
       m.restore();

       m.save();
             m.translate(0,2.6,0);
             m.rotateY(10*state.time);
             m.scale(.1,.1,1.4);
             drawShape(CG.cylinder, [Math.sin(state.time),1,1]);
       m.restore();

    m.restore();
   }

   let drawHeadset1 = (position, orientation) => {

    let P = position;

    m.save();
       m.multiply(state.avatarMatrixForward);
       m.translate(P[0],P[1],P[2]);
       m.rotateQ(orientation);
       m.scale(.1);

       m.save();
          m.scale(1.5,1.5,1.5);
          drawShape(CG.sphere, [0.8,0.5,0.5]);
       m.restore();

       // eyes
       m.save();
          m.translate(0,.3,-1.45);
          m.scale(.8,.8,.1);
          drawShape(CG.sphere, [10,10,10]);
       m.restore();

       // eye balls
       m.save();
          m.translate(0,.3,-1.5);
          m.scale(.5,.5,.1);
          drawShape(CG.sphere, [1,10,10]);
       m.restore();

       m.save();
             m.translate(0,1.5,0);
             m.rotateX(1.57);
             m.scale(.7,.7,1.2);
             drawShape(CG.sphere, [0,0,0]);
       m.restore();

       m.save();
             m.translate(0,1.5,-0.4);
             m.rotateX(1.57);
             m.scale(.7,1.2,0.02);
             drawShape(CG.cylinder, [0,0,0]);
       m.restore();

    m.restore();
   }

   let drawHeadset2 = (position, orientation) => {


    let P = position;

    m.save();

       m.multiply(state.avatarMatrixForward);
       m.translate(P[0],P[1],P[2]+1);
       m.rotateQ(orientation);
       m.scale(0.1);
       m.save();
          m.scale(2,2,2);
          drawShape(CG.cube, [1,1,0]);
       m.restore();

       for (let s = -1 ; s <= 1 ; s += 2) {
          m.save();
             m.translate(s*.7,.4,-2);
             m.scale(.5,.5,.1);
             drawShape(CG.torus, [10,10,10]);
          m.restore();
       }

       for (let s = -1 ; s <= 1 ; s += 2) {
          m.save();
             m.translate(s*.7,.4,-2);
             m.scale(.3, Math.max(0.3*Math.sin(4*state.time),0),.1);
             drawShape(CG.sphere, [1,10,10]);
          m.restore();
       }

       m.save();
             m.translate(0,2,0);
             m.rotateX(1.57);
             m.scale(.1,.1,1.8);
             drawShape(CG.cube, [0,0,0]);
       m.restore();

       m.save();
             m.translate(0,3.8,0);
             m.rotateY(10*state.time);
             m.rotateX(1);
             m.scale(.1,.1,1.4);
             drawShape(CG.cube, [Math.sin(state.time),1,1]);
       m.restore();

       m.save();
             m.translate(0,3.8,0);
             m.rotateY(5*state.time);
             m.rotateX(-1);
             m.scale(.1,.1,1.4);
             drawShape(CG.cube, [Math.sin(state.time),1,1]);
       m.restore();

       m.save();
       m.translate(0,3.8,0);
       m.rotateY(-10*state.time);
       m.rotateX(0);
       m.scale(.1,.1,1.4);
       drawShape(CG.cube, [Math.sin(state.time),1,1]);
       m.restore();

    m.restore();
 }



 let drawController = (C, hand) => {

  let P = C.position();

  m.save();

  m.multiply(state.avatarMatrixForward);
  m.translate(P[0],P[1],P[2]);
  m.rotateQ(C.orientation());
  m.translate(0,.02,-.005);

  let s = C.isDown() ? .0125 : .0225;
  let color = [1,1,0];

     m.save();
        m.translate(-s,0,.001);
        m.scale(.01,.01,.046);
        drawShape(CG.sphere,[1,1,0]);
     m.restore();

    m.save();
       m.translate(s,0,.001);
       m.scale(.01,.01,.046);
        drawShape(CG.sphere, [1,1,0]);
    m.restore();

     m.save();
        m.translate(-0,s,.001);
        m.scale(.01,.01,.046);
        drawShape(CG.sphere, color);
     m.restore();

     m.save();
        m.translate( 0,-s,.001);
        m.scale(.01,.01,.046);
        drawShape(CG.sphere, color);
     m.restore();

     m.save();
        m.translate(0,0,.025);
        m.scale(.035,.035,.035);
        drawShape(CG.sphere, [0.5,0.5,1]);
     m.restore();


    // draw arms
    let W = [-0.08*Math.sin(2 * state.time),-0.1*Math.cos(2 * state.time),0];
    let H = [0,0,0];

    // get pos in VR

    if (C)
       W = C.position();
    if (input.HS){
       H = input.HS.position();
       //let O = input.HS.orientation();
       }


     //let dir = [-O[2]/(Math.sqrt(Math.pow(O[2],2)) + Math.sqrt(pow(O[0],2))), 0, O[0]/(Math.sqrt(Math.pow(O[2],2)) + Math.sqrt(pow(O[0],2)))];

     let A = [0,0,0];

     if (hand)
        A = [H[0] + 0.1, H[1]-0.1, H[2]+0.05];
     else
        A = [H[0] - 0.1, H[1]-0.1, H[2]+0.05];

     let B = W;

     let length  = Math.sqrt(Math.pow(A[0]- B[0],2) + Math.pow(A[1] - B[1],2) + Math.pow(A[2] - B[2],2));
     let M = CG.ik(0.5*length,0.5*length, B, [0,0,1]);
     /*
     m.save();


     //m.identity();
     // joints

     m.save();
        m.translate(A[0],A[1],A[2]).scale(.03);
        drawShape(CG.sphere, [1,1,1]);
     m.restore();
     m.save();
        m.translate(M[0],M[1],M[2]).scale(.03);
        drawShape(CG.sphere, [-0.5,0.5,1]);
     m.restore();


     //let skinColor = [1,0,1], D;
     
     m.save();
        D = CG.mix(A,B,0.5);
        m.translate(D[0],D[1],D[2]);
        m.aimZ(CG.subtract(A,B));
        m.scale(.01,.01,0.5*length); //0.14
        drawShape(CG.cylinder, skinColor);
     m.restore();

     //m.save();
        //D = CG.mix(M,B,0.5);
        //m.translate(D[0],D[1],D[2]).aimZ(CG.subtract(M,B))
        //m.scale(.01,.01,0.27*length);
        //drawShape(lathe, skinColor, -1,1, 2,1);
     //m.restore();

     m.restore();
     */

  m.restore();
  }

  let drawSyncController = (pos, rot, color) => {
    let P = pos;
    m.save();
    // m.identity();
      m.translate(P[0], P[1], P[2]);
      m.rotateQ(rot);
      m.translate(0,.02,-.005);

      let s = .0225;

         m.save();
            m.translate(-s,0,.001);
            m.scale(.01,.01,.046);
            drawShape(CG.sphere,[1,1,0]);
         m.restore();

         m.save();
            m.translate(s,0,.001);
            m.scale(.01,.01,.046);
            drawShape(CG.sphere, [1,1,0]);
         m.restore();

         m.save();
            m.translate(-0,s,.001);
            m.scale(.01,.01,.046);
            drawShape(CG.sphere, [1,1,0]);
         m.restore();

          m.save();
            m.translate(0,-s,.001);
            m.scale(.01,.01,.046);
            drawShape(CG.sphere, [1,1,0]);
         m.restore();

         m.save();
            m.translate(0,0,.025);
            m.scale(.035,.035,.035);
            drawShape(CG.sphere, [0.5,0.5,1]);
         m.restore();

    m.restore();
  };

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
    m.restore();
  }

  m.translate(0, -EYE_HEIGHT, 0);

  let drawMilkyWay = () => {
    m.save();
    let scale = -16000;
    m.translate(0, EYE_HEIGHT * 0.8, -1);
    m.rotateY(Math.PI/2);
    m.rotateX(Math.PI/2);
    m.scale(scale, scale, scale);
    drawShape(CG.sphere, [1,1,1], state.mats.milky_way);
    m.restore();
  };

  let sunLoc = [-1000, 0, -4000];
  let solarSystemData = {
    star: {
      sun: {
        radius: 500,
        mat: state.mats.sun,
      }
    },
    planet: {
      mercury: {
        rotateZ: -0.2,
        radius: 140,
        distance: 1500,
        mat: state.mats.mercury,
        T: 500,
        phi: 10,
      },
      venus: {
        rotateZ: -0.11,
        radius: 160,
        distance: 3000,
        mat: state.mats.venus,
        T: 600,
        phi: 200,
      },
      earth: {
        rotateZ: 0,
        radius: 180,
        distance: 4500,
        mat: state.mats.earth,
        T: 750,
        phi: 30,
      },
      mars: {
        rotateZ: -0.05,
        radius: 140,
        distance: 6000,
        mat: state.mats.mars,
        T: 900,
        phi: -300,
      },
      jupiter: {
        rotateZ: 0,
        radius: 300,
        distance: 8000,
        mat: state.mats.jupiter,
        T: 1150,
        phi: 50,
      },
      saturn: {
        rotateZ: 0.1,
        radius: 260,
        distance: 9000,
        mat: state.mats.saturn,
        T: 1350,
        phi: 60,
      },
      uranus: {
        rotateZ: 0.04,
        radius: 200,
        distance: 10000,
        mat: state.mats.uranus,
        T: 1550,
        phi: 70,
      },
      neptune: {
        rotateZ: 0,
        radius: 200,
        distance: 11000,
        mat: state.mats.neptune,
        T: 1850,
        phi: 80,
      }
    }
  };

  let drawStar = (location, star) => {
    m.save();
      m.translate(location[0], location[1], location[2]);
      m.scale(star.radius, star.radius, star.radius);
      m.rotateY(0.01 * state.time);
      m.rotateX(Math.PI / 2);
      drawShape(CG.sphere, [1,1,1], star.mat);
    m.restore();
  };

  let drawPlanet = (location, planet) => {
    m.save();
      m.rotateZ(planet.rotateZ);
      m.translate(location[0] + planet.distance * Math.cos(Math.PI * 2 / planet.T * state.time + planet.phi),
          location[1], location[2] + planet.distance * Math.sin(Math.PI * 2 / planet.T * state.time + planet.phi));
      m.scale(planet.radius, planet.radius, planet.radius);
      m.rotateY(0.1 * state.time);
      m.rotateX(Math.PI / 2);
      drawShape(CG.sphere, [1, 1, 1], planet.mat);
    m.restore();
  };

  let drawSolarSystem = () => {
    m.save();
      drawStar(sunLoc, solarSystemData.star.sun);
      for (const p in solarSystemData.planet) {
        if (solarSystemData.planet.hasOwnProperty(p)) {
          drawPlanet(sunLoc, solarSystemData.planet[p]);
        }
      }
    m.restore();
  };

  let shipLoc = ship.loc.state;
  let shipRot = ship.rot.state;
  let drawSpaceship = (miniatureScale) => {
    m.save();
    let shipScale = 0.005;
    if (miniatureScale) shipScale *= miniatureScale;
    m.translate(shipLoc[0], shipLoc[1], shipLoc[2]);
    m.multiply(CG.matrixTranspose(shipRot));
    m.rotateX(-Math.PI / 2);
    m.rotateZ(Math.PI / 2);
    m.scale(shipScale, shipScale, shipScale);
    m.translate(-600, 600, 300);
    drawShape(CG.spaceship, [1, 1, 1], state.mats.spaceship);
    m.restore();
  };

  // miniature of solar system
  let drawSolarMiniatureMap = () => {
    m.save();
      let miniatureScale = 0.00004;
      m.translate(-0.6, EYE_HEIGHT * 0.8, -0.3);
      m.scale(miniatureScale, miniatureScale, miniatureScale);
      drawSolarSystem();
      drawSpaceship(120);
    m.restore();
  };

  // miniature of solar system
  let drawAsteroidMiniatureMap = () => {
    m.save();
      let miniatureScale = 0.004;
      // m.translate(1, EYE_HEIGHT * 1.0, -0.3);
      m.translate(1.5, EYE_HEIGHT * 1.1, 2);
      m.scale(miniatureScale, miniatureScale, miniatureScale);
      m.translate(-shipLoc[0], -shipLoc[1], -shipLoc[2]);
      drawAsteroidBelt();
      drawSpaceship();
    m.restore();
  };

  let drawAsteroid = (pos) => {
    let asteroidCenterPosAdjustment = [-15, -90, -10];
    let asteroidScale = 0.05;
    m.save();
      let x = pos[0] + 40 * noise.noise(3 * pos[0], 4 * pos[1], 5 * pos[2]);
      let y = pos[1] + 40 * noise.noise(3 * pos[0], 4 * pos[1], 8 * pos[2]);
      let z = pos[2] + 20 * noise.noise(8 * pos[0], 1 * pos[1], 3 * pos[2]);
      m.translate(x, y, z);
      m.rotateX(noise.noise(pos[0], pos[1], pos[2]) * state.time);
      m.rotateY(noise.noise(pos[0], pos[1], pos[2]) * state.time);
      // m.rotateZ(noise.noise(pos[0], pos[1], pos[2]) * state.time);
      let s = (0.75 + Math.abs(Math.cos(noise.noise(3 * pos[0], 4 * pos[1], 5 * pos[2]))) / 2) * asteroidScale;
      m.scale(s, s, s);
      m.translate(asteroidCenterPosAdjustment);
      drawShape(CG.asteroid, [1, 1, 1], state.mats.asteroid);
    m.restore();
  };

  let drawAsteroidBelt = () => {
    let interval = 27.1;
    let r = 3;
    let drawByCenter = (xCenter, yCenter, zCenter) => {
      for (let x = xCenter - r * interval; x <= xCenter + r * interval; x += interval) {
        for (let y = yCenter - r * interval; y <= yCenter + r * interval; y += interval) {
          for (let z = zCenter - r * interval; z <= zCenter + r * interval; z += interval) {
            drawAsteroid([x, y, z]);
          }
        }
      }
    };
    let xCenter = Math.floor(shipLoc[0] / interval) * interval - interval / 4;
    let yCenter = Math.floor(shipLoc[1] / interval) * interval - interval / 4;
    let zCenter = Math.floor(shipLoc[2] / interval) * interval - interval / 4;
    drawByCenter(xCenter, yCenter, zCenter);
  };

  let drawShip = () => {
    // cockpit
    m.save();
      let interiorScale = 0.03;
      m.translate(0, 2.5, 3);
      m.scale(interiorScale, interiorScale, interiorScale);
      drawShape(CG.spaceship_interior, [.4, .5, .2]);
    m.restore();
    // pilot stick
    m.save();
      m.translate(stick.pos[0], stick.pos[1], stick.pos[2]);
      m.save();
        m.translate(0, -.01, 0);
        m.scale(.05, .01, .05);
        drawShape(CG.cube, [1,1,1]);
      m.restore();
      m.save();
        m.translate(0, -stick.min, 0);
        m.rotateQ(stick.Q.state);
        m.rotateX(Math.PI * .5);
        m.translate(0, 0, -(stick.max + stick.min) * .5);
        m.scale(.01, .01, (stick.max - stick.min) * .5);
        drawShape(CG.cylinder, [1,1,1]);
      m.restore();
    m.restore();
    // thrust lever
    m.save();
      m.translate(lever.pos[0], lever.pos[1], lever.pos[2]);
      m.save();
        m.translate(0, -.01, 0);
        m.scale(lever.wid + .02, .01, .05);
        drawShape(CG.cube, [1,1,1]);
      m.restore();
      m.save();
        m.translate(0, -lever.min, 0);
        m.rotateX(-lever.theta.state);
        m.translate(0, lever.max, 0);
        m.rotateY(Math.PI * .5);
        m.scale(.016, .016, lever.wid + .02);
        drawShape(CG.cylinder, [1,1,1]);
      m.restore();
      for (let i = -1; i <= 1; i += 2) {
        m.save();
          m.translate(i * lever.wid, -lever.min, 0);
          m.rotateX(Math.PI * .5 - lever.theta.state);
          m.translate(0, 0, -(lever.max + lever.min) * .5);
          m.scale(.01, .01, (lever.max - lever.min) * .5);
          drawShape(CG.tube, [1,1,1]);
        m.restore();
      }
    m.restore();
  };

  let drawLaser = (length) => {

    let W = [0,0,0];
    let H = [0,0,0];
    if(input.LC) {
      if (input.LC.isDown()){

        W = input.LC.position();

        m.save();

            m.translate(0, EYE_HEIGHT, 0);
            let LaserColor = [1,0,0],D;
            let hand = input.LC.position();

            m.save();
              D = input.LC.orientation();
              m.translate(hand[0], hand[1], hand[2]);
              m.rotateQ(D);
              m.translate(0,0.02,-length);
              m.scale(0.005,0.005,length);
              drawShape(CG.cylinder, LaserColor);
            m.restore();
        m.restore();
      }
    }
  }



  if (out_side === 0) {
    m.save();
      m.multiply(ship.rot.state);
      m.translate(-shipLoc[0], -shipLoc[1], -shipLoc[2]);
      drawMilkyWay();
      drawSolarSystem();
      drawAsteroidBelt();
    m.restore();
    drawShip();
    drawSolarMiniatureMap();
    drawAsteroidMiniatureMap();
  }
  else {
    let shape = [0, 2, -2];
    drawLaser(2);
    let speed = 10;
    m.save();
    m.multiply(shipRot);
    m.translate(-shipLoc[0]-shape[0], -shipLoc[1]-shape[1], -shipLoc[2]-shape[2]);
    drawMilkyWay();
    drawSolarSystem();
    drawAsteroidBelt();
    m.restore();
    if (RC) {
      if (RC.press() && !shoot) {
        bullet_orientation = RC.orientation();
        shoot = true;
        life = 0;
        bullet_loc = [0, 0, 0];
      }
      if(!shoot) {
        m.save();
        let l = RC.tip().slice();
        m.translate(l[0], l[1], l[2]);
        m.scale(0.1, 0.1, 0.1);
        drawShape(CG.sphere, [1,1,1]);
        m.restore();
      }
    }

    if(shoot) {
      life += state.dt;
      if(life > 5) {
        shoot = false;
        life = 0;
        bullet_loc = [0, 0, 0];
        bullet_orientation = [0, 0, -1];
      }
      bullet_loc = CG.add(bullet_loc, CG.scale([0, 0, -1], speed*state.dt));
      // bullet_loc = CG.add(bullet_loc, CG.scale(bullet_orientation, speed*state.dt));
      m.save();
      m.translate(bullet_loc[0], bullet_loc[1], bullet_loc[2]);
      m.scale(0.1, 0.1, 0.1);
      drawShape(CG.sphere, [1,1,1]);
      m.restore();
    }

    // if (LC) {
    //   if (LC.isDown() && shoot) {

    //   }
    // }



    m.save();
    m.translate(-shape[0], -shape[1], -shape[2]);
    drawShip();
    m.restore();
  }

   /*-----------------------------------------------------------------
      Here is where we draw avatars and controllers.
   -----------------------------------------------------------------*/

  for (let id in MR.avatars) {

    const avatar = MR.avatars[id];

    if (avatar.mode === MR.UserType.vr) {
      if (MR.playerid === avatar.playerid)
        continue;

      let headsetPos = avatar.headset.position;
      let headsetRot = avatar.headset.orientation;

      if (headsetPos == null || headsetRot == null)
        continue;

      if (typeof headsetPos == 'undefined') {
        console.log(id);
        console.log("not defined");
      }

      const rcontroller = avatar.rightController;
      const lcontroller = avatar.leftController;

      let hpos = headsetPos.slice();
      hpos[1] += EYE_HEIGHT;


      /*

      //get all avatars in
      if (id == '')
        drawHeadset1(hpos, headsetRot);
      if (id == '')
        drawHeadset1(hpos, headsetRot);
      if (id == '')
        drawHeadset2(hpos, headsetRot);

        */

      drawHeadset(hpos, headsetRot);
      let lpos = lcontroller.position.slice();
      lpos[1] += EYE_HEIGHT;
      let rpos = rcontroller.position.slice();
      rpos[1] += EYE_HEIGHT;

      drawSyncController(rpos, rcontroller.orientation, [1, 0, 0]);
      drawSyncController(lpos, lcontroller.orientation, [0, 1, 1]);
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
    this.BGM.updateListener(input.HS.position(), input.HS.orientation());


    // Here you initiate the 360 spatial audio playback from a given position,
    // in this case controller position, this can be anything,
    // i.e. a speaker, or an drum in the room.
    // You must provide the path given, when you construct the audio context.

    // if (input.LC && input.LC.press())
    //   this.audioContext1.playFileAt('assets/audio/blop.wav', input.LC.position());

    // if (input.RC && input.RC.press())
    //   this.audioContext2.playFileAt('assets/audio/peacock.wav', input.RC.position());
    this.BGM.playFileAt('assets/audio/coward.mp3', input.HS.position());
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
    //    in VR than on desktop
    //    currently setting to the same callback as on desktop
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

//function pollGrab(state) {
//  let input = state.input;
//  if ((input.LC && input.LC.isDown()) || (input.RC && input.RC.isDown())) {
//
//    let controller = input.LC.isDown() ? input.LC : input.RC;
//    for (let i = 0; i < MR.objs.length; i++) {
//      //ALEX: Check if grabbable.
//      let isGrabbed = checkIntersection(controller.position(), MR.objs[i].shape);
//      //requestLock(MR.objs[i].uid);
//      if (isGrabbed == true) {
//        if (MR.objs[i].lock.locked) {
//          MR.objs[i].position = controller.position();
//          const response =
//          {
//            type: "object",
//            uid: MR.objs[i].uid,
//            state: {
//              position: MR.objs[i].position,
//              orientation: MR.objs[i].orientation,
//            },
//            lockid: MR.playerid,
//
//          };
//
//          MR.syncClient.send(response);
//        } else {
//          MR.objs[i].lock.request(MR.objs[i].uid);
//        }
//      }
//    }
//  }
//}
//
//function releaseLocks(state) {
//  let input = state.input;
//  if ((input.LC && !input.LC.isDown()) && (input.RC && !input.RC.isDown())) {
//    for (let i = 0; i < MR.objs.length; i++) {
//      if (MR.objs[i].lock.locked == true) {
//        MR.objs[i].lock.locked = false;
//        MR.objs[i].lock.release(MR.objs[i].uid);
//      }
//    }
//  }
//}
