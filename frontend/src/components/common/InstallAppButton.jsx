export default function InstallAppButton() {
  const handleInstall = () => {
    const apkUrl = 'https://otarena.vercel.app/downloads/otarena.apk';

    // Open in system browser (important for Android installer)
    window.open(apkUrl, '_blank');
  };

  return (
    <button
      onClick={handleInstall}
      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded mt-4"
    >
      Install OTArena App
    </button>
  );
}
