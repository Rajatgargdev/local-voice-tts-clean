import React, { useState, useEffect } from "react";
import axios from "axios";

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [audioUrl, setAudioUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  // Poll job progress every 1s when jobId is set
  useEffect(() => {
    if (!jobId) return;

    const interval = setInterval(async () => {
      try {
        const res = await axios.get(`http://127.0.0.1:8000/progress/${jobId}`);
        setStatus(res.data.status);
        setProgress(res.data.percent);

        if (res.data.status === "done") {
          clearInterval(interval);

          // fetch final audio
          const audioRes = await axios.get(
            `http://127.0.0.1:8000/result/${jobId}`,
            { responseType: "blob" }
          );

          const url = window.URL.createObjectURL(new Blob([audioRes.data]));
          setAudioUrl(url);
          setLoading(false);
        } else if (res.data.status === "error") {
          clearInterval(interval);
          setLoading(false);
          alert("Processing failed!");
        }
      } catch (err) {
        clearInterval(interval);
        setLoading(false);
        alert("Error checking progress");
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [jobId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setProgress(0);
      setAudioUrl("");
      setJobId(null);
      setStatus("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      alert("Please upload a text file first!");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setLoading(true);
      setProgress(0);
      setAudioUrl("");

      // Step 1: Start the job
      const res = await axios.post("http://127.0.0.1:8000/start/", formData);
      setJobId(res.data.job_id);
      setStatus("queued");
    } catch (err) {
      console.error(err);
      setLoading(false);
      alert("Something went wrong while starting the job!");
    }
  };

  return (
    <div
      style={{
        fontFamily: "Arial, sans-serif",
        background: "#f8f9fa",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}>
      {/* Header */}
      <header className="bg-gradient-to-r from-indigo-800 via-purple-700 to-pink-600 text-white py-10 text-center shadow-lg">
        <h1 className="text-4xl font-extrabold tracking-wide flex items-center justify-center gap-2 animate-pulse">
          <span role="img" aria-label="book">
            📖
          </span>{" "}
          SonicTwin
        </h1>
        <p className="mt-3 text-lg opacity-90">
          Upload a text file and convert it into{" "}
          <span className="font-semibold">natural speech 🎧</span>
        </p>
      </header>

      {/* Main Section */}
      <main
        style={{
          flex: 1,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: "40px",
        }}>
        <div
          style={{
            background: "white",
            padding: "30px",
            borderRadius: "12px",
            boxShadow: "0px 4px 12px rgba(0,0,0,0.1)",
            width: "400px",
            textAlign: "center",
          }}>
          <h2 style={{ marginBottom: "20px", color: "#333" }}>
            Upload Your Text File
          </h2>
          <form onSubmit={handleSubmit}>
            <input
              type="file"
              accept=".txt"
              onChange={handleFileChange}
              style={{ marginBottom: "15px" }}
            />
            <br />
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "10px 20px",
                background: "#4b0082",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
              }}>
              {loading ? "Processing..." : "Generate Audio"}
            </button>
          </form>

          {/* Progress bar */}
          {loading && (
            <div style={{ marginTop: "20px" }}>
              <div className="flex items-center space-x-1">
                <div className="w-1 h-5 bg-blue-500 animate-pulse"></div>
                <div className="w-1 h-6 bg-blue-400 animate-ping"></div>
                <div className="w-1 h-4 bg-blue-600 animate-pulse"></div>
                <p className="ml-2 text-blue-300">
                  Generating speech... ${progress}%`
                </p>
              </div>

              {/* <p>
                {status === "queued"
                  ? "Queued..."
                  : `Processing chunks... ${progress}%`}
              </p> */}
              <div
                style={{
                  width: "100%",
                  marginTop: "24px",
                  background: "#ddd",
                  borderRadius: "8px",
                }}>
                <div
                  style={{
                    width: `${progress}%`,
                    background: "#4b0082",
                    height: "10px",
                    borderRadius: "8px",
                  }}></div>
              </div>
            </div>
          )}

          {/* Audio download / play */}
          {audioUrl && (
            <div style={{ marginTop: "20px" }}>
              <h3>✅ Audio Ready!</h3>
              <audio controls src={audioUrl}></audio>
              <br />
              <a href={audioUrl} download="speech.wav">
                <button
                  style={{
                    marginTop: "10px",
                    padding: "10px 20px",
                    background: "#28a745",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                  }}>
                  Download Audio
                </button>
              </a>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer
        style={{
          background: "#4b0082",
          color: "white",
          textAlign: "center",
          padding: "15px",
        }}>
        <p>© {new Date().getFullYear()} Voice-Clone-Agent</p>
      </footer>
    </div>
  );
}

export default App;
