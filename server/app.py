from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from werkzeug.utils import secure_filename
import yt_dlp
import os
import uuid
import time
from threading import Thread
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

progress_dict = {}

# Downloads directory
DOWNLOAD_DIR = os.path.join(os.path.dirname(__file__), 'downloads')
os.makedirs(DOWNLOAD_DIR, exist_ok=True)

@app.route('/api/download', methods=['POST'])
def api_download():
    data = request.json
    url = data.get('url')
    download_type = data.get('type')
    resolution = data.get('resolution')
    filename = data.get('filename')

    if not url:
        return jsonify({'error': 'Missing URL'}), 400

    download_id = str(uuid.uuid4())
    progress_dict[download_id] = {'progress': 0, 'status': 'starting'}

    thread = Thread(target=download_and_store, args=(download_id, url, download_type, resolution, filename))
    thread.start()

    return jsonify({'id': download_id})


@app.route('/api/progress/<download_id>', methods=['GET'])
def get_progress(download_id):
    return jsonify(progress_dict.get(download_id, {'status': 'unknown', 'progress': 0}))


@app.route('/api/file/<download_id>', methods=['GET'])
def fetch_file(download_id):
    info = progress_dict.get(download_id)
    if not info:
        return jsonify({'error': 'Invalid ID'}), 400

    if info.get('status') != 'completed':
        return jsonify({'error': 'Download not complete'}), 400

    path = info.get('path')
    custom_name = info.get('custom_name')

    if not path or not os.path.exists(path):
        return jsonify({'error': 'File not found'}), 500

    return send_file(
        path,
        as_attachment=True,
        download_name=custom_name or os.path.basename(path)
    )


def download_and_store(download_id, url, download_type, resolution, filename):
    try:
        progress_dict[download_id]['status'] = 'downloading'

        # Generate safe custom filename (without extension)
        if filename:
            safe_filename = secure_filename(filename)
            base_output = os.path.join(DOWNLOAD_DIR, f"{download_id}__{safe_filename}")
        else:
            base_output = os.path.join(DOWNLOAD_DIR, f"{download_id}__%(title)s")

        output_template = f"{base_output}.%(ext)s"

        # yt-dlp options
        ydl_opts = {
            'format': (
                f"bestvideo[height<={resolution}]+bestaudio/best"
                if resolution and download_type == 'video'
                else "bestaudio" if download_type == 'audio'
                else "bestvideo+bestaudio/best"
            ),
            'outtmpl': output_template,
            'merge_output_format': 'mp4' if download_type == 'video' else None,
            'quiet': True,
            'cookies': '/path/to/cookies.txt',  # Path to your cookies file
            'progress_hooks': [lambda d: progress_hook(download_id, d)],
        }

        # Add postprocessor for audio
        if download_type == 'audio':
            ydl_opts['postprocessors'] = [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '192'
            }]

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            retry_count = 3
            for i in range(retry_count):
                try:
                    ydl.download([url])
                    break
                except yt_dlp.utils.DownloadError as e:
                    if "HTTP Error 429" in str(e):
                        if i < retry_count - 1:
                            print("Rate limit hit, retrying...")
                            time.sleep(10)  # Wait 10 seconds before retry
                        else:
                            raise
                    else:
                        raise

        # Find the final file
        downloaded_file = None
        for f in os.listdir(DOWNLOAD_DIR):
            if f.startswith(f"{download_id}__") and (f.endswith('.mp4') or f.endswith('.mp3')):
                downloaded_file = f
                break

        if not downloaded_file:
            progress_dict[download_id].update({'status': 'error', 'error': 'Downloaded file not found'})
            return

        full_path = os.path.join(DOWNLOAD_DIR, downloaded_file)

        # Use custom name if given
        if filename:
            ext = '.mp3' if download_type == 'audio' else '.mp4'
            custom_name = secure_filename(filename) + ext
        else:
            custom_name = downloaded_file.split("__", 1)[1]  # remove UUID

        progress_dict[download_id].update({
            'status': 'completed',
            'progress': 100,
            'path': full_path,
            'custom_name': custom_name
        })

    except Exception as e:
        progress_dict[download_id].update({'status': 'error', 'error': str(e)})


def progress_hook(download_id, d):
    if d.get('status') == 'downloading':
        try:
            percent = float(d.get('_percent_str', '0%').strip().replace('%', ''))
        except:
            percent = 0
        progress_dict[download_id]['progress'] = percent
    elif d.get('status') == 'finished':
        progress_dict[download_id]['progress'] = 100
        progress_dict[download_id]['status'] = 'processing'


@app.route('/')
def home():
    return jsonify({"message": "Server is running"}), 200


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.getenv("FLASK_PORT", 5000)), debug=True)
