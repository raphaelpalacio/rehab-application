import { CameraView, useCameraPermissions, useMicrophonePermissions, CameraMode } from 'expo-camera';
import { useRef, useState, useEffect } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View, Button, Modal, TextInput } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import Constants from 'expo-constants';
import { useSelector } from "react-redux";
import { RootState } from "../src/store";
import auth from '@react-native-firebase/auth';
import { useLocalSearchParams } from 'expo-router';
import * as FileSystem from 'expo-file-system';



const API_URL = Constants.expoConfig?.extra?.API_URL;

const CameraScreen = () => {
  const [permission, requestPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const ref = useRef<CameraView>(null);
  const [uri, setUri] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const patientId = useSelector((state: RootState) => state.patient.patientId);
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setVideoTitle] = useState('');
  const params = useLocalSearchParams();
  const videoObjectName = params.videoObjectName as string;
  const [role, setRole] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [doctorVideoUri, setDoctorVideoUri] = useState<string | null>(null);

  useEffect(() => {
    const fetchRole = async () => {
      const user = auth().currentUser;
      if (user) {
        const decodedToken = await user.getIdTokenResult();
        const fetchedToken = await user.getIdToken();
        setRole(decodedToken.claims.role || null);
        setToken(fetchedToken); 
      }
    };

    fetchRole();
  }, []);


  if (!permission || !micPermission) {
    return <View />;
  }

  if (!permission.granted || !micPermission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>We need your permission to show the camera</Text>
        <Button 
            onPress={() => {
                if (!permission.granted) requestPermission();
                if (!micPermission.granted) requestMicPermission();
            }} 
            title="grant permission" 
        />
      </View>
    );
  }

  const downloadDoctorVideo = async (videoObjectName: string) => {
    const doctorVideoURL = `${API_URL}/video/download/${videoObjectName}`;
    if (FileSystem.cacheDirectory) {
      const localUri = FileSystem.cacheDirectory + videoObjectName.split("/").pop();
      try {
        const res = await FileSystem.downloadAsync(
          doctorVideoURL,
          localUri,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            }
          }
        );
        console.log('Finished downloading to', res.uri);
        return res.uri;
      } catch (error) {
        console.error('Error: ', error);
        throw error;
      }
    }
  };

  const recordVideo = async () => {
    if (!role) {
      console.log('Role not loaded yet');
      return;
    }
  
    if (role === 'doctor') {
      if (!recording) {
        setRecording(true);
        try {
          const video = await ref.current?.recordAsync({ maxDuration: 60 });
          if (video?.uri) {
            setUri(video.uri);
          }
        } catch (error) {
          console.error("Recording failed:", error);
        } finally {
          setRecording(false);
        }
      }
    } else if (role === 'patient') {
      if (!recording) {
        Alert.alert("Recording will start in 5 seconds!");
        try {
          const downloadedUri = await downloadDoctorVideo(videoObjectName);
          if (downloadedUri) {
            setDoctorVideoUri(downloadedUri);
          } else {
            console.error("Failed to download doctor's video.");
            return;
          }
        } catch (error) {
          console.error("Download doctor video error:", error);
          return;
        }
          setTimeout(async () => {
          setRecording(true);
          try {
            const video = await ref.current?.recordAsync({ maxDuration: 60 });
            if (video?.uri) {
              setUri(video.uri);
            }
          } catch (error) {
            console.error("Recording failed:", error);
          } finally {
            setRecording(false);
          }
        }, 5000);
      }
    }
  };
  
  const stopVideo = async () => {
    ref.current?.stopRecording();
    setRecording(false);
  };

  const uploadVideo = async (videoUri: string, title: string) => {
    if (!videoUri) return;
    try {
      const formData = new FormData();
      const fileName = videoUri.split('/').pop();

      console.log(videoUri)

      formData.append('file', {
        uri: videoUri,
        name: fileName,
        type: 'video/quicktime',
      } as any);
      formData.append('patient_id', patientId);
      formData.append('title', title);

      const response = await fetch(`${API_URL}/video/upload`, {
        method: 'POST',
        body: formData,
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Upload failed');
      }

      const data = await response.json();
      console.log('Upload successful:', data);
      Alert.alert('Success', 'Video uploaded successfully');
      return data;
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to upload video');
      throw error;
    }
  };

  const renderPreview = () => (
    <View style={styles.container}>
      <Video
        source={{ uri: uri || '' }}
        style={styles.mediaPreview}
        useNativeControls
        resizeMode={ResizeMode.COVER}
        shouldPlay
        isLooping
      />
      <TouchableOpacity style={styles.button} onPress={() => setUri(null)}>
        <Text style={styles.text}>Record Another Video</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={() => {
        if (uri) setModalVisible(true);  
      }}
      >
        <Text style={styles.text}>Upload Video</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType='slide' transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Enter Video Title</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Shoulder Rehab Day 1"
              value={title}
              onChangeText={setVideoTitle}
            />
            <TouchableOpacity
              style={styles.button}
              onPress={() => {
                setModalVisible(false);
                if (uri) {
                  uploadVideo(uri, title); 
                }
              }}
            >
            <Text style={styles.text}>Submit</Text>
          </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );

  const renderCamera = () => {
    return (
      <View style={styles.container}>
        <CameraView 
          style={styles.camera}
          ref={ref}
          mode="video"
          facing="front"
          mute={false}
          responsiveOrientationWhenOrientationLocked
        >
          {doctorVideoUri && role === "patient" && recording && (
            <Video
              source={{ uri: doctorVideoUri }}
              style={StyleSheet.absoluteFill} 
              resizeMode={ResizeMode.COVER}
              shouldPlay
              isLooping
            />
          )}
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.shutterButton}
              onPress={recording ? stopVideo : recordVideo}
            >
              <View style={[
                styles.shutterButtonInner,
                { backgroundColor: recording ? "gray" : "red" }
              ]}/>
            </TouchableOpacity>
          </View>
        </CameraView>
      </View>
    );
  };
  
  return uri ? renderPreview() : renderCamera();
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    textAlign: 'center',
    paddingBottom: 10,
    color: 'white',
  },
  camera: {
    flex: 1,
    width: '100%',
  },
  mediaPreview: {
    flex: 1,
    width: '100%',
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    alignSelf: 'center',
    paddingVertical: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: '100%',
    alignItems: 'center',
  },
  button: {
    backgroundColor: 'white', 
    padding: 15,
    alignItems: 'center',
    borderRadius: 8,
    marginVertical: 8,
  },
  text: {
    fontSize: 16,
    color: 'black',
    fontWeight: '600'
  },
  shutterButton: {
    borderWidth: 5,
    borderColor: 'white',
    width: 85,
    height: 85,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterButtonInner: {
    width: 70,
    height: 70,
    borderRadius: 50,
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

export default CameraScreen;
