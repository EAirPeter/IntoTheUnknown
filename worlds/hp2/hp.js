"use strict"

// math utilities ///////////////////////////////////////////////////////////////
const cos = Math.cos;
const sin = Math.sin;
const tan = Math.tan;
const acos = Math.acos;
const asin = Math.asin;
const atan = Math.atan;
const atan2 = Math.atan2;
const π = Math.PI;

function clamp(val,min_,max_){return Math.max(min_,Math.min(max_,val));}

function vec3_normalize(arr, out) {
    out = out || new Float32Array([0.0, 0.0, 0.0]);
    const x = arr[0];
    const y = arr[1];
    const z = arr[2];

    let len = (x * x) + (y * y) + (z * z);
    if (len > 0) {
        len = 1 / Math.sqrt(len);
    }
    out[0] = arr[0] * len;
    out[1] = arr[1] * len;
    out[2] = arr[2] * len;

    return out;
}

function vec4_normalize(arr, out) {
    out = out || new Float32Array([0.0, 0.0, 0.0, 0.0]);
    const x = arr[0];
    const y = arr[1];
    const z = arr[2];
    const w = arr[3];

    let len = (x * x) + (y * y) + (z * z) + (w * w);
    if (len > 0) {
        len = 1 / Math.sqrt(len);
    }
    out[0] = arr[0] * len;
    out[1] = arr[1] * len;
    out[2] = arr[2] * len;
    out[3] = arr[3] * len;

    return out;
}

function vec3_dot(v0, v1) {
    return (v0[0] * v1[0]) +
           (v0[1] * v1[1]) +
           (v0[2] * v1[2]);
}

function vec4_dot(v0, v1) {
    return (v0[0] * v1[0]) +
           (v0[1] * v1[1]) +
           (v0[2] * v1[2]) +
           (v0[3] * v1[3]);
}

function vec3_scale(v, s, out) {
    out = out || new Float32Array([0, 0, 0]);
    out[0] = v[0] * s;
    out[1] = v[1] * s;
    out[2] = v[2] * s;

    return out;
}

function vec4_scale(v, s, out) {
    out = out || new Float32Array([0, 0, 0, 0]);
    out[0] = v[0] * s;
    out[1] = v[1] * s;
    out[2] = v[2] * s;
    out[3] = v[3] * s;

    return out;
}

function vec3_project(v0, v1, out) {
    out = out || new Float32Array([0, 0, 0]);
    return vec3_scale(v1, vec3_dot(v0, v1) / vec3_dot(v0, v0), out);
}

function vec4_project(v0, v1, out) {
    out = out || new Float32Array([0, 0, 0, 0]);
    return vec4_scale(v1, vec3_dot(v0, v1) / vec3_dot(v0, v0), out);
}

function vec3_add(v0, v1, out) {
    out = out || new Float32Array([0, 0, 0]);
    out[0] = v0[0] + v1[0];
    out[1] = v0[1] + v1[1];
    out[2] = v0[2] + v1[2];

    return out;
}

function vec4_add(v0, v1, out) {
    out = out || new Float32Array([0, 0, 0, 0]);
    out[0] = v0[0] + v1[0];
    out[1] = v0[1] + v1[1];
    out[2] = v0[2] + v1[2];
    out[3] = v0[3] + v1[3];

    return out;
}

function vec3_subtract(v0, v1, out) {
    out = out || new Float32Array([0, 0, 0]);
    out[0] = v0[0] - v1[0];
    out[1] = v0[1] - v1[1];
    out[2] = v0[2] - v1[2];

    return out;
}

function vec4_subtract(v0, v1, out) {
    out = out || new Float32Array([0, 0, 0, 0]);
    out[0] = v0[0] - v1[0];
    out[1] = v0[1] - v1[1];
    out[2] = v0[2] - v1[2];
    out[3] = v0[3] - v1[3];

    return out;
}

function vec3_multiply(v0, v1, out) {
    out = out || new Float32Array([0, 0, 0]);
    out[0] = v0[0] * v1[0];
    out[1] = v0[1] * v1[1];
    out[2] = v0[2] * v1[2];

    return out;    
}

function vec4_multiply(v0, v1, out) {
    out = out || new Float32Array([0, 0, 0, 0]);
    out[0] = v0[0] * v1[0];
    out[1] = v0[1] * v1[1];
    out[2] = v0[2] * v1[2];
    out[3] = v0[3] * v1[3];

    return out;    
}

function vec3_divide(v0, v1, out) {
    out = out || new Float32Array([0, 0, 0]);
    out[0] = v0[0] / v1[0];
    out[1] = v0[1] / v1[1];
    out[2] = v0[2] / v1[2];

    return out;    
}

function vec4_divide(v0, v1, out) {
    out = out || new Float32Array([0, 0, 0, 0]);
    out[0] = v0[0] / v1[0];
    out[1] = v0[1] / v1[1];
    out[2] = v0[2] / v1[2];
    out[3] = v0[3] / v1[3];

    return out;    
}

// borrowed from glMatrix
/**
 * Calculates a 4x4 matrix from the given quaternion
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {quat} q Quaternion to create matrix from
 *
 * @returns {mat4} out
 */
const fromQuatMat = new Float32Array(16);
function fromQuat(out, q) {
  let x = q[0], y = q[1], z = q[2], w = q[3];
  let x2 = x + x;
  let y2 = y + y;
  let z2 = z + z;

  let xx = x * x2;
  let yx = y * x2;
  let yy = y * y2;
  let zx = z * x2;
  let zy = z * y2;
  let zz = z * z2;
  let wx = w * x2;
  let wy = w * y2;
  let wz = w * z2;

  out[0] = 1 - yy - zz;
  out[1] = yx + wz;
  out[2] = zx - wy;
  out[3] = 0;

  out[4] = yx - wz;
  out[5] = 1 - xx - zz;
  out[6] = zy + wx;
  out[7] = 0;

  out[8] = zx + wy;
  out[9] = zy - wx;
  out[10] = 1 - xx - yy;
  out[11] = 0;

  out[12] = 0;
  out[13] = 0;
  out[14] = 0;
  out[15] = 1;

  return out;
}


function sin01(val) {
    return (1.0 + sin(val)) / 2.0;
}

//////////////////////////////////////////////////////////////////////////////////////



// modules and global objects to load /////////////

let matrixModule    = null;
let geometryModule  = null;
let cubeVertexData  = null;
let cubeIndexData   = null;
let cubeVertexCount = null;
let cubeIndexCount  = null;
let Mat             = null;
let M               = null;

let moveControllerModule = null;
let MovementController       = null;

// called per reload
async function onReload(state) {
    // optionally reload modules in case they have changed as well,
    // and you'd like to update your older objects based on those changes
    // or if you'd like to use some new functions you defined in other modules,
    // for example
    //console.log("onReload start");
    let myModule = null;
    myModule = await MR.dynamicImport(getPath("matrix.js"));
    matrixModule = myModule;
    Mat          = matrixModule.Matrix;
    //console.log("matrix.js");
        
    myModule = await MR.dynamicImport(getPath("geometry.js"))
    geometryModule  = myModule;
    cubeVertexData  = geometryModule.cubeVertexData;
    cubeIndexData   = geometryModule.cubeIndexData;
    cubeVertexCount = geometryModule.cubeVertexCount;
    cubeIndexCount  = geometryModule.cubeIndexCount;
    //console.log("geometry.js");

    myModule = await MR.dynamicImport(getPath("simple_movement_controller.js"))
    
    moveControllerModule = myModule;
    MovementController   = myModule.SimpleMovementController;
    //console.log("simple_movement_controller.js");

    //window.RELOAD_PENDING = false;
    //console.log("onReload end");
}

// note: mark your setup function as "async" if you need to "await" any asynchronous tasks
// (return JavaScript "Promises" like in loadImages())
async function setup(state) {
    CanvasUtil.resize(MR.getCanvas(), 1280, 720);
    
    hotReloadFile(getPath("hp.js"));

    // load modules
    matrixModule = await import(getPath("matrix.js"));
    Mat          = matrixModule.Matrix;
    state.M      = new matrixModule.Dynamic_Matrix4x4_Stack();

    geometryModule  = await import(getPath("geometry.js"));
    cubeVertexData  = geometryModule.cubeVertexData;
    cubeIndexData   = geometryModule.cubeIndexData;
    cubeVertexCount = geometryModule.cubeVertexCount;
    cubeIndexCount  = geometryModule.cubeIndexCount;

    moveControllerModule = await import(getPath("simple_movement_controller.js"));  
    MovementController       = moveControllerModule.SimpleMovementController;

    state.cursor = ScreenCursor.trackCursor(MR.getCanvas());
    // set the default cursor position to be the center of the screen
    state.cursor.position()[0] = MR.getCanvas().clientWidth / 2.0;
    state.cursor.position()[1] = MR.getCanvas().clientHeight / 2.0;

    // initialize keyboard events
    Input.initKeyEvents();

    // specify a world subobject in state specifically for
    // describing the content and behavior of the world, rather than code-specific state
    state.world = { 
        // using the basic controller as a debug camera on the desktop, 
        // could be used to control objects as well
        userCam : new MovementController({
          startPosition : [0.0, 0.0, 5.0],
          acceleration   : 100.0,
          maxSpeed      : 28
        }),
        // this is the test cube that you can select,
        // entities should really be this simple:
        // flat list of properties. Maybe even a list of IDs, 
        // Entity-Component-System style
        objInfo : {
            position : [0, 7, -2],
            velocity : [0, 0, 0], // temp
            acceleration : 100, // temp
            
            isSelected : false,
            // user id of user who selected this object
            isSelectedByUID : -1 
        },
        // once we have more efficient generation of many identical objects in multiple
        // locations, we can spawn these objects on a world grid at runtime (TODO)
        mapDimX : 64,
        mapDimY : 64,
        mapGridSize : 8,
        heightMap : [],
        remoteUserInfo : {

        },
    };
    for (let i = 0; 
        i < (state.world.mapDimX * state.world.mapDimY) / state.world.mapGridSize; 
        i += 1) {
        state.world.heightMap.push({
            h : 0.0, obj : [{init : false, position : [0, 0, 0], scale : [0.5, 0.5, 0.5]}]}
        );
    }

    // NOTE: until we have the finalized multi-user synchronization system,
    // we can use the publish/subscrie system here
    MR.getMessagePublishSubscriber().subscribe("User_State", (_, args) => {
        const info = args.info;
        if (!info) {
            console.warn("no user state found");
            return;
        }

        // save a user record in this specific spot
        //
        // NOTE: may eventually be a good idea to defer using the updated
        // value until another frame to achieve a smoother look
        state.world.remoteUserInfo[info.uid] = info;
    });

    MR.getMessagePublishSubscriber().subscribe("User_Leave", (_, args) => {
        const info = args.info;
        if (!info) {
            console.warn("no user state found");
            return;
        }
        console.log("user left:", info.uid);
        // delete the user record
        delete state.world.remoteUserInfo[info.uid];
        if (MR.viewpointController.playerid == info.uid) {
            MR.viewpointController.playerid = MR.playerid;
        }
    });


    state.fog_color = [53.0 / 255.0, 81.0 / 255.0, 192.0 / 255.0, 1.0];

    // load initial images, then continue setup after waiting is done
    const images = await imgutil.loadImagesPromise([
        getPath("resources/textures/brick.png"),
        getPath("resources/textures/polkadots_transparent.png"),
        getPath("resources/textures/wood.png")
    ]);

    state.videoTexture = GFX.initVideoTexture(gl, gl.TEXTURE3);
    state.video = GFX.setupVideo(getPath("resources/textures/bla2.mp4"));
    state.images = images;

    let libSources = await MREditor.loadAndRegisterShaderLibrariesForLiveEditing(gl, "libs", [
        { 
            key : "pnoise", path : "shaders/noise.glsl", foldDefault : true
        },     
    ]);
    if (!libSources) {
        throw new Error("Could not load shader library");
    }

        let shaderSource = await MREditor.loadAndRegisterShaderForLiveEditing(
            // gl context
            gl,
            // name of shader as it should appear in the editor
            "mainShader",
            { 
                onNeedsCompilation : (args, libMap, userData) => {
                    const stages = [args.vertex, args.fragment];
                    const output = [args.vertex, args.fragment];

                    const implicitNoiseInclude = true;
                    if (implicitNoiseInclude) {
                        let libCode = MREditor.libMap.get("pnoise");

                        for (let i = 0; i < 2; i += 1) {
                            const stageCode = stages[i];
                            const hdrEndIdx = stageCode.indexOf(';');
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
                onAfterCompilation : (program) => {
                    state.program = program;

                    // initialize uniforms (store them in the object passed-in)
                    GFX.getAndStoreIndividualUniformLocations(gl, program, state);

                    // uncomment the line below to get the maximum number of 
                    // texture image units available for your GPU hardware
                    // const maxTextureUnitCount = GL.getParameter(GL.MAX_TEXTURE_IMAGE_UNITS);

                    // set texture unit 0 at uTex0
                    gl.uniform1i(state.uTex0Loc, 0);
                    // set texture unit 1 at uTex1
                    gl.uniform1i(state.uTex1Loc, 1);
                    gl.uniform1i(state.uTex2Loc, 2);
                    gl.uniform1i(state.uTex3Loc, 3);


                    gl.uniform1i(state.uModeLoc, 1);

                    gl.uniform1i(state.uMatIdx, 0);

                    gl.uniform4fv(state.fog_colorLoc, state.fog_color);

                    gl.uniform1i(state.uWhichTextureLoc, 0);

                    state.shader0Info = {
                        lights    : [],
                        materials : []
                    };

                    const lightCount = 1;

                    state.lights = [];


                    state.uLightCountLoc  = gl.getUniformLocation(program, 'u_light_count');
                    gl.uniform1i(state.uLightCountLoc, lightCount);
                    for (let i = 0; i < lightCount; i += 1) {
                        state.shader0Info.lights.push({
                            directionLoc : gl.getUniformLocation(program, 'u_lights[' + i + '].direction'),
                            colorLoc     : gl.getUniformLocation(program, 'u_lights[' + i + '].color')
                        });
                    }
                    state.shader0Info.uAmbientLoc = gl.getUniformLocation(program, 'u_ambient');
                    gl.uniform4fv(state.shader0Info.uAmbientLoc, [0.25, 0.01, 0.2, 1.0]);

                    state.uLightsLoc = gl.getUniformLocation(program, 'u_lights[0].direction');

                    for (let i = 0; i < state.lights.length; i += 1) {
                        const dirArr = state.lights[i].subarray(0, 4);
                        const colorArr = state.lights[i].subarray(4, 8);

                        vec4_normalize(dirArr, dirArr);

                        gl.uniform4fv(state.shader0Info.lights[i].directionLoc, dirArr);
                        gl.uniform4fv(state.shader0Info.lights[i].colorLoc, colorArr)
                    }

                    state.MAT_MODE_FLOOR = 0;
                    state.MAT_MODE_TEXTURE = 1;
                    state.MAT_MODE_COLOR = 2;
                    state.MAT_MODE_USER = 3;

                    state.mat_count = 2;
                    state.u_matsLoc = gl.getUniformLocation(program, 'u_mats');
                    state.shader0Info.materials = [
                        {
                            ambient : [state.fog_color[0], state.fog_color[1], state.fog_color[2]],
                            diffuse : [226. / 255., 88. / 255., 34. / 255.],
                            specular : [0.5, 0.5, 0.5],
                            spec_pow : 1.0,
     //                       mode : 
                        }
                    ];
                    for (let i = 0; i < state.shader0Info.materials.length; i += 1) {
                        const mat = state.shader0Info.materials[i];
                        const prefix = "u_mats[" + i + "].";
                        gl.uniform3fv(gl.getUniformLocation(program, prefix + "ambient"), mat.ambient);
                        gl.uniform3fv(gl.getUniformLocation(program, prefix + "diffuse"), mat.diffuse);
                        gl.uniform3fv(gl.getUniformLocation(program, prefix + "specular"), mat.specular);
                        gl.uniform1f(gl.getUniformLocation(program, prefix + "spec_pow"), mat.spec_pow);
                    }

                    gl.uniform1i(state.uMatIdxLoc, 0);
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

    // save all attribute and uniform locations

    state.aPosLoc = 0;
    state.aNorLoc = 1;
    state.aUVLoc  = 2;

    // attribute state
    state.vao = gl.createVertexArray();
    gl.bindVertexArray(state.vao);

    // this is an object to help assemble multiple triangle geometry
    // into one contiguous buffer,
    // the following functions also create convenience draw"X" functions
    // that know the correct offsets into the buffer to draw the correct shape
    function LayoutBuilder() { 
        this.vertexByteOffset = 0;
        this.indexByteOffset = 0;
        this.vertexOffset = 0;
        this.indexOffset = 0;
        this.vertexCount = 0;
        this.idx = 0;
    }
    state.layoutBuilder = new LayoutBuilder();

    const LB = state.layoutBuilder;

    state.layouts = [
    ];

    function addCubeToBufferLayout(state, lb, layouts, fnName, count = 1) {
        const entry = {
            vertexByteOffset : lb.vertexByteOffset,
            indexByteOffset  : lb.indexByteOffset,
            vertexCount      : cubeVertexCount * count,
            indexCount       : cubeIndexCount * count,
            primitive        : gl.TRIANGLES
        };

        layouts.push(entry);
        lb.vertexByteOffset += entry.vertexCount * Float32Array.BYTES_PER_ELEMENT * count;
        lb.indexByteOffset  += entry.indexCount * Uint16Array.BYTES_PER_ELEMENT * count;
        
        lb.vertexOffset += entry.vertexCount * count;
        lb.indexOffset  += entry.indexCount * count;

        lb.idx += 1;

        state[fnName] = () => {
            gl.drawElements(
                gl.TRIANGLES,
                entry.indexCount * count,
                gl.UNSIGNED_SHORT,
                entry.indexByteOffset 
            )
        }
    }

    addCubeToBufferLayout(state, state.layoutBuilder, state.layouts, "drawCube");


    function generateParametricSphere(vertices, offset, u, v, opts = {}) {
        const rangeFactorTheta = opts.rangeFactorTheta || 1;
        const rangeFactorPhi = opts.rangeFactorPhi || 1;

        const θ = 2 * π * u * rangeFactorTheta;
        const φ = ((π*v) - (π/2)) * rangeFactorPhi;

        const x = cos(θ) * cos(φ);
        const y = sin(θ) * cos(φ);
        const z = sin(φ);

        vertices[offset]     = x;
        vertices[offset + 1] = y;
        vertices[offset + 2] = z;

        vertices[offset + 3] = x;
        vertices[offset + 4] = y;
        vertices[offset + 5] = z;

        vertices[offset + 6] = u;
        vertices[offset + 7] = v;
    }

    function generateParametricTorus(vertices, offset, u, v, opts = {}) {
        const θ = 2 * π * u;
        const φ = 2* π * v;

        const r = opts.r || 0.2;
        const x = cos(θ) * (1 + r*cos(φ));
        const y = sin(θ) * (1 + r*cos(φ));
        const z = r * sin(φ);

        const nx = cos(θ) * cos(φ);
        const ny = sin(θ) * cos(φ);
        const nz = sin(φ);

        vertices[offset]     = x;
        vertices[offset + 1] = y;
        vertices[offset + 2] = z;

        vertices[offset + 3] = nx;
        vertices[offset + 4] = ny;
        vertices[offset + 5] = nz;

        vertices[offset + 6] = u;
        vertices[offset + 7] = v;
    }


    function generateParametricCappedCylinder(vertices, offset, u, v, opts = {}) {
        const c = cos(2 * π * u);
        const s = sin(2 * π * u);
        const z = Math.max(-1, Math.min(1, 10*v - 5))

        let xout  = 0;
        let yout  = 0;
        let zout  = 0;
        let nxout = 0;
        let nyout = 0;
        let nzout = 0;

        switch (Math.floor(5.001 * v)) {
        case 0:
        case 5: {
            zout = z;
            nzout = z;
            break;
        }
        case 1:
        case 4: {
            xout = c;
            yout = s;
            zout = z;

            nzout = z;
            break;
        }
        case 2:
        case 3: {
            xout = c;
            yout = s;
            zout = z;

            nxout = c;
            nyout = s;
            break;
        }
        }

        vertices[offset]     = xout;
        vertices[offset + 1] = yout;
        vertices[offset + 2] = zout;

        vertices[offset + 3] = nxout;
        vertices[offset + 4] = nyout;
        vertices[offset + 5] = nzout;

        vertices[offset + 6] = u;
        vertices[offset + 7] = v;
    }

    function generateParametricGeometryIndexedTriangleStrip(idxOffset, rows, cols, fnEvaluate, opts) {
        if (!fnEvaluate) {
            return null;
        }

        const info = {  
            vertexOffset : 0,
            vertexCount  : 0,
            indexCount   : 0,
            primitive    : gl.TRIANGLE_STRIP
        };

        const triCount = 2 * (rows) * (cols);
        const vtxCount = rows * cols;

        // part 1:
        // sample all of the necessary vertices in the grid
        // part 2:
        // create an index buffer for all sampled vertices
        const indices = []//new Uint16Array((triCount * 3) + ((rows - 2) * 3));
        function push(arr, el) {
            arr.push(el);
        }

        {
            let inc = 8;
            let vertices = new Float32Array(inc * (rows + 1) * (cols + 1));
            let off = 0;
            
            for (let u = 0; u < rows + 1; u += 1) {
                for (let v = 0; v < cols + 1; v += 1) {
                    fnEvaluate(vertices, off, u / rows, v / cols, opts);
                    off += inc;
                }
            }

            {
                let i = idxOffset;
                for (let r = 0; r < rows; r += 2) {
                    // left to right
                    for (let c = 0; c < cols; c += 1) {
                        // add a column, except for the last
                        push(indices, i);
                        push(indices, i + cols + 1);
                        i += 1;
                    }
                    // add only one vertex in the last column,
                    // will be added in right to left phase
                    push(indices, i);
                    i += cols + 1;

                    if (r + 1 >= rows) {
                        continue;
                    }

                    // right to left
                    for (let c = cols - 1; c >= 0; c -= 1) {
                        push(indices, i);
                        push(indices, i + cols + 1);
                        i -= 1;
                    }
                    push(indices, i);
                    i += cols + 1;
                }
                // need to add extraneous vertex
                push(indices, i);

            }


            info.vertices = vertices;
            info.indices  = new Uint16Array(indices);
            info.vertexCount = vertices.length / inc;
            info.indexCount = indices.length;
            return info;
        }

    }

    function addParametricGeometryToBufferLayout(state, lb, layouts, info, fnName, count = 1) {
        const entry = {
            vertexByteOffset : lb.vertexByteOffset,
            indexByteOffset  : lb.indexByteOffset,
            vertexCount      : info.vertexCount,
            indexCount       : info.indexCount,
            primitive        : info.primitive
        };

        state.layouts.push(entry);
        lb.vertexByteOffset += entry.vertexCount * Float32Array.BYTES_PER_ELEMENT * count;
        lb.indexByteOffset  += entry.indexCount * Uint16Array.BYTES_PER_ELEMENT * count;
        
        lb.vertexOffset += entry.vertexCount * count;
        lb.indexOffset  += entry.indexCount * count;
        lb.idx += 1;

        state[fnName] = () => {
            gl.drawElements(
                info.primitive,
                entry.indexCount * count,
                gl.UNSIGNED_SHORT,
                entry.indexByteOffset 
            )
        }
    }

    const ParametricTriangleStripType = {
        Sphere : generateParametricSphere,
        Torus  : generateParametricTorus || function() {},
        Capped_Cylinder : generateParametricCappedCylinder || function() {},
    }

    state.ParametricTriangleStripType = ParametricTriangleStripType;
    let sphereInfo = generateParametricGeometryIndexedTriangleStrip(
        state.layoutBuilder.vertexOffset, 24, 24, 
        ParametricTriangleStripType.Sphere, {rangeFactorTheta : 1}
    );
    if (sphereInfo == null) {
        return;
    }
    addParametricGeometryToBufferLayout(
        state, state.layoutBuilder, state.layouts, sphereInfo, "drawSphere"
    );


    let torusInfo = generateParametricGeometryIndexedTriangleStrip(
        state.layoutBuilder.vertexOffset, 24, 24, 
        ParametricTriangleStripType.Torus
    );
    if (torusInfo == null) {
        return;
    }
    addParametricGeometryToBufferLayout(
        state, state.layoutBuilder, state.layouts, torusInfo, "drawTorus"
    );


    let cylInfo = generateParametricGeometryIndexedTriangleStrip(
        state.layoutBuilder.vertexOffset, 24, 24, 
        ParametricTriangleStripType.Capped_Cylinder
    )
    if (cylInfo == null) {
        return;
    }
    addParametricGeometryToBufferLayout(
        state, state.layoutBuilder, state.layouts, cylInfo, "drawCappedCylinder"
    );


    // create buffer for attributes
    {
        // Step 1: create GPU buffers

        // create buffer for vertex attribute data
        state.vertexBuf = gl.createBuffer();
        // set this to be the buffer we're currently looking at
        gl.bindBuffer(gl.ARRAY_BUFFER, state.vertexBuf);
        // allocate buffer memory to store all shapes in one contiguous memory region
        gl.bufferData(gl.ARRAY_BUFFER, 
            Float32Array.BYTES_PER_ELEMENT * 
                (cubeVertexData.length + 
                    sphereInfo.vertices.length + 
                    torusInfo.vertices.length + 
                    cylInfo.vertices.length), 
            gl.STATIC_DRAW
        );
        // upload vertex data
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, cubeVertexData, 0);
        gl.bufferSubData(gl.ARRAY_BUFFER, 
            Float32Array.BYTES_PER_ELEMENT *
                cubeVertexData.length, 
                    sphereInfo.vertices, 
        );
        gl.bufferSubData(gl.ARRAY_BUFFER, 
            Float32Array.BYTES_PER_ELEMENT * 
                (cubeVertexData.length + 
                    sphereInfo.vertices.length), 
            torusInfo.vertices, 
        );
        gl.bufferSubData(gl.ARRAY_BUFFER, 
            Float32Array.BYTES_PER_ELEMENT * 
                (cubeVertexData.length + 
                    sphereInfo.vertices.length + 
                    cylInfo.vertices.length), 
            cylInfo.vertices, 
        );

        // create buffer for indexing into vertex buffer
        state.elementBuf = gl.createBuffer();
        // set this to be the buffer we're currently looking at
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, state.elementBuf);
        // allocate buffer memory
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, 
            Uint16Array.BYTES_PER_ELEMENT * 
                (cubeIndexData.length + 
                    sphereInfo.indices.length + 
                    torusInfo.indices.length + 
                    cylInfo.indices.length),
            gl.STATIC_DRAW
        );
        // upload index data
        gl.bufferSubData(gl.ELEMENT_ARRAY_BUFFER, 0, cubeIndexData, 0);
        gl.bufferSubData(gl.ELEMENT_ARRAY_BUFFER, 
            Uint16Array.BYTES_PER_ELEMENT * cubeIndexData.length,
            sphereInfo.indices, 
        );
        gl.bufferSubData(gl.ELEMENT_ARRAY_BUFFER, 
            Uint16Array.BYTES_PER_ELEMENT * 
                (cubeIndexData.length + 
                    sphereInfo.indices.length), 
            torusInfo.indices, 
        );
        gl.bufferSubData(gl.ELEMENT_ARRAY_BUFFER, 
            Uint16Array.BYTES_PER_ELEMENT * 
                (cubeIndexData.length + 
                    sphereInfo.indices.length + 
                    cylInfo.indices.length),
            cylInfo.indices, 
        );

        // Step 2: specify the attributes

        // position
        {
            gl.vertexAttribPointer( 
                state.aPosLoc,                     // attributeLocation: the layout location of the attribute
                3,                                  // size: 3 components per iteration
                gl.FLOAT,                           // type: the data is 32-bit floats
                false,                              // normalize: don't normalize data
                Float32Array.BYTES_PER_ELEMENT * 8, // stride: move forward (size * sizeof(type)) ... using 3 for ps, 3 for normal, 2 for uv (8)
                Float32Array.BYTES_PER_ELEMENT * 0  // offset: set how the data is accessed in the buffer
            );
            gl.enableVertexAttribArray(state.aPosLoc); // enable the attribute
        }
        // normals
        {
            // set how the data is accessed in the buffer
            gl.vertexAttribPointer( 
                state.aNorLoc,                     // attributeLocation: the layout location of the attribute
                3,                                  // size: 3 components per iteration
                gl.FLOAT,                           // type: the data is 32-bit floats
                false,                              // normalize: don't normalize data
                Float32Array.BYTES_PER_ELEMENT * 8, // stride: move forward (size * sizeof(type)) ... using 3 for ps, 3 for normal, 2 for uv (8)
                Float32Array.BYTES_PER_ELEMENT * 3  // offset: set how the data is accessed in the buffer
            );
            gl.enableVertexAttribArray(state.aNorLoc); // enable the attribute
        }
        // uv coords
        {
            // set how the data is accessed in the buffer
            gl.vertexAttribPointer( 
                state.aUVLoc,                      // attributeLocation: the layout location of the attribute
                2,                                  // size: 3 components per iteration
                gl.FLOAT,                           // type: the data is 32-bit floats
                false,                              // normalize: don't normalize data
                Float32Array.BYTES_PER_ELEMENT * 8, // stride: move forward (size * sizeof(type)) ... using 3 for ps, 3 for normal, 2 for uv (8)
                Float32Array.BYTES_PER_ELEMENT * 6  // offset: set how the data is accessed in the buffer
            );
            gl.enableVertexAttribArray(state.aUVLoc); // enable the attribute
        }
    }

    // Step 3: load textures if you have any,
    // alternatively could combine the images into one and use an atlas
    {
        state.textures = [];
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        const texArr = state.textures;
        for (let i = 0; i < state.images.length; i += 1) {
            const tex = gl.createTexture();
            texArr.push(tex);

            // look at texture unit 0 + i
            // (yes, you can just increment TEXTURE0, which is constant number, by an offset. 
            // The TEXTURE<N>s are all assigned contiguous valures
            gl.activeTexture(gl.TEXTURE0 + i);
            // bind texture to the unit
            gl.bindTexture(gl.TEXTURE_2D, tex); 

            // note, there are other options too! Not every texture neats to have the same
            // parameters set -- you just need to do more than loop over each texture the same way
            //
            // gl.REPEAT: The default behavior for textures. Repeats the texture image.
            // gl.MIRRORED_REPEAT: Same as REPEAT but mirrors the image with each repeat.
            // gl.CLAMP_TO_EDGE: Clamps the coordinates between 0 and 1. The result is that higher coordinates become clamped to the edge, resulting in a stretched edge pattern.
            // gl.CLAMP_TO_BORDER: Coordinates outside the range are now given a user-specified border color.
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

            // upload the texture to the current texture unit
            const mipLevel = 0;                      // largest mip is 0
            const internalFormat = gl.RGBA;          // desired texture format
            const srcFormat      = gl.RGBA;          // format of data
            const srcType        = gl.UNSIGNED_BYTE; // type of data
            gl.texImage2D(
                gl.TEXTURE_2D,
                mipLevel,
                internalFormat,
                srcFormat,
                srcType,
                state.images[i]
            );
            // generate mipmaps for the texture 
            // (note: mipmapping is not required for all
            // systems. e.g. 2D sprite games don't always need this)
            gl.generateMipmap(gl.TEXTURE_2D);
        }
        // discard images unless we actually need them later (in this example, we don't)
        state.images = undefined;
    }

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
}

const KEY_MOVE_VERT = Input.KEY_SHIFT; // shift
const KEY_RESET_POS = Input.KEY_ZERO;  // 0
const FRICTION = 0.002;
const startPosition = [0, 0, 5]
const cameraRadius = 2.5;


function updateFallingCubeWithBasicGravity(state) {
    const time = state.time;
    if (Input.keyWentDown(Input.KEY_CONTROL)) {
        state.world.objInfo.isSelected =
            !state.world.objInfo.isSelected;

            if (!state.world.objInfo.isSelected) {
                window.TSTART_FALL = state.time;
                window.POS_START = state.world.objInfo.position[1]
            }
    }
    if (!state.world.objInfo.isSelected && state.world.objInfo.position[1] > 0.0) {
        window.POS_START = window.POS_START || state.world.objInfo.position[1];
        window.TSTART_FALL = window.TSTART_FALL || time;
        state.world.objInfo.position[1] = window.POS_START - (10 * (state.time - window.TSTART_FALL) * (state.time - window.TSTART_FALL));
    }
    state.world.objInfo.position[1] = Math.max(0.0, state.world.objInfo.position[1]);
}


function onStartFrame(t, state) {
    Input.updateKeyState();

    // update time ////////////////////////////
    let tStartMS = t;
    if (!state.tStart) {
        state.tStart = t;
        state.timeMS = t;
    }

    tStartMS = state.tStart;

    const now = (t - tStartMS);

    // update time delta between frames (ms and s)
    state.deltaTimeMS = now - state.timeMS;
    state.deltaTime   = state.deltaTimeMS / 1000.0;
    // update elapsed time (ms and s)
    state.timeMS = now;
    state.time   = state.timeMS / 1000.0;

    ////////
    // cache time values for ease-of-use
    const time = state.time;
    const deltaTime = state.deltaTime;

    
    ////////////////////////////////////////////

    // this is logic for the falling cube that you can pick-up
    updateFallingCubeWithBasicGravity(state);

    let pos;
    let frameData;
    // WebVR-specific way of getting position and orientation
    if (MR.VRIsActive()) {
        frameData = MR.frameData();
        if (frameData != null) {
            // position is stored as a 3-element Float32Array representing a vector
            state.world.localWorldPosition    = frameData.pose.position;
            // orientation is stored as a 4-element Float32Array representing a quaternion
            state.world.localWorldOrientation = frameData.pose.orientation;
            state.world.frameDataTimestamp    = frameData.timestamp;

            pos = state.world.localWorldPosition || 
                [startPosition[2], startPosition[2], startPosition[2]];
        }
    } else {
        // use the movement controller to move a camera for a desktop client,
        // this can be useful for simulating without using the VR headset,
        // or for adding non-VR clients into the world, as well as controllable objects
        if (Input.keyWentDown(KEY_RESET_POS)) {
            state.world.userCam.reset();
        } else {
            if (state.cursor.z()) {
                // press down the mouse cursor to look around in the non-VR view
                const cvs = MR.getCanvas();
                const cpos = state.cursor.position();
                state.world.userCam.updateWithCursor(
                    deltaTime,
                    FRICTION,
                    -Input.keyIsDown(Input.KEY_LEFT),
                     Input.keyIsDown(Input.KEY_RIGHT),
                    -Input.keyIsDown(Input.KEY_UP),
                     Input.keyIsDown(Input.KEY_DOWN),
                     Input.keyIsDown(KEY_MOVE_VERT),
                     cvs.clientWidth,
                     cvs.clientHeight,
                     cpos[0],
                     cpos[1]
                );
            } else {
                state.world.userCam.update(
                    deltaTime,
                    FRICTION,
                    -Input.keyIsDown(Input.KEY_LEFT),
                     Input.keyIsDown(Input.KEY_RIGHT),
                    -Input.keyIsDown(Input.KEY_UP),
                     Input.keyIsDown(Input.KEY_DOWN),
                     Input.keyIsDown(KEY_MOVE_VERT),
                );                
            }

            // without mouse controls
        }

        pos = state.world.userCam.position;

    }
    // optionally clamp the y position to 0
    pos[1] = Math.max(0.0, pos[1]);


    // update cube position to follow the user if the cube is selected
    if (state.world.objInfo.isSelected) {
        state.world.objInfo.position[0] = pos[0];
        state.world.objInfo.position[1] = pos[1] + cameraRadius * 0.2;
        state.world.objInfo.position[2] = pos[2] - cameraRadius * 2;
    }    

    // begin graphics rendering pipeline - once per frame
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.clearColor(state.fog_color[0], state.fog_color[1], state.fog_color[2], state.fog_color[3]);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);

    gl.useProgram(state.program);

    state.fog_color = [0.0, 81.0 / 255.0, 192.0 / 255.0, 1.0];
    gl.uniform4fv(state.fog_colorLoc, state.fog_color);

    // upload lights 
    // (may want to do this once instead if the lights don't move)
    state.lights = [
        new Float32Array([
            -1.0, -0.1, -0.5, 0.0, 
            .9, 0.9, .67, 1.0
        ]),
    ]

    for (let i = 0; i < state.lights.length; i += 1) {
        const dirArr = state.lights[i].subarray(0, 4);
        const colorArr = state.lights[i].subarray(4, 8);

        vec4_normalize(dirArr, dirArr);

        gl.uniform4fv(state.shader0Info.lights[i].directionLoc, dirArr);
        gl.uniform4fv(state.shader0Info.lights[i].colorLoc, colorArr)
    }

    // splitscreen test
    // gl.viewport(0, 0, gl.canvas.width * 0.5, gl.canvas.height);
}


function calculateSelfOrPeerViewMatrix(M, viewMat, state) {
    const world          = state.world;
    const userCam        = world.userCam;
    const remoteUserInfo = world.remoteUserInfo;
    const activeplayerid   = MR.viewpointController.playerid;

    // calculate the view matrix from your perspective
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
function basicDrawUsers(M, state, drawCallback) {
    const world          = state.world;
    const userCam        = world.userCam;
    const remoteUserInfo = world.remoteUserInfo;

    M.save();
        Mat.identity(M.matrix());

        if (!MR.VRIsActive()) {
            Mat.translateV(M.matrix(), userCam.position);

            Mat.rotateX(M.matrix(),
                -userCam.rotateX
            );
            Mat.rotateY(M.matrix(),
                -userCam.angle + userCam.rotateY
            );
        } else {
            //console.log("rendering VR local");
            Mat.translateV(M.matrix(), world.localWorldPosition);

            Mat.identity(fromQuatMat);
            const quat = world.localWorldOrientation;

            fromQuat(fromQuatMat, world.localWorldOrientation);

            Mat.multiply(
                M.matrix(),
                fromQuatMat,
                M.matrix()
            );                      
        }

        drawCallback(M, state);

    M.restore();

    // draw remote users
    for (let key in state.world.remoteUserInfo) {
        if (remoteUserInfo.hasOwnProperty(key)) {
            const remoteUser = remoteUserInfo[key];
            M.save();
                Mat.identity(M.matrix());
                Mat.translateV(M.matrix(), remoteUser.pos);

                if (remoteUser.isVR) { 
                    //console.log("rendering VR remote");

                    Mat.identity(fromQuatMat);
                    const quat = remoteUser.angle;

                    fromQuat(fromQuatMat, quat);

                    Mat.multiply(
                        M.matrix(),
                        fromQuatMat,
                        M.matrix()
                    );
                } else {

                    Mat.rotateX(M.matrix(),
                        -remoteUser.rotateX
                    );
                    Mat.rotateY(M.matrix(),
                        -remoteUser.angle + remoteUser.rotateY
                    );
                }

                drawCallback(M, state);

            M.restore();               
        }
    }
}


// called per-eye
function onDraw(t, projMat, viewMat, state, eyeIdx) {
    // do draw calls here
    const time = state.time;
    const M    = state.M;

    gl.bindVertexArray(state.vao);

    gl.useProgram(state.program);
    
    gl.uniform1f(state.uTimeLoc, time);

    // non-VR mode - either calculate the local view
    // or see and interact from another user's perspective in non-VR mode
    if (!MR.VRIsActive()) {
        calculateSelfOrPeerViewMatrix(M, viewMat, state);
    }

    // upload view and projection matrices
    gl.uniformMatrix4fv(state.uViewLoc, false, viewMat);
    gl.uniformMatrix4fv(state.uProjLoc, false, projMat);

    // Note: I use a uniform id to select draw modes in the shader, but 
    // I think multiple shaders should be used instead. This was a shortcut
    gl.uniform1i(state.uMatIdxLoc, 0);

    M.save(); 
    {
        // floor (We'd like a floor for the virtual world)
        {
            M.save();
                Mat.translate(M.matrix(), 0.0, -1.0, 0.0);
                Mat.scale(M.matrix(), 1024.0, 0.0, 1024.0);
                gl.uniformMatrix4fv(state.uModelLoc, false, 
                    M.matrix()
                );
            M.restore();

            gl.uniform1i(state.uModeLoc, state.MAT_MODE_FLOOR);
        
            state.drawCube();
        }

        // cube
        // example of user interaction (press control key to select the cube)
        // NOTE: not yet synchronized
        {   

            GFX.updateVideoTexture(gl, state.videoTexture, state.video);
            
            // Note: we could choose to optimize memory use further by using 
            // UNSIGNED_BYTE since we have so few indices (< 255),
            // but most of the time you would use UNSIGNED_SHORT or UNSIGNED_INT
            if (state.world.objInfo.isSelected) {
                //gl.uniform1i(state.uModeLoc, state.MAT_MODE_COLOR);
                gl.uniform1i(state.uModeLoc, state.MAT_MODE_TEXTURE);
                gl.uniform1i(state.whichTextureLoc, 1);
            } else {

                gl.uniform1i(state.uModeLoc, state.MAT_MODE_TEXTURE);
                gl.uniform1i(state.whichTextureLoc, 0);
            }
            M.save();
                Mat.translateV(M.matrix(), state.world.objInfo.position);

                gl.uniformMatrix4fv(state.uModelLoc, false, 
                    M.matrix()
                );
                state.drawCube();
            M.restore();        
        }

        // draw users
        gl.uniform1i(state.uModeLoc, 3);
        gl.uniform1i(state.whichTextureLoc, 1);

        basicDrawUsers(M, state, (M, state) => {
            gl.uniformMatrix4fv(state.uModelLoc, false, 
                M.matrix()
            );
            state.drawCube();
        });
    } 
    M.restore();
}

function onEndFrame(t, state) {
    // server communications
    if (MR.server.sock.readyState != WebSocket.OPEN) {
        return;
    }

    if (!MR.VRIsActive()) {
        //console.log("NOT VR WEEEE");
        MR.server.sock.send(JSON.stringify({
            "MR_Message" : "User_State", 
            "info" : {
                uid     : MR.uid(), 
                pos     : state.world.userCam.position,
                angle   : state.world.userCam.angle,
                rotateY : state.world.userCam.rotateY,
                rotateX : state.world.userCam.rotateX,
                isVR    : false
            } 
        }));
    } else {
        //console.log("VR WEE");
        MR.server.sock.send(JSON.stringify({
            "MR_Message" : "User_State", 
            "info" : {
                uid   : MR.uid(), 
                pos   : state.world.localWorldPosition,
                angle : state.world.localWorldOrientation,
                isVR  : true 
            } 
        }));        
    }
}
function onExit() {
    console.log("WEE, goodbye!");

}

export default function main() {
    const def = {
        // Please start naming the world 
        // with your name so we can identify the author
        name         : 'hp2', 
        setup        : setup,
        onStartFrame : onStartFrame,
        onEndFrame   : onEndFrame,
        onDraw       : onDraw,
        onReload     : onReload,
        onExit       : onExit
    };

    return def;
}
