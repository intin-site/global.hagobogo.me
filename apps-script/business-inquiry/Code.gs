const SHEET_NAME = 'Business Inquiries List';
const MAX_INQUIRY_LENGTH = 3000;
const SCRIPT_TIME_ZONE = 'Asia/Seoul';
const NOTIFICATION_EMAIL_PROPERTY_KEY = 'BUSINESS_INQUIRY_NOTIFICATION_EMAIL';
const ADMIN_PASSWORD_PROPERTY_KEY = 'ADMIN_PAGE_PASSWORD';
const DEFAULT_ADMIN_PASSWORD = '0000';
const SALES_COUNT_PROPERTY_KEY = 'SITE_SALES_COUNT';
const DOT_BLUE_RANGE_PROPERTY_KEY = 'SITE_DOT_BLUE_RANGE_JSON';
const TICKER_ITEMS_PROPERTY_KEY = 'SITE_TICKER_ITEMS_BY_LANGUAGE_JSON';
const DEFAULT_SALES_COUNT = 100000;
const DEFAULT_DOT_BLUE_RANGE = {
  min: 900,
  max: 1440
};
const SUPPORTED_LANGUAGES = ['EN', 'FR', 'ES', 'KR'];
const STATUS_HEADER_NAME = 'Status';
const DUPLICATE_SUBMISSION_WINDOW_SECONDS = 120;

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({
      ok: true,
      message: 'Business Inquiries Apps Script is running.'
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return createJsonResponse({
        ok: false,
        code: 'EMPTY_BODY',
        message: '요청 본문이 비어 있습니다.'
      });
    }

    const payload = JSON.parse(e.postData.contents);
    const adminActionResponse = handleAdminAction(payload);

    if (adminActionResponse) {
      return createJsonResponse(adminActionResponse);
    }

    const validationError = validatePayload(payload);
    const spamError = checkSpamRisk(payload);

    if (validationError) {
      return createJsonResponse(validationError);
    }

    if (spamError) {
      return createJsonResponse(spamError);
    }

    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);
    const submittedAt = parseSubmittedAt(payload.submittedAt);

    if (!sheet) {
      return createJsonResponse({
        ok: false,
        code: 'SHEET_NOT_FOUND',
        message: '대상 시트를 찾을 수 없습니다.'
      });
    }

    const statusColumnIndex = getStatusColumnIndex(sheet);

    // 시트에 데이터 추가
    sheet.appendRow([
      formatDateCell(submittedAt),
      formatTimeCell(submittedAt),
      payload.name.trim(),
      payload.title ? payload.title.trim() : '',
      payload.country.trim(),
      payload.companyName.trim(),
      payload.email.trim(),
      payload.inquiry.trim()
    ]);

    const savedRowIndex = sheet.getLastRow();
    const mailResult = sendNotificationEmail(payload, submittedAt);

    updateStatusCell(sheet, savedRowIndex, statusColumnIndex, mailResult.statusText);
    markSubmissionCache(payload);

    return createJsonResponse({
      ok: true,
      code: mailResult.ok ? 'INQUIRY_SAVED_AND_EMAILED' : 'INQUIRY_SAVED_BUT_EMAIL_FAILED',
      message: mailResult.ok
        ? '문의가 시트에 저장되었고 메일도 정상 발송되었습니다.'
        : '문의는 시트에 저장되었지만 메일 발송은 실패했습니다.',
      sheetSaved: true,
      emailSent: mailResult.ok,
      emailStatus: mailResult.statusText
    });
  } catch (error) {
    return createJsonResponse({
      ok: false,
      code: 'UNEXPECTED_ERROR',
      message: error && error.message ? error.message : '알 수 없는 오류가 발생했습니다.'
    });
  }
}

function handleAdminAction(payload) {
  if (!payload || !payload.action) {
    return null;
  }

  if (payload.action === 'GET_PUBLIC_SITE_SETTINGS') {
    return {
      ok: true,
      code: 'PUBLIC_SITE_SETTINGS_LOADED',
      siteSettings: getSiteSettings()
    };
  }

  if (!isValidAdminPassword(payload.adminPassword)) {
    return {
      ok: false,
      code: 'INVALID_ADMIN_PASSWORD',
      message: '관리자 비밀번호가 올바르지 않습니다.'
    };
  }

  if (payload.action === 'AUTHENTICATE_ADMIN') {
    return {
      ok: true,
      code: 'ADMIN_AUTHENTICATED',
      message: '관리자 인증에 성공했습니다.'
    };
  }

  if (payload.action === 'GET_ADMIN_SETTINGS') {
    return {
      ok: true,
      code: 'ADMIN_SETTINGS_LOADED',
      siteSettings: getSiteSettings()
    };
  }

  if (payload.action === 'SAVE_ADMIN_SETTINGS') {
    const validationError = validateSiteSettings(payload.siteSettings);

    if (validationError) {
      return validationError;
    }

    const savedSettings = saveSiteSettings(payload.siteSettings);

    return {
      ok: true,
      code: 'ADMIN_SETTINGS_SAVED',
      message: '관리자 설정을 저장했습니다.',
      siteSettings: savedSettings
    };
  }

  return {
    ok: false,
    code: 'UNKNOWN_ADMIN_ACTION',
    message: '알 수 없는 관리자 요청입니다.'
  };
}

/**
 * 관리자에게 새 문의 접수 알림 이메일을 발송합니다.
 */
function sendNotificationEmail(payload, submittedAt) {
  const notificationEmail = getNotificationEmail();

  if (!notificationEmail) {
    return {
      ok: false,
      statusText: '메일 발송 실패: 수신 이메일 설정이 없습니다.'
    };
  }

  const subject = `[HAGOBOGO] New Business Inquiry from ${payload.companyName}`;
  const formattedDate = Utilities.formatDate(submittedAt, SCRIPT_TIME_ZONE, 'yyyy-MM-dd HH:mm:ss');
  
  const body = `
    새로운 비즈니스 문의가 접수되었습니다.
    
    [접수 일시] ${formattedDate}
    [이름] ${payload.name}
    [직함] ${payload.title || 'N/A'}
    [국가] ${payload.country}
    [회사명] ${payload.companyName}
    [이메일] ${payload.email}
    
    [문의 내용]
    ${payload.inquiry}
    
    ---
    본 메일은 HAGOBOGO Business Inquiries 시스템에서 자동 발송되었습니다.
    구글 시트에서 상세 내용을 확인하세요.
  `;

  try {
    MailApp.sendEmail({
      to: notificationEmail,
      subject: subject,
      body: body
    });

    return {
      ok: true,
      statusText: '메일 발송 성공'
    };
  } catch (e) {
    console.error('이메일 발송 실패:', e.toString());

    return {
      ok: false,
      statusText: `메일 발송 실패: ${truncateStatusMessage(e && e.message ? e.message : e.toString())}`
    };
  }
}

function getNotificationEmail() {
  return PropertiesService
    .getScriptProperties()
    .getProperty(NOTIFICATION_EMAIL_PROPERTY_KEY);
}

function getSiteSettings() {
  return {
    notificationEmail: getNotificationEmail() || '',
    salesCount: getSalesCount(),
    dotBlueSpawnFrequencyRange: getDotBlueSpawnFrequencyRange(),
    tickerItemsByLanguage: getTickerItemsByLanguage()
  };
}

function saveSiteSettings(siteSettings) {
  const nextSettings = normalizeSiteSettings(siteSettings);
  const scriptProperties = PropertiesService.getScriptProperties();

  scriptProperties.setProperty(NOTIFICATION_EMAIL_PROPERTY_KEY, nextSettings.notificationEmail);
  scriptProperties.setProperty(SALES_COUNT_PROPERTY_KEY, String(nextSettings.salesCount));
  scriptProperties.setProperty(DOT_BLUE_RANGE_PROPERTY_KEY, JSON.stringify(nextSettings.dotBlueSpawnFrequencyRange));
  scriptProperties.setProperty(TICKER_ITEMS_PROPERTY_KEY, JSON.stringify(nextSettings.tickerItemsByLanguage));

  return nextSettings;
}

function getAdminPassword() {
  return PropertiesService
    .getScriptProperties()
    .getProperty(ADMIN_PASSWORD_PROPERTY_KEY) || DEFAULT_ADMIN_PASSWORD;
}

function isValidAdminPassword(value) {
  return typeof value === 'string' && value === getAdminPassword();
}

function isValidEmail(value) {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return typeof value === 'string' && emailPattern.test(value.trim());
}

function getSalesCount() {
  const rawValue = PropertiesService
    .getScriptProperties()
    .getProperty(SALES_COUNT_PROPERTY_KEY);
  const numericValue = Number(rawValue);

  if (Number.isFinite(numericValue) && numericValue >= 0) {
    return Math.floor(numericValue);
  }

  return DEFAULT_SALES_COUNT;
}

function getDotBlueSpawnFrequencyRange() {
  const rawValue = PropertiesService
    .getScriptProperties()
    .getProperty(DOT_BLUE_RANGE_PROPERTY_KEY);

  if (!rawValue) {
    return DEFAULT_DOT_BLUE_RANGE;
  }

  try {
    return normalizeDotBlueSpawnFrequencyRange(JSON.parse(rawValue));
  } catch (error) {
    console.error('Dot_blue 범위 설정 읽기 실패:', error.toString());
    return DEFAULT_DOT_BLUE_RANGE;
  }
}

function getTickerItemsByLanguage() {
  const rawValue = PropertiesService
    .getScriptProperties()
    .getProperty(TICKER_ITEMS_PROPERTY_KEY);

  if (!rawValue) {
    return createEmptyTickerItemsByLanguageMap();
  }

  try {
    return normalizeTickerItemsByLanguageMap(JSON.parse(rawValue));
  } catch (error) {
    console.error('뉴스 ticker 설정 읽기 실패:', error.toString());
    return createEmptyTickerItemsByLanguageMap();
  }
}

function createEmptyTickerItemsByLanguageMap() {
  const itemsByLanguage = {};

  for (let index = 0; index < SUPPORTED_LANGUAGES.length; index += 1) {
    itemsByLanguage[SUPPORTED_LANGUAGES[index]] = [];
  }

  return itemsByLanguage;
}

function normalizeTickerItemsByLanguageMap(value) {
  const nextItemsByLanguage = createEmptyTickerItemsByLanguageMap();

  if (!value || typeof value !== 'object') {
    return nextItemsByLanguage;
  }

  for (let index = 0; index < SUPPORTED_LANGUAGES.length; index += 1) {
    const language = SUPPORTED_LANGUAGES[index];
    const items = value[language];

    if (!Array.isArray(items)) {
      continue;
    }

    nextItemsByLanguage[language] = items.filter(function(item) {
      return typeof item === 'string';
    });
  }

  return nextItemsByLanguage;
}

function normalizeDotBlueSpawnFrequencyRange(value) {
  const min = Number(value && value.min);
  const max = Number(value && value.max);

  if (!Number.isFinite(min) || !Number.isFinite(max) || min <= 0 || max <= 0) {
    return DEFAULT_DOT_BLUE_RANGE;
  }

  return {
    min: Math.min(min, max),
    max: Math.max(min, max)
  };
}

function normalizeSiteSettings(siteSettings) {
  const notificationEmail = isValidEmail(siteSettings && siteSettings.notificationEmail)
    ? siteSettings.notificationEmail.trim()
    : '';
  const salesCount = Number(siteSettings && siteSettings.salesCount);

  return {
    notificationEmail: notificationEmail,
    salesCount: Number.isFinite(salesCount) && salesCount >= 0 ? Math.floor(salesCount) : DEFAULT_SALES_COUNT,
    dotBlueSpawnFrequencyRange: normalizeDotBlueSpawnFrequencyRange(siteSettings && siteSettings.dotBlueSpawnFrequencyRange),
    tickerItemsByLanguage: normalizeTickerItemsByLanguageMap(siteSettings && siteSettings.tickerItemsByLanguage)
  };
}

function validateSiteSettings(siteSettings) {
  if (!siteSettings || typeof siteSettings !== 'object') {
    return {
      ok: false,
      code: 'INVALID_SITE_SETTINGS',
      message: '저장할 관리자 설정 형식이 올바르지 않습니다.'
    };
  }

  if (siteSettings.notificationEmail && !isValidEmail(siteSettings.notificationEmail)) {
    return {
      ok: false,
      code: 'INVALID_NOTIFICATION_EMAIL',
      message: '알림 수신 메일 주소 형식이 올바르지 않습니다.'
    };
  }

  const salesCount = Number(siteSettings.salesCount);

  if (!Number.isFinite(salesCount) || salesCount < 0) {
    return {
      ok: false,
      code: 'INVALID_SALES_COUNT',
      message: '판매 수치는 0 이상의 숫자여야 합니다.'
    };
  }

  const normalizedDotBlueRange = normalizeDotBlueSpawnFrequencyRange(siteSettings.dotBlueSpawnFrequencyRange);

  if (!normalizedDotBlueRange || normalizedDotBlueRange.min <= 0 || normalizedDotBlueRange.max <= 0) {
    return {
      ok: false,
      code: 'INVALID_DOT_BLUE_RANGE',
      message: 'Dot_blue 발생 빈도는 1 이상의 숫자로 입력해야 합니다.'
    };
  }

  return null;
}

function getStatusColumnIndex(sheet) {
  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  const headerValues = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];

  for (let index = 0; index < headerValues.length; index += 1) {
    if (String(headerValues[index]).trim().toLowerCase() === STATUS_HEADER_NAME.toLowerCase()) {
      return index + 1;
    }
  }

  const newColumnIndex = lastColumn + 1;
  sheet.getRange(1, newColumnIndex).setValue(STATUS_HEADER_NAME);

  return newColumnIndex;
}

function updateStatusCell(sheet, rowIndex, columnIndex, statusText) {
  sheet.getRange(rowIndex, columnIndex).setValue(statusText);
}

function checkSpamRisk(payload) {
  const email = payload && payload.email ? payload.email.trim().toLowerCase() : '';

  if (!email) {
    return null;
  }

  const cache = CacheService.getScriptCache();
  const duplicateKey = `inquiry:${email}`;
  const recentSubmission = cache.get(duplicateKey);

  if (recentSubmission) {
    return {
      ok: false,
      code: 'TOO_MANY_REQUESTS',
      message: '같은 이메일로 너무 짧은 시간 안에 반복 접수되고 있습니다. 잠시 후 다시 시도해 주세요.'
    };
  }

  return null;
}

function markSubmissionCache(payload) {
  const email = payload && payload.email ? payload.email.trim().toLowerCase() : '';

  if (!email) {
    return;
  }

  CacheService
    .getScriptCache()
    .put(`inquiry:${email}`, '1', DUPLICATE_SUBMISSION_WINDOW_SECONDS);
}

function truncateStatusMessage(message) {
  if (!message) {
    return '알 수 없는 오류';
  }

  return String(message).replace(/\s+/g, ' ').trim().slice(0, 200);
}

function validatePayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return {
      ok: false,
      code: 'INVALID_PAYLOAD',
      message: '잘못된 요청 형식입니다.'
    };
  }

  if (!isNonEmptyString(payload.name)) {
    return {
      ok: false,
      code: 'REQUIRED_NAME',
      message: '이름은 필수입니다.'
    };
  }

  if (!isNonEmptyString(payload.country)) {
    return {
      ok: false,
      code: 'REQUIRED_COUNTRY',
      message: '국가는 필수입니다.'
    };
  }

  if (!isNonEmptyString(payload.companyName)) {
    return {
      ok: false,
      code: 'REQUIRED_COMPANY_NAME',
      message: '회사명은 필수입니다.'
    };
  }

  if (!isNonEmptyString(payload.email)) {
    return {
      ok: false,
      code: 'REQUIRED_EMAIL',
      message: '이메일은 필수입니다.'
    };
  }

  if (!isValidEmail(payload.email)) {
    return {
      ok: false,
      code: 'INVALID_EMAIL',
      message: '이메일 형식이 올바르지 않습니다.'
    };
  }

  if (!isNonEmptyString(payload.inquiry)) {
    return {
      ok: false,
      code: 'REQUIRED_INQUIRY',
      message: '문의 내용은 필수입니다.'
    };
  }

  if (payload.inquiry.length > MAX_INQUIRY_LENGTH) {
    return {
      ok: false,
      code: 'INQUIRY_TOO_LONG',
      message: '문의 내용이 최대 길이를 초과했습니다.'
    };
  }

  return null;
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function parseSubmittedAt(value) {
  if (!value) {
    return new Date();
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return new Date();
  }

  return parsedDate;
}

function formatDateCell(date) {
  return Utilities.formatDate(date, SCRIPT_TIME_ZONE, 'yyyy-MM-dd');
}

function formatTimeCell(date) {
  return Utilities.formatDate(date, SCRIPT_TIME_ZONE, 'HH:mm:ss');
}

function createJsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
