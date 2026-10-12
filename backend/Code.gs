/**
 * MUAAWINA Warisankhya Tracker - High-Speed Stable Backend
 */
// നിങ്ങളുടെ ഗൂഗിൾ ഷീറ്റ് ഐഡി ഈ കോട്ട്സിനുള്ളിൽ നിർബന്ധമായും നൽകുക
const SPREADSHEET_ID = "1HEEeEqkKVMa8aQsGgIyQXVTNybSVxAW_7KRgLJAEbp4";

function getSS() {
  const id=PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if(!id)throw new Error('SPREADSHEET_ID is required');return SpreadsheetApp.openById(id);
}

function onOpen() {
  SpreadsheetApp.getUi().createMenu('🚀 Tracker Menu')
    .addItem('1. സിസ്റ്റം തയ്യാറാക്കുക (Setup)', 'setupTracker')
    .addItem('2. ⚙️ സെറ്റിംഗ്സ് മാറ്റുക (Settings)', 'updateSettingsViaMenu')
    .addToUi();
}



function doGet() {
  return ContentService.createTextOutput(JSON.stringify({service:'MUAAWINA API',version:2})).setMimeType(ContentService.MimeType.JSON);
}

function getAppSettings() {
  const props=PropertiesService.getScriptProperties();const legacy=PropertiesService.getDocumentProperties();
  const setting=(key,fallback)=>props.getProperty(key)||(legacy&&legacy.getProperty(key))||fallback;
  const config={MONTHLY_FEE:setting('MONTHLY_FEE','50'),START_DATE:setting('START_DATE','01/01/2021'),CAMPAIGN_ACTIVE:false,UPI_ID:'',ADMIN_WHATSAPP:'',ANNOUNCEMENT:'',securityVersion:2};
  const sheet=getSS().getSheetByName('Settings');
  if(sheet)sheet.getDataRange().getDisplayValues().slice(1).forEach(r=>{
    const key=String(r[0]).trim().toUpperCase(),value=String(r[1]||'').trim();
    if(['MONTHLY_FEE','START_DATE','UPI_ID','ADMIN_WHATSAPP','CURRENT_DATE','ANNOUNCEMENT','PAYMENT_NUMBER'].includes(key))config[key]=value;
    if(key==='GPAY_NUMBER')config.PAYMENT_NUMBER=value;
  });
  return config;
}

function updateSettingsViaMenu() {
  const ui = SpreadsheetApp.getUi();
  const props = PropertiesService.getScriptProperties();
  let res;




  let curPass = props.getProperty('ADMIN_PASS') || "1234";
  res = ui.prompt("⚙️ സെറ്റിംഗ്സ് 1/3: അഡ്മിൻ പാസ്‌വേഡ്", `നിലവിലെ പാസ്‌വേഡ്: ${curPass}\nമാറ്റാനുണ്ടെങ്കിൽ പുതിയ പാസ്‌വേഡ് നൽകുക:`, ui.ButtonSet.OK_CANCEL);
  if (res.getSelectedButton() === ui.Button.OK && res.getResponseText().trim() !== "") {
    props.setProperty('ADMIN_PASS', res.getResponseText().trim());
  }




  let curFee = props.getProperty('MONTHLY_FEE') || "50";
  res = ui.prompt("⚙️ സെറ്റിംഗ്സ് 2/3: മാസവരിസംഖ്യ", `നിലവിലെ വരിസംഖ്യ: ${curFee}\nമാറ്റാനുണ്ടെങ്കിൽ പുതിയ തുക നൽകുക:`, ui.ButtonSet.OK_CANCEL);
  if (res.getSelectedButton() === ui.Button.OK && res.getResponseText().trim() !== "") {
    props.setProperty('MONTHLY_FEE', res.getResponseText().trim());
  }




  let curDate = props.getProperty('START_DATE') || "01/01/2021";
  res = ui.prompt("⚙️ സെറ്റിംഗ്സ് 3/3: തുടങ്ങിയ മാസം", `നിലവിലെ തീയതി: ${curDate}\nമാറ്റാനുണ്ടെങ്കിൽ പുതിയ തീയതി നൽകുക (മാതൃക: 01/01/2024):`, ui.ButtonSet.OK_CANCEL);
  if (res.getSelectedButton() === ui.Button.OK && res.getResponseText().trim() !== "") {
    props.setProperty('START_DATE', res.getResponseText().trim());
  }




  ui.alert("✅ പൂർത്തിയായി!", "സെറ്റിംഗ്സ് സേവ് ചെയ്തു. (ശ്രദ്ധിക്കുക: UPI ഉം WhatsApp ഉം ഗൂഗിൾ ഷീറ്റിലെ 'Settings' ഷീറ്റിലാണ് മാറ്റേണ്ടത്)", ui.ButtonSet.OK);
}




function setupTracker() {
  const ss = getSS();
  let db = ss.getSheetByName('Member_Database');
  if (!db) db = ss.insertSheet('Member_Database');
  db.getRange("A1:H1").setValues([['Member ID', 'Name', 'Phone', 'Batch', 'Join Date', 'Status', 'Email', 'Monthly Fee']]).setBackground('#1e3a8a').setFontColor('white').setFontWeight('bold');

  let q = ss.getSheetByName('Approval_Queue');
  if (!q) q = ss.insertSheet('Approval_Queue');
  q.getRange("A1:G1").setValues([['Timestamp', 'Member ID', 'Name', 'Phone', 'Year', 'Month', 'Status']]).setBackground('#b91c1c').setFontColor('white').setFontWeight('bold');




  // ഗൂഗിൾ ഷീറ്റിൽ Settings ഷീറ്റ് തയ്യാറാക്കുന്നു
  let settings = ss.getSheetByName('Settings');
  if (!settings) {
    settings = ss.insertSheet('Settings');
    settings.getRange("A1:B1").setValues([['Key', 'Value']]).setBackground('#1e3a8a').setFontColor('white').setFontWeight('bold');
    settings.getRange("A2:B3").setValues([
      ['UPI_ID', 'muaawina@icici'],
      ['ADMIN_WHATSAPP', '919876543210']
    ]);
  }




  // --- പുതിയ ലോഗിൻ ട്രാക്കിംഗ് ഷീറ്റ് ഉണ്ടാക്കുന്നു ---
  let logs = ss.getSheetByName('Login_Logs');
  if (!logs) {
    logs = ss.insertSheet('Login_Logs');
    logs.getRange("A1:D1").setValues([['Phone', 'Name', 'Last Login', 'Total Logins']]).setBackground('#10b981').setFontColor('white').setFontWeight('bold');
  }

  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty('START_DATE')) {
    if(!props.getProperty('ADMIN_PASS'))props.setProperty('ADMIN_PASS',Utilities.getUuid().replace(/-/g,''));
    props.setProperty('MONTHLY_FEE', '50');
    props.setProperty('START_DATE', '01/01/2021');
  }




  SpreadsheetApp.getUi().alert('✅ സിസ്റ്റം തയ്യാറായി! ഗൂഗിൾ ഷീറ്റിലെ "Settings" ഷീറ്റിൽ പോയി UPI, WhatsApp എന്നിവ മാറ്റാം.');
}




function cleanPhone(p) {
  if (!p) return "";
  return String(p).replace(/\D/g, '').slice(-10);
}




function parseHeaderDate(header, defaultYear) {
  if (!header) return null;
  const str = String(header).trim().toLowerCase();
  const monthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  let mIdx = -1;
  for (let i = 0; i < 12; i++) {
    if (str.startsWith(monthNames[i])) { mIdx = i; break; }
  }
  if (mIdx === -1) return null;




  let year = defaultYear;
  let yearMatch = str.match(/\d{2,4}$/);
  if (yearMatch) {
    let y = parseInt(yearMatch[0]);
    year = (y < 100) ? 2000 + y : y;
  }
  return { monthIdx: mIdx, year: String(year), monthName: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][mIdx] };
}




function parseSafeDate(dateVal, fallbackDateStr) {
  if (dateVal instanceof Date) return dateVal;
  if (dateVal) {
    let d = new Date(dateVal);
    if (!isNaN(d.getTime())) return d;
  }
  if (fallbackDateStr) {
    let parts = fallbackDateStr.split('/');
    if (parts.length === 3) {
      let fDate = new Date(parts[2], parts[1] - 1, parts[0]);
      if (!isNaN(fDate.getTime())) return fDate;
    }
  }
  return new Date(2020, 0, 1);
}




function checkPendingApprovals() {
  try {
    const ss = getSS();
    const qSheet = ss.getSheetByName('Approval_Queue');
    if (!qSheet || qSheet.getLastRow() < 2) return false;
    const data = qSheet.getRange(2, 7, qSheet.getLastRow() - 1, 1).getValues();
    return data.some(row => row[0] === 'Processing');
  } catch (e) { return false; }
}




// ഡാറ്റാബേസിൽ നിന്ന് ഫോൺ നമ്പറും MID-യും പരിശോധിക്കുന്ന ഫംഗ്ഷൻ
function getMemberDataSnapshot(userPhone, inputMid, lookupOnly = false, recordLogin = false, deferHighlights = false) {
  try {
    const ss = getSS();
    const config = getAppSettings();
    const globalFee = Number(config.MONTHLY_FEE) || 50;
    const globalStartDateStr = config.START_DATE;

    const dbSheet = ss.getSheetByName('Member_Database');
    const qSheet = ss.getSheetByName('Approval_Queue');
    const dbData = dbSheet.getDataRange().getValues();
    const qData = qSheet ? qSheet.getDataRange().getValues() : [];

    // ഫോൺ നമ്പർ ശുദ്ധീകരിക്കുന്നു (അവസാന 10 അക്കം മാത്രം)
    const searchPhone = String(userPhone).replace(/\D/g, '').slice(-10);
    // inputMid ഇല്ലെങ്കിൽ (ചാറ്റ്ബോട്ട് വഴിയാണെങ്കിൽ) അത് കാലിയായി എടുക്കുന്നു
    const searchMid = inputMid ? String(inputMid).trim().toUpperCase() : "";

    let memberDataRow = null;
    let foundPhone = false;

    // ഷീറ്റിലെ ഓരോ വരിയും പരിശോധിക്കുന്നു
    for (let i = 1; i < dbData.length; i++) {
      let sheetMid = String(dbData[i][0]).trim().toUpperCase(); // Column A (Member ID)
      let sheetPhone = String(dbData[i][2]).replace(/\D/g, '').slice(-10); // Column C (Phone)
      let sheetPasswordMid = String(dbData[i][16]).trim().toUpperCase(); // Column Q (Password/MID)

      // 1. മെമ്പർ MID നൽകിയിട്ടുണ്ടെങ്കിൽ (ഉദാ: Due M101), അത് വെച്ച് നേരിട്ട് തിരയുന്നു
      if (searchMid !== "") {
        if ((lookupOnly || sheetPhone === searchPhone) && (sheetMid === searchMid || sheetPasswordMid === searchMid)) {
          memberDataRow = dbData[i];
          break; // കണ്ടെത്തിയാൽ ലൂപ്പ് നിർത്തുന്നു
        }
      }
      // 2. മെമ്പർ MID നൽകിയിട്ടില്ലെങ്കിൽ മാത്രം ഫോൺ നമ്പർ വെച്ച് തിരയുന്നു
      else if (sheetPhone === searchPhone) {
        memberDataRow = dbData[i];
        break;
      }
    }

    // വിവരങ്ങൾ ലഭിച്ചില്ലെങ്കിൽ നൽകുന്ന മറുപടി
    if (!memberDataRow) {
      if (searchMid !== "") {
        return { error: "ക്ഷമിക്കണം, " + searchMid + " എന്ന MID ലിസ്റ്റിൽ കണ്ടെത്താനായില്ല." };
      } else {
        return { error: "നിങ്ങളുടെ ഫോൺ നമ്പർ (" + searchPhone + ") ലിസ്റ്റിൽ കണ്ടെത്താനായില്ല. വിവരങ്ങൾ അറിയാൻ 'Due [MID]' എന്ന് അയച്ചു നോക്കുക." };
      }
    }

    const memberId = String(memberDataRow[0]).trim();
    const mFee = Number(memberDataRow[7]) || globalFee;

    // --- ജോയിനിങ് ഡേറ്റ് ലോജിക് (താങ്കളുടെ ഒറിജിനൽ) ---
    const mJoinDate = parseSafeDate(memberDataRow[4], globalStartDateStr);
    const joinLimit = new Date(mJoinDate.getFullYear(), mJoinDate.getMonth(), 1);

    if (recordLogin) {
    // --- ലോഗിൻ ലോഗ് അപ്ഡേറ്റ് (താങ്കളുടെ ഒറിജിനൽ) ---
    try {
      let logSheet = ss.getSheetByName('Login_Logs');
      if (logSheet) {
        let logData = logSheet.getDataRange().getValues();
        let found = false;
        for (let j = 1; j < logData.length; j++) {
          if (String(logData[j][0]).trim().slice(-10) === searchPhone) {
            logSheet.getRange(j + 1, 3).setValue(new Date());
            logSheet.getRange(j + 1, 4).setValue(Number(logData[j][3] || 0) + 1);
            found = true; break;
          }
        }
        if (!found) logSheet.appendRow([searchPhone, memberDataRow[1], new Date(), 1]);
      }
    } catch (err) { }

    }
    // --- പേയ്‌മെന്റ് ഹിസ്റ്ററി വിവരങ്ങൾ (താങ്കളുടെ ഒറിജിനൽ) ---
    let processingMonths = [];
    if (qData.length > 1) {
      for (let k = 1; k < qData.length; k++) {
        if (String(qData[k][1]).trim() === memberId && qData[k][6] === "Processing") {
          processingMonths.push(qData[k][5] + "-" + qData[k][4]);
        }
      }
    }

    let history = [];
    let totalPaid = 0;
    const trackingSheets = ss.getSheets().filter(s => /^\d{4}$/.test(s.getName()));

    trackingSheets.forEach(sheet => {
      const tData = sheet.getDataRange().getValues();
      const headers = tData[0];
      const mRow = tData.find(r => String(r[0]).trim() === memberId);

      if (mRow) {
        for (let c = 2; c < headers.length; c++) {
          let p = parseHeaderDate(headers[c], sheet.getName());
          if (p) {
            let currentMonthDate = new Date(parseInt(p.year), p.monthIdx, 1);
            if (currentMonthDate >= joinLimit) {
              let val = mRow[c];
              let isPaid = (val === true || String(val).toUpperCase() === "TRUE" || Number(val) > 0);
              const paymentRows=qData.slice(1).filter(r=>String(r[1])===memberId&&String(r[4])===String(p.year)&&String(r[5])===p.monthName);
              const paymentRecord=paymentRows.find(r=>r[6]==='Approved'||r[6]==='Approved (Offline)');
              const paidAmount=paymentRecord&&Number(paymentRecord[8])>0?Number(paymentRecord[8]):mFee;
              if (isPaid) totalPaid += paidAmount;
              history.push({
                year: p.year,
                month: p.monthName,
                amount: paidAmount,
                paidAt: paymentRecord&&paymentRecord[9] instanceof Date?paymentRecord[9].toISOString():null,
                receiptId: paymentRecord&&paymentRecord[7]||null,
                isRejected: !isPaid&&paymentRows.some(r=>r[6]==='Rejected'),
                status: isPaid ? "Paid" : (processingMonths.includes(p.monthName + "-" + p.year) ? "Processing" : "Pending")
              });
            }
          }
        }
      }
    });

    // 👇 പുതിയതായി ചേർത്തത്: കുടിശ്ശിക തുക കണക്കാക്കാൻ 👇
    let today=config.CURRENT_DATE?new Date(config.CURRENT_DATE):new Date();
    if(isNaN(today.getTime()))today=new Date();
    const currentKey=today.getFullYear()*12+today.getMonth();
    history.forEach(h=>{const key=Number(h.year)*12+['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].indexOf(h.month);if(key>currentKey&&h.status==='Pending')h.status='Upcoming';});
    let pendingCount = history.filter(h => Number(h.year)*12+['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].indexOf(h.month)<=currentKey&&['Pending','Processing'].includes(h.status)).length;
    let currentBalance = pendingCount * mFee;
    // 👆 ------------------------------------------- 👆

    const totalMembersCount = dbData.length - 1;

    // --- ഹൈലൈറ്റുകൾ (താങ്കളുടെ ഒറിജിനൽ) ---
    const highlightsSheet = deferHighlights ? null : ss.getSheetByName('Highlights');
    const highlightsData = highlightsSheet ? highlightsSheet.getDataRange().getValues().slice(1) : [];
    const highlights = highlightsData.map(h => ({
      heading: h[0], url: h[1], desc: h[2]
    })).filter(h => h.url !== "");

    let campaignSubmitted = false; let campaignData = null;
    // --- ആപ്പിലേക്ക് അയക്കുന്ന ഫൈനൽ റിസൾട്ട് (ഒരു ഡാറ്റയും വിട്ടുപോയിട്ടില്ല) ---
    return {
      trackingReady: !!memberDataRow[4] && Number(memberDataRow[7])>0,
      id: memberDataRow[0],
      name: memberDataRow[1],
      phone: memberDataRow[2],
      totalPaid: totalPaid,
      balance: currentBalance, // 👈 ഈ വരി പുതിയതായി ഇവിടെ ചേർത്തു
      history: history,
      config: config,
      fee: mFee,
      joinedDate: memberDataRow[4],
      email: memberDataRow[6],
      blood: memberDataRow[8],
      job: memberDataRow[9],
      company: memberDataRow[10],
      location: memberDataRow[11],
      photoUrl: memberDataRow[12],
      dob: memberDataRow[13],
      place: memberDataRow[14],
      address: memberDataRow[15],

      totalMembers: totalMembersCount,
      highlights: highlights,
      campaignSubmitted: campaignSubmitted,
      campaignData: campaignData
    };

  } catch (e) { return { error: "Server Error: " + e.toString() }; }
}


// === 1. സിംഗിൾ പേയ്‌മെന്റ് റിക്വസ്റ്റ് (ഫോൺ നമ്പർ സുരക്ഷിതമാക്കിയത്) ===
function submitSinglePaymentRequest(memberId,name,phone,year,month) {return submitPaymentRequests(memberId,[{year:year,month:month}],false);}

function submitBulkPaymentRequest(memberId,name,phone,requests) {return submitPaymentRequests(memberId,requests,true);}

function getPhoneById(memberId) {
  try {
    const ss = getSS();
    const sheet = ss.getSheetByName('Member_Database');
    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    // 'Phone' എന്ന് പേരുള്ള കോളം ഷീറ്റിൽ എവിടെയാണെന്ന് കണ്ടുപിടിക്കുന്നു (കോളങ്ങൾ മാറിയാലും പ്രശ്നം വരില്ല)
    let phoneColIdx = headers.findIndex(h => String(h).trim().toLowerCase() === 'phone');
    if (phoneColIdx === -1) phoneColIdx = 2; // കണ്ടെത്തിയില്ലെങ്കിൽ ഡിഫോൾട്ടായി കോളം C (Index 2) എടുക്കും

    const row = data.find(r => String(r[0]).trim().toUpperCase() === String(memberId).trim().toUpperCase());
    if (row) {
      return String(row[phoneColIdx]).trim();
    }
  } catch (e) {
    Logger.log("Error in getPhoneById: " + e.toString());
  }
  return "";
}


function processAdminBulkAction(actionType) {
  try {
    const ss = getSS();
    const qSheet = ss.getSheetByName('Approval_Queue');
    if (!qSheet || qSheet.getLastRow() < 2) return { success: true };




    const trackingSheets = ss.getSheets().filter(s => /^\d{4}$/.test(s.getName()) || s.getName().toLowerCase().includes('payment'));
    const data = qSheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][6] === 'Processing') {
        qSheet.getRange(i + 1, 7).setValue(actionType);

        if (actionType === 'Approved') {
          const qYear = String(data[i][4]);
          const qMonth = String(data[i][5]);
          const memberId = String(data[i][1]).trim();

          for (let sheet of trackingSheets) {
            let sName = sheet.getName();
            let checkYear = sName === 'Payment_Tracker' ? new Date().getFullYear().toString() : sName;
            if (checkYear !== qYear) continue;




            const sheetData = sheet.getDataRange().getValues();
            if (sheetData.length < 1) continue;

            const rIdx = sheetData.findIndex(r => String(r[0]).trim() === memberId);
            if (rIdx === -1) continue;

            const mStr = qMonth.toLowerCase().substring(0, 3);
            const cIdx = sheetData[0].findIndex(c => String(c).trim().toLowerCase().startsWith(mStr));

            if (cIdx > -1) {
              sheet.getRange(rIdx + 1, cIdx + 1).setValue(true);
            }
          }
        }
      }
    }
    return { success: true };
  } catch (e) { return { error: e.message }; }
}




// IN-MEMORY FAST ADMIN DATA
function getAdminDataSnapshot(deferHighlights=false) {
  try {
    const ss = getSS();
    const config = getAppSettings();
    const globalFee = Number(config.MONTHLY_FEE) || 50;
    const globalStartDate = parseSafeDate(config.START_DATE, new Date(2020, 0, 1));

    let today = new Date();
    let globalAppYear = today.getFullYear();
    let globalAppMonth = today.getMonth();
    if (config.CURRENT_DATE && config.CURRENT_DATE.trim() !== "") {
      let sDate = new Date(config.CURRENT_DATE);
      if (!isNaN(sDate.getTime())) {
        globalAppYear = sDate.getFullYear();
        globalAppMonth = sDate.getMonth();
      }
    }




    // അഡ്മിൻ പാനലിലേക്ക് ലോഗിൻ വിവരങ്ങൾ ശേഖരിക്കുന്നു
    let loginDataMap = {};
    try {
      let logSheet = ss.getSheetByName('Login_Logs');
      if (logSheet) {
        let logData = logSheet.getDataRange().getValues();
        for (let i = 1; i < logData.length; i++) {
          loginDataMap[String(logData[i][0]).trim()] = {
            lastLogin: logData[i][2],
            count: Number(logData[i][3]) || 0
          };
        }
      }
    } catch (e) { }




    const allSheets = ss.getSheets();
    let dbData = null, qData = null, trackingSheetsData = [];




    allSheets.forEach(sheet => {
      let name = sheet.getName();
      if (name === 'Member_Database') {
        dbData = sheet.getDataRange().getValues();
      } else if (name === 'Approval_Queue') {
        qData = sheet.getDataRange().getValues();
      } else if (/^\d{4}$/.test(name) || name.toLowerCase().includes('payment')) {
        let yearVal = name === 'Payment_Tracker' ? new Date().getFullYear().toString() : name;
        trackingSheetsData.push({ year: yearVal, data: sheet.getDataRange().getValues() });
      }
    });

    if (!dbData) return { error: "Member_Database ഷീറ്റ് കാണുന്നില്ല. സിസ്റ്റം ആദ്യം സെറ്റപ്പ് ചെയ്യുക." };

    let membersObj = {};
    for (let i = 1; i < dbData.length; i++) {
      let id = String(dbData[i][0]).trim();
      if (id) {
        let mFee = Number(dbData[i][7]) || globalFee;
        let mJoinDate = parseSafeDate(dbData[i][4], config.START_DATE);
        membersObj[id] = {
          trackingReady: !!dbData[i][4] && Number(dbData[i][7])>0,
          name: dbData[i][1] || 'Unknown',
          phone: cleanPhone(dbData[i][2]),
          batch: dbData[i][3] || 'All',
          fee: mFee,
          joinLimit: new Date(mJoinDate.getFullYear(), mJoinDate.getMonth(), 1),
          paid: 0,
          balance: 0,
          pending: [],
          upcoming: [],
          advance: 0,
          email: dbData[i][6],
          blood: dbData[i][8],
          job: dbData[i][9],
          company: dbData[i][10],
          location: dbData[i][11],
          dob: dbData[i][13],
          place: dbData[i][14],
          address: dbData[i][15],
          appDownloaded: dbData[i][17] // Column R
        };
      }
    }




    const monthDisplay = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];




    trackingSheetsData.forEach(sheetObj => {
      const tData = sheetObj.data;
      if (tData.length < 1) return;

      const headers = tData[0];
      for (let r = 1; r < tData.length; r++) {
        let mId = String(tData[r][0]).trim();
        if (!membersObj[mId] || !membersObj[mId].trackingReady) continue;




        for (let c = 2; c < headers.length; c++) {
          let parsed = parseHeaderDate(headers[c], parseInt(sheetObj.year));
          if (!parsed) continue;




          let currentMonthDate = new Date(parseInt(parsed.year), parsed.monthIdx, 1);
          if (currentMonthDate >= membersObj[mId].joinLimit) {
            let val = tData[r][c];
            let isPaid = (val === true || String(val).toUpperCase() === "TRUE" || Number(val) > 0);

            let parsedYear = parseInt(parsed.year);
            let isFuture = parsedYear > globalAppYear || (parsedYear === globalAppYear && parsed.monthIdx > globalAppMonth);

            if (isPaid) {
              const payment=qData.slice(1).find(r=>String(r[1])===mId&&String(r[4])===parsed.year&&String(r[5])===monthDisplay[parsed.monthIdx]&&['Approved','Approved (Offline)'].includes(r[6]));
              const actual=Number(payment&&payment[8])||membersObj[mId].fee;
              membersObj[mId].paid += actual;
              if (isFuture) {
                membersObj[mId].advance += actual;
              }
            } else {
              if (!isFuture) {
                membersObj[mId].balance += membersObj[mId].fee;
                membersObj[mId].pending.push(`${monthDisplay[parsed.monthIdx]} ${parsed.year}`);
              } else {
                membersObj[mId].upcoming.push(`${monthDisplay[parsed.monthIdx]} ${parsed.year}`);
              }
            }
          }
        }
      }
    });




    let adminMembers = [];
    let grandTotal = 0, grandPending = 0;

    for (let id in membersObj) {
      grandTotal += membersObj[id].paid;
      grandPending += membersObj[id].balance;

      // ലോഗിൻ ഡാറ്റ ഇതിലേക്ക് ആഡ് ചെയ്യുന്നു
      let searchPh = String(membersObj[id].phone).trim();
      let logInfo = loginDataMap[searchPh] || { lastLogin: "ലോഗിൻ ചെയ്തിട്ടില്ല", count: 0 };
      let lastLogStr = (logInfo.lastLogin instanceof Date) ? Utilities.formatDate(logInfo.lastLogin, Session.getScriptTimeZone(), "dd MMM yyyy, hh:mm a") : logInfo.lastLogin;




      adminMembers.push({
        trackingReady: membersObj[id].trackingReady,
        id: id,
        name: membersObj[id].name,
        phone: membersObj[id].phone,
        batch: membersObj[id].batch,
        totalPaid: membersObj[id].paid,
        balance: membersObj[id].balance,
        pendingList: membersObj[id].pending,
        upcomingList: membersObj[id].upcoming,
        advance: membersObj[id].advance,
        loginCount: logInfo.count,     // പുതിയത്
        lastLogin: lastLogStr,         // പുതിയത്
        email: membersObj[id].email,
        blood: membersObj[id].blood,
        job: membersObj[id].job,
        company: membersObj[id].company,
        location: membersObj[id].location,
        dob: membersObj[id].dob,
        place: membersObj[id].place,
        address: membersObj[id].address,
        appDownloaded: membersObj[id].appDownloaded
      });
    }




    let grouped = {};
    if (qData && qData.length > 1) {
      for (let i = 1; i < qData.length; i++) {
        let status = String(qData[i][6]).trim();
        if (status === "Processing" || status === "Approved" || status === "Approved (Offline)") {
          let reqId = String(qData[i][1]).trim();
          let ts = qData[i][0] instanceof Date ? qData[i][0].getTime() : 0;
          // ഒരേ മെമ്പർ 5 സെക്കൻഡിനുള്ളിൽ ചെയ്തവയെ ഒരൊറ്റ ഗ്രൂപ്പായി കാണുന്നു (Bulk)
          let groupKey = status + "_" + reqId + "_" + Math.floor(ts / 5000);

          if (!grouped[groupKey]) {
            let dtObj = qData[i][0];
            let dateStr = (dtObj instanceof Date) ? Utilities.formatDate(dtObj, Session.getScriptTimeZone(), "dd MMM, hh:mm a") : "N/A";
            grouped[groupKey] = {
              date: dateStr,
              memberId: reqId,
              name: qData[i][2],
              batch: membersObj[reqId] ? membersObj[reqId].batch : '...',
              status: status,
              rows: [], // [[rowIdx, year, month]]
              displayMonth: ""
            };
          }
          grouped[groupKey].rows.push([qData[i][7], qData[i][4], qData[i][5]]);
          grouped[groupKey].amount=(grouped[groupKey].amount||0)+(Number(qData[i][8])||((membersObj[reqId]&&membersObj[reqId].fee)||globalFee));
        }
      }
    }

    let approvals = [];
    for (let k in grouped) {
      let g = grouped[k];
      // മാസങ്ങൾ ഒന്നിച്ച് കാണിക്കുന്നു (ഉദാ: Jan, Feb, Mar 2026)
      let monthSet = g.rows.map(r => r[2]);
      let yearSet = [...new Set(g.rows.map(r => r[1]))];
      g.month = monthSet.join(", ");
      g.year = yearSet.join("/");

      // ഒരു റോ മാത്രം ആണെങ്കിൽ പഴയത് പോലെ തന്നെ അയക്കുന്നു
      if (g.rows.length === 1) {
        g.rowIdx = g.rows[0][0];
        g.year = g.rows[0][1];
        g.month = g.rows[0][2];
      } else {
        // ബൾക്ക് ആണെങ്കിൽ എല്ലാ വിവരങ്ങളും അയക്കുന്നു
        g.isBulk = true;
      }
      approvals.push(g);
    }


    let campaigns = [];
    return { totalCollected: grandTotal, totalPending: grandPending, members: adminMembers, approvals: approvals, config: config, highlights: deferHighlights?[]:getHighlights(), campaigns: campaigns };
  } catch (e) {
    return { error: "അഡ്മിൻ ഡാറ്റ ലഭ്യമാക്കുന്നതിൽ പിഴവ്: " + e.message };
  }
}

// ഹൈലൈറ്റുകൾ ലിസ്റ്റ് ചെയ്യാൻ
function getHighlights() {
  try {
    const ss = getSS();
    const highlightsSheet = ss.getSheetByName('Highlights');
    if (!highlightsSheet) return [];
    const highlightsData = highlightsSheet.getDataRange().getValues().slice(1);
    return highlightsData.map((h, index) => ({
      version:sha256(JSON.stringify(highlightsData)),
      index: index, // 0-based data index
      heading: h[0] ? String(h[0]).trim() : "",
      url: h[1] ? String(h[1]).trim() : "",
      desc: h[2] ? String(h[2]).trim() : ""
    })).filter(h => h.url !== "");
  } catch (e) {
    return [];
  }
}

// അഡ്മിൻ പാനലിൽ നിന്നും പോസ്റ്റർ ഫോട്ടോ ഡ്രൈവിലേക്ക് അപ്‌ലോഡ് ചെയ്യാൻ
function uploadPosterPhoto(base64Data, mimeType, fileName) {
  try {
    validateImageUpload(base64Data,mimeType);
    var splitBase = base64Data.split(',')[1];
    var blob = Utilities.newBlob(Utilities.base64Decode(splitBase), mimeType, fileName);

    var folders = DriveApp.getFoldersByName("MUAAWINA_POSTERS");
    var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder("MUAAWINA_POSTERS");

    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    var photoUrl = "https://lh3.googleusercontent.com/d/" + file.getId();
    return { success: true, url: photoUrl };
  } catch (e) {
    return { error: e.message };
  }
}

// ഹൈലൈറ്റ് ഷീറ്റിലേക്ക് പുതിയ പോസ്റ്റർ ചേർക്കാൻ
function addHighlightWrite(heading,url,desc) {
  try {
    if(!/^https:\/\//i.test(String(url||'')))throw new Error('Poster URL must use HTTPS');
    const title=safeSheetText(heading,200),caption=safeSheetText(desc,4000);
    let sheet=getSS().getSheetByName('Highlights');if(!sheet){sheet=getSS().insertSheet('Highlights');sheet.appendRow(['Heading','Poster_URL','Caption']);}
    sheet.appendRow([title,url,caption]);return {success:true,highlights:getHighlights()};
  } catch(e){return {error:e.message};}
}

function deleteHighlightWrite(index) {
  try {
    const ss = getSS();
    let sheet = ss.getSheetByName('Highlights');
    if (!sheet) return { error: "Highlights sheet not found" };
    const row = parseInt(index) + 2; // 0-based index maps to row 2
    const lastRow = sheet.getLastRow();
    if (row >= 2 && row <= lastRow) {
      sheet.deleteRow(row);
      return { success: true, highlights: getHighlights() };
    } else {
      return { error: "Invalid highlight index" };
    }
  } catch (e) {
    return { error: e.message };
  }
}




// അപേക്ഷ അപ്രൂവ് ചെയ്യാനുള്ള ഫംഗ്ഷൻ (സിംഗിൾ & ബൾക്ക് സപ്പോർട്ട് ചെയ്യും)
function approvePayment(rows,memberId) {return decidePayment(rows,memberId,'Approved');}

function rejectPayment(rows,memberId) {return decidePayment(rows,memberId,'Rejected');}

function recordOfflinePayment(memberId,name,phone,payments) {return recordOfflinePaymentSafe(memberId,payments);}

function sendDefaulterEmails(phonesList, monthStr) {
  try {
    const ss = getSS();
    const dbSheet = ss.getSheetByName('Member_Database');
    const data = dbSheet.getDataRange().getValues();

    let sentCount = 0;
    let failedList = [];

    for (let i = 1; i < data.length; i++) {
      let phone = cleanPhone(data[i][2]);
      let email = String(data[i][6]).trim();
      let name = data[i][1];

      if (phonesList.includes(phone)) {
        // ഇമെയിൽ പരിശോധന
        if (!email || !email.includes('@') || !email.includes('.')) {
          failedList.push({ name: name, phone: phone, reason: "ഇമെയിൽ അഡ്രസ്സ് ലഭ്യമല്ല അല്ലെങ്കിൽ തെറ്റാണ്" });
          continue;
        }

        try {
          let subject = "MUAAWINA - വരിസംഖ്യ റിമൈൻഡർ";
          let body = `السلام عليكم ${name},\n\nനിങ്ങളുടെ MUAAWINA വരിസംഖ്യയിൽ ${monthStr} മാസത്തെ തുക അടക്കാൻ ബാക്കിയുണ്ട്. ദയവായി എത്രയും വേഗം അടക്കാൻ ശ്രദ്ധിക്കുക.\n\nhttps://muaawina.github.io/muaawina.com/ \n\nനന്ദി,\nMUAAWINA Admin.`;

          MailApp.sendEmail(email, subject, body);
          sentCount++;
        } catch (err) {
          failedList.push({ name: name, phone: phone, reason: "അയക്കാൻ കഴിഞ്ഞില്ല (Invalid Email?)" });
        }
      }
    }

    return {
      success: true,
      count: sentCount,
      failed: failedList
    };
  } catch (e) {
    return { error: "ഇമെയിൽ പ്രക്രിയയിൽ പിഴവ്: " + e.message };
  }
}

// ആപ്പ് ഇൻസ്റ്റാൾ ചെയ്ത വിവരം ഷീറ്റിൽ രേഖപ്പെടുത്താൻ (കോളം R)
function markAppDownloaded(memberId) {
  try {
    const ss = getSS();
    const dbSheet = ss.getSheetByName('Member_Database');
    const data = dbSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(memberId).trim()) {
        dbSheet.getRange(i + 1, 18).setValue("Yes"); // Column R is index 18 (1-based)
        return { success: true };
      }
    }
    return { error: "മെമ്പറെ കണ്ടെത്താനായില്ല" };
  } catch (e) {
    return { error: e.message };
  }
}

// --- പുതിയ ആപ്പിന് ഡാറ്റ കൈമാറാനുള്ള API (പാലം) ---
function doPost(e) {
  const output=ContentService.createTextOutput().setMimeType(ContentService.MimeType.JSON);
  try {
    const req=JSON.parse(e.postData.contents);const action=String(req.action||'');const data=req.data||{};let result;
    if(action==='getAppSettings')result=publicConfig(getAppSettings());
    else if(action==='checkPendingApprovals'){requireSession(req.token,'admin');result=checkPendingApprovals();}
    else if(action==='loginMember')result=loginMember(data);
    else if(action==='loginAdmin')result=loginAdmin(data);
    else if(action==='logout') {
      if(req.token)PropertiesService.getScriptProperties().deleteProperty('SESSION_'+sha256(req.token));
      result={success:true};
    } else if(req.botKey) {
      requireBot(req.botKey);
      if(action==='getMemberData') {
        const d=getMemberData(data.phone,data.mid,true,false);
        result=d.error?d:{id:d.id,name:d.name,fee:d.fee,balance:d.balance,history:d.history};
      } else if(action==='checkAndGetDefaulters')result=checkAndGetDefaulters();
      else if(action==='getDefaulters')result={success:true,members:getAdminData().members.filter(m=>m.trackingReady&&m.balance>0).map(m=>({id:m.id,name:m.name,phone:m.phone,balance:m.balance}))};
      else if(action==='getBirthdays') {
        const today=Utilities.formatDate(new Date(),getSS().getSpreadsheetTimeZone(),'MM-dd');
        result={success:true,members:getSS().getSheetByName('Member_Database').getDataRange().getValues().slice(1).filter(r=>r[13] instanceof Date&&Utilities.formatDate(r[13],getSS().getSpreadsheetTimeZone(),'MM-dd')===today).map(r=>({id:r[0],name:r[1],phone:r[2]}))};
      } else throw new Error('FORBIDDEN');
    } else {
      const session=requireSession(req.token);
      const memberId=session.role==='member'?session.id:data.id;
      const adminActions=['getAdminData','approvePayment','rejectPayment','recordOfflinePayment','processAdminBulkAction','sendDefaulterEmails','sendPushNotification','sendWhatsAppMedia','sendWhatsAppText','uploadPosterPhoto','addHighlight','deleteHighlight','moveHighlight','reorderHighlights','checkAndGetDefaulters','getWhatsAppQueueStatus','retryFailedWhatsAppJobs','inspectTrackerReadiness'];
      if(adminActions.includes(action)&&session.role!=='admin')throw new Error('FORBIDDEN');
      if(action==='getMemberData'){const r=memberRecord(memberId);result=getMemberData(r.row[2],memberId,true,false,!!data.deferred);}
      else if(action==='getAdminData')result=getAdminData(!!data.deferHighlights);
      else if(action==='getHighlights')result={success:true,highlights:getHighlights()};
      else if(action==='getDirectoryData')result=getDirectoryData();
      else if(action==='submitSinglePaymentRequest')result=submitPaymentRequests(memberId,[{year:data.year,month:data.month}],false);
      else if(action==='submitBulkPaymentRequest')result=submitPaymentRequests(memberId,data.targetData,true);
      else if(action==='approvePayment')result=decidePayment(data.rows,data.id,'Approved');
      else if(action==='rejectPayment')result=decidePayment(data.rows,data.id,'Rejected');
      else if(action==='recordOfflinePayment')result=recordOfflinePaymentSafe(memberId,data.payments);
      else if(action==='processAdminBulkAction') {
        if(!['Approved','Rejected'].includes(data.type))throw new Error('Invalid decision');
        const rows=getSS().getSheetByName('Approval_Queue').getDataRange().getValues().slice(1).filter(r=>r[6]==='Processing').map(r=>[r[7]]);
        result=rows.length?decidePayment(rows,null,data.type):{success:true,processedRequestIds:[]};
      }
      else if(action==='markAppDownloaded')result=markAppDownloaded(memberId);
      else if(action==='updateProfileData') {
        if(session.role!=='member')throw new Error('FORBIDDEN');
        result=updateProfileData(memberId,data.name,data.phone,data.email,data.blood,data.job,data.company,data.location,data.dob,data.place,data.address,data.password);
        if(result.success&&session.role==='member') {
          PropertiesService.getScriptProperties().deleteProperty('SESSION_'+sha256(req.token));
          result.token=issueSession('member',memberId);
        }
      }
      else if(action==='uploadProfilePhoto'){if(session.role!=='member')throw new Error('FORBIDDEN');result=uploadProfilePhoto(memberId,data.base64,data.mimeType,data.fileName);}
      else if(action==='sendWhatsAppMedia')result=sendWhatsAppMedia(data);
      else if(action==='sendWhatsAppText') {enqueueWhatsAppJobs([{endpoint:'/send-message',payload:{phone:data.phone,message:data.message,isGroup:!!data.isGroup}}]);result={success:true,queued:true};}
      else if(action==='sendDefaulterEmails')result=sendDefaulterEmails(data.phones,data.monthStr);
      else if(action==='sendPushNotification')result=sendPushNotification(data.title,data.message);
      else if(action==='uploadPosterPhoto')result=uploadPosterPhoto(data.base64,data.mimeType,data.fileName);
      else if(action==='addHighlight')result=addHighlight(data.heading,data.url,data.desc);
      else if(action==='deleteHighlight')result=deleteHighlight(data.index);
      else if(action==='reorderHighlights')result=reorderHighlights(data.order,data.version);
      else if(action==='moveHighlight')result=moveHighlight(data.index,data.direction,data.version);
      else if(action==='checkAndGetDefaulters')result=checkAndGetDefaulters();
      else if(action==='inspectTrackerReadiness')result=inspectTrackerReadiness();
      else if(action==='getWhatsAppQueueStatus')result=getWhatsAppQueueStatus();
      else if(action==='retryFailedWhatsAppJobs'){retryFailedWhatsAppJobs();result=getWhatsAppQueueStatus();}
      else if(action==='submitCampaignEntry'||action==='toggleCampaignStatus')throw new Error('Campaign registration is closed');
      else throw new Error('Unknown Action');
    }
    if(result&&result.config)result.config=publicConfig(result.config);
    if(result&&result.member&&result.member.config)result.member.config=publicConfig(result.member.config);
    output.setContent(JSON.stringify(result));
  } catch(error) {
    const message=String(error.message||'Request failed');
    output.setContent(JSON.stringify({error:message,code:['AUTH_REQUIRED','FORBIDDEN'].includes(message)?message:'REQUEST_FAILED'}));
  }
  return output;
}


function sendPushNotification(title, message) {
  var ONESIGNAL_APP_ID = "d5a80102-b162-4a4f-9877-a0d48b307e50";
  var REST_API_KEY = PropertiesService.getScriptProperties().getProperty('ONESIGNAL_API_KEY');
  if (!REST_API_KEY) return {error:'Configure ONESIGNAL_API_KEY in Script Properties'}; // ഇവിടെ താങ്കളുടെ REST API Key നൽകുക

  var payload = {
    "app_id": ONESIGNAL_APP_ID,
    "included_segments": ["All"],
    "headings": { "en": title },
    "contents": { "en": message },
    "url": "https://muaawina.github.io/muaawina.com/"
  };
  var options = {
    "method": "post",
    "contentType": "application/json",
    "headers": { "Authorization": "Basic " + REST_API_KEY },
    "payload": JSON.stringify(payload),
    "muteHttpExceptions": true
  };
  try {
    var response = UrlFetchApp.fetch("https://onesignal.com/api/v1/notifications", options);
    if(response.getResponseCode()<200||response.getResponseCode()>=300)return {error:'Push service returned '+response.getResponseCode()};
    var json = JSON.parse(response.getContentText());
    if (json.errors) { return { error: "OneSignal Error: " + JSON.stringify(json.errors) }; }
    return { success: true };
  } catch (e) { return { error: "Google API Error: " + e.message }; }
}

// 👇 പുതിയ വിവരങ്ങൾ കൂടി സ്വീകരിക്കാൻ ഫംഗ്ഷൻ അപ്ഡേറ്റ് ചെയ്തു 👇
function updateProfileData(id,name,phone,email,blood,job,company,location,dob,place,address,password) {
  try {
    const record=memberRecord(id);const sheet=getSS().getSheetByName('Member_Database');
    if(!String(name||'').trim()||cleanPhone(phone).length!==10)throw new Error('Valid name and phone required');
    if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('Invalid email');
    const fields=[[2,name,120],[3,String(phone).replace(/\D/g,''),15],[7,email,200],[9,blood,10],[10,job,160],[11,company,160],[12,location,200],[15,place,200],[16,address,2000]];
    const validated=fields.map(([col,value,max])=>[col,safeSheetText(value,max)]);
    let date=null;if(dob){date=new Date(dob);if(isNaN(date.getTime())||date>new Date())throw new Error('Invalid birth date');}
    if(password&&String(password).trim().length<4)throw new Error('MID/password must contain at least 4 characters');
    validated.forEach(([col,value])=>sheet.getRange(record.index,col).setValue(value));
    if(dob!==undefined)sheet.getRange(record.index,14).setValue(date||'');
    if(password&&String(password).trim())sheet.getRange(record.index,17).setValue(safeSheetText(password,120));
    SpreadsheetApp.flush();return {success:true};
  } catch(e){return {error:e.message};}
}

function uploadProfilePhoto(id, base64Data, mimeType, fileName) {
  try {
    validateImageUpload(base64Data,mimeType);
    var splitBase = base64Data.split(',')[1];
    var blob = Utilities.newBlob(Utilities.base64Decode(splitBase), mimeType, fileName);

    // MUAAWINA_PROFILES എന്ന പേരിൽ ഫോൾഡർ ഉണ്ടോയെന്ന് നോക്കുന്നു, ഇല്ലെങ്കിൽ ഉണ്ടാക്കുന്നു
    var folders = DriveApp.getFoldersByName("MUAAWINA_PROFILES");
    var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder("MUAAWINA_PROFILES");

    var file = folder.createFile(blob);
    // ഫോട്ടോ എല്ലാവർക്കും കാണാൻ പറ്റുന്ന രീതിയിൽ (Link sharing) ആക്കുന്നു
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    // ഫോട്ടോ ആപ്പിൽ കാണിക്കാനുള്ള ഡയറക്ട് ലിങ്ക്
    var photoUrl = "https://lh3.googleusercontent.com/d/" + file.getId();

    const ss = getSS();
    const dbSheet = ss.getSheetByName('Member_Database');
    const data = dbSheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(id).trim()) {
        dbSheet.getRange(i + 1, 13).setValue(photoUrl); // Column M (13)
        return { success: true, url: photoUrl };
      }
    }
    return { error: "മെമ്പറെ കണ്ടെത്താനായില്ല!" };
  } catch (e) {
    return { error: e.message };
  }
}

function triggerPermission() {
  // ഗൂഗിൾ ഡ്രൈവ്, ഷീറ്റ്, ഇമെയിൽ എന്നിവയ്ക്കുള്ള പെർമിഷനുകൾ ചോദിപ്പിക്കാൻ
  var folder = DriveApp.createFolder("Test_Permission_Folder");
  folder.setTrashed(true); // ഉണ്ടാക്കിയ ഉടനെ അത് ഡിലീറ്റ് ചെയ്യുന്നു
  getSS();
  MailApp.getRemainingDailyQuota(); // ഇമെയിൽ പെർമിഷൻ ചോദിക്കാൻ
  console.log("എല്ലാ പെർമിഷനുകളും ലഭിച്ചു!");
}

// ഡയറക്ടറി പേജിലേക്ക് അംഗങ്ങളുടെ വിവരങ്ങൾ മാത്രം കൊടുക്കാനുള്ള ഫംഗ്ഷൻ
function getDirectoryData() {
  try {
    var sheet = getSS().getSheetByName("Member_Database");
    var data = sheet.getDataRange().getValues();
    var dirList = [];

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() !== "") {
        dirList.push({
          id: String(data[i][0]),
          name: String(data[i][1]),
          phone: String(data[i][2]),
          photo: String(data[i][12]),
          batch: String(data[i][3]) || 'UNASSIGNED',
          blood: String(data[i][8]) || '',
          place: String(data[i][14]) || '' // നിങ്ങളുടെ ഷീറ്റിൽ Place ഉള്ള കോളം (ഉദാഹരണത്തിന് N കോളം ആണെങ്കിൽ 13)

        });
      }
    }
    return { success: true, members: dirList };
  } catch (e) {
    return { error: "Directory Error: " + e.message };
  }
}
// --- വാട്സ്ആപ്പ് ബോട്ട് സെറ്റിംഗ്സ് ---
// ശ്രദ്ധിക്കുക: ഓരോ തവണയും കമ്പ്യൂട്ടറിൽ ബോട്ട് റീസ്റ്റാർട്ട് ചെയ്യുമ്പോൾ ഈ ലിങ്ക് മാറാൻ സാധ്യതയുണ്ട്. 
// localtunnel-ൽ --subdomain ഉപയോഗിച്ചാൽ ഈ ലിങ്ക് സ്ഥിരമായി നിൽക്കും.
/**
 * ബോട്ട് വഴി സാധാരണ മെസ്സേജ് അയക്കാനുള്ള ഫംഗ്ഷൻ
 */
// Code.gs-ന്റെ മുകളിൽ ഇത് കൃത്യമാണെന്ന് ഉറപ്പുവരുത്തുക
const BOT_BASE_URL = "https://muaawina-whatsapp-bot.onrender.com";

// 👇 പുതിയ sendWhatsAppAuto ഫംഗ്ഷൻ (ഗ്രൂപ്പ് സപ്പോർട്ട് ഉള്ളത്)
function sendWhatsAppAuto(targetNumber,message,isGroup=false) {
  enqueueWhatsAppJobs([{endpoint:'/send-message',payload:{phone:targetNumber,message:message,isGroup:isGroup}}]);
  return {success:true,queued:true};
}

function sendWhatsAppMedia(payload) {
  try {
    enqueueWhatsAppJobs([{endpoint:'/send-media', payload:payload}]);
    return {success:true, queued:true};
  } catch (e) { return {error:e.message}; }
}
function checkAndGetDefaulters() {
  const reminderLock=LockService.getDocumentLock()||LockService.getUserLock();
  if(!reminderLock.tryLock(1000))return {success:true,busy:true};
  try {
  const ss = getSS();
  const settingsSheet = ss.getSheetByName('Reminder_Settings');
  const dbSheet = ss.getSheetByName('Member_Database');

  if (!settingsSheet || !dbSheet) {
    Logger.log("Error: Sheets not found");
    return { error: "Sheets not found" };
  }

  const settingsData = settingsSheet.getDataRange().getValues();
  const now = new Date();
  
  // സ്പ്രെഡ്ഷീറ്റിന്റെ ടൈംസോൺ ഓട്ടോമാറ്റിക് ആയി എടുക്കുന്നു (ഉദാ: Asia/Kolkata അല്ലെങ്കിൽ Asia/Dubai)
  const timezone = ss.getSpreadsheetTimeZone();
  const currentTime = Utilities.formatDate(now, timezone, "HH:mm");
  const currentDay = Utilities.formatDate(now, timezone, "EEEE");
  const todayDate = Utilities.formatDate(now, timezone, "yyyy-MM-dd");

  let executionLogs = [];
  executionLogs.push("System Timezone: " + timezone);
  executionLogs.push("Checking reminders: Current Day=" + currentDay + ", Current Time=" + currentTime);
  
  Logger.log("System Timezone: " + timezone);
  Logger.log("Checking reminders: Current Day=" + currentDay + ", Current Time=" + currentTime);

  for (let i = 1; i < settingsData.length; i++) {
    if (!settingsData[i][0] || !settingsData[i][1] || !settingsData[i][2]) continue;

    let rowTime = (settingsData[i][2] instanceof Date) ? Utilities.formatDate(settingsData[i][2], timezone, "HH:mm") : String(settingsData[i][2]).trim();
    let rowDay = String(settingsData[i][1]).trim();
    let status = String(settingsData[i][3]).trim();
    let lastSent = String(settingsData[i][4] || "").trim();

    let checkMsg = `Row ${i+1} check: Batch=${settingsData[i][0]} | SheetDay=${rowDay} vs CurrentDay=${currentDay} | SheetTime=${rowTime} vs CurrentTime=${currentTime} | Status=${status}`;
    executionLogs.push(checkMsg);
    Logger.log(checkMsg);

    // 1. എല്ലാ തിങ്കളാഴ്ചയും പഴയ ലോഗ് ക്ലിയർ ചെയ്യുന്നു (ഇതോടെ അടുത്ത ആഴ്ച വീണ്ടും മെസ്സേജ് പോകും)
    if (currentDay.toLowerCase() === "monday" && lastSent.indexOf("Sent") !== -1 && lastSent.indexOf(todayDate) === -1) {
      settingsSheet.getRange(i + 1, 5).setValue("");
      lastSent = "";
      executionLogs.push(`Cleared lastSent log for row ${i+1}`);
    }

    // 2. സമയം മാച്ച് ആകുന്നുണ്ടോ എന്ന് പരിശോധിക്കുന്നു (Case-insensitive day comparison)
    if (status === 'Active' && rowDay.toLowerCase() === currentDay.toLowerCase() && /^\d{2}:\d{2}$/.test(rowTime) && rowTime <= currentTime) {
      // മെസ്സേജ് ഇന്നു പോയിട്ടില്ലെങ്കിൽ മാത്രം അയക്കുന്നു
      if (lastSent.indexOf(todayDate) === -1) {
        let batchToProcess = String(settingsData[i][0]).trim();
        executionLogs.push("Triggering processBatch for: " + batchToProcess);
        Logger.log("Triggering processBatch for: " + batchToProcess);
        processBatch(batchToProcess);

        // മെസ്സേജ് അയച്ചു എന്ന് മാർക്ക് ചെയ്യുന്നു
        settingsSheet.getRange(i + 1, 5).setValue(todayDate + " (Queued)");
        executionLogs.push("Batch " + batchToProcess + " processed successfully.");
        Logger.log("Batch " + batchToProcess + " processed successfully.");
      } else {
        executionLogs.push("Reminder already sent today for: " + settingsData[i][0]);
        Logger.log("Reminder already sent today for: " + settingsData[i][0]);
      }
    }
  }

  return {
    status: "success",
    timezone: timezone,
    currentDay: currentDay,
    currentTime: currentTime,
    logs: executionLogs
  };
  } finally {reminderLock.releaseLock();}
}

// മെമ്പർമാർക്ക് ഗൂഗിൾ ഷീറ്റ് അടിസ്ഥാനമാക്കി മെസ്സേജ് അയക്കുന്ന പുതിയ ലൂപ്പ്
function processBatch(batchName) {
  const ss = getSS();
  const dbSheet = ss.getSheetByName('Member_Database');

  // ഷീറ്റിലെ മുഴുവൻ ഡാറ്റയും എടുക്കുന്നു
  const dbData = dbSheet.getDataRange().getValues();

  for (let j = 1; j < dbData.length; j++) {
    // കോളങ്ങളുടെ ഇൻഡക്സ് (0 ൽ നിന്ന് തുടങ്ങുന്നു): B=1 (Name), C=2 (Phone), D=3 (Batch), F=5 (Status)
    // U=20 (Balance), V=21 (Advance), W=22 (Current Month Status)

    let batch = String(dbData[j][3]).trim();
    let status = String(dbData[j][5]).trim();

    // 1. പറഞ്ഞ ബാച്ചിലുള്ള, "Active" ആയ മെമ്പർമാർക്ക് മാത്രം
    if (batch === batchName && status === "Active") {
      let name = String(dbData[j][1]).trim();
      let phone = String(dbData[j][2]).trim();
      let balance = Number(dbData[j][20]) || 0; // 👈 കോളം U
      let advance = Number(dbData[j][21]) || 0; // 👈 കോളം V
      let curMonthPaid = String(dbData[j][22]).trim().toLowerCase(); // 👈 കോളം W

      // ടെസ്റ്റിംഗ് സമയത്ത് കൺസോളിൽ ഡാറ്റ കാണാൻ ഇത് സഹായിക്കും
      Logger.log(`പരിശോധിക്കുന്നു: ${name} | Balance: ₹${balance} | Advance: ₹${advance} | ഈ മാസം അടച്ചോ: ${curMonthPaid}`);

      // 2. കുടിശ്ശിക (Balance) ഉള്ളവർക്കും, അഡ്വാൻസ് (Advance) ഇല്ലാത്തവർക്കും മാത്രം മെസ്സേജ് അയക്കുന്നു
      if (balance > 0 && advance <= 0) {
        let msg = "";

        if (curMonthPaid === "no") {
          // മെസ്സേജ് 1: ഈ മാസം അടക്കാത്തവർക്ക്
          msg = `🔔 *വരിസംഖ്യ അറിയിപ്പ്!*\n\nالسلام عليكم *${name}*,\n\n*നിങ്ങളുടെ ഈ മാസത്തെ വരിസംഖ്യ അടച്ചിട്ടില്ല എന്ന് ഓർമ്മിപ്പിക്കുന്നു*. ദയവായി എത്രയും വേഗം അടക്കാൻ ശ്രദ്ധിക്കുമല്ലോ.\n\n💰 *ആകെ അടക്കാനുള്ള തുക:* _₹${balance}_\n\nകൂടുതൽ വിവരങ്ങൾ കാണാനും പണമടക്കാനും താഴെയുള്ള ലിങ്ക് സന്ദർശിക്കുക:\n🔗 https://muaawina.github.io/muaawina.com/\n\nസഹകരണത്തിന് നന്ദി! 🤝`;
        }
        else if (curMonthPaid === "yes") {
          // മെസ്സേജ് 2: ഈ മാസം അടച്ചു, പക്ഷെ മുൻകാല കുടിശ്ശിക ബാക്കിയുള്ളവർക്ക്
          msg = `✅ *വരിസംഖ്യ അറിയിപ്പ്!*\n\nالسلام عليكم *${name}*,\n\nനിങ്ങളുടെ ഈ മാസത്തെ വരിസംഖ്യ ലഭിച്ചിട്ടുണ്ട്, കൃത്യസമയത്ത് അടച്ചതിന് വളരെ നന്ദി! \n\n_എന്നാൽ നിങ്ങളുടെ മുൻകാലങ്ങളിലെ ചില മാസങ്ങളിലെ കുടിശ്ശിക ഇപ്പോഴും ബാക്കിയുണ്ട്._ ദയവായി അതും കൂടി അടച്ചുതീർക്കാൻ ശ്രദ്ധിക്കുമല്ലോ.\n\n💰 *ബാക്കിയുള്ള കുടിശ്ശിക തുക:* _₹${balance}_\n\nകൂടുതൽ വിവരങ്ങൾ കാണാനും പണമടക്കാനും താഴെയുള്ള ലിങ്ക് സന്ദർശിക്കുക:\n🔗 https://muaawina.github.io/muaawina.com/\n\nസഹകരണത്തിന് നന്ദി! 🤝`;
        }

        // 3. മെസ്സേജ് ശരിയായി സെറ്റ് ആയിട്ടുണ്ടെങ്കിൽ ബോട്ട് വഴി വാട്സ്ആപ്പിലേക്ക് അയക്കുന്നു
        if (msg !== "") {
          sendWhatsAppAuto(phone, msg, false);
          Logger.log(`✅ ${name}-ന് മെസ്സേജ് അയച്ചു!`);
        }
      } else {
        Logger.log(`⏩ ${name}-നെ ഒഴിവാക്കി (കുടിശ്ശിക ഇല്ല അല്ലെങ്കിൽ അഡ്വാൻസ് ഉണ്ട്)`);
      }
    }
  }
}



function testSendMediaDirectly() {
  var payload = {
    "phone": "9446760410", // താങ്കളുടെ വാട്സ്ആപ്പ് നമ്പർ
    "caption": "ഇതൊരു ടെസ്റ്റ് ഇമേജ് ആണ് 🚀",
    "base64": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=" // ഇത് വെറുമൊരു ചെറിയ ഡെമോ ഇമേജ് ആണ്
  };

  // നമ്മൾ നേരത്തെ ഉണ്ടാക്കിയ ഫംഗ്ഷൻ വിളിക്കുന്നു
  sendWhatsAppMedia(payload);
}

function testReminderNow() {
  // നിങ്ങളുടെ ഷീറ്റിലുള്ള യഥാർത്ഥ ബാച്ചിന്റെ പേര് "All" എന്നതിന് പകരം നൽകുക (ഉദാ: "Batch 1")
  processBatch("Batch 3");
}

function testPaymentRequest() {
  // നിങ്ങളുടെ ഷീറ്റിലുള്ള യഥാർത്ഥ മെമ്പർ ഐഡിയും (MID) പേരും താഴെ നൽകുക
  let testMemberId = "M101"; // 👈 ഇത് ഷീറ്റിലുള്ള ഒരു യഥാർത്ഥ ഐഡി ആക്കി മാറ്റുക
  let testName = "Test Name";

  // ഫോൺ നമ്പർ മനപ്പൂർവ്വം കാലിയാക്കി നൽകുന്നു (നമ്മുടെ പുതിയ കോഡ് അത് ഷീറ്റിൽ നിന്ന് തനിയെ എടുക്കുന്നുണ്ടോ എന്നറിയാൻ)
  let testPhone = "";

  let testYear = "2026";
  let testMonth = "May";

  Logger.log("ടെസ്റ്റിംഗ് ആരംഭിക്കുന്നു...");

  let result = submitSinglePaymentRequest(testMemberId, testName, testPhone, testYear, testMonth);

  if (result.success) {
    Logger.log("✅ ടെസ്റ്റ് വിജയിച്ചു! ഷീറ്റിൽ നിന്ന് നമ്പർ എടുത്ത് വാട്സ്ആപ്പ് മെസ്സേജ് അയച്ചിട്ടുണ്ട്.");
  } else {
    Logger.log("❌ എറർ: " + result.error);
  }
}

// === മെമ്പർഷിപ്പ് ക്യാമ്പയിൻ ഡാറ്റാ ശേഖരിക്കാനുള്ള ഫംഗ്ഷൻ ===
function submitCampaignEntry() {return {error:'Campaign registration is closed'};}

function uploadBase64ToDrive(base64Data, mimeType, prefix) {
  try {
    validateImageUpload(base64Data,mimeType);
    var splitBase = base64Data.split(',')[1];
    var blob = Utilities.newBlob(Utilities.base64Decode(splitBase), mimeType, prefix + '_' + new Date().getTime() + '.jpg');

    var folders = DriveApp.getFoldersByName("MUAAWINA_CAMPAIGN_DOCS");
    var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder("MUAAWINA_CAMPAIGN_DOCS");

    var file = folder.createFile(blob);
    // ഫയൽ എല്ലാവർക്കും കാണാൻ പറ്റുന്ന രീതിയിൽ (Link sharing) ആക്കുന്നു
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    // ഫോട്ടോ ആപ്പിൽ കാണിക്കാനുള്ള ഡയറക്ട് ലിങ്ക്
    return "https://lh3.googleusercontent.com/d/" + file.getId();
  } catch (e) {
    return "Error uploading file: " + e.message;
  }
}

function toggleCampaignStatus() {return {error:'Campaign registration is closed'};}

function setupWhatsAppBackgroundQueue() {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const exists = ScriptApp.getProjectTriggers().some(t => t.getHandlerFunction() === 'processWhatsAppBackgroundQueue');
    if (!exists) ScriptApp.newTrigger('processWhatsAppBackgroundQueue').timeBased().everyMinutes(1).create();
    PropertiesService.getScriptProperties().setProperty('WA_QUEUE_ENABLED', 'yes');
    return {success:true};
  } finally { lock.releaseLock(); }
}

function enqueueWhatsAppJobs(items) {
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty('WA_QUEUE_ENABLED') !== 'yes' || !ScriptApp.getProjectTriggers().some(t=>t.getHandlerFunction()==='processWhatsAppBackgroundQueue')) throw new Error('Run setupWhatsAppBackgroundQueue first.');
  const values = {};
  const createdFiles = [];
  try {
    items.forEach(item => {
      const id = item.jobId ? sha256(String(item.jobId)) : Utilities.getUuid();
      if(props.getProperty('WA_JOB_'+id))return;
      const payload = JSON.stringify(item.payload);
      const job = {endpoint:item.endpoint, createdAt:Date.now(), attempts:0, nextAttempt:0};
      // Receipts exceed the per-property size limit; retain them privately in Drive.
      if (Utilities.newBlob(payload).getBytes().length > 6000) {
        const file = DriveApp.createFile('muaawina-wa-queue-' + id + '.json', payload, MimeType.PLAIN_TEXT);
        createdFiles.push(file);
        job.fileId = file.getId();
      } else job.payload = item.payload;
      values['WA_JOB_' + id] = JSON.stringify(job);
    });
    props.setProperties(values, false);
  } catch (e) {
    createdFiles.forEach(file => { try { file.setTrashed(true); } catch (_) {} });
    throw e;
  }
}

function processWhatsAppBackgroundQueue() {
  try{repairPaymentNotifications();}catch(e){Logger.log('Payment notifications waiting: '+e.message);}
  const props=PropertiesService.getScriptProperties();const all=props.getProperties();const started=Date.now();let processed=0;
  const entries=Object.keys(all).filter(k=>k.startsWith('WA_JOB_')).map(key=>{try{return {key:key,job:JSON.parse(all[key])};}catch(e){Logger.log('Corrupt WhatsApp job: '+key);return null;}}).filter(Boolean).sort((a,b)=>a.job.createdAt-b.job.createdAt);
  for(const entry of entries) {
    if(processed>=4||Date.now()-started>90000)break;
    const lock=LockService.getScriptLock();if(!lock.tryLock(1000))continue;
    let job;
    try {
      const latest=props.getProperty(entry.key);if(!latest)continue;
      job=JSON.parse(latest);
      if(job.failed||job.nextAttempt>Date.now()||job.leaseUntil>Date.now()){job=null;continue;}
      job.leaseUntil=Date.now()+5*60*1000;props.setProperty(entry.key,JSON.stringify(job));
    } finally {lock.releaseLock();}
    if(!job)continue;processed++;
    try {
      const payload=job.fileId?JSON.parse(DriveApp.getFileById(job.fileId).getBlob().getDataAsString()):job.payload;
      payload.jobId=entry.key.slice(7);
      const response=UrlFetchApp.fetch(BOT_BASE_URL+job.endpoint,{method:'post',contentType:'application/json',headers:{Authorization:'Bearer '+props.getProperty('BOT_API_KEY')},payload:JSON.stringify(payload),muteHttpExceptions:true});
      const code=response.getResponseCode();let result;try{result=JSON.parse(response.getContentText());}catch(e){result={};}
      if(code<200||code>=300||result.success!==true) {
        const error=new Error('Bot response '+code);error.manualReview=code===409;throw error;
      }
      props.deleteProperty(entry.key);
      if(job.fileId){try{DriveApp.getFileById(job.fileId).setTrashed(true);}catch(e){Logger.log('Queue file cleanup needed: '+job.fileId);}}
    } catch(error) {
      job.leaseUntil=0;job.attempts++;job.lastError=String(error.message).slice(0,400);job.nextAttempt=Date.now()+Math.min(30,Math.pow(2,job.attempts))*60000;
      if(error.manualReview||job.attempts>=5)job.failed=true;
      props.setProperty(entry.key,JSON.stringify(job));Logger.log('WhatsApp retry/review required: '+entry.key+': '+job.lastError);
    }
  }
  props.setProperty('WA_QUEUE_LAST_RUN',String(Date.now()));
}


function safeSheetText(value,maxLength) {
  const text=String(value==null?'':value).trim();if(text.length>maxLength)throw new Error('Text is too long');
  return /^[=+@-]/.test(text)?"'"+text:text;
}


function validateImageUpload(base64,mimeType) {
  if(!['image/jpeg','image/png','image/webp'].includes(mimeType))throw new Error('Only JPEG, PNG or WEBP images are allowed');
  if(typeof base64!=='string'||!/^data:image\/(jpeg|png|webp);base64,/.test(base64)||base64.length>10*1024*1024)throw new Error('Invalid/oversized image');
}


function retryFailedWhatsAppJobs() {
  const props=PropertiesService.getScriptProperties();const values=props.getProperties();
  Object.keys(values).filter(k=>k.startsWith('WA_JOB_')).forEach(k=>{
    try {const job=JSON.parse(values[k]);if(job.failed&&!String(job.lastError||'').includes('409')){job.failed=false;job.attempts=0;job.nextAttempt=0;job.leaseUntil=0;props.setProperty(k,JSON.stringify(job));}}
    catch(e){Logger.log('Corrupt queue job needs review: '+k);}
  });
}


function initializeSecurity() {
  const props = PropertiesService.getScriptProperties();
  const legacy = PropertiesService.getDocumentProperties();
  ['MONTHLY_FEE','START_DATE','CAMPAIGN_ACTIVE'].forEach(key => {
    if (!props.getProperty(key) && legacy && legacy.getProperty(key)) props.setProperty(key,legacy.getProperty(key));
  });
  if (!props.getProperty('ADMIN_PASS')) {
    const existing = legacy && legacy.getProperty('ADMIN_PASS');
    props.setProperty('ADMIN_PASS', existing && existing !== '1234' ? existing : Utilities.getUuid().replace(/-/g,'').slice(0,16));
  }
  if (props.getProperty('ADMIN_PASS') === '1234') throw new Error('Change ADMIN_PASS in Script Properties before release.');
  if (!props.getProperty('BOT_API_KEY')) props.setProperty('BOT_API_KEY',Utilities.getUuid()+Utilities.getUuid());
  ensureQueueSchema();
  setupWhatsAppBackgroundQueue();
  return {success:true, securityVersion:2, message:'Copy BOT_API_KEY to Render environment. Read ADMIN_PASS in Script Properties.'};
}


function sha256(value) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(value),Utilities.Charset.UTF_8)
    .map(b => ('0'+((b+256)%256).toString(16)).slice(-2)).join('');
}


function constantTimeEqual(a,b) {
  a=String(a||''); b=String(b||''); let diff=a.length ^ b.length;
  for(let i=0;i<Math.max(a.length,b.length);i++) diff |= (a.charCodeAt(i)||0) ^ (b.charCodeAt(i)||0);
  return diff===0;
}


function publicConfig(config) {
  const result=Object.assign({},config); delete result.ADMIN_PASS; result.securityVersion=2; return result;
}


function memberRecord(id) {
  const rows=getSS().getSheetByName('Member_Database').getDataRange().getValues();
  const index=rows.findIndex((r,i)=>i>0&&String(r[0]).trim()===String(id).trim());
  if(index<1) throw new Error('Member not found');
  return {row:rows[index],index:index+1};
}


function credentialTag(role,id) {
  if(role==='admin') return sha256(PropertiesService.getScriptProperties().getProperty('ADMIN_PASS')||'');
  const r=memberRecord(id).row; return sha256(cleanPhone(r[2])+'|'+String(r[16]||r[0]).trim().toUpperCase());
}


function issueSession(role,id) {
  const token=Utilities.getUuid()+Utilities.getUuid();
  PropertiesService.getScriptProperties().setProperty('SESSION_'+sha256(token),JSON.stringify({role:role,id:id||'',tag:credentialTag(role,id),createdAt:Date.now()}));
  return token;
}


function requireSession(token,role) {
  if(!token) throw new Error('AUTH_REQUIRED');
  const props=PropertiesService.getScriptProperties(); const key='SESSION_'+sha256(token); const text=props.getProperty(key);
  if(!text) throw new Error('AUTH_REQUIRED');
  const session=JSON.parse(text);
  if(role&&session.role!==role) throw new Error('FORBIDDEN');
  if(!constantTimeEqual(session.tag,credentialTag(session.role,session.id))) {props.deleteProperty(key);throw new Error('AUTH_REQUIRED');}
  return session;
}


function loginRateCheck(scope,success) {
  const props=CacheService.getScriptCache(); const key='LOGIN_LIMIT_'+sha256(scope);const now=Date.now();
  let state=JSON.parse(props.get(key)||'{"count":0,"until":0}');
  if(state.until<now) state={count:0,until:now+10*60*1000};
  if(success===undefined) {if(state.count>=10)throw new Error('Too many attempts. Try again in 10 minutes.');return;}
  if(success) props.remove(key); else {state.count++;props.put(key,JSON.stringify(state),600);}
}


function loginMember(data) {
  const phone=cleanPhone(data.phone); const credential=String(data.mid||'').trim().toUpperCase();
  if(phone.length!==10||!credential)throw new Error('Phone and MID are required');
  loginRateCheck('member:'+phone);
  const rows=getSS().getSheetByName('Member_Database').getDataRange().getValues();
  const row=rows.slice(1).find(r=>cleanPhone(r[2])===phone&&String(r[16]||r[0]).trim().toUpperCase()===credential);
  loginRateCheck('member:'+phone,!!row);
  if(!row)throw new Error('Phone or MID/password is incorrect');
  return {success:true,token:issueSession('member',String(row[0])),member:getMemberData(row[2],row[0],true,true)};
}


function loginAdmin(data) {
  loginRateCheck('admin');
  const expected=PropertiesService.getScriptProperties().getProperty('ADMIN_PASS');
  const ok=!!expected&&expected!=='1234'&&constantTimeEqual(expected,data.password);
  loginRateCheck('admin',ok);if(!ok)throw new Error('Admin password is incorrect');
  return {success:true,token:issueSession('admin','')};
}


function requireBot(key) {
  const expected=PropertiesService.getScriptProperties().getProperty('BOT_API_KEY');
  if(!expected||!constantTimeEqual(expected,key))throw new Error('FORBIDDEN');
}


function ensureQueueSchema() {
  const lock=LockService.getScriptLock();lock.waitLock(10000);
  try {
    const q=getSS().getSheetByName('Approval_Queue');if(!q)throw new Error('Approval_Queue is missing');
    q.getRange(1,8,1,3).setValues([['Request ID','Amount','Processed At']]);
    q.getRange(1,11).setValue('Notification State');
    if(q.getLastRow()>1) {
      const rows=q.getRange(2,8,q.getLastRow()-1,1).getValues();
      rows.forEach(r=>{if(!r[0])r[0]=Utilities.getUuid();});
      q.getRange(2,8,rows.length,1).setValues(rows);
    }
  } finally {lock.releaseLock();}
}


function validPaymentTarget(memberId,year,month,createYear) {
  const ss=getSS();const member=memberRecord(memberId).row;
  const fee=Number(member[7]); const join=member[4] instanceof Date?member[4]:new Date(member[4]);
  if(!member[4]||isNaN(join.getTime())||!Number.isFinite(fee)||fee<=0)throw new Error('Member join date/monthly fee must be completed by admin first');
  if(member[5]&&String(member[5]).toLowerCase()!=='active')throw new Error('Member is not active');
  year=String(year);const parsed=parseHeaderDate(month,year);
  if(!/^20\d{2}$/.test(year)||!parsed||parsed.year!==year)throw new Error('Invalid year/month');
  const targetDate=new Date(Number(year),parsed.monthIdx,1);
  if(targetDate<new Date(join.getFullYear(),join.getMonth(),1))throw new Error('Payment month is before joining date');
  let sheet=ss.getSheetByName(year);
  if(!sheet&&createYear) {
    sheet=ss.insertSheet(year);
    sheet.getRange(1,1,1,14).setValues([['Member ID','Name','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']]);
    const members=ss.getSheetByName('Member_Database').getDataRange().getValues().slice(1).filter(r=>r[0]&&r[4]&&new Date(r[4]).getFullYear()<=Number(year));
    if(members.length)sheet.getRange(2,1,members.length,14).setValues(members.map(r=>[r[0],r[1],...Array(12).fill(false)]));
  }
  if(!sheet)throw new Error('Year tracker is missing: '+year);
  const values=sheet.getDataRange().getValues();
  const ri=values.findIndex((r,i)=>i>0&&String(r[0]).trim()===String(memberId).trim());
  const ci=values[0].findIndex((h,i)=>i>=2&&parseHeaderDate(h,year)?.monthIdx===parsed.monthIdx);
  if(ri<1||ci<2)throw new Error('Member/month is missing from year tracker; reconcile tracker first');
  return {sheet:sheet,row:ri+1,col:ci+1,paid:values[ri][ci]===true||String(values[ri][ci]).toUpperCase()==='TRUE'||Number(values[ri][ci])>0,member:member,fee:fee,year:year,month:parsed.monthName};
}


function submitPaymentRequests(memberId,requests,isBulk) {
  const lock=LockService.getScriptLock();lock.waitLock(10000);
  let queued=true,newCount=0,member,normalized=[];
  try {
    if(!Array.isArray(requests)||!requests.length||requests.length>120)throw new Error('Invalid payment selection');
    reconcilePaymentOperations();
    const q=getSS().getSheetByName('Approval_Queue');const existing=q.getDataRange().getValues();const now=new Date();const additions=[];const seen=new Set();
    const targets=requests.map(r=>validPaymentTarget(memberId,r.year,r.month,false));
    member=targets[0].member;
    targets.forEach(t=>{
      const key=t.year+'|'+t.month;if(seen.has(key))return;seen.add(key);
      if(t.paid)throw new Error('This month is already paid: '+t.month+' '+t.year);
      const duplicate=existing.slice(1).some(r=>String(r[1])===String(memberId)&&String(r[4])===t.year&&String(r[5])===t.month&&r[6]==='Processing');
      if(!duplicate) {additions.push([now,memberId,member[1],String(member[2]),t.year,t.month,'Processing',Utilities.getUuid(),t.fee,'','Waiting']);normalized.push({year:t.year,month:t.month});}
    });
    if(additions.length)q.getRange(q.getLastRow()+1,1,additions.length,11).setValues(additions);
    newCount=additions.length;
    SpreadsheetApp.flush();
  } finally {lock.releaseLock();}
  if(newCount) {
    try { repairPaymentNotifications(); } catch(e) {queued=false;Logger.log('Payment saved; notification queue failed: '+e.message);}
  }
  return {success:true,notificationQueued:queued,createdCount:newCount,alreadyProcessing:newCount===0};
}


function decidePayment(rows,memberId,status) {
  const lock=LockService.getScriptLock();lock.waitLock(10000);
  try {
    reconcilePaymentOperations();
    const q=getSS().getSheetByName('Approval_Queue');const data=q.getDataRange().getValues();
    if(!Array.isArray(rows)||!rows.length)throw new Error('Request IDs are required');
    const ids=[...new Set(rows.map(r=>String(Array.isArray(r)?r[0]:r)))];
    const items=ids.map(id=>{const index=data.findIndex((r,i)=>i>0&&String(r[7])===id);if(index<1)throw new Error('Request no longer exists');return {row:data[index],index:index+1,id:id};});
    items.forEach(item=>{if(memberId&&String(item.row[1])!==String(memberId))throw new Error('Request/member mismatch');if(item.row[6]!==status&&item.row[6]!=='Processing')throw new Error('Request was already decided. Refresh the page.');});
    const targets=status==='Approved'?items.map(item=>validPaymentTarget(item.row[1],item.row[4],item.row[5],false)):[];
    const now=new Date();
    const plan=items.filter(item=>item.row[6]!==status).map(item=>({memberId:String(item.row[1]),year:String(item.row[4]),month:String(item.row[5]),requestId:item.id,status:status,amount:Number(item.row[8])||Number(memberRecord(item.row[1]).row[7])||0,at:now.toISOString()}));
    if(plan.length)persistPaymentOperation(plan);
    return {success:true,processedRequestIds:ids,processedAt:now.toISOString()};
  } finally {lock.releaseLock();}
}


function recordOfflinePaymentSafe(memberId,payments) {
  const lock=LockService.getScriptLock();lock.waitLock(10000);
  try {
    if(!Array.isArray(payments)||!payments.length||payments.length>120)throw new Error('Invalid payments');
    reconcilePaymentOperations();
    const unique=new Map();payments.forEach(p=>unique.set(String(p.year)+'|'+String(p.month),p));
    const targets=[...unique.values()].map(p=>validPaymentTarget(memberId,p.year,p.month,true));
    reconcilePaymentOperations();
    const q=getSS().getSheetByName('Approval_Queue');const existing=q.getDataRange().getValues();const now=new Date();let count=0;const plan=[];
    targets.forEach(t=>{
      if(t.paid)return;
      const pending=existing.slice(1).filter(r=>String(r[1])===String(memberId)&&String(r[4])===t.year&&String(r[5])===t.month&&r[6]==='Processing');
      (pending.length?pending:[null]).forEach(r=>plan.push({memberId:String(memberId),year:t.year,month:t.month,requestId:r?r[7]:Utilities.getUuid(),status:'Approved (Offline)',amount:t.fee,at:now.toISOString(),name:t.member[1],phone:String(t.member[2])}));
      count++;
    });
    if(plan.length)persistPaymentOperation(plan);
    SpreadsheetApp.flush();return {success:true,count:count,alreadyPaid:count===0,processedAt:now.toISOString()};
  } finally {lock.releaseLock();}
}


function getWhatsAppQueueStatus() {
  const props=PropertiesService.getScriptProperties();const values=props.getProperties();let pending=0,failed=0;
  Object.keys(values).filter(k=>k.startsWith('WA_JOB_')).forEach(k=>{try {JSON.parse(values[k]).failed?failed++:pending++;}catch(e){failed++;}});
  const trigger=ScriptApp.getProjectTriggers().some(t=>t.getHandlerFunction()==='processWhatsAppBackgroundQueue');
  return {success:true,pending:pending,failed:failed,triggerPresent:trigger};
}

function queuePaymentNotifications(member,requests,isBulk,jobKey) {
    const name=member[1],phone=member[2],year=requests[0].year,month=requests[0].month;
    let adminMsg,memberMsg;
    if(isBulk) {
    adminMsg = `📢 *പുതിയ ബൾക്ക് പേയ്‌മെന്റ്!*\n\nപേര്: ${name}\n${requests.length} മാസത്തെ തുക അടച്ചിട്ടുണ്ട്.\nഅപ്രൂവലിനായി ആപ്പ് പരിശോധിക്കുക.`;
    memberMsg = `السلام عليكم ${name},\n\nനിങ്ങളുടെ ${requests.length} മാസത്തെ പേയ്‌മെന്റ് റിക്വസ്റ്റ് ഞങ്ങൾക്ക് ലഭിച്ചിട്ടുണ്ട്.\n\nദയവായി പണം അടച്ചതിന്റെ *സ്ക്രീൻഷോട്ട്* ഈ നമ്പറിലേക്ക് തന്നെ അയച്ചു തരിക.\n\n_സ്ക്രീൻഷോട്ട് ലഭിച്ചാൽ ഉടനെ നിങ്ങൾക്ക് അപ്രൂവൽ നൽകുന്നതായിരിക്കും._`;
    } else {
    adminMsg = `📢 *പുതിയ പേയ്‌മെന്റ്!*\n\nപേര്: ${name}\nമാസം: ${month} ${year}\nഅപ്രൂവലിനായി ആപ്പ് പരിശോധിക്കുക.`;
    memberMsg = `السلام عليكم ${name},\n\n*നിങ്ങളുടെ ${month} ${year} മാസത്തെ പേയ്‌മെന്റ് റിക്വസ്റ്റ് ഞങ്ങൾക്ക് ലഭിച്ചിട്ടുണ്ട്.*\n\nദയവായി പണം അടച്ചതിന്റെ *സ്ക്രീൻഷോട്ട്* ഈ നമ്പറിലേക്ക് തന്നെ അയച്ചു തരിക.\n\n_സ്ക്രീൻഷോട്ട് ലഭിച്ചാൽ ഉടനെ നിങ്ങൾക്ക് അപ്രൂവൽ നൽകുന്നതായിരിക്കും._`;
    }
    enqueueWhatsAppJobs([{jobId:jobKey+':admin',endpoint:'/send-message',payload:{phone:"120363424627614459@g.us",message:adminMsg,isGroup:true}},{jobId:jobKey+':member',endpoint:'/send-message',payload:{phone:phone,message:memberMsg,isGroup:false}}]);
}

function paymentJournal() {
  const ss=getSS();let sh=ss.getSheetByName('_Payment_Operations');
  if(!sh){sh=ss.insertSheet('_Payment_Operations');sh.appendRow(['Operation ID','State','Plan','Created At']);}
  return sh;
}
function persistPaymentOperation(plan) {
  const journal=paymentJournal();journal.appendRow([Utilities.getUuid(),'Pending',JSON.stringify(plan),new Date()]);
  SpreadsheetApp.flush();reconcilePaymentOperations();
}
function reconcilePaymentOperations() {
  const journal=getSS().getSheetByName('_Payment_Operations');if(!journal)return;
  const pending=journal.getDataRange().getValues();const q=getSS().getSheetByName('Approval_Queue');
  pending.slice(1).forEach((op,index)=>{
    if(op[1]!=='Pending')return;
    const plan=JSON.parse(op[2]);
    const targets=plan.map(p=>p.status==='Rejected'?null:validPaymentTarget(p.memberId,p.year,p.month,false));
    plan.forEach((p,i)=>{
      const rows=q.getDataRange().getValues();const ri=rows.findIndex((r,j)=>j>0&&String(r[7])===p.requestId);
      if(ri>0&&rows[ri][6]!==p.status&&rows[ri][6]!=='Processing')throw new Error('Payment operation conflict; admin reconciliation needed');
      if(ri<1&&p.status!=='Approved (Offline)')throw new Error('Payment operation request missing; admin reconciliation needed');
      if(targets[i])targets[i].sheet.getRange(targets[i].row,targets[i].col).setValue(true);
      if(ri>0)q.getRange(ri+1,7,1,4).setValues([[p.status,p.requestId,p.amount,new Date(p.at)]]);
      else q.appendRow([new Date(p.at),p.memberId,p.name,p.phone,p.year,p.month,p.status,p.requestId,p.amount,new Date(p.at)]);
    });
    SpreadsheetApp.flush();journal.getRange(index+2,2).setValue('Complete');SpreadsheetApp.flush();
  });
}

function getMemberData(userPhone,inputMid,lookupOnly=false,recordLogin=false,deferHighlights=false) {
  const lock=LockService.getScriptLock();lock.waitLock(10000);
  try {reconcilePaymentOperations();return getMemberDataSnapshot(userPhone,inputMid,lookupOnly,recordLogin,deferHighlights);}finally{lock.releaseLock();}
}
function getAdminData(deferHighlights=false) {
  const lock=LockService.getScriptLock();lock.waitLock(10000);
  try {reconcilePaymentOperations();return getAdminDataSnapshot(deferHighlights);}finally{lock.releaseLock();}
}

function repairPaymentNotifications() {
  const lock=LockService.getScriptLock();if(!lock.tryLock(1000))return;
  try {
    const q=getSS().getSheetByName('Approval_Queue');const data=q.getDataRange().getValues();const groups={};
    data.slice(1).forEach((r,i)=>{if(r[10]!=='Waiting')return;const key=String(r[1])+'|'+new Date(r[0]).getTime();if(!groups[key])groups[key]=[];groups[key].push({row:r,index:i+2});});
    Object.keys(groups).forEach(key=>{
      const group=groups[key],member=memberRecord(group[0].row[1]).row;
      queuePaymentNotifications(member,group.map(x=>({year:x.row[4],month:x.row[5]})),group.length>1,'payment:'+key);
      group.forEach(x=>q.getRange(x.index,11).setValue('Queued'));
    });
  }finally{lock.releaseLock();}
}
function inspectTrackerReadiness() {
  const data=getSS().getSheetByName('Member_Database').getDataRange().getValues();
  const incomplete=data.slice(1).filter(r=>r[0]&&(!r[4]||isNaN(new Date(r[4]).getTime())||!(Number(r[7])>0))).map(r=>({id:r[0],name:r[1],missingJoinDate:!r[4],missingMonthlyFee:!(Number(r[7])>0)}));
  return {success:true,incompleteMembers:incomplete};
}
function reconcileYearTrackers() {
  const lock=LockService.getScriptLock();lock.waitLock(10000);
  try {
    const ss=getSS(),members=ss.getSheetByName('Member_Database').getDataRange().getValues().slice(1);let added=0;
    ss.getSheets().filter(s=>/^20\d{2}$/.test(s.getName())).forEach(sheet=>{
      const year=Number(sheet.getName()),rows=sheet.getDataRange().getValues(),headers=rows[0];
      members.filter(r=>r[0]&&r[4]&&Number(r[7])>0&&!isNaN(new Date(r[4]).getTime())&&new Date(r[4]).getFullYear()<=year).forEach(r=>{
        if(rows.slice(1).some(x=>String(x[0])===String(r[0])))return;
        const next=headers.map((h,i)=>i===0?r[0]:i===1?r[1]:parseHeaderDate(h,year)?false:'');
        // Year sheets with array formulas must be reviewed instead of overwriting their spill range.
        const formulas=sheet.getDataRange().getFormulas();
        if(formulas.some(row=>row.some(v=>/ARRAYFORMULA|FILTER\(/i.test(v))))throw new Error('Year '+year+' uses array formulas. Extend the member formula range to open-ended rows before reconciliation.');
        sheet.appendRow(next);rows.push(next);added++;
      });
    });
    SpreadsheetApp.flush();return {success:true,added:added,readiness:inspectTrackerReadiness()};
  }finally{lock.releaseLock();}
}

function moveHighlight(index,direction,version) {
  const lock=LockService.getScriptLock();lock.waitLock(10000);
  try {
    const sheet=getSS().getSheetByName('Highlights');if(!sheet)throw new Error('Highlights sheet not found');
    const rows=sheet.getDataRange().getValues(),data=rows.slice(1);
    if(!version||version!==sha256(JSON.stringify(data)))throw new Error('Poster list changed. Refresh and try again.');
    index=Number(index);direction=Number(direction);const next=index+direction;
    if(!Number.isInteger(index)||![-1,1].includes(direction)||index<0||index>=data.length||next<0||next>=data.length)throw new Error('Invalid poster position');
    const first=Math.min(index,next),width=Math.max(data[index].length,data[next].length);
    const pair=[data[next],data[index]];if(direction<0)pair.reverse();
    sheet.getRange(first+2,1,2,width).setValues(pair.map(r=>Array.from({length:width},(_,i)=>r[i]===undefined?'':r[i])));
    SpreadsheetApp.flush();return {success:true,highlights:getHighlights()};
  }catch(e){return {error:e.message};}finally{lock.releaseLock();}
}

function addHighlight(heading,url,desc){const lock=LockService.getScriptLock();lock.waitLock(10000);try{return addHighlightWrite(heading,url,desc);}finally{lock.releaseLock();}}
function deleteHighlight(index){const lock=LockService.getScriptLock();lock.waitLock(10000);try{return deleteHighlightWrite(index);}finally{lock.releaseLock();}}

function recordMemberLogin(member){
  try{const sheet=getSS().getSheetByName('Login_Logs');if(!sheet)return;const phone=cleanPhone(member[2]),rows=sheet.getDataRange().getValues();const index=rows.findIndex((r,i)=>i>0&&cleanPhone(r[0])===phone);if(index>0){sheet.getRange(index+1,3,1,2).setValues([[new Date(),Number(rows[index][3]||0)+1]]);}else sheet.appendRow([phone,member[1],new Date(),1]);}catch(e){Logger.log('Login statistics could not be updated');}
}

function reorderHighlights(order,version){
 const lock=LockService.getScriptLock();lock.waitLock(10000);
 try{
  const sheet=getSS().getSheetByName('Highlights');if(!sheet)throw new Error('Highlights sheet not found');
  const data=sheet.getDataRange().getValues().slice(1);
  if(version!==sha256(JSON.stringify(data)))throw new Error('Poster list changed. Refresh and try again.');
  const visible=data.map((r,i)=>({r:r,i:i})).filter(x=>String(x.r[1]||'').trim()!=='').map(x=>x.i);
  if(!Array.isArray(order)||order.length!==visible.length||new Set(order).size!==order.length||order.some(i=>!Number.isInteger(i)||!visible.includes(i)))throw new Error('Invalid poster order');
  const result=data.map(r=>r.slice());visible.forEach((slot,i)=>result[slot]=data[order[i]].slice());
  const width=Math.max.apply(null,data.map(r=>r.length));
  if(result.length)sheet.getRange(2,1,result.length,width).setValues(result.map(r=>Array.from({length:width},(_,i)=>r[i]===undefined?'':r[i])));
  SpreadsheetApp.flush();return {success:true,highlights:getHighlights()};
 }catch(e){return {error:e.message};}finally{lock.releaseLock();}
}
