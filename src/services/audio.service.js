
import { Audio } from 'expo-av';
import socketService from './socket.service';

class AudioService {
  constructor() {
    this.recording = null;
    this.sound = null;
    this.isRecording = false;
    this.isPlaying = false;
  }

  async initialize() {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
      console.log('✅ Audio initialized');
    } catch (error) {
      console.error('❌ Audio initialization error:', error);
      throw error;
    }
  }

  async startRecording(callId, targetUserId) {
    try {
      if (this.isRecording) return;

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      this.recording = recording;
      this.isRecording = true;

      // Send audio chunks via Socket.IO
      this.recording.setOnRecordingStatusUpdate((status) => {
        if (status.isRecording && status.durationMillis % 100 === 0) {
          // Send audio data every 100ms
          this.sendAudioChunk(callId, targetUserId);
        }
      });

      console.log('✅ Recording started');
    } catch (error) {
      console.error('❌ Start recording error:', error);
      throw error;
    }
  }

  async stopRecording() {
    try {
      if (!this.recording) return;

      await this.recording.stopAndUnloadAsync();
      this.recording = null;
      this.isRecording = false;

      console.log('✅ Recording stopped');
    } catch (error) {
      console.error('❌ Stop recording error:', error);
    }
  }

  async sendAudioChunk(callId, targetUserId) {
    try {
      if (!this.recording) return;

      const uri = this.recording.getURI();
      // In production, convert to base64 or stream chunks
      socketService.emit('audio_chunk', {
        callId,
        targetUserId,
        audioData: uri, // Send audio data
      });
    } catch (error) {
      console.error('❌ Send audio chunk error:', error);
    }
  }

  async playAudioChunk(audioData) {
    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioData },
        { shouldPlay: true }
      );
      
      this.sound = sound;
      await sound.playAsync();
    } catch (error) {
      console.error('❌ Play audio error:', error);
    }
  }

  async cleanup() {
    try {
      if (this.recording) {
        await this.stopRecording();
      }
      if (this.sound) {
        await this.sound.unloadAsync();
        this.sound = null;
      }
      this.isRecording = false;
      this.isPlaying = false;
    } catch (error) {
      console.error('❌ Cleanup error:', error);
    }
  }
}

export default new AudioService();