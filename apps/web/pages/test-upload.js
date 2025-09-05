import { useState } from 'react';
import Head from 'next/head';

export default function TestUpload() {
    const [selectedFile, setSelectedFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [metrics, setMetrics] = useState(null);

    const userId = 'c92a32c8-35a9-4f16-844f-bab9ba4ceb32'; // Test user ID

    const handleFile = (file) => {
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setError('Please select an image file');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            setError('File too large. Maximum size is 10MB');
            return;
        }

        setSelectedFile(file);
        setError(null);

        // Show preview
        const reader = new FileReader();
        reader.onload = (e) => {
            setPreview(e.target.result);
        };
        reader.readAsDataURL(file);
    };

    const uploadImage = async () => {
        if (!selectedFile) {
            setError('Please select a file first');
            return;
        }

        setUploading(true);
        setError(null);
        setResult(null);
        setMetrics(null);

        try {
            // Create form data for file upload
            const formData = new FormData();
            formData.append('image', selectedFile);
            formData.append('userId', userId);
            formData.append('diveLogId', 'test-dive-' + Date.now());

            const startTime = Date.now();

            const response = await fetch('/api/dive/upload-image', {
                method: 'POST',
                body: formData
            });

            const endTime = Date.now();
            const duration = ((endTime - startTime) / 1000).toFixed(1);

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Upload failed');
            }

            setResult(`✅ SUCCESS! Analysis completed in ${duration}s\n\n` + JSON.stringify(data, null, 2));
            showMetrics(data.data);

        } catch (error) {
            console.error('Upload error:', error);
            setError(`❌ ERROR: ${error.message}`);
        } finally {
            setUploading(false);
        }
    };

    const showMetrics = (data) => {
        if (!data.extractedData) return;

        const metricsData = [];
        const extracted = data.extractedData;

        if (extracted.maxDepth) {
            metricsData.push({ title: 'Max Depth', value: extracted.maxDepth + 'm' });
        }
        if (extracted.diveTime) {
            metricsData.push({ title: 'Dive Time', value: extracted.diveTime });
        }
        if (extracted.temperature) {
            metricsData.push({ title: 'Temperature', value: extracted.temperature + '°C' });
        }
        if (data.coachingInsights?.performanceRating) {
            metricsData.push({ title: 'Performance Rating', value: data.coachingInsights.performanceRating + '/10' });
        }
        if (data.confidence) {
            metricsData.push({ title: 'AI Confidence', value: Math.round(data.confidence * 100) + '%' });
        }

        setMetrics(metricsData);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    };

    return (
        <>
            <Head>
                <title>Dive Computer Image Upload Test</title>
                <meta name="viewport" content="width=device-width, initial-scale=1" />
            </Head>

            <div style={{
                fontFamily: 'Arial, sans-serif',
                maxWidth: '800px',
                margin: '0 auto',
                padding: '20px',
                background: '#f5f5f5',
                minHeight: '100vh'
            }}>
                <div style={{
                    background: 'white',
                    padding: '30px',
                    borderRadius: '10px',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
                }}>
                    <h1>🤿 Dive Computer Image Upload Test</h1>
                    <p>Test the unified upload API with your dive computer screenshots. The AI will analyze the dive data and provide coaching insights.</p>

                    <div
                        style={{
                            border: '2px dashed #007acc',
                            borderRadius: '10px',
                            padding: '40px',
                            textAlign: 'center',
                            background: '#f8fcff',
                            margin: '20px 0',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease'
                        }}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        onClick={() => document.getElementById('fileInput').click()}
                    >
                        <h3>📸 Drop your dive computer image here</h3>
                        <p>Or click to select a file</p>
                        <p><small>Supports: JPEG, PNG, WebP (max 10MB)</small></p>
                    </div>

                    <input
                        type="file"
                        id="fileInput"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => handleFile(e.target.files[0])}
                    />

                    {preview && (
                        <img
                            src={preview}
                            alt="Preview"
                            style={{
                                maxWidth: '100%',
                                maxHeight: '300px',
                                margin: '20px 0',
                                borderRadius: '8px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                            }}
                        />
                    )}

                    <button
                        onClick={uploadImage}
                        disabled={!selectedFile || uploading}
                        style={{
                            background: uploading ? '#6c757d' : '#007acc',
                            color: 'white',
                            border: 'none',
                            padding: '12px 24px',
                            borderRadius: '6px',
                            cursor: uploading ? 'not-allowed' : 'pointer',
                            fontSize: '16px',
                            margin: '10px 0'
                        }}
                    >
                        {uploading ? '🔄 Analyzing...' : '🚀 Upload & Analyze'}
                    </button>

                    {error && (
                        <div style={{
                            background: '#f8d7da',
                            border: '1px solid #f5c6cb',
                            color: '#721c24',
                            borderRadius: '8px',
                            padding: '20px',
                            margin: '20px 0',
                            whiteSpace: 'pre-wrap',
                            fontFamily: 'Monaco, monospace',
                            fontSize: '12px'
                        }}>
                            {error}
                        </div>
                    )}

                    {result && (
                        <div style={{
                            background: '#d4edda',
                            border: '1px solid #c3e6cb',
                            color: '#155724',
                            borderRadius: '8px',
                            padding: '20px',
                            margin: '20px 0',
                            whiteSpace: 'pre-wrap',
                            fontFamily: 'Monaco, monospace',
                            fontSize: '12px',
                            maxHeight: '500px',
                            overflowY: 'auto'
                        }}>
                            {result}
                        </div>
                    )}

                    {metrics && metrics.length > 0 && (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: '15px',
                            margin: '20px 0'
                        }}>
                            {metrics.map((metric, index) => (
                                <div key={index} style={{
                                    background: '#e9f5ff',
                                    padding: '15px',
                                    borderRadius: '8px',
                                    borderLeft: '4px solid #007acc'
                                }}>
                                    <h4 style={{ margin: '0 0 5px 0', color: '#007acc' }}>
                                        {metric.title}
                                    </h4>
                                    <p style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>
                                        {metric.value}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}

                    <div style={{ marginTop: '30px', padding: '15px', background: '#f8f9fa', borderRadius: '8px' }}>
                        <h4>📝 Test Instructions:</h4>
                        <ol>
                            <li>Drag and drop one of your dive computer screenshots above</li>
                            <li>Click &quot;Upload &amp; Analyze&quot; to test the AI analysis</li>
                            <li>Review the extracted dive data and coaching insights</li>
                            <li>Check that depth, time, and temperature are correctly identified</li>
                        </ol>
                        <p><strong>Test User ID:</strong> {userId}</p>
                    </div>
                </div>
            </div>
        </>
    );
}
