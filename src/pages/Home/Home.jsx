import React from 'react';
import Button from '../../components/common/Button';
import { useNavigate } from 'react-router-dom';

function Home() {
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      <Button variant="primary" onClick={() => navigate('/tournaments')}>
        Go to Tournaments
      </Button>
      <Button variant="secondary" onClick={() => navigate('/dashboard')}>
        Go to Dashboard
      </Button>
      <Button variant="outline" onClick={() => navigate('/profile')}>
        Go to Profile
      </Button>
      <Button variant="primary" onClick={() => navigate('/login')}>
        Login
      </Button>
      <Button variant="secondary" onClick={() => navigate('/register')}>
        Register
      </Button>
    </div>
  );
}

export default Home;