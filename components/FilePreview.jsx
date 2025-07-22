// components/FilePreview.jsx

export default function FilePreview({ files, setFiles }) {
  if (!files || files.length === 0) return null;

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
          <div key={index} className="relative w-24 h-24">
            <img
              src={previewUrl}
              alt={`preview-${index}`}
              className="object-cover w-full h-full rounded-lg border shadow"
            />
            <button
              type="button"
              onClick={() => removeFile(index)}
              className="absolute top-0 right-0 bg-red-600 text-white text-xs px-1 rounded-bl"
              title="Remove"
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}
