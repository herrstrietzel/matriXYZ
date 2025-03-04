import { getMatrix, canFlattenTo2D, flattenTo2D } from './getMatrix';
import { transformPoints } from './transformPoints';
//import { transformPathData } from './pathdata/transformPathData';
import { getCSSTransform } from './getCSS';



export function Mtx({
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
    this.css = getCSSTransform({ transforms, transFormOrigin, perspectiveOrigin, perspective, force3D })
}


Mtx.prototype.transformPoints = function (pts, decimals=8) {
    let ptsT = transformPoints(pts, this.matrix, this.perspectiveOrigin, this.perspective, this.force3D, decimals)
    this.ptsT = ptsT
    return ptsT;
}





