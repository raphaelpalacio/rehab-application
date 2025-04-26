import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

SplashScreen.preventAutoHideAsync();

export default function Layout() {
  useEffect(() => {
    const hideSplash = async () => {
      await SplashScreen.hideAsync(); 
    };
    hideSplash();
  }, []);

  return (
    <Stack>
      <Stack.Screen name="index" options={{headerShown: false}}/>
      <Stack.Screen name="login" options={{headerShown: false}}/>
      <Stack.Screen name="signup" options={{ headerShown: false }} />
      <Stack.Screen name="camera" options={{ headerShown: false }} />
    </Stack>
  );
}
