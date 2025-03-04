
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
        console.log('Data changed:', settings);
        update(settings)
    });
    


})();



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
    let matrix = new MatriXYZ.Mtx(transformOptions);


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


    // transform points
    let ptsTransformed, pathDataTransformed
    

    if(points){
        if(isPathData){
            //console.log(points);
            pathDataTransformed = matrix.transformPathData(points, decimals)
        }else{
            ptsTransformed = matrix.transformPoints(points, decimals)
        }
    }
    
    //render
    let d; 

    if(isPathData){
        let {convertPathData, pathDataToD} = MatriXYZ;
        let pathDataOpt = convertPathData(pathDataTransformed, {decimals:decimals, toRelative:toRelative, toShorthands:toShorthands, arcToCubic:arcToCubic})
        d = pathDataToD(pathDataOpt)
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
