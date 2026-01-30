import os
# build = fabrique le client youtube
from googleapiclient.discovery import build
# HttpError = erreur renvoyé par l api youtube si souci (quota, key invalide etc)
from googleapiclient.errors import HttpError

YOUTUBE_API_SERVICE_NAME = "youtube"
YOUTUBE_API_VERSION = "v3"


#recupee api key youtube depuis les variables d environement
def get_api_key() -> str:
    api_key = os.getenv("YOUTUBE_API_KEY")
    if not api_key:
        raise RuntimeError("Set the YOUTUBE_API_KEY environment variable first.")
    return api_key

#recherche youtube avec api key requete et list
def youtube_search(query: str, max_results: int = 5):
    api_key = get_api_key()
    youtube = build(YOUTUBE_API_SERVICE_NAME, YOUTUBE_API_VERSION, developerKey=api_key)

    search_response = (
        youtube.search()
        .list(q=query, part="snippet", maxResults=max_results)
        .execute()
    )

# parcours result
    videos = []
    for item in search_response.get("items", []):
        if item["id"]["kind"] == "youtube#video":
            title = item["snippet"]["title"]
            video_id = item["id"]["videoId"]
            videos.append(f"- {title} (ID: {video_id})")

    return videos


if __name__ == "__main__":
    try:
        search_query = "tutoriel guitare debutant"
        results = youtube_search(search_query)
        print(f"Voici 5 videos pour '{search_query}':\n")
        for video in results:
            print(video)
    except HttpError as e:
        print(f"YouTube API error: {e}")
    except RuntimeError as e:
        print(e)
