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
const databaseRoutes = require('./routes/database');
const twilioService = require('./services/twilio');
const realtimeService = require('./services/realtime');
const dbService = require('./services/database.auto');

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
app.use('/database', databaseRoutes);

// Create HTTP server to support WebSocket
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/voice/stream' });

// Track conversation metadata by callSid
const conversationStates = new Map();

// Log WebSocket server startup
console.log(`📡 WebSocket server configured on path: /voice/stream`);

/**
 * WebSocket handler for Twilio MediaStream
 * Proxies audio between Twilio and OpenAI Realtime API
 */
wss.on('connection', (ws, req) => {
  let callSid = null;
  let streamSid = null;
  let openaiSession = null;
  let audioCommitTimer = null;
  const COMMIT_INTERVAL = 500; // Commit audio buffer every 500ms

  ws.on('message', async (data) => {
    try {
      // Parse the incoming message (JSON format from Twilio)
      const message = JSON.parse(data);

      // Handle the start event - contains call metadata
      if (message.event === 'start') {
        callSid = message.start.callSid;
        streamSid = message.start.streamSid;
        
        // Extract phone numbers from customParameters
        const customParams = message.start.customParameters || {};
        const toNumber = customParams.to || 'Unknown';
        const fromNumber = customParams.from;
        
        if (!fromNumber) {
          console.error('❌ No phone number found in stream parameters!');
          console.error('customParameters:', customParams);
          ws.close();
          return;
        }
        
        console.log(`📞 Call: ${fromNumber} → ${toNumber} (${callSid})`);

        // ✅ Register Twilio stream so OpenAI can send audio back
        twilioService.initializeStream(callSid, streamSid, ws);

        // ✅ Ensure database is ready before using it
        await dbService.ensureReady();

        // Database: Record caller and conversation
        const caller = await dbService.upsertCaller(fromNumber);
        const conversation = await dbService.createConversation(callSid, fromNumber);
        if (conversation) {
          conversationStates.set(callSid, {
            callSid,
            phone: fromNumber,
            conversationId: conversation.id,
            startTime: new Date()
          });
        }

        // Get caller's previous conversation history for context injection
        const previousHistory = await dbService.getConversationHistory(fromNumber, 3);
        let contextMsg = '';
        if (previousHistory && previousHistory.length > 0) {
          contextMsg = `Note: This caller has called ${previousHistory.length} time(s) before.`;
          if (caller?.name) {
            contextMsg += ` Their name is ${caller.name}.`;
          } else {
            contextMsg += ` You should ask for their name and remember it using the update_caller_name tool.`;
          }
        }

        // Define a system prompt for the AI
        const systemPrompt = 
        `You are a helpful and friendly AI assistant on a phone call.
        Respond to the caller's questions and requests in a clear and concise manner.
        Always be polite and professional.
        
        IMPORTANT: When you learn the caller's name (either they tell you or you ask), IMMEDIATELY call the update_caller_name tool to save it.
        If you already know their name from a previous conversation, greet them by name.
        ${contextMsg}`;
        
        // Create OpenAI Realtime session
        realtimeService.createSession(callSid, systemPrompt)
          .then((session) => {
            openaiSession = session;
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
          // Database: End conversation
          dbService.endConversation(callSid);
          
          twilioService.closeStream(callSid);
          realtimeService.closeSession(callSid);
          
          // Clean up conversation state
          conversationStates.delete(callSid);
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
    if (callSid) {
      console.log(`📞 Call ended: ${callSid}`);
      dbService.endConversation(callSid);
      conversationStates.delete(callSid);
      twilioService.closeStream(callSid);
      realtimeService.closeSession(callSid);
    }
  });

  ws.on('error', (err) => {
    console.error(`❌ WebSocket error: ${err.message}`);
    if (callSid) {
      dbService.endConversation(callSid);
      conversationStates.delete(callSid);
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
  
  if (!streamData || !streamData.ws || !streamData.streamSid) {
    return;
  }
  
  try {
    twilioService.sendMediaUpdate(streamData.ws, audio, streamData.streamSid);
  } catch (err) {
    console.error(`❌ Error sending audio: ${err.message}`);
  }
});

/**
 * Log user transcriptions from OpenAI
 */
realtimeService.on('user-transcription', ({ callSid, text }) => {
  console.log(`� User: "${text}"`);
  dbService.logMessage(callSid, 'user', text);
});

/**
 * Log AI transcripts from OpenAI
 */
realtimeService.on('assistant-transcript', ({ callSid, text }) => {
  console.log(`🤖 AI: "${text}"`);
  dbService.logMessage(callSid, 'assistant', text);
});

/**
 * Handle tool calls from OpenAI
 */
realtimeService.on('tool-call', async ({ callSid, toolName, toolArgs, callId, session }) => {
  console.log(`🔧 ${toolName}(${JSON.stringify(toolArgs)})`);
  
  // Get caller phone from conversation state
  const convState = conversationStates.get(callSid);
  const phone = convState?.phone;

  if (!phone) {
    console.error(`❌ Cannot execute tool - phone number not found`);
    realtimeService.sendToolResult(callSid, callId, {
      success: false,
      error: 'Internal error: phone number not found'
    });
    return;
  }

  // Import toolsService here to avoid circular dependencies
  const toolsService = require('./services/tools');

  // Execute the tool
  const result = await toolsService.executeTool(toolName, toolArgs, phone);
  
  // Send result back to OpenAI
  realtimeService.sendToolResult(callSid, callId, result);
});

// Log WebSocket server errors
wss.on('error', (err) => {
  console.error(`❌ WebSocket server error:`, err.message);
});

// Start server after database is ready
(async () => {
  await dbService.ensureReady();
  console.log('✅ Database initialized and ready');
  
  server.listen(process.env.PORT || 3000, () => {
    const publicUrl = process.env.NGROK_URL;
    if (publicUrl) {
      console.log(`🚀 Public URL: ${publicUrl}`);
    }
    console.log(`📱 Voice stream endpoint: ${publicUrl || 'http://localhost:3000'}/voice/stream`);
  });
})();