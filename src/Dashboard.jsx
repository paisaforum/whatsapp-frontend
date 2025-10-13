import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Modal from './Modal';
import Toast from './Toast';

const API_BASE = 'http://vggamee.com/api';

// Helper function to get auth headers
const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
};

// Handle authentication errors
const handleAuthError = (error) => {
    if (error.response?.status === 401) {
        // Token expired or invalid
        localStorage.clear();
        window.location.href = '/';
    }
};



// Generate fake earning stats for chart
const generateFakeStats = () => {
    const days = 7;
    return Array.from({ length: days }, (_, i) => {
        const date = new Date(Date.now() - (days - 1 - i) * 24 * 60 * 60 * 1000);
        return {
            day: date.toLocaleDateString('en-US', { weekday: 'short' }),
            points: Math.floor(Math.random() * 40) + 10 // Random 10-50 points
        };
    });
};

// Add this helper function BEFORE the Dashboard component
const getSocialIcon = (platform) => {
    const icons = {
        telegram: '📱',
        whatsapp: '💬',
        facebook: '👍',
        instagram: '📷',
        twitter: '🐦',
        youtube: '▶️',
        discord: '🎮',
        linkedin: '💼',
        tiktok: '🎵',
        reddit: '🤖'
    };
    return icons[platform?.toLowerCase()] || '🌐';
};

function Dashboard() {
    const [data, setData] = useState(null);
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const userId = localStorage.getItem('userId');
    const [showRedeemModal, setShowRedeemModal] = useState(false);
    const [toast, setToast] = useState({ isOpen: false, message: '', type: 'success' });
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [submissionToCancel, setSubmissionToCancel] = useState(null);
    const [submissionsPage, setSubmissionsPage] = useState(1);
    const [redemptionsPage, setRedemptionsPage] = useState(1);
    const [recipients, setRecipients] = useState([]);
    const [showRecipientsModal, setShowRecipientsModal] = useState(false);
    const [showHowItWorks, setShowHowItWorks] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [chartData] = useState(generateFakeStats());
    const [platformStats, setPlatformStats] = useState({
        totalUsers: 0,
        earnedToday: 0,
        activeNow: 0,
        totalPaid: 0
    });

    const [socialLinks, setSocialLinks] = useState([]);

    // Inbox states
    const [messages, setMessages] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showInbox, setShowInbox] = useState(false);
    const [selectedMessage, setSelectedMessage] = useState(null);

    // Banner carousel states
    const [banners, setBanners] = useState([]);
    const [currentBannerIndex, setCurrentBannerIndex] = useState(0);

    const [recentActivity, setRecentActivity] = useState([
        { user: '+9198****210', action: 'earned', points: 45, time: 'Just now', id: 1 },
        { user: '+9176****543', action: 'redeemed', amount: '₹200', time: '2 min ago', id: 2 },
        { user: '+9191****876', action: 'earned', points: 32, time: '3 min ago', id: 3 },
        { user: '+9185****432', action: 'earned', points: 28, time: '5 min ago', id: 4 },
        { user: '+9192****109', action: 'redeemed', amount: '₹200', time: '8 min ago', id: 5 },
    ]);
    const [systemSettings, setSystemSettings] = useState({
        points_per_rupee: 10,
        min_redemption_points: 2000,
        redemption_amount: 2000
    });

    // Generate random user number with +91 prefix (masked)
    const generateRandomUser = () => {
        const middle = Math.floor(Math.random() * 90 + 10);
        const last = Math.floor(Math.random() * 900 + 100);
        return `+91${middle}****${last}`;
    };

    // Generate random activity
    const generateRandomActivity = () => {
        const isEarning = Math.random() > 0.3; // 70% chance of earning, 30% redemption

        if (isEarning) {
            return {
                user: generateRandomUser(),
                action: 'earned',
                points: Math.floor(Math.random() * 40) + 10, // 10-50 points
                time: 'Just now',
                id: Date.now()
            };
        } else {
            return {
                user: generateRandomUser(),
                action: 'redeemed',
                amount: '₹200',
                time: 'Just now',
                id: Date.now()
            };
        }
    };

    useEffect(() => {
        if (!userId) {
            window.location.href = '/';
            return;
        }

        // Initial fetch
        fetchDashboard();
        fetchSettings();
        fetchPlatformStats();
        fetchMessages();
        fetchUnreadCount();
        fetchBanners();
        fetchSocialLinks();

        // Platform stats (every 5s - already existing)
        const statsInterval = setInterval(() => {
            fetchPlatformStats();
        }, 5000);

        // Add to useEffect
        const fetchSocialLinks = async () => {
            try {
                const response = await axios.get(`${API_BASE}/social-links`);
                setSocialLinks(response.data.links);
            } catch (error) {
                console.error('Failed to load social links:', error);
            }
        };

        // Recent activity (every 5-10s - already existing)
        const activityInterval = setInterval(() => {
            setRecentActivity(prev => {
                const newActivity = generateRandomActivity();
                const updatedActivities = prev.map((activity, index) => {
                    const timeMap = ['2 min ago', '3 min ago', '5 min ago', '8 min ago', '10 min ago'];
                    return {
                        ...activity,
                        time: index === 0 ? '2 min ago' : timeMap[Math.min(index, timeMap.length - 1)]
                    };
                });
                return [newActivity, ...updatedActivities].slice(0, 5);
            });
        }, Math.floor(Math.random() * 5000) + 5000);

        // Messages and inbox (every 30s - already existing)
        const messagesInterval = setInterval(() => {
            fetchMessages();
            fetchUnreadCount();
        }, 30000);

        // NEW: Auto-refresh user data (points, redemptions, submissions) every 30s
        const dashboardInterval = setInterval(() => {
            fetchDashboard(); // Silently updates points, submissions, redemptions
        }, 30000);

        // Cleanup all intervals
        return () => {
            clearInterval(statsInterval);
            clearInterval(activityInterval);
            clearInterval(messagesInterval);
            clearInterval(dashboardInterval); // Add this
        };
    }, [userId, submissionsPage, redemptionsPage]);


    // Auto-play carousel (separate effect that watches banners)
    useEffect(() => {
        if (banners.length <= 1) return; // Don't auto-play if only one banner

        const carouselInterval = setInterval(() => {
            setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
        }, 8000); // Change every 5 seconds

        return () => clearInterval(carouselInterval);
    }, [banners]); // Re-run when banners change


    const fetchPlatformStats = async () => {
        try {
            const response = await axios.get(`${API_BASE}/platform-stats`);
            setPlatformStats(response.data);
        } catch (error) {
            console.error('Failed to load platform stats:', error);
        }
    };




    const fetchMessages = async () => {
        try {
            const response = await axios.get(`${API_BASE}/messages/${userId}`, {
                headers: getAuthHeaders() // ← ADD THIS
            });
            setMessages(response.data.messages);
        } catch (error) {
            handleAuthError(error);
            console.error('Failed to load messages:', error);
        }
    };

    const fetchUnreadCount = async () => {
        try {
            const response = await axios.get(`${API_BASE}/messages/${userId}/unread-count`, {
                headers: getAuthHeaders() // ← ADD THIS
            });
            setUnreadCount(response.data.unreadCount);
        } catch (error) {
            handleAuthError(error);
            console.error('Failed to load unread count:', error);
        }
    };

    const markAsRead = async (messageId, messageType) => {
        try {
            await axios.put(`${API_BASE}/messages/${messageId}/read`, {
                userId: userId,
                messageType: messageType
            }, {
                headers: getAuthHeaders() // ← ADD THIS
            });
            fetchMessages();
            fetchUnreadCount();
        } catch (error) {
            handleAuthError(error);
            console.error('Failed to mark as read:', error);
        }
    };

    const fetchBanners = async () => {
        try {
            const response = await axios.get(`${API_BASE}/banners`);
            setBanners(response.data.banners);
        } catch (error) {
            console.error('Failed to load banners:', error);
        }
    };



    const fetchDashboard = async () => {
        try {
            const response = await axios.get(`${API_BASE}/dashboard/${userId}`, {
                headers: getAuthHeaders(),
                params: {
                    submissionsPage: submissionsPage,
                    redemptionsPage: redemptionsPage,
                    limit: 5
                }
            });
            setData(response.data);
            setLoading(false);
        } catch (error) {
            handleAuthError(error);
            console.error('Failed to load dashboard:', error);
            setLoading(false);
        }
    };

    const fetchRecipients = async () => {
        try {
            const response = await axios.get(`${API_BASE}/user-recipients/${userId}`, {
                headers: getAuthHeaders() // ← ADD THIS
            });
            setRecipients(response.data.recipients);
        } catch (error) {
            handleAuthError(error);
            console.error('Failed to load recipients:', error);
        }
    };

    const fetchSettings = async () => {
        try {
            const response = await axios.get(`${API_BASE}/settings`);
            const settingsObj = {};
            response.data.settings.forEach(setting => {
                settingsObj[setting.setting_key] = parseInt(setting.setting_value);
            });
            setSystemSettings(settingsObj);
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    };

    const copyNumber = (number) => {
        navigator.clipboard.writeText(number);
        setToast({ isOpen: true, message: 'Number copied!', type: 'success' });
    };

    const handleRedemption = async () => {
        setShowRedeemModal(false);
        setLoading(true);
        try {
            await axios.post(`${API_BASE}/request-redemption`, { userId: userId }, {
                headers: getAuthHeaders() // ← ADD THIS
            });
            setToast({
                isOpen: true,
                message: 'Request submitted! We will review it within 24-48 hours.',
                type: 'success'
            });
            fetchDashboard();
        } catch (error) {
            handleAuthError(error);
            setToast({
                isOpen: true,
                message: error.response?.data?.error || 'Failed to submit request',
                type: 'error'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleCancelSubmission = async () => {
        setShowCancelModal(false);
        setLoading(true);
        try {
            await axios.post(`${API_BASE}/cancel-submission`, {
                submissionId: submissionToCancel.id,
                userId: userId
            });
            setToast({
                isOpen: true,
                message: `Cancelled. ${submissionToCancel.points} points removed.`,
                type: 'success'
            });
            setSubmissionToCancel(null);
            fetchDashboard();
        } catch (error) {
            setToast({
                isOpen: true,
                message: error.response?.data?.error || 'Failed to cancel',
                type: 'error'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.clear();
        window.location.href = '/login';
    };

    const shareToWhatsApp = () => {
        if (data?.offer) {
            const text = encodeURIComponent(data.offer.caption);
            window.open(`https://wa.me/?text=${text}`, '_blank');
        }
    };

    // Calculate progress percentage
    const progressPercentage = Math.min(
        ((data?.points?.available || 0) / systemSettings.min_redemption_points) * 100,
        100
    );

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-950 to-gray-900 flex items-center justify-center">
                <div className="text-xl text-red-400 animate-pulse">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-950 to-gray-900">
            {/* Header */}
            <div className="bg-black bg-opacity-40 backdrop-blur-lg border-b border-red-900/30 sticky top-0 z-40">
                <div className="max-w-6xl mx-auto px-3 py-3">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 overflow-hidden">
                                <img
                                    src="/logo.png"
                                    alt="Raja Games Logo"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div>
                                <h1 className="text-base font-bold text-white">Raja Games WP Earning</h1>
                                <p className="text-xs text-red-300">Earn & Win Daily</p>
                            </div>
                        </div>

                        {/* Right side: Inbox + Hamburger Menu */}
                        <div className="flex items-center gap-2">
                            {/* Inbox Icon */}
                            <button
                                onClick={() => setShowInbox(true)}
                                className="relative p-2 hover:bg-red-900/30 rounded-lg transition"
                            >
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                {/* Dynamic Unread Badge */}
                                {unreadCount > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                                        {unreadCount > 99 ? '99+' : unreadCount}
                                    </span>
                                )}
                            </button>

                            {/* Hamburger Menu */}
                            <button
                                onClick={() => setShowMenu(!showMenu)}
                                className="p-2 hover:bg-red-900/30 rounded-lg transition"
                            >
                                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Slide-out Menu */}
            {showMenu && (
                <>
                    <div
                        className="fixed inset-0 bg-black bg-opacity-70 z-50"
                        onClick={() => setShowMenu(false)}
                    ></div>

                    <div className="fixed top-0 right-0 h-full w-80 bg-gray-900 border-l border-red-600 shadow-2xl z-50 transform transition-transform">
                        <div className="p-6">
                            <button
                                onClick={() => setShowMenu(false)}
                                className="absolute top-4 right-4 text-gray-400 hover:text-white"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>

                            <div className="mb-8 pb-6 border-b border-red-900/30">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-14 h-14 rounded-full overflow-hidden">
                                        <img
                                            src="/logo.png"
                                            alt="Raja Games Logo"
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div>
                                        <p className="text-white font-semibold">User Account</p>
                                        <p className="text-red-300 text-sm">Active Member</p>
                                    </div>
                                </div>
                                <div className="bg-black bg-opacity-50 rounded-lg p-3 flex items-center justify-between">
                                    <div>
                                        <p className="text-gray-400 text-xs mb-1">Phone Number</p>
                                        <p className="text-white font-mono text-sm">{data?.user?.whatsapp_number}</p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            copyNumber(data?.user?.whatsapp_number);
                                            setShowMenu(false);
                                        }}
                                        className="text-red-400 hover:text-red-300"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            <nav className="space-y-2 mb-8">
                                <button
                                    onClick={() => {
                                        setShowMenu(false);
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-red-900/30 rounded-lg transition"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                    </svg>
                                    <span className="font-medium">Dashboard</span>
                                </button>

                                <button
                                    onClick={() => {
                                        setShowMenu(false);
                                        navigate('/submit-proof');
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-red-900/30 rounded-lg transition"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                    <span className="font-medium">Submit Proof</span>
                                </button>

                                <button
                                    onClick={() => {
                                        fetchRecipients();
                                        setShowRecipientsModal(true);
                                        setShowMenu(false);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-red-900/30 rounded-lg transition"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                    <span className="font-medium">Numbers I Shared</span>
                                </button>

                                <button
                                    onClick={() => {
                                        setShowMenu(false);
                                        setShowHowItWorks(true);
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-red-900/30 rounded-lg transition"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span className="font-medium">How It Works</span>
                                </button>

                                <button
                                    onClick={() => {
                                        setShowMenu(false);
                                        document.querySelector('.bg-gradient-to-br.from-red-600')?.scrollIntoView({ behavior: 'smooth' });
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-red-900/30 rounded-lg transition"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span className="font-medium">My Points</span>
                                </button>
                            </nav>

                            <div className="bg-black bg-opacity-50 rounded-lg p-4 mb-6">
                                <p className="text-gray-400 text-xs mb-3">Account Stats</p>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-300">Available Points</span>
                                        <span className="text-white font-bold">{data?.points?.available || 0}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-300">Total Earned</span>
                                        <span className="text-green-400 font-bold">{data?.points?.total || 0}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-300">Redeemed</span>
                                        <span className="text-red-400 font-bold">{data?.points?.redeemed || 0}</span>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition shadow-lg"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                                <span>Logout</span>
                            </button>
                        </div>
                    </div>
                </>
            )}

            <div className="max-w-6xl mx-auto px-2.5 py-2.5">


                {/* Banner Carousel */}
                {banners.length > 0 && (
                    <div className="mb-2.5 relative">
                        <div className="bg-black bg-opacity-40 backdrop-blur-lg border border-red-900/30 rounded-2xl overflow-hidden">
                            {/* Carousel Images */}
                            <div className="relative h-48 md:h-64 lg:h-72">
                                {banners.map((banner, index) => (
                                    <div
                                        key={banner.id}
                                        className={`absolute inset-0 transition-opacity duration-1000 ${index === currentBannerIndex ? 'opacity-100' : 'opacity-0'
                                            }`}
                                    >
                                        {banner.link_url ? (
                                            <a
                                                href={banner.link_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="block w-full h-full"
                                            >
                                                <img
                                                    src={`${API_BASE.replace('/api', '')}${banner.image_url}`}
                                                    alt={banner.title || 'Banner'}
                                                    className="w-full h-full object-cover"
                                                />
                                            </a>
                                        ) : (
                                            <img
                                                src={`${API_BASE.replace('/api', '')}${banner.image_url}`}
                                                alt={banner.title || 'Banner'}
                                                className="w-full h-full object-cover"
                                            />
                                        )}

                                        {/* Banner Title Overlay */}
                                        {banner.title && (
                                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                                                <h3 className="text-white text-lg font-bold">{banner.title}</h3>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>



                            {/* Navigation Dots */}
                            {banners.length > 1 && (
                                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-10">
                                    {banners.map((_, index) => (
                                        <button
                                            key={index}
                                            onClick={() => setCurrentBannerIndex(index)}
                                            className={`w-2 h-2 rounded-full transition-all ${index === currentBannerIndex
                                                ? 'bg-white w-6'
                                                : 'bg-white/50 hover:bg-white/75'
                                                }`}
                                            aria-label={`Go to banner ${index + 1}`}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}


                {/* How It Works Section */}
                <div className="mb-2.5">
                    <button
                        onClick={() => setShowHowItWorks(!showHowItWorks)}
                        className="w-full bg-black bg-opacity-40 backdrop-blur-lg border border-red-900/30 rounded-xl p-2 flex justify-between items-center hover:bg-opacity-50 transition"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <span className="text-white font-semibold">How It Works</span>
                        </div>
                        <svg className={`w-6 h-6 text-red-400 transition-transform ${showHowItWorks ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>

                    {showHowItWorks && (
                        <div className="mt-1.2 bg-black bg-opacity-40 backdrop-blur-lg border border-red-900/30 rounded-xl p-6 space-y-4">
                            <div className="flex gap-4">
                                <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-white">1</div>
                                <div>
                                    <h4 className="text-white font-semibold mb-1">Step 1: Share the Offer</h4>
                                    <p className="text-gray-300 text-sm">Download and send the offer image to your WhatsApp contacts</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-white">2</div>
                                <div>
                                    <h4 className="text-white font-semibold mb-1">Step 2: Upload Proof</h4>
                                    <p className="text-gray-300 text-sm">Take screenshots and enter the phone numbers you shared with. You get 1 point per share</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-white">3</div>
                                <div>
                                    <h4 className="text-white font-semibold mb-1">Step 3: Redeem Rewards</h4>
                                    <p className="text-gray-300 text-sm">When you reach {systemSettings.min_redemption_points} points, request a gift code worth ₹{(systemSettings.min_redemption_points / systemSettings.points_per_rupee).toFixed(0)}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Points Card with Progress Bar */}
                <div className="bg-gradient-to-br from-[#ad0000] to-[#ff3800] rounded-2xl shadow-2xl shadow-[#ad0000]/50 p-4 mb-2.5 border border-[#ff3800]/30">

                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <p className="text-red-100 text-sm mb-2 font-medium">Your Points</p>
                            <h2 className="text-3xl font-bold text-white mb-2">{data?.points?.available || 0}</h2>
                            <p className="text-red-100 text-sm font-medium">
                                Worth = ₹{((data?.points?.available || 0) / systemSettings.points_per_rupee).toFixed(2)}
                            </p>
                        </div>
                        <div className="text-right bg-black bg-opacity-20 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                            <p className="text-red-100 text-sm font-medium">Points Needed to Redeem</p>
                            <p className="text-3xl font-bold text-white">{systemSettings.min_redemption_points}</p>
                            <p className="text-red-100 text-sm">Worth = ₹{(systemSettings.min_redemption_points / systemSettings.points_per_rupee).toFixed(0)}</p>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                        <div className="flex justify-between text-xs text-red-100 mb-2">
                            <span>Progress</span>
                            <span>{progressPercentage.toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-black bg-opacity-30 rounded-full h-3">
                            <div
                                className="bg-white rounded-full h-3 transition-all duration-500"
                                style={{ width: `${progressPercentage}%` }}
                            ></div>
                        </div>
                    </div>

                    <button
                        onClick={() => setShowRedeemModal(true)}
                        disabled={loading || data?.points?.available < systemSettings.min_redemption_points || data?.pendingRedemption}
                        className={`w-full font-bold py-4 rounded-xl transition-all transform ${data?.pendingRedemption
                            ? 'bg-yellow-500 text-yellow-900 cursor-not-allowed'
                            : data?.points?.available >= systemSettings.min_redemption_points
                                ? 'bg-white text-red-600 hover:bg-red-50 hover:scale-[1.02] shadow-lg cursor-pointer'
                                : 'bg-gray-700 text-gray-400 cursor-not-allowed opacity-60'
                            }`}
                    >
                        {loading ? 'Processing...' :
                            data?.pendingRedemption ? 'Waiting for approval' :
                                data?.points?.available >= systemSettings.min_redemption_points ? 'Redeem Points' :
                                    `Earn ${systemSettings.min_redemption_points - (data?.points?.available || 0)} more points to redeem`}
                    </button>
                </div>

                {/* Current Offer */}
                {data?.offer ? (
                    <div className="bg-black bg-opacity-40 backdrop-blur-lg border border-red-900/30 rounded-2xl p-6 mb-2.5">
                        <h3 className="text-xl font-bold text-white mb-4">Share This Offer</h3>

                        {data.offer.image_url && (
                            <div className="relative mb-4 rounded-xl overflow-hidden border border-red-900/30">
                                <img
                                    src={`${API_BASE.replace('/api', '')}${data.offer.image_url}`}
                                    alt="Offer"
                                    className="w-full"
                                />
                                <button
                                    onClick={() => {
                                        const link = document.createElement('a');
                                        link.href = `${API_BASE.replace('/api', '')}${data.offer.image_url}`;
                                        link.download = 'raja-games-offer.jpg';
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                        setToast({ isOpen: true, message: 'Image downloaded!', type: 'success' });
                                    }}
                                    className="absolute top-3 right-3 bg-black bg-opacity-70 hover:bg-opacity-90 text-white p-3 rounded-full transition shadow-lg"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                </button>
                            </div>
                        )}

                        <p className="text-gray-300 mb-4">{data.offer.caption}</p>

                        <button
                            onClick={shareToWhatsApp}
                            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl transition flex items-center justify-center gap-3 shadow-lg shadow-green-900/50"
                        >
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                            </svg>
                            Share to WhatsApp
                        </button>
                    </div>
                ) : (
                    <div className="bg-black bg-opacity-40 backdrop-blur-lg border border-red-900/30 rounded-2xl p-8 mb-2.5 text-center">
                        <p className="text-gray-400 text-lg">No offer available right now</p>
                        <p className="text-gray-500 text-sm mt-2">Check back soon for new offers!</p>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="grid md:grid-cols-2 gap-4 mb-2.5">
                    <button
                        onClick={() => navigate('/submit-proof')}
                        className="bg-red-600 hover:bg-red-700 text-white font-bold py-6 rounded-xl transition shadow-lg shadow-red-900/50 flex items-center justify-center gap-3"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        Submit Proof
                    </button>
                    <button
                        onClick={() => { fetchRecipients(); setShowRecipientsModal(true); }}
                        className="bg-black bg-opacity-50 backdrop-blur-lg border-2 border-red-600 hover:bg-opacity-70 text-white font-bold py-6 rounded-xl transition"
                    >
                        Numbers I Shared
                    </button>
                </div>

                {/* Recent Submissions */}
                <div className="bg-black bg-opacity-40 backdrop-blur-lg border border-red-900/30 rounded-2xl p-6 mb-2.5">
                    <h3 className="text-xl font-bold text-white mb-4">My Submissions</h3>
                    {data?.submissions?.length > 0 ? (
                        <>
                            <div className="space-y-3">
                                {data.submissions.map((sub) => (
                                    <div key={sub.id} className="flex justify-between items-center p-4 bg-gray-900 bg-opacity-50 rounded-xl border border-red-900/20">
                                        <div>
                                            <p className="text-sm font-semibold text-white">
                                                {sub.recipient_count} shares
                                            </p>
                                            <p className="text-xs text-gray-400">
                                                {new Date(sub.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-green-400">+{sub.points_awarded} pts</p>
                                                <p className="text-xs text-gray-400 capitalize">{sub.status}</p>
                                            </div>
                                            {sub.status === 'active' && (
                                                <button
                                                    onClick={() => { setSubmissionToCancel({ id: sub.id, points: sub.points_awarded }); setShowCancelModal(true); }}
                                                    className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs rounded-lg transition"
                                                >
                                                    Cancel
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {data.submissionsPagination?.totalPages > 1 && (
                                <div className="flex justify-between items-center mt-4 pt-4 border-t border-red-900/30">
                                    <p className="text-xs text-gray-400">
                                        Page {data.submissionsPagination.page} of {data.submissionsPagination.totalPages}
                                    </p>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setSubmissionsPage(submissionsPage - 1)}
                                            disabled={submissionsPage === 1}
                                            className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg text-sm transition text-white"
                                        >
                                            Previous
                                        </button>
                                        <button
                                            onClick={() => setSubmissionsPage(submissionsPage + 1)}
                                            disabled={submissionsPage === data.submissionsPagination.totalPages}
                                            className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg text-sm transition text-white"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <p className="text-gray-400 text-center py-8">You haven't submitted any proof yet</p>
                    )}
                </div>

                {/* Redemption History */}
                <div className="bg-black bg-opacity-40 backdrop-blur-lg border border-red-900/30 rounded-2xl p-6 mb-2.5">
                    <h3 className="text-xl font-bold text-white mb-4">My Redemptions</h3>
                    {data?.redemptions?.length > 0 ? (
                        <>
                            <div className="space-y-3">
                                {data.redemptions.map((redemption) => (
                                    <div key={redemption.id} className="p-4 bg-gray-900 bg-opacity-50 rounded-xl border-l-4 border-red-600">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <p className="text-sm font-bold text-white">
                                                    {redemption.points_requested} points = ₹{redemption.points_requested / systemSettings.points_per_rupee}
                                                </p>
                                                <p className="text-xs text-gray-400">
                                                    {new Date(redemption.requested_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${redemption.status === 'pending' ? 'bg-yellow-900 text-yellow-300' :
                                                redemption.status === 'approved' ? 'bg-green-900 text-green-300' :
                                                    'bg-red-900 text-red-300'
                                                }`}>
                                                {redemption.status.toUpperCase()}
                                            </span>
                                        </div>

                                        {redemption.status === 'approved' && redemption.gift_code && (
                                            <div className="mt-3 p-3 bg-green-900 bg-opacity-30 border border-green-700 rounded-lg">
                                                <p className="text-xs text-green-400 mb-1 font-semibold">Gift Code:</p>
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="text-lg font-mono font-bold text-green-300 flex-1">{redemption.gift_code}</p>
                                                    <button
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(redemption.gift_code);
                                                            setToast({ isOpen: true, message: 'Gift code copied!', type: 'success' });
                                                        }}
                                                        className="text-green-400 hover:text-green-300"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {redemption.status === 'rejected' && redemption.rejection_reason && (
                                            <div className="mt-3 p-3 bg-red-900 bg-opacity-30 border border-red-700 rounded-lg">
                                                <p className="text-xs text-red-400 mb-1 font-semibold">Reason:</p>
                                                <p className="text-sm text-red-300">{redemption.rejection_reason}</p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {data.redemptionsPagination?.totalPages > 1 && (
                                <div className="flex justify-between items-center mt-4 pt-4 border-t border-red-900/30">
                                    <p className="text-xs text-gray-400">
                                        Page {data.redemptionsPagination.page} of {data.redemptionsPagination.totalPages}
                                    </p>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setRedemptionsPage(redemptionsPage - 1)}
                                            disabled={redemptionsPage === 1}
                                            className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg text-sm transition text-white"
                                        >
                                            Previous
                                        </button>
                                        <button
                                            onClick={() => setRedemptionsPage(redemptionsPage + 1)}
                                            disabled={redemptionsPage === data.redemptionsPagination.totalPages}
                                            className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg text-sm transition text-white"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <p className="text-gray-400 text-center py-8">You haven't redeemed any points yet</p>
                    )}
                </div>

                {/* Social Media Section */}
                {socialLinks.length > 0 && (
                    <div className="bg-black bg-opacity-40 backdrop-blur-lg border border-red-900/30 rounded-2xl p-6 mb-2.5">
                        <h3 className="text-xl font-bold text-white mb-4 text-center">
                            🌟 Follow Us on Social Media
                        </h3>
                        <p className="text-gray-300 text-center text-sm mb-6">
                            Stay updated with latest offers, tips, and announcements!
                        </p>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {socialLinks.map((link) => (
                                <a
                                    key={link.id}
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bg-gradient-to-br from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 rounded-xl p-4 flex flex-col items-center justify-center gap-3 transition-all transform hover:scale-105 shadow-lg"
                                >
                                    <div className="text-4xl">{getSocialIcon(link.platform)}</div>
                                    <span className="text-white font-semibold text-sm text-center">
                                        {link.title}
                                    </span>
                                </a>
                            ))}
                        </div>
                    </div>
                )}



                {/* Platform Statistics */}
                <div className="bg-black bg-opacity-40 backdrop-blur-lg border border-red-900/30 rounded-2xl p-6 mb-2.5">
                    <div className="flex items-center gap-2 mb-6">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <h3 className="text-xl font-bold text-white">🔥 Live Platform Activity</h3>
                    </div>

                    {/* Real-time Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-4 border border-red-900/20">
                            <p className="text-gray-400 text-xs mb-2">Total Users</p>
                            <p className="text-white text-3xl font-bold mb-1 transition-all duration-500">
                                {platformStats.totalUsers.toLocaleString()}
                            </p>
                            <p className="text-green-400 text-xs">growing daily</p>
                        </div>

                        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-4 border border-red-900/20">
                            <p className="text-gray-400 text-xs mb-2">Earned Today</p>
                            <p className="text-white text-3xl font-bold mb-1 transition-all duration-500">
                                {platformStats.earnedToday.toLocaleString()}
                            </p>
                            <p className="text-blue-400 text-xs">points distributed</p>
                        </div>

                        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-4 border border-red-900/20">
                            <p className="text-gray-400 text-xs mb-2">Active Now</p>
                            <p className="text-white text-3xl font-bold mb-1 transition-all duration-500">
                                {platformStats.activeNow}
                            </p>
                            <p className="text-yellow-400 text-xs">users online</p>
                        </div>

                        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-4 border border-red-900/20">
                            <p className="text-gray-400 text-xs mb-2">Total Paid</p>
                            <p className="text-white text-3xl font-bold mb-1 transition-all duration-500">
                                ₹{platformStats.totalPaid.toLocaleString()}
                            </p>
                            <p className="text-red-400 text-xs">redeemed</p>
                        </div>
                    </div>

                    {/* Recent Activity Feed */}
                    <div className="bg-gray-900 bg-opacity-50 rounded-xl p-4 border border-red-900/20">
                        <p className="text-gray-300 text-sm mb-3 font-semibold flex items-center gap-2">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            Recent Activity
                        </p>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                            {recentActivity.map((activity) => (
                                <div key={activity.id} className="flex items-center justify-between text-sm py-2 border-b border-gray-800 last:border-0 animate-fadeIn">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                            {activity.user.substring(0, 2)}
                                        </div>
                                        <div>
                                            <p className="text-white font-medium">{activity.user}</p>
                                            <p className="text-gray-400 text-xs">
                                                {activity.action === 'earned'
                                                    ? `+${activity.points} points`
                                                    : `redeemed ${activity.amount}`}
                                            </p>
                                        </div>
                                    </div>
                                    <span className="text-gray-500 text-xs">{activity.time}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <p className="text-center text-gray-500 text-xs mt-4">
                        💰 Join thousands earning daily on Raja Games!
                    </p>
                </div>



                {/* Footer */}
                <div className="text-center py-6 border-t border-red-900/30">
                    <p className="text-gray-400 text-sm mb-2">© 2024 Raja Games. All rights reserved.</p>
                    <p className="text-gray-500 text-xs">Share. Earn. Win Daily!</p>
                </div>
            </div>

            {/* Modals */}
            <Modal
                isOpen={showRedeemModal}
                onClose={() => setShowRedeemModal(false)}
                onConfirm={handleRedemption}
                title="Confirm Redemption"
                message={`Redeem ${systemSettings.redemption_amount} points for ₹${(systemSettings.redemption_amount / systemSettings.points_per_rupee).toFixed(2)} gift code?`}
                confirmText="Yes, Redeem"
                cancelText="Cancel"
                type="confirm"
            />

            <Modal
                isOpen={showCancelModal}
                onClose={() => { setShowCancelModal(false); setSubmissionToCancel(null); }}
                onConfirm={handleCancelSubmission}
                title="Cancel Submission"
                message={`Cancel this submission? ${submissionToCancel?.points || 0} points will be deducted.`}
                confirmText="Yes, Cancel"
                cancelText="Keep It"
                type="confirm"
            />

            {showRecipientsModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-70">
                    <div className="bg-gray-900 border border-red-600 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-y-auto p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white">
                                Numbers I Shared ({recipients.length} total)
                            </h3>
                            <button
                                onClick={() => setShowRecipientsModal(false)}
                                className="text-gray-400 hover:text-white text-3xl"
                            >
                                ×
                            </button>
                        </div>

                        {recipients.length === 0 ? (
                            <p className="text-gray-400 text-center py-8">You haven't shared with anyone yet</p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {recipients.map((recipient, index) => (
                                    <div key={index} className="flex items-center justify-between bg-black bg-opacity-50 px-4 py-3 rounded-lg border border-red-900/30">
                                        <div className="flex-1">
                                            <p className="text-sm font-mono text-white">{recipient.recipient_number}</p>
                                            <p className="text-xs text-gray-400">
                                                {new Date(recipient.first_shared).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => copyNumber(recipient.recipient_number)}
                                            className="ml-2 text-red-400 hover:text-red-300"
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
            )}

            {/* Inbox Modal */}
            {showInbox && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-70">
                    <div className="bg-gray-900 border border-red-600 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col">
                        {/* Header */}
                        <div className="p-6 border-b border-red-900/30 flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-bold text-white">Inbox</h3>
                                <p className="text-sm text-gray-400">{messages.length} message(s)</p>
                            </div>
                            <button
                                onClick={() => { setShowInbox(false); setSelectedMessage(null); }}
                                className="text-gray-400 hover:text-white text-3xl"
                            >
                                ×
                            </button>
                        </div>

                        {/* Messages List */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {messages.length === 0 ? (
                                <div className="text-center py-12">
                                    <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                    </svg>
                                    <p className="text-gray-400">No messages yet</p>
                                    <p className="text-gray-500 text-sm mt-2">You'll receive updates and notifications here</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {messages.map((message) => (
                                        <div
                                            key={`${message.message_type}-${message.id}`}
                                            onClick={() => {
                                                setSelectedMessage(message);
                                                if (!message.is_read) {
                                                    markAsRead(message.id, message.message_type);
                                                }
                                            }}
                                            className={`p-4 rounded-xl border cursor-pointer transition ${message.is_read
                                                ? 'bg-gray-800 border-gray-700 hover:bg-gray-750'
                                                : 'bg-red-900/20 border-red-600 hover:bg-red-900/30'
                                                }`}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-semibold text-white">{message.title}</h4>
                                                    {!message.is_read && (
                                                        <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                                                    )}
                                                    {message.message_type === 'broadcast' && (
                                                        <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded">
                                                            Announcement
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-xs text-gray-500">
                                                    {new Date(message.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-300 line-clamp-2">{message.message}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Message Detail Modal */}
            {selectedMessage && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black bg-opacity-80">
                    <div className="bg-gray-900 border border-red-600 rounded-2xl shadow-2xl max-w-2xl w-full p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-xl font-bold text-white mb-1">{selectedMessage.title}</h3>
                                <p className="text-sm text-gray-400">
                                    {new Date(selectedMessage.created_at).toLocaleString()}
                                    {selectedMessage.message_type === 'broadcast' && (
                                        <span className="ml-2 text-xs bg-blue-500 text-white px-2 py-0.5 rounded">
                                            Announcement
                                        </span>
                                    )}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedMessage(null)}
                                className="text-gray-400 hover:text-white text-3xl"
                            >
                                ×
                            </button>
                        </div>

                        <div className="bg-black bg-opacity-40 rounded-xl p-4 mb-4 border border-red-900/30">
                            <p className="text-gray-200 whitespace-pre-wrap leading-relaxed">
                                {selectedMessage.message}
                            </p>
                        </div>

                        <button
                            onClick={() => setSelectedMessage(null)}
                            className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

            <Toast
                isOpen={toast.isOpen}
                message={toast.message}
                type={toast.type}
                onClose={() => setToast({ ...toast, isOpen: false })}
            />

            {/* Floating Telegram Button */}
            <a
                href="https://t.me/Rajagamesbot"
                target="_blank"
                rel="noopener noreferrer"
                className="fixed bottom-6 right-6 z-40 group"
            >
                <div className="bg-blue-500 hover:bg-blue-600 rounded-full p-4 shadow-2xl hover:scale-110 transition-all duration-300 flex items-center gap-3">
                    {/* Telegram Icon */}
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.226-.461-1.901-.903-1.056-.693-1.653-1.124-2.678-1.8-1.185-.781-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.329-.913.489-1.302.481-.428-.008-1.252-.241-1.865-.44-.752-.244-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635.099-.002.321.023.465.141.121.099.155.232.171.326.016.093.036.306.02.472z" />
                    </svg>

                    {/* Text appears on hover */}
                    <span className="text-white font-semibold text-sm whitespace-nowrap opacity-0 max-w-0 group-hover:opacity-100 group-hover:max-w-xs overflow-hidden transition-all duration-300">
                        Contact Us
                    </span>
                </div>
            </a>

        </div>
    );
}

export default Dashboard;