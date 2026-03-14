const ALLOWED_ORIGINS = new Set([
    'https://bboman21.github.io',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'http://127.0.0.1:5175',
    'http://127.0.0.1:5176',
]);

const MAX_INQUIRY_LENGTH = 3000;
const FALLBACK_TO_EMAIL = 'bboman21@gmail.com';
const FALLBACK_FROM_EMAIL = 'onboarding@resend.dev';

function setCorsHeaders(req, res) {
    const requestOrigin = req.headers.origin;

    if (requestOrigin && ALLOWED_ORIGINS.has(requestOrigin)) {
        res.setHeader('Access-Control-Allow-Origin', requestOrigin);
        res.setHeader('Vary', 'Origin');
    }

    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function sendJson(res, statusCode, payload) {
    res.status(statusCode).json(payload);
}

function getRequestBody(req) {
    if (!req.body) {
        return {};
    }

    if (typeof req.body === 'string') {
        try {
            return JSON.parse(req.body);
        } catch {
            return null;
        }
    }

    return req.body;
}

function validatePayload(payload) {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!payload || typeof payload !== 'object') {
        return { code: 'INVALID_PAYLOAD', message: '잘못된 요청 본문입니다.' };
    }

    if (!payload.name?.trim()) {
        return { code: 'REQUIRED_NAME', message: '이름은 필수입니다.' };
    }

    if (!payload.country?.trim()) {
        return { code: 'REQUIRED_COUNTRY', message: '국가는 필수입니다.' };
    }

    if (!payload.companyName?.trim()) {
        return { code: 'REQUIRED_COMPANY_NAME', message: '회사명은 필수입니다.' };
    }

    if (!payload.email?.trim()) {
        return { code: 'REQUIRED_EMAIL', message: '이메일은 필수입니다.' };
    }

    if (!emailPattern.test(payload.email.trim())) {
        return { code: 'INVALID_EMAIL', message: '이메일 형식이 올바르지 않습니다.' };
    }

    if (!payload.inquiry?.trim()) {
        return { code: 'REQUIRED_INQUIRY', message: '문의 내용은 필수입니다.' };
    }

    if (payload.inquiry.length > MAX_INQUIRY_LENGTH) {
        return { code: 'INQUIRY_TOO_LONG', message: '문의 내용이 최대 길이를 초과했습니다.' };
    }

    return null;
}

function createSubject(companyName) {
    return `[HAGOBOGO] New Business Inquiry from ${companyName}`;
}

function createTextBody({ name, title, country, companyName, email, inquiry, language, submittedAt }) {
    const safeJobTitle = title?.trim() || '-';
    const safeCountry = country?.trim() || '-';
    const safeLanguage = language?.trim() || 'EN';
    const safeSubmittedAt = submittedAt?.trim() || new Date().toISOString();

    return [
        `Name: ${name.trim()}`,
        `Job Title: ${safeJobTitle}`,
        `Country: ${safeCountry}`,
        `Company Name: ${companyName.trim()}`,
        `Email: ${email.trim()}`,
        `Language: ${safeLanguage}`,
        `Submitted At: ${safeSubmittedAt}`,
        '',
        'Inquiry:',
        inquiry.trim(),
    ].join('\n');
}

async function sendInquiryMail(payload) {
    const env = globalThis.process?.env ?? {};
    const resendApiKey = env.RESEND_API_KEY;
    const toEmail = env.BUSINESS_INQUIRY_TO_EMAIL || FALLBACK_TO_EMAIL;
    const fromEmail = env.BUSINESS_INQUIRY_FROM_EMAIL || FALLBACK_FROM_EMAIL;

    if (!resendApiKey) {
        return {
            ok: false,
            status: 500,
            code: 'MISSING_RESEND_API_KEY',
            message: '메일 전송 환경 변수가 설정되지 않았습니다.',
        };
    }

    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            from: fromEmail,
            to: [toEmail],
            reply_to: payload.email.trim(),
            subject: createSubject(payload.companyName.trim()),
            text: createTextBody(payload),
        }),
    });

    if (!response.ok) {
        const responseText = await response.text().catch(() => '');

        return {
            ok: false,
            status: 502,
            code: 'RESEND_REQUEST_FAILED',
            message: responseText || '메일 발송 서비스 호출에 실패했습니다.',
        };
    }

    return {
        ok: true,
    };
}

export default async function handler(req, res) {
    setCorsHeaders(req, res);

    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }

    if (req.method !== 'POST') {
        return sendJson(res, 405, {
            ok: false,
            code: 'METHOD_NOT_ALLOWED',
            message: '허용되지 않은 요청 방식입니다.',
        });
    }

    const payload = getRequestBody(req);

    if (payload === null) {
        return sendJson(res, 400, {
            ok: false,
            code: 'INVALID_JSON',
            message: 'JSON 형식이 올바르지 않습니다.',
        });
    }

    const validationError = validatePayload(payload);
    if (validationError) {
        return sendJson(res, 400, {
            ok: false,
            ...validationError,
        });
    }

    try {
        const mailResult = await sendInquiryMail(payload);

        if (!mailResult.ok) {
            return sendJson(res, mailResult.status, {
                ok: false,
                code: mailResult.code,
                message: mailResult.message,
            });
        }

        return sendJson(res, 200, {
            ok: true,
            code: 'INQUIRY_SENT',
            message: '문의가 정상적으로 접수되었습니다.',
        });
    } catch {
        return sendJson(res, 500, {
            ok: false,
            code: 'UNEXPECTED_SERVER_ERROR',
            message: '서버 처리 중 예기치 않은 오류가 발생했습니다.',
        });
    }
}
