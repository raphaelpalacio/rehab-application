import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Provider } from "react-redux";
import { store } from "../slices/store";


SplashScreen.preventAutoHideAsync();

export default function Layout() {
  useEffect(() => {
    const hideSplash = async () => {
      await SplashScreen.hideAsync(); 
    };
    hideSplash();
  }, []);

  return (
    <Provider store={store}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="signup" options={{ headerShown: false }} />
        <Stack.Screen name="camera" options={{ headerShown: false }} />
        <Stack.Screen name="doctor/index" options={{ headerShown: false }} />
        <Stack.Screen name="patient/index" options={{ headerShown: false }} />
        <Stack.Screen name="doctor/patientList" options={{ headerShown: false }} />
        <Stack.Screen name="patient/inbox" options={{ headerShown: false }} />

      </Stack>
    </Provider>
  );
}
