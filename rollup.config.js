import terser from '@rollup/plugin-terser';

const libName = 'mtrXYZ';
//const scriptname = 'matrixyz';
const scriptname = libName.toLowerCase();

export default [
    // Main library (MatriXYZ)
    {
        input: 'src/index.js',
        output: [
            {
                file: `dist/${scriptname}.js`,  // UMD for browsers
                format: 'umd',
                name: `${libName}`
            },
            {
                file: `dist/${scriptname}.min.js`,  // Minified UMD
                format: 'umd',
                name: `${libName}`,
                plugins: [terser()]
            },
            {
                file: `dist/${scriptname}.mjs`,  // ESM for tree-shakable imports
                format: 'esm'
            },
            {
                file: `dist/${scriptname}.cjs`,  // CommonJS for Node.js require()
                format: 'cjs'
            }
        ]
    },
    // Add-on library (MatriXYZ_pathdata)
    {
        input: 'src/index_pathdata.js',
        external: [libName], 
        output: [
            {
                file: `dist/${scriptname}_pathdata.js`,
                format: 'umd',
                name: `${libName}`,
                extend: true,
                globals: {
                    [libName]: libName // Ensure UMD references main library
                }
            },
            {
                file: `dist/${scriptname}_pathdata.min.js`,
                format: 'umd',
                name: `${libName}`,
                extend: true,
                globals: {
                    [libName]: libName
                },
                plugins: [terser()]
            },
            {
                file: `dist/${scriptname}_pathdata.mjs`, // ESM
                format: 'esm'
            },
            {
                file: `dist/${scriptname}_pathdata.cjs`, // CommonJS
                format: 'cjs'
            }
        ]
    }
];
