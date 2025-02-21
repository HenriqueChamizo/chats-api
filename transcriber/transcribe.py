import whisper
import sys
import json

model = whisper.load_model("small")  # Pode ser "tiny", "base", "small", "medium", "large"
audio_path = sys.argv[1]  # O arquivo de áudio virá como argumento

result = model.transcribe(audio_path)
print(json.dumps(result))  # Retorna a transcrição como JSON