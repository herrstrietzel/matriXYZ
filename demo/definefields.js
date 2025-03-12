/**
* build ui
*/


let inputs_data = [

    {

        //label: 'Output',
        //type: 'details',
        fields: [

            {
                label:'Load Samples',
                name:'selectSamples',
                type:'select',
                values: [],
                sync: 'inputPoints',
                atts:{
                    // get selects from var
                    'data-source': 'demo/samples.json',
                    //readonly:true
                }
            },


            {
                label: 'Input data',
                name: 'inputPoints',
                type: 'textarea',
                defaults: '',
                atts: {
                    id: 'inputPointsEl',
                    accept: '.svg, .txt, .json, .js',
                    placeholder: 'Enter your input',
                    class: 'input-points code brd-non scrollbar scroll-content fnt-siz-0-75em',
                    'data-tools': 'size copy upload'
                }
            },


            {
                name:'optimize',
                label:'Optimize output',
                type: 'checkbox',
                defaults: ['toRelative', 'toShorthands'], 
                //defaults: [], 
                values:{
                    'relative': 'toRelative',
                    'shorthands': 'toShorthands',
                    'arcToCubic': 'arcToCubic',
                }
            },

            {
                name:'decimals',
                label: 'Decimals',
                labelPosition: 'right',
                type: 'number',
                defaults: 3,
                atts:{
                    min:0,
                    max:8
                }
            },

            {
                name: 'pointOutput',
                label: 'Output',
                type: 'textarea',
                defaults: '',
                atts: {
                    //readonly: true,
                    id: 'svgOutput',
                    class: 'input-output code brd-non scrollbar scroll-content fnt-siz-0-75em',
                    'data-file': 'sample.svg',
                    'data-tools': 'size copy download'
                }

            },


            // just a info box
            {
                info: `<h3>Current Matrix</h3><p>
                <code class="--brd --brd-rad  scrollbar scroll-content code fnt-siz-0-75em" id="matrixOutput" readonly>1, 0, 0, 1, 0, 0</code>
                `,
            },



            {
                label:'CSS',
                name: 'cssOutput',
                type:'textarea',
                atts:{
                    readonly:true,
                    class:'brd-non scrollbar scroll-content code fnt-siz-0-75em ',
                    'data-tools':"copy download",
                    'data-file':"font.css",
                    id: 'cssOutput',

                }
            }


        ]
    },

];

let inputs = [


    {
        // just a info box
        info: `<h1 class="h2">MtrXYZ</h1><p>MtrXYZ is a versatile matrix generator for 2D and 3D matrices with point transformation features.</p>`,
    },

    {
        // just a info box
        info: `<p>All number fields can be incremented/decremented by arrow keys or mouse whell controls.Besides, you can add simple calculations such as additions/subtractions or multiplications/devisions by adding operators like so: <code class="code">10 + 5</code></p>`,
    },

    {
        //label:'Reset Settings',
        fields: [
            {
                name:'resetSettings',
                label: 'Reset settings ',
                type:'button',
                atts: {
                    class: 'btn btn-default',
                    'data-icon': 'reload',
                    id:'btnReset'
                }
            },

        ]
    },


    {
        label: 'Transformations',
        type: 'details',
        open: true,
        fields: [
            {
                name: 'force3D',
                label: 'Force 3D',
                labelPosition: 'top',
                type: 'checkbox',
                info: `Will apply a 3D matrix – even if it could be represented by a 2D matrix.`,
                defaults: true,
                atts: {
                    class: 'inputTrans',
                    'checked': true
                },
                /*
                values:{
                    true: true,

                }
                */
            },

            {
                name: 'translate',
                label: 'Translate',
                labelPosition: 'top',
                type: 'number',
                defaults: 0,
                atts: {
                    class: 'inputTrans',
                    min: -100,
                    max: 100,
                    step: 1
                },
                values: {
                    X: 0,
                    Y: 0,
                    Z: 0
                }
            },

            {
                name: 'rotate',
                label: 'Rotate',
                labelPosition: 'top',
                type: 'number',
                defaults: 45,
                atts: {
                    class: 'inputTrans',
                    min: -180,
                    max: 180,
                    step: 0.2
                },
                values: {
                    X: 0,
                    Y: 0,
                    Z: 0
                }
            },

            {
                name: 'skew',
                label: 'Skew',
                labelPosition: 'top',
                type: 'number',
                defaults: 0,
                atts: {
                    class: 'inputTrans',
                    min: -180,
                    max: 180,
                    step: 0.2
                },
                values: {
                    X: 0,
                    Y: 0
                }
            },


            {
                name: 'scale',
                label: 'Scale',
                labelPosition: 'top',
                type: 'number',
                //info: `Scales the elements like CSS <code>scaleX()</code> function`,
                title: 'scale',
                addNumField: true,
                //listener: 'change',
                defaults:[1,1,1],
                atts: {
                    class: '',
                    min: -5,
                    max: 5,
                    step: 0.1,
                    class: 'inputTrans',
                },

                values: {
                    X: 1,
                    Y: 1,
                    Z: 1
                }
            },
        ]
    },
    {
        label: 'Perspective Settings',
        type: 'details',
        open: true,
        info: `<p>Sets perspective for 2D projection.</p>`,

        fields: [

            {
                label: 'Perspective',
                name: 'perspective',
                type: 'range',
                labelPosition: 'top',
                defaults: 100,
                atts: {
                    class: 'inputTrans',
                    min: 75,
                    max: 1000,
                    step: 1
                }
            },

            {
                label: 'Perspective origin',
                name: 'perspectiveOrigin',
                type: 'number',
                //labelPosition:'top',
                //defaults: 100,
                values: {
                    'X': 50,
                    'Y': 50
                },
                atts: {
                    min: 0,
                    max: 500,
                    step: 1,
                    class: 'inputTrans',
                }
            },
            {
                label: 'Transform origin',
                name: 'transformOrigin',
                type: 'number',
                values: {
                    X: 50,
                    Y: 50
                },
                atts: {
                    class: 'inputTrans',
                    min: 0,
                    max: 500,
                    step: 1
                }
            },
        ]
    }


];