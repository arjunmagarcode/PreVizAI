import sounddevice as sd
import numpy as np
import whisper
import wave
import threading
import os

# Load Whisper model (small or base is faster for real-time)
model = whisper.load_model("base")

# Parameters
samplerate = 16000  # Hz
channels = 1

recording = []
stop_recording = False

def audio_callback(indata, frames, time, status):
    global recording
    if status:
        print(status)
    recording.append(indata.copy())

def record_audio():
    global stop_recording
    with sd.InputStream(samplerate=samplerate, channels=channels, callback=audio_callback):
        print("Recording... Press Enter to stop.")
        input()  # Wait for Enter key
        stop_recording = True

# Start recording in main thread
record_audio()

# Convert to numpy array
audio_np = np.concatenate(recording, axis=0)
audio_np = (audio_np * 32768).astype(np.int16)  # Convert to int16 for WAV

folder = "audiofiles"
os.makedirs(folder, exist_ok=True)

# Save to temporary WAV file
wav_file = os.path.join(folder, "temp_audio.wav")
with wave.open(wav_file, "wb") as wf:
    wf.setnchannels(channels)
    wf.setsampwidth(2)  # 16-bit
    wf.setframerate(samplerate)
    wf.writeframes(audio_np.tobytes())

# Transcribe with Whisper
result = model.transcribe(wav_file)
print("\nTranscription:\n", result["text"])
