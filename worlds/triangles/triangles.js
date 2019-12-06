"use strict"

// don't remove "use strict"

// variable declarations:

//////////////////////////
let cursor = null;

const usingTriList  = true;
const usingIndexing = true;

// tri list data
const triListVertexCount = 6;
const triListVertexData = new Float32Array(
    [-1,1,0, -1,-1,0, 1,-1,0, 1,-1,0, 1,1,0, -1,1,0] // 18 * 4 = 72 bytes
);
// indexed example
const triListIndexedVertexData = new Float32Array(
    [-1,1,0, -1,-1,0, 1,-1,0, 1,1,0] // 12 * 4 = 48 bytes
);
const triListElementCount = 6;
const triListElementData = new Uint16Array(
    [0, 1, 2, 2, 3, 0] // 6 * 2 = 12 bytes, 48 + 12 = 60 bytes (12 byte savings for JUST a quad)
);

// tri strip data
const triStripVertexCount = 4;
const triStripVertexData =  new Float32Array(
    [-1,1,0, 1,1,0, -1,-1,0, 1,-1,0] // 12 * 4 = 48 bytes 
            // (better than triangle lists for one quad, 
            // but indexed triangle lists may save memory at scale 
            // depending on how your meshes are organized and how easy it is to organize 
            // in triangles or strips)
);
// for indexed example
const triStripIndexedVertexData =  new Float32Array(
    [-1,1,0, 1,1,0, -1,-1,0, 1,-1,0] // 12 * 4 = 48 bytes
);
const triStripElementCount = 4;
const triStripElementData = new Uint16Array(
    [0, 1, 2, 3] // 4 * 2 = 8 bytes, 48 + 8 = 56 bytes 
    // (no savings in this case, 
    // a more complex shape with overlapping vertices would be needed to see the difference)
);



// editor recompiled shader
let recompiled = false;

//////////////////////////

function initTriangleList(state) {
    console.log("triangle list");

    // vertex array object (VAO) stores the format of the vertex data, stores vertex objects
    state.vao = gl.createVertexArray();
    gl.bindVertexArray(state.vao);

    // create a vertex buffer object (VBO) to store attribute data (GPU memory)
    // you can interleave attribute data or store it across multiple buffers
    // you can make multiple buffers, or oftentimes store data for many objects
    // in one buffer
    state.vbo = gl.createBuffer();
    // bind it (mark it as the current buffer we're looking at)
    gl.bindBuffer(gl.ARRAY_BUFFER, state.vbo);

    // upload the data to the GPU
    gl.bufferData(
        gl.ARRAY_BUFFER, // target type of buffer
        
        triListVertexData, // triangle strip vertex data
        
        gl.STATIC_DRAW // STATIC_DRAW, DYNAMIC_DRAW, and STREAM_DRAW are
                       // hints to the GPU driver to signal whether:
                       // the data will 
                       //   STATIC  never be changed,
                       //   DYNAMIC sometimes be changed, or 
                       //   STREAM  continuously be changed,
    );

    // tell the GPU what per-vertex attributes exist in the uploaded data (setting a pointer
    // and offsets to mark where in the buffer each attribute is, we currently have one attribute: position)
    state.aPosLoc = gl.getAttribLocation(state.program, 'aPos');
    gl.enableVertexAttribArray(state.aPosLoc);
    gl.vertexAttribPointer(
        state.aPosLoc,                            // attributeLocation: 
                                            //      the layout location of the attribute (see vertex shader)
        3,                                  // size: 
                                            //      3 components per iteration vec3(x, y, z)
        gl.FLOAT,                           // type: 
                                            //      the data is 32-bit floats 
        false,                              // normalize: 
                                            //      false means don't normalize data
        Float32Array.BYTES_PER_ELEMENT * 0, // stride: 
                                            //      distance between end of this attribute data and the next -- 0 here since this is the only vertex attribute for now,
                                            //      otherwise (elementCount * sizeof(type))
        Float32Array.BYTES_PER_ELEMENT * 0  // offset: 
                                            //       set the offset of this attribute's data 
                                            //       within the per-vertex data (0 since this is the only attribute)
    );


    gl.bindVertexArray(null);
}

function initIndexedTriangleList(state) {
    console.log("indexed triangle list");

    // vertex array object (VAO) stores the format of the vertex data, stores vertex objects
    state.vao = gl.createVertexArray();
    gl.bindVertexArray(state.vao);

    // create a vertex buffer object (VBO) to store attribute data (GPU memory)
    // you can interleave attribute data or store it across multiple buffers
    // you can make multiple buffers, or oftentimes store data for many objects
    // in one buffer
    state.vbo = gl.createBuffer();
    // bind it (mark it as the current buffer we're looking at)
    gl.bindBuffer(gl.ARRAY_BUFFER, state.vbo);

    // upload the data to the GPU
    gl.bufferData(
        gl.ARRAY_BUFFER, // target type of buffer
        
        triListIndexedVertexData, // triangle strip vertex data
        
        gl.STATIC_DRAW // STATIC_DRAW, DYNAMIC_DRAW, and STREAM_DRAW are
                       // hints to the GPU driver to signal whether:
                       // the data will 
                       //   STATIC  never be changed,
                       //   DYNAMIC sometimes be changed, or 
                       //   STREAM  continuously be changed,
    );

    // tell the GPU what per-vertex attributes exist in the uploaded data (setting a pointer
    // and offsets to mark where in the buffer each attribute is, we currently have one attribute: position)
    state.aPosLoc = gl.getAttribLocation(state.program, 'aPos');
    gl.enableVertexAttribArray(state.aPosLoc);
    gl.vertexAttribPointer(
        state.aPosLoc,                            // attributeLocation: 
                                            //      the layout location of the attribute (see vertex shader)
        3,                                  // size: 
                                            //      3 components per iteration vec3(x, y, z)
        gl.FLOAT,                           // type: 
                                            //      the data is 32-bit floats 
        false,                              // normalize: 
                                            //      false means don't normalize data
        Float32Array.BYTES_PER_ELEMENT * 0, // stride: 
                                            //      distance between end of this attribute data and the next -- 0 here since this is the only vertex attribute for now,
                                            //      otherwise (elementCount * sizeof(type))
        Float32Array.BYTES_PER_ELEMENT * 0  // offset: 
                                            //       set the offset of this attribute's data 
                                            //       within the per-vertex data (0 since this is the only attribute)
    );

    // for larger meshes with duplicate triangle vertices,
    // an ebo can help you save memory by letting you use
    // indices to refer to the same vertex from a vbo
    state.ebo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, state.ebo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, triListElementData, gl.STATIC_DRAW, 0);

    gl.bindVertexArray(null);
}

function initTriangleStrip(state) {
    console.log("triangle strip");

    // vertex array object (VAO) stores the format of the vertex data, stores vertex objects
    state.vao = gl.createVertexArray();
    gl.bindVertexArray(state.vao);

    // create a vertex buffer object (VBO) to store attribute data (GPU memory)
    // you can interleave attribute data or store it across multiple buffers
    // you can make multiple buffers, or oftentimes store data for many objects
    // in one buffer
    state.vbo = gl.createBuffer();
    // bind it (mark it as the current buffer we're looking at)
    gl.bindBuffer(gl.ARRAY_BUFFER, state.vbo);

    // upload the data to the GPU
    gl.bufferData(
        gl.ARRAY_BUFFER, // target type of buffer
        
        triStripVertexData, // triangle strip vertex data
        
        gl.STATIC_DRAW // STATIC_DRAW, DYNAMIC_DRAW, and STREAM_DRAW are
                       // hints to the GPU driver to signal whether:
                       // the data will 
                       //   STATIC  never be changed,
                       //   DYNAMIC sometimes be changed, or 
                       //   STREAM  continuously be changed,
    );

    // tell the GPU what per-vertex attributes exist in the uploaded data (setting a pointer
    // and offsets to mark where in the buffer each attribute is, we currently have one attribute: position)
    state.aPosLoc = gl.getAttribLocation(state.program, 'aPos');
    gl.enableVertexAttribArray(state.aPosLoc);
    gl.vertexAttribPointer(
        state.aPosLoc,                            // attributeLocation: 
                                            //      the layout location of the attribute (see vertex shader)
        3,                                  // size: 
                                            //      3 components per iteration vec3(x, y, z)
        gl.FLOAT,                           // type: 
                                            //      the data is 32-bit floats 
        false,                              // normalize: 
                                            //      false means don't normalize data
        Float32Array.BYTES_PER_ELEMENT * 0, // stride: 
                                            //      distance between end of this attribute data and the next -- 0 here since this is the only vertex attribute for now,
                                            //      otherwise (elementCount * sizeof(type))
        Float32Array.BYTES_PER_ELEMENT * 0  // offset: 
                                            //       set the offset of this attribute's data 
                                            //       within the per-vertex data (0 since this is the only attribute)
    );


    gl.bindVertexArray(null);
}

function initIndexedTriangleStrip(state) {
    console.log("indexed triangle strip");

    // vertex array object (VAO) stores the format of the vertex data, stores vertex objects
    state.vao = gl.createVertexArray();
    gl.bindVertexArray(state.vao);

    // create a vertex buffer object (VBO) to store attribute data (GPU memory)
    // you can interleave attribute data or store it across multiple buffers
    // you can make multiple buffers, or oftentimes store data for many objects
    // in one buffer
    state.vbo = gl.createBuffer();
    // bind it (mark it as the current buffer we're looking at)
    gl.bindBuffer(gl.ARRAY_BUFFER, state.vbo);

    // upload the data to the GPU
    gl.bufferData(
        gl.ARRAY_BUFFER, // target type of buffer
        
        triStripIndexedVertexData, // triangle strip vertex data
        
        gl.STATIC_DRAW // STATIC_DRAW, DYNAMIC_DRAW, and STREAM_DRAW are
                       // hints to the GPU driver to signal whether:
                       // the data will 
                       //   STATIC  never be changed,
                       //   DYNAMIC sometimes be changed, or 
                       //   STREAM  continuously be changed,
    );

    // tell the GPU what per-vertex attributes exist in the uploaded data (setting a pointer
    // and offsets to mark where in the buffer each attribute is, we currently have one attribute: position)
    state.aPosLoc = gl.getAttribLocation(state.program, 'aPos');
    gl.enableVertexAttribArray(state.aPosLoc);
    gl.vertexAttribPointer(
        state.aPosLoc,                            // attributeLocation: 
                                            //      the layout location of the attribute (see vertex shader)
        3,                                  // size: 
                                            //      3 components per iteration vec3(x, y, z)
        gl.FLOAT,                           // type: 
                                            //      the data is 32-bit floats 
        false,                              // normalize: 
                                            //      false means don't normalize data
        Float32Array.BYTES_PER_ELEMENT * 0, // stride: 
                                            //      distance between end of this attribute data and the next -- 0 here since this is the only vertex attribute for now,
                                            //      otherwise (elementCount * sizeof(type))
        Float32Array.BYTES_PER_ELEMENT * 0  // offset: 
                                            //       set the offset of this attribute's data 
                                            //       within the per-vertex data (0 since this is the only attribute)
    );

    // for larger meshes with duplicate triangle vertices,
    // an ebo can help you save memory by letting you use
    // indices to refer to the same vertex from a vbo
    state.ebo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, state.ebo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, triStripElementData, gl.STATIC_DRAW, 0);

    gl.bindVertexArray(null);
}

function onReload() {

}

// Define a setup function
// to call before your program starts running
//
// This is where you initialize all logic, state, and graphics
// code before your animation loop runs
//
// NOTE: the "state" variable is an optional object passed through the system
// for convenience, e.g. if you want to attach objects to a single package for organization
// For simple programs, globals are fine.
async function setup(state) {

    CanvasUtil.resize(MR.getCanvas(), 1280, 720);

    // MR.server.subsLocal.subscribe("Update_File", (filename, args) => {
    //     if (args.file !== filename) {
    //         console.log("file does not match");
    //         return;
    //     }

    //     MR.wrangler.reloadGeneration += 1;

    //     import(window.location.href + filename + "?generation=" + MR.wrangler.reloadGeneration).then(
    //         (world) => {
    //             const conf = world.default();
    //             MR.wrangler.onReload(conf);
    //         }).catch(err => { console.error(err); });

    // }, saveTo);


    let cursorValue = () => {
       let p = cursor.position(), canvas = MR.getCanvas();
       return [ p[0] / canvas.clientWidth * 2 - 1, 1 - p[1] / canvas.clientHeight * 2, p[2] ];
    }

    // NOTE: we have created custom functions to hook into the system editor functionality
    // Beyond this class you may want to create your own system for creating, compiling, and updating shaders.
    // 
    // For the curious, see system/client/js/lib/gfxutil.js for WebGL utility functions
    // used by the editor. You can use these directly (e.g. for other projects), 
    // but they won't work with the editor
    //
    // see function initGLContext(target, contextNames, contextOptions)
    //     function addShader(program, type, src, errRecord)
    //     function createShaderProgramFromStrings(vertSrc, fragSrc, errRecord)
    // and others for examples

    // Editor Specific:
    // editor library function for loading shader snippets from files on disk
    let libSources = await MREditor.loadAndRegisterShaderLibrariesForLiveEditing(gl, "libs", [
        { 
            key : "pnoise", path : "shaders/noise.glsl", foldDefault : true
        },     
    ]);
    if (!libSources) {
        throw new Error("Could not load shader library");
    }




    // Editor Specific:
    // load vertex and fragment shaders from disk, register with the editor
    // (You can also use MREditor.registerShaderForLiveEditing to load a shader string
    // created in the program
    let shaderSource = await MREditor.loadAndRegisterShaderForLiveEditing(
        // gl context
        gl,
        // name of shader as it should appear in the editor
        "mainShader",
        { 
            // OPTIONAL : callback for before compilation
            onNeedsCompilation : (args, libMap, userData) => {
                const stages = [args.vertex, args.fragment];
                const output = [args.vertex, args.fragment];

                const implicitNoiseInclude = true;
                if (implicitNoiseInclude) {
                    let libCode = MREditor.libMap.get("pnoise");

                    for (let i = 0; i < 2; i += 1) {
                        const stageCode = stages[i];
                        const hdrEndIdx = stageCode.indexOf(';');
                        
                        /*
                        const hdr = stageCode.substring(0, hdrEndIdx + 1);
                        output[i] = hdr + "\n#line 1 1\n" + 
                                    libCode + "\n#line " + (hdr.split('\n').length) + " 0\n" + 
                                    stageCode.substring(hdrEndIdx + 1);
                        console.log(output[i]);
                        */
                        const hdr = stageCode.substring(0, hdrEndIdx + 1);
                        
                        output[i] = hdr + "\n#line 2 1\n" + 
                                    "#include<pnoise>\n#line " + (hdr.split('\n').length + 1) + " 0" + 
                            stageCode.substring(hdrEndIdx + 1);
                    }
                }

                // uses a preprocessor for custom extensions to GLSL
                MREditor.preprocessAndCreateShaderProgramFromStringsAndHandleErrors(
                    output[0],
                    output[1],
                    libMap
                );
            },
            // Required callback for after 
            // the shader program has been compiled
            // the "program" argument is the newly compiled shader program
            //
            // Remember to update the reference to the respective program in
            // your code, and update all the uniform locations, which are no longer valid from
            // the previous version of the program!
            onAfterCompilation : (shaderProgram) => {
                state.program = shaderProgram;

                // a shader must be activated with this call
                gl.useProgram(state.program);

                // store uniform locations 
                // (these point to the memory associated 
                // with the uniform data you wish to update)
                //
                // Individual uniform locations must be updated per-shader
                //
                // NOTE: for the curious, Uniform Buffer Objects (UBO)s
                // can also be used to store bundles of uniforms that can
                // be updated across multiple shaders with one call. 
                // Other graphics APIs use (or require) them as well.
                state.uModelLoc        = gl.getUniformLocation(state.program, 'uModel');
                state.uViewLoc         = gl.getUniformLocation(state.program, 'uView');
                state.uProjLoc         = gl.getUniformLocation(state.program, 'uProj');
                state.uTimeLoc         = gl.getUniformLocation(state.program, 'uTime');
                
                state.uCursorLoc       = gl.getUniformLocation(state.program, 'uCursor');
                state.uResolutionLoc   = gl.getUniformLocation(state.program, 'uResolution');
                state.uAspectLoc       = gl.getUniformLocation(state.program, 'uAspect');

                const cvs = MR.getCanvas();
                // resolution
                gl.uniform2fv(state.uResolutionLoc, new Float32Array([cvs.clientWidth, cvs.clientHeight]));
                // aspect ratio
                gl.uniform1f(state.uAspectLoc, cvs.clientWidth / cvs.clientHeight);

                // reupload the static model matrix
                gl.uniformMatrix4fv(
                    state.uModelLoc, 
                    false, 
                    new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,-1,1])
                );

                recompiled = true;
            } 
        },
        {
            // paths to your shader files 
            paths : {
                vertex   : "shaders/vertex.vert.glsl",
                fragment : "shaders/fragment.frag.glsl"
            },
            // whether the editor should hide the shader sections by  default
            foldDefault : {
                vertex   : false,
                fragment : false
            }
        }
    );
    if (!shaderSource) {
        throw new Error("Could not load shader");
    }

    if (usingIndexing) {
        if (usingTriList) {
            initIndexedTriangleList(state);
        } else {
            initIndexedTriangleStrip(state);
        }
    } else {
        if (usingTriList) {
            initTriangleList(state);
        } else {
            initTriangleStrip(state);
        }
    }

    // set mouse handler
    cursor = ScreenCursor.trackCursor(MR.getCanvas());



    // update resolution upon resize
    CanvasUtil.setOnResizeEventHandler((cvs, w, h) => {
        gl.uniform2fv(state.uResolutionLoc, new Float32Array([w, h]));
        // aspect ratio
        gl.uniform1f(state.uAspectLoc, cvs.clientWidth / cvs.clientHeight);
    });
}


// This function is called once at the start of each frame
// use it to update logic and update graphics state
//
// t is the elapsed time since system start in ms (but you can use your own
// adjusted times locally)
function onStartFrame(t, state) {
    // set start time if this is the first time
    if (state.timeStartMS === -1) { // only occurs once at the beginning
        state.timeStartMS = t;
        state.timeStart   = t / 1000.0;

        // For this world, we want the depth test so opaque
        // objects can be rendered in unsorted order
        gl.enable(gl.DEPTH_TEST);

        // in this simple example, 
        // we only render one static quad to the screen, 
        // which means we only need to upload the model, view, and projection matrices once
        gl.uniformMatrix4fv(
            state.uModelLoc, 
            false, 
            new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,-1,1])
        );
    }

    {
        //////////////////////////
        // update time
        //////////////////////////
        // in milliseconds
        state.timeMS = t - state.timeStartMS;
        // in seconds
        state.time   = state.timeMS / 1000.0; // shaders much prefer time in seconds
        // time between frames
        // in milliseconds 
        state.timeDeltaMS = state.timeMS - state.timePrevMS;
        // in seconds
        state.timeDelta   = state.timeDeltaMS / 1000.0;
        // update the previous time so delta time can be calculated next frame
        // in milliseconds
        state.timePrevMS = state.timeMS;
        // in seconds
        state.timePrev   = state.time;
        //////////////////////////
    }

    // clear the color as well as the depth buffer 
    // (the depth buffer tracks the depth of for each pixels)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // update the time uniform used in our shader
    gl.uniform1f(state.uTimeLoc, state.time);

    gl.bindVertexArray(state.vao);
}

// This function is called every time the frame needs to be drawn,
// 
// by default called after onStartFrame
// NOTE: MAY BE CALLED MULTIPLE TIMES PER FRAME, do not put logic
// here that should be updated only once per frame.
//
// t is the elapsed time since system start in ms (but you can use your own
// adjusted times locally)


// using triangle list
function onDrawTriangleList(t, projMat, viewMat, state) {

    // update the view and projection matrices (Unnecessary if they don't change, but 
    // we don't make that optimization here
    gl.uniformMatrix4fv(state.uViewLoc, false, new Float32Array(viewMat));
    gl.uniformMatrix4fv(state.uProjLoc, false, new Float32Array(projMat));

    gl.drawArrays(gl.TRIANGLES, 0, triListVertexCount);
}

// using indexed triangle list
function onDrawIndexedTriangleList(t, projMat, viewMat, state) {

    // update the view and projection matrices (Unnecessary if they don't change, but 
    // we don't make that optimization here
    gl.uniformMatrix4fv(state.uViewLoc, false, new Float32Array(viewMat));
    gl.uniformMatrix4fv(state.uProjLoc, false, new Float32Array(projMat));

    gl.drawElements(gl.TRIANGLES, triListElementCount, gl.UNSIGNED_SHORT, 0);
}

// using triangle strips:
function onDrawTriangleStrip(t, projMat, viewMat, state) {

    // update the view and projection matrices (Unnecessary if they don't change, but 
    // we don't make that optimization here
    gl.uniformMatrix4fv(state.uViewLoc, false, new Float32Array(viewMat));
    gl.uniformMatrix4fv(state.uProjLoc, false, new Float32Array(projMat));

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, triStripVertexCount);
}

function onDrawIndexedTriangleStrip(t, projMat, viewMat, state) {

    // update the view and projection matrices (Unnecessary if they don't change, but 
    // we don't make that optimization here
    gl.uniformMatrix4fv(state.uViewLoc, false, new Float32Array(viewMat));
    gl.uniformMatrix4fv(state.uProjLoc, false, new Float32Array(projMat));

    // indexed data uses drawElements, which takes the primitive type,
    // the number of indices, the type of indices (could be different byte sizes), and
    // a byte offset into the buffer
    gl.drawElements(gl.TRIANGLE_STRIP, triStripElementCount, gl.UNSIGNED_SHORT, 0);
}

// which example to use?
let onDraw;
if (usingIndexing) {
    onDraw = (usingTriList) ? onDrawIndexedTriangleList : onDrawIndexedTriangleStrip;
} else {
    onDraw = (usingTriList) ? onDrawTriangleList : onDrawTriangleStrip;
}



// This function is called at the end of the frame, after onDraw
// 
// Use it if you want to do some debug logging, performance statistics,
// or miscellaneous I/O based on the current frame 
//
// t is the elapsed time since system start in ms (but you can use your own
// adjusted times locally) 
function onEndFrame(t, state) {
    gl.bindVertexArray(null);
}

// NOTE: You must "export default" a function that returns an object
// with these exact properties set to your function callbacks
export default function main() {
    const def = {
        name         : 'triangles',
        setup        : setup,
        onStartFrame : onStartFrame,
        onEndFrame   : onEndFrame,
        onDraw       : onDraw,
        onReload     : onReload
    };

    return def;
}
