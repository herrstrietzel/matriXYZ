export function setCSSTransforms(el, transformOptions) {
    let css = getCSSTransform(transformOptions)
    el.setAttribute('style', css);
    el.parentNode.style.perspective = transformOptions.perspective + 'px';
    el.parentNode.style.perspectiveOrigin = `${transformOptions.perspectiveOrigin.x}px ${transformOptions.perspectiveOrigin.y}px`;
}


export function getCSSTransform({
    transforms = [],
    transFormOrigin = { x: 0, y: 0 },
    perspectiveOrigin = { x: 0, y: 0 },
    perspective = 100
} = {}) {
    let css = [];

    //check if 3d or 2D
    let is3d = transforms.filter(trans => {
        let key = Object.keys(trans)[0];
        let vals = Object.values(trans)[0];
        return (key !== 'matrix' && vals.length > 2) || (key === 'matrix' && vals.length === 16)
    }).length > 0;


    let unit = 'px';
    transforms.forEach(t => {
        let prop = Object.keys(t)[0]
        let vals = Object.values(t)[0]

        //add units
        unit = prop === 'rotate' || prop === 'skew' ? 'deg' : (prop === 'scale' || prop === 'matrix' ? '' : 'px');
        let valsN = vals.map((val, v) => {
            return val !== '' ? `${val}${unit}` : ''
        })

        if (is3d) {
            let x, y, z;
            if (prop === 'translate') {
                [x, y = '0px', z = '0px'] = valsN
            } else {
                [x, y = '0deg', z = '0deg'] = valsN
            }

            if (prop === 'matrix') {
                css.push(`${prop}3d(${valsN.join(',')})`)
            }
            else if (prop === 'skew') {
                css.push(`${prop}X(${x}) ${prop}Y(${y})`)
            } else {
                css.push(`${prop}X(${x}) ${prop}Y(${y}) ${prop}Z(${z})`)
            }
        }
        else {
            css.push(`${prop}(${valsN.join(', ')})`)
        }

    })

    let cssParent = `perspective-origin:${perspectiveOrigin.x}px ${perspectiveOrigin.y}px; perspective:${perspective}px;`;

    css = `transform:${css.join(' ')};transform-origin:${transFormOrigin.x}px ${transFormOrigin.y}px;`;
    return {el:css, parent:cssParent}

}
