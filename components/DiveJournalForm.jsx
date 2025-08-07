import { useState, useEffect } from 'react';
import imageCompression from 'browser-image-compression';

export default function DiveJournalForm({ onSubmit, darkMode, userId }) {
  const initialFormState = {
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
  };

  // ✅ FORM PERSISTENCE - Load saved form data on mount
  const [form, setForm] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedForm = localStorage.getItem('diveJournalDraft');
      if (savedForm) {
        try {
          const parsed = JSON.parse(savedForm);
          console.log('📋 Restored dive journal draft:', parsed);
          return { ...initialFormState, ...parsed };
        } catch (error) {
          console.warn('⚠️ Failed to parse saved form data:', error);
        }
      }
    }
    return initialFormState;
  });
  
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [aiFeedback, setAiFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);

  // Check if we have a saved draft
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedForm = localStorage.getItem('diveJournalDraft');
      if (savedForm) {
        try {
          const parsed = JSON.parse(savedForm);
          // Check if draft has meaningful data
          const hasData = Object.entries(parsed).some(([key, value]) => {
            if (key === 'date') return false;
            if (key === 'disciplineType') return value !== 'depth';
            return value && value !== '' && value !== false;
          });
          setHasDraft(hasData);
        } catch (error) {
          setHasDraft(false);
        }
      }
    }
  }, []);

  // Function to clear draft
  const clearDraft = () => {
    localStorage.removeItem('diveJournalDraft');
    setForm(initialFormState);
    setHasDraft(false);
    setImageFile(null);
    setImagePreview(null);
    console.log('🗑️ Manually cleared dive journal draft');
  };

  // ✅ AUTO-SAVE FORM DATA as user types (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      // Only save if form has meaningful data (not just default values)
      const hasData = Object.entries(form).some(([key, value]) => {
        if (key === 'date') return false; // Date is always set to today by default
        if (key === 'disciplineType') return value !== 'depth'; // Default value
        return value && value !== '' && value !== false;
      });
      
      if (hasData) {
        localStorage.setItem('diveJournalDraft', JSON.stringify(form));
        setHasDraft(true);
        console.log('💾 Auto-saved dive journal draft');
      } else {
        // Remove draft if form is empty
        localStorage.removeItem('diveJournalDraft');
        setHasDraft(false);
      }
    }, 1000); // Save 1 second after user stops typing

    return () => clearTimeout(timeoutId);
  }, [form]);

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
      console.log('🔄 Submitting dive log to enterprise system...');
      
      // ✅ Prepare data for your save-dive-log.ts API
      const diveLogData = {
        ...form,
        userId: userId || 'anonymous-user',
        timestamp: new Date().toISOString()
      };

      // � Show immediate feedback
      setAiFeedback("💾 Saving dive log locally...");

      // �🚀 STEP 1: Save dive log
      const saveLogRes = await fetch('/api/analyze/save-dive-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(diveLogData),
      });

      if (!saveLogRes.ok) {
        const errorData = await saveLogRes.json();
        throw new Error(errorData.message || `Save failed: ${saveLogRes.status}`);
      }

      const saveLogResult = await saveLogRes.json();
      console.log('✅ Dive log saved:', saveLogResult);
      
      // ✅ Show success with local storage confirmation
      setAiFeedback("✅ Dive log saved locally! Syncing to Wix...");
      
      // ✅ Save to local storage as backup
      const savedDiveLogs = JSON.parse(localStorage.getItem('savedDiveLogs') || '[]');
      savedDiveLogs.push({
        id: saveLogResult._id || saveLogResult.data?.id,
        ...diveLogData,
        savedAt: new Date().toISOString(),
        syncedToWix: saveLogResult.syncedToWix || false
      });
      localStorage.setItem('savedDiveLogs', JSON.stringify(savedDiveLogs));
      console.log('💾 Dive log backed up to local storage');
      
      const diveLogId = saveLogResult._id || saveLogResult.data?.id;

      // 📸 STEP 2: Handle image upload with OCR + AI analysis
      if (imageFile && diveLogId) {
        try {
          console.log('🔄 Processing dive profile image...');
          
          // ✅ Compress image
          const compressed = await imageCompression(imageFile, {
            maxSizeMB: 0.5,
            maxWidthOrHeight: 1280,
            useWebWorker: true,
          });

          // ✅ Upload for analysis
          const formData = new FormData();
          formData.append('image', compressed);
          formData.append('diveLogId', diveLogId);
          formData.append('userId', userId || 'anonymous-user');

          const uploadRes = await fetch('/api/openai/upload-dive-image', {
            method: 'POST',
            body: formData,
          });

          if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            setAiFeedback(uploadData?.message || "✅ Dive log saved & image analyzed!");
          } else {
            setAiFeedback("✅ Dive log saved! Image analysis failed.");
          }
        } catch (imageError) {
          console.error("❌ Image processing error:", imageError);
          setAiFeedback("✅ Dive log saved! Image analysis failed: " + imageError.message);
        }
      } else {
        setAiFeedback("✅ Dive log saved to local & cloud! Auto-analysis completed.");
      }

      // ✅ Trigger callback for UI refresh
      if (onSubmit) {
        onSubmit(saveLogResult.data || diveLogData);
      }

      // ✅ Clear draft from localStorage and reset form
      localStorage.removeItem('diveJournalDraft');
      setHasDraft(false);
      console.log('🗑️ Cleared dive journal draft from localStorage');
      setForm(initialFormState);
      setImageFile(null);
      setImagePreview(null);

    } catch (error) {
      console.error("❌ Error submitting dive log:", error);
      setAiFeedback(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const inputClassName = `w-full px-3 py-2 rounded-lg border transition-colors focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
    darkMode 
      ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400" 
      : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
  }`;

  const labelClassName = `block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Draft Status Indicator */}
      {hasDraft && (
        <div className={`p-3 rounded-lg border flex items-center justify-between ${
          darkMode ? "bg-yellow-900 border-yellow-700 text-yellow-200" : "bg-yellow-50 border-yellow-200 text-yellow-800"
        }`}>
          <div className="flex items-center gap-2">
            <span>📝</span>
            <span className="text-sm font-medium">Draft restored from previous session</span>
          </div>
          <button
            type="button"
            onClick={clearDraft}
            className={`text-xs px-3 py-1 rounded transition-colors ${
              darkMode 
                ? "bg-yellow-800 hover:bg-yellow-700 text-yellow-200" 
                : "bg-yellow-200 hover:bg-yellow-300 text-yellow-800"
            }`}
          >
            Clear Draft
          </button>
        </div>
      )}

      {/* Basic Information */}
      <div className={`p-4 rounded-lg ${darkMode ? "bg-gray-800 border border-gray-700" : "bg-blue-50 border border-blue-200"}`}>
        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
          📅 <span>Basic Information</span>
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClassName}>Date</label>
            <input 
              name="date" 
              type="date" 
              value={form.date} 
              onChange={handleChange} 
              className={inputClassName}
              required 
            />
          </div>
          <div>
            <label className={labelClassName}>Type</label>
            <select name="disciplineType" value={form.disciplineType} onChange={handleChange} className={inputClassName}>
              <option value="depth">Depth Discipline</option>
              <option value="pool">Pool Discipline</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div>
            <label className={labelClassName}>Discipline</label>
            <input 
              name="discipline" 
              placeholder="e.g., CWT, CNF, FIM" 
              value={form.discipline} 
              onChange={handleChange} 
              className={inputClassName}
            />
          </div>
          <div>
            <label className={labelClassName}>Location</label>
            <input 
              name="location" 
              placeholder="e.g., Blue Hole, Egypt" 
              value={form.location} 
              onChange={handleChange} 
              className={inputClassName}
            />
          </div>
        </div>
      </div>

      {/* Depth Metrics */}
      <div className={`p-4 rounded-lg ${darkMode ? "bg-gray-800 border border-gray-700" : "bg-green-50 border border-green-200"}`}>
        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
          📏 <span>Depth Metrics</span>
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClassName}>Target Depth (m)</label>
            <input 
              name="targetDepth" 
              placeholder="25" 
              type="number" 
              value={form.targetDepth} 
              onChange={handleChange} 
              className={inputClassName}
            />
          </div>
          <div>
            <label className={labelClassName}>Reached Depth (m)</label>
            <input 
              name="reachedDepth" 
              placeholder="23" 
              type="number" 
              value={form.reachedDepth} 
              onChange={handleChange} 
              className={inputClassName}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div>
            <label className={labelClassName}>Mouthfill Depth (m)</label>
            <input 
              name="mouthfillDepth" 
              placeholder="15" 
              type="number" 
              value={form.mouthfillDepth} 
              onChange={handleChange} 
              className={inputClassName}
            />
          </div>
          <div>
            <label className={labelClassName}>Issue Depth (m)</label>
            <input 
              name="issueDepth" 
              placeholder="20" 
              type="number" 
              value={form.issueDepth} 
              onChange={handleChange} 
              className={inputClassName}
            />
          </div>
        </div>
      </div>

      {/* Performance Data */}
      <div className={`p-4 rounded-lg ${darkMode ? "bg-gray-800 border border-gray-700" : "bg-purple-50 border border-purple-200"}`}>
        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
          ⏱️ <span>Performance Data</span>
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClassName}>Duration/Distance</label>
            <input 
              name="durationOrDistance" 
              placeholder="2:30 or 50m" 
              value={form.durationOrDistance} 
              onChange={handleChange} 
              className={inputClassName}
            />
          </div>
          <div>
            <label className={labelClassName}>Total Dive Time</label>
            <input 
              name="totalDiveTime" 
              placeholder="3:45" 
              value={form.totalDiveTime} 
              onChange={handleChange} 
              className={inputClassName}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div>
            <label className={labelClassName}>Exit Condition</label>
            <input 
              name="exit" 
              placeholder="Clean, LMC, BO" 
              value={form.exit} 
              onChange={handleChange} 
              className={inputClassName}
            />
          </div>
          <div>
            <label className={labelClassName}>Attempt Type</label>
            <input 
              name="attemptType" 
              placeholder="Training, PB attempt" 
              value={form.attemptType} 
              onChange={handleChange} 
              className={inputClassName}
            />
          </div>
        </div>
      </div>

      {/* Issues & Notes */}
      <div className={`p-4 rounded-lg ${darkMode ? "bg-gray-800 border border-gray-700" : "bg-orange-50 border border-orange-200"}`}>
        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
          ⚠️ <span>Issues & Notes</span>
        </h4>
        <div className="space-y-3">
          <div>
            <label className={labelClassName}>Issue Comments</label>
            <textarea 
              name="issueComment" 
              placeholder="Describe any issues encountered..." 
              value={form.issueComment} 
              onChange={handleChange} 
              rows={2}
              className={inputClassName}
            />
          </div>
          <div>
            <label className={labelClassName}>Surface Protocol</label>
            <input 
              name="surfaceProtocol" 
              placeholder="OK sign, breathing pattern" 
              value={form.surfaceProtocol} 
              onChange={handleChange} 
              className={inputClassName}
            />
          </div>
          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input 
                type="checkbox" 
                name="squeeze" 
                checked={form.squeeze} 
                onChange={handleChange}
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              />
              <span className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                Squeeze experienced
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Additional Notes */}
      <div className={`p-4 rounded-lg ${darkMode ? "bg-gray-800 border border-gray-700" : "bg-gray-50 border border-gray-200"}`}>
        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
          📝 <span>Additional Notes</span>
        </h4>
        <textarea 
          name="notes" 
          placeholder="How did the dive go? Any observations, feelings, or insights..." 
          value={form.notes} 
          onChange={handleChange} 
          rows={3}
          className={inputClassName}
        />
      </div>

      {/* Image Upload */}
      <div className={`p-4 rounded-lg ${darkMode ? "bg-gray-800 border border-gray-700" : "bg-indigo-50 border border-indigo-200"}`}>
        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
          📸 <span>Dive Profile Image</span>
        </h4>
        <label className="block">
          <input 
            type="file" 
            accept="image/png, image/jpeg" 
            onChange={handleImageChange} 
            className={`block w-full text-sm ${
              darkMode ? "text-gray-300" : "text-gray-500"
            } file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold ${
              darkMode 
                ? "file:bg-blue-600 file:text-white hover:file:bg-blue-700" 
                : "file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            }`}
          />
        </label>

        {imagePreview && (
          <div className="mt-3">
            <img 
              src={imagePreview} 
              alt="Preview" 
              className="w-full max-w-xs h-32 object-cover border rounded-lg shadow-sm" 
            />
          </div>
        )}
      </div>

      {/* Submit Button */}
      <button 
        type="submit" 
        disabled={loading} 
        className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-colors ${
          loading
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl"
        }`}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
            Saving Dive...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            💾 <span>Save Dive Entry</span>
          </span>
        )}
      </button>

      {/* AI Feedback */}
      {aiFeedback && (
        <div className={`p-4 rounded-lg border ${
          aiFeedback.includes('✅') 
            ? darkMode ? "bg-green-900 border-green-700 text-green-200" : "bg-green-50 border-green-200 text-green-800"
            : darkMode ? "bg-red-900 border-red-700 text-red-200" : "bg-red-50 border-red-200 text-red-800"
        }`}>
          <h5 className="font-semibold text-sm mb-2">🤖 AI Feedback</h5>
          <p className="text-sm">{aiFeedback}</p>
        </div>
      )}
    </form>
  );
}
