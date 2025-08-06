import { useEffect, useState } from "react";

export default function DiveJournalDisplay({ userId, darkMode, isOpen, onClose }) {
  const [logs, setLogs] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [newEntry, setNewEntry] = useState({
    date: new Date().toISOString().split('T')[0],
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
    imageFile: null,
    imagePreview: null
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem(`diveLogs-${userId}`);
      if (stored) {
        setLogs(JSON.parse(stored));
      }
    } catch (error) {
      console.error("❌ Failed to parse stored dive logs:", error);
      setLogs([]);
    }
  }, [userId]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewEntry(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewEntry(prev => ({
        ...prev,
        imageFile: file,
        imagePreview: URL.createObjectURL(file)
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newLog = {
      ...newEntry,
      id: Date.now().toString(),
      timestamp: new Date().toISOString()
    };
    
    const updatedLogs = [...logs, newLog];
    setLogs(updatedLogs);
    
    // Save to localStorage
    try {
      localStorage.setItem(`diveLogs-${userId}`, JSON.stringify(updatedLogs));
    } catch (error) {
      console.error("Failed to save dive log:", error);
    }
    
    // Reset form
    setNewEntry({
      date: new Date().toISOString().split('T')[0],
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
      imageFile: null,
      imagePreview: null
    });
    setShowForm(false);
  };

  // If not open, don't render
  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-80 bg-gray-900 border-l border-gray-700 z-50 overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-white">📘 Dive Journal</h2>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowForm(!showForm)}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded"
            >
              {showForm ? 'Cancel' : '+ Add Dive'}
            </button>
            <button 
              onClick={onClose} 
              className="text-gray-400 hover:text-white text-xl"
            >
              ✕
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Add Dive Form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="mb-6 p-4 bg-gray-800 rounded-lg border border-gray-600">
            <h3 className="text-white font-semibold mb-4">📝 New Dive Entry</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Date</label>
                <input
                  type="date"
                  name="date"
                  value={newEntry.date}
                  onChange={handleInputChange}
                  className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-1">Discipline Type</label>
                <select
                  name="disciplineType"
                  value={newEntry.disciplineType}
                  onChange={handleInputChange}
                  className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600"
                >
                  <option value="depth">Depth</option>
                  <option value="pool">Pool</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-1">Discipline</label>
                <input
                  type="text"
                  name="discipline"
                  value={newEntry.discipline}
                  onChange={handleInputChange}
                  placeholder="e.g., CWT, CNF, FIM"
                  className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-1">Location</label>
                <input
                  type="text"
                  name="location"
                  value={newEntry.location}
                  onChange={handleInputChange}
                  placeholder="e.g., Blue Hole, Egypt"
                  className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Target Depth (m)</label>
                  <input
                    type="number"
                    name="targetDepth"
                    value={newEntry.targetDepth}
                    onChange={handleInputChange}
                    placeholder="25"
                    className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Reached Depth (m)</label>
                  <input
                    type="number"
                    name="reachedDepth"
                    value={newEntry.reachedDepth}
                    onChange={handleInputChange}
                    placeholder="23"
                    className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Mouthfill Depth (m)</label>
                  <input
                    type="number"
                    name="mouthfillDepth"
                    value={newEntry.mouthfillDepth}
                    onChange={handleInputChange}
                    placeholder="15"
                    className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Issue Depth (m)</label>
                  <input
                    type="number"
                    name="issueDepth"
                    value={newEntry.issueDepth}
                    onChange={handleInputChange}
                    placeholder="20"
                    className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-1">Issue Comment</label>
                <textarea
                  name="issueComment"
                  value={newEntry.issueComment}
                  onChange={handleInputChange}
                  placeholder="Describe any issues encountered..."
                  rows={2}
                  className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600"
                />
              </div>

              <div>
                <label className="flex items-center text-sm text-gray-300">
                  <input
                    type="checkbox"
                    name="squeeze"
                    checked={newEntry.squeeze}
                    onChange={handleInputChange}
                    className="mr-2"
                  />
                  Squeeze experienced
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Duration/Distance</label>
                  <input
                    type="text"
                    name="durationOrDistance"
                    value={newEntry.durationOrDistance}
                    onChange={handleInputChange}
                    placeholder="2:30 or 50m"
                    className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Total Dive Time</label>
                  <input
                    type="text"
                    name="totalDiveTime"
                    value={newEntry.totalDiveTime}
                    onChange={handleInputChange}
                    placeholder="3:45"
                    className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-1">Attempt Type</label>
                <input
                  type="text"
                  name="attemptType"
                  value={newEntry.attemptType}
                  onChange={handleInputChange}
                  placeholder="Training, PB attempt, etc."
                  className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-1">Exit Condition</label>
                <input
                  type="text"
                  name="exit"
                  value={newEntry.exit}
                  onChange={handleInputChange}
                  placeholder="Clean, LMC, BO, etc."
                  className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-1">Surface Protocol</label>
                <input
                  type="text"
                  name="surfaceProtocol"
                  value={newEntry.surfaceProtocol}
                  onChange={handleInputChange}
                  placeholder="OK sign, breathing pattern, etc."
                  className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-1">Upload Dive Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600 file:mr-4 file:py-1 file:px-2 file:rounded file:border-0 file:text-sm file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                />
                {newEntry.imagePreview && (
                  <img 
                    src={newEntry.imagePreview} 
                    alt="Preview" 
                    className="mt-2 max-w-full h-32 object-cover rounded"
                  />
                )}
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-1">Notes</label>
                <textarea
                  name="notes"
                  value={newEntry.notes}
                  onChange={handleInputChange}
                  placeholder="How did the dive go? Any observations..."
                  rows={3}
                  className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded font-semibold"
              >
                💾 Save Dive Entry
              </button>
            </div>
          </form>
        )}

        {/* Existing Logs */}
        {!logs.length ? (
          <div className="text-center text-gray-400 mt-8">
            <div className="text-4xl mb-4">📝</div>
            <p>No dive logs yet.</p>
            <p className="text-sm mt-2">Start logging your dives!</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-300 mb-4">
              {logs.length} dive{logs.length !== 1 ? 's' : ''} logged
            </p>
            
            <ul className="space-y-4">
              {logs.map((log, i) => (
                <li
                  key={i}
                  className="bg-gray-800 border border-gray-700 p-3 rounded-lg"
                >
                  <div className="text-sm space-y-1">
                    <p className="text-white font-medium">{log.date}</p>
                    <p className="text-blue-300">{log.disciplineType} – {log.discipline}</p>
                    
                    {log.location && (
                      <p className="text-gray-300">📍 {log.location}</p>
                    )}
                    
                    {log.targetDepth && (
                      <p className="text-gray-300">🎯 Target: {log.targetDepth}m</p>
                    )}
                    
                    {log.reachedDepth && (
                      <p className="text-green-300">✅ Reached: {log.reachedDepth}m</p>
                    )}
                    
                    {log.mouthfillDepth && (
                      <p className="text-gray-300">💨 Mouthfill: {log.mouthfillDepth}m</p>
                    )}
                    
                    {log.issueDepth && (
                      <p className="text-yellow-300">⚠️ Issue at: {log.issueDepth}m</p>
                    )}
                    
                    {log.issueComment && (
                      <p className="text-red-300 text-xs">💬 {log.issueComment}</p>
                    )}
                    
                    {log.squeeze && (
                      <p className="text-red-300">⚠️ Squeeze experienced</p>
                    )}
                    
                    {log.durationOrDistance && (
                      <p className="text-gray-300">⏱️ {log.durationOrDistance}</p>
                    )}
                    
                    {log.totalDiveTime && (
                      <p className="text-gray-300">🕐 Total: {log.totalDiveTime}</p>
                    )}
                    
                    {log.attemptType && (
                      <p className="text-purple-300">🎪 {log.attemptType}</p>
                    )}
                    
                    {log.exit && (
                      <p className="text-gray-300">🚪 Exit: {log.exit}</p>
                    )}
                    
                    {log.surfaceProtocol && (
                      <p className="text-cyan-300">🏊 Protocol: {log.surfaceProtocol}</p>
                    )}
                    
                    {log.notes && (
                      <p className="text-gray-400 text-xs mt-2 italic">"{log.notes}"</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
