const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withTabletOnly(config) {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults.manifest;

    androidManifest['supports-screens'] = [
      {
        $: {
          'android:smallScreens': 'false',
          'android:normalScreens': 'false',
          'android:largeScreens': 'true',
          'android:xlargeScreens': 'true',
          'android:requiresSmallestWidthDp': '600'
        }
      }
    ];

    return config;
  });
};
