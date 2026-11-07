const React = require("react");

const Svg = ({ children, ...props }) => React.createElement("svg", props, children);
const Path = (props) => React.createElement("path", props);
const Circle = (props) => React.createElement("circle", props);
const Rect = (props) => React.createElement("rect", props);
const Defs = ({ children }) => React.createElement("defs", null, children);
const LinearGradient = ({ children, ...props }) => React.createElement("linearGradient", props, children);
const RadialGradient = ({ children, ...props }) => React.createElement("radialGradient", props, children);
const Stop = (props) => React.createElement("stop", props);
const G = ({ children, ...props }) => React.createElement("g", props, children);

module.exports = {
  __esModule: true,
  default: Svg,
  Svg,
  Path,
  Circle,
  Rect,
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  G,
};
