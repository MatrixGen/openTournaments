/**
 * @typedef {Object} StartOptions
 * @property {string} fileName - Name of the video file
 */

/**
 * @typedef {Object} StopResult
 * @property {boolean} success
 * @property {string} filePath
 */

/**
 * @typedef {Object} ScreenRecorderPlugin
 * @property {(options: StartOptions) => Promise<{ success: boolean }>} startRecording
 * @property {() => Promise<StopResult>} stopRecording
 */
