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
            (ch === 44) || (ch === 0x002C) || (ch === 0x20) || (ch === 0x09) || (ch === 0x0B) || (ch === 0x0C) || (ch === 0xA0) ||
            (ch >= 0x1680 && SPECIAL_SPACES.has(ch) >= 0);
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
    if (toAbsolute) pathData = pathDataToAbsolute(pathData);


    // convert to longhands
    if (toLonghands) pathData = pathDataToLonghands(pathData, -1, false);
    //console.log('conv', pathData);


    // arct to cubic
    if (arcToCubic) pathData = pathDataArcsToCubics(pathData);


    // to shorthands
    if (toShorthands) pathData = pathDataToShorthands(pathData);


    // to Relative
    //console.log(toAbsolute, toRelative, toLonghands);
    //if (toRelative) pathData = pathDataToRelative(pathData, decimals)
    if (toRelative) pathData = pathDataToRelative(pathData);


    // round if not already rounded
    //let hasDecimal = pathData[0].hasOwnProperty('decimals')


    // post round
    if (decimals !== -1) {
        //console.log('post-round');
        pathData = roundPathData(pathData, decimals);
    }

    return pathData;
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
 * This is just a port of Dmitry Baranovskiy's 
 * pathToRelative/Absolute methods used in snap.svg
 * https://github.com/adobe-webplatform/Snap.svg/
 * 
 * Demo: https://codepen.io/herrstrietzel/pen/poVKbgL
 */

// convert to relative commands
function pathDataToRelative(pathData, decimals = -1) {

    //pathData = JSON.parse(JSON.stringify(pathData))

    // round coordinates to prevent distortions
    if (decimals >= 0) {
        pathData[0].values = pathData[0].values.map(val => { return +val.toFixed(decimals) });
    }

    //console.log('rel', pathData);

    let M = pathData[0].values;
    let x = M[0],
        y = M[1],
        mx = x,
        my = y;


    // loop through commands
    for (let i = 1, len = pathData.length; i < len; i++) {
        let com = pathData[i];

        // round coordinates to prevent distortions
        if (decimals >= 0 && com.values.length) {
            com.values = com.values.map(val => { return +val.toFixed(decimals) });
        }
        let { type, values } = com;
        let typeRel = type.toLowerCase();


        // is absolute
        if (type != typeRel) {
            type = typeRel;
            com.type = type;
            // check current command types
            switch (typeRel) {
                case "a":
                    values[5] = +(values[5] - x);
                    values[6] = +(values[6] - y);
                    break;
                case "v":
                    values[0] = +(values[0] - y);
                    break;
                case "m":
                    mx = values[0];
                    my = values[1];
                default:
                    // other commands
                    if (values.length) {
                        for (let v = 0; v < values.length; v++) {
                            // even value indices are y coordinates
                            values[v] = values[v] - (v % 2 ? y : x);
                        }
                    }
            }
        }
        // is already relative
        else {
            if (type == "m") {
                mx = values[0] + x;
                my = values[1] + y;
            }
        }
        let vLen = values.length;
        switch (type) {
            case "z":
                x = mx;
                y = my;
                break;
            case "h":
                x += values[vLen - 1];
                break;
            case "v":
                y += values[vLen - 1];
                break;
            default:
                x += values[vLen - 2];
                y += values[vLen - 1];
        }
        // round final relative values
        if (decimals > -1) {
            com.values = com.values.map(val => { return +val.toFixed(decimals) });
        }
    }
    return pathData;
}

function pathDataToAbsolute(pathData, decimals = -1) {


    let M = pathData[0].values;
    let x = M[0],
        y = M[1],
        mx = x,
        my = y;

    // loop through commands
    for (let i = 1, len = pathData.length; i < len; i++) {
        let com = pathData[i];

        let { type, values } = com;
        let typeAbs = type.toUpperCase();

        if (type != typeAbs) {
            type = typeAbs;
            com.type = type;
            // check current command types
            switch (typeAbs) {
                case "A":
                    values[5] = +(values[5] + x);
                    values[6] = +(values[6] + y);
                    break;

                case "V":
                    values[0] = +(values[0] + y);
                    break;

                case "H":
                    values[0] = +(values[0] + x);
                    break;

                case "M":
                    mx = +values[0] + x;
                    my = +values[1] + y;

                default:
                    // other commands
                    if (values.length) {
                        for (let v = 0; v < values.length; v++) {
                            // even value indices are y coordinates
                            values[v] = values[v] + (v % 2 ? y : x);
                        }
                    }
            }
        }
        // is already absolute
        let vLen = values.length;
        switch (type) {
            case "Z":
                x = +mx;
                y = +my;
                break;
            case "H":
                x = values[0];
                break;
            case "V":
                y = values[0];
                break;
            case "M":
                mx = values[vLen - 2];
                my = values[vLen - 1];

            default:
                x = values[vLen - 2];
                y = values[vLen - 1];
        }
        // round final absolute values
        if (decimals > -1) {
            com.values = com.values.map(val => { return +val.toFixed(decimals) });
        }
    }
    return pathData;
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

    pathData = test && hasRel ? pathDataToAbsolute(pathData, decimals) : pathData;

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

    //pathData = JSON.parse(JSON.stringify(pathData))
    //console.log('has dec', pathData);

    /** 
    * analyze pathdata – if you're sure your data is already absolute skip it via test=false
    */
    let hasRel;
    if (test) {
        let commandTokens = pathData.map(com => { return com.type }).join('');
        hasRel = /[astvqmhlc]/g.test(commandTokens);
    }

    pathData = test && hasRel ? pathDataToAbsolute(pathData, decimals) : pathData;

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


    // create data object
    let arcData = {
        cx: 0,
        cy: 0,
        // rx/ry values may be deceptive in arc commands
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

    let shortcut = true;
    //console.log('short');

    if (rx === ry && shortcut) {

        // test semicircles
        let diffX = Math.abs(x2 - x1);
        let diffY = Math.abs(y2 - y1);
        let r = diffX;

        let xMin = Math.min(x1, x2),
            yMin = Math.min(y1, y2),
            PIHalf = Math.PI * 0.5;


        // semi circles
        if (diffX === 0 && diffY || diffY === 0 && diffX) {
            //console.log('semi');

            r = diffX === 0 && diffY ? diffY / 2 : diffX / 2;
            arcData.rx = r;
            arcData.ry = r;

            // verical
            if (diffX === 0 && diffY) {
                arcData.cx = x1;
                arcData.cy = yMin + diffY / 2;
                arcData.startAngle = y1 > y2 ? PIHalf : -PIHalf;
                arcData.endAngle = y1 > y2 ? -PIHalf : PIHalf;
                arcData.deltaAngle = sweep ? Math.PI : -Math.PI;

            }
            // horizontal
            else if (diffY === 0 && diffX) {
                arcData.cx = xMin + diffX / 2;
                arcData.cy = y1;
                arcData.startAngle = x1 > x2 ? Math.PI : 0;
                arcData.endAngle = x1 > x2 ? -Math.PI : Math.PI;
                arcData.deltaAngle = sweep ? Math.PI : -Math.PI;
            }

            //console.log(arcData);
            return arcData;
        }
    }

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

//import { parse, convertPathData } from './pathdata/parse';
//import { canFlattenTo2D, flattenTo2D } from '../getMatrix';
//import { canFlattenTo2D, flattenTo2D } from '../getMatrix';
//import * as MatriXYZ from 'MatriXYZ';
//import {transformPoint3D, transformPoint2D, canFlattenTo2D, flattenTo2D } from 'MatriXYZ';


MatriXYZ.Mtx.prototype.transformPathData = function (pts, decimals=8) {
    let ptsT = MatriXYZ.transformPathData(pts, this.matrix, this.perspectiveOrigin, this.perspective, decimals);
    this.ptsT = ptsT;
    return ptsT;
};


/**
 * scale pathData2
 */
function transformPathData(pathData, matrix, perspectiveOrigin = { x: 0, y: 0 }, perspective = Infinity, decimals = -1) {

    pathData = Array.isArray(pathData) ? pathData : MatriXYZ.parse(pathData).pathData;

    // normalize
    pathData = MatriXYZ.convertPathData(pathData, {toAbsolute:true, toLonghands:true});

    // new pathdata
    let pathDataTrans = [];
    let is3D = Object.values(matrix).length === 16;
    let canFlatten = false;


    //check if 3D matrix could be expressed by a 2D one
    if (is3D) canFlatten = MatriXYZ.canFlattenTo2D(matrix, perspective);
    if (canFlatten) {
        is3D = false; matrix = MatriXYZ.flattenTo2D(matrix, perspective);
    }

    //console.log(matrix);


    // convert arcs for 3D transforms
    if (is3D) {
        let options = { arcToCubic: true };
        pathData = MatriXYZ.convertPathData(pathData, options);
    }


    const transformArc = (p0, values, matrix) => {
        let [rx, ry, angle, largeArc, sweep, x, y] = values;


        /**
         * Based on: https://github.com/fontello/svgpath/blob/master/lib/ellipse.js
         * and fork: https://github.com/kpym/SVGPathy/blob/master/lib/ellipse.js
         */
        const transformEllipse2D = (rx, ry, ax, matrix) => {
            const torad = Math.PI / 180;
            const epsilon = 1e-7;


            // We consider the current ellipse as image of the unit circle
            // by first scale(rx,ry) and then rotate(ax) ...
            // So we apply ma =  m x rotate(ax) x scale(rx,ry) to the unit circle.
            var c = Math.cos(ax * torad),
                s = Math.sin(ax * torad);
            var ma = [
                rx * (matrix.a * c + matrix.c * s),
                rx * (matrix.b * c + matrix.d * s),
                ry * (-matrix.a * s + matrix.c * c),
                ry * (-matrix.b * s + matrix.d * c)
            ];

            // ma * transpose(ma) = [ J L ]
            //                      [ L K ]
            // L is calculated later (if the image is not a circle)
            var J = ma[0] * ma[0] + ma[2] * ma[2],
                K = ma[1] * ma[1] + ma[3] * ma[3];

            // the sqrt of the discriminant of the characteristic polynomial of ma * transpose(ma)
            // this is also the geometric mean of the eigenvalues
            var D = Math.sqrt(
                ((ma[0] - ma[3]) * (ma[0] - ma[3]) + (ma[2] + ma[1]) * (ma[2] + ma[1])) *
                ((ma[0] + ma[3]) * (ma[0] + ma[3]) + (ma[2] - ma[1]) * (ma[2] - ma[1]))
            );

            // the arithmetic mean of the eigenvalues
            var JK = (J + K) / 2;

            // check if the image is (almost) a circle
            if (D <= epsilon) {
                rx = ry = Math.sqrt(JK);
                ax = 0;
                return { rx: rx, ry: ry, ax: ax };
            }

            // check if ma * transpose(ma) is (almost) diagonal
            if (Math.abs(D - Math.abs(J - K)) <= epsilon) {
                rx = Math.sqrt(J);
                ry = Math.sqrt(K);
                ax = 0;
                return { rx: rx, ry: ry, ax: ax };
            }

            // if it is not a circle, nor diagonal
            var L = ma[0] * ma[1] + ma[2] * ma[3];

            // {l1,l2} = the two eigen values of ma * transpose(ma)
            var l1 = JK + D / 2,
                l2 = JK - D / 2;

            // the x - axis - rotation angle is the argument of the l1 - eigenvector
            if (Math.abs(L) <= epsilon && Math.abs(l1 - K) <= epsilon) {
                // if (ax == 90) => ax = 0 and exchange axes
                ax = 0;
                rx = Math.sqrt(l2);
                ry = Math.sqrt(l1);
                return { rx: rx, ry: ry, ax: ax };
            }

            ax =
                Math.atan(Math.abs(L) > Math.abs(l1 - K) ? (l1 - J) / L : L / (l1 - K)) /
                torad; // the angle in degree

            // if ax > 0 => rx = sqrt(l1), ry = sqrt(l2), else exchange axes and ax += 90
            if (ax >= 0) {
                // if ax in [0,90]
                rx = Math.sqrt(l1);
                ry = Math.sqrt(l2);
            } else {
                // if ax in ]-90,0[ => exchange axes
                ax += 90;
                rx = Math.sqrt(l2);
                ry = Math.sqrt(l1);
            }

            return { rx: rx, ry: ry, ax: ax };
        };


        /**
        * parametrize arc command 
        * to get the actual arc params
        */
        let arcData = MatriXYZ.svgArcToCenterParam(
            p0.x,
            p0.y,
            values[0],
            values[1],
            angle,
            largeArc,
            sweep,
            x,
            y
        );
        ({ rx, ry } = arcData);
        let { a, b, c, d, e, f } = matrix;

        let ellipsetr = transformEllipse2D(rx, ry, angle, matrix);
        let p = MatriXYZ.transformPoint2D({ x: x, y: y }, matrix);
        //let p = transformPoint2D({ x: x, y: y }, matrix);

        // adjust sweep if flipped
        let denom = a ** 2 + b ** 2;
        let scaleX = Math.sqrt(denom);
        let scaleY = (a * d - c * b) / scaleX;

        let flipX = scaleX < 0 ? true : false;
        let flipY = scaleY < 0 ? true : false;


        // adjust sweep
        if (flipX || flipY) {
            sweep = sweep === 0 ? 1 : 0;
        }

        return {
            type: 'A',
            values: [
                ellipsetr.rx,
                ellipsetr.ry,
                ellipsetr.ax,
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

    pathData.forEach((com, i) => {
        let { type, values } = com;
        let typeRel = type.toLowerCase();
        let comPrev = i > 0 ? pathData[i - 1] : pathData[i];
        let comPrevValues = comPrev.values;
        let comPrevValuesL = comPrevValues.length;
        let p0 = {
            x: comPrevValues[comPrevValuesL - 2],
            y: comPrevValues[comPrevValuesL - 1]
        };
        ({ x: values[values.length - 2], y: values[values.length - 1] });
        let comT = { type: type, values: [] };

        switch (typeRel) {
            case "a":
                comT = transformArc(p0, values, matrix);
                break;

            default:
                // all other point based commands
                if (values.length) {
                    for (let i = 0; i < values.length; i += 2) {
                        let ptTrans = !is3D ? MatriXYZ.transformPoint2D(
                            { x: com.values[i], y: com.values[i + 1] },
                            matrix
                        ) : MatriXYZ.transformPoint3D(
                            { x: com.values[i], y: com.values[i + 1] },
                            matrix, perspectiveOrigin, perspective
                        );

                        comT.values[i] = ptTrans.x;
                        comT.values[i + 1] = ptTrans.y;

                    }
                }
        }

        pathDataTrans.push(comT);
    });


    return pathDataTrans;

}

exports.convertPathData = convertPathData;
exports.parse = parse;
exports.pathDataToD = pathDataToD;
exports.roundPathData = roundPathData;
exports.svgArcToCenterParam = svgArcToCenterParam;
exports.transformPathData = transformPathData;
