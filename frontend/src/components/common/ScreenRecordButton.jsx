import { useState } from 'react';
import { screenRecorderUtil } from '../../utils/screenRecorder'; // Path to your new util

export default function ScreenRecordButton() {
  const [recording, setRecording] = useState(false);

  const handleScreenRecord = async () => {
    try {
      if (!recording) {
        // Use the util to start (it handles permissions automatically)
        await screenRecorderUtil.start('test_match.mp4');
        console.log('Screen recording started');
        setRecording(true);
      } else {
        // Use the util to stop
        await screenRecorderUtil.stop();
        console.log('Screen recording stopped');
        setRecording(false);
        alert('Screen recording stopped!');
      }
    } catch (e) {
      console.error('Screen recording error:', e);
      alert(e.message);
    }
  };

  return (
    <button
      onClick={handleScreenRecord}
      className={`${
        recording ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'
      } text-white px-4 py-2 rounded mt-4 transition-colors`}
    >
      {recording ? 'Stop Screen Recording' : 'Start Screen Recording'}
    </button>
  );
}