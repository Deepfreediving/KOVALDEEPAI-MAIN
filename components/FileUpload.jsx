import { useState } from "react";

export default function FileUpload({ onUploadSuccess }) {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [file, setFile] = useState(null);

  const handleFileChange = async (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!selected.type.startsWith("image/")) {
      setMessage("❌ Please upload an image file.");
      return;
    }

    setUploading(true);
    setMessage("");
    setFile(selected);

    const formData = new FormData();
    formData.append("image", selected); // ✅ correct key

    try {
      const res = await fetch("/api/upload-dive-image", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (res.ok) {
        setMessage("✅ Image uploaded and analyzed!");
        onUploadSuccess(data.answer || "Evaluation complete.");
      } else {
        setMessage(`❌ ${data.error || "Upload failed."}`);
      }
    } catch (err) {
      setMessage("❌ Upload error. Try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium mb-1">Upload Dive Image (JPG/PNG)</label>
      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="text-sm border px-3 py-1 rounded-md"
      />
      {file && (
        <img
          src={URL.createObjectURL(file)}
          alt="Preview"
          className="mt-2 w-24 h-24 object-cover rounded shadow border"
        />
      )}
      {uploading && <p className="text-blue-500 mt-1 text-sm">Uploading...</p>}
      {message && <p className="text-sm mt-1">{message}</p>}
    </div>
  );
}
