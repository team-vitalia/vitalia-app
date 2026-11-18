const { withAndroidManifest } = require("@expo/config-plugins");

module.exports = function withPortraitFeature(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    if (!manifest["uses-feature"]) {
      manifest["uses-feature"] = [];
    }
    const existing = manifest["uses-feature"].find(
      (item) => item.$ && item.$["android:name"] === "android.hardware.screen.portrait"
    );
    if (existing) {
      existing.$["android:required"] = "false";
    } else {
      manifest["uses-feature"].push({
        $: {
          "android:name": "android.hardware.screen.portrait",
          "android:required": "false",
        },
      });
    }
    return config;
  });
};
