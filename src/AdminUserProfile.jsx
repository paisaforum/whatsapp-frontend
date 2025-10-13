import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Toast from './Toast';

// ⬇️ ADD THESE HELPER FUNCTIONS ⬇️
const API_BASE = 'http://vggamee.com/api';

// Helper to get admin auth headers
const getAuthHeaders = () => {
    const token = localStorage.getItem('adminToken'); // ← Note: adminToken!
    return token ? { Authorization: `Bearer ${token}` } : {};
};

// Handle authentication errors
const handleAuthError = (error) => {
    if (error.response?.status === 401) {
        localStorage.clear();
        window.location.href = '/admin/login'; // ← Redirect to admin login
    }
};

function AdminUserProfile() {
    const { userId } = useParams();
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lightbox, setLightbox] = useState({ isOpen: false, images: [], currentIndex: 0 });
    const [toast, setToast] = useState({ isOpen: false, message: '', type: 'success' });
    const [selectedSubmissions, setSelectedSubmissions] = useState([]);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [submissionToDelete, setSubmissionToDelete] = useState(null);
    const [recipients, setRecipients] = useState([]);

    useEffect(() => {
        fetchUserProfile();
        fetchRecipients();
    }, [userId]);

    useEffect(() => {
        if (!lightbox.isOpen) return;

        const handleKeyPress = (e) => {
            if (e.key === 'Escape') {
                setLightbox({ isOpen: false, images: [], currentIndex: 0 });
                document.body.style.overflow = 'unset';
            }
            if (e.key === 'ArrowRight') {
                setLightbox(prev => ({
                    ...prev,
                    currentIndex: (prev.currentIndex + 1) % prev.images.length
                }));
            }
            if (e.key === 'ArrowLeft') {
                setLightbox(prev => ({
                    ...prev,
                    currentIndex: prev.currentIndex === 0 ? prev.images.length - 1 : prev.currentIndex - 1
                }));
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [lightbox.isOpen, lightbox.images.length]);



    const fetchUserProfile = async () => {
        try {
            const [userRes, submissionsRes] = await Promise.all([
                axios.get(`${API_BASE}/admin/user-profile/${userId}`, {
                    headers: getAuthHeaders() // ← ADD
                }),
                axios.get(`${API_BASE}/admin/user-submissions/${userId}`, {
                    headers: getAuthHeaders() // ← ADD
                })
            ]);

            setUser(userRes.data.user);
            setSubmissions(submissionsRes.data.submissions);
            setLoading(false);
        } catch (error) {
            handleAuthError(error); // ← ADD
            console.error('Failed to load user profile:', error);
            setLoading(false);
        }
    };



    const fetchRecipients = async () => {
        try {
            const response = await axios.get(`${API_BASE}/user-recipients/${userId}`, {
                headers: getAuthHeaders() // ← ADD
            });
            setRecipients(response.data.recipients);
        } catch (error) {
            handleAuthError(error); // ← ADD
            console.error('Failed to load recipients:', error);
        }
    };

    const openLightbox = (screenshots, index) => {
        setLightbox({ isOpen: true, images: screenshots, currentIndex: index });
        // Disable body scroll when lightbox is open
        document.body.style.overflow = 'hidden';
    };

    const closeLightbox = () => {
        setLightbox({ isOpen: false, images: [], currentIndex: 0 });
        document.body.style.overflow = 'unset';
    };

    const nextImage = (e) => {
        console.log('Next clicked, current index:', lightbox.currentIndex);
        if (e) e.stopPropagation();
        setLightbox(prev => {
            const newIndex = (prev.currentIndex + 1) % prev.images.length;
            console.log('Moving to index:', newIndex);
            return {
                ...prev,
                currentIndex: newIndex
            };
        });
    };

    const prevImage = (e) => {
        console.log('Prev clicked, current index:', lightbox.currentIndex);
        if (e) e.stopPropagation();
        setLightbox(prev => {
            const newIndex = prev.currentIndex === 0 ? prev.images.length - 1 : prev.currentIndex - 1;
            console.log('Moving to index:', newIndex);
            return {
                ...prev,
                currentIndex: newIndex
            };
        });
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        setToast({ isOpen: true, message: 'Number copied to clipboard!', type: 'success' });
    };

    const handleSelectSubmission = (submissionId) => {
        setSelectedSubmissions(prev =>
            prev.includes(submissionId)
                ? prev.filter(id => id !== submissionId)
                : [...prev, submissionId]
        );
    };

    const handleSelectAll = () => {
        if (selectedSubmissions.length === submissions.length) {
            setSelectedSubmissions([]);
        } else {
            setSelectedSubmissions(submissions.map(s => s.id));
        }
    };

    const handleDeleteSingle = async () => {
        try {
            await axios.delete(`${API_BASE}/admin/delete-submission/${submissionToDelete}`, {
                headers: getAuthHeaders() // ← ADD
            });
            setToast({ isOpen: true, message: 'Submission deleted successfully!', type: 'success' });
            setShowDeleteModal(false);
            setSubmissionToDelete(null);
            fetchUserProfile();
        } catch (error) {
            handleAuthError(error); // ← ADD
            setToast({ isOpen: true, message: 'Failed to delete submission', type: 'error' });
        }
    };

    const handleBulkDelete = async () => {
        if (selectedSubmissions.length === 0) return;

        try {
            await axios.post(`${API_BASE}/admin/bulk-delete-submissions`, {
                submissionIds: selectedSubmissions
            }, {
                headers: getAuthHeaders() // ← ADD
            });
            setToast({ isOpen: true, message: `${selectedSubmissions.length} submissions deleted!`, type: 'success' });
            setSelectedSubmissions([]);
            fetchUserProfile();
        } catch (error) {
            handleAuthError(error); // ← ADD
            setToast({ isOpen: true, message: 'Failed to delete submissions', type: 'error' });
        }
    };


    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-xl text-gray-600">Loading user profile...</div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-xl text-gray-600">User not found</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-gray-800 text-white shadow-lg">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <button
                        onClick={() => navigate('/admin/dashboard')}
                        className="text-white hover:text-gray-300 mb-2"
                    >
                        ← Back to Dashboard
                    </button>
                    <h1 className="text-2xl font-bold">User Profile</h1>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-6">
                {/* User Info Card */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <p className="text-sm text-gray-600">WhatsApp Number</p>
                            <p className="text-lg font-bold text-gray-800">{user.whatsapp_number}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Joined Date</p>
                            <p className="text-lg font-bold text-gray-800">{new Date(user.created_at).toLocaleDateString()}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Total Points</p>
                            <p className="text-lg font-bold text-green-600">{user.total_points || 0}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Total Submissions</p>
                            <p className="text-lg font-bold text-blue-600">{submissions.length}</p>
                        </div>
                    </div>
                </div>

                {/* Submissions Grid */}
                <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-gray-800">Submission History</h2>

                        {submissions.length > 0 && (
                            <div className="flex gap-2">
                                <button
                                    onClick={handleSelectAll}
                                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm font-semibold rounded-lg transition"
                                >
                                    {selectedSubmissions.length === submissions.length ? 'Deselect All' : 'Select All'}
                                </button>
                                {selectedSubmissions.length > 0 && (
                                    <button
                                        onClick={handleBulkDelete}
                                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition"
                                    >
                                        Delete Selected ({selectedSubmissions.length})
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {submissions.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">No submissions yet</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {submissions.map((sub) => (
                                <div key={sub.id} className="border rounded-lg p-4 bg-gray-50 relative">
                                    {/* Checkbox */}
                                    <input
                                        type="checkbox"
                                        checked={selectedSubmissions.includes(sub.id)}
                                        onChange={() => handleSelectSubmission(sub.id)}
                                        className="absolute top-3 left-3 w-5 h-5 cursor-pointer"
                                    />

                                    {/* Delete Button */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSubmissionToDelete(sub.id);
                                            setShowDeleteModal(true);
                                        }}
                                        className="absolute top-3 right-3 text-red-600 hover:text-red-800 z-10"
                                        title="Delete submission"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>

                                    {/* Submission Header */}
                                    <div className="flex justify-between items-start mb-3 mt-8">
                                        <div>
                                            <p className="text-sm font-semibold text-gray-800">
                                                {sub.recipient_count} shares
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {new Date(sub.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <span className={`px-2 py-1 rounded text-xs font-semibold ${sub.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                                            {sub.status}
                                        </span>
                                    </div>

                                    {/* Screenshot Thumbnails */}
                                    <div className="grid grid-cols-3 gap-2 mb-3">
                                        {sub.screenshots.map((screenshot, index) => (
                                            <div
                                                key={index}
                                                onClick={() => openLightbox(sub.screenshots, index)}
                                                className="aspect-square bg-gray-200 rounded overflow-hidden cursor-pointer hover:opacity-75 transition"
                                            >
                                                <img
                                                    src={`https://whatsapp-backend-0cr9.onrender.com${screenshot}`}
                                                    alt={`Screenshot ${index + 1}`}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        e.target.src = 'https://via.placeholder.com/150?text=No+Image';
                                                    }}
                                                />
                                            </div>
                                        ))}
                                    </div>

                                    {/* Recipient Numbers */}
                                    <div className="border-t pt-3">
                                        <p className="text-xs font-semibold text-gray-600 mb-2">Recipient Numbers:</p>
                                        <div className="space-y-1 max-h-32 overflow-y-auto">
                                            {sub.recipient_numbers?.filter(num => num).map((number, index) => (
                                                <div key={index} className="flex items-center justify-between bg-white px-2 py-1 rounded text-xs">
                                                    <span className="text-gray-700 font-mono">
                                                        {number}
                                                    </span>
                                                    <button
                                                        onClick={() => copyToClipboard(number)}
                                                        className="ml-2 text-blue-600 hover:text-blue-800"
                                                        title="Copy number"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Points */}
                                    <div className="mt-3 pt-3 border-t">
                                        <p className="text-sm font-bold text-green-600">+{sub.points_awarded} points</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>



                {/* All Recipient Numbers */}
                <div className="bg-white rounded-lg shadow-md p-6 mt-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">
                        All Recipient Numbers ({recipients.length} total)
                    </h2>

                    {recipients.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">No recipients yet</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {recipients.map((recipient, index) => (
                                <div key={index} className="flex items-center justify-between bg-gray-50 px-4 py-3 rounded-lg border">
                                    <div className="flex-1">
                                        <p className="text-sm font-mono text-gray-800">{recipient.recipient_number}</p>
                                        <p className="text-xs text-gray-500">
                                            First shared: {new Date(recipient.first_shared).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => copyToClipboard(recipient.recipient_number)}
                                        className="ml-2 text-blue-600 hover:text-blue-800"
                                        title="Copy number"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>






            </div>

            {/* Lightbox */}
            {lightbox.isOpen && (
                <div className="fixed inset-0 z-50 bg-black bg-opacity-95">
                    {/* Close button */}
                    <button
                        onClick={closeLightbox}
                        className="fixed top-6 right-6 text-white text-5xl hover:text-gray-300 z-[60] w-14 h-14 flex items-center justify-center"
                    >
                        ×
                    </button>

                    {/* Previous button */}
                    <button
                        onClick={prevImage}
                        className="fixed left-6 top-1/2 -translate-y-1/2 text-white text-5xl hover:text-gray-300 bg-black bg-opacity-60 hover:bg-opacity-80 rounded-full w-14 h-14 flex items-center justify-center z-[60]"
                    >
                        ‹
                    </button>

                    {/* Next button */}
                    <button
                        onClick={nextImage}
                        className="fixed right-6 top-1/2 -translate-y-1/2 text-white text-5xl hover:text-gray-300 bg-black bg-opacity-60 hover:bg-opacity-80 rounded-full w-14 h-14 flex items-center justify-center z-[60]"
                    >
                        ›
                    </button>

                    {/* Image container */}
                    <div className="absolute inset-0 flex items-center justify-center p-20">
                        <div className="flex flex-col items-center max-w-full max-h-full">
                            <img
                                src={`https://whatsapp-backend-0cr9.onrender.com${lightbox.images[lightbox.currentIndex]}`}
                                alt={`Screenshot ${lightbox.currentIndex + 1}`}
                                className="max-w-full max-h-[85vh] object-contain"
                            />
                            <p className="text-white text-lg mt-6 font-semibold">
                                {lightbox.currentIndex + 1} / {lightbox.images.length}
                            </p>
                        </div>
                    </div>
                </div>
            )}


            <Toast
                isOpen={toast.isOpen}
                message={toast.message}
                type={toast.type}
                onClose={() => setToast({ ...toast, isOpen: false })}
            />
        </div>
    );
}

export default AdminUserProfile;