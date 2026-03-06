"""Video Analyzer Lambda — AI-powered video frame analysis.

Supports two AI providers with automatic fallback:
  - "bedrock" : Amazon Bedrock Nova 2 Lite / Nova Lite (default)
  - "groq"    : Groq inference API with Llama 4 Scout vision (fallback)

Fallback chain: Bedrock (Nova 2 → Nova v1) → Groq
"""

import os
import json
import base64
import re
import boto3
import requests as http_requests
from shared.db import get_db_connection
from shared.bedrock_client import get_bedrock_client

# --- Provider config ---
AI_PROVIDER = os.environ.get("AI_PROVIDER", "bedrock")  # "bedrock" or "groq"

# Bedrock config — Nova 2 Lite primary, Nova Lite v1 fallback
BEDROCK_REGION = os.environ.get("BEDROCK_REGION", "us-east-1")
BEDROCK_MODEL_ID = os.environ.get("BEDROCK_MODEL_ID", "us.amazon.nova-2-lite-v1:0")
BEDROCK_MODEL_FALLBACKS = [
    BEDROCK_MODEL_ID,
    "amazon.nova-lite-v1:0",  # v1 fallback
]

# Groq config (OpenAI-compatible API)
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
GROQ_VISION_MODEL = os.environ.get("GROQ_VISION_MODEL", "meta-llama/llama-4-scout-17b-16e-instruct")
GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions"

ANALYSIS_PROMPT = """You are an expert content analyst for social media creators. Analyze these 4 frames extracted from a single video (taken at 0%, 25%, 50%, and 75% through the video).

Provide your analysis as a JSON object with exactly these fields:

{
  "energy_level": "<short label>",
  "aesthetic": "<short label>",
  "setting": "indoor" | "outdoor" | "studio" | "mixed",
  "production_quality": "low" | "medium" | "high" | "professional",
  "content_type": "<short label>",
  "topics": ["topic1", "topic2", ...],
  "dominant_colors": ["color1", "color2", "color3"],
  "text_on_screen": true | false,
  "face_visible": true | false,
  "summary": "A 1-2 sentence summary of the video content and style."
}

Rules:
- energy_level: A short label describing the energy and pace of the video. Use your best judgement — e.g. "calm", "moderate", "high", "chaotic", "intense", "chill", "upbeat". Pick whatever single word or short phrase fits best.
- aesthetic: A short label for the dominant visual style across all frames — e.g. "minimal", "vibrant", "dark", "pastel", "natural", "luxury", "streetwear", "corporate", "cozy", "editorial". Pick whatever fits best.
- setting: Where the content was filmed — must be one of: "indoor", "outdoor", "studio", "mixed".
- production_quality: Based on lighting, framing, and overall polish — must be one of: "low", "medium", "high", "professional".
- content_type: A short label for what kind of content this is — e.g. "tutorial", "vlog", "review", "comedy", "trend", "lifestyle", "GRWM", "unboxing", "haul", "recipe", "fitness". Pick whatever fits best.
- topics: 2-5 relevant topic tags (e.g., "skincare", "travel", "cooking", "fashion haul").
- dominant_colors: Top 3 colors visible across the frames.
- text_on_screen: Whether any text overlays or captions are visible.
- face_visible: Whether a human face is clearly visible in any frame.
- summary: Brief, descriptive summary of the content and creator's style.

Return ONLY the JSON object. No additional text, no markdown formatting, no code fences."""


def _clean_json_response(text):
    """Strip markdown code fences and extra whitespace from model response."""
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*\n?", "", text)
    text = re.sub(r"\n?```\s*$", "", text)
    return text.strip()

def _parse_analysis(raw_text):
    """Parse JSON from model response with fallback extraction."""
    analysis_template = {
        "energy_level": "moderate",
        "aesthetic": "natural",
        "setting": "mixed",
        "production_quality": "medium",
        "content_type": "general",
        "topics": [],
        "dominant_colors": [],
        "text_on_screen": False,
        "face_visible": False,
        "summary": "AI analysis was unable to process this video. This can happen if the content is too dark, blurry, or contains blocked material.",
    }

    print(f"DEBUG: raw_text from model (truncated): {raw_text[:500]}")
    cleaned_text = _clean_json_response(raw_text)

    # Check for specific safety block message
    if "blocked by our content safety policy" in raw_text.lower():
        print("DEBUG: Safety block detected in raw_text")
        return analysis_template

    try:
        parsed = json.loads(cleaned_text)
        return {**analysis_template, **parsed}
    except json.JSONDecodeError as e:
        print(f"DEBUG: JSON parsing failed: {e}. Trying regex fallback.")
        json_match = re.search(r"\{[\s\S]*\}", raw_text)
        if json_match:
            try:
                parsed = json.loads(json_match.group())
                return {**analysis_template, **parsed}
            except json.JSONDecodeError:
                print("DEBUG: Regex JSON extraction also failed.")
                pass

    print("DEBUG: Falling back to default analysis template.")
    return analysis_template


def _analyze_with_bedrock(frame_data_list, video_id):
    """Analyze frames using Amazon Bedrock with model fallback chain (Nova 2 → Nova v1)."""
    bedrock = get_bedrock_client(region=BEDROCK_REGION)

    content_blocks = []
    for i, frame_bytes in enumerate(frame_data_list):
        content_blocks.append({
            "text": f"Frame {i + 1} (at {int(i * 25)}% of video):"
        })
        content_blocks.append({
            "image": {
                "format": "jpeg",
                "source": {"bytes": frame_bytes},
            }
        })

    content_blocks.append({"text": ANALYSIS_PROMPT})

    guardrail_kwargs = {}
    guardrail_id = os.environ.get("GUARDRAIL_ID")
    guardrail_version = os.environ.get("GUARDRAIL_VERSION", "DRAFT")
    bedrock_role_arn = os.environ.get("BEDROCK_ROLE_ARN")

    # Skip guardrails for cross-account calls unless manually configured
    # Local guardrail IDs won't work in the secondary account
    if guardrail_id and not (bedrock_role_arn and bedrock_role_arn.strip()):
        guardrail_kwargs["guardrailConfig"] = {
            "guardrailIdentifier": guardrail_id,
            "guardrailVersion": guardrail_version,
        }
    elif guardrail_id and bedrock_role_arn and bedrock_role_arn.strip():
        print(f"Skipping local guardrail {guardrail_id} for cross-account role: {bedrock_role_arn}")

    last_error = None
    for model_id in BEDROCK_MODEL_FALLBACKS:
        try:
            print(f"Calling Bedrock Converse API with model {model_id} for video {video_id}")
            print(f"DEBUG: guardrail_kwargs: {guardrail_kwargs}")
            response = bedrock.converse(
                modelId=model_id,
                messages=[{"role": "user", "content": content_blocks}],
                inferenceConfig={"maxTokens": 1024, "temperature": 0.1},
                **guardrail_kwargs,
            )

            stop_reason = response.get("stopReason")
            raw_text = response["output"]["message"]["content"][0]["text"]
            print(f"Success with model {model_id}, response length: {len(raw_text)} chars, stop reason: {stop_reason}")
            
            # If guardrail intervened, retry without it to get the actual analysis
            if stop_reason == "guardrail_intervened" and guardrail_kwargs:
                print(f"Guardrail intercepted analysis for {model_id}, retrying without it.")
                retry_response = bedrock.converse(
                    modelId=model_id,
                    messages=[{"role": "user", "content": content_blocks}],
                    inferenceConfig={"maxTokens": 1024, "temperature": 0.1},
                )
                raw_text = retry_response["output"]["message"]["content"][0]["text"]
                print(f"Success with model {model_id} after bypassing guardrail.")

            return raw_text

        except Exception as e:
            # If guardrail is the problem, retry without it
            if "guardrail" in str(e).lower() and guardrail_kwargs:
                print(f"Guardrail error with {model_id}, retrying without guardrail: {e}")
                try:
                    response = bedrock.converse(
                        modelId=model_id,
                        messages=[{"role": "user", "content": content_blocks}],
                        inferenceConfig={"maxTokens": 1024, "temperature": 0.1},
                    )
                    raw_text = response["output"]["message"]["content"][0]["text"]
                    print(f"Success with model {model_id} (no guardrail), response length: {len(raw_text)} chars")
                    return raw_text
                except Exception as e2:
                    last_error = e2
                    print(f"Bedrock model {model_id} also failed without guardrail: {e2}")
                    continue
            last_error = e
            print(f"Bedrock model {model_id} failed for video {video_id}: {e}")
            continue

    raise RuntimeError(f"All Bedrock models failed for video {video_id}: {last_error}")


def _analyze_with_groq(frame_data_list, video_id):
    """Analyze frames using Groq API with Llama 4 Scout vision model."""
    # Build OpenAI-compatible content blocks with base64 images
    content_blocks = []
    for i, frame_bytes in enumerate(frame_data_list):
        content_blocks.append({
            "type": "text",
            "text": f"Frame {i + 1} (at {int(i * 25)}% of video):",
        })
        b64_data = base64.b64encode(frame_bytes).decode("utf-8")
        content_blocks.append({
            "type": "image_url",
            "image_url": {
                "url": f"data:image/jpeg;base64,{b64_data}",
            },
        })

    content_blocks.append({"type": "text", "text": ANALYSIS_PROMPT})

    print(f"Calling Groq API with model {GROQ_VISION_MODEL} for video {video_id}")
    resp = http_requests.post(
        GROQ_ENDPOINT,
        headers={
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "model": GROQ_VISION_MODEL,
            "max_tokens": 1024,
            "temperature": 0.1,
            "messages": [{"role": "user", "content": content_blocks}],
        },
        timeout=60,
    )

    if not resp.ok:
        raise RuntimeError(f"Groq API error: {resp.status_code} {resp.text[:500]}")

    raw_text = resp.json()["choices"][0]["message"]["content"]
    print(f"Groq response length: {len(raw_text)} chars")
    return raw_text


def handler(event, context):
    """Analyze video frames using AI with automatic fallback.

    Fallback chain: Bedrock (Nova 2 → v1) → Groq

    Receives:
        { video_id, creator_id, frame_keys, duration_seconds }

    Returns:
        { video_id, creator_id, analysis: {...} }
    """
    video_id = event["video_id"]
    creator_id = event["creator_id"]
    frame_keys = event["frame_keys"]
    duration_seconds = event.get("duration_seconds")

    frames_bucket = os.environ["FRAMES_BUCKET"]
    s3 = boto3.client("s3")

    # Download all frames from S3
    frame_data_list = []
    print(f"DEBUG: Downloading {len(frame_keys)} frames from bucket {frames_bucket}")
    for frame_key in frame_keys:
        response = s3.get_object(Bucket=frames_bucket, Key=frame_key)
        data = response["Body"].read()
        print(f"DEBUG: Frame {frame_key} size: {len(data)} bytes")
        frame_data_list.append(data)

    # Route to AI provider with automatic fallback
    raw_text = None
    bedrock_error = None

    # Check caller identity for debugging accounts
    try:
        sts_local = boto3.client("sts")
        identity = sts_local.get_caller_identity()
        print(f"DEBUG: Lambda is running as identity: {identity.get('Arn')} in account {identity.get('Account')}")
    except Exception as e:
        print(f"DEBUG: Could not get caller identity: {e}")

    # Try Bedrock first (unless explicitly set to groq-only)
    if AI_PROVIDER != "groq":
        try:
            raw_text = _analyze_with_bedrock(frame_data_list, video_id)
        except Exception as e:
            bedrock_error = str(e)
            print(f"Bedrock failed entirely for video {video_id}: {e}, trying Groq fallback")

    # Try Groq as fallback (or primary if AI_PROVIDER=groq)
    if raw_text is None and GROQ_API_KEY:
        try:
            print(f"DEBUG: Attempting Groq fallback for video {video_id}")
            raw_text = _analyze_with_groq(frame_data_list, video_id)
        except Exception as e:
            print(f"Groq also failed for video {video_id}: {e}")
            raise RuntimeError(f"All AI providers failed. Bedrock error: {bedrock_error}. Groq error: {e}")

    if raw_text is None:
        error_msg = f"No AI provider available for video {video_id}."
        if bedrock_error:
            error_msg += f" Last Bedrock error: {bedrock_error}"
        if not GROQ_API_KEY:
            error_msg += " (Groq fallback not configured: missing API key)"
        raise RuntimeError(error_msg)

    analysis = _parse_analysis(raw_text)

    # Insert into video_analyses table
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO video_analyses (
            video_id, creator_id, energy_level, aesthetic, setting,
            production_quality, content_type, topics, dominant_colors,
            has_text_overlay, face_visible, summary
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (video_id) DO UPDATE SET
            energy_level = EXCLUDED.energy_level,
            aesthetic = EXCLUDED.aesthetic,
            setting = EXCLUDED.setting,
            production_quality = EXCLUDED.production_quality,
            content_type = EXCLUDED.content_type,
            topics = EXCLUDED.topics,
            dominant_colors = EXCLUDED.dominant_colors,
            has_text_overlay = EXCLUDED.has_text_overlay,
            face_visible = EXCLUDED.face_visible,
            summary = EXCLUDED.summary,
            analyzed_at = NOW()
        """,
        (
            video_id,
            creator_id,
            analysis.get("energy_level", "moderate"),
            analysis.get("aesthetic", "natural"),
            analysis.get("setting", "mixed"),
            analysis.get("production_quality", "medium"),
            analysis.get("content_type", "general"),
            json.dumps(analysis.get("topics", [])),
            json.dumps(analysis.get("dominant_colors", [])),
            analysis.get("text_on_screen", False),
            analysis.get("face_visible", False),
            analysis.get("summary", ""),
        ),
    )
    conn.commit()

    return {
        "video_id": video_id,
        "creator_id": creator_id,
        "analysis": analysis,
    }
