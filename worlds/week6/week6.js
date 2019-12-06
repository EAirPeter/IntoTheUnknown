"use strict"

const cos = Math.cos;
const sin = Math.sin;
const tan = Math.tan;
const acos = Math.acos;
const asin = Math.asin;
const atan = Math.atan;
const atan2 = Math.atan2;
const π = Math.PI;

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


function sin01(val) {
    return (1.0 + sin(val)) / 2.0;
}

let matrixModule    = null;
let geometryModule  = null;
let cubeVertexData  = null;
let cubeIndexData   = null;
let cubeVertexCount = null;
let cubeIndexCount  = null;
let Mat             = null;
let M               = null;

async function onReload(state) {
    return MR.dynamicImport(getPath("matrix.js")).then((myModule) => {
        matrixModule = myModule;
        Mat          = matrixModule.Matrix;
    }).then(() => {
        MR.dynamicImport(getPath("geometry.js")).then((myModule) => {
            geometryModule  = myModule;
            cubeVertexData  = geometryModule.cubeVertexData;
            cubeIndexData   = geometryModule.cubeIndexData;
            cubeVertexCount = geometryModule.cubeVertexCount;
            cubeIndexCount  = geometryModule.cubeIndexCount;
        });
    });
}

// note: mark your setup function as "async" if you need to "await" any asynchronous tasks
// (return JavaScript "Promises" like in loadImages())
async function setup(state) {
    hotReloadFile(getPath("week6.js"));

    matrixModule = await import(getPath("matrix.js"));
    Mat          = matrixModule.Matrix;
    state.M      = new matrixModule.Dynamic_Matrix4x4_Stack();

    geometryModule  = await import(getPath("geometry.js"));
    cubeVertexData  = geometryModule.cubeVertexData;
    cubeIndexData   = geometryModule.cubeIndexData;
    cubeVertexCount = geometryModule.cubeVertexCount;
    cubeIndexCount  = geometryModule.cubeIndexCount;

    state.cursor = ScreenCursor.trackCursor(MR.getCanvas());

    Input.initKeyEvents();

    state.world = { 
        cam_pos : [
            startPosition[0], 
            startPosition[1], 
            startPosition[2]
        ],
        angle : (0),
        angularVelocity : 0.0,
        initDir : [0.0, 0.0, -1.0, 0.0],
        dir : [0.0, 0.0, -1.0, 0.0],
        v : [0.0, 0.0, 0.0],
        objInfo : {
            position : [0, 7, -2],
            velocity : [0, 0, 0], // temp
            acceleration : 100, // temp
            
            isSelected : false,
            // user id of user who selected this object
            isSelectedByUID : -1 
        },
        mapDimX : 64,
        mapDimY : 64,
        mapGridSize : 8,
        heightMap : [],
    };
    for (let i = 0; i < (state.world.mapDimX * state.world.mapDimY) / state.world.mapGridSize; i += 1) {
        state.world.heightMap.push({h : 0.0, obj : [{init : false, position : [0, 0, 0], scale : [0.5, 0.5, 0.5]}]});
    }



    state.fog_color = [53.0 / 255.0, 81.0 / 255.0, 192.0 / 255.0, 1.0];

    // load initial images, then continue setup after waiting is done
    const images = await imgutil.loadImagesPromise([
        getPath("resources/textures/brick.png"),
        getPath("resources/textures/polkadots_transparent.png"),
        getPath("resources/textures/wood.png")
    ]);

    // this line only executes after the images are loaded asynchronously
    // "await" is syntactic sugar that makes the code continue to look linear (avoid messy callbacks or "then" clauses)


    // this is an object I declare globally
    // in this world to store objects together...
    // "state" is optional in other words. Here I'm using my own
    // non-Meta_Room-controlled state. 
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


                    gl.uniform1i(state.uModeLoc, 1);

                    gl.uniform1i(state.uMatIdx, 0);

                    gl.uniform4fv(state.fog_colorLoc, state.fog_color);

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

    state.layoutBuilder = {
        vertexByteOffset : 0.,
        indexByteOffset : 0,
        vertexOffset : 0,
        indexOffset : 0,
        vertexCount : 0,
        idx : 0
    }

    const LB = state.layoutBuilder;

    state.layouts = [
    ];

    function addCubeToBufferLayout(lb, layouts, fnName, count = 1) {
        const entry = {
            vertexByteOffset : lb.vertexByteOffset,
            indexByteOffset  : lb.indexByteOffset,
            vertexCount      : cubeVertexCount * count,
            indexCount       : cubeIndexCount * count,
            primitive        : gl.TRIANGLES
        };

        state.layouts.push(entry);
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

    addCubeToBufferLayout(state.layoutBuilder, state.layouts, "drawCube");


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

    function addParametricGeometryToBufferLayout(lb, layouts, info, fnName, count = 1) {
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

    const Parametric_Triangle_Strip = {
        Sphere : generateParametricSphere,
        Torus  : generateParametricTorus || function() {},
        Capped_Cylinder : generateParametricCappedCylinder || function() {},
    }


    state.Parametric_Triangle_Strip = Parametric_Triangle_Strip;
    let sphereInfo = generateParametricGeometryIndexedTriangleStrip(
        state.layoutBuilder.vertexOffset, 24, 24, 
        Parametric_Triangle_Strip.Sphere, {rangeFactorTheta : 1}
    );
    if (sphereInfo == null) {
        return;
    }
    addParametricGeometryToBufferLayout(state.layoutBuilder, state.layouts, sphereInfo, "drawSphere");


    let torusInfo = generateParametricGeometryIndexedTriangleStrip(
        state.layoutBuilder.vertexOffset, 24, 24, 
        Parametric_Triangle_Strip.Torus
    );
    if (torusInfo == null) {
        return;
    }
    addParametricGeometryToBufferLayout(state.layoutBuilder, state.layouts, torusInfo, "drawTorus");


    let cylInfo = generateParametricGeometryIndexedTriangleStrip(
        state.layoutBuilder.vertexOffset, 24, 24, 
        Parametric_Triangle_Strip.Capped_Cylinder
    )
    if (cylInfo == null) {
        return;
    }
    addParametricGeometryToBufferLayout(state.layoutBuilder, state.layouts, cylInfo, "drawCappedCylinder");


    // create buffer for attributes
    {
        // Step 1: create GPU buffers

        // create buffer for vertex attribute data
        state.vertexBuf = gl.createBuffer();
        // set this to be the buffer we're currently looking at
        gl.bindBuffer(gl.ARRAY_BUFFER, state.vertexBuf);
        // allocate buffer memory
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

const KEY_LEFT  = 37;
const KEY_UP    = 38;
const KEY_RIGHT = 39;
const KEY_DOWN  = 40;
const KEY_MOVE_VERT = 16; // shift
const KEY_RESET_POS = 48; // 0
const MAX_SPEED = 14.0;
const ACC = 100.0;
const FRICTION = 0.002;
const startPosition = [0, 0, 5]
const cameraRadius = 2.5;
function clamp(val,min_,max_){return Math.max(min_,Math.min(max_,val));}


function onStartFrame(t, state) {
    Input.updateKeyState();

    // update time
    let tStart = t;
    if (!state.tStart) {
        state.tStart = t;
        state.time = t;
    }

    tStart = state.tStart;

    const now = (t - tStart);

    state.deltaTime = now - state.time;
    state.deltaTimeS = state.deltaTime / 1000.0;
    state.time = now;

    state.fog_color = [0.0, 81.0 / 255.0, 192.0 / 255.0, 1.0];
    gl.uniform4fv(state.fog_colorLoc, state.fog_color);

    if (Input.keyWentDown(17)) {
        state.world.objInfo.isSelected =
            !state.world.objInfo.isSelected;

            if (!state.world.objInfo.isSelected) {
                window.TSTART_FALL = state.time;
                window.POS_START = state.world.objInfo.position[1]
            }
    }
    if (!state.world.objInfo.isSelected && state.world.objInfo.position[1] > 0.0) {
        window.POS_START = window.POS_START || state.world.objInfo.position[1];
        window.TSTART_FALL = window.TSTART_FALL || now / 1000.0;
        state.world.objInfo.position[1] = window.POS_START - (0.00001 * (state.time - window.TSTART_FALL) * (state.time - window.TSTART_FALL));
    }
    state.world.objInfo.position[1] = Math.max(0.0, state.world.objInfo.position[1]);

    if (Input.keyWentDown(KEY_RESET_POS)) {
        const v = state.world.v;
        v[0] = 0;
        v[1] = 0;
        v[2] = 0;

        state.world.cam_pos[0] = startPosition[0];
        state.world.cam_pos[1] = startPosition[1];
        state.world.cam_pos[2] = startPosition[2];
        state.world.dir = [
            state.world.initDir[0], 
            state.world.initDir[1], 
            state.world.initDir[2], 
            0
        ];
        state.world.angle = 0;
        state.world.angularVelocity = 0.0;

    } else {
/*
        const v = state.world.v;

        let up   = 0;
        let down = 0;
        let left;
        let right;
        let forward;
        let backward;

        left      = -Input.keyIsDown(KEY_LEFT);
        right     =  Input.keyIsDown(KEY_RIGHT);
        forward   = -Input.keyIsDown(KEY_UP);
        backward  =  Input.keyIsDown(KEY_DOWN);
        if (Input.keyIsDown(KEY_MOVE_VERT)) {
            up       = -forward;
            down     = -backward;
            forward  = 0;
            backward = 0;

            const hz = left + right;
            const vt = up + down;
            const hypo = Math.sqrt((hz * hz) + (vt * vt));
            if (hypo != 0) {
                const hcomp = ACC * (hz / hypo);
                const vcomp = ACC * (vt / hypo);

                v[0] += hcomp * state.deltaTimeS;
                v[1] += vcomp * state.deltaTimeS;
            }
        } else {
            const hz = left + right;
            const vt = forward + backward;
            const hypo = Math.sqrt((hz * hz) + (vt * vt));

            if (hypo != 0) {
                const hcomp = ACC * (hz / hypo);
                const vcomp = ACC * (vt / hypo);

                v[0] += hcomp * state.deltaTimeS;
                v[2] += vcomp * state.deltaTimeS;
            }
        }


        v[0] = clamp(v[0], -MAX_SPEED, MAX_SPEED);
        v[1] = clamp(v[1], -MAX_SPEED, MAX_SPEED);
        v[2] = clamp(v[2], -MAX_SPEED, MAX_SPEED);

        const drag = Math.pow(FRICTION, state.deltaTimeS);
        if (Math.abs(v[0]) < drag) {
            v[0] = 0;
        } else {
            v[0] *= drag;
        }
        if (Math.abs(v[1]) < drag) {
            v[1] = 0;
        } else {
            v[1] *= drag;
        }
        if (Math.abs(v[2]) < drag) {
            v[2] = 0;
        } else {
            v[2] *= drag;
        }

        const cam_pos = state.world.cam_pos;
        cam_pos[0] += state.world.v[0] * state.deltaTimeS;
        cam_pos[1] += state.world.v[1] * state.deltaTimeS;
        cam_pos[2] += state.world.v[2] * state.deltaTimeS;
    
        if (state.world.objInfo.isSelected) {
            state.world.objInfo.position[0] = cam_pos[0];
            state.world.objInfo.position[1] = cam_pos[1] + cameraRadius * 0.2;
            state.world.objInfo.position[2] = cam_pos[2] - cameraRadius * 2;
        }
    }
*/
        const v = state.world.v;

        let up   = 0;
        let down = 0;
        let left;
        let right;
        let forward;
        let backward;

        left      = -Input.keyIsDown(KEY_LEFT);
        right     =  Input.keyIsDown(KEY_RIGHT);
        forward   = -Input.keyIsDown(KEY_UP);
        backward  =  Input.keyIsDown(KEY_DOWN);
        if (Input.keyIsDown(KEY_MOVE_VERT)) {
            up       = -forward;
            down     = -backward;
            forward  = 0;
            backward = 0;

            const hz = left + right;
            const vt = up + down;
            const hypo = Math.sqrt((hz * hz) + (vt * vt));
            if (true) {
                const hcomp = ACC * (hz / hypo);
                const vcomp = ACC * (vt / hypo);

                //v[0] += hcomp * state.deltaTimeS;
                v[1] += ACC * vt * state.deltaTimeS;
            }
        } else {
            const hz = left + right;
            state.world.angularVelocity += 0.02 * hz * state.deltaTime;
            //state.world.angularVelocity = clamp(state.world.angularVelocity, -10, 10);
            state.world.angle += state.world.angularVelocity * state.deltaTimeS;
            let az = cos(state.world.angle);
            let ax = sin(state.world.angle);

            const vt = (forward + backward);

            if (vt != 0.0) {
                const hcomp = ACC * ax * vt;
                const vcomp = ACC * az * vt;

                v[0] -= hcomp * state.deltaTimeS;
                v[2] += vcomp * state.deltaTimeS;
            }
        }

        v[0] = clamp(v[0], -MAX_SPEED * 2, MAX_SPEED * 2);
        v[1] = clamp(v[1], -MAX_SPEED * 2, MAX_SPEED * 2);
        v[2] = clamp(v[2], -MAX_SPEED * 2, MAX_SPEED * 2);
        

        const drag = Math.pow(FRICTION, state.deltaTimeS);
        v[0] *= drag;
        v[1] *= drag;
        v[2] *= drag;
        state.world.angularVelocity *= drag;

        const cam_pos = state.world.cam_pos;
        cam_pos[0] += state.world.v[0] * state.deltaTimeS;
        cam_pos[1] += state.world.v[1] * state.deltaTimeS;
        cam_pos[2] += state.world.v[2] * state.deltaTimeS;
    
        // console.log("grid pos", cam_pos[0], cam_pos[2], 
        // Math.floor(cam_pos[0]) + state.world.mapDimX * 0.5,
        // Math.floor(cam_pos[2]) + state.world.mapDimY * 0.5);

        const gridX = Math.floor((Math.floor(cam_pos[0]) + state.world.mapDimX * 0.5) / state.world.mapGridSize);
        const gridY = Math.floor((Math.floor(cam_pos[2]) + state.world.mapDimY * 0.5) / state.world.mapGridSize);

        window.setGridH = (x, y, h) => {
            const ___idx = (y * state.world.mapDimX) + x;
            if (state.world.heightMap.length > ___idx) {
                state.world.heightMap[(y * state.world.mapDimX) + x].h = h;
            }
        }
        window.setCurrGridH = (h) => {
            const ___idx = (gridY * state.world.mapDimX) + gridX;
            if (state.world.heightMap.length > ___idx) {
                state.world.heightMap[___idx].h = h;
            }
        }
        window.getCurrGridH = () => {
            const ___idx = (gridY * state.world.mapDimX) + gridX;
            if (state.world.heightMap.length > ___idx && state.world.heightMap[___idx]) {
                
                return state.world.heightMap[___idx].h;
            }
            return 0.0;
        }
        window.getGrid = (x, y) => {
            const ___idx = (y * state.world.mapDimX) + x;
            if (state.world.heightMap.length > ___idx) {
                return state.world.heightMap[___idx];
            }
            return null;            
        }
        window.getCurrGrid = () => {
            const ___idx = (gridY * state.world.mapDimX) + gridX;
            if (state.world.heightMap.length > ___idx) {
                return state.world.heightMap[___idx];
            }
            return null;            
        }

        cam_pos[1] = Math.max(0.0, cam_pos[1]);
        cam_pos[1] = Math.max(window.getCurrGridH(), cam_pos[1]);
        const currGrid =  window.getCurrGrid();
        if (currGrid != null) {
            currGrid.obj[0].position[0] = cam_pos[0];
            currGrid.obj[0].position[1] = cam_pos[1];
            currGrid.obj[0].position[2] = cam_pos[2];
            currGrid.obj[0].draw = state.drawSphere;
            currGrid.obj[0].init = true;

        }   


        if (state.world.objInfo.isSelected) {
            state.world.objInfo.position[0] = cam_pos[0];
            state.world.objInfo.position[1] = cam_pos[1] + cameraRadius * 0.2;
            state.world.objInfo.position[2] = cam_pos[2] - cameraRadius * 2;
        }
    }




    gl.useProgram(state.program);


    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.clearColor(state.fog_color[0], state.fog_color[1], state.fog_color[2], state.fog_color[3]);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    
    gl.bindVertexArray(state.vao);


    gl.uniform1f(state.uTimeLoc, now / 1000.0);

    const userPosX = state.world.cam_pos[0];
    const userPosY = state.world.cam_pos[1];
    const userPosZ = state.world.cam_pos[2];

    const origin = [userPosX, userPosY, userPosZ];
    const dir = [0, 0, 0];
    const aim = state.cursor.position();

    dir[0] = aim[0] - origin[0];
    dir[1] = aim[1] - origin[1];
    dir[2] = -1;

    const Ray = {
        origin : origin,
        direction : dir
    };

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


}

function onEndFrame(t, state) {

}

// per eye
function onDraw(t, projMat, viewMat, state, eyeIdx) {
    // do draw calls here
    const sec = state.time / 1000;

    const M = state.M;

    Mat.rotateY(viewMat,
        state.world.angle
    );
    Mat.translate(viewMat, 
        -state.world.cam_pos[0],
        -state.world.cam_pos[1],
        -state.world.cam_pos[2]
    );




    gl.uniformMatrix4fv(state.uViewLoc, false, viewMat);
    gl.uniformMatrix4fv(state.uProjLoc, false, projMat);

    gl.uniform1i(state.uMatIdxLoc, 0);
    // floor
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
    {


        
        // Note: we could choose to optimize memory use further by using 
        // UNSIGNED_BYTE since we have so few indices (< 255),
        // but most of the time you would use UNSIGNED_SHORT or UNSIGNED_INT
    
        const primitive = gl.TRIANGLES;
        const offset    = 0;
        const count     = cubeIndexCount;
        let drawFuncs = [state.drawCube, state.drawSphere, state.drawTorus, state.drawCappedCylinder]
        if (true || state.world.objInfo.isSelected || state.world.objInfo.position[1] < 2) {
            if (state.world.objInfo.isSelected) {
                gl.uniform1i(state.uModeLoc, state.MAT_MODE_TEXTURE);
            } else {
                gl.uniform1i(state.uModeLoc, state.MAT_MODE_COLOR);
            }

            state.selectionTime = state.selectionTime || sec;
            const surroundCount = 8;
            for (let i = 0; i < surroundCount; i += 1) {
            M.save();
                const rot = (state.world.objInfo.isSelected) ? 1 : 0; 
                let X = [ state.world.objInfo.position[0], 
                 state.world.objInfo.position[1],  state.world.objInfo.position[2]];
                 X[0] += Math.min(7.0, 9.0 * (sec - state.selectionTime)) * Math.cos(sec + i * (Math.PI * 2) / surroundCount);
                 X[2] += Math.min(7.0, 9.0 * (sec - state.selectionTime)) * Math.sin(sec + i * (Math.PI * 2) / surroundCount);
                Mat.translateV(M.matrix(), X);

                Mat.rotateX(M.matrix(), sec + (i ));
                Mat.rotateY(M.matrix(), sec + (i ));
                Mat.rotateZ(M.matrix(), -sec + (i ));
                Mat.skewXRelY(M.matrix(), Math.min(2, 0.1 * Math.abs(state.world.v[2])));
                gl.uniformMatrix4fv(state.uModelLoc, false, 
                    M.matrix()
                );
            
                drawFuncs[i % drawFuncs.length]();

            M.restore();
            }
        } else {
            gl.uniform1i(state.uModeLoc, state.MAT_MODE_COLOR);
            state.selectionTime = undefined;
        M.save();
            Mat.translateV(M.matrix(), state.world.objInfo.position);
            gl.uniformMatrix4fv(state.uModelLoc, false, 
                M.matrix()
            );
            state.drawCube();
        M.restore();        
        }

        // M.save();
        // Mat.identity(M.matrix());
        // let X = 0;
        // const next__ = [0.0, 0.0, 0.0];
        // for (let i = 0; i < state.world.mapDimY; i += 1) {
        //     for (let j = 0; j < state.world.mapDimX; j += 1) {
        //         const gridInfo = window.getGrid(i, j);
        //         if (!gridInfo) {
        //             continue;
        //         }
        //         if (gridInfo.obj.length == 0) {
        //             continue;
        //         }

        //         if (!gridInfo.obj[0].init) {
        //             continue;
        //         }
        //         X += 1;
        //         M.save();
        //         const target = state.world.cam_pos;
        //         const dt__ = state.deltaTimeS;

        //         next__[0] = gridInfo.obj[0].position[0];
        //         next__[1] = gridInfo.obj[0].position[1];
        //         next__[2] = gridInfo.obj[0].position[2];

        //         next__[0] += (target[0] - next__[0]) * dt__;
        //         next__[1] += (target[1] - next__[1]) * dt__;
        //         next__[2] += (target[2] - next__[2]) * dt__;

        //         gridInfo.obj[0].position[0] = next__[0];
        //         gridInfo.obj[0].position[1] = next__[1];
        //         gridInfo.obj[0].position[2] = next__[2];

        //         Mat.translateV(M.matrix(), next__);
        //         Mat.scaleV(M.matrix(), [0.25, 0.25, 0.25]);
        //         gl.uniformMatrix4fv(state.uModelLoc, false,
        //             M.matrix()
        //         );

        //         gridInfo.obj[0].draw();

        //         M.restore();
        //     }
        // }
        // M.restore();

        let oldTime = state.time;
        state.time = oldTime / 1000.0;
        let m = M;
    m.save();
        Mat.identity(m.matrix());
        Mat.translate(m.matrix(), 0,25,-2);


        Mat.rotateX(m.matrix(), Math.PI / 16);
        Mat.rotateY(m.matrix(), Math.PI / 2);
        Mat.scale(m.matrix(), 1.0, 2.0, 2.0);

        {
            m.save();
                Mat.scale(m.matrix(), 100, .1, .2);
            

                gl.uniformMatrix4fv(state.uModelLoc, false, m.matrix() );

                state.drawCube();
            m.restore();
        }
        m.save();


        {


            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            
            Mat.scaleXYZ(m.matrix(), 1);
            for (let i = 0; i < 7; i += 1) {
                m.save();
                    Mat.translate(m.matrix(), 10 * sin01(state.time + (i + 2.5)), 0, i * 0.01);
                    if ((i % 2 == 1)) {
                        Mat.skewXRelY(m.matrix(), 0.5);
                    }

                    m.save();
                    Mat.rotateX(m.matrix(), ((i & 0 == 0) ? -1 : 1) * i * state.time * 0.1);
                    Mat.scaleY(m.matrix(), (1/i) * 16.0 * sin(.5 * state.time + i));
                    Mat.scale(m.matrix(), 0.2, 2, 0.2)


                    gl.uniformMatrix4fv(state.uModelLoc, false, m.matrix() );
                    state.drawCappedCylinder();
                    m.restore();
                
                m.save();
                    Mat.identity(m.matrix());
                    Mat.translate(m.matrix(), 0, 0, 1);


                    gl.uniformMatrix4fv(state.uModelLoc, false, m.matrix() );
                    //state.drawCappedCylinder();
                m.restore();
                m.restore();
            }
        }
        m.restore(); 

    m.restore();
    
    
    state.time = oldTime;
    }

}


export default function main() {
    const def = {
        name         : 'week6',
        setup        : setup,
        onStartFrame : onStartFrame,
        onEndFrame   : onEndFrame,
        onDraw       : onDraw,
        onReload     : onReload
    };

    return def;
}
