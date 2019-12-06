"use strict";

export const cubeVertexData = new Float32Array([
    // pos             // normals      // uv coords                                  
    -1.0,  1.0,  1.0,  0.0, 0.0, 1.0,  0.0, 1.0, // Top Left
    -1.0, -1.0,  1.0,  0.0, 0.0, 1.0,  0.0, 0.0, // Bottom Left 
     1.0, -1.0,  1.0,  0.0, 0.0, 1.0,  1.0, 0.0, // Bottom Right
     1.0,  1.0,  1.0,  0.0, 0.0, 1.0,  1.0, 1.0, // Top Right
     
     1.0,  1.0,  1.0,  1.0, 0.0, 0.0,  0.0, 1.0, // Top Left
     1.0, -1.0,  1.0,  1.0, 0.0, 0.0,  0.0, 0.0, // Bottom Left 
     1.0, -1.0, -1.0,  1.0, 0.0, 0.0,  1.0, 0.0, // Bottom Right
     1.0,  1.0, -1.0,  1.0, 0.0, 0.0,  1.0, 1.0, // Top Right
     
     1.0,  1.0, -1.0,  0.0, 0.0,-1.0,  0.0, 1.0, // Top Left
     1.0, -1.0, -1.0,  0.0, 0.0,-1.0,  0.0, 0.0, // Bottom Left 
    -1.0, -1.0, -1.0,  0.0, 0.0,-1.0,  1.0, 0.0, // Bottom Right
    -1.0,  1.0, -1.0,  0.0, 0.0,-1.0,  1.0, 1.0, // Top Right
    
    -1.0,  1.0, -1.0, -1.0, 0.0, 0.0,  0.0, 1.0, // Top Left
    -1.0, -1.0, -1.0, -1.0, 0.0, 0.0,  0.0, 0.0, // Bottom Left 
    -1.0, -1.0,  1.0, -1.0, 0.0, 0.0,  1.0, 0.0, // Bottom Right
    -1.0,  1.0,  1.0, -1.0, 0.0, 0.0,  1.0, 1.0, // Top Right
    
    -1.0,  1.0, -1.0,  0.0, 1.0, 0.0,  0.0, 1.0, // Top Left
    -1.0,  1.0,  1.0,  0.0, 1.0, 0.0,  0.0, 0.0, // Bottom Left 
     1.0,  1.0,  1.0,  0.0, 1.0, 0.0,  1.0, 0.0, // Bottom Right
     1.0,  1.0, -1.0,  0.0, 1.0, 0.0,  1.0, 1.0, // Top Right
     
    -1.0, -1.0,  1.0,  0.0,-1.0, 0.0,  0.0, 1.0, // Top Left
    -1.0, -1.0, -1.0,  0.0,-1.0, 0.0,  0.0, 0.0, // Bottom Left 
     1.0, -1.0, -1.0,  0.0,-1.0, 0.0,  1.0, 0.0, // Bottom Right
     1.0, -1.0,  1.0,  0.0,-1.0, 0.0,  1.0, 1.0  // Top Right
]);
export const cubeVertexCount = 24;
export const vertexSizeFloats = 8;

export const cubeIndexData = new Uint16Array([
    0, 1, 2,
    2, 3, 0,
    
    4, 5, 6,
    6, 7, 4,
    
    8, 9, 10,
    10, 11, 8,
    
    12, 13, 14,
    14, 15, 12,
    
    16, 17, 18,
    18, 19, 16,
    
    20, 21, 22,
    22, 23, 20
]);
export const cubeIndexCount = 36;


const cos   = Math.cos;
const sin   = Math.sin;
const tan   = Math.tan;
const acos  = Math.acos;
const asin  = Math.asin;
const atan  = Math.atan;
const atan2 = Math.atan2;
const π     = Math.PI;

// this is an object to help assemble multiple triangle geometry
// into one contiguous buffer,
// the following functions also create convenience draw"X" functions
// that know the correct offsets into the buffer to draw the correct shape
export function LayoutBuilder() { 
    this.vertexByteOffset = 0;
    this.indexByteOffset = 0;
    this.vertexOffset = 0;
    this.indexOffset = 0;
    this.vertexCount = 0;
    this.idx = 0;
}


export function addCubeToBufferLayout(state, lb, layouts, fnName, count = 1) {
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

export function generateParametricSphere(vertices, offset, u, v, opts = {}) {
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

export function generateParametricTorus(vertices, offset, u, v, opts = {}) {
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


export function generateParametricCappedCylinder(vertices, offset, u, v, opts = {}) {
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

export function generateParametricGeometryIndexedTriangleStrip(idxOffset, rows, cols, fnEvaluate, opts) {
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

export function addParametricGeometryToBufferLayout(state, lb, layouts, info, fnName, count = 1) {
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

