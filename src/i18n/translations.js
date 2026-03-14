export const DEFAULT_LANGUAGE = 'EN';

export const LANGUAGE_OPTIONS = ['EN', 'ES', 'FR', 'KR'];

export const TRANSLATIONS = {
    EN: {
        salesCounter: {
            titleLineTop: 'HAGOBOGO & HAGOBOGO PRO',
            titleLineBottom: 'Cumulative Sales Volume',
            sinceText: 'Since 2025',
        },
        ctas: {
            businessInquiries: 'Business Inquiries',
            chatbot: 'Chatbot',
        },
        chatbotPanel: {
            title: 'HAGOBOGO Assistant',
            intro: 'What would you like to know? Choose a frequently asked question below.',
            emptyState: 'Pick one of the questions below to see a short answer and move naturally into the next step.',
            labels: {
                answer: 'Quick Answer',
                recommended: 'Recommended Start',
            },
            buttons: {
                close: 'Close chatbot',
                businessInquiries: 'Business Inquiries',
                viewProposal: 'View Proposal',
                otherQuestions: 'Other Questions',
            },
        },
        inquiryModal: {
            title: 'Business Inquiries',
            fields: {
                name: 'Name',
                title: 'Job Title',
                country: 'Country',
                countryPlaceholder: 'Select Country',
                companyName: 'Company Name',
                email: 'Email',
                inquiry: 'Inquiry',
            },
            buttons: {
                close: 'Close popup',
                cancel: 'Cancel',
                save: 'Save',
                saving: 'Saving...',
            },
            errors: {
                required: 'Required field',
                invalidEmail: 'Not an email format',
            },
            submit: {
                success: 'Your inquiry has been submitted successfully.',
                failure: 'Failed to send inquiry. Please try again later.',
                missingApiUrl: 'The Apps Script URL is not configured.',
                sheetNotFound: 'The target Google Sheets tab could not be found.',
                networkFailure: 'A network error occurred while sending the inquiry.',
                invalidResponse: 'Apps Script returned an invalid response.',
            },
        },
        ticker: [
            "Service Advancement: Intin's 'HAGOBOGO' app has significantly enhanced digital healthcare accessibility by introducing its 2.0 update, featuring user-engaging contents such as a sperm encyclopedia and quiz games.",
            "Growing Market Demand: As interest in male infertility prevention and self-health management rises, the 'HAGOBOGO' self-testing kit is gaining significant attention as an essential health appliance for newlyweds and single-person households.",
            "Global Expansion: Building on its domestic success, 'HAGOBOGO' is expanding its presence as a mobile-based reproductive health monitoring solution by launching a global dedicated app for international users.",
        ],
        footer: [
            'ⓒ 2026 INTIN Inc. All rights reserved.',
            'Company Name Representative: Kim Ji-hoon, CEO of INTIN Inc.',
            'Location: 52 Cheombok-ro, Dong-gu, Daegu',
            'Business Registration Number: 108-81-90649 | Mail-Order Sales Registration Number: No. 2018-Daegu Dong-gu-0025',
            'Contact: help@intin.kr',
        ],
    },
    ES: {
        salesCounter: {
            titleLineTop: 'HAGOBOGO & HAGOBOGO PRO',
            titleLineBottom: 'Volumen Acumulado de Ventas',
            sinceText: 'Desde 2025',
        },
        ctas: {
            businessInquiries: 'Consultas Comerciales',
            chatbot: 'Asistente Virtual',
        },
        chatbotPanel: {
            title: 'Asistente HAGOBOGO',
            intro: 'Que le gustaria saber? Seleccione abajo una pregunta frecuente.',
            emptyState: 'Seleccione una de las preguntas para ver una respuesta breve y avanzar naturalmente al siguiente paso.',
            labels: {
                answer: 'Respuesta Rapida',
                recommended: 'Inicio Recomendado',
            },
            buttons: {
                close: 'Cerrar asistente',
                businessInquiries: 'Consultas Comerciales',
                viewProposal: 'Ver Propuesta',
                otherQuestions: 'Otras Preguntas',
            },
        },
        inquiryModal: {
            title: 'Consultas Comerciales',
            fields: {
                name: 'Nombre',
                title: 'Cargo',
                country: 'País',
                countryPlaceholder: 'Seleccione un país',
                companyName: 'Nombre de la Empresa',
                email: 'Correo Electrónico',
                inquiry: 'Consulta',
            },
            buttons: {
                close: 'Cerrar ventana',
                cancel: 'Cancelar',
                save: 'Guardar',
                saving: 'Guardando...',
            },
            errors: {
                required: 'Campo obligatorio',
                invalidEmail: 'Formato de correo no válido',
            },
            submit: {
                success: 'Su consulta se ha enviado correctamente.',
                failure: 'No se pudo enviar la consulta. Inténtelo de nuevo más tarde.',
                missingApiUrl: 'La URL de Apps Script no está configurada.',
                sheetNotFound: 'No se encontró la pestaña objetivo de Google Sheets.',
                networkFailure: 'Se produjo un error de red al enviar la consulta.',
                invalidResponse: 'Apps Script devolvió una respuesta no válida.',
            },
        },
        ticker: [
            "Avance del servicio: La aplicación 'HAGOBOGO' de Intin ha mejorado significativamente la accesibilidad de la salud digital con su actualización 2.0, incorporando contenidos atractivos como una enciclopedia del esperma y juegos de preguntas.",
            "Crecimiento de la demanda del mercado: A medida que aumenta el interés por la prevención de la infertilidad masculina y el autocuidado, el kit de autoevaluación 'HAGOBOGO' está ganando gran atención como dispositivo de salud esencial para recién casados y hogares unipersonales.",
            "Expansión global: Basándose en su éxito nacional, 'HAGOBOGO' amplía su presencia como solución móvil de monitoreo de la salud reproductiva mediante el lanzamiento de una aplicación global dedicada para usuarios internacionales.",
        ],
        footer: [
            'ⓒ 2026 INTIN Inc. Todos los derechos reservados.',
            'Nombre de la empresa y representante: Kim Ji-hoon, director ejecutivo de INTIN Inc.',
            'Ubicación: 52 Cheombok-ro, Dong-gu, Daegu',
            'Número de registro comercial: 108-81-90649 | Número de registro de venta por correo: No. 2018-Daegu Dong-gu-0025',
            'Contacto: help@intin.kr',
        ],
    },
    FR: {
        salesCounter: {
            titleLineTop: 'HAGOBOGO & HAGOBOGO PRO',
            titleLineBottom: 'Volume de Ventes Cumulées',
            sinceText: 'Depuis 2025',
        },
        ctas: {
            businessInquiries: 'Demandes Commerciales',
            chatbot: 'Assistant Virtuel',
        },
        chatbotPanel: {
            title: 'Assistant HAGOBOGO',
            intro: 'Que souhaitez-vous savoir ? Selectionnez ci-dessous une question frequente.',
            emptyState: 'Choisissez une question pour voir une reponse courte et passer naturellement a l etape suivante.',
            labels: {
                answer: 'Reponse Rapide',
                recommended: 'Point de Depart Recommande',
            },
            buttons: {
                close: 'Fermer l assistant',
                businessInquiries: 'Demandes Commerciales',
                viewProposal: 'Voir la Proposition',
                otherQuestions: 'Autres Questions',
            },
        },
        inquiryModal: {
            title: 'Demandes Commerciales',
            fields: {
                name: 'Nom',
                title: 'Intitulé du Poste',
                country: 'Pays',
                countryPlaceholder: 'Sélectionnez un pays',
                companyName: "Nom de l'Entreprise",
                email: 'E-mail',
                inquiry: 'Demande',
            },
            buttons: {
                close: 'Fermer la fenêtre',
                cancel: 'Annuler',
                save: 'Enregistrer',
                saving: 'Enregistrement...',
            },
            errors: {
                required: 'Champ requis',
                invalidEmail: "Format d'e-mail invalide",
            },
            submit: {
                success: 'Votre demande a bien été envoyée.',
                failure: 'Échec de l’envoi de la demande. Veuillez réessayer plus tard.',
                missingApiUrl: "L'URL Apps Script n'est pas configurée.",
                sheetNotFound: "L'onglet Google Sheets cible est introuvable.",
                networkFailure: "Une erreur réseau s'est produite lors de l'envoi de la demande.",
                invalidResponse: "Apps Script a renvoyé une réponse non valide.",
            },
        },
        ticker: [
            "Avancée du service : l'application 'HAGOBOGO' d'Intin a considérablement amélioré l'accessibilité aux soins de santé numériques grâce à sa mise à jour 2.0, avec des contenus engageants tels qu'une encyclopédie du sperme et des quiz.",
            "Croissance de la demande du marché : avec l'intérêt croissant pour la prévention de l'infertilité masculine et l'autogestion de la santé, le kit d'auto-test 'HAGOBOGO' attire fortement l'attention comme appareil de santé essentiel pour les jeunes mariés et les foyers d'une seule personne.",
            "Expansion mondiale : fort de son succès national, 'HAGOBOGO' étend sa présence comme solution mobile de suivi de la santé reproductive en lançant une application mondiale dédiée aux utilisateurs internationaux.",
        ],
        footer: [
            'ⓒ 2026 INTIN Inc. Tous droits réservés.',
            "Nom de l'entreprise et représentant : Kim Ji-hoon, PDG d'INTIN Inc.",
            'Adresse : 52 Cheombok-ro, Dong-gu, Daegu',
            'Numéro d’immatriculation commerciale : 108-81-90649 | Numéro d’enregistrement de vente à distance : No. 2018-Daegu Dong-gu-0025',
            'Contact : help@intin.kr',
        ],
    },
    KR: {
        salesCounter: {
            titleLineTop: 'HAGOBOGO & HAGOBOGO PRO',
            titleLineBottom: '누적 판매량',
            sinceText: '2025년부터',
        },
        ctas: {
            businessInquiries: '비즈니스 문의',
            chatbot: '챗봇',
        },
        chatbotPanel: {
            title: 'HAGOBOGO Assistant',
            intro: '무엇이 궁금하신가요? 아래 자주 묻는 질문을 선택해 주세요.',
            emptyState: '아래 질문 중 하나를 선택하면 짧은 답변을 보고 다음 단계로 자연스럽게 이동할 수 있습니다.',
            labels: {
                answer: '빠른 답변',
                recommended: '추천 시작점',
            },
            buttons: {
                close: '챗봇 닫기',
                businessInquiries: '비즈니스 문의',
                viewProposal: '제안서 보기',
                otherQuestions: '다른 질문 보기',
            },
        },
        inquiryModal: {
            title: '비즈니스 문의',
            fields: {
                name: '이름',
                title: '직함',
                country: '국가',
                countryPlaceholder: '국가를 선택하세요',
                companyName: '회사명',
                email: '이메일',
                inquiry: '문의 내용',
            },
            buttons: {
                close: '팝업 닫기',
                cancel: '취소',
                save: '저장',
                saving: '전송 중...',
            },
            errors: {
                required: '필수 입력 항목입니다.',
                invalidEmail: '이메일 형식이 올바르지 않습니다.',
            },
            submit: {
                success: '문의가 정상적으로 접수되었습니다.',
                failure: '문의 전송에 실패했습니다. 잠시 후 다시 시도해 주세요.',
                missingApiUrl: 'Apps Script 저장 URL이 설정되지 않았습니다.',
                sheetNotFound: 'Google Sheets 대상 시트 탭을 찾지 못했습니다.',
                networkFailure: '문의 전송 중 네트워크 오류가 발생했습니다.',
                invalidResponse: 'Apps Script가 올바른 JSON 응답을 반환하지 않았습니다.',
            },
        },
        ticker: [
            "서비스 고도화: 인틴의 'HAGOBOGO' 앱은 정자 백과사전과 퀴즈 게임 같은 참여형 콘텐츠를 포함한 2.0 업데이트를 통해 디지털 헬스케어 접근성을 크게 향상시켰습니다.",
            "시장 수요 확대: 남성 난임 예방과 자기 건강 관리에 대한 관심이 높아지면서 'HAGOBOGO' 자가 테스트 키트는 신혼부부와 1인 가구의 필수 헬스 가전으로 주목받고 있습니다.",
            "글로벌 확장: 국내 성공을 기반으로 'HAGOBOGO'는 해외 사용자를 위한 전용 글로벌 앱을 출시하며 모바일 기반 생식 건강 모니터링 솔루션으로서 입지를 넓히고 있습니다.",
        ],
        footer: [
            'ⓒ 2026 INTIN Inc. 모든 권리 보유.',
            '회사명 대표자 : (주)인트인 대표 김지훈',
            '소재지 : 대구광역시 동구 첨복로 52',
            '사업자 등록번호 : 108-81-90649 | 통신판매신고번호 : 제2018-대구동구-0025호',
            '문의 : help@intin.kr',
        ],
    },
};
