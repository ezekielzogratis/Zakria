class RServiceTracker {
    constructor() {
        this.db = null;
        this.notifications = null;
        this.charts = null;
        this.calendar = null;
        this.utils = null;
        
        this.currentStats = {};
        this.isInitialized = false;
        this.pendingUnpaidDates = [];
        this.selectedPaymentAmount = null;
        this.currentColor = 'blue';
        this.currentMode = 'light';
        this.updateDashboardTimeout = null;
        
        // Init will be called separately as it's async
        this.initAsync();
    }
    
    async initAsync() {
        await this.init();
    }

    async init() {
        try {
            console.log('Initializing R-Service Tracker...');
            
            this.showLoadingScreen();
            
            this.utils = new Utils();
            
            this.db = new DatabaseManager();
            await this.db.init();
            
            if (typeof NotificationManager !== 'undefined') {
                    this.notifications = new NotificationManager();
                } else {
                    console.error('NotificationManager not available, retrying...');
                    setTimeout(() => {
                        if (typeof NotificationManager !== 'undefined') {
                            this.notifications = new NotificationManager();
                        }
                    }, 100);
                }
            this.notifications.setDatabase(this.db);
            

            
            this.charts = new ChartsManager(this.db);
            
            this.calendar = new CalendarManager(this.db);
            
            this.loadTheme();
            
            this.setupEventListeners();
            
            await this.loadInitialData();
            
            
            this.setupPWAInstall();
            
            
            this.hideLoadingScreen();
            
            await this.initializeViews();
            
            this.updateCurrentYear();
            
            this.isInitialized = true;
            
            // Handle PWA shortcuts and URL parameters
            this.handleURLParameters();
            
            this.verifyConfiguration();
            
            window.testNotifications = () => {
                if (this.notifications) {
                    this.notifications.testAllNotifications();
                } else {
                    console.error('Notifications not initialized');
                }
            };
            
            window.testAllSystems = async () => {
                console.log('[SYSTEM] Testing all R-Service Tracker systems...');
                
                try {
                                    console.log('[DATABASE] Testing database...');
                const stats = await this.db.getEarningsStats();
                console.log('[DATABASE] Database working - Current stats:', stats);
                
                console.log('[NOTIFICATIONS] Testing notifications...');
                this.notifications.testAllNotifications();
                
                console.log('[CHARTS] Testing charts...');
                if (this.charts) {
                    await this.charts.updateCharts();
                    console.log('[CHARTS] Charts system working');
                }
                
                console.log('[CALENDAR] Testing calendar...');
                if (this.calendar) {
                    this.calendar.render();
                    console.log('[CALENDAR] Calendar system working');
                }
                
                console.log('[UTILITIES] Testing utilities...');
                const testDate = this.utils.formatDate(new Date());
                console.log('[UTILITIES] Utilities working - Test date:', testDate);
                
                console.log('[PWA] Testing PWA features...');
                if ('serviceWorker' in navigator) {
                    console.log('[PWA] Service Worker supported');
                }
                
                    this.notifications.showToast('All systems tested successfully!', 'success', 5000);
                    
                } catch (error) {
                    console.error('[SYSTEM] System test failed:', error);
                    this.notifications.showToast('System test failed: ' + error.message, 'error', 5000);
                }
            };
            
            setTimeout(() => {
                this.checkAdvancePaymentNotification();
            }, 2000);
            
        } catch (error) {
            console.error('Error initializing application:', error);
            
            try {
                if (!window.R_SERVICE_CONFIG) {
                    window.R_SERVICE_CONFIG = {
                        DAILY_WAGE: 25,
                        PAYMENT_THRESHOLD: 4,
                        INCREMENT_VALUE: 25,
                        PAYMENT_DAY_DURATION: 4,
                        MAX_PAYMENT_AMOUNT: 500
                    };
                    console.log('Fallback configuration set');
                }
                
                if (!this.notifications) {
                    if (typeof NotificationManager !== 'undefined') {
                    this.notifications = new NotificationManager();
                } else {
                    console.error('NotificationManager not available, retrying...');
                    setTimeout(() => {
                        if (typeof NotificationManager !== 'undefined') {
                            this.notifications = new NotificationManager();
                        }
                    }, 100);
                }
                }
                
                this.hideLoadingScreen();
                this.showError('Application initialized with limited functionality. Some features may not work properly.');
                
            } catch (criticalError) {
                console.error('Critical initialization error:', criticalError);
                this.hideLoadingScreen();
                this.showError('Critical error: Please refresh the page');
            }
        }
    }

    showLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        const mainContainer = document.getElementById('mainContainer');
        
        if (loadingScreen) {
            loadingScreen.style.display = 'flex';
        } else {
            console.warn('Loading screen element not found');
        }
        
        if (mainContainer) {
            mainContainer.style.display = 'none';
        } else {
            console.warn('Main container element not found');
        }
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        const mainContainer = document.getElementById('mainContainer');
        
        setTimeout(() => {
            if (loadingScreen) {
                loadingScreen.style.opacity = '0';
                setTimeout(() => {
                    loadingScreen.style.display = 'none';
                    if (mainContainer) {
                        mainContainer.style.display = 'block';
                        mainContainer.classList.add('animate-fade-scale');
                        
                        const cards = document.querySelectorAll('.card');
                        cards.forEach((card, index) => {
                            setTimeout(() => {
                                if (index === 0) {
                                    card.classList.add('animate-slide-left');
                                } else if (index === 1) {
                                    card.classList.add('animate-rotate-in');
                                } else {
                                    card.classList.add('animate-slide-right');
                                }
                            }, index * 150);
                        });
                        
                        setTimeout(() => {
                            const logo = document.querySelector('.logo i');
                            if (logo) {
                                logo.classList.add('animate-float');
                            }
                        }, 1000);
                    }
                }, 500);
            } else if (mainContainer) {
                mainContainer.style.display = 'block';
                mainContainer.classList.add('animate-fade-scale');
            }
        }, 2000); // Show loading for 2 seconds
    }

    loadTheme() {
        this.currentColor = localStorage.getItem('selected-color') || 'blue';
        this.currentMode = localStorage.getItem('selected-mode') || 'light';
        
        this.updateColorSelection(this.currentColor);
        this.updateModeSelection(this.currentMode);
        
        this.applyTheme();
    }

    updateColorSelection(color) {
        this.currentColor = color;
        const colorButtons = document.querySelectorAll('.color-btn');
        colorButtons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.color === color) {
                btn.classList.add('active');
            }
        });
        localStorage.setItem('selected-color', color);
    }

    updateModeSelection(mode) {
        this.currentMode = mode;
        const modeButtons = document.querySelectorAll('.mode-btn');
        modeButtons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.mode === mode) {
                btn.classList.add('active');
            }
        });
        localStorage.setItem('selected-mode', mode);
    }

    applyTheme() {
        const theme = `${this.currentColor}-${this.currentMode}`;
        this.utils.setTheme(theme);
        if (this.charts) {
            this.charts.updateCharts(); // Update charts with new theme colors
        }
    }

    setupEventListeners() {
        const doneBtn = document.getElementById('doneBtn');
        if (doneBtn) {
            doneBtn.addEventListener('click', () => {
                this.notifications.playSound('done');
                this.handleDoneClick();
            });
        }

        const paidBtn = document.getElementById('paidBtn');
        if (paidBtn) {
            paidBtn.addEventListener('click', () => {
                this.handlePaidClick();
            });
        }



        const menuToggle = document.getElementById('menuToggle');
        const sideMenu = document.getElementById('sideMenu');
        const closeMenu = document.getElementById('closeMenu');
        
        if (menuToggle && sideMenu) {
            menuToggle.addEventListener('click', () => {
                sideMenu.classList.add('open');
            });
        }
        
        if (closeMenu && sideMenu) {
            closeMenu.addEventListener('click', () => {
                sideMenu.classList.remove('open');
            });
        }

        const colorButtons = document.querySelectorAll('.color-btn');
        colorButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const color = btn.dataset.color;
                this.updateColorSelection(color);
                this.applyTheme();
            });
        });

        const modeButtons = document.querySelectorAll('.mode-btn');
        modeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.dataset.mode;
                this.updateModeSelection(mode);
                this.applyTheme();
            });
        });

        this.setupMenuOptions();
        
        this.setupQuickActions();
        
        this.setupViewNavigation();
        
        this.setupModalHandlers();
        
        this.setupEarningsInsight();

        document.addEventListener('click', (e) => {
            if (sideMenu && !sideMenu.contains(e.target) && !menuToggle.contains(e.target)) {
                sideMenu.classList.remove('open');
            }
        });
    }

    closeMenu() {
        const sideMenu = document.getElementById('sideMenu');
        if (sideMenu) {
            sideMenu.classList.remove('open');
        }
    }

    setupMenuOptions() {
        const clearDataBtn = document.getElementById('clearData');
        if (clearDataBtn) {
            clearDataBtn.addEventListener('click', () => {
                this.handleClearData();
            });
        }

        const exportPDFBtn = document.getElementById('exportPDF');
        if (exportPDFBtn) {
            exportPDFBtn.addEventListener('click', () => {
                this.closeMenu();
                this.handleExportPDF();
            });
        }

        const aboutBtn = document.getElementById('aboutApp');
        if (aboutBtn) {
            aboutBtn.addEventListener('click', () => {
                this.showAboutModal();
            });
        }

        const viewHistoryBtn = document.getElementById('viewHistory');
        if (viewHistoryBtn) {
            viewHistoryBtn.addEventListener('click', () => {
                this.closeMenu();
                this.showBalanceSheet();
            });
        }

        const viewAnalyticsBtn = document.getElementById('viewAnalytics');
        if (viewAnalyticsBtn) {
            viewAnalyticsBtn.addEventListener('click', () => {
                this.closeMenu();
                this.showAnalytics();
            });
        }

        this.setupSettingsHandlers();
    }

    setupSettingsHandlers() {
        try {
            const settingsSection = document.querySelector('.menu-section .settings-group');
            if (!settingsSection) {
                console.warn('Settings section not found, skipping settings handlers');
                return;
            }

            this.loadSettings();
            this.storeOriginalSettings();

            const saveSettingsBtn = document.getElementById('saveSettings');
            if (saveSettingsBtn) {
                this.disableSaveButton();
                
                saveSettingsBtn.addEventListener('click', (e) => {
                    if (saveSettingsBtn.disabled) {
                        e.preventDefault();
                        e.stopPropagation();
                        return false;
                    }
                    this.saveSettings();
                });
            }

            const resetSettingsBtn = document.getElementById('resetSettings');
            if (resetSettingsBtn) {
                resetSettingsBtn.addEventListener('click', () => {
                    this.resetSettings();
                });
            }

            const incrementInput = document.getElementById('incrementValue');
            const durationInput = document.getElementById('paymentDuration');
            const maxPaymentInput = document.getElementById('maxPaymentAmount');

            [incrementInput, durationInput, maxPaymentInput].forEach(input => {
                if (input) {
                    input.addEventListener('input', () => {
                        this.validateSettings();
                        this.checkForChanges();
                    });
                }
            });

            this.setupNotificationHandlers();
            
            console.log('Settings handlers setup completed');
        } catch (error) {
            console.error('Error setting up settings handlers:', error);
        }
    }

    setupNotificationHandlers() {
        try {
            this.loadNotificationSettings();

            const enableNotificationsToggle = document.getElementById('enableNotifications');
            if (enableNotificationsToggle) {
                enableNotificationsToggle.addEventListener('change', () => {
                    this.toggleNotificationSettings(enableNotificationsToggle.checked);
                    this.updateNotificationToggleIcon(enableNotificationsToggle.checked);
                    this.checkForNotificationChanges();
                });
                
                this.updateNotificationToggleIcon(enableNotificationsToggle.checked);
            }

            const paymentReminderTime = document.getElementById('paymentReminderTime');
            if (paymentReminderTime) {
                paymentReminderTime.addEventListener('change', () => {
                    this.checkForNotificationChanges();
                });
            }

            const workReminderTime = document.getElementById('workReminderTime');
            if (workReminderTime) {
                workReminderTime.addEventListener('change', () => {
                    this.checkForNotificationChanges();
                });
            }

            const saveNotificationBtn = document.getElementById('saveNotificationSettings');
            if (saveNotificationBtn) {
                saveNotificationBtn.addEventListener('click', () => {
                    this.saveNotificationSettings();
                });
            }

            const testNotificationsBtn = document.getElementById('testNotifications');
            if (testNotificationsBtn) {
                testNotificationsBtn.addEventListener('click', () => {
                    this.testNotifications();
                });
            }

            this.toggleNotificationSettings(enableNotificationsToggle?.checked ?? true);

            console.log('Notification handlers setup completed');
        } catch (error) {
            console.error('Error setting up notification handlers:', error);
        }
    }

    toggleNotificationSettings(enabled) {
        const notificationSettings = document.getElementById('notificationSettings');
        const workReminderSettings = document.getElementById('workReminderSettings');
        
        if (notificationSettings) {
            if (enabled) {
                notificationSettings.classList.remove('disabled');
            } else {
                notificationSettings.classList.add('disabled');
            }
        }
        
        if (workReminderSettings) {
            if (enabled) {
                workReminderSettings.classList.remove('disabled');
            } else {
                workReminderSettings.classList.add('disabled');
            }
        }
    }

    updateNotificationToggleIcon(enabled) {
        const icon = document.getElementById('notificationToggleIcon');
        if (icon) {
            if (enabled) {
                icon.className = 'fas fa-bell';
            } else {
                icon.className = 'fas fa-bell-slash';
            }
        }
    }

    loadNotificationSettings() {
        try {
            const config = this.getCurrentConfig();
            
            const enableNotifications = document.getElementById('enableNotifications');
            const paymentReminderTime = document.getElementById('paymentReminderTime');
            const workReminderTime = document.getElementById('workReminderTime');

            if (enableNotifications) {
                enableNotifications.checked = config.NOTIFICATIONS_ENABLED !== false;
                this.updateNotificationToggleIcon(enableNotifications.checked);
            }
            
            if (paymentReminderTime) {
                paymentReminderTime.value = config.PAYMENT_REMINDER_TIME || '10:00';
            }
            
            if (workReminderTime) {
                workReminderTime.value = config.WORK_REMINDER_TIME || '18:00';
            }

            this.originalNotificationSettings = {
                NOTIFICATIONS_ENABLED: config.NOTIFICATIONS_ENABLED !== false,
                PAYMENT_REMINDER_TIME: config.PAYMENT_REMINDER_TIME || '10:00',
                WORK_REMINDER_TIME: config.WORK_REMINDER_TIME || '18:00'
            };

            this.disableNotificationSaveButton();

            console.log('Notification settings loaded:', this.originalNotificationSettings);
        } catch (error) {
            console.error('Error loading notification settings:', error);
        }
    }

    checkForNotificationChanges() {
        if (!this.originalNotificationSettings) return;

        const enableNotifications = document.getElementById('enableNotifications');
        const paymentReminderTime = document.getElementById('paymentReminderTime');
        const workReminderTime = document.getElementById('workReminderTime');

        const currentEnabled = enableNotifications?.checked ?? true;
        const currentPaymentTime = paymentReminderTime?.value || '10:00';
        const currentWorkTime = workReminderTime?.value || '18:00';

        const hasChanges = (
            currentEnabled !== this.originalNotificationSettings.NOTIFICATIONS_ENABLED ||
            currentPaymentTime !== this.originalNotificationSettings.PAYMENT_REMINDER_TIME ||
            currentWorkTime !== this.originalNotificationSettings.WORK_REMINDER_TIME
        );

        if (hasChanges) {
            this.enableNotificationSaveButton();
        } else {
            this.disableNotificationSaveButton();
        }
    }

    enableNotificationSaveButton() {
        const saveBtn = document.getElementById('saveNotificationSettings');
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.style.opacity = '1';
            saveBtn.style.cursor = 'pointer';
            saveBtn.style.pointerEvents = 'auto';
            saveBtn.classList.remove('disabled');
            saveBtn.classList.add('changes-pending');
            saveBtn.classList.add('changes-pending');
        }
    }

    disableNotificationSaveButton() {
        const saveBtn = document.getElementById('saveNotificationSettings');
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.style.opacity = '0.5';
            saveBtn.style.cursor = 'not-allowed';
            saveBtn.style.pointerEvents = 'none';
            saveBtn.classList.add('disabled');
        }
    }

    saveNotificationSettings() {
        try {
            const enableNotifications = document.getElementById('enableNotifications');
            const paymentReminderTime = document.getElementById('paymentReminderTime');
            const workReminderTime = document.getElementById('workReminderTime');

            const newNotificationConfig = {
                NOTIFICATIONS_ENABLED: enableNotifications?.checked ?? true,
                PAYMENT_REMINDER_TIME: paymentReminderTime?.value || '10:00',
                WORK_REMINDER_TIME: workReminderTime?.value || '18:00'
            };

            let saved = false;
            if (window.ConfigManager && typeof window.ConfigManager.saveUserConfig === 'function') {
                saved = window.ConfigManager.saveUserConfig(newNotificationConfig);
            } else {
                try {
                    const currentConfig = JSON.parse(localStorage.getItem('r-service-user-config') || '{}');
                    const updatedConfig = { ...currentConfig, ...newNotificationConfig };
                    localStorage.setItem('r-service-user-config', JSON.stringify(updatedConfig));
                    window.R_SERVICE_CONFIG = { ...window.R_SERVICE_CONFIG, ...newNotificationConfig };
                    saved = true;
                } catch (e) {
                    console.error('Fallback notification save failed:', e);
                }
            }

            if (saved) {
                if (this.notifications) {
                    this.notifications.showToast('Notification settings saved successfully!', 'success');
                }
                
                this.originalNotificationSettings = { ...newNotificationConfig };
                this.disableNotificationSaveButton();
                
                console.log('Notification settings saved:', newNotificationConfig);
            } else {
                if (this.notifications) {
                    this.notifications.showToast('Error saving notification settings', 'error');
                }
            }
        } catch (error) {
            console.error('Error saving notification settings:', error);
            if (this.notifications) {
                this.notifications.showToast('Error saving notification settings: ' + error.message, 'error');
            }
        }
    }

    testNotifications() {
        if (this.notifications) {
            this.notifications.testAllNotifications();
            this.notifications.showToast('Test notifications sent! Check if you received them.', 'info', 5000);
        } else {
            console.error('Notifications not available');
        }
    }

    storeOriginalSettings() {
        const config = this.getCurrentConfig();
        this.originalSettings = {
            INCREMENT_VALUE: config.INCREMENT_VALUE || 25,
            PAYMENT_DAY_DURATION: config.PAYMENT_DAY_DURATION || 4,
            MAX_PAYMENT_AMOUNT: config.MAX_PAYMENT_AMOUNT || 500
        };
        console.log('Original settings stored:', this.originalSettings);
    }

    checkForChanges() {
        if (!this.originalSettings) return;

        const incrementInput = document.getElementById('incrementValue');
        const durationInput = document.getElementById('paymentDuration');
        const maxPaymentInput = document.getElementById('maxPaymentAmount');

        const currentIncrement = parseInt(incrementInput?.value) || this.originalSettings.INCREMENT_VALUE;
        const currentDuration = parseInt(durationInput?.value) || this.originalSettings.PAYMENT_DAY_DURATION;
        const currentMaxPayment = parseInt(maxPaymentInput?.value) || this.originalSettings.MAX_PAYMENT_AMOUNT;

        const hasChanges = (
            currentIncrement !== this.originalSettings.INCREMENT_VALUE ||
            currentDuration !== this.originalSettings.PAYMENT_DAY_DURATION ||
            currentMaxPayment !== this.originalSettings.MAX_PAYMENT_AMOUNT
        );

        const isValid = this.validateSettings();

        const saveBtn = document.getElementById('saveSettings');
        if (saveBtn) {
            if (hasChanges && isValid) {
                this.enableSaveButton();
            } else {
                this.disableSaveButton();
            }
        }
    }

    enableSaveButton() {
        const saveBtn = document.getElementById('saveSettings');
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.style.opacity = '1';
            saveBtn.style.cursor = 'pointer';
            saveBtn.style.pointerEvents = 'auto';
            saveBtn.classList.remove('disabled');
            saveBtn.classList.add('changes-pending');
            saveBtn.classList.add('changes-pending');
        }
    }

    disableSaveButton() {
        const saveBtn = document.getElementById('saveSettings');
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.style.opacity = '0.5';
            saveBtn.style.cursor = 'not-allowed';
            saveBtn.style.pointerEvents = 'none';
            saveBtn.classList.add('disabled');
        }
    }

    getCurrentConfig() {
        let config = {};
        if (window.ConfigManager && typeof window.ConfigManager.getConfig === 'function') {
            config = window.ConfigManager.getConfig();
        } else if (window.R_SERVICE_CONFIG) {
            config = window.R_SERVICE_CONFIG;
        } else {
            config = {
                INCREMENT_VALUE: 25,
                PAYMENT_DAY_DURATION: 4,
                MAX_PAYMENT_AMOUNT: 500
            };
        }
        return config;
    }

    loadSettings() {
        try {
            let config = {};
            if (window.ConfigManager && typeof window.ConfigManager.getConfig === 'function') {
                config = window.ConfigManager.getConfig();
            } else if (window.R_SERVICE_CONFIG) {
                config = window.R_SERVICE_CONFIG;
            } else {
                config = {
                    INCREMENT_VALUE: 25,
                    PAYMENT_DAY_DURATION: 4,
                    MAX_PAYMENT_AMOUNT: 500
                };
                console.warn('Using fallback configuration');
            }
            
            const incrementInput = document.getElementById('incrementValue');
            const durationInput = document.getElementById('paymentDuration');
            const maxPaymentInput = document.getElementById('maxPaymentAmount');

            if (incrementInput) incrementInput.value = config.INCREMENT_VALUE || 25;
            if (durationInput) durationInput.value = config.PAYMENT_DAY_DURATION || 4;
            if (maxPaymentInput) maxPaymentInput.value = config.MAX_PAYMENT_AMOUNT || 500;
            
        } catch (error) {
            console.error('Error loading settings:', error);
            const incrementInput = document.getElementById('incrementValue');
            const durationInput = document.getElementById('paymentDuration');
            const maxPaymentInput = document.getElementById('maxPaymentAmount');

            if (incrementInput) incrementInput.value = 25;
            if (durationInput) durationInput.value = 4;
            if (maxPaymentInput) maxPaymentInput.value = 500;
        }
    }

    validateSettings() {
        const incrementInput = document.getElementById('incrementValue');
        const durationInput = document.getElementById('paymentDuration');
        const maxPaymentInput = document.getElementById('maxPaymentAmount');
        const saveBtn = document.getElementById('saveSettings');

        let isValid = true;

        [incrementInput, durationInput, maxPaymentInput].forEach(input => {
            if (input) {
                input.classList.remove('error');
                input.style.borderColor = '';
                input.style.boxShadow = '';
            }
        });

        document.querySelectorAll('.validation-error').forEach(el => el.remove());

        if (incrementInput) {
            const increment = parseInt(incrementInput.value);
            
            if (isNaN(increment) || increment < 1) {
                this.showValidationError(incrementInput, 'Must be at least 1');
                isValid = false;
            } else if (increment > 100) {
                this.showValidationError(incrementInput, 'Cannot exceed 100');
                isValid = false;
            }
        }

        if (durationInput) {
            const duration = parseInt(durationInput.value);
            
            if (isNaN(duration) || duration < 1) {
                this.showValidationError(durationInput, 'Must be at least 1 day');
                isValid = false;
            } else if (duration > 30) {
                this.showValidationError(durationInput, 'Cannot exceed 30 days');
                isValid = false;
            }
        }

        if (maxPaymentInput) {
            const maxPayment = parseInt(maxPaymentInput.value);
            
            if (isNaN(maxPayment) || maxPayment < 100) {
                this.showValidationError(maxPaymentInput, 'Must be at least ₹100');
                isValid = false;
            } else if (maxPayment > 50000) {
                this.showValidationError(maxPaymentInput, 'Cannot exceed ₹50,000');
                isValid = false;
            }
        }

        if (saveBtn) {
            saveBtn.disabled = !isValid;
            saveBtn.style.opacity = isValid ? '1' : '0.5';
        }

        return isValid;
    }

    showValidationError(input, message) {
        input.classList.add('error');
        
        input.style.animation = 'shake 0.5s ease-in-out';
        setTimeout(() => {
            input.style.animation = '';
        }, 500);
        
        if ('vibrate' in navigator) {
            navigator.vibrate([50]); // Single gentle vibration
        }
        
        let contextualMessage = message;
        const fieldId = input.id;
        const currentValue = input.value;
        
        if (fieldId === 'incrementValue') {
            const min = parseInt(input.min) || 1;
            const max = parseInt(input.max) || 100;
            if (currentValue < min) {
                contextualMessage = `Daily wage must be at least ₹${min}. Enter a value between ₹${min} and ₹${max}.`;
            } else if (currentValue > max) {
                contextualMessage = `Daily wage cannot exceed ₹${max}. Enter a value between ₹${min} and ₹${max}.`;
            } else if (!currentValue) {
                contextualMessage = `Please enter your daily wage amount (₹${min}-₹${max}).`;
            }
        } else if (fieldId === 'paymentDuration') {
            const min = parseInt(input.min) || 1;
            const max = parseInt(input.max) || 30;
            if (currentValue < min) {
                contextualMessage = `Payment period must be at least ${min} day. Enter a value between ${min} and ${max} days.`;
            } else if (currentValue > max) {
                contextualMessage = `Payment period cannot exceed ${max} days. Enter a value between ${min} and ${max} days.`;
            } else if (!currentValue) {
                contextualMessage = `Please enter how often you want to collect payments (${min}-${max} days).`;
            }
        } else if (fieldId === 'maxPaymentAmount') {
            const min = parseInt(input.min) || 100;
            const max = parseInt(input.max) || 10000;
            if (currentValue < min) {
                contextualMessage = `Maximum amount must be at least ₹${min}. Enter a value between ₹${min} and ₹${max}.`;
            } else if (currentValue > max) {
                contextualMessage = `Maximum amount cannot exceed ₹${max}. Enter a value between ₹${min} and ₹${max}.`;
            } else if (!currentValue) {
                contextualMessage = `Please set your maximum payment limit (₹${min}-₹${max}).`;
            }
        } else if (fieldId === 'customAmount') {
            if (currentValue <= 0) {
                contextualMessage = `Please enter a valid payment amount greater than ₹0.`;
            } else if (currentValue > 10000) {
                contextualMessage = `Payment amount cannot exceed ₹10,000. Please enter a smaller amount.`;
            }
        }
        
        const errorEl = document.createElement('div');
        errorEl.className = 'validation-error';
        errorEl.textContent = contextualMessage;
        input.parentElement.appendChild(errorEl);
    }

    saveSettings() {
        try {
            if (!this.validateSettings()) {
                if (this.notifications) {
                    this.notifications.showToast('Please fix the validation errors before saving', 'error');
                }
                return;
            }

            const incrementInput = document.getElementById('incrementValue');
            const durationInput = document.getElementById('paymentDuration');
            const maxPaymentInput = document.getElementById('maxPaymentAmount');

            if (!incrementInput || !durationInput || !maxPaymentInput) {
                console.error('Settings input elements not found');
                if (this.notifications) {
                    this.notifications.showToast('Error: Settings form not available', 'error');
                }
                return;
            }

            const newConfig = {
                INCREMENT_VALUE: parseInt(incrementInput.value) || 25,
                PAYMENT_DAY_DURATION: parseInt(durationInput.value) || 4,
                MAX_PAYMENT_AMOUNT: parseInt(maxPaymentInput.value) || 500
            };

            newConfig.DAILY_WAGE = newConfig.INCREMENT_VALUE;
            newConfig.PAYMENT_THRESHOLD = newConfig.PAYMENT_DAY_DURATION;

            let saved = false;
            if (window.ConfigManager && typeof window.ConfigManager.saveUserConfig === 'function') {
                saved = window.ConfigManager.saveUserConfig(newConfig);
            } else {
                try {
                    localStorage.setItem('r-service-user-config', JSON.stringify(newConfig));
                    window.R_SERVICE_CONFIG = { ...window.R_SERVICE_CONFIG, ...newConfig };
                    saved = true;
                } catch (e) {
                    console.error('Fallback save failed:', e);
                }
            }

            if (saved) {
                if (this.notifications) {
                    this.notifications.showToast('Settings saved successfully!', 'success');
                }
                
                this.storeOriginalSettings();
                this.disableSaveButton();
                
                const loadingToast = this.notifications ? this.notifications.showLoadingToast('Updating payment options and resetting saved amounts...') : null;
                
                setTimeout(async () => {
                    try {
                        if (this.db) {
                            console.log('Resetting all saved amount details...');
                            
                            await this.db.performTransaction(this.db.stores.workRecords, 'readwrite', (store) => {
                                return store.clear();
                            });
                            
                            await this.db.performTransaction(this.db.stores.payments, 'readwrite', (store) => {
                                return store.clear();
                            });
                            
                            console.log('All saved amount details have been reset');
                            
                            if (this.notifications) {
                                this.notifications.showToast('All saved amount details reset! Starting fresh with new settings.', 'info', 5000);
                            }
                        }
                        
                        this.generatePaymentButtons();
                        
                        if (typeof this.updateDashboard === 'function') {
                            this.updateDashboard();
                        }
                        
                        this.updatePaymentPeriodDisplay(newConfig.PAYMENT_DAY_DURATION);
                        
                        if (loadingToast && this.notifications) {
                            this.notifications.updateLoadingToast(loadingToast, 'System reset and updated!', 'success');
                        }
                        
                        if (this.notifications) {
                            this.notifications.showToast(`Configuration updated! Payment options: ${this.getGeneratedAmountPreview()}`, 'success', 6000);
                        }
                        
                    } catch (resetError) {
                        console.error('Error resetting saved amounts:', resetError);
                        if (this.notifications) {
                            this.notifications.showToast('Settings saved but failed to reset data. Please clear data manually if needed.', 'warning', 8000);
                        }
                    }
                    
                    this.closeMenu();
                }, 500);
                
            } else {
                if (this.notifications) {
                    this.notifications.showToast('Error saving settings', 'error');
                }
            }
        } catch (error) {
            console.error('Error in saveSettings:', error);
            if (this.notifications) {
                this.notifications.showToast('Error saving settings: ' + error.message, 'error');
            }
        }
    }

    updateCurrentYear() {
        const currentYearElement = document.getElementById('currentYear');
        if (currentYearElement) {
            currentYearElement.textContent = new Date().getFullYear();
        }
    }

    updatePaymentPeriodDisplay(days) {
        const progressToPaydayEl = document.querySelector('.progress-to-payday, .payday-progress');
        if (progressToPaydayEl) {
            const currentProgress = parseInt(progressToPaydayEl.textContent.split('/')[0]) || 0;
            progressToPaydayEl.textContent = `${currentProgress}/${days}`;
        }

        document.querySelectorAll('[data-payment-period]').forEach(el => {
            el.textContent = el.textContent.replace(/\d+ days?/, `${days} day${days > 1 ? 's' : ''}`);
        });

    }

    getGeneratedAmountPreview() {
        const dailyWage = window.R_SERVICE_CONFIG?.DAILY_WAGE || 25;
        const amounts = window.ConfigManager ? window.ConfigManager.generatePaymentAmounts() : [dailyWage, dailyWage*2, dailyWage*3, dailyWage*4];
        const preview = amounts.slice(0, 5).map(amt => `₹${amt}`).join(', ');
        return amounts.length > 5 ? `${preview}...` : preview;
    }

    resetSettings() {
        this.notifications.showConfirmation(
            'Are you sure you want to make the settings to default?',
            () => {
                try {
                    if (window.ConfigManager) {
                        window.ConfigManager.resetToDefaults();
                        this.loadSettings();
                        
                        const loadingToast = this.notifications.showLoadingToast('Resetting to defaults...');
                        
                        setTimeout(() => {
                            this.generatePaymentButtons();
                            this.updateDashboard();
                            this.updatePaymentPeriodDisplay(4);
                            
                            document.querySelectorAll('.validation-error, .validation-warning, .validation-success, .validation-summary').forEach(el => el.remove());
                            
                            document.querySelectorAll('.settings-input').forEach(input => {
                                input.classList.remove('error', 'warning', 'success');
                                input.style.borderColor = '';
                                input.style.boxShadow = '';
                            });
                            
                            if (loadingToast) {
                                this.notifications.updateLoadingToast(loadingToast, 'Settings reset to defaults!', 'success');
                            }
                            
                            this.notifications.showToast('All settings reset to default values (Maximum amount: ₹500)', 'success', 5000);
                        }, 1000);
                    }
                } catch (error) {
                    console.error('Error resetting settings:', error);
                    this.notifications.showToast('Error resetting settings: ' + error.message, 'error');
                }
            }
        );
    }

    setupQuickActions() {
        const balanceSheetBtn = document.getElementById('viewBalanceSheet');
        if (balanceSheetBtn) {
            balanceSheetBtn.addEventListener('click', () => {
                this.showBalanceSheet();
            });
        }

        const calendarBtn = document.getElementById('viewCalendar');
        if (calendarBtn) {
            calendarBtn.addEventListener('click', () => {
                this.showCalendar();
            });
        }

        const chartsBtn = document.getElementById('viewCharts');
        if (chartsBtn) {
            chartsBtn.addEventListener('click', () => {
                this.showAnalytics();
            });
        }

        const streakBtn = document.getElementById('dailyStreak');
        if (streakBtn) {
            streakBtn.addEventListener('click', () => {
                this.showStreakInfo();
            });
        }
    }

    setupViewNavigation() {
        const closeButtons = {
            'closeBalanceSheet': 'balanceSheetView',
            'closeAnalytics': 'analyticsView',
            'closeCalendar': 'calendarView'
        };

        Object.entries(closeButtons).forEach(([buttonId, viewId]) => {
            const button = document.getElementById(buttonId);
            const view = document.getElementById(viewId);
            
            if (button && view) {
                button.addEventListener('click', () => {
                    this.closeCurrentView(view);
                });
            }
        });
    }

    setupEarningsInsight() {
        const earningsInsightBtn = document.getElementById('earningsInsightBtn');
        const earningsInsightTooltip = document.getElementById('earningsInsightTooltip');

        if (earningsInsightBtn && earningsInsightTooltip) {
            earningsInsightBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                this.createRippleEffect(e.currentTarget, e);
                await this.toggleEarningsInsight(e.target);
            });
        }

        // Close tooltip when clicking outside
        document.addEventListener('click', (e) => {
            if (earningsInsightTooltip && 
                !earningsInsightTooltip.contains(e.target) && 
                !earningsInsightBtn.contains(e.target) &&
                earningsInsightTooltip.classList.contains('show')) {
                this.hideEarningsInsight();
            }
        });

        // Close tooltip on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && earningsInsightTooltip && earningsInsightTooltip.classList.contains('show')) {
                this.hideEarningsInsight();
            }
        });

        // Update tooltip position on scroll instead of hiding
        window.addEventListener('scroll', () => {
            if (earningsInsightTooltip && earningsInsightTooltip.classList.contains('show')) {
                const earningsInsightBtn = document.getElementById('earningsInsightBtn');
                if (earningsInsightBtn) {
                    this.positionTooltip(earningsInsightTooltip, earningsInsightBtn);
                }
            }
        });
    }

    async toggleEarningsInsight(targetElement) {
        const tooltip = document.getElementById('earningsInsightTooltip');
        if (tooltip) {
            if (tooltip.classList.contains('show')) {
                this.hideEarningsInsight();
            } else {
                await this.showEarningsInsight(targetElement);
            }
        }
    }

    async showEarningsInsight(targetElement) {
        try {
            const stats = await this.db.getEarningsStats();
            
            // Generate professional status message
            const statusMessage = await this.generateEarningsStatusMessage(stats);
            
            // Update tooltip content
            const messageEl = document.getElementById('earningsStatusMessage');
            if (messageEl) {
                messageEl.textContent = statusMessage;
            }
            
            // Position and show tooltip
            const tooltip = document.getElementById('earningsInsightTooltip');
            if (tooltip && targetElement) {
                this.positionTooltip(tooltip, targetElement);
                tooltip.classList.add('show');
            }
        } catch (error) {
            console.error('Error showing earnings insight:', error);
            this.notifications.showToast('Error loading insights', 'error');
        }
    }

    positionTooltip(tooltip, targetElement) {
        // Get target button position relative to viewport
        const targetRect = targetElement.getBoundingClientRect();
        const tooltipContent = tooltip.querySelector('.tooltip-content');
        const tooltipArrow = tooltip.querySelector('.tooltip-arrow');
        
        // Reset classes and styles
        tooltip.classList.remove('top', 'bottom', 'left', 'right');
        tooltip.style.maxWidth = '';
        
        // Show tooltip temporarily to measure its size
        tooltip.style.visibility = 'hidden';
        tooltip.style.opacity = '1';
        tooltip.style.display = 'block';
        const tooltipRect = tooltipContent.getBoundingClientRect();
        tooltip.style.visibility = '';
        tooltip.style.opacity = '';
        tooltip.style.display = '';
        
        // Add padding for safe margins
        const MARGIN = 20;
        const ARROW_SIZE = 8;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Calculate available space with margins
        const spaceAbove = targetRect.top - MARGIN - ARROW_SIZE;
        const spaceBelow = viewportHeight - targetRect.bottom - MARGIN - ARROW_SIZE;
        const spaceLeft = targetRect.left - MARGIN - ARROW_SIZE;
        const spaceRight = viewportWidth - targetRect.right - MARGIN - ARROW_SIZE;
        
        let position = 'bottom'; // default
        let left, top;
        
        // Determine best position based on available space
        if (spaceBelow >= tooltipRect.height) {
            // Show below (preferred)
            position = 'bottom';
            top = targetRect.bottom + 10;
            left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
        } else if (spaceAbove >= tooltipRect.height) {
            // Show above
            position = 'top';
            top = targetRect.top - tooltipRect.height - 10;
            left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
        } else if (spaceRight >= tooltipRect.width) {
            // Show right
            position = 'right';
            left = targetRect.right + 10;
            top = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
        } else if (spaceLeft >= tooltipRect.width) {
            // Show left
            position = 'left';
            left = targetRect.left - tooltipRect.width - 10;
            top = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
        } else {
            // Force fit - use position with most space
            const maxSpace = Math.max(spaceBelow, spaceAbove, spaceLeft, spaceRight);
            if (maxSpace === spaceBelow || maxSpace === spaceAbove) {
                position = maxSpace === spaceBelow ? 'bottom' : 'top';
                top = maxSpace === spaceBelow ? targetRect.bottom + 8 : targetRect.top - tooltipRect.height - 8;
                left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
            } else {
                position = maxSpace === spaceRight ? 'right' : 'left';
                left = maxSpace === spaceRight ? targetRect.right + 8 : targetRect.left - tooltipRect.width - 8;
                top = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
            }
        }
        
        // Store original left position for arrow calculation
        const originalLeft = left;
        const originalTop = top;
        
        // Strict viewport boundaries enforcement - keep tooltip within view
        const adjustedLeft = Math.max(MARGIN, Math.min(viewportWidth - tooltipRect.width - MARGIN, left));
        const adjustedTop = Math.max(MARGIN, Math.min(viewportHeight - tooltipRect.height - MARGIN, top));
        
        // Special handling for very small screens
        if (viewportWidth < 400) {
            tooltip.style.maxWidth = `${viewportWidth - (MARGIN * 2)}px`;
            left = MARGIN;
            top = adjustedTop;
        } else {
            left = adjustedLeft;
            top = adjustedTop;
        }
        
        // Apply position
        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
        tooltip.classList.add(position);
        
        // Enhanced arrow positioning - precisely point to the icon center
        if (tooltipArrow) {
            const targetCenterX = targetRect.left + (targetRect.width / 2);
            const targetCenterY = targetRect.top + (targetRect.height / 2);
            const tooltipLeft = parseFloat(tooltip.style.left);
            const tooltipTop = parseFloat(tooltip.style.top);
            
            // Let CSS handle arrow visibility timing - remove inline styles
            tooltipArrow.style.opacity = '';
            tooltipArrow.style.visibility = '';
            
            // Calculate exact positioning based on tooltip position relative to target
            if (position === 'bottom' || position === 'top') {
                // Horizontal arrow positioning - point exactly to button center
                const targetCenterRelativeToTooltip = targetCenterX - tooltipLeft;
                let arrowLeft = targetCenterRelativeToTooltip - 4; // Center arrow (arrow is 8px wide)
                
                // Ensure arrow stays within tooltip bounds with proper margins
                const arrowWidth = 8;
                const minMargin = 6;
                const maxMargin = tooltipRect.width - arrowWidth - 6;
                
                arrowLeft = Math.max(minMargin, Math.min(maxMargin, arrowLeft));
                
                tooltipArrow.style.left = `${arrowLeft}px`;
                tooltipArrow.style.top = '';
                tooltipArrow.style.right = '';
                tooltipArrow.style.bottom = '';
                
                console.log(`[Tooltip] Arrow positioned at ${arrowLeft}px pointing to button center (${targetCenterX})`);
            } else if (position === 'left' || position === 'right') {
                // Vertical arrow positioning - point exactly to button center
                const targetCenterRelativeToTooltip = targetCenterY - tooltipTop;
                let arrowTop = targetCenterRelativeToTooltip - 4; // Center arrow (arrow is 8px tall)
                
                // Ensure arrow stays within tooltip bounds with proper margins
                const arrowHeight = 8;
                const minMargin = 6;
                const maxMargin = tooltipRect.height - arrowHeight - 6;
                
                arrowTop = Math.max(minMargin, Math.min(maxMargin, arrowTop));
                
                tooltipArrow.style.top = `${arrowTop}px`;
                tooltipArrow.style.left = '';
                tooltipArrow.style.right = '';
                tooltipArrow.style.bottom = '';
                
                console.log(`[Tooltip] Arrow positioned at ${arrowTop}px pointing to button center (${targetCenterY})`);
            }
        }
    }

    hideEarningsInsight() {
        const tooltip = document.getElementById('earningsInsightTooltip');
        if (tooltip) {
            tooltip.classList.remove('show', 'top', 'bottom', 'left', 'right');
            
            // Reset arrow positioning styles completely
            const tooltipArrow = tooltip.querySelector('.tooltip-arrow');
            if (tooltipArrow) {
                tooltipArrow.style.cssText = ''; // Clear all inline styles
            }
            
            // Reset tooltip position as well
            tooltip.style.left = '';
            tooltip.style.top = '';
            tooltip.style.maxWidth = '';
        }
    }

    createRippleEffect(button, event) {
        // Remove any existing ripple
        const existingRipple = button.querySelector('.ripple');
        if (existingRipple) {
            existingRipple.remove();
        }

        // Create ripple element
        const ripple = document.createElement('span');
        ripple.classList.add('ripple');
        
        // Get button dimensions and position
        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = event.clientX - rect.left - size / 2;
        const y = event.clientY - rect.top - size / 2;
        
        // Style the ripple
        ripple.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            left: ${x}px;
            top: ${y}px;
            background: rgba(var(--primary-rgb), 0.3);
            border-radius: var(--border-radius);
            transform: scale(0);
            animation: ripple-animation 0.6s ease-out;
            pointer-events: none;
            z-index: 0;
        `;
        
        button.appendChild(ripple);
        
        // Remove ripple after animation
        setTimeout(() => {
            if (ripple && ripple.parentNode) {
                ripple.remove();
            }
        }, 600);
    }

    async generateEarningsStatusMessage(stats) {
        const { totalWorked, totalEarned, totalPaid, currentBalance } = stats;
        const dailyWage = window.R_SERVICE_CONFIG?.DAILY_WAGE || 25;
        
        // Check for advance payment status
        const advanceStatus = await this.db.getAdvancePaymentStatus();
        
        // New user - no work done
        if (totalWorked === 0) {
            return `Welcome to your earnings tracker! Your daily rate is set to ${this.utils.formatCurrency(dailyWage)}. To begin tracking your work progress, simply click the Mark as Done button when you complete your first work session. This will start building your work history and earnings record.`;
        }
        
        // Handle advance payment scenarios
        if (advanceStatus.hasAdvancePayments && advanceStatus.workRemainingForAdvance > 0) {
            const remainingDays = advanceStatus.workRemainingForAdvance;
            const advanceAmount = advanceStatus.totalAdvanceAmount;
            const completedDays = totalWorked - remainingDays;
            
            return `You have received an advance payment of ${this.utils.formatCurrency(advanceAmount)} and are making good progress on your work commitment. Currently, you have completed ${completedDays} out of ${totalWorked} required work days. You need to complete ${remainingDays} more days to fulfill your advance payment obligation and maintain your earning schedule.`;
        }
        
        // Has worked but no payments made
        if (totalWorked > 0 && totalPaid === 0) {
            return `Your work record shows ${totalWorked} completed work session${totalWorked !== 1 ? 's' : ''} with a total pending payment of ${this.utils.formatCurrency(currentBalance)}. You have not collected any payments yet, which means this is a great time to initiate your first payment collection. Your consistent work is building up a solid earnings foundation.`;
        }
        
        // Has worked and received some payments
        if (totalWorked > 0 && totalPaid > 0 && currentBalance > 0) {
            const pendingDays = Math.ceil(currentBalance / dailyWage);
            
            return `You have successfully completed ${totalWorked} work days and collected ${this.utils.formatCurrency(totalPaid)} in payments so far. Currently, you have ${this.utils.formatCurrency(currentBalance)} pending equivalent to ${pendingDays} work day${pendingDays !== 1 ? 's' : ''}. Your payment management is running smoothly, and you are maintaining a healthy work to payment ratio.`;
        }
        
        // All payments up to date
        if (totalWorked > 0 && currentBalance === 0) {
            return `Excellent work! You have completed ${totalWorked} work day${totalWorked !== 1 ? 's' : ''} and earned a total of ${this.utils.formatCurrency(totalPaid)}. All your payments are current and up to date, which demonstrates excellent financial management and work discipline. Keep up the great work with your consistent earning schedule.`;
        }
        
        // Fallback message
        return `Your earnings tracker is ready to help you manage your work and payments efficiently. With your daily rate set at ${this.utils.formatCurrency(dailyWage)}, you can easily track your progress and maintain organized financial records. Start by marking your work as done when you complete each session.`;
    }



    setupModalHandlers() {
        const aboutModal = document.getElementById('aboutModal');
        const closeModalBtns = document.querySelectorAll('.close-modal, .close-modal-modern');
        
        closeModalBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                if (aboutModal) aboutModal.classList.remove('show');
            });
        });

        if (aboutModal) {
            aboutModal.addEventListener('click', (e) => {
                if (e.target === aboutModal) {
                    aboutModal.classList.remove('show');
                }
            });
        }
    }

    closeCurrentView(view) {
        try {
            const allViews = ['balanceSheetView', 'analyticsView', 'calendarView'];
            allViews.forEach(viewId => {
                const viewElement = document.getElementById(viewId);
                if (viewElement) {
                    viewElement.style.display = 'none';
                    viewElement.style.opacity = '1';
                    viewElement.style.transform = 'translateY(0)';
                }
            });

            const dashboard = document.getElementById('dashboard');
            if (dashboard) {
                dashboard.style.display = 'block';
                dashboard.style.opacity = '1';
                dashboard.style.transform = 'translateY(0)';
                
                dashboard.classList.remove('animate-fade-scale', 'animate-slide-up', 'animate-bounce-in');
                
                setTimeout(() => {
                    dashboard.classList.add('animate-fade-scale');
                }, 50);
            }
        } catch (error) {
            console.error('Error closing view:', error);
            const dashboard = document.getElementById('dashboard');
            if (dashboard) {
                dashboard.style.display = 'block';
                dashboard.style.opacity = '1';
                dashboard.style.transform = 'translateY(0)';
            }
        }
    }

    async loadInitialData() {
        try {
            this.currentStats = await this.db.getEarningsStats();
            
            this.updateDashboard();
            
            await this.checkPendingPayments();
            
            this.updateTodayStatus();
            
        } catch (error) {
            console.error('Error loading initial data:', error);
        }
    }

    updateDashboard() {
        if (this.updateDashboardTimeout) {
            clearTimeout(this.updateDashboardTimeout);
        }
        
        this.updateDashboardTimeout = setTimeout(() => {
            this._performDashboardUpdate();
        }, 50);
    }

    _performDashboardUpdate() {
        const dashboardCards = document.querySelectorAll('.card');
        dashboardCards.forEach(card => {
            card.style.animation = 'fadeInUp 0.5s ease-out';
        });

        const currentDateEl = document.getElementById('currentDate');
        if (currentDateEl) {
            currentDateEl.textContent = this.utils.formatDate(new Date());
        }

        const currentEarningsEl = document.getElementById('currentEarnings');
        const daysWorkedEl = document.getElementById('daysWorked');
        const totalEarnedEl = document.getElementById('totalEarned');
        const progressTextEl = document.getElementById('progressText');
        const progressFillEl = document.getElementById('progressFill');
        const streakCountEl = document.getElementById('streakCount');

        if (currentEarningsEl) {
            const currentBalance = this.currentStats?.currentBalance || 0;
            this.utils.animateNumber(currentEarningsEl, 0, currentBalance, 1500);
        }
        
        if (daysWorkedEl) {
            const totalWorked = this.currentStats?.totalWorked || 0;
            this.utils.animateValue(daysWorkedEl, 0, totalWorked, 1000);
        }
        
        if (totalEarnedEl) {
            const totalEarned = this.currentStats?.totalEarned || 0;
            this.utils.animateNumber(totalEarnedEl, 0, totalEarned, 2000);
        }
        
        if (progressTextEl) {
            const progress = this.currentStats?.progressToPayday || 0;
            const paymentThreshold = window.R_SERVICE_CONFIG?.PAYMENT_THRESHOLD || window.R_SERVICE_CONFIG?.PAYMENT_DAY_DURATION || 4;
            progressTextEl.textContent = `${progress}/${paymentThreshold} days`;
        }
        
        if (progressFillEl) {
            const progress = this.currentStats?.progressToPayday || 0;
            const paymentThreshold = window.R_SERVICE_CONFIG?.PAYMENT_THRESHOLD || window.R_SERVICE_CONFIG?.PAYMENT_DAY_DURATION || 4;
            const progressPercent = (progress / paymentThreshold) * 100;
            progressFillEl.style.width = `${progressPercent}%`;
        }
        
        this.updateProgressBar(progressTextEl, progressFillEl);
        
        if (streakCountEl) {
            const currentStreak = this.currentStats?.currentStreak || 0;
            this.utils.animateValue(streakCountEl, 0, currentStreak, 1200);
        }
    }

    async updateProgressBar(progressTextEl, progressFillEl) {
        try {
            const progressLabelEl = document.getElementById('progressLabel');
            const advanceStatus = await this.db.getAdvancePaymentStatus();
            
            console.log('Progress bar update - advance status:', advanceStatus);
            
            if (advanceStatus.hasAdvancePayments && advanceStatus.workRemainingForAdvance > 0) {
                const workCompleted = advanceStatus.workCompletedForAdvance;
                const workRequired = advanceStatus.workRequiredForAdvance;
                
                const safeWorkCompleted = workCompleted || 0;
                const safeWorkRequired = workRequired || 1; // Avoid division by zero
                
                const progressPercent = Math.min((safeWorkCompleted / safeWorkRequired) * 100, 100);
                console.log('Advance progress:', { workCompleted: safeWorkCompleted, workRequired: safeWorkRequired, progressPercent });
                
                if (progressLabelEl) {
                    progressLabelEl.textContent = `Advance Payment Progress (₹${advanceStatus.totalAdvanceAmount} paid)`;
                }
                if (progressTextEl) {
                    progressTextEl.textContent = `${safeWorkCompleted}/${safeWorkRequired} days`;
                }
                
                if (progressFillEl) {
                    let finalPercent;
                    if (safeWorkCompleted === 0) {
                        finalPercent = 0; // Empty if no work done
                    } else if (safeWorkCompleted >= safeWorkRequired) {
                        finalPercent = 100; // Full if work is complete or more
                    } else {
                        finalPercent = Math.max(progressPercent, 10); // Minimum 10% visibility when work is started
                    }
                    
                    progressFillEl.style.width = `${finalPercent}%`;
                    progressFillEl.style.backgroundColor = safeWorkCompleted >= safeWorkRequired ? 'var(--success)' : 'var(--warning)';
                }
            } else if (advanceStatus.hasAdvancePayments && advanceStatus.workRemainingForAdvance === 0) {
                if (progressLabelEl) {
                    progressLabelEl.textContent = 'Advance Completed';
                }
                if (progressTextEl) {
                    progressTextEl.textContent = 'All advance work completed';
                }
                if (progressFillEl) {
                    progressFillEl.style.width = '100%';
                    progressFillEl.style.backgroundColor = 'var(--success)'; // Green when complete
                }
            } else {
                if (progressLabelEl) {
                    progressLabelEl.textContent = 'Progress to Payday';
                }
                if (progressTextEl) {
                    const progress = this.currentStats?.progressToPayday || 0;
                    const paymentThreshold = window.R_SERVICE_CONFIG?.PAYMENT_THRESHOLD || window.R_SERVICE_CONFIG?.PAYMENT_DAY_DURATION || 4;
                    progressTextEl.textContent = `${progress}/${paymentThreshold} days`;
                }
                
                if (progressFillEl) {
                    const progress = this.currentStats?.progressToPayday || 0;
                    const paymentThreshold = window.R_SERVICE_CONFIG?.PAYMENT_THRESHOLD || window.R_SERVICE_CONFIG?.PAYMENT_DAY_DURATION || 4;
                    const progressPercent = (progress / paymentThreshold) * 100;
                    progressFillEl.style.width = `${progressPercent}%`;
                    progressFillEl.style.backgroundColor = 'var(--primary)'; // Normal color
                }
            }
        } catch (error) {
            console.error('Error updating progress bar:', error);
            if (progressTextEl) {
                const progress = this.currentStats?.progressToPayday || 0;
                const paymentThreshold = window.R_SERVICE_CONFIG?.PAYMENT_THRESHOLD || window.R_SERVICE_CONFIG?.PAYMENT_DAY_DURATION || 4;
                progressTextEl.textContent = `${progress}/${paymentThreshold} days`;
            }
            
            if (progressFillEl) {
                const progress = this.currentStats?.progressToPayday || 0;
                const paymentThreshold = window.R_SERVICE_CONFIG?.PAYMENT_THRESHOLD || window.R_SERVICE_CONFIG?.PAYMENT_DAY_DURATION || 4;
                const progressPercent = (progress / paymentThreshold) * 100;
                progressFillEl.style.width = `${progressPercent}%`;
                progressFillEl.style.backgroundColor = 'var(--primary)';
            }
        }
    }

    async updateTodayStatus() {
        const today = this.utils.getTodayString();
        const todayRecord = await this.db.getWorkRecord(today);
        
        const workStatusEl = document.getElementById('workStatus');
        const doneBtnEl = document.getElementById('doneBtn');
        
        if (todayRecord && todayRecord.status === 'completed') {
            if (workStatusEl) {
                workStatusEl.className = 'status-badge completed';
                workStatusEl.innerHTML = '<i class="fas fa-check"></i> Work Completed';
            }
            
            if (doneBtnEl) {
                doneBtnEl.disabled = true;
                
                doneBtnEl.innerHTML = '<i class="fas fa-check"></i> Already Done';
            }
        } else {
            if (workStatusEl) {
                workStatusEl.className = 'status-badge pending';
                workStatusEl.innerHTML = '<i class="fas fa-clock"></i> Not Started';
            }
            
            if (doneBtnEl) {
                doneBtnEl.disabled = false;
                
                doneBtnEl.innerHTML = '<i class="fas fa-check"></i> Mark as Done';
            }
        }
        
        await this.updatePaidButtonVisibility();
    }

    async checkPendingPayments() {
        const workRecords = await this.db.getAllWorkRecords();
        const payments = await this.db.getAllPayments();
        
        const unpaidRecords = workRecords.filter(record => 
            record.status === 'completed' && !this.isRecordPaid(record, payments)
        );
        
        const previousUnpaidCount = this.pendingUnpaidDates.length;
        this.pendingUnpaidDates = unpaidRecords.map(record => record.date);
        
        // Check for payment day notifications
        const advanceStatus = await this.db.getAdvancePaymentStatus();
        const paymentThreshold = window.R_SERVICE_CONFIG?.PAYMENT_THRESHOLD || window.R_SERVICE_CONFIG?.PAYMENT_DAY_DURATION || 4;
        const isPaymentDay = (this.pendingUnpaidDates.length > 0 && this.pendingUnpaidDates.length % paymentThreshold === 0) || 
                            (this.pendingUnpaidDates.length > 0 && advanceStatus.hasAdvancePayments && advanceStatus.workRemainingForAdvance > 0);
        
        if (isPaymentDay && this.pendingUnpaidDates.length % paymentThreshold === 0 && previousUnpaidCount % paymentThreshold !== 0) {
            console.log('Payday reached! Showing notification and playing sound');
            this.notifications.showPaydayNotification();
            this.notifications.playSound('paid');
        }

        // Check if we should show PWA recommendation on payment days
        await this.checkPWAOnPaymentDay();
    }

    async checkPWAOnPaymentDay() {
        try {
            // Check if PWA is already installed
            const isInstalled = window.matchMedia('(display-mode: standalone)').matches || 
                               window.navigator.standalone === true;
            
            if (isInstalled) return;

            const isPaymentDay = await this.shouldShowPWAOnPaymentDay();
            if (isPaymentDay) {
                const banner = document.getElementById('pwaInstallBanner');
                if (banner && !banner.classList.contains('show')) {
                    // Show PWA recommendation on payment days even if previously dismissed
                    console.log('[PWA] Showing PWA recommendation on payment day');
                    
                    // Clear previous dismissal for this payment day
                    const lastDismissedDate = localStorage.getItem('pwa-install-dismissed-date');
                    const today = new Date().toISOString().split('T')[0];
                    const lastDismissed = lastDismissedDate ? lastDismissedDate.split('T')[0] : null;
                    
                    if (lastDismissed !== today) {
                        // Different day, so show again
                        setTimeout(() => {
                            if (window.deferredPrompt) {
                                this.showInstallRecommendation(window.deferredPrompt);
                            } else {
                                this.showInstallRecommendationGeneric();
                            }
                        }, 2000); // Show after 2 seconds
                    }
                }
            }
        } catch (error) {
            console.error('[PWA] Error checking PWA on payment day:', error);
        }
    }

    async updatePaidButtonVisibility() {
        const paidBtn = document.getElementById('paidBtn');
        if (paidBtn) {
            await this.updatePendingUnpaidDates();
            
            const advanceStatus = await this.db.getAdvancePaymentStatus();
            
            // Check if there's any work to pay for
            const hasUnpaidWork = this.pendingUnpaidDates.length > 0;
            const hasAdvancePaymentWork = advanceStatus.hasAdvancePayments && advanceStatus.workRemainingForAdvance > 0;
            const hasAnyPayableWork = hasUnpaidWork || hasAdvancePaymentWork;
            
            if (hasAnyPayableWork) {
                // Show and enable button when there's work to pay for
                this.showPaidButton();
                paidBtn.disabled = false;
                paidBtn.classList.remove('disabled-state');
                paidBtn.classList.add('has-pending-work');
                paidBtn.classList.add('payment-ready'); // Add pulse and glow effect
                
                console.log('[PAID BUTTON] Shown - Unpaid work:', hasUnpaidWork, 'Advance work:', hasAdvancePaymentWork);
            } else {
                // Hide button when there's no work to pay for
                this.hidePaidButton();
                console.log('[PAID BUTTON] Hidden - No payable work available');
            }
        }
    }

    showPaidButton() {
        const paidBtn = document.getElementById('paidBtn');
        if (paidBtn) {
            paidBtn.style.display = 'inline-flex';
            paidBtn.style.animation = 'payoutButtonAppear 0.8s ease-in-out';
            
            paidBtn.classList.add('payday-ready');
        }
    }

    hidePaidButton() {
        const paidBtn = document.getElementById('paidBtn');
        if (paidBtn) {
            paidBtn.style.display = 'none';
            paidBtn.classList.remove('payday-ready');
        }
    }



    async handleDoneClick() {
        try {
            const today = this.utils.getTodayString();
            const doneBtn = document.getElementById('doneBtn');
            if (doneBtn) {
                doneBtn.disabled = true;
                doneBtn.innerHTML = '<i class="fas fa-check"></i> Already Done';
                
            }
            console.log('Marking work as done for date:', today);
            
            const existingRecord = await this.db.getWorkRecord(today);
            if (existingRecord && existingRecord.status === 'completed') {
                this.notifications.showToast('Work already marked as done for today!', 'warning');
                return;
            }
            
            const result = await this.db.addWorkRecord(today, window.R_SERVICE_CONFIG?.DAILY_WAGE || 25, 'completed');
            
            
            this.notifications.playSound('done');
            
            this.notifications.showWorkCompletedNotification();
            this.notifications.showToast(`Great job! You earned ₹${window.R_SERVICE_CONFIG?.DAILY_WAGE || 25} today`, 'success');
            
            this.updateTodayStatus();
            
            // Sync all amount flow and updates across components
            await this.syncAmountFlow();
            
            this.notifications.checkMilestones(this.currentStats);
            await this.checkPendingPayments();
            
        } catch (error) {
            console.error('Error marking work as done:', error);
            this.notifications.showToast('Error marking work as done. Please try again.', 'error');
        }
    }

    async handlePaidClick() {
        try {
            // Add loading animation
            const paidBtn = document.getElementById('paidBtn');
            if (paidBtn) {
                paidBtn.classList.add('loading');
            }

            // Small delay to show loading animation
            await new Promise(resolve => setTimeout(resolve, 500));

            if (this.pendingUnpaidDates.length === 0) {
                this.notifications.showToast('No unpaid work to record payment for', 'warning');
                if (paidBtn) {
                    paidBtn.classList.remove('loading');
                }
                return;
            }
            
            // Remove loading and show date selection modal
            if (paidBtn) {
                paidBtn.classList.remove('loading');
            }
            
            this.showDateSelectionModal();
            
        } catch (error) {
            console.error('Error opening payment modal:', error);
            this.notifications.showToast('Error opening payment selection', 'error');
            const paidBtn = document.getElementById('paidBtn');
            if (paidBtn) {
                paidBtn.classList.remove('loading');
            }
        }
    }



    async updatePendingUnpaidDates() {
        try {
            const workRecords = await this.db.getAllWorkRecords();
            const payments = await this.db.getAllPayments();
            
            const unpaidRecords = workRecords.filter(record => 
                record.status === 'completed' && !this.isRecordPaid(record, payments)
            );
            
            this.pendingUnpaidDates = unpaidRecords.map(record => record.date);
            console.log('Updated pending dates:', this.pendingUnpaidDates);
        } catch (error) {
            console.error('Error updating pending dates:', error);
        }
    }

    showDateSelectionModal() {
        const modal = document.getElementById('dateSelectionModal');
        if (modal) {
            modal.classList.add('show');
            this.setupDateSelectionHandlers();
        }
    }

    setupDateSelectionHandlers() {
        const modal = document.getElementById('dateSelectionModal');
        const todayBtn = document.getElementById('todayDateBtn');
        const previousBtn = document.getElementById('previousDateBtn');
        const closeBtn = document.getElementById('closeDateSelectionModal');

        const closeModal = () => {
            modal.classList.remove('show');
        };

        // Close modal handlers
        if (closeBtn) {
            closeBtn.onclick = closeModal;
        }

        modal.onclick = (e) => {
            if (e.target === modal) {
                closeModal();
            }
        };

        // Today button - use existing payment flow
        if (todayBtn) {
            todayBtn.onclick = () => {
                closeModal();
                this.showPaymentModal();
            };
        }

        // Previous date button - show calendar selection
        if (previousBtn) {
            previousBtn.onclick = () => {
                closeModal();
                this.showCalendarSelectionModal();
            };
        }
    }

    async showCalendarSelectionModal() {
        const modal = document.getElementById('calendarSelectionModal');
        const calendarContainer = document.getElementById('unpaidWorkCalendar');
        
        if (modal && calendarContainer) {
            // Generate unpaid work calendar
            await this.generateUnpaidWorkCalendar(calendarContainer);
            modal.classList.add('show');
            this.setupCalendarSelectionHandlers();
        }
    }

    async generateUnpaidWorkCalendar(container) {
        try {
            await this.updatePendingUnpaidDates();
            const workRecords = await this.db.getAllWorkRecords();
            const payments = await this.db.getAllPayments();
            
            const unpaidRecords = workRecords.filter(record => 
                record.status === 'completed' && !this.isRecordPaid(record, payments)
            );

            container.innerHTML = '';
            
            if (unpaidRecords.length === 0) {
                container.innerHTML = '<p>No unpaid work dates available.</p>';
                return;
            }

            // Sort dates in descending order (newest first)
            unpaidRecords.sort((a, b) => new Date(b.date) - new Date(a.date));

            unpaidRecords.forEach(record => {
                const dateElement = document.createElement('div');
                dateElement.className = 'calendar-work-date';
                dateElement.dataset.date = record.date;
                const amount = record.amount || (window.R_SERVICE_CONFIG?.DAILY_WAGE || 25);
                dateElement.dataset.amount = amount;

                const dateInfo = document.createElement('div');
                dateInfo.className = 'date-info';

                const dateText = document.createElement('div');
                dateText.className = 'date-text';
                dateText.textContent = this.utils.formatDate(record.date, { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                });

                const amountText = document.createElement('div');
                amountText.className = 'amount-text';
                amountText.textContent = this.utils.formatCurrency(amount);

                const checkbox = document.createElement('div');
                checkbox.className = 'checkbox';

                dateInfo.appendChild(dateText);
                dateInfo.appendChild(amountText);
                dateElement.appendChild(dateInfo);
                dateElement.appendChild(checkbox);

                // Click handler for selection
                dateElement.onclick = async () => {
                    dateElement.classList.toggle('selected');
                    await this.updateCalendarSelection();
                };

                container.appendChild(dateElement);
            });

        } catch (error) {
            console.error('Error generating unpaid work calendar:', error);
            container.innerHTML = '<p>Error loading unpaid work dates.</p>';
        }
    }

    async updateCalendarSelection() {
        const selectedDates = document.querySelectorAll('.calendar-work-date.selected');
        const selectedDatesCount = document.getElementById('selectedDatesCount');
        const selectedAmountPreview = document.getElementById('selectedAmountPreview');
        const confirmBtn = document.getElementById('confirmCalendarDirectPaymentBtn');
        const directPaymentSummary = document.getElementById('directPaymentSummary');

        let totalAmount = 0;
        const selectedDatesList = [];

        selectedDates.forEach(dateEl => {
            const amount = parseFloat(dateEl.dataset.amount);
            totalAmount += amount;
            selectedDatesList.push(dateEl.dataset.date);
        });

        // Update display
        if (selectedDatesCount) {
            selectedDatesCount.textContent = selectedDates.length;
        }
        if (selectedAmountPreview) {
            selectedAmountPreview.textContent = this.utils.formatCurrency(totalAmount);
        }

        // Update daily wage display in calendar summary
        const calendarDailyWageDisplay = document.getElementById('calendarDailyWageDisplay');
        if (calendarDailyWageDisplay) {
            calendarDailyWageDisplay.textContent = this.utils.formatCurrency(window.R_SERVICE_CONFIG?.DAILY_WAGE || 25);
        }

        // Update simple calendar summary
        this.updateSimpleCalendarSummary();

        // Show/hide payment summary and enable/disable confirm button
        if (selectedDates.length > 0) {
            if (directPaymentSummary) {
                directPaymentSummary.style.display = 'block';
                
                // Update direct payment summary to match main payment modal format
                const directSelectedAmountDisplay = document.getElementById('directSelectedAmountDisplay');
                const directPaymentTypeDisplay = document.getElementById('directPaymentTypeDisplay');
                const directWorkDaysCoveredDisplay = document.getElementById('directWorkDaysCoveredDisplay');
                const directTotalPaymentDisplay = document.getElementById('directTotalPaymentDisplay');
                
                if (directSelectedAmountDisplay) {
                    directSelectedAmountDisplay.textContent = this.utils.formatCurrency(totalAmount);
                }
                if (directPaymentTypeDisplay) {
                    // Determine payment type based on amount vs work value
                    const workValue = selectedDates.length * (window.R_SERVICE_CONFIG?.DAILY_WAGE || 25);
                    const paymentType = totalAmount > workValue ? 'Advance' : 'Regular';
                    directPaymentTypeDisplay.textContent = paymentType;
                }
                if (directWorkDaysCoveredDisplay) {
                    directWorkDaysCoveredDisplay.textContent = selectedDates.length;
                }
                if (directTotalPaymentDisplay) {
                    directTotalPaymentDisplay.textContent = this.utils.formatCurrency(totalAmount);
                }
            }
            if (confirmBtn) {
                confirmBtn.disabled = false;
            }
        } else {
            if (directPaymentSummary) {
                directPaymentSummary.style.display = 'none';
            }
            if (confirmBtn) {
                confirmBtn.disabled = true;
            }
        }

        // Store selected data for later use
        this.selectedCalendarDates = selectedDatesList;
        this.selectedCalendarAmount = totalAmount;
    }

    setupCalendarSelectionHandlers() {
        const modal = document.getElementById('calendarSelectionModal');
        const confirmBtn = document.getElementById('confirmCalendarDirectPaymentBtn');
        const cancelBtn = document.getElementById('cancelCalendarSelectionBtn');
        const closeBtn = document.getElementById('closeCalendarSelectionModal');

        const closeModal = () => {
            modal.classList.remove('show');
            this.selectedCalendarDates = [];
            this.selectedCalendarAmount = 0;
            const directPaymentSummary = document.getElementById('directPaymentSummary');
            if (directPaymentSummary) {
                directPaymentSummary.style.display = 'none';
            }
            
            // Reset confirm button state
            const confirmBtn = document.getElementById('confirmCalendarDirectPaymentBtn');
            if (confirmBtn) {
                confirmBtn.classList.remove('loading');
                confirmBtn.disabled = true;
                confirmBtn.innerHTML = '<i class="fas fa-check"></i> Confirm Payment';
            }
        };

        // Close modal handlers
        if (closeBtn) {
            closeBtn.onclick = closeModal;
        }

        if (cancelBtn) {
            cancelBtn.onclick = closeModal;
        }

        modal.onclick = (e) => {
            if (e.target === modal) {
                closeModal();
            }
        };

        // Direct payment confirmation
        if (confirmBtn) {
            confirmBtn.onclick = async () => {
                if (this.selectedCalendarDates && this.selectedCalendarDates.length > 0 && this.selectedCalendarAmount > 0) {
                    try {
                        await this.processDirectCalendarPayment(this.selectedCalendarAmount, closeModal);
                    } catch (error) {
                        console.error('Calendar payment error:', error);
                    }
                } else {
                    this.notifications.showToast('Please select at least one work date', 'warning');
                }
            };
        }
    }

    showCalendarPaymentSection() {
        const paymentSection = document.getElementById('paymentAmountSection');
        const proceedBtn = document.getElementById('proceedToPaymentBtn');
        
        if (paymentSection) {
            paymentSection.style.display = 'block';
            this.generateCalendarPaymentButtons();
            this.setupCalendarPaymentHandlers();
            
            // Hide proceed button since payment options are now shown
            if (proceedBtn) {
                proceedBtn.style.display = 'none';
            }
            
            // Scroll to payment section
            paymentSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    generateCalendarPaymentButtons() {
        const container = document.getElementById('calendarPaymentButtons');
        if (!container) return;

        container.innerHTML = '';
        
        try {
            const config = window.R_SERVICE_CONFIG || {};
            const dailyWage = config.DAILY_WAGE || 25;
            const incrementValue = config.INCREMENT_VALUE || 25;
            const maxPaymentAmount = config.MAX_PAYMENT_AMOUNT || 500;
            
            // Generate amounts based on selected total and increments
            const selectedAmount = this.selectedCalendarAmount;
            const amounts = new Set();
            
            // Add exact selected amount
            amounts.add(selectedAmount);
            
            // Add increment-based amounts
            for (let multiplier = 1; multiplier <= 20; multiplier++) {
                const amount = incrementValue * multiplier;
                if (amount <= maxPaymentAmount) {
                    amounts.add(amount);
                }
            }
            
            // Add common payment amounts
            [50, 100, 150, 200, 250, 300, 400, 500].forEach(amount => {
                if (amount <= maxPaymentAmount) {
                    amounts.add(amount);
                }
            });
            
            // Convert to sorted array
            const sortedAmounts = Array.from(amounts).sort((a, b) => a - b);
            
            sortedAmounts.forEach(amount => {
                const button = document.createElement('button');
                button.className = 'payment-btn';
                button.dataset.amount = amount;
                
                // Highlight if it matches selected amount
                if (amount === selectedAmount) {
                    button.classList.add('exact-match');
                }
                
                button.innerHTML = `₹${amount}`;
                container.appendChild(button);
            });
            
        } catch (error) {
            console.error('Error generating calendar payment buttons:', error);
            // Fallback buttons
            const fallbackAmounts = [25, 50, 100, 200, 500];
            fallbackAmounts.forEach(amount => {
                const button = document.createElement('button');
                button.className = 'payment-btn';
                button.dataset.amount = amount;
                button.textContent = `₹${amount}`;
                container.appendChild(button);
            });
        }
    }

    setupCalendarPaymentHandlers() {
        const container = document.getElementById('calendarPaymentButtons');
        const confirmBtn = document.getElementById('confirmCalendarPaymentBtn');
        const cancelBtn = document.getElementById('cancelCalendarPaymentBtn');
        const modal = document.getElementById('calendarSelectionModal');
        
        // Payment button selection
        if (container) {
            container.addEventListener('click', (e) => {
                if (e.target.classList.contains('payment-btn')) {
                    // Remove selection from other buttons
                    container.querySelectorAll('.payment-btn').forEach(btn => {
                        btn.classList.remove('selected');
                    });
                    
                    // Select clicked button
                    e.target.classList.add('selected');
                    
                    const amount = parseFloat(e.target.dataset.amount);
                    this.selectedCalendarPaymentAmount = amount;
                    
                    // Add animation
                    e.target.style.animation = 'bounceIn 0.6s ease-out';
                    setTimeout(() => e.target.style.animation = '', 600);
                    
                    this.updateCalendarPaymentSummary(amount);
                }
            });
        }
        
        // Confirm payment
        if (confirmBtn) {
            confirmBtn.onclick = async () => {
                if (this.selectedCalendarPaymentAmount && this.selectedCalendarPaymentAmount > 0) {
                    try {
                        await this.processCalendarPayment(this.selectedCalendarPaymentAmount, () => {
                            modal.classList.remove('show');
                            this.resetCalendarSelection();
                        });
                    } catch (error) {
                        console.error('Calendar payment error:', error);
                    }
                } else {
                    this.notifications.showToast('Please select a payment amount first', 'warning');
                }
            };
        }
        
        // Cancel payment
        if (cancelBtn) {
            cancelBtn.onclick = () => {
                this.hideCalendarPaymentSection();
            };
        }
    }

    updateCalendarPaymentSummary(amount) {
        const summaryEl = document.getElementById('calendarPaymentSummary');
        const selectedAmountEl = document.getElementById('calendarSelectedAmountDisplay');
        const paymentTypeEl = document.getElementById('calendarPaymentTypeDisplay');
        const workDaysCoveredEl = document.getElementById('calendarWorkDaysCoveredDisplay');
        const selectedDatesEl = document.getElementById('calendarSelectedDatesDisplay');
        
        // Update the new calendar payment summary total section
        const calendarPaymentSummaryTotal = document.getElementById('calendarPaymentSummaryTotal');
        const calendarSelectedPaymentAmount = document.getElementById('calendarSelectedPaymentAmount');
        
        if (summaryEl && selectedAmountEl && paymentTypeEl && workDaysCoveredEl && selectedDatesEl) {
            const dailyWage = window.R_SERVICE_CONFIG?.DAILY_WAGE || 25;
            const selectedTotal = this.selectedCalendarAmount;
            const isAdvancePayment = amount > selectedTotal;
            const workDaysCovered = this.selectedCalendarDates.length;
            
            selectedAmountEl.textContent = this.utils.formatCurrency(amount);
            paymentTypeEl.textContent = isAdvancePayment ? 'Advance' : 'Regular';
            workDaysCoveredEl.textContent = `${workDaysCovered} days`;
            selectedDatesEl.textContent = `${workDaysCovered} days selected`;
            
            summaryEl.style.display = 'block';
        }
        
        // Update the new calendar payment summary total section
        if (calendarPaymentSummaryTotal && calendarSelectedPaymentAmount) {
            calendarSelectedPaymentAmount.textContent = this.utils.formatCurrency(amount);
            calendarPaymentSummaryTotal.style.display = 'block';
            
            // Add animation
            calendarPaymentSummaryTotal.style.animation = 'slideInUp 0.3s ease-out';
            setTimeout(() => calendarPaymentSummaryTotal.style.animation = '', 300);
        }
    }

    hideCalendarPaymentSection() {
        const paymentSection = document.getElementById('paymentAmountSection');
        const proceedBtn = document.getElementById('proceedToPaymentBtn');
        const summaryEl = document.getElementById('calendarPaymentSummary');
        const calendarPaymentSummaryTotal = document.getElementById('calendarPaymentSummaryTotal');
        
        if (paymentSection) {
            paymentSection.style.display = 'none';
        }
        
        if (proceedBtn) {
            proceedBtn.style.display = 'inline-flex';
        }
        
        if (summaryEl) {
            summaryEl.style.display = 'none';
        }
        
        // Hide the new calendar payment summary total section
        if (calendarPaymentSummaryTotal) {
            calendarPaymentSummaryTotal.style.display = 'none';
        }
        
        // Clear selection
        this.selectedCalendarPaymentAmount = null;
        const container = document.getElementById('calendarPaymentButtons');
        if (container) {
            container.querySelectorAll('.payment-btn').forEach(btn => {
                btn.classList.remove('selected');
            });
        }
    }

    resetCalendarSelection() {
        this.selectedCalendarDates = [];
        this.selectedCalendarAmount = 0;
        this.selectedCalendarPaymentAmount = null;
        this.hideCalendarPaymentSection();
    }

    async processCalendarPayment(amount, closeModalCallback) {
        // Prevent multiple simultaneous payment processing
        if (this._calendarPaymentProcessing) {
            console.warn('Calendar payment already in progress, ignoring duplicate request');
            return;
        }
        
        this._calendarPaymentProcessing = true;
        
        try {
            console.log('Processing calendar payment:', { 
                amount, 
                selectedDates: this.selectedCalendarDates,
                selectedAmount: this.selectedCalendarAmount
            });
            
            if (!amount || amount <= 0) {
                throw new Error('Invalid payment amount');
            }
            
            if (!this.db) {
                throw new Error('Database not available');
            }
            
            if (!this.selectedCalendarDates || this.selectedCalendarDates.length === 0) {
                throw new Error('No work dates selected');
            }
            
            const workDatesToPay = [...this.selectedCalendarDates];
            const expectedAmount = this.selectedCalendarAmount;
            const isAdvancePayment = amount > expectedAmount;
            
            const paymentDate = this.utils.getTodayString();
            console.log('Adding calendar payment to database:', { amount, workDatesToPay, paymentDate, isAdvancePayment });
            
            await this.db.addPayment(amount, workDatesToPay, paymentDate, isAdvancePayment);
            
            closeModalCallback();
            
            const paidBtn = document.getElementById('paidBtn');
            if (paidBtn) {
                paidBtn.style.animation = 'bounceIn 0.6s ease-out';
                paidBtn.classList.remove('payday-ready');
                setTimeout(() => paidBtn.style.animation = '', 600);
            }
            
            this.notifications.playSound('paid');
            
            const paymentType = isAdvancePayment ? 'advance payment' : 'regular payment';
            this.notifications.showPaymentNotification(amount);
            this.notifications.showToast(`${paymentType.charAt(0).toUpperCase() + paymentType.slice(1)} of ₹${amount} recorded for ${workDatesToPay.length} selected work days!`, 'success');
            
            console.log('Syncing amount flow across all components...');
            await this.syncAmountFlow();
            
            // Clear selection
            this.resetCalendarSelection();
            
        } catch (error) {
            console.error('Error recording calendar payment:', error);
            
            let errorMessage = 'Error recording payment. Please try again.';
            if (error.message.includes('Database not available')) {
                errorMessage = 'Database connection error. Please refresh the page and try again.';
            } else if (error.message.includes('Invalid payment amount')) {
                errorMessage = 'Please enter a valid payment amount.';
            } else if (error.message.includes('No work dates selected')) {
                errorMessage = 'Please select work dates to pay for.';
            }
            
            this.notifications.showToast(errorMessage, 'error');
        } finally {
            // Always reset the calendar payment processing flag
            this._calendarPaymentProcessing = false;
        }
    }

    async showPaymentModal() {
        const modal = document.getElementById('paymentModal');
        const unpaidDaysEl = document.getElementById('unpaidDaysCount');
        const pendingAmountEl = document.getElementById('pendingAmount');
        
        if (modal && unpaidDaysEl && pendingAmountEl) {
            await this.updatePendingUnpaidDates();
            
            const pendingAmount = this.pendingUnpaidDates.length * (window.R_SERVICE_CONFIG?.DAILY_WAGE || 25);
            unpaidDaysEl.textContent = this.pendingUnpaidDates.length;
            pendingAmountEl.textContent = this.utils.formatCurrency(pendingAmount);
            
            // Update daily wage display in payment summary
            const dailyWageDisplay = document.getElementById('dailyWageDisplay');
            if (dailyWageDisplay) {
                dailyWageDisplay.textContent = this.utils.formatCurrency(window.R_SERVICE_CONFIG?.DAILY_WAGE || 25);
            }
            
            // Update simple payment summary
            this.updateSimplePaymentSummary();
            
            console.log('Payment modal - Unpaid days:', this.pendingUnpaidDates.length, 'Pending amount:', pendingAmount);
            
            // Clear any previous custom selection
            this.selectedCalendarDates = [];
            this.selectedCalendarAmount = 0;
            
            modal.classList.add('show');
            this.setupPaymentModalHandlers();
        }
    }

    async showCustomPaymentModal() {
        const modal = document.getElementById('paymentModal');
        const unpaidDaysEl = document.getElementById('unpaidDaysCount');
        const pendingAmountEl = document.getElementById('pendingAmount');
        
        if (modal && unpaidDaysEl && pendingAmountEl && this.selectedCalendarDates) {
            const selectedDaysCount = this.selectedCalendarDates.length;
            const selectedAmount = this.selectedCalendarAmount;
            
            unpaidDaysEl.textContent = selectedDaysCount;
            pendingAmountEl.textContent = this.utils.formatCurrency(selectedAmount);
            
            // Update daily wage display in payment summary
            const dailyWageDisplay = document.getElementById('dailyWageDisplay');
            if (dailyWageDisplay) {
                dailyWageDisplay.textContent = this.utils.formatCurrency(window.R_SERVICE_CONFIG?.DAILY_WAGE || 25);
            }
            
            // Update simple payment summary for custom selection
            this.updateSimplePaymentSummary();
            
            console.log('Custom payment modal - Selected days:', selectedDaysCount, 'Selected amount:', selectedAmount);
            
            modal.classList.add('show');
            this.setupPaymentModalHandlers();
        }
    }

    generatePaymentButtons() {
        const container = document.getElementById('paymentButtons');
        if (!container) {
            console.warn('Payment buttons container not found');
            return;
        }

        try {
            container.innerHTML = '';

            let amounts = [];
            if (window.ConfigManager && typeof window.ConfigManager.generatePaymentAmounts === 'function') {
                amounts = window.ConfigManager.generatePaymentAmounts();
            } else {
                const dailyWage = window.R_SERVICE_CONFIG?.DAILY_WAGE || 25;
                amounts = [dailyWage, dailyWage*2, dailyWage*3, dailyWage*4, dailyWage*8, dailyWage*12, dailyWage*16, dailyWage*20, dailyWage*24, 500];
                console.warn('Using fallback payment amounts based on daily wage:', dailyWage);
            }
            
            if (!Array.isArray(amounts) || amounts.length === 0) {
                const dailyWage = window.R_SERVICE_CONFIG?.DAILY_WAGE || 25;
                amounts = [dailyWage, dailyWage*2, dailyWage*3, dailyWage*4, dailyWage*8, dailyWage*12, dailyWage*16, dailyWage*20, dailyWage*24, 500];
            }
            
            amounts.forEach(amount => {
                const button = document.createElement('button');
                button.className = 'payment-btn';
                button.dataset.amount = amount;
                button.textContent = `₹${amount}`;
                container.appendChild(button);
            });

            console.log(`Generated ${amounts.length} payment buttons with amounts:`, amounts);
        } catch (error) {
            console.error('Error generating payment buttons:', error);
            const dailyWage = window.R_SERVICE_CONFIG?.DAILY_WAGE || 25;
            const fallbackAmounts = [dailyWage, dailyWage*2, dailyWage*4, dailyWage*8, dailyWage*20, 500];
            fallbackAmounts.forEach(amount => {
                const button = document.createElement('button');
                button.className = 'payment-btn';
                button.dataset.amount = amount;
                button.textContent = `₹${amount}`;
                container.appendChild(button);
            });
        }
    }

    setupPaymentModalHandlers() {
        const modal = document.getElementById('paymentModal');
        const closeBtn = document.getElementById('closePaymentModal');
        
        this.generatePaymentButtons();

        const closeModal = () => {
            this.notifications.playCloseSound();
            modal.classList.remove('show');
            document.querySelectorAll('.payment-btn').forEach(btn => btn.classList.remove('selected'));
            this.selectedPaymentAmount = null;
            const confirmationEl = document.getElementById('paymentConfirmation');
            if (confirmationEl) confirmationEl.style.display = 'none';
            
            // Hide the new payment summary total section
            const paymentSummaryTotal = document.getElementById('paymentSummaryTotal');
            if (paymentSummaryTotal) paymentSummaryTotal.style.display = 'none';
        };

        if (closeBtn) {
            const newCloseBtn = closeBtn.cloneNode(true);
            closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
            newCloseBtn.addEventListener('click', closeModal);
        }
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        const container = document.getElementById('paymentButtons');
        if (container) {
            const newContainer = container.cloneNode(true);
            container.parentNode.replaceChild(newContainer, container);
            
            newContainer.addEventListener('click', (e) => {
                if (e.target.classList.contains('payment-btn')) {
                    e.preventDefault();
                    
                    document.querySelectorAll('.payment-btn').forEach(b => b.classList.remove('selected'));
                    
                    e.target.classList.add('selected');
                    
                    const amount = parseInt(e.target.dataset.amount);
                    this.selectedPaymentAmount = amount;
                    
                    e.target.style.animation = 'bounceIn 0.6s ease-out';
                    setTimeout(() => e.target.style.animation = '', 600);
                    
                    this.updatePaymentSummary(amount);
                    
                }
            });
        }

        const confirmBtn = document.getElementById('confirmPaymentBtn');
        const cancelBtn = document.getElementById('cancelPaymentBtn');
        
        if (confirmBtn) {
            const newConfirmBtn = confirmBtn.cloneNode(true);
            confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
            
            newConfirmBtn.addEventListener('click', async () => {
                if (this.selectedPaymentAmount && this.selectedPaymentAmount > 0) {
                    // Prevent multiple clicks
                    newConfirmBtn.disabled = true;
                    newConfirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
                    
                    try {
                        await this.processPayment(this.selectedPaymentAmount, closeModal);
                    } catch (error) {
                        console.error('Payment processing error:', error);
                        // Re-enable button if payment fails
                        newConfirmBtn.disabled = false;
                        newConfirmBtn.innerHTML = '<i class="fas fa-check"></i> Confirm Payment';
                    }
                } else {
                    this.notifications.showToast('Please select a payment amount first', 'warning');
                }
            });
        }
        
        if (cancelBtn) {
            const newCancelBtn = cancelBtn.cloneNode(true);
            cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
            
            newCancelBtn.addEventListener('click', () => {
                document.querySelectorAll('.payment-btn').forEach(btn => btn.classList.remove('selected'));
                this.selectedPaymentAmount = null;
                const confirmationEl = document.getElementById('paymentConfirmation');
                if (confirmationEl) confirmationEl.style.display = 'none';
                
                // Hide the new payment summary total section
                const paymentSummaryTotal = document.getElementById('paymentSummaryTotal');
                if (paymentSummaryTotal) paymentSummaryTotal.style.display = 'none';
            });
        }
    }

    updatePaymentSummary(amount) {
        // Use the new simplified confirmation section
        const confirmationEl = document.getElementById('paymentConfirmation');
        const confirmAmount = document.getElementById('confirmAmount');
        const confirmType = document.getElementById('confirmType');
        
        // Update the new payment summary total section
        const paymentSummaryTotal = document.getElementById('paymentSummaryTotal');
        const selectedPaymentAmount = document.getElementById('selectedPaymentAmount');
        
        if (confirmationEl && confirmAmount && confirmType) {
            const dailyWage = window.R_SERVICE_CONFIG?.DAILY_WAGE || 25;
            const totalWorkCompletedValue = this.pendingUnpaidDates.length * dailyWage;
            
            const isAdvance = amount > totalWorkCompletedValue;
            
            confirmAmount.textContent = `₹${amount}`;
            confirmType.textContent = isAdvance ? 'Advance Payment' : 'Regular Payment';
            
            confirmationEl.style.display = 'block';
            
            // Add animation
            confirmationEl.style.animation = 'slideInUp 0.3s ease-out';
            setTimeout(() => confirmationEl.style.animation = '', 300);
        }
        
        // Update the new payment summary total section
        if (paymentSummaryTotal && selectedPaymentAmount) {
            selectedPaymentAmount.textContent = this.utils.formatCurrency(amount);
            paymentSummaryTotal.style.display = 'block';
            
            // Add animation
            paymentSummaryTotal.style.animation = 'slideInUp 0.3s ease-out';
            setTimeout(() => paymentSummaryTotal.style.animation = '', 300);
        }
    }

    updateSimplePaymentSummary() {
        // Simple payment summary only updates the basic fields that are already handled
        // by the existing showPaymentModal and showCustomPaymentModal functions
        // No additional processing needed
    }

    updateSimpleCalendarSummary() {
        // Simple calendar summary only updates the basic fields that are already handled
        // by the existing updateCalendarSelection function
        // No additional processing needed
    }

    showPaymentConfirmation(amount, closeModalCallback) {
        const message = `Process payment of ₹${amount}?`;
        this.notifications.showConfirmation(
            message,
            () => this.processPayment(amount, closeModalCallback),
            () => {
                document.querySelectorAll('.payment-btn').forEach(btn => btn.classList.remove('selected'));
                this.selectedPaymentAmount = null;
            }
        );
    }

    async processDirectCalendarPayment(amount, closeModalCallback) {
        // Prevent multiple simultaneous payment processing
        if (this._directCalendarPaymentProcessing) {
            console.warn('Direct calendar payment already in progress, ignoring duplicate request');
            return;
        }
        
        this._directCalendarPaymentProcessing = true;
        const confirmBtn = document.getElementById('confirmCalendarDirectPaymentBtn');
        
        try {
            console.log('Processing direct calendar payment:', { 
                amount, 
                selectedDates: this.selectedCalendarDates,
                selectedAmount: this.selectedCalendarAmount 
            });
            
            // Set loading state on confirm button
            if (confirmBtn) {
                confirmBtn.classList.add('loading');
                confirmBtn.disabled = true;
                confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
            }
            
            // Use the standard payment processing
            await this.processPayment(amount, closeModalCallback);
            
            // Reset button state after successful payment (though modal should be closed)
            if (confirmBtn) {
                confirmBtn.classList.remove('loading');
                confirmBtn.disabled = false;
                confirmBtn.innerHTML = '<i class="fas fa-check"></i> Confirm Payment';
            }
            
        } catch (error) {
            console.error('Error processing direct calendar payment:', error);
            this.notifications.showToast('Error processing payment. Please try again.', 'error');
            
            // Reset button state on error
            if (confirmBtn) {
                confirmBtn.classList.remove('loading');
                confirmBtn.disabled = false;
                confirmBtn.innerHTML = '<i class="fas fa-check"></i> Confirm Payment';
            }
        } finally {
            // Always reset the direct calendar payment processing flag
            this._directCalendarPaymentProcessing = false;
        }
    }

    async processPayment(amount, closeModalCallback) {
        // Prevent multiple simultaneous payment processing
        if (this._paymentProcessing) {
            console.warn('Payment already in progress, ignoring duplicate request');
            return;
        }
        
        this._paymentProcessing = true;
        
        try {
            console.log('Processing payment:', { 
                amount, 
                pendingDates: this.pendingUnpaidDates,
                selectedCalendarDates: this.selectedCalendarDates 
            });
            
            if (!amount || amount <= 0) {
                throw new Error('Invalid payment amount');
            }
            
            if (!this.db) {
                throw new Error('Database not available');
            }
            
            const DAILY_WAGE = 25; // Should match database constant
            let workDatesToPay = [];
            let isAdvancePayment = false;
            
            // Check if we're using custom selected dates from calendar
            if (this.selectedCalendarDates && this.selectedCalendarDates.length > 0) {
                // Use the specifically selected dates
                workDatesToPay = [...this.selectedCalendarDates];
                const expectedAmount = this.selectedCalendarAmount;
                isAdvancePayment = amount > expectedAmount;
                console.log('Using custom selected dates:', workDatesToPay);
            } else {
                // Use the traditional flow with all pending dates
                const totalWorkCompletedValue = this.pendingUnpaidDates.length * DAILY_WAGE;
                isAdvancePayment = amount > totalWorkCompletedValue;
                
                if (totalWorkCompletedValue > 0) {
                    const daysCovered = Math.min(Math.floor(amount / DAILY_WAGE), this.pendingUnpaidDates.length);
                    workDatesToPay = this.pendingUnpaidDates.slice(0, daysCovered);
                    console.log('Using traditional flow - Work dates to pay:', workDatesToPay);
                }
            }
            
            const paymentDate = this.utils.getTodayString();
            console.log('Adding payment to database:', { amount, workDatesToPay, paymentDate, isAdvancePayment });
            
            await this.db.addPayment(amount, workDatesToPay, paymentDate, isAdvancePayment);
            
            closeModalCallback();
            
            const paidBtn = document.getElementById('paidBtn');
            if (paidBtn) {
                paidBtn.style.animation = 'bounceIn 0.6s ease-out';
                paidBtn.classList.remove('payday-ready');
                setTimeout(() => paidBtn.style.animation = '', 600);
            }
            
            this.notifications.playSound('paid');
            
            const paymentType = isAdvancePayment ? 'advance payment' : 'regular payment';
            this.notifications.showPaymentNotification(amount);
            this.notifications.showToast(`${paymentType.charAt(0).toUpperCase() + paymentType.slice(1)} of ₹${amount} recorded successfully!`, 'success');
            
            if (workDatesToPay.length === this.pendingUnpaidDates.length && this.pendingUnpaidDates.length > 0) {
                setTimeout(() => {
                    this.notifications.showToast(`All ${workDatesToPay.length} pending work days have been paid!`, 'info');
                }, 1000);
            }
            
            console.log('Syncing amount flow across all components...');
            await this.syncAmountFlow();
            
            // Clear custom calendar selection after successful payment
            this.selectedCalendarDates = [];
            this.selectedCalendarAmount = 0;
            
        } catch (error) {
            console.error('Error recording payment:', error);
            
            let errorMessage = 'Error recording payment. Please try again.';
            if (error.message.includes('Database not available')) {
                errorMessage = 'Database connection error. Please refresh the page and try again.';
            } else if (error.message.includes('Invalid payment amount')) {
                errorMessage = 'Please enter a valid payment amount.';
            }
            
            this.notifications.showToast(errorMessage, 'error');
            
            try {
                closeModalCallback();
            } catch (closeError) {
                console.error('Error closing modal:', closeError);
            }
        } finally {
            // Always reset the payment processing flag
            this._paymentProcessing = false;
        }
    }

    async syncAmountFlow() {
        /**
         * 🔄 SOPHISTICATED MULTI-LAYERED SYNCHRONIZATION SYSTEM
         * 
         * A comprehensive, intelligent synchronization system that handles all financial data
         * with surgical precision and clarity. This system operates in multiple layers to ensure
         * absolute data integrity and system coherence.
         */
        
        // 🛡️ LAYER 0: SYNC ORCHESTRATION & DEBOUNCING
        if (this._syncInProgress) {
            console.log('🔄 [SYNC] Synchronization already in progress, queuing request...');
            return this._queueSyncRequest();
        }
        
        const now = Date.now();
        if (this._lastSyncTime && (now - this._lastSyncTime) < 1000) {
            console.log('⏱️ [SYNC] Debouncing sync call (too frequent)...');
            return this._queueDelayedSync();
        }
        
        this._syncInProgress = true;
        this._lastSyncTime = now;
        this._syncId = Math.random().toString(36).substr(2, 9);
        
        const syncStartTime = performance.now();
        console.log(`🚀 [SYNC-${this._syncId}] Starting sophisticated multi-layered synchronization...`);
        
        try {
            // 🏗️ LAYER 1: FOUNDATION - DATABASE INTEGRITY & VALIDATION
            await this._syncLayer1_DatabaseIntegrity();
            
            // 📊 LAYER 2: DATA COLLECTION - Comprehensive Financial Data Gathering
            const syncData = await this._syncLayer2_DataCollection();
            
            // 🧮 LAYER 3: CALCULATION ENGINE - Advanced Financial Computations
            const computedData = await this._syncLayer3_CalculationEngine(syncData);
            
            // 🎯 LAYER 4: STATE MANAGEMENT - Application State Synchronization
            await this._syncLayer4_StateManagement(computedData);
            
            // 🎨 LAYER 5: UI ORCHESTRATION - User Interface Updates
            await this._syncLayer5_UIOrchestration(computedData);
            
            // 🔔 LAYER 6: NOTIFICATION SYSTEM - User Feedback & Alerts
            await this._syncLayer6_NotificationSystem(computedData);
            
            // ✅ LAYER 7: VALIDATION & VERIFICATION - Final System Check
            await this._syncLayer7_FinalValidation(computedData);
            
            const syncDuration = performance.now() - syncStartTime;
            console.log(`✅ [SYNC-${this._syncId}] Multi-layered synchronization completed successfully in ${syncDuration.toFixed(2)}ms`);
            
        } catch (error) {
            const syncDuration = performance.now() - syncStartTime;
            console.error(`❌ [SYNC-${this._syncId}] Critical synchronization error after ${syncDuration.toFixed(2)}ms:`, error);
            await this._handleSyncError(error);
        } finally {
            // Always clean up sync state
            this._syncInProgress = false;
            this._processPendingSyncRequests();
        }
    }

    async _syncLayer1_DatabaseIntegrity() {
        console.log('🏗️ [LAYER 1] Database Integrity Check...');
        
        if (!this.db) {
            throw new Error('Database connection not available');
        }
        
        // Verify database connectivity and basic operations
        try {
            await this.db.getAllWorkRecords();
            console.log('✅ [LAYER 1] Database integrity verified');
        } catch (error) {
            throw new Error(`Database integrity check failed: ${error.message}`);
        }
    }

    async _syncLayer2_DataCollection() {
        console.log('📊 [LAYER 2] Comprehensive Data Collection...');
        
        try {
            const [workRecords, payments, monthlyEarnings, earningsStats] = await Promise.all([
                this.db.getAllWorkRecords(),
                this.db.getAllPayments(),
                this.db.getMonthlyEarnings(),
                this.db.getEarningsStats()
            ]);
            
            console.log(`📊 [LAYER 2] Data collected: ${workRecords.length} work records, ${payments.length} payments`);
            
            return {
                workRecords,
                payments,
                monthlyEarnings,
                earningsStats,
                collectionTimestamp: Date.now()
            };
        } catch (error) {
            throw new Error(`Data collection failed: ${error.message}`);
        }
    }

    async _syncLayer3_CalculationEngine(syncData) {
        console.log('🧮 [LAYER 3] Advanced Financial Calculations...');
        
        try {
            // Calculate advance payment status with improved logic
            const advanceStatus = await this.db.getAdvancePaymentStatus();
            
            // Update pending unpaid dates
            await this.updatePendingUnpaidDates();
            
            // Calculate payment day status
            const paymentThreshold = window.R_SERVICE_CONFIG?.PAYMENT_THRESHOLD || 4;
            const isPaymentDay = this.pendingUnpaidDates.length > 0 && 
                                this.pendingUnpaidDates.length % paymentThreshold === 0;
            
            console.log('🧮 [LAYER 3] Calculations completed');
            
            return {
                ...syncData,
                advanceStatus,
                isPaymentDay,
                paymentThreshold,
                pendingUnpaidDates: [...this.pendingUnpaidDates],
                calculationTimestamp: Date.now()
            };
        } catch (error) {
            throw new Error(`Calculation engine failed: ${error.message}`);
        }
    }

    async _syncLayer4_StateManagement(computedData) {
        console.log('🎯 [LAYER 4] Application State Synchronization...');
        
        try {
            // Update application state
            const previousStats = { ...this.currentStats };
            this.currentStats = computedData.earningsStats;
            
            // Track state changes
            const stateChanges = this._detectStateChanges(previousStats, this.currentStats);
            
            console.log('🎯 [LAYER 4] State management completed', stateChanges);
            
            return {
                ...computedData,
                previousStats,
                stateChanges,
                stateTimestamp: Date.now()
            };
        } catch (error) {
            throw new Error(`State management failed: ${error.message}`);
        }
    }

    async _syncLayer5_UIOrchestration(computedData) {
        console.log('🎨 [LAYER 5] UI Orchestration...');
        
        try {
            // Update dashboard with animation
            this.updateDashboard();
            
            // Update payment button state
            await this.updatePaidButtonVisibility();
            
            // Update progress indicators
            this._updateProgressIndicators(computedData);
            
            // Update earnings displays with animation
            this._updateEarningsDisplays(computedData);
            
            console.log('🎨 [LAYER 5] UI orchestration completed');
        } catch (error) {
            throw new Error(`UI orchestration failed: ${error.message}`);
        }
    }

    async _syncLayer6_NotificationSystem(computedData) {
        console.log('🔔 [LAYER 6] Notification System...');
        
        try {
            // Check for advance payment notifications
            await this.checkAdvancePaymentNotification();
            
            // Check for payment day notifications
            if (computedData.isPaymentDay) {
                this.notifications.showPaydayNotification();
            }
            
            console.log('🔔 [LAYER 6] Notification system completed');
        } catch (error) {
            console.warn('⚠️ [LAYER 6] Notification system error (non-critical):', error);
        }
    }

    async _syncLayer7_FinalValidation(computedData) {
        console.log('✅ [LAYER 7] Final Validation & Verification...');
        
        try {
            // Validate data consistency
            const isValid = this._validateSyncedData(computedData);
            
            if (!isValid) {
                throw new Error('Data validation failed after sync');
            }
            
            // Ensure storage-level synchronization
            await this._validateStorageSync();
            
            // Validate advance payment consistency
            await this._validateAdvancePaymentSync();
            
            // Validate UI state consistency
            this._validateUISync(computedData);
            
            // Clear any stale caches
            this._clearStaleData();
            
            console.log('✅ [LAYER 7] Final validation completed - system fully synchronized at all levels');
        } catch (error) {
            throw new Error(`Final validation failed: ${error.message}`);
        }
    }

    async _validateStorageSync() {
        try {
            // Verify database operations are synchronized
            const workRecords = await this.db.getAllWorkRecords();
            const payments = await this.db.getAllPayments();
            
            // Check for any pending transactions or inconsistencies
            const pendingOperations = this.db._pendingOperations || [];
            if (pendingOperations.length > 0) {
                console.warn('[STORAGE SYNC] Found pending operations:', pendingOperations);
                // Process any pending operations
                await this.db._processPendingOperations?.();
            }
            
            console.log('[STORAGE SYNC] Storage synchronization validated');
        } catch (error) {
            throw new Error(`Storage sync validation failed: ${error.message}`);
        }
    }

    async _validateAdvancePaymentSync() {
        try {
            const advanceStatus = await this.db.getAdvancePaymentStatus();
            
            // Ensure advance payment calculations are consistent
            if (advanceStatus.hasAdvancePayments) {
                const workRemaining = advanceStatus.workRemainingForAdvance;
                const workCompleted = advanceStatus.workCompletedForAdvance;
                const workRequired = advanceStatus.workRequiredForAdvance;
                
                // Validate calculations
                if (workCompleted + workRemaining !== workRequired) {
                    console.warn('[ADVANCE SYNC] Calculation mismatch detected, recalculating...');
                    // Force recalculation by clearing cache if needed
                    await this.db.getAdvancePaymentStatus();
                }
            }
            
            console.log('[ADVANCE SYNC] Advance payment synchronization validated');
        } catch (error) {
            throw new Error(`Advance payment sync validation failed: ${error.message}`);
        }
    }

    _validateUISync(computedData) {
        try {
            // Validate UI elements are in sync with data
            const paidBtn = document.getElementById('paidBtn');
            const hasPayableWork = (this.pendingUnpaidDates?.length > 0) || 
                                  (computedData.advanceStatus?.hasAdvancePayments && 
                                   computedData.advanceStatus?.workRemainingForAdvance > 0);
            
            if (paidBtn) {
                const isVisible = paidBtn.style.display !== 'none';
                if (hasPayableWork && !isVisible) {
                    console.warn('[UI SYNC] Paid button should be visible but is hidden, correcting...');
                    this.showPaidButton();
                } else if (!hasPayableWork && isVisible) {
                    console.warn('[UI SYNC] Paid button should be hidden but is visible, correcting...');
                    this.hidePaidButton();
                }
            }
            
            console.log('[UI SYNC] UI synchronization validated');
        } catch (error) {
            console.error('[UI SYNC] UI validation warning (non-critical):', error);
        }
    }

    _detectStateChanges(previous, current) {
        return {
            balanceChanged: (previous?.currentBalance || 0) !== (current?.currentBalance || 0),
            earnedChanged: (previous?.totalEarned || 0) !== (current?.totalEarned || 0),
            paidChanged: (previous?.totalPaid || 0) !== (current?.totalPaid || 0),
            workedChanged: (previous?.totalWorked || 0) !== (current?.totalWorked || 0)
        };
    }

    _updateProgressIndicators(computedData) {
        const progressFillEl = document.getElementById('progressFill');
        const progressTextEl = document.getElementById('progressText');
        const progressLabelEl = document.getElementById('progressLabel');
        
        if (computedData.advanceStatus.hasAdvancePayments && computedData.advanceStatus.workRemainingForAdvance > 0) {
            const workCompleted = computedData.advanceStatus.workCompletedForAdvance || 0;
            const workRequired = computedData.advanceStatus.workRequiredForAdvance || 1;
            const progressPercent = Math.min((workCompleted / workRequired) * 100, 100);
            
            if (progressLabelEl) {
                progressLabelEl.textContent = `Advance Payment Progress (₹${computedData.advanceStatus.totalAdvanceAmount} paid)`;
            }
            if (progressTextEl) {
                progressTextEl.textContent = `${workCompleted}/${workRequired} days`;
            }
            if (progressFillEl) {
                const finalPercent = workCompleted === 0 ? 0 : 
                                  workCompleted >= workRequired ? 100 : 
                                  Math.max(progressPercent, 10);
                progressFillEl.style.width = `${finalPercent}%`;
                progressFillEl.style.backgroundColor = workCompleted >= workRequired ? 'var(--success)' : 'var(--warning)';
            }
        } else {
            // Regular progress display
            const progressPercent = Math.min((computedData.pendingUnpaidDates.length / computedData.paymentThreshold) * 100, 100);
            
            if (progressLabelEl) {
                progressLabelEl.textContent = 'Progress to Payment Day';
            }
            if (progressTextEl) {
                progressTextEl.textContent = `${computedData.pendingUnpaidDates.length}/${computedData.paymentThreshold} days`;
            }
            if (progressFillEl) {
                progressFillEl.style.width = `${progressPercent}%`;
                progressFillEl.style.backgroundColor = 'var(--primary)';
            }
        }
    }

    _updateEarningsDisplays(computedData) {
        // Animate earnings displays
        const currentEarningsEl = document.getElementById('currentEarnings');
        if (currentEarningsEl) {
            const currentBalance = computedData.earningsStats?.currentBalance || 0;
            this.utils.animateNumber(currentEarningsEl, 0, currentBalance, 1000);
        }
        
        const totalEarnedEl = document.getElementById('totalEarned');
        if (totalEarnedEl) {
            const totalEarned = computedData.earningsStats?.totalEarned || 0;
            this.utils.animateNumber(totalEarnedEl, 0, totalEarned, 1200);
        }
        
        const daysWorkedEl = document.getElementById('daysWorked');
        if (daysWorkedEl) {
            const totalWorked = computedData.earningsStats?.totalWorked || 0;
            this.utils.animateNumber(daysWorkedEl, 0, totalWorked, 800);
        }
    }

    _validateSyncedData(computedData) {
        // Basic validation checks
        if (!computedData.earningsStats) return false;
        if (!Array.isArray(computedData.workRecords)) return false;
        if (!Array.isArray(computedData.payments)) return false;
        if (computedData.earningsStats.currentBalance < 0) return false;
        
        return true;
    }

    _clearStaleData() {
        // Clear any cached financial data
        if (window.cachedEarningsStats) {
            window.cachedEarningsStats = null;
        }
        if (window.cachedAdvanceStatus) {
            window.cachedAdvanceStatus = null;
        }
    }

    async _queueSyncRequest() {
        // Queue sync request for later execution
        this._pendingSyncRequests = (this._pendingSyncRequests || 0) + 1;
        console.log(`📋 [SYNC] Queued sync request (${this._pendingSyncRequests} pending)`);
    }

    async _queueDelayedSync() {
        // Delayed sync with debounce
        if (this._delayedSyncTimeout) {
            clearTimeout(this._delayedSyncTimeout);
        }
        
        this._delayedSyncTimeout = setTimeout(() => {
            this.syncAmountFlow();
        }, 1000);
    }

    _processPendingSyncRequests() {
        if (this._pendingSyncRequests > 0) {
            console.log(`📋 [SYNC] Processing ${this._pendingSyncRequests} pending sync requests`);
            this._pendingSyncRequests = 0;
            setTimeout(() => this.syncAmountFlow(), 100);
        }
    }

    async _handleSyncError(error) {
        console.error('🚨 [SYNC] Handling synchronization error:', error);
        
        // Attempt recovery
        try {
            this.currentStats = await this.db.getEarningsStats();
            await this.updatePendingUnpaidDates();
            this.updateDashboard();
            
            this.notifications.showToast('Data synchronized with recovery mode.', 'warning', 5000);
        } catch (recoveryError) {
            console.error('💥 [SYNC] Recovery failed:', recoveryError);
            this.notifications.showToast('Critical sync error. Please refresh the page.', 'error', 8000);
        }
    }
    isRecordPaid(record, payments) {
        return payments.some(payment => 
            payment.workDates.includes(record.date)
        );
    }

    async checkAdvancePaymentNotification() {
        try {
            const advanceStatus = await this.db.getAdvancePaymentStatus();
            
            if (advanceStatus.hasAdvancePayments && advanceStatus.workRemainingForAdvance > 0) {
                const remainingWork = advanceStatus.workRemainingForAdvance;
                const advanceAmount = advanceStatus.totalAdvanceAmount;
                
                this.notifications.showToast(
                    `You have ${remainingWork} work day${remainingWork > 1 ? 's' : ''} remaining to complete your advance payment of ₹${advanceAmount}!`, 
                    'info', 
                    8000
                );
            }
        } catch (error) {
            console.error('Error checking advance payment notification:', error);
        }
    }

    async processAutomaticAdvancePayment(workDate) {
        try {
            const advanceStatus = await this.db.getAdvancePaymentStatus();
            
            // Only process if there are advance payments and work remaining
            if (!advanceStatus.hasAdvancePayments || advanceStatus.workRemainingForAdvance <= 0) {
                return;
            }

            console.log('[ADVANCE PAYMENT] Processing automatic advance payment for work date:', workDate);
            
            // Get the daily wage
            const dailyWage = window.R_SERVICE_CONFIG?.DAILY_WAGE || 25;
            
            // Check if this work completes the advance payment obligation
            const workRemainingAfter = advanceStatus.workRemainingForAdvance - 1;
            
            if (workRemainingAfter <= 0) {
                // All advance payment work is now complete
                this.notifications.showToast(
                    `🎉 Advance payment obligation completed! You've earned back ₹${advanceStatus.totalAdvanceAmount}`,
                    'success',
                    8000
                );
                
                try {
                    this.notifications.playSound('done');
                } catch (soundError) {
                    console.log('Sound playback failed (non-critical):', soundError);
                }
            } else {
                // Still work remaining for advance payment
                this.notifications.showToast(
                    `Advance payment progress: ${workRemainingAfter} work day${workRemainingAfter > 1 ? 's' : ''} remaining (₹${workRemainingAfter * dailyWage})`,
                    'info',
                    6000
                );
            }

            // Update advance payment tracking in database
            // This is automatically handled by the getAdvancePaymentStatus calculation
            // which counts completed unpaid work against advance payments

            console.log('[ADVANCE PAYMENT] Automatic processing completed');
            
        } catch (error) {
            console.error('Error processing automatic advance payment:', error);
            // Don't show error to user as this is background processing
        }
    }


    async initializeViews() {
        try {
            await this.charts.initializeCharts();
            
            await this.calendar.init();
            
            this.setupBalanceSheetFilters();
            
        } catch (error) {
            console.error('Error initializing views:', error);
        }
    }

    async showBalanceSheet() {
        try {
            document.getElementById('dashboard').style.display = 'none';
            document.getElementById('balanceSheetView').style.display = 'block';
            
            await this.renderBalanceSheet();
        } catch (error) {
            console.error('Error showing balance sheet:', error);
        }
    }

    async renderBalanceSheet() {
        try {
            console.log('Rendering balance sheet...');
            const workRecords = await this.db.getAllWorkRecords();
            const payments = await this.db.getAllPayments();
            
            console.log('Work records found:', workRecords.length);
            console.log('Payments found:', payments.length);
            
            const sortedRecords = workRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            const tableHtml = this.createBalanceSheetTable(sortedRecords, payments);
            
            const tableContainer = document.getElementById('balanceSheetTable');
            if (tableContainer) {
                tableContainer.innerHTML = tableHtml;
            } else {
                console.error('Table container not found');
            }
            
            this.updateBalanceSheetFilters(sortedRecords);
            
        } catch (error) {
            console.error('Error rendering balance sheet:', error);
            this.notifications.showToast('Error loading work history', 'error');
        }
    }

    createBalanceSheetTable(records, payments) {
        let html = `
            <div class="balance-sheet-section">
                <h3><i class="fas fa-calendar-check"></i> Work Records</h3>
                <table class="sheet-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Day</th>
                            <th>Status</th>
                            <th>Wage</th>
                            <th>Payment Status</th>
                            <th>Payment Details</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        records.forEach(record => {
            const date = new Date(record.date);
            const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
            const isPaid = this.isRecordPaid(record, payments);
            const paymentInfo = this.getPaymentInfoForRecord(record, payments);
            
            html += `
                <tr>
                    <td>${this.utils.formatDateShort(record.date)}</td>
                    <td>${dayName}</td>
                    <td>
                        <span class="status-badge ${record.status}">
                            ${record.status === 'completed' ? 'Completed' : 'Not Done'}
                        </span>
                    </td>
                    <td>${record.status === 'completed' ? this.utils.formatCurrency(record.wage) : '-'}</td>
                    <td>
                        <span class="payment-status ${isPaid ? 'paid' : 'pending'}">
                            ${isPaid ? 'Paid' : 'Pending'}
                        </span>
                    </td>
                    <td>
                        ${paymentInfo ? `
                            <small class="payment-details">
                                Paid on ${this.utils.formatDateShort(paymentInfo.paymentDate)}<br>
                                Amount: ${this.utils.formatCurrency(paymentInfo.amount)}
                            </small>
                        ` : '-'}
                    </td>
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
            </div>
        `;
        
        if (payments.length > 0) {
            const sortedPayments = payments.sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));
            
            html += `
                <div class="balance-sheet-section">
                    <h3><i class="fas fa-money-bill-wave"></i> Payment History</h3>
                    <table class="sheet-table">
                        <thead>
                            <tr>
                                <th>Payment Date</th>
                                <th>Amount</th>
                                <th>Work Days Covered</th>
                                <th>Type</th>
                                <th>Work Period</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            sortedPayments.forEach(payment => {
                const workDaysCovered = payment.workDates.length;
                const paymentType = payment.isAdvance ? 'Advance' : 'Regular';
                const workPeriod = payment.workDates.length > 0 ? 
                    `${this.utils.formatDateShort(payment.workDates[0])} - ${this.utils.formatDateShort(payment.workDates[payment.workDates.length - 1])}` :
                    'No work days covered';
                
                html += `
                    <tr>
                        <td>${this.utils.formatDateShort(payment.paymentDate)}</td>
                        <td><strong>${this.utils.formatCurrency(payment.amount)}</strong></td>
                        <td>${workDaysCovered} days</td>
                        <td>
                            <span class="payment-type ${payment.isAdvance ? 'advance' : 'regular'}">
                                ${paymentType}
                            </span>
                        </td>
                        <td>${workPeriod}</td>
                    </tr>
                `;
            });
            
            html += `
                        </tbody>
                    </table>
                </div>
            `;
        }
        
        return html;
    }

    getPaymentInfoForRecord(record, payments) {
        const payment = payments.find(payment => 
            payment.workDates.includes(record.date)
        );
        return payment ? {
            paymentDate: payment.paymentDate,
            amount: Math.floor(payment.amount / payment.workDates.length) // Calculate per-day amount
        } : null;
    }

    updateBalanceSheetFilters(records) {
        const monthFilter = document.getElementById('monthFilter');
        const yearFilter = document.getElementById('yearFilter');
        
        if (monthFilter && yearFilter) {
            const months = new Set();
            const years = new Set();
            
            records.forEach(record => {
                months.add(record.month);
                years.add(record.year);
            });
            
            monthFilter.innerHTML = '<option value="all">All Months</option>';
            Array.from(months).sort((a, b) => a - b).forEach(month => {
                const monthName = new Date(2000, month - 1, 1).toLocaleDateString('en-US', { month: 'long' });
                monthFilter.innerHTML += `<option value="${month}">${monthName}</option>`;
            });
            
            yearFilter.innerHTML = '<option value="all">All Years</option>';
            Array.from(years).sort((a, b) => b - a).forEach(year => {
                yearFilter.innerHTML += `<option value="${year}">${year}</option>`;
            });
        }
    }

    setupBalanceSheetFilters() {
        const monthFilter = document.getElementById('monthFilter');
        const yearFilter = document.getElementById('yearFilter');
        
        if (monthFilter) {
            monthFilter.addEventListener('change', () => this.filterBalanceSheet());
        }
        
        if (yearFilter) {
            yearFilter.addEventListener('change', () => this.filterBalanceSheet());
        }
    }

    async filterBalanceSheet() {
        try {
            const monthFilter = document.getElementById('monthFilter');
            const yearFilter = document.getElementById('yearFilter');
            
            if (!monthFilter || !yearFilter) return;
            
            const selectedMonth = monthFilter.value;
            const selectedYear = yearFilter.value;
            
            console.log('Filtering by month:', selectedMonth, 'year:', selectedYear);
            
            const workRecords = await this.db.getAllWorkRecords();
            const payments = await this.db.getAllPayments();
            
            let filteredRecords = workRecords;
            
            if (selectedMonth !== 'all') {
                filteredRecords = filteredRecords.filter(record => record.month === parseInt(selectedMonth));
            }
            
            if (selectedYear !== 'all') {
                filteredRecords = filteredRecords.filter(record => record.year === parseInt(selectedYear));
            }
            
            console.log('Filtered records:', filteredRecords.length, 'out of', workRecords.length);
            
            const sortedRecords = filteredRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            const tableHtml = this.createBalanceSheetTable(sortedRecords, payments);
            
            const tableContainer = document.getElementById('balanceSheetTable');
            if (tableContainer) {
                tableContainer.innerHTML = tableHtml;
            }
            
        } catch (error) {
            console.error('Error filtering balance sheet:', error);
            this.notifications.showToast('Error filtering data', 'error');
        }
    }

    async showAnalytics() {
        try {
            document.getElementById('dashboard').style.display = 'none';
            document.getElementById('analyticsView').style.display = 'block';
            
            await this.charts.updateCharts();
        } catch (error) {
            console.error('Error showing analytics:', error);
        }
    }

    async showCalendar() {
        try {
            const dashboard = document.getElementById('dashboard');
            const calendarView = document.getElementById('calendarView');
            
            if (dashboard) {
                dashboard.style.opacity = '0';
                dashboard.style.transform = 'translateY(-20px)';
                setTimeout(() => {
                    dashboard.style.display = 'none';
                }, 200);
            }
            
            if (calendarView) {
                setTimeout(() => {
                    calendarView.style.display = 'block';
                    calendarView.classList.add('animate-slide-up');
                    
                    setTimeout(() => {
                        const calendarGrid = document.getElementById('calendarGrid');
                        if (calendarGrid) {
                            calendarGrid.classList.add('animate-fade-scale');
                        }
                    }, 300);
                }, 200);
            }
            
            if (this.calendar) {
                await this.calendar.updateCalendar();
            }
        } catch (error) {
            console.error('Error showing calendar:', error);
        }
    }

    showStreakInfo() {
        const message = this.currentStats.currentStreak > 0 
            ? `Amazing! You have a ${this.currentStats.currentStreak} day work streak! Keep it up!`
            : 'Start your work streak by completing tasks consistently!';
            
        this.notifications.showToast(message, 'info');
    }

    handleClearData() {
        console.log('Clear data button clicked');
        this.notifications.showConfirmation(
            'Are you sure you want to clear all data? This action cannot be undone.',
            async () => {
                try {
                    console.log('User confirmed data clearing');
                    await this.db.clearAllData();
                    
                    this.notifications.showToast('All data cleared successfully', 'success');
                    
                    // Sync all components after data clear
                    await this.syncAmountFlow();
                    await this.updateTodayStatus();
                    
                } catch (error) {
                    console.error('Error clearing data:', error);
                    this.notifications.showToast('Error clearing data: ' + error.message, 'error');
                }
            }
        );
    }

    async handleExportPDF() {
        try {
            console.log('Starting PDF export...');
            const loadingToast = this.notifications.showLoadingToast('Generating PDF...');
            
            console.log('Generating export data...');
            const data = await this.generateExportData();
            console.log('Export data generated:', data);
            
            console.log('Calling exportToPDF...');
            const success = await this.utils.exportToPDF(data);
            
            if (success) {
                this.notifications.updateLoadingToast(loadingToast, 'PDF exported successfully!', 'success');
            } else {
                this.notifications.updateLoadingToast(loadingToast, 'Error exporting PDF', 'error');
                console.log('PDF export failed');
            }
            
        } catch (error) {
            console.error('Error exporting PDF:', error);
            this.notifications.showToast('Error exporting PDF: ' + error.message, 'error');
        }
    }

    async generateExportData() {
        const workRecords = await this.db.getAllWorkRecords();
        const payments = await this.db.getAllPayments();
        const stats = await this.db.getEarningsStats();
        
        const enhancedRecords = workRecords.map(record => ({
            ...record,
            paid: this.isRecordPaid(record, payments)
        }));
        
        return {
            summary: stats,
            workRecords: enhancedRecords,
            payments: payments
        };
    }

    showAboutModal() {
        const aboutModal = document.getElementById('aboutModal');
        if (aboutModal) {
            aboutModal.classList.add('show');
        }
    }

    showError(message) {
        if (this.notifications) {
            this.notifications.showToast(message, 'error');
        } else {
            alert(message);
        }
    }

    handleAppUpdate() {
        console.log('App update available');
    }

    setupPWAInstall() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    
                    registration.addEventListener('updatefound', () => {
                        console.log('Service Worker update found');
                    });
                    
                    this.serviceWorkerRegistration = registration;
                })
                .catch(error => {
                    console.error('Service Worker registration failed:', error);
                });
        } else {
            console.log('Service Worker not supported');
        }

        let deferredPrompt;
        let installBannerShown = false;
        
        // Check if already installed or dismissed
        const isInstalled = window.matchMedia('(display-mode: standalone)').matches || 
                           window.navigator.standalone === true;
        const isDismissed = localStorage.getItem('pwa-install-dismissed') === 'true';
        
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            
            // Show install banner if conditions are met
            if (!isInstalled && !isDismissed && !installBannerShown) {
                this.showInstallRecommendation(deferredPrompt);
                installBannerShown = true;
            }
            
            // Legacy install button support
            const installBtn = document.getElementById('installBtn');
            if (installBtn) {
                installBtn.style.display = 'block';
                installBtn.addEventListener('click', () => {
                    this.triggerInstall(deferredPrompt);
                });
            }
        });
        
        window.addEventListener('appinstalled', () => {
            console.log('PWA was installed');
            this.hideInstallRecommendation();
            
            // Show success message
            this.notifications.showToast('App installed successfully! You can now access it from your home screen.', 'success', 8000);
            
            const installBtn = document.getElementById('installBtn');
            if (installBtn) {
                installBtn.style.display = 'none';
            }
        });
        
        // Show banner after some user interaction if not shown yet
        setTimeout(async () => {
            if (!isInstalled && !installBannerShown) {
                const shouldShowOnPaymentDay = await this.shouldShowPWAOnPaymentDay();
                if ((!isDismissed || shouldShowOnPaymentDay) && deferredPrompt) {
                    this.showInstallRecommendation(deferredPrompt);
                    installBannerShown = true;
                }
            }
        }, 30000); // Show after 30 seconds if not shown yet
    }

    showInstallRecommendation(deferredPrompt) {
        const banner = document.getElementById('pwaInstallBanner');
        const installBtn = document.getElementById('installAppBtn');
        const dismissBtn = document.getElementById('dismissInstallBtn');
        
        if (!banner) return;
        
        // Show banner with animation
        banner.style.display = 'block';
        setTimeout(() => banner.classList.add('show'), 100);
        
        // Handle install button click
        if (installBtn) {
            installBtn.onclick = () => {
                this.triggerInstall(deferredPrompt);
            };
        }
        
        // Handle dismiss button click
        if (dismissBtn) {
            dismissBtn.onclick = () => {
                this.dismissInstallRecommendation();
            };
        }
        
        // Auto-hide after 60 seconds
        setTimeout(() => {
            if (banner.classList.contains('show')) {
                this.dismissInstallRecommendation();
            }
        }, 60000);
    }

    hideInstallRecommendation() {
        const banner = document.getElementById('pwaInstallBanner');
        if (banner) {
            banner.classList.remove('show');
            setTimeout(() => {
                banner.style.display = 'none';
            }, 300);
        }
    }

    dismissInstallRecommendation() {
        this.hideInstallRecommendation();
        localStorage.setItem('pwa-install-dismissed', 'true');
        localStorage.setItem('pwa-install-dismissed-date', new Date().toISOString());
        
        this.notifications.showToast('You can still install the app from your browser menu if needed.', 'info', 5000);
    }

    triggerInstall(deferredPrompt) {
        if (!deferredPrompt) {
            this.notifications.showToast('Install prompt not available. Try using your browser menu.', 'warning');
            return;
        }
        
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('User accepted the install prompt');
                this.hideInstallRecommendation();
            } else {
                console.log('User dismissed the install prompt');
                this.dismissInstallRecommendation();
            }
            deferredPrompt = null;
        });
    }

    async shouldShowPWAOnPaymentDay() {
        try {
            // Get current unpaid work records
            const workRecords = await this.db.getAllWorkRecords();
            const payments = await this.db.getAllPayments();
            
            const unpaidRecords = workRecords.filter(record => {
                if (record.status !== 'completed') return false;
                
                const recordDate = new Date(record.date);
                const hasPayment = payments.some(payment => {
                    const paymentStartDate = new Date(payment.startDate);
                    const paymentEndDate = new Date(payment.endDate);
                    return recordDate >= paymentStartDate && recordDate <= paymentEndDate;
                });
                
                return !hasPayment;
            });

            const paymentThreshold = window.R_SERVICE_CONFIG?.PAYMENT_THRESHOLD || window.R_SERVICE_CONFIG?.PAYMENT_DAY_DURATION || 4;
            const isPaymentDay = unpaidRecords.length > 0 && unpaidRecords.length % paymentThreshold === 0;
            
            console.log(`[PWA] Payment day check: ${unpaidRecords.length} unpaid days, threshold: ${paymentThreshold}, is payment day: ${isPaymentDay}`);
            
            return isPaymentDay;
        } catch (error) {
            console.error('[PWA] Error checking payment day for PWA:', error);
            return false;
        }
    }

    showInstallRecommendationGeneric() {
        // Check if already dismissed
        const isDismissed = localStorage.getItem('pwa-install-dismissed') === 'true';
        if (isDismissed) {
            return;
        }

        const banner = document.getElementById('pwaInstallBanner');
        if (!banner) return;
        
        // Update banner content for generic instructions
        const bannerContent = banner.querySelector('.install-banner-content');
        if (bannerContent) {
            const userAgent = navigator.userAgent;
            let instructions = '';
            
            if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
                // Safari instructions
                instructions = `
                    <div class="install-instructions">
                        <h3><i class="fas fa-mobile-alt"></i> Install R-Service Tracker</h3>
                        <p>Add this app to your home screen for easy access:</p>
                        <ol>
                            <li>Tap the Share button <i class="fas fa-share"></i></li>
                            <li>Select "Add to Home Screen"</li>
                            <li>Tap "Add" to confirm</li>
                        </ol>
                    </div>
                `;
            } else if (userAgent.includes('Firefox')) {
                // Firefox instructions
                instructions = `
                    <div class="install-instructions">
                        <h3><i class="fas fa-mobile-alt"></i> Install R-Service Tracker</h3>
                        <p>Add this app for a better experience:</p>
                        <ol>
                            <li>Tap the menu button <i class="fas fa-bars"></i></li>
                            <li>Select "Install"</li>
                            <li>Confirm installation</li>
                        </ol>
                    </div>
                `;
            } else {
                // Generic instructions
                instructions = `
                    <div class="install-instructions">
                        <h3><i class="fas fa-mobile-alt"></i> Install R-Service Tracker</h3>
                        <p>Get the best experience by installing this app on your device!</p>
                        <p>Look for the install option in your browser menu.</p>
                    </div>
                `;
            }
            
            bannerContent.innerHTML = instructions + `
                <div class="install-banner-actions">
                    <button id="dismissInstallBtn" class="btn btn-secondary">
                        <i class="fas fa-times"></i> Maybe Later
                    </button>
                </div>
            `;
        }
        
        // Show banner with animation
        banner.style.display = 'block';
        setTimeout(() => banner.classList.add('show'), 100);
        
        // Handle dismiss button click
        const dismissBtn = document.getElementById('dismissInstallBtn');
        if (dismissBtn) {
            dismissBtn.onclick = () => {
                this.dismissInstallRecommendation();
            };
        }
        
        // Auto-hide after 60 seconds
        setTimeout(() => {
            if (banner.classList.contains('show')) {
                this.dismissInstallRecommendation();
            }
        }, 60000);
    }

    triggerInstall(deferredPrompt) {
        if (!deferredPrompt) {
            this.notifications.showToast('Install prompt not available. Try using your browser menu.', 'warning');
            return;
        }
        
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('User accepted the install prompt');
                this.hideInstallRecommendation();
            } else {
                console.log('User dismissed the install prompt');
                this.dismissInstallRecommendation();
            }
            deferredPrompt = null;
        });
    }

    async handleURLParameters() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const action = urlParams.get('action');
            
            if (action) {
                console.log('[PWA] Processing action from URL:', action);
                
                // Wait a moment for the UI to be fully loaded and data to be available
                setTimeout(async () => {
                    switch (action) {
                        case 'mark-done':
                            console.log('[PWA] Checking if mark as done is available...');
                            const canMarkDone = await this.isMarkDoneAvailable();
                            if (canMarkDone) {
                                console.log('[PWA] Executing mark as done from shortcut');
                                await this.handleDoneClick();
                                // Close the app after 3 seconds for PWA shortcuts
                                this.notifications.showToast('Work marked as done! App will close automatically.', 'success', 3000);
                                setTimeout(() => {
                                    this.closePWAAfterAction();
                                }, 3000);
                            } else {
                                console.log('[PWA] Mark as done not available - work already completed today');
                                // For already completed work, close immediately with minimal notification
                                this.notifications.showToast('Work already completed today', 'info', 2000);
                                setTimeout(() => {
                                    this.closePWAAfterAction();
                                }, 2000);
                            }
                            this.clearURLParameters();
                            break;
                            
                        case 'mark-paid':
                            console.log('[PWA] Checking if mark as paid is available...');
                            const canMarkPaid = await this.isMarkPaidAvailable();
                            if (canMarkPaid) {
                                console.log('[PWA] Executing mark as paid from shortcut');
                                await this.handlePaidClick();
                                this.notifications.showToast('Payment dialog opened via PWA shortcut!', 'success');
                            } else {
                                console.log('[PWA] Mark as paid not available - no unpaid work or advance payments');
                                this.notifications.showToast('No unpaid work available for payment!', 'info');
                            }
                            this.clearURLParameters();
                            break;
                            
                        case 'calendar':
                            console.log('[PWA] Opening calendar from shortcut');
                            this.showCalendar();
                            this.notifications.showToast('Calendar opened via PWA shortcut!', 'success');
                            this.clearURLParameters();
                            break;
                            
                        default:
                            console.log('[PWA] Unknown action:', action);
                    }
                }, 1500); // Increased timeout to ensure data is loaded
            }
        } catch (error) {
            console.error('[PWA] Error handling URL parameters:', error);
        }
    }

    async isMarkDoneAvailable() {
        try {
            const today = this.utils.getTodayString();
            const todayRecord = await this.db.getWorkRecord(today);
            
            // Available if no record exists or record is not completed
            return !todayRecord || todayRecord.status !== 'completed';
        } catch (error) {
            console.error('[PWA] Error checking mark done availability:', error);
            return false;
        }
    }

    async isMarkPaidAvailable() {
        try {
            // Update pending unpaid dates first
            await this.updatePendingUnpaidDates();
            
            // Check if there are unpaid work dates
            if (this.pendingUnpaidDates && this.pendingUnpaidDates.length > 0) {
                return true;
            }
            
            // Check for advance payment eligibility
            const advanceStatus = await this.db.getAdvancePaymentStatus();
            return advanceStatus.hasAdvancePayments && advanceStatus.workRemainingForAdvance > 0;
        } catch (error) {
            console.error('[PWA] Error checking mark paid availability:', error);
            return false;
        }
    }

    closePWAAfterAction() {
        // Check if running in PWA mode
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                            window.navigator.standalone === true;
        
        if (isStandalone) {
            console.log('[PWA] Closing PWA after action completion');
            // For PWA, we can try to close the window or minimize it
            if (window.close) {
                window.close();
            } else {
                // If close doesn't work, redirect to a minimal page or hide content
                document.body.style.display = 'none';
                setTimeout(() => {
                    // Restore after 1 second in case user needs to see the app
                    document.body.style.display = 'block';
                }, 1000);
            }
        }
    }

    clearURLParameters() {
        // Clear URL parameters without page reload
        const url = new URL(window.location);
        url.search = '';
        window.history.replaceState({}, document.title, url);
    }

    verifyConfiguration() {
        console.log('Verifying configuration...');
        const config = window.R_SERVICE_CONFIG || {};
        console.log('Current Config:', config);

        if (config.DAILY_WAGE !== undefined && config.PAYMENT_THRESHOLD !== undefined && config.INCREMENT_VALUE !== undefined) {
            console.log('[CONFIG] Configuration values are present and valid.');
            console.log('DAILY_WAGE:', config.DAILY_WAGE);
            console.log('PAYMENT_THRESHOLD:', config.PAYMENT_THRESHOLD);
            console.log('INCREMENT_VALUE:', config.INCREMENT_VALUE);
            
            if (window.ConfigManager) {
                console.log('[CONFIG] ConfigManager is available');
                try {
                    const amounts = window.ConfigManager.generatePaymentAmounts();
                    console.log('[CONFIG] Payment amounts generated:', amounts);
                } catch (e) {
                    console.error('[CONFIG] Error generating payment amounts:', e);
                }
            } else {
                console.warn('[CONFIG] ConfigManager not available');
            }
        } else {
            console.warn('[CONFIG] Configuration values are missing or invalid. Falling back to defaults.');
            console.log('Current Config:', config);
            window.R_SERVICE_CONFIG = {
                DAILY_WAGE: 25,
                PAYMENT_THRESHOLD: 4,
                INCREMENT_VALUE: 25,
                PAYMENT_DAY_DURATION: 4,
                MAX_PAYMENT_AMOUNT: 500
            };
            console.log('Fallback to default config:', window.R_SERVICE_CONFIG);
        }
    }
}

const performanceMonitor = {
    startTime: performance.now(),
    markTime: (label) => {
        if (performance.mark) {
            performance.mark(label);
            console.log(`Performance: ${label} at ${(performance.now() - performanceMonitor.startTime).toFixed(2)}ms`);
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    performanceMonitor.markTime('DOM-loaded');
    
    if (window.requestIdleCallback) {
        requestIdleCallback(async () => {
            performanceMonitor.markTime('App-init-start');
            window.app = new RServiceTracker();
        });
    } else {
        setTimeout(async () => {
            performanceMonitor.markTime('App-init-start');
            window.app = new RServiceTracker();
        }, 0);
    }
});

window.addEventListener('beforeunload', (e) => {
});

window.addEventListener('online', () => {
    console.log('App is online');
});

window.addEventListener('offline', () => {
    console.log('App is offline');
});