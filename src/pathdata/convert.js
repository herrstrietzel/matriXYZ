import { detectAccuracy, roundPathData } from './rounding.js';
//import { svgArcToCenterParam  } from './geometry.js';


//import { pathDataCubicToArc, reorderPathData } from './convert_segments.js';
//import { splitSubpaths } from './split_pathdata.js';
//import { getPathDataVertices, getPointOnEllipse, getPolyBBox, pointAtT, checkLineIntersection, getDistance, interpolate } from './geometry.js';
//import { cleanUpPathData, optimizeStartingPoints } from './cleanup.js';

//import { getPathDataChunks } from './simplify.js';
//import { renderPoint } from './visualize.js';
//import { renderPerpendicularLine  } from './visualize.js';

/**
 * converts all commands to absolute
 * optional: convert shorthands; arcs to cubics 
 */



export function convertPathData(pathData,
    {
        normalize = null,
        optimize = 1,
        toAbsolute = true,
        toRelative = false,
        quadraticToCubic = false,
        lineToCubic = false,
        toLonghands = true,
        toShorthands = false,
        arcToCubic = false,
        arcParam = false,
        arcAccuracy = 1,

        optimizeOrder = false,
        reorderSub = false,
        simplify = false,


        cubicToQuadratic = false,
        cubicToQuadraticPrecision = 0.1,
        decimals = -1,

        cubicToArcs = false

    } = {}

) {


    if (normalize === true) {
        toAbsolute = true
        toLonghands = true
        arcToCubic = true
        quadraticToCubic = true
        toShorthands = false
    }

    /*
    if (optimize === true) {
        toRelative = true
        toShorthands = true
        decimals = 3
    }
    */

    // clone array
    pathData = JSON.parse(JSON.stringify(pathData))



    // convert to absolute
    //if (toAbsolute) pathData = pathDataToAbsolute(pathData)
    if (toAbsolute) pathData = pathDataToAbsoluteOrRelative(pathData)



    // convert to longhands
    if (toLonghands) pathData = pathDataToLonghands(pathData, -1, false)


    // arc to cubic
    if (arcToCubic) pathData = pathDataArcsToCubics(pathData)


    // to shorthands
    if (toShorthands) pathData = pathDataToShorthands(pathData)


    // to Relative
    if (toRelative) pathData = pathDataToAbsoluteOrRelative(pathData, true)


    // add arcInfo to command object
    let addArcInfo = true;
    if (addArcInfo) pathData = pathDataAddArcInfo(pathData)


    // post round
    if (decimals !== -1) {
        //console.log('post-round');
        pathData = roundPathData(pathData, decimals)
    }

    return pathData;
}



/**
 * add arc command info:
 * adds parametrized arc data to 
 * the command object for reusable
 * ellipse centroid and xAxisRotaion calculations
 * rx and ry don't necissarily describe the actual radii!
 */

export function pathDataAddArcInfo(pathData){

    for(let i=0, len=pathData.length; len && i<len; i++){
        let com = pathData[i];

        if(com.type==='A'){

            let comPrev = pathData[i-1];
            //let valuesLast = com.values.slice(-2)
            let valuesPrevLast = comPrev.values.slice(-2)
            let p0 = {x:valuesPrevLast[0], y:valuesPrevLast[1]}
            //let p = {x:valuesLast[0], y:valuesLast[1]}
            let [rx, ry, xAxisRotation, largeArc, sweep, x2, y2 ] = com.values;
            let arcData = mtrXYZ.svgArcToCenterParam(p0.x, p0.y, rx, ry, xAxisRotation, largeArc, sweep, x2, y2)
            com.rx= arcData.rx
            com.ry= arcData.ry
            com.cx= arcData.cx
            com.cy= arcData.cy
            com.xAxisRotation= xAxisRotation
            com.largeArc= largeArc
            com.startAngle= arcData.startAngle
            com.endAngle= arcData.endAngle
            com.deltaAngle= arcData.deltaAngle
            //console.log('arcdata', arcData)
        }
    }

    //console.log(pathData);
    return pathData
}


/**
 * convert cubic circle approximations
 * to more compact arcs
 */

export function pathDataArcsToCubics(pathData, {
    arcAccuracy = 1
} = {}) {

    let pathDataCubic = [pathData[0]];
    for (let i = 1, len = pathData.length; i < len; i++) {

        let com = pathData[i];
        let comPrev = pathData[i - 1];
        let valuesPrev = comPrev.values;
        let valuesPrevL = valuesPrev.length;
        let p0 = { x: valuesPrev[valuesPrevL - 2], y: valuesPrev[valuesPrevL - 1] };

        //convert arcs to cubics
        if (com.type === 'A') {
            // add all C commands instead of Arc
            let cubicArcs = arcToBezier(p0, com.values, arcAccuracy);
            cubicArcs.forEach((cubicArc) => {
                pathDataCubic.push(cubicArc);
            });
        }

        else {
            // add command
            pathDataCubic.push(com)
        }
    }

    return pathDataCubic

}


export function pathDataQuadraticToCubic(pathData) {

    let pathDataQuadratic = [pathData[0]];
    for (let i = 1, len = pathData.length; i < len; i++) {

        let com = pathData[i];
        let comPrev = pathData[i - 1];
        let valuesPrev = comPrev.values;
        let valuesPrevL = valuesPrev.length;
        let p0 = { x: valuesPrev[valuesPrevL - 2], y: valuesPrev[valuesPrevL - 1] };

        //convert quadratic to cubics
        if (com.type === 'Q') {
            pathDataQuadratic.push(quadratic2Cubic(p0, com.values))
        }

        else {
            // add command
            pathDataQuadratic.push(com)
        }
    }

    return pathDataQuadratic
}


/**
 * convert quadratic commands to cubic
 */
export function quadratic2Cubic(p0, com) {
    if (Array.isArray(p0)) {
        p0 = {
            x: p0[0],
            y: p0[1]
        }
    }
    let cp1 = {
        x: p0.x + 2 / 3 * (com[0] - p0.x),
        y: p0.y + 2 / 3 * (com[1] - p0.y)
    }
    let cp2 = {
        x: com[2] + 2 / 3 * (com[0] - com[2]),
        y: com[3] + 2 / 3 * (com[1] - com[3])
    }
    return ({ type: "C", values: [cp1.x, cp1.y, cp2.x, cp2.y, com[2], com[3]] });
}



/**
 * decompose/convert shorthands to "longhand" commands:
 * H, V, S, T => L, L, C, Q
 * reversed method: pathDataToShorthands()
 */

export function pathDataToLonghands(pathData, decimals = -1, test = true) {

    // analyze pathdata – if you're sure your data is already absolute skip it via test=false
    let hasRel;

    if (test) {
        let commandTokens = pathData.map(com => { return com.type }).join('')
        let hasShorthands = /[hstv]/gi.test(commandTokens);
        hasRel = /[astvqmhlc]/g.test(commandTokens);

        if (!hasShorthands) {
            return pathData;
        }
    }

    pathData = test && hasRel ? pathDataToAbsoluteOrRelative(pathData, false, decimals) : pathData;

    let pathDataLonghand = [];
    let comPrev = {
        type: "M",
        values: pathData[0].values
    };
    pathDataLonghand.push(comPrev);

    for (let i = 1, len = pathData.length; i < len; i++) {
        let com = pathData[i];
        let { type, values } = com;
        let valuesL = values.length;
        let valuesPrev = comPrev.values;
        let valuesPrevL = valuesPrev.length;
        let [x, y] = [values[valuesL - 2], values[valuesL - 1]];
        let cp1X, cp1Y, cpN1X, cpN1Y, cpN2X, cpN2Y, cp2X, cp2Y;
        let [prevX, prevY] = [
            valuesPrev[valuesPrevL - 2],
            valuesPrev[valuesPrevL - 1]
        ];
        switch (type) {
            case "H":
                comPrev = {
                    type: "L",
                    values: [values[0], prevY]
                };
                break;
            case "V":
                comPrev = {
                    type: "L",
                    values: [prevX, values[0]]
                };
                break;
            case "T":
                [cp1X, cp1Y] = [valuesPrev[0], valuesPrev[1]];
                [prevX, prevY] = [
                    valuesPrev[valuesPrevL - 2],
                    valuesPrev[valuesPrevL - 1]
                ];
                // new control point
                cpN1X = prevX + (prevX - cp1X);
                cpN1Y = prevY + (prevY - cp1Y);
                comPrev = {
                    type: "Q",
                    values: [cpN1X, cpN1Y, x, y]
                };
                break;
            case "S":
                [cp1X, cp1Y] = [valuesPrev[0], valuesPrev[1]];
                [cp2X, cp2Y] =
                    valuesPrevL > 2 ?
                        [valuesPrev[2], valuesPrev[3]] :
                        [valuesPrev[0], valuesPrev[1]];
                [prevX, prevY] = [
                    valuesPrev[valuesPrevL - 2],
                    valuesPrev[valuesPrevL - 1]
                ];
                // new control points
                cpN1X = 2 * prevX - cp2X;
                cpN1Y = 2 * prevY - cp2Y;
                cpN2X = values[0];
                cpN2Y = values[1];
                comPrev = {
                    type: "C",
                    values: [cpN1X, cpN1Y, cpN2X, cpN2Y, x, y]
                };

                break;
            default:
                comPrev = {
                    type: type,
                    values: values
                };
        }
        // round final longhand values
        if (decimals > -1) {
            comPrev.values = comPrev.values.map(val => { return +val.toFixed(decimals) })
        }

        pathDataLonghand.push(comPrev);
    }
    return pathDataLonghand;
}

/**
 * apply shorthand commands if possible
 * L, L, C, Q => H, V, S, T
 * reversed method: pathDataToLonghands()
 */
export function pathDataToShorthands(pathData, decimals = -1, test = true) {

    /** 
    * analyze pathdata – if you're sure your data is already absolute skip it via test=false
    */
    let hasRel
    if (test) {
        let commandTokens = pathData.map(com => { return com.type }).join('')
        hasRel = /[astvqmhlc]/g.test(commandTokens);
    }

    pathData = test && hasRel ? pathDataToAbsoluteOrRelative(pathData, false, decimals) : pathData;

    let comShort = {
        type: "M",
        values: pathData[0].values
    };

    if (pathData[0].decimals) {
        //console.log('has dec');
        comShort.decimals = pathData[0].decimals
    }

    let pathDataShorts = [comShort];

    let p0 = { x: pathData[0].values[0], y: pathData[0].values[1] };
    let p;
    let tolerance = 0.01

    for (let i = 1, len = pathData.length; i < len; i++) {

        let com = pathData[i];
        let { type, values } = com;
        let valuesLast = values.slice(-2);

        // previoius command
        let comPrev = pathData[i - 1];
        let typePrev = comPrev.type

        //last on-path point
        p = { x: valuesLast[0], y: valuesLast[1] };

        // first bezier control point for S/T shorthand tests
        let cp1 = { x: values[0], y: values[1] };


        //calculate threshold based on command dimensions
        let w = Math.abs(p.x - p0.x)
        let h = Math.abs(p.y - p0.y)
        let thresh = (w + h) / 2 * tolerance

        let diffX, diffY, diff, cp1_reflected;


        switch (type) {
            case "L":

                if (h === 0 || (h < thresh && w > thresh)) {
                    //console.log('is H');
                    comShort = {
                        type: "H",
                        values: [values[0]]
                    };
                }

                // V
                else if (w === 0 || (h > thresh && w < thresh)) {
                    //console.log('is V', w, h);
                    comShort = {
                        type: "V",
                        values: [values[1]]
                    };
                } else {
                    //console.log('not', type, h, w, thresh, com);
                    comShort = com;
                }

                break;

            case "Q":

                // skip test
                if (typePrev !== 'Q') {
                    //console.log('skip T:', type, typePrev);
                    p0 = { x: valuesLast[0], y: valuesLast[1] };
                    pathDataShorts.push(com);
                    continue;
                }

                let cp1_prev = { x: comPrev.values[0], y: comPrev.values[1] };
                // reflected Q control points
                cp1_reflected = { x: (2 * p0.x - cp1_prev.x), y: (2 * p0.y - cp1_prev.y) };

                //let thresh = (diffX+diffY)/2
                diffX = Math.abs(cp1.x - cp1_reflected.x)
                diffY = Math.abs(cp1.y - cp1_reflected.y)
                diff = (diffX + diffY) / 2

                if (diff < thresh) {
                    //console.log('is T', diff, thresh);
                    comShort = {
                        type: "T",
                        values: [p.x, p.y]
                    };
                } else {
                    comShort = com;
                }

                break;
            case "C":

                let cp2 = { x: values[2], y: values[3] };

                if (typePrev !== 'C') {
                    //console.log('skip S', typePrev);
                    pathDataShorts.push(com);
                    p0 = { x: valuesLast[0], y: valuesLast[1] };
                    continue;
                }

                let cp2_prev = { x: comPrev.values[2], y: comPrev.values[3] };

                // reflected C control points
                cp1_reflected = { x: (2 * p0.x - cp2_prev.x), y: (2 * p0.y - cp2_prev.y) };

                //let thresh = (diffX+diffY)/2
                diffX = Math.abs(cp1.x - cp1_reflected.x)
                diffY = Math.abs(cp1.y - cp1_reflected.y)
                diff = (diffX + diffY) / 2


                if (diff < thresh) {
                    //console.log('is S');
                    comShort = {
                        type: "S",
                        values: [cp2.x, cp2.y, p.x, p.y]
                    };
                } else {
                    comShort = com;
                }
                break;
            default:
                comShort = {
                    type: type,
                    values: values
                };
        }


        // add decimal info
        if (com.decimals || com.decimals === 0) {
            comShort.decimals = com.decimals
        }


        // round final values
        if (decimals > -1) {
            comShort.values = comShort.values.map(val => { return +val.toFixed(decimals) })
        }

        p0 = { x: valuesLast[0], y: valuesLast[1] };
        pathDataShorts.push(comShort);
    }
    return pathDataShorts;
}



/**
 * based on puzrin's 
 * fontello/cubic2quad
 * https://github.com/fontello/cubic2quad/blob/master/test/cubic2quad.js
 */

export function pathDataToQuadratic(pathData, precision = 0.1) {
    pathData = pathDataToLonghands(pathData)
    let newPathData = [pathData[0]];
    for (let i = 1, len = pathData.length; i < len; i++) {
        let comPrev = pathData[i - 1];
        let com = pathData[i];
        let [type, values] = [com.type, com.values];
        let [typePrev, valuesPrev] = [comPrev.type, comPrev.values];
        let valuesPrevL = valuesPrev.length;
        let [xPrev, yPrev] = [
            valuesPrev[valuesPrevL - 2],
            valuesPrev[valuesPrevL - 1]
        ];

        // convert C to Q
        if (type == "C") {

            let quadCommands = cubicToQuad(
                xPrev,
                yPrev,
                values[0],
                values[1],
                values[2],
                values[3],
                values[4],
                values[5],
                precision
            );

            quadCommands.forEach(comQ => {
                newPathData.push(comQ)
            })


        } else {
            newPathData.push(com);
        }
    }
    return newPathData;
}

function cubicToQuad(x0, y0, cp1x, cp1y, cp2x, cp2y, px, py, precision) {

    const quadSolve = (x0, y0, cp1x) => {
        if (0 === x0)
            return 0 === y0 ? [] : [-cp1x / y0];
        let o = y0 * y0 - 4 * x0 * cp1x;
        if (Math.abs(o) < 1e-16)
            return [-y0 / (2 * x0)];
        if (o < 0)
            return [];
        let r = Math.sqrt(o);
        return [
            (-y0 - r) / (2 * x0),
            (-y0 + r) / (2 * x0)
        ];
    }

    const solveInflections = (x0, y0, cp1x, cp1y, cp2x, cp2y, px, py) => {
        return quadSolve(
            -px * (y0 - 2 * cp1y + cp2y) +
            cp2x * (2 * y0 - 3 * cp1y + py) +
            x0 * (cp1y - 2 * cp2y + py) -
            cp1x * (y0 - 3 * cp2y + 2 * py),
            px * (y0 - cp1y) +
            3 * cp2x * (-y0 + cp1y) +
            cp1x * (2 * y0 - 3 * cp2y + py) -
            x0 * (2 * cp1y - 3 * cp2y + py),
            cp2x * (y0 - cp1y) + x0 * (cp1y - cp2y) + cp1x * (-y0 + cp2y)
        )
            .filter(function (x0) {
                return x0 > 1e-8 && x0 < 1 - 1e-8;
            })
            .sort((x0, y0) => { return x0 - y0 })

    }

    const subdivideCubic = (x0, y0, cp1x, cp1y, cp2x, cp2y, px, py, precision) => {
        let s = 1 - precision, f = x0 * s + cp1x * precision, l = cp1x * s + cp2x * precision, d = cp2x * s + px * precision, h = f * s + l * precision, p = l * s + d * precision, y = h * s + p * precision, P = y0 * s + cp1y * precision, m = cp1y * s + cp2y * precision, x = cp2y * s + py * precision, b = P * s + m * precision, v = m * s + x * precision, w = b * s + v * precision;
        return [
            [x0, y0, f, P, h, b, y, w],
            [y, w, p, v, d, x, px, py]
        ];
    }

    let s = solveInflections(x0, y0, cp1x, cp1y, cp2x, cp2y, px, py);
    let pts
    if (!s.length) {
        //return _cubicToQuad(x0, y0, cp1x, cp1y, cp2x, cp2y, px, py, precision);

        pts = _cubicToQuad(x0, y0, cp1x, cp1y, cp2x, cp2y, px, py, precision);
    } else {

        for (
            var f,
            l,
            d = [],
            h = [x0, y0, cp1x, cp1y, cp2x, cp2y, px, py],
            p = 0, y = 0;
            y < s.length;
            y++
        ) {
            // subdivide the cubic bezier curve
            l = subdivideCubic(h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1 - (1 - s[y]) / (1 - p)
            );

            // compute the quadratic Bezier curve using the divided cubic segment
            f = _cubicToQuad(l[0][0], l[0][1], l[0][2], l[0][3], l[0][4], l[0][5], l[0][6], l[0][7], precision
            );

            d = d.concat(f.slice(0, -2));
            h = l[1];
            p = s[y];
        }

        // compute the quadratic Bezier curve using the cubic control points
        f = _cubicToQuad(h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], precision);
        pts = d.concat(f);
    }

    //  return pathdata commands
    let commands = [];
    for (let j = 2; j < pts.length; j += 4) {
        commands.push({
            type: "Q",
            values: [pts[j], pts[j + 1], pts[j + 2], pts[j + 3]]
        });
    }

    return commands;


    function _cubicToQuad(x0, y0, cp1x, cp1y, cp2x, cp2y, px, py, c = 0.1) {

        const calcPowerCoefficients = (p0, cp1, cp2, p) => {
            return [
                {
                    x: (p.x - p0.x) + (cp1.x - cp2.x) * 3,
                    y: (p.y - p0.y) + (cp1.y - cp2.y) * 3
                },
                {
                    x: (p0.x + cp2.x) * 3 - cp1.x * 6,
                    y: (p0.y + cp2.y) * 3 - cp1.y * 6
                },
                {
                    x: (cp1.x - p0.x) * 3,
                    y: (cp1.y - p0.y) * 3
                },
                p0
            ];
        }

        const isApproximationClose = (p0, cp1, cp2, p, pointArr, precision) => {

            for (let u = 1 / pointArr.length, a = 0; a < pointArr.length; a++) {
                if (!isSegmentApproximationClose(p0, cp1, cp2, p, a * u, (a + 1) * u, pointArr[a][0], pointArr[a][1], pointArr[a][2], precision)) {
                    return false;
                }
            }
            return true;
        }

        const calcPoint = (p0, cp1, cp2, p, t) => {
            return {
                x: ((p0.x * t + cp1.x) * t + cp2.x) * t + p.x,
                y: ((p0.y * t + cp1.y) * t + cp2.y) * t + p.y,
            };
        }

        const calcPointQuad = (p0, cp1, p, t) => {
            return {
                x: ((p0.x * t + cp1.x) * t) + p.x,
                y: ((p0.y * t + cp1.y) * t) + p.y,
            }
        }

        const calcPointDerivative = (p0, cp1, p, k, t) => {
            return {
                x: ((p0.x * 3 * t + cp1.x * 2) * t) + p.x,
                y: ((p0.y * 3 * t + cp1.y * 2) * t) + p.y,
            }
        }

        const processSegment = (p0, cp1, cp2, p, t1, t2) => {

            var u = calcPoint(p0, cp1, cp2, p, t1),
                a = calcPoint(p0, cp1, cp2, p, t2),
                c = calcPointDerivative(p0, cp1, cp2, p, t1),
                s = calcPointDerivative(p0, cp1, cp2, p, t2),
                f = -c.x * s.y + s.x * c.y;

            return Math.abs(f) < 1e-8 ? [
                u,
                {
                    x: (u.x + a.x) / 2,
                    y: (u.y + a.y) / 2
                },
                a
            ]
                : [
                    u,
                    {
                        x: (c.x * (a.y * s.x - a.x * s.y) + s.x * (u.x * c.y - u.y * c.x)) / f,
                        y: (c.y * (a.y * s.x - a.x * s.y) + s.y * (u.x * c.y - u.y * c.x)) / f
                    },
                    a
                ];
        }

        const isSegmentApproximationClose = (p0, cp1, cp2, p, t1, t2, px, py, c, precision) => {

            const calcPowerCoefficientsQuad = (p0, cp1, p) => {
                return [
                    { x: cp1.x * -2 + p0.x + p.x, y: cp1.y * -2 + p0.y + p.y },
                    { x: (cp1.x - p0.x) * 2, y: (cp1.y - p0.y) * 2, }, p0
                ]
            }

            const minDistanceToLineSq = (p0, cp1, p) => {
                let o = { x: (p.x - cp1.x), y: (p.y - cp1.y), }
                let r = (p0.x - cp1.x) * o.x + (p0.y - cp1.y) * o.y;
                let e = o.x * o.x + o.y * o.y;
                let result = 0;

                if (e != 0) {
                    result = r / e
                }
                if (result <= 0) {
                    result = Math.pow((p0.x - cp1.x), 2) + Math.pow((p0.y - cp1.y), 2);
                } else if (result >= 1) {
                    result = Math.pow((p0.x - p.x), 2) + Math.pow((p0.y - p.y), 2)
                } else {
                    result = Math.pow((p0.x - (cp1.x + o.x * result)), 2) + Math.pow((p0.y - (cp1.y + o.y * result)), 2);
                }

                return result
            }

            let l, d, h, p2, y,
                P = calcPowerCoefficientsQuad(px, py, c),
                m = P[0],
                x = P[1],
                b = P[2],
                v = precision * precision,
                w = [],
                g = [];

            for (l = (t2 - t1) / 10, d = 0, t = t1; d <= 10; d++, t += l) {
                w.push(calcPoint(p0, cp1, cp2, p, t))
            }
            for (l = 0.1, d = 0, t = 0; d <= 10; d++, t += l) {
                g.push(calcPointQuad(m, x, b, t))
            }
            for (d = 1; d < w.length - 1; d++) {
                for (y = 1 / 0, h = 0; h < g.length - 1; h++) {
                    p2 = minDistanceToLineSq(w[d], g[h], g[h + 1]), y = Math.min(y, p2)
                }
                if (y > v) {
                    return false;
                }
            }
            for (d = 1; d < g.length - 1; d++) {
                for (y = 1 / 0, h = 0; h < w.length - 1; h++)
                    p2 = minDistanceToLineSq(g[d], w[h], w[h + 1]), y = Math.min(y, p2);
                if (y > v)
                    return false;
            }
            return true;
        }

        for (
            f = { x: x0, y: y0 },
            l = { x: cp1x, y: cp1y },
            d = { x: cp2x, y: cp2y },
            h = { x: px, y: py },
            p = calcPowerCoefficients(f, l, d, h),
            y = p[0],
            P = p[1],
            m = p[2], x = p[3],
            b = 1; b <= 8; b++) {
            s = [];
            for (let v = 0; v < 1; v += 1 / b) {
                s.push(processSegment(y, P, m, x, v, v + 1 / b));
            }

            let b1 = ((s[0][1].x - f.x) * (l.x - f.x)) + ((s[0][1].y - f.y) * (l.y - f.y))
            let b2 = ((s[0][1].x - h.x) * (d.x - h.x)) + ((s[0][1].y - h.y) * (d.y - h.y))

            if (
                (1 !== b || !(b1 < 0 || b2 < 0)) &&
                isApproximationClose(y, P, m, x, s, c)
            ) {
                break;
            }

        }

        //return pts;
        let pts = [s[0][0].x, s[0][0].y];
        for (let i = 0; i < s.length; i++) {
            pts.push(s[i][1].x, s[i][1].y, s[i][2].x, s[i][2].y)
        }

        return pts

    }
}


/** 
 * convert arctocommands to cubic bezier
 * based on puzrin's a2c.js
 * https://github.com/fontello/svgpath/blob/master/lib/a2c.js
 * returns pathData array
*/

export function arcToBezier(p0, values, splitSegments = 1) {
    const TAU = Math.PI * 2;
    let [rx, ry, rotation, largeArcFlag, sweepFlag, x, y] = values;

    if (rx === 0 || ry === 0) {
        return []
    }

    let phi = rotation ? rotation * TAU / 360 : 0;
    let sinphi = phi ? Math.sin(phi) : 0
    let cosphi = phi ? Math.cos(phi) : 1
    let pxp = cosphi * (p0.x - x) / 2 + sinphi * (p0.y - y) / 2
    let pyp = -sinphi * (p0.x - x) / 2 + cosphi * (p0.y - y) / 2

    if (pxp === 0 && pyp === 0) {
        return []
    }
    rx = Math.abs(rx)
    ry = Math.abs(ry)
    let lambda =
        pxp * pxp / (rx * rx) +
        pyp * pyp / (ry * ry)
    if (lambda > 1) {
        let lambdaRt = Math.sqrt(lambda);
        rx *= lambdaRt
        ry *= lambdaRt
    }

    /** 
     * parametrize arc to 
     * get center point start and end angles
     */
    let rxsq = rx * rx,
        rysq = rx === ry ? rxsq : ry * ry

    let pxpsq = pxp * pxp,
        pypsq = pyp * pyp
    let radicant = (rxsq * rysq) - (rxsq * pypsq) - (rysq * pxpsq)

    if (radicant <= 0) {
        radicant = 0
    } else {
        radicant /= (rxsq * pypsq) + (rysq * pxpsq)
        radicant = Math.sqrt(radicant) * (largeArcFlag === sweepFlag ? -1 : 1)
    }

    let centerxp = radicant ? radicant * rx / ry * pyp : 0
    let centeryp = radicant ? radicant * -ry / rx * pxp : 0
    let centerx = cosphi * centerxp - sinphi * centeryp + (p0.x + x) / 2
    let centery = sinphi * centerxp + cosphi * centeryp + (p0.y + y) / 2

    let vx1 = (pxp - centerxp) / rx
    let vy1 = (pyp - centeryp) / ry
    let vx2 = (-pxp - centerxp) / rx
    let vy2 = (-pyp - centeryp) / ry

    // get start and end angle
    const vectorAngle = (ux, uy, vx, vy) => {
        let dot = +(ux * vx + uy * vy).toFixed(9)
        if (dot === 1 || dot === -1) {
            return dot === 1 ? 0 : Math.PI
        }
        dot = dot > 1 ? 1 : (dot < -1 ? -1 : dot)
        let sign = (ux * vy - uy * vx < 0) ? -1 : 1
        return sign * Math.acos(dot);
    }

    let ang1 = vectorAngle(1, 0, vx1, vy1),
        ang2 = vectorAngle(vx1, vy1, vx2, vy2)

    if (sweepFlag === 0 && ang2 > 0) {
        ang2 -= Math.PI * 2
    }
    else if (sweepFlag === 1 && ang2 < 0) {
        ang2 += Math.PI * 2
    }


    //ratio must be at least 1
    let ratio = +(Math.abs(ang2) / (TAU / 4)).toFixed(0) || 1


    // increase segments for more accureate length calculations
    let segments = ratio * splitSegments;
    ang2 /= segments
    let pathDataArc = [];


    // If 90 degree circular arc, use a constant
    // https://pomax.github.io/bezierinfo/#circles_cubic
    // k=0.551784777779014
    const angle90 = 1.5707963267948966;
    const k = 0.551785
    let a = ang2 === angle90 ? k :
        (
            ang2 === -angle90 ? -k : 4 / 3 * Math.tan(ang2 / 4)
        );

    let cos2 = ang2 ? Math.cos(ang2) : 1;
    let sin2 = ang2 ? Math.sin(ang2) : 0;
    let type = 'C'

    const approxUnitArc = (ang1, ang2, a, cos2, sin2) => {
        let x1 = ang1 != ang2 ? Math.cos(ang1) : cos2;
        let y1 = ang1 != ang2 ? Math.sin(ang1) : sin2;
        let x2 = Math.cos(ang1 + ang2);
        let y2 = Math.sin(ang1 + ang2);

        return [
            { x: x1 - y1 * a, y: y1 + x1 * a },
            { x: x2 + y2 * a, y: y2 - x2 * a },
            { x: x2, y: y2 }
        ];
    }

    for (let i = 0; i < segments; i++) {
        let com = { type: type, values: [] }
        let curve = approxUnitArc(ang1, ang2, a, cos2, sin2);

        curve.forEach((pt) => {
            let x = pt.x * rx
            let y = pt.y * ry
            com.values.push(cosphi * x - sinphi * y + centerx, sinphi * x + cosphi * y + centery)
        })
        pathDataArc.push(com);
        ang1 += ang2
    }

    return pathDataArc;
}



/**
* convert pathData nested array notation
* as used in snap and other libraries
*/
export function convertArrayPathData(pathDataArray) {
    let pathData = [];
    pathDataArray.forEach(com => {
        let type = com.shift();
        pathData.push({
            type: type,
            values: com
        })
    })
    return pathData;
}

/**
 * helper to convert pathData
 * to nested array structure
 */
export function revertPathDataToArray(pathData) {
    let pathDataArray = [];
    pathData.forEach(com => {
        pathDataArray.push([com.type, com.values].flat())
    })
    return pathDataArray;
}



export function pathDataToAbsoluteOrRelative(pathData, toRelative = false, decimals = -1) {
    if (decimals >= 0) {
        pathData[0].values = pathData[0].values.map(val => +val.toFixed(decimals));
    }

    let M = pathData[0].values;
    let x = M[0],
        y = M[1],
        mx = x,
        my = y;

    for (let i = 1, len = pathData.length; i < len; i++) {
        let com = pathData[i];
        let { type, values } = com;
        let newType = toRelative ? type.toLowerCase() : type.toUpperCase();

        if (type !== newType) {
            type = newType;
            com.type = type;

            switch (type) {
                case "a":
                case "A":
                    values[5] = toRelative ? values[5] - x : values[5] + x;
                    values[6] = toRelative ? values[6] - y : values[6] + y;
                    break;
                case "v":
                case "V":
                    values[0] = toRelative ? values[0] - y : values[0] + y;
                    break;
                case "h":
                case "H":
                    values[0] = toRelative ? values[0] - x : values[0] + x;
                    break;
                case "m":
                case "M":
                    if (toRelative) {
                        values[0] -= x;
                        values[1] -= y;
                    } else {
                        values[0] += x;
                        values[1] += y;
                    }
                    mx = toRelative ? values[0] + x : values[0];
                    my = toRelative ? values[1] + y : values[1];
                    break;
                default:
                    if (values.length) {
                        for (let v = 0; v < values.length; v++) {
                            values[v] = toRelative
                                ? values[v] - (v % 2 ? y : x)
                                : values[v] + (v % 2 ? y : x);
                        }
                    }
            }
        }

        let vLen = values.length;
        switch (type) {
            case "z":
            case "Z":
                x = mx;
                y = my;
                break;
            case "h":
            case "H":
                x = toRelative ? x + values[0] : values[0];
                break;
            case "v":
            case "V":
                y = toRelative ? y + values[0] : values[0];
                break;
            case "m":
            case "M":
                mx = values[vLen - 2] + (toRelative ? x : 0);
                my = values[vLen - 1] + (toRelative ? y : 0);
            default:
                x = values[vLen - 2] + (toRelative ? x : 0);
                y = values[vLen - 1] + (toRelative ? y : 0);
        }

        if (decimals >= 0) {
            com.values = com.values.map(val => +val.toFixed(decimals));
        }
    }
    return pathData;
}
