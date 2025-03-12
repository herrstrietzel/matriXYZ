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
        let { rx, ry, cx, cy, startAngle, endAngle, deltaAngle } = arcData;


        // original area between center and start/end points - used for sweep corrections
        let area = mtrXYZ.getPolygonArea([p0, { x: cx, y: cy }, p]);

        /**
         * get actual delta angle
         * to adjust sweep and large arc
         */

        function getDeltaAndSweep(p0, cx, cy, p, sweep, largeArc) {
            const getAngle = (cx, cy, x, y) => Math.atan2(y - cy, x - cx);

            /*
            // Render points for visualization
            */
            //mtrXYZ.renderPoint(markers, [cx, cy], 'magenta');
            //mtrXYZ.renderPoint(markers, p0, 'green', '2%');
            //mtrXYZ.renderPoint(markers, p, 'cyan', '1.5%');



            // Get raw angles (negative values allowed)
            let startAngle = sweep ? getAngle(cx, cy, p0.x, p0.y) : getAngle(cx, cy, p.x, p.y);
            let endAngle = sweep ? getAngle(cx, cy, p.x, p.y) : getAngle(cx, cy, p0.x, p0.y);

            //let startAngle = getAngle(cx, cy, p0.x, p0.y) ;
            //let endAngle = getAngle(cx, cy, p.x, p.y);


            // Normalize angles to [0, 2π) by adding 2π if negative
            startAngle = startAngle < 0 ? startAngle + Math.PI * 2 : startAngle;
            endAngle = endAngle < 0 ? endAngle + Math.PI * 2 : endAngle;

            if (startAngle > endAngle) {
                //endAngle += Math.PI * 2
                //console.log('adj pos', startAngle*180/Math.PI, endAngle*180/Math.PI);
            }


            console.log('angles', sweep, startAngle, endAngle);
            // Adjust delta angle based on drawing direction
            /*
            if (!sweep && endAngle > startAngle) {
                //console.log('adj neg');
                endAngle -= Math.PI * 2
            }

            if (sweep && startAngle > endAngle) {
                //console.log('adj pos');
                endAngle = endAngle <= 0 ? endAngle + Math.PI * 2 : endAngle
            }
            */

            if (!sweep && endAngle > startAngle) {
                //console.log('adj neg');
                //startAngle -= Math.PI * 2
            }

            if (sweep && startAngle > endAngle) {
                //console.log('adj pos');
                //endAngle = endAngle <= 0 ? endAngle + Math.PI * 2 : endAngle
            }




            // Calculate delta angle
            let deltaAngle = endAngle - startAngle;
            deltaAngle = sweep ? deltaAngle : Math.PI*2 - deltaAngle;

            let deltaAngle_deg = +(deltaAngle * 180 / Math.PI).toFixed(3)

            //console.log('deltaAngle_deg', deltaAngle_deg);

            // new large Arc
            largeArc = Math.abs(deltaAngle) >= Math.PI ? 1 : 0

            // Area-based sweep determination (positive = CW, negative = CCW)
            let areaCenter = mtrXYZ.getPolygonArea([p0, { x: cx, y: cy }, p]);
            //sweep = areaCenter >= 0 ? 1 : 0;
            //sweep = deltaAngle > 0 ? 1 : 0;

            return {
                deltaAngle: deltaAngle,
                largeArc: largeArc,
                sweep: sweep,
            };
        }



        // transform starting point
        p0 = mtrXYZ.transformPoint(p0, matrix, perspectiveOrigin, perspective);
        p = mtrXYZ.transformPoint(p, matrix, perspectiveOrigin, perspective);


        // transform centroid
        let cnt = mtrXYZ.transformPoint({ x: cx, y: cy }, matrix, perspectiveOrigin, perspective)



        // get arc hull
        let hull = mtrXYZ.getEllipeHull(cx, cy, rx, ry, -xAxisRotationRad)

        // transform hull
        let hullTrans = mtrXYZ.transformPoints(hull, matrix, perspectiveOrigin, perspective)

        //console.log('hullTrans', hullTrans);

        // get hullMatrix
        let hullMatrix = mtrXYZ.getConvexHullMatrix(hullTrans)

        // get new arc angles and ellipse center
        let arcPropsTrans = mtrXYZ.getEllipseProperties(hullMatrix)
        //console.log('arcPropsTrans', arcPropsTrans);


        // get reference point on ellipe
        let xAxisRotation_rad =xAxisRotation*Math.PI/180

        //let angleRef = arcPropsTrans.angle*Math.PI/180
        //let ptR = mtrXYZ.getPointOnEllipse(arcPropsTrans.cx, arcPropsTrans.cy, arcPropsTrans.ry, arcPropsTrans.ry, angleRef+Math.PI*0.1, xAxisRotation_rad)

        let ptR = mtrXYZ.getPointOnEllipse(cx, cy, rx, ry, (startAngle + deltaAngle*0.5), xAxisRotation_rad)


        // transform reference point
        ptR = mtrXYZ.transformPoint(ptR, matrix, perspectiveOrigin, perspective);
        mtrXYZ.renderPoint(markers, ptR, 'orange')





        /**
        * adjust sweep if flipped
        * compare sign changed between original area and transformed
        */
        //let areaTrans = mtrXYZ.getPolygonArea([p0, cnt, p])
        //let areaTrans = mtrXYZ.getPolygonArea([p0, { x: arcPropsTrans.cx, y: arcPropsTrans.cy }, p])

        //get area from hull polygon
        let areaTrans = mtrXYZ.getPolygonArea(hullTrans)
        let signChange = area >= 0 && areaTrans <= 0 || area <= 0 && areaTrans >= 0
        let sweep2 =  areaTrans>=0 ? 1 : 0

        console.log('sweep2', sweep, sweep2, area, areaTrans);

        //if(newDelta.sweep)


        let newDelta = getDeltaAndSweep(p0, arcPropsTrans.cx, arcPropsTrans.cy, p, sweep2, largeArc);
        // newDelta = getDeltaAndSweep(p0, cnt.x, cnt.y, p);
        //let newDelta = getDeltaAndSweep(p0, cx, cy, p);
        console.log('newDelta', newDelta, 'areaTrans', area, areaTrans);


        //sweep = newDelta.sweep;
        if (newDelta.largeArc !== largeArc) {
            console.log('largeArc change', newDelta.largeArc, largeArc);
            //largeArc = largeArc === 0 ? 1 : 0;
        }
        //largeArc = newDelta.largeArc===1 && largeArc===0 ? 1 : 0;


        largeArc = newDelta.largeArc
        //sweep = newDelta.sweep
        sweep = sweep2
        //sweep = sweep ===0 ? 1 : 0



        /*
        */
        // adjust sweep
        //newDelta.sweep!==sweep || 
        if (signChange) {
            //console.log('sweep change', newDelta.sweep, sweep, signChange);
            //sweep = sweep === 0 ? 1 : 0;
        }

        return {
            type: 'A',
            values: [
                arcPropsTrans.rx,
                arcPropsTrans.ry,
                arcPropsTrans.angle,
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