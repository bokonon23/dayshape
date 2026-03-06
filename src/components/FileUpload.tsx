import { useCallback, useRef, useState } from 'react';

interface FileUploadProps {
  onFileLoaded: (csvText: string, fileName: string) => void;
}

export default function FileUpload({ onFileLoaded }: FileUploadProps) {
  const [dragging, setDragging] = useState(false);
  const [loadingDemo, setLoadingDemo] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        onFileLoaded(text, file.name);
      };
      reader.readAsText(file);
    },
    [onFileLoaded]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && file.name.endsWith('.csv')) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
  <>
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`
        mx-auto mt-24 flex max-w-lg cursor-pointer flex-col items-center justify-center
        rounded-2xl border-2 border-dashed p-16 transition-colors
        ${dragging ? 'border-orange-400 bg-orange-400/10' : 'border-gray-700 bg-gray-900 hover:border-gray-500'}
      `}
    >
      <svg
        className="mb-4 h-12 w-12 text-gray-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
        />
      </svg>
      <p className="text-lg text-gray-300">
        Drop a Health Auto Export CSV here
      </p>
      <p className="mt-2 text-sm text-gray-500">or click to browse</p>
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        onChange={handleChange}
        className="hidden"
      />
    </div>

    <button
      onClick={async (e) => {
        e.stopPropagation();
        setLoadingDemo(true);
        try {
          const res = await fetch(import.meta.env.BASE_URL + 'sample-data.csv');
          const text = await res.text();
          onFileLoaded(text, 'sample-data.csv');
        } finally {
          setLoadingDemo(false);
        }
      }}
      disabled={loadingDemo}
      className="mx-auto mt-4 block rounded-lg bg-gray-800 px-4 py-2 text-sm text-gray-400 hover:bg-gray-700 hover:text-gray-300 disabled:opacity-50"
    >
      {loadingDemo ? 'Loading...' : 'or load demo data (22 days)'}
    </button>
  </>
  );
}
