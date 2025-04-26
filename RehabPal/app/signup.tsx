import React, { useState } from 'react';
import { View, TextInput, Button, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import auth from '@react-native-firebase/auth';


export default function Signup() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSignup = async () => {
    if (password !== confirmPassword) {
      console.error('Error', 'Passwords do not match!');
      return;
    }
    try {
      const userCredential = await auth().createUserWithEmailAndPassword(email, password);
      const idToken = await userCredential.user.getIdToken();
      console.log('User Token:', idToken);
    } catch (error) {
      console.error(error);
    }
  };


    return (
    <View style={styles.container}>
      <TextInput style={styles.input} placeholder="Email" placeholderTextColor="black" value={email} onChangeText={setEmail}/>
      <TextInput style={styles.input} placeholder="Password" placeholderTextColor="black" secureTextEntry value={password} onChangeText={setPassword}/>
      <TextInput style={styles.input} placeholder="Confirm password" placeholderTextColor="black" secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword}/>
      
      <TouchableOpacity style={styles.button} onPress={handleSignup}>
        <Text style={styles.buttonText}>Sign Up</Text>
      </TouchableOpacity>

      <Text style={styles.or}>Or sign up with</Text>

      {/* Third-party apps */}

      <TouchableOpacity onPress={() => router.push('/login')}>
        <Text style={styles.loginLink}>Already have an account? <Text style={styles.loginText}>Login here</Text></Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
    backgroundColor: 'black',
  },
  input: {
    height: 50,
    backgroundColor: 'white',
    borderWidth: 1,
    marginBottom: 12,
    paddingHorizontal: 10,
    color: 'black',
    borderRadius: 8,
  },
  button: {
    backgroundColor: 'white', 
    padding: 15,
    alignItems: 'center',
    borderRadius: 8,
    marginVertical: 10,
  },
  buttonText: {
    color: 'black',
    fontSize: 16,
    fontWeight: '600',
  },
  or: {
    textAlign: 'center',
    color: 'white',
    marginVertical: 10,
  },
  loginLink: {
    textAlign: 'center',
    color: 'white',
    marginTop: 10,
  },
  loginText: {
    color: 'white',
  },
});
