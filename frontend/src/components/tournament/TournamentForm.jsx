import React, { useState } from 'react';
import Input from '../common/Input';
import Button from '../common/Button';

function TournamentForm({ onSubmit }) {
  const [form, setForm] = useState({
    name: '',
    entryFee: '',
    description: '',
  });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.entryFee) {
      setError('Name and Entry Fee are required.');
      return;
    }
    setError('');
    onSubmit(form);
    setForm({ name: '', entryFee: '', description: '' });
  };

  return (
    <form className="bg-white rounded shadow p-6 max-w-md mx-auto" onSubmit={handleSubmit}>
      <Input
        label="Tournament Name"
        name="name"
        placeholder="Enter tournament name"
        value={form.name}
        onChange={handleChange}
        error={error && !form.name ? error : ''}
      />
      <Input
        label="Entry Fee"
        name="entryFee"
        placeholder="Enter entry fee"
        type="number"
        value={form.entryFee}
        onChange={handleChange}
        error={error && !form.entryFee ? error : ''}
      />
      <Input
        label="Description"
        name="description"
        placeholder="Enter description"
        value={form.description}
        onChange={handleChange}
      />
      {error && <div className="text-red-500 text-sm mb-2">{error}</div>}
      <Button variant="primary" type="submit">
        Create Tournament
      </Button>
    </form>
  );
}

export default TournamentForm;