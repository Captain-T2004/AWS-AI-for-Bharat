import os
import re
import subprocess
import urllib.parse
import boto3
from shared.db import get_db_connection

FFMPEG_PATH = "/opt/bin/ffmpeg"


def parse_duration(ffmpeg_stderr):
    """Extract Duration: HH:MM:SS.ms from FFmpeg stderr output.

    Returns duration in seconds as a float, or None if not found.
    """
    match = re.search(r"Duration:\s*(\d{2}):(\d{2}):(\d{2})\.(\d+)", ffmpeg_stderr)
    if not match:
        return None
    hours = int(match.group(1))
    minutes = int(match.group(2))
    seconds = int(match.group(3))
    fraction = match.group(4)
    frac_seconds = int(fraction) / (10 ** len(fraction))
    return hours * 3600 + minutes * 60 + seconds + frac_seconds


def handler(event, context):
    """Extract frames from a video at 0%, 25%, 50%, 75% of duration.

    Accepts EITHER format:
      EventBridge: { bucket, key, size, region, time }
      Direct:      { source_bucket, s3_key, video_id, creator_id }

    Returns:
        { video_id, creator_id, frame_keys: [...], duration_seconds }
    """
    # --- Normalize input: accept both EventBridge and direct invocation ---
    if "source_bucket" in event:
        # Direct invocation (e.g., from tests or manual trigger)
        source_bucket = event["source_bucket"]
        s3_key = event["s3_key"]
        video_id = event.get("video_id")
        creator_id = event.get("creator_id")
    else:
        # EventBridge trigger: { bucket, key, ... }
        # EventBridge URL-encodes the S3 key — decode it before use
        source_bucket = event["bucket"]
        s3_key = urllib.parse.unquote_plus(event["key"])
        video_id = None
        creator_id = None

    print(f"Processing: bucket={source_bucket}, key={s3_key}")

    # --- Look up video_id and creator_id from DB if not provided ---
    if not video_id or not creator_id:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT id, creator_id FROM video_uploads WHERE s3_key = %s LIMIT 1",
            (s3_key,),
        )
        row = cur.fetchone()
        if row:
            video_id = str(row[0])
            creator_id = str(row[1])
            print(f"Found in DB: video_id={video_id}, creator_id={creator_id}")
        else:
            # Fallback: extract creator_id from S3 key path (uploads/{creator_id}/...)
            parts = s3_key.split("/")
            if len(parts) >= 2:
                creator_id = parts[1]  # uploads/{creator_id}/{filename}
            # Generate a video_id from the key
            video_id = s3_key.replace("/", "_").replace(".", "_")
            print(f"Not found in DB, using fallback: video_id={video_id}, creator_id={creator_id}")

    frames_bucket = os.environ["FRAMES_BUCKET"]
    s3 = boto3.client("s3")

    # Download video to /tmp
    local_video = f"/tmp/{video_id}.mp4"
    s3.download_file(source_bucket, s3_key, local_video)

    # Probe video duration using FFmpeg
    probe_result = subprocess.run(
        [FFMPEG_PATH, "-i", local_video],
        capture_output=True,
        text=True,
    )
    duration_seconds = parse_duration(probe_result.stderr)
    if duration_seconds is None or duration_seconds <= 0:
        raise ValueError(f"Could not determine video duration from FFmpeg output: {probe_result.stderr[:500]}")

    print(f"Video duration: {duration_seconds:.2f}s")

    # Extract 4 frames at 0%, 25%, 50%, 75%
    frame_positions = [0.0, 0.25, 0.50, 0.75]
    frame_keys = []

    for i, pct in enumerate(frame_positions):
        timestamp = duration_seconds * pct
        local_frame = f"/tmp/{video_id}_frame_{i}.jpg"
        frame_key = f"{creator_id}/{video_id}/frame_{i}.jpg"

        subprocess.run(
            [
                FFMPEG_PATH,
                "-ss", str(timestamp),
                "-i", local_video,
                "-frames:v", "1",
                "-q:v", "2",
                "-y",
                local_frame,
            ],
            capture_output=True,
            text=True,
            check=True,
        )

        s3.upload_file(
            local_frame,
            frames_bucket,
            frame_key,
            ExtraArgs={"ContentType": "image/jpeg"},
        )
        frame_keys.append(frame_key)

        if os.path.exists(local_frame):
            os.remove(local_frame)

    if os.path.exists(local_video):
        os.remove(local_video)

    # Update video_uploads row: status='processing', duration_seconds
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        """
        UPDATE video_uploads
        SET status = 'processing', duration_seconds = %s
        WHERE id = %s OR s3_key = %s
        """,
        (round(duration_seconds, 2), video_id, s3_key),
    )
    conn.commit()

    print(f"Extracted {len(frame_keys)} frames, returning result")

    return {
        "video_id": video_id,
        "creator_id": creator_id,
        "frame_keys": frame_keys,
        "duration_seconds": round(duration_seconds, 2),
    }
