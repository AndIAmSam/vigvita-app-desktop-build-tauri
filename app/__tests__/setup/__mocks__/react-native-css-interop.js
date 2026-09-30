// Mock for react-native-css-interop
// Provides the real React JSX runtime without the nativewind wrapper
// that crashes in test environments due to Appearance.addEventListener
const React = require('react');
const ReactJSXRuntime = require('react/jsx-runtime');

function createInteropElement(type, props, ...children) {
  const allProps = Object.assign({}, props);
  if (children.length === 1) {
    allProps.children = children[0];
  } else if (children.length > 1) {
    allProps.children = children;
  }
  return ReactJSXRuntime.jsx(type, allProps);
}

const interop = {
  __esModule: true,
  // JSX runtime pass-through (no nativewind wrapping)
  jsx: ReactJSXRuntime.jsx,
  jsxs: ReactJSXRuntime.jsxs,
  jsxDEV: ReactJSXRuntime.jsx, // Use jsx as fallback for DEV
  Fragment: React.Fragment,
  createElement: createInteropElement,
  createInteropElement: createInteropElement,

  // API stubs
  cssInterop: function() {},
  remapProps: function() { return function(c) { return c; }; },
  StyleSheet: {
    create: function(styles) { return styles; },
  },
};

interop.default = interop;

module.exports = interop;
