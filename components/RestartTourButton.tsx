// components/RestartTourButton.tsx
// Optional — add this anywhere (e.g. dashboard settings or sidebar footer)
// so the user can re-run the tour whenever they want

'use client';

import { Compass } from 'lucide-react';

const STORAGE_KEY = 'uniquest_tour_completed';

export default function RestartTourButton() {
  const handleRestart = () => {
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload(); // tour auto-shows on reload when key is absent
  };

  return (
    <button
      onClick={handleRestart}
      className="flex items-center gap-2 text-xs text-gray-400 hover:text-[#2d9e7a] transition px-3 py-2 rounded-lg hover:bg-[#f0faf6] w-full"
    >
      <Compass size={14} />
      Restart guided tour
    </button>
  );
}
