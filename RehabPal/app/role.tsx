import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import auth from '@react-native-firebase/auth';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.API_URL;

export default function RolePage() {
  const router = useRouter();
  const user = auth().currentUser;

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(user => {
      if (user) {
        console.log("User logged in:", user.uid);
      }
    });

    return () => unsubscribe();
  }, []);

  const submitRole = async (role: 'doctor' | 'patient') => {
    try {
      if (!user) {
        console.error('No user found. Please log in first.');
        return;
      }

      const token = await user.getIdToken();
      console.log('Token:', token);

      const response = await fetch(`${API_URL}/set-role`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role }),
      });

      if (response.ok) {
        await user.getIdToken(true); 
        router.replace(`/${role}`); 
      } else {
        console.error('Role set failed');
      }
    } catch (error) {
      console.log('API_URL:', API_URL);
      console.error('Error setting role:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choose your role</Text>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={() => submitRole('doctor')}>
          <Text style={styles.buttonText}>Doctor</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={() => submitRole('patient')}>
          <Text style={styles.buttonText}>Patient</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}



const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'black',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
    color: 'white',
  },
  subtitle: {
    fontSize: 18,
    color: 'white',
    marginBottom: 40,
  },
  buttonContainer: {
    width: '100%',
    gap: 15,
  },
  button: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: 'black',
    fontSize: 16,
    fontWeight: '600',
  },
}); 