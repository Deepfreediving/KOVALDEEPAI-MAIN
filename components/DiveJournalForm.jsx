import { useState } from 'react';

export default function DiveJournalForm({ onSubmit }) {
  const [form, setForm] = useState({
    date: '',
    disciplineType: 'depth',
    discipline: '',
    location: '',
    targetDepth: '',
    reachedDepth: '',
    mouthfillDepth: '',
    issueDepth: '',
    issueComment: '',           // ✅ NEW
    squeeze: false,
    exit: '',
    durationOrDistance: '',
    totalDiveTime: '',          // ✅ NEW: mm:ss format
    attemptType: '',
    surfaceProtocol: '',        // ✅ NEW
    notes: '',
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
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
      <input name="targetDepth" placeholder="Target Depth (m)" value={form.targetDepth} onChange={handleChange} />
      <input name="reachedDepth" placeholder="Reached Depth (m)" value={form.reachedDepth} onChange={handleChange} />
      <input name="mouthfillDepth" placeholder="Mouthfill Depth (m)" value={form.mouthfillDepth} onChange={handleChange} />
      <input name="issueDepth" placeholder="Issue Depth (m)" value={form.issueDepth} onChange={handleChange} />
      <textarea name="issueComment" placeholder="Issue Comments" value={form.issueComment} onChange={handleChange} />
      <input name="durationOrDistance" placeholder="Distance/Duration" value={form.durationOrDistance} onChange={handleChange} />
      <input name="totalDiveTime" placeholder="Total Dive Time (mm:ss)" value={form.totalDiveTime} onChange={handleChange} />
      <input name="attemptType" placeholder="Attempt Type" value={form.attemptType} onChange={handleChange} />
      <input name="exit" placeholder="Exit Condition" value={form.exit} onChange={handleChange} />
      <input name="surfaceProtocol" placeholder="Surface Protocol" value={form.surfaceProtocol} onChange={handleChange} />
      <textarea name="notes" placeholder="Other Notes" value={form.notes} onChange={handleChange} />
      <label>
        <input type="checkbox" name="squeeze" checked={form.squeeze} onChange={handleChange} />
        Squeeze
      </label>
      <button type="submit" className="mt-2 bg-blue-600 text-white px-4 py-1 rounded">Save Dive</button>
    </form>
  );
}
