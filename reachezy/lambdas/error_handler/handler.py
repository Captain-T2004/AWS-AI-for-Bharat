import json
from shared.db import get_db_connection

def handler(event, context):
    """
    Catch-all error handler for the Step Functions pipeline.
    Marks a video as 'error' in the database if any step fails.
    
    The event will usually contain the error output from the failing step via ResultPath.
    We need to extract the video_id or s3_key from the original input.
    """
    print(f"Error Handler Invoked: {json.dumps(event)}")
    
    # Step Functions Catch block should pass the original input, or at least video_id/s3_key
    video_id = event.get("video_id")
    s3_key = event.get("s3_key")
    error_info = event.get("errorInfo", {})
    
    # Sometimes event is wrapped differently depending on where it failed
    if not video_id and not s3_key:
        if "extractResult" in event and isinstance(event["extractResult"], dict):
            video_id = event["extractResult"].get("video_id")
        elif "analyzeResult" in event and isinstance(event["analyzeResult"], dict):
             video_id = event["analyzeResult"].get("video_id")
    
    if not video_id and not s3_key:
        print("Could not find video_id or s3_key in the error payload. Cannot update DB.")
        return {"status": "skipped", "reason": "Missing identifiers"}

    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Mark as error
        if video_id:
            cur.execute(
                "UPDATE video_uploads SET status = 'error' WHERE id = %s",
                (video_id,)
            )
        else:
             cur.execute(
                "UPDATE video_uploads SET status = 'error' WHERE s3_key = %s",
                (s3_key,)
            )
            
        conn.commit()
        print(f"Successfully marked video (id: {video_id}, key: {s3_key}) as error.")
        return {"status": "success", "video_id": video_id}
        
    except Exception as e:
        print(f"Database update failed in error handler: {e}")
        return {"status": "failed", "error": str(e)}
