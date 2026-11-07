const React = require("react");

function MockIcon(props) {
  return React.createElement("span", { "data-testid": props.testID || "mock-icon", ...props });
}

module.exports = {
  Ionicons: MockIcon,
  FontAwesome: MockIcon,
  MaterialIcons: MockIcon,
};
