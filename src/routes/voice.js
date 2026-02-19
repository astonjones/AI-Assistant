/**
 * Voice Routes
 * Handles incoming Twilio voice calls and WebSocket streams
 */

const express = require('express');
const VoiceResponse = require('twilio').twiml.VoiceResponse;
const twilioService = require('../services/twilio');
const router = express.Router();

/**
 * POST /voice/incoming
 * Handles incoming voice calls from Twilio
 * Initiates audio streaming via MediaStream
 */
router.post('/incoming', (req, res) => {
  try {
    const { CallSid, From, To } = req.body;

    console.log(`📞 Incoming: ${From} → ${To} (${CallSid})`);

    const twiml = new VoiceResponse();

    // Start the media stream immediately — no pre-recorded greeting.
    // OpenAI Realtime will open the conversation once the WebSocket session is ready.
    const baseUrl = process.env.NGROK_URL;
    const wsUrl = baseUrl.replace('https://', 'wss://').replace('http://', 'ws://');
    const streamUrl = `${wsUrl}/voice/stream`;

    const connect = twiml.connect();
    const stream = connect.stream({ url: streamUrl });
    stream.parameter({ name: 'from', value: From });
    stream.parameter({ name: 'to', value: To });

    res.type('application/xml');
    res.send(twiml.toString());
  } catch (err) {
    console.error('Error handling incoming call:', err);

    const twiml = new VoiceResponse();
    twiml.say('Sorry, there was an error. Please try again later.');

    res.type('application/xml');
    res.send(twiml.toString());
  }
});

/**
 * GET /voice/stream
 * WebSocket endpoint for Twilio MediaStream
 * Note: This is handled by a separate WebSocket handler (see index.js)
 */
router.get('/stream', (req, res) => {
  // This endpoint is just for reference
  // Actual WebSocket handling is done in the server setup
  res.json({
    message: 'WebSocket endpoint for Twilio MediaStream',
    usage: 'Connect via WebSocket to receive audio data'
  });
});

/**
 * GET /voice/stats
 * Get statistics about active voice streams
 */
router.get('/stats', (req, res) => {
  const stats = twilioService.getStreamStats();
  res.json(stats);
});

/**
 * GET /voice/streams
 * Get list of all active streams
 */
router.get('/streams', (req, res) => {
  const streams = twilioService.getActiveStreams();
  const streamList = Array.from(streams.entries()).map(([callSid, data]) => ({
    callSid,
    startTime: data.startTime,
    isActive: data.isActive,
    audioChunks: data.audioChunks.length,
    totalBytes: data.audioChunks.reduce((acc, chunk) => acc + chunk.length, 0)
  }));

  res.json({
    activeStreams: streamList,
    count: streams.size
  });
});

module.exports = router;
