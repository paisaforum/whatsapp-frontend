import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Modal from './Modal';
import Toast from './Toast';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';

// ⬇️ ADD THIS LINE ⬇️
const API_BASE = 'https://vggamee.com/api';


// Helper to get admin auth headers
const getAuthHeaders = () => {
    const token = localStorage.getItem('adminToken'); // ← Note: adminToken, not token
    return token ? { Authorization: `Bearer ${token}` } : {};
};

// Handle authentication errors
const handleAuthError = (error) => {
    if (error.response?.status === 401) {
        localStorage.clear();
        window.location.href = '/admin/login'; // ← Redirect to admin login
    }
};

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend
);

function AdminDashboard() {
    const [redemptions, setRedemptions] = useState([]);
    const [selectedRedemption, setSelectedRedemption] = useState(null);
    const [userSubmissions, setUserSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    // Add these new states:
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [pointsToAdd, setPointsToAdd] = useState('');
    const [showAddPointsModal, setShowAddPointsModal] = useState(false);
    const [showDeleteUserModal, setShowDeleteUserModal] = useState(false);

    // Add these states around line 50-80 with other states
    const [socialLinks, setSocialLinks] = useState([]);
    const [showSocialLinkModal, setShowSocialLinkModal] = useState(false);
    const [editingSocialLink, setEditingSocialLink] = useState(null);
    const [socialLinkForm, setSocialLinkForm] = useState({
        platform: '',
        title: '',
        url: '',
        icon: '',
        displayOrder: 0
    });
    // Add these offer management states:
    const [offers, setOffers] = useState([]);
    const [showOfferModal, setShowOfferModal] = useState(false);
    const [editingOffer, setEditingOffer] = useState(null);
    const [offerImage, setOfferImage] = useState(null);
    const [offerCaption, setOfferCaption] = useState('');
    const [showDeleteOfferModal, setShowDeleteOfferModal] = useState(false);
    const [offerToDelete, setOfferToDelete] = useState(null);
    const [showDeductPointsModal, setShowDeductPointsModal] = useState(false);
    const [giftCode, setGiftCode] = useState('');
    const [rejectionReason, setRejectionReason] = useState('');
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [toast, setToast] = useState({ isOpen: false, message: '', type: 'success' });
    // Add these new states:
    const [redemptionPage, setRedemptionPage] = useState(1);
    const [redemptionFilter, setRedemptionFilter] = useState('pending');
    const [redemptionSearch, setRedemptionSearch] = useState('');
    const [redemptionPagination, setRedemptionPagination] = useState({ total: 0, totalPages: 0 });

    const [userPage, setUserPage] = useState(1);
    const [userSearch, setUserSearch] = useState('');
    const [userPagination, setUserPagination] = useState({ total: 0, totalPages: 0 });
    const navigate = useNavigate();
    const adminId = localStorage.getItem('adminId');

    const [settings, setSettings] = useState([]);
    const [editingSetting, setEditingSetting] = useState(null);
    const [settingValue, setSettingValue] = useState('');
    // Platform Stats Configuration States
    const [platformStatsConfig, setPlatformStatsConfig] = useState({
        total_users_current: 1000,
        total_users_target: 2000,
        total_users_days_to_complete: 1,
        earned_today_target: 15200,
        earned_today_hours_to_complete: 13,
        active_now_min: 150,
        active_now_max: 160,
        total_paid_current: 54252,
        total_paid_target: 60000,
        total_paid_days_to_complete: 1
    });
    const [platformStatsLoading, setPlatformStatsLoading] = useState(false);
    // Messaging states
    const [showSendMessageModal, setShowSendMessageModal] = useState(false);
    const [messageRecipientType, setMessageRecipientType] = useState('broadcast'); // 'broadcast' or 'specific'
    const [messageUserId, setMessageUserId] = useState('');
    const [messageTitle, setMessageTitle] = useState('');
    const [messageContent, setMessageContent] = useState('');
    const [messageHistory, setMessageHistory] = useState({ userMessages: [], broadcasts: [] });
    const [showMessageHistoryModal, setShowMessageHistoryModal] = useState(false);

    // Data Management states
    const [showDataManagementModal, setShowDataManagementModal] = useState(false);
    const [systemStats, setSystemStats] = useState(null);
    const [dataActionType, setDataActionType] = useState('');
    const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
    const [showSettingModal, setShowSettingModal] = useState(false);

    // Analytics states
    const [analyticsOverview, setAnalyticsOverview] = useState(null);
    const [userGrowthData, setUserGrowthData] = useState(null);
    const [pointsDistributionData, setPointsDistributionData] = useState(null);
    const [redemptionStatusData, setRedemptionStatusData] = useState(null);
    const [activeUsersData, setActiveUsersData] = useState(null);
    const [analyticsDays, setAnalyticsDays] = useState(30);
    const [showAnalytics, setShowAnalytics] = useState(false);
    // Banner states
    const [banners, setBanners] = useState([]);
    const [showBannerModal, setShowBannerModal] = useState(false);
    const [editingBanner, setEditingBanner] = useState(null);
    const [bannerImage, setBannerImage] = useState(null);
    const [bannerTitle, setBannerTitle] = useState('');
    const [bannerLink, setBannerLink] = useState('');
    const [bannerOrder, setBannerOrder] = useState(0);
    const [showDeleteBannerModal, setShowDeleteBannerModal] = useState(false);
    const [bannerToDelete, setBannerToDelete] = useState(null);

    useEffect(() => {
        if (!adminId) {
            navigate('/admin/login');
            return;
        }

        // Initial fetch
        fetchRedemptions();
        fetchUsers();
        fetchOffers();
        fetchSettings();
        fetchBanners();
        fetchSocialLinks();

        // Silent auto-refresh intervals (no visual indicators)
        const redemptionsInterval = setInterval(() => {
            fetchRedemptions(); // Check for new redemption requests every 30s
        }, 30000);

        const usersInterval = setInterval(() => {
            fetchUsers(); // Update user list every 60s
        }, 60000);

        const offersInterval = setInterval(() => {
            fetchOffers(); // Check for new offers every 60s
        }, 60000);

        // Cleanup intervals on unmount
        return () => {
            clearInterval(redemptionsInterval);
            clearInterval(usersInterval);
            clearInterval(offersInterval);
        };
    }, [adminId, navigate, redemptionPage, redemptionFilter, redemptionSearch, userPage, userSearch]);

    const fetchRedemptions = async () => {
        try {
            const response = await axios.get(`${API_BASE}/admin/redemptions`, {
                headers: getAuthHeaders(),
                params: {
                    page: redemptionPage,
                    limit: 20,
                    status: redemptionFilter,
                    search: redemptionSearch
                }
            });
            setRedemptions(response.data.redemptions);
            setRedemptionPagination(response.data.pagination);
            setLoading(false);
        } catch (error) {
            handleAuthError(error);
            console.error('Failed to load redemptions:', error);
            setLoading(false);
        }
    };

    // Add with other fetch functions
    const fetchSocialLinks = async () => {
        try {
            const response = await axios.get(`${API_BASE}/admin/social-links`, {
                headers: getAuthHeaders()
            });
            setSocialLinks(response.data.links);
        } catch (error) {
            handleAuthError(error);
            console.error('Failed to load social links:', error);
        }
    };
    // Add this new function:
    const fetchUsers = async () => {
        try {
            const response = await axios.get(`${API_BASE}/admin/users`, {
                headers: getAuthHeaders(),
                params: {
                    page: userPage,
                    limit: 20,
                    search: userSearch
                }
            });
            setUsers(response.data.users);
            setUserPagination(response.data.pagination);
        } catch (error) {
            handleAuthError(error);
            console.error('Failed to load users:', error);
        }
    };

    const fetchOffers = async () => {
        try {
            const response = await axios.get(`${API_BASE}/admin/offers`, {
                headers: getAuthHeaders() // ← ADD
            });
            setOffers(response.data.offers);
        } catch (error) {
            handleAuthError(error);
            console.error('Failed to load offers:', error);
        }
    };

    const fetchSettings = async () => {
        try {
            const response = await axios.get(`${API_BASE}/admin/settings`, {
                headers: getAuthHeaders() // ← ADD
            });
            setSettings(response.data.settings);
        } catch (error) {
            handleAuthError(error);
            console.error('Failed to load settings:', error);
        }
    };

    const fetchPlatformStatsConfig = async () => {
        try {
            const response = await axios.get(`${API_BASE}/admin/platform-stats-config`, {
                headers: getAuthHeaders() // ← ADD
            });
            setPlatformStatsConfig(response.data.config);
        } catch (error) {
            handleAuthError(error);
            console.error('Failed to load platform stats config:', error);
            setToast({ isOpen: true, message: 'Failed to load platform stats config', type: 'error' });
        }
    };

    const fetchMessageHistory = async () => {
        try {
            const response = await axios.get(`${API_BASE}/admin/messages-history`, {
                headers: getAuthHeaders() // ← ADD
            });
            setMessageHistory(response.data);
        } catch (error) {
            handleAuthError(error);
            console.error('Failed to load message history:', error);
            setToast({ isOpen: true, message: 'Failed to load message history', type: 'error' });
        }
    };


    const fetchSystemStats = async () => {
        try {
            const response = await axios.get(`${API_BASE}/admin/system-stats`, {
                headers: getAuthHeaders() // ← ADD
            });
            setSystemStats(response.data.stats);
        } catch (error) {
            handleAuthError(error);
            console.error('Failed to load system stats:', error);
            setToast({ isOpen: true, message: 'Failed to load system stats', type: 'error' });
        }
    };

    const handleClearData = async () => {
        setActionLoading(true);
        try {
            let endpoint = '';
            let successMessage = '';

            switch (dataActionType) {
                case 'messages':
                    endpoint = '/admin/clear-all-messages';
                    successMessage = 'All messages cleared successfully!';
                    break;
                case 'submissions':
                    endpoint = '/admin/clear-all-submissions';
                    successMessage = 'All submissions cleared successfully!';
                    break;
                case 'redemptions':
                    endpoint = '/admin/clear-all-redemptions';
                    successMessage = 'All redemptions cleared successfully!';
                    break;
                case 'recipients':
                    endpoint = '/admin/clear-recipients-history';
                    successMessage = 'Recipient history cleared successfully!';
                    break;
                default:
                    throw new Error('Invalid action type');
            }

            await axios.delete(`${API_BASE}${endpoint}`, {
                headers: getAuthHeaders() // ← ADD
            });

            setToast({ isOpen: true, message: successMessage, type: 'success' });
            setShowConfirmDeleteModal(false);
            setDataActionType('');
            fetchSystemStats(); // Refresh stats

        } catch (error) {
            handleAuthError(error);
            setToast({ isOpen: true, message: 'Failed to clear data', type: 'error' });
        } finally {
            setActionLoading(false);
        }
    };

    const fetchAnalytics = async (days = 30) => {
        try {
            // Fetch overview
            const overview = await axios.get(`${API_BASE}/admin/analytics/overview`, {
                headers: getAuthHeaders() // ← ADD
            });
            setAnalyticsOverview(overview.data);

            // Fetch user growth
            const userGrowth = await axios.get(`${API_BASE}/admin/analytics/user-growth?days=${days}`, {
                headers: getAuthHeaders() // ← ADD
            });
            setUserGrowthData(userGrowth.data.data);

            // Fetch points distribution
            const pointsDist = await axios.get(`${API_BASE}/admin/analytics/points-distribution?days=${days}`, {
                headers: getAuthHeaders() // ← ADD
            });
            setPointsDistributionData(pointsDist.data.data);

            // Fetch redemption status
            const redemptionStatus = await axios.get(`${API_BASE}/admin/analytics/redemption-status`, {
                headers: getAuthHeaders() // ← ADD
            });
            setRedemptionStatusData(redemptionStatus.data.data);

            // Fetch active users
            const activeUsers = await axios.get(`${API_BASE}/admin/analytics/active-users?days=${days}`, {
                headers: getAuthHeaders() // ← ADD
            });
            setActiveUsersData(activeUsers.data.data);

        } catch (error) {
            handleAuthError(error);
            console.error('Failed to load analytics:', error);
            setToast({ isOpen: true, message: 'Failed to load analytics', type: 'error' });
        }
    };


    const fetchBanners = async () => {
        try {
            const response = await axios.get(`${API_BASE}/admin/banners`, {
                headers: getAuthHeaders() // ← ADD
            });
            setBanners(response.data.banners);
        } catch (error) {
            handleAuthError(error);
            console.error('Failed to load banners:', error);
            setToast({ isOpen: true, message: 'Failed to load banners', type: 'error' });
        }
    };


    const handleCreateBanner = async () => {
        if (!bannerImage) {
            setToast({ isOpen: true, message: 'Please select an image', type: 'error' });
            return;
        }

        setActionLoading(true);
        const formData = new FormData();
        formData.append('image', bannerImage);
        formData.append('title', bannerTitle);
        formData.append('link_url', bannerLink);
        formData.append('display_order', bannerOrder);

        try {
            await axios.post(`${API_BASE}/admin/create-banner`, formData, {
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type': 'multipart/form-data'
                }
            });

            setToast({ isOpen: true, message: 'Banner created successfully!', type: 'success' });
            setShowBannerModal(false);
            setBannerTitle('');
            setBannerLink('');
            setBannerOrder(0);
            setBannerImage(null);
            fetchBanners();
        } catch (error) {
            handleAuthError(error);
            setToast({ isOpen: true, message: 'Failed to create banner', type: 'error' });
        } finally {
            setActionLoading(false);
        }
    };

    const handleUpdateBanner = async () => {
        setActionLoading(true);
        const formData = new FormData();
        if (bannerImage) {
            formData.append('image', bannerImage);
        }
        formData.append('title', bannerTitle);
        formData.append('link_url', bannerLink);
        formData.append('display_order', bannerOrder);

        try {
            await axios.put(`${API_BASE}/admin/update-banner/${editingBanner.id}`, formData, {
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type': 'multipart/form-data'
                }
            });

            setToast({ isOpen: true, message: 'Banner updated successfully!', type: 'success' });
            setShowBannerModal(false);
            setEditingBanner(null);
            setBannerTitle('');
            setBannerLink('');
            setBannerOrder(0);
            setBannerImage(null);
            fetchBanners();
        } catch (error) {
            handleAuthError(error);
            setToast({ isOpen: true, message: 'Failed to update banner', type: 'error' });
        } finally {
            setActionLoading(false);
        }
    };

    const handleToggleBanner = async (bannerId) => {
        try {
            await axios.post(`${API_BASE}/admin/toggle-banner/${bannerId}`, {
                headers: getAuthHeaders() // ← ADD
            });
            setToast({ isOpen: true, message: 'Banner status updated!', type: 'success' });
            fetchBanners();
        } catch (error) {
            handleAuthError(error);
            setToast({ isOpen: true, message: 'Failed to update banner status', type: 'error' });
        }
    };

    const handleDeleteBanner = async () => {
        try {
            await axios.delete(`${API_BASE}/admin/delete-banner/${bannerToDelete}`, {
                headers: getAuthHeaders() // ← ADD
            });
            setToast({ isOpen: true, message: 'Banner deleted successfully!', type: 'success' });
            setShowDeleteBannerModal(false);
            setBannerToDelete(null);
            fetchBanners();
        } catch (error) {
            handleAuthError(error);
            setToast({ isOpen: true, message: 'Failed to delete banner', type: 'error' });
        }
    };

    const handleSendMessage = async () => {
        if (!messageTitle.trim() || !messageContent.trim()) {
            setToast({ isOpen: true, message: 'Please fill in title and message', type: 'error' });
            return;
        }

        if (messageRecipientType === 'specific' && !messageUserId) {
            setToast({ isOpen: true, message: 'Please select a user', type: 'error' });
            return;
        }

        setActionLoading(true);
        try {
            if (messageRecipientType === 'broadcast') {
                await axios.post(`${API_BASE}/admin/broadcast-message`, {
                    title: messageTitle,
                    message: messageContent,
                    adminId: adminId
                }, {
                    headers: getAuthHeaders() // ← ADD THIS
                });
                setToast({ isOpen: true, message: 'Broadcast sent to all users!', type: 'success' });
            } else {
                await axios.post(`${API_BASE}/admin/send-message`, {
                    userId: messageUserId,
                    title: messageTitle,
                    message: messageContent,
                    adminId: adminId
                }, {
                    headers: getAuthHeaders() // ← ADD THIS
                });
                setToast({ isOpen: true, message: 'Message sent successfully!', type: 'success' });
            }

            // Reset form
            setShowSendMessageModal(false);
            setMessageTitle('');
            setMessageContent('');
            setMessageUserId('');
            setMessageRecipientType('broadcast');

        } catch (error) {
            handleAuthError(error);
            setToast({ isOpen: true, message: 'Failed to send message', type: 'error' });
        } finally {
            setActionLoading(false);
        }
    };

    // Add these functions with other handler functions

    const handleCreateSocialLink = async () => {
        if (!socialLinkForm.platform || !socialLinkForm.title || !socialLinkForm.url || !socialLinkForm.icon) {
            setToast({ isOpen: true, message: 'Please fill all fields', type: 'error' });
            return;
        }

        setActionLoading(true);
        try {
            await axios.post(`${API_BASE}/admin/create-social-link`, socialLinkForm, {
                headers: getAuthHeaders()
            });
            setToast({ isOpen: true, message: 'Social link created!', type: 'success' });
            setShowSocialLinkModal(false);
            setSocialLinkForm({ platform: '', title: '', url: '', icon: '', displayOrder: 0 });
            fetchSocialLinks();
        } catch (error) {
            handleAuthError(error);
            setToast({ isOpen: true, message: 'Failed to create social link', type: 'error' });
        } finally {
            setActionLoading(false);
        }
    };

    const handleUpdateSocialLink = async () => {
        if (!socialLinkForm.platform || !socialLinkForm.title || !socialLinkForm.url || !socialLinkForm.icon) {
            setToast({ isOpen: true, message: 'Please fill all fields', type: 'error' });
            return;
        }

        setActionLoading(true);
        try {
            await axios.put(`${API_BASE}/admin/update-social-link/${editingSocialLink.id}`, {
                ...socialLinkForm,
                isActive: editingSocialLink.is_active
            }, {
                headers: getAuthHeaders()
            });
            setToast({ isOpen: true, message: 'Social link updated!', type: 'success' });
            setShowSocialLinkModal(false);
            setEditingSocialLink(null);
            setSocialLinkForm({ platform: '', title: '', url: '', icon: '', displayOrder: 0 });
            fetchSocialLinks();
        } catch (error) {
            handleAuthError(error);
            setToast({ isOpen: true, message: 'Failed to update social link', type: 'error' });
        } finally {
            setActionLoading(false);
        }
    };

    const handleToggleSocialLink = async (linkId) => {
        try {
            await axios.post(`${API_BASE}/admin/toggle-social-link/${linkId}`, {}, {
                headers: getAuthHeaders()
            });
            setToast({ isOpen: true, message: 'Status toggled!', type: 'success' });
            fetchSocialLinks();
        } catch (error) {
            handleAuthError(error);
            setToast({ isOpen: true, message: 'Failed to toggle status', type: 'error' });
        }
    };

    const handleDeleteSocialLink = async (linkId) => {
        if (!window.confirm('Delete this social link?')) return;

        try {
            await axios.delete(`${API_BASE}/admin/delete-social-link/${linkId}`, {
                headers: getAuthHeaders()
            });
            setToast({ isOpen: true, message: 'Social link deleted!', type: 'success' });
            fetchSocialLinks();
        } catch (error) {
            handleAuthError(error);
            setToast({ isOpen: true, message: 'Failed to delete social link', type: 'error' });
        }
    };

    const openSocialLinkModal = (link = null) => {
        if (link) {
            setEditingSocialLink(link);
            setSocialLinkForm({
                platform: link.platform,
                title: link.title,
                url: link.url,
                icon: link.icon,
                displayOrder: link.display_order
            });
        } else {
            setEditingSocialLink(null);
            setSocialLinkForm({ platform: '', title: '', url: '', icon: '', displayOrder: 0 });
        }
        setShowSocialLinkModal(true);
    };


    const handleUpdatePlatformStats = async () => {
        setPlatformStatsLoading(true);
        try {
            await axios.put(`${API_BASE}/admin/platform-stats-config`, platformStatsConfig, {
                headers: getAuthHeaders() // ← ADD
            });
            setToast({ isOpen: true, message: 'Platform stats updated successfully!', type: 'success' });
            fetchPlatformStatsConfig(); // Reload to confirm
        } catch (error) {
            handleAuthError(error);
            console.error('Failed to update platform stats:', error);
            setToast({ isOpen: true, message: 'Failed to update platform stats', type: 'error' });
        } finally {
            setPlatformStatsLoading(false);
        }
    };

    const handleResetPlatformStats = async () => {
        if (!window.confirm('Reset all platform stats to default values?')) return;

        const defaults = {
            total_users_current: 2847,
            total_users_target: 3000,
            total_users_days_to_complete: 30,
            earned_today_target: 15000,
            earned_today_hours_to_complete: 24,
            active_now_min: 100,
            active_now_max: 200,
            total_paid_current: 48750,
            total_paid_target: 60000,
            total_paid_days_to_complete: 30
        };

        setPlatformStatsConfig(defaults);
        setToast({ isOpen: true, message: 'Reset to defaults (click Update to save)', type: 'info' });
    };

    const viewDetails = async (redemption) => {
        setSelectedRedemption(redemption);
        try {
            const response = await axios.get(`${API_BASE}/admin/user-submissions/${redemption.user_id}`, {
                headers: getAuthHeaders() // ← ADD
            });
            setUserSubmissions(response.data.submissions);
        } catch (error) {
            handleAuthError(error);
            console.error('Failed to load user submissions:', error);
        }
    };

    const handleApprove = async () => {
        if (!giftCode.trim()) {
            setToast({ isOpen: true, message: 'Please enter a gift code', type: 'error' });
            return;
        }

        setActionLoading(true);
        try {
            await axios.post(`${API_BASE}/admin/review-redemption`, {
                redemptionId: selectedRedemption.id,
                action: 'approve',
                giftCode: giftCode,
                adminId: adminId
            }, {
                headers: getAuthHeaders() // ← ADD
            });

            setToast({ isOpen: true, message: 'Redemption approved successfully!', type: 'success' });
            setShowApproveModal(false);
            setGiftCode('');
            setSelectedRedemption(null);
            fetchRedemptions();
        } catch (error) {
            handleAuthError(error);
            setToast({ isOpen: true, message: error.response?.data?.error || 'Failed to approve', type: 'error' });
        } finally {
            setActionLoading(false);
        }
    };

    const handleReject = async () => {
        if (!rejectionReason.trim()) {
            setToast({ isOpen: true, message: 'Please enter a rejection reason', type: 'error' });
            return;
        }

        setActionLoading(true);
        try {
            await axios.post(`${API_BASE}/admin/review-redemption`, {
                redemptionId: selectedRedemption.id,
                action: 'reject',
                rejectionReason: rejectionReason,
                adminId: adminId
            }, {
                headers: getAuthHeaders() // ← ADD
            });

            setToast({ isOpen: true, message: 'Redemption rejected', type: 'success' });
            setShowRejectModal(false);
            setRejectionReason('');
            setSelectedRedemption(null);
            fetchRedemptions();
        } catch (error) {
            handleAuthError(error);
            setToast({ isOpen: true, message: error.response?.data?.error || 'Failed to reject', type: 'error' });
        } finally {
            setActionLoading(false);
        }
    };


    const handleAddPoints = async () => {
        if (!pointsToAdd || parseInt(pointsToAdd) <= 0) {
            setToast({ isOpen: true, message: 'Please enter a valid number of points', type: 'error' });
            return;
        }

        setActionLoading(true);
        try {
            await axios.post(`${API_BASE}/admin/add-points`, {
                userId: selectedUser.id,
                points: parseInt(pointsToAdd)
            }, {
                headers: getAuthHeaders() // ← ADD
            });

            setToast({ isOpen: true, message: `Added ${pointsToAdd} points successfully!`, type: 'success' });
            setShowAddPointsModal(false);
            setPointsToAdd('');
            setSelectedUser(null);
            fetchUsers();
        } catch (error) {
            handleAuthError(error);
            setToast({ isOpen: true, message: error.response?.data?.error || 'Failed to add points', type: 'error' });
        } finally {
            setActionLoading(false);
        }
    };


    const handleDeductPoints = async () => {
        if (!pointsToAdd || parseInt(pointsToAdd) <= 0) {
            setToast({ isOpen: true, message: 'Please enter a valid number of points', type: 'error' });
            return;
        }

        setActionLoading(true);
        try {
            await axios.post(`${API_BASE}/admin/deduct-points`, {
                userId: selectedUser.id,
                points: parseInt(pointsToAdd)
            }, {
                headers: getAuthHeaders() // ← ADD
            });

            setToast({ isOpen: true, message: `Deducted ${pointsToAdd} points successfully!`, type: 'success' });
            setShowDeductPointsModal(false);
            setPointsToAdd('');
            setSelectedUser(null);
            fetchUsers();
        } catch (error) {
            handleAuthError(error);
            setToast({ isOpen: true, message: error.response?.data?.error || 'Failed to deduct points', type: 'error' });
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteUser = async () => {
        setActionLoading(true);
        try {
            await axios.delete(`${API_BASE}/admin/delete-user/${selectedUser.id}`, {
                headers: getAuthHeaders() // ← ADD
            });

            setToast({ isOpen: true, message: 'User deleted successfully!', type: 'success' });
            setShowDeleteUserModal(false);
            setSelectedUser(null);
            fetchUsers();
            fetchRedemptions();
        } catch (error) {
            handleAuthError(error);
            setToast({ isOpen: true, message: error.response?.data?.error || 'Failed to delete user', type: 'error' });
        } finally {
            setActionLoading(false);
        }
    };

    const handleCreateOffer = async () => {
        if (!offerCaption || !offerImage) {
            setToast({ isOpen: true, message: 'Please provide both image and caption', type: 'error' });
            return;
        }

        setActionLoading(true);
        const formData = new FormData();
        formData.append('caption', offerCaption);
        formData.append('image', offerImage);

        try {
            await axios.post(`${API_BASE}/admin/create-offer`, formData, {
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type': 'multipart/form-data'
                }
            });

            setToast({ isOpen: true, message: 'Offer created successfully!', type: 'success' });
            setShowOfferModal(false);
            setOfferCaption('');
            setOfferImage(null);
            fetchOffers();
        } catch (error) {
            handleAuthError(error);
            setToast({ isOpen: true, message: 'Failed to create offer', type: 'error' });
        } finally {
            setActionLoading(false);
        }
    };

    const handleUpdateOffer = async () => {
        if (!offerCaption) {
            setToast({ isOpen: true, message: 'Please provide a caption', type: 'error' });
            return;
        }

        setActionLoading(true);
        const formData = new FormData();
        formData.append('caption', offerCaption);
        if (offerImage) {
            formData.append('image', offerImage);
        }

        try {
            await axios.put(`${API_BASE}/admin/update-offer/${editingOffer.id}`, formData, {
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type': 'multipart/form-data'
                }
            });

            setToast({ isOpen: true, message: 'Offer updated successfully!', type: 'success' });
            setShowOfferModal(false);
            setEditingOffer(null);
            setOfferCaption('');
            setOfferImage(null);
            fetchOffers();
        } catch (error) {
            handleAuthError(error);
            setToast({ isOpen: true, message: 'Failed to update offer', type: 'error' });
        } finally {
            setActionLoading(false);
        }
    };

    const handleSetActiveOffer = async (offerId) => {
        try {
            await axios.post(`${API_BASE}/admin/set-active-offer`, { offerId }, {
                headers: getAuthHeaders() // ← ADD
            });
            setToast({ isOpen: true, message: 'Active offer updated!', type: 'success' });
            fetchOffers();
        } catch (error) {
            handleAuthError(error);
            setToast({ isOpen: true, message: 'Failed to set active offer', type: 'error' });
        }
    };

    const handleDeleteOffer = async () => {
        try {
            await axios.delete(`${API_BASE}/admin/delete-offer/${offerToDelete}`, {
                headers: getAuthHeaders() // ← ADD
            });
            setToast({ isOpen: true, message: 'Offer deleted successfully!', type: 'success' });
            setShowDeleteOfferModal(false);
            setOfferToDelete(null);
            fetchOffers();
        } catch (error) {
            handleAuthError(error);
            setToast({ isOpen: true, message: 'Failed to delete offer', type: 'error' });
        }
    };

    const handleUpdateSetting = async () => {
        if (!settingValue || parseInt(settingValue) <= 0) {
            setToast({ isOpen: true, message: 'Please enter a valid positive number', type: 'error' });
            return;
        }

        try {
            await axios.put(`${API_BASE}/admin/settings/${editingSetting.setting_key}`, {
                value: settingValue
            }, {
                headers: getAuthHeaders() // ← ADD
            });

            setToast({ isOpen: true, message: 'Setting updated successfully!', type: 'success' });
            setShowSettingModal(false);
            setEditingSetting(null);
            setSettingValue('');
            fetchSettings();
            fetchPlatformStatsConfig(); // Add this new line
        } catch (error) {
            handleAuthError(error);
            setToast({ isOpen: true, message: 'Failed to update setting', type: 'error' });
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('adminId');
        localStorage.removeItem('adminToken');
        navigate('/admin/login');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-xl text-gray-600">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-gray-800 text-white shadow-lg">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex justify-between items-center">
                        <h1 className="text-2xl font-bold">WhatsApp Task Admin Dashboard</h1>
                        <button
                            onClick={handleLogout}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-6">
                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white rounded-lg shadow p-6">
                        <p className="text-gray-600 text-sm">Pending Redemptions</p>
                        <p className="text-3xl font-bold text-yellow-600">
                            {redemptions.filter(r => r.status === 'pending').length}
                        </p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <p className="text-gray-600 text-sm">Approved</p>
                        <p className="text-3xl font-bold text-green-600">
                            {redemptions.filter(r => r.status === 'approved').length}
                        </p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <p className="text-gray-600 text-sm">Rejected</p>
                        <p className="text-3xl font-bold text-red-600">
                            {redemptions.filter(r => r.status === 'rejected').length}
                        </p>
                    </div>
                </div>


                {/* Analytics Dashboard */}
                <div className="bg-white rounded-lg shadow mb-6">
                    <div className="p-6 border-b">
                        <div className="flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold text-gray-800">Analytics Dashboard</h2>
                                <p className="text-sm text-gray-600 mt-1">Visual insights and trends</p>
                            </div>
                            <button
                                onClick={() => {
                                    setShowAnalytics(!showAnalytics);
                                    if (!showAnalytics) {
                                        fetchAnalytics(analyticsDays);
                                    }
                                }}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition"
                            >
                                {showAnalytics ? 'Hide Analytics' : 'Show Analytics'}
                            </button>
                        </div>
                    </div>

                    {showAnalytics && (
                        <div className="p-6">
                            {/* Overview Stats Cards */}
                            {analyticsOverview && (
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-xl p-4">
                                        <p className="text-xs text-blue-600 font-semibold mb-1">Total Users</p>
                                        <p className="text-3xl font-bold text-blue-700">{analyticsOverview.totalUsers}</p>
                                    </div>
                                    <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-xl p-4">
                                        <p className="text-xs text-green-600 font-semibold mb-1">Points Distributed</p>
                                        <p className="text-3xl font-bold text-green-700">{analyticsOverview.totalPointsDistributed.toLocaleString()}</p>
                                    </div>
                                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200 rounded-xl p-4">
                                        <p className="text-xs text-purple-600 font-semibold mb-1">Total Redeemed</p>
                                        <p className="text-3xl font-bold text-purple-700">{analyticsOverview.totalRedeemed.toLocaleString()}</p>
                                    </div>
                                    <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-200 rounded-xl p-4">
                                        <p className="text-xs text-yellow-600 font-semibold mb-1">Active Today</p>
                                        <p className="text-3xl font-bold text-yellow-700">{analyticsOverview.activeToday}</p>
                                    </div>
                                    <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-2 border-indigo-200 rounded-xl p-4">
                                        <p className="text-xs text-indigo-600 font-semibold mb-1">New This Week</p>
                                        <p className="text-3xl font-bold text-indigo-700">{analyticsOverview.newUsersThisWeek}</p>
                                    </div>
                                    <div className="bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-200 rounded-xl p-4">
                                        <p className="text-xs text-red-600 font-semibold mb-1">Pending</p>
                                        <p className="text-3xl font-bold text-red-700">{analyticsOverview.pendingRedemptions}</p>
                                    </div>
                                </div>
                            )}

                            {/* Date Range Filter */}
                            <div className="flex gap-2 mb-6 justify-end">
                                <button
                                    onClick={() => { setAnalyticsDays(7); fetchAnalytics(7); }}
                                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${analyticsDays === 7
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                        }`}
                                >
                                    Last 7 Days
                                </button>
                                <button
                                    onClick={() => { setAnalyticsDays(30); fetchAnalytics(30); }}
                                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${analyticsDays === 30
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                        }`}
                                >
                                    Last 30 Days
                                </button>
                                <button
                                    onClick={() => { setAnalyticsDays(90); fetchAnalytics(90); }}
                                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${analyticsDays === 90
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                        }`}
                                >
                                    Last 90 Days
                                </button>
                            </div>

                            {/* Charts Grid */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* User Growth Chart */}
                                {userGrowthData && (
                                    <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
                                        <h3 className="text-lg font-bold text-gray-800 mb-4">📈 User Growth</h3>
                                        <Line
                                            data={{
                                                labels: userGrowthData.map(d => new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
                                                datasets: [{
                                                    label: 'New Users',
                                                    data: userGrowthData.map(d => d.count),
                                                    borderColor: 'rgb(59, 130, 246)',
                                                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                                    tension: 0.4,
                                                    fill: true
                                                }]
                                            }}
                                            options={{
                                                responsive: true,
                                                maintainAspectRatio: true,
                                                plugins: {
                                                    legend: { display: false },
                                                    tooltip: { mode: 'index', intersect: false }
                                                },
                                                scales: {
                                                    y: { beginAtZero: true, ticks: { precision: 0 } }
                                                }
                                            }}
                                        />
                                    </div>
                                )}

                                {/* Points Distribution Chart */}
                                {pointsDistributionData && (
                                    <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
                                        <h3 className="text-lg font-bold text-gray-800 mb-4">💰 Points Distribution</h3>
                                        <Bar
                                            data={{
                                                labels: pointsDistributionData.map(d => new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
                                                datasets: [{
                                                    label: 'Points Awarded',
                                                    data: pointsDistributionData.map(d => d.total_points),
                                                    backgroundColor: 'rgba(34, 197, 94, 0.7)',
                                                    borderColor: 'rgb(34, 197, 94)',
                                                    borderWidth: 2
                                                }]
                                            }}
                                            options={{
                                                responsive: true,
                                                maintainAspectRatio: true,
                                                plugins: {
                                                    legend: { display: false },
                                                    tooltip: { mode: 'index', intersect: false }
                                                },
                                                scales: {
                                                    y: { beginAtZero: true, ticks: { precision: 0 } }
                                                }
                                            }}
                                        />
                                    </div>
                                )}

                                {/* Redemption Status Chart */}
                                {redemptionStatusData && (
                                    <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
                                        <h3 className="text-lg font-bold text-gray-800 mb-4">🎁 Redemption Status</h3>
                                        <div className="flex justify-center">
                                            <div style={{ maxWidth: '300px', maxHeight: '300px' }}>
                                                <Doughnut
                                                    data={{
                                                        labels: redemptionStatusData.map(d => d.status.charAt(0).toUpperCase() + d.status.slice(1)),
                                                        datasets: [{
                                                            data: redemptionStatusData.map(d => d.count),
                                                            backgroundColor: [
                                                                'rgba(234, 179, 8, 0.8)',  // pending - yellow
                                                                'rgba(34, 197, 94, 0.8)',  // approved - green
                                                                'rgba(239, 68, 68, 0.8)'   // rejected - red
                                                            ],
                                                            borderColor: [
                                                                'rgb(234, 179, 8)',
                                                                'rgb(34, 197, 94)',
                                                                'rgb(239, 68, 68)'
                                                            ],
                                                            borderWidth: 2
                                                        }]
                                                    }}
                                                    options={{
                                                        responsive: true,
                                                        maintainAspectRatio: true,
                                                        plugins: {
                                                            legend: { position: 'bottom' },
                                                            tooltip: {
                                                                callbacks: {
                                                                    label: function (context) {
                                                                        const label = context.label || '';
                                                                        const value = context.parsed || 0;
                                                                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                                                        const percentage = ((value / total) * 100).toFixed(1);
                                                                        return `${label}: ${value} (${percentage}%)`;
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Active Users Chart */}
                                {activeUsersData && (
                                    <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
                                        <h3 className="text-lg font-bold text-gray-800 mb-4">🟢 Active Users Trend</h3>
                                        <Line
                                            data={{
                                                labels: activeUsersData.map(d => new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
                                                datasets: [{
                                                    label: 'Active Users',
                                                    data: activeUsersData.map(d => d.active_users),
                                                    borderColor: 'rgb(168, 85, 247)',
                                                    backgroundColor: 'rgba(168, 85, 247, 0.1)',
                                                    tension: 0.4,
                                                    fill: true
                                                }]
                                            }}
                                            options={{
                                                responsive: true,
                                                maintainAspectRatio: true,
                                                plugins: {
                                                    legend: { display: false },
                                                    tooltip: { mode: 'index', intersect: false }
                                                },
                                                scales: {
                                                    y: { beginAtZero: true, ticks: { precision: 0 } }
                                                }
                                            }}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Info Footer */}
                            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-sm text-blue-800">
                                    <strong>💡 Tip:</strong> Charts update based on real data from your database. Use the date filters to view different time ranges.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Redemption Requests */}
                <div className="bg-white rounded-lg shadow">
                    <div className="p-6 border-b">
                        <h2 className="text-xl font-bold text-gray-800 mb-4">Redemption Requests</h2>

                        {/* Filters and Search */}
                        <div className="flex flex-col md:flex-row gap-4">
                            {/* Status Filter */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => { setRedemptionFilter('all'); setRedemptionPage(1); }}
                                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${redemptionFilter === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                        }`}
                                >
                                    All
                                </button>
                                <button
                                    onClick={() => { setRedemptionFilter('pending'); setRedemptionPage(1); }}
                                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${redemptionFilter === 'pending' ? 'bg-yellow-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                        }`}
                                >
                                    Pending
                                </button>
                                <button
                                    onClick={() => { setRedemptionFilter('approved'); setRedemptionPage(1); }}
                                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${redemptionFilter === 'approved' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                        }`}
                                >
                                    Approved
                                </button>
                                <button
                                    onClick={() => { setRedemptionFilter('rejected'); setRedemptionPage(1); }}
                                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${redemptionFilter === 'rejected' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                        }`}
                                >
                                    Rejected
                                </button>
                            </div>

                            {/* Search */}
                            <input
                                type="text"
                                value={redemptionSearch}
                                onChange={(e) => { setRedemptionSearch(e.target.value); setRedemptionPage(1); }}
                                placeholder="Search by WhatsApp number..."
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                    </div>

                    <div className="p-6">
                        {redemptions.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">No redemption requests found</p>
                        ) : (
                            <>
                                <div className="space-y-4">
                                    {redemptions.map((redemption) => (
                                        <div key={redemption.id} className="border rounded-lg p-4 hover:bg-gray-50 transition">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-semibold text-gray-800">User: {redemption.whatsapp_number}</p>
                                                    <p className="text-sm text-gray-600">Points: {redemption.points_requested} = ₹{redemption.points_requested / 10}</p>
                                                    <p className="text-xs text-gray-500">
                                                        Requested: {new Date(redemption.requested_at).toLocaleString()}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${redemption.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                                        redemption.status === 'approved' ? 'bg-green-100 text-green-700' :
                                                            'bg-red-100 text-red-700'
                                                        }`}>
                                                        {redemption.status.charAt(0).toUpperCase() + redemption.status.slice(1)}
                                                    </span>
                                                </div>
                                            </div>

                                            {redemption.status === 'pending' && (
                                                <div className="mt-4 flex gap-2">
                                                    <button
                                                        onClick={() => viewDetails(redemption)}
                                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition"
                                                    >
                                                        Review
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* Pagination */}
                                {redemptionPagination.totalPages > 1 && (
                                    <div className="flex justify-between items-center mt-6 pt-6 border-t">
                                        <p className="text-sm text-gray-600">
                                            Showing {redemptions.length} of {redemptionPagination.total} results
                                        </p>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setRedemptionPage(redemptionPage - 1)}
                                                disabled={redemptionPage === 1}
                                                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-semibold transition"
                                            >
                                                Previous
                                            </button>
                                            <span className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-semibold">
                                                Page {redemptionPage} of {redemptionPagination.totalPages}
                                            </span>
                                            <button
                                                onClick={() => setRedemptionPage(redemptionPage + 1)}
                                                disabled={redemptionPage === redemptionPagination.totalPages}
                                                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-semibold transition"
                                            >
                                                Next
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>


                {/* Offer Management */}
                <div className="bg-white rounded-lg shadow mt-6 mb-6">
                    <div className="p-6 border-b">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-800">Offer Management</h2>
                            <button
                                onClick={() => { setShowOfferModal(true); setEditingOffer(null); setOfferCaption(''); setOfferImage(null); }}
                                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition"
                            >
                                + Create New Offer
                            </button>
                        </div>
                    </div>

                    <div className="p-6">
                        {offers.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">No offers yet</p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {offers.map((offer) => (
                                    <div key={offer.id} className="border rounded-lg p-4 bg-gray-50 relative">
                                        {offer.is_active && (
                                            <span className="absolute top-2 right-2 px-2 py-1 bg-green-500 text-white text-xs font-semibold rounded">
                                                ACTIVE
                                            </span>
                                        )}

                                        <img
                                            src={`https://whatsapp-backend-0cr9.onrender.com${offer.image_url}`}
                                            alt="Offer"
                                            className="w-full h-40 object-cover rounded-lg mb-3"
                                        />

                                        <p className="text-sm text-gray-700 mb-3 line-clamp-3">{offer.caption}</p>

                                        <div className="flex flex-wrap gap-2">
                                            {!offer.is_active && (
                                                <button
                                                    onClick={() => handleSetActiveOffer(offer.id)}
                                                    className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition"
                                                >
                                                    Set Active
                                                </button>
                                            )}
                                            <button
                                                onClick={() => {
                                                    setEditingOffer(offer);
                                                    setOfferCaption(offer.caption);
                                                    setOfferImage(null);
                                                    setShowOfferModal(true);
                                                }}
                                                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => { setOfferToDelete(offer.id); setShowDeleteOfferModal(true); }}
                                                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>


                {/* Banner Management */}
                <div className="bg-white rounded-lg shadow mb-6">
                    <div className="p-6 border-b">
                        <div className="flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold text-gray-800">Banner Management</h2>
                                <p className="text-sm text-gray-600 mt-1">Manage carousel banners (Recommended size: 750x342px)</p>
                            </div>
                            <button
                                onClick={() => {
                                    setShowBannerModal(true);
                                    setEditingBanner(null);
                                    setBannerTitle('');
                                    setBannerLink('');
                                    setBannerOrder(0);
                                    setBannerImage(null);
                                }}
                                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition"
                            >
                                + Create New Banner
                            </button>
                        </div>
                    </div>

                    <div className="p-6">
                        {banners.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">No banners yet</p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {banners.map((banner) => (
                                    <div key={banner.id} className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50 relative">
                                        {banner.is_active && (
                                            <span className="absolute top-2 right-2 px-2 py-1 bg-green-500 text-white text-xs font-semibold rounded">
                                                ACTIVE
                                            </span>
                                        )}
                                        {!banner.is_active && (
                                            <span className="absolute top-2 right-2 px-2 py-1 bg-gray-500 text-white text-xs font-semibold rounded">
                                                INACTIVE
                                            </span>
                                        )}

                                        <img
                                            src={`https://whatsapp-backend-0cr9.onrender.com${banner.image_url}`}
                                            alt={banner.title || 'Banner'}
                                            className="w-full h-32 object-cover rounded-lg mb-3"
                                        />

                                        <div className="mb-3">
                                            {banner.title && (
                                                <p className="text-sm font-semibold text-gray-800 mb-1">{banner.title}</p>
                                            )}
                                            {banner.link_url && (
                                                <p className="text-xs text-blue-600 truncate">{banner.link_url}</p>
                                            )}
                                            <p className="text-xs text-gray-500 mt-1">Order: {banner.display_order}</p>
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                onClick={() => handleToggleBanner(banner.id)}
                                                className={`px-3 py-1 text-xs rounded transition ${banner.is_active
                                                    ? 'bg-gray-600 hover:bg-gray-700 text-white'
                                                    : 'bg-green-600 hover:bg-green-700 text-white'
                                                    }`}
                                            >
                                                {banner.is_active ? 'Deactivate' : 'Activate'}
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setEditingBanner(banner);
                                                    setBannerTitle(banner.title || '');
                                                    setBannerLink(banner.link_url || '');
                                                    setBannerOrder(banner.display_order);
                                                    setBannerImage(null);
                                                    setShowBannerModal(true);
                                                }}
                                                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => { setBannerToDelete(banner.id); setShowDeleteBannerModal(true); }}
                                                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Messaging Management */}
                <div className="bg-white rounded-lg shadow mb-6">
                    <div className="p-6 border-b">
                        <div className="flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold text-gray-800">Messaging System</h2>
                                <p className="text-sm text-gray-600 mt-1">Send messages to users or broadcast to all</p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        fetchMessageHistory();
                                        setShowMessageHistoryModal(true);
                                    }}
                                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition"
                                >
                                    Message History
                                </button>
                                <button
                                    onClick={() => setShowSendMessageModal(true)}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition"
                                >
                                    Send Message
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Info Cards */}
                            <div className="border-2 border-blue-200 rounded-xl p-5 bg-gradient-to-br from-blue-50 to-white">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="text-3xl">📢</span>
                                    <div>
                                        <p className="text-sm font-bold text-gray-800">Broadcast Messages</p>
                                        <p className="text-xs text-gray-600">Send to all users at once</p>
                                    </div>
                                </div>
                                <p className="text-sm text-gray-700 mt-3">
                                    Perfect for announcements, updates, and important notifications that every user should see.
                                </p>
                            </div>

                            <div className="border-2 border-green-200 rounded-xl p-5 bg-gradient-to-br from-green-50 to-white">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="text-3xl">💬</span>
                                    <div>
                                        <p className="text-sm font-bold text-gray-800">Direct Messages</p>
                                        <p className="text-xs text-gray-600">Send to specific user</p>
                                    </div>
                                </div>
                                <p className="text-sm text-gray-700 mt-3">
                                    Send personalized messages to individual users for support, follow-ups, or special offers.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Send Message Modal */}
                {showSendMessageModal && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black bg-opacity-50">
                        <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6">
                            <h3 className="text-xl font-bold text-gray-800 mb-4">Send Message</h3>

                            {/* Recipient Type Selection */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Send To:
                                </label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            value="broadcast"
                                            checked={messageRecipientType === 'broadcast'}
                                            onChange={(e) => setMessageRecipientType(e.target.value)}
                                            className="w-4 h-4 text-indigo-600"
                                        />
                                        <span className="text-sm font-medium text-gray-700">📢 Broadcast (All Users)</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            value="specific"
                                            checked={messageRecipientType === 'specific'}
                                            onChange={(e) => setMessageRecipientType(e.target.value)}
                                            className="w-4 h-4 text-indigo-600"
                                        />
                                        <span className="text-sm font-medium text-gray-700">💬 Specific User</span>
                                    </label>
                                </div>
                            </div>

                            {/* User Selection (if specific) */}
                            {messageRecipientType === 'specific' && (
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Select User:
                                    </label>
                                    <select
                                        value={messageUserId}
                                        onChange={(e) => setMessageUserId(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    >
                                        <option value="">-- Select a user --</option>
                                        {users.map((user) => (
                                            <option key={user.id} value={user.id}>
                                                {user.whatsapp_number} (ID: {user.id})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Message Title */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Message Title:
                                </label>
                                <input
                                    type="text"
                                    value={messageTitle}
                                    onChange={(e) => setMessageTitle(e.target.value)}
                                    placeholder="e.g., Welcome to Raja Games!"
                                    maxLength="100"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                                <p className="text-xs text-gray-500 mt-1">{messageTitle.length}/100 characters</p>
                            </div>

                            {/* Message Content */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Message Content:
                                </label>
                                <textarea
                                    value={messageContent}
                                    onChange={(e) => setMessageContent(e.target.value)}
                                    placeholder="Type your message here..."
                                    rows="6"
                                    maxLength="500"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                                />
                                <p className="text-xs text-gray-500 mt-1">{messageContent.length}/500 characters</p>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setShowSendMessageModal(false);
                                        setMessageTitle('');
                                        setMessageContent('');
                                        setMessageUserId('');
                                        setMessageRecipientType('broadcast');
                                    }}
                                    className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSendMessage}
                                    disabled={actionLoading}
                                    className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition disabled:opacity-50"
                                >
                                    {actionLoading ? 'Sending...' : messageRecipientType === 'broadcast' ? '📢 Send to All' : '💬 Send Message'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Message History Modal */}
                {showMessageHistoryModal && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black bg-opacity-50">
                        <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
                            <div className="p-6 border-b flex justify-between items-center">
                                <h3 className="text-xl font-bold text-gray-800">Message History</h3>
                                <button
                                    onClick={() => setShowMessageHistoryModal(false)}
                                    className="text-gray-400 hover:text-gray-600 text-3xl"
                                >
                                    ×
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6">
                                {/* Broadcasts */}
                                <div className="mb-6">
                                    <h4 className="text-lg font-semibold text-gray-800 mb-3">📢 Broadcast Messages</h4>
                                    {messageHistory.broadcasts.length === 0 ? (
                                        <p className="text-gray-500 text-sm">No broadcasts sent yet</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {messageHistory.broadcasts.map((msg) => (
                                                <div key={msg.id} className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <h5 className="font-semibold text-gray-800">{msg.title}</h5>
                                                        <span className="text-xs text-gray-500">
                                                            {new Date(msg.created_at).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-gray-700 mb-2">{msg.message}</p>
                                                    <p className="text-xs text-blue-600">
                                                        Read by {msg.read_count} / {msg.total_users} users
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Direct Messages */}
                                <div>
                                    <h4 className="text-lg font-semibold text-gray-800 mb-3">💬 Direct Messages</h4>
                                    {messageHistory.userMessages.length === 0 ? (
                                        <p className="text-gray-500 text-sm">No direct messages sent yet</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {messageHistory.userMessages.map((msg) => (
                                                <div key={msg.id} className="border border-green-200 rounded-lg p-4 bg-green-50">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div>
                                                            <h5 className="font-semibold text-gray-800">{msg.title}</h5>
                                                            <p className="text-xs text-gray-600">To: {msg.whatsapp_number}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className="text-xs text-gray-500 block">
                                                                {new Date(msg.created_at).toLocaleDateString()}
                                                            </span>
                                                            <span className={`text-xs ${msg.is_read ? 'text-green-600' : 'text-gray-500'}`}>
                                                                {msg.is_read ? '✓ Read' : 'Unread'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <p className="text-sm text-gray-700">{msg.message}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* User Management */}
                <div className="bg-white rounded-lg shadow mt-6 mb-6">
                    <div className="p-6 border-b">
                        <h2 className="text-xl font-bold text-gray-800 mb-4">User Management</h2>

                        {/* Search */}
                        <input
                            type="text"
                            value={userSearch}
                            onChange={(e) => { setUserSearch(e.target.value); setUserPage(1); }}
                            placeholder="Search by WhatsApp number..."
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>

                    <div className="p-6">
                        {users.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">No users found</p>
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">User ID</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">WhatsApp</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Total Points</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Joined</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {users.map((user) => (
                                                <tr key={user.id} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3 text-sm text-gray-800">{user.id}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-800">{user.whatsapp_number}</td>
                                                    <td className="px-4 py-3 text-sm font-semibold text-green-600">{user.total_points || 0}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-600">{new Date(user.created_at).toLocaleDateString()}</td>
                                                    <td className="px-4 py-3 text-sm">
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => { setSelectedUser(user); setShowAddPointsModal(true); }}
                                                                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition"
                                                            >
                                                                Add Points
                                                            </button>
                                                            <button
                                                                onClick={() => { setSelectedUser(user); setShowDeductPointsModal(true); }}
                                                                className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white text-xs rounded transition"
                                                            >
                                                                Deduct Points
                                                            </button>
                                                            <button
                                                                onClick={() => { setSelectedUser(user); setShowDeleteUserModal(true); }}
                                                                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition"
                                                            >
                                                                Delete
                                                            </button>
                                                            <button
                                                                onClick={() => navigate(`/admin/user/${user.id}`)}
                                                                className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded transition"
                                                            >
                                                                View Profile
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination */}
                                {userPagination.totalPages > 1 && (
                                    <div className="flex justify-between items-center mt-6 pt-6 border-t">
                                        <p className="text-sm text-gray-600">
                                            Showing {users.length} of {userPagination.total} users
                                        </p>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setUserPage(userPage - 1)}
                                                disabled={userPage === 1}
                                                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-semibold transition"
                                            >
                                                Previous
                                            </button>
                                            <span className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-semibold">
                                                Page {userPage} of {userPagination.totalPages}
                                            </span>
                                            <button
                                                onClick={() => setUserPage(userPage + 1)}
                                                disabled={userPage === userPagination.totalPages}
                                                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-semibold transition"
                                            >
                                                Next
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Social Links Management */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-gray-800">Social Media Links</h2>
                        <button
                            onClick={() => openSocialLinkModal()}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition flex items-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                            </svg>
                            Add Social Link
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {socialLinks.map((link) => (
                            <div key={link.id} className="border rounded-lg p-4 bg-gray-50">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="text-3xl">{link.icon}</div>
                                        <div>
                                            <h3 className="font-bold text-gray-800">{link.title}</h3>
                                            <p className="text-sm text-gray-500 capitalize">{link.platform}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleToggleSocialLink(link.id)}
                                        className={`px-3 py-1 rounded text-xs font-bold ${link.is_active
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-gray-200 text-gray-600'
                                            }`}
                                    >
                                        {link.is_active ? 'Active' : 'Inactive'}
                                    </button>
                                </div>

                                <div className="mb-3">
                                    <p className="text-xs text-gray-500 mb-1">URL:</p>
                                    <a
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-blue-600 hover:underline break-all"
                                    >
                                        {link.url}
                                    </a>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => openSocialLinkModal(link)}
                                        className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDeleteSocialLink(link.id)}
                                        className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition"
                                    >
                                        Delete
                                    </button>
                                </div>

                                <div className="mt-2 text-xs text-gray-500">
                                    Display Order: {link.display_order}
                                </div>
                            </div>
                        ))}
                    </div>

                    {socialLinks.length === 0 && (
                        <p className="text-center text-gray-500 py-8">No social links yet. Click "Add Social Link" to create one.</p>
                    )}
                </div>



                {/* System Settings */}
                <div className="bg-white rounded-lg shadow mb-6">
                    <div className="p-6 border-b">
                        <h2 className="text-xl font-bold text-gray-800">System Settings</h2>
                        <p className="text-sm text-gray-600 mt-1">Configure how points and redemptions work for users</p>
                    </div>
                    <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {settings.map((setting) => {
                                // Define helper text for each setting
                                const settingInfo = {
                                    'min_redemption_points': {
                                        label: 'Min Redemption Points',
                                        description: 'Minimum points users need to request a redemption',
                                        icon: '🎯',
                                        example: `Users need ${setting.setting_value} points to redeem`
                                    },
                                    'points_per_rupee': {
                                        label: 'Points Per Rupee',
                                        description: 'How many points equal ₹1',
                                        icon: '💰',
                                        example: `${setting.setting_value} points = ₹1`
                                    },
                                    'redemption_amount': {
                                        label: 'Redemption Amount',
                                        description: 'Points deducted per redemption request',
                                        icon: '🎁',
                                        example: `Each redemption = ₹${(setting.setting_value / (settings.find(s => s.setting_key === 'points_per_rupee')?.setting_value || 1)).toFixed(2)}`
                                    }
                                };

                                const info = settingInfo[setting.setting_key] || {
                                    label: setting.setting_key,
                                    description: 'No description',
                                    icon: '⚙️',
                                    example: ''
                                };

                                return (
                                    <div key={setting.id} className="border-2 border-gray-200 rounded-xl p-5 bg-gradient-to-br from-gray-50 to-white hover:shadow-lg transition">
                                        <div className="flex items-start gap-3 mb-3">
                                            <span className="text-3xl">{info.icon}</span>
                                            <div className="flex-1">
                                                <p className="text-sm font-bold text-gray-800 mb-1">
                                                    {info.label}
                                                </p>
                                                <p className="text-xs text-gray-600 leading-relaxed">{info.description}</p>
                                            </div>
                                        </div>

                                        <div className="bg-indigo-50 rounded-lg p-3 mb-3">
                                            <p className="text-xs text-indigo-600 mb-1">Current Value</p>
                                            <p className="text-3xl font-bold text-indigo-600">{setting.setting_value}</p>
                                            {info.example && (
                                                <p className="text-xs text-indigo-500 mt-1">{info.example}</p>
                                            )}
                                        </div>

                                        <button
                                            onClick={() => {
                                                setEditingSetting(setting);
                                                setSettingValue(setting.setting_value);
                                                setShowSettingModal(true);
                                            }}
                                            className="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition shadow-sm"
                                        >
                                            Edit
                                        </button>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Help Text */}
                        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex gap-2">
                                <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <div className="text-sm text-blue-800">
                                    <p className="font-semibold mb-1">How Settings Work Together:</p>
                                    <ul className="space-y-1 text-xs">
                                        <li>• Users earn 1 point per share</li>
                                        <li>• <strong>Points Per Rupee</strong> determines conversion rate (100 points = ₹1)</li>
                                        <li>• <strong>Min Redemption Points</strong> sets the threshold to redeem</li>
                                        <li>• <strong>Redemption Amount</strong> is the fixed points deducted when user redeems</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Platform Stats Configuration */}
                <div className="bg-white rounded-lg shadow mb-6">
                    <div className="p-6 border-b">
                        <h2 className="text-xl font-bold text-gray-800">Platform Stats Management</h2>
                        <p className="text-sm text-gray-600 mt-1">Control live platform statistics displayed to users</p>
                    </div>
                    <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Total Users */}
                            <div className="border-2 border-gray-200 rounded-xl p-5 bg-gradient-to-br from-blue-50 to-white">
                                <div className="flex items-start gap-3 mb-3">
                                    <div className="flex-1">
                                        <p className="text-sm font-bold text-gray-800 mb-1">Total Users</p>
                                        <p className="text-xs text-gray-600">Grows gradually over time</p>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-xs text-gray-600">Current Start Value</label>
                                        <input
                                            type="number"
                                            value={platformStatsConfig.total_users_current}
                                            onChange={(e) => setPlatformStatsConfig({ ...platformStatsConfig, total_users_current: parseInt(e.target.value) })}
                                            className="w-full px-3 py-2 border rounded-lg text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-600">Target Value</label>
                                        <input
                                            type="number"
                                            value={platformStatsConfig.total_users_target}
                                            onChange={(e) => setPlatformStatsConfig({ ...platformStatsConfig, total_users_target: parseInt(e.target.value) })}
                                            className="w-full px-3 py-2 border rounded-lg text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-600">Days to Complete</label>
                                        <input
                                            type="number"
                                            value={platformStatsConfig.total_users_days_to_complete}
                                            onChange={(e) => setPlatformStatsConfig({ ...platformStatsConfig, total_users_days_to_complete: parseInt(e.target.value) })}
                                            className="w-full px-3 py-2 border rounded-lg text-sm"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Earned Today */}
                            <div className="border-2 border-gray-200 rounded-xl p-5 bg-gradient-to-br from-green-50 to-white">
                                <div className="flex items-start gap-3 mb-3">
                                    <div className="flex-1">
                                        <p className="text-sm font-bold text-gray-800 mb-1">Earned Today</p>
                                        <p className="text-xs text-gray-600">Resets daily at midnight</p>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-xs text-gray-600">Daily Target Points</label>
                                        <input
                                            type="number"
                                            value={platformStatsConfig.earned_today_target}
                                            onChange={(e) => setPlatformStatsConfig({ ...platformStatsConfig, earned_today_target: parseInt(e.target.value) })}
                                            className="w-full px-3 py-2 border rounded-lg text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-600">Hours to Complete</label>
                                        <input
                                            type="number"
                                            value={platformStatsConfig.earned_today_hours_to_complete}
                                            onChange={(e) => setPlatformStatsConfig({ ...platformStatsConfig, earned_today_hours_to_complete: parseInt(e.target.value) })}
                                            className="w-full px-3 py-2 border rounded-lg text-sm"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Active Now */}
                            <div className="border-2 border-gray-200 rounded-xl p-5 bg-gradient-to-br from-yellow-50 to-white">
                                <div className="flex items-start gap-3 mb-3">
                                    <div className="flex-1">
                                        <p className="text-sm font-bold text-gray-800 mb-1">Active Now</p>
                                        <p className="text-xs text-gray-600">Fluctuates randomly</p>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-xs text-gray-600">Minimum Value</label>
                                        <input
                                            type="number"
                                            value={platformStatsConfig.active_now_min}
                                            onChange={(e) => setPlatformStatsConfig({ ...platformStatsConfig, active_now_min: parseInt(e.target.value) })}
                                            className="w-full px-3 py-2 border rounded-lg text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-600">Maximum Value</label>
                                        <input
                                            type="number"
                                            value={platformStatsConfig.active_now_max}
                                            onChange={(e) => setPlatformStatsConfig({ ...platformStatsConfig, active_now_max: parseInt(e.target.value) })}
                                            className="w-full px-3 py-2 border rounded-lg text-sm"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Total Paid */}
                            <div className="border-2 border-gray-200 rounded-xl p-5 bg-gradient-to-br from-red-50 to-white">
                                <div className="flex items-start gap-3 mb-3">
                                    <div className="flex-1">
                                        <p className="text-sm font-bold text-gray-800 mb-1">Total Paid Out</p>
                                        <p className="text-xs text-gray-600">Grows gradually over time</p>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-xs text-gray-600">Current Start Value (₹)</label>
                                        <input
                                            type="number"
                                            value={platformStatsConfig.total_paid_current}
                                            onChange={(e) => setPlatformStatsConfig({ ...platformStatsConfig, total_paid_current: parseInt(e.target.value) })}
                                            className="w-full px-3 py-2 border rounded-lg text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-600">Target Value (₹)</label>
                                        <input
                                            type="number"
                                            value={platformStatsConfig.total_paid_target}
                                            onChange={(e) => setPlatformStatsConfig({ ...platformStatsConfig, total_paid_target: parseInt(e.target.value) })}
                                            className="w-full px-3 py-2 border rounded-lg text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-600">Days to Complete</label>
                                        <input
                                            type="number"
                                            value={platformStatsConfig.total_paid_days_to_complete}
                                            onChange={(e) => setPlatformStatsConfig({ ...platformStatsConfig, total_paid_days_to_complete: parseInt(e.target.value) })}
                                            className="w-full px-3 py-2 border rounded-lg text-sm"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 flex gap-3">
                            <button
                                onClick={handleUpdatePlatformStats}
                                disabled={platformStatsLoading}
                                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition disabled:opacity-50"
                            >
                                {platformStatsLoading ? 'Updating...' : 'Update Configuration'}
                            </button>
                            <button
                                onClick={handleResetPlatformStats}
                                className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition"
                            >
                                Reset to Defaults
                            </button>
                        </div>

                        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-sm text-blue-800">
                                <strong>How it works:</strong> Set current and target values with timeframes. Stats grow gradually and realistically over the specified period.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Data Management */}
                <div className="bg-white rounded-lg shadow mb-6">
                    <div className="p-6 border-b">
                        <div className="flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold text-gray-800">Data Management</h2>
                                <p className="text-sm text-gray-600 mt-1">Clean up and manage system data</p>
                            </div>
                            <button
                                onClick={() => {
                                    fetchSystemStats();
                                    setShowDataManagementModal(true);
                                }}
                                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition"
                            >
                                Manage Data
                            </button>
                        </div>
                    </div>
                    <div className="p-6">
                        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm text-yellow-700">
                                        <strong>Warning:</strong> Data deletion is permanent and cannot be undone. Use with caution.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* Review Modal */}
            {selectedRedemption && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
                    <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-2xl font-bold text-gray-800">Review Redemption</h3>
                                <p className="text-gray-600">User: {selectedRedemption.whatsapp_number}</p>
                                <p className="text-gray-600">Points: {selectedRedemption.points_requested}</p>
                            </div>
                            <button
                                onClick={() => setSelectedRedemption(null)}
                                className="text-gray-400 hover:text-gray-600 text-2xl"
                            >
                                ×
                            </button>
                        </div>

                        {/* User Submissions */}
                        <div className="mb-6">
                            <h4 className="font-semibold text-gray-800 mb-3">User's Submission History:</h4>
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {userSubmissions.map((sub) => (
                                    <div key={sub.id} className="p-3 bg-gray-50 rounded-lg text-sm">
                                        <div className="flex justify-between">
                                            <span>{sub.recipient_count} shares</span>
                                            <span className="font-semibold text-green-600">+{sub.points_awarded} pts</span>
                                        </div>
                                        <p className="text-xs text-gray-500">{new Date(sub.created_at).toLocaleDateString()}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowApproveModal(true)}
                                className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition"
                            >
                                Approve
                            </button>
                            <button
                                onClick={() => setShowRejectModal(true)}
                                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition"
                            >
                                Reject
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Approve Modal */}
            {showApproveModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black bg-opacity-50">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
                        <h3 className="text-xl font-bold text-gray-800 mb-4">Approve Redemption</h3>
                        <p className="text-gray-600 mb-4">Enter the gift code to send to the user:</p>
                        <input
                            type="text"
                            value={giftCode}
                            onChange={(e) => setGiftCode(e.target.value)}
                            placeholder="e.g., GIFT2000-XXXX-YYYY"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-green-500 outline-none"
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setShowApproveModal(false); setGiftCode(''); }}
                                className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleApprove}
                                disabled={actionLoading}
                                className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition disabled:opacity-50"
                            >
                                {actionLoading ? 'Processing...' : 'Confirm Approval'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reject Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black bg-opacity-50">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
                        <h3 className="text-xl font-bold text-gray-800 mb-4">Reject Redemption</h3>
                        <p className="text-gray-600 mb-4">Enter the reason for rejection:</p>
                        <textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="e.g., Duplicate screenshots found in submissions..."
                            rows="4"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-red-500 outline-none resize-none"
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setShowRejectModal(false); setRejectionReason(''); }}
                                className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleReject}
                                disabled={actionLoading}
                                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition disabled:opacity-50"
                            >
                                {actionLoading ? 'Processing...' : 'Confirm Rejection'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Points Modal */}
            {showAddPointsModal && selectedUser && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black bg-opacity-50">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
                        <h3 className="text-xl font-bold text-gray-800 mb-4">Add Points</h3>
                        <p className="text-gray-600 mb-4">
                            User: {selectedUser.whatsapp_number}<br />
                            Current Points: {selectedUser.total_points || 0}
                        </p>
                        <input
                            type="number"
                            value={pointsToAdd}
                            onChange={(e) => setPointsToAdd(e.target.value)}
                            placeholder="Enter points to add"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setShowAddPointsModal(false); setPointsToAdd(''); setSelectedUser(null); }}
                                className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddPoints}
                                disabled={actionLoading}
                                className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition disabled:opacity-50"
                            >
                                {actionLoading ? 'Adding...' : 'Add Points'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Deduct Points Modal */}
            {showDeductPointsModal && selectedUser && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black bg-opacity-50">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
                        <h3 className="text-xl font-bold text-orange-600 mb-4">Deduct Points</h3>
                        <p className="text-gray-600 mb-4">
                            User: {selectedUser.whatsapp_number}<br />
                            Current Points: {selectedUser.total_points || 0}
                        </p>
                        <input
                            type="number"
                            value={pointsToAdd}
                            onChange={(e) => setPointsToAdd(e.target.value)}
                            placeholder="Enter points to deduct"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-orange-500 outline-none"
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setShowDeductPointsModal(false); setPointsToAdd(''); setSelectedUser(null); }}
                                className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeductPoints}
                                disabled={actionLoading}
                                className="flex-1 px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition disabled:opacity-50"
                            >
                                {actionLoading ? 'Deducting...' : 'Deduct Points'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete User Modal */}
            {showDeleteUserModal && selectedUser && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black bg-opacity-50">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
                        <h3 className="text-xl font-bold text-red-600 mb-4">Delete User</h3>
                        <p className="text-gray-800 mb-4">
                            Are you sure you want to delete this user?<br />
                            <strong>{selectedUser.whatsapp_number}</strong>
                        </p>
                        <p className="text-sm text-red-600 mb-4">
                            This will permanently delete all their submissions, redemptions, and points. This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setShowDeleteUserModal(false); setSelectedUser(null); }}
                                className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteUser}
                                disabled={actionLoading}
                                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition disabled:opacity-50"
                            >
                                {actionLoading ? 'Deleting...' : 'Delete User'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create/Edit Offer Modal */}
            {showOfferModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black bg-opacity-50">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
                        <h3 className="text-xl font-bold text-gray-800 mb-4">
                            {editingOffer ? 'Edit Offer' : 'Create New Offer'}
                        </h3>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Offer Image {editingOffer && '(leave empty to keep current)'}
                            </label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => setOfferImage(e.target.files[0])}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                            />
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Caption
                            </label>
                            <textarea
                                value={offerCaption}
                                onChange={(e) => setOfferCaption(e.target.value)}
                                placeholder="Enter offer caption..."
                                rows="4"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none resize-none"
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => { setShowOfferModal(false); setEditingOffer(null); setOfferCaption(''); setOfferImage(null); }}
                                className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={editingOffer ? handleUpdateOffer : handleCreateOffer}
                                disabled={actionLoading}
                                className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition disabled:opacity-50"
                            >
                                {actionLoading ? 'Saving...' : editingOffer ? 'Update Offer' : 'Create Offer'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Offer Modal */}
            {showDeleteOfferModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black bg-opacity-50">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
                        <h3 className="text-xl font-bold text-red-600 mb-4">Delete Offer</h3>
                        <p className="text-gray-800 mb-4">
                            Are you sure you want to delete this offer? This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setShowDeleteOfferModal(false); setOfferToDelete(null); }}
                                className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteOffer}
                                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Setting Modal */}
            {showSettingModal && editingSetting && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black bg-opacity-50">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
                        <h3 className="text-xl font-bold text-gray-800 mb-4">Edit Setting</h3>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {editingSetting.setting_key.split('_').map(word =>
                                    word.charAt(0).toUpperCase() + word.slice(1)
                                ).join(' ')}
                            </label>
                            <p className="text-xs text-gray-600 mb-3">{editingSetting.description}</p>
                            <input
                                type="number"
                                value={settingValue}
                                onChange={(e) => setSettingValue(e.target.value)}
                                min="1"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => { setShowSettingModal(false); setEditingSetting(null); setSettingValue(''); }}
                                className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpdateSetting}
                                className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition"
                            >
                                Update
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {/* Data Management Modal */}
            {showDataManagementModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black bg-opacity-50">
                    <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[80vh] overflow-y-auto">
                        <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white z-10">
                            <h3 className="text-xl font-bold text-gray-800">Data Management</h3>
                            <button
                                onClick={() => {
                                    setShowDataManagementModal(false);
                                    setSystemStats(null);
                                }}
                                className="text-gray-400 hover:text-gray-600 text-3xl"
                            >
                                ×
                            </button>
                        </div>

                        <div className="p-6">
                            {/* System Statistics */}
                            <div className="mb-6">
                                <h4 className="text-lg font-semibold text-gray-800 mb-3">Current System Data</h4>
                                {systemStats ? (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                            <p className="text-xs text-blue-600 mb-1">Total Users</p>
                                            <p className="text-2xl font-bold text-blue-700">{systemStats.totalUsers}</p>
                                        </div>
                                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                            <p className="text-xs text-green-600 mb-1">Submissions</p>
                                            <p className="text-2xl font-bold text-green-700">{systemStats.totalSubmissions}</p>
                                        </div>
                                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                                            <p className="text-xs text-purple-600 mb-1">Redemptions</p>
                                            <p className="text-2xl font-bold text-purple-700">{systemStats.totalRedemptions}</p>
                                        </div>
                                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                            <p className="text-xs text-yellow-600 mb-1">Recipients</p>
                                            <p className="text-2xl font-bold text-yellow-700">{systemStats.totalRecipients}</p>
                                        </div>
                                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                            <p className="text-xs text-red-600 mb-1">Messages</p>
                                            <p className="text-2xl font-bold text-red-700">{systemStats.totalMessages}</p>
                                        </div>
                                        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                                            <p className="text-xs text-indigo-600 mb-1">Broadcasts</p>
                                            <p className="text-2xl font-bold text-indigo-700">{systemStats.totalBroadcasts}</p>
                                        </div>
                                        <div className="bg-pink-50 border border-pink-200 rounded-lg p-3">
                                            <p className="text-xs text-pink-600 mb-1">Offers</p>
                                            <p className="text-2xl font-bold text-pink-700">{systemStats.totalOffers}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-gray-500">Loading...</p>
                                )}
                            </div>

                            {/* Cleanup Actions */}
                            <div className="space-y-4">
                                <h4 className="text-lg font-semibold text-gray-800 mb-3">Cleanup Actions</h4>

                                {/* Clear Messages */}
                                <div className="border-2 border-red-200 rounded-xl p-4 bg-red-50">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <h5 className="font-semibold text-gray-800 mb-1">Clear All Messages</h5>
                                            <p className="text-sm text-gray-600 mb-2">
                                                Deletes all user messages and broadcast messages. Users will have empty inboxes.
                                            </p>
                                            <p className="text-xs text-red-600">
                                                ⚠️ Affects: {systemStats?.totalMessages} direct messages + {systemStats?.totalBroadcasts} broadcasts
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setDataActionType('messages');
                                                setShowConfirmDeleteModal(true);
                                            }}
                                            className="ml-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition"
                                        >
                                            Clear
                                        </button>
                                    </div>
                                </div>

                                {/* Clear Submissions */}
                                <div className="border-2 border-orange-200 rounded-xl p-4 bg-orange-50">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <h5 className="font-semibold text-gray-800 mb-1">Clear All Submissions</h5>
                                            <p className="text-sm text-gray-600 mb-2">
                                                Deletes all user submissions and proof screenshots. Points remain with users.
                                            </p>
                                            <p className="text-xs text-orange-600">
                                                ⚠️ Affects: {systemStats?.totalSubmissions} submissions (screenshots not deleted from server)
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setDataActionType('submissions');
                                                setShowConfirmDeleteModal(true);
                                            }}
                                            className="ml-4 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold rounded-lg transition"
                                        >
                                            Clear
                                        </button>
                                    </div>
                                </div>

                                {/* Clear Redemptions */}
                                <div className="border-2 border-purple-200 rounded-xl p-4 bg-purple-50">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <h5 className="font-semibold text-gray-800 mb-1">Clear All Redemptions</h5>
                                            <p className="text-sm text-gray-600 mb-2">
                                                Deletes all redemption history (pending, approved, rejected). Points remain with users.
                                            </p>
                                            <p className="text-xs text-purple-600">
                                                ⚠️ Affects: {systemStats?.totalRedemptions} redemption records
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setDataActionType('redemptions');
                                                setShowConfirmDeleteModal(true);
                                            }}
                                            className="ml-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-lg transition"
                                        >
                                            Clear
                                        </button>
                                    </div>
                                </div>

                                {/* Clear Recipients */}
                                <div className="border-2 border-yellow-200 rounded-xl p-4 bg-yellow-50">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <h5 className="font-semibold text-gray-800 mb-1">Clear Recipients History</h5>
                                            <p className="text-sm text-gray-600 mb-2">
                                                Deletes the tracking of who users shared with. Allows users to share with same numbers again.
                                            </p>
                                            <p className="text-xs text-yellow-600">
                                                ⚠️ Affects: {systemStats?.totalRecipients} recipient records
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setDataActionType('recipients');
                                                setShowConfirmDeleteModal(true);
                                            }}
                                            className="ml-4 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-semibold rounded-lg transition"
                                        >
                                            Clear
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Info Box */}
                            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-sm text-blue-800">
                                    <strong>Note:</strong> User accounts and their points are never deleted from these actions.
                                    Only use individual user deletion if you want to remove specific users completely.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm Delete Modal */}
            {showConfirmDeleteModal && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black bg-opacity-70">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
                        <h3 className="text-xl font-bold text-red-600 mb-4">⚠️ Confirm Deletion</h3>
                        <p className="text-gray-800 mb-4">
                            Are you sure you want to clear this data? This action is <strong>permanent</strong> and cannot be undone.
                        </p>
                        <p className="text-sm text-gray-600 mb-6">
                            You are about to delete: <strong className="text-red-600">
                                {dataActionType === 'messages' && 'All Messages'}
                                {dataActionType === 'submissions' && 'All Submissions'}
                                {dataActionType === 'redemptions' && 'All Redemptions'}
                                {dataActionType === 'recipients' && 'All Recipients History'}
                            </strong>
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowConfirmDeleteModal(false);
                                    setDataActionType('');
                                }}
                                className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleClearData}
                                disabled={actionLoading}
                                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition disabled:opacity-50"
                            >
                                {actionLoading ? 'Deleting...' : 'Yes, Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {/* Create/Edit Banner Modal */}
            {showBannerModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black bg-opacity-50">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
                        <h3 className="text-xl font-bold text-gray-800 mb-4">
                            {editingBanner ? 'Edit Banner' : 'Create New Banner'}
                        </h3>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Banner Image {editingBanner && '(leave empty to keep current)'}
                            </label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => setBannerImage(e.target.files[0])}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                            />
                            <p className="text-xs text-gray-500 mt-1">Recommended size: 750x342px</p>
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Title (Optional)
                            </label>
                            <input
                                type="text"
                                value={bannerTitle}
                                onChange={(e) => setBannerTitle(e.target.value)}
                                placeholder="e.g., Special Offer!"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                            />
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Link URL (Optional)
                            </label>
                            <input
                                type="text"
                                value={bannerLink}
                                onChange={(e) => setBannerLink(e.target.value)}
                                placeholder="https://example.com"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                            />
                            <p className="text-xs text-gray-500 mt-1">Users will be redirected here when clicking the banner</p>
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Display Order
                            </label>
                            <input
                                type="number"
                                value={bannerOrder}
                                onChange={(e) => setBannerOrder(parseInt(e.target.value))}
                                placeholder="0"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                            />
                            <p className="text-xs text-gray-500 mt-1">Lower numbers appear first</p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowBannerModal(false);
                                    setEditingBanner(null);
                                    setBannerTitle('');
                                    setBannerLink('');
                                    setBannerOrder(0);
                                    setBannerImage(null);
                                }}
                                className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={editingBanner ? handleUpdateBanner : handleCreateBanner}
                                disabled={actionLoading}
                                className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition disabled:opacity-50"
                            >
                                {actionLoading ? 'Saving...' : editingBanner ? 'Update Banner' : 'Create Banner'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Banner Modal */}
            {showDeleteBannerModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black bg-opacity-50">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
                        <h3 className="text-xl font-bold text-red-600 mb-4">Delete Banner</h3>
                        <p className="text-gray-800 mb-4">
                            Are you sure you want to delete this banner? This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setShowDeleteBannerModal(false); setBannerToDelete(null); }}
                                className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteBanner}
                                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Social Link Modal */}
            {showSocialLinkModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-2xl font-bold text-gray-800">
                                    {editingSocialLink ? 'Edit Social Link' : 'Add Social Link'}
                                </h3>
                                <button
                                    onClick={() => {
                                        setShowSocialLinkModal(false);
                                        setEditingSocialLink(null);
                                        setSocialLinkForm({ platform: '', title: '', url: '', icon: '', displayOrder: 0 });
                                    }}
                                    className="text-gray-500 hover:text-gray-700"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="space-y-4">
                                {/* Platform Selection */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Platform</label>
                                    <select
                                        value={socialLinkForm.platform}
                                        onChange={(e) => setSocialLinkForm({ ...socialLinkForm, platform: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">Select Platform</option>
                                        <option value="telegram">Telegram</option>
                                        <option value="whatsapp">WhatsApp</option>
                                        <option value="facebook">Facebook</option>
                                        <option value="instagram">Instagram</option>
                                        <option value="twitter">Twitter/X</option>
                                        <option value="youtube">YouTube</option>
                                        <option value="discord">Discord</option>
                                        <option value="linkedin">LinkedIn</option>
                                        <option value="tiktok">TikTok</option>
                                        <option value="reddit">Reddit</option>
                                    </select>
                                </div>

                                {/* Title */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                                    <input
                                        type="text"
                                        value={socialLinkForm.title}
                                        onChange={(e) => setSocialLinkForm({ ...socialLinkForm, title: e.target.value })}
                                        placeholder="e.g., Join our Telegram"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                {/* URL */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">URL</label>
                                    <input
                                        type="url"
                                        value={socialLinkForm.url}
                                        onChange={(e) => setSocialLinkForm({ ...socialLinkForm, url: e.target.value })}
                                        placeholder="https://t.me/yourgroup"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                {/* Icon (Emoji) */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Icon (Emoji)</label>
                                    <input
                                        type="text"
                                        value={socialLinkForm.icon}
                                        onChange={(e) => setSocialLinkForm({ ...socialLinkForm, icon: e.target.value })}
                                        placeholder="📱 (paste emoji)"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        maxLength="2"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Common emojis: 📱 💬 👍 📷 🐦 ▶️ 🎮 💼 🎵 🤖
                                    </p>
                                </div>

                                {/* Display Order */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Display Order</label>
                                    <input
                                        type="number"
                                        value={socialLinkForm.displayOrder}
                                        onChange={(e) => setSocialLinkForm({ ...socialLinkForm, displayOrder: parseInt(e.target.value) || 0 })}
                                        placeholder="0"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Lower numbers appear first</p>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => {
                                        setShowSocialLinkModal(false);
                                        setEditingSocialLink(null);
                                        setSocialLinkForm({ platform: '', title: '', url: '', icon: '', displayOrder: 0 });
                                    }}
                                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={editingSocialLink ? handleUpdateSocialLink : handleCreateSocialLink}
                                    disabled={actionLoading}
                                    className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50"
                                >
                                    {actionLoading ? 'Saving...' : editingSocialLink ? 'Update' : 'Create'}
                                </button>
                            </div>
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

export default AdminDashboard;