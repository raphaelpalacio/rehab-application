import {
    Camera,
    useCameraDevice,
    useCameraPermission,
    useFrameProcessor,
    useMicrophonePermission,
} from "react-native-vision-camera";
import { useEffect, useRef, useState } from "react";
import {
    Alert,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Button,
    Modal,
    TextInput,
} from "react-native";
import { Video, ResizeMode, AVPlaybackStatus } from "expo-av";
import Constants from "expo-constants";
import { useSelector } from "react-redux";
import { RootState } from "../slices/store";
import auth from "@react-native-firebase/auth";
import { useLocalSearchParams } from "expo-router";
import * as FileSystem from "expo-file-system";
import { useSharedValue } from "react-native-worklets-core";

const API_URL = Constants.expoConfig?.extra?.API_URL;

const CameraScreen = () => {
    const { hasPermission, requestPermission } = useCameraPermission();
    const {
        hasPermission: hasMicPermission,
        requestPermission: requestMicPermission,
    } = useMicrophonePermission();
    const device = useCameraDevice("front");
    const ref = useRef<Camera>(null);
    const [uri, setUri] = useState<string | null>(null);
    const [recording, setRecording] = useState(false);
    const patientId = useSelector(
        (state: RootState) => state.patient.patientId
    );
    const [modalVisible, setModalVisible] = useState(false);
    const [title, setVideoTitle] = useState("");
    const params = useLocalSearchParams();
    const videoObjectName = params.videoObjectName as string;
    const [role, setRole] = useState<string | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [doctorVideoUri, setDoctorVideoUri] = useState<string | null>(null);
    
    const frame = useSharedValue(0);

    const frameProcessor = useFrameProcessor((f) => {
        "worklet";
        frame.value += 1;
    }, [frame]);

    useEffect(() => {
        const fetchRole = async () => {
            const user = auth().currentUser;
            if (user) {
                const decodedToken = await user.getIdTokenResult();
                const fetchedToken = await user.getIdToken();
                setRole(decodedToken.claims.role || null);
                setToken(fetchedToken);

                if (decodedToken.claims.role == 'patient') {
                    downloadDoctorVideo(videoObjectName, fetchedToken)
                }
            }
        };

        fetchRole();
    }, []);

    useEffect(() => {
        if (!recording) return;

        const sendPhoto = async (formData: FormData) => {
            try {
                const res = await fetch(`${API_URL}/video/snapshot`, {
                    method: "POST",
                    body: formData,
                    headers: {
                        Authorization: `Bearer ${await auth().currentUser?.getIdToken()}`,
                    },
                });
                console.log(res);
            } catch (e) {
                console.log(e);
            }
        };

        const interval = setInterval(() => {
            ref.current?.takeSnapshot()
                .then((snapshot) => {
                    // const formData = new FormData();
                    // const filename = snapshot.path.split("/").pop();
                    // formData.append("file", {
                    //     uri: `file://${snapshot.path}`,
                    //     name: filename,
                    //     type: "image/jpeg",
                    // } as any);

                    // sendPhoto(formData);
                    // console.log(snapshot);
                    console.log(frame.value);
                })
                .catch((e) => console.log(e));
        }, 500);

        return () => {
            clearInterval(interval);
        };
    }, [recording]);

    if (!hasPermission || !hasMicPermission) {
        return (
            <View style={styles.container}>
                <Text style={styles.message}>
                    We need your permission to show the camera
                </Text>
                <Button
                    onPress={() => {
                        if (!hasPermission) requestPermission();
                        if (!hasMicPermission) requestMicPermission();
                    }}
                    title="grant permission"
                />
            </View>
        );
    }

    const downloadDoctorVideo = async (videoObjectName: string, token: string) => {
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
                        },
                    }
                );
                console.log("Finished downloading to", res.uri);
                
                setDoctorVideoUri(res.uri);
            } catch (error) {
                console.error("Recording failed:", error);
                throw error;
            }
        }
    };

    const recordVideo = () => {
        if (!role) {
            console.log("Role not loaded yet");
            return;
        }
                
        Alert.alert("Recording will start in 5 seconds!");
        setTimeout(() => {
            ref.current?.startRecording({
                onRecordingFinished(video) {
                    video.path;
                    console.log(video, video.path);
                    setRecording(false);
                    setUri(`file://${video.path}`);
                },
                onRecordingError(error) {
                    console.log(error);
                    setRecording(false);
                },
            });
            setRecording(true);
        }, 5000);
    };

    const stopVideo = async () => {
        ref.current?.stopRecording();
        setRecording(false);
    };

    const uploadVideo = async (videoUri: string, title: string) => {
        if (!videoUri) return;

        try {
            const formData = new FormData();
            const fileName = videoUri.split("/").pop();
            const extension = videoUri.split(".").pop();

            console.log(videoUri, extension);

            formData.append("file", {
                uri: videoUri,
                name: fileName,
                type: extension == "mov" ? "video/quicktime" : "video/mp4",
            } as any);
            formData.append("patient_id", patientId);
            formData.append("title", title);

            const response = await fetch(`${API_URL}/video/upload`, {
                method: "POST",
                body: formData,
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || "Upload failed");
            }

            const data = await response.json();
            console.log("Upload successful:", data);
            Alert.alert("Success", "Video uploaded successfully");
            return data;
        } catch (error) {
            console.error("Upload error:", error);
            Alert.alert(
                "Error",
                error instanceof Error
                    ? (error as Error).message
                    : "Failed to upload video"
            );
            throw error;
        }
    };

    const renderPreview = () => (
        <View style={styles.container}>
            <Video
                source={{ uri: uri || "" }}
                style={styles.mediaPreview}
                useNativeControls
                resizeMode={ResizeMode.COVER}
                shouldPlay
                isLooping
            />
            <TouchableOpacity
                style={styles.button}
                onPress={() => setUri(null)}
            >
                <Text style={styles.text}>Record Another Video</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={styles.button}
                onPress={() => {
                    if (uri) setModalVisible(true);
                }}
            >
                <Text style={styles.text}>Upload Video</Text>
            </TouchableOpacity>

            <Modal visible={modalVisible} animationType="slide" transparent>
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

    console.log(role, doctorVideoUri, recording);
    const renderCamera = () => {
        return (
            <View style={styles.container}>
                <Camera
                    style={styles.camera}
                    device={device!}
                    ref={ref}
                    audio={true}
                    video={true}
                    frameProcessor={frameProcessor}
                    isActive
                />
                {doctorVideoUri && role === "patient" && recording && (
                    <Video
                        source={{ uri: doctorVideoUri }}
                        style={StyleSheet.absoluteFill}
                        resizeMode={ResizeMode.COVER}
                        shouldPlay
                        isLooping = {false}
                        onPlaybackStatusUpdate={(status: AVPlaybackStatus) => {
                            if (!status.isLoaded) return
                        
                            const { positionMillis, durationMillis, isPlaying } = status
                            if (durationMillis && positionMillis >= durationMillis - 50 && !isPlaying) {
                                stopVideo()
                            }
                          }}
                    />
                )}
                <View style={styles.buttonContainer}>
                    <TouchableOpacity
                        style={styles.shutterButton}
                        onPress={recording ? stopVideo : recordVideo}
                    >
                        <View
                            style={[
                                styles.shutterButtonInner,
                                { backgroundColor: recording ? "gray" : "red" },
                            ]}
                        />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return uri ? renderPreview() : renderCamera();
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "black",
        justifyContent: "center",
        alignItems: "center",
    },
    message: {
        textAlign: "center",
        paddingBottom: 10,
        color: "white",
    },
    camera: {
        flex: 1,
        width: "100%",
    },
    mediaPreview: {
        flex: 1,
        width: "100%",
    },
    buttonContainer: {
        position: "absolute",
        bottom: 0,
        alignSelf: "center",
        paddingVertical: 20,
        backgroundColor: "rgba(0,0,0,0.5)",
        width: "100%",
        alignItems: "center",
    },
    button: {
        backgroundColor: "white",
        padding: 15,
        alignItems: "center",
        borderRadius: 8,
        marginVertical: 8,
    },
    text: {
        fontSize: 16,
        color: "black",
        fontWeight: "600",
    },
    shutterButton: {
        borderWidth: 5,
        borderColor: "white",
        width: 85,
        height: 85,
        borderRadius: 45,
        alignItems: "center",
        justifyContent: "center",
    },
    shutterButtonInner: {
        width: 70,
        height: 70,
        borderRadius: 50,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.3)",
        justifyContent: "center",
        alignItems: "center",
    },
    modalContent: {
        backgroundColor: "white",
        padding: 20,
        borderRadius: 10,
        width: "80%",
        alignItems: "center",
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "bold",
    },
    input: {
        width: "100%",
        borderColor: "#ccc",
        borderWidth: 1,
        padding: 10,
        borderRadius: 8,
        marginTop: 10,
        marginBottom: 10,
    },
});

export default CameraScreen;
