import { useState } from 'react';
import imageCompression from 'browser-image-compression';

export default function DiveJournalForm({ onSubmit }) {
  const initialFormState = {
    date: '',
    disciplineType: 'depth',
    discipline: '',
    location: '',
    targetDepth: '',
    reachedDepth: '',
    mouthfillDepth: '',
    issueDepth: '',
    issueComment: '',
    squeeze: false,
    exit: '',
    durationOrDistance: '',
    totalDiveTime: '',
    attemptType: '',
    surfaceProtocol: '',
    notes: '',
  };

  const [form, setForm] = useState(initialFormState);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [aiFeedback, setAiFeedback] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setAiFeedback("");

    try {
      // Step 1️⃣ Save dive log first
      const saveLogRes = await fetch('/api/analyze/save-dive-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const saveLogData = await saveLogRes.json();

      if (!saveLogRes.ok || !saveLogData?._id) {
        throw new Error("Failed to save dive log.");
      }

      const diveLogId = saveLogData._id;

      // Step 2️⃣ Upload image if present
      if (imageFile) {
        try {
          const compressed = await imageCompression(imageFile, {
            maxSizeMB: 0.5,
            maxWidthOrHeight: 1280,
            useWebWorker: true,
          });

          const formData = new FormData();
          formData.append('image', compressed);
          formData.append('diveLogId', diveLogId); // link image to saved log

          const uploadRes = await fetch('/api/openai/upload-dive-image', {
            method: 'POST',
            body: formData,
          });

          const uploadData = await uploadRes.json();
          setAiFeedback(
            uploadRes.ok && uploadData?.message
              ? uploadData.message
              : "⚠️ Image uploaded, but no feedback returned."
          );
        } catch (err) {
          console.error("❌ Failed to upload image", err);
          setAiFeedback("❌ Upload failed.");
        }
      } else {
        setAiFeedback("✅ Dive log saved successfully.");
      }

      // Step 3️⃣ Trigger callback for UI update
      onSubmit({ ...form, _id: diveLogId });

      // ✅ Clear form state
      setForm(initialFormState);
      setImageFile(null);
      setImagePreview(null);

    } catch (error) {
      console.error("❌ Error submitting dive log:", error);
      setAiFeedback("❌ Could not save dive log.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 text-sm">
      <input name="date" type="date" value={form.date} onChange={handleChange} required />
      <select name="disciplineType" value={form.disciplineType} onChange={handleChange}>
        <option value="depth">Depth</option>
        <option value="pool">Pool</option>
      </select>
      <input name="discipline" placeholder="Discipline" value={form.discipline} onChange={handleChange} />
      <input name="location" placeholder="Location" value={form.location} onChange={handleChange} />
      <input name="targetDepth" placeholder="Target Depth (m)" type="number" value={form.targetDepth} onChange={handleChange} />
      <input name="reachedDepth" placeholder="Reached Depth (m)" type="number" value={form.reachedDepth} onChange={handleChange} />
      <input name="mouthfillDepth" placeholder="Mouthfill Depth (m)" type="number" value={form.mouthfillDepth} onChange={handleChange} />
      <input name="issueDepth" placeholder="Issue Depth (m)" type="number" value={form.issueDepth} onChange={handleChange} />
      <textarea name="issueComment" placeholder="Issue Comments" value={form.issueComment} onChange={handleChange} />
      <input name="durationOrDistance" placeholder="Distance/Duration" value={form.durationOrDistance} onChange={handleChange} />
      <input name="totalDiveTime" placeholder="Total Dive Time (mm:ss)" value={form.totalDiveTime} onChange={handleChange} />
      <input name="attemptType" placeholder="Attempt Type" value={form.attemptType} onChange={handleChange} />
      <input name="exit" placeholder="Exit Condition" value={form.exit} onChange={handleChange} />
      <input name="surfaceProtocol" placeholder="Surface Protocol" value={form.surfaceProtocol} onChange={handleChange} />
      <textarea name="notes" placeholder="Other Notes" value={form.notes} onChange={handleChange} />
      <label className="block">
        <input type="checkbox" name="squeeze" checked={form.squeeze} onChange={handleChange} />
        <span className="ml-2">Squeeze</span>
      </label>

      {/* Image upload */}
      <label className="block">
        <span>Upload Dive Profile Image (optional):</span>
        <input type="file" accept="image/png, image/jpeg" onChange={handleImageChange} className="mt-1" />
      </label>

      {imagePreview && (
        <img src={imagePreview} alt="Preview" className="w-32 h-32 object-cover border rounded" />
      )}

      <button type="submit" disabled={loading} className="mt-2 bg-blue-600 text-white px-4 py-1 rounded">
        {loading ? "Saving..." : "Save Dive"}
      </button>

      {aiFeedback && (
        <div className="mt-3 text-sm border rounded p-2 bg-gray-50 dark:bg-gray-900 dark:text-white">
          <strong>AI Feedback:</strong>
          <p>{aiFeedback}</p>
        </div>
      )}
    </form>
  );
}
