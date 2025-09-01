console.log('[DEBUG] notifications.js loading...');
class NotificationManager {
    constructor() {
        this.permission = 'default';
        this.toastContainer = null;
        this.init();
    }

    init() {
        this.toastContainer = document.getElementById('toastContainer');
        if (!this.toastContainer) {
            console.warn('Toast container not found, creating one');
            this.createToastContainer();
        }
        this.checkPermission();
    }
    
    createToastContainer() {
        const container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        container.style.cssText = `
            position: fixed;
            top: 1rem;
            right: 1rem;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
            pointer-events: none;
            max-height: calc(100vh - 2rem);
            overflow-y: auto;
        `;
        document.body.appendChild(container);
        this.toastContainer = container;
    }

    checkPermission() {
        this.permission = 'disabled';
    }

    async requestPermission() {
        let results = {
            notifications: 'disabled', // Push notifications disabled
            audio: 'granted'
        };
        
        try {
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    audio: { 
                        echoCancellation: false,
                        noiseSuppression: false,
                        autoGainControl: false,
                        sampleRate: 8000,
                        channelCount: 1
                    } 
                });
                
                stream.getTracks().forEach(track => track.stop());
                results.audio = 'granted';
                
                this.showToast('Audio feedback enabled for better notifications!', 'success');
                console.log('Audio permission granted successfully');
                
            } else {
                console.log('MediaDevices API not supported');
                results.audio = 'not-supported';
            }
        } catch (audioError) {
            console.log('Audio permission denied or not available:', audioError.message);
            results.audio = 'denied';
        }
        
        try {
            if (!this.audioContext && (window.AudioContext || window.webkitAudioContext)) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                
                if (this.audioContext.state === 'suspended') {
                    await this.audioContext.resume();
                }
                console.log('AudioContext initialized successfully');
            }
        } catch (contextError) {
            console.log('AudioContext initialization failed:', contextError.message);
        }
        
        return results;
    }

    showNotification(title, options = {}) {
        console.log('Showing toast notification:', title);
        
        this.showToast(title + (options.body ? ': ' + options.body : ''), options.toastType || 'info', options.toastDuration || 5000);
        
        
        return null;
    }



    showWelcomeNotification() {
        const title = 'Welcome to R-Service Tracker!';
        const options = {
            body: 'Setting up your daily work tracker... We\'re configuring notifications, initializing your dashboard, and preparing your work tracking system. You\'ll be ready to track your daily work and earnings in just a moment!',
            icon: location.origin + '/assets/favicon.ico',
            tag: 'welcome-setup',
            requireInteraction: true,
            vibrate: [200, 100, 200, 100, 200],
            actions: [
                {
                    action: 'get-started',
                    title: 'Get Started'
                },
                {
                    action: 'learn-more',
                    title: 'Learn More'
                }
            ]
        };

        this.showNotification(title, options);
        this.showToast('Welcome! Your work tracker is being set up...', 'success', 8000);
        
        console.log('Welcome notification shown for first-time user');
    }

    async checkAndRequestPermission() {
        if ('Notification' in window) {
            const permission = Notification.permission;
            console.log('Current notification permission:', permission);
            
            if (permission === 'default') {
                this.showToast('Enable notifications to get daily work reminders and payment alerts!', 'info', 6000);
                
                setTimeout(async () => {
                    try {
                        console.log('Requesting notification permission from browser...');
                        
                        const result = await Notification.requestPermission();
                        console.log('Permission request result:', result);
                        
                        this.permission = result;
                        
                        if (result === 'granted') {
                            this.showToast('Notifications enabled successfully!', 'success', 4000);
                            
                            const hasShownWelcome = localStorage.getItem('welcomeNotificationShown');
                            if (!hasShownWelcome) {
                                setTimeout(() => {
                                    this.showWelcomeNotification();
                                    localStorage.setItem('welcomeNotificationShown', 'true');
                                }, 2000); // Wait 2 seconds after permission granted
                            } else {
                                setTimeout(() => {
                                    this.showNotification('Daily Check-in', {
                                        body: 'Welcome back! Ready to track your work today? Don\'t forget to mark your tasks as completed.',
                                        tag: 'daily-checkin',
                                        icon: location.origin + '/assets/favicon.ico'
                                    });
                                }, 1500);
                            }
                        } else if (result === 'denied') {
                            this.showToast('Notifications were denied. You can enable them later in browser settings.', 'warning', 6000);
                        } else {
                            this.showToast('Notification permission was dismissed. You can enable them later.', 'info', 4000);
                        }
                    } catch (error) {
                        console.error('Error requesting notification permission:', error);
                        this.showToast('Error requesting notification permission', 'error', 4000);
                    }
                }, 3000); // Wait 3 seconds before showing permission request
                
            } else if (permission === 'denied') {
                const helpMessage = 'Notifications are blocked. To enable:\n' +
                                  '1. Click the 🔒 icon in your address bar\n' +
                                  '2. Set Notifications to "Allow"\n' +
                                  '3. Refresh the page';
                this.showToast(helpMessage.replace(/\n/g, ' '), 'warning', 10000);
                
                setTimeout(() => {
                    this.showToast('Click here for help enabling notifications', 'info', 8000);
                }, 2000);
                
            } else if (permission === 'granted') {
                console.log('Notifications already granted');
                this.permission = permission;
                
                const lastSessionDate = localStorage.getItem('lastSessionDate');
                const today = new Date().toISOString().split('T')[0];
                
                if (lastSessionDate !== today) {
                    localStorage.setItem('lastSessionDate', today);
                    setTimeout(() => {
                        this.showNotification('Daily Check-in', {
                            body: 'Welcome back! Ready to track your work today? Don\'t forget to mark your tasks as completed.',
                            tag: 'daily-checkin',
                            icon: location.origin + '/assets/favicon.ico'
                        });
                    }, 2000);
                }
            }
        } else {
            console.warn('Notifications not supported in this browser');
            this.showToast('Notifications are not supported in your browser', 'warning', 5000);
        }
    }

    showPaydayNotification() {
        const title = 'Payday Alert!';
        const options = {
            body: 'Today is your payday — you\'ve earned ₹100! Mark your payment to update your records.',
            icon: location.origin + '/assets/favicon.ico',
            tag: 'payday',
            requireInteraction: true,
            actions: [
                {
                    action: 'mark-paid',
                    title: 'Mark as Paid'
                },
                {
                    action: 'later',
                    title: 'Later'
                }
            ]
        };

        this.showNotification(title, options);
        this.showToast('Payday! You\'ve earned ₹100', 'success');
    }

    showWorkCompletedNotification() {
        const title = 'Work Marked Complete';
        const options = {
            body: `Great job! You've earned ₹${window.R_SERVICE_CONFIG?.DAILY_WAGE || window.R_SERVICE_CONFIG?.INCREMENT_VALUE || 25} today.`,
            icon: location.origin + '/assets/favicon.ico',
            tag: 'work-completed'
        };

        this.showNotification(title, options);
    }

    showPaymentNotification(amount) {
        const title = 'Payment Recorded';
        const options = {
            body: `Payment of ₹${amount} has been recorded successfully.`,
            icon: location.origin + '/assets/favicon.ico',
            tag: 'payment-recorded'
        };

        this.showNotification(title, options);
    }

    showStreakNotification(streak) {
        const title = 'Streak Achievement!';
        const options = {
            body: `Amazing! You've worked ${streak} days in a row. Keep it up!`,
            icon: location.origin + '/assets/favicon.ico',
            tag: 'streak-achievement'
        };

        this.showNotification(title, options);
    }

    showAdvancePaymentNotification() {
        const title = 'Advance Payment Reminder';
        const options = {
            body: 'You have advance payments that need to be worked off. Complete your remaining work days!',
            icon: location.origin + '/assets/favicon.ico',
            tag: 'advance-payment-reminder',
            requireInteraction: true,
            actions: [
                {
                    action: 'view-status',
                    title: 'View Status'
                },
                {
                    action: 'dismiss',
                    title: 'Dismiss'
                }
            ]
        };

        this.showNotification(title, options);
        this.showToast('Advance payment reminder: Complete your remaining work days!', 'warning', 6000);
    }

    showToast(message, type = 'info', duration = 5000) {
        if (!this.toastContainer) {
            console.warn('Toast container not found');
            return;
        }

        const toast = this.createToastElement(message, type);
        this.toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('show');
        }, 100);

        setTimeout(() => {
            this.removeToast(toast);
        }, duration);

        toast.addEventListener('click', () => {
            this.removeToast(toast);
        });

        return toast;
    }

    createToastElement(message, type) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const iconMap = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };

        toast.innerHTML = `
            <div class="toast-content">
                <div class="toast-icon">
                    <i class="${iconMap[type] || iconMap.info}"></i>
                </div>
                <div class="toast-message">${message}</div>
            </div>
        `;

        return toast;
    }

    removeToast(toast) {
        if (toast && toast.parentNode) {
            toast.style.animation = 'slideOutRight 0.3s ease-in-out';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }
    }

    clearAllToasts() {
        if (this.toastContainer) {
            const toasts = this.toastContainer.querySelectorAll('.toast');
            toasts.forEach(toast => this.removeToast(toast));
        }
    }

    showLoadingToast(message) {
        const toast = this.createLoadingToast(message);
        this.toastContainer.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);

        return toast;
    }

    createLoadingToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast loading';
        
        toast.innerHTML = `
            <div class="toast-content">
                <div class="toast-icon">
                    <div class="spinner" style="width: 20px; height: 20px; border-width: 2px;"></div>
                </div>
                <div class="toast-message">${message}</div>
            </div>
        `;

        return toast;
    }

    updateLoadingToast(toast, message, type = 'success') {
        if (toast && toast.parentNode) {
            toast.className = `toast ${type}`;
            
            const iconMap = {
                success: 'fas fa-check-circle',
                error: 'fas fa-exclamation-circle'
            };

            toast.innerHTML = `
                <div class="toast-content">
                    <div class="toast-icon">
                        <i class="${iconMap[type]}"></i>
                    </div>
                    <div class="toast-message">${message}</div>
                </div>
            `;

            setTimeout(() => {
                this.removeToast(toast);
            }, 3000);
        }
    }

    showConfirmation(message, onConfirm, onCancel) {
        const modal = document.getElementById('confirmModal');
        const messageEl = document.getElementById('confirmMessage');
        const yesBtn = document.getElementById('confirmYes');
        const noBtn = document.getElementById('confirmNo');
        const closeBtn = document.getElementById('closeConfirmModal');

        if (modal && messageEl && yesBtn && noBtn) {
            messageEl.textContent = message;
            modal.classList.add('show');

            const handleYes = () => {
                modal.classList.remove('show');
                if (onConfirm) onConfirm();
                cleanup();
            };

            const handleNo = () => {
                modal.classList.remove('show');
                if (onCancel) onCancel();
                cleanup();
            };

            const handleEscape = (e) => {
                if (e.key === 'Escape') {
                    handleNo();
                }
            };

            const cleanup = () => {
                yesBtn.removeEventListener('click', handleYes);
                noBtn.removeEventListener('click', handleNo);
                if (closeBtn) closeBtn.removeEventListener('click', handleNo);
                document.removeEventListener('keydown', handleEscape);
            };

            yesBtn.addEventListener('click', handleYes);
            noBtn.addEventListener('click', handleNo);
            if (closeBtn) closeBtn.addEventListener('click', handleNo);
            document.addEventListener('keydown', handleEscape);

            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    handleNo();
                }
            });
        }
    }

    playSound(soundType) {
        try {
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                
                if (this.audioContext.state === 'suspended') {
                    this.audioContext.resume().then(() => {
                        console.log('AudioContext resumed successfully');
                        this.playSoundType(soundType);
                    }).catch(error => {
                        console.warn('Could not resume audio context:', error);
                    });
                    return;
                }
            }

            this.playSoundType(soundType);
        } catch (error) {
            console.warn('Could not play sound:', error);
        }
    }
    
    playSoundType(soundType) {
        if (soundType === 'done') {
            // Enhanced work completion sound sequence with multiple layers
            this.playEnhancedSuccessSound(); 
            setTimeout(() => this.createWorkCompletionChime(), 300);
            setTimeout(() => this.createAchievementBells(), 600);
            setTimeout(() => this.createSuccessHarmony(), 900);
        } else if (soundType === 'paid') {
            // Enhanced ultra-realistic banking payment sound sequence with dynamic layers
            this.playEnhancedPaymentSequence();
        }
    }

    playEnhancedPaymentSequence() {
        try {
            // Simplified yet premium payment sound experience
            console.log('Playing improved payment sequence...');
            
            // Layer 1: Modern digital payment chime
            this.createModernPaymentChime();
            
            // Layer 2: Cash register ka-ching (classic satisfaction)
            setTimeout(() => this.createImprovedCashRegister(), 300);
            
            // Layer 3: Success confirmation harmony
            setTimeout(() => this.createSuccessConfirmation(), 600);
            
        } catch (error) {
            console.warn('Error playing enhanced payment sequence:', error);
            // Fallback to basic payment sound
            this.playSimplePaymentFallback();
        }
    }

    createAuthenticationBeeps() {
        try {
            if (!this.audioContext) return;
            
            const ctx = this.audioContext;
            const now = ctx.currentTime;
            
            // Create three quick authentication beeps
            for (let i = 0; i < 3; i++) {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                
                osc.connect(gain);
                gain.connect(ctx.destination);
                
                osc.frequency.setValueAtTime(800 + (i * 200), now + (i * 0.08));
                osc.type = 'sine';
                
                gain.gain.setValueAtTime(0, now + (i * 0.08));
                gain.gain.linearRampToValueAtTime(0.15, now + (i * 0.08) + 0.01);
                gain.gain.exponentialRampToValueAtTime(0.001, now + (i * 0.08) + 0.06);
                
                osc.start(now + (i * 0.08));
                osc.stop(now + (i * 0.08) + 0.06);
            }
            
        } catch (error) {
            console.warn('Error creating authentication beeps:', error);
        }
    }

    createProcessingConfirmation() {
        try {
            if (!this.audioContext) return;
            
            const ctx = this.audioContext;
            const now = ctx.currentTime;
            
            // Create a warm processing confirmation tone
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const filter = ctx.createBiquadFilter();
            
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);
            
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.exponentialRampToValueAtTime(660, now + 0.2);
            osc.type = 'triangle';
            
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(1200, now);
            filter.Q.setValueAtTime(5, now);
            
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.2, now + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
            
            osc.start(now);
            osc.stop(now + 0.25);
            
        } catch (error) {
            console.warn('Error creating processing confirmation:', error);
        }
    }

    createPaymentSuccessHarmony() {
        try {
            if (!this.audioContext) return;
            
            const ctx = this.audioContext;
            const now = ctx.currentTime;
            
            // Create a beautiful harmony of success tones
            const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5 major chord
            
            frequencies.forEach((freq, index) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                const filter = ctx.createBiquadFilter();
                
                osc.connect(filter);
                filter.connect(gain);
                gain.connect(ctx.destination);
                
                osc.frequency.setValueAtTime(freq, now);
                osc.type = 'sine';
                
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(3000, now);
                filter.Q.setValueAtTime(1, now);
                
                gain.gain.setValueAtTime(0, now + (index * 0.05));
                gain.gain.linearRampToValueAtTime(0.12, now + (index * 0.05) + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
                
                osc.start(now + (index * 0.05));
                osc.stop(now + 0.6);
            });
            
        } catch (error) {
            console.warn('Error creating payment success harmony:', error);
        }
    }

    createFinalConfirmationRing() {
        try {
            if (!this.audioContext) return;
            
            const ctx = this.audioContext;
            const now = ctx.currentTime;
            
            // Create a beautiful final confirmation ring
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const filter = ctx.createBiquadFilter();
            const reverb = ctx.createConvolver();
            
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(reverb);
            reverb.connect(ctx.destination);
            
            osc.frequency.setValueAtTime(1047, now); // C6
            osc.type = 'sine';
            
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(1047, now);
            filter.Q.setValueAtTime(10, now);
            
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.3, now + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
            
            osc.start(now);
            osc.stop(now + 1.5);
            
        } catch (error) {
            console.warn('Error creating final confirmation ring:', error);
        }
    }

    playSuccessSound() {
        if (!this.audioContext) return;

        try {
            const ctx = this.audioContext;
            const now = ctx.currentTime;
            
            const masterGain = ctx.createGain();
            const compressor = ctx.createDynamicsCompressor();
            masterGain.connect(compressor);
            compressor.connect(ctx.destination);
            masterGain.gain.setValueAtTime(0.6, now);

            this.createPremiumCoinSound(ctx, masterGain, now);
            
            this.createSparkleEffect(ctx, masterGain, now + 0.15);
            
            this.createCompletionChord(ctx, masterGain, now + 0.3);
            
            this.createReverbTail(ctx, masterGain, now + 0.5);

            console.log('Premium achievement sound sequence played');
        } catch (error) {
            console.warn('Error playing premium success sound:', error);
        }
    }

    createPremiumCoinSound(ctx, masterGain, startTime) {
        const coinPing = ctx.createOscillator();
        const coinGain = ctx.createGain();
        const coinFilter = ctx.createBiquadFilter();
        
        coinPing.connect(coinFilter);
        coinFilter.connect(coinGain);
        coinGain.connect(masterGain);
        
        coinPing.type = 'triangle';
        coinFilter.type = 'bandpass';
        coinFilter.frequency.setValueAtTime(2800, startTime);
        coinFilter.Q.setValueAtTime(12, startTime);
        
        coinPing.frequency.setValueAtTime(2800, startTime);
        coinPing.frequency.exponentialRampToValueAtTime(2200, startTime + 0.08);
        coinPing.frequency.exponentialRampToValueAtTime(2600, startTime + 0.15);
        
        coinGain.gain.setValueAtTime(0.9, startTime);
        coinGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);
        
        coinPing.start(startTime);
        coinPing.stop(startTime + 0.3);

        const resonance = ctx.createOscillator();
        const resGain = ctx.createGain();
        const resFilter = ctx.createBiquadFilter();
        
        resonance.connect(resFilter);
        resFilter.connect(resGain);
        resGain.connect(masterGain);
        
        resonance.type = 'sawtooth';
        resFilter.type = 'bandpass';
        resFilter.frequency.setValueAtTime(1400, startTime);
        resFilter.Q.setValueAtTime(6, startTime);
        
        resonance.frequency.setValueAtTime(1400, startTime);
        resonance.frequency.exponentialRampToValueAtTime(1100, startTime + 0.12);
        
        resGain.gain.setValueAtTime(0.5, startTime);
        resGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);
        
        resonance.start(startTime);
        resonance.stop(startTime + 0.25);

        const crystal = ctx.createOscillator();
        const crystalGain = ctx.createGain();
        const crystalFilter = ctx.createBiquadFilter();
        
        crystal.connect(crystalFilter);
        crystalFilter.connect(crystalGain);
        crystalGain.connect(masterGain);
        
        crystal.type = 'sine';
        crystalFilter.type = 'highpass';
        crystalFilter.frequency.setValueAtTime(3000, startTime);
        
        crystal.frequency.setValueAtTime(5600, startTime);
        crystal.frequency.exponentialRampToValueAtTime(4200, startTime + 0.06);
        
        crystalGain.gain.setValueAtTime(0.3, startTime);
        crystalGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2);
        
        crystal.start(startTime);
        crystal.stop(startTime + 0.2);
    }

    createSparkleEffect(ctx, masterGain, startTime) {
        const sparkles = [
            { freq: 3520, delay: 0, duration: 0.1 },
            { freq: 4400, delay: 0.03, duration: 0.08 },
            { freq: 2794, delay: 0.06, duration: 0.12 },
            { freq: 3520, delay: 0.09, duration: 0.1 }
        ];

        sparkles.forEach((sparkle, index) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const filter = ctx.createBiquadFilter();
            
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(masterGain);
            
            osc.type = 'sine';
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(sparkle.freq, startTime + sparkle.delay);
            filter.Q.setValueAtTime(20, startTime + sparkle.delay);
            
            osc.frequency.setValueAtTime(sparkle.freq, startTime + sparkle.delay);
            
            gain.gain.setValueAtTime(0.4 - index * 0.08, startTime + sparkle.delay);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + sparkle.delay + sparkle.duration);
            
            osc.start(startTime + sparkle.delay);
            osc.stop(startTime + sparkle.delay + sparkle.duration);
        });
    }

    createCompletionChord(ctx, masterGain, startTime) {
        const chord = [
            { freq: 523.25, gain: 0.4 }, // C5
            { freq: 659.25, gain: 0.3 }, // E5
            { freq: 783.99, gain: 0.25 } // G5
        ];

        chord.forEach((note, index) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const filter = ctx.createBiquadFilter();
            
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(masterGain);
            
            osc.type = 'sine';
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(2000, startTime);
            filter.Q.setValueAtTime(1, startTime);
            
            osc.frequency.setValueAtTime(note.freq, startTime);
            
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(note.gain, startTime + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.6);
            
            osc.start(startTime);
            osc.stop(startTime + 0.6);
        });
    }

    createReverbTail(ctx, masterGain, startTime) {
        const tail = ctx.createOscillator();
        const tailGain = ctx.createGain();
        const tailFilter = ctx.createBiquadFilter();
        
        tail.connect(tailFilter);
        tailFilter.connect(tailGain);
        tailGain.connect(masterGain);
        
        tail.type = 'sine';
        tailFilter.type = 'lowpass';
        tailFilter.frequency.setValueAtTime(800, startTime);
        tailFilter.Q.setValueAtTime(0.5, startTime);
        
        tail.frequency.setValueAtTime(220, startTime); // A3
        
        tailGain.gain.setValueAtTime(0.15, startTime);
        tailGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.8);
        
        tail.start(startTime);
        tail.stop(startTime + 0.8);
    }

    playPaymentSound() {
        try {
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }

            this.createPremiumTransactionSound();
        } catch (error) {
            console.warn('Web Audio API not available, trying fallback sound');
            this.playSimpleTransactionSound();
        }
    }

    createPremiumTransactionSound() {
        try {
            const ctx = this.audioContext;
            const now = ctx.currentTime;
        
            const masterGain = ctx.createGain();
            const compressor = ctx.createDynamicsCompressor();
            compressor.threshold.setValueAtTime(-24, now);
            compressor.knee.setValueAtTime(30, now);
            compressor.ratio.setValueAtTime(12, now);
            compressor.attack.setValueAtTime(0.003, now);
            compressor.release.setValueAtTime(0.25, now);
            
            masterGain.connect(compressor);
            compressor.connect(ctx.destination);
            masterGain.gain.setValueAtTime(0.7, now);
            
            this.createCardTapSound(ctx, masterGain, now);
            
            this.createProcessingSequence(ctx, masterGain, now + 0.15);
            
            this.createLuxurySuccessSound(ctx, masterGain, now + 0.45);
            
            this.createDigitalConfirmation(ctx, masterGain, now + 0.8);
            
            this.createPremiumFinish(ctx, masterGain, now + 1.1);

            console.log('Ultra-premium transaction sound sequence played');
        } catch (error) {
            console.warn('Error playing premium payment sound:', error);
        }
    }

    createCardTapSound(ctx, masterGain, startTime) {
        const nfcChirp = ctx.createOscillator();
        const chirpGain = ctx.createGain();
        const chirpFilter = ctx.createBiquadFilter();
        
        nfcChirp.connect(chirpFilter);
        chirpFilter.connect(chirpGain);
        chirpGain.connect(masterGain);
        
        nfcChirp.type = 'sine';
        chirpFilter.type = 'bandpass';
        chirpFilter.frequency.setValueAtTime(2400, startTime);
        chirpFilter.Q.setValueAtTime(8, startTime);
        
        nfcChirp.frequency.setValueAtTime(2400, startTime);
        nfcChirp.frequency.exponentialRampToValueAtTime(2800, startTime + 0.03);
        nfcChirp.frequency.exponentialRampToValueAtTime(2200, startTime + 0.08);
        
        chirpGain.gain.setValueAtTime(0.3, startTime);
        chirpGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.12);
        
        nfcChirp.start(startTime);
        nfcChirp.stop(startTime + 0.12);

        const contactSound = ctx.createOscillator();
        const contactGain = ctx.createGain();
        const contactFilter = ctx.createBiquadFilter();
        
        contactSound.connect(contactFilter);
        contactFilter.connect(contactGain);
        contactGain.connect(masterGain);
        
        contactSound.type = 'triangle';
        contactFilter.type = 'highpass';
        contactFilter.frequency.setValueAtTime(1500, startTime + 0.02);
        
        contactSound.frequency.setValueAtTime(800, startTime + 0.02);
        contactSound.frequency.linearRampToValueAtTime(600, startTime + 0.08);
        
        contactGain.gain.setValueAtTime(0.15, startTime + 0.02);
        contactGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.1);
        
        contactSound.start(startTime + 0.02);
        contactSound.stop(startTime + 0.1);
    }

    createProcessingSequence(ctx, masterGain, startTime) {
        const processingTone = ctx.createOscillator();
        const processGain = ctx.createGain();
        const processFilter = ctx.createBiquadFilter();
        
        processingTone.connect(processFilter);
        processFilter.connect(processGain);
        processGain.connect(masterGain);
        
        processingTone.type = 'square';
        processFilter.type = 'lowpass';
        processFilter.frequency.setValueAtTime(1800, startTime);
        processFilter.Q.setValueAtTime(2, startTime);
        
        processingTone.frequency.setValueAtTime(1200, startTime);
        
        processGain.gain.setValueAtTime(0.25, startTime);
        processGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);
        
        processingTone.start(startTime);
        processingTone.stop(startTime + 0.15);

        const authChirp = ctx.createOscillator();
        const authGain = ctx.createGain();
        const authFilter = ctx.createBiquadFilter();
        
        authChirp.connect(authFilter);
        authFilter.connect(authGain);
        authGain.connect(masterGain);
        
        authChirp.type = 'sine';
        authFilter.type = 'bandpass';
        authFilter.frequency.setValueAtTime(1600, startTime + 0.08);
        authFilter.Q.setValueAtTime(12, startTime + 0.08);
        
        authChirp.frequency.setValueAtTime(1600, startTime + 0.08);
        authChirp.frequency.linearRampToValueAtTime(1800, startTime + 0.12);
        
        authGain.gain.setValueAtTime(0.2, startTime + 0.08);
        authGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.18);
        
        authChirp.start(startTime + 0.08);
        authChirp.stop(startTime + 0.18);
    }

    createLuxurySuccessSound(ctx, masterGain, startTime) {
        const melody = [
            { freq: 523.25, time: 0, duration: 0.15 },    // C5
            { freq: 659.25, time: 0.08, duration: 0.2 },  // E5  
            { freq: 783.99, time: 0.16, duration: 0.25 }, // G5
            { freq: 1046.50, time: 0.24, duration: 0.3 }  // C6
        ];

        melody.forEach((note, index) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const filter = ctx.createBiquadFilter();
            
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(masterGain);
            
            osc.type = 'sine';
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(2500, startTime + note.time);
            filter.Q.setValueAtTime(1.5, startTime + note.time);
            
            osc.frequency.setValueAtTime(note.freq, startTime + note.time);
            
            gain.gain.setValueAtTime(0, startTime + note.time);
            gain.gain.linearRampToValueAtTime(0.4 - index * 0.05, startTime + note.time + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + note.time + note.duration);
            
            osc.start(startTime + note.time);
            osc.stop(startTime + note.time + note.duration);
        });

        const harmony = ctx.createOscillator();
        const harmonyGain = ctx.createGain();
        const harmonyFilter = ctx.createBiquadFilter();
        
        harmony.connect(harmonyFilter);
        harmonyFilter.connect(harmonyGain);
        harmonyGain.connect(masterGain);
        
        harmony.type = 'triangle';
        harmonyFilter.type = 'lowpass';
        harmonyFilter.frequency.setValueAtTime(1200, startTime);
        
        harmony.frequency.setValueAtTime(261.63, startTime); // C4
        harmony.frequency.linearRampToValueAtTime(329.63, startTime + 0.15); // E4
        harmony.frequency.linearRampToValueAtTime(392.00, startTime + 0.3); // G4
        
        harmonyGain.gain.setValueAtTime(0.2, startTime);
        harmonyGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);
        
        harmony.start(startTime);
        harmony.stop(startTime + 0.4);
    }

    createDigitalConfirmation(ctx, masterGain, startTime) {
        const digitalPing = ctx.createOscillator();
        const pingGain = ctx.createGain();
        const pingFilter = ctx.createBiquadFilter();
        
        digitalPing.connect(pingFilter);
        pingFilter.connect(pingGain);
        pingGain.connect(masterGain);
        
        digitalPing.type = 'sine';
        pingFilter.type = 'peaking';
        pingFilter.frequency.setValueAtTime(2200, startTime);
        pingFilter.Q.setValueAtTime(6, startTime);
        pingFilter.gain.setValueAtTime(8, startTime);
        
        digitalPing.frequency.setValueAtTime(2200, startTime);
        digitalPing.frequency.exponentialRampToValueAtTime(1800, startTime + 0.1);
        
        pingGain.gain.setValueAtTime(0.5, startTime);
        pingGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);
        
        digitalPing.start(startTime);
        digitalPing.stop(startTime + 0.25);

        const texture = ctx.createOscillator();
        const textureGain = ctx.createGain();
        const textureFilter = ctx.createBiquadFilter();
        
        texture.connect(textureFilter);
        textureFilter.connect(textureGain);
        textureGain.connect(masterGain);
        
        texture.type = 'sawtooth';
        textureFilter.type = 'highpass';
        textureFilter.frequency.setValueAtTime(4000, startTime + 0.05);
        
        texture.frequency.setValueAtTime(4400, startTime + 0.05);
        texture.frequency.linearRampToValueAtTime(3800, startTime + 0.15);
        
        textureGain.gain.setValueAtTime(0.08, startTime + 0.05);
        textureGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2);
        
        texture.start(startTime + 0.05);
        texture.stop(startTime + 0.2);
    }

    createPremiumFinish(ctx, masterGain, startTime) {
        const luxuryBell = ctx.createOscillator();
        const bellGain = ctx.createGain();
        const bellFilter = ctx.createBiquadFilter();
        
        luxuryBell.connect(bellFilter);
        bellFilter.connect(bellGain);
        bellGain.connect(masterGain);
        
        luxuryBell.type = 'sine';
        bellFilter.type = 'peaking';
        bellFilter.frequency.setValueAtTime(1570, startTime); // G6
        bellFilter.Q.setValueAtTime(4, startTime);
        bellFilter.gain.setValueAtTime(6, startTime);
        
        luxuryBell.frequency.setValueAtTime(1568, startTime); // G6
        
        bellGain.gain.setValueAtTime(0.45, startTime);
        bellGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.8);
        
        luxuryBell.start(startTime);
        luxuryBell.stop(startTime + 0.8);

        const reverbTail = ctx.createOscillator();
        const tailGain = ctx.createGain();
        const tailFilter = ctx.createBiquadFilter();
        
        reverbTail.connect(tailFilter);
        tailFilter.connect(tailGain);
        tailGain.connect(masterGain);
        
        reverbTail.type = 'sine';
        tailFilter.type = 'lowpass';
        tailFilter.frequency.setValueAtTime(600, startTime + 0.1);
        tailFilter.Q.setValueAtTime(0.7, startTime + 0.1);
        
        reverbTail.frequency.setValueAtTime(392, startTime + 0.1); // G4
        
        tailGain.gain.setValueAtTime(0.12, startTime + 0.1);
        tailGain.gain.exponentialRampToValueAtTime(0.001, startTime + 1.0);
        
        reverbTail.start(startTime + 0.1);
        reverbTail.stop(startTime + 1.0);
    }

    playSimpleTransactionSound() {
        try {
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            
            const ctx = this.audioContext;
            const now = ctx.currentTime;
            
            const cashRegisterSequence = [
                { freq: 1760, time: 0, duration: 0.5 },     // A6 - main bell
                { freq: 2200, time: 0.1, duration: 0.4 },   // C#7 - harmony bell
                { freq: 1320, time: 0.2, duration: 0.6 }    // E6 - bass bell
            ];
            
            cashRegisterSequence.forEach((note, index) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                
                osc.connect(gain);
                gain.connect(ctx.destination);
                
                osc.type = 'sine'; // Pure bell tone
                osc.frequency.setValueAtTime(note.freq, now + note.time);
                gain.gain.setValueAtTime(0.4 - index * 0.1, now + note.time);
                gain.gain.exponentialRampToValueAtTime(0.01, now + note.time + note.duration);
                
                osc.start(now + note.time);
                osc.stop(now + note.time + note.duration);
            });
            
            console.log('Enhanced cash register sound played');
        } catch (error) {
            console.warn('Audio not available:', error);
        }
    }

    playCloseSound() {
        if (!this.audioContext) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.frequency.setValueAtTime(400, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(200, this.audioContext.currentTime + 0.2);
        
        gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);

        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.2);
    }

    playClickSound() {
        if (!this.audioContext) return;

        try {
            const ctx = this.audioContext;
            const now = ctx.currentTime;
            
            // Create a pleasant UI click sound
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();
            const filterNode = ctx.createBiquadFilter();
            
            oscillator.connect(filterNode);
            filterNode.connect(gainNode);
            gainNode.connect(ctx.destination);
            
            // Bright, crisp click
            oscillator.frequency.setValueAtTime(800, now);
            oscillator.frequency.exponentialRampToValueAtTime(600, now + 0.1);
            
            filterNode.type = 'highpass';
            filterNode.frequency.setValueAtTime(400, now);
            
            gainNode.gain.setValueAtTime(0.08, now);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
            
            oscillator.start(now);
            oscillator.stop(now + 0.15);
        } catch (error) {
            console.warn('Error playing click sound:', error);
        }
    }

    showDailyReminder() {
        const title = 'Daily Reminder';
        const options = {
            body: 'Don\'t forget to mark your work as done today!',
            icon: location.origin + '/assets/favicon.ico',
            tag: 'daily-reminder'
        };

        this.showNotification(title, options);
    }

    checkMilestones(stats) {
        if (stats.currentStreak > 0 && stats.currentStreak % 7 === 0) {
            this.showStreakNotification(stats.currentStreak);
        }

        if (stats.totalEarned > 0 && stats.totalEarned % 500 === 0) {
            const title = 'Milestone Achieved!';
            const options = {
                body: `Congratulations! You've earned ₹${stats.totalEarned} in total!`,
                icon: location.origin + '/assets/favicon.ico',
                tag: 'earnings-milestone'
            };
            this.showNotification(title, options);
        }
    }

    testAllNotifications() {
        console.log('Testing all notification types...');
        
        this.showToast('Test Info Toast', 'info', 3000);
        setTimeout(() => this.showToast('Test Success Toast', 'success', 3000), 1000);
        setTimeout(() => this.showToast('Test Warning Toast', 'warning', 3000), 2000);
        setTimeout(() => this.showToast('Test Error Toast', 'error', 3000), 3000);
        
        setTimeout(() => {
            this.showNotification('Test Browser Notification', {
                body: 'This is a test browser notification',
                toastType: 'info',
                tag: 'test-notification'
            });
        }, 4000);
        
        setTimeout(() => this.showPaydayNotification(), 5000);
        setTimeout(() => this.showWorkCompletedNotification(), 6000);
        setTimeout(() => this.showStreakNotification(5), 7000);
        setTimeout(() => this.showAdvancePaymentNotification(), 8000);
        
        this.showToast('All notification tests scheduled! Check your browser and app.', 'success', 5000);
    }

    

    
    getAudioSettings() {
        return {
            baseFrequencies: {
                success: 523.25,   // C5 - Success actions
                payment: 659.25,   // E5 - Payment actions
                warning: 349.23,   // F4 - Warning/reminder
                error: 293.66,     // D4 - Error states
                info: 392.00,      // G4 - Information
                system: 440.00     // A4 - System events
            },
            
            harmonics: {
                major: [1, 1.25, 1.5],      // Major triad
                minor: [1, 1.2, 1.5],       // Minor triad
                seventh: [1, 1.25, 1.5, 1.75], // Major 7th
                notification: [1, 1.33, 2]   // Perfect fifth + octave
            },
            
            durations: {
                quick: 0.1,
                short: 0.2,
                medium: 0.4,
                long: 0.8,
                extended: 1.2
            },
            
            volumes: {
                subtle: 0.1,
                low: 0.2,
                medium: 0.4,
                high: 0.6,
                attention: 0.8
            }
        };
    }
    
    playSystematicSound(type, intensity = 'medium') {
        if (!this.audioContext) {
            this.createAudioContext();
            if (!this.audioContext) return;
        }
        
        const settings = this.getAudioSettings();
        const ctx = this.audioContext;
        const now = ctx.currentTime;
        
        try {
            switch (type) {
                case 'success':
                    this.playHarmonicChord(settings.baseFrequencies.success, settings.harmonics.major, settings.durations.medium, settings.volumes[intensity]);
                    break;
                case 'payment':
                    this.playPaymentSequence(intensity);
                    break;
                case 'warning':
                    this.playWarningTone(intensity);
                    break;
                case 'error':
                    this.playErrorSequence(intensity);
                    break;
                case 'info':
                    this.playInfoChime(intensity);
                    break;
                case 'system':
                    this.playSystemBeep(intensity);
                    break;
                default:
                    this.playSystemBeep('low');
            }
        } catch (error) {
            console.warn('Error playing systematic sound:', error);
        }
    }
    
    playHarmonicChord(baseFreq, harmonicRatios, duration, volume) {
        const ctx = this.audioContext;
        const now = ctx.currentTime;
        const masterGain = ctx.createGain();
        masterGain.connect(ctx.destination);
        masterGain.gain.setValueAtTime(volume, now);
        masterGain.gain.exponentialRampToValueAtTime(0.01, now + duration);
        
        harmonicRatios.forEach((ratio, index) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.connect(gain);
            gain.connect(masterGain);
            
            osc.frequency.setValueAtTime(baseFreq * ratio, now);
            osc.type = 'sine';
            
            if (index > 0) {
                osc.frequency.setValueAtTime(baseFreq * ratio * (1 + Math.random() * 0.002 - 0.001), now);
            }
            
            gain.gain.setValueAtTime(1 / harmonicRatios.length, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
            
            osc.start(now);
            osc.stop(now + duration);
        });
    }
    
    createAudioContext() {
        try {
            if (!this.audioContext && (window.AudioContext || window.webkitAudioContext)) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                
                if (this.audioContext.state === 'suspended') {
                    this.audioContext.resume();
                }
            }
        } catch (error) {
            console.warn('Could not create audio context:', error);
        }
    }
    
    // Missing systematic sound methods implementation
    playPaymentSequence(intensity = 'medium') {
        const settings = this.getAudioSettings();
        const ctx = this.audioContext;
        const now = ctx.currentTime;
        const volume = settings.volumes[intensity];
        
        // Ascending payment sequence (C5 -> E5 -> G5)
        const sequence = [523.25, 659.25, 783.99];
        
        sequence.forEach((freq, index) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const filter = ctx.createBiquadFilter();
            
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + index * 0.15);
            
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(freq * 2, now + index * 0.15);
            filter.Q.setValueAtTime(8, now + index * 0.15);
            
            gain.gain.setValueAtTime(volume, now + index * 0.15);
            gain.gain.exponentialRampToValueAtTime(0.01, now + index * 0.15 + 0.4);
            
            osc.start(now + index * 0.15);
            osc.stop(now + index * 0.15 + 0.4);
        });
    }
    
    playWarningTone(intensity = 'medium') {
        const settings = this.getAudioSettings();
        const ctx = this.audioContext;
        const now = ctx.currentTime;
        const volume = settings.volumes[intensity];
        
        // Two-tone warning pattern
        const frequencies = [349.23, 415.30]; // F4 -> G#4
        
        frequencies.forEach((freq, index) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, now + index * 0.3);
            
            gain.gain.setValueAtTime(volume, now + index * 0.3);
            gain.gain.exponentialRampToValueAtTime(0.01, now + index * 0.3 + 0.25);
            
            osc.start(now + index * 0.3);
            osc.stop(now + index * 0.3 + 0.25);
        });
    }
    
    playErrorSequence(intensity = 'medium') {
        const settings = this.getAudioSettings();
        const ctx = this.audioContext;
        const now = ctx.currentTime;
        const volume = settings.volumes[intensity];
        
        // Descending error sequence (D4 -> C4 -> B3)
        const sequence = [293.66, 261.63, 246.94];
        
        sequence.forEach((freq, index) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, now + index * 0.2);
            
            gain.gain.setValueAtTime(volume, now + index * 0.2);
            gain.gain.exponentialRampToValueAtTime(0.01, now + index * 0.2 + 0.3);
            
            osc.start(now + index * 0.2);
            osc.stop(now + index * 0.2 + 0.3);
        });
    }
    
    playInfoChime(intensity = 'medium') {
        const settings = this.getAudioSettings();
        const ctx = this.audioContext;
        const now = ctx.currentTime;
        const volume = settings.volumes[intensity];
        
        // Pleasant info chime (G4)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(392.00, now); // G4
        
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(784, now);
        filter.Q.setValueAtTime(5, now);
        
        gain.gain.setValueAtTime(volume, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
        
        osc.start(now);
        osc.stop(now + 0.6);
    }
    
    playSystemBeep(intensity = 'medium') {
        const settings = this.getAudioSettings();
        const ctx = this.audioContext;
        const now = ctx.currentTime;
        const volume = settings.volumes[intensity];
        
        // Simple system beep (A4)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440.00, now); // A4
        
        gain.gain.setValueAtTime(volume, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        
        osc.start(now);
        osc.stop(now + 0.2);
    }
    // Create achievement chime for work completion
    createAchievementChime() {
        if (!this.audioContext) return;
        
        try {
            const ctx = this.audioContext;
            const now = ctx.currentTime;
            
            // Create a beautiful bell-like chime
            const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5 - Major chord
            
            frequencies.forEach((freq, index) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                const filter = ctx.createBiquadFilter();
                
                osc.connect(filter);
                filter.connect(gain);
                gain.connect(ctx.destination);
                
                osc.type = "sine";
                osc.frequency.setValueAtTime(freq, now);
                
                filter.type = "lowpass";
                filter.frequency.setValueAtTime(freq * 2, now);
                filter.Q.setValueAtTime(15, now);
                
                const startTime = now + (index * 0.1);
                gain.gain.setValueAtTime(0.3, startTime);
                gain.gain.exponentialRampToValueAtTime(0.001, startTime + 1.5);
                
                osc.start(startTime);
                osc.stop(startTime + 1.5);
            });
        } catch (error) {
            console.warn("Error creating achievement chime:", error);
        }
    }
    
    // Create luxury confirmation sound for payments
    createLuxuryConfirmation() {
        if (!this.audioContext) return;
        
        try {
            const ctx = this.audioContext;
            const now = ctx.currentTime;
            
            // Create sophisticated confirmation tone
            const osc1 = ctx.createOscillator();
            const osc2 = ctx.createOscillator();
            const gain = ctx.createGain();
            const filter = ctx.createBiquadFilter();
            
            osc1.connect(filter);
            osc2.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);
            
            osc1.type = "triangle";
            osc2.type = "sine";
            
            osc1.frequency.setValueAtTime(800, now);
            osc1.frequency.exponentialRampToValueAtTime(1200, now + 0.3);
            
            osc2.frequency.setValueAtTime(400, now);
            osc2.frequency.exponentialRampToValueAtTime(600, now + 0.3);
            
            filter.type = "bandpass";
            filter.frequency.setValueAtTime(1000, now);
            filter.Q.setValueAtTime(8, now);
            
            gain.gain.setValueAtTime(0.4, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
            
            osc1.start(now);
            osc2.start(now);
            osc1.stop(now + 0.8);
            osc2.stop(now + 0.8);
        } catch (error) {
            console.warn("Error creating luxury confirmation:", error);
        }
    }
    
    // Create cash register finale sound
    createCashRegisterFinale() {
        if (!this.audioContext) return;
        
        try {
            const ctx = this.audioContext;
            const now = ctx.currentTime;
            
            // Create realistic cash register "cha-ching" finale
            const frequencies = [440, 550, 660, 880]; // Rich harmonic content
            
            frequencies.forEach((freq, index) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                const filter = ctx.createBiquadFilter();
                
                osc.connect(filter);
                filter.connect(gain);
                gain.connect(ctx.destination);
                
                osc.type = index < 2 ? "sawtooth" : "triangle";
                osc.frequency.setValueAtTime(freq, now);
                
                filter.type = "bandpass";
                filter.frequency.setValueAtTime(freq * 1.5, now);
                filter.Q.setValueAtTime(12, now);
                
                const startTime = now + (index * 0.05);
                gain.gain.setValueAtTime(0.2, startTime);
                gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);
                
                osc.start(startTime);
                osc.stop(startTime + 0.4);
            });
        } catch (error) {
            console.warn("Error creating cash register finale:", error);
        }
    }
    
    // Create premium finish with enhanced reverb for ultimate luxury feel
    createPremiumFinish() {
        if (!this.audioContext) return;
        
        try {
            const ctx = this.audioContext;
            const now = ctx.currentTime;
            
            // Create a luxurious cathedral bell finish with enhanced reverb
            const frequencies = [261.63, 329.63, 392.00, 523.25]; // C Major chord progression
            
            // Main luxurious bell tones
            frequencies.forEach((freq, index) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                const filter = ctx.createBiquadFilter();
                const reverb = ctx.createConvolver();
                
                // Create artificial reverb using delay and feedback
                const delay = ctx.createDelay(0.3);
                const feedback = ctx.createGain();
                const delayGain = ctx.createGain();
                
                osc.connect(filter);
                filter.connect(gain);
                gain.connect(delay);
                delay.connect(feedback);
                feedback.connect(delay);
                feedback.connect(delayGain);
                delayGain.connect(ctx.destination);
                gain.connect(ctx.destination);
                
                osc.type = "sine";
                osc.frequency.setValueAtTime(freq, now + index * 0.1);
                
                filter.type = "lowpass";
                filter.frequency.setValueAtTime(freq * 3, now + index * 0.1);
                filter.Q.setValueAtTime(15, now + index * 0.1);
                
                delay.delayTime.setValueAtTime(0.15, now + index * 0.1);
                feedback.gain.setValueAtTime(0.3, now + index * 0.1);
                delayGain.gain.setValueAtTime(0.2, now + index * 0.1);
                
                const startTime = now + (index * 0.1);
                gain.gain.setValueAtTime(0.3, startTime);
                gain.gain.exponentialRampToValueAtTime(0.001, startTime + 2.0);
                
                osc.start(startTime);
                osc.stop(startTime + 2.0);
            });
            
            // Add shimmer effect
            setTimeout(() => {
                for (let i = 0; i < 5; i++) {
                    const shimmerOsc = ctx.createOscillator();
                    const shimmerGain = ctx.createGain();
                    const shimmerFilter = ctx.createBiquadFilter();
                    
                    shimmerOsc.connect(shimmerFilter);
                    shimmerFilter.connect(shimmerGain);
                    shimmerGain.connect(ctx.destination);
                    
                    shimmerOsc.type = "sine";
                    shimmerOsc.frequency.setValueAtTime(1047 + (i * 200), ctx.currentTime);
                    
                    shimmerFilter.type = "highpass";
                    shimmerFilter.frequency.setValueAtTime(800, ctx.currentTime);
                    
                    shimmerGain.gain.setValueAtTime(0.1, ctx.currentTime);
                    shimmerGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
                    
                    shimmerOsc.start(ctx.currentTime);
                    shimmerOsc.stop(ctx.currentTime + 1.5);
                }
            }, 200);
            
        } catch (error) {
            console.warn("Error creating premium finish:", error);
        }
    }

    // Enhanced sound methods for better audio quality
    playEnhancedSuccessSound() {
        if (!this.audioContext) return;

        try {
            const ctx = this.audioContext;
            const now = ctx.currentTime;
            
            // Create multiple layered oscillators for rich sound
            const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5 major chord
            const masterGain = ctx.createGain();
            masterGain.connect(ctx.destination);
            masterGain.gain.setValueAtTime(0.15, now);
            masterGain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);
            
            frequencies.forEach((freq, index) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                const filter = ctx.createBiquadFilter();
                
                osc.connect(filter);
                filter.connect(gain);
                gain.connect(masterGain);
                
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now);
                osc.frequency.exponentialRampToValueAtTime(freq * 0.95, now + 1.5);
                
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(3000, now);
                filter.Q.setValueAtTime(1, now);
                
                gain.gain.setValueAtTime(0.3, now + index * 0.1);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
                
                osc.start(now + index * 0.1);
                osc.stop(now + 2.0);
            });
            
            console.log('Enhanced success sound played');
        } catch (error) {
            console.warn('Error playing enhanced success sound:', error);
        }
    }

    playEnhancedPaymentSound() {
        if (!this.audioContext) return;

        try {
            const ctx = this.audioContext;
            const now = ctx.currentTime;
            
            // Ultra-premium payment sound sequence with realistic banking tones
            this.createUltraPremiumPaymentSequence(ctx, now);
            
            console.log('Ultra-premium enhanced payment sound played');
        } catch (error) {
            console.warn('Error playing enhanced payment sound:', error);
            // Fallback to simpler sound
            this.playSimplePaymentFallback();
        }
    }

    createUltraPremiumPaymentSequence(ctx, startTime) {
        // Create multiple layers for ultra-realistic, premium banking payment sound
        
        // Layer 1: NFC/Card tap recognition (enhanced)
        this.createAdvancedCardChipSound(ctx, startTime);
        
        // Layer 2: Banking terminal processing sequence (enhanced)
        this.createAdvancedProcessingBeeps(ctx, startTime + 0.15);
        
        // Layer 3: Digital authorization confirmation
        this.createDigitalAuthorizationSound(ctx, startTime + 0.45);
        
        // Layer 4: Premium banking confirmation chimes
        this.createPremiumBankingChimes(ctx, startTime + 0.7);
        
        // Layer 5: Luxury cash register finale with spatial audio
        this.createLuxuryCashRegisterFinale(ctx, startTime + 1.0);
        
        // Layer 6: Success completion tone
        this.createSuccessCompletionTone(ctx, startTime + 1.3);
    }

    createCardChipSound(ctx, startTime) {
        // Realistic NFC/chip card recognition sound
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        
        osc.type = 'square';
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(2400, startTime);
        filter.Q.setValueAtTime(15, startTime);
        
        osc.frequency.setValueAtTime(2400, startTime);
        osc.frequency.exponentialRampToValueAtTime(2800, startTime + 0.05);
        osc.frequency.exponentialRampToValueAtTime(2200, startTime + 0.1);
        
        gain.gain.setValueAtTime(0.15, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);
        
        osc.start(startTime);
        osc.stop(startTime + 0.15);
    }

    createProcessingBeeps(ctx, startTime) {
        // Banking terminal processing beeps
        const beepTimes = [0, 0.15, 0.3];
        
        beepTimes.forEach((time, index) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const filter = ctx.createBiquadFilter();
            
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1000 + (index * 100), startTime + time);
            
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(1000 + (index * 100), startTime + time);
            filter.Q.setValueAtTime(5, startTime + time);
            
            gain.gain.setValueAtTime(0.2, startTime + time);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + time + 0.1);
            
            osc.start(startTime + time);
            osc.stop(startTime + time + 0.1);
        });
    }

    createPremiumConfirmationChimes(ctx, startTime) {
        // Premium banking confirmation chord
        const frequencies = [523.25, 659.25, 783.99, 1046.5]; // C5 major chord
        
        frequencies.forEach((freq, index) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const filter = ctx.createBiquadFilter();
            
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);
            
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, startTime);
            
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(freq * 3, startTime);
            filter.Q.setValueAtTime(1, startTime);
            
            gain.gain.setValueAtTime(0.1 - (index * 0.02), startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.8);
            
            osc.start(startTime + (index * 0.05));
            osc.stop(startTime + 0.8);
        });
    }

    createEnhancedCashRegisterFinale(ctx, startTime) {
        // Enhanced cash register "cha-ching" with reverb effect
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        const delay = ctx.createDelay();
        const delayGain = ctx.createGain();
        
        // Main sound path
        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        
        // Reverb path
        gain.connect(delay);
        delay.connect(delayGain);
        delayGain.connect(ctx.destination);
        
        osc1.type = 'triangle';
        osc2.type = 'sine';
        
        osc1.frequency.setValueAtTime(1760, startTime); // A6
        osc2.frequency.setValueAtTime(880, startTime);  // A5
        
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1500, startTime);
        filter.Q.setValueAtTime(3, startTime);
        
        delay.delayTime.setValueAtTime(0.1, startTime);
        delayGain.gain.setValueAtTime(0.3, startTime);
        
        gain.gain.setValueAtTime(0.25, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 1.2);
        
        osc1.start(startTime);
        osc2.start(startTime);
        osc1.stop(startTime + 1.2);
        osc2.stop(startTime + 1.2);
    }

    playSimplePaymentFallback() {
        // Simple fallback payment sound
        try {
            const ctx = this.audioContext;
            const now = ctx.currentTime;
            
            const sequence = [
                { freq: 440, time: 0, duration: 0.15 },
                { freq: 554.37, time: 0.1, duration: 0.15 },
                { freq: 659.25, time: 0.2, duration: 0.2 },
                { freq: 880, time: 0.35, duration: 0.3 }
            ];
            
            const masterGain = ctx.createGain();
            masterGain.connect(ctx.destination);
            masterGain.gain.setValueAtTime(0.12, now);
            
            sequence.forEach(note => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                
                osc.connect(gain);
                gain.connect(masterGain);
                
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(note.freq, now + note.time);
                
                gain.gain.setValueAtTime(0.8, now + note.time);
                gain.gain.exponentialRampToValueAtTime(0.001, now + note.time + note.duration);
                
                osc.start(now + note.time);
                osc.stop(now + note.time + note.duration);
            });
            
            console.log('Fallback payment sound played');
        } catch (error) {
            console.warn('Even fallback payment sound failed:', error);
        }
    }

    createAdvancedCardChipSound(ctx, startTime) {
        // Ultra-realistic NFC/chip card recognition with multiple harmonics
        const frequencies = [2400, 2800, 3200];
        
        frequencies.forEach((freq, index) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const filter = ctx.createBiquadFilter();
            
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);
            
            osc.type = index === 0 ? 'square' : 'sine';
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(freq, startTime);
            filter.Q.setValueAtTime(20, startTime);
            
            osc.frequency.setValueAtTime(freq, startTime);
            osc.frequency.exponentialRampToValueAtTime(freq * 1.2, startTime + 0.03);
            osc.frequency.exponentialRampToValueAtTime(freq * 0.9, startTime + 0.1);
            
            gain.gain.setValueAtTime(0.1 - (index * 0.02), startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.12);
            
            osc.start(startTime + (index * 0.01));
            osc.stop(startTime + 0.12);
        });
    }

    createAdvancedProcessingBeeps(ctx, startTime) {
        // Enhanced banking terminal processing with realistic timing
        const sequence = [
            { freq: 1000, time: 0, duration: 0.08 },
            { freq: 1100, time: 0.12, duration: 0.08 },
            { freq: 1200, time: 0.24, duration: 0.08 },
            { freq: 1300, time: 0.36, duration: 0.1 }
        ];
        
        sequence.forEach((beep, index) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const filter = ctx.createBiquadFilter();
            
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(beep.freq, startTime + beep.time);
            
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(beep.freq, startTime + beep.time);
            filter.Q.setValueAtTime(8, startTime + beep.time);
            
            gain.gain.setValueAtTime(0.15, startTime + beep.time);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + beep.time + beep.duration);
            
            osc.start(startTime + beep.time);
            osc.stop(startTime + beep.time + beep.duration);
        });
    }

    createDigitalAuthorizationSound(ctx, startTime) {
        // Digital authorization confirmation with electronic feel
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        
        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        
        osc1.type = 'sawtooth';
        osc2.type = 'sine';
        
        osc1.frequency.setValueAtTime(440, startTime);
        osc1.frequency.exponentialRampToValueAtTime(880, startTime + 0.15);
        
        osc2.frequency.setValueAtTime(220, startTime);
        osc2.frequency.exponentialRampToValueAtTime(440, startTime + 0.15);
        
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2000, startTime);
        filter.frequency.exponentialRampToValueAtTime(4000, startTime + 0.15);
        
        gain.gain.setValueAtTime(0.12, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2);
        
        osc1.start(startTime);
        osc2.start(startTime);
        osc1.stop(startTime + 0.2);
        osc2.stop(startTime + 0.2);
    }

    createPremiumBankingChimes(ctx, startTime) {
        // Luxury banking confirmation chord with harmonic richness
        const chord = [523.25, 659.25, 783.99, 1046.5, 1318.5]; // Extended C major chord
        
        chord.forEach((freq, index) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const filter = ctx.createBiquadFilter();
            const delay = ctx.createDelay();
            const delayGain = ctx.createGain();
            
            // Main signal path
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);
            
            // Delay/reverb path
            gain.connect(delay);
            delay.connect(delayGain);
            delayGain.connect(ctx.destination);
            
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, startTime);
            
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(freq * 4, startTime);
            filter.Q.setValueAtTime(1, startTime);
            
            delay.delayTime.setValueAtTime(0.05 + (index * 0.01), startTime);
            delayGain.gain.setValueAtTime(0.2, startTime);
            
            gain.gain.setValueAtTime(0.08 - (index * 0.01), startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 1.2);
            
            osc.start(startTime + (index * 0.03));
            osc.stop(startTime + 1.2);
        });
    }

    createLuxuryCashRegisterFinale(ctx, startTime) {
        // Premium cash register "cha-ching" with spatial audio and reverb
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const osc3 = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        const delay1 = ctx.createDelay();
        const delay2 = ctx.createDelay();
        const delayGain1 = ctx.createGain();
        const delayGain2 = ctx.createGain();
        
        // Complex routing for spatial effect
        osc1.connect(filter);
        osc2.connect(filter);
        osc3.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        
        // Multiple delay lines for rich reverb
        gain.connect(delay1);
        gain.connect(delay2);
        delay1.connect(delayGain1);
        delay2.connect(delayGain2);
        delayGain1.connect(ctx.destination);
        delayGain2.connect(ctx.destination);
        
        osc1.type = 'triangle';
        osc2.type = 'sine';
        osc3.type = 'square';
        
        osc1.frequency.setValueAtTime(1760, startTime); // A6
        osc2.frequency.setValueAtTime(880, startTime);  // A5
        osc3.frequency.setValueAtTime(440, startTime);  // A4
        
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1500, startTime);
        filter.Q.setValueAtTime(2, startTime);
        
        delay1.delayTime.setValueAtTime(0.08, startTime);
        delay2.delayTime.setValueAtTime(0.15, startTime);
        delayGain1.gain.setValueAtTime(0.25, startTime);
        delayGain2.gain.setValueAtTime(0.15, startTime);
        
        gain.gain.setValueAtTime(0.2, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 1.5);
        
        osc1.start(startTime);
        osc2.start(startTime + 0.02);
        osc3.start(startTime + 0.04);
        osc1.stop(startTime + 1.5);
        osc2.stop(startTime + 1.5);
        osc3.stop(startTime + 1.5);
    }

    createSuccessCompletionTone(ctx, startTime) {
        // Final success confirmation tone with magical feel
        const frequencies = [1047, 1319, 1568, 2093]; // C6, E6, G6, C7
        
        frequencies.forEach((freq, index) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const filter = ctx.createBiquadFilter();
            
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, startTime);
            
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(freq * 2, startTime);
            filter.Q.setValueAtTime(1, startTime);
            
            gain.gain.setValueAtTime(0.06 - (index * 0.01), startTime + (index * 0.05));
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.8);
            
            osc.start(startTime + (index * 0.05));
            osc.stop(startTime + 0.8);
        });
    }

    createWorkCompletionChime() {
        if (!this.audioContext) return;

        try {
            const ctx = this.audioContext;
            const now = ctx.currentTime;
            
            // Bell-like chime sequence
            const frequencies = [1047, 1319, 1568]; // C6, E6, G6
            
            frequencies.forEach((freq, index) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                const convolver = ctx.createConvolver();
                
                osc.connect(gain);
                gain.connect(convolver);
                convolver.connect(ctx.destination);
                
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now);
                osc.frequency.exponentialRampToValueAtTime(freq * 0.99, now + 1.0);
                
                gain.gain.setValueAtTime(0.08, now + index * 0.05);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
                
                osc.start(now + index * 0.05);
                osc.stop(now + 1.2);
            });
        } catch (error) {
            console.warn('Error creating work completion chime:', error);
        }
    }

    createAchievementBells() {
        if (!this.audioContext) return;

        try {
            const ctx = this.audioContext;
            const now = ctx.currentTime;
            
            // Multiple bell layers
            const bells = [
                { freq: 523.25, delay: 0 },
                { freq: 659.25, delay: 0.1 },
                { freq: 783.99, delay: 0.2 },
                { freq: 1046.5, delay: 0.3 }
            ];
            
            bells.forEach(bell => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                const filter = ctx.createBiquadFilter();
                
                osc.connect(filter);
                filter.connect(gain);
                gain.connect(ctx.destination);
                
                osc.type = 'sine';
                osc.frequency.setValueAtTime(bell.freq, now + bell.delay);
                
                filter.type = 'peaking';
                filter.frequency.setValueAtTime(bell.freq * 3, now + bell.delay);
                filter.Q.setValueAtTime(5, now + bell.delay);
                filter.gain.setValueAtTime(10, now + bell.delay);
                
                gain.gain.setValueAtTime(0.06, now + bell.delay);
                gain.gain.exponentialRampToValueAtTime(0.001, now + bell.delay + 1.5);
                
                osc.start(now + bell.delay);
                osc.stop(now + bell.delay + 1.5);
            });
        } catch (error) {
            console.warn('Error creating achievement bells:', error);
        }
    }

    createSuccessHarmony() {
        if (!this.audioContext) return;

        try {
            const ctx = this.audioContext;
            const now = ctx.currentTime;
            
            // Final harmonic resolution
            const harmony = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
            
            const masterGain = ctx.createGain();
            masterGain.connect(ctx.destination);
            masterGain.gain.setValueAtTime(0.1, now);
            masterGain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);
            
            harmony.forEach((freq, index) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                
                osc.connect(gain);
                gain.connect(masterGain);
                
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now);
                
                gain.gain.setValueAtTime(0.25, now + index * 0.02);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
                
                osc.start(now + index * 0.02);
                osc.stop(now + 2.0);
            });
        } catch (error) {
            console.warn('Error creating success harmony:', error);
        }
    }

    createCashRegisterDeluxe() {
        if (!this.audioContext) return;

        try {
            const ctx = this.audioContext;
            const now = ctx.currentTime;
            
            // Authentic cash register sound
            const registerSounds = [
                { freq: 220, time: 0, type: 'sawtooth' },
                { freq: 330, time: 0.05, type: 'square' },
                { freq: 440, time: 0.1, type: 'triangle' },
                { freq: 550, time: 0.15, type: 'sine' }
            ];
            
            registerSounds.forEach(sound => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                const filter = ctx.createBiquadFilter();
                
                osc.connect(filter);
                filter.connect(gain);
                gain.connect(ctx.destination);
                
                osc.type = sound.type;
                osc.frequency.setValueAtTime(sound.freq, now + sound.time);
                
                filter.type = 'highpass';
                filter.frequency.setValueAtTime(200, now + sound.time);
                
                gain.gain.setValueAtTime(0.1, now + sound.time);
                gain.gain.exponentialRampToValueAtTime(0.001, now + sound.time + 0.2);
                
                osc.start(now + sound.time);
                osc.stop(now + sound.time + 0.2);
            });
        } catch (error) {
            console.warn('Error creating cash register deluxe:', error);
        }
    }

    createPaymentFinale() {
        if (!this.audioContext) return;

        try {
            const ctx = this.audioContext;
            const now = ctx.currentTime;
            
            // Triumphant finale chord
            const finale = [392.00, 493.88, 587.33, 783.99]; // G4, B4, D5, G5
            
            finale.forEach((freq, index) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                const filter = ctx.createBiquadFilter();
                
                osc.connect(filter);
                filter.connect(gain);
                gain.connect(ctx.destination);
                
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now);
                osc.frequency.exponentialRampToValueAtTime(freq * 0.98, now + 1.0);
                
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(freq * 4, now);
                filter.Q.setValueAtTime(1, now);
                
                gain.gain.setValueAtTime(0.08, now + index * 0.03);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
                
                osc.start(now + index * 0.03);
                osc.stop(now + 1.2);
            });
        } catch (error) {
            console.warn('Error creating payment finale:', error);
        }
    }

    createPremiumReverbTail() {
        if (!this.audioContext) return;

        try {
            const ctx = this.audioContext;
            const now = ctx.currentTime;
            
            // Enhanced reverb tail with multiple layers
            const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5
            
            frequencies.forEach((freq, index) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                const filter = ctx.createBiquadFilter();
                
                osc.connect(filter);
                filter.connect(gain);
                gain.connect(ctx.destination);
                
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + index * 0.1);
                osc.frequency.exponentialRampToValueAtTime(freq * 0.5, now + 2.0);
                
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(3000, now + index * 0.1);
                filter.frequency.exponentialRampToValueAtTime(800, now + 2.0);
                filter.Q.setValueAtTime(2, now + index * 0.1);
                
                gain.gain.setValueAtTime(0.04, now + index * 0.1);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);
                
                osc.start(now + index * 0.1);
                osc.stop(now + 2.0);
            });
        } catch (error) {
            console.warn('Error creating premium reverb tail:', error);
        }
    }

    createMoneyCountingEffect() {
        if (!this.audioContext) return;

        try {
            const ctx = this.audioContext;
            const now = ctx.currentTime;
            
            // Simulate money counting with rapid coin sounds
            const coinFrequencies = [880, 1047, 1318, 1568, 1760]; // A5 to A6
            
            coinFrequencies.forEach((freq, index) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                const filter = ctx.createBiquadFilter();
                
                osc.connect(filter);
                filter.connect(gain);
                gain.connect(ctx.destination);
                
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, now + index * 0.08);
                
                filter.type = 'bandpass';
                filter.frequency.setValueAtTime(freq * 1.5, now + index * 0.08);
                filter.Q.setValueAtTime(3, now + index * 0.08);
                
                gain.gain.setValueAtTime(0.06, now + index * 0.08);
                gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.08 + 0.15);
                
                osc.start(now + index * 0.08);
                osc.stop(now + index * 0.08 + 0.15);
            });
        } catch (error) {
            console.warn('Error creating money counting effect:', error);
        }
    }

    playGPayTransactionSound() {
        if (!this.audioContext) return;

        try {
            const ctx = this.audioContext;
            const now = ctx.currentTime;
            
            // GPay-style transaction sound: Sharp initial ding followed by ascending tones
            // Initial sharp ding (like notification bell)
            const initialOsc = ctx.createOscillator();
            const initialGain = ctx.createGain();
            const initialFilter = ctx.createBiquadFilter();
            
            initialOsc.connect(initialFilter);
            initialFilter.connect(initialGain);
            initialGain.connect(ctx.destination);
            
            initialOsc.type = 'sine';
            initialOsc.frequency.setValueAtTime(1047, now); // C6 - bright and clear
            initialOsc.frequency.exponentialRampToValueAtTime(880, now + 0.1); // A5
            
            initialFilter.type = 'highpass';
            initialFilter.frequency.setValueAtTime(500, now);
            initialFilter.Q.setValueAtTime(1, now);
            
            initialGain.gain.setValueAtTime(0.15, now);
            initialGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
            
            initialOsc.start(now);
            initialOsc.stop(now + 0.15);
            
            // Quick ascending sequence (GPay characteristic)
            const ascendingFreqs = [659.25, 783.99, 1046.5]; // E5, G5, C6
            ascendingFreqs.forEach((freq, index) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                const filter = ctx.createBiquadFilter();
                
                osc.connect(filter);
                filter.connect(gain);
                gain.connect(ctx.destination);
                
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, now + 0.1 + index * 0.06);
                
                filter.type = 'bandpass';
                filter.frequency.setValueAtTime(freq * 1.5, now + 0.1 + index * 0.06);
                filter.Q.setValueAtTime(4, now + 0.1 + index * 0.06);
                
                gain.gain.setValueAtTime(0.08, now + 0.1 + index * 0.06);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1 + index * 0.06 + 0.12);
                
                osc.start(now + 0.1 + index * 0.06);
                osc.stop(now + 0.1 + index * 0.06 + 0.12);
            });
            
            console.log('GPay-style transaction sound played');
        } catch (error) {
            console.warn('Error playing GPay transaction sound:', error);
        }
    }

    createPaymentSuccessChime() {
        if (!this.audioContext) return;

        try {
            const ctx = this.audioContext;
            const now = ctx.currentTime;
            
            // Success confirmation chime (like UPI success)
            const successFreqs = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 major chord
            
            successFreqs.forEach((freq, index) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                const filter = ctx.createBiquadFilter();
                
                osc.connect(filter);
                filter.connect(gain);
                gain.connect(ctx.destination);
                
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + index * 0.03);
                osc.frequency.exponentialRampToValueAtTime(freq * 0.99, now + index * 0.03 + 0.8);
                
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(freq * 3, now + index * 0.03);
                filter.Q.setValueAtTime(2, now + index * 0.03);
                
                gain.gain.setValueAtTime(0.06, now + index * 0.03);
                gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.03 + 0.8);
                
                osc.start(now + index * 0.03);
                osc.stop(now + index * 0.03 + 0.8);
            });
            
            console.log('Payment success chime created');
        } catch (error) {
            console.warn('Error creating payment success chime:', error);
        }
    }

    createTransactionConfirmation() {
        if (!this.audioContext) return;

        try {
            const ctx = this.audioContext;
            const now = ctx.currentTime;
            
            // Final transaction confirmation tone (subtle and professional)
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const filter = ctx.createBiquadFilter();
            
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, now); // A5
            osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.3); // E5
            
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(2000, now);
            filter.frequency.exponentialRampToValueAtTime(800, now + 0.4);
            filter.Q.setValueAtTime(1.5, now);
            
            gain.gain.setValueAtTime(0.04, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
            
            osc.start(now);
            osc.stop(now + 0.4);
            
            console.log('Transaction confirmation tone created');
        } catch (error) {
            console.warn('Error creating transaction confirmation:', error);
        }
    }

    setDatabase(db) {
        this.db = db;
    }



    // Ultra-realistic banking transaction sound
    playBankingTransactionSound() {
        if (!this.audioContext) return;

        try {
            const ctx = this.audioContext;
            const now = ctx.currentTime;
            
            // Create authentic banking transaction initiation sound
            const masterGain = ctx.createGain();
            const compressor = ctx.createDynamicsCompressor();
            masterGain.connect(compressor);
            compressor.connect(ctx.destination);
            masterGain.gain.setValueAtTime(0.6, now);
            
            // Banking system "beep" - like card reader acknowledgment
            const bankBeep = ctx.createOscillator();
            const beepGain = ctx.createGain();
            const beepFilter = ctx.createBiquadFilter();
            
            bankBeep.connect(beepFilter);
            beepFilter.connect(beepGain);
            beepGain.connect(masterGain);
            
            bankBeep.type = 'square';
            bankBeep.frequency.setValueAtTime(880, now); // A5 - banking standard
            
            beepFilter.type = 'lowpass';
            beepFilter.frequency.setValueAtTime(2000, now);
            beepFilter.Q.setValueAtTime(5, now);
            
            beepGain.gain.setValueAtTime(0.8, now);
            beepGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            
            bankBeep.start(now);
            bankBeep.stop(now + 0.1);
            
            console.log('Banking transaction sound initiated');
        } catch (error) {
            console.warn('Error playing banking transaction sound:', error);
        }
    }

    createCardProcessingSound() {
        if (!this.audioContext) return;

        try {
            const ctx = this.audioContext;
            const now = ctx.currentTime;
            
            // Card processing "swipe" sound with electronic processing noise
            const processingFreqs = [
                { freq: 1200, time: 0, duration: 0.05, volume: 0.3 },
                { freq: 800, time: 0.02, duration: 0.08, volume: 0.4 },
                { freq: 600, time: 0.06, duration: 0.06, volume: 0.3 },
            ];
            
            processingFreqs.forEach(sound => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                const filter = ctx.createBiquadFilter();
                const noise = ctx.createBufferSource();
                
                // Create white noise for processing effect
                const bufferSize = ctx.sampleRate * 0.1;
                const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    data[i] = (Math.random() * 2 - 1) * 0.1;
                }
                noise.buffer = buffer;
                
                osc.connect(filter);
                filter.connect(gain);
                noise.connect(gain);
                gain.connect(ctx.destination);
                
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(sound.freq, now + sound.time);
                
                filter.type = 'bandpass';
                filter.frequency.setValueAtTime(sound.freq, now + sound.time);
                filter.Q.setValueAtTime(10, now + sound.time);
                
                gain.gain.setValueAtTime(sound.volume, now + sound.time);
                gain.gain.exponentialRampToValueAtTime(0.01, now + sound.time + sound.duration);
                
                osc.start(now + sound.time);
                osc.stop(now + sound.time + sound.duration);
                noise.start(now + sound.time);
                noise.stop(now + sound.time + sound.duration);
            });
            
            console.log('Card processing sound played');
        } catch (error) {
            console.warn('Error playing card processing sound:', error);
        }
    }

    createCashRegisterKaching() {
        if (!this.audioContext) return;

        try {
            const ctx = this.audioContext;
            const now = ctx.currentTime;
            
            // Authentic cash register "ka-ching" sound with mechanical elements
            const masterGain = ctx.createGain();
            masterGain.connect(ctx.destination);
            masterGain.gain.setValueAtTime(0.5, now);
            
            // Mechanical "ka" - drawer opening sound
            const kaOsc = ctx.createOscillator();
            const kaGain = ctx.createGain();
            const kaFilter = ctx.createBiquadFilter();
            
            kaOsc.connect(kaFilter);
            kaFilter.connect(kaGain);
            kaGain.connect(masterGain);
            
            kaOsc.type = 'square';
            kaOsc.frequency.setValueAtTime(200, now);
            kaOsc.frequency.exponentialRampToValueAtTime(150, now + 0.1);
            
            kaFilter.type = 'highpass';
            kaFilter.frequency.setValueAtTime(100, now);
            
            kaGain.gain.setValueAtTime(0.3, now);
            kaGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            
            kaOsc.start(now);
            kaOsc.stop(now + 0.1);
            
            // Bell "ching" - classic cash register bell
            const chingFreqs = [1047, 1319, 1568]; // C6, E6, G6 - major chord
            chingFreqs.forEach((freq, index) => {
                const bellOsc = ctx.createOscillator();
                const bellGain = ctx.createGain();
                const bellFilter = ctx.createBiquadFilter();
                
                bellOsc.connect(bellFilter);
                bellFilter.connect(bellGain);
                bellGain.connect(masterGain);
                
                bellOsc.type = 'sine';
                bellOsc.frequency.setValueAtTime(freq, now + 0.1 + index * 0.02);
                
                bellFilter.type = 'bandpass';
                bellFilter.frequency.setValueAtTime(freq, now + 0.1 + index * 0.02);
                bellFilter.Q.setValueAtTime(8, now + 0.1 + index * 0.02);
                
                bellGain.gain.setValueAtTime(0.7, now + 0.1 + index * 0.02);
                bellGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1 + index * 0.02 + 0.8);
                
                bellOsc.start(now + 0.1 + index * 0.02);
                bellOsc.stop(now + 0.1 + index * 0.02 + 0.8);
            });
            
            console.log('Cash register ka-ching sound played');
        } catch (error) {
            console.warn('Error playing cash register ka-ching sound:', error);
        }
    }

    createDigitalPaymentConfirmation() {
        if (!this.audioContext) return;

        try {
            const ctx = this.audioContext;
            const now = ctx.currentTime;
            
            // Digital payment confirmation - like UPI/online banking success
            const confirmationChord = [
                { freq: 523.25, time: 0, duration: 0.3 },     // C5
                { freq: 659.25, time: 0.05, duration: 0.3 },  // E5
                { freq: 783.99, time: 0.1, duration: 0.3 },   // G5
                { freq: 1046.5, time: 0.15, duration: 0.4 }   // C6
            ];
            
            const masterGain = ctx.createGain();
            masterGain.connect(ctx.destination);
            masterGain.gain.setValueAtTime(0.4, now);
            
            confirmationChord.forEach(note => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                const filter = ctx.createBiquadFilter();
                
                osc.connect(filter);
                filter.connect(gain);
                gain.connect(masterGain);
                
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(note.freq, now + note.time);
                
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(note.freq * 2, now + note.time);
                filter.Q.setValueAtTime(3, now + note.time);
                
                gain.gain.setValueAtTime(0.6, now + note.time);
                gain.gain.exponentialRampToValueAtTime(0.01, now + note.time + note.duration);
                
                osc.start(now + note.time);
                osc.stop(now + note.time + note.duration);
            });
            
            console.log('Digital payment confirmation sound played');
        } catch (error) {
            console.warn('Error playing digital payment confirmation sound:', error);
        }
    }

    createATMReceiptSound() {
        if (!this.audioContext) return;

        try {
            const ctx = this.audioContext;
            const now = ctx.currentTime;
            
            // ATM receipt printing sound - mechanical whirring
            const receiptNoise = ctx.createBufferSource();
            const receiptGain = ctx.createGain();
            const receiptFilter = ctx.createBiquadFilter();
            
            // Create filtered white noise for receipt printing effect
            const bufferSize = ctx.sampleRate * 0.3;
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            
            for (let i = 0; i < bufferSize; i++) {
                // Create rhythmic printing pattern
                const pattern = Math.sin(i * 0.01) * 0.5 + 0.5;
                data[i] = (Math.random() * 2 - 1) * 0.2 * pattern;
            }
            
            receiptNoise.buffer = buffer;
            receiptNoise.connect(receiptFilter);
            receiptFilter.connect(receiptGain);
            receiptGain.connect(ctx.destination);
            
            receiptFilter.type = 'bandpass';
            receiptFilter.frequency.setValueAtTime(1500, now);
            receiptFilter.Q.setValueAtTime(5, now);
            
            receiptGain.gain.setValueAtTime(0.15, now);
            receiptGain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            
            receiptNoise.start(now);
            receiptNoise.stop(now + 0.3);
            
            console.log('ATM receipt sound played');
        } catch (error) {
            console.warn('Error playing ATM receipt sound:', error);
        }
    }

    createWealthySuccessFinale() {
        if (!this.audioContext) return;

        try {
            const ctx = this.audioContext;
            const now = ctx.currentTime;
            
            // Ultimate banking success finale - sophisticated and triumphant
            const masterGain = ctx.createGain();
            const compressor = ctx.createDynamicsCompressor();
            const delayNode = ctx.createDelay();
            const delayGain = ctx.createGain();
            
            masterGain.connect(compressor);
            masterGain.connect(delayNode);
            delayNode.connect(delayGain);
            delayGain.connect(ctx.destination);
            compressor.connect(ctx.destination);
            
            delayNode.delayTime.setValueAtTime(0.15, now);
            delayGain.gain.setValueAtTime(0.2, now);
            masterGain.gain.setValueAtTime(0.3, now);
            
            // Banking success chord progression - C Major to F Major
            const progression = [
                // C Major chord
                { freqs: [261.63, 329.63, 392.00], time: 0, duration: 0.6 },
                // F Major chord  
                { freqs: [349.23, 440.00, 523.25], time: 0.3, duration: 0.6 },
                // Final triumph - high C major
                { freqs: [523.25, 659.25, 783.99], time: 0.6, duration: 1.0 }
            ];
            
            progression.forEach(chord => {
                chord.freqs.forEach((freq, index) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    const filter = ctx.createBiquadFilter();
                    
                    osc.connect(filter);
                    filter.connect(gain);
                    gain.connect(masterGain);
                    
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(freq, now + chord.time);
                    
                    filter.type = 'lowpass';
                    filter.frequency.setValueAtTime(freq * 3, now + chord.time);
                    filter.Q.setValueAtTime(2, now + chord.time);
                    
                    gain.gain.setValueAtTime(0.3, now + chord.time + index * 0.01);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + chord.time + chord.duration);
                    
                    osc.start(now + chord.time + index * 0.01);
                    osc.stop(now + chord.time + chord.duration);
                });
            });
            
            // Add sparkle effect at the end
            setTimeout(() => {
                const sparkleFreqs = [1760, 2093, 2637]; // High frequency sparkles
                sparkleFreqs.forEach((freq, index) => {
                    const sparkle = ctx.createOscillator();
                    const sparkleGain = ctx.createGain();
                    
                    sparkle.connect(sparkleGain);
                    sparkleGain.connect(ctx.destination);
                    
                    sparkle.type = 'sine';
                    sparkle.frequency.setValueAtTime(freq, now + 1.2 + index * 0.05);
                    
                    sparkleGain.gain.setValueAtTime(0.2, now + 1.2 + index * 0.05);
                    sparkleGain.gain.exponentialRampToValueAtTime(0.01, now + 1.2 + index * 0.05 + 0.3);
                    
                    sparkle.start(now + 1.2 + index * 0.05);
                    sparkle.stop(now + 1.2 + index * 0.05 + 0.3);
                });
            }, 10);
            
            console.log('Wealthy success finale played');
        } catch (error) {
            console.warn('Error playing wealthy success finale:', error);
        }
    }

    // NEW IMPROVED PAYMENT SOUNDS

    createModernPaymentChime() {
        if (!this.audioContext) return;

        try {
            const ctx = this.audioContext;
            const now = ctx.currentTime;
            
            // Modern digital payment chime - clean and satisfying
            const masterGain = ctx.createGain();
            masterGain.connect(ctx.destination);
            masterGain.gain.setValueAtTime(0.6, now);
            
            // Digital chime frequencies (pleasant major pentatonic)
            const frequencies = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
            
            frequencies.forEach((freq, index) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                const filter = ctx.createBiquadFilter();
                
                osc.connect(filter);
                filter.connect(gain);
                gain.connect(masterGain);
                
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + index * 0.08);
                
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(2000, now);
                
                gain.gain.setValueAtTime(0.4, now + index * 0.08);
                gain.gain.exponentialRampToValueAtTime(0.01, now + index * 0.08 + 0.6);
                
                osc.start(now + index * 0.08);
                osc.stop(now + index * 0.08 + 0.6);
            });
            
            console.log('Modern payment chime played');
        } catch (error) {
            console.warn('Error creating modern payment chime:', error);
        }
    }

    createImprovedCashRegister() {
        if (!this.audioContext) return;

        try {
            const ctx = this.audioContext;
            const now = ctx.currentTime;
            
            // Improved cash register ka-ching - shorter and sweeter
            const masterGain = ctx.createGain();
            masterGain.connect(ctx.destination);
            masterGain.gain.setValueAtTime(0.5, now);
            
            // Quick "ka" sound
            const kaOsc = ctx.createOscillator();
            const kaGain = ctx.createGain();
            
            kaOsc.connect(kaGain);
            kaGain.connect(masterGain);
            
            kaOsc.type = 'square';
            kaOsc.frequency.setValueAtTime(180, now);
            kaOsc.frequency.linearRampToValueAtTime(120, now + 0.06);
            
            kaGain.gain.setValueAtTime(0.3, now);
            kaGain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);
            
            kaOsc.start(now);
            kaOsc.stop(now + 0.06);
            
            // Sweet "ching" bell
            const chingOsc = ctx.createOscillator();
            const chingGain = ctx.createGain();
            
            chingOsc.connect(chingGain);
            chingGain.connect(masterGain);
            
            chingOsc.type = 'sine';
            chingOsc.frequency.setValueAtTime(1320, now + 0.08);
            
            chingGain.gain.setValueAtTime(0.6, now + 0.08);
            chingGain.gain.exponentialRampToValueAtTime(0.01, now + 0.08 + 0.4);
            
            chingOsc.start(now + 0.08);
            chingOsc.stop(now + 0.08 + 0.4);
            
            console.log('Improved cash register sound played');
        } catch (error) {
            console.warn('Error creating improved cash register sound:', error);
        }
    }

    createSuccessConfirmation() {
        if (!this.audioContext) return;

        try {
            const ctx = this.audioContext;
            const now = ctx.currentTime;
            
            // Success confirmation chord - satisfying and complete
            const masterGain = ctx.createGain();
            masterGain.connect(ctx.destination);
            masterGain.gain.setValueAtTime(0.4, now);
            
            // Perfect major chord (C-E-G)
            const chord = [523.25, 659.25, 783.99]; // C5, E5, G5
            
            chord.forEach((freq, index) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                
                osc.connect(gain);
                gain.connect(masterGain);
                
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now);
                
                gain.gain.setValueAtTime(0.3, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
                
                osc.start(now);
                osc.stop(now + 0.8);
            });
            
            console.log('Success confirmation played');
        } catch (error) {
            console.warn('Error creating success confirmation:', error);
        }
    }
}

window.NotificationManager = NotificationManager;
console.log('[DEBUG] NotificationManager exported to window:', window.NotificationManager);

const style = document.createElement('style');
style.textContent = `
@keyframes slideInRight {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

@keyframes slideOutRight {
    from {
        transform: translateX(0);
        opacity: 1;
    }
    to {
        transform: translateX(100%);
        opacity: 0;
    }
}

@keyframes bounceIn {
    0% {
        transform: scale(0.3);
        opacity: 0;
    }
    50% {
        transform: scale(1.05);
    }
    70% {
        transform: scale(0.9);
    }
    100% {
        transform: scale(1);
        opacity: 1;
    }
}

.toast {
    animation: slideInRight 0.3s ease-out;
}

.modal-content {
    animation: bounceIn 0.6s ease-out;
}
`;
document.head.appendChild(style);

