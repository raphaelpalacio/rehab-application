import React, { useEffect, useState } from 'react';
import auth from '@react-native-firebase/auth';
import Constants from 'expo-constants';
import { View, Text, StyleSheet, FlatList, TouchableOpacity} from 'react-native';
import { router } from 'expo-router';
import { useDispatch } from "react-redux";
import { setPatientId } from "../../slices/patientSlice";



const API_URL = Constants.expoConfig?.extra?.API_URL;


type Patient = {
    id: string;
    email: string;
  };

const PatientList = () => {
    const dispatch = useDispatch();
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
      <Text style={styles.title}>Your Patients</Text>
      <FlatList
        data={patients}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={{ paddingVertical: 10 }}>
            <Text style={styles.text}>ID: {item.id}</Text>
            <Text style={styles.text}>Email: {item.email}</Text>
            <TouchableOpacity
                style={styles.button}                
                onPress={() => {
                  dispatch(setPatientId(item.id));
                  router.push("/camera");
                }}
                >
                <Text style={styles.buttonText}>Assign</Text>
            </TouchableOpacity>

          </View>
        )}
      />
    </View>
  );
};

export default PatientList;

const styles = StyleSheet.create({
container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
},
title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
    paddingTop: 70,
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