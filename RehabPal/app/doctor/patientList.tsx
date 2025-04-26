import React, { useEffect, useState } from 'react';
import auth from '@react-native-firebase/auth';
import Constants from 'expo-constants';
import { View, Text, StyleSheet, FlatList, TouchableOpacity} from 'react-native';
import { Link } from 'expo-router';
import { router } from 'expo-router';



const API_URL = Constants.expoConfig?.extra?.API_URL;

type Patient = {
    id: string;
    email: string;
  };

const DoctorPatients = () => {
    const [patients, setPatients] = useState<Patient[]>([]);
    const fetchPatients = async () => {
        const user = auth().currentUser;
        if (!user) return;
        const token = await user.getIdToken();

        try {
        const res = await fetch(`${API_URL}/connections`, {
            method: 'GET',
            headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            },
        });

        const data = await res.json();
        setPatients(data.patients);
        } catch (err) {
        console.error('Error fetching patients:', err);
        }
    };

    useEffect(() => {
        fetchPatients();
    }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Your Patients</Text>
      <FlatList
        data={patients}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={{ paddingVertical: 10 }}>
            <Text style={styles.text}>ID: {item.id}</Text>
            <Text style={styles.text}>Email: {item.email}</Text>
            <Link href="/camera" asChild>
            <TouchableOpacity
                style={styles.button}
                onPress={() => {
                    router.push({ pathname: "/camera", params: { patientId: item.id } });
                }}
                >
                <Text style={styles.buttonText}>Assign</Text>
            </TouchableOpacity>
            </Link>

          </View>
        )}
      />
    </View>
  );
};

export default DoctorPatients;

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
text: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
}
});