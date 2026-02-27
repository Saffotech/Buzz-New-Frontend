import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Image,
  Calendar,
  Instagram,
  Twitter,
  Facebook,
  Linkedin, // Added LinkedIn icon
  X,
  Youtube,
  Upload,
  Eye,
  Send,
  Clock,
  Hash,
  AtSign,
  Wand2,
  Sparkles,
  RefreshCw,
  Copy,
  AlertCircle,
  CheckCircle,
  Info,
  ChevronDown,
  FolderOpen,
  Check,
  Search,
  Video,
  Play,
  FileText,
  GalleryHorizontal,
  ChevronLeft,
  ChevronLeftCircle,
  ChevronRight,
  ChevronRightCircle,
  MoreHorizontal,
  Grid3X3,
  Maximize2,
  Cloud,
  HardDrive,
  Palette,
  Box,
  Camera,
  Users,
  Film,
  ImagePlus,
  X as XIcon,
} from 'lucide-react';
import { useMedia } from '../hooks/useApi';
import apiClient from '../utils/api';
import { PLATFORMS, PLATFORM_CONFIGS, SUCCESS_MESSAGES, ERROR_MESSAGES } from '../utils/constants';
import './CreatePost.css';
import Loader from '../components/common/Loader';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXTwitter } from "@fortawesome/free-brands-svg-icons";
import { validateImageDimensions, autoResizeImage, isValidAspectRatio, getOptimalImageType } from '../utils/imageUtils';
import DIMENSIONS from '../utils/dimensions-config';

const CreatePost = ({ isOpen, onClose, onPostCreated, connectedAccounts, initialData }) => {
  const [imgIndex, setImgIndex] = useState(0);
  const [hoveredPlatform, setHoveredPlatform] = useState(null);
  const { uploadMedia } = useMedia();
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [userProfile, setUserProfile] = useState(null);
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  const [showImageCarousel, setShowImageCarousel] = useState(false);
  const [currentCarouselIndex, setCurrentCarouselIndex] = useState(0);
  const [mediaType, setMediaType] = useState('square');

  const [postData, setPostData] = useState({
    content: '',
    platforms: [],
    selectedAccounts: {},
    scheduledDate: '',
    scheduledTime: '',
    images: [],
    hashtags: '',
    mentions: '',
    metadata: {
      category: 'other'
    }
  });
  const [publishMode, setPublishMode] = useState('now'); // 'now' or 'later'

  const [activeTab, setActiveTab] = useState('compose');
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduleType, setScheduleType] = useState('auto'); // 'manual' | 'auto'
  const [postingFrequency, setPostingFrequency] = useState(''); // 'daily' | 'weekly' | '2perweek' | 'weekend' - empty until user picks
  const [scheduleStartDate, setScheduleStartDate] = useState('');
  const [scheduleEndDate, setScheduleEndDate] = useState('');
  const [selectedDays2PerWeek, setSelectedDays2PerWeek] = useState([]); // max 2: getDay() values 0=Sun,1=Mon,...,6=Sat
  const [preferredTime, setPreferredTime] = useState('09:00'); // 'custom' or preset time string (e.g. '09:00')
  const [customTimeHours, setCustomTimeHours] = useState(9);
  const [customTimeMinutes, setCustomTimeMinutes] = useState(0);
  const [customTimeSeconds, setCustomTimeSeconds] = useState(0);
  const [previewMode, setPreviewMode] = useState(false);
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [showMediaSourceModal, setShowMediaSourceModal] = useState(false);
  const fileInputRef = useRef(null);

  // Google Drive import modal state
  const [showGoogleDriveModal, setShowGoogleDriveModal] = useState(false);
  const [googleDriveConnected, setGoogleDriveConnected] = useState(false);
  const [googleDriveFiles, setGoogleDriveFiles] = useState([]);
  const [googleDriveNextToken, setGoogleDriveNextToken] = useState(null);
  const [googleDriveLoading, setGoogleDriveLoading] = useState(false);
  const [googleDriveImporting, setGoogleDriveImporting] = useState(false);
  const [googleDriveThumbnails, setGoogleDriveThumbnails] = useState({});

  // OneDrive import modal state
  const [showOneDriveModal, setShowOneDriveModal] = useState(false);
  const [oneDriveConnected, setOneDriveConnected] = useState(false);
  const [oneDriveFiles, setOneDriveFiles] = useState([]);
  const [oneDriveNextToken, setOneDriveNextToken] = useState(null);
  const [oneDriveLoading, setOneDriveLoading] = useState(false);
  const [oneDriveImporting, setOneDriveImporting] = useState(false);
  const [oneDriveThumbnails, setOneDriveThumbnails] = useState({});

  // Canva import modal state
  const [showCanvaModal, setShowCanvaModal] = useState(false);
  const [canvaConnected, setCanvaConnected] = useState(false);
  const [canvaLoading, setCanvaLoading] = useState(false);
  const [canvaImporting, setCanvaImporting] = useState(false);
  const [canvaDesignId, setCanvaDesignId] = useState('');
  const [canvaExportType, setCanvaExportType] = useState('png');
  
  // Story Publishing and Collaboration state
  const [storyPublishingEnabled, setStoryPublishingEnabled] = useState(false);
  const [storyPlatforms, setStoryPlatforms] = useState([]); // ['instagram', 'facebook']
  const [collabEnabled, setCollabEnabled] = useState(false);
  const [collabUsername, setCollabUsername] = useState('');
  
  // Reel Cover state
  const [showReelCoverModal, setShowReelCoverModal] = useState(false);
  const [reelCoverImage, setReelCoverImage] = useState(null);
  const reelCoverFileInputRef = useRef(null);

  // Normalize date to YYYY-MM-DD for API and date input (handles Date object or string)
  const toDateOnlyString = (val) => {
    if (val == null || val === '') return '';
    if (val instanceof Date) return `${val.getFullYear()}-${String(val.getMonth() + 1).padStart(2, '0')}-${String(val.getDate()).padStart(2, '0')}`;
    return String(val).substring(0, 10);
  };

  // ✅ ADD: Schedule DateTime Validation Function
  const validateScheduleDateTime = (date, time) => {
    if (!date || !time) return { isValid: true }; // Skip validation if not scheduling

    const selectedDateTime = new Date(`${date}T${time}`);
    const now = new Date();

    if (selectedDateTime <= now) {
      return {
        isValid: false,
        message: "Please select a future date and time to schedule your post."
      };
    }

    return { isValid: true };
  };

  useEffect(() => {
    if (initialData) {
      console.log("Setting form data from initialData:", initialData);

      setPostData(prev => ({
        ...prev,
        content: initialData.content || '',
        platforms: Array.isArray(initialData.platforms) ? initialData.platforms : [],
        hashtags: initialData.hashtags || '',
        mentions: initialData.mentions || '',
        selectedAccounts: (initialData.selectedAccounts && typeof initialData.selectedAccounts === 'object' && !Array.isArray(initialData.selectedAccounts))
          ? initialData.selectedAccounts
          : {},
        images: (initialData.images && Array.isArray(initialData.images) && initialData.images.length > 0) ? initialData.images : [],
        scheduledDate: initialData.scheduledDate ? new Date(initialData.scheduledDate) : null,
        scheduledTime: initialData.scheduledTime || '', // Keep in 24-hour format for backend
        metadata: {
          ...prev.metadata,
          ...(initialData.metadata || {})
        }
      }));

      // ✅ handle publish mode separately
      if (initialData.scheduledDate || initialData.status === 'scheduled') {
        setPublishMode('later');
      } else {
        setPublishMode('now');
      }
    }
  }, [initialData]);

  // ✅ UPDATED: Enhanced real-time validation for schedule date/time changes
  useEffect(() => {
    if (isScheduled && postData.scheduledDate && postData.scheduledTime) {
      const validation = validateScheduleDateTime(postData.scheduledDate, postData.scheduledTime);
      if (!validation.isValid) {
        setError(validation.message);
      } else {
        // Clear error if it was a scheduling error
        if (error && (error.includes('future date') || error.includes('schedule') || error.includes('time'))) {
          setError(null);
        }
      }
    }
  }, [postData.scheduledDate, postData.scheduledTime, isScheduled, error]);

  // Reset imgIndex when images change to prevent out-of-bounds
  useEffect(() => {
    const len = postData.images?.length || 0;
    setImgIndex(prev => (len === 0 ? 0 : prev >= len ? len - 1 : prev));
  }, [postData.images?.length]);

  // Load Google Drive status and files when Drive modal opens
  useEffect(() => {
    if (!showGoogleDriveModal) return;
    let cancelled = false;
    (async () => {
      setGoogleDriveLoading(true);
      setGoogleDriveFiles([]);
      setGoogleDriveNextToken(null);
      try {
        const statusRes = await apiClient.getGoogleDriveStatus();
        const connected = (statusRes?.data?.connected ?? statusRes?.connected) === true;
        if (cancelled) return;
        setGoogleDriveConnected(connected);
        if (connected) {
          const filesRes = await apiClient.getGoogleDriveFiles(50, null);
          if (cancelled) return;
          const data = filesRes?.data ?? filesRes;
          const list = data?.files ?? [];
          const next = data?.nextPageToken ?? null;
          setGoogleDriveFiles(list);
          setGoogleDriveNextToken(next);
        }
      } catch (err) {
        if (!cancelled) {
          setGoogleDriveConnected(false);
          setGoogleDriveFiles([]);
          console.error('Google Drive load failed:', err);
          const msg = err?.message || '';
          if (msg.includes('Google Drive') || msg.includes('token') || msg.includes('401')) {
            showToast('Google Drive session expired or not connected. Please reconnect in Settings.', 'error');
          }
        }
      } finally {
        if (!cancelled) setGoogleDriveLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [showGoogleDriveModal]);

  // Fetch Drive thumbnails via backend proxy (so they load with auth)
  useEffect(() => {
    const list = googleDriveFiles;
    if (!list.length) {
      setGoogleDriveThumbnails(prev => {
        Object.values(prev).forEach(url => { try { URL.revokeObjectURL(url); } catch (e) {} });
        return {};
      });
      return;
    }
    setGoogleDriveThumbnails(prev => {
      Object.values(prev).forEach(url => { try { URL.revokeObjectURL(url); } catch (e) {} });
      return {};
    });
    const headers = apiClient.getAuthHeaders();
    let cancelled = false;
    list.forEach(file => {
      fetch(apiClient.getGoogleDriveThumbnailUrl(file.id), { headers })
        .then(r => (!cancelled && r.ok ? r.blob() : null))
        .then(blob => {
          if (cancelled || !blob) return;
          setGoogleDriveThumbnails(t => ({ ...t, [file.id]: URL.createObjectURL(blob) }));
        })
        .catch(() => {});
    });
    return () => { cancelled = true; };
  }, [googleDriveFiles]);

  // Revoke thumbnail blob URLs when Drive modal closes
  useEffect(() => {
    if (!showGoogleDriveModal) {
      setGoogleDriveThumbnails(prev => {
        Object.values(prev).forEach(url => { try { URL.revokeObjectURL(url); } catch (e) {} });
        return {};
      });
    }
  }, [showGoogleDriveModal]);

  // Load OneDrive status and files when OneDrive modal opens
  useEffect(() => {
    if (!showOneDriveModal) return;
    let cancelled = false;
    (async () => {
      setOneDriveLoading(true);
      setOneDriveFiles([]);
      setOneDriveNextToken(null);
      try {
        const statusRes = await apiClient.getOneDriveStatus();
        const connected = (statusRes?.data?.connected ?? statusRes?.connected) === true;
        if (cancelled) return;
        setOneDriveConnected(connected);
        if (connected) {
          const filesRes = await apiClient.getOneDriveFiles(50, null);
          if (cancelled) return;
          const data = filesRes?.data ?? filesRes;
          const list = data?.files ?? [];
          const next = data?.nextPageToken ?? null;
          setOneDriveFiles(list);
          setOneDriveNextToken(next);
        }
      } catch (err) {
        if (!cancelled) {
          setOneDriveConnected(false);
          setOneDriveFiles([]);
          console.error('OneDrive load failed:', err);
          const msg = err?.message || '';
          if (msg.includes('OneDrive') || msg.includes('token') || msg.includes('401')) {
            showToast('OneDrive session expired or not connected. Please reconnect in Settings.', 'error');
          }
        }
      } finally {
        if (!cancelled) setOneDriveLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [showOneDriveModal]);

  // Fetch OneDrive thumbnails via backend proxy
  useEffect(() => {
    const list = oneDriveFiles;
    if (!list.length) {
      setOneDriveThumbnails(prev => {
        Object.values(prev).forEach(url => { try { URL.revokeObjectURL(url); } catch (e) {} });
        return {};
      });
      return;
    }
    setOneDriveThumbnails(prev => {
      Object.values(prev).forEach(url => { try { URL.revokeObjectURL(url); } catch (e) {} });
      return {};
    });
    const headers = apiClient.getAuthHeaders();
    let cancelled = false;
    list.forEach(file => {
      fetch(apiClient.getOneDriveThumbnailUrl(file.id), { headers })
        .then(r => (!cancelled && r.ok ? r.blob() : null))
        .then(blob => {
          if (cancelled || !blob) return;
          setOneDriveThumbnails(t => ({ ...t, [file.id]: URL.createObjectURL(blob) }));
        })
        .catch(() => {});
    });
    return () => { cancelled = true; };
  }, [oneDriveFiles]);

  useEffect(() => {
    if (!showOneDriveModal) {
      setOneDriveThumbnails(prev => {
        Object.values(prev).forEach(url => { try { URL.revokeObjectURL(url); } catch (e) {} });
        return {};
      });
    }
  }, [showOneDriveModal]);

  // Load Canva status when Canva modal opens
  useEffect(() => {
    if (!showCanvaModal) return;
    let cancelled = false;
    (async () => {
      setCanvaLoading(true);
      try {
        const statusRes = await apiClient.getCanvaStatus();
        const connected = (statusRes?.data?.connected ?? statusRes?.connected) === true;
        if (!cancelled) setCanvaConnected(connected);
      } catch (err) {
        if (!cancelled) setCanvaConnected(false);
        console.error('Canva status failed:', err);
      } finally {
        if (!cancelled) setCanvaLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [showCanvaModal]);

  // ✅ Helper functions for content formatting
  const formatContentForDisplay = (content) => {
    // Convert **text** to <strong>text</strong> for display in preview
    return content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  };

  // ✅ Add these helper functions at the top of your component
  const convertToUnicodeBold = (text) => {
    const boldMap = {
      'a': '𝐚', 'b': '𝐛', 'c': '𝐜', 'd': '𝐝', 'e': '𝐞', 'f': '𝐟', 'g': '𝐠', 'h': '𝐡', 'i': '𝐢', 'j': '𝐣', 'k': '𝐤', 'l': '𝐥', 'm': '𝐦',
      'n': '𝐧', 'o': '𝐨', 'p': '𝐩', 'q': '𝐪', 'r': '𝐫', 's': '𝐬', 't': '𝐭', 'u': '𝐮', 'v': '𝐯', 'w': '𝐰', 'x': '𝐱', 'y': '𝐲', 'z': '𝐳',
      'A': '𝐀', 'B': '𝐁', 'C': '𝐂', 'D': '𝐃', 'E': '𝐄', 'F': '𝐅', 'G': '𝐆', 'H': '𝐇', 'I': '𝐈', 'J': '𝐉', 'K': '𝐊', 'L': '𝐋', 'M': '𝐌',
      'N': '𝐍', 'O': '𝐎', 'P': '𝐏', 'Q': '𝐐', 'R': '𝐑', 'S': '𝐒', 'T': '𝐓', 'U': '𝐔', 'V': '𝐕', 'W': '𝐖', 'X': '𝐗', 'Y': '𝐘', 'Z': '𝐙',
      '0': '𝟎', '1': '𝟏', '2': '𝟐', '3': '𝟑', '4': '𝟒', '5': '𝟓', '6': '𝟔', '7': '𝟕', '8': '𝟖', '9': '𝟗',
      ' ': ' ' // Keep spaces as they are
    };

    return text.split('').map(char => boldMap[char] || char).join('');
  };

  // ✅ Updated function to convert to Unicode bold characters
  const stripMarkdownForSocialMedia = (content) => {
    // Convert **text** to Unicode bold characters
    return content.replace(/\*\*(.*?)\*\*/g, (match, text) => {
      return convertToUnicodeBold(text);
    });
  };

  // ✅ ADDED: Helper function to extract hashtags from content
  const extractHashtagsFromContent = (text) => {
    if (!text) return { content: '', hashtags: [] };

    // Split text into lines to better handle formatting
    const lines = text.split('\n');
    const contentLines = [];
    const hashtags = [];

    lines.forEach(line => {
      const trimmedLine = line.trim();

      // Check if this line contains hashtags
      const lineHashtags = trimmedLine.match(/#\w+/g) || [];

      if (lineHashtags.length > 0) {
        hashtags.push(...lineHashtags);

        // Remove hashtags from the line
        const cleanLine = trimmedLine.replace(/#\w+/g, '').replace(/\s+/g, ' ').trim();

        // Only add the line if there's content left after removing hashtags
        if (cleanLine) {
          contentLines.push(cleanLine);
        }
      } else if (trimmedLine) {
        // Line with no hashtags, add as is
        contentLines.push(trimmedLine);
      }
    });

    return {
      content: contentLines.join('\n').trim(),
      hashtags: [...new Set(hashtags)] // Remove duplicates
    };
  };

  const isValidInstagramAspectRatio = (width, height) => {
    if (!width || !height) return false;

    const ratio = width / height;
    const allowedRatios = [1, 4 / 5, 3 / 4, 1.91]; // exact ratios

    // allow small rounding errors (±0.01)
    return allowedRatios.some((r) => Math.abs(ratio - r) < 0.01);
  };

  const loadImageDimensions = (url) => {
    return new Promise((resolve) => {
      if (!url || url.match(/\.(mp4|mov|webm|avi|mkv)(\?|$)/i) || url.includes('video')) {
        return resolve(null);
      }

      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => resolve(null);
      img.src = url;
    });
  };

  const ensureInstagramImagesValid = async (images) => {
    if (!images || images.length === 0) return true;

    for (let i = 0; i < images.length; i++) {
      const media = images[i];
      const isVideo = media.fileType === 'video' || (media.url && media.url.match(/\.(mp4|mov|webm|avi|mkv)(\?|$)/i)) || media.url?.includes('video');
      if (isVideo) continue;

      let dims = media.dimensions || (media.width && media.height ? { width: media.width, height: media.height } : null);
      if (!dims) dims = await loadImageDimensions(media.url);

      if (!dims || !dims.width || !dims.height) {
        showToast(`Couldn't determine dimensions for "${media.displayName || media.originalName || 'an image'}".`, 'error', 6000);
        return false;
      }

      if (!isValidInstagramAspectRatio(dims.width, dims.height)) {
        showToast(`"${media.displayName || media.originalName || 'An image'}" has unsupported aspect ratio (${(dims.width / dims.height).toFixed(2)}). Instagram feed accepts 0.8–1.91.`, 'error', 6000);
        return false;
      }
    }

    return true;
  };

  // Convert 24-hour time to 12-hour format
  const convertTo12Hour = (time24) => {
    if (!time24) return { hour: '12', minute: '00', period: 'PM' };

    const [hours, minutes] = time24.split(':');
    const hour24 = parseInt(hours, 10);
    const minute = minutes || '00';

    if (hour24 === 0) {
      return { hour: '12', minute, period: 'AM' };
    } else if (hour24 < 12) {
      return { hour: hour24.toString(), minute, period: 'AM' };
    } else if (hour24 === 12) {
      return { hour: '12', minute, period: 'PM' };
    } else {
      return { hour: (hour24 - 12).toString(), minute, period: 'PM' };
    }
  };

  // Convert 12-hour time to 24-hour format
  const convertTo24Hour = (hour12, minute, period) => {
    const hour = parseInt(hour12, 10);
    let hour24;

    if (period === 'AM') {
      hour24 = hour === 12 ? 0 : hour;
    } else {
      hour24 = hour === 12 ? 12 : hour + 12;
    }

    return `${hour24.toString().padStart(2, '0')}:${minute}`;
  };

  const getFiveMinutesAhead = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 5);
    const hours = now.getHours().toString().padStart(2, "0");
    const minutes = now.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  const initialFiveMinAhead = useMemo(() => getFiveMinutesAhead(), []);

  // Set initial time when scheduling is enabled
  useEffect(() => {
    if (isScheduled && !postData.scheduledTime) {
      const time = preferredTime === 'custom'
        ? `${String(customTimeHours).padStart(2, '0')}:${String(customTimeMinutes).padStart(2, '0')}:${String(customTimeSeconds).padStart(2, '0')}`
        : (preferredTime || initialFiveMinAhead);
      setPostData(prev => ({ ...prev, scheduledTime: time }));
    }
  }, [isScheduled, postData.scheduledTime, initialFiveMinAhead, scheduleType, preferredTime, customTimeHours, customTimeMinutes, customTimeSeconds]);


  // Memoized conversion — ✅ re-runs when scheduledTime changes
  const currentTime12 = useMemo(() => {
    if (!postData.scheduledTime) return { hour: "12", minute: "00", period: "PM" };
    return convertTo12Hour(postData.scheduledTime);
  }, [postData.scheduledTime]);


  // Carousel handlers
  const openCarousel = (index = 0) => {
    setCurrentCarouselIndex(index);
    setShowImageCarousel(true);
  };

  const closeCarousel = () => {
    setShowImageCarousel(false);
    setCurrentCarouselIndex(0);
  };

  const goToNextImage = () => {
    setCurrentCarouselIndex((prev) =>
      prev === postData.images.length - 1 ? 0 : prev + 1
    );
  };

  const goToPrevImage = () => {
    setCurrentCarouselIndex((prev) =>
      prev === 0 ? postData.images.length - 1 : prev - 1
    );
  };

  const goToImage = (index) => {
    setCurrentCarouselIndex(index);
  };

  // ✅ 1. Define the function here (inside component, before return)
  const onSaveDraft = () => {
    const draftData = { ...postData, status: "draft" };
    console.log("Saving draft:", draftData);
    setToast({
      type: 'success',
      message: 'Draft saved successfully!',
    });
    // Auto-hide toast after 3 seconds
    setTimeout(() => setToast(null), 6000);
  };

  // Fetch user profile and connected accounts on mount
  useEffect(() => {
    if (isOpen) {
      fetchUserProfile();
    }
  }, [isOpen]);

  const handleFileUpload = async (files) => {
    if (!files || files.length === 0) return;

    const validFiles = [];
    const invalidFiles = [];
    const resizedFiles = []; // ⭐ NEW

    // ⭐ NEW — Platform selection check (warning but allow upload)
    const selectedPlatforms = postData?.platforms || [];
    const platform = selectedPlatforms.length > 0 ? selectedPlatforms[0] : 'instagram'; // Default to instagram for validation

    // ✅ Add immediate local previews before upload
    const localPreviews = [];
    for (const file of Array.from(files)) {
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");

      if (!isImage && !isVideo) {
        invalidFiles.push({ file, reason: "Unsupported file type" });
        continue;
      }

      if (isVideo && file.size > 500 * 1024 * 1024) { // ✅ CHANGED: 500MB
        invalidFiles.push({ file, reason: "Video too large (max 500MB)" });
        continue;
      }

      if (isImage && file.size > 50 * 1024 * 1024) {
        invalidFiles.push({ file, reason: "Image too large (max 50MB)" });
        continue;
      }

      const previewUrl = URL.createObjectURL(file);
      localPreviews.push({
        url: previewUrl,
        displayUrl: previewUrl,
        altText: file.name,
        originalName: file.name,
        displayName: file.name,
        filename: file.name,
        fileType: isVideo ? 'video' : 'image',
        size: file.size,
        isLocal: true,
        file: file
      });

      validFiles.push(file);
    }

    // ✅ Add local previews immediately to show images right away
    if (localPreviews.length > 0) {
      setPostData((prev) => ({
        ...prev,
        images: [...(prev.images || []), ...localPreviews]
      }));
    }

    // ⭐ NEW — Image dimension validation + auto-resize (only if platform selected)
    if (selectedPlatforms.length > 0 && platform) {
      for (const file of validFiles) {
        const isImage = file.type.startsWith("image/");
        if (isImage) {
          try {
            // ✅ FIX: Use native browser Image constructor explicitly to avoid conflicts
            const img = new window.Image();

            await new Promise((resolve, reject) => {
              img.onload = resolve;
              img.onerror = reject;
              img.src = URL.createObjectURL(file);
            });

            const imageType = getOptimalImageType(img.width, img.height, platform);
            URL.revokeObjectURL(img.src);

            const validation = await validateImageDimensions(file, platform, imageType);

            if (!validation.isValid) {
              console.log(`Auto-resizing image for ${platform}/${imageType}`);
              const resizedFile = await autoResizeImage(file, platform, imageType);
              // Replace original file with resized one
              const fileIndex = validFiles.indexOf(file);
              if (fileIndex !== -1) {
                validFiles[fileIndex] = resizedFile;
                // Update local preview URL
                const previewIndex = localPreviews.findIndex(p => p.file === file);
                if (previewIndex !== -1) {
                  URL.revokeObjectURL(localPreviews[previewIndex].url);
                  localPreviews[previewIndex].url = URL.createObjectURL(resizedFile);
                  localPreviews[previewIndex].file = resizedFile;
                }
              }
              resizedFiles.push(file.name);
            }
          } catch (err) {
            console.error("Image validation failed:", err);
            // Keep original file on error - continue with upload
          }
        }
      }
    }

    if (invalidFiles.length > 0) {
      const errorMessages = invalidFiles
        .map(({ file, reason }) => `${file.name}: ${reason}`)
        .join("\n");
      showToast(`Some files were skipped:\n${errorMessages}`, "error", 5000);
    }

    if (resizedFiles.length > 0) {
      showToast(
        `${resizedFiles.length} image(s) automatically resized for ${platform}: ${resizedFiles.join(", ")}`,
        "info",
        5000
      );
    }

    if (validFiles.length === 0) return;

    setUploadingFiles(true);
    setError(null);

    try {
      console.log("✅ Uploading files:", validFiles);

      const response = await uploadMedia(validFiles);
      console.log("✅ Upload response:", response);

      if (!response.data || !Array.isArray(response.data)) {
        throw new Error("Invalid upload response format");
      }

      const apiBase = process.env.REACT_APP_API_URL || '';
      const buildFullUrl = (url) => {
        if (!url || typeof url !== 'string') return url;
        if (url.startsWith('http') || url.startsWith('blob:') || url.startsWith('data:')) return url;
        if (url.startsWith('/')) {
          const base = apiBase.replace(/\/+$/, '');
          return base ? `${base}${url}` : url;
        }
        return null;
      };

      const uploadedMedia = response.data.map((media, index) => {
        const originalFile = validFiles[index];
        const localPreview = localPreviews[index];

        let mediaUrl = media.url || media.secure_url || media.path || media.fileUrl;
        mediaUrl = buildFullUrl(mediaUrl) || mediaUrl;

        if (mediaUrl && !mediaUrl.startsWith('http') && !mediaUrl.startsWith('blob:') && !mediaUrl.startsWith('data:')) {
          mediaUrl = null;
        }

        if (!mediaUrl && localPreview) {
          mediaUrl = localPreview.url;
        }
        if (!mediaUrl && originalFile) {
          mediaUrl = URL.createObjectURL(originalFile);
        }

        if (!mediaUrl || (!mediaUrl.startsWith('http') && !mediaUrl.startsWith('blob:') && !mediaUrl.startsWith('data:'))) {
          throw new Error(`Failed to get valid URL for: ${media.filename || media.originalName || 'unknown'}`);
        }

        const serverUrl = mediaUrl.startsWith('http') ? mediaUrl : null;
        const displayUrl = (localPreview?.url?.startsWith('blob:')) ? localPreview.url : (serverUrl || mediaUrl);

        return {
          url: serverUrl || mediaUrl,
          displayUrl: displayUrl,
          altText:
            media.originalName ||
            originalFile?.name ||
            localPreview?.originalName ||
            "Post media",
          originalName:
            media.originalName ||
            originalFile?.name ||
            localPreview?.originalName ||
            media.filename ||
            "Untitled Media",
          displayName:
            media.originalName ||
            originalFile?.name ||
            localPreview?.displayName ||
            media.filename ||
            "Untitled Media",
          filename: media.filename || originalFile?.name || localPreview?.filename,
          publicId: media.publicId,
          fileType:
            media.fileType ||
            (originalFile?.type.startsWith("video/") ? "video" : "image"),
          size: media.size || originalFile?.size || localPreview?.size,
          dimensions: media.dimensions || localPreview?.dimensions,
          duration: media.duration || null,
          fps: media.fps || null,
          hasAudio: media.hasAudio || null,
          thumbnails: media.thumbnails || null,
          videoQualities: media.videoQualities || null,
          platformOptimized: media.platformOptimized || null,
          format: originalFile?.type || "application/octet-stream",
          createdAt: new Date().toISOString(),
          isLocal: false, // Mark as uploaded
        };
      });

      // Replace local previews with uploaded media
      setPostData((prev) => {
        const currentImages = prev.images || [];
        // Remove the local previews we just added (by matching file references or URLs)
        const localPreviewUrls = new Set(localPreviews.map(p => p.url));
        const otherImages = currentImages.filter(img => !localPreviewUrls.has(img.url));
        
        return {
          ...prev,
          images: [...otherImages, ...uploadedMedia],
        };
      });

      const fileTypeText =
        validFiles.length === 1
          ? validFiles[0].type.startsWith("video/")
            ? "video"
            : "image"
          : "files";

      showToast(
        `Successfully uploaded ${validFiles.length} ${fileTypeText}!`,
        "success"
      );
    } catch (error) {
      console.error("❌ Upload failed:", error);
      const message = error.message || "Failed to upload media";
      setError(message);
      showToast(message, "error");
      
      // Keep local previews on error - they're already in postData.images
      // User can retry upload or use local previews
    } finally {
      setUploadingFiles(false);
    }
  };


  // ✅ Handle file input change
  const handleFileInputChange = (e) => {
    handleFileUpload(e.target.files);
  };

  // ✅ Drag and drop handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const handleUploadAreaClick = () => {
    fileInputRef.current?.click();
  };

  // Media source selection
  const handleMediaSourceSelect = (source) => {
    setShowMediaSourceModal(false);
    if (source === 'local') {
      handleUploadAreaClick();
    } else if (source === 'google') {
      setShowGoogleDriveModal(true);
    } else if (source === 'oneDrive') {
      setShowOneDriveModal(true);
    } else if (source === 'canva') {
      setShowCanvaModal(true);
    } else {
      // For now, open the media library for other cloud sources
      setShowMediaLibrary(true);
    }
  };

  // Import a file from Google Drive into post media (same shape as upload response)
  const handleImportFromGoogleDrive = async (fileId) => {
    if (!fileId || googleDriveImporting) return;
    setGoogleDriveImporting(true);
    setError(null);
    try {
      const res = await apiClient.importFromGoogleDrive(fileId);
      const media = res?.data ?? res;
      if (!media || !(media.url || media.path || media.fileUrl)) {
        throw new Error('Invalid import response');
      }
      const apiBase = process.env.REACT_APP_API_URL || '';
      const buildFullUrl = (url) => {
        if (!url || typeof url !== 'string') return url;
        if (url.startsWith('http') || url.startsWith('blob:')) return url;
        if (url.startsWith('/')) {
          const base = apiBase.replace(/\/+$/, '');
          return base ? `${base}${url}` : url;
        }
        return url;
      };
      const mediaUrl = buildFullUrl(media.url || media.path || media.fileUrl);
      const isVideo = (media.fileType === 'video') || (media.mimeType && media.mimeType.startsWith('video/'));
      const newItem = {
        url: mediaUrl,
        displayUrl: mediaUrl,
        altText: media.originalName || media.filename || 'Post media',
        originalName: media.originalName || media.filename || 'Untitled Media',
        displayName: media.originalName || media.filename || 'Untitled Media',
        filename: media.filename,
        publicId: media.publicId,
        fileType: isVideo ? 'video' : 'image',
        size: media.size || null,
        dimensions: media.dimensions || null,
        duration: media.duration || null,
        format: media.mimeType || (isVideo ? 'video/mp4' : 'image/jpeg'),
        createdAt: new Date().toISOString(),
        isLocal: false,
      };
      setPostData(prev => ({
        ...prev,
        images: [...(prev.images || []), newItem],
      }));
      setShowGoogleDriveModal(false);
      showToast('Added from Google Drive', 'success');
    } catch (err) {
      const msg = err?.message || err?.detail || 'Failed to import from Google Drive';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setGoogleDriveImporting(false);
    }
  };

  // Refetch Google Drive status and files (used after popup closes)
  const refetchGoogleDriveInModal = async () => {
    try {
      const statusRes = await apiClient.getGoogleDriveStatus();
      const connected = (statusRes?.data?.connected ?? statusRes?.connected) === true;
      setGoogleDriveConnected(connected);
      if (connected) {
        const filesRes = await apiClient.getGoogleDriveFiles(50, null);
        const data = filesRes?.data ?? filesRes;
        const list = data?.files ?? [];
        const next = data?.nextPageToken ?? null;
        setGoogleDriveFiles(list);
        setGoogleDriveNextToken(next);
        showToast('Google Drive connected. You can now import files.', 'success');
      }
    } catch (err) {
      console.error('Google Drive refetch failed:', err);
    }
  };

  // Open Google Drive auth in popup so user stays on Create Post; when popup closes, refetch status
  const handleConnectGoogleDriveFromPost = async () => {
    const storedToken = token || apiClient.getAuthToken();
    if (!storedToken) {
      showToast('Please log in to connect Google Drive', 'error');
      return;
    }
    let userId = user?._id || user?.id;
    if (!userId) {
      try {
        const res = await apiClient.getCurrentUser();
        const u = res?.data ?? res;
        userId = u?._id ?? u?.id;
      } catch (e) {
        console.error('Could not get current user:', e);
      }
    }
    if (!userId) {
      showToast('Please log in to connect Google Drive', 'error');
      return;
    }
    const authUrl = apiClient.getGoogleDriveAuthUrl(userId, storedToken);
    const popup = window.open(authUrl, 'google-drive-auth', 'width=600,height=700,scrollbars=yes,resizable=yes');
    if (!popup) {
      showToast('Popup blocked. Please allow popups or connect from Settings.', 'error');
      return;
    }
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        refetchGoogleDriveInModal();
      }
    }, 500);
  };

  // Import a file from OneDrive into post media
  const handleImportFromOneDrive = async (fileId) => {
    if (!fileId || oneDriveImporting) return;
    setOneDriveImporting(true);
    setError(null);
    try {
      const res = await apiClient.importFromOneDrive(fileId);
      const media = res?.data ?? res;
      if (!media || !(media.url || media.path || media.fileUrl)) {
        throw new Error('Invalid import response');
      }
      const apiBase = process.env.REACT_APP_API_URL || '';
      const buildFullUrl = (url) => {
        if (!url || typeof url !== 'string') return url;
        if (url.startsWith('http') || url.startsWith('blob:')) return url;
        if (url.startsWith('/')) {
          const base = apiBase.replace(/\/+$/, '');
          return base ? `${base}${url}` : url;
        }
        return url;
      };
      const mediaUrl = buildFullUrl(media.url || media.path || media.fileUrl);
      const isVideo = (media.fileType === 'video') || (media.mimeType && media.mimeType.startsWith('video/'));
      const newItem = {
        url: mediaUrl,
        displayUrl: mediaUrl,
        altText: media.originalName || media.filename || 'Post media',
        originalName: media.originalName || media.filename || 'Untitled Media',
        displayName: media.originalName || media.filename || 'Untitled Media',
        filename: media.filename,
        publicId: media.publicId,
        fileType: isVideo ? 'video' : 'image',
        size: media.size || null,
        dimensions: media.dimensions || null,
        duration: media.duration || null,
        format: media.mimeType || (isVideo ? 'video/mp4' : 'image/jpeg'),
        createdAt: new Date().toISOString(),
        isLocal: false,
      };
      setPostData(prev => ({
        ...prev,
        images: [...(prev.images || []), newItem],
      }));
      setShowOneDriveModal(false);
      showToast('Added from OneDrive', 'success');
    } catch (err) {
      const msg = err?.message || err?.detail || 'Failed to import from OneDrive';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setOneDriveImporting(false);
    }
  };

  const refetchOneDriveInModal = async () => {
    try {
      const statusRes = await apiClient.getOneDriveStatus();
      const connected = (statusRes?.data?.connected ?? statusRes?.connected) === true;
      setOneDriveConnected(connected);
      if (connected) {
        const filesRes = await apiClient.getOneDriveFiles(50, null);
        const data = filesRes?.data ?? filesRes;
        const list = data?.files ?? [];
        const next = data?.nextPageToken ?? null;
        setOneDriveFiles(list);
        setOneDriveNextToken(next);
        showToast('OneDrive connected. You can now import files.', 'success');
      }
    } catch (err) {
      console.error('OneDrive refetch failed:', err);
    }
  };

  const handleConnectOneDriveFromPost = async () => {
    const storedToken = token || apiClient.getAuthToken();
    if (!storedToken) {
      showToast('Please log in to connect OneDrive', 'error');
      return;
    }
    let userId = user?._id || user?.id;
    if (!userId) {
      try {
        const res = await apiClient.getCurrentUser();
        const u = res?.data ?? res;
        userId = u?._id ?? u?.id;
      } catch (e) {
        console.error('Could not get current user:', e);
      }
    }
    if (!userId) {
      showToast('Please log in to connect OneDrive', 'error');
      return;
    }
    const authUrl = apiClient.getOneDriveAuthUrl(userId, storedToken);
    const popup = window.open(authUrl, 'onedrive-auth', 'width=600,height=700,scrollbars=yes,resizable=yes');
    if (!popup) {
      showToast('Popup blocked. Please allow popups or connect from Settings.', 'error');
      return;
    }
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        refetchOneDriveInModal();
      }
    }, 500);
  };

  // Refetch Canva status after popup closes
  const refetchCanvaInModal = async () => {
    try {
      const statusRes = await apiClient.getCanvaStatus();
      const connected = (statusRes?.data?.connected ?? statusRes?.connected) === true;
      setCanvaConnected(connected);
      if (connected) showToast('Canva connected. You can import designs.', 'success');
    } catch (err) {
      console.error('Canva refetch failed:', err);
    }
  };

  // Open Canva auth in popup
  const handleConnectCanvaFromPost = async () => {
    const storedToken = token || apiClient.getAuthToken();
    if (!storedToken) {
      showToast('Please log in to connect Canva', 'error');
      return;
    }
    let userId = user?._id || user?.id;
    if (!userId) {
      try {
        const res = await apiClient.getCurrentUser();
        const u = res?.data ?? res;
        userId = u?._id ?? u?.id;
      } catch (e) {
        console.error('Could not get current user:', e);
      }
    }
    if (!userId) {
      showToast('Please log in to connect Canva', 'error');
      return;
    }
    const authUrl = apiClient.getCanvaAuthUrl(userId, storedToken);
    const popup = window.open(authUrl, 'canva-auth', 'width=600,height=700,scrollbars=yes,resizable=yes');
    if (!popup) {
      showToast('Popup blocked. Please allow popups or connect from Settings.', 'error');
      return;
    }
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        refetchCanvaInModal();
      }
    }, 500);
  };

  // Parse Canva design ID from URL or use as-is if already an ID
  const parseCanvaDesignId = (input) => {
    if (!input || typeof input !== 'string') return '';
    const trimmed = input.trim();
    // e.g. https://www.canva.com/design/ABC123/view or .../design/ABC123/...
    const match = trimmed.match(/canva\.com\/design\/([A-Za-z0-9_-]+)/);
    return match ? match[1] : trimmed;
  };

  // Import a Canva design into post media
  const handleImportFromCanva = async () => {
    const designId = parseCanvaDesignId(canvaDesignId);
    if (!designId || canvaImporting) return;
    setCanvaImporting(true);
    setError(null);
    try {
      const res = await apiClient.importFromCanva(designId, canvaExportType);
      const media = res?.data ?? res;
      if (!media || !(media.url || media.path || media.fileUrl)) {
        throw new Error('Invalid import response');
      }
      const apiBase = process.env.REACT_APP_API_URL || '';
      const buildFullUrl = (url) => {
        if (!url || typeof url !== 'string') return url;
        if (url.startsWith('http') || url.startsWith('blob:')) return url;
        if (url.startsWith('/')) {
          const base = apiBase.replace(/\/+$/, '');
          return base ? `${base}${url}` : url;
        }
        return url;
      };
      const mediaUrl = buildFullUrl(media.url || media.path || media.fileUrl);
      const isVideo = (media.fileType === 'video') || (canvaExportType === 'mp4');
      const newItem = {
        url: mediaUrl,
        displayUrl: mediaUrl,
        altText: media.originalName || media.filename || 'Canva design',
        originalName: media.originalName || media.filename || 'Canva design',
        displayName: media.originalName || media.filename || 'Canva design',
        filename: media.filename,
        publicId: media.publicId,
        fileType: isVideo ? 'video' : 'image',
        size: media.size || null,
        dimensions: media.dimensions || null,
        duration: media.duration || null,
        format: media.mimeType || (isVideo ? 'video/mp4' : 'image/png'),
        createdAt: new Date().toISOString(),
        isLocal: false,
      };
      setPostData(prev => ({
        ...prev,
        images: [...(prev.images || []), newItem],
      }));
      setShowCanvaModal(false);
      setCanvaDesignId('');
      showToast('Added from Canva', 'success');
    } catch (err) {
      const msg = err?.message || err?.detail || 'Failed to import from Canva';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setCanvaImporting(false);
    }
  };

  // ✅ Updated remove media function
  const removeMedia = (index) => {
    const mediaItem = postData.images[index];
    const urlToRevoke = mediaItem?.displayUrl || mediaItem?.url;
    if (urlToRevoke && urlToRevoke.startsWith('blob:')) {
      URL.revokeObjectURL(urlToRevoke);
    }

    setPostData(prev => ({
      ...prev,
      images: (prev.images || []).filter((_, i) => i !== index)
    }));
    // Reset file input so selecting the same file again triggers onChange
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    showToast('Media removed', 'info');
  };

  // Helper function to check if there's a video in uploaded media
  const hasVideo = () => {
    return postData.images && postData.images.some(img => {
      const isVideo = img.fileType === 'video' || 
                     (img.url && (img.url.match(/\.(mp4|mov|webm|avi|mkv)(\?|$)/i) || img.url.includes('video'))) ||
                     (img.type && img.type.startsWith('video/'));
      return isVideo;
    });
  };

  // Handle reel cover file upload
  const handleReelCoverUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please upload an image file (JPG, PNG, WEBP)', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const coverUrl = event.target.result;
      setReelCoverImage({
        url: coverUrl,
        file: file,
        name: file.name
      });
      // Don't auto-close, wait for confirm button
    };
    reader.readAsDataURL(file);
  };


  // ✅ Helper function to get media type icon
  const getMediaTypeIcon = (mediaItem) => {
    if (mediaItem.fileType === 'video' || mediaItem.url?.includes('video')) {
      return Video;
    }
    return Image;
  };

  const getDisplayUrl = (item) => item?.displayUrl || item?.url;

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleImportFromLibrary = (selectedImages) => {
    setPostData(prev => ({
      ...prev,
      images: [...prev.images, ...selectedImages]
    }));
    showToast(`Added ${selectedImages.length} image(s) from media library`, 'success');
  };

  const handleConnectClick = (e) => {
    e.stopPropagation();
    navigate('/settings?tab=accounts');
  };

  const fetchUserProfile = async () => {
    setLoadingProfile(true);
    try {
      const response = await apiClient.getCurrentUser();

      if (response.success) {
        // Get the raw data from API
        const userData = response.data;
        console.log('Raw API response data:', userData);

        // Ensure connectedPlatforms includes all platforms from connectedAccounts
        let connectedPlatforms = userData.connectedPlatforms || [];

        // Check if there are connected accounts for each platform type
        if (Array.isArray(userData.connectedAccounts)) {
          // Extract unique platform types from connectedAccounts
          const platformsFromAccounts = [
            ...new Set(userData.connectedAccounts.map(acc => acc.platform))
          ];

          // Ensure each platform from accounts exists in connectedPlatforms
          platformsFromAccounts.forEach(platform => {
            if (!connectedPlatforms.includes(platform)) {
              connectedPlatforms.push(platform);
            }
          });
        }

        // Update the userData with the enhanced connectedPlatforms
        userData.connectedPlatforms = connectedPlatforms;
        console.log('Enhanced user data:', userData);

        setUserProfile(userData);
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      showToast('Failed to load user profile', 'error');
    } finally {
      setLoadingProfile(false);
    }
  };

  // Generate platforms array based on connected accounts
  const getAvailablePlatforms = () => {
    const allPlatforms = [
      { id: 'instagram', name: 'Instagram', icon: Instagram, color: '#E4405F' },
      { id: 'facebook', name: 'Facebook', icon: Facebook, color: '#1877F2' },
      { id: 'linkedin', name: 'LinkedIn', icon: Linkedin, color: '#0A66C2' },
      { id: 'youtube', name: 'YouTube', icon: Youtube, color: '#FF0000' },
      { id: 'twitter', name: 'X', icon: () => <FontAwesomeIcon icon={faXTwitter} size="lg" style={{ marginBottom: '4px' }} />, color: "#0A66C2" },
    ];

    return allPlatforms.map(platform => {
      // First check if there are platform-specific accounts (most reliable)
      const hasAccountsForPlatform = userProfile?.connectedAccounts?.some(acc =>
        acc.platform === platform.id && acc.connected !== false
      );
      // Then check if the platform is in the connectedPlatforms array
      const isInConnectedPlatforms = userProfile?.connectedPlatforms?.includes(platform.id);

      // A platform is connected if either condition is true
      const isConnected = hasAccountsForPlatform || isInConnectedPlatforms;
      return {
        ...platform,
        connected: isConnected,
        accounts: userProfile?.connectedAccounts?.filter(acc => acc.platform === platform.id) || []
      };
    });
  };

  const platforms = userProfile ? getAvailablePlatforms() : [];

  // Images are now required for all platforms
  const areImagesRequired = () => {
    return postData.platforms.includes('instagram', 'youtube', 'linkedin');
  };

  // Toast notification function
  const showToast = (message, type = 'info', duration = 5000) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), duration);
  };

  // Enhanced character count based on platform limits from API response
  const getCharacterCount = () => {
    const limits = {
      twitter: 280,
      instagram: 2200,
      facebook: 63206,
      linkedin: 3000,
      youtube: 5000 // YouTube description limit
    };

    const selectedPlatforms = postData.platforms;
    const currentLength = postData.content.length;

    if (selectedPlatforms.length === 0) {
      return { current: currentLength, max: 2200, remaining: 2200 - currentLength };
    }

    // Find the most restrictive limit
    const minLimit = Math.min(...selectedPlatforms.map(platform => limits[platform] || 2200));

    return {
      current: currentLength,
      max: minLimit,
      remaining: minLimit - currentLength,
      platformLimits: selectedPlatforms.reduce((acc, platform) => {
        acc[platform] = {
          current: currentLength,
          max: limits[platform] || 2200,
          remaining: (limits[platform] || 2200) - currentLength
        };
        return acc;
      }, {})
    };
  };

  const charCount = getCharacterCount();

  // Validation function with toast
  const validatePreview = () => {
    if (!postData.content.trim()) {
      showToast('Please enter some content before viewing the preview', 'error');
      return false;
    }
    if (postData.platforms.length === 0) {
      showToast('Please select at least one platform', 'error');
      return false;
    }

    // Check if accounts are selected for platforms that require it
    const platformsRequiringAccounts = ['instagram', 'facebook', 'linkedin', 'youtube'];
    for (const platform of postData.platforms) {
      if (platformsRequiringAccounts.includes(platform)) {
        const selectedAccountsForPlatform = postData.selectedAccounts[platform] || [];
        const validAccounts = selectedAccountsForPlatform.filter(account => account != null && account !== '');

        if (validAccounts.length === 0) {
          const platformName = platforms.find(p => p.id === platform)?.name;
          showToast(`Please select at least one account for ${platformName}`, 'error');
          return false;
        }
      }
    }

    return true;
  };

  // ✅ UPDATED: Enhanced validation for form submission with schedule validation
  const validateForm = () => {
    if (!postData.content.trim()) {
      setError('Content is required');
      return false;
    }

    if (postData.platforms.length === 0) {
      setError('Please select at least one platform');
      return false;
    }

    // Check character limits
    if (charCount.remaining < 0) {
      setError(`Content exceeds character limit (${charCount.current}/${charCount.max})`);
      return false;
    }

    // Check platform-specific limits
    if (charCount.platformLimits) {
      for (const [platform, limits] of Object.entries(charCount.platformLimits)) {
        if (limits.remaining < 0) {
          const platformName = platforms.find(p => p.id === platform)?.name;
          setError(`Content exceeds ${platformName} limit (${limits.current}/${limits.max})`);
          return false;
        }
      }
    }

    // ✅ ADD: Validate schedule date/time
    if (isScheduled) {
      const dateTimeValidation = validateScheduleDateTime(postData.scheduledDate, postData.scheduledTime);
      if (!dateTimeValidation.isValid) {
        setError(dateTimeValidation.message);
        showToast(dateTimeValidation.message, 'error');
        return false;
      }
    }

    // Check if images are required but not provided
    if (areImagesRequired() && postData.images.length === 0) {
      setError('Images are required for all posts');
      return false;
    }

    // Add YouTube-specific validation
    if (postData.platforms.includes('youtube') && !validateYouTubeContent()) {
      return false;
    }

    // Check if accounts are selected for platforms that require it
    const platformsRequiringAccounts = ['instagram', 'facebook', 'linkedin']; // Added LinkedIn
    for (const platform of postData.platforms) {
      if (platformsRequiringAccounts.includes(platform)) {
        const selectedAccountsForPlatform = postData.selectedAccounts[platform] || [];
        const validAccounts = selectedAccountsForPlatform.filter(account => account != null && account !== '');

        if (validAccounts.length === 0) {
          const platformName = platforms.find(p => p.id === platform)?.name;
          setError(`Please select at least one valid account for ${platformName}`);
          return false;
        }
      }
    }

    return true;
  };

  const validateYouTubeContent = () => {
    if (postData.platforms.includes('youtube')) {
      // Check if we have any video
      const hasVideo = postData.images.some(img =>
        img.fileType === 'video' ||
        img.url?.includes('video') ||
        img.url?.includes('.mp4')
      );

      if (!hasVideo) {
        showToast('YouTube posts require at least one video', 'error');
        return false;
      }

      // Check if title (content) is too long
      if (postData.content.length > 100) {
        showToast('YouTube title cannot exceed 100 characters', 'error');
        return false;
      }
    }

    return true;
  };

  // Handle preview tab click with validation
  const handlePreviewClick = () => {
    if (validatePreview()) {
      setActiveTab('preview');
    }
  };

  const handlePlatformToggle = (platformId) => {
    const platform = platforms.find(p => p.id === platformId);
    if (!platform || !platform.connected) return;

    setPostData(prev => {
      const currentPlatforms = prev.platforms || [];
      const newPlatforms = currentPlatforms.includes(platformId)
        ? currentPlatforms.filter(id => id !== platformId)
        : [...currentPlatforms, platformId];

      // Remove selected accounts if platform is deselected
      const newSelectedAccounts = { ...(prev.selectedAccounts || {}) };
      if (!newPlatforms.includes(platformId)) {
        delete newSelectedAccounts[platformId];
      }

      return {
        ...prev,
        platforms: newPlatforms,
        selectedAccounts: newSelectedAccounts
      };
    });
  };

  // Handler to select all connected platforms
  const handleSelectAllPlatforms = () => {
    const connectedPlatformIds = platforms
      .filter(p => p.connected)
      .map(p => p.id);

    if (connectedPlatformIds.length === 0) return;

    setPostData(prev => {
      const currentPlatforms = prev.platforms || [];
      const allSelected = connectedPlatformIds.every(id => currentPlatforms.includes(id));
      
      if (allSelected) {
        // Deselect all platforms
        return {
          ...prev,
          platforms: [],
          selectedAccounts: {}
        };
      } else {
        // Select all platforms
        const newSelectedAccounts = { ...(prev.selectedAccounts || {}) };
        
        // For each connected platform, select the first account if available
        connectedPlatformIds.forEach(platformId => {
          const platform = platforms.find(p => p.id === platformId);
          if (platform && platform.accounts && platform.accounts.length > 0) {
            // If platform is not already in selectedAccounts, select first account
            if (!newSelectedAccounts[platformId] || newSelectedAccounts[platformId].length === 0) {
              const firstAccount = platform.accounts[0];
              const accountId = firstAccount.accountId || firstAccount.id || firstAccount._id || firstAccount.pageId || firstAccount.companyId;
              if (accountId) {
                newSelectedAccounts[platformId] = [accountId];
              }
            }
          }
        });

        return {
          ...prev,
          platforms: [...new Set([...connectedPlatformIds])],
          selectedAccounts: newSelectedAccounts
        };
      }
    });
  };

  // Updated account selection handler for multiple accounts
  const handleAccountSelection = (platformId, accountId, isSelected) => {
    if (!accountId || accountId === null || accountId === undefined) {
      console.warn('Invalid account ID detected:', accountId);
      return;
    }

    setPostData(prev => {
      const currentAccounts = prev.selectedAccounts[platformId] || [];

      let newAccounts;
      if (isSelected) {
        newAccounts = currentAccounts.includes(accountId)
          ? currentAccounts
          : [...currentAccounts, accountId];
      } else {
        newAccounts = currentAccounts.filter(id => id !== accountId);
      }

      return {
        ...prev,
        selectedAccounts: {
          ...prev.selectedAccounts,
          [platformId]: newAccounts
        }
      };
    });
  };

  // Helper function to check if an account is selected
  const isAccountSelected = (platformId, accountId) => {
    if (!accountId) return false;
    const selectedAccounts = postData.selectedAccounts[platformId] || [];
    return selectedAccounts.includes(accountId);
  };

  // Helper function to get selected accounts count for a platform
  const getSelectedAccountsCount = (platformId) => {
    const selectedAccounts = postData.selectedAccounts[platformId] || [];
    return selectedAccounts.length;
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingFiles(true);
    setError(null);

    try {
      // For immediate preview, create local URLs
      const localPreviews = files.map(file => ({
        url: URL.createObjectURL(file),
        altText: file.name,
        isLocal: true
      }));

      setPostData(prev => ({
        ...prev,
        images: [...prev.images, ...localPreviews]
      }));

      showToast('Uploading images...', 'info');

      const response = await uploadMedia(files);

      const uploadedImages = response.data.map(media => ({
        url: media.url,
        altText: media.originalName || 'Post image',
        publicId: media.publicId
      }));

      // Replace local previews with actual uploaded URLs
      setPostData(prev => ({
        ...prev,
        images: (prev.images || []).filter(img => !img.isLocal).concat(uploadedImages)
      }));

      showToast(`Successfully uploaded ${files.length} image(s)`, 'success');

    } catch (error) {
      console.error('Failed to upload images:', error);
      setError(error.message || 'Failed to upload images');
      showToast('Failed to upload images', 'error');

      // Remove local previews on error
      setPostData(prev => ({
        ...prev,
        images: (prev.images || []).filter(img => !img.isLocal)
      }));
    } finally {
      setUploadingFiles(false);
    }
  };

  const removeImage = (index) => {
    setPostData(prev => ({
      ...prev,
      images: (prev.images || []).filter((_, i) => i !== index)
    }));
    showToast('Image removed', 'info');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    if (!validateForm()) {
      setIsSubmitting(false);
      return;
    }

    // Define cleanedSelectedAccounts BEFORE the try block
    const cleanedSelectedAccounts = {};
    const selectedAccountsWithNames = {}; // ✅ Added

    try {
      // 🔹 Extract connected accounts from user profile
      const accountsMap = {};
      userProfile?.connectedAccounts?.forEach(account => {
        // Handle both _id and id, and other possible ID fields
        const accountId = account._id || account.id || account.accountId || account.pageId || account.companyId;
        if (accountId) {
          accountsMap[accountId.toString()] = account;
        }
      });

      // 🔹 Clean up selectedAccounts (remove null/empty)
      Object.entries(postData.selectedAccounts || {}).forEach(([platform, accounts]) => {
        const validAccounts = (accounts || []).filter(account => account != null && account !== '');
        if (validAccounts.length > 0) {
          cleanedSelectedAccounts[platform] = validAccounts.map(id => String(id));

          // ✅ Add usernames mapped from connectedAccounts (backend requires id + username as strings)
          selectedAccountsWithNames[platform] = validAccounts.map(accountId => {
            const account = accountsMap[accountId];
            return {
              id: String(accountId),
              username: String(account?.username ?? 'Unknown Account')
            };
          });
        }
      });

      // 🔹 Unified Story Publishing (Instagram only): add instagram_story to payload when enabled
      let finalPlatforms = [...(postData.platforms || [])];
      if (storyPublishingEnabled) {
        finalPlatforms.push('instagram_story');
        const igAccountIds = cleanedSelectedAccounts.instagram || [];
        if (igAccountIds.length > 0) {
          cleanedSelectedAccounts.instagram_story = [...igAccountIds];
          selectedAccountsWithNames.instagram_story = selectedAccountsWithNames.instagram || [];
        } else {
          const connectedIg = (userProfile?.connectedAccounts || []).filter(
            (a) => (a.platform === 'instagram' && a.connected !== false)
          );
          const ids = connectedIg.map((a) => String(a._id || a.id || a.accountId)).filter(Boolean);
          if (ids.length > 0) {
            cleanedSelectedAccounts.instagram_story = ids;
            selectedAccountsWithNames.instagram_story = ids.map((id) => {
              const acc = accountsMap[id];
              return { id: String(id), username: String(acc?.username ?? 'Unknown Account') };
            });
          }
        }
      }

      console.log('✅ Sending account usernames:', selectedAccountsWithNames);

      // 🔹 Upload any blob URLs to VPS before creating post
      const imagesArray = postData.images || [];
      let processedImages = [...imagesArray];
      const getFetchableUrl = (img) => (img?.displayUrl || img?.url) || '';
      const imagesWithBlobUrls = imagesArray.filter(img =>
        img.url && img.url.startsWith('blob:')
      );

      if (imagesWithBlobUrls.length > 0) {
        showToast('Uploading images to server...', 'info');

        try {
          const filesToUpload = await Promise.all(
            imagesWithBlobUrls.map(async (img) => {
              const fetchUrl = getFetchableUrl(img);
              const response = await fetch(fetchUrl);
              const blob = await response.blob();
              const file = new File([blob], img.originalName || img.filename || 'image', {
                type: blob.type || 'image/jpeg'
              });
              return { file, originalImg: img };
            })
          );

          // Upload files to VPS using the uploadMedia function
          const uploadResponse = await uploadMedia(filesToUpload.map(item => item.file));

          if (!uploadResponse.data || !Array.isArray(uploadResponse.data)) {
            throw new Error('Failed to upload images - invalid response');
          }

          processedImages = (postData.images || []).map((img) => {
            if (img.url && img.url.startsWith('blob:')) {
              const uploadIndex = imagesWithBlobUrls.findIndex(blobImg => blobImg === img);
              if (uploadIndex >= 0 && uploadResponse.data[uploadIndex]) {
                const uploadedMedia = uploadResponse.data[uploadIndex];

                // Check if upload failed (backend returned error field)
                if (uploadedMedia.error) {
                  console.error('❌ Upload failed for file:', uploadedMedia.originalName || uploadedMedia.displayName, uploadedMedia.error);
                  throw new Error(
                    `Failed to upload ${uploadedMedia.originalName || uploadedMedia.displayName || 'file'}: ${uploadedMedia.error}. ` +
                    `Please check server configuration (ffprobe may be missing for video processing).`
                  );
                }

                // Get VPS URL - try multiple possible fields
                let vpsUrl = uploadedMedia.url || uploadedMedia.secure_url || uploadedMedia.public_url;
                if (vpsUrl && vpsUrl.startsWith('/') && !vpsUrl.startsWith('//')) {
                  const apiBase = process.env.REACT_APP_API_URL || '';
                  const base = apiBase.replace(/\/+$/, '');
                  vpsUrl = base ? `${base}${vpsUrl}` : vpsUrl;
                }

                if (!vpsUrl || vpsUrl.startsWith('blob:')) {
                  console.error('❌ Invalid VPS URL received:', uploadedMedia);
                  throw new Error(
                    `Failed to get valid URL from server for ${uploadedMedia.originalName || uploadedMedia.displayName || 'file'}. ` +
                    `Server response: ${JSON.stringify(uploadedMedia)}`
                  );
                }

                // Clean thumbnails from uploadedMedia or img - exclude null values
                let cleanedThumbnails = null;
                const thumbnailsSource = uploadedMedia.thumbnails || img.thumbnails;
                if (thumbnailsSource && typeof thumbnailsSource === 'object') {
                  cleanedThumbnails = {};
                  for (const [key, value] of Object.entries(thumbnailsSource)) {
                    if (value != null && value !== undefined && value !== '') {
                      cleanedThumbnails[key] = String(value);
                    }
                  }
                  if (Object.keys(cleanedThumbnails).length === 0) {
                    cleanedThumbnails = null;
                  }
                }

                const updatedImg = {
                  ...img,
                  url: vpsUrl,
                  publicId: uploadedMedia.publicId || img.publicId,
                  filename: uploadedMedia.filename || img.filename,
                  originalName: uploadedMedia.originalName || img.originalName,
                  displayName: uploadedMedia.displayName || uploadedMedia.originalName || img.displayName
                };

                // Only include thumbnails if cleaned and has valid values
                if (cleanedThumbnails) {
                  updatedImg.thumbnails = cleanedThumbnails;
                } else {
                  // Explicitly remove thumbnails if it's null/empty
                  delete updatedImg.thumbnails;
                }

                return updatedImg;
              }
            }
            return img;
          });

          showToast('Images uploaded successfully', 'success');
        } catch (error) {
          console.error('Failed to upload blob URLs:', error);
          throw new Error(`Failed to upload images: ${error.message}`);
        }
      }

      // 🔹 Filter out any images that still have blob URLs (safety check)
      processedImages = processedImages.filter(img =>
        !img.url || !img.url.startsWith('blob:')
      );

      if (processedImages.length === 0 && (postData.images || []).length > 0) {
        throw new Error('Failed to upload images. Please try again.');
      }

      // 🔹 Final validation - ensure no blob URLs are being sent
      const hasBlobUrls = processedImages.some(img =>
        img.url && img.url.startsWith('blob:')
      );

      if (hasBlobUrls) {
        console.error('❌ CRITICAL: Blob URLs detected in processed images!',
          processedImages.filter(img => img.url && img.url.startsWith('blob:'))
        );
        throw new Error('Invalid image URLs detected. Please try uploading images again.');
      }

      // 🔹 Prepare final API post data
      const apiPostData = {
        content: postData.content || '',
        platforms: finalPlatforms,
        selectedAccounts: cleanedSelectedAccounts,
        selectedAccountsWithNames: selectedAccountsWithNames, // ✅ Added to payload
        images: processedImages
          .filter(img => img && img.url && String(img.url).trim())
          .map((img, index) => {
          // Clean thumbnails - completely exclude null/undefined values
          let cleanedThumbnails = null;
          if (img.thumbnails && typeof img.thumbnails === 'object') {
            cleanedThumbnails = {};
            for (const [key, value] of Object.entries(img.thumbnails)) {
              if (value != null && value !== undefined && value !== '') {
                cleanedThumbnails[key] = String(value);
              }
            }
            if (Object.keys(cleanedThumbnails).length === 0) {
              cleanedThumbnails = null;
            }
          }

          // Backend expects dimensions as { width?: int, height?: int } or null
          let dimensions = null;
          if (img.dimensions && typeof img.dimensions === 'object' && !Array.isArray(img.dimensions)) {
            const w = img.dimensions.width;
            const h = img.dimensions.height;
            const nw = w != null ? Number(w) : null;
            const nh = h != null ? Number(h) : null;
            if (nw != null || nh != null) {
              dimensions = { width: Number.isFinite(nw) ? nw : null, height: Number.isFinite(nh) ? nh : null };
            }
          }

          const imageData = {
            url: String(img.url),
            altText: (img.altText || img.originalName || 'Post media').substring(0, 200),
            originalName: img.originalName || img.filename || `Media ${index + 1}`,
            displayName: img.displayName || img.originalName || img.filename || `Media ${index + 1}`,
            filename: img.filename ?? null,
            publicId: img.publicId ?? null,
            fileType: (img.fileType === 'video' || img.fileType === 'image') ? img.fileType : 'image',
            size: img.size != null && img.size !== '' ? Number(img.size) : null,
            dimensions,
            duration: img.duration != null && img.duration !== '' ? Number(img.duration) : null,
            order: Number(index) || 0,
            format: img.format ?? null
          };

          if (cleanedThumbnails && Object.keys(cleanedThumbnails).length > 0) {
            imageData.thumbnails = cleanedThumbnails;
          }

          return imageData;
        }),
        hashtags: Array.isArray(postData.hashtags)
          ? postData.hashtags
          : (typeof postData.hashtags === 'string' ? postData.hashtags.split(/\s+/).filter(tag => tag.startsWith('#')) : []),
        mentions: Array.isArray(postData.mentions)
          ? postData.mentions
          : (typeof postData.mentions === 'string' ? postData.mentions.split(/\s+/).filter(mention => mention.startsWith('@')) : []),
        metadata: {
          category: ['promotional', 'educational', 'entertainment', 'news', 'personal', 'other'].includes(postData.metadata?.category) ? postData.metadata.category : 'other',
          source: 'web'
        }
      };

      // One-Click Collab Request (Instagram only): send collaborator username when enabled
      if (collabEnabled && collabUsername && String(collabUsername).trim()) {
        const username = String(collabUsername).trim().replace(/^@/, '');
        if (username) {
          const collabList = [username];
          apiPostData.instagram_collaborators = collabList;
          apiPostData.instagramCollaborators = collabList; // Backend accepts both keys
        }
      }

      // 🟥 YouTube-specific logic
      if (postData.platforms.includes('youtube')) {
        apiPostData.title = postData.content.substring(0, 100);
        apiPostData.description = postData.hashtags
          ? postData.hashtags
          : `Thanks for watching this video about ${postData.content}!\n\nDon't forget to like and subscribe for more content.`;

        // ✅ Use processedImages instead of postData.images to get VPS URLs (not blob URLs)
        const videoFiles = processedImages.filter(
          img => img.fileType === 'video' || img.url?.includes('video') || img.url?.includes('.mp4')
        );

        if (videoFiles.length > 0) {
          const { _id, ...cleanedVideo } = videoFiles[0];

          // Clean thumbnails in cleanedVideo - exclude null/undefined values
          // Backend expects all thumbnail values to be strings, not null
          if (cleanedVideo.thumbnails && typeof cleanedVideo.thumbnails === 'object') {
            const cleanedThumbnails = {};
            for (const [key, value] of Object.entries(cleanedVideo.thumbnails)) {
              // Only include keys with valid non-null, non-undefined, non-empty values
              if (value != null && value !== undefined && value !== '') {
                cleanedThumbnails[key] = String(value);
              }
            }
            // Only include thumbnails if it has at least one valid value
            if (Object.keys(cleanedThumbnails).length > 0) {
              cleanedVideo.thumbnails = cleanedThumbnails;
            } else {
              // Remove thumbnails if all values are null/empty
              delete cleanedVideo.thumbnails;
            }
          }

          apiPostData.youtubeVideo = cleanedVideo;

          if (postData.platforms.length === 1) {
            apiPostData.images = [cleanedVideo];
          }
        }

        if (postData.mentions) {
          apiPostData.tags = postData.mentions
            .split(/\s+/)
            .map(tag => (tag.startsWith('@') ? tag.substring(1) : tag))
            .filter(tag => tag.length > 0);
        }
      }

      // ✅ Handle scheduling or immediate publish (send time in IST, UTC+5:30)
      if (isScheduled && postData.scheduledDate && postData.scheduledTime) {
        const dateStr = toDateOnlyString(postData.scheduledDate);
        const timePart = postData.scheduledTime.length === 5 ? `${postData.scheduledTime}:00` : postData.scheduledTime;
        if (dateStr) {
          apiPostData.scheduledDate = `${dateStr}T${timePart}+05:30`;
        }

        console.log('📅 Scheduling post for (IST):', apiPostData.scheduledDate);
        showToast('Scheduling post...', 'info');

        const response = await onPostCreated(apiPostData);
        console.log('✅ Scheduled post created:', response);

        showToast('Post scheduled successfully!', 'success');
      } else {
        console.log('🚀 Creating and publishing post immediately...');
        showToast('Creating and publishing post...', 'info');

        const createResponse = await onPostCreated(apiPostData);
        console.log('✅ Post created:', createResponse);

        if (!createResponse?.data?.id && !createResponse?.data?._id) {
          throw new Error('Failed to create post - no ID returned');
        }

        const postDataFromCreate = createResponse.data || {};
        const alreadyPublished =
          postDataFromCreate.status === 'published' ||
          (Array.isArray(postDataFromCreate.platformPosts) &&
            postDataFromCreate.platformPosts.some((pp) => pp.status === 'published'));

        if (alreadyPublished) {
          // Backend already auto-published (no scheduled date) — use create response, skip redundant publish call
          const publishResults = postDataFromCreate.publishResults;
          const platformPosts = postDataFromCreate.platformPosts || [];
          const successfulCount = platformPosts.filter((pp) => pp.status === 'published').length;
          const totalCount = platformPosts.length;

          if (publishResults) {
            const { successfulPublishes = successfulCount, totalAccounts = totalCount, results = [] } = publishResults;
            if (successfulPublishes === totalAccounts && totalAccounts > 0) {
              showToast('Post published successfully to all platforms!', 'success');
            } else if (successfulPublishes > 0) {
              const successful = (results || [])
                .filter((r) => r.success)
                .map((r) => r.platform?.toUpperCase() || 'Unknown')
                .join(', ');
              const failed = (results || [])
                .filter((r) => !r.success)
                .map((r) => r.platform?.toUpperCase() || 'Unknown')
                .join(', ');
              showToast(
                `Published to ${successfulPublishes}/${totalAccounts} platforms. Success: ${successful}${failed ? `. Failed: ${failed}` : ''}`,
                'warning'
              );
            } else {
              showToast(createResponse.message || 'Post publishing failed for all platforms', 'error');
            }
          } else if (successfulCount === totalCount && totalCount > 0) {
            showToast('Post published successfully to all platforms!', 'success');
          } else if (successfulCount > 0) {
            showToast(
              `Published to ${successfulCount}/${totalCount} platforms.`,
              'warning'
            );
          } else {
            showToast(createResponse.message || 'Post published successfully!', 'success');
          }
        } else {
          // Post was created as draft/scheduled — call publish endpoint
          const token =
            localStorage.getItem('token') ||
            localStorage.getItem('authToken') ||
            localStorage.getItem('accessToken');
          if (!token) throw new Error('Authentication token not found');

          const postId = postDataFromCreate.id || postDataFromCreate._id;
          console.log('📤 Publishing post with ID:', postId);

          const publishResponse = await apiClient.publishPost(postId);
          console.log('✅ Publish response:', publishResponse);

          if (publishResponse.success) {
            const publishResults = publishResponse.data?.publishResults;
            if (publishResults) {
              const { successfulPublishes = 0, totalAccounts = 0, results = [] } = publishResults;
              if (successfulPublishes === totalAccounts) {
                showToast('Post published successfully to all platforms!', 'success');
              } else if (successfulPublishes > 0) {
                const successful = (results || [])
                  .filter((r) => r.success)
                  .map((r) => r.platform?.toUpperCase() || 'Unknown')
                  .join(', ');
                const failed = (results || [])
                  .filter((r) => !r.success)
                  .map((r) => r.platform?.toUpperCase() || 'Unknown')
                  .join(', ');
                showToast(
                  `Published to ${successfulPublishes}/${totalAccounts} platforms. Success: ${successful}${failed ? `. Failed: ${failed}` : ''}`,
                  'warning'
                );
              } else {
                showToast('Post publishing failed for all platforms', 'error');
              }
            } else {
              showToast(publishResponse.message || 'Post published successfully!', 'success');
            }
          } else {
            throw new Error(publishResponse.message || 'Publishing failed');
          }
        }
      }
      console.log('✅ FRONTEND - selectedAccountsWithNames built:', JSON.stringify(selectedAccountsWithNames, null, 2));
      console.log('✅ FRONTEND - userProfile.connectedAccounts:',
        userProfile?.connectedAccounts?.map(acc => ({ id: acc._id, username: acc.username })));

      // ✅ Reset and close modal
      resetForm();
      onClose();

    } catch (error) {
      console.error('❌ Failed to create/publish post:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create post';
      setError(errorMessage);
      showToast(isScheduled ? 'Failed to schedule post' : 'Failed to publish post', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };



  const resetForm = () => {
    setPostData({
      content: '',
      platforms: [],
      selectedAccounts: {},
      scheduledDate: '',
      scheduledTime: '',
      images: [],
      hashtags: '',
      mentions: '',
      metadata: {
        category: 'other'
      }
    });
    setIsScheduled(false);
    setScheduleType('auto');
    setPostingFrequency('');
    setScheduleStartDate('');
    setScheduleEndDate('');
    setSelectedDays2PerWeek([]);
    setPreferredTime('09:00');
    setCustomTimeHours(9);
    setCustomTimeMinutes(0);
    setCustomTimeSeconds(0);
    setPreviewMode(false);
    setShowAISuggestions(false);
    setAiSuggestions([]);
    setAiPrompt('');
    setError(null);
    setToast(null);
  };

  // AI Content Generation
  const generateAIContent = async () => {
    // Check if platforms are selected
    if (postData.platforms.length === 0) {
      showToast('Please select at least one social media platform first', 'error');
      return;
    }

    if (!aiPrompt.trim()) {
      showToast('Please enter a prompt for AI content generation', 'error');
      return;
    }

    setIsGenerating(true);
    setError(null);
    showToast('Generating AI content...', 'info');

    try {
      const selectedPlatforms = postData.platforms;

      const response = await apiClient.generateContent({
        prompt: aiPrompt,
        tone: 'casual',
        platforms: selectedPlatforms,
        includeHashtags: true,
        maxLength: 280
      });

      console.log('AI Response:', response);

      if (response.success && response.data) {
        const suggestions = [];

        // Enhanced handling for different platform responses
        Object.entries(response.data.content).forEach(([platform, data]) => {
          if (platform === 'youtube') {
            // Special handling for YouTube content
            suggestions.push({
              id: `${platform}-${Date.now()}`,
              content: {
                title: data.title || '',
                description: data.description || '',
                tags: data.tags || [],
                callToAction: data.callToAction || '',
                videoIdeas: data.videoIdeas || []
              },
              hashtags: data.description || '',
              mentions: Array.isArray(data.tags) ? data.tags.join(' ') : '',
              tone: response.data.options.tone,
              platforms: [platform],
              characterCount: data.characterCount || 0,
              withinLimit: data.withinLimit || true,
              provider: 'openai',
              isYoutube: true
            });
          } else {
            // Regular handling for other platforms
            const originalContent = data.content || '';
            console.log('Original content from API for', platform, ':', originalContent);

            // Extract hashtags from content if they exist
            const hashtagPattern = /#[\w]+/g;
            const foundHashtags = originalContent.match(hashtagPattern) || [];

            // Remove hashtag-only lines from content
            let cleanContent = originalContent;
            if (foundHashtags.length > 0) {
              const lines = originalContent.split('\n');
              const contentLines = [];
              const hashtagLines = [];

              lines.forEach(line => {
                const trimmedLine = line.trim();
                const lineHashtags = trimmedLine.match(hashtagPattern) || [];

                // Check if line is ONLY hashtags (no other text)
                const lineWithoutHashtags = trimmedLine.replace(hashtagPattern, '').trim();

                if (lineHashtags.length > 0 && lineWithoutHashtags === '') {
                  // This line contains only hashtags
                  hashtagLines.push(...lineHashtags);
                } else {
                  // This line has actual content (keep it)
                  contentLines.push(line);
                }
              });

              cleanContent = contentLines.join('\n').trim();

              // Use extracted hashtags or fallback to all found hashtags
              const extractedHashtags = hashtagLines.length > 0
                ? hashtagLines
                : foundHashtags;

              suggestions.push({
                id: `${platform}-${Date.now()}`,
                content: cleanContent, // Content without hashtag-only lines
                hashtags: extractedHashtags.join(' '), // Extracted hashtags
                tone: response.data.options.tone,
                platforms: [platform],
                characterCount: data.characterCount || 0,
                withinLimit: data.withinLimit || true,
                provider: 'openai',
                isYoutube: false
              });
            } else {
              // No hashtags found - use content as-is
              suggestions.push({
                id: `${platform}-${Date.now()}`,
                content: originalContent,
                hashtags: data.hashtags || '', // Try to get hashtags from API response
                tone: response.data.options.tone,
                platforms: [platform],
                characterCount: data.characterCount || 0,
                withinLimit: data.withinLimit || true,
                provider: 'openai',
                isYoutube: false
              });
            }
          }
        });

        setAiSuggestions(suggestions);
        showToast(`Generated ${suggestions.length} AI suggestions`, 'success');
      } else {
        throw new Error('Invalid response format');
      }

    } catch (error) {
      console.error('AI generation failed:', error);
      setError('Failed to generate AI content. Please try again.');
      showToast('Failed to generate AI content', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const generateHashtags = async () => {
    // Check if platforms are selected
    if (postData.platforms.length === 0) {
      showToast('Please select at least one social media platform first', 'error');
      return;
    }

    if (!postData.content.trim()) {
      showToast('Please enter some content first to generate hashtags', 'error');
      return;
    }

    setIsGenerating(true);
    setError(null);
    showToast('Generating hashtags...', 'info');

    try {
      const selectedPlatform = postData.platforms[0];

      const response = await apiClient.suggestHashtags({
        content: postData.content,
        platform: selectedPlatform,
        count: 10
      });

      console.log('Hashtag Response:', response);

      // Handle different response formats
      let hashtags = null;
      
      if (response && response.success && response.data && response.data.hashtags) {
        // Format: { success: true, data: { hashtags: [...] } }
        hashtags = response.data.hashtags;
      } else if (response && response.hashtags) {
        // Format: { hashtags: [...] }
        hashtags = Array.isArray(response.hashtags) ? response.hashtags : [response.hashtags];
      } else if (response && response.data && response.data.hashtags) {
        // Format: { data: { hashtags: [...] } }
        hashtags = response.data.hashtags;
      } else if (Array.isArray(response)) {
        // Format: [...]
        hashtags = response;
      }

      if (hashtags && Array.isArray(hashtags) && hashtags.length > 0) {
        const newHashtags = hashtags.map(tag => tag.startsWith('#') ? tag : `#${tag}`).join(' ');
        setPostData(prev => ({
          ...prev,
          hashtags: prev.hashtags ? `${prev.hashtags} ${newHashtags}` : newHashtags
        }));
        showToast(`Added ${hashtags.length} hashtags`, 'success');
      } else {
        throw new Error(response?.message || response?.error || 'Invalid response format - no hashtags received');
      }
    } catch (error) {
      console.error('Hashtag generation failed:', error);
      const errorMessage = error.message || 'Failed to generate hashtags. Please try again.';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const generateMentions = async () => {
    // Check if platforms are selected
    if (postData.platforms.length === 0) {
      showToast('Please select at least one social media platform first', 'error');
      return;
    }

    if (!postData.content.trim()) {
      showToast('Please enter some content first to generate mentions', 'error');
      return;
    }

    setIsGenerating(true);
    setError(null);
    showToast('Generating mentions...', 'info');

    try {
      const selectedPlatform = postData.platforms[0];

      const response = await apiClient.suggestMentions({
        content: postData.content,
        platform: selectedPlatform,
        count: 5,
        mentionTypes: ['influencers', 'brands'],
        verifiedOnly: false
      });

      console.log('Mentions Response:', response);

      // Handle different response formats
      let mentions = null;
      
      if (response && response.success && response.data && response.data.mentions) {
        // Format: { success: true, data: { mentions: [...] } }
        mentions = response.data.mentions;
      } else if (response && response.mentions) {
        // Format: { mentions: [...] }
        mentions = Array.isArray(response.mentions) ? response.mentions : [response.mentions];
      } else if (response && response.data && response.data.mentions) {
        // Format: { data: { mentions: [...] } }
        mentions = response.data.mentions;
      } else if (Array.isArray(response)) {
        // Format: [...]
        mentions = response;
      }

      if (mentions && Array.isArray(mentions) && mentions.length > 0) {
        const newMentions = mentions.map(mention => mention.startsWith('@') ? mention : `@${mention}`).join(' ');
        setPostData(prev => ({
          ...prev,
          mentions: prev.mentions ? `${prev.mentions} ${newMentions}` : newMentions
        }));
        showToast(`Added ${mentions.length} mentions`, 'success');
      } else {
        throw new Error(response?.message || response?.error || 'Invalid response format - no mentions received');
      }
    } catch (error) {
      console.error('Mentions generation failed:', error);
      const errorMessage = error.message || 'Failed to generate mentions. Please try again.';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  // ✅ UPDATED: Apply AI suggestion - ALL content goes to content field only
  const applyAISuggestion = (suggestion) => {
    console.log('Applying AI suggestion:', suggestion);

    if (suggestion.platforms.includes('youtube') && typeof suggestion.content === 'object') {
      // Handle YouTube content - combine title and description in content field
      const youtubeTitle = suggestion.content.title || '';
      const youtubeDescription = suggestion.content.description || '';

      // Combine title and description with line breaks
      const combinedContent = youtubeTitle && youtubeDescription
        ? `${youtubeTitle}\n\n${youtubeDescription}`
        : youtubeTitle || youtubeDescription;

      // Get tags and format them with # prefix
      const youtubeTags = suggestion.content.tags || [];
      const formattedTags = Array.isArray(youtubeTags)
        ? youtubeTags.map(tag => tag.startsWith('#') ? tag : `#${tag}`).join(' ')
        : '';

      setPostData(prev => ({
        ...prev,
        content: combinedContent,  // Title + Description goes here
        hashtags: formattedTags,   // Tags go here with # prefix
        mentions: '',              // Clear mentions
        platforms: suggestion.platforms
      }));
      showToast('YouTube content applied successfully', 'success');
    } else {
      // Handle other platforms - put EVERYTHING in content field
      const contentText = typeof suggestion.content === 'string'
        ? suggestion.content
        : JSON.stringify(suggestion.content);

      // Get hashtags from the suggestion
      const suggestedHashtags = suggestion.hashtags || '';

      setPostData(prev => ({
        ...prev,
        content: contentText,      // ALL content goes here
        hashtags: suggestedHashtags, // Hashtags from AI suggestion
        mentions: '',              // Clear mentions
        platforms: suggestion.platforms
      }));

      showToast('AI suggestion applied successfully', 'success');
    }
  };

  const copySuggestionContent = async (suggestion) => {
    try {
      let textToCopy;

      if (suggestion.isYoutube && typeof suggestion.content === 'object') {
        textToCopy = `Title: ${suggestion.content.title || ''}\n\nDescription:\n${suggestion.content.description || ''}\n\nTags: ${suggestion.content.tags ? suggestion.content.tags.join(', ') : ''}`;
      } else {
        textToCopy = suggestion.content;
      }

      await navigator.clipboard.writeText(textToCopy);
      showToast('Content copied to clipboard', 'success');
    } catch (err) {
      console.error('Failed to copy text: ', err);
      showToast('Failed to copy content', 'error');
    }
  };

  // Clean up blob URLs when component unmounts
  useEffect(() => {
    return () => {
      postData.images.forEach(image => {
        if (image.url && image.url.startsWith('blob:')) {
          URL.revokeObjectURL(image.url);
        }
      });
    };
  }, []);

  // Keyboard navigation for carousel
  useEffect(() => {
    if (!showImageCarousel) return;

    const handleKeyPress = (e) => {
      if (e.key === 'ArrowLeft') {
        goToPrevImage();
      } else if (e.key === 'ArrowRight') {
        goToNextImage();
      } else if (e.key === 'Escape') {
        closeCarousel();
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [showImageCarousel, postData.images.length]);

  if (!isOpen) return null;

  return (
    <>
      {/* Media Source Modal - Rendered at root level to avoid z-index issues */}
      {/* Reel Cover Modal */}
      {showReelCoverModal && (
        <div className="reel-cover-modal-overlay" onClick={() => setShowReelCoverModal(false)}>
          <div className="reel-cover-modal" onClick={(e) => e.stopPropagation()}>
            <div className="reel-cover-modal-header">
              <div className="reel-cover-modal-header-left">
                <Film size={20} className="reel-cover-modal-icon" />
                <h3>Choose Reel Cover</h3>
              </div>
              <button
                type="button"
                className="reel-cover-modal-close"
                onClick={() => setShowReelCoverModal(false)}
              >
                <XIcon size={20} />
              </button>
            </div>

            <div className="reel-cover-modal-content">
              <div className="reel-cover-upload-area">
                <input
                  ref={reelCoverFileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleReelCoverUpload}
                  className="reel-cover-file-input"
                  id="reel-cover-upload"
                />
                <label
                  htmlFor="reel-cover-upload"
                  className="reel-cover-upload-label"
                  onDragEnter={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const file = e.dataTransfer.files[0];
                    if (file && file.type.startsWith('image/')) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        setReelCoverImage({
                          url: event.target.result,
                          file: file,
                          name: file.name
                        });
                        // Don't auto-close, wait for confirm button
                      };
                      reader.readAsDataURL(file);
                    } else {
                      showToast('Please upload an image file (JPG, PNG, WEBP)', 'error');
                    }
                  }}
                >
                  <div className="reel-cover-upload-icon">
                    <ImagePlus size={48} />
                  </div>
                  <p className="reel-cover-upload-text">Upload custom cover from gallery</p>
                  <p className="reel-cover-upload-subtext">Thumbnail will fit to page automatically</p>
                  <p className="reel-cover-upload-formats">Supports JPG, PNG, WEBP</p>
                </label>
              </div>
            </div>

            <div className="reel-cover-modal-footer">
              <button
                type="button"
                className="btn-primary confirm-cover-btn"
                onClick={() => {
                  if (reelCoverImage) {
                    setShowReelCoverModal(false);
                    showToast('Reel cover added successfully', 'success');
                  } else {
                    showToast('Please select or upload a cover image', 'warning');
                  }
                }}
                disabled={!reelCoverImage}
              >
                Confirm Cover
              </button>
            </div>
          </div>
        </div>
      )}

      {showMediaSourceModal && (
        <div className="media-source-overlay" onClick={() => setShowMediaSourceModal(false)}>
          <div className="media-source-modal" onClick={(e) => e.stopPropagation()}>
            <div className="media-source-header">
              <h3>Choose Media Source</h3>
              <button className="media-source-close" onClick={() => setShowMediaSourceModal(false)}>×</button>
            </div>
            <div className="media-source-grid">
              <button className="media-source-card" onClick={() => handleMediaSourceSelect('local')}>
                <HardDrive size={24} />
                <span>Local Drive</span>
              </button>
              <button className="media-source-card" onClick={() => handleMediaSourceSelect('google')}>
                <Cloud size={24} />
                <span>Google Drive</span>
              </button>
              <button className="media-source-card" onClick={() => handleMediaSourceSelect('oneDrive')}>
                <Cloud size={24} />
                <span>OneDrive</span>
              </button>
              <button className="media-source-card" onClick={() => handleMediaSourceSelect('canva')}>
                <Palette size={24} />
                <span>Canva</span>
              </button>
              <button className="media-source-card" onClick={() => handleMediaSourceSelect('s3')}>
                <Box size={24} />
                <span>AWS S3</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Google Drive import modal */}
      {showGoogleDriveModal && (
        <div className="media-source-overlay" onClick={() => setShowGoogleDriveModal(false)}>
          <div className="media-source-modal google-drive-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px' }}>
            <div className="media-source-header">
              <h3>Import from Google Drive</h3>
              <button className="media-source-close" onClick={() => setShowGoogleDriveModal(false)} aria-label="Close">×</button>
            </div>
            <div className="media-source-body" style={{ padding: '16px', minHeight: '200px' }}>
              {googleDriveLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
                  <Loader />
                </div>
              ) : !googleDriveConnected ? (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <Cloud size={40} style={{ color: '#6B7280', marginBottom: '12px' }} />
                  <p style={{ marginBottom: '16px', color: '#374151' }}>Connect Google Drive in Settings to import images and videos into your post.</p>
                  <button
                    type="button"
                    onClick={handleConnectGoogleDriveFromPost}
                    style={{
                      backgroundColor: '#4285F4',
                      color: '#fff',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: '8px',
                      fontWeight: '500',
                      cursor: 'pointer',
                    }}
                  >
                    Connect Google Drive
                  </button>
                  <p style={{ marginTop: '12px', fontSize: '13px', color: '#6B7280' }}>
                    You will be redirected to connect; then return here and try again.
                  </p>
                </div>
              ) : (
                <>
                  {googleDriveFiles.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#6B7280', padding: '24px' }}>No images or videos found in your Drive.</p>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '12px', maxHeight: '320px', overflowY: 'auto' }}>
                      {googleDriveFiles.map((file) => {
                        const isVideo = (file.mimeType || '').startsWith('video/');
                        return (
                          <div
                            key={file.id}
                            style={{
                              border: '1px solid #E5E7EB',
                              borderRadius: '8px',
                              overflow: 'hidden',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              padding: '8px',
                            }}
                          >
                            <div style={{ width: '100%', aspectRatio: '1', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                              {googleDriveThumbnails[file.id] ? (
                                <img src={googleDriveThumbnails[file.id]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                isVideo ? <Video size={32} style={{ color: '#9CA3AF' }} /> : <Image size={32} style={{ color: '#9CA3AF' }} />
                              )}
                            </div>
                            <span style={{ fontSize: '12px', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', textAlign: 'center' }} title={file.name}>{file.name}</span>
                            <button
                              type="button"
                              disabled={googleDriveImporting}
                              onClick={() => handleImportFromGoogleDrive(file.id)}
                              style={{
                                marginTop: '6px',
                                padding: '6px 12px',
                                fontSize: '12px',
                                backgroundColor: '#4285F4',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: googleDriveImporting ? 'not-allowed' : 'pointer',
                                opacity: googleDriveImporting ? 0.7 : 1,
                              }}
                            >
                              {googleDriveImporting ? 'Importing…' : 'Import'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {googleDriveNextToken && (
                    <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '12px', textAlign: 'center' }}>More files available; only first page shown. Import one at a time.</p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* OneDrive import modal */}
      {showOneDriveModal && (
        <div className="media-source-overlay" onClick={() => setShowOneDriveModal(false)}>
          <div className="media-source-modal onedrive-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px' }}>
            <div className="media-source-header">
              <h3>Import from OneDrive</h3>
              <button className="media-source-close" onClick={() => setShowOneDriveModal(false)} aria-label="Close">×</button>
            </div>
            <div className="media-source-body" style={{ padding: '16px', minHeight: '200px' }}>
              {oneDriveLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
                  <Loader />
                </div>
              ) : !oneDriveConnected ? (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <Cloud size={40} style={{ color: '#0078D4', marginBottom: '12px' }} />
                  <p style={{ marginBottom: '16px', color: '#374151' }}>Connect OneDrive in Settings to import images and videos into your post.</p>
                  <button
                    type="button"
                    onClick={handleConnectOneDriveFromPost}
                    style={{
                      backgroundColor: '#0078D4',
                      color: '#fff',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: '8px',
                      fontWeight: '500',
                      cursor: 'pointer',
                    }}
                  >
                    Connect OneDrive
                  </button>
                  <p style={{ marginTop: '12px', fontSize: '13px', color: '#6B7280' }}>
                    A popup will open to connect; close it when done and you can import here.
                  </p>
                </div>
              ) : (
                <>
                  {oneDriveFiles.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#6B7280', padding: '24px' }}>No images or videos found in your OneDrive.</p>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '12px', maxHeight: '320px', overflowY: 'auto' }}>
                      {oneDriveFiles.map((file) => {
                        const isVideo = (file.mimeType || '').startsWith('video/');
                        return (
                          <div
                            key={file.id}
                            style={{
                              border: '1px solid #E5E7EB',
                              borderRadius: '8px',
                              overflow: 'hidden',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              padding: '8px',
                            }}
                          >
                            <div style={{ width: '100%', aspectRatio: '1', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                              {oneDriveThumbnails[file.id] ? (
                                <img src={oneDriveThumbnails[file.id]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                isVideo ? <Video size={32} style={{ color: '#9CA3AF' }} /> : <Image size={32} style={{ color: '#9CA3AF' }} />
                              )}
                            </div>
                            <span style={{ fontSize: '12px', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', textAlign: 'center' }} title={file.name}>{file.name}</span>
                            <button
                              type="button"
                              disabled={oneDriveImporting}
                              onClick={() => handleImportFromOneDrive(file.id)}
                              style={{
                                marginTop: '6px',
                                padding: '6px 12px',
                                fontSize: '12px',
                                backgroundColor: '#0078D4',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: oneDriveImporting ? 'not-allowed' : 'pointer',
                                opacity: oneDriveImporting ? 0.7 : 1,
                              }}
                            >
                              {oneDriveImporting ? 'Importing…' : 'Import'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {oneDriveNextToken && (
                    <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '12px', textAlign: 'center' }}>More files available; only first page shown. Import one at a time.</p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Canva import modal */}
      {showCanvaModal && (
        <div className="media-source-overlay" onClick={() => setShowCanvaModal(false)}>
          <div className="media-source-modal canva-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="media-source-header">
              <h3>Import from Canva</h3>
              <button className="media-source-close" onClick={() => setShowCanvaModal(false)} aria-label="Close">×</button>
            </div>
            <div className="media-source-body" style={{ padding: '16px', minHeight: '180px' }}>
              {canvaLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
                  <Loader />
                </div>
              ) : !canvaConnected ? (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <Palette size={40} style={{ color: '#00C4CC', marginBottom: '12px' }} />
                  <p style={{ marginBottom: '16px', color: '#374151' }}>Connect Canva to import your designs into your post.</p>
                  <button
                    type="button"
                    onClick={handleConnectCanvaFromPost}
                    style={{
                      backgroundColor: '#00C4CC',
                      color: '#fff',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: '8px',
                      fontWeight: '500',
                      cursor: 'pointer',
                    }}
                  >
                    Connect Canva
                  </button>
                  <p style={{ marginTop: '12px', fontSize: '13px', color: '#6B7280' }}>
                    A popup will open to connect; close it when done and you can import here.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                    Canva design ID or URL
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ABC123 or https://www.canva.com/design/ABC123/..."
                    value={canvaDesignId}
                    onChange={(e) => setCanvaDesignId(e.target.value)}
                    style={{
                      padding: '10px 12px',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      fontSize: '14px',
                    }}
                  />
                  <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                    Export format
                  </label>
                  <select
                    value={canvaExportType}
                    onChange={(e) => setCanvaExportType(e.target.value)}
                    style={{
                      padding: '10px 12px',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      fontSize: '14px',
                    }}
                  >
                    <option value="png">PNG</option>
                    <option value="jpg">JPG</option>
                    <option value="gif">GIF</option>
                    <option value="pdf">PDF</option>
                    <option value="mp4">MP4 (video)</option>
                    <option value="pptx">PPTX</option>
                  </select>
                  <button
                    type="button"
                    disabled={canvaImporting || !canvaDesignId.trim()}
                    onClick={handleImportFromCanva}
                    style={{
                      marginTop: '8px',
                      padding: '10px 20px',
                      backgroundColor: '#00C4CC',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: '500',
                      cursor: canvaImporting || !canvaDesignId.trim() ? 'not-allowed' : 'pointer',
                      opacity: canvaImporting || !canvaDesignId.trim() ? 0.7 : 1,
                    }}
                  >
                    {canvaImporting ? 'Importing…' : 'Import design'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
    <div className={`create-post-overlay ${showMediaLibrary ? 'media-library-open' : ''} ${showMediaSourceModal ? 'media-source-open' : ''} ${showGoogleDriveModal ? 'media-source-open' : ''} ${showOneDriveModal ? 'media-source-open' : ''} ${showCanvaModal ? 'media-source-open' : ''}`}>
      {/* Image Carousel Modal */}
      {showImageCarousel && postData.images.length > 0 && (
        <div className="carousel-overlay" onClick={closeCarousel}>
          <div className="carousel-modal" onClick={(e) => e.stopPropagation()}>
            <div className="carousel-header">
              <div className="carousel-counter">
                {currentCarouselIndex + 1} of {postData.images.length}
              </div>
              <div className="carousel-actions">
                <button
                  className="carousel-btn"
                  onClick={() => openCarousel(currentCarouselIndex)}
                  title="View details"
                >
                  <Maximize2 size={20} />
                </button>
                <button
                  className="carousel-btn"
                  onClick={closeCarousel}
                  title="Close"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="carousel-content">
              {postData.images.length > 1 && (
                <button
                  className="carousel-nav carousel-nav-prev"
                  onClick={goToPrevImage}
                  title="Previous image"
                >
                  <ChevronLeft size={24} />
                </button>
              )}

              <div className="carousel-main">
                {postData.images.map((mediaItem, index) => {
                  const isVideo = mediaItem.fileType === 'video' || mediaItem.url?.includes('video');
                  const displayName = mediaItem.displayName || mediaItem.originalName || mediaItem.altText || `Media ${index + 1}`;

                  return (
                    <div
                      key={index}
                      className={`carousel-slide ${index === currentCarouselIndex ? 'active' : ''}`}
                    >
                      {isVideo ? (
                        <video
                          src={getDisplayUrl(mediaItem)}
                          controls
                          className="carousel-media"
                          onError={(e) => {
                            console.error('Failed to load video:', getDisplayUrl(mediaItem));
                          }}
                        />
                      ) : (
                        <img
                          src={getDisplayUrl(mediaItem)}
                          alt={mediaItem.altText || displayName}
                          className="carousel-media"
                          onError={(e) => {
                            console.error('Failed to load image:', getDisplayUrl(mediaItem));
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {postData.images.length > 1 && (
                <button
                  className="carousel-nav carousel-nav-next"
                  onClick={goToNextImage}
                  title="Next image"
                >
                  <ChevronRight size={24} />
                </button>
              )}
            </div>

            {postData.images.length > 1 && (
              <div className="carousel-thumbnails">
                {postData.images.map((mediaItem, index) => {
                  const isVideo = mediaItem.fileType === 'video' || mediaItem.url?.includes('video');
                  const displayName = mediaItem.displayName || mediaItem.originalName || mediaItem.altText || `Media ${index + 1}`;

                  return (
                    <button
                      key={index}
                      className={`carousel-thumbnail ${index === currentCarouselIndex ? 'active' : ''}`}
                      onClick={() => goToImage(index)}
                      title={displayName}
                    >
                      {isVideo ? (
                        <div className="thumbnail-video">
                          <video src={getDisplayUrl(mediaItem)} muted />
                          <div className="video-indicator">
                            <Play size={12} />
                          </div>
                        </div>
                      ) : (
                        <img
                          src={getDisplayUrl(mediaItem)}
                          alt={mediaItem.altText || displayName}
                          onError={(e) => {
                            console.error('Failed to load thumbnail:', getDisplayUrl(mediaItem));
                          }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="carousel-info">
              <div className="media-details">
                <h4>{postData.images[currentCarouselIndex]?.displayName || postData.images[currentCarouselIndex]?.originalName || `Media ${currentCarouselIndex + 1}`}</h4>
                {postData.images[currentCarouselIndex]?.size && (
                  <p className="file-size">{formatFileSize(postData.images[currentCarouselIndex].size)}</p>
                )}
                {postData.images[currentCarouselIndex]?.dimensions && (
                  <p className="dimensions">
                    {postData.images[currentCarouselIndex].dimensions.width} × {postData.images[currentCarouselIndex].dimensions.height}
                  </p>
                )}
              </div>
              <div className="carousel-remove-action">
                <button
                  className="remove-from-carousel-btn"
                  onClick={() => {
                    removeMedia(currentCarouselIndex);
                    if (postData.images.length <= 1) {
                      closeCarousel();
                    } else if (currentCarouselIndex >= postData.images.length - 1) {
                      setCurrentCarouselIndex(postData.images.length - 2);
                    }
                  }}
                  title="Remove this media"
                >
                  Remove Media
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={`create-post-modal ${showMediaLibrary ? 'media-library-open' : ''} ${showMediaSourceModal ? 'media-source-open' : ''}`}>
        <div className="modal-header">
          <div className="header-left">
            <h2>Create New Post</h2>
            <button
              className="ai-assistant-btn"
              onClick={() => setShowAISuggestions(!showAISuggestions)}
              title="AI Content Assistant"
            >
              <Wand2 size={20} />
              <Sparkles size={16} className="sparkle-icon" />
            </button>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="modal-tabs">
          <button
            className={`tab-btn ${activeTab === 'compose' ? 'active' : ''}`}
            onClick={() => setActiveTab('compose')}
          >
            Compose
          </button>
          <button
            className={`tab-btn ${activeTab === 'preview' ? 'active' : ''}`}
            onClick={handlePreviewClick}
          >
            <Eye size={16} />
            Preview
          </button>
        </div>

        <form onSubmit={handleSubmit} className="create-post-form">
          {/* Error Display */}
          {error && (
            <div className={`error-message ${error.includes('future date') ? 'schedule-error' : ''}`}>
              <AlertCircle size={16} />
              <span>{error}</span>
              <button type="button" onClick={() => setError(null)}>×</button>
            </div>
          )}

          {activeTab === 'compose' && (
            <div className={`compose-tab ${showAISuggestions ? 'with-ai' : ''}`}>
              {/* AI Suggestions Column */}
              {showAISuggestions && (
                <div className="ai-suggestions-column">
                  <div className="ai-column-header">
                    <Wand2 size={18} />
                    <h3>AI Content Assistant</h3>
                  </div>

                  <div className="ai-prompt-section">
                    <label>Tell AI what you want to post about:</label>
                    <div className="ai-input-group">
                      <input
                        type="text"
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        placeholder="e.g., new product launch, team achievement, industry insights..."
                        className="ai-prompt-input"
                        onKeyPress={(e) => e.key === 'Enter' && generateAIContent()}
                      />
                      <button
                        type="button"
                        className="ai-generate-btn"
                        onClick={generateAIContent}
                        disabled={!aiPrompt.trim() || isGenerating}
                      >
                        {isGenerating ? (
                          <RefreshCw size={16} className="spinning" />
                        ) : (
                          <Sparkles size={16} />
                        )}
                        {isGenerating ? 'Generating...' : 'Generate'}
                      </button>
                    </div>

                    {!aiPrompt && (
                      <div className="quick-prompts">
                        <span className="quick-prompts-label">Quick ideas:</span>
                        {[
                          'new product launch',
                          'team milestone',
                          'industry insights',
                          'customer success story',
                          'behind the scenes',
                          'tips and tricks'
                        ].map(prompt => (
                          <button
                            key={prompt}
                            type="button"
                            className="quick-prompt-btn"
                            onClick={() => setAiPrompt(prompt)}
                          >
                            {prompt}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {aiSuggestions.length > 0 && (
                    <div className="ai-suggestions">
                      <div className="suggestions-header">
                        <h4>AI Suggestions:</h4>
                        <button
                          type="button"
                          className="regenerate-btn"
                          onClick={generateAIContent}
                          disabled={isGenerating}
                          title="Generate new suggestions"
                        >
                          <RefreshCw size={14} className={isGenerating ? 'spinning' : ''} />
                          Regenerate
                        </button>
                      </div>
                      <div className="suggestions-list">
                        {aiSuggestions.map(suggestion => (
                          <div key={suggestion.id} className="suggestion-card">
                            <div className="suggestion-header">
                              <span className="suggestion-tone">{suggestion.tone}</span>
                              <div className="suggestion-platforms">
                                {suggestion.platforms.map(platform => {
                                  const Icon = platform === 'instagram' ? Instagram :
                                    platform === 'twitter' ? X :
                                      platform === 'youtube' ? Youtube :
                                        platform === 'linkedin' ? Linkedin : Facebook;
                                  return <Icon key={platform} size={14} />;
                                })}
                              </div>
                            </div>

                            {suggestion.isYoutube ? (
                              // YouTube suggestion content
                              <div className="youtube-suggestion">
                                <div className="youtube-title">
                                  <h4>Title: {typeof suggestion.content === 'object' ? suggestion.content.title : suggestion.content}</h4>
                                </div>
                                <div className="youtube-description">
                                  <p>{typeof suggestion.content === 'object' ? suggestion.content.description : suggestion.hashtags}</p>
                                </div>
                                {typeof suggestion.content === 'object' && suggestion.content.tags && (
                                  <div className="youtube-tags">
                                    <small>Tags: {suggestion.content.tags.join(', ')}</small>
                                  </div>
                                )}
                                {typeof suggestion.content === 'object' && suggestion.content.videoIdeas && (
                                  <div className="youtube-ideas">
                                    <small>Video ideas: {Array.isArray(suggestion.content.videoIdeas)
                                      ? suggestion.content.videoIdeas.join(', ')
                                      : suggestion.content.videoIdeas}
                                    </small>
                                  </div>
                                )}
                              </div>
                            ) : (
                              // Standard content for other platforms
                              <>
                                <div
                                  className="suggestion-content"
                                  dangerouslySetInnerHTML={{
                                    __html: formatContentForDisplay(
                                      typeof suggestion.content === 'string' ? suggestion.content : JSON.stringify(suggestion.content)
                                    )
                                  }}
                                />
                                <div className="suggestion-hashtags">
                                  <span>{suggestion.hashtags}</span>
                                </div>
                              </>
                            )}

                            <div className="suggestion-actions">
                              <button
                                type="button"
                                className="copy-suggestion-btn"
                                onClick={() => copySuggestionContent(suggestion)}
                                title="Copy content to clipboard"
                              >
                                <Copy size={14} />
                                Copy
                              </button>
                              <button
                                type="button"
                                className="apply-suggestion-btn"
                                onClick={() => applyAISuggestion(suggestion)}
                              >
                                Use This Content
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Main Form Column - ALWAYS visible */}
              <div className="form-column">
                {/* Quick link to Scheduler - so users can find Schedule for Later / 2 per Week */}
                <div className="scheduler-quick-link-wrap">
                  <button
                    type="button"
                    className="scheduler-quick-link"
                    onClick={() => {
                      setIsScheduled(true);
                      const defaultDate = new Date();
                      const dateStr = defaultDate.toISOString().split("T")[0];
                      if (!scheduleStartDate) setScheduleStartDate(dateStr);
                      if (!postData.scheduledDate) {
                        const fiveMinAhead = new Date();
                        fiveMinAhead.setMinutes(fiveMinAhead.getMinutes() + 5);
                        const timeStr = `${fiveMinAhead.getHours().toString().padStart(2, '0')}:${fiveMinAhead.getMinutes().toString().padStart(2, '0')}`;
                        setPostData(prev => ({ ...prev, scheduledDate: dateStr, scheduledTime: preferredTime === 'custom' ? `${String(customTimeHours).padStart(2, '0')}:${String(customTimeMinutes).padStart(2, '0')}:${String(customTimeSeconds).padStart(2, '0')}` : timeStr }));
                      }
                      setTimeout(() => {
                        const el = document.getElementById('scheduler-section');
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }, 100);
                    }}
                  >
                    <Clock size={16} />
                    Schedule for later (Daily / Weekly / 2 per Week)
                  </button>
                </div>

                {/* Platform Selection */}
                <div className="form-section">
                  <div className="section-label-container">
                    <label className="section-label">Select Platforms</label>
                    <button
                      type="button"
                      className="select-all-platforms-btn"
                      onClick={handleSelectAllPlatforms}
                    >
                      {(() => {
                        const connectedPlatformIds = platforms
                          .filter(p => p.connected)
                          .map(p => p.id);
                        const allSelected = connectedPlatformIds.length > 0 && 
                          connectedPlatformIds.every(id => postData.platforms.includes(id));
                        return allSelected ? 'Deselect All' : 'Select All';
                      })()}
                    </button>
                  </div>
                  <div className="platforms-grid">
                    {platforms.map((platform) => {
                      const Icon = platform.icon;
                      const isSelected = postData.platforms.includes(platform.id);
                      const selectedAccountsCount = getSelectedAccountsCount(platform.id);

                      return (
                        <div key={platform.id} className="platform-container" >
                          <button
                            type="button"
                            onMouseEnter={() => setHoveredPlatform(platform.id)}
                            onMouseLeave={() => setHoveredPlatform(null)}
                            className={`platform-btn
                               ${!platform.connected ? 'not-connected-btn' : ''}
                               ${selectedAccountsCount > 0 ? 'selectedx' : ''}`}
                            onClick={(e) =>
                              platform.connected
                                ? handlePlatformToggle(platform.id)
                                : handleConnectClick(e)
                            }
                            style={{ '--platform-color': platform.color }}
                          >
                            <Icon
                              size={20}
                              color={hoveredPlatform === platform.id || selectedAccountsCount > 0 ? platform.color : "#000"}
                              style={{
                                transition: "transform 0.2s ease, color 0.2s ease",
                                transform: hoveredPlatform === platform.id ? "scale(1.1)" : "scale(1)"
                              }}
                            />
                            <span style={{ color: hoveredPlatform === platform.id || selectedAccountsCount > 0 ? platform.color : "#000" }} >{platform.name}</span>
                            <span className="connect-status">
                              {platform.connected ?
                                (selectedAccountsCount > 0 ? `${selectedAccountsCount} account${selectedAccountsCount > 1 ? 's' : ''} selected` : 'Connected')
                                : 'Connect Now'
                              }
                            </span>
                          </button>

                          {/* Multi-Account Selection */}
                          {isSelected && platform.connected && platform.accounts && platform.accounts.length > 0 && (
                            <div className="account-multi-selector">
                              <label className="account-label">
                                Choose Profile{platform.accounts.length > 1 ? 's' : ''}:
                                <span className="account-count">
                                  ({selectedAccountsCount} of {platform.accounts.length} selected)
                                </span>
                              </label>
                              <div className="accounts-checkbox-list">
                                {platform.accounts.map((account) => {
                                  const accountId = account.accountId || account.id || account._id || account.pageId || account.companyId;

                                  if (!accountId) {
                                    console.warn('Account missing ID:', account);
                                    return null;
                                  }

                                  const isChecked = isAccountSelected(platform.id, accountId);

                                  const accountName = platform.id === 'linkedin' && account.accountType === 'company'
                                    ? `${account.username || account.companyName || accountId} (Company Page)`
                                    : account.username || account.name || account.displayName || accountId;

                                  return (
                                    <label key={`${platform.id}-${accountId}`} className="account-checkbox-item">
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={(e) => handleAccountSelection(platform.id, accountId, e.target.checked)}
                                        className="account-checkbox"
                                      />
                                      <span className="checkbox-custom"></span>
                                      <span className="account-name">
                                        {accountName}
                                        {account.pageId && account.pageId !== accountId && (
                                          <span className="account-id"> (ID: {account.pageId})</span>
                                        )}
                                      </span>
                                    </label>
                                  );
                                })}
                              </div>

                              {platform.accounts.length > 1 && (
                                <div className="account-selection-controls">
                                  <button
                                    type="button"
                                    className="select-all-btn"
                                    onClick={() => {
                                      platform.accounts.forEach(account => {
                                        const accountId = account.accountId || account.id || account._id || account.pageId || account.companyId;
                                        if (accountId && !isAccountSelected(platform.id, accountId)) {
                                          handleAccountSelection(platform.id, accountId, true);
                                        }
                                      });
                                    }}
                                    disabled={selectedAccountsCount === platform.accounts.length}
                                  >
                                    Select All
                                  </button>
                                  <button
                                    type="button"
                                    className="deselect-all-btn"
                                    onClick={() => {
                                      setPostData(prev => ({
                                        ...prev,
                                        selectedAccounts: {
                                          ...prev.selectedAccounts,
                                          [platform.id]: []
                                        }
                                      }));
                                    }}
                                    disabled={selectedAccountsCount === 0}
                                  >
                                    Deselect All
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Content */}
                <div className="form-section">
                  <label className="section-label">
                    Content
                    <span className={`char-count ${charCount.remaining < 0 ? 'over-limit' : ''}`}>
                      {charCount.current}/{charCount.max}
                    </span>
                  </label>
                  <textarea
                    value={postData.content}
                    onChange={(e) => setPostData(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="What's happening? Share your thoughts..."
                    className="content-textarea"
                    rows={6}
                    required
                  />
                </div>

                {/* Hashtags and Mentions */}
                <div className="form-row">
                  <div className="form-section">
                    <label className="section-label">
                      <Hash size={16} />
                      Hashtags
                      <button
                        type="button"
                        className="ai-hashtag-btn"
                        onClick={generateHashtags}
                        disabled={isGenerating || !postData.content.trim() || postData.platforms.length === 0}
                        title="Generate hashtags with AI"
                      >
                        <Sparkles size={14} />
                        AI
                      </button>
                    </label>
                    <input
                      type="text"
                      value={postData.hashtags}
                      onChange={(e) => setPostData(prev => ({ ...prev, hashtags: e.target.value }))}
                      placeholder="#marketing #socialmedia #content"
                      className="form-input"
                    />
                  </div>
                  <div className="form-section">
                    <label className="section-label">
                      <AtSign size={16} />
                      Mentions
                      <button
                        type="button"
                        className="ai-hashtag-btn"
                        onClick={generateMentions}
                        disabled={isGenerating || !postData.content.trim() || postData.platforms.length === 0}
                        title="Generate mentions with AI"
                      >
                        <Sparkles size={14} />
                        AI
                      </button>
                    </label>
                    <input
                      type="text"
                      value={postData.mentions}
                      onChange={(e) => setPostData(prev => ({ ...prev, mentions: e.target.value }))}
                      placeholder="@username @brand"
                      className="form-input"
                    />
                  </div>
                </div>

                {/* Enhanced Media Upload Section with Carousel Support */}
                <div className="form-section">
                  <label className="section-label">
                    <Image size={16} />
                    Media (Images & Videos)
                  </label>
                  <div className="media-type-selector">
                    <div className="media-type-header">
                      <label className="section-label">Media Type:</label>
                      <button
                        type="button"
                        className="media-source-btn"
                        onClick={() => setShowMediaSourceModal(true)}
                      >
                        <Cloud size={16} />
                        Import from Media Library
                      </button>
                    </div>
                    <div className="media-type-options">
                      {postData.platforms.length > 0 && DIMENSIONS[postData.platforms[0]] &&
                        Object.keys(DIMENSIONS[postData.platforms[0]]).map(type => (
                          <button
                            key={type}
                            type="button"
                            className={`type-option ${mediaType === type ? 'active' : ''}`}
                            onClick={() => setMediaType(type)}
                          >
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                            {type !== 'profile' && (
                              <small>
                                {DIMENSIONS[postData.platforms[0]][type][0]} x {DIMENSIONS[postData.platforms[0]][type][1]}
                              </small>
                            )}
                          </button>
                        ))
                      }
                    </div>
                  </div>


                  {/* Upload Options Grid */}
                  <div className="media-upload-container">
                    <div className="upload-options-grid">
                      {/* Upload New Files with Drag & Drop */}
                      <div className="upload-option">
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          accept="image/*,video/*"
                          onChange={handleFileInputChange}
                          className="file-input"
                          id="media-upload"
                        />
                        <div
                          className={`upload-area ${dragActive ? 'drag-active' : ''} ${uploadingFiles ? 'uploading' : ''}`}
                          onDragEnter={handleDrag}
                          onDragLeave={handleDrag}
                          onDragOver={handleDrag}
                          onDrop={handleDrop}
                          onClick={handleUploadAreaClick}
                        >
                          {uploadingFiles ? (
                            <>
                              <Loader className="spinner" size={32} />
                              <span className="upload-title">Uploading media...</span>
                              <small>Please wait while we upload your files</small>
                            </>
                          ) : (
                            <>
                              <Upload size={32} />
                              <span className="upload-title">
                                {dragActive ? 'Drop files here' : 'Upload Media Files'}
                              </span>
                              <small className="upload-subtitle">
                                Drag & drop or click to select
                              </small>
                              <div className="upload-specs">
                                <span className='upidsc'><Image size={16} />  PNG, JPG, GIF up to 50MB</span>
                                <span className='upidsc'><Video size={16} />  MP4, MOV, AVI up to 500MB</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Enhanced Media Previews with Carousel Integration */}
                  {postData.images && postData.images.length > 0 && (
                    <div className="uploaded-media-section">
                      <div className="media-section-header">
                        <h4>Selected Media ({postData.images.length})</h4>
                        <div className="media-header-actions">
                          {postData.images.length > 1 && (
                            <button
                              type="button"
                              className="view-carousel-header-btn"
                              onClick={() => openCarousel(0)}
                              title="View in carousel"
                            >
                              <GalleryHorizontal size={16} />
                              View Carousel
                            </button>
                          )}
                          <button
                            type="button"
                            className="clear-all-media"
                            onClick={() => setPostData(prev => ({ ...prev, images: [] }))}
                            title="Remove all media"
                          >
                            Clear All
                          </button>
                        </div>
                      </div>

                      <div className="media-preview-grid">
                        {postData.images.map((mediaItem, index) => {
                          const MediaIcon = getMediaTypeIcon(mediaItem);
                          const isVideo = mediaItem.fileType === 'video' || mediaItem.url?.includes('video');
                          const displayName = mediaItem.displayName || mediaItem.originalName || mediaItem.altText || `Media ${index + 1}`;

                          return (
                            <div key={index} className="media-preview-item">
                              <div className="media-preview-container">
                                <div
                                  className="media-preview-wrapper"
                                  onClick={() => openCarousel(index)}
                                  title="Click to view in carousel"
                                >
                                  {isVideo ? (
                                    <div className="video-preview">
                                      <video
                                        src={getDisplayUrl(mediaItem)}
                                        className="media-preview-content"
                                        muted
                                        playsInline
                                      />
                                      <div className="video-overlay">
                                        <Play size={24} className="play-icon" />
                                      </div>
                                      <div className="preview-overlay">
                                        <Eye size={20} />
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="image-preview">
                                      <img
                                        src={getDisplayUrl(mediaItem)}
                                        alt={mediaItem.altText || displayName}
                                        className="media-preview-content"
                                        onError={(e) => {
                                          console.error('Failed to load image preview:', getDisplayUrl(mediaItem));
                                          e.target.style.display = 'none';
                                        }}
                                      />
                                      <div className="preview-overlay">
                                        <Eye size={20} />
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Media Controls */}
                                <div className="media-controls">
                                  <button
                                    type="button"
                                    className="media-control-btn view-btn"
                                    onClick={() => openCarousel(index)}
                                    title="View in carousel"
                                  >
                                    <Eye size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    className="media-control-btn remove-btn"
                                    onClick={() => removeMedia(index)}
                                    title={`Remove ${displayName}`}
                                  >
                                    <X size={14} />
                                  </button>
                                </div>

                                {/* Position Indicator for Multiple Images */}
                                {postData.images.length > 1 && (
                                  <div className="position-indicator">
                                    {index + 1}
                                  </div>
                                )}

                                {/* Loading Overlay for uploading files */}
                                {mediaItem.isLocal && uploadingFiles && (
                                  <div className="upload-overlay">
                                    <Loader size={20} />
                                  </div>
                                )}
                              </div>

                              {/* Media Info */}
                              <div className="media-preview-info">
                                <div className="media-name" title={displayName}>
                                  <MediaIcon size={14} />
                                  <span>
                                    {displayName.length > 15
                                      ? `${displayName.substring(0, 15)}...`
                                      : displayName
                                    }
                                  </span>
                                </div>
                                {mediaItem.size && (
                                  <div className="media-size">
                                    {formatFileSize(mediaItem.size)}
                                  </div>
                                )}
                                {mediaItem.dimensions && (
                                  <div className="media-dimensions">
                                    {mediaItem.dimensions.width}×{mediaItem.dimensions.height}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {/* Carousel Quick Navigation */}
                      {postData.images.length > 3 && (
                        <div className="carousel-quick-nav">
                          <button
                            className="quick-nav-btn"
                            onClick={() => openCarousel(0)}
                          >
                            <GalleryHorizontal size={16} />
                            View All {postData.images.length} Media Files
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Reel Cover Section - Show only when video is uploaded */}
                {hasVideo() && (
                  <div className="form-section reel-cover-section">
                    <div className="reel-cover-header">
                      <div className="reel-cover-header-left">
                        <div className="reel-cover-icon-wrapper">
                          <Film size={18} />
                        </div>
                        <div className="reel-cover-header-text">
                          <h3 className="reel-cover-title">Reel Cover</h3>
                          <p className="reel-cover-description">
                            A good cover image attracts more viewers and gives your profile a professional look
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="add-cover-btn"
                        onClick={() => setShowReelCoverModal(true)}
                      >
                        <ImagePlus size={16} />
                        {reelCoverImage ? 'Change Cover' : 'Add Cover'}
                      </button>
                    </div>
                    {reelCoverImage && (
                      <div className="reel-cover-preview">
                        <img src={reelCoverImage.url} alt="Reel cover" />
                        <button
                          type="button"
                          className="remove-cover-btn"
                          onClick={() => setReelCoverImage(null)}
                        >
                          <XIcon size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Unified Story Publishing Section */}
                <div className="form-section story-publishing-section">
                  <div className="story-publishing-header">
                    <div className="story-header-left">
                      <div className="story-icon-wrapper">
                        <Camera size={20} />
                      </div>
                      <div className="story-header-text">
                        <h3 className="story-title">Unified Story Publishing</h3>
                        <p className="story-subtitle">Post to Instagram Stories</p>
                      </div>
                    </div>
                    <label className="story-header-checkbox-wrapper">
                      <input
                        type="checkbox"
                        checked={storyPublishingEnabled}
                        onChange={(e) => {
                          setStoryPublishingEnabled(e.target.checked);
                          if (!e.target.checked) {
                            setStoryPlatforms([]);
                          } else {
                            setStoryPlatforms(['instagram']);
                          }
                        }}
                        className="story-header-checkbox"
                      />
                    </label>
                  </div>
                  {storyPublishingEnabled && (
                    <p className="story-instruction">Your media will also be published as Instagram Stories</p>
                  )}
                </div>

                {/* One-Click Collab Request Section */}
                <div className="form-section collab-request-section">
                  <div className="collab-header">
                    <div className="collab-header-left">
                      <div className="collab-icon-wrapper">
                        <Users size={20} />
                      </div>
                      <div className="collab-header-text">
                        <h3 className="collab-title">One-Click Collab Request</h3>
                        <p className="collab-subtitle">Instagram only</p>
                      </div>
                    </div>
                    <label className="collab-toggle-wrapper">
                      <input
                        type="checkbox"
                        checked={collabEnabled}
                        onChange={(e) => setCollabEnabled(e.target.checked)}
                        className="collab-toggle-input"
                      />
                      <span className={`collab-toggle-slider ${collabEnabled ? 'active' : ''}`}></span>
                    </label>
                  </div>
                  {collabEnabled && (
                    <div className="collab-content">
                      <label className="collab-username-label">Collaborator Username</label>
                      <input
                        type="text"
                        value={collabUsername}
                        onChange={(e) => setCollabUsername(e.target.value)}
                        placeholder="e.g. sst_web_dev10 or @username"
                        className="collab-username-input"
                      />
                      {collabUsername && String(collabUsername).trim() && (
                        <p className="collab-inviting-text">
                          Inviting: <strong>@{String(collabUsername).trim().replace(/^@/, '')}</strong>
                        </p>
                      )}
                      <p className="collab-info-text">
                        Collaboration adds them to the post (shows &quot;with @username&quot; on the post). They get an invite to accept—not a DM. Use their exact Instagram username (e.g. oxyshet_18). They must have &quot;Allow people to invite you as a collaborator&quot; on in Instagram Settings → Privacy.
                      </p>
                    </div>
                  )}
                </div>

                {/* Scheduler Section - scroll here to see Schedule for Later / 2 per Week */}
                <div id="scheduler-section" className="form-section scheduler-section">
                  <label className="section-label">
                    <Clock size={16} />
                    Scheduler
                  </label>

                  {/* Publish Now / Schedule for Later - Top buttons */}
                  <div className="scheduler-toggle-btns">
                    <button
                      type="button"
                      className={`scheduler-toggle-btn ${!isScheduled ? 'active' : ''}`}
                      onClick={() => {
                        setIsScheduled(false);
                        setPostData(prev => ({ ...prev, scheduledDate: '', scheduledTime: '' }));
                      }}
                    >
                      <Sparkles size={18} />
                      Publish Now
                    </button>
                    <button
                      type="button"
                      className={`scheduler-toggle-btn ${isScheduled ? 'active' : ''}`}
                      onClick={() => {
                        setIsScheduled(true);
                        const defaultDate = new Date();
                        const dateStr = defaultDate.toISOString().split("T")[0];
                        const fiveMinAhead = new Date();
                        fiveMinAhead.setMinutes(fiveMinAhead.getMinutes() + 5);
                        const timeStr = `${fiveMinAhead.getHours().toString().padStart(2, '0')}:${fiveMinAhead.getMinutes().toString().padStart(2, '0')}`;
                        if (!postData.scheduledDate) {
                          setPostData(prev => ({
                            ...prev,
                            scheduledDate: dateStr,
                            scheduledTime: scheduleType === 'auto' && preferredTime === 'custom' ? `${String(customTimeHours).padStart(2, '0')}:${String(customTimeMinutes).padStart(2, '0')}:${String(customTimeSeconds).padStart(2, '0')}` : timeStr
                          }));
                        }
                        if (!scheduleStartDate) setScheduleStartDate(dateStr);
                        if (!scheduleEndDate) {
                          const endDate = new Date();
                          endDate.setDate(endDate.getDate() + 7);
                          setScheduleEndDate(endDate.toISOString().split("T")[0]);
                        }
                      }}
                    >
                      <Calendar size={18} />
                      Schedule for Later
                    </button>
                  </div>

                  {/* Schedule for Later - Expanded options */}
                  {isScheduled && (
                    <div className="schedule-later-panel">
                      {/* Scheduling Type: Manual Select vs Auto (Evenly) */}
                      <div className="schedule-type-section">
                        <label className="schedule-sub-label">Scheduling Type</label>
                        <div className="schedule-type-options">
                          <label className={`schedule-type-option ${scheduleType === 'manual' ? 'active' : ''}`}>
                            <input
                              type="radio"
                              name="scheduleType"
                              value="manual"
                              checked={scheduleType === 'manual'}
                              onChange={() => {
                                setScheduleType('manual');
                                if (!scheduleEndDate && postData.scheduledDate) setScheduleEndDate(toDateOnlyString(postData.scheduledDate));
                                if (!postData.scheduledTime) {
                                  const fiveMin = new Date();
                                  fiveMin.setMinutes(fiveMin.getMinutes() + 5);
                                  setPostData(prev => ({
                                    ...prev,
                                    scheduledTime: preferredTime === 'custom' ? `${String(customTimeHours).padStart(2, '0')}:${String(customTimeMinutes).padStart(2, '0')}:${String(customTimeSeconds).padStart(2, '0')}` : (prev.scheduledTime || `${fiveMin.getHours().toString().padStart(2, '0')}:${fiveMin.getMinutes().toString().padStart(2, '0')}`)
                                  }));
                                }
                              }}
                            />
                            <span className="schedule-type-radio"></span>
                            <div className="schedule-type-content">
                              <Sparkles size={16} className="schedule-type-icon" />
                              <div>
                                <span className="schedule-type-label">Manual Select</span>
                                <span className="schedule-type-desc">Festival posts, specific dates</span>
                              </div>
                            </div>
                          </label>
                          <label className={`schedule-type-option ${scheduleType === 'auto' ? 'active' : ''}`}>
                            <input
                              type="radio"
                              name="scheduleType"
                              value="auto"
                              checked={scheduleType === 'auto'}
                              onChange={() => {
                                setScheduleType('auto');
                                setPostData(prev => ({ ...prev, scheduledTime: preferredTime === 'custom' ? `${String(customTimeHours).padStart(2, '0')}:${String(customTimeMinutes).padStart(2, '0')}:${String(customTimeSeconds).padStart(2, '0')}` : preferredTime }));
                              }}
                            />
                            <span className="schedule-type-radio"></span>
                            <div className="schedule-type-content">
                              <Sparkles size={16} className="schedule-type-icon" />
                              <div>
                                <span className="schedule-type-label">Auto (Evenly)</span>
                                <span className="schedule-type-desc">Distribute posts automatically</span>
                              </div>
                            </div>
                          </label>
                        </div>
                      </div>

                      {/* Posting Frequency - 2x2 grid (Auto mode only) */}
                      {scheduleType === 'auto' && (
                        <div className="posting-frequency-section">
                          <label className="schedule-sub-label">Posting Frequency</label>
                          <div className="posting-frequency-grid">
                            {[
                              { id: 'daily', label: 'Daily', desc: '1 post per day' },
                              { id: 'weekly', label: 'Weekly', desc: '1 post per week' },
                              { id: '2perweek', label: '2 per Week', desc: '2 posts per week' },
                              { id: 'weekend', label: 'Weekend Only', desc: 'Saturday & Sunday' }
                            ].map((opt) => (
                              <button
                                key={opt.id}
                                type="button"
                                className={`posting-frequency-card ${postingFrequency === opt.id ? 'active' : ''}`}
                                onClick={() => {
                                  setPostingFrequency(opt.id);
                                  if (opt.id === '2perweek') {
                                    setTimeout(() => {
                                      const el = document.getElementById('two-per-week-section');
                                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                    }, 150);
                                  }
                                }}
                              >
                                <span className="freq-label">{opt.label}</span>
                                <span className="freq-desc">{opt.desc}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Start Date & End Date - show for Manual, Daily, Weekly, Weekend. Not for 2perweek (has its own UI). */}
                      {((scheduleType === 'manual') || (scheduleType === 'auto' && postingFrequency)) && postingFrequency !== '2perweek' && (
                        <>
                      <div className={`schedule-dates-row ${scheduleType === 'auto' && (postingFrequency === 'daily' || postingFrequency === 'weekly') ? 'schedule-dates-row-single' : ''}`}>
                        <div className="schedule-date-group">
                          <label className="schedule-sub-label">Start Date</label>
                          <input
                            type="date"
                            value={scheduleType === 'auto' ? scheduleStartDate : toDateOnlyString(postData.scheduledDate)}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (scheduleType === 'auto') setScheduleStartDate(val);
                              setPostData(prev => ({ ...prev, scheduledDate: val }));
                            }}
                            className="form-input schedule-date-input"
                            min={new Date().toISOString().split("T")[0]}
                            placeholder="Pick date"
                            required={isScheduled}
                          />
                        </div>
                        {!(scheduleType === 'auto' && (postingFrequency === 'daily' || postingFrequency === 'weekly')) && (
                        <div className="schedule-date-group">
                          <label className="schedule-sub-label">End Date</label>
                          <input
                            type="date"
                            value={scheduleType === 'auto' ? scheduleEndDate : (scheduleEndDate || toDateOnlyString(postData.scheduledDate))}
                            onChange={(e) => setScheduleEndDate(e.target.value)}
                            className={`form-input schedule-date-input ${scheduleType === 'manual' ? 'schedule-end-date-manual' : ''}`}
                            min={toDateOnlyString(postData.scheduledDate) || scheduleStartDate || new Date().toISOString().split("T")[0]}
                            placeholder="Pick date"
                            required={isScheduled}
                          />
                        </div>
                        )}
                      </div>

                      {scheduleType === 'auto' && postingFrequency === 'daily' && scheduleStartDate && (
                        <p className="daily-start-date-text">
                          Starting Date is {new Date(scheduleStartDate + 'T12:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} and will post daily until content count finish.
                        </p>
                      )}

                      {scheduleType === 'auto' && postingFrequency === 'weekly' && scheduleStartDate && (() => {
                        const selectedDate = new Date(scheduleStartDate + 'T12:00:00');
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        selectedDate.setHours(0, 0, 0, 0);
                        // If selected date is today or in the past, show next week's same day; otherwise show selected date
                        const nextPostDate = selectedDate <= today
                          ? new Date(selectedDate.getTime() + 7 * 24 * 60 * 60 * 1000)
                          : selectedDate;
                        const dateStr = nextPostDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
                        const dayStr = nextPostDate.toLocaleDateString('en-US', { weekday: 'long' });
                        return (
                          <p className="daily-start-date-text weekly-next-post-text">
                            Next Post is schedule on {dateStr} ({dayStr})
                          </p>
                        );
                      })()}

                      {/* 2 per Week: Start Date + select 2 days (Mon–Sun); no End Date. Next post = first of those days from start date. */}
                      {scheduleType === 'auto' && postingFrequency === '2perweek' && (
                        <div id="two-per-week-section" className="two-per-week-section">
                          <div className="schedule-date-group">
                            <label className="schedule-sub-label">Start Date</label>
                            <input
                              type="date"
                              value={scheduleStartDate}
                              onChange={(e) => {
                                const val = e.target.value;
                                setScheduleStartDate(val);
                                setPostData(prev => ({ ...prev, scheduledDate: val }));
                              }}
                              className="form-input schedule-date-input"
                              min={new Date().toISOString().split("T")[0]}
                              placeholder="Pick date"
                              required={isScheduled}
                            />
                          </div>
                          <label className="schedule-sub-label">Select 2 days (posts will go on these days each week)</label>
                          <div className="weekday-buttons-row">
                            {[
                              { label: 'Mon', getDay: 1 },
                              { label: 'Tue', getDay: 2 },
                              { label: 'Wed', getDay: 3 },
                              { label: 'Thu', getDay: 4 },
                              { label: 'Fri', getDay: 5 },
                              { label: 'Sat', getDay: 6 },
                              { label: 'Sun', getDay: 0 }
                            ].map(({ label, getDay }) => {
                              const isSelected = selectedDays2PerWeek.includes(getDay);
                              const disabled = selectedDays2PerWeek.length >= 2 && !isSelected;
                              return (
                                <button
                                  key={getDay}
                                  type="button"
                                  className={`weekday-btn ${isSelected ? 'active' : ''}`}
                                  disabled={disabled}
                                  onClick={() => {
                                    if (isSelected) {
                                      setSelectedDays2PerWeek(prev => prev.filter(d => d !== getDay));
                                    } else if (selectedDays2PerWeek.length < 2) {
                                      setSelectedDays2PerWeek(prev => [...prev, getDay].sort((a, b) => a - b));
                                    }
                                  }}
                                >
                                  {label}
                                </button>
                              );
                            })}
                          </div>
                          {scheduleStartDate && selectedDays2PerWeek.length === 2 && (() => {
                            const start = new Date(scheduleStartDate + 'T12:00:00');
                            start.setHours(0, 0, 0, 0);
                            const [d1, d2] = selectedDays2PerWeek;
                            let next = new Date(start);
                            for (let i = 0; i <= 7; i++) {
                              const d = new Date(start);
                              d.setDate(d.getDate() + i);
                              if (d.getDay() === d1 || d.getDay() === d2) {
                                next = d;
                                break;
                              }
                            }
                            const dateStr = next.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
                            const dayStr = next.toLocaleDateString('en-US', { weekday: 'long' });
                            return (
                              <p className="daily-start-date-text weekly-next-post-text">
                                Next post on {dateStr} ({dayStr})
                              </p>
                            );
                          })()}
                        </div>
                      )}

                      {/* Preferred Time - dropdown for both Manual and Auto */}
                      <div className="preferred-time-section">
                        <label className="schedule-sub-label">Preferred Time</label>
                        <div className="preferred-time-select-wrapper">
                          <select
                            value={preferredTime}
                            onChange={(e) => {
                              const val = e.target.value;
                              setPreferredTime(val);
                              if (val === 'custom') {
                                const customStr = `${String(customTimeHours).padStart(2, '0')}:${String(customTimeMinutes).padStart(2, '0')}:${String(customTimeSeconds).padStart(2, '0')}`;
                                setPostData(prev => ({ ...prev, scheduledTime: customStr }));
                              } else {
                                setPostData(prev => ({ ...prev, scheduledTime: val }));
                              }
                            }}
                            className="form-input preferred-time-select"
                          >
                            <option value="custom">Custom Time</option>
                            <option value="09:00">9:00 AM</option>
                            <option value="12:00">12:00 PM</option>
                            <option value="15:00">3:00 PM</option>
                            <option value="18:00">6:00 PM</option>
                            <option value="21:00">9:00 PM</option>
                          </select>
                          <ChevronDown size={18} className="preferred-time-chevron" />
                        </div>
                        {preferredTime === 'custom' && (
                          <div className="custom-time-row">
                            <div className="custom-time-group">
                              <label className="schedule-sub-label">Hours</label>
                              <select
                                value={customTimeHours}
                                onChange={(e) => {
                                  const h = parseInt(e.target.value, 10);
                                  setCustomTimeHours(h);
                                  setPostData(prev => ({ ...prev, scheduledTime: `${String(h).padStart(2, '0')}:${String(customTimeMinutes).padStart(2, '0')}:${String(customTimeSeconds).padStart(2, '0')}` }));
                                }}
                                className="form-input preferred-time-select custom-time-select"
                              >
                                {Array.from({ length: 24 }, (_, i) => (
                                  <option key={i} value={i}>{String(i).padStart(2, '0')}</option>
                                ))}
                              </select>
                            </div>
                            <div className="custom-time-group">
                              <label className="schedule-sub-label">Minutes</label>
                              <select
                                value={customTimeMinutes}
                                onChange={(e) => {
                                  const m = parseInt(e.target.value, 10);
                                  setCustomTimeMinutes(m);
                                  setPostData(prev => ({ ...prev, scheduledTime: `${String(customTimeHours).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(customTimeSeconds).padStart(2, '0')}` }));
                                }}
                                className="form-input preferred-time-select custom-time-select"
                              >
                                {Array.from({ length: 60 }, (_, i) => (
                                  <option key={i} value={i}>{String(i).padStart(2, '0')}</option>
                                ))}
                              </select>
                            </div>
                            <div className="custom-time-group">
                              <label className="schedule-sub-label">Seconds</label>
                              <select
                                value={customTimeSeconds}
                                onChange={(e) => {
                                  const s = parseInt(e.target.value, 10);
                                  setCustomTimeSeconds(s);
                                  setPostData(prev => ({ ...prev, scheduledTime: `${String(customTimeHours).padStart(2, '0')}:${String(customTimeMinutes).padStart(2, '0')}:${String(s).padStart(2, '0')}` }));
                                }}
                                className="form-input preferred-time-select custom-time-select"
                              >
                                {Array.from({ length: 60 }, (_, i) => (
                                  <option key={i} value={i}>{String(i).padStart(2, '0')}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        )}
                      </div>
                        </>
                      )}

                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {activeTab === 'preview' && (
            <div className="preview-tab">
              <div className="preview-content">
                <h3>Post Preview</h3>
                <div className="preview-platforms-grid">
                  {(postData.platforms.length > 0 ? postData.platforms : ['instagram']).map(platformId => {
                    const platform = platforms.find(p => p.id === platformId) || {
                      id: platformId,
                      name: platformId.charAt(0).toUpperCase() + platformId.slice(1),
                      icon: Image,
                      color: '#6b7280'
                    };
                    const Icon = platform.icon;

                    return (
                      <div key={platformId} className={`platform-preview ${platformId}`} style={{ '--platform-color': platform.color }}>
                        <div className="platform-header">
                          <Icon size={20} />
                          <span>{platform.name}</span>
                        </div>
                        <div className="preview-post">
                          {postData?.images && postData.images.length > 0 && postData.images.some(img => img && (img.url || img.displayUrl)) && (
                            <div
                              className={`preview-images ${platformId === 'youtube' ? 'youtube-video' :
                                postData.images.length === 1 ? 'single-image' :
                                  postData.images.length === 2 ? 'two-images' :
                                    postData.images.length === 3 ? 'three-images' :
                                      postData.images.length === 4 ? 'four-images' : ''
                                }`}
                            >
                              {/* YouTube: show first video, or first image if no video */}
                              {platformId === 'youtube' ? (
                                (() => {
                                  const videoItems = (postData.images || [])
                                    .filter(img => img.fileType === 'video' || img.url?.includes('video') || img.url?.includes('.mp4') || img.url?.includes('.mov'));
                                  const mediaToShow = videoItems.length > 0 ? videoItems[0] : postData.images[0];
                                  const ytDisplayUrl = getDisplayUrl(mediaToShow) || mediaToShow.url;
                                  if (!mediaToShow || !ytDisplayUrl) return null;
                                  
                                  let imageUrl = ytDisplayUrl;
                                  if (!imageUrl.startsWith('http') && !imageUrl.startsWith('blob:') && !imageUrl.startsWith('data:')) {
                                    console.error('Invalid YouTube media URL:', imageUrl);
                                    return null;
                                  }
                                  
                                  const isVideo = mediaToShow.fileType === 'video' || imageUrl?.includes('video') || imageUrl?.includes('.mp4') || imageUrl?.includes('.mov');
                                  return (
                                    <div key="yt-preview" className="youtube-preview-container">
                                      {isVideo ? (
                                        <video
                                          src={imageUrl}
                                          className="preview-video youtube-preview"
                                          controls
                                          muted
                                          playsInline
                                          onError={(e) => { console.error('Preview video failed to load:', imageUrl); e.target.style.display = 'none'; }}
                                        />
                                      ) : (
                                        <img
                                          src={imageUrl}
                                          alt={mediaToShow.altText || 'Post preview'}
                                          className="preview-image"
                                          onError={(e) => { console.error('Preview image failed to load:', imageUrl); e.target.style.display = 'none'; }}
                                        />
                                      )}
                                    </div>
                                  );
                                })()
                              ) : (
                                <div className="carousel-container">
                                  {/* nav buttons */}
                                  {postData.images.length > 1 && (
                                    <div className="carousel-navigation">
                                      <button
                                        type="button"
                                        className="nav-btn nav-prev arrow-btnx"
                                        onClick={() => setImgIndex(prev => Math.max(0, prev - 1))}
                                        disabled={imgIndex === 0}
                                      >
                                        <ChevronLeftCircle size={24} />
                                      </button>
                                      <button
                                        type="button"
                                        className="nav-btn nav-next arrow-btnx"
                                        onClick={() => setImgIndex(prev => Math.min(postData.images.length - 1, prev + 1))}
                                        disabled={imgIndex === postData.images.length - 1}
                                      >
                                        <ChevronRightCircle size={24} />
                                      </button>
                                    </div>
                                  )}

                                  {/* current media */}
                                  {(() => {
                                    const media = postData.images[imgIndex];
                                    if (!media) return null;
                                    
                                    let imageUrl = getDisplayUrl(media) || media.url || media.secure_url;
                                    
                                    // If URL is just a filename (no http/https/blob), it's invalid
                                    if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('blob:') && !imageUrl.startsWith('data:')) {
                                      console.error('Invalid image URL (filename only):', imageUrl);
                                      return (
                                        <div className="preview-image-error">
                                          <p>Image URL not available</p>
                                          <small>{media.filename || media.originalName || 'Unknown file'}</small>
                                        </div>
                                      );
                                    }
                                    
                                    if (!imageUrl) {
                                      const firstMedia = postData.images[0];
                                      if (!firstMedia) return null;
                                      imageUrl = getDisplayUrl(firstMedia) || firstMedia.url;
                                      if (!imageUrl) return null;
                                    }
                                    
                                    const isVideo = media.fileType === 'video' ||
                                      imageUrl?.includes('video') ||
                                      imageUrl?.includes('.mp4') ||
                                      imageUrl?.includes('.mov') ||
                                      imageUrl?.includes('.avi');

                                    return isVideo ? (
                                      <video
                                        key={`preview-${imgIndex}-${imageUrl}`}
                                        src={imageUrl}
                                        className="preview-video"
                                        controls
                                        muted
                                        playsInline
                                        onError={(e) => { 
                                          console.error('Preview video failed to load:', imageUrl, media);
                                          e.target.style.display = 'none';
                                        }}
                                      />
                                    ) : (
                                      <img
                                        key={`preview-${imgIndex}-${imageUrl}`}
                                        src={imageUrl}
                                        alt={media.altText || media.originalName || 'Post preview'}
                                        className="preview-image"
                                        onError={(e) => { 
                                          console.error('Preview image failed to load:', imageUrl, media);
                                          e.target.style.display = 'none';
                                        }}
                                      />
                                    );
                                  })()}

                                  {/* counter */}
                                  {postData.images.length > 1 && (
                                    <div className="image-counter">
                                      {imgIndex + 1} / {postData.images.length}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          <div className={`preview-text ${platformId === 'youtube' ? 'youtube-description' : ''}`}>
                            <p>{postData.content}</p>
                            {postData.hashtags && (
                              <div className="preview-hashtags">
                                {(typeof postData.hashtags === 'string' ?
                                  postData.hashtags.split(' ') :
                                  Array.isArray(postData.hashtags) ? postData.hashtags : []
                                )
                                  .filter(tag => tag.startsWith('#'))
                                  .map((tag, index) => (
                                    <span key={index} className="hashtag">{tag}</span>
                                  ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>

            <div className="footer-actions">
              {/* Publish / Schedule Button Footer */}
              <button
                type="submit"
                className="btn-primary scpst"
                disabled={
                  !postData.content.trim() ||
                  postData.platforms.length === 0 ||
                  charCount.remaining < 0 ||
                  isSubmitting
                }
              >
                {isSubmitting ? (
                  <>
                    {isScheduled ? 'Scheduling...' : 'Publishing...'}
                  </>
                ) : isScheduled ? (
                  <>
                    <Calendar size={16} />
                    Schedule Post
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Publish Now
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Toast Notification */}
        {toast && (
          <div className={`toast toast-${toast.type}`}>
            <div className="toast-icon">
              {toast.type === 'success' && <CheckCircle size={20} />}
              {toast.type === 'error' && <AlertCircle size={20} />}
              {toast.type === 'warning' && <AlertCircle size={20} />}
              {toast.type === 'info' && <Info size={20} />}
            </div>
            <span className="toast-message">{toast.message}</span>
          </div>
        )}
      </div>

      <MediaLibraryModal
        isOpen={showMediaLibrary}
        onClose={() => setShowMediaLibrary(false)}
        onSelectImages={handleImportFromLibrary}
      />
    </div>
    </>
  );
};

// ✅ MOVED MediaLibraryModal OUTSIDE CreatePost Component
const MediaLibraryModal = ({ isOpen, onClose, onSelectImages }) => {
  const [mediaList, setMediaList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showLibraryCarousel, setShowLibraryCarousel] = useState(false);
  const [libraryCarouselIndex, setLibraryCarouselIndex] = useState(0);

  // Fetch media when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchMediaLibrary();
    }
  }, [isOpen]);

  const fetchMediaLibrary = async () => {
    setLoading(true);
    try {
      const response = await apiClient.request('/api/media');
      const media = response?.data?.data?.media || response?.data?.media || [];

      // Filter both images and videos
      const mediaFiles = media.filter(item =>
        (item.fileType?.startsWith('image') || item.fileType?.startsWith('video')) && item.url
      );

      setMediaList(mediaFiles);
    } catch (error) {
      console.error('Failed to fetch media library:', error);
      setMediaList([]);
    } finally {
      setLoading(false);
    }
  };

  const handleImageToggle = (image) => {
    setSelectedImages(prev => {
      const imageId = image._id || image.id;
      const isSelected = prev.some(img => (img._id || img.id) === imageId);

      if (isSelected) {
        return prev.filter(img => (img._id || img.id) !== imageId);
      } else {
        return [...prev, {
          url: image.url,
          altText: image.altText || image.originalName || image.filename,
          publicId: image.publicId,
          _id: imageId,
          filename: image.originalName || image.filename,
          fileType: image.fileType,
          size: image.size,
          dimensions: image.dimensions
        }];
      }
    });
  };

  const handleSelectImages = () => {
    onSelectImages(selectedImages);
    onClose();
    setSelectedImages([]);
  };

  const handleClose = () => {
    setSelectedImages([]);
    setShowLibraryCarousel(false);
    setLibraryCarouselIndex(0);
    onClose();
  };

  const filteredMedia = mediaList.filter(item => {
    const searchTerm = searchQuery.toLowerCase();
    return (
      item.filename?.toLowerCase().includes(searchTerm) ||
      item.originalName?.toLowerCase().includes(searchTerm) ||
      item.altText?.toLowerCase().includes(searchTerm)
    );
  });

  const openLibraryCarousel = (index) => {
    if (filteredMedia.length === 0) return;
    const safeIndex = Math.max(0, Math.min(index, filteredMedia.length - 1));
    setLibraryCarouselIndex(safeIndex);
    setShowLibraryCarousel(true);
  };

  const closeLibraryCarousel = () => {
    setShowLibraryCarousel(false);
    setLibraryCarouselIndex(0);
  };

  // Keyboard navigation for library carousel
  useEffect(() => {
    if (!showLibraryCarousel || filteredMedia.length <= 1) return;

    const handleKeyDown = (e) => {
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          setLibraryCarouselIndex(prev =>
            prev === 0 ? filteredMedia.length - 1 : prev - 1
          );
          break;
        case 'ArrowRight':
          e.preventDefault();
          setLibraryCarouselIndex(prev =>
            prev === filteredMedia.length - 1 ? 0 : prev + 1
          );
          break;
        case 'Escape':
          e.preventDefault();
          closeLibraryCarousel();
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (filteredMedia[libraryCarouselIndex]) {
            handleImageToggle(filteredMedia[libraryCarouselIndex]);
            closeLibraryCarousel();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showLibraryCarousel, filteredMedia.length, libraryCarouselIndex]);

  if (!isOpen) return null;

  return (
    <>
      {/* Library Carousel - Separate overlay */}
      {showLibraryCarousel && (
        <div
          className="library-carousel-overlay"
          onClick={closeLibraryCarousel}
        >
          <div
            className="library-carousel-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="carousel-header">
              <div className="carousel-counter">
                {libraryCarouselIndex + 1} of {filteredMedia.length}
              </div>
              <button
                className="carousel-close-btn"
                onClick={closeLibraryCarousel}
              >
                <X size={20} />
              </button>
            </div>

            <div className="carousel-content">
              {filteredMedia.length > 1 && (
                <button
                  className="carousel-nav carousel-nav-prev"
                  onClick={() => setLibraryCarouselIndex(prev =>
                    prev === 0 ? filteredMedia.length - 1 : prev - 1
                  )}
                >
                  <ChevronLeft size={24} />
                </button>
              )}

              <div className="carousel-main">
                {filteredMedia.map((mediaItem, index) => {
                  const isVideo = mediaItem.fileType?.startsWith('video');
                  const displayName = mediaItem.originalName || mediaItem.filename;

                  return (
                    <div
                      key={index}
                      className={`carousel-slide ${index === libraryCarouselIndex ? 'active' : ''}`}
                    >
                      {isVideo ? (
                        <video
                          src={getDisplayUrl(mediaItem)}
                          controls
                          className="carousel-media"
                        />
                      ) : (
                        <img
                          src={getDisplayUrl(mediaItem)}
                          alt={mediaItem.altText || displayName}
                          className="carousel-media"
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {filteredMedia.length > 1 && (
                <button
                  className="carousel-nav carousel-nav-next"
                  onClick={() => setLibraryCarouselIndex(prev =>
                    prev === filteredMedia.length - 1 ? 0 : prev + 1
                  )}
                >
                  <ChevronRight size={24} />
                </button>
              )}
            </div>

            <div className="carousel-actions">
              <button
                className="carousel-action-btn select-btn"
                onClick={() => {
                  const currentMedia = filteredMedia[libraryCarouselIndex];
                  if (currentMedia) {
                    handleImageToggle(currentMedia);
                    closeLibraryCarousel();
                  }
                }}
                disabled={!filteredMedia[libraryCarouselIndex]}
              >
                {filteredMedia[libraryCarouselIndex] && selectedImages.some(img => (img._id || img.id) === (filteredMedia[libraryCarouselIndex]._id || filteredMedia[libraryCarouselIndex].id))
                  ? 'Remove from Selection'
                  : 'Add to Selection'
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Media Library Modal */}
      {!showLibraryCarousel && (
        <div className="media-library-modal-overlay" onClick={handleClose}>
          <div className="media-library-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Select Media from Library</h3>
              <button className="modal-close" onClick={handleClose}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              {/* Search Bar */}
              <div className="media-search-bar">
                <Search size={16} />
                <input
                  type="text"
                  placeholder="Search media..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Selected Images Counter */}
              {selectedImages.length > 0 && (
                <div className="selected-counter">
                  {selectedImages.length} item{selectedImages.length > 1 ? 's' : ''} selected
                </div>
              )}

              {/* Media Grid */}
              <div className="media-library-grid">
                {loading ? (
                  <div className="loading-media">
                    <Loader />
                    <span>Loading media library...</span>
                  </div>
                ) : filteredMedia.length === 0 ? (
                  <div className="no-media">
                    <Image size={48} />
                    <h4>No media found</h4>
                    <p>
                      {searchQuery
                        ? `No media matches "${searchQuery}"`
                        : "Upload some media to your library first"
                      }
                    </p>
                  </div>
                ) : (
                  filteredMedia.map((media, index) => {
                    const mediaId = media._id || media.id;
                    const isSelected = selectedImages.some(img => (img._id || img.id) === mediaId);
                    const displayName = media.originalName || media.filename;
                    const isVideo = media.fileType?.startsWith('video');

                    return (
                      <div
                        key={mediaId}
                        className={`media-library-item ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleImageToggle(media)}
                      >
                        <div className="media-thumbnail">
                          {isVideo ? (
                            <div className="video-thumbnail">
                              <video src={getDisplayUrl(media)} muted />
                              <div className="video-indicator">
                                <Play size={16} />
                              </div>
                            </div>
                          ) : (
                            <img
                              src={getDisplayUrl(media)}
                              alt={media.altText || displayName}
                              loading="lazy"
                            />
                          )}

                          <div className="thumbnail-overlay">
                            <button
                              className={`media-action-btn select-btn ${isSelected ? 'selected' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleImageToggle(media);
                              }}
                              title={isSelected ? 'Remove from selection' : 'Add to selection'}
                            >
                              {isSelected ? <X size={14} /> : <Check size={14} />}
                            </button>
                          </div>
                        </div>

                        <div className="media-info">
                          <span className="media-filename" title={displayName}>
                            {displayName?.length > 25
                              ? `${displayName.substring(0, 25)}...`
                              : displayName || 'Untitled'
                            }
                          </span>
                          <div className="media-metadata">
                            <span className="media-size">
                              {media.humanSize || `${Math.round(media.size / 1024)}KB`}
                            </span>
                            {media.dimensions && (
                              <span className="media-dimensions">
                                {media.dimensions.width} × {media.dimensions.height}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="media-actions">
                          <button
                            className="media-action-btn view-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              openLibraryCarousel(index);
                            }}
                            title="View in carousel"
                          >
                            <Eye size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={handleClose}>
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleSelectImages}
                disabled={selectedImages.length === 0}
              >
                Add {selectedImages.length} Item{selectedImages.length !== 1 ? 's' : ''} to Post
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CreatePost;