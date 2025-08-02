import React, { useState } from "react";

interface DiveLog {
  date: string;
  location: string;
  depth: string;
  notes: string;
  localId?: string;
}

interface JournalProps {
  userId: string;
  onSave?: (log: DiveLog) => void;
}

export default function Journal({ userId, onSave }: JournalProps) {
  const [entry, setEntry] = useState<DiveLog>({
    date: "",
    location: "",
    depth: "",
    notes: "",
    localId: ""
  });
  const [loading, setLoading] = useState(false);

  // ✅ Handles input change
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setEntry({ ...entry, [e.target.name]: e.target.value });
  };

  // ✅ Handles form submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const newEntry = { ...entry, localId: entry.localId || `${userId}-${Date.now()}` };

      // ✅ Save to API
      const res = await fetch("/api/analyze/save-dive-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, diveLog: newEntry }),
      });

      if (!res.ok) throw new Error("Failed to save dive log");

      // ✅ Trigger onSave callback
      if (onSave) onSave(newEntry);

      // ✅ Reset form
      setEntry({ date: "", location: "", depth: "", notes: "", localId: "" });
    } catch (err) {
      console.error("❌ Error saving dive log:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-gray-100 rounded shadow-md">
      <input
        type="date"
        name="date"
        value={entry.date}
        onChange={handleChange}
        className="block mb-2"
        required
      />
      <input
        type="text"
        name="location"
        placeholder="Location"
        value={entry.location}
        onChange={handleChange}
        className="block mb-2"
        required
      />
      <input
        type="text"
        name="depth"
        placeholder="Depth (meters)"
        value={entry.depth}
        onChange={handleChange}
        className="block mb-2"
        required
      />
      <textarea
        name="notes"
        placeholder="Notes"
        value={entry.notes}
        onChange={handleChange}
        className="block mb-2"
        rows={3}
      ></textarea>

      <button
        type="submit"
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded"
      >
        {loading ? "Saving..." : "Save Dive Log"}
      </button>
    </form>
  );
}
