(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.mtrXYZ = {}));
})(this, (function (exports) { 'use strict';

  function normalizeTo3DMatrix(matrix) {

      let vals = Object.values(matrix);
      if (vals.length === 16) {
          return matrix
      }

      else if (matrix.length < 6) {
          throw new Error("Invalid 2D matrix: Must have exactly 6 elements.");
      }


      let matrix3D = {
          a: matrix.a,
          b: matrix.b,
          c: 0,
          d: 0,
          e: matrix.c,
          f: matrix.d,
          g: 0,
          h: 0,
          i: 0,
          j: 0,
          k: 1,
          l: 0,
          m: matrix.e,
          n: matrix.f,
          o: 0,
          p: 1
      };

      //console.log('converted', matrix3D);
      return matrix3D;

  }




  /**
   * parse CSS string to
   * transform property object
   */

  function parseCSSTransform(transformString) {
      let transformOptions = {
          transforms: [],
          transformOrigin: { x: 0, y: 0 },
          perspectiveOrigin: { x: 0, y: 0 },
          perspective: 0,
      };

      let regex = /(\w+)\(([^)]+)\)/g;
      let match;

      function convertToDegrees(value) {
          if (typeof value === 'string') {
              if (value.includes('rad')) {
                  return parseFloat(value) * (180 / Math.PI);
              } else if (value.includes('turn')) {
                  return parseFloat(value) * 360;
              }
          }
          return parseFloat(value);
      }

      while ((match = regex.exec(transformString)) !== null) {
          let name = match[1];
          let values = match[2].split(/,\s*/).map(v => convertToDegrees(v));

          switch (name) {

              case 'translate':
                  transformOptions.transforms.push({ translate: [values[0] || 0, values[1] || 0] });
                  break;

              case 'translate3D':
                  transformOptions.transforms.push({ translate: [values[0] || 0, values[1] || 0, values[2] || 0] });
                  break;

              case 'translateX':
                  transformOptions.transforms.push({ translate: [values[0] || 0, 0, 0] });
                  break;

              case 'translateY':
                  transformOptions.transforms.push({ translate: [0, values[0] || 0, 0] });
                  break;

              case 'translateZ':
                  transformOptions.transforms.push({ translate: [0, 0, values[0] || 0] });
                  break;

              case 'scale':
                  transformOptions.transforms.push({ scale: [values[0] || 0, values[1] || 0] });
                  break;

              case 'scale3D':
                  transformOptions.transforms.push({ scale: [values[0] || 1, values[1] || values[0] || 1, values[2] || 1] });
                  break;

              case 'skew':
                  transformOptions.transforms.push({ skew: [values[0] || 0, values[1] || 0] });
                  break;

              case 'skewX':
                  transformOptions.transforms.push({ skew: [values[0] || 0, 0] });
                  break;

              case 'skewY':
                  transformOptions.transforms.push({ skew: [0, values[0] || 0] });
                  break;


              case 'rotate':
                  transformOptions.transforms.push({ rotate: [0, 0, values[0] || 0] });
                  break;
              case 'rotateX':
                  transformOptions.transforms.push({ rotate: [values[0] || 0, 0, 0] });
                  break;
              case 'rotateY':
                  transformOptions.transforms.push({ rotate: [0, values[0] || 0, 0] });
                  break;
              case 'rotateZ':
                  transformOptions.transforms.push({ rotate: [0, 0, values[0] || 0] });
                  break;
              case 'rotate3d':
                  let x = values[0] || 0, y = values[1] || 0, z = values[2] || 0, angle = values[3] || 0;
                  let magnitude = Math.sqrt(x * x + y * y + z * z);
                  if (magnitude > 0) {
                      x /= magnitude;
                      y /= magnitude;
                      z /= magnitude;
                  }
                  let cosA = Math.cos(angle * Math.PI / 180);
                  let sinA = Math.sin(angle * Math.PI / 180);
                  let t = 1 - cosA;
                  let rotateX = Math.atan2(y * sinA - z * t * x, 1 - (y * y + z * z) * t) * 180 / Math.PI;
                  let rotateY = Math.asin(z * sinA + x * t * y) * 180 / Math.PI;
                  let rotateZ = Math.atan2(x * sinA - y * t * z, 1 - (x * x + z * z) * t) * 180 / Math.PI;
                  transformOptions.transforms.push({ rotate: [rotateX, rotateY, rotateZ] });
                  break;
              case 'perspective':
                  transformOptions.perspective = values[0] || 0;
                  break;
              case 'matrix':
              case 'matrix3d':
                  transformOptions.transforms.push({ matrix: values });
                  break;
          }
      }

      // Extract transform-origin, perspective-origin, and perspective if included as separate properties
      let styleProperties = transformString.split(/;\s*/);
      styleProperties.forEach(prop => {
          let [key, value] = prop.split(':').map(s => s.trim());
          if (key === 'transform-origin' || key === 'perspective-origin') {
              let [x, y] = value.split(/\s+/).map(parseFloat);
              if (key === 'transform-origin') {
                  transformOptions.transformOrigin = { x: x || 0, y: y || 0 };
              } else {
                  transformOptions.perspectiveOrigin = { x: x || 0, y: y || 0 };
              }
          } else if (key === 'perspective') {
              transformOptions.perspective = parseFloat(value) || 0;
          }
      });

      return transformOptions;
  }



  /**
   * wrapper function to switch between
   * 2D or 3D matrix
   */
  function getMatrix({
      transforms = [],
      transFormOrigin = { x: 0, y: 0 },
      perspectiveOrigin = { x: 0, y: 0 },
      perspective = 100,
      force3D = false
  } = {}) {

      let matrix;

      //check if 3d or 2D
      let is3d = force3D ? true : has3Dtransforms(transforms);


      matrix = is3d ? getMatrix3D(transforms, transFormOrigin) : getMatrix2D(transforms, transFormOrigin);

      //console.log('is3d', is3d,force3D , matrix);
      return matrix
  }



  /**
   * get 3D matrix
   * respecting the transform origin
   */
  function getMatrix3D(transformations = [], origin = { x: 0, y: 0 }) {

      const multiply = (m1, m2) => ({
          a: m1.a * m2.a + m1.b * m2.e + m1.c * m2.i + m1.d * m2.m,
          b: m1.a * m2.b + m1.b * m2.f + m1.c * m2.j + m1.d * m2.n,
          c: m1.a * m2.c + m1.b * m2.g + m1.c * m2.k + m1.d * m2.o,
          d: m1.a * m2.d + m1.b * m2.h + m1.c * m2.l + m1.d * m2.p,

          e: m1.e * m2.a + m1.f * m2.e + m1.g * m2.i + m1.h * m2.m,
          f: m1.e * m2.b + m1.f * m2.f + m1.g * m2.j + m1.h * m2.n,
          g: m1.e * m2.c + m1.f * m2.g + m1.g * m2.k + m1.h * m2.o,
          h: m1.e * m2.d + m1.f * m2.h + m1.g * m2.l + m1.h * m2.p,

          i: m1.i * m2.a + m1.j * m2.e + m1.k * m2.i + m1.l * m2.m,
          j: m1.i * m2.b + m1.j * m2.f + m1.k * m2.j + m1.l * m2.n,
          k: m1.i * m2.c + m1.j * m2.g + m1.k * m2.k + m1.l * m2.o,
          l: m1.i * m2.d + m1.j * m2.h + m1.k * m2.l + m1.l * m2.p,

          m: m1.m * m2.a + m1.n * m2.e + m1.o * m2.i + m1.p * m2.m,
          n: m1.m * m2.b + m1.n * m2.f + m1.o * m2.j + m1.p * m2.n,
          o: m1.m * m2.c + m1.n * m2.g + m1.o * m2.k + m1.p * m2.o,
          p: m1.m * m2.d + m1.n * m2.h + m1.o * m2.l + m1.p * m2.p
      });

      const translationMatrix = (x, y, z = 0) => ({
          a: 1, b: 0, c: 0, d: 0,
          e: 0, f: 1, g: 0, h: 0,
          i: 0, j: 0, k: 1, l: 0,
          m: x, n: y, o: z, p: 1
      });

      const scalingMatrix = (sx, sy, sz) => ({
          a: sx, b: 0, c: 0, d: 0,
          e: 0, f: sy, g: 0, h: 0,
          i: 0, j: 0, k: sz, l: 0,
          m: 0, n: 0, o: 0, p: 1
      });

      const convert2DMatrixTo3D = (matrix2D) => {
          if (matrix2D.length !== 6) {
              throw new Error("Invalid 2D matrix: Must have exactly 6 elements.");
          }

          return [
              matrix2D[0], matrix2D[1], 0, 0,
              matrix2D[2], matrix2D[3], 0, 0,
              0, 0, 1, 0,
              matrix2D[4], matrix2D[5], 0, 1
          ];
      };



      const angleMatrix = (angle, type) => {
          const toRad = (angle) => angle * Math.PI / 180;
          let rad = toRad(angle), cos, sin, tan;
          if (type === 'rx' || type === 'ry' || type === 'rz') {
              cos = Math.cos(rad), sin = Math.sin(rad);
          } else {
              tan = Math.tan(toRad(angle));
          }
          switch (type) {
              case 'rx': return {
                  a: 1, b: 0, c: 0, d: 0,
                  e: 0, f: cos, g: sin, h: 0,
                  i: 0, j: -sin, k: cos, l: 0,
                  m: 0, n: 0, o: 0, p: 1
              };
              case 'ry': return {
                  a: cos, b: 0, c: -sin, d: 0,
                  e: 0, f: 1, g: 0, h: 0,
                  i: sin, j: 0, k: cos, l: 0,
                  m: 0, n: 0, o: 0, p: 1
              };
              case 'rz': return {
                  a: cos, b: sin, c: 0, d: 0,
                  e: -sin, f: cos, g: 0, h: 0,
                  i: 0, j: 0, k: 1, l: 0,
                  m: 0, n: 0, o: 0, p: 1
              };
              // skewing
              case 'sx':
                  //let tx = Math.tan(toRad(angle));
                  return {
                      a: 1, b: 0, c: 0, d: 0,
                      e: tan, f: 1, g: 0, h: 0,
                      i: 0, j: 0, k: 1, l: 0,
                      m: 0, n: 0, o: 0, p: 1
                  };
              case 'sy':
                  //let ty = Math.tan(toRad(sy));
                  return {
                      a: 1, b: tan, c: 0, d: 0,
                      e: 0, f: 1, g: 0, h: 0,
                      i: 0, j: 0, k: 1, l: 0,
                      m: 0, n: 0, o: 0, p: 1
                  };
          }
      };


      let matrix = {
          a: 1, b: 0, c: 0, d: 0,
          e: 0, f: 1, g: 0, h: 0,
          i: 0, j: 0, k: 1, l: 0,
          m: 0, n: 0, o: 0, p: 1
      };


      // Compensate transform-origin
      if (origin.x !== 0 || origin.y !== 0) {
          matrix = multiply(matrix, translationMatrix(-origin.x, -origin.y));
      }

      for (let i = transformations.length - 1; i >= 0; i--) {
          let t = transformations[i];
          let key = Object.keys(t)[0];
          let values = t[key];
          let x, y, z;

          if (key === "scale") {
              [x, y = 1, z = 1] = values;
              if (x !== 1 || y !== 1) matrix = multiply(matrix, scalingMatrix(x, y, z));
          }

          else if (key === "skew") {
              [x = 0, y = 0] = values;
              if (y) matrix = multiply(matrix, angleMatrix(y, 'sy'));
              if (x) matrix = multiply(matrix, angleMatrix(x, 'sx'));
          }

          else if (key === "rotate") {
              // interpret single rotation as rotateZ
              if (values.length === 1) values = [0, 0, values[0]];
              [x = 0, y = 0, z = 0] = values;
              if (z) matrix = multiply(matrix, angleMatrix(z, 'rz'));
              if (y) matrix = multiply(matrix, angleMatrix(y, 'ry'));
              if (x) matrix = multiply(matrix, angleMatrix(x, 'rx'));
          }

          else if (key === "translate") {
              [x, y = 0, z = 0] = values;
              if (x || y || z) matrix = multiply(matrix, translationMatrix(x, y, z));
          }

          else if (key === "matrix") {

              // normalize to 3D matrix
              values = values.length === 6 ? convert2DMatrixTo3D(values) : values;

              let keys = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p'];
              let obj = Object.fromEntries(keys.map((key, i) => [key, values[i]]));
              matrix = multiply(matrix, obj);

          }

          else {
              throw new Error("Unknown transform type: " + key);
          }
      }

      // Transform origin shift
      if (origin.x || origin.y) matrix = multiply(matrix, translationMatrix(origin.x, origin.y));

      //console.log(matrix);
      return matrix;
  }


  function getMatrix2D(transformations = [], origin = { x: 0, y: 0 }) {

      // Helper function to multiply two 2D matrices
      const multiply = (m1, m2) => ({
          a: m1.a * m2.a + m1.c * m2.b,
          b: m1.b * m2.a + m1.d * m2.b,
          c: m1.a * m2.c + m1.c * m2.d,
          d: m1.b * m2.c + m1.d * m2.d,
          e: m1.a * m2.e + m1.c * m2.f + m1.e,
          f: m1.b * m2.e + m1.d * m2.f + m1.f
      });

      // Helper function to create a translation matrix
      const translationMatrix = (x, y) => ({
          a: 1, b: 0, c: 0, d: 1, e: x, f: y
      });

      // Helper function to create a scaling matrix
      const scalingMatrix = (x, y) => ({
          a: x, b: 0, c: 0, d: y, e: 0, f: 0
      });


      // get skew or rotation axis matrix
      const angleMatrix = (angles, type) => {
          const toRad = (angle) => angle * Math.PI / 180;
          let [angleX, angleY] = angles.map(ang => { return toRad(ang) });
          let m = {};

          if (type === 'rot') {
              let cos = Math.cos(angleX), sin = Math.sin(angleX);
              m = { a: cos, b: sin, c: -sin, d: cos, e: 0, f: 0 };
          } else if (type === 'skew') {
              let tanX = Math.tan(angleX), tanY = Math.tan(angleY);
              m = {
                  a: 1, b: tanY, c: tanX, d: 1, e: 0, f: 0
              };
          }
          return m
      };


      // Start with an identity matrix
      let matrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };


      // Apply transform origin: translate to origin, apply transformations, translate back
      if (origin.x !== 0 || origin.y !== 0) {
          matrix = multiply(matrix, translationMatrix(origin.x, origin.y));
      }

      // Default values for transformations
      const defaults = {
          translate: [0, 0],
          scale: [1, 1],
          skew: [0, 0],
          rotate: [0],
          matrix: [1, 0, 0, 1, 0, 0]
      };


      // Process transformations in the provided order (right-to-left)
      for (const transform of transformations) {
          const type = Object.keys(transform)[0]; // Get the transformation type (e.g., "translate")
          const values = transform[type] || defaults[type]; // Use default values if none provided

          // Destructure values with fallbacks
          let [x, y = defaults[type][1]] = values;

          // Z-rotate as  2d rotation
          if (type === 'rotate' && values.length === 3) {
              x = values[2];
          }

          switch (type) {
              case "matrix":
                  let keys = ['a', 'b', 'c', 'd', 'e', 'f'];
                  let obj = Object.fromEntries(keys.map((key, i) => [key, values[i]]));
                  matrix = multiply(matrix, obj);
                  break;
              case "translate":
                  if (x || y) matrix = multiply(matrix, translationMatrix(x, y));
                  break;
              case "skew":
                  if (x || y) matrix = multiply(matrix, angleMatrix([x, y], 'skew'));
                  break;
              case "rotate":
                  if (x) matrix = multiply(matrix, angleMatrix([x], 'rot'));
                  break;
              case "scale":
                  if (x !== 1 || y !== 1) matrix = multiply(matrix, scalingMatrix(x, y));
                  break;

              default:
                  throw new Error(`Unknown transformation type: ${type}`);
          }
      }

      // Revert transform origin
      if (origin.x !== 0 || origin.y !== 0) {
          matrix = multiply(matrix, translationMatrix(-origin.x, -origin.y));
      }

      //console.log('matrix2D', matrix);
      return matrix;
  }


  function has3Dtransforms(transforms, force3D = false) {

      if (force3D) return true;

      let has3D = false;

      // all transform functions object items
      let compoundTransforms = transforms.filter(trans => {
          let keys = Object.keys(trans);
          return keys.length > 1
      });

      let hasCompound = compoundTransforms.length > 1;
      //console.log(hasCompound);

      if (hasCompound) {
          for (let i = 0; i < singleTransforms.length && !has3D; i++) {
              let trans = singleTransforms[i];
              let keyArr = Object.keys(trans);
              let valArr = Object.values(trans);

              for (let v = 0; v < valArr.length && !has3D; v++) {
                  let vals = valArr[v];
                  let key = keyArr[v];
                  if ((key !== 'matrix' && vals.length > 2) || (key === 'matrix' && vals.length === 16)) has3D = true;
              }
          }
      } else {

          //check if 3d or 2D
          has3D = transforms.filter(trans => {
              let key = Object.keys(trans)[0];
              let vals = Object.values(trans)[0];
              let has3DRotation = key === 'rotate' && vals.length === 3 && (vals[0] !== 0 || vals[1] !== 0);
              let onlyZRotation = key === 'rotate' && vals.length === 3 && vals[0] === 0 && vals[1] === 0 && vals[2] !== 0;

              if (has3DRotation) {
                  return true
              }

              if (onlyZRotation) {
                  return false
              }

              if ((key !== 'matrix' && vals.length > 2 &&
                  ((key !== 'scale' && vals[2] !== 0) || (key === 'scale' && vals[2] !== 1) || (key === 'rotate' && vals[0] !== 0))) ||
                  (key === 'matrix' && vals.length === 16)) {
                  return true
              }

              return false
          }).length > 0;
      }

      return has3D;

  }


  /**
   * Detects if a 3D matrix + perspective can be expressed as a 2D matrix.
   * Returns true if the transformation can be reduced to 2D without significant loss.
   */
  function canFlattenTo2D(matrix) {
      // Extract the basis vectors
      let xAxis = [matrix.a, matrix.e, matrix.i]; // X-axis
      let yAxis = [matrix.b, matrix.f, matrix.j]; // Y-axis
      let zAxis = [matrix.c, matrix.g, matrix.k]; // Z-axis

      // Check if the Z-axis is orthogonal to the X and Y axes
      let dotProductXZ = xAxis[0] * zAxis[0] + xAxis[1] * zAxis[1] + xAxis[2] * zAxis[2];
      let dotProductYZ = yAxis[0] * zAxis[0] + yAxis[1] * zAxis[1] + yAxis[2] * zAxis[2];

      // Check if the Z-axis is aligned with the 2D plane (no X or Y components)
      let isZAxisAligned = zAxis[0] === 0 && zAxis[1] === 0;

      // If the Z-axis is orthogonal to X and Y axes and aligned with the 2D plane, the matrix can be flattened
      return Math.abs(dotProductXZ) < 1e-6 && Math.abs(dotProductYZ) < 1e-6 && isZAxisAligned;
  }


  /**
   * Flattens a 3D transformation matrix into a 2D matrix approximation.
   * Removes depth-based transformations while keeping perspective scaling.
   */
  function flattenTo2D(matrix, perspective = Infinity) {
      // Compute the perspective scaling factor (if applicable)
      let scaleFactor = 1;

      if (perspective !== Infinity && matrix.o !== 0) {
          scaleFactor = 1 / (1 - (matrix.o / perspective));
          scaleFactor = Math.max(0.1, Math.min(scaleFactor, 10)); // Clamping to avoid extreme values
      }

      // Preserve only the 2D transform values, ensuring proper rotation & skew
      return {
          a: matrix.a * scaleFactor,  // X scale + rotation
          b: matrix.b * scaleFactor,  // X skew
          c: matrix.e * scaleFactor,  // Y skew
          d: matrix.f * scaleFactor,  // Y scale + rotation
          e: matrix.m * scaleFactor,  // X translation
          f: matrix.n * scaleFactor   // Y translation
      };
  }


  /**
   *  Decompose matrix to readable transform properties 
   *  translate() rotate() scale() etc.
   *  based on @AndreaBogazzi's answer
   *  https://stackoverflow.com/questions/5107134/find-the-rotation-and-skew-of-a-matrix-transformation#32125700
   *  return object with seperate transform properties 
   *  and ready to use css or svg attribute strings
   */
  function qrDecomposeMatrix(matrix, precision = 3) {
      let { a, b, c, d, e, f } = matrix;
      // matrix is array
      if (Array.isArray(matrix)) {
          [a, b, c, d, e, f] = matrix;
      }
      let angle = Math.atan2(b, a),
          denom = Math.pow(a, 2) + Math.pow(b, 2),
          scaleX = Math.sqrt(denom),
          scaleY = (a * d - c * b) / scaleX,
          skewX = Math.atan2(a * c + b * d, denom) / (Math.PI / 180),
          translateX = e ? e : 0,
          translateY = f ? f : 0,
          rotate = angle ? angle / (Math.PI / 180) : 0;
      let transObj = {
          translateX: translateX,
          translateY: translateY,
          rotate: rotate,
          scaleX: scaleX,
          scaleY: scaleY,
          skewX: skewX,
          skewY: 0
      };
      let cssTransforms = [];
      let svgTransforms = [];
      for (let prop in transObj) {
          transObj[prop] = +parseFloat(transObj[prop]).toFixed(precision);
          let val = transObj[prop];
          let unit = "";
          if (prop == "rotate" || prop == "skewX") {
              unit = "deg";
          }
          if (prop.indexOf("translate") != -1) {
              unit = "px";
          }
          // combine these properties
          let convert = ["scaleX", "scaleY", "translateX", "translateY"];
          if (val !== 0) {
              cssTransforms.push(`${prop}(${val}${unit})`);
          }
          if (convert.indexOf(prop) == -1 && val !== 0) {
              svgTransforms.push(`${prop}(${val})`);
          } else if (prop == "scaleX") {
              svgTransforms.push(
                  `scale(${+scaleX.toFixed(precision)} ${+scaleY.toFixed(precision)})`
              );
          } else if (prop == "translateX") {
              svgTransforms.push(
                  `translate(${transObj.translateX} ${transObj.translateY})`
              );
          }
      }
      // append css style string to object
      transObj.cssTransform = cssTransforms.join(" ");
      transObj.svgTransform = svgTransforms.join(" ");
      return transObj;
  }




  function analyzeMatrix(matrix) {

      // Normalize input matrix to a full 3D 4x4 format
      matrix = normalizeTo3DMatrix(matrix);


      getProper3DMatrix(matrix);
      //console.log('matrixProper3D', matrixProper3D);

      let { a, b, c, d,
          e, f, g, h,
          i, j, k, l,
          m, n, o, p } = matrix;

      let has_rotX = g != 0 && j != 0 && Math.abs(g) === Math.abs(j);
      let has_rotY = c != 0 && i != 0 && Math.abs(c) === Math.abs(i);
      let has_rotZ = e != 0 && b != 0 && Math.abs(b) === Math.abs(e);
      let has_rots = has_rotX || has_rotY || has_rotZ;

      let has_skewX = Math.abs(e) > 0 && !has_rots;
      let has_skewY = Math.abs(b) > 0 && !has_rots;
      let has_skews = has_skewX || has_skewY;

      let has_scaleX = a != 1;
      let has_scaleY = f != 1;
      let has_scaleZ = k != 1;
      let has_scales = has_scaleX || has_scaleY || has_scaleZ;

      return {
          has_rotX: has_rotX,
          has_rotY: has_rotY,
          has_rotZ: has_rotZ,
          has_rots: has_rots,

          has_scaleX: has_scaleX,
          has_scaleY: has_scaleY,
          has_scaleZ: has_scaleZ,
          has_scales: has_scales,

          has_skewX: has_skewX,
          has_skewY: has_skewY,
          has_skews: has_skews,
      }
  }




  function getSkewX(matrix, precision = 3) {
      if (typeof matrix !== "object" || matrix === null) {
          throw new Error("Invalid matrix. Expected an object with a-p properties.");
      }

      // Extract relevant property (e)
      let { e } = matrix;

      // Calculate skewX
      let skewX = Math.atan(e) * (180 / Math.PI);

      // Round to the specified precision
      return +skewX.toFixed(precision);
  }


  function getSkewY(matrix, precision = 3) {
      if (typeof matrix !== "object" || matrix === null) {
          throw new Error("Invalid matrix. Expected an object with a-p properties.");
      }

      // Extract relevant property (b)
      let { b } = matrix;

      // Calculate skewY
      let skewY = Math.atan(b) * (180 / Math.PI);

      // Round to the specified precision
      return +skewY.toFixed(precision);
  }



  function getScaling(matrix, precision = 3) {
      if (typeof matrix !== "object" || matrix === null) {
          throw new Error("Invalid matrix. Expected an object with a-p properties.");
      }

      // Extract relevant properties
      let { a, b, c, e, f, g, i, j, k } = matrix;

      // Calculate skewX and skewY
      let skewX = Math.atan(e / a) * (180 / Math.PI); // skewX is derived from e / a
      let skewY = Math.atan(b / a) * (180 / Math.PI); // skewY is derived from b / a

      // Construct the skew matrix K
      let K = [
          [1, Math.tan(skewY * Math.PI / 180), 0],
          [Math.tan(skewX * Math.PI / 180), 1, 0],
          [0, 0, 1]
      ];

      // Calculate the determinant of the skew matrix K
      let detK = K[0][0] * (K[1][1] * K[2][2] - K[1][2] * K[2][1]) -
                 K[0][1] * (K[1][0] * K[2][2] - K[1][2] * K[2][0]) +
                 K[0][2] * (K[1][0] * K[2][1] - K[1][1] * K[2][0]);

      if (Math.abs(detK) < 1e-6) {
          throw new Error("Skew matrix is singular (non-invertible).");
      }

      // Calculate the inverse of the skew matrix K
      let invK = [
          [
              (K[1][1] * K[2][2] - K[1][2] * K[2][1]) / detK,
              (K[0][2] * K[2][1] - K[0][1] * K[2][2]) / detK,
              (K[0][1] * K[1][2] - K[0][2] * K[1][1]) / detK
          ],
          [
              (K[1][2] * K[2][0] - K[1][0] * K[2][2]) / detK,
              (K[0][0] * K[2][2] - K[0][2] * K[2][0]) / detK,
              (K[0][2] * K[1][0] - K[0][0] * K[1][2]) / detK
          ],
          [
              (K[1][0] * K[2][1] - K[1][1] * K[2][0]) / detK,
              (K[0][1] * K[2][0] - K[0][0] * K[2][1]) / detK,
              (K[0][0] * K[1][1] - K[0][1] * K[1][0]) / detK
          ]
      ];

      // Multiply the transformation matrix by the inverse of the skew matrix
      let S = [
          [
              a * invK[0][0] + b * invK[1][0] + c * invK[2][0],
              a * invK[0][1] + b * invK[1][1] + c * invK[2][1],
              a * invK[0][2] + b * invK[1][2] + c * invK[2][2]
          ],
          [
              e * invK[0][0] + f * invK[1][0] + g * invK[2][0],
              e * invK[0][1] + f * invK[1][1] + g * invK[2][1],
              e * invK[0][2] + f * invK[1][2] + g * invK[2][2]
          ],
          [
              i * invK[0][0] + j * invK[1][0] + k * invK[2][0],
              i * invK[0][1] + j * invK[1][1] + k * invK[2][1],
              i * invK[0][2] + j * invK[1][2] + k * invK[2][2]
          ]
      ];

      // Extract scaling factors from the diagonal of S
      let scaleX = S[0][0];
      let scaleY = S[1][1];
      let scaleZ = S[2][2];

      // Round to the specified precision
      return {
          scaleX: +scaleX.toFixed(precision),
          scaleY: +scaleY.toFixed(precision),
          scaleZ: +scaleZ.toFixed(precision)
      };
  }


  function getAdjustedSkew(matrix, skewX = 0, skewY = 0, scaleX = 1, scaleY = 1, scaleZ = 1, precision = 9) {
      if (typeof matrix !== "object" || matrix === null) {
          throw new Error("Invalid matrix. Expected an object with a-p properties.");
      }

      // Extract relevant properties from the matrix
      const { a, b, e } = matrix;

      // Calculate skewX and skewY using the provided scaling factors
      let calculatedSkewX = Math.atan(e / scaleY) * (180 / Math.PI);
      let calculatedSkewY = Math.atan(b / scaleX) * (180 / Math.PI);

      // Adjust for combined skews if both are applied
      if (skewX !== 0 && skewY !== 0) {
          const thetaX = calculatedSkewX * Math.PI / 180;
          const thetaY = calculatedSkewY * Math.PI / 180;
          calculatedSkewX = Math.atan(Math.tan(thetaX) / Math.cos(thetaY)) * (180 / Math.PI);
          calculatedSkewY = Math.atan(Math.tan(thetaY) / Math.cos(thetaX)) * (180 / Math.PI);
      }

      // Round to the specified precision
      return {
          skewX: +calculatedSkewX.toFixed(precision),
          skewY: +calculatedSkewY.toFixed(precision)
      };
  }



  function qrDecomposeMatrix3D(matrix, precision = 3) {
      if (typeof matrix !== "object" || matrix === null) {
          throw new Error("Invalid 3D matrix. Expected an object with 16 properties.");
      }

      // Normalize input matrix to a full 3D 4x4 format
      matrix = normalizeTo3DMatrix(matrix);

      // Extract matrix components
      let { a, b, c, d,
          e, f, g, h,
          i, j, k, l,
          m, n, o, p } = matrix;



      let matrixProps = analyzeMatrix(matrix);

      // analyze matrix
      let {
          has_rotX,
          has_rotY,
          has_rotZ,
          has_rots,
          has_scaleX,
          has_scaleY,
          has_scaleZ,
          has_scales,
          has_skewX,
          has_skewY,
          has_skews,
      } = matrixProps;

      //console.log('matrixProps', matrixProps, Object.values(matrix));

      // **Step 1: Extract Translation**
      let translateX = m,
          translateY = n,
          translateZ = o;


      let scaling = getScaling(matrix);
      let {scaleX, scaleY, scaleZ} = scaling;
      //console.log('scaling', scaling);

      scaleX=0.5;
      scaleY=0.25;
      scaleZ=1;


      let skewX = getSkewX(matrix);
      let skewY = getSkewY(matrix);



      // **Step 3: Normalize Rotation Matrix (Remove Scale)**
      let r00 = a / scaleX;
      let r10 = e / scaleY, r11 = f / scaleY, r12 = g / scaleY;
      let r20 = i / scaleZ, r21 = j / scaleZ, r22 = k / scaleZ;

      // **Step 5: Extract Rotation Angles (Euler ZYX Order)**
      let rotateX, rotateY, rotateZ;
      let sy = Math.sqrt(r00 * r00 + r10 * r10);

      if (sy > 1e-6) {
          rotateX = Math.atan2(r21, r22);
          rotateY = Math.atan2(-r20, sy);
          rotateZ = Math.atan2(r10, r00);
      } else {
          // Gimbal lock case
          rotateX = Math.atan2(-r12, r11);
          rotateY = Math.atan2(-r20, sy);
          rotateZ = 0;
      }

      // Convert Radians to Degrees
      rotateX = has_rotX ? -+(rotateX * (180 / Math.PI)).toFixed(precision) : 0;
      rotateY = has_rotY ? -+(rotateY * (180 / Math.PI)).toFixed(precision) : 0;
      rotateZ = has_rotZ ? -+(rotateZ * (180 / Math.PI)).toFixed(precision) : 0;



      /*
      let scaleX_1 = Math.hypot(a, b, c);
      let scaleY_1 = Math.hypot(e, f, g);
      let scaleZ_1 = Math.hypot(i, j, k);
      */


      if (has_skewX) {
          // Calculate skewX based on the XY plane
          //skewX = Math.atan2((b ), (e )  ) * (180 / Math.PI);
          let skewXAdj = getAdjustedSkew(matrix, skewX, skewY, scaleX, scaleY, scaleZ).skewX;
          //skewX = skewX/scaleY
          skewX = skewXAdj;
      }

      if (has_skewY) {
          // Calculate skewY based on the XZ plane
          //skewY = Math.atan2(r02, r00) * (180 / Math.PI);
          //skewY = Math.atan2(r01, r00) * (180 / Math.PI);
          let skewYAdj = getAdjustedSkew(matrix, skewX, skewY, scaleX, scaleY, scaleZ).skewY;
          //skewY = (skewY+ skewYAdj)/2
          skewY = skewYAdj;
      }




      // **Step 7: Final Object Representation**
      let transObj = {
          translateX: +translateX.toFixed(precision),
          translateY: +translateY.toFixed(precision),
          translateZ: +translateZ.toFixed(precision),
          rotateX, rotateY, rotateZ,
          scaleX: +scaleX.toFixed(precision),
          scaleY: +scaleY.toFixed(precision),
          scaleZ: +scaleZ.toFixed(precision),
          skewX: +skewX.toFixed(precision),
          skewY: +skewY.toFixed(precision)
      };

      // **Generate CSS Transform String**
      let cssTransforms = [];
      if (transObj.translateX || transObj.translateY || transObj.translateZ) {
          cssTransforms.push(`translate3d(${transObj.translateX}px, ${transObj.translateY}px, ${transObj.translateZ}px)`);
      }
      if (transObj.rotateX) cssTransforms.push(`rotateX(${transObj.rotateX}deg)`);
      if (transObj.rotateY) cssTransforms.push(`rotateY(${transObj.rotateY}deg)`);
      if (transObj.rotateZ) cssTransforms.push(`rotateZ(${transObj.rotateZ}deg)`);
      if (transObj.skewX) cssTransforms.push(`skewX(${transObj.skewX}deg)`);
      if (transObj.skewY) cssTransforms.push(`skewY(${transObj.skewY}deg)`);


      if (transObj.scaleX !== 1 || transObj.scaleY !== 1 || transObj.scaleZ !== 1) {
          cssTransforms.push(`scale3d(${transObj.scaleX}, ${transObj.scaleY}, ${transObj.scaleZ})`);
      }


      transObj.cssTransform = cssTransforms.join(" ");
      return transObj;
  }


























  function getProper3DMatrix(matrix, perspectiveOrigin = { x: 0, y: 0 }, transformOrigin = { x: 0, y: 0 }, perspective = Infinity) {
      // Clone base matrix
      let extendedMatrix = { ...matrix };

      // Adjust transform-origin within the matrix
      extendedMatrix.e -= transformOrigin.x * matrix.a + transformOrigin.y * matrix.c;
      extendedMatrix.f -= transformOrigin.x * matrix.b + transformOrigin.y * matrix.d;
      extendedMatrix.g -= transformOrigin.x * matrix.i + transformOrigin.y * matrix.k;

      // Compute perspective vector (q, r, s, t)
      let q = 0, r = 0, s = 0, t = 1;
      if (perspective !== Infinity) {
          s = -1 / perspective;
          q = (perspectiveOrigin.x * s);
          r = (perspectiveOrigin.y * s);
      }

      // Return full 20-value matrix
      return {
          ...extendedMatrix,
          q, r, s, t
      };
  }


  function transformPointByProper3DMatrix(matrix, pt) {
      let x = pt.x, y = pt.y, z = pt.z || 0, w = 1;

      // Apply 4×4 transformation
      let newX = matrix.a * x + matrix.e * y + matrix.i * z + matrix.m * w;
      let newY = matrix.b * x + matrix.f * y + matrix.j * z + matrix.n * w;
      let newZ = matrix.c * x + matrix.g * y + matrix.k * z + matrix.o * w;
      let newW = matrix.d * x + matrix.h * y + matrix.l * z + matrix.p * w;

      // Apply perspective projection
      let perspX = matrix.q * x + matrix.t;
      let perspY = matrix.r * y + matrix.t;
      let perspZ = matrix.s * z + matrix.t;

      if (newW !== 0) {
          newX /= newW;
          newY /= newW;
          newZ /= newW;
      }

      return { x: newX + perspX, y: newY + perspY, z: newZ + perspZ };
  }

  function transformPoints(pts, matrix, perspectiveOrigin = { x: 0, y: 0, z: 0 }, perspective = Infinity, is3D = null, decimals = -1) {


      // normalize point structure
      const convertPointArr = (pts) => {

          // not point object array
          if (pts[0].x === undefined) {

              // nested array
              if (Array.isArray(pts[0])) {
                  return pts.map(pt => { return { x: pt[0], y: pt[1] } })
              } else {

                  // flat array
                  let ptsO = [];
                  for (let i = 1, len = pts.length; i < len; i += 2) {
                      ptsO.push({ x: pts[i - 1], y: pts[i] });
                  }
                  return ptsO;
              }

          }
          else {
              // already object
              return pts
          }
      };


      pts = convertPointArr(pts);


      // check if 3d
      let is3DPt = pts[0].hasOwnProperty('z');
      is3D = Object.values(matrix).length === 16;
      let canFlatten = false;

      if (is3D && !is3DPt) {
          //check if 3D matrix could be expressed by a 2D one
          canFlatten = canFlattenTo2D(matrix);
          if (canFlatten) {
              is3D = false;
              matrix = flattenTo2D(matrix, perspective);
          }
      }


      let ptsTrans = [];
      for (let i = 0, len = pts.length; i < len; i++) {
          let pt = pts[i];
          if (is3D) {
              pt = transformPoint3D(pt, matrix, perspectiveOrigin, perspective, decimals);
          }
          else {
              pt = transformPoint2D(pt, matrix, decimals);
          }
          ptsTrans.push(pt);
      }

      return ptsTrans;
  }


  /**
   * wrapper for single 2D or 3D point
   */
  function transformPoint(pt, matrix, perspectiveOrigin = { x: 0, y: 0 }, perspective = Infinity, is3D = null, decimals = -1) {


      //convert array
      pt = Array.isArray(pt) ? { x: pt[0], y: pt[1], z: pt[1] || 0 } : pt;

      if (is3D === null) {
          is3D = Object.values(matrix).length === 16;
      }

      if (is3D) {
          pt = transformPoint3D(pt, matrix, perspectiveOrigin, perspective, decimals);
      }
      else {
          pt = transformPoint2D(pt, matrix, decimals);
      }

      return pt;
  }




  function transformPoint3D(pt, matrix, perspectiveOrigin = { x: 0, y: 0 }, perspective = Infinity, decimals = -1
  ) {
      let x = pt.x, y = pt.y, z = pt.z || 0, w = 1;


      // Apply the 4x4 transformation matrix (object-based: a–p)
      let newX = matrix.a * x + matrix.e * y + matrix.i * z + matrix.m * w;
      let newY = matrix.b * x + matrix.f * y + matrix.j * z + matrix.n * w;
      let newZ = matrix.c * x + matrix.g * y + matrix.k * z + matrix.o * w;
      let newW = matrix.d * x + matrix.h * y + matrix.l * z + matrix.p * w;


      // Homogeneous division
      if (newW !== 0) {
          newX /= newW;
          newY /= newW;
          newZ /= newW;
      }

      // Apply perspective projection using the standard CSS formula:
      if (perspective !== Infinity) {
          let factor = 1 - (newZ / perspective);

          let adjustX = (newX - perspectiveOrigin.x) / factor;
          let adjustY = (newY - perspectiveOrigin.y) / factor;

          if (factor !== 0) {

              newX = perspectiveOrigin.x + adjustX;
              newY = perspectiveOrigin.y + adjustY;

              if (factor === 0) {
                  factor = 0.01;
              }

              // adjust negative factors
              if (factor < 0) {
                  factor = Math.abs(factor);
                  newX = (perspectiveOrigin.x - (newX - perspectiveOrigin.x) / factor);
                  newY = (perspectiveOrigin.y - (newY - perspectiveOrigin.y) / factor);

              }

          }
      }

      let ptTrans = { x: newX, y: newY };
      if (decimals > -1) {
          ptTrans.x = +(ptTrans.x).toFixed(decimals);
          ptTrans.y = +(ptTrans.y).toFixed(decimals);
      }

      return ptTrans;
  }


  // transform point by 2d matrix
  function transformPoint2D(pt, matrix, decimals = -1) {
      let { a, b, c, d, e, f } = matrix;
      let { x, y } = pt;
      let ptTrans = { x: a * x + c * y + e, y: b * x + d * y + f };


      if (decimals > -1) {
          ptTrans.x = +(ptTrans.x).toFixed(decimals);
          ptTrans.y = +(ptTrans.y).toFixed(decimals);
      }

      //console.log('decimals', decimals, ptTrans);
      return ptTrans;
  }

  function setCSSTransforms(el, transformOptions) {
      let css = getCSSTransform(transformOptions);
      el.setAttribute('style', css);
      el.parentNode.style.perspective = transformOptions.perspective + 'px';
      el.parentNode.style.perspectiveOrigin = `${transformOptions.perspectiveOrigin.x}px ${transformOptions.perspectiveOrigin.y}px`;
  }


  function getCSSTransform({
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
          let prop = Object.keys(t)[0];
          let vals = Object.values(t)[0];

          //add units
          unit = prop === 'rotate' || prop === 'skew' ? 'deg' : (prop === 'scale' || prop === 'matrix' ? '' : 'px');
          let valsN = vals.map((val, v) => {
              return val !== '' ? `${val}${unit}` : ''
          });

          if (is3d) {
              let x, y, z;
              if (prop === 'translate') {
                  [x, y = '0px', z = '0px'] = valsN;
              } else {
                  [x, y = '0deg', z = '0deg'] = valsN;
              }

              if (prop === 'matrix') {
                  css.push(`${prop}3d(${valsN.join(',')})`);
              }
              else if (prop === 'skew') {
                  css.push(`${prop}X(${x}) ${prop}Y(${y})`);
              } else {
                  css.push(`${prop}X(${x}) ${prop}Y(${y}) ${prop}Z(${z})`);
              }
          }
          else {
              css.push(`${prop}(${valsN.join(', ')})`);
          }

      });

      let cssParent = `perspective-origin:${perspectiveOrigin.x}px ${perspectiveOrigin.y}px; perspective:${perspective}px;`;

      css = `transform:${css.join(' ')};transform-origin:${transFormOrigin.x}px ${transFormOrigin.y}px;`;
      return {el:css, parent:cssParent}

  }

  function Mtx(input = {}) {
      // If input is a string, parse it to transform object
      if (typeof input === 'string') {
          input = parseCSSTransform(input);
      }

      const {
          transforms = [],
          transFormOrigin = { x: 0, y: 0 },
          perspectiveOrigin = { x: 0, y: 0 },
          perspective = 100,
          force3D = false
      } = input;

      this.transforms = transforms;
      this.transFormOrigin = transFormOrigin;
      this.perspectiveOrigin = perspectiveOrigin;
      this.perspective = perspective;
      this.force3D = force3D;

      // Generate matrix and CSS transform
      this.matrix = getMatrix({
          transforms,
          transFormOrigin,
          perspectiveOrigin,
          perspective,
          force3D
      });

      this.is3D = this.matrix.p !== undefined;
      this.css = getCSSTransform({
          transforms,
          transFormOrigin,
          perspectiveOrigin,
          perspective,
          force3D
      });
  }




  Mtx.prototype.transformPoints = function (pts, decimals=8) {
      let ptsT = transformPoints(pts, this.matrix, this.perspectiveOrigin, this.perspective, this.force3D, decimals);
      this.ptsT = ptsT;
      return ptsT;
  };

  exports.Mtx = Mtx;
  exports.analyzeMatrix = analyzeMatrix;
  exports.canFlattenTo2D = canFlattenTo2D;
  exports.flattenTo2D = flattenTo2D;
  exports.getAdjustedSkew = getAdjustedSkew;
  exports.getCSSTransform = getCSSTransform;
  exports.getMatrix = getMatrix;
  exports.getMatrix2D = getMatrix2D;
  exports.getMatrix3D = getMatrix3D;
  exports.getProper3DMatrix = getProper3DMatrix;
  exports.getScaling = getScaling;
  exports.getSkewX = getSkewX;
  exports.getSkewY = getSkewY;
  exports.has3Dtransforms = has3Dtransforms;
  exports.normalizeTo3DMatrix = normalizeTo3DMatrix;
  exports.parseCSSTransform = parseCSSTransform;
  exports.qrDecomposeMatrix = qrDecomposeMatrix;
  exports.qrDecomposeMatrix3D = qrDecomposeMatrix3D;
  exports.setCSSTransforms = setCSSTransforms;
  exports.transformPoint = transformPoint;
  exports.transformPoint2D = transformPoint2D;
  exports.transformPoint3D = transformPoint3D;
  exports.transformPointByProper3DMatrix = transformPointByProper3DMatrix;
  exports.transformPoints = transformPoints;

}));
