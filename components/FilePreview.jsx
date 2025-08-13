import { useEffect, useState } from "react";
import { extractDiveText } from '../utils/extractTextFromImage';

export default function FilePreview({ files, setFiles, darkMode = false, onOCRResult }) {
  const [ocrResults, setOcrResults] = useState({});
  const [processing, setProcessing] = useState({});

  // Cleanup previews on unmount or file change
  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file));
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [files]);

  // Auto-OCR when files change
  useEffect(() => {
    files.forEach((file, index) => {
      if (file.type.startsWith('image/') && !ocrResults[index] && !processing[index]) {
        performOCR(file, index);
      }
    });
  }, [files]);

  const performOCR = async (file, index) => {
    try {
      setProcessing(prev => ({ ...prev, [index]: true }));
      
      console.log(`🔍 Running OCR on file ${index + 1}...`);
      const text = await extractDiveText(file);
      
      const result = {
        text,
        preview: text ? text.substring(0, 60) + (text.length > 60 ? '...' : '') : 'No text detected',
        success: !!text?.trim()
      };
      
      setOcrResults(prev => ({ ...prev, [index]: result }));
      
      if (onOCRResult) {
        onOCRResult(index, result);
      }
      
    } catch (error) {
      console.warn(`⚠️ OCR failed for file ${index + 1}:`, error);
      setOcrResults(prev => ({ 
        ...prev, 
        [index]: { text: '', preview: 'OCR failed', success: false }
      }));
    } finally {
      setProcessing(prev => ({ ...prev, [index]: false }));
    }
  };

  const removeFile = (index) => {
    const updated = [...files];
    updated.splice(index, 1);
    setFiles(updated);
    
    // Clean up OCR results
    const newOcrResults = { ...ocrResults };
    const newProcessing = { ...processing };
    delete newOcrResults[index];
    delete newProcessing[index];
    setOcrResults(newOcrResults);
    setProcessing(newProcessing);
  };

  if (!files || files.length === 0) return null;

  return (
    <div className="space-y-3 mt-2">
      {/* Image Previews */}
      <div className="flex flex-wrap gap-4">
        {files.map((file, index) => {
          const previewUrl = URL.createObjectURL(file);
          const ocr = ocrResults[index];
          const isProcessing = processing[index];
          
          return (
            <div key={index} className="relative">
              <div className={`relative w-24 h-24 border rounded-lg overflow-hidden shadow ${
                darkMode ? 'border-gray-600' : 'border-gray-300'
              }`}>
                <img
                  src={previewUrl}
                  alt={`Preview ${index + 1}`}
                  className="object-cover w-full h-full"
                />
                
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="absolute top-0 right-0 bg-red-600 hover:bg-red-700 text-white text-xs px-2 py-1 rounded-bl"
                >
                  ✕
                </button>
                
                {/* Processing indicator */}
                {isProcessing && (
                  <div className="absolute bottom-0 left-0 right-0 bg-blue-600 bg-opacity-90 text-white text-xs px-1 py-1 text-center">
                    🔍 OCR...
                  </div>
                )}
                
                {/* Success/error indicator */}
                {ocr && (
                  <div className={`absolute bottom-0 left-0 text-white text-xs px-1 py-1 rounded-tr ${
                    ocr.success ? 'bg-green-600' : 'bg-yellow-600'
                  }`}>
                    {ocr.success ? '✅' : '⚠️'}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* OCR Results */}
      {Object.keys(ocrResults).length > 0 && (
        <div className={`border rounded-lg p-3 ${darkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-300 bg-gray-50'}`}>
          <h4 className={`text-sm font-medium mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            📄 Text Detected:
          </h4>
          
          {Object.entries(ocrResults).map(([index, result]) => (
            <div key={index} className={`text-xs p-2 rounded mb-2 ${darkMode ? 'bg-gray-700' : 'bg-white'}`}>
              <div className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Image {parseInt(index) + 1}:
              </div>
              <div className={`mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                "{result.preview}"
              </div>
            </div>
          ))}
          
          <div className={`text-xs mt-2 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
            💡 This data will be automatically analyzed when you submit
          </div>
        </div>
      )}
    </div>
  );
}
