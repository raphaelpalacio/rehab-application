import { View, Text, TouchableOpacity, TextInput, Modal, StyleSheet, Alert } from 'react-native';
import { Link } from 'expo-router';
import auth from '@react-native-firebase/auth';
import Constants from 'expo-constants';
import React, { useState } from 'react';



const API_URL = Constants.expoConfig?.extra?.API_URL;

export default function Patient() {
  const [modalVisible, setModalVisible] = useState(false);
  const [connectCode, setConnectCode] = useState('');

  const connectDoctor = async () => {
    try {
      const user = auth().currentUser;
      if (!user) {
        console.error('No user found. Please log in first.');
        return;
      }
      const token = await user.getIdToken();

      const response = await fetch(`${API_URL}/connect`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: connectCode }),
      });

    } catch(error) {
      console.error(error);
    }
  };
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hello Patient</Text>
      <Text style={styles.subtitle}>Your personal rehabilitation companion</Text>
      
      <View style={styles.buttonContainer}>
        <Link href="/login" asChild>
          <TouchableOpacity style={styles.button}>
            <Text style={styles.buttonText}>Login</Text>
          </TouchableOpacity>
        </Link>
        
        <TouchableOpacity style={styles.button} onPress={() => setModalVisible(true)}>
        <Text style={styles.buttonText}>Connect</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Enter Connect Code</Text>
            <TextInput
              style={styles.input}
              value={connectCode}
              onChangeText={setConnectCode}
              placeholder="e.g. A3C3HC"
              autoCapitalize="characters"
            />
            <TouchableOpacity style={styles.button} onPress={connectDoctor}>
              <Text style={styles.buttonText}>Submit</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={{ color: 'red', marginTop: 10 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

        <Link href="/camera" asChild>
          <TouchableOpacity style={styles.button}>
            <Text style={styles.buttonText}>Camera</Text>
          </TouchableOpacity>
        </Link>
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
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: '80%',
    alignItems: 'center'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold'
  },
  input: {
    width: '100%',
    borderColor: '#ccc',
    borderWidth: 1,
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    marginBottom: 10
  }
}); 