import { useEffect } from "react";

export default function FilePreview({ files, setFiles }) {
  if (!files || files.length === 0) return null;

  // Cleanup previews on unmount or file change
  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file));
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [files]);

  const removeFile = (index) => {
    const updated = [...files];
    updated.splice(index, 1);
    setFiles(updated);
  };

  return (
    <div className="flex flex-wrap gap-4 mt-2">
      {files.map((file, index) => {
        const previewUrl = URL.createObjectURL(file);
        return (
          <div
            key={index}
            className="relative w-24 h-24 border rounded-lg overflow-hidden shadow"
          >
            <img
              src={previewUrl}
              alt={`Uploaded file preview ${index + 1}`}
              className="object-cover w-full h-full"
            />
            <button
              type="button"
              onClick={() => removeFile(index)}
              title="Remove this file"
              className="absolute top-0 right-0 bg-red-600 hover:bg-red-700 text-white text-xs px-2 py-1 rounded-bl"
              aria-label={`Remove file ${index + 1}`}
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}
