# matriXYZ
A helper for 3D and 2D matrix transformations 

## Usage

### Install
```
<script src="dist/matriXYZ.js" defer></script>
```

If you need to transform SVG path data please also load the pathdata addon

```
<script src="dist/matriXYZ_pathdata.js" defer></script>
```



### Create Matrix

MatriXYZ replicates CSS transformation properties allowing multiple chained tranformations. 
Basically, you use the typical main transformation properties:  

* translate
* scale
* skew
* rotate 

Besides, you can specify a `transform-origin` as well as a `perspective-origin` and `perspective` value fo a full 3D transformation projection.



```
// create 3D transformation object
let transformOptions = {
    // add chainable option analogous to CSS
    transforms: [
        { translate: [translateX, translateY, translateZ] },
        { scale: [scaleX, scaleY, scaleZ] },
        { skew: [skewX, skewY] },
        { rotate: [rotateX, rotateY, rotateZ] },
    ],
    transFormOrigin: { x: transformOriginX, y: transformOriginY },
    perspectiveOrigin: { x: perspectiveOriginX, y: perspectiveOriginY },
    perspective: perspective,
    force3D: force3D
}

/**
* create matrix
*/
let matrix = new MatriXYZ.Mtx(transformOptions);

```

The above example creates a 3D matrix based on the specified parameters.  
`new MatriXYZ.Mtx(transformOptions)` creates a custom matrix object we can reuse for point projections.

### Point transformation/projection

Once we got a matrix, we can apply it to multiple point arrays like:  
* point object arrays `[{x:10, y:10, z:10}]` – yeah 3D points are supported
* nested point  arrays `[[10, 10]]`
* SVG pathData like  `M20.1 120.8 L20.1 120.8 Q11.2 120.8 5.6 117.4 Q0 114 0 107.7` – requires the pathdata addon


#### Get tranformed/projected points
```

let points = [[50,85.2],[83.4,57.4],[95.4,43],[100,25],[92.7,7.4],[75,0.1],[57.3,7.4],[50,25],[42.7,7.4],[25,0.1],[7.3,7.4],[0,25],[4.5,43.1],[16.6,57.4],[50,85.2]];

let ptsTransformed = matrix.transformPoints(points, decimals)
```

#### Get tranformed/projected SVG pathData
```
let pathdata = 'M50 85.2 83.4 57.4 95.4 43 100 25 92.7 7.4 75 0.1 57.3 7.4 50 25 42.7 7.4 25 0.1 7.3 7.4 0 25 4.5 43.1 16.6 57.4 50 85.2'
let pathDataTransformed = matrix.transformPathData(pathdata, decimals)

// optimize output
let options = {
    // round to decimals
    decimals:3, 

    // convert to relative commands
    toRelative:true, 

    // try to apply shorthand commands
    toShorthands:true, 

    // convert arcs to cubic beziers (automatically applied for 3D transforms)
    arcToCubic:false
}
let pathDataOpt = MatriXYZ.pathDataToD(pathDataTransformed, options)


// stringify to d attribute
let d = MatriXYZ.pathDataToD(pathDataOpt)

```




#### Order of tranformations matters!
We use the same logic as CSS – so transformations are applied from right(last) to left(first). 
This also allows you to chain transforms the same way as in CSS.  

```
// 2D transformation
let transformOptions = {
    transforms: [
        { translate: [10, 30] },
        { scale: [1.5, 1.75] },
        { skew: [10, 15] },
        { rotate: [45] },
        // 2nd translate
        { translate: [5, 8] },
    ],
}
```
translates to CSS:

```
transform: translateX(10px) translateY(30px) scaleX(1.5) scaleY(1.75) rotate(45deg) translateX(5px) translateY(8px);
```

All properties support 2D and 3D structures – so 1 to 3 values.  
CSS only supports `skewX` and `skewY` – so there is no `skewZ`.
A single value for rotate is automatically interpreted as `rotateZ` – resulting in a 2D rotation.  


## Credits

* Jarek Foksa for his [great polyfill](https://github.com/jarek-foksa/path-data-polyfill) heavily inspring to adopt the new pathData interface methodology and for contributing to the specification
* Dmitry Baranovskiy for (raphael.j/snap.svg) [pathToAbsolute/Relative functions](https://github.com/DmitryBaranovskiy/raphael/blob/master/raphael.js#L1848) 
* Vitaly Puzrin (fontello) for the arc to cubic conversion method  [a2c.js](https://github.com/fontello/svgpath/blob/master/lib/a2c.js) and [cubic to quadratic approximation](https://github.com/fontello/cubic2quad/blob/master/test/cubic2quad.js) as well as the [2D transformation of elliptic arcs](https://github.com/fontello/svgpath/blob/master/lib/ellipse.js)
* Mike "POMAX" Kammermans for his great [A Primer on Bézier Curves](https://pomax.github.io/bezierinfo)


