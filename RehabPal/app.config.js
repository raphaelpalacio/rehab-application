import 'dotenv/config';

export default {
  expo: {
    name: "RehabPal",
    slug: "RehabPal",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "rehabpal",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      infoPlist: {
        NSPhotoLibraryUsageDescription: "Allow $(PRODUCT_NAME) to access your photos",
        NSPhotoLibraryAddUsageDescription: "Allow $(PRODUCT_NAME) to save photos",
        NSCameraUsageDescription: "Allow $(PRODUCT_NAME) to use your camera",
        NSMicrophoneUsageDescription: "Allow $(PRODUCT_NAME) to use your microphone"
      },
      googleServicesFile: "./GoogleService-Info.plist",
      bundleIdentifier: "com.sophian3105.RehabPal"
    },
    android: {
      googleServicesFile: "./google-services.json",
      package: "com.sophian3105.RehabPal",
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#ffffff"
      }
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      "expo-router",
      ["expo-splash-screen", {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff"
      }],
      ["expo-av", {
        microphonePermission: "Allow $(PRODUCT_NAME) to access your microphone."
      }],
      "@react-native-firebase/app",
      "@react-native-firebase/auth",
      ["react-native-vision-camera", {
        "cameraPermissionText": "$(PRODUCT_NAME) needs access to your Camera.",

        // optionally, if you want to record audio:
        "enableMicrophonePermission": true,
        "microphonePermissionText": "$(PRODUCT_NAME) needs access to your Microphone."
      }],
    ],
    experiments: {
      typedRoutes: true
    },
    extra: {
      API_URL: process.env.API_URL || "http://localhost:8000",
    }
  }
};
