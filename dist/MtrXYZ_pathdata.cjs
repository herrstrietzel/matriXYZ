'use strict';

//import { arcToBezier, quadratic2Cubic } from './convert.js';
//import { svgArcToCenterParam  } from './geometry.js';



function parse(path, debug = true) {


    debug = 'log';

    const paramCounts = {
        // Move (absolute & relative)
        0x4D: 2,  // 'M'
        0x6D: 2,  // 'm'

        // Arc
        0x41: 7,  // 'A'
        0x61: 7,  // 'a'

        // Cubic Bézier
        0x43: 6,  // 'C'
        0x63: 6,  // 'c'

        // Horizontal Line
        0x48: 1,  // 'H'
        0x68: 1,  // 'h'

        // Line To
        0x4C: 2,  // 'L'
        0x6C: 2,  // 'l'

        // Quadratic Bézier
        0x51: 4,  // 'Q'
        0x71: 4,  // 'q'

        // Smooth Cubic Bézier
        0x53: 4,  // 'S'
        0x73: 4,  // 's'

        // Smooth Quadratic Bézier
        0x54: 2,  // 'T'
        0x74: 2,  // 't'

        // Vertical Line
        0x56: 1,  // 'V'
        0x76: 1,  // 'v'

        // Close Path
        0x5A: 0,  // 'Z'
        0x7A: 0   // 'z'
    };



    const commandSet = new Set([

        //M
        0x4D,
        0x6D,

        // Arc
        0x41,
        0x61,

        // Cubic Bézier
        0x43,
        0x63,

        // Horizontal Line
        0x48,
        0x68,

        // Line To
        0x4C,
        0x6C,

        // Quadratic Bézier
        0x51,
        0x71,

        // Smooth Cubic Bézier
        0x53,
        0x73,

        // Smooth Quadratic Bézier
        0x54,
        0x74,

        // Vertical Line
        0x56,
        0x76,

        // Close Path
        0x5A,
        0x7A,
    ]);


    const SPECIAL_SPACES = new Set([
        0x1680, 0x180E, 0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005, 0x2006,
        0x2007, 0x2008, 0x2009, 0x200A, 0x202F, 0x205F, 0x3000, 0xFEFF
    ]);


    function isSpace(ch) {
        return (ch === 0x0A) || (ch === 0x0D) || (ch === 0x2028) || (ch === 0x2029) || // Line terminators
            // White spaces or comma
            (ch === 0x20) || (ch === 44) || (ch === 0x002C) || (ch === 0x09) || (ch === 0x0B) || (ch === 0x0C) || (ch === 0xA0) || (ch >= 0x1680 && SPECIAL_SPACES.has(ch) >= 0);
    }

    function isCommandType(code) {
        //return paramCounts.hasOwnProperty(code);
        return commandSet.has(code);
    }


    let i = 0, len = path.length;
    let lastCommand = "";
    let pathData = [];
    let itemCount = -1;
    let val = '';
    let wasE = false;
    let wasSpace = false;
    let floatCount = 0;
    let valueIndex = 0;
    let maxParams = 0;
    let needsNewSegment = false;

    //absolute/relative or shorthands
    let hasRelatives = false;
    let hasArcs = false;
    let hasShorthands = false;
    let hasQuadratics = false;

    let relatives = new Set(['m', 'c', 'q', 'l', 'a', 't', 's', 'v', 'h']);
    let shorthands = new Set(['t', 's', 'v', 'h', 'T', 'S', 'V', 'H']);
    let quadratics = new Set(['t', 'q', 'T', 'Q']);

    //collect errors 
    let log = [];
    let feedback;

    function addSeg() {
        // Create new segment if needed before adding the minus sign
        if (needsNewSegment) {

            // sanitize implicit linetos
            if (lastCommand === 'M') lastCommand = 'L';
            else if (lastCommand === 'm') lastCommand = 'l';

            pathData.push({ type: lastCommand, values: [] });
            itemCount++;
            valueIndex = 0;
            needsNewSegment = false;


        }
    }

    function pushVal(checkFloats = false) {

        // regular value or float
        if (!checkFloats ? val !== '' : floatCount > 0) {

            // error: no first command
            if (debug && itemCount === -1) {

                feedback = 'Pathdata must start with M command';
                log.push(feedback);

                // add M command to collect subsequent errors
                lastCommand = 'M';
                pathData.push({ type: lastCommand, values: [] });
                maxParams = 2;
                valueIndex = 0;
                itemCount++;

            }

            if (lastCommand === 'A' || lastCommand === 'a') {
                val = sanitizeArc();
                pathData[itemCount].values.push(...val);

            } else {
                // error: leading zeroes
                if (debug && val[1] && val[1] !== '.' && val[0] === '0') {
                    feedback = 'Leading zeros not valid: ' + val;
                    log.push(feedback);
                }

                pathData[itemCount].values.push(+val);
            }

            valueIndex++;
            val = '';
            floatCount = 0;

            // Mark that a new segment is needed if maxParams is reached
            needsNewSegment = valueIndex >= maxParams;

        }

    }


    function sanitizeArc() {

        let valLen = val.length;
        let arcSucks = false;

        // large arc and sweep
        if (valueIndex === 3 && valLen === 2) {
            //console.log('large arc sweep combined', val, +val[0], +val[1]);
            val = [+val[0], +val[1]];
            arcSucks = true;
            valueIndex++;
        }

        // sweep and final
        else if (valueIndex === 4 && valLen > 1) {
            //console.log('sweep and final', val);
            val = [+val[0], +val[1]];
            arcSucks = true;
            valueIndex++;
        }

        // large arc, sweep and final pt combined
        else if (valueIndex === 3 && valLen > 3) {
            val = [+val[0], +val[1], +val.substring(2)];
            arcSucks = true;
            valueIndex += 2;
        }

        return !arcSucks ? [+val] : val;

    }

    function validateCommand() {
        if (debug) {
            let lastCom = itemCount > 0 ? pathData[itemCount] : 0;
            let valLen = lastCom ? lastCom.values.length : 0;

            //console.log(lastCom, valLen, maxParams,  (valLen && valLen < maxParams ) );

            if ((valLen && valLen < maxParams) || (valLen && valLen > maxParams) || ((lastCommand === 'z' || lastCommand === 'Z') && valLen > 0)) {
                let diff = maxParams - valLen;
                feedback = `Pathdata commands in "${lastCommand}" (segment index: ${itemCount}) don't match allowed number of values: ${diff}/${maxParams}`;
                log.push(feedback);
            }
        }
    }



    while (i < len) {
        let char = path[i];
        let charCode = path.charCodeAt(i);

        // New command
        if (isCommandType(charCode)) {

            // command is concatenated without whitespace
            if (val !== '') {
                pathData[itemCount].values.push(+val);
                valueIndex++;
                val = '';
            }

            // check if previous command was correctly closed
            validateCommand();


            // new command type
            lastCommand = char;
            maxParams = paramCounts[charCode];
            let isM = lastCommand === 'M' || lastCommand === 'm';
            let wasClosePath = itemCount>0 && (pathData[itemCount].type === 'z' || pathData[itemCount].type === 'Z');

            
            // add omitted M command after Z
            if ( wasClosePath && !isM  ) {
                pathData.push({ type: 'm', values: [0, 0]});
                itemCount++;
            }
            

            pathData.push({ type: lastCommand, values: [] });
            itemCount++;

            //check types relative arcs or quadratics
            if (!hasRelatives) hasRelatives = relatives.has(lastCommand);
            if (!hasShorthands) hasShorthands = shorthands.has(lastCommand);
            if (!hasQuadratics) hasQuadratics = quadratics.has(lastCommand);
            if (!hasArcs) hasArcs = lastCommand === 'a' || lastCommand === 'A';

            // reset counters
            wasSpace = false;
            floatCount = 0;
            valueIndex = 0;
            needsNewSegment = false;

            i++;
            continue;
        }

        // Separated by White space 
        if (isSpace(charCode)) {

            // push value
            pushVal();

            wasSpace = true;
            wasE = false;
            i++;
            continue;
        }


        // if last
        else if (i === len - 1) {

            val += char;
            //console.log('last', val, char);

            // push value
            pushVal();
            wasSpace = false;
            wasE = false;

            validateCommand();
            break;
        }


        // minus or float separated
        if ((!wasE && !wasSpace && charCode === 0x2D) ||
            (!wasE && charCode === 0x2E)
        ) {

            // checkFloats changes condition for value adding
            let checkFloats = charCode === 0x2E;

            // new val
            pushVal(checkFloats);

            // new segment
            addSeg();


            // concatenated floats
            if (checkFloats) {
                floatCount++;
            }
        }


        // regular splitting
        else {
            addSeg();
        }

        val += char;

        // e/scientific notation in value
        wasE = (charCode === 0x45 || charCode === 0x65);
        wasSpace = false;
        i++;
    }

    //validate final
    validateCommand();

    // return error log
    if (debug && log.length) {
        feedback = 'Invalid path data:\n' + log.join('\n');
        if (debug === 'log') {
            console.log(feedback);
        } else {
            throw new Error(feedback)
        }
    }

    pathData[0].type = 'M';


    return {
        pathData: pathData,
        hasRelatives: hasRelatives,
        hasShorthands: hasShorthands,
        hasQuadratics: hasQuadratics,
        hasArcs: hasArcs
    }

}

/**
 * round path data
 * either by explicit decimal value or
 * based on suggested accuracy in path data
 */
function roundPathData(pathData, decimals = -1) {
    // has recommended decimals
    let hasDecimal = decimals == 'auto' && pathData[0].hasOwnProperty('decimals') ? true : false;
    //console.log('decimals', decimals, hasDecimal);

    for(let c=0, len=pathData.length; c<len; c++){
        let com=pathData[c];

        if (decimals >-1 || hasDecimal) {
            decimals = hasDecimal ? com.decimals : decimals;

            /*
            if(type.toLowerCase()==='a'){
                pathData[c].values = [
                    // increase precision for radii
                    +values[0].toFixed(decimals),
                    +values[1].toFixed(decimals),
                    +values[2].toFixed(decimals),

                    +values[3],
                    +values[4],
                    +values[5].toFixed(decimals),
                    +values[6].toFixed(decimals),
                ];
                console.log(pathData[c].values, decimals);

            }else{
                com.values.forEach((val, v) => {
                    pathData[c].values[v] = +val.toFixed(decimals);
                });
            }
            */

            //console.log('decimals', type, decimals);
            pathData[c].values = com.values.map(val=>{return +val.toFixed(decimals)});

        }
    }    return pathData;
}

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



function convertPathData(pathData,
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
        toAbsolute = true;
        toLonghands = true;
        arcToCubic = true;
        quadraticToCubic = true;
        toShorthands = false;
    }

    /*
    if (optimize === true) {
        toRelative = true
        toShorthands = true
        decimals = 3
    }
    */

    // clone array
    pathData = JSON.parse(JSON.stringify(pathData));



    // convert to absolute
    //if (toAbsolute) pathData = pathDataToAbsolute(pathData)
    if (toAbsolute) pathData = pathDataToAbsoluteOrRelative(pathData);



    // convert to longhands
    if (toLonghands) pathData = pathDataToLonghands(pathData, -1, false);


    // arc to cubic
    if (arcToCubic) pathData = pathDataArcsToCubics(pathData);


    // to shorthands
    if (toShorthands) pathData = pathDataToShorthands(pathData);


    // to Relative
    if (toRelative) pathData = pathDataToAbsoluteOrRelative(pathData, true);
    pathData = pathDataAddArcInfo(pathData);


    // post round
    if (decimals !== -1) {
        //console.log('post-round');
        pathData = roundPathData(pathData, decimals);
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

function pathDataAddArcInfo(pathData){

    for(let i=0, len=pathData.length; len && i<len; i++){
        let com = pathData[i];

        if(com.type==='A'){

            let comPrev = pathData[i-1];
            //let valuesLast = com.values.slice(-2)
            let valuesPrevLast = comPrev.values.slice(-2);
            let p0 = {x:valuesPrevLast[0], y:valuesPrevLast[1]};
            //let p = {x:valuesLast[0], y:valuesLast[1]}
            let [rx, ry, xAxisRotation, largeArc, sweep, x2, y2 ] = com.values;
            let arcData = mtrXYZ.svgArcToCenterParam(p0.x, p0.y, rx, ry, xAxisRotation, largeArc, sweep, x2, y2);
            com.rx= arcData.rx;
            com.ry= arcData.ry;
            com.cx= arcData.cx;
            com.cy= arcData.cy;
            com.xAxisRotation= xAxisRotation;
            com.largeArc= largeArc;
            com.startAngle= arcData.startAngle;
            com.endAngle= arcData.endAngle;
            com.deltaAngle= arcData.deltaAngle;
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

function pathDataArcsToCubics(pathData, {
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
            pathDataCubic.push(com);
        }
    }

    return pathDataCubic

}



/**
 * decompose/convert shorthands to "longhand" commands:
 * H, V, S, T => L, L, C, Q
 * reversed method: pathDataToShorthands()
 */

function pathDataToLonghands(pathData, decimals = -1, test = true) {

    // analyze pathdata – if you're sure your data is already absolute skip it via test=false
    let hasRel;

    if (test) {
        let commandTokens = pathData.map(com => { return com.type }).join('');
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
            comPrev.values = comPrev.values.map(val => { return +val.toFixed(decimals) });
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
function pathDataToShorthands(pathData, decimals = -1, test = true) {

    /** 
    * analyze pathdata – if you're sure your data is already absolute skip it via test=false
    */
    let hasRel;
    if (test) {
        let commandTokens = pathData.map(com => { return com.type }).join('');
        hasRel = /[astvqmhlc]/g.test(commandTokens);
    }

    pathData = test && hasRel ? pathDataToAbsoluteOrRelative(pathData, false, decimals) : pathData;

    let comShort = {
        type: "M",
        values: pathData[0].values
    };

    if (pathData[0].decimals) {
        //console.log('has dec');
        comShort.decimals = pathData[0].decimals;
    }

    let pathDataShorts = [comShort];

    let p0 = { x: pathData[0].values[0], y: pathData[0].values[1] };
    let p;
    let tolerance = 0.01;

    for (let i = 1, len = pathData.length; i < len; i++) {

        let com = pathData[i];
        let { type, values } = com;
        let valuesLast = values.slice(-2);

        // previoius command
        let comPrev = pathData[i - 1];
        let typePrev = comPrev.type;

        //last on-path point
        p = { x: valuesLast[0], y: valuesLast[1] };

        // first bezier control point for S/T shorthand tests
        let cp1 = { x: values[0], y: values[1] };


        //calculate threshold based on command dimensions
        let w = Math.abs(p.x - p0.x);
        let h = Math.abs(p.y - p0.y);
        let thresh = (w + h) / 2 * tolerance;

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
                diffX = Math.abs(cp1.x - cp1_reflected.x);
                diffY = Math.abs(cp1.y - cp1_reflected.y);
                diff = (diffX + diffY) / 2;

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
                diffX = Math.abs(cp1.x - cp1_reflected.x);
                diffY = Math.abs(cp1.y - cp1_reflected.y);
                diff = (diffX + diffY) / 2;


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
            comShort.decimals = com.decimals;
        }


        // round final values
        if (decimals > -1) {
            comShort.values = comShort.values.map(val => { return +val.toFixed(decimals) });
        }

        p0 = { x: valuesLast[0], y: valuesLast[1] };
        pathDataShorts.push(comShort);
    }
    return pathDataShorts;
}


/** 
 * convert arctocommands to cubic bezier
 * based on puzrin's a2c.js
 * https://github.com/fontello/svgpath/blob/master/lib/a2c.js
 * returns pathData array
*/

function arcToBezier(p0, values, splitSegments = 1) {
    const TAU = Math.PI * 2;
    let [rx, ry, rotation, largeArcFlag, sweepFlag, x, y] = values;

    if (rx === 0 || ry === 0) {
        return []
    }

    let phi = rotation ? rotation * TAU / 360 : 0;
    let sinphi = phi ? Math.sin(phi) : 0;
    let cosphi = phi ? Math.cos(phi) : 1;
    let pxp = cosphi * (p0.x - x) / 2 + sinphi * (p0.y - y) / 2;
    let pyp = -sinphi * (p0.x - x) / 2 + cosphi * (p0.y - y) / 2;

    if (pxp === 0 && pyp === 0) {
        return []
    }
    rx = Math.abs(rx);
    ry = Math.abs(ry);
    let lambda =
        pxp * pxp / (rx * rx) +
        pyp * pyp / (ry * ry);
    if (lambda > 1) {
        let lambdaRt = Math.sqrt(lambda);
        rx *= lambdaRt;
        ry *= lambdaRt;
    }

    /** 
     * parametrize arc to 
     * get center point start and end angles
     */
    let rxsq = rx * rx,
        rysq = rx === ry ? rxsq : ry * ry;

    let pxpsq = pxp * pxp,
        pypsq = pyp * pyp;
    let radicant = (rxsq * rysq) - (rxsq * pypsq) - (rysq * pxpsq);

    if (radicant <= 0) {
        radicant = 0;
    } else {
        radicant /= (rxsq * pypsq) + (rysq * pxpsq);
        radicant = Math.sqrt(radicant) * (largeArcFlag === sweepFlag ? -1 : 1);
    }

    let centerxp = radicant ? radicant * rx / ry * pyp : 0;
    let centeryp = radicant ? radicant * -ry / rx * pxp : 0;
    let centerx = cosphi * centerxp - sinphi * centeryp + (p0.x + x) / 2;
    let centery = sinphi * centerxp + cosphi * centeryp + (p0.y + y) / 2;

    let vx1 = (pxp - centerxp) / rx;
    let vy1 = (pyp - centeryp) / ry;
    let vx2 = (-pxp - centerxp) / rx;
    let vy2 = (-pyp - centeryp) / ry;

    // get start and end angle
    const vectorAngle = (ux, uy, vx, vy) => {
        let dot = +(ux * vx + uy * vy).toFixed(9);
        if (dot === 1 || dot === -1) {
            return dot === 1 ? 0 : Math.PI
        }
        dot = dot > 1 ? 1 : (dot < -1 ? -1 : dot);
        let sign = (ux * vy - uy * vx < 0) ? -1 : 1;
        return sign * Math.acos(dot);
    };

    let ang1 = vectorAngle(1, 0, vx1, vy1),
        ang2 = vectorAngle(vx1, vy1, vx2, vy2);

    if (sweepFlag === 0 && ang2 > 0) {
        ang2 -= Math.PI * 2;
    }
    else if (sweepFlag === 1 && ang2 < 0) {
        ang2 += Math.PI * 2;
    }


    //ratio must be at least 1
    let ratio = +(Math.abs(ang2) / (TAU / 4)).toFixed(0) || 1;


    // increase segments for more accureate length calculations
    let segments = ratio * splitSegments;
    ang2 /= segments;
    let pathDataArc = [];


    // If 90 degree circular arc, use a constant
    // https://pomax.github.io/bezierinfo/#circles_cubic
    // k=0.551784777779014
    const angle90 = 1.5707963267948966;
    const k = 0.551785;
    let a = ang2 === angle90 ? k :
        (
            ang2 === -angle90 ? -k : 4 / 3 * Math.tan(ang2 / 4)
        );

    let cos2 = ang2 ? Math.cos(ang2) : 1;
    let sin2 = ang2 ? Math.sin(ang2) : 0;
    let type = 'C';

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
    };

    for (let i = 0; i < segments; i++) {
        let com = { type: type, values: [] };
        let curve = approxUnitArc(ang1, ang2, a, cos2, sin2);

        curve.forEach((pt) => {
            let x = pt.x * rx;
            let y = pt.y * ry;
            com.values.push(cosphi * x - sinphi * y + centerx, sinphi * x + cosphi * y + centery);
        });
        pathDataArc.push(com);
        ang1 += ang2;
    }

    return pathDataArc;
}



function pathDataToAbsoluteOrRelative(pathData, toRelative = false, decimals = -1) {
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

const { abs, acos, atan, atan2, cos, sin, log, max, min, sqrt, tan, PI, pow } = Math;


/**
 *  based on @cuixiping;
 *  https://stackoverflow.com/questions/9017100/calculate-center-of-svg-arc/12329083#12329083
 */
function svgArcToCenterParam(x1, y1, rx, ry, xAxisRotation, largeArc, sweep, x2, y2) {

    // helper for angle calculation
    const getAngle = (cx, cy, x, y) => {
        return atan2(y - cy, x - cx);
    };

    // make sure rx, ry are positive
    rx = abs(rx);
    ry = abs(ry);

    /**
     * rx/ry values may be deceptive 
     * due to end-point parametisation concept
     */

    // create data object
    let arcData = {
        cx: 0,
        cy: 0,
        rx: rx,
        ry: ry,
        startAngle: 0,
        endAngle: 0,
        deltaAngle: 0,
        clockwise: sweep
    };


    if (rx == 0 || ry == 0) {
        // invalid arguments
        throw Error("rx and ry can not be 0");
    }

    /*
    // try to take a shortcut by detecting semicircles
    let shortcut = true
    //console.log('short');

    if (rx === ry && shortcut) {

        // test semicircles
        let diffX = Math.abs(x2 - x1)
        let diffY = Math.abs(y2 - y1)
        let r = diffX;

        let xMin = Math.min(x1, x2),
            yMin = Math.min(y1, y2),
            PIHalf = Math.PI * 0.5

        // semi circles
        if (diffX === 0 && diffY || diffY === 0 && diffX) {
            //console.log('semi');

            r = diffX === 0 && diffY ? diffY / 2 : diffX / 2;
            arcData.rx = r
            arcData.ry = r

            // verical
            if (diffX === 0 && diffY) {
                arcData.cx = x1;
                arcData.cy = yMin + diffY / 2;
                arcData.startAngle = y1 > y2 ? PIHalf : -PIHalf
                arcData.endAngle = y1 > y2 ? -PIHalf : PIHalf
                arcData.deltaAngle = sweep ? Math.PI : -Math.PI

            }
            // horizontal
            else if (diffY === 0 && diffX) {
                arcData.cx = xMin + diffX / 2;
                arcData.cy = y1
                arcData.startAngle = x1 > x2 ? Math.PI : 0
                arcData.endAngle = x1 > x2 ? -Math.PI : Math.PI
                arcData.deltaAngle = sweep ? Math.PI : -Math.PI
            }

            //console.log(arcData);
            return arcData;
        }
    }
    */

    /**
     * if rx===ry x-axis rotation is ignored
     * otherwise convert degrees to radians
     */
    let phi = rx === ry ? 0 : (xAxisRotation * PI) / 180;
    let cx, cy;

    let s_phi = !phi ? 0 : sin(phi);
    let c_phi = !phi ? 1 : cos(phi);

    let hd_x = (x1 - x2) / 2;
    let hd_y = (y1 - y2) / 2;
    let hs_x = (x1 + x2) / 2;
    let hs_y = (y1 + y2) / 2;

    // F6.5.1
    let x1_ = !phi ? hd_x : c_phi * hd_x + s_phi * hd_y;
    let y1_ = !phi ? hd_y : c_phi * hd_y - s_phi * hd_x;

    // F.6.6 Correction of out-of-range radii
    //   Step 3: Ensure radii are large enough
    let lambda = (x1_ * x1_) / (rx * rx) + (y1_ * y1_) / (ry * ry);
    if (lambda > 1) {
        rx = rx * sqrt(lambda);
        ry = ry * sqrt(lambda);

        // save real rx/ry
        arcData.rx = rx;
        arcData.ry = ry;
    }

    let rxry = rx * ry;
    let rxy1_ = rx * y1_;
    let ryx1_ = ry * x1_;
    let sum_of_sq = rxy1_ * rxy1_ + ryx1_ * ryx1_; // sum of square
    if (!sum_of_sq) {
        throw Error("start point can not be same as end point");
    }
    let coe = sqrt(abs((rxry * rxry - sum_of_sq) / sum_of_sq));
    if (largeArc == sweep) {
        coe = -coe;
    }

    // F6.5.2
    let cx_ = (coe * rxy1_) / ry;
    let cy_ = (-coe * ryx1_) / rx;

    /** F6.5.3
     * center point of ellipse
     */
    cx = !phi ? hs_x + cx_ : c_phi * cx_ - s_phi * cy_ + hs_x;
    cy = !phi ? hs_y + cy_ : s_phi * cx_ + c_phi * cy_ + hs_y;
    arcData.cy = cy;
    arcData.cx = cx;

    /** F6.5.5
     * calculate angles between center point and
     * commands starting and final on path point
     */
    let startAngle = getAngle(cx, cy, x1, y1);
    let endAngle = getAngle(cx, cy, x2, y2);

    // adjust end angle
    if (!sweep && endAngle > startAngle) {
        //console.log('adj neg');
        endAngle -= Math.PI * 2;
    }

    if (sweep && startAngle > endAngle) {
        //console.log('adj pos');
        endAngle = endAngle <= 0 ? endAngle + Math.PI * 2 : endAngle;
    }

    let deltaAngle = endAngle - startAngle;
    arcData.startAngle = startAngle;
    arcData.endAngle = endAngle;
    arcData.deltaAngle = deltaAngle;

    //console.log('arc', arcData);
    return arcData;
}


function getPointOnEllipse(cx, cy, rx, ry, angle, ellipseRotation = 0, parametricAngle = true, degrees = false) {

    // Convert degrees to radians
    angle = degrees ? (angle * PI) / 180 : angle;
    ellipseRotation = degrees ? (ellipseRotation * PI) / 180 : ellipseRotation;
    // reset rotation for circles or 360 degree 
    ellipseRotation = rx !== ry ? (ellipseRotation !== PI * 2 ? ellipseRotation : 0) : 0;

    // is ellipse
    if (parametricAngle && rx !== ry) {
        // adjust angle for ellipse rotation
        angle = ellipseRotation ? angle - ellipseRotation : angle;
        // Get the parametric angle for the ellipse
        let angleParametric = atan(tan(angle) * (rx / ry));
        // Ensure the parametric angle is in the correct quadrant
        angle = cos(angle) < 0 ? angleParametric + PI : angleParametric;
    }

    // Calculate the point on the ellipse without rotation
    let x = cx + rx * cos(angle),
        y = cy + ry * sin(angle);
    let pt = {
        x: x,
        y: y
    };

    if (ellipseRotation) {
        pt.x = cx + (x - cx) * cos(ellipseRotation) - (y - cy) * sin(ellipseRotation);
        pt.y = cy + (x - cx) * sin(ellipseRotation) + (y - cy) * cos(ellipseRotation);
    }
    return pt
}

/**
 * Serialize pathData array to a minified "d" attribute string.
 */
function pathDataToD(pathData, optimize = 1) {

    let beautify = optimize>1;
    let minify = beautify ? false : true;

    // Convert first "M" to "m" if followed by "l" (when minified)
    if (pathData[1].type === "l" && minify) {
        pathData[0].type = "m";
    }

    let d = '';
    if(beautify) {
        d = `${pathData[0].type} ${pathData[0].values.join(" ")}\n`;
    }else {
        d = `${pathData[0].type}${pathData[0].values.join(" ")}`;
    }


    for (let i = 1, len = pathData.length; i < len; i++) {
        let com0 = pathData[i - 1];
        let com = pathData[i];
        let { type, values } = com;

        // Minify Arc commands (A/a) – actually sucks!
        if (minify && (type === 'A' || type === 'a')) {
            values = [
                values[0], values[1], values[2],
                `${values[3]}${values[4]}${values[5]}`,
                values[6]
            ];
        }

        // Omit type for repeated commands
        type = (com0.type === com.type && com.type.toLowerCase() !== 'm' && minify)
                ? " "
                : (
                    (com0.type === "m" && com.type === "l") ||
                    (com0.type === "M" && com.type === "l") ||
                    (com0.type === "M" && com.type === "L")
                ) && minify
                    ? " "
                    : com.type;


        // concatenate subsequent floating point values
        if (minify) {

            //console.log(optimize, beautify, minify);

            let valsString = '';
            let prevWasFloat = false;

            for (let v = 0, l = values.length; v < l; v++) {
                let val = values[v];
                let valStr = val.toString();
                let isFloat = valStr.includes('.');
                let isSmallFloat = isFloat && Math.abs(val) < 1;


                // Remove leading zero from small floats *only* if the previous was also a float
                if (isSmallFloat && prevWasFloat) {
                    valStr = valStr.replace(/^0\./, '.');
                }

                // Add space unless this is the first value OR previous was a small float
                if (v > 0 && !(prevWasFloat && isSmallFloat)) {
                    valsString += ' ';
                }
                //console.log(isSmallFloat, prevWasFloat, valStr);

                valsString += valStr;
                //.replace(/-0./g, '-.').replace(/ -./g, '-.')
                prevWasFloat = isSmallFloat;
            }

            //console.log('minify', valsString);
            d += `${type}${valsString}`;

        }
        // regular non-minified output
        else {
            if(beautify) {
                d += `${type} ${values.join(' ')}\n`;
            }else {
                d += `${type}${values.join(' ')}`;
            }
        }
    }

    if (minify) {
        d = d
            .replace(/ 0\./g, " .") // Space before small decimals
            .replace(/ -/g, "-")     // Remove space before negatives
            .replace(/-0\./g, "-.")  // Remove leading zero from negative decimals
            .replace(/Z/g, "z");     // Convert uppercase 'Z' to lowercase
    }


    return d;
}

/**
 * create hull for arc segment
 */



function getEllipeHull(cx, cy, rx, ry, xAxisRotation) {

    const rotatePt = (pt, cx, cy, angle, toRad = false) => {
        if (toRad) angle = angle * Math.PI / 180;

        if (angle === 0) {
            return pt;
        }
        let cos = Math.cos(angle);
        let sin = Math.sin(angle);
        let nx = (cos * (pt.x - cx)) + (sin * (pt.y - cy)) + cx;
        let ny = (cos * (pt.y - cy)) - (sin * (pt.x - cx)) + cy;
        return { x: nx, y: ny };
    };

    // adjust angles for corner rotation
    let angleadjust = xAxisRotation > 0 ? Math.PI/-2 : Math.PI/2;
    //angleadjust=0

    // to radian
    xAxisRotation = xAxisRotation ? xAxisRotation + angleadjust : 0;

    //console.log('xAxisRotation1', (xAxisRotation), (xAxisRotation*180/Math.PI) , 'angleadjust:', angleadjust, 'angleadjust degree:',(angleadjust*180/Math.PI) );


    //xAxisRotation = xAxisRotation * Math.PI / 180

    let pt1 = rotatePt({ x: cx - rx, y: cy - ry }, cx, cy, -xAxisRotation);
    let pt2 = rotatePt({ x: cx + rx, y: cy - ry }, cx, cy, -xAxisRotation);
    let pt3 = rotatePt({ x: cx + rx, y: cy + ry }, cx, cy, -xAxisRotation);
    let pt4 = rotatePt({ x: cx - rx, y: cy + ry }, cx, cy, -xAxisRotation);

    //{x:cx, y:cy}
    return [pt1, pt2, pt3, pt4]
}





/**
 * create hull matrix
 * from quadrilateral
 * http://chrisjones.id.au/Ellipses/ellipse.html
 */
function getConvexHullMatrix(pts) {
    let decimals = 2;
    pts.map(pt => { return { x: +pt.x.toFixed(decimals), y: +pt.y.toFixed(decimals) } });
    //pts = ptsRound
    //console.log(ptsRound);

    let [W, X, Y, Z] = pts;
    let matrix = {
        m00: X.x * Y.x * Z.y - W.x * Y.x * Z.y - X.x * Y.y * Z.x + W.x * Y.y * Z.x - W.x * X.y * Z.x + W.y * X.x * Z.x + W.x * X.y * Y.x - W.y * X.x * Y.x,
        m01: W.x * Y.x * Z.y - W.x * X.x * Z.y - X.x * Y.y * Z.x + X.y * Y.x * Z.x - W.y * Y.x * Z.x + W.y * X.x * Z.x + W.x * X.x * Y.y - W.x * X.y * Y.x,
        m02: X.x * Y.x * Z.y - W.x * X.x * Z.y - W.x * Y.y * Z.x - X.y * Y.x * Z.x + W.y * Y.x * Z.x + W.x * X.y * Z.x + W.x * X.x * Y.y - W.y * X.x * Y.x,
        m10: X.y * Y.x * Z.y - W.y * Y.x * Z.y - W.x * X.y * Z.y + W.y * X.x * Z.y - X.y * Y.y * Z.x + W.y * Y.y * Z.x + W.x * X.y * Y.y - W.y * X.x * Y.y,
        m11: -X.x * Y.y * Z.y + W.x * Y.y * Z.y + X.y * Y.x * Z.y - W.x * X.y * Z.y - W.y * Y.y * Z.x + W.y * X.y * Z.x + W.y * X.x * Y.y - W.y * X.y * Y.x,
        m12: X.x * Y.y * Z.y - W.x * Y.y * Z.y + W.y * Y.x * Z.y - W.y * X.x * Z.y - X.y * Y.y * Z.x + W.y * X.y * Z.x + W.x * X.y * Y.y - W.y * X.y * Y.x,
        m20: X.x * Z.y - W.x * Z.y - X.y * Z.x + W.y * Z.x - X.x * Y.y + W.x * Y.y + X.y * Y.x - W.y * Y.x,
        m21: Y.x * Z.y - X.x * Z.y - Y.y * Z.x + X.y * Z.x + W.x * Y.y - W.y * Y.x - W.x * X.y + W.y * X.x,
        m22: Y.x * Z.y - W.x * Z.y - Y.y * Z.x + W.y * Z.x + X.x * Y.y - X.y * Y.x + W.x * X.y - W.y * X.x,
    };

    //matrix = matrix.map(key=>{return {x:+pt.x.toFixed(decimals), y:+pt.y.toFixed(decimals)} });
    //Object.values(matrix).forEach()


    // round
    Object.entries(matrix).forEach(function(e){
      // e[0] is the key and e[1] is the value
      Number(e[1]);
    });

    /*

        console.log(matrix);
        */



    return matrix
}




/**
* Based on chris jones'
* http://chrisjones.id.au/Ellipses/ellipse.html
* and Laszlo Korte's JS implementation
* https://static.laszlokorte.de/quad/
*/

function getEllipseProperties(hullMatrix) {

    let { m00, m01, m02, m10, m11, m12, m20, m21, m22 } = hullMatrix;

    // invert matrix
    const determinant = +m00 * (m11 * m22 - m21 * m12) - m01 * (m10 * m22 - m12 * m20) + m02 * (m10 * m21 - m11 * m20);

    if (determinant == 0) return null;

    const invdet = 1 / determinant;
    const J = (m11 * m22 - m21 * m12) * invdet;
    const K = -(m01 * m22 - m02 * m21) * invdet;
    const L = (m01 * m12 - m02 * m11) * invdet;
    const M = -(m10 * m22 - m12 * m20) * invdet;
    const N = (m00 * m22 - m02 * m20) * invdet;
    const O = -(m00 * m12 - m10 * m02) * invdet;
    const P = (m10 * m21 - m20 * m11) * invdet;
    const Q = -(m00 * m21 - m20 * m01) * invdet;
    const R = (m00 * m11 - m10 * m01) * invdet;

    // extract ellipse coefficients from matrix
    let a = J * J + M * M - P * P;
    let b = J * K + M * N - P * Q;
    let c = K * K + N * N - Q * Q;
    let d = J * L + M * O - P * R;
    let f = K * L + N * O - Q * R;
    let g = L * L + O * O - R * R;



    // deduce ellipse rotation from coefficients
    let angle = 0;
    if (b == 0 && a <= c) {
        angle = 0;
    } else if (b == 0 && a >= c) {
        angle = Math.PI / 2;
    } else if (b != 0 && a > c) {
        angle = Math.PI / 2 + 0.5 * (Math.PI / 2 - Math.atan2((a - c), (2 * b)));
    } else if (b != 0 && a <= c) {
        angle = Math.PI / 2 + 0.5 * (Math.PI / 2 - Math.atan2((a - c), (2 * b)));
    }


    //convert to degrees
    angle = angle * 180 / Math.PI;
    //angle = Math.ceil(angle)
    //angle = +(angle).toFixed(1)


    return {
        // deduce ellipse center from coefficients
        cx: (c * d - b * f) / (b * b - a * c),
        cy: (a * f - b * d) / (b * b - a * c),
        // deduce ellipse radius from coefficients
        rx: Math.sqrt(2 * (a * f * f + c * d * d + g * b * b - 2 * b * d * f - a * c * g) / ((b * b - a * c) *
            (Math.sqrt((a - c) * (a - c) + 4 * b * b) - (a + c)))),
        ry: Math.sqrt(2 * (a * f * f + c * d * d + g * b * b - 2 * b * d * f - a * c * g) / ((b * b - a * c) * (-Math.sqrt((a - c) * (a - c) + 4 * b * b) - (a + c)))),
        // convert to degrees
        angle: angle
    }
}



function renderPoint(
    svg,
    coords,
    fill = "red",
    r = "1%",
    opacity = "1",
    title = '',
    render = true,
    id = "",
    className = ""
) {
    if (Array.isArray(coords)) {
        coords = {
            x: coords[0],
            y: coords[1]
        };
    }
    let marker = `<circle class="${className}" opacity="${opacity}" id="${id}" cx="${coords.x}" cy="${coords.y}" r="${r}" fill="${fill}">
<title>${title}</title></circle>`;

    if (render) {
        svg.insertAdjacentHTML("beforeend", marker);
    } else {
        return marker;
    }
}


function getPolygonArea(points, tolerance = 0.001) {
    let area = 0;
    for (let i = 0, len = points.length; len && i < len; i++) {
        let addX = points[i].x;
        let addY = points[i === points.length - 1 ? 0 : i + 1].y;
        let subX = points[i === points.length - 1 ? 0 : i + 1].x;
        let subY = points[i].y;
        area += addX * addY * 0.5 - subX * subY * 0.5;
    }
    return area;
}

//import { parse, convertPathData } from './pathdata/parse';
//import { canFlattenTo2D, flattenTo2D } from '../getMatrix';
//import { canFlattenTo2D, flattenTo2D } from '../getMatrix';
//import * as mtrXYZ from 'mtrXYZ';
//import {transformPoint3D, transformPoint2D, canFlattenTo2D, flattenTo2D } from 'mtrXYZ';



mtrXYZ.Mtx.prototype.transformPathData = function (pts, decimals = 8) {
    let ptsT = mtrXYZ.transformPathData(pts, this.matrix, this.perspectiveOrigin, this.perspective, decimals);
    this.ptsT = ptsT;
    return ptsT;
};

/**
 * scale pathData2
 */
function transformPathData(pathData, matrix, perspectiveOrigin = { x: 0, y: 0 }, perspective = Infinity, decimals = -1) {

    pathData = Array.isArray(pathData) ? pathData : mtrXYZ.parse(pathData).pathData;

    // normalize
    pathData = mtrXYZ.convertPathData(pathData, { toAbsolute: true, toLonghands: true });

    // new pathdata
    let pathDataTrans = [];
    let is3D = Object.values(matrix).length === 16;
    let canFlatten = false;


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
    };



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

        let arcData = {};

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
            };
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
        let hull = mtrXYZ.getEllipeHull(cx, cy, rx, ry, -xAxisRotationRad);

        // transform hull
        let hullTrans = mtrXYZ.transformPoints(hull, matrix, perspectiveOrigin, perspective);

        // get hullMatrix
        let hullMatrix = mtrXYZ.getConvexHullMatrix(hullTrans);

        // get new arc angles and ellipse center
        let arcPropsTrans = mtrXYZ.getEllipseProperties(hullMatrix);
        //console.log('arcPropsTrans', arcPropsTrans);


        /**
         * get reference point on ellipe at mid delta angle
         * to detect sweep and large arc changes
         */
        let ptR = mtrXYZ.getPointOnEllipse(cx, cy, rx, ry, (startAngle + deltaAngle * 0.5), xAxisRotationRad);

        // transform reference point
        ptR = mtrXYZ.transformPoint(ptR, matrix, perspectiveOrigin, perspective);

        // actual transformed ellipse center
        let cntT = { x: arcPropsTrans.cx, y: arcPropsTrans.cy };

        /**
         * detect sweep changes based 
         * on area changes
         */
        let areaTrans = mtrXYZ.getPolygonArea([cntT, p0, ptR, p]);
        sweep = areaTrans < 0 ? 0 : 1;


        // get ultimate largeArc value
        let largeArcnew = detectLargeArc(cntT, p0, ptR, p, sweep);
        largeArc = largeArcnew.largeArc;

        // update radii and xAxisRotation
        rx=arcPropsTrans.rx;
        ry=arcPropsTrans.ry;
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
    };


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
        let com = pathData[i];

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
                comT = transformArc(p0, com, matrix);
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
    }

    return pathDataTrans;

}

exports.convertPathData = convertPathData;
exports.getConvexHullMatrix = getConvexHullMatrix;
exports.getEllipeHull = getEllipeHull;
exports.getEllipseProperties = getEllipseProperties;
exports.getPointOnEllipse = getPointOnEllipse;
exports.getPolygonArea = getPolygonArea;
exports.parse = parse;
exports.pathDataToD = pathDataToD;
exports.renderPoint = renderPoint;
exports.roundPathData = roundPathData;
exports.svgArcToCenterParam = svgArcToCenterParam;
exports.transformPathData = transformPathData;
