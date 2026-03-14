import React, { useEffect, useState } from 'react';

export default function ChatbotPanel({ copy, questions = [], onClose, onOpenInquiry }) {
    const [selectedQuestionId, setSelectedQuestionId] = useState(null);

    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose]);

    useEffect(() => {
        const scrollY = window.scrollY;
        const originalBodyStyle = {
            overflow: document.body.style.overflow,
            position: document.body.style.position,
            top: document.body.style.top,
            width: document.body.style.width,
        };

        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.top = `-${scrollY}px`;
        document.body.style.width = '100%';

        return () => {
            document.body.style.overflow = originalBodyStyle.overflow;
            document.body.style.position = originalBodyStyle.position;
            document.body.style.top = originalBodyStyle.top;
            document.body.style.width = originalBodyStyle.width;
            window.scrollTo(0, scrollY);
        };
    }, []);

    const selectedQuestion = questions.find((question) => question.id === selectedQuestionId) || null;

    return (
        <div className="chatbot-panel-layer" aria-live="polite">
            <button
                type="button"
                className="chatbot-panel-backdrop"
                aria-label={copy.buttons.close}
                onClick={onClose}
            />
            <section className="chatbot-panel" aria-label={copy.title}>
                <div className="chatbot-panel-header">
                    <div>
                        <h2 className="chatbot-panel-title">{copy.title}</h2>
                        <p className="chatbot-panel-intro">{copy.intro}</p>
                    </div>
                    <button
                        type="button"
                        className="chatbot-panel-close"
                        aria-label={copy.buttons.close}
                        onClick={onClose}
                    >
                        ×
                    </button>
                </div>

                <div className="chatbot-panel-body">
                    <div className="chatbot-panel-question-list">
                        {questions.map((question) => (
                            <button
                                key={question.id}
                                type="button"
                                className={`chatbot-question-chip ${selectedQuestionId === question.id ? 'is-active' : ''}`}
                                onClick={() => setSelectedQuestionId(question.id)}
                            >
                                {question.question}
                            </button>
                        ))}
                    </div>

                    {selectedQuestion ? (
                        <div className="chatbot-answer-card">
                            <p className="chatbot-answer-label">{copy.labels.answer}</p>
                            <h3 className="chatbot-answer-title">{selectedQuestion.question}</h3>
                            <p className="chatbot-answer-body">{selectedQuestion.answer}</p>
                            <div className="chatbot-answer-actions">
                                <button
                                    type="button"
                                    className="chatbot-primary-action"
                                    onClick={onOpenInquiry}
                                >
                                    {copy.buttons.businessInquiries}
                                </button>
                                <button
                                    type="button"
                                    className="chatbot-reset-action"
                                    onClick={() => setSelectedQuestionId(null)}
                                >
                                    {copy.buttons.otherQuestions}
                                </button>
                            </div>
                        </div>
                    ) : null}
                </div>
            </section>
        </div>
    );
}
