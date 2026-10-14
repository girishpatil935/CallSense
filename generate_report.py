import os
from pathlib import Path
import json
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    KeepTogether,
)

BASE_DIR = Path(__file__).resolve().parent


def get_config():
    artifacts_dir = Path(os.environ.get("CALLSENSE_ARTIFACTS_DIR", BASE_DIR / "artifacts"))
    transcript_file = artifacts_dir / "transcription" / "transcript.json"
    sentiment_file = artifacts_dir / "sentiment" / "sentiment.json"
    output_dir = artifacts_dir / "reports"
    output_file = output_dir / "callsense_analysis_report.pdf"
    return artifacts_dir, transcript_file, sentiment_file, output_dir, output_file


TRANSCRIPT_FILE = Path(os.environ.get("CALLSENSE_ARTIFACTS_DIR", BASE_DIR / "artifacts")) / "transcription" / "transcript.json"
SENTIMENT_FILE = Path(os.environ.get("CALLSENSE_ARTIFACTS_DIR", BASE_DIR / "artifacts")) / "sentiment" / "sentiment.json"
OUTPUT_DIR = Path(os.environ.get("CALLSENSE_ARTIFACTS_DIR", BASE_DIR / "artifacts")) / "reports"
OUTPUT_FILE = OUTPUT_DIR / "callsense_analysis_report.pdf"


def main():
    _, transcript_file, sentiment_file, output_dir, output_file = get_config()

    if not transcript_file.exists() or not sentiment_file.exists():
        raise FileNotFoundError(
            f"Missing transcript or sentiment output at '{transcript_file}' or '{sentiment_file}'. "
            "Run transcribe_audio.py and analyze_sentiment.py first."
        )

    transcript = json.loads(transcript_file.read_text(encoding="utf-8"))
    analysis = json.loads(sentiment_file.read_text(encoding="utf-8"))

    segments = analysis.get("segments", [])
    summary = analysis.get("summary", {})

    output_dir.mkdir(parents=True, exist_ok=True)

    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(
        name="ReportTitle",
        parent=styles["Title"],
        alignment=TA_CENTER,
        textColor=colors.HexColor("#72566F"),
        spaceAfter=8,
    ))
    styles.add(ParagraphStyle(
        name="SectionHeading",
        parent=styles["Heading2"],
        textColor=colors.HexColor("#72566F"),
        spaceBefore=12,
        spaceAfter=6,
    ))
    styles.add(ParagraphStyle(
        name="SmallText",
        parent=styles["BodyText"],
        fontSize=8,
        leading=11,
    ))

    doc = SimpleDocTemplate(
        str(output_file),
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
        title="CallSense AI - Call Analysis Report",
        author="CallSense AI",
    )

    story = [
        Paragraph("CallSense AI", styles["ReportTitle"]),
        Paragraph("Audio Transcription & Sentiment Report", styles["Heading2"]),
        Spacer(1, 5 * mm),
        Paragraph(
            f"<b>Source recording:</b> {transcript.get('source_file', 'Unknown')}",
            styles["BodyText"],
        ),
        Paragraph(
            f"<b>Language:</b> {transcript.get('language', 'Unknown')}",
            styles["BodyText"],
        ),
        Paragraph(
            f"<b>Audio duration:</b> "
            f"{transcript.get('duration_seconds', 0):.1f} seconds",
            styles["BodyText"],
        ),
        Paragraph(
            f"<b>Transcription model:</b> "
            f"{transcript.get('model', 'Unknown')}",
            styles["BodyText"],
        ),
        Paragraph(
            f"<b>Sentiment model:</b> {analysis.get('sentiment_model', 'Unknown')}",
            styles["BodyText"],
        ),
        Spacer(1, 5 * mm),
        Paragraph("Sentiment Summary", styles["SectionHeading"]),
    ]

    table_data = [
        ["Metric", "Count", "Percentage"],
        [
            "Positive segments",
            str(summary.get("positive_segments", 0)),
            f"{summary.get('positive_percentage', 0):.2f}%",
        ],
        [
            "Negative segments",
            str(summary.get("negative_segments", 0)),
            f"{summary.get('negative_percentage', 0):.2f}%",
        ],
        ["Total segments", str(summary.get("total_segments", len(segments))), "100%"],
    ]

    table = Table(table_data, colWidths=[75 * mm, 35 * mm, 35 * mm], repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#72566F")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#DDD5DF")),
        ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#F8F5F9")),
        ("PADDING", (0, 0), (-1, -1), 7),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    story.extend([table, Spacer(1, 4 * mm)])

    story.append(Paragraph("Segment-by-Segment Analysis", styles["SectionHeading"]))

    for item in segments:
        start = item.get("start", 0)
        end = item.get("end", 0)
        text = item.get("text", "")
        sentiment = item.get("sentiment", "UNKNOWN")
        score = item.get("model_score", 0)

        # Escape transcript text so punctuation cannot break PDF markup.
        from xml.sax.saxutils import escape
        safe_text = escape(text)

        block = [
            Paragraph(
                f"<b>{start:.2f}s - {end:.2f}s | {sentiment} "
                f"| model score: {score:.3f}</b>",
                styles["SmallText"],
            ),
            Paragraph(safe_text, styles["BodyText"]),
            Spacer(1, 3 * mm),
        ]
        story.append(KeepTogether(block))

    story.extend([
        Spacer(1, 4 * mm),
        Paragraph("Methodology and Limitations", styles["SectionHeading"]),
        Paragraph(
            "Speech was transcribed with the recorded Whisper model metadata. "
            "Sentiment labels were produced by the specified DistilBERT SST-2 "
            "binary classifier. Model scores are not calibrated probabilities. "
            "This model does not natively classify neutral sentiment. "
            "Automated predictions can be inaccurate, particularly for mixed "
            "feelings, sarcasm, transcription errors, and context-dependent "
            "sales conversations. Sentiment is not purchase intent.",
            styles["BodyText"],
        ),
        Spacer(1, 4 * mm),
        Paragraph(
            f"<b>Generated:</b> {datetime.now().astimezone().isoformat(timespec='seconds')}",
            styles["SmallText"],
        ),
    ])

    doc.build(story)
    print(f"PDF report generated successfully: {output_file}")


if __name__ == "__main__":
    main()