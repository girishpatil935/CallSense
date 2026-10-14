
import subprocess
import sys

STAGES = [
    ["python", "transcribe_audio.py"],
    ["python", "analyze_sentiment.py"],
    ["python", "generate_report.py"],
]

def main():
    for command in STAGES:
        print(f"\nRunning: {' '.join(command)}", flush=True)
        result = subprocess.run(command, check=False)

        if result.returncode != 0:
            print(
                f"Pipeline stopped: {command[1]} failed "
                f"with exit code {result.returncode}.",
                file=sys.stderr,
            )
            sys.exit(result.returncode)

    print("\nCallSense AI pipeline completed successfully.", flush=True)

if __name__ == "__main__":
    main()
