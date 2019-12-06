"use strict"

/*
   Things you might want to try:
      object modify: move, rotate, scale, clone, delete, color, proportions
*/

/*--------------------------------------------------------------------------------

The proportions below just happen to match the dimensions of my physical space
and the tables in that space.

Note that I measured everything in inches, and then converted to units of meters
(which is what VR requires) by multiplying by 0.0254.

--------------------------------------------------------------------------------*/

////////////////////////////// SCENE SPECIFIC CODE

const EYE_HEIGHT       = 0.0254 *  69;
const HALL_LENGTH      = 0.0254 * 306;
const HALL_WIDTH       = 0.0254 * 213;
const TABLE_DEPTH      = 0.0254 *  30;
const TABLE_HEIGHT     = 0.0254 *  29;
const TABLE_WIDTH      = 0.0254 *  60;
const TABLE_THICKNESS  = 0.0254 *  11/8;
const LEG_THICKNESS    = 0.0254 *   2.5;

let noise = new ImprovedNoise();

// (New Info): constants can be reloaded without worry
let VERTEX_SIZE = 8;

// (New Info): temp save modules as global "namespaces" upon loads
let MNcontroller;
let gfx;

// (New Info):
// handle reloading of imports (called in setup() and in onReload())
async function initCommon(state) {
    MNcontroller = await MR.dynamicImport(
        getPath('lib/MetaNook_OCtouchcontroller.js')
    );
    // (New Info): use the previously loaded module saved in state, use in global scope
    // TODO automatic re-setting of loaded libraries to reduce boilerplate?
    gfx = state.gfx;

    state.m = new gfx.Matrix();
    // (New Info):
    // This loop could take all exports from a module and
    // add them to the state object.
    // If you really wanted, you could add multiple imports from different
    // modules into the same spot so you wouldn't have to have unique namespaces
    // for all of the separate files. However, it would be easy to clobber
    // imports with the same name (from different modules) this way.
    // const modKeys  = Object.keys(gfx);
    // const keyCount = modKeys.length;
    // for (let i = 0; i < keyCount; i += 1) {
    //     state[modKeys[i]] = gfx[modKeys[i]];
    // }
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
    hotReloadFile(getPath('week9.js'));
    // (New Info): Here I am loading the graphics module once
    // This is for the sake of example:
    // I'm making the arbitrary decision not to support
    // reloading for this particular module. Otherwise, you should
    // do the import in the "initCommon" function that is also called
    // in onReload, just like the other import done in initCommon
    // the gfx module is saved to state so I can recover it
    // after a reload
    state.gfx = await MR.dynamicImport(getPath('lib/graphics.js'));
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

    // (New Info): editor state in a sub-object that can be cached
    // for convenience
    // e.g. const editor = state.editor; 
    state.editor = {
        menuShape : [gfx.cube, gfx.sphere, gfx.cylinder, gfx.torus],
        objs : [],
        menuChoice : -1
    };
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
    const m      = state.m;

    if (MR.VRIsActive()) {
        if (!input.LC) input.LC = new MNController.ControllerHandler(MR.leftController, state.m);
        if (!input.RC) input.RC = new MNController.ControllerHandler(MR.rightController, state.m);

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
       let p = input.cursor.position(), canvas = MR.getCanvas();
       return [ p[0] / canvas.clientWidth * 2 - 1, 1 - p[1] / canvas.clientHeight * 2, p[2] ];
    }

    const cursorXYZ = cursorValue();
    let cursorPrev = input.cursorPrev;
    if (cursorXYZ[2] && cursorPrev[2]) {
        input.turnAngle -= Math.PI/2 * (cursorXYZ[0] - cursorPrev[0]);
        input.tiltAngle += Math.PI/2 * (cursorXYZ[1] - cursorPrev[1]);
    }
    input.cursorPrev = cursorXYZ;

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
    const objs      = editor.objs;
    const menuShape = editor.menuShape;
    if (input.LC) {
        if (input.RC.isDown()) {
	        editor.menuChoice = findInMenu(input.RC.position(), input.LC.tip());
	        if (editor.menuChoice >= 0 && input.LC.press()) {
	            editor.isNewObj = true;
	            objs.push(new Obj(menuShape[editor.menuChoice]));
	        }
        }
        if (editor.isNewObj) {
            let obj = objs[objs.length - 1];
	        obj.position = input.LC.tip().slice();
	        obj.orientation = input.LC.orientation().slice();
        }
        if (input.LC.release())
            editor.isNewObj = false;
    }
}

let menuX = [-.2,-.1,-.2,-.1];
let menuY = [ .1, .1,  0,  0];

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
    gl.uniformMatrix4fv(state.uViewLoc, false, new Float32Array(viewMat));
    gl.uniformMatrix4fv(state.uProjLoc, false, new Float32Array(projMat));

    let prevShape = null;

    // (New Info): cache some of the objects for convenience
    const m          = state.m;
    const cube       = gfx.cube;
    const sphere     = gfx.sphere;
    const cylinder   = gfx.cylinder;
    const torus      = gfx.torus;

    const editor = state.editor;
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
       gl.uniform3fv(state.uColorLoc, color);
       gl.uniformMatrix4fv(state.uModelLoc, false, m.value());
       gl.uniform1i(state.uTexIndexLoc, texture === undefined ? -1 : texture);
       gl.uniform1f(state.uTexScale, textureScale === undefined ? 1 : textureScale);
       if (shape != prevShape)
          gl.bufferData(gl.ARRAY_BUFFER, new Float32Array( shape ), gl.STATIC_DRAW);
       // (New Info): shape == cube may have unexpected results when reloading - need to verify
       // This is the main reason I decided not to reload the graphics file - this comparison might fail
       gl.drawArrays(shape == cube ? gl.TRIANGLES : gl.TRIANGLE_STRIP, 0, shape.length / VERTEX_SIZE);
       prevShape = shape;
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
	     m.translate(x + menuX[n], y + menuY[n], z);
	     m.scale(.03, .03, .03);
	     drawShape(editor.menuShape[n], n == editor.menuChoice ? [1,.5,.5] : [1,1,1]);
          m.restore();
       }
    }

    /*-----------------------------------------------------------------

    drawTabbe() just happens to model the physical size and shape of the
    tables in my lab (measured in meters). If you want to model physical
    furniture, you will probably want to do something different.

    -----------------------------------------------------------------*/

    let drawTable = () => {
       m.save();
          m.translate(0, TABLE_HEIGHT - TABLE_THICKNESS/2, 0);
          m.scale(TABLE_DEPTH/2, TABLE_THICKNESS/2, TABLE_WIDTH/2);
          drawShape(cube, [1,1,1], 0);
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
                drawShape(cube, [.5,.5,.5]);
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

    let drawController = (C, color) => {
       let P = C.position(), s = C.isDown() ? .0125 : .0225;
       m.save();
          m.translate(P[0], P[1], P[2]);
          m.rotateQ(C.orientation());
	  m.save();
	     m.translate(-s,0,.001);
	     m.scale(.0125,.016,.036);
             drawShape(cube, color);
	  m.restore();
	  m.save();
	     m.translate( s,0,.001);
	     m.scale(.0125,.016,.036);
             drawShape(cube, color);
	  m.restore();
	  m.save();
	     m.translate(0,0,.025);
	     m.scale(.015,.015,.01);
             drawShape(cube, [0,0,0]);
	  m.restore();
	  m.save();
	     m.translate(0,0,.035);
	     m.rotateX(.5);
	     m.save();
	        m.translate(0,-.001,.035);
	        m.scale(.014,.014,.042);
                drawShape(cylinder, [0,0,0]);
	     m.restore();
	     m.save();
	        m.translate(0,-.001,.077);
	        m.scale(.014,.014,.014);
                drawShape(sphere, [0,0,0]);
	     m.restore();
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

    if (input.LC) {
       drawController(input.LC, [1,0,0]);
       drawController(input.RC, [0,1,1]);
       if (input.RC.isDown())
          showMenu(input.RC.position());
    }

    /*-----------------------------------------------------------------

    This is where I draw the objects that have been created.

    If I were to make these objects interactive (that is, responsive
    to the user doing things with the controllers), that logic would
    need to go into onStartFrame(), not here.

    -----------------------------------------------------------------*/
    let objs = editor.objs;
    for (let n = 0 ; n < objs.length ; n++) {
       let obj = objs[n], P = obj.position;
       m.save();
           m.translate(P[0], P[1], P[2]);
           m.rotateQ(obj.orientation);
           m.scale(.03,.03,.03);
	       drawShape(obj.shape, [1,1,1]);
       m.restore();
    }

    if (state.calibrate)
       m.set(state.calibrate);

    m.translate(0, -EYE_HEIGHT, 0);
    m.rotateX(input.tiltAngle);
    m.rotateY(input.turnAngle);

    /*-----------------------------------------------------------------

    Notice that I make the room itself as an inside-out cube, by
    scaling x,y and z by negative amounts. This negative scaling
    is a useful general trick for creating interiors.

    -----------------------------------------------------------------*/

    m.save();
       m.translate(0, HALL_WIDTH/2, 0);
       m.scale(-HALL_WIDTH/2, -HALL_WIDTH/2, -HALL_LENGTH/2);
       drawShape(cube, [1,1,1], 1, 2);
    m.restore();

    m.save();
       m.translate((HALL_WIDTH - TABLE_DEPTH) / 2, 0, 0);
       drawTable();
    m.restore();

    m.save();
       m.translate((TABLE_DEPTH - HALL_WIDTH) / 2, 0, 0);
       drawTable();
    m.restore();

}

function onEndFrame(t, state) {

    /*-----------------------------------------------------------------

    The below two lines are necessary for making the controller handler
    logic work properly -- in particular, detecting press() and release()
    actions.

    -----------------------------------------------------------------*/
    const input  = state.input;
    if (input.LC) input.LC.onEndFrame();
    if (input.RC) input.RC.onEndFrame();
}

export default function main() {
    const def = {
        name         : 'YOUR_NAME_HERE week9',
        setup        : setup,
        onStartFrame : onStartFrame,
        onEndFrame   : onEndFrame,
        onDraw       : onDraw,

        // (New Info): New callbacks:
            
        // VR-specific drawing callback
        // e.g. for when the UI must be different 
        //      in VR than on desktop
        //      currently setting to the same callback as on desktop
        onDrawXR     : onDraw, 
        // call upon reload
        onReload     : onReload,
        // call upon world exit
        onExit       : onExit
    };
    return def;
}

