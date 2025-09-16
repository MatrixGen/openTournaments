import React from 'react';

function Footer() {
  return (
    <footer className="bg-gray-100 text-gray-700 py-4 mt-8">
      <div className="container mx-auto text-center text-sm">
        &copy; {new Date().getFullYear()} openTournaments. All rights reserved.
      </div>
    </footer>
  );
}

export default Footer;