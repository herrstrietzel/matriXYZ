
let localStorageName = 'settings_matrixyz';
let padding= 100;
let settings

(async ()=>{

    settings = await generateFilterInputs(inputs, {}, localStorageName);

    //inputs settings2
    settings = await generateFilterInputs(inputs_data, settings, localStorageName);
    //console.log(inputs_data);
    
    
    //appendInputs(inputs, ['scaleX', 'scaleY'], inpTransforms);
    appendInputs(inputs, [], optionsWrp, localStorageName);
    appendInputs(inputs_data, [], optionsWrp2, localStorageName);
    
    // init
    update(settings)
    adjustViewBox(svg, padding)

    
    document.addEventListener('settingsChange', () => {
        //console.log('Data changed:', settings);
        update(settings)
    });
    


})();






// Example usage:
let div = document.createElement('div')
// ;
let cssTransform = "transform: matrix(1.2, 0.2, -1, 0.9, 0, 20) matrix3d(-0.6, 1.34788, 0, 0, -2.34788, -0.6, 0, 0, 0, 0, 1, 0, 0, 0, 10, 1) rotate(30deg) scale(2, 1.5) translate(50px, 100px) rotate3d(1, 1, 1, 45deg) rotateX(-0.5turn);transform-origin:2px 4px; perspective:150px; perspective-origin:10px 12px";

cssTransform = "transform:translate(0px, 0px) translateZ(0px)  rotateX(0deg) rotateY(0deg) rotateZ(0deg)  skewX(20deg) skewY(20deg) scale3D(0.5, 0.25, 1) ";

//scale3D(1, 1, 1)
//scale3D(1.5, 2, 1.66)
//scale3D(0.5, 1, 0.5)
//skewX(12deg) skewY(33deg)

//div.style.transform=cssTransform;
div.style=cssTransform;
div.classList.add('trans')
document.body.append(div)
let m = window.getComputedStyle(div).transform;
let parsedTransform = mtrXYZ.parseCSSTransform(cssTransform);

//console.log('parsedTransform', parsedTransform);
//console.log('parsed:', m);

let matrix3D = new mtrXYZ.Mtx(cssTransform);
//console.log( Object.values(matrix3D.matrix).map(val=>{return+val.toFixed(5)}), 'cssMatrix', m );

let transformDecomp = mtrXYZ.qrDecomposeMatrix3D(matrix3D.matrix)


// consolidated
let newCss = transformDecomp.cssTransform
let div2 = document.createElement('div')
div2.style.transform=newCss;
div2.classList.add('trans2')

document.body.append(div2)
let m2 = window.getComputedStyle(div2).transform;


//console.log('transformDecomp',m2, transformDecomp);












function update(settings) {


    let { translateX, translateY, translateZ, skewX, skewY, scaleX, scaleY, scaleZ, rotateX, rotateY, rotateZ, transformOriginX, transformOriginY, perspectiveOriginX, perspectiveOriginY, perspective, force3D, inputPoints } = settings;


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
    let matrix = new mtrXYZ.Mtx(transformOptions);


    //console.log(matrix);
    //matrixOutput.textContent = Object.values(matrix.matrix).map(val=>{return +val.toFixed(3)}).join(', ')
    matrixOutput.textContent = JSON.stringify(matrix.matrix)


    cssOutput.value = 
    `//element style
    .element {
        ${matrix.css.el} 
    }

    //parent style
    .parent{
        ${matrix.css.parent}
    }`;


    /**
     * current point data
     */
    let inputData 
    
    try{
        inputData = JSON.parse(inputPoints);

    } catch{
        inputData = inputPoints;
    }
    

    let points;
    let isPointArray = false
    let isPathData = false

    if(Array.isArray(inputData)){
        points = inputData
        isPointArray = true;
    }

    else if(  typeof inputData === 'string'){

        // not path data
        if ( !inputData.includes('M') || !inputData.includes('m') ) {

            points = inputData.split(' ').reduce((acc, value, index) => {
                if (index % 2 === 0) {
                  // Create a new pair
                  acc.push([value]);
                } else {
                  // Add the second value to the last pair
                  acc[acc.length - 1].push(value);
                }
                return acc;
              }, []);
              isPointArray = true;
        }

        if ( inputData.includes('M') || inputData.includes('m') ) {
            isPathData = true;
            points = inputData;
        }

    }


    //let decimals = 3
    let {decimals, toRelative,  toShorthands, arcToCubic} = settings;
    let {parse, convertPathData, pathDataToD} = mtrXYZ;
    let pathData;


    // transform points
    let ptsTransformed, pathDataTransformed
    

    if(points){
        if(isPathData){

            // parse to array
            pathData = parse(points).pathData;

            // optionally convert before to cubics
            if(arcToCubic){
                pathData = convertPathData(pathData, {arcToCubic:true})
            }
            pathDataTransformed = matrix.transformPathData(pathData)
        }else{
            ptsTransformed = matrix.transformPoints(points, decimals)
        }
    }
    
    //render
    let d; 

    if(isPathData){
        let pathDataOpt = convertPathData(pathDataTransformed, {decimals:decimals, toRelative:toRelative, toShorthands:toShorthands, arcToCubic:arcToCubic})
        d = pathDataToD(pathDataOpt, 2)
    }
    
    else if(isPointArray){
        d = 'M'+ptsTransformed.map(pt=>{ return [pt.x, pt.y]}).flat().join(' ');
    }


    //console.log('M' + pointAtt)
    path.setAttribute("d", d);
    let selectSamplesEl = document.querySelector('select[name=selectSamples]')

    
    if(selectSamplesEl){
        selectSamplesEl.addEventListener('input', e=>{
            //console.log('change');
            adjustViewBox(svg, padding)
        })
    }

    if(inputPointsEl){
        inputPointsEl.addEventListener('input', e=>{
            //console.log('change');
            adjustViewBox(svg, padding)
        })
    }

    // show output
    svgOutput.value = !isPathData ? JSON.stringify(ptsTransformed, null, ' ' ): d
    svgOutput.dispatchEvent(new Event('change'))

}


function adjustViewBox(svg, padding=0, decimals=3) {
    let bb = svg.getBBox();
    let [x, y, width, height] = [bb.x, bb.y, bb.width, bb.height];

    if(padding){
        let dimMax = Math.max(width+padding, height+padding)
        x-=(dimMax-width)/2
        y-=(dimMax-height)/2
        width=dimMax
        height=dimMax
    }

    svg.setAttribute("viewBox", [x, y, width, height].map(val=> {return +val.toFixed(decimals)}).join(" "));
}
