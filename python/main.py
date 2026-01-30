import subprocess
import pyaudio
import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI()

class SpeakRequest(BaseModel):
    text: str
    volume: float = 1.0

PIPER_EXE = "piper.exe" 
MODEL_PATH = "tr_TR-dfki-medium.onnx"
RATE = 22050 

p = pyaudio.PyAudio()

@app.post("/speak")
async def speak(req: SpeakRequest):
    try:
        command = [PIPER_EXE, "--model", MODEL_PATH, "--output_raw"]
        process = subprocess.Popen(command, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        stdout, stderr = process.communicate(input=req.text.encode('utf-8'))

        if process.returncode != 0:
            raise Exception(stderr.decode())

        # Ses işleme
        audio_data = np.frombuffer(stdout, dtype=np.int16).astype(np.float32)
        audio_data = np.clip(audio_data * req.volume, -32768, 32767).astype(np.int16)

        # Çalma
        stream = p.open(format=pyaudio.paInt16, channels=1, rate=RATE, output=True)
        stream.write(audio_data.tobytes())
        stream.stop_stream()
        stream.close()

        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)