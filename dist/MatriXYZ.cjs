'use strict';

/**
 * wrapper function to switch between
 * 2D or 3D matrix
 */
function getMatrix({
    transforms = [],
    transFormOrigin = { x: 0, y: 0 },
    perspectiveOrigin = { x: 0, y: 0 },
    perspective = 100,
    force3D = false
} = {}) {

    let matrix;

    //check if 3d or 2D
    let is3d = force3D ? true : has3Dtransforms(transforms);


    matrix = is3d ? getMatrix3D(transforms, transFormOrigin) : getMatrix2D(transforms, transFormOrigin);

    //console.log('is3d', is3d,force3D , matrix);
    return matrix
}



/**
 * get 3D matrix
 * respecting the transform origin
 */
function getMatrix3D(transformations = [], origin = { x: 0, y: 0 }) {

    const multiply = (m1, m2) => ({
        a: m1.a * m2.a + m1.b * m2.e + m1.c * m2.i + m1.d * m2.m,
        b: m1.a * m2.b + m1.b * m2.f + m1.c * m2.j + m1.d * m2.n,
        c: m1.a * m2.c + m1.b * m2.g + m1.c * m2.k + m1.d * m2.o,
        d: m1.a * m2.d + m1.b * m2.h + m1.c * m2.l + m1.d * m2.p,

        e: m1.e * m2.a + m1.f * m2.e + m1.g * m2.i + m1.h * m2.m,
        f: m1.e * m2.b + m1.f * m2.f + m1.g * m2.j + m1.h * m2.n,
        g: m1.e * m2.c + m1.f * m2.g + m1.g * m2.k + m1.h * m2.o,
        h: m1.e * m2.d + m1.f * m2.h + m1.g * m2.l + m1.h * m2.p,

        i: m1.i * m2.a + m1.j * m2.e + m1.k * m2.i + m1.l * m2.m,
        j: m1.i * m2.b + m1.j * m2.f + m1.k * m2.j + m1.l * m2.n,
        k: m1.i * m2.c + m1.j * m2.g + m1.k * m2.k + m1.l * m2.o,
        l: m1.i * m2.d + m1.j * m2.h + m1.k * m2.l + m1.l * m2.p,

        m: m1.m * m2.a + m1.n * m2.e + m1.o * m2.i + m1.p * m2.m,
        n: m1.m * m2.b + m1.n * m2.f + m1.o * m2.j + m1.p * m2.n,
        o: m1.m * m2.c + m1.n * m2.g + m1.o * m2.k + m1.p * m2.o,
        p: m1.m * m2.d + m1.n * m2.h + m1.o * m2.l + m1.p * m2.p
    });

    const translationMatrix = (x, y, z = 0) => ({
        a: 1, b: 0, c: 0, d: 0,
        e: 0, f: 1, g: 0, h: 0,
        i: 0, j: 0, k: 1, l: 0,
        m: x, n: y, o: z, p: 1
    });

    const scalingMatrix = (sx, sy, sz) => ({
        a: sx, b: 0, c: 0, d: 0,
        e: 0, f: sy, g: 0, h: 0,
        i: 0, j: 0, k: sz, l: 0,
        m: 0, n: 0, o: 0, p: 1
    });


    const angleMatrix = (angle, type) => {
        const toRad = (angle) => angle * Math.PI / 180;
        let rad = toRad(angle), cos, sin, tan;
        if (type === 'rx' || type === 'ry' || type === 'rz') {
            cos = Math.cos(rad), sin = Math.sin(rad);
        } else {
            tan = Math.tan(toRad(angle));
        }
        switch (type) {
            case 'rx': return {
                a: 1, b: 0, c: 0, d: 0,
                e: 0, f: cos, g: sin, h: 0,
                i: 0, j: -sin, k: cos, l: 0,
                m: 0, n: 0, o: 0, p: 1
            };
            case 'ry': return {
                a: cos, b: 0, c: -sin, d: 0,
                e: 0, f: 1, g: 0, h: 0,
                i: sin, j: 0, k: cos, l: 0,
                m: 0, n: 0, o: 0, p: 1
            };
            case 'rz': return {
                a: cos, b: sin, c: 0, d: 0,
                e: -sin, f: cos, g: 0, h: 0,
                i: 0, j: 0, k: 1, l: 0,
                m: 0, n: 0, o: 0, p: 1
            };
            // skewing
            case 'sx':
                //let tx = Math.tan(toRad(angle));
                return {
                    a: 1, b: 0, c: 0, d: 0,
                    e: tan, f: 1, g: 0, h: 0,
                    i: 0, j: 0, k: 1, l: 0,
                    m: 0, n: 0, o: 0, p: 1
                };
            case 'sy':
                //let ty = Math.tan(toRad(sy));
                return {
                    a: 1, b: tan, c: 0, d: 0,
                    e: 0, f: 1, g: 0, h: 0,
                    i: 0, j: 0, k: 1, l: 0,
                    m: 0, n: 0, o: 0, p: 1
                };
        }
    };


    let matrix = {
        a: 1, b: 0, c: 0, d: 0,
        e: 0, f: 1, g: 0, h: 0,
        i: 0, j: 0, k: 1, l: 0,
        m: 0, n: 0, o: 0, p: 1
    };


    // Compensate transform-origin
    if (origin.x !== 0 || origin.y !== 0) {
        matrix = multiply(matrix, translationMatrix(-origin.x, -origin.y));
    }

    for (let i = transformations.length - 1; i >= 0; i--) {
        let t = transformations[i];
        let key = Object.keys(t)[0];
        let values = t[key];
        let x, y, z;

        if (key === "scale") {
            [x, y = 1, z = 1] = values;
            if(x!==1 || y!==1) matrix = multiply(matrix, scalingMatrix(x, y, z));
        }

        else if (key === "skew") {
            [x = 0, y = 0] = values;
            if(y)  matrix = multiply(matrix, angleMatrix(y, 'sy'));
            if(x)  matrix = multiply(matrix, angleMatrix(x, 'sx'));
        }

        else if (key === "rotate") {
            // interpret single rotation as rotateZ
            if (values.length === 1) values = [0, 0, values[0]];
            [x = 0, y = 0, z = 0] = values;
            if(z) matrix = multiply(matrix, angleMatrix(z, 'rz'));
            if(y) matrix = multiply(matrix, angleMatrix(y, 'ry'));
            if(x) matrix = multiply(matrix, angleMatrix(x, 'rx'));
        }

        else if (key === "translate") {
            [x, y = 0, z = 0] = values;
            if(x||y||z) matrix = multiply(matrix, translationMatrix(x, y, z));
        }

        else if (key === "matrix") {
            let keys = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p'];
            let obj = Object.fromEntries(keys.map((key, i) => [key, values[i]]));
            matrix = multiply(matrix, obj);
        }

        else {
            throw new Error("Unknown transform type: " + key);
        }
    }

    // Transform origin shift
    if (origin.x  || origin.y ) matrix = multiply(matrix, translationMatrix(origin.x, origin.y));

    //console.log(matrix);
    return matrix;
}


function getMatrix2D(transformations = [], origin = { x: 0, y: 0 }) {

    // Helper function to multiply two 2D matrices
    const multiply = (m1, m2) => ({
        a: m1.a * m2.a + m1.c * m2.b,
        b: m1.b * m2.a + m1.d * m2.b,
        c: m1.a * m2.c + m1.c * m2.d,
        d: m1.b * m2.c + m1.d * m2.d,
        e: m1.a * m2.e + m1.c * m2.f + m1.e,
        f: m1.b * m2.e + m1.d * m2.f + m1.f
    });

    // Helper function to create a translation matrix
    const translationMatrix = (x, y) => ({
        a: 1, b: 0, c: 0, d: 1, e: x, f: y
    });

    // Helper function to create a scaling matrix
    const scalingMatrix = (x, y) => ({
        a: x, b: 0, c: 0, d: y, e: 0, f: 0
    });


    // get skew or rotation axis matrix
    const angleMatrix = (angles, type) => {
        const toRad = (angle) => angle * Math.PI / 180;
        let [angleX, angleY] = angles.map(ang => { return toRad(ang) });
        let m = {};

        if (type === 'rot') {
            let cos = Math.cos(angleX), sin = Math.sin(angleX);
            m = { a: cos, b: sin, c: -sin, d: cos, e: 0, f: 0 };
        } else if (type === 'skew') {
            let tanX = Math.tan(angleX), tanY = Math.tan(angleY);
            m = {
                a: 1, b: tanY, c: tanX, d: 1, e: 0, f: 0
            };
        }
        return m
    };


    // Start with an identity matrix
    let matrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };


    // Apply transform origin: translate to origin, apply transformations, translate back
    if (origin.x !== 0 || origin.y !== 0) {
        matrix = multiply(matrix, translationMatrix(origin.x, origin.y));
    }

    // Default values for transformations
    const defaults = {
        translate: [0, 0],
        scale: [1, 1],
        skew: [0, 0],
        rotate: [0],
        matrix: [1, 0, 0, 1, 0, 0]
    };


    // Process transformations in the provided order (right-to-left)
    for (const transform of transformations) {
        const type = Object.keys(transform)[0]; // Get the transformation type (e.g., "translate")
        const values = transform[type] || defaults[type]; // Use default values if none provided

        // Destructure values with fallbacks
        let [x, y = defaults[type][1]] = values;

        // Z-rotate as  2d rotation
        if(type==='rotate' && values.length===3  ){
            x=values[2];
        }

        switch (type) {
            case "matrix":
                let keys = ['a', 'b', 'c', 'd', 'e', 'f'];
                let obj = Object.fromEntries(keys.map((key, i) => [key, values[i]]));
                matrix = multiply(matrix, obj);
                break;
            case "translate":
                if(x || y) matrix = multiply(matrix, translationMatrix(x, y));
                break;
            case "skew":
                if(x || y) matrix = multiply(matrix, angleMatrix([x, y], 'skew'));
                break;
            case "rotate":
                if(x) matrix = multiply(matrix, angleMatrix([x], 'rot'));
                break;
            case "scale":
                if(x!==1 || y!==1) matrix = multiply(matrix, scalingMatrix(x, y));
                break;

            default:
                throw new Error(`Unknown transformation type: ${type}`);
        }
    }

    // Revert transform origin
    if (origin.x !== 0 || origin.y !== 0) {
        matrix = multiply(matrix, translationMatrix(-origin.x, -origin.y));
    }

    //console.log('matrix2D', matrix);
    return matrix;
}


function has3Dtransforms(transforms, force3D=false) {

    if(force3D) return true;

    let has3D = false;

    // all transform functions object items
    let compoundTransforms = transforms.filter(trans => {
        let keys = Object.keys(trans);
        return keys.length > 1
    });

    let hasCompound = compoundTransforms.length>1;
    //console.log(hasCompound);

    if (hasCompound) {
        for (let i = 0; i < singleTransforms.length && !has3D; i++) {
            let trans = singleTransforms[i];
            let keyArr = Object.keys(trans);
            let valArr = Object.values(trans);

            for (let v = 0; v < valArr.length && !has3D; v++) {
                let vals = valArr[v];
                let key = keyArr[v];
                if ((key !== 'matrix' && vals.length > 2) || (key === 'matrix' && vals.length === 16)) has3D = true;
            }
        }
    } else {

        //check if 3d or 2D
        has3D = transforms.filter(trans => {
            let key = Object.keys(trans)[0];
            let vals = Object.values(trans)[0];
            let has3DRotation = key==='rotate' && vals.length ===3  && (vals[0]!==0 || vals[1]!==0);
            let onlyZRotation = key==='rotate' && vals.length === 3 && vals[0]===0 && vals[1]===0 && vals[2]!==0;

            if(has3DRotation){
                return true
            }

            if(onlyZRotation){
                return false
            }

            if((key !== 'matrix' && vals.length > 2 && 
            ( (key!=='scale'  && vals[2]!==0) || (key==='scale' && vals[2]!==1 ) || (key==='rotate' && vals[0]!==0 )  )    ) || 
            (key === 'matrix' && vals.length === 16)){
                return true
            }

            return false
        }).length > 0;
    }

    return has3D;

}


/**
 * Detects if a 3D matrix + perspective can be expressed as a 2D matrix.
 * Returns true if the transformation can be reduced to 2D without significant loss.
 */
function canFlattenTo2D(matrix) {
    // Extract the basis vectors
    let xAxis = [matrix.a, matrix.e, matrix.i]; // X-axis
    let yAxis = [matrix.b, matrix.f, matrix.j]; // Y-axis
    let zAxis = [matrix.c, matrix.g, matrix.k]; // Z-axis

    // Check if the Z-axis is orthogonal to the X and Y axes
    let dotProductXZ = xAxis[0] * zAxis[0] + xAxis[1] * zAxis[1] + xAxis[2] * zAxis[2];
    let dotProductYZ = yAxis[0] * zAxis[0] + yAxis[1] * zAxis[1] + yAxis[2] * zAxis[2];

    // Check if the Z-axis is aligned with the 2D plane (no X or Y components)
    let isZAxisAligned = zAxis[0] === 0 && zAxis[1] === 0;

    // If the Z-axis is orthogonal to X and Y axes and aligned with the 2D plane, the matrix can be flattened
    return Math.abs(dotProductXZ) < 1e-6 && Math.abs(dotProductYZ) < 1e-6 && isZAxisAligned;
}


/**
 * Flattens a 3D transformation matrix into a 2D matrix approximation.
 * Removes depth-based transformations while keeping perspective scaling.
 */
function flattenTo2D(matrix, perspective = Infinity) {
    // Compute the perspective scaling factor (if applicable)
    let scaleFactor = 1;
    
    if (perspective !== Infinity && matrix.o !== 0) {
        scaleFactor = 1 / (1 - (matrix.o / perspective));
        scaleFactor = Math.max(0.1, Math.min(scaleFactor, 10)); // Clamping to avoid extreme values
    }

    // Preserve only the 2D transform values, ensuring proper rotation & skew
    return {
        a: matrix.a * scaleFactor,  // X scale + rotation
        b: matrix.b * scaleFactor,  // X skew
        c: matrix.e * scaleFactor,  // Y skew
        d: matrix.f * scaleFactor,  // Y scale + rotation
        e: matrix.m * scaleFactor,  // X translation
        f: matrix.n * scaleFactor   // Y translation
    };
}

function transformPoints(pts, matrix, perspectiveOrigin = { x: 0, y: 0, z: 0 }, perspective = Infinity, is3D = null, decimals = -1) {


    // normalize point structure
    const convertPointArr = (pts) => {

        // not point object array
        if (pts[0].x === undefined) {

            // nested array
            if (Array.isArray(pts[0])) {
                return pts.map(pt => { return { x: pt[0], y: pt[1] } })
            } else {

                // flat array
                let ptsO = [];
                for (let i = 1, len = pts.length; i < len; i += 2) {
                    ptsO.push({ x: pts[i - 1], y: pts[i] });
                }
                return ptsO;
            }

        }
        else {
            // already object
            return pts
        }
    };


    pts = convertPointArr(pts);


    // check if 3d
    let is3DPt = pts[0].hasOwnProperty('z');
    is3D = Object.values(matrix).length === 16;
    let canFlatten = false;

    if (is3D && !is3DPt) {
        //check if 3D matrix could be expressed by a 2D one
        canFlatten = canFlattenTo2D(matrix);
        if (canFlatten) {
            is3D = false;
            matrix = flattenTo2D(matrix, perspective);
        }
    }


    let ptsTrans = [];
    for (let i = 0, len = pts.length; i < len; i++) {
        let pt = pts[i];
        if (is3D) {
            pt = transformPoint3D(pt, matrix, perspectiveOrigin, perspective, decimals);
        }
        else {
            pt = transformPoint2D(pt, matrix, decimals);
        }
        ptsTrans.push(pt);
    }

    return ptsTrans;
}


/**
 * wrapper for single 2D or 3D point
 */
function transformPoint(pt, matrix, perspectiveOrigin = { x: 0, y: 0 }, perspective = Infinity, is3D = null, decimals = 8) {

    //convert array
    pt = Array.isArray(pt) ? { x: pt[0], y: pt[1], z: pt[1] || 0 } : pt;


    if (is3D === null) {
        is3D = Object.values(matrix).length === 16;
    }

    if (is3D) {
        pt = transformPoint3D(pt, matrix, perspectiveOrigin, perspective, decimals);
    }
    else {
        pt = transformPoint2D(pt, matrix, decimals);
    }

    return pt;
}



function transformPoint3D(pt, matrix, perspectiveOrigin = { x: 0, y: 0 }, perspective = Infinity, decimals = -1
) {
    let x = pt.x, y = pt.y, z = pt.z || 0, w = 1;

    // Apply the 4x4 transformation matrix (object-based: a–p)
    let newX = matrix.a * x + matrix.e * y + matrix.i * z + matrix.m * w;
    let newY = matrix.b * x + matrix.f * y + matrix.j * z + matrix.n * w;
    let newZ = matrix.c * x + matrix.g * y + matrix.k * z + matrix.o * w;
    let newW = matrix.d * x + matrix.h * y + matrix.l * z + matrix.p * w;


    // Homogeneous division
    if (newW !== 0) {
        newX /= newW;
        newY /= newW;
        newZ /= newW;
    }

    // Apply perspective projection using the standard CSS formula:
    if (perspective !== Infinity) {
        let factor = 1 - (newZ / perspective);

        let adjustX = (newX - perspectiveOrigin.x) / factor;
        let adjustY = (newY - perspectiveOrigin.y) / factor;

        if (factor !== 0) {

            newX = perspectiveOrigin.x + adjustX;
            newY = perspectiveOrigin.y + adjustY;

            if (factor === 0) {
                factor = 0.01;
            }

            // adjust negative factors
            if (factor < 0) {
                factor = Math.abs(factor);
                newX = (perspectiveOrigin.x - (newX - perspectiveOrigin.x) / factor);
                newY = (perspectiveOrigin.y - (newY - perspectiveOrigin.y) / factor);

            }

        }
    }

    let ptTrans = { x: newX, y: newY };
    if (decimals > -1) {
        ptTrans.x = +(ptTrans.x).toFixed(decimals);
        ptTrans.y = +(ptTrans.y).toFixed(decimals);
    }

    return ptTrans;
}


// transform point by 2d matrix
function transformPoint2D(pt, matrix, decimals = -1) {
    let { a, b, c, d, e, f } = matrix;
    let { x, y } = pt;
    let ptTrans = { x: a * x + c * y + e, y: b * x + d * y + f };

    if (decimals > -1) {
        ptTrans.x = +(ptTrans.x).toFixed(decimals);
        ptTrans.y = +(ptTrans.y).toFixed(decimals);
    }
    return ptTrans;
}

function setCSSTransforms(el, transformOptions) {
    let css = getCSSTransform(transformOptions);
    el.setAttribute('style', css);
    el.parentNode.style.perspective = transformOptions.perspective + 'px';
    el.parentNode.style.perspectiveOrigin = `${transformOptions.perspectiveOrigin.x}px ${transformOptions.perspectiveOrigin.y}px`;
}


function getCSSTransform({
    transforms = [],
    transFormOrigin = { x: 0, y: 0 },
    perspectiveOrigin = { x: 0, y: 0 },
    perspective = 100
} = {}) {
    let css = [];

    //check if 3d or 2D
    let is3d = transforms.filter(trans => {
        let key = Object.keys(trans)[0];
        let vals = Object.values(trans)[0];
        return (key !== 'matrix' && vals.length > 2) || (key === 'matrix' && vals.length === 16)
    }).length > 0;


    let unit = 'px';
    transforms.forEach(t => {
        let prop = Object.keys(t)[0];
        let vals = Object.values(t)[0];

        //add units
        unit = prop === 'rotate' || prop === 'skew' ? 'deg' : (prop === 'scale' || prop === 'matrix' ? '' : 'px');
        let valsN = vals.map((val, v) => {
            return val !== '' ? `${val}${unit}` : ''
        });

        if (is3d) {
            let x, y, z;
            if (prop === 'translate') {
                [x, y = '0px', z = '0px'] = valsN;
            } else {
                [x, y = '0deg', z = '0deg'] = valsN;
            }

            if (prop === 'matrix') {
                css.push(`${prop}3d(${valsN.join(',')})`);
            }
            else if (prop === 'skew') {
                css.push(`${prop}X(${x}) ${prop}Y(${y})`);
            } else {
                css.push(`${prop}X(${x}) ${prop}Y(${y}) ${prop}Z(${z})`);
            }
        }
        else {
            css.push(`${prop}(${valsN.join(', ')})`);
        }

    });

    let cssParent = `perspective-origin:${perspectiveOrigin.x}px ${perspectiveOrigin.y}px; perspective:${perspective}px;`;

    css = `transform:${css.join(' ')};transform-origin:${transFormOrigin.x}px ${transFormOrigin.y}px;`;
    return {el:css, parent:cssParent}

}

function Mtx({
    transforms = [],
    transFormOrigin = { x: 0, y: 0 },
    perspectiveOrigin = { x: 0, y: 0 },
    perspective = 100,
    force3D = false
} = {}) {
    this.transforms = transforms;
    this.transFormOrigin = transFormOrigin;
    this.perspectiveOrigin = perspectiveOrigin;
    this.perspective = perspective;
    this.force3D = force3D;

    //get matrix    
    this.matrix = getMatrix({
        transforms,
        transFormOrigin,
        perspectiveOrigin,
        perspective, 
        force3D
    });
    this.is3D = this.matrix.p !== undefined;
    this.css = getCSSTransform({ transforms, transFormOrigin, perspectiveOrigin, perspective, force3D });
}


Mtx.prototype.transformPoints = function (pts, decimals=8) {
    let ptsT = transformPoints(pts, this.matrix, this.perspectiveOrigin, this.perspective, this.force3D, decimals);
    this.ptsT = ptsT;
    return ptsT;
};

exports.Mtx = Mtx;
exports.canFlattenTo2D = canFlattenTo2D;
exports.flattenTo2D = flattenTo2D;
exports.getCSSTransform = getCSSTransform;
exports.getMatrix = getMatrix;
exports.getMatrix2D = getMatrix2D;
exports.getMatrix3D = getMatrix3D;
exports.has3Dtransforms = has3Dtransforms;
exports.setCSSTransforms = setCSSTransforms;
exports.transformPoint = transformPoint;
exports.transformPoint2D = transformPoint2D;
exports.transformPoint3D = transformPoint3D;
exports.transformPoints = transformPoints;
