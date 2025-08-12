import React, { useState, useEffect } from 'react';

function App() {
  const [url, setUrl] = useState('');
  const [type, setType] = useState('video');
  const [resolution, setResolution] = useState('');
  const [filename, setFilename] = useState('');
  const [status, setStatus] = useState('');
  const [downloadId, setDownloadId] = useState(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let interval;
    if (downloadId) {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`${process.env.REACT_APP_API_URL}/progress/${downloadId}`);
          const data = await res.json();

          setProgress(data.progress);
          setStatus(`⏳ ${data.status}...`);

          if (data.status === 'completed') {
            clearInterval(interval);

            const fileRes = await fetch(`${process.env.REACT_APP_API_URL}/file/${downloadId}`);
            if (!fileRes.ok) {
              setStatus("❌ Error fetching file");
              return;
            }

            const blob = await fileRes.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;

            const contentDisposition = fileRes.headers.get('Content-Disposition');
            const defaultName = contentDisposition?.split("filename=")[1]?.replace(/"/g, "") || 'download';

            a.download = defaultName;
            document.body.appendChild(a);
            a.click();
            a.remove();

            setStatus("✅ Download complete! Refreshing in 5 seconds...");
            setTimeout(() => window.location.reload(), 5000);
          }

          if (data.status === 'error') {
            clearInterval(interval);
            setStatus(`❌ Error: ${data.error}`);
          }
        } catch (error) {
          console.error(error);
          setStatus("❌ Error tracking progress.");
        }
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [downloadId]);

  const handleDownload = async () => {
    if (!url) {
      setStatus("⚠️ Please enter a URL.");
      return;
    }

    setStatus("⏳ Starting download...");
    setProgress(0);

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, type, resolution, filename })
      });

      const result = await response.json();

      if (response.ok && result.id) {
        setDownloadId(result.id);
      } else {
        setStatus(`❌ Error: ${result.error || "Unknown error"}`);
      }
    } catch (err) {
      setStatus(`❌ Network error: ${err.message}`);
    }
  };

  return (
<div className="min-h-screen bg-gradient-to-tr from-purple-900 via-indigo-900 to-gray-900 flex items-start justify-center pt-20 px-6">
  <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-3xl shadow-xl max-w-xl w-full p-10 text-white">
    <h1 className="text-4xl font-extrabold mb-10 text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-yellow-400 select-none text-center">
      🎥 YouTube Downloader 🎥
    </h1>

        {/* URL input */}
        <div className="relative z-0 w-full mb-6 group">
          <input
            type="text"
            id="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder=" "
            className="block py-3 px-4 w-full text-white bg-transparent border-b-2 border-gray-400 appearance-none focus:outline-none focus:ring-0 focus:border-pink-500 peer"
            autoComplete="off"
          />
          <label
            htmlFor="url"
            className="absolute text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 left-4 origin-[0] peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100 peer-focus:-translate-y-6 peer-focus:scale-75 peer-focus:text-pink-500"
          >
            YouTube URL
          </label>
        </div>

        {/* Type select */}
        <div className="relative z-0 w-full mb-6 group">
          <select
            id="type"
            value={type}
            onChange={e => setType(e.target.value)}
            className="block py-3 px-4 w-full text-white bg-transparent border-b-2 border-gray-400 appearance-none focus:outline-none focus:ring-0 focus:border-pink-500 peer"
          >
            <option value="video">Video</option>
            <option value="audio">Audio</option>
          </select>
          <label
            htmlFor="type"
            className="absolute text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 left-4 origin-[0] pointer-events-none peer-focus:-translate-y-6 peer-focus:scale-75 peer-focus:text-pink-500"
          >
            Download Type
          </label>
        </div>

        {/* Resolution select */}
        <div className="relative z-0 w-full mb-6 group">
          <select
            id="resolution"
            value={resolution}
            onChange={e => setResolution(e.target.value)}
            disabled={type === 'audio'}
            className={`block py-3 px-4 w-full text-white bg-transparent border-b-2 border-gray-400 appearance-none focus:outline-none focus:ring-0 peer ${
              type === 'audio' ? 'opacity-50 cursor-not-allowed' : 'focus:border-pink-500'
            }`}
          >
            <option value="">Best</option>
            <option value="1080">1080p</option>
            <option value="720">720p</option>
            <option value="480">480p</option>
            <option value="360">360p</option>
          </select>
          <label
            htmlFor="resolution"
            className="absolute text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 left-4 origin-[0] pointer-events-none peer-focus:-translate-y-6 peer-focus:scale-75 peer-focus:text-pink-500"
          >
            Resolution
          </label>
        </div>

        {/* Filename input */}
        {/* <div className="relative z-0 w-full mb-8 group">
          <input
            type="text"
            id="filename"
            value={filename}
            onChange={e => setFilename(e.target.value)}
            placeholder=" "
            className="block py-3 px-4 w-full text-white bg-transparent border-b-2 border-gray-400 appearance-none focus:outline-none focus:ring-0 focus:border-pink-500 peer"
            autoComplete="off"
          />
          <label
            htmlFor="filename"
            className="absolute text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 left-4 origin-[0] peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100 peer-focus:-translate-y-6 peer-focus:scale-75 peer-focus:text-pink-500"
          >
            Custom filename (optional)
          </label>
        </div> */}

        {/* Download button */}
        <button
          onClick={handleDownload}
          className="w-full py-3 bg-gradient-to-r from-pink-500 to-yellow-400 hover:from-pink-600 hover:to-yellow-500 rounded-full font-bold text-gray-900 shadow-lg transition-transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
          disabled={!!downloadId && progress < 100}
          type="button"
        >
          {progress > 0 && progress < 100
            ? `⏳ Downloading... ${progress.toFixed(1)}%`
            : '⬇️ Download'}
        </button>

        {/* Status */}
        <p className="mt-6 text-center font-semibold select-none min-h-[1.5rem]">
          {status}
        </p>
        <h6 className="mt-4 text-center text-gray-400 text-sm">
          Made with ❤️ by ꧁༒☬💫😈Mr_Târït🍁☬༒꧂</h6>
      </div>
    </div>
  );
}

export default App;
