import axios from 'axios';

const api = axios.create({
  baseURL: 'https://api.opentournaments.com', // replace with your backend URL
});

export default api;
