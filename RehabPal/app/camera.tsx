import { CameraView, CameraType, useCameraPermissions, CameraMode } from 'expo-camera';
import { useRef, useState } from 'react';
import { Button, StyleSheet, Text, TouchableOpacity, View, Alert } from 'react-native';
import { Image } from 'expo-image';
import { ResizeMode, Video } from 'expo-av';
import AntDesign from "@expo/vector-icons/AntDesign";
import Feather from "@expo/vector-icons/Feather";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import Constants from 'expo-constants';
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../src/store";
import auth from '@react-native-firebase/auth';


const API_URL = Constants.expoConfig?.extra?.API_URL;

const CameraScreen = () => {
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const ref = useRef<CameraView>(null);
  const [uri, setUri] = useState<string | null>(null);
  const [mode, setMode] = useState<CameraMode>("picture");
  const [recording, setRecording] = useState(false);
  const patientId = useSelector((state: RootState) => state.patient.patientId);
  

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>We need your permission to show the camera</Text>
        <Button onPress={requestPermission} title="grant permission" />
      </View>
    );
  }

  const takePicture = async () => {
    const photo = await ref.current?.takePictureAsync();
    console.log(patientId)

    if (photo?.uri) {
      setUri(photo.uri);
    }
  };

  const recordVideo = async () => {
    const isVideo = uri?.endsWith(".mp4") || uri?.endsWith(".mov");
    if (!recording) {
      setRecording(true);
      try {
        const video = await ref.current?.recordAsync();
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
  }

  const uploadVideo = async (videoUri: string) => {
    if (!videoUri) return;

    const user = auth().currentUser;
        if (!user) return;
        const token = await user.getIdToken();
    
    try {
      const formData = new FormData();
      const fileName = videoUri.split('/').pop();
      
      formData.append('file', {
        uri: videoUri,
        name: fileName,
        type: 'video/quicktime',
      } as any);

      console.log(patientId)
      formData.append('patient_id', patientId)
      const response = await fetch(`${API_URL}/video/upload`, {
        method: 'POST',
        body: formData,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Upload failed:', errorData);
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
  

  const toggleMode = () => {
    setMode((prev) => (prev === "picture" ? "video" : "picture"));
  };

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };


  const renderPicture = () => {
    const isVideo = uri?.endsWith(".mp4") || uri?.endsWith(".mov");
  
    return (
      <View style={styles.container}>
        {isVideo ? (
          <Video
            source={{ uri: uri || '' }}
            style={styles.mediaPreview}
            useNativeControls
            resizeMode={ResizeMode.COVER}
            shouldPlay
            isLooping
          />
        ) : (
          <Image
            source={{ uri }}
            contentFit="cover"
            style={styles.mediaPreview}
          />
        )}
        <TouchableOpacity style={styles.button} onPress={() => setUri(null)}>
          <Text style={styles.text}>
            {isVideo ? "Record another video" : "Take another picture"}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderCamera = () => {
    return (
      <View style={styles.container}>
        <CameraView 
          style={styles.camera} 
          ref={ref}
          mode={mode}
          facing={facing}
          mute={false}
          responsiveOrientationWhenOrientationLocked
        >
          <View style={styles.buttonContainer}>
            <View style={styles.controlsContainer}>
              <TouchableOpacity onPress={toggleMode}>
                {mode === "picture" ? (
                  <AntDesign name="picture" size={32} color="white" />
                ) : (
                  <Feather name="video" size={32} color="white" />
                )}
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.shutterButton}
                onPress={mode === "picture" ? takePicture : (recording ? stopVideo : recordVideo)}
              >
                <View style={[
                  styles.shutterButtonInner,
                  { backgroundColor: mode === "picture" ? "white" : (recording ? "gray" : "red") }
                ]} />
              </TouchableOpacity>
              <TouchableOpacity onPress={toggleCameraFacing}>
                <FontAwesome6 name="rotate-left" size={32} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        </CameraView>
      </View>
    );
  };

  return uri ? renderPicture() : renderCamera();
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
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
    left: 0,
    right: 0,
    paddingTop:20,
    paddingBottom: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 30,
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
    backgroundColor: 'transparent',
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