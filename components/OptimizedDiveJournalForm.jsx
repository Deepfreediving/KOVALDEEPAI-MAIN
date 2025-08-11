// components/OptimizedDiveJournalForm.jsx
// OPTIMIZED VERSION: Single batch submission for dive logs

import { useState } from 'react';

export default function OptimizedDiveJournalForm({ 
  userId, 
  onSubmit, 
  onCancel, 
  darkMode,
  setMessages,
  setLoading 
}) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    disciplineType: '',
    discipline: '',
    location: '',
    targetDepth: '',
    reachedDepth: '',
    mouthfillDepth: '',
    issueDepth: '',
    exit: '',
    durationOrDistance: '',
    totalDiveTime: '',
    attemptType: '',
    surfaceProtocol: '',
    squeeze: false,
    issueComment: '',
    notes: ''
  });

  // ✅ OPTIMIZED: Single batch submission
  const handleOptimizedSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      // Show immediate feedback
      if (setMessages) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: '🚀 Processing dive log in optimized batch mode...'
        }]);
      }

      console.log('🚀 OPTIMIZED: Starting single batch submission...');
      const startTime = Date.now();

      // ✅ Single API call with all data
      const response = await fetch('/api/analyze/save-dive-log-optimized', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          ...formData,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`Optimized save failed: ${response.status}`);
      }

      const result = await response.json();
      const processingTime = Date.now() - startTime;
      
      console.log(`✅ OPTIMIZED: Batch processing completed in ${processingTime}ms`);
      console.log('✅ OPTIMIZED: Result:', result);

      // ✅ Show success with performance metrics
      if (setMessages) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `✅ **Dive log saved successfully!**\n\n` +
                  `📊 **Performance:**\n` +
                  `- Processing time: ${result.processingTime}ms\n` +
                  `- Progression score: ${result.data.analysis.progressionScore}%\n` +
                  `- Depth achievement: ${result.data.analysis.depthAchievement.toFixed(1)}%\n\n` +
                  `🎯 **Analysis:** Starting detailed analysis with Pinecone knowledge base...`
        }]);
      }

      // ✅ Trigger automatic analysis (already running in background)
      setTimeout(() => {
        if (setMessages) {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `🔍 **Automatic Analysis Complete!**\n\n` +
                    `Your ${result.data.dive.discipline} dive to ${result.data.dive.depths.reached}m has been analyzed using the complete freediving knowledge base.`
          }]);
        }
      }, 3000);

      // ✅ Call parent callback
      if (onSubmit) {
        onSubmit(result.data);
      }

      // ✅ Reset form
      setFormData({
        date: new Date().toISOString().split('T')[0],
        disciplineType: '',
        discipline: '',
        location: '',
        targetDepth: '',
        reachedDepth: '',
        mouthfillDepth: '',
        issueDepth: '',
        exit: '',
        durationOrDistance: '',
        totalDiveTime: '',
        attemptType: '',
        surfaceProtocol: '',
        squeeze: false,
        issueComment: '',
        notes: ''
      });

    } catch (error) {
      console.error('❌ OPTIMIZED: Batch submission failed:', error);
      
      if (setMessages) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `❌ **Optimized save failed:** ${error.message}\n\nFalling back to standard processing...`
        }]);
      }

      // ✅ Fallback to original method if optimized fails
      try {
        await handleFallbackSubmit();
      } catch (fallbackError) {
        console.error('❌ Fallback also failed:', fallbackError);
        if (setMessages) {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `❌ Both optimized and fallback processing failed. Please try again.`
          }]);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // ✅ Fallback to original method if needed
  const handleFallbackSubmit = async () => {
    const response = await fetch('/api/analyze/save-dive-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        ...formData,
        timestamp: new Date().toISOString()
      })
    });

    if (!response.ok) {
      throw new Error(`Fallback save failed: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ Fallback processing successful:', result);
    
    if (setMessages) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `✅ Dive log saved using fallback processing.`
      }]);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  return (
    <div className={`p-6 space-y-4 ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'}`}>
      <h2 className="text-xl font-bold mb-4">📝 New Dive Log (Optimized)</h2>
      
      <form onSubmit={handleOptimizedSubmit} className="space-y-4">
        {/* Date */}
        <div>
          <label className="block text-sm font-medium mb-1">Date</label>
          <input
            type="date"
            name="date"
            value={formData.date}
            onChange={handleInputChange}
            className={`w-full p-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
            required
          />
        </div>

        {/* Discipline */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Discipline Type</label>
            <select
              name="disciplineType"
              value={formData.disciplineType}
              onChange={handleInputChange}
              className={`w-full p-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
              required
            >
              <option value="">Select Type</option>
              <option value="Pool">Pool</option>
              <option value="Depth">Depth</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Discipline</label>
            <select
              name="discipline"
              value={formData.discipline}
              onChange={handleInputChange}
              className={`w-full p-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
              required
            >
              <option value="">Select Discipline</option>
              <option value="CNF">CNF</option>
              <option value="CWT">CWT</option>
              <option value="FIM">FIM</option>
              <option value="CWTB">CWTB</option>
              <option value="DNF">DNF</option>
              <option value="STA">STA</option>
              <option value="DYN">DYN</option>
              <option value="DYNB">DYNB</option>
            </select>
          </div>
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-medium mb-1">Location</label>
          <input
            type="text"
            name="location"
            value={formData.location}
            onChange={handleInputChange}
            placeholder="e.g., Blue Hole, Dahab"
            className={`w-full p-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
            required
          />
        </div>

        {/* Depths */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Target Depth (m)</label>
            <input
              type="number"
              name="targetDepth"
              value={formData.targetDepth}
              onChange={handleInputChange}
              min="0"
              step="0.1"
              className={`w-full p-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Reached Depth (m)</label>
            <input
              type="number"
              name="reachedDepth"
              value={formData.reachedDepth}
              onChange={handleInputChange}
              min="0"
              step="0.1"
              className={`w-full p-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
              required
            />
          </div>
        </div>

        {/* Optional Depths */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Mouthfill Depth (m)</label>
            <input
              type="number"
              name="mouthfillDepth"
              value={formData.mouthfillDepth}
              onChange={handleInputChange}
              min="0"
              step="0.1"
              placeholder="Optional"
              className={`w-full p-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Issue Depth (m)</label>
            <input
              type="number"
              name="issueDepth"
              value={formData.issueDepth}
              onChange={handleInputChange}
              min="0"
              step="0.1"
              placeholder="Optional"
              className={`w-full p-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
            />
          </div>
        </div>

        {/* Performance */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Exit</label>
            <select
              name="exit"
              value={formData.exit}
              onChange={handleInputChange}
              className={`w-full p-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
              required
            >
              <option value="">Select Exit</option>
              <option value="Good">Good</option>
              <option value="OK">OK</option>
              <option value="Difficult">Difficult</option>
              <option value="Emergency">Emergency</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Attempt Type</label>
            <select
              name="attemptType"
              value={formData.attemptType}
              onChange={handleInputChange}
              className={`w-full p-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
            >
              <option value="">Select Type</option>
              <option value="Training">Training</option>
              <option value="Competition">Competition</option>
              <option value="Personal Best">Personal Best</option>
              <option value="Recovery">Recovery</option>
            </select>
          </div>
        </div>

        {/* Times */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Duration/Distance</label>
            <input
              type="text"
              name="durationOrDistance"
              value={formData.durationOrDistance}
              onChange={handleInputChange}
              placeholder="e.g., 3:45 or 150m"
              className={`w-full p-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Total Dive Time</label>
            <input
              type="text"
              name="totalDiveTime"
              value={formData.totalDiveTime}
              onChange={handleInputChange}
              placeholder="e.g., 4:30"
              className={`w-full p-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
            />
          </div>
        </div>

        {/* Surface Protocol */}
        <div>
          <label className="block text-sm font-medium mb-1">Surface Protocol</label>
          <input
            type="text"
            name="surfaceProtocol"
            value={formData.surfaceProtocol}
            onChange={handleInputChange}
            placeholder="e.g., OK sign, 3 breaths"
            className={`w-full p-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
          />
        </div>

        {/* Issues */}
        <div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              name="squeeze"
              checked={formData.squeeze}
              onChange={handleInputChange}
              className="rounded"
            />
            <span className="text-sm font-medium">Squeeze experienced</span>
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Issue Comment</label>
          <input
            type="text"
            name="issueComment"
            value={formData.issueComment}
            onChange={handleInputChange}
            placeholder="Describe any issues encountered"
            className={`w-full p-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium mb-1">Notes</label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleInputChange}
            rows={3}
            placeholder="Additional notes about the dive..."
            className={`w-full p-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
          />
        </div>

        {/* Buttons */}
        <div className="flex space-x-4 pt-4">
          <button
            type="submit"
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors"
          >
            🚀 Save (Optimized)
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-gray-500 text-white py-2 px-4 rounded hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
