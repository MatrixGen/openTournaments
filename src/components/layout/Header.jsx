import React from 'react';
import { Link } from 'react-router-dom';

function Header() {
  return (
    <header className="bg-blue-700 text-white shadow">
      <div className="container mx-auto flex items-center justify-between py-3 px-4">
        <div className="font-bold text-xl">
          <Link to="/">openTournaments</Link>
        </div>
        <nav className="space-x-6">
          <Link to="/" className="hover:underline">Home</Link>
          <Link to="/tournaments" className="hover:underline">Tournaments</Link>
          <Link to="/dashboard" className="hover:underline">Dashboard</Link>
          <Link to="/profile" className="hover:underline">Profile</Link>
          <Link to="/login" className="hover:underline">Login</Link>
          <Link to="/register" className="hover:underline">Register</Link>
        </nav>
      </div>
    </header>
  );
}

export default Header;