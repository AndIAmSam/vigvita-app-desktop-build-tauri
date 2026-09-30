const React = require('react');
const { ScrollView } = require('react-native');

const KeyboardAwareScrollView = (props) => {
  return React.createElement(ScrollView, props, props.children);
};

module.exports = {
  KeyboardAwareScrollView,
};
