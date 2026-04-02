import { useState } from 'react';

export default function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [category, setCategory] = useState('general');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null); // 'success' | 'error' | null
  const [errorMessage, setErrorMessage] = useState('');

  const charCount = message.length;
  const maxChars = 2000;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!message.trim()) {
      setErrorMessage('Please enter a message');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    setSubmitStatus(null);

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category,
          message,
          email: email || undefined,
          page: window.location.pathname,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit feedback');
      }

      setSubmitStatus('success');
      setMessage('');
      setEmail('');
      setCategory('general');

      // Auto-close after 2 seconds
      setTimeout(() => {
        setIsOpen(false);
        setSubmitStatus(null);
      }, 2000);
    } catch (error) {
      console.error('Feedback submission error:', error);
      setErrorMessage(error.message || 'Failed to submit feedback');
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setSubmitStatus(null);
    setErrorMessage('');
    setMessage('');
    setEmail('');
    setCategory('general');
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-lg shadow-lg hover:shadow-xl transition-all z-40 flex items-center gap-2"
      >
        <span>Feedback</span>
      </button>

      {/* Modal Backdrop and Content */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={handleClose}
        >
          <div
            className="bg-white rounded-lg shadow-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Share Feedback</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Beta users shape the product. Every request goes straight to engineering.
                </p>
              </div>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 text-2xl font-light leading-none"
              >
                ×
              </button>
            </div>

            {/* Success State */}
            {submitStatus === 'success' ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <p className="text-green-800 font-medium">Thanks! We read every submission.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Category Selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Type of Feedback
                  </label>
                  <div className="flex gap-2">
                    {[
                      { value: 'bug', label: 'Bug 🐛', emoji: '🐛' },
                      { value: 'feature', label: 'Feature Request ✨', emoji: '✨' },
                      { value: 'general', label: 'General 💬', emoji: '💬' },
                    ].map(({ value, label, emoji }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setCategory(value)}
                        className={`flex-1 py-2 px-3 rounded-lg font-medium transition-all ${
                          category === value
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Message Textarea */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Message
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value.slice(0, maxChars))}
                    placeholder="What's on your mind?"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    rows="5"
                  />
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-gray-500">
                      {charCount} / {maxChars} characters
                    </span>
                    {charCount > maxChars * 0.9 && (
                      <span className="text-xs text-orange-600">
                        {maxChars - charCount} remaining
                      </span>
                    )}
                  </div>
                </div>

                {/* Email Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email (Optional)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.email@example.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">For follow-up conversations</p>
                </div>

                {/* Error Message */}
                {submitStatus === 'error' && errorMessage && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-red-700 text-sm">{errorMessage}</p>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting || !message.trim()}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  {isSubmitting ? 'Sending...' : 'Send Feedback'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
