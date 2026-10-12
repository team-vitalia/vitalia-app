
import { WebView } from "react-native-webview";

interface VisorContratoProps {
  url: string;
  token: string;
}

export default function VisorContrato({
  url,
  token,
}: VisorContratoProps) {
  const source = {
    uri: url,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  return (
    <WebView
      source={source}
      style={{ flex: 1 }}
      startInLoadingState
      originWhitelist={["*"]}
    />
  );
}
