"use strict";

function dot(v0, v1) {
	return (v0[0] * v1[0]) +
		   (v0[1] * v1[1]) +
		   (v0[2] * v1[2]) +
		   (v0[3] * v1[3]);
}

function inverse(src, dst) {
	let finalDst = dst || src;
	let det = 0;

	dst = Matrix.matBuf;

	const cofactor = (c, r) => {
		const s = (i, j) => src[c+i & 3 | (r+j & 3) << 2];
	 		return (c+r & 1 ? -1 : 1) * ( (s(1,1) * (s(2,2) * s(3,3) - s(3,2) * s(2,3)))
	                             - (s(2,1) * (s(1,2) * s(3,3) - s(3,2) * s(1,3)))
	                             + (s(3,1) * (s(1,2) * s(2,3) - s(2,2) * s(1,3))) );
		}
	for (let n = 0 ; n < 16 ; n++) {
		dst[n] = cofactor(n >> 2, n & 3);
	}
	for (let n = 0 ; n <  4 ; n++) {
		det += src[n] * dst[n << 2];
	}
	for (let n = 0 ; n < 16 ; n++) {
		dst[n] /= det;
	}

	finalDst.set(dst);
	return finalDst;
}

class Dynamic_Matrix4x4_Stack {
	constructor(depth) {
		depth = depth || 32;

		this.matSize = 16;
		this.depth = depth;

		this.array_ = new Float32Array(this.matSize * this.depth);

		this.topIdx = this.matSize;

		this.count = 1;

		Matrix.identity4x4(this.array_);

		this.updateCurrMatrix_();

		this.save();
	}

	updateCurrMatrix_() {
		this.currMatrix_ = this.array_.subarray(
			this.topIdx - this.matSize, 
			this.topIdx
		);
	}

	save() {
		if (this.topIdx >= this.array_.length) {
			const saved = this.array_;
			const larger = new Float32Array(this.topIdx * 2);
			larger.set(saved);
			
			this.array_ = larger;
		}

		const prevMat = this.matrix();

		this.topIdx += this.matSize;
		this.count += 1;

		this.updateCurrMatrix_();
		
		Matrix.copyTo(
			this.matrix(), 
			prevMat
		);

		return this.matrix();
	}
	pushIdentity() {
		if (this.topIdx >= this.array_.length) {
			const saved = this.array_;
			const larger = new Float32Array(this.topIdx * 2);
			larger.set(saved);
			
			this.array_ = larger;
		}

		this.topIdx += this.matSize;
		this.count += 1;

		this.updateCurrMatrix_();
		 
		Matrix.identity(this.matrix());

		return this.matrix();
	}
	restore() {
		if (this.count < 2) {
			console.warn("unexpected restore operation, matrix stack empty");
			return;
		} 

		this.topIdx -= this.matSize;
		this.count -= 1;

		this.updateCurrMatrix_();

		return this.matrix();
	}
	matrix() {
		return this.currMatrix_;
	}
	clear() {
		this.topIdx = this.matSize;

		this.count = 1;

		this.updateCurrMatrix_();
		
		Matrix.identity4x4(this.array_);
	}
}

class Static_Matrix4x4_Stack {
	constructor(depth) {
		depth = depth || 32;

		this.matSize = 16;
		this.depth = depth;

		this.array_ = new Float32Array(this.matSize * this.depth);

		this.topIdx = this.matSize;

		this.count = 1;

		Matrix.identity4x4(this.array_);

		this.updateCurrMatrix_();

		this.save();
	}

	updateCurrMatrix_() {
		this.currMatrix_ = this.array_.subarray(
			this.topIdx - this.matSize, 
			this.topIdx
		);
	}

	save() {
		const prevMat = this.matrix();

		this.topIdx += this.matSize;
		this.count += 1;

		this.updateCurrMatrix_();
		
		Matrix.copyTo(
			this.matrix(), 
			prevMat
		);

		return this.matrix();
	}

	pushIdentity() {
		this.topIdx += this.matSize;
		this.count += 1;

		this.updateCurrMatrix_();
		 
		Matrix.identity(this.matrix());

		return this.matrix();
	}

	restore() {
		this.topIdx -= this.matSize;
		this.count -= 1;

		this.updateCurrMatrix_();

		return this.matrix();
	}
	matrix() {
		return this.currMatrix_;
	}
	clear() {
		this.topIdx = this.matSize;

		this.count = 1;

		this.updateCurrMatrix_();
		
		Matrix.identity4x4(this.array_);
	}
}

const vBuf = new Float32Array(8);
const vBuf0 = vBuf.subarray(0, 4);
const vBuf1 = vBuf.subarray(4, 8);

class Matrix {
	static inverse(src, dst) {
		Matrix.identity(Matrix.matBuf);
		return inverse(src);
	}

	static transpose(dst, src) {
		dst[0]  = src[0];
		dst[1]  = src[4];
		dst[2]  = src[8];
		dst[3]  = src[12];

		dst[4]  = src[1];
		dst[5]  = src[5];
		dst[6]  = src[9];
		dst[7]  = src[13];

		dst[8]  = src[2];
		dst[9]  = src[6];
		dst[10] = src[10];
		dst[11] = src[14];

		dst[12] = src[3];
		dst[13] = src[7];
		dst[14] = src[11];
		dst[15] = src[15];

		return dst;
	}

	static transposeInplace(dst, src) {
		src = dst;

		const src1  = src[1];
		const src2  = src[2];
		const src3  = src[3];
		const src6  = src[6];
		const src7  = src[7];
		const src11 = src[11];

		//dst[0]  = src[0];
		dst[1]  = src[4];
		dst[2]  = src[8];
		dst[3]  = src[12];

		dst[4]  = src1;
		//dst[5]  = src[5];
		dst[6]  = src[9];
		dst[7]  = src[13];

		dst[8]  = src2;
		dst[9]  = src6;
		//dst[10] = src[10];
		dst[11] = src[14];

		dst[12] = src3;
		dst[13] = src7;
		dst[14] = src11;
		//dst[15] = src[15];

		return dst;
	}

	static idx2d(mat, row, col) {
		return mat[(col * 4) + row];
	}

	static copy(mat) {
		return new Float32Array(mat);
	}

	static copyTo(dst, src) {
		dst.set(src);
		return dst;
	}

	static make4x4() {
		return Matrix.identity4x4(new Float32Array(16));
	}

	static make3x3() {
		return Matrix.identity3x3(new Float32Array(9));
	}

	static identity4x4(src) {
		src[0]  = 1;
		src[1]  = 0;
		src[2]  = 0;
		src[3]  = 0;

		src[4]  = 0;
		src[5]  = 1;
		src[6]  = 0;
		src[7]  = 0;

		src[8]  = 0;
		src[9]  = 0;
		src[10] = 1;
		src[11] = 0;

		src[12] = 0;
		src[13] = 0;
		src[14] = 0;
		src[15] = 1;

		return src;
	}
	static identity3x3(src) {
		src[0]  = 1;
		src[1]  = 0;
		src[2]  = 0;

		src[3]  = 0;
		src[4]  = 1;
		src[5]  = 0;

		src[6]  = 0;
		src[7]  = 0;
		src[8]  = 1;

		return src;
	}
	static identity(src) {
		return Matrix.identity4x4(src);
	}

	static rotationX_matrix(rad) {
		const buf = Matrix.identity(Matrix.matBufXform);
		
		const c = Math.cos(rad);
		const s = Math.sin(rad);
		buf[5]  =  c;
		buf[6]  =  s;
		buf[9]  = -s;
		buf[10] =  c;

		return buf;
	}
	static rotationY_matrix(rad) {
		const buf = Matrix.identity(Matrix.matBufXform);

		const c = Math.cos(rad);
		const s = Math.sin(rad);
		buf[0]  =  c;
		buf[2]  = -s;
		buf[8]  =  s;
		buf[10] =  c;

		return buf;
	}
	static rotationZ_matrix(rad) {
		const buf = Matrix.identity(Matrix.matBufXform);
		
		const c = Math.cos(rad);
		const s = Math.sin(rad);
		buf[0]  =  c;
		buf[1]  =  s;
		buf[4]  = -s;
		buf[5]  =  c;

		return buf;
	}
	static rotateX(src, rad) {
		return Matrix.multiply(
			src, 
			Matrix.rotationX_matrix(rad), 
			src
		);
	}
	static rotateY(src, rad) {
		return Matrix.multiply(
			src, 
			Matrix.rotationY_matrix(rad), 
			src
		);
	}
	static rotateZ(src, rad) {
		return Matrix.multiply(
			src, 
			Matrix.rotationZ_matrix(rad), 
			src
		);
	}

	static translation_matrix(x, y, z) {
		const buf = Matrix.identity(Matrix.matBufXform);

		buf[12] = x;
		buf[13] = y;
		buf[14] = z;

		return buf;
	}

	static translate(src, x, y, z) {
		return Matrix.multiply(
			src, 
			Matrix.translation_matrix(x, y, z), 
			src
		);
	}
	static translateV(src, xyz) {
		return Matrix.multiply(
			src, 
			Matrix.translation_matrix(xyz[0], xyz[1], xyz[2]), 
			src
		);
	}
	static translateX(src, x) {
		return Matrix.translate(src, x, 1, 1);
	}
	static translateY(src, y) {
		return Matrix.translate(src, 1, y, 1);
	}
	static translateZ(src, z) {
		return Matrix.translate(src, 1, 1, z);
	}

	static scale_matrix(x, y, z) {
		const buf = Matrix.identity(Matrix.matBufXform);

		buf[0]  = x;
		buf[5]  = y;
		buf[10] = z;

		return buf;		
	}
	static scale(src, x, y, z) {
		return Matrix.multiply(
			src,
			Matrix.scale_matrix(x, y, z),
			src
		);
	}
	static scaleV(src, xyz) {
		return Matrix.multiply(
			src,
			Matrix.scale_matrix(xyz[0], xyz[1], xyz[2]),
			src
		);
	}
	static scaleX(src, x) {
		return Matrix.scale(src, x, 1, 1);
	}
	static scaleY(src, y) {
		return Matrix.scale(src, 1, y, 1);
	}
	static scaleZ(src, z) {
		return Matrix.scale(src, 1, 1, z);
	}
	static scaleXYZ(src, val) {
		return Matrix.scale(src, val, val, val);
	}

	static skewXRelY(src, val) {
		return Matrix.multiply(
			src,
			new Float32Array([
				1,  0,  0,  0,
				Math.tan(val), 1,  0,  0,
				0,  0,  1,  0,
				0,  0,  0,  1
			]),
			src,

		)
	}

	static perspective(src, fov, aspect, zNear, zFar) {
		return Matrix.identity(src); // TODO
	}

	static orthographic(src, left, right, bottom, top, zNear, zFar) {
		return Matrix.identity(src); // TODO
	}




/*
// assumes A[16] B[16] column-major
float out[16] = {}
for (int row=0;row<4;row++) {
  for (int col=0;col<4;col++) {
    for (int k=0;k<4;k++) {
      out[4*col + row] += A[4*k + row]*B[4*col + k];
    }
  }
}
*/
/*
// column-major offset
int cmo (int row, int col ) {
  return 4*col + row;
}

// assumes A[16] B[16] column-major
float out[16] = {}
// for each row of AB
for (int row=0;row<4;row++) {
  // for each column in the current row
  for (int col=0;col<4;col++) {
    // dot the row of A with the col of B
    for (int k=0;k<4;k++) {
      out[cmo(row,col)] += A[cmo(row,k)]*B[cmo(k,col)];
    }
  }
}
*/

	static multiply(A, B, dst) {
		dst = dst || A;

		for (let r = 0; r < 4; r += 1) {
			// row r of A
			vBuf0[0] = A[r];
			vBuf0[1] = A[r + 4];
			vBuf0[2] = A[r + 8];
			vBuf0[3] = A[r + 12];

			for (let c = 0; c < 4; c += 1) {
				// col c of B
				const colIdx = c * 4;
				vBuf1[0] = B[colIdx];
				vBuf1[1] = B[colIdx + 1];
				vBuf1[2] = B[colIdx + 2];
				vBuf1[3] = B[colIdx + 3];

				// row r, col c = dot(r, c)
				Matrix.matBuf[colIdx + r] = dot(vBuf0, vBuf1);
			}
		}

		dst.set(Matrix.matBuf);

		return dst;
	}
	static multiplyV(m0, v, dst) {
		dst = dst || v;

		const v0 = v[0];
		const v1 = v[1];
		const v2 = v[2];
		const v3 = v[3];

		const x = (v0 * m0[0]) +
				  (v1 * m0[4]) +
				  (v2 * m0[8]) +
				  (v3 * m0[12]);

		const y = (v0 * m0[1]) +
				  (v1 * m0[5]) +
				  (v2 * m0[9]) +
				  (v3 * m0[13]);

		const z = (v0 * m0[2])  +
				  (v1 * m0[6])  +
				  (v2 * m0[10]) +
				  (v3 * m0[14]);

		const w = (v0 * m0[3])  +
				  (v1 * m0[7])  +
				  (v2 * m0[11]) +
				  (v3 * m0[15]);

		dst[0] = x;
		dst[1] = y;
		dst[2] = z;
		dst[3] = w;

		return dst;

	}
}

Matrix.matBuf      = new Float32Array(16);
Matrix.matBufXform = new Float32Array(16);

export {Matrix, Dynamic_Matrix4x4_Stack, Static_Matrix4x4_Stack};