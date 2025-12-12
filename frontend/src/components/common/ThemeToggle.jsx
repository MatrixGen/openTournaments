import { Moon, Sun } from "lucide-react";
import { useTheme } from '../../contexts/ThemeContext'; // Adjust the import path

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="
        fixed bottom-6 right-6 z-50
        bg-gray-200 dark:bg-gray-800
        text-gray-900 dark:text-gray-100
        p-3 rounded-full shadow-lg
        hover:scale-110 transition-transform duration-200
      "
      aria-label="Toggle theme"
    >
      {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
    </button>
  );
}