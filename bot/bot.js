const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const qrImage = require('qr-image');
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cron = require('node-cron');
const fs = require('fs');
const crypto = require('crypto');

process.on('unhandledRejection', (reason, p) => {
    console.error('⚠️ എറർ (Unhandled Rejection):', reason);
});
process.on('uncaughtException', (err) => {
    console.error('⚠️ സിസ്റ്റം എറർ (Uncaught Exception):', err.message);
});

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Bypass-Tunnel-Reminder']
}));

const SCRIPT_URL = process.env.SCRIPT_URL || "https://script.google.com/macros/s/AKfycbzOz6QkJjxIq3crrv7MaAeu5YdxZpmoOMPV6r6nMj9Wow2cqEqlnB8nUu6iezQc6nSEhQ/exec";
const BOT_API_KEY = process.env.BOT_API_KEY || '';
// Keep the original startup/auth folder. Missing settings never crash startup.
if (!BOT_API_KEY) console.warn('Set BOT_API_KEY to the same private key as Apps Script; sends and backend lookups need it.');
function validKey(value) {
 const a=Buffer.from(String(value||'')),b=Buffer.from(BOT_API_KEY);
 return b.length>0&&a.length===b.length&&crypto.timingSafeEqual(a,b);
}
function authorizeSend(req,res,next) {
 if(!BOT_API_KEY)return res.status(503).json({error:'BOT_API_KEY is not configured'});
 if(!validKey(String(req.headers.authorization||'').replace(/^Bearer /,'')))return res.status(401).json({error:'Unauthorized'});
 next();
}
function authorizeQR(req,res,next) {
 if(!BOT_API_KEY)return res.status(503).send('Configure BOT_API_KEY in the hosting environment.');
 const header=String(req.headers.authorization||'');
 let allowed=header.startsWith('Bearer ')?validKey(header.slice(7)):false;
 if(header.startsWith('Basic ')){const pair=Buffer.from(header.slice(6),'base64').toString();const at=pair.indexOf(':');allowed=pair.slice(0,at)==='admin'&&validKey(pair.slice(at+1));}
 if(!allowed){res.setHeader('WWW-Authenticate','Basic realm="MUAAWINA QR"');return res.status(401).send('Admin authentication required');}
 next();
}
// Optional queue IDs: preserve the original send payloads, deduplicate backend retries.
function deliveryGuard(req,res,next) {
 const id=req.body.jobId;
 if(!id)return next();
 if(!/^[a-zA-Z0-9_-]{16,100}$/.test(String(id)))return res.status(400).json({error:'Invalid jobId'});
 if(botState!=='READY'||!sock)return res.status(503).json({error:'WhatsApp client is not ready yet.'});
 try {
  const directory=process.env.DELIVERY_JOBS_DIR||'muaawina_delivery_jobs';fs.mkdirSync(directory,{recursive:true});
  const file=directory+'/'+id+'.json';
  if(fs.existsSync(file)){const previous=JSON.parse(fs.readFileSync(file,'utf8'));return previous.state==='sent'?res.json({success:true,duplicate:true}):res.status(409).json({error:'Previous delivery needs manual review'});}
  fs.writeFileSync(file,JSON.stringify({state:'sending',at:Date.now()}),{flag:'wx'});
  const originalJson=res.json.bind(res);
  res.json=function(result){if(result&&result.success===true)fs.writeFileSync(file,JSON.stringify({state:'sent',at:Date.now()}));return originalJson(result);};
  next();
 }catch(error){return res.status(409).json({error:'Delivery tracking needs review'});}
}
app.get('/health',(req,res)=>res.json({ready:botState==='READY'}));

let sock;
let globalQrCode = null;
let botState = "STARTING";

// ==========================================
// 📱 വാട്സ്ആപ്പ് കണക്ഷൻ (BAILEYS - ഫയൽ സ്റ്റോറേജ്)
// ==========================================
async function startWhatsApp() {
    console.log('🏁 [SYSTEM] വാട്സ്ആപ്പ് കണക്ഷൻ ആരംഭിക്കുന്നു...');

    // വാട്സ്ആപ്പിന്റെ ഏറ്റവും പുതിയ വേർഷൻ എടുക്കുന്നു
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`🌐 [SYSTEM] WhatsApp Web Version: ${version.join('.')} (Latest: ${isLatest})`);

    // ഡാറ്റാബേസ് പ്രശ്നങ്ങൾ ഒഴിവാക്കാൻ ഫയൽ സിസ്റ്റത്തിലേക്ക് മാറുന്നു
    const { state, saveCreds } = await useMultiFileAuthState('baileys_auth_info');

    sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        browser: ["MUAAWINA Bot", "Safari", "3.0"],
        syncFullHistory: false,
        generateHighQualityLinkPreview: false,
        markOnlineOnConnect: true,
        keepAliveIntervalMs: 30000, // 👇 കണക്ഷൻ എപ്പോഴും ആക്ടീവ് ആക്കി നിർത്താൻ
        shouldSyncHistoryMessage: () => false,
        getMessage: async (key) => {
            return {
                conversation: ''
            };
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            botState = "AWAITING_QR_SCAN";
            globalQrCode = qr;
            console.log('📱 [WHATSAPP] പുതിയ QR കോഡ് റെഡിയാണ്!');
        }

        if (connection === 'close') {
            const statusCode = lastDisconnect.error?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

            console.log('❌ കണക്ഷൻ തടസ്സപ്പെട്ടു. കാരണം:', lastDisconnect.error?.message);

            // 👇 യഥാർത്ഥത്തിൽ ഫോണിൽ നിന്ന് ലോഗ് ഔട്ട് ചെയ്താൽ മാത്രം ഡാറ്റ ഡിലീറ്റ് ചെയ്യുക
            if (statusCode === DisconnectReason.loggedOut) {
                console.log('🗑️ ഫോണിൽ നിന്ന് ലോഗ് ഔട്ട് ചെയ്തു. പഴയ കേടായ ഡാറ്റ ഡിലീറ്റ് ചെയ്യുന്നു...');
                try { fs.rmSync('baileys_auth_info', { recursive: true, force: true }); } catch (e) { }
                botState = "STARTING";
                startWhatsApp();
            } else if (shouldReconnect) {
                botState = "DISCONNECTED";
                console.log('🔄 വീണ്ടും കണക്ട് ചെയ്യാൻ ശ്രമിക്കുന്നു...');
                setTimeout(startWhatsApp, 3000); // 3 സെക്കൻഡിനുള്ളിൽ വീണ്ടും കണക്ട് ആകും
            }
        } else if (connection === 'open') {
            console.log('✅ [WHATSAPP] ബോട്ട് പൂർണ്ണമായും സജ്ജമായി ലൈവ് ആയിക്കഴിഞ്ഞു!');
            botState = "READY";
            globalQrCode = null;
        }
    });

    sock.ev.on('messages.upsert', async m => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const remoteJid = msg.key.remoteJid;
        const userMessage = (msg.message.conversation || msg.message.extendedTextMessage?.text || "").toLowerCase().trim();

        if (userMessage === '.id' || userMessage === 'id') {
            await sock.sendMessage(remoteJid, { text: `ഈ ചാറ്റിന്റെ/ഗ്രൂപ്പിന്റെ ഐഡി ഇതാണ്:\n\n*${remoteJid}*` });
            return;
        }

        if (userMessage.startsWith('due') || userMessage.startsWith('balance') || userMessage.startsWith('കുടിശ്ശിക')) {
            try {
                let senderPhone = remoteJid.split('@')[0].slice(-10);
                const isLID = !['9', '8', '7', '6'].includes(senderPhone[0]);
                const words = userMessage.split(' ');
                let providedMid = words.length > 1 ? words[1].toUpperCase() : "";

                if (isLID && !providedMid) {
                    await sock.sendMessage(remoteJid, { text: "⚠️ നിങ്ങളുടെ ഫോൺ നമ്പർ വാട്സ്ആപ്പ് മറച്ചുവെച്ചിരിക്കുകയാണ്. വിവരങ്ങൾ അറിയാൻ *Due [നിങ്ങളുടെ MID]* എന്ന് ടൈപ്പ് ചെയ്യുക.\n\nഉദാഹരണം: *Due M105*" });
                    return;
                }

                const response = await axios.post(SCRIPT_URL, {
                    action: 'getMemberData',
                    botKey: BOT_API_KEY,
                    data: { phone: senderPhone, mid: providedMid }
                });

                const d = response.data;
                if (d.error) {
                    await sock.sendMessage(remoteJid, { text: `ക്ഷമിക്കണം, നിങ്ങളുടെ വിവരങ്ങൾ കണ്ടെത്താനായില്ല. (നമ്പർ: ${senderPhone})\nദയവായി *Due [MID]* എന്ന് അയച്ചു നോക്കുക.` });
                } else {
                    let pendingCount = d.history ? d.history.filter(h => h.status === 'Pending').length : 0;
                    let balance = pendingCount * (d.fee || 50);
                    let replyMsg = `السلام عليكم ${d.name},\n\n💰 ആകെ കുടിശ്ശിക: ₹${balance}\n📅 ബാക്കിയുള്ള മാസങ്ങൾ: ${pendingCount}\n\nകൂടുതൽ വിവരങ്ങൾക്ക്:\nhttps://muaawina.github.io/muaawina.com/`;
                    await sock.sendMessage(remoteJid, { text: replyMsg, linkPreview: false });
                }
            } catch (error) {
                console.error("Chatbot Error:", error.message);
            }
        }
    });
}

cron.schedule('*/1 * * * *', async () => {
    console.log(`⏰ [CRON] Reminder check triggered. Bot State: ${botState}`);
    if (botState !== "READY" || !sock) {
        console.log("⏰ [CRON] Skipped: Bot is not ready.");
        return;
    }
    try {
        const response = await axios.post(SCRIPT_URL, { action: 'checkAndGetDefaulters', botKey: BOT_API_KEY });
        console.log("⏰ [CRON] Check Result:", JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error("❌ [CRON ERROR] Failed to fetch checkAndGetDefaulters:", error.message);
    }
});

app.get('/', authorizeQR, (req, res) => {
    if (globalQrCode) {
        const code = qrImage.imageSync(globalQrCode, { type: 'png' });
        const base64Qr = code.toString('base64');
        res.send(`
            <head><meta http-equiv="refresh" content="5"></head>
            <div style="text-align:center; margin-top:50px; font-family:Arial, sans-serif;">
                <h2 style="color: #075E54;">MUAAWINA WhatsApp Bot (Baileys)</h2>
                <p>സിസ്റ്റം അവസ്ഥ: <b>${botState}</b></p>
                <div style="margin: 30px 0;">
                    <img src="data:image/png;base64,${base64Qr}" alt="QR Code" style="border: 4px solid #075E54; padding: 10px; border-radius: 10px; width:300px; height:300px;"/>
                </div>
            </div>
        `);
    } else {
        res.send(`
            <div style="text-align:center; margin-top:50px; font-family:Arial, sans-serif;">
                <h2 style="color: #075E54;">🚀 MUAAWINA WhatsApp Bot</h2>
                <p>സിസ്റ്റം അവസ്ഥ: <b style="color: green;">${botState}</b></p>
                <p>ബോട്ട് വിജയകരമായി ലൈവ് ആയി പ്രവർത്തിക്കുന്നു!</p>
            </div>
        `);
    }
});

app.post('/send-message', authorizeSend, deliveryGuard, async (req, res) => {
    console.log("\n📡 [API REQUEST] /send-message...");
    if (botState !== "READY" || !sock) {
        return res.status(500).json({ error: "WhatsApp client is not ready yet." });
    }

    const { phone, message, isGroup } = req.body;

    try {
        let jid;
        if (isGroup) {
            jid = `${String(phone).replace(/@g\.us$/, '')}@g.us`;
        } else {
            const cleanPh = String(phone).replace(/\D/g, '').slice(-10);
            jid = `91${cleanPh}@s.whatsapp.net`;
        }

        // 👇 ഇവിടെയാണ് നമ്മൾ ഗ്യാപ്പ് നൽകുന്നത് (ഉദാഹരണത്തിന് 5 സെക്കൻഡ്)
        // ഇത് ഓരോ മെസ്സേജ് അയക്കുന്നതിന് മുൻപും 5 സെക്കൻഡ് കാത്തിരിക്കും
        await new Promise(resolve => setTimeout(resolve, 15000));

        await sock.sendMessage(jid, { text: message, linkPreview: false });
        console.log(`✅ [API] മെസ്സേജ് വിജയകരമായി അയച്ചു!`);
        res.json({ success: true });

    } catch (error) {
        console.error("❌ [API ERROR]:", error.message);
        res.status(500).json({ error: error.message });
    }
});

app.post('/send-media', authorizeSend, deliveryGuard, async (req, res) => {
    console.log("\n📡 [API REQUEST] /send-media...");
    if (botState !== "READY" || !sock) {
        return res.status(500).json({ error: "WhatsApp client is not ready." });
    }

    // mimeType കൂടി ഇവിടെ സ്വീകരിക്കുന്നു (അഡ്മിൻ പാനലിൽ നിന്ന് അയക്കുമ്പോൾ അത് കൂടി അയക്കുക)
    const { phone, base64, mediaUrl, caption, fileType, mimeType } = req.body;

    try {
        const jid = `91${String(phone).replace(/\D/g, '').slice(-10)}@s.whatsapp.net`;
        let messagePayload = { caption: caption || "" };

        // 1. ഫയൽ ബേസ്64 ആണെങ്കിൽ
        if (base64) {
            const data = base64.includes(',') ? base64.split(',')[1] : base64;
            const buffer = Buffer.from(data, 'base64');

            if (fileType === 'video') {
                messagePayload.video = buffer;
                messagePayload.mimetype = mimeType || 'video/mp4';
            }
            else if (fileType === 'document') {
                messagePayload.document = buffer;
                messagePayload.mimetype = mimeType || 'application/pdf'; // PDF ആണെങ്കിൽ ഇത് വർക്ക് ചെയ്യും
            }
            else {
                messagePayload.image = buffer;
            }
        }
        // 2. ഫയൽ ലിങ്ക് (URL) ആണെങ്കിൽ
        else if (mediaUrl) {
            if (fileType === 'video') {
                messagePayload.video = { url: mediaUrl };
                messagePayload.mimetype = mimeType || 'video/mp4';
            }
            else if (fileType === 'document') {
                messagePayload.document = { url: mediaUrl };
                messagePayload.mimetype = mimeType || 'application/pdf';
            }
            else {
                messagePayload.image = { url: mediaUrl };
            }
        } else {
            return res.status(400).json({ error: "No file provided" });
        }

        await sock.sendMessage(jid, messagePayload);

        console.log(`✅ [API] ഫയൽ വിജയകരമായി അയച്ചു! (${fileType || 'image'})`);
        res.json({ success: true });

    } catch (error) {
        console.error("❌ [API ERROR]:", error.message);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 API സർവർ പോർട്ട് ${PORT} -ൽ വിജയകരമായി ഓടുന്നു`);
    startWhatsApp(); // സെർവർ തുടങ്ങിയ ശേഷം വാട്സ്ആപ്പ് തുടങ്ങുന്നു
});