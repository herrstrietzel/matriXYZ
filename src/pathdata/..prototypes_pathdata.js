import {Mtx} from '../prototypes';
//import { svgArcToCenterParam  } from './geometry.js';



Mtx.prototype.transformPathData = function (pts, decimals=8) {
    let ptsT = MatriXYZ.transformPathData(pts, this.matrix, this.perspectiveOrigin, this.perspective, decimals)
    this.ptsT = ptsT
    return ptsT;
}

