import React, { useState } from 'react';

// 🚀 Unified Dive Image Upload Demo Component
// Shows how to use the new unified API with both file and base64 uploads

const UnifiedImageUploadDemo = ({ userId = 'demo-user' }) => {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // File Upload Method
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('userId', userId);
      formData.append('diveLogId', `demo-dive-${Date.now()}`);

      const response = await fetch('/api/dive/upload-image', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setResult(data.data);
      } else {
        setError(data.error || 'Upload failed');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  // Base64 Upload Method (for mobile/camera)
  const handleCameraUpload = async () => {
    try {
      // Get image from camera (simplified for demo)
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#007acc';
      ctx.fillRect(0, 0, 100, 100);
      ctx.fillStyle = 'white';
      ctx.font = '12px Arial';
      ctx.fillText('DEMO', 30, 50);
      
      const base64Data = canvas.toDataURL('image/png');

      setUploading(true);
      setError(null);
      setResult(null);

      const payload = {
        imageData: base64Data,
        userId: userId,
        filename: 'demo-camera-image.png',
        diveLogId: `demo-camera-dive-${Date.now()}`
      };

      const response = await fetch('/api/dive/upload-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setResult(data.data);
      } else {
        setError(data.error || 'Upload failed');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="unified-upload-demo" style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px', maxWidth: '600px' }}>
      <h3>🚀 Unified Dive Image Upload Demo</h3>
      
      {/* File Upload */}
      <div style={{ marginBottom: '20px' }}>
        <h4>📁 File Upload Method</h4>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          disabled={uploading}
          style={{ marginBottom: '10px' }}
        />
        <p style={{ fontSize: '12px', color: '#666' }}>
          Upload a dive computer image file
        </p>
      </div>

      {/* Camera/Base64 Upload */}
      <div style={{ marginBottom: '20px' }}>
        <h4>📱 Base64 Upload Method</h4>
        <button
          onClick={handleCameraUpload}
          disabled={uploading}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007acc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          {uploading ? 'Uploading...' : 'Demo Base64 Upload'}
        </button>
        <p style={{ fontSize: '12px', color: '#666' }}>
          Simulates camera/mobile upload via base64
        </p>
      </div>

      {/* Loading State */}
      {uploading && (
        <div style={{ padding: '10px', backgroundColor: '#f0f8ff', borderRadius: '4px', marginBottom: '20px' }}>
          <p>🔄 Processing image with Enhanced Vision Analysis...</p>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div style={{ padding: '10px', backgroundColor: '#ffebee', borderRadius: '4px', marginBottom: '20px' }}>
          <p style={{ color: '#c62828' }}>❌ Error: {error}</p>
        </div>
      )}

      {/* Results Display */}
      {result && (
        <div style={{ padding: '15px', backgroundColor: '#e8f5e8', borderRadius: '4px' }}>
          <h4>✅ Upload Successful!</h4>
          
          <div style={{ marginBottom: '10px' }}>
            <strong>📊 Basic Info:</strong>
            <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
              <li>Image ID: {result.imageId}</li>
              <li>Confidence: {result.confidence}</li>
              <li>Processing Method: {result.processingMethod}</li>
              <li>File Size: {Math.round(result.optimizedSize / 1024)}KB</li>
              {result.compressionRatio && <li>Compression: {result.compressionRatio}%</li>}
            </ul>
          </div>

          {result.extractedData && Object.keys(result.extractedData).length > 0 && (
            <div style={{ marginBottom: '10px' }}>
              <strong>🔍 Extracted Data:</strong>
              <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                {result.extractedData.maxDepth && <li>Max Depth: {result.extractedData.maxDepth}m</li>}
                {result.extractedData.diveTime && <li>Dive Time: {result.extractedData.diveTime}</li>}
                {result.extractedData.temperature && <li>Temperature: {result.extractedData.temperature}°C</li>}
                {result.extractedData.diveMode && <li>Mode: {result.extractedData.diveMode}</li>}
              </ul>
            </div>
          )}

          {result.coachingInsights && (
            <div style={{ marginBottom: '10px' }}>
              <strong>🎯 Coaching Insights:</strong>
              <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                {result.coachingInsights.safetyAssessment && (
                  <li>Safety: {result.coachingInsights.safetyAssessment}</li>
                )}
                {result.performanceRating && (
                  <li>Performance Rating: {result.performanceRating}/10</li>
                )}
              </ul>
            </div>
          )}

          {result.recommendations && result.recommendations.length > 0 && (
            <div>
              <strong>💡 Recommendations:</strong>
              <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                {result.recommendations.map((rec, index) => (
                  <li key={index}>{rec}</li>
                ))}
              </ul>
            </div>
          )}

          {result.imageUrl && (
            <div style={{ marginTop: '15px' }}>
              <strong>🖼️ Uploaded Image:</strong>
              <br />
              <img 
                src={result.imageUrl} 
                alt="Uploaded dive computer" 
                style={{ maxWidth: '200px', border: '1px solid #ccc', borderRadius: '4px', marginTop: '5px' }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UnifiedImageUploadDemo;
