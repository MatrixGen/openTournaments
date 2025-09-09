import React, { useState } from 'react';
import { Link } from 'react-router-dom';

function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`bg-white border-r h-screen p-4 transition-all duration-300 ${collapsed ? 'w-16' : 'w-56'}`}>
      <button
        className="mb-6 text-gray-500 hover:text-blue-600"
        onClick={() => setCollapsed(!collapsed)}
        aria-label="Toggle Sidebar"
      >
        {collapsed ? <span>&#9776;</span> : <span>&times;</span>}
      </button>
      <nav className="space-y-4">
        <Link to="/dashboard" className="flex items-center space-x-2 hover:text-blue-600">
          <span role="img" aria-label="dashboard">📊</span>
          {!collapsed && <span>Dashboard</span>}
        </Link>
        <Link to="/tournaments" className="flex items-center space-x-2 hover:text-blue-600">
          <span role="img" aria-label="tournaments">🏆</span>
          {!collapsed && <span>Tournaments</span>}
        </Link>
        <Link to="/profile" className="flex items-center space-x-2 hover:text-blue-600">
          <span role="img" aria-label="profile">👤</span>
          {!collapsed && <span>Profile</span>}
        </Link>
        <Link to="/settings" className="flex items-center space-x-2 hover:text-blue-600">
          <span role="img" aria-label="settings">⚙️</span>
          {!collapsed && <span>Settings</span>}
        </Link>
      </nav>
    </aside>
  );
}

export default Sidebar;