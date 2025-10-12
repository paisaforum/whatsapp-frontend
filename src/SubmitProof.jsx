import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API_BASE = 'https://vggamee.com/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Handle authentication errors
const handleAuthError = (error) => {
  if (error.response?.status === 401) {
    localStorage.clear();
    window.location.href = '/login';
  }
};

function SubmitProof() {
  const [screenshots, setScreenshots] = useState([]);
  const [recipientNumbers, setRecipientNumbers] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();
  const userId = localStorage.getItem('userId');

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);

    if (files.length > 20) {
      setError('Maximum 20 screenshots allowed');
      return;
    }

    setScreenshots(files);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (screenshots.length === 0) {
      setError('Please upload at least one screenshot');
      setLoading(false);
      return;
    }

    const numbers = recipientNumbers
      .split('\n')
      .map(num => num.trim())
      .filter(num => num.length > 0);

    if (numbers.length === 0) {
      setError('Please enter at least one recipient number');
      setLoading(false);
      return;
    }

    if (numbers.length !== screenshots.length) {
      setError('Number of screenshots must match number of recipient numbers');
      setLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('userId', userId);

      screenshots.forEach((file, index) => {
        formData.append('screenshots', file);
      });

      formData.append('recipientNumbers', JSON.stringify(numbers));

      const response = await axios.post(`${API_BASE}/submit-proof`, formData, {
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'multipart/form-data'
        }
      });

      setSuccess(`Success! You earned ${response.data.pointsAwarded} points!`);
      setScreenshots([]);
      setRecipientNumbers('');

      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);

    } catch (err) {
      handleAuthError(err); 
      setError(err.response?.data?.error || 'Submission failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-950 to-gray-900">
      {/* Header */}
      <div className="bg-black bg-opacity-40 backdrop-blur-lg border-b border-red-900/30 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-gray-300 hover:text-white transition flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            <h1 className="text-2xl font-bold text-white">Submit Proof</h1>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="bg-black bg-opacity-40 backdrop-blur-lg border-2 border-red-600 rounded-2xl shadow-2xl shadow-red-900/50 p-6">
          {/* Instructions Box */}
          <div className="mb-6 p-4 bg-red-900 bg-opacity-30 border border-red-700 rounded-xl">
            <h3 className="font-semibold text-red-300 mb-3 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              How it works:
            </h3>
            <ol className="text-sm text-gray-300 space-y-2">
              <li className="flex gap-2">
                <span className="text-red-400 font-bold">1.</span>
                <span>Upload screenshots of your WhatsApp shares</span>
              </li>
              <li className="flex gap-2">
                <span className="text-red-400 font-bold">2.</span>
                <span>Enter the recipient WhatsApp numbers (one per line)</span>
              </li>
              <li className="flex gap-2">
                <span className="text-red-400 font-bold">3.</span>
                <span>Submit and earn 1 point per share instantly!</span>
              </li>
            </ol>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Screenshot Upload */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Upload Screenshots (Max 20)
              </label>
              <div className="relative">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full px-4 py-3 bg-gray-900 bg-opacity-50 border border-red-900/30 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-red-600 file:text-white hover:file:bg-red-700 file:cursor-pointer focus:ring-2 focus:ring-red-600 focus:border-transparent outline-none transition"
                />
              </div>
              {screenshots.length > 0 && (
                <div className="mt-2 flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="text-sm text-green-400 font-medium">
                    {screenshots.length} file(s) selected
                  </p>
                </div>
              )}
            </div>

            {/* Recipient Numbers */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Recipient WhatsApp Numbers
              </label>
              <textarea
                value={recipientNumbers}
                onChange={(e) => setRecipientNumbers(e.target.value)}
                placeholder="+91 9876543210&#10;+91 9876543211&#10;+91 9876543212"
                rows="6"
                className="w-full px-4 py-3 bg-gray-900 bg-opacity-50 border border-red-900/30 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-red-600 focus:border-transparent outline-none transition resize-none"
              />
              <p className="mt-2 text-xs text-gray-400">
                Enter one number per line. Must match the number of screenshots.
              </p>
            </div>

            {/* Points Preview */}
            {recipientNumbers.split('\n').filter(n => n.trim()).length > 0 && (
              <div className="mb-6 p-4 bg-green-900 bg-opacity-30 border border-green-700 rounded-xl flex items-center gap-3">
                <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-green-300 font-semibold text-lg">
                    You will earn: {recipientNumbers.split('\n').filter(n => n.trim()).length} points
                  </p>
                  <p className="text-green-400 text-xs">Keep sharing to earn more!</p>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-900 bg-opacity-30 border border-red-700 rounded-lg text-red-300 text-sm flex items-start gap-2">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="mb-4 p-3 bg-green-900 bg-opacity-30 border border-green-700 rounded-lg text-green-300 text-sm flex items-start gap-2">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{success}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-900/50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Submitting...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Submit & Earn Points
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default SubmitProof;