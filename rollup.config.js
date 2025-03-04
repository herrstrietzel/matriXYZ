import terser from '@rollup/plugin-terser';

const libName = 'MatriXYZ';

export default [
    // Main library (MatriXYZ)
    {
        input: 'src/index.js',
        output: [
            {
                file: `dist/${libName}.js`,  // UMD for browsers
                format: 'umd',
                name: `${libName}`
            },
            {
                file: `dist/${libName}.min.js`,  // Minified UMD
                format: 'umd',
                name: `${libName}`,
                plugins: [terser()]
            },
            {
                file: `dist/${libName}.mjs`,  // ESM for tree-shakable imports
                format: 'esm'
            },
            {
                file: `dist/${libName}.cjs`,  // CommonJS for Node.js require()
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
                file: `dist/${libName}_pathdata.js`,
                format: 'umd',
                name: `${libName}`,
                extend: true,
                globals: {
                    [libName]: libName // Ensure UMD references main library
                }
            },
            {
                file: `dist/${libName}_pathdata.min.js`,
                format: 'umd',
                name: `${libName}`,
                extend: true,
                globals: {
                    [libName]: libName
                },
                plugins: [terser()]
            },
            {
                file: `dist/${libName}_pathdata.mjs`, // ESM
                format: 'esm'
            },
            {
                file: `dist/${libName}_pathdata.cjs`, // CommonJS
                format: 'cjs'
            }
        ]
    }
];
