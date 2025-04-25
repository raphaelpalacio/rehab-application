import { View, Text, StyleSheet, FlatList, TouchableOpacity} from 'react-native';
import auth from '@react-native-firebase/auth';
import Constants from 'expo-constants';
import React, { useState, useEffect} from 'react';


const API_URL = Constants.expoConfig?.extra?.API_URL;

type Video = {
  id: number;
  object_name: string;
  description: string;
  content_type: string;
};


export default function Videos() {
  const [videos, setVideos] = useState<Video[]>([]);
  
  const getVideos = async () => {
    const user = auth().currentUser;
    if (!user) {
      console.error('No user found. Please log in first.');
      return;
    }
    const token = await user.getIdToken();

    try {
      const response = await fetch(`${API_URL}/video/get_videos`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch videos');
      }

      const data = await response.json();
      setVideos(data);
    } catch (err) {
      console.error('Error fetching connect code:', err);
    }
  };
  useEffect(() => {
    const fetchData = async () => {
      await getVideos(); 
    };

    fetchData();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Videos</Text>
      {videos.map((video, index) => (
        <Text key={index} style={styles.videoItem}>
          {video.description || video.object_name}
        </Text>
      ))}
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
  input: {
    width: '100%',
    borderColor: '#ccc',
    borderWidth: 1,
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    marginBottom: 10
  },
  videoItem: {
    fontSize: 16,
    color: 'white',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  }
}); 