/**
 * create hull for arc segment
 */



export function getEllipeHull(cx, cy, rx, ry, xAxisRotation) {


    // xAxisRotation is input as radians not degrees!

    // if rx = ry we can ignore xAxisRotation
    if(rx===ry) xAxisRotation;

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
    }

    // adjust angles for corner rotation
    let angleadjust = xAxisRotation > 0 ? Math.PI/-2 : Math.PI/2;
    //angleadjust=0

    // to radian
    xAxisRotation = xAxisRotation ? xAxisRotation + angleadjust : 0

    //console.log('xAxisRotation1', (xAxisRotation), (xAxisRotation*180/Math.PI) , 'angleadjust:', angleadjust, 'angleadjust degree:',(angleadjust*180/Math.PI) );


    //xAxisRotation = xAxisRotation * Math.PI / 180

    let pt1 = rotatePt({ x: cx - rx, y: cy - ry }, cx, cy, -xAxisRotation)
    let pt2 = rotatePt({ x: cx + rx, y: cy - ry }, cx, cy, -xAxisRotation)
    let pt3 = rotatePt({ x: cx + rx, y: cy + ry }, cx, cy, -xAxisRotation)
    let pt4 = rotatePt({ x: cx - rx, y: cy + ry }, cx, cy, -xAxisRotation)

    //{x:cx, y:cy}
    return [pt1, pt2, pt3, pt4]
}





/**
 * create hull matrix
 * from quadrilateral
 * http://chrisjones.id.au/Ellipses/ellipse.html
 */
export function getConvexHullMatrix(pts) {
    let decimals = 2
    let ptsRound = pts.map(pt => { return { x: +pt.x.toFixed(decimals), y: +pt.y.toFixed(decimals) } });
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
    }

    //matrix = matrix.map(key=>{return {x:+pt.x.toFixed(decimals), y:+pt.y.toFixed(decimals)} });
    //Object.values(matrix).forEach()


    // round
    Object.entries(matrix).forEach(function(e){
      // e[0] is the key and e[1] is the value
      let n = Number(e[1]);
      if (!isNaN(n)) {
       //matrix[e[0]] = +n.toFixed(decimals);
      }
    })

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

export function getEllipseProperties(hullMatrix) {

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



export function renderPoint(
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


export function getPolygonArea(points, tolerance = 0.001) {
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
