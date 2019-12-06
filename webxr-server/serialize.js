// TODO:
// parameterize this better
function serialize(anim) {
    
    let H = 'CTanim01';
    let data = new Uint16Array(4 + 6 * anim.length);
    
    for (let i = 0 ; i < 4 ; i++)
        data[i] = H.charCodeAt(i<<1) << 8 | H.charCodeAt(i<<1 | 1);

    for (let n = 0 ; n < anim.length ; n++) {
        let mat = anim[n]._m(), quat = CT.matrixToQ(mat);
        let sgn = quat[3] < 0 ? -1 : 1;
        for (let j = 0 ; j < 3 ; j++)
            data[i++] = floor(65535 * (.5 + mat[j + 12] / 64));
        for (let j = 0 ; j < 3 ; j++)
            data[i++] = floor(65535 * (.5 + .5 * sgn * quat[j]));
    }

    return data.buffer;
}

function deserialize() {

}