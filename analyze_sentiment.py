import os
import json
from pathlib import Path
from collections import Counter

import torch
from transformers import pipeline

BASE_DIR = Path(__file__).resolve().parent


def get_config():
    artifacts_dir = Path(os.environ.get("CALLSENSE_ARTIFACTS_DIR", BASE_DIR / "artifacts"))
    input_file = artifacts_dir / "transcription" / "transcript.json"
    output_dir = artifacts_dir / "sentiment"
    output_file = output_dir / "sentiment.json"
    model_name = os.environ.get(
        "SENTIMENT_MODEL_ID",
        "distilbert/distilbert-base-uncased-finetuned-sst-2-english",
    )
    return artifacts_dir, input_file, output_dir, output_file, model_name


INPUT_FILE = Path(os.environ.get("CALLSENSE_ARTIFACTS_DIR", BASE_DIR / "artifacts")) / "transcription" / "transcript.json"
OUTPUT_DIR = Path(os.environ.get("CALLSENSE_ARTIFACTS_DIR", BASE_DIR / "artifacts")) / "sentiment"
OUTPUT_FILE = OUTPUT_DIR / "sentiment.json"
MODEL_NAME = os.environ.get(
    "SENTIMENT_MODEL_ID",
    "distilbert/distilbert-base-uncased-finetuned-sst-2-english",
)


def main():
    _, input_file, output_dir, output_file, model_name = get_config()

    if not input_file.exists():
        raise FileNotFoundError(
            f"Transcript not found: {input_file}. "
            "Run transcribe_audio.py first."
        )

    transcript = json.loads(input_file.read_text(encoding="utf-8"))
    segments = transcript.get("segments", [])

    if not segments:
        raise ValueError("The transcript contains no segments.")

    print(f"Loading sentiment model: {model_name}")
    print("The first run may download the model. Please wait...")

    classifier = pipeline(
        "text-classification",
        model=model_name,
        tokenizer=model_name,
        device=-1,
    )

    results = []

    # Batch sentences to reduce inference overhead.
    texts = [segment["text"].strip() for segment in segments]
    predictions = classifier(
        texts,
        batch_size=8,
        truncation=True,
        max_length=512,
    )

    for segment, prediction in zip(segments, predictions):
        label = prediction["label"].upper()
        score = float(prediction["score"])

        results.append({
            "start": segment["start"],
            "end": segment["end"],
            "text": segment["text"],
            "sentiment": label,
            "model_score": round(score, 4),
            "model": model_name,
        })

    counts = Counter(item["sentiment"] for item in results)
    total = len(results)

    summary = {
        "positive_segments": counts.get("POSITIVE", 0),
        "negative_segments": counts.get("NEGATIVE", 0),
        "total_segments": total,
        "positive_percentage": round(
            counts.get("POSITIVE", 0) / total * 100, 2
        ),
        "negative_percentage": round(
            counts.get("NEGATIVE", 0) / total * 100, 2
        ),
    }

    output_dir.mkdir(parents=True, exist_ok=True)

    output = {
        "source_file": transcript.get("source_file"),
        "transcription_model": transcript.get("model"),
        "sentiment_model": model_name,
        "classification_type": "binary",
        "note": (
            "DistilBERT SST-2 predicts positive or negative sentiment. "
            "Scores are model confidence scores, not calibrated "
            "probabilities. Neutral is not a native model label."
        ),
        "summary": summary,
        "segments": results,
    }

    output_file.write_text(
        json.dumps(output, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    print("\nSentiment analysis completed!")
    print(json.dumps(summary, indent=2))
    print(f"Full results saved to: {output_file}")

    print("\nSample predictions:")
    for item in results[:10]:
        print(
            f"[{item['start']:.2f}s] "
            f"{item['sentiment']} "
            f"({item['model_score']:.3f}): {item['text']}"
        )


if __name__ == "__main__":
    main()