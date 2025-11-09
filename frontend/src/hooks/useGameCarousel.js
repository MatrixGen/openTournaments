import { useState, useEffect } from 'react';

export const useGameCarousel = (games, interval = 3000) => {
  const [currentGameIndex, setCurrentGameIndex] = useState(0);
  const [direction, setDirection] = useState(1); // 1 for next, -1 for previous
  const [isPaused, setIsPaused] = useState(false);

  const nextGame = () => {
    setDirection(1);
    setCurrentGameIndex((prev) => (prev + 1) % games.length);
  };

  const prevGame = () => {
    setDirection(-1);
    setCurrentGameIndex((prev) => (prev - 1 + games.length) % games.length);
  };

  const goToGame = (index) => {
    setDirection(index > currentGameIndex ? 1 : -1);
    setCurrentGameIndex(index);
  };

  useEffect(() => {
    if (isPaused) return;

    const timer = setInterval(() => {
      nextGame();
    }, interval);

    return () => clearInterval(timer);
  }, [games.length, interval, isPaused]);

  return {
    currentGameIndex,
    currentGame: games[currentGameIndex],
    direction,
    nextGame,
    prevGame,
    goToGame,
    isPaused,
    setIsPaused
  };
};