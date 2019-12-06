"use strict"

// NOTE TO ALEX AND BEN: LOOK FOR THE STRING "avatarMatrix"

/*--------------------------------------------------------------------------------

The proportions below just happen to match the dimensions of my physical space
and the tables in that space.

Note that I measured everything in inches, and then converted to units of meters
(which is what VR requires) by multiplying by 0.0254.

--------------------------------------------------------------------------------*/

const inchesToMeters = inches => inches * 0.0254;
const metersToInches = meters => meters / 0.0254;

const EYE_HEIGHT      = inchesToMeters( 69);
const HALL_LENGTH     = inchesToMeters(306);
const HALL_WIDTH      = inchesToMeters(215);
const RING_RADIUS     = 0.0425;
const TABLE_DEPTH     = inchesToMeters( 30);
const TABLE_HEIGHT    = inchesToMeters( 29);
const TABLE_WIDTH     = inchesToMeters( 60);
const TABLE_THICKNESS = inchesToMeters( 11/8);
const LEG_THICKNESS   = inchesToMeters(  2.5);

let enableModeler = true;

let lathe = CG.createMeshVertices(10, 16, CG.uvToLathe,
             [ CG.bezierToCubic([-1.0,-1.0,-0.7,-0.3,-0.1 , 0.1, 0.3 , 0.7 , 1.0 ,1.0]),
               CG.bezierToCubic([ 0.0, 0.5, 0.8, 1.1, 1.25, 1.4, 1.45, 1.55, 1.7 ,0.0]) ]);

////////////////////////////// SCENE SPECIFIC CODE

async function setup(state) {
    hotReloadFile(getPath('metanook2.js'));

    const images = await imgutil.loadImagesPromise([
       getPath("textures/wood.png"),
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
                state.uTexScale    = gl.getUniformLocation(program, 'uTexScale');
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

    switch (hasVertexTangent) {

    case 0:
    {
    let aUV  = gl.getAttribLocation(state.program, 'aUV');
    gl.enableVertexAttribArray(aUV);
    gl.vertexAttribPointer(aUV , 2, gl.FLOAT, false, bpe * VERTEX_SIZE, bpe * 6);
    }
    break;

    case 1:
    {
    let aTan = gl.getAttribLocation(state.program, 'aTan');
    gl.enableVertexAttribArray(aTan);
    gl.vertexAttribPointer(aTan, 3, gl.FLOAT, false, bpe * VERTEX_SIZE, bpe * 6);

    let aUV  = gl.getAttribLocation(state.program, 'aUV');
    gl.enableVertexAttribArray(aUV);
    gl.vertexAttribPointer(aUV , 2, gl.FLOAT, false, bpe * VERTEX_SIZE, bpe * 9);
    break;
    }

    }

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
}

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

function onStartFrame(t, state) {

    if (! state.avatarMatrixForward) {
       state.avatarMatrixForward = CG.matrixIdentity();
       state.avatarMatrixInverse = CG.matrixIdentity();
    }

    /*-----------------------------------------------------------------

    Whenever the user enters VR Mode, create the left and right
    controller handlers.

    Also, for my particular use, I have set up a particular transformation
    so that the virtual room would match my physical room, putting the
    resulting matrix into state.calibrate. If you want to do something
    similar, you would need to do a different calculation based on your
    particular physical room.

    -----------------------------------------------------------------*/

    if (MR.VRIsActive()) {
       if (! state.LC) state.LC = new ControllerHandler(MR.leftController);
       if (! state.RC) state.RC = new ControllerHandler(MR.rightController);
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
    if (cursorXYZ[2] && state.cursorPrev[2]) {
       if (state.turnAngle === undefined)
          state.turnAngle = state.tiltAngle = 0;
       state.turnAngle -= Math.PI/2 * (cursorXYZ[0] - state.cursorPrev[0]);
       state.tiltAngle += Math.PI/2 * (cursorXYZ[1] - state.cursorPrev[1]);
    }
    state.cursorPrev = cursorXYZ;

    // SET UNIFORMS AND GRAPHICAL STATE BEFORE DRAWING.

    gl.uniform3fv(state.uCursorLoc, cursorXYZ);
    gl.uniform1f (state.uTimeLoc  , state.time);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
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

    if (enableModeler && state.LC) {
       if (state.RC.isDown()) {
          menuChoice = findInMenu(state.RC.position(), state.LC.tip());
          if (menuChoice >= 0 && state.LC.press()) {
             state.isNewObj = true;
             objs.push(new Obj(menuShape[menuChoice]));
          }
       }
       if (state.isNewObj) {
          let obj = objs[objs.length - 1];
          obj.position = state.LC.tip().slice();
          obj.orientation = state.LC.orientation().slice();
       }
       if (state.LC.release())
          state.isNewObj = false;
    }

    if (state.LC) {
       let LP = state.LC.center();
       let RP = state.RC.center();
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
       let lx = getX(state.LC);
       let rx = getX(state.RC);
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

let objs = [];

function onDraw(t, projMat, viewMat, state, eyeIdx) {

    viewMat = CG.matrixMultiply(viewMat, state.avatarMatrixInverse);
    gl.uniformMatrix4fv(state.uViewLoc, false, new Float32Array(viewMat));
    gl.uniformMatrix4fv(state.uProjLoc, false, new Float32Array(projMat));

    let prev_shape = null;

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
       gl.drawArrays(shape == CG.cube ? gl.TRIANGLES : gl.TRIANGLE_STRIP, 0, shape.length / VERTEX_SIZE);
       prev_shape = shape;
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

    let drawController = (C, hand) => {
       let P = C.position();
       m.save();
          m.multiply(state.avatarMatrixForward);
          m.translate(P);
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

    m.identity();

    /*-----------------------------------------------------------------

    Notice that the actual drawing for my application is done in the
    onDraw() function, whereas the controller logic is done in the
    onStartFrame() function. Whatever your application, it is
    important to make this separation.

    -----------------------------------------------------------------*/

    if (state.LC) {
       drawController(state.LC, 0);
       drawController(state.RC, 1);
       if (enableModeler && state.RC.isDown())
          showMenu(state.RC.position());
    }

    /*-----------------------------------------------------------------

    This is where I draw the objects that have been created.

    If I were to make these objects interactive (that is, responsive
    to the user doing things with the controllers), that logic would
    need to go into onStartFrame(), not here.

    -----------------------------------------------------------------*/

    for (let n = 0 ; n < objs.length ; n++) {
       let obj = objs[n], P = obj.position;
       m.save();
          m.multiply(state.avatarMatrixForward);
          m.translate(P);
          m.rotateQ(obj.orientation);
          m.scale(.03,.03,.03);
          drawShape(obj.shape, [1,1,1]);
       m.restore();
    }

    m.translate(0, -EYE_HEIGHT, 0);
    m.rotateX(state.tiltAngle);
    m.rotateY(state.turnAngle);

    /*-----------------------------------------------------------------

    Notice that I make the room itself as an inside-out cube, by
    scaling x,y and z by negative amounts. This negative scaling
    is a useful general trick for creating interiors.

    -----------------------------------------------------------------*/

    m.save();
       m.translate(0, HALL_WIDTH/2, 0);
       m.scale(-HALL_WIDTH/2, -HALL_WIDTH/2, -HALL_LENGTH/2);
       drawShape(CG.cube, [1,1,1], 1, 2);
    m.restore();

    m.save();
       m.translate((HALL_WIDTH - TABLE_DEPTH) / 2, 0, 0);
       drawTable(0);
    m.restore();

    m.save();
       m.translate((TABLE_DEPTH - HALL_WIDTH) / 2, 0, 0);
       drawTable(1);
    m.restore();

    m.save();
       m.translate(0, 2 * TABLE_HEIGHT, (TABLE_DEPTH - HALL_WIDTH) / 2);
       //m.aimZ([Math.cos(state.time),Math.sin(state.time),0]);
       m.scale(.06,.06,.6);
       //drawShape(lathe, [1,.2,0]);
    m.restore();

    let A = [0,0,0];
    let B = [1+.4*Math.sin(2 * state.time),.4*Math.cos(2 * state.time),0];
    let C = CG.ik(.7,.7,B,[0,-1,2]);

    m.save();
       m.translate(-.5, 2.5 * TABLE_HEIGHT, (TABLE_DEPTH - HALL_WIDTH) / 2);
       //m.rotateY(state.time);
       m.scale(.7);
/*
       m.save();
          m.translate(A).scale(.07);
          drawShape(CG.sphere, [1,1,1]);
       m.restore();

       m.save();
          m.translate(B).scale(.07);
          drawShape(CG.sphere, [1,1,1]);
       m.restore();

       m.save();
          m.translate(C).scale(.07);
          drawShape(CG.sphere, [1,1,1]);
       m.restore();
*/
       m.save();
          m.translate(CG.mix(A,C,.5)).aimZ(CG.subtract(A,C)).scale(.05,.05,.37);
          drawShape(lathe, [0,.2,1]);
       m.restore();

       m.save();
          m.translate(CG.mix(C,B,.5)).aimZ(CG.subtract(C,B)).scale(.03,.03,.37);
          drawShape(lathe, [0,.2,1]);
       m.restore();

    m.restore();
}

function onEndFrame(t, state) {

    /*-----------------------------------------------------------------

    The below two lines are necessary for making the controller handler
    logic work properly -- in particular, detecting press() and release()
    actions.

    -----------------------------------------------------------------*/

    if (state.LC) state.LC.onEndFrame();
    if (state.RC) state.RC.onEndFrame();
}

export default function main() {
    const def = {
        name         : 'metanook2',
        setup        : setup,
        onStartFrame : onStartFrame,
        onEndFrame   : onEndFrame,
        onDraw       : onDraw,
    };
    return def;
}

