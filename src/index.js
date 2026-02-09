require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const healthRoutes = require('./routes/health');
const agentRoutes = require('./routes/agent');
const authRoutes = require('./routes/auth');
const voiceRoutes = require('./routes/voice');
const smsRoutes = require('./routes/sms');
const webhookRoutes = require('./routes/webhooks');
const twilioService = require('./services/twilio');
const realtimeService = require('./services/realtime');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // For Twilio webhooks

app.use('/health', healthRoutes);
app.use('/agent', agentRoutes);
app.use('/auth', authRoutes);
app.use('/voice', voiceRoutes);
app.use('/sms', smsRoutes);
app.use('/webhooks', webhookRoutes);

// Create HTTP server to support WebSocket
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/voice/stream' });

// Log WebSocket server startup
console.log(`📡 WebSocket server configured on path: /voice/stream`);

/**
 * WebSocket handler for Twilio MediaStream
 * Proxies audio between Twilio and OpenAI Realtime API
 */
wss.on('connection', (ws, req) => {
  console.log('🔌 WebSocket connection established from client');
  
  let callSid = null;
  let streamSid = null;
  let openaiSession = null;
  let audioCommitTimer = null;
  const COMMIT_INTERVAL = 500; // Commit audio buffer every 500ms

  ws.on('message', (data) => {
    try {
      // Parse the incoming message (JSON format from Twilio)
      const message = JSON.parse(data);

      // Handle the start event - contains call metadata
      if (message.event === 'start') {
        callSid = message.start.callSid;
        streamSid = message.start.streamSid;
        console.log(`\n📡 STREAM STARTED - Call SID: ${callSid}`);
        
        // Initialize the Twilio stream tracking with both callSid and streamSid
        twilioService.initializeStream(callSid, streamSid, ws);

        // Create OpenAI Realtime session for this call
        console.log(`🔄 Creating OpenAI Realtime session...`);
        realtimeService.createSession(callSid)
          .then((session) => {
            openaiSession = session;
            console.log(`✨ OpenAI Realtime session connected for call ${callSid}`);
          })
          .catch(err => {
            console.error(`❌ FAILED to create OpenAI session: ${err.message}`);
            try {
              ws.send(JSON.stringify({
                event: 'error',
                error: 'Failed to initialize AI session: ' + err.message
              }));
            } catch (e) {
              console.error('Failed to send error message to Twilio');
            }
          });

        // Send acknowledgment back to Twilio
        try {
          ws.send(JSON.stringify({
            event: 'connected',
            callSid: callSid
          }));
        } catch (e) {
          console.error('Failed to send acknowledgment:', e.message);
        }
      }
      
      // Handle media (audio) events
      else if (message.event === 'media') {
        if (!message.media || !message.media.payload) {
          console.error(`❌ Invalid media message structure`);
          return;
        }

        const audioPayload = message.media.payload;
        
        try {
          const audioBuffer = Buffer.from(audioPayload, 'base64');
          
          if (callSid) {
            twilioService.handleAudioData(callSid, audioBuffer);
            
            // Forward to OpenAI Realtime API
            if (openaiSession && openaiSession.isConnected) {
              realtimeService.sendAudioToOpenAI(callSid, audioPayload);
              
              // Clear existing timer and set new one to commit audio after short delay
              if (audioCommitTimer) {
                clearTimeout(audioCommitTimer);
              }
              audioCommitTimer = setTimeout(() => {
                realtimeService.commitAudioBuffer(callSid);
              }, COMMIT_INTERVAL);
            }
          }
        } catch (err) {
          console.error(`❌ Error processing audio: ${err.message}`);
        }
      }
      
      // Handle stop event
      else if (message.event === 'stop') {
        console.log(`\n⏹️  STREAM STOPPED - Call SID: ${callSid}`);
        if (callSid) {
          twilioService.closeStream(callSid);
          realtimeService.closeSession(callSid);
          console.log(`✅ Cleaned up stream and session`);
        }
      }
      
      // Handle mark event (optional - for synchronization)
      else if (message.event === 'mark') {
        // Silently handle mark events (very frequent)
        // console.log(`📍 Mark received for call: ${callSid}`);
      }
      
    } catch (err) {
      if (err instanceof SyntaxError) {
        console.error(`❌ JSON Parse Error: Invalid JSON in WebSocket message`);
        console.error(`   Error: ${err.message}`);
        console.error(`   Data received (first 200 chars): ${data.substring(0, 200)}`);
        console.error(`   Data type: ${typeof data}`);
      } else {
        console.error(`❌ Error processing WebSocket message: ${err.message}`);
        console.error(`   Error type: ${err.name}`);
        console.error(`   Stack:`, err.stack);
      }
    }
  });

  ws.on('close', () => {
    console.log(`\n🔌 WebSocket connection closed - Call SID: ${callSid || 'unknown'}`);
    if (callSid) {
      twilioService.closeStream(callSid);
      realtimeService.closeSession(callSid);
    }
  });

  ws.on('error', (err) => {
    console.error(`\n❌ WebSocket error for call ${callSid || 'unknown'}:`, err.message);
    if (callSid) {
      twilioService.closeStream(callSid);
      realtimeService.closeSession(callSid);
    }
  });
});

// ════════════════════════════════════════════════════════
// OpenAI Realtime → Twilio Audio Routing
// ════════════════════════════════════════════════════════
/**
 * Listen for audio responses from OpenAI Realtime API
 * Forward them back to Twilio for playback to caller
 */
realtimeService.on('response-audio', ({ callSid, audio }) => {
  const streamData = twilioService.getStream(callSid);
  
  if (!streamData) {
    console.error(`   ❌ Stream not found for call: ${callSid}`);
    return;
  }
  
  if (!streamData.ws) {
    console.error(`   ❌ WebSocket not found in stream for call: ${callSid}`);
    return;
  }
  
  if (!streamData.streamSid) {
    console.error(`   ❌ Stream SID not found in stream data for call: ${callSid}`);
    return;
  }

  console.log(`📤 Routing audio response to Twilio (${audio?.length || 0} bytes, base64)`);
  
  try {
    // Send audio back to Twilio using the correct streamSid
    twilioService.sendMediaUpdate(streamData.ws, audio, streamData.streamSid);
  } catch (err) {
    console.error(`   ❌ Error sending audio to Twilio: ${err.message}`);
  }
});

/**
 * Log user transcriptions from OpenAI
 */
realtimeService.on('user-transcription', ({ callSid, text }) => {
  console.log(`📝 [${callSid}] User said: "${text}"`);
});

/**
 * Log when AI response completes
 */
realtimeService.on('response-complete', ({ callSid }) => {
  console.log(`✅ [${callSid}] AI response complete`);
});

/**
 * Handle OpenAI errors
 */
realtimeService.on('openai-error', ({ callSid, error }) => {
  console.error(`❌ [${callSid}] OpenAI error:`, error);
});

// Log WebSocket server errors
wss.on('error', (err) => {
  console.error(`❌ WebSocket server error:`, err.message);
});

server.listen(process.env.PORT || 3000, () => {
  const publicUrl = process.env.NGROK_URL;
  if (publicUrl) {
    console.log(`🚀 Public URL: ${publicUrl}`);
  }
  console.log(`📱 Voice stream endpoint: ${publicUrl || 'http://localhost:3000'}/voice/stream`);
});