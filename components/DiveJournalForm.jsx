// components/DiveJournalForm.jsx

import { useState } from 'react';

export default function DiveJournalForm({ onSubmit }) {
  const [form, setForm] = useState({
    date: '',
    disciplineType: 'depth', // 'depth' or 'pool'
    discipline: '',
    location: '',
    targetDepth: '',
    reachedDepth: '',
    mouthfillDepth: '',
    issueDepth: '',
    squeeze: false,
    exit: '',
    durationOrDistance: '',
    attemptType: '',
    notes: '',
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async () => {
    if (!form.date || !form.discipline) {
      alert('Date and Discipline are required.');
      return;
    }

    try {
      const res = await fetch('/api/save-dive-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        alert('✅ Dive log saved!');
        onSubmit?.(); // Callback for UI update
        setForm({
          date: '',
          disciplineType: 'depth',
          discipline: '',
          location: '',
          targetDepth: '',
          reachedDepth: '',
          mouthfillDepth: '',
          issueDepth: '',
          squeeze: false,
          exit: '',
          durationOrDistance: '',
          attemptType: '',
          notes: '',
        });
      } else {
        alert('⚠️ Failed to save log.');
      }
    } catch (err) {
      console.error('❌ Dive log error:', err);
      alert('An error occurred.');
    }
  };

  return (
    <div className="p-4 border rounded bg-gray-50 mb-4">
      <h3 className="text-lg font-bold mb-2">Dive Journal Entry</h3>

      <input name="date" type="date" value={form.date} onChange={handleChange} className="mb-2 w-full p-2 border rounded" />
      
      <select name="disciplineType" value={form.disciplineType} onChange={handleChange} className="mb-2 w-full p-2 border rounded">
        <option value="depth">Depth Discipline</option>
        <option value="pool">Pool Discipline</option>
      </select>

      <input name="discipline" placeholder="Discipline (e.g. FIM, DYNB, STA)" value={form.discipline} onChange={handleChange} className="mb-2 w-full p-2 border rounded" />

      <input name="location" placeholder="Location (pool or open water)" value={form.location} onChange={handleChange} className="mb-2 w-full p-2 border rounded" />

      {form.disciplineType === 'depth' ? (
        <>
          <input name="targetDepth" type="number" placeholder="Target Depth (m)" value={form.targetDepth} onChange={handleChange} className="mb-2 w-full p-2 border rounded" />
          <input name="reachedDepth" type="number" placeholder="Reached Depth (m)" value={form.reachedDepth} onChange={handleChange} className="mb-2 w-full p-2 border rounded" />
          <input name="mouthfillDepth" type="number" placeholder="Mouthfill Depth (optional)" value={form.mouthfillDepth} onChange={handleChange} className="mb-2 w-full p-2 border rounded" />
          <input name="issueDepth" type="number" placeholder="Issue Depth (if any)" value={form.issueDepth} onChange={handleChange} className="mb-2 w-full p-2 border rounded" />
          <label className="mb-2 flex items-center">
            <input type="checkbox" name="squeeze" checked={form.squeeze} onChange={handleChange} className="mr-2" />
            Squeeze experienced?
          </label>
        </>
      ) : (
        <>
          <input name="durationOrDistance" placeholder="Time (STA) or Distance (DYNB)" value={form.durationOrDistance} onChange={handleChange} className="mb-2 w-full p-2 border rounded" />
          <input name="attemptType" placeholder="Training, Max, Fun, etc." value={form.attemptType} onChange={handleChange} className="mb-2 w-full p-2 border rounded" />
        </>
      )}

      <input name="exit" placeholder="How was your exit?" value={form.exit} onChange={handleChange} className="mb-2 w-full p-2 border rounded" />
      
      <textarea name="notes" placeholder="Any notes or observations..." value={form.notes} onChange={handleChange} className="mb-2 w-full p-2 border rounded" />

      <button onClick={handleSubmit} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
        Save Dive Log
      </button>
    </div>
  );
}
