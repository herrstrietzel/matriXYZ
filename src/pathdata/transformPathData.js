//import { parse, convertPathData } from './pathdata/parse';
//import { canFlattenTo2D, flattenTo2D } from '../getMatrix';
//import { canFlattenTo2D, flattenTo2D } from '../getMatrix';
//import * as mtrXYZ from 'mtrXYZ';
//import {transformPoint3D, transformPoint2D, canFlattenTo2D, flattenTo2D } from 'mtrXYZ';

import { renderPoint } from "./arcTransform";


mtrXYZ.Mtx.prototype.transformPathData = function (pts, decimals = 8) {
    let ptsT = mtrXYZ.transformPathData(pts, this.matrix, this.perspectiveOrigin, this.perspective, decimals)
    this.ptsT = ptsT
    return ptsT;
}

/**
 * scale pathData2
 */
export function transformPathData(pathData, matrix, perspectiveOrigin = { x: 0, y: 0 }, perspective = Infinity, decimals = -1) {

    pathData = Array.isArray(pathData) ? pathData : mtrXYZ.parse(pathData).pathData;

    // normalize
    pathData = mtrXYZ.convertPathData(pathData, { toAbsolute: true, toLonghands: true })

    // new pathdata
    let pathDataTrans = [];
    let is3D = Object.values(matrix).length === 16;
    let canFlatten = false


    //check if 3D matrix could be expressed by a 2D one
    if (is3D) canFlatten = mtrXYZ.canFlattenTo2D(matrix, perspective);
    if (canFlatten) {
        is3D = false; matrix = mtrXYZ.flattenTo2D(matrix, perspective);
    }

    //console.log(matrix);

    /**
     * detect large arc based on
     * transformed arc properties
     */
    const detectLargeArc = (cnt, p0, ptR, p, sweep) => {

        const getAngle = (cnt, pt) => Math.atan2(pt.y - cnt.y, pt.x - cnt.x);

        // Identify points based on sweep
        let ptStart = sweep ? p0 : p;
        let ptEnd = sweep ? p : p0;

        // Calculate angles
        let angleStart = getAngle(cnt, ptStart);
        let angleEnd = getAngle(cnt, ptEnd);
        let angleMid = getAngle(cnt, ptR);

        // Normalize angles to [0, 2π) for consistent logic
        angleStart = (angleStart + Math.PI * 2) % (Math.PI * 2);
        angleEnd = (angleEnd + Math.PI * 2) % (Math.PI * 2);
        angleMid = (angleMid + Math.PI * 2) % (Math.PI * 2);

        // Correct angle ranges using angleMid as reference
        if (
            !(angleStart < angleMid && angleMid < angleEnd) &&
            !(angleStart > angleMid && angleMid > angleEnd)
        ) {
            // Adjust angles for proper continuity
            if (angleEnd < angleStart) {
                angleEnd += Math.PI * 2;
            } else {
                angleStart += Math.PI * 2;
            }
        }

        // Calculate delta angle
        let deltaAngle = angleEnd - angleStart;


        return {
            deltaAngle: deltaAngle,
            largeArc: Math.abs(deltaAngle) > Math.PI ? 1 : 0
        };
    }



    /**
     * transform arc 
     * command helper
     */
    const transformArc = (p0, com, matrix) => {
        let values = com.values;
        let [rx0, ry0, angle, largeArc, sweep, x, y] = values;

        /**
        * parametrize arc command 
        * to get the actual arc params
        */
        let xAxisRotation = angle;
        let xAxisRotationRad = xAxisRotation * Math.PI / 180;

        // final on-path point
        let p = { x: x, y: y };

        /**
         * retrieve parametrized properties 
         * of untransformed arc command
         */

        let arcData = {}

        // arc info are present in pathdata
        if (com.rx) {
            arcData = {
                rx: com.rx,
                ry: com.ry,
                cx: com.cx,
                cy: com.cy,
                deltaAngle: com.deltaAngle,
                startAngle: com.startAngle,
                endAngle: com.endAngle
            }
            //console.log('has arc data', arcData, com);

        } else {
            /**
             * radii as defined in the arc command may not be correct -
             * we replace them with the properly calculated ones 
             */
            arcData = mtrXYZ.svgArcToCenterParam(p0.x, p0.y, rx0, ry0, angle, largeArc, sweep, p.x, p.y);
            //console.log('arcData new', arcData);
        }

        // extract arc data properties
        let { rx, ry, cx, cy, startAngle, deltaAngle } = arcData;


        // transform starting point
        p0 = mtrXYZ.transformPoint(p0, matrix, perspectiveOrigin, perspective);
        p = mtrXYZ.transformPoint(p, matrix, perspectiveOrigin, perspective);



        // get arc hull
        let hull = mtrXYZ.getEllipeHull(cx, cy, rx, ry, -xAxisRotationRad)

        // transform hull
        let hullTrans = mtrXYZ.transformPoints(hull, matrix, perspectiveOrigin, perspective)

        // get hullMatrix
        let hullMatrix = mtrXYZ.getConvexHullMatrix(hullTrans)

        // get new arc angles and ellipse center
        let arcPropsTrans = mtrXYZ.getEllipseProperties(hullMatrix)
        //console.log('arcPropsTrans', arcPropsTrans);


        /**
         * get reference point on ellipe at mid delta angle
         * to detect sweep and large arc changes
         */
        let ptR = mtrXYZ.getPointOnEllipse(cx, cy, rx, ry, (startAngle + deltaAngle * 0.5), xAxisRotationRad)

        

        // transform reference point
        ptR = mtrXYZ.transformPoint(ptR, matrix, perspectiveOrigin, perspective);

        // actual transformed ellipse center
        let cntT = { x: arcPropsTrans.cx, y: arcPropsTrans.cy }

        /**
         * detect sweep changes based 
         * on area changes
         */
        let areaTrans = mtrXYZ.getPolygonArea([cntT, p0, ptR, p])
        sweep = areaTrans < 0 ? 0 : 1;


        // get ultimate largeArc value
        let largeArcnew = detectLargeArc(cntT, p0, ptR, p, sweep);
        largeArc = largeArcnew.largeArc

        // update radii and xAxisRotation
        rx=arcPropsTrans.rx
        ry=arcPropsTrans.ry
        xAxisRotation = rx!==ry ? arcPropsTrans.angle : 0;

        
        return {
            type: 'A',
            values: [
                rx,
                ry,
                xAxisRotation,
                largeArc,
                sweep,
                p.x,
                p.y]
        };
    }


    let matrixStr = [matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f]
        .map((val) => {
            return +val.toFixed(1);
        })
        .join("");

    // no transform: quit
    if (matrixStr === "100100") {
        //console.log("no transform");
        return pathData;
    }

    for (let i = 0, len = pathData.length; len && i < len; i++) {
        let com = pathData[i]

        let { type, values } = com;
        let typeRel = type.toLowerCase();
        let comPrev = i > 0 ? pathData[i - 1] : pathData[i];
        let comPrevValues = comPrev.values;
        let comPrevValuesL = comPrevValues.length;
        let p0 = {
            x: comPrevValues[comPrevValuesL - 2],
            y: comPrevValues[comPrevValuesL - 1]
        };
        //let p = { x: values[values.length - 2], y: values[values.length - 1] };
        let comT = { type: type, values: [] };

        switch (typeRel) {
            case "a":
                comT = transformArc(p0, com, matrix)
                break;

            default:
                // all other point based commands
                if (values.length) {
                    for (let i = 0; i < values.length; i += 2) {
                        let ptTrans = !is3D ? mtrXYZ.transformPoint2D(
                            { x: com.values[i], y: com.values[i + 1] },
                            matrix
                        ) : mtrXYZ.transformPoint3D(
                            { x: com.values[i], y: com.values[i + 1] },
                            matrix, perspectiveOrigin, perspective
                        );

                        comT.values[i] = ptTrans.x;
                        comT.values[i + 1] = ptTrans.y;

                    }
                }
        }

        pathDataTrans.push(comT);
    };


    return pathDataTrans;

}