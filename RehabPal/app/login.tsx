import React, { useState } from 'react';
import { View, TextInput, Button, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import auth from '@react-native-firebase/auth';


export default function Login() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = async () => {
        try {
            const userCredential = await auth().signInWithEmailAndPassword(email, password);
            const idToken = await userCredential.user.getIdToken();
            console.log('User Token:', idToken);
            await retrieveRole();
        } catch(error) {
            console.log(error);
        }
    };

    const retrieveRole = async () => {
        const user = auth().currentUser;
        if (user) {
            const decodedToken = await user.getIdTokenResult();
            console.log('Claims:', decodedToken.claims);

            const role = decodedToken.claims.role;
            if (role === 'doctor' || role === 'patient') {
                router.push(`/${role}` as '/doctor' | '/patient');
            } else {
                console.error('No valid role set');
            }
        }
    }

    return (
        <View style={styles.container}>
            <Text>Login</Text>
          <TextInput style={styles.input} placeholder="Email" placeholderTextColor="black" value={email} onChangeText={setEmail} />
          <TextInput style={styles.input} placeholder="Password" placeholderTextColor="black" secureTextEntry value={password} onChangeText={setPassword}/>
          
          <TouchableOpacity style={styles.button} onPress={handleLogin}>
            <Text style={styles.buttonText}>Login</Text>
          </TouchableOpacity>
    
          <Text style={styles.or}>Or login with</Text>
    
          {/* Third-party apps */}
    
          <TouchableOpacity onPress={() => router.push('/signup')}>
            <Text style={styles.loginLink}>Don't have an account? <Text style={styles.signupText}>Sign up here</Text></Text>
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
    signupText: {
        color: 'white',
    },
});
