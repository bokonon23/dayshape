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
    <div className="mx-auto mt-16 flex max-w-md flex-col items-center gap-6 px-4">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-gray-100">
          See what your health data reveals
        </h2>
        <p className="mt-2 text-sm text-gray-400">
          DayShape detects activity sessions, tracks recovery, and surfaces patterns across days.
        </p>
      </div>

      <button
        onClick={async () => {
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
        className="w-full rounded-xl bg-orange-600 px-6 py-4 text-lg font-medium text-white transition-colors hover:bg-orange-500 disabled:opacity-50"
      >
        {loadingDemo ? 'Loading...' : 'Try with demo data'}
      </button>

      <div className="flex w-full items-center gap-3">
        <div className="h-px flex-1 bg-gray-700" />
        <span className="text-xs text-gray-500">or</span>
        <div className="h-px flex-1 bg-gray-700" />
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`
          flex w-full cursor-pointer flex-col items-center rounded-xl border border-dashed
          px-6 py-6 transition-colors
          ${dragging ? 'border-orange-400 bg-orange-400/10' : 'border-gray-700 hover:border-gray-500'}
        `}
      >
        <p className="text-sm text-gray-400">
          Drop a Health Auto Export CSV here
        </p>
        <p className="mt-1 text-xs text-gray-600">or click to browse</p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          onChange={handleChange}
          className="hidden"
        />
      </div>
    </div>
  );
}
