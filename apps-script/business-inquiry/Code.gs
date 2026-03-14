// 비즈니스 문의 저장, 관리자 설정 조회/저장, 알림 메일 발송에 공통으로 쓰는 기본 설정값입니다.
const SHEET_NAME = 'Business Inquiries List';
const MAX_INQUIRY_LENGTH = 3000;
const SCRIPT_TIME_ZONE = 'Asia/Seoul';
const NOTIFICATION_EMAIL_PROPERTY_KEY = 'BUSINESS_INQUIRY_NOTIFICATION_EMAIL';
const ADMIN_PASSWORD_PROPERTY_KEY = 'ADMIN_PAGE_PASSWORD';
const DEFAULT_ADMIN_PASSWORD = '0000';
const SALES_COUNT_PROPERTY_KEY = 'SITE_SALES_COUNT';
const DOT_BLUE_RANGE_PROPERTY_KEY = 'SITE_DOT_BLUE_RANGE_JSON';
const TICKER_ITEMS_PROPERTY_KEY = 'SITE_TICKER_ITEMS_BY_LANGUAGE_JSON';
const SITE_SETTINGS_UPDATED_AT_PROPERTY_KEY = 'SITE_SETTINGS_UPDATED_AT';
const DEFAULT_SALES_COUNT = 100000;
const DEFAULT_DOT_BLUE_RANGE = {
  min: 900,
  max: 1440
};
const SUPPORTED_LANGUAGES = ['EN', 'FR', 'ES', 'KR'];
const BUSINESS_INQUIRIES_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1_ubB52DuzvOOfW3RQ6vuoKrwG6oAozwldMOyshWPePw/edit?gid=0#gid=0';
const STATUS_HEADER_NAME = 'Status';
const DUPLICATE_SUBMISSION_WINDOW_SECONDS = 120;
const SCRIPT_LOCK_WAIT_TIMEOUT_MS = 10000;
const SHEET_TEXT_NUMBER_FORMAT = '@STRING@';

function doGet() {
  // 웹앱이 살아 있는지 간단히 확인할 수 있는 상태 확인 응답입니다.
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

    // 프런트에서 보낸 JSON 본문을 해석해 관리자 요청인지 일반 문의인지 먼저 구분합니다.
    const payload = JSON.parse(e.postData.contents);
    const adminActionResponse = handleAdminAction(payload);

    if (adminActionResponse) {
      return createJsonResponse(adminActionResponse);
    }

    // 일반 문의 요청은 입력값 검증과 짧은 시간 내 중복 접수 여부를 먼저 검사합니다.
    const validationError = validatePayload(payload);
    const spamError = checkSpamRisk(payload);

    if (validationError) {
      return createJsonResponse(validationError);
    }

    if (spamError) {
      return createJsonResponse(spamError);
    }

    // 검증을 통과한 문의는 지정한 시트에 행 단위로 저장합니다.
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

    const savedRowIndex = runWithScriptLock(function() {
      const statusColumnIndex = getStatusColumnIndex(sheet);
      const inquiryRowValues = [[
        formatDateCell(submittedAt),
        formatTimeCell(submittedAt),
        sanitizeSheetCellValue(payload.name),
        sanitizeSheetCellValue(payload.title ? payload.title.trim() : ''),
        sanitizeSheetCellValue(payload.country),
        sanitizeSheetCellValue(payload.companyName),
        sanitizeSheetCellValue(payload.email),
        sanitizeSheetCellValue(payload.inquiry)
      ]];
      const nextRowIndex = sheet.getLastRow() + 1;
      const inquiryRange = sheet.getRange(nextRowIndex, 1, 1, inquiryRowValues[0].length);

      // 수식 인젝션을 막기 위해 저장 전에 대상 셀 전체를 텍스트 형식으로 고정한 뒤 값을 씁니다.
      inquiryRange.setNumberFormat(SHEET_TEXT_NUMBER_FORMAT);
      inquiryRange.setValues(inquiryRowValues);

      return {
        rowIndex: nextRowIndex,
        statusColumnIndex: statusColumnIndex
      };
    });

    // 저장 직후 관리자 알림 메일을 보내고, 결과를 Status 열에 함께 남깁니다.
    const mailResult = sendNotificationEmail(payload, submittedAt);

    runWithScriptLock(function() {
      updateStatusCell(sheet, savedRowIndex.rowIndex, savedRowIndex.statusColumnIndex, mailResult.statusText);
    });
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

  // 공개 설정 조회는 로그인 없이 메인 페이지가 읽을 수 있도록 별도 허용합니다.
  if (payload.action === 'GET_PUBLIC_SITE_SETTINGS') {
    return {
      ok: true,
      code: 'PUBLIC_SITE_SETTINGS_LOADED',
      siteSettings: getSiteSettings()
    };
  }

  // 그 외 관리자 요청은 모두 Script Properties의 관리자 비밀번호 검증을 통과해야 합니다.
  if (!isValidAdminPassword(payload.adminPassword)) {
    return {
      ok: false,
      code: 'INVALID_ADMIN_PASSWORD',
      message: '관리자 비밀번호가 올바르지 않습니다.'
    };
  }

  // 관리자 로그인 화면에서 비밀번호만 검증할 때 쓰는 응답입니다.
  if (payload.action === 'AUTHENTICATE_ADMIN') {
    return {
      ok: true,
      code: 'ADMIN_AUTHENTICATED',
      message: '관리자 인증에 성공했습니다.'
    };
  }

  // 관리자 페이지 진입 직후 전체 사이트 설정을 한 번에 불러옵니다.
  if (payload.action === 'GET_ADMIN_SETTINGS') {
    return {
      ok: true,
      code: 'ADMIN_SETTINGS_LOADED',
      siteSettings: getSiteSettings()
    };
  }

  // 관리자 페이지에서 수정한 사이트 공용 설정을 한 번에 저장합니다.
  if (payload.action === 'SAVE_ADMIN_SETTINGS') {
    const validationError = validateSiteSettingsPatch(payload.siteSettingsPatch);

    if (validationError) {
      return validationError;
    }

    const savedSettings = saveSiteSettings(payload.siteSettingsPatch);

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
  // 링크를 지원하지 않는 메일 환경도 고려해 평문 본문을 함께 유지합니다.
  const body = [
    '새로운 비즈니스 문의가 접수되었습니다.',
    '',
    `[접수 일시] ${formattedDate}`,
    `[이름] ${payload.name}`,
    `[직함] ${payload.title || 'N/A'}`,
    `[국가] ${payload.country}`,
    `[회사명] ${payload.companyName}`,
    `[이메일] ${payload.email}`,
    '',
    '[문의 내용]',
    payload.inquiry,
    '',
    '---',
    '본 메일은 HAGOBOGO Business Inquiries 시스템에서 자동 발송되었습니다.',
    `구글 시트에서 상세 내용을 확인하세요: ${BUSINESS_INQUIRIES_SHEET_URL}`
  ].join('\n');
  // 일반 메일 클라이언트에서는 HTML 본문을 보여주므로 구글 시트 바로가기 링크를 함께 넣습니다.
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.7; color: #333333;">
      <p>새로운 비즈니스 문의가 접수되었습니다.</p>
      <p>
        [접수 일시] <span style="color: #4a86e8;">${escapeHtml(formattedDate)}</span><br />
        [이름] ${escapeHtml(payload.name)}<br />
        [직함] ${escapeHtml(payload.title || 'N/A')}<br />
        [국가] ${escapeHtml(payload.country)}<br />
        [회사명] ${escapeHtml(payload.companyName)}<br />
        [이메일] ${escapeHtml(payload.email)}
      </p>
      <p>[문의 내용]</p>
      <p>${escapeHtml(payload.inquiry).replace(/\n/g, '<br />')}</p>
      <p>---</p>
      <p>
        본 메일은
        <a href="${BUSINESS_INQUIRIES_SHEET_URL}" target="_blank" rel="noreferrer">HAGOBOGO Business Inquiries</a>
        시스템에서 자동 발송되었습니다.<br />
        구글 시트에서 상세 내용을 확인하세요.
      </p>
    </div>
  `;

  try {
    MailApp.sendEmail({
      to: notificationEmail,
      subject: subject,
      body: body,
      htmlBody: htmlBody
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
  // 문의 알림을 받을 메일 주소는 Script Properties에서 읽습니다.
  return PropertiesService
    .getScriptProperties()
    .getProperty(NOTIFICATION_EMAIL_PROPERTY_KEY);
}

function getSiteSettings() {
  // 메인 페이지와 관리자 페이지가 함께 쓰는 공용 설정 묶음을 구성합니다.
  return {
    notificationEmail: getNotificationEmail() || '',
    salesCount: getSalesCount(),
    dotBlueSpawnFrequencyRange: getDotBlueSpawnFrequencyRange(),
    tickerItemsByLanguage: getTickerItemsByLanguage(),
    updatedAt: getSiteSettingsUpdatedAt()
  };
}

function saveSiteSettings(siteSettings) {
  // 관리자 화면에서 전달한 변경 항목만 현재 설정과 병합해 저장합니다.
  return runWithScriptLock(function() {
    const currentSettings = getSiteSettings();
    const nextSettings = mergeSiteSettings(currentSettings, normalizeSiteSettingsPatch(siteSettings));
    const scriptProperties = PropertiesService.getScriptProperties();
    const updatedAt = new Date().toISOString();

    // 여러 설정값을 한 번에 기록해 저장 중 일부만 반영되는 반쪽 상태를 막습니다.
    scriptProperties.setProperties({
      [NOTIFICATION_EMAIL_PROPERTY_KEY]: nextSettings.notificationEmail,
      [SALES_COUNT_PROPERTY_KEY]: String(nextSettings.salesCount),
      [DOT_BLUE_RANGE_PROPERTY_KEY]: JSON.stringify(nextSettings.dotBlueSpawnFrequencyRange),
      [TICKER_ITEMS_PROPERTY_KEY]: JSON.stringify(nextSettings.tickerItemsByLanguage),
      [SITE_SETTINGS_UPDATED_AT_PROPERTY_KEY]: updatedAt
    });

    return mergeSiteSettings(nextSettings, {
      updatedAt: updatedAt
    });
  });
}

function runWithScriptLock(callback) {
  // 공유 데이터 변경 구간은 전역 잠금을 걸어 동시에 수정되어 값이 섞이지 않게 보호합니다.
  const lock = LockService.getScriptLock();

  if (!lock.tryLock(SCRIPT_LOCK_WAIT_TIMEOUT_MS)) {
    throw new Error('잠시 다른 요청을 처리 중입니다. 잠시 후 다시 시도해 주세요.');
  }

  try {
    return callback();
  } finally {
    lock.releaseLock();
  }
}

function getAdminPassword() {
  // 관리자 비밀번호를 Script Properties에서 읽고, 없으면 기본값으로 동작합니다.
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

function escapeHtml(value) {
  // HTML 메일 본문에 사용자 입력값이 그대로 들어갈 때 마크업 깨짐을 막습니다.
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getSalesCount() {
  // 판매 카운터 기준값은 숫자로 읽고, 이상한 값이면 기본값으로 되돌립니다.
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
  // Dot_blue 발생 빈도는 JSON 문자열로 저장해 두었다가 범위 객체로 복원합니다.
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
  // 뉴스 ticker는 언어별 배열 묶음으로 저장되어 메인 페이지에서 그대로 사용됩니다.
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

function getSiteSettingsUpdatedAt() {
  // 마지막 관리자 저장 시각은 여러 브라우저 동기화 상태 확인에 함께 사용합니다.
  return PropertiesService
    .getScriptProperties()
    .getProperty(SITE_SETTINGS_UPDATED_AT_PROPERTY_KEY) || '';
}

function createEmptyTickerItemsByLanguageMap() {
  // 언어별 데이터가 없을 때도 화면 로직이 깨지지 않도록 빈 구조를 먼저 만듭니다.
  const itemsByLanguage = {};

  for (let index = 0; index < SUPPORTED_LANGUAGES.length; index += 1) {
    itemsByLanguage[SUPPORTED_LANGUAGES[index]] = [];
  }

  return itemsByLanguage;
}

function normalizeTickerItemsByLanguageMap(value) {
  // Script Properties에서 읽은 ticker 데이터를 언어별 문자열 배열만 남기도록 정리합니다.
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
  // 최소/최대 값 순서가 바뀌어 들어와도 저장 전에 정상 범위로 보정합니다.
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

function normalizeSiteSettingsPatch(siteSettings) {
  // 관리자 화면에서 전달한 변경 항목만 저장 가능한 공통 형식으로 맞춥니다.
  const normalizedPatch = {};

  if (!siteSettings || typeof siteSettings !== 'object') {
    return normalizedPatch;
  }

  if (Object.prototype.hasOwnProperty.call(siteSettings, 'notificationEmail')) {
    normalizedPatch.notificationEmail = typeof siteSettings.notificationEmail === 'string'
      ? siteSettings.notificationEmail.trim()
      : '';
  }

  if (Object.prototype.hasOwnProperty.call(siteSettings, 'salesCount')) {
    normalizedPatch.salesCount = Math.floor(Number(siteSettings.salesCount));
  }

  if (Object.prototype.hasOwnProperty.call(siteSettings, 'dotBlueSpawnFrequencyRange')) {
    normalizedPatch.dotBlueSpawnFrequencyRange = normalizeDotBlueSpawnFrequencyRange(siteSettings.dotBlueSpawnFrequencyRange);
  }

  if (Object.prototype.hasOwnProperty.call(siteSettings, 'tickerItemsByLanguage')) {
    normalizedPatch.tickerItemsByLanguage = normalizeTickerItemsByLanguageMap(siteSettings.tickerItemsByLanguage);
  }

  return normalizedPatch;
}

function mergeSiteSettings(baseSettings, patchSettings) {
  // 부분 저장 패치를 현재 설정 위에 덮어써 최종 저장값을 만듭니다.
  return {
    notificationEmail: Object.prototype.hasOwnProperty.call(patchSettings, 'notificationEmail')
      ? patchSettings.notificationEmail
      : baseSettings.notificationEmail,
    salesCount: Object.prototype.hasOwnProperty.call(patchSettings, 'salesCount')
      ? patchSettings.salesCount
      : baseSettings.salesCount,
    dotBlueSpawnFrequencyRange: Object.prototype.hasOwnProperty.call(patchSettings, 'dotBlueSpawnFrequencyRange')
      ? patchSettings.dotBlueSpawnFrequencyRange
      : baseSettings.dotBlueSpawnFrequencyRange,
    tickerItemsByLanguage: Object.prototype.hasOwnProperty.call(patchSettings, 'tickerItemsByLanguage')
      ? patchSettings.tickerItemsByLanguage
      : baseSettings.tickerItemsByLanguage,
    updatedAt: Object.prototype.hasOwnProperty.call(patchSettings, 'updatedAt')
      ? patchSettings.updatedAt
      : baseSettings.updatedAt
  };
}

function validateSiteSettingsPatch(siteSettings) {
  // 관리자 설정 부분 저장 전에 전달된 항목만 형식을 점검합니다.
  if (!siteSettings || typeof siteSettings !== 'object') {
    return {
      ok: false,
      code: 'INVALID_SITE_SETTINGS',
      message: '저장할 관리자 설정 형식이 올바르지 않습니다.'
    };
  }

  if (
    Object.prototype.hasOwnProperty.call(siteSettings, 'notificationEmail')
    && siteSettings.notificationEmail
    && !isValidEmail(siteSettings.notificationEmail)
  ) {
    return {
      ok: false,
      code: 'INVALID_NOTIFICATION_EMAIL',
      message: '알림 수신 메일 주소 형식이 올바르지 않습니다.'
    };
  }

  if (Object.prototype.hasOwnProperty.call(siteSettings, 'salesCount')) {
    const salesCount = Number(siteSettings.salesCount);

    if (!Number.isFinite(salesCount) || salesCount < 0) {
      return {
        ok: false,
        code: 'INVALID_SALES_COUNT',
        message: '판매 수치는 0 이상의 숫자여야 합니다.'
      };
    }
  }

  if (Object.prototype.hasOwnProperty.call(siteSettings, 'dotBlueSpawnFrequencyRange')) {
    const dotBlueRange = siteSettings.dotBlueSpawnFrequencyRange;

    if (!dotBlueRange || typeof dotBlueRange !== 'object') {
      return {
        ok: false,
        code: 'INVALID_DOT_BLUE_RANGE',
        message: 'Dot_blue 발생 빈도 형식이 올바르지 않습니다.'
      };
    }

    const min = Number(dotBlueRange.min);
    const max = Number(dotBlueRange.max);

    if (!Number.isFinite(min) || !Number.isFinite(max) || min <= 0 || max <= 0) {
      return {
        ok: false,
        code: 'INVALID_DOT_BLUE_RANGE',
        message: 'Dot_blue 발생 빈도는 1 이상의 숫자로 입력해야 합니다.'
      };
    }

    if (min > max) {
      return {
        ok: false,
        code: 'INVALID_DOT_BLUE_RANGE_ORDER',
        message: 'Dot_blue 최소값은 최대값보다 클 수 없습니다.'
      };
    }
  }

  if (Object.prototype.hasOwnProperty.call(siteSettings, 'tickerItemsByLanguage')) {
    if (!siteSettings.tickerItemsByLanguage || typeof siteSettings.tickerItemsByLanguage !== 'object') {
      return {
        ok: false,
        code: 'INVALID_TICKER_ITEMS',
        message: '뉴스 ticker 형식이 올바르지 않습니다.'
      };
    }
  }

  return null;
}

function getStatusColumnIndex(sheet) {
  // 상태 기록 열이 없으면 자동으로 새로 만들어 메일 발송 결과를 남길 수 있게 합니다.
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
  // 같은 문의 내용이 너무 짧은 시간 안에 반복 접수되면 임시로 차단합니다.
  const submissionFingerprint = createSubmissionFingerprint(payload);

  if (!submissionFingerprint) {
    return null;
  }

  const cache = CacheService.getScriptCache();
  const duplicateKey = `inquiry:${submissionFingerprint}`;
  const recentSubmission = cache.get(duplicateKey);

  if (recentSubmission) {
    return {
      ok: false,
      code: 'TOO_MANY_REQUESTS',
      message: '같은 문의 내용이 너무 짧은 시간 안에 반복 접수되고 있습니다. 잠시 후 다시 시도해 주세요.'
    };
  }

  return null;
}

function markSubmissionCache(payload) {
  // 방금 접수된 문의 지문을 캐시에 기록해 완전히 같은 문의의 반복 접수를 잠시 막습니다.
  const submissionFingerprint = createSubmissionFingerprint(payload);

  if (!submissionFingerprint) {
    return;
  }

  CacheService
    .getScriptCache()
    .put(`inquiry:${submissionFingerprint}`, '1', DUPLICATE_SUBMISSION_WINDOW_SECONDS);
}

function createSubmissionFingerprint(payload) {
  // 이메일만으로 사용자를 막지 않도록 핵심 입력값을 합친 동일 문의 지문을 만듭니다.
  if (!payload || typeof payload !== 'object') {
    return '';
  }

  const name = normalizeSubmissionFingerprintValue(payload.name);
  const companyName = normalizeSubmissionFingerprintValue(payload.companyName);
  const email = normalizeSubmissionFingerprintValue(payload.email);
  const inquiry = normalizeSubmissionFingerprintValue(payload.inquiry);

  if (!name || !companyName || !email || !inquiry) {
    return '';
  }

  return [name, companyName, email, inquiry].join('||');
}

function normalizeSubmissionFingerprintValue(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function sanitizeSheetCellValue(value) {
  // 시트가 사용자 입력을 수식으로 해석하지 않도록 위험한 시작 문자는 텍스트로 고정합니다.
  const normalizedValue = typeof value === 'string' ? value.trim() : '';

  if (!normalizedValue) {
    return '';
  }

  return /^[=+\-@]/.test(normalizedValue) ? `'${normalizedValue}` : normalizedValue;
}

function truncateStatusMessage(message) {
  if (!message) {
    return '알 수 없는 오류';
  }

  return String(message).replace(/\s+/g, ' ').trim().slice(0, 200);
}

function validatePayload(payload) {
  // 일반 비즈니스 문의 본문에서 실제 저장에 필요한 필수 항목을 확인합니다.
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
  // 프런트에서 전달한 접수 시각이 비어 있거나 잘못되면 서버 현재 시각으로 대체합니다.
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
  // Apps Script 웹앱 응답을 프런트에서 읽기 쉬운 JSON 문자열로 통일합니다.
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
