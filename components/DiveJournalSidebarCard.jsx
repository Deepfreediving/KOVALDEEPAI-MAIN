import { useState } from 'react';
import DiveJournalForm from './DiveJournalForm';

export default function DiveJournalSidebarCard({ userId }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-6 border rounded-lg bg-white shadow-sm">
      <div
        className="flex justify-between items-center p-3 cursor-pointer hover:bg-gray-100"
        onClick={() => setOpen(!open)}
      >
        <h3 className="font-semibold text-sm">📝 Dive Journal</h3>
        <button className="text-xs text-blue-600">
          {open ? 'Hide' : 'Open'}
        </button>
      </div>

      {open && (
        <div className="p-3 border-t">
          <DiveJournalForm userId={userId} />
        </div>
      )}
    </div>
  );
}
