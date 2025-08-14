import React, { useState, useEffect } from 'react';

const CustomDropdown = ({ label, value, onChange, options, disabled }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className={`relative z-10 w-full mb-6 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
      <label className="block mb-1 text-sm text-gray-400">{label}</label>
      <div
        className={`bg-white bg-opacity-10 backdrop-blur-md rounded-lg px-4 py-3 text-white border-b-2 border-gray-400 hover:border-pink-500 cursor-pointer flex justify-between items-center`}
        onClick={() => !disabled && setOpen(!open)}
      >
        <span>{options.find(o => o.value === value)?.label || 'Select'}</span>
        <svg className="w-5 h-5 text-gray-300 ml-2" fill="none" stroke="currentColor" strokeWidth="2"
          viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {open && !disabled && (
        <ul className="absolute mt-2 w-full bg-gray-900 bg-opacity-90 rounded-xl shadow-lg z-50 max-h-60 overflow-auto">
          {options.map(option => (
            <li
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={`px-4 py-2 hover:bg-pink-500 transition-all cursor-pointer ${value === option.value ? 'bg-pink-600 text-white' : 'text-white'
                }`}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

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
              console.log("Error fetching file:", fileRes.statusText);
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
            console.log(`❌ Error: ${data.error}`);
            setStatus(`❌ Error: ${data.error}`);
          }
        } catch (error) {
          console.error(error);
          setStatus("❌ Error tracking progress.");
          console.log("❌ Error tracking progress.");
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
        console.log(`❌ Error: ${result.error || "Unknown error"}`);
      }
    } catch (err) {
      setStatus(`❌ Network error: ${err.message}`);
      console.log(`❌ Network error: ${err.message}`);
    }
  };

  const handleCancel = () => {
    window.location.reload(); // Simply refresh the page
  };

  const handleresume = () => {
    alert("▶️ Resume is not supported yet."); // Placeholder
  };

  const handlePause = () => {
    alert("⏸️ Pause is not supported yet."); // Placeholder
  };

  return (
    <div className="min-h-screen bg-gradient-to-tr from-purple-900 via-indigo-900 to-gray-900 flex items-start justify-center pt-20 px-6">
      <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-3xl shadow-xl max-w-xl w-full p-10 text-white">
        <h1 className="text-3xl font-extrabold mb-10 text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-yellow-400 select-none text-center">
          🎥 All Video/Audio Downloader 🎥
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
            Enter URL
          </label>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
          {/* Type select */}
          <CustomDropdown
            label="Download Type"
            value={type}
            onChange={setType}
            options={[
              { value: 'video', label: '🎥 Video' },
              { value: 'audio', label: '🎧 Audio' }
            ]}
          />

          {/* Resolution select */}
          <CustomDropdown
            label="Resolution"
            value={resolution}
            onChange={setResolution}
            disabled={type === 'audio'}
            options={[
              { value: '', label: '🌟 Best Available' },
              { value: '1080', label: '1080p' },
              { value: '720', label: '720p' },
              { value: '480', label: '480p' },
              { value: '360', label: '360p' },
            ]}
          />
        </div>

        {/* Pause and Cancel buttons */}
        <div className="flex justify-between mb-6">
          <button
            onClick={handlePause}
            className="flex-1 mr-2 py-2 bg-yellow-300 hover:bg-yellow-500 text-gray-900 font-bold rounded-full transition-transform active:scale-95 disabled:opacity-70"
            // disabled
          >
            ⏸️ Pause
          </button>

          <button
            onClick={handleresume}
            // disabled={!downloadId || downloadStatus !== 'paused'}
            className="flex-1 py-2 bg-green-400 hover:bg-green-500 text-gray-900 font-bold rounded-full transition-transform active:scale-95 disabled:opacity-70"
          >
            ▶️ Resume
          </button>

          <button
            onClick={handleCancel}
            className="flex-1 ml-2 py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded-full transition-transform active:scale-95"
          >
            ❌ Cancel
          </button>
        </div>

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
          Made with ❤️ by ꧁༒☬💫😈Mr_Târït🍁☬༒꧂
        </h6>
      </div>
    </div>
  );
}

export default App;
