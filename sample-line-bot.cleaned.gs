/**
 * LINE Bot Google Apps Script Integration
 * Project Management System with Image Upload and Processing
 * 
 * WARNING: This file contains invisible Unicode characters that need to be cleaned!
 */

// Main webhook handler function
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    
    // Log the incoming webhook data
    console.log('Received LINE webhook data:', data);
    Logger.log('Processing webhook request');
    
    // Handle different event types
    data.events.forEach(event => {
      switch (event.type) {
        case 'message':
          handleMessage(event);
          break;
        case 'postback':
          handlePostback(event);
          break;
        default:
          Logger.log('Unhandled event type:', event.type);
      }
    });
    
    return ContentService
      .createTextOutput(JSON.stringify({status: 'success'}))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    Logger.log('Error in doPost:', error.toString());
    return ContentService
      .createTextOutput(JSON.stringify({status: 'error', message: error.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Handle incoming messages
function handleMessage(event) {
  const message = event.message;
  const userId = event.source.userId;
  
  Logger.log('Handling message from user:', userId);
  
  if (message.type === 'text') {
    handleTextMessage(event);
  } else if (message.type === 'image') {
    handleImageMessage(event);
  } else {
    Logger.log('Unsupported message type:', message.type);
  }
}

// Handle text messages for project lookup
function handleTextMessage(event) {
  const text = event.message.text.trim();
  const userId = event.source.userId;
  
  // Check if it's a project code
  if (isValidProjectCode(text)) {
    const projectInfo = lookupProject(text);
    
    if (projectInfo) {
      // Store project context for this user
      storeUserProject(userId, projectInfo);
      
      // Send confirmation message
      const replyMessage = {
        type: 'text',
        text: `✅ โปรเจค: ${projectInfo.name}\n📋 รหัส: ${text}\n📤 ส่งรูปภาพเพื่ออัพโหลดไฟล์`
      };
      
      replyToUser(event.replyToken, replyMessage);
    } else {
      // Project not found
      const errorMessage = {
        type: 'text',
        text: '❌ ไม่พบโปรเจคที่ระบุ กรุณาตรวจสอบรหัสโปรเจคอีกครั้ง'
      };
      
      replyToUser(event.replyToken, errorMessage);
    }
  } else {
    // Invalid project code format
    const helpMessage = {
      type: 'text',
      text: '📝 กรุณาส่งรหัสโปรเจคในรูปแบบที่ถูกต้อง\nตัวอย่าง: PRJ001, WK2024001'
    };
    
    replyToUser(event.replyToken, helpMessage);
  }
}

// Handle image messages for file upload
function handleImageMessage(event) {
  const userId = event.source.userId;
  const messageId = event.message.id;
  
  // Get user's current project context
  const userProject = getUserProject(userId);
  
  if (!userProject) {
    const errorMessage = {
      type: 'text',
      text: '❌ กรุณาระบุรหัสโปรเจคก่อนส่งรูปภาพ'
    };
    
    replyToUser(event.replyToken, errorMessage);
    return;
  }
  
  try {
    // Download image from LINE
    const imageBlob = downloadLineImage(messageId);
    
    // Upload to Google Drive
    const fileInfo = uploadToGoogleDrive(imageBlob, userProject);
    
    // Update spreadsheet records
    updateSpreadsheetRecord(userProject, fileInfo, userId);
    
    // Send confirmation
    const confirmMessage = {
      type: 'text',
      text: `✅ อัพโหลดสำเร็จ!\n📁 ไฟล์: ${fileInfo.name}\n📂 โฟลเดอร์: ${userProject.name}\n🔗 ลิงก์: ${fileInfo.url}`
    };
    
    replyToUser(event.replyToken, confirmMessage);
    
    // Process for PDF conversion if needed
    if (shouldConvertToPDF(fileInfo)) {
      convertImageToPDF(fileInfo, userProject);
    }
    
  } catch (error) {
    Logger.log('Error handling image:', error.toString());
    
    const errorMessage = {
      type: 'text',
      text: '❌ เกิดข้อผิดพลาดในการอัพโหลด กรุณาลองใหม่อีกครั้ง'
    };
    
    replyToUser(event.replyToken, errorMessage);
  }
}

// Project validation
function isValidProjectCode(code) {
  // Check project code format (e.g., PRJ001, WK2024001)
  const pattern = /^(PRJ|WK)\d{3,7}$/i;
  return pattern.test(code);
}

// Project lookup in master spreadsheet
function lookupProject(projectCode) {
  try {
    const masterSheet = SpreadsheetApp.openById(getScriptProperty('MASTER_SHEET_ID'));
    const projectSheet = masterSheet.getSheetByName('Projects');
    
    const data = projectSheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === projectCode.toUpperCase()) {
        return {
          code: data[i][0],
          name: data[i][1],
          driveId: data[i][2],
          rsSheetId: data[i][3],
          status: data[i][4]
        };
      }
    }
    
    return null;
  } catch (error) {
    Logger.log('Error looking up project:', error.toString());
    return null;
  }
}

// Store user project context
function storeUserProject(userId, projectInfo) {
  const props = PropertiesService.getScriptProperties();
  props.setProperty(`user_project_${userId}`, JSON.stringify(projectInfo));
}

// Get user project context
function getUserProject(userId) {
  try {
    const props = PropertiesService.getScriptProperties();
    const projectData = props.getProperty(`user_project_${userId}`);
    
    return projectData ? JSON.parse(projectData) : null;
  } catch (error) {
    Logger.log('Error getting user project:', error.toString());
    return null;
  }
}

// Download image from LINE servers
function downloadLineImage(messageId) {
  const token = getScriptProperty('LINE_CHANNEL_ACCESS_TOKEN');
  
  const response = UrlFetchApp.fetch(`https://api-data.line.me/v2/bot/message/${messageId}/content`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  return response.getBlob();
}

// Upload file to Google Drive
function uploadToGoogleDrive(blob, projectInfo) {
  try {
    const folder = DriveApp.getFolderById(projectInfo.driveId);
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${projectInfo.code}_${timestamp}.jpg`;
    
    blob.setName(filename);
    const file = folder.createFile(blob);
    
    return {
      id: file.getId(),
      name: file.getName(),
      url: file.getUrl(),
      size: file.getSize(),
      timestamp: new Date()
    };
  } catch (error) {
    Logger.log('Error uploading to Drive:', error.toString());
    throw error;
  }
}

// Update spreadsheet record
function updateSpreadsheetRecord(projectInfo, fileInfo, userId) {
  try {
    const rsSheet = SpreadsheetApp.openById(projectInfo.rsSheetId);
    const uploadSheet = rsSheet.getSheetByName('Uploads') || rsSheet.insertSheet('Uploads');
    
    // Add headers if sheet is empty
    if (uploadSheet.getLastRow() === 0) {
      uploadSheet.getRange(1, 1, 1, 7).setValues([[
        'วันที่', 'โปรเจค', 'ไฟล์', 'ขนาด', 'ลิงก์', 'ผู้อัพโหลด', 'สถานะ'
      ]]);
    }
    
    // Add new record
    const newRow = [
      fileInfo.timestamp,
      projectInfo.name,
      fileInfo.name,
      fileInfo.size,
      fileInfo.url,
      userId,
      'อัพโหลดสำเร็จ'
    ];
    
    uploadSheet.appendRow(newRow);
    
    // Validate working hours
    validateWorkingHours(uploadSheet, fileInfo.timestamp);
    
  } catch (error) {
    Logger.log('Error updating spreadsheet:', error.toString());
    throw error;
  }
}

// Working hours validation
function validateWorkingHours(sheet, timestamp) {
  const hour = timestamp.getHours();
  const isWeekend = timestamp.getDay() === 0 || timestamp.getDay() === 6;
  
  // Check if upload is outside working hours (8 AM - 6 PM, Mon-Fri)
  if (hour < 8 || hour > 18 || isWeekend) {
    const warningRow = sheet.getLastRow();
    sheet.getRange(warningRow, 7).setValue('อัพโหลดนอกเวลาทำงาน');
    sheet.getRange(warningRow, 7).setBackground('#FFF3CD');
  }
}

// PDF conversion for specific file types
function shouldConvertToPDF(fileInfo) {
  return getScriptProperty('AUTO_CONVERT_PDF') === 'true';
}

function convertImageToPDF(fileInfo, projectInfo) {
  try {
    // This would require additional setup for PDF conversion
    Logger.log('PDF conversion requested for:', fileInfo.name);
    
    // Placeholder for PDF conversion logic
    // Could use Google Apps Script's DriveApp or external services
    
  } catch (error) {
    Logger.log('Error in PDF conversion:', error.toString());
  }
}

// Reply to LINE user
function replyToUser(replyToken, message) {
  const token = getScriptProperty('LINE_CHANNEL_ACCESS_TOKEN');
  
  const payload = {
    replyToken: replyToken,
    messages: [message]
  };
  
  UrlFetchApp.fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    payload: JSON.stringify(payload)
  });
}

// Handle postback actions
function handlePostback(event) {
  const data = JSON.parse(event.postback.data);
  const userId = event.source.userId;
  
  Logger.log('Handling postback:', data);
  
  switch (data.action) {
    case 'confirm_upload':
      confirmUpload(event, data);
      break;
    case 'cancel_upload':
      cancelUpload(event, data);
      break;
    default:
      Logger.log('Unknown postback action:', data.action);
  }
}

// Utility to get script properties
function getScriptProperty(key) {
  return PropertiesService.getScriptProperties().getProperty(key);
}

// Push notification for upload confirmations (optional)
function sendUploadNotification(projectInfo, fileInfo, userId) {
  try {
    const adminUsers = getScriptProperty('ADMIN_USER_IDS').split(',');
    
    const notificationMessage = {
      type: 'text',
      text: `🔔 การแจ้งเตือนการอัพโหลด\n📋 โปรเจค: ${projectInfo.name}\n📁 ไฟล์: ${fileInfo.name}\n👤 ผู้อัพโหลด: ${userId}`
    };
    
    adminUsers.forEach(adminId => {
      pushMessageToUser(adminId.trim(), notificationMessage);
    });
    
  } catch (error) {
    Logger.log('Error sending notification:', error.toString());
  }
}

// Push message to specific user
function pushMessageToUser(userId, message) {
  const token = getScriptProperty('LINE_CHANNEL_ACCESS_TOKEN');
  
  const payload = {
    to: userId,
    messages: [message]
  };
  
  UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    payload: JSON.stringify(payload)
  });
}