from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
import yt_dlp
import os
import uuid
from threading import Thread
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

PORT = int(os.getenv("FLASK_PORT", 5000))

# Dictionary to store progress by ID
progress_dict = {}

DOWNLOADS_FOLDER = os.path.expanduser("~/Downloads")
os.makedirs(DOWNLOADS_FOLDER, exist_ok=True)


@app.route('/api/default-folder', methods=['GET'])
def get_default_folder():
    return jsonify({'folder': DOWNLOADS_FOLDER})


@app.route('/api/progress/<download_id>', methods=['GET'])
def get_progress(download_id):
    progress = progress_dict.get(download_id, {})
    return jsonify(progress)


@app.route('/api/download', methods=['POST'])
def api_download():
    data = request.json
    url = data.get('url')
    download_type = data.get('type')
    resolution = data.get('resolution')
    filename = data.get('filename')
    folder = data.get('folder') or DOWNLOADS_FOLDER

    if not url:
        return jsonify({'error': 'Missing URL'}), 400

    download_id = str(uuid.uuid4())
    progress_dict[download_id] = {'progress': 0, 'status': 'starting'}

    thread = Thread(target=download_video, args=(download_id, url, folder, download_type, resolution, filename))
    thread.start()

    return jsonify({'success': True, 'id': download_id})


def download_video(download_id, url, folder, download_type, resolution, filename):
    try:
        progress_dict[download_id]['status'] = 'downloading'

        os.makedirs(folder, exist_ok=True)
        filename = secure_filename(filename) if filename else None
        output_path = os.path.join(folder, f"{filename}.%(ext)s") if filename else os.path.join(folder, "%(title)s.%(ext)s")

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

        def progress_hook(d):
            if d['status'] == 'downloading':
                percent_str = d.get('_percent_str', '0.0%').replace('%', '').strip()
                try:
                    percent = float(percent_str)
                    progress_dict[download_id]['progress'] = percent
                except ValueError:
                    progress_dict[download_id]['progress'] = 0
            elif d['status'] == 'finished':
                progress_dict[download_id]['progress'] = 100
                progress_dict[download_id]['status'] = 'completed'

        ydl_opts = {
            'format': ydl_format,
            'outtmpl': output_path,
            'merge_output_format': merge_output,
            'postprocessors': postprocessors,
            'quiet': True,
            'progress_hooks': [progress_hook],
            'client': 'android',
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])

        progress_dict[download_id]['status'] = 'completed'

    except Exception as e:
        progress_dict[download_id]['status'] = 'error'
        progress_dict[download_id]['error'] = str(e)


@app.route('/')
def home():
    return jsonify({"message": "Server is running. Use /api/download"}), 200


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=PORT, debug=True)
