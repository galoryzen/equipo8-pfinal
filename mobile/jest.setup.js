jest.mock("@expo/vector-icons", () => {
  const { Text } = require("react-native");
  return new Proxy(
    {},
    {
      get: (_target, name) =>
        name === "__esModule" ? true : (props) => <Text {...props} />,
    }
  );
});