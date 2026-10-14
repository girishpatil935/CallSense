import os
from pathlib import Path
import json
from datetime import datetime

from faster_whisper import WhisperModel

BASE_DIR = Path(__file__).resolve().parent


def get_config():
    audio_path = Path(os.environ.get("CALLSENSE_AUDIO_PATH", BASE_DIR / "Demo Audio.mp4"))
    artifacts_dir = Path(os.environ.get("CALLSENSE_ARTIFACTS_DIR", BASE_DIR / "artifacts"))
    output_dir = artifacts_dir / "transcription"
    model_size = os.environ.get("WHISPER_MODEL_SIZE", "base")
    compute_type = os.environ.get("WHISPER_COMPUTE_TYPE", "int8")
    cache_dir = os.environ.get("WHISPER_CACHE_DIR")
    return audio_path, artifacts_dir, output_dir, model_size, compute_type, cache_dir


AUDIO_FILE = Path(os.environ.get("CALLSENSE_AUDIO_PATH", BASE_DIR / "Demo Audio.mp4"))
OUTPUT_DIR = Path(os.environ.get("CALLSENSE_ARTIFACTS_DIR", BASE_DIR / "artifacts")) / "transcription"

MODEL_SIZE = os.environ.get("WHISPER_MODEL_SIZE", "base")
COMPUTE_TYPE = os.environ.get("WHISPER_COMPUTE_TYPE", "int8")
CACHE_DIR = os.environ.get("WHISPER_CACHE_DIR")


def main():
    audio_file, _, output_dir, model_size, compute_type, cache_dir = get_config()

    if not audio_file.exists():
        raise FileNotFoundError(f"Audio file not found: {audio_file}")

    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"Audio file: {audio_file}")
    print(f"File size: {audio_file.stat().st_size:,} bytes")
    print(f"Loading Whisper model: {model_size}")
    if cache_dir:
        print(f"Whisper cache directory: {cache_dir}")
    print("The first run may download the model. Please wait...")

    model_kwargs = {
        "device": "cpu",
        "compute_type": compute_type,
    }
    if cache_dir:
        model_kwargs["download_root"] = cache_dir

    model = WhisperModel(
        model_size,
        **model_kwargs,
    )

    print("Transcribing audio...")

    segments, info = model.transcribe(
        str(audio_file),
        beam_size=5,
        vad_filter=True,
    )

    transcript_lines = []
    segment_data = []

    for segment in segments:
        text = segment.text.strip()

        if not text:
            continue

        line = (
            f"[{segment.start:07.2f}s - "
            f"{segment.end:07.2f}s] {text}"
        )

        print(line)
        transcript_lines.append(line)

        segment_data.append({
            "start": round(segment.start, 3),
            "end": round(segment.end, 3),
            "text": text,
        })

    if not segment_data:
        raise RuntimeError(
            "No speech segments were returned. "
            "Check whether the recording contains audible speech."
        )

    transcript_path = output_dir / "transcript.txt"
    metadata_path = output_dir / "transcript.json"

    transcript_path.write_text(
        "\n".join(transcript_lines) + "\n",
        encoding="utf-8",
    )

    metadata = {
        "source_file": audio_file.name,
        "file_size_bytes": audio_file.stat().st_size,
        "model": model_size,
        "device": "cpu",
        "compute_type": compute_type,
        "language": info.language,
        "language_probability": info.language_probability,
        "duration_seconds": info.duration,
        "processed_at": datetime.now().astimezone().isoformat(),
        "segments": segment_data,
    }

    metadata_path.write_text(
        json.dumps(metadata, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    print("\nTranscription completed!")
    print(f"Language: {info.language}")
    print(f"Duration: {info.duration:.2f} seconds")
    print(f"Transcript: {transcript_path}")
    print(f"Timestamped JSON: {metadata_path}")


if __name__ == "__main__":
    main()