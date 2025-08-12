from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
from dotenv import load_dotenv
import yt_dlp
import os

load_dotenv()

app = Flask(__name__)
CORS(app)

# Load config from .env
DOWNLOAD_FOLDER = os.getenv("DOWNLOAD_FOLDER", "downloads")
PORT = int(os.getenv("FLASK_PORT", 5000))

os.makedirs(DOWNLOAD_FOLDER, exist_ok=True)

@app.route('/api/download', methods=['POST'])
def download():
    data = request.json
    url = data.get('url')
    download_type = data.get('type')
    resolution = data.get('resolution')
    filename = data.get('filename')

    if not url:
        return jsonify({'error': 'Missing URL'}), 400

    filename = secure_filename(filename) if filename else None
    output_path = os.path.join(DOWNLOAD_FOLDER, f"{filename}.%(ext)s") if filename else os.path.join(DOWNLOAD_FOLDER, "%(title)s.%(ext)s")

    try:
        if download_type == "audio":
            ydl_format = "bestaudio"
            postprocessors = [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '192',
            }]
            merge_output = None
        else:
            ydl_format = f"bestvideo[height<={resolution}]+bestaudio/best" if resolution else "bestvideo+bestaudio/best"
            postprocessors = []
            merge_output = "mp4"

        ydl_opts = {
            'format': ydl_format,
            'outtmpl': output_path,
            'merge_output_format': merge_output,
            'postprocessors': postprocessors,
            'quiet': True,
            'client': 'android',
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])

        return jsonify({'success': True})

    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
    
@app.route('/')
def home():
    return jsonify({"message": "Server is running. Use POST /api/download"}), 200


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=PORT, debug=True)

