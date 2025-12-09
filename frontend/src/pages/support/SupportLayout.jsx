// SupportLayout.jsx
import { Outlet } from 'react-router-dom';

export default function SupportLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-900 to-neutral-800">
      <Outlet />
    </div>
  );
}