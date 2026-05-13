/**
 * Video Flow - Popup Script
 * Handles UI interactions and synchronization with content scripts.
 */

document.addEventListener('DOMContentLoaded', () => {
    const colorInput = document.getElementById('barColor');
    const colorHex = document.getElementById('colorHex');
    const heightInput = document.getElementById('barHeight');
    const heightValue = document.getElementById('heightValue');
    const saveBtn = document.getElementById('saveBtn');
    const presetBtns = document.querySelectorAll('.preset-btn');

    // Load saved settings
    chrome.storage.sync.get(['color', 'height'], (data) => {
        if (data.color) {
            colorInput.value = data.color;
            colorHex.textContent = data.color.toUpperCase();
        }
        if (data.height) {
            heightInput.value = data.height;
            heightValue.textContent = data.height;
        }
    });

    // Handle Color Change
    colorInput.addEventListener('input', (e) => {
        const color = e.target.value;
        colorHex.textContent = color.toUpperCase();
        updateLivePreview(color, heightInput.value);
    });

    // Handle Height Change
    heightInput.addEventListener('input', (e) => {
        const height = e.target.value;
        heightValue.textContent = height;
        updateLivePreview(colorInput.value, height);
    });

    // Handle Presets
    presetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const color = btn.getAttribute('data-color');
            const height = btn.getAttribute('data-height');
            
            colorInput.value = color;
            colorHex.textContent = color.toUpperCase();
            heightInput.value = height;
            heightValue.textContent = height;

            updateLivePreview(color, height);
        });
    });

    // Save Settings
    saveBtn.addEventListener('click', () => {
        const color = colorInput.value;
        const height = heightInput.value;

        chrome.storage.sync.set({ color, height }, () => {
            saveBtn.textContent = 'Settings Saved!';
            saveBtn.style.background = 'linear-gradient(90deg, #00FF85, #00F2FF)';
            
            setTimeout(() => {
                saveBtn.textContent = 'Save Settings';
                saveBtn.style.background = 'linear-gradient(90deg, #7000FF, #00F2FF)';
            }, 2000);
        });
    });

    /**
     * Sends a message to the active tab to update styles in real-time
     */
    function updateLivePreview(color, height) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    type: 'UPDATE_STYLES',
                    color: color,
                    height: height
                });
            }
        });
    }
});
