import { useState } from 'react';

export default function JournalEntryPage() {
  const [form, setForm] = useState({
    date: '', discipline: '', diveTime: '', maxDepth: '', targetDepth: '',
    success: false, issueTags: '', notes: '', image: null, video: null
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type, checked, files } = e.target as HTMLInputElement;
    if (type === 'file') {
      setForm(prev => ({ ...prev, [name]: files?.[0] || null }));
    } else if (type === 'checkbox') {
      setForm(prev => ({ ...prev, [name]: checked }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async () => {
    const body = new FormData();
    Object.entries(form).forEach(([key, val]) => {
      if (val instanceof Object && val instanceof File) {
        body.append(key, val);
      } else if (typeof val === 'boolean') {
        body.append(key, val.toString());
      } else if (val !== null && val !== undefined) {
        body.append(key, val as string);
      }
    });

    const res = await fetch('/api/upload', {
      method: 'POST',
      body,
    });

    if (res.ok) alert('Log submitted!');
    else alert('Submission failed.');
  };

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h2 className="text-xl font-bold mb-4">Dive Journal Entry</h2>
      <input name="date" type="date" onChange={handleChange} className="mb-2 w-full" />
      <input name="discipline" placeholder="Discipline" onChange={handleChange} className="mb-2 w-full" />
      <input name="diveTime" placeholder="Dive Time" onChange={handleChange} className="mb-2 w-full" />
      <input name="maxDepth" placeholder="Max Depth" type="number" onChange={handleChange} className="mb-2 w-full" />
      <input name="targetDepth" placeholder="Target Depth" type="number" onChange={handleChange} className="mb-2 w-full" />
      <textarea name="issueTags" placeholder="Comma-separated tags" onChange={handleChange} className="mb-2 w-full" />
      <textarea name="notes" placeholder="Notes" onChange={handleChange} className="mb-2 w-full" />
      <label>Image: <input name="image" type="file" accept="image/*" onChange={handleChange} /></label>
      <label>Video: <input name="video" type="file" accept="video/*" onChange={handleChange} /></label>
      <button onClick={handleSubmit} className="mt-4 bg-blue-500 text-white p-2 rounded">Submit</button>
    </div>
  );
}
