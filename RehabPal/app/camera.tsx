import { CameraView, CameraType, useCameraPermissions, useMicrophonePermissions, CameraMode } from 'expo-camera';
import { useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View, Button } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import Constants from 'expo-constants';
import { useSelector } from "react-redux";
import { RootState } from "../src/store";
import auth from '@react-native-firebase/auth';

const API_URL = Constants.expoConfig?.extra?.API_URL;

const CameraScreen = () => {
  const [permission, requestPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const ref = useRef<CameraView>(null);
  const [uri, setUri] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const patientId = useSelector((state: RootState) => state.patient.patientId);
    
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

  const recordVideo = async () => {
    if (!recording) {
      setRecording(true);
      try {
        const video = await ref.current?.recordAsync({
            maxDuration: 30 // Max 30 second duration
        });
        if (video?.uri) {
          setUri(video.uri);
          await uploadVideo(video.uri);
        }
      } catch (error) {
        console.error("Recording failed:", error);
      } finally {
        setRecording(false); 
      }
    }
  };

  const stopVideo = async () => {
    ref.current?.stopRecording();
    setRecording(false);
  };

  const uploadVideo = async (videoUri: string) => {
    if (!videoUri) return;
    const user = auth().currentUser;
    if (!user) return;

    const token = await user.getIdToken();
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
    </View>
  );

  const renderCamera = () => (
    <View style={styles.container}>
      <CameraView 
        style={styles.camera}
        ref={ref}
        mode="video"
        facing="front"
        mute={false}
        responsiveOrientationWhenOrientationLocked
      >
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

  return uri ? renderPreview() : renderCamera();
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
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
});

export default CameraScreen;
