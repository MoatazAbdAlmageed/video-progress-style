/**
 * Video Flow - Content Script
 * Handles injection and real-time updates of the progress UI.
 */

(function() {
    let activeVideo = null;
    let uiInjected = false;
    let container = null;
    let progressBar = null;
    let ringProgress = null;
    let percentageText = null;

    const CIRCUMFERENCE = 2 * Math.PI * 28;

    /**
     * Injects the UI elements and positions them
     */
    function injectUI(videoElement) {
        if (!videoElement) return;

        // Attach to the right element (Fullscreen or Body)
        // If the video is fullscreen, we MUST attach to it or its parent to be visible
        const fsElement = document.fullscreenElement || document.webkitFullscreenElement;
        const target = fsElement || document.body;

        if (!container) {
            container = document.createElement('div');
            container.id = 'vf-container';
            container.className = 'vf-animate-in';
            container.style.zIndex = '2147483647';
            container.style.pointerEvents = 'none';

            container.innerHTML = `
                <div class="vf-progress-bar-container">
                    <div class="vf-progress-fill"></div>
                </div>
                <div class="vf-circular-indicator">
                    <svg class="vf-circular-svg" width="60" height="60">
                        <circle class="vf-ring-bg" cx="30" cy="30" r="28"></circle>
                        <circle class="vf-ring-progress" cx="30" cy="30" r="28"></circle>
                    </svg>
                    <span class="vf-percentage-text">0%</span>
                </div>
            `;
            
            progressBar = container.querySelector('.vf-progress-fill');
            ringProgress = container.querySelector('.vf-ring-progress');
            percentageText = container.querySelector('.vf-percentage-text');
        }

        // If the target is the video itself (invalid for appending), use its parent
        const actualTarget = (target.tagName === 'VIDEO') ? target.parentElement : target;
        
        if (container.parentElement !== actualTarget) {
            actualTarget.appendChild(container);
            // Ensure target is relative if we are using absolute positioning
            if (actualTarget !== document.body && window.getComputedStyle(actualTarget).position === 'static') {
                actualTarget.style.position = 'relative';
            }
        }

        uiInjected = true;
        updateUIPosition();
        
        window.removeEventListener('resize', updateUIPosition);
        window.removeEventListener('scroll', updateUIPosition, true);
        window.addEventListener('resize', updateUIPosition);
        window.addEventListener('scroll', updateUIPosition, true);
    }

    /**
     * Updates the position of the overlay
     */
    function updateUIPosition() {
        if (!activeVideo || !container || !container.parentElement) return;

        const isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement);
        const rect = activeVideo.getBoundingClientRect();
        const parentRect = container.parentElement.getBoundingClientRect();

        if (isFullscreen && container.parentElement !== document.body) {
            // Use absolute positioning relative to the container
            container.style.position = 'absolute';
            container.style.top = `${rect.top - parentRect.top}px`;
            container.style.left = `${rect.left - parentRect.left}px`;
        } else {
            // Use fixed positioning relative to viewport
            container.style.position = 'fixed';
            container.style.top = `${rect.top}px`;
            container.style.left = `${rect.left}px`;
        }

        container.style.width = `${rect.width}px`;
        container.style.height = `${rect.height}px`;

        if (rect.width === 0 || rect.height === 0) {
            container.style.display = 'none';
        } else {
            container.style.display = 'block';
        }
    }

    /**
     * Handles Fullscreen changes
     */
    function handleFullscreenChange() {
        // Force re-injection to ensure we are in the FS stack
        if (activeVideo) {
            uiInjected = false;
            injectUI(activeVideo);
        }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    /**
     * Updates the progress UI
     */
    function updateProgress() {
        if (!activeVideo) return;
        if (!uiInjected) injectUI(activeVideo);

        updateUIPosition();

        const progress = (activeVideo.currentTime / activeVideo.duration) * 100;
        const roundedProgress = Math.round(progress) || 0;

        if (progressBar) progressBar.style.width = `${progress}%`;
        if (ringProgress) {
            const offset = CIRCUMFERENCE - (progress / 100) * CIRCUMFERENCE;
            ringProgress.style.strokeDashoffset = offset;
        }
        if (percentageText) percentageText.textContent = `${roundedProgress}%`;
    }

    /**
     * Scans for video elements
     */
    function findVideo() {
        const videos = document.getElementsByTagName('video');
        if (videos.length > 0 && videos[0] !== activeVideo) {
            if (activeVideo) {
                activeVideo.removeEventListener('timeupdate', updateProgress);
            }
            activeVideo = videos[0];
            uiInjected = false; 
            injectUI(activeVideo);
            activeVideo.addEventListener('timeupdate', updateProgress);
        }
    }

    findVideo();
    setInterval(findVideo, 2000);

    // Listen for messages from the popup for real-time customization
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.type === 'UPDATE_STYLES') {
            const root = document.documentElement;
            if (request.color) root.style.setProperty('--vf-primary-color', request.color);
            if (request.height) root.style.setProperty('--vf-bar-height', `${request.height}px`);
        }
    });

    // Load initial preferences
    chrome.storage.sync.get(['color', 'height'], (data) => {
        const root = document.documentElement;
        if (data.color) root.style.setProperty('--vf-primary-color', data.color);
        if (data.height) root.style.setProperty('--vf-bar-height', `${data.height}px`);
    });

})();
