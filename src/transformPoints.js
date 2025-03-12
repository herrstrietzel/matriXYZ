
import { canFlattenTo2D, flattenTo2D } from './getMatrix';


export function transformPoints(pts, matrix, perspectiveOrigin = { x: 0, y: 0, z: 0 }, perspective = Infinity, is3D = null, decimals = -1) {


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
                    ptsO.push({ x: pts[i - 1], y: pts[i] })
                }
                return ptsO;
            }

        }
        else {
            // already object
            return pts
        }
    }


    pts = convertPointArr(pts);


    // check if 3d
    let is3DPt = pts[0].hasOwnProperty('z');
    is3D = Object.values(matrix).length === 16;
    let canFlatten = false;

    if (is3D && !is3DPt) {
        //check if 3D matrix could be expressed by a 2D one
        canFlatten = canFlattenTo2D(matrix, perspective);
        if (canFlatten) {
            is3D = false
            matrix = flattenTo2D(matrix, perspective);
        }
    }


    let ptsTrans = []
    for (let i = 0, len = pts.length; i < len; i++) {
        let pt = pts[i];
        if (is3D) {
            pt = transformPoint3D(pt, matrix, perspectiveOrigin, perspective, decimals);
        }
        else {
            pt = transformPoint2D(pt, matrix, decimals)
        }
        ptsTrans.push(pt);
    }

    return ptsTrans;
}


/**
 * wrapper for single 2D or 3D point
 */
export function transformPoint(pt, matrix, perspectiveOrigin = { x: 0, y: 0 }, perspective = Infinity, is3D = null, decimals = -1) {


    //convert array
    pt = Array.isArray(pt) ? { x: pt[0], y: pt[1], z: pt[1] || 0 } : pt;

    if (is3D === null) {
        is3D = Object.values(matrix).length === 16;
    }

    if (is3D) {
        pt = transformPoint3D(pt, matrix, perspectiveOrigin, perspective, decimals);
    }
    else {
        pt = transformPoint2D(pt, matrix, decimals)
    }

    return pt;
}




export function transformPoint3D(pt, matrix, perspectiveOrigin = { x: 0, y: 0 }, perspective = Infinity, decimals = -1
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

        let adjustX = (newX - perspectiveOrigin.x) / factor
        let adjustY = (newY - perspectiveOrigin.y) / factor

        if (factor !== 0) {

            newX = perspectiveOrigin.x + adjustX;
            newY = perspectiveOrigin.y + adjustY;

            if (factor === 0) {
                factor = 0.01
            }

            // adjust negative factors
            if (factor < 0) {
                factor = Math.abs(factor)
                newX = (perspectiveOrigin.x - (newX - perspectiveOrigin.x) / factor);
                newY = (perspectiveOrigin.y - (newY - perspectiveOrigin.y) / factor);

            }

        }
    }

    let ptTrans = { x: newX, y: newY };
    if (decimals > -1) {
        ptTrans.x = +(ptTrans.x).toFixed(decimals)
        ptTrans.y = +(ptTrans.y).toFixed(decimals)
    }

    return ptTrans;
}


// transform point by 2d matrix
export function transformPoint2D(pt, matrix, decimals = -1) {
    let { a, b, c, d, e, f } = matrix;
    let { x, y } = pt;
    let ptTrans = { x: a * x + c * y + e, y: b * x + d * y + f };


    if (decimals > -1) {
        ptTrans.x = +(ptTrans.x).toFixed(decimals)
        ptTrans.y = +(ptTrans.y).toFixed(decimals)
    }

    //console.log('decimals', decimals, ptTrans);
    return ptTrans;
}

