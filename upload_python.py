import os
import sys
import pickle
#autor appli
from google_auth_oauthlib.flow import InstalledAppFlow
#refresh des token
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

SCOPES = [
    "https://www.googleapis.com/auth/youtube.upload",
    "https://www.googleapis.com/auth/youtube.readonly",
]
API_SERVICE_NAME = "youtube"
API_VERSION = "v3"
CLIENT_SECRETS_FILE = "client_secret.json"


def get_authenticated_service():
    """Handle OAuth and return a YouTube service client."""
    credentials = None
    if os.path.exists("token.json"):
        with open("token.json", "rb") as token:
            credentials = pickle.load(token)

        stored_scopes = set(credentials.scopes or [])
        if not set(SCOPES).issubset(stored_scopes):
            credentials = None

    if not credentials or not credentials.valid:
        if credentials and credentials.expired and credentials.refresh_token:
            credentials.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(
                CLIENT_SECRETS_FILE, SCOPES
            )

            credentials = flow.run_local_server(
                host="localhost",
                port=5173,
                redirect_uri_trailing_slash=False,
                prompt="consent",  
            )

        with open("token.json", "wb") as token:
            pickle.dump(credentials, token)

    return build(API_SERVICE_NAME, API_VERSION, credentials=credentials)


def upload_video(youtube, file_path, title, description, tags, category_id, privacy_status):
    """Upload a video to YouTube."""
    body = {
        "snippet": {
            "title": title,
            "description": description,
            "tags": tags,
            "categoryId": category_id,
        },
        "status": {"privacyStatus": privacy_status},
    }

    media = MediaFileUpload(file_path, chunksize=-1, resumable=True)
    request = youtube.videos().insert(
        part=",".join(body.keys()),
        body=body,
        media_body=media,
    )

    response = None
    print("Debut de l'upload de la video...")
    while response is None:
        status, response = request.next_chunk()
        if status:
            print(f"Uploade {int(status.progress() * 100)}%")

    print(f"Upload termine ! ID de la video : {response.get('id')}")
    return response


if __name__ == "__main__":
    # À personnaliser avant exécution
    VIDEO_FILE_PATH = "C:\wamp64\MarsAi\ping.mp4"
    VIDEO_TITLE = "Titre de test"
    VIDEO_DESCRIPTION = "Description de test."
    VIDEO_TAGS = ["test", "api", "python"]
    VIDEO_CATEGORY_ID = "22"  # 22 = People & Blogs
    VIDEO_PRIVACY_STATUS = "private"  # "private", "public", or "unlisted"

    if not os.path.exists(VIDEO_FILE_PATH):
        print(f"Erreur : fichier video '{VIDEO_FILE_PATH}' introuvable.")
        sys.exit(1)

    youtube_service = get_authenticated_service()
    upload_video(
        youtube_service,
        VIDEO_FILE_PATH,
        VIDEO_TITLE,
        VIDEO_DESCRIPTION,
        VIDEO_TAGS,
        VIDEO_CATEGORY_ID,
        VIDEO_PRIVACY_STATUS,
    )
