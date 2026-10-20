import "./UploadProgress.css";

/** "Uploading ID photo... 75%" with a bar that fills as the file goes up. */
export default function UploadProgress({ percent, label = "Uploading document" }) {
  const value = Math.max(0, Math.min(100, Math.round(percent ?? 0)));

  return (
    <div className="upload-progress" role="status" aria-live="polite">
      <div className="upload-progress-text">
        <span>{label}...</span>
        <span className="upload-progress-percent">{value}%</span>
      </div>
      <div className="upload-progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value} aria-label={label}>
        <div className="upload-progress-fill" style={{ transform: `scaleX(${value / 100})` }} />
      </div>
    </div>
  );
}
