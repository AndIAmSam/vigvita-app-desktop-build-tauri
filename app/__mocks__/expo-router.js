const React = require('react');

const MockLink = (props) => {
  return React.createElement('a', {
    ...props,
    testID: props.testID || 'expo-router-link',
    onClick: props.onPress,
  }, props.children);
};

module.exports = {
  Link: MockLink,
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({}),
};
