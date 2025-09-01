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
            
            this.handleURLParameters();
            
            this.verifyConfiguration();
        } catch (error) {
            console.error('Error initializing application:', error);
        }
    }

    showLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        const mainContainer = document.getElementById('mainContainer');
        
        if (loadingScreen) {
            loadingScreen.style.display = 'flex';
        }
        
        if (mainContainer) {
            mainContainer.style.display = 'none';
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
                    }
                }, 500);
            } else if (mainContainer) {
                mainContainer.style.display = 'block';
            }
        }, 2000);
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
            this.charts.updateCharts();
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
            }
            
            const incrementInput = document.getElementById('incrementValue');
            const durationInput = document.getElementById('paymentDuration');
            const maxPaymentInput = document.getElementById('maxPaymentAmount');

            if (incrementInput) incrementInput.value = config.INCREMENT_VALUE || 25;
            if (durationInput) durationInput.value = config.PAYMENT_DAY_DURATION || 4;
            if (maxPaymentInput) maxPaymentInput.value = config.MAX_PAYMENT_AMOUNT || 500;
            
        } catch (error) {
            console.error('Error loading settings:', error);
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
        }

        return isValid;
    }

    showValidationError(input, message) {
        input.classList.add('error');
        
        const errorEl = document.createElement('div');
        errorEl.className = 'validation-error';
        errorEl.textContent = message;
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
                
                setTimeout(async () => {
                    try {
                        if (this.db) {
                            await this.db.performTransaction(this.db.stores.workRecords, 'readwrite', (store) => {
                                return store.clear();
                            });
                            
                            await this.db.performTransaction(this.db.stores.payments, 'readwrite', (store) => {
                                return store.clear();
                            });
                        }
                        
                        this.generatePaymentButtons();
                        
                        if (typeof this.updateDashboard === 'function') {
                            this.updateDashboard();
                        }
                        
                        this.updatePaymentPeriodDisplay(newConfig.PAYMENT_DAY_DURATION);
                        
                    } catch (resetError) {
                        console.error('Error resetting saved amounts:', resetError);
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
                        
                        setTimeout(() => {
                            this.generatePaymentButtons();
                            this.updateDashboard();
                            this.updatePaymentPeriodDisplay(4);
                            
                            document.querySelectorAll('.validation-error, .validation-warning, .validation-success, .validation-summary').forEach(el => el.remove());
                            
                            document.querySelectorAll('.settings-input').forEach(input => {
                                input.classList.remove('error', 'warning', 'success');
                            });
                            
                            this.notifications.showToast('All settings reset to default values (Maximum amount: ₹500)', 'success', 5000);
                        }, 1000);
                    }
                } catch (error) {
                    console.error('Error resetting settings:', error);
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

        document.addEventListener('click', (e) => {
            if (earningsInsightTooltip && 
                !earningsInsightTooltip.contains(e.target) && 
                !earningsInsightBtn.contains(e.target) &&
                earningsInsightTooltip.classList.contains('show')) {
                this.hideEarningsInsight();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && earningsInsightTooltip && earningsInsightTooltip.classList.contains('show')) {
                this.hideEarningsInsight();
            }
        });

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
            
            const statusMessage = await this.generateEarningsStatusMessage(stats);
            
            const messageEl = document.getElementById('earningsStatusMessage');
            if (messageEl) {
                messageEl.textContent = statusMessage;
            }
            
            const tooltip = document.getElementById('earningsInsightTooltip');
            if (tooltip && targetElement) {
                this.positionTooltip(tooltip, targetElement);
                tooltip.classList.add('show');
            }
        } catch (error) {
            console.error('Error showing earnings insight:', error);
        }
    }

    positionTooltip(tooltip, targetElement) {
        const targetRect = targetElement.getBoundingClientRect();
        const tooltipContent = tooltip.querySelector('.tooltip-content');
        const tooltipArrow = tooltip.querySelector('.tooltip-arrow');
        
        tooltip.classList.remove('top', 'bottom', 'left', 'right');
        tooltip.style.maxWidth = '';
        
        tooltip.style.visibility = 'hidden';
        tooltip.style.opacity = '1';
        tooltip.style.display = 'block';
        const tooltipRect = tooltipContent.getBoundingClientRect();
        tooltip.style.visibility = '';
        tooltip.style.opacity = '';
        tooltip.style.display = '';
        
        const MARGIN = 20;
        const ARROW_SIZE = 8;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        const spaceAbove = targetRect.top - MARGIN - ARROW_SIZE;
        const spaceBelow = viewportHeight - targetRect.bottom - MARGIN - ARROW_SIZE;
        const spaceLeft = targetRect.left - MARGIN - ARROW_SIZE;
        const spaceRight = viewportWidth - targetRect.right - MARGIN - ARROW_SIZE;
        
        let position = 'bottom';
        let left, top;
        
        if (spaceBelow >= tooltipRect.height) {
            position = 'bottom';
            top = targetRect.bottom + 10;
            left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
        } else if (spaceAbove >= tooltipRect.height) {
            position = 'top';
            top = targetRect.top - tooltipRect.height - 10;
            left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
        } else if (spaceRight >= tooltipRect.width) {
            position = 'right';
            left = targetRect.right + 10;
            top = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
        } else if (spaceLeft >= tooltipRect.width) {
            position = 'left';
            left = targetRect.left - tooltipRect.width - 10;
            top = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
        } else {
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
        
        const adjustedLeft = Math.max(MARGIN, Math.min(viewportWidth - tooltipRect.width - MARGIN, left));
        const adjustedTop = Math.max(MARGIN, Math.min(viewportHeight - tooltipRect.height - MARGIN, top));
        
        if (viewportWidth < 400) {
            tooltip.style.maxWidth = `${viewportWidth - (MARGIN * 2)}px`;
            left = MARGIN;
            top = adjustedTop;
        } else {
            left = adjustedLeft;
            top = adjustedTop;
        }
        
        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
        tooltip.classList.add(position);
        
        if (tooltipArrow) {
            const targetCenterX = targetRect.left + (targetRect.width / 2);
            const targetCenterY = targetRect.top + (targetRect.height / 2);
            const tooltipLeft = parseFloat(tooltip.style.left);
            const tooltipTop = parseFloat(tooltip.style.top);
            
            tooltipArrow.style.opacity = '';
            tooltipArrow.style.visibility = '';
            
            if (position === 'bottom' || position === 'top') {
                const targetCenterRelativeToTooltip = targetCenterX - tooltipLeft;
                let arrowLeft = targetCenterRelativeToTooltip - 4;
                
                const arrowWidth = 8;
                const minMargin = 6;
                const maxMargin = tooltipRect.width - arrowWidth - 6;
                
                arrowLeft = Math.max(minMargin, Math.min(maxMargin, arrowLeft));
                
                tooltipArrow.style.left = `${arrowLeft}px`;
                tooltipArrow.style.top = '';
                tooltipArrow.style.right = '';
                tooltipArrow.style.bottom = '';
            } else if (position === 'left' || position === 'right') {
                const targetCenterRelativeToTooltip = targetCenterY - tooltipTop;
                let arrowTop = targetCenterRelativeToTooltip - 4;
                
                const arrowHeight = 8;
                const minMargin = 6;
                const maxMargin = tooltipRect.height - arrowHeight - 6;
                
                arrowTop = Math.max(minMargin, Math.min(maxMargin, arrowTop));
                
                tooltipArrow.style.top = `${arrowTop}px`;
                tooltipArrow.style.left = '';
                tooltipArrow.style.right = '';
                tooltipArrow.style.bottom = '';
            }
        }
    }

    hideEarningsInsight() {
        const tooltip = document.getElementById('earningsInsightTooltip');
        if (tooltip) {
            tooltip.classList.remove('show', 'top', 'bottom', 'left', 'right');
            
            const tooltipArrow = tooltip.querySelector('.tooltip-arrow');
            if (tooltipArrow) {
                tooltipArrow.style.cssText = '';
            }
            
            tooltip.style.left = '';
            tooltip.style.top = '';
            tooltip.style.maxWidth = '';
        }
    }

    createRippleEffect(button, event) {
        const existingRipple = button.querySelector('.ripple');
        if (existingRipple) {
            existingRipple.remove();
        }

        const ripple = document.createElement('span');
        ripple.classList.add('ripple');
        
        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = event.clientX - rect.left - size / 2;
        const y = event.clientY - rect.top - size / 2;
        
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
        
        setTimeout(() => {
            if (ripple && ripple.parentNode) {
                ripple.remove();
            }
        }, 600);
    }

    async generateEarningsStatusMessage(stats) {
        const { totalWorked, totalEarned, totalPaid, currentBalance } = stats;
        const dailyWage = window.R_SERVICE_CONFIG?.DAILY_WAGE || 25;
        
        const advanceStatus = await this.db.getAdvancePaymentStatus();
        
        if (totalWorked === 0) {
            return `Welcome to your earnings tracker! Your daily rate is set to ${this.utils.formatCurrency(dailyWage)}. To begin tracking your work progress, simply click the Mark as Done button when you complete your first work session. This will start building your work history and earnings record.`;
        }
        
        if (advanceStatus.hasAdvancePayments && advanceStatus.workRemainingForAdvance > 0) {
            const remainingDays = advanceStatus.workRemainingForAdvance;
            const advanceAmount = advanceStatus.totalAdvanceAmount;
            const completedDays = totalWorked - remainingDays;
            
            return `You have received an advance payment of ${this.utils.formatCurrency(advanceAmount)} and are making good progress on your work commitment. Currently, you have completed ${completedDays} out of ${totalWorked} required work days. You need to complete ${remainingDays} more days to fulfill your advance payment obligation and maintain your earning schedule.`;
        }
        
        if (totalWorked > 0 && totalPaid === 0) {
            return `Your work record shows ${totalWorked} completed work session${totalWorked !== 1 ? 's' : ''} with a total pending payment of ${this.utils.formatCurrency(currentBalance)}. You have not collected any payments yet, which means this is a great time to initiate your first payment collection. Your consistent work is building up a solid earnings foundation.`;
        }
        
        if (totalWorked > 0 && totalPaid > 0 && currentBalance > 0) {
            const pendingDays = Math.ceil(currentBalance / dailyWage);
            
            return `You have successfully completed ${totalWorked} work days and collected ${this.utils.formatCurrency(totalPaid)} in payments so far. Currently, you have ${this.utils.formatCurrency(currentBalance)} pending equivalent to ${pendingDays} work day${pendingDays !== 1 ? 's' : ''}. Your payment management is running smoothly, and you are maintaining a healthy work to payment ratio.`;
        }
        
        if (totalWorked > 0 && currentBalance === 0) {
            return `Excellent work! You have completed ${totalWorked} work day${totalWorked !== 1 ? 's' : ''} and earned a total of ${this.utils.formatCurrency(totalPaid)}. All your payments are current and up to date, which demonstrates excellent financial management and work discipline. Keep up the great work with your consistent earning schedule.`;
        }
        
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
                }
            });

            const dashboard = document.getElementById('dashboard');
            if (dashboard) {
                dashboard.style.display = 'block';
            }
        } catch (error) {
            console.error('Error closing view:', error);
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
            
            if (advanceStatus.hasAdvancePayments && advanceStatus.workRemainingForAdvance > 0) {
                const workCompleted = advanceStatus.workCompletedForAdvance;
                const workRequired = advanceStatus.workRequiredForAdvance;
                
                const safeWorkCompleted = workCompleted || 0;
                const safeWorkRequired = workRequired || 1;
                
                const progressPercent = Math.min((safeWorkCompleted / safeWorkRequired) * 100, 100);
                
                if (progressLabelEl) {
                    progressLabelEl.textContent = `Advance Payment Progress (₹${advanceStatus.totalAdvanceAmount} paid)`;
                }
                if (progressTextEl) {
                    progressTextEl.textContent = `${safeWorkCompleted}/${safeWorkRequired} days`;
                }
                
                if (progressFillEl) {
                    let finalPercent;
                    if (safeWorkCompleted === 0) {
                        finalPercent = 0;
                    } else if (safeWorkCompleted >= safeWorkRequired) {
                        finalPercent = 100;
                    } else {
                        finalPercent = Math.max(progressPercent, 10);
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
                    progressFillEl.style.backgroundColor = 'var(--success)';
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
                    progressFillEl.style.backgroundColor = 'var(--primary)';
                }
            }
        } catch (error) {
            console.error('Error updating progress bar:', error);
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
        
        const advanceStatus = await this.db.getAdvancePaymentStatus();
        const paymentThreshold = window.R_SERVICE_CONFIG?.PAYMENT_THRESHOLD || window.R_SERVICE_CONFIG?.PAYMENT_DAY_DURATION || 4;
        const isPaymentDay = (this.pendingUnpaidDates.length > 0 && this.pendingUnpaidDates.length % paymentThreshold === 0) || 
                            (this.pendingUnpaidDates.length > 0 && advanceStatus.hasAdvancePayments && advanceStatus.workRemainingForAdvance > 0);
        
        if (isPaymentDay && this.pendingUnpaidDates.length % paymentThreshold === 0 && previousUnpaidCount % paymentThreshold !== 0) {
            this.notifications.showPaydayNotification();
            this.notifications.playSound('paid');
        }

        await this.checkPWAOnPaymentDay();
    }

    async checkPWAOnPaymentDay() {
        try {
            const isInstalled = window.matchMedia('(display-mode: standalone)').matches || 
                               window.navigator.standalone === true;
            
            if (isInstalled) return;

            const isPaymentDay = await this.shouldShowPWAOnPaymentDay();
            if (isPaymentDay) {
                const banner = document.getElementById('pwaInstallBanner');
                if (banner && !banner.classList.contains('show')) {
                    const lastDismissedDate = localStorage.getItem('pwa-install-dismissed-date');
                    const today = new Date().toISOString().split('T')[0];
                    const lastDismissed = lastDismissedDate ? lastDismissedDate.split('T')[0] : null;
                    
                    if (lastDismissed !== today) {
                        setTimeout(() => {
                            if (window.deferredPrompt) {
                                this.showInstallRecommendation(window.deferredPrompt);
                            } else {
                                this.showInstallRecommendationGeneric();
                            }
                        }, 2000);
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
            
            const hasUnpaidWork = this.pendingUnpaidDates.length > 0;
            const hasAdvancePaymentWork = advanceStatus.hasAdvancePayments && advanceStatus.workRemainingForAdvance > 0;
            const hasAnyPayableWork = hasUnpaidWork || hasAdvancePaymentWork;
            
            if (hasAnyPayableWork) {
                this.showPaidButton();
                paidBtn.disabled = false;
                paidBtn.classList.remove('disabled-state');
                paidBtn.classList.add('has-pending-work');
                paidBtn.classList.add('payment-ready');
            } else {
                this.hidePaidButton();
            }
        }
    }

    showPaidButton() {
        const paidBtn = document.getElementById('paidBtn');
        if (paidBtn) {
            paidBtn.style.display = 'inline-flex';
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
            
            await this.syncAmountFlow();
            
            this.notifications.checkMilestones(this.currentStats);
            await this.checkPendingPayments();
            
        } catch (error) {
            console.error('Error marking work as done:', error);
        }
    }

    async handlePaidClick() {
        try {
            const paidBtn = document.getElementById('paidBtn');
            if (paidBtn) {
                paidBtn.classList.add('loading');
            }

            await new Promise(resolve => setTimeout(resolve, 500));

            if (this.pendingUnpaidDates.length === 0) {
                this.notifications.showToast('No unpaid work to record payment for', 'warning');
                if (paidBtn) {
                    paidBtn.classList.remove('loading');
                }
                return;
            }

            if (paidBtn) {
                paidBtn.classList.remove('loading');
            }

            this.showDateSelectionModal();
        } catch (error) {
            console.error('Error opening payment modal:', error);
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

        if (closeBtn) {
            closeBtn.onclick = closeModal;
        }

        modal.onclick = (e) => {
            if (e.target === modal) {
                closeModal();
            }
        };

        if (todayBtn) {
            todayBtn.onclick = () => {
                closeModal();
                this.showPaymentModal();
            };
        }

        if (previousBtn) {
            previousBtn.onclick = () => {
                closeModal();
                this.showCalendarSelectionModal();
            };
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
        } catch (error) {
            console.error('Error updating pending dates:', error);
        }
    }

    async showPaymentModal() {
        const modal = document.getElementById('paymentModal');
        if (!modal) return;

        await this.updatePendingUnpaidDates();
        this.generatePaymentButtons();

        const unpaidDaysEl = document.getElementById('unpaidDaysCount');
        const pendingAmountEl = document.getElementById('pendingAmount');
        const dailyWageEl = document.getElementById('dailyWageDisplay');

        if (unpaidDaysEl) unpaidDaysEl.textContent = this.pendingUnpaidDates.length;
        if (pendingAmountEl) pendingAmountEl.textContent = this.utils.formatCurrency(this.pendingUnpaidDates.length * (window.R_SERVICE_CONFIG?.DAILY_WAGE || 25));
        if (dailyWageEl) dailyWageEl.textContent = this.utils.formatCurrency(window.R_SERVICE_CONFIG?.DAILY_WAGE || 25);

        const paymentSummaryCard = document.getElementById('paymentSummaryCard');
        const paymentConfirmation = document.getElementById('paymentConfirmation');

        if (paymentSummaryCard) paymentSummaryCard.style.display = 'block';
        if (paymentConfirmation) paymentConfirmation.style.display = 'none';

        modal.classList.add('show');
    }

    generatePaymentButtons() {
        const container = document.getElementById('paymentButtons');
        if (!container) return;

        container.innerHTML = '';
        const amounts = window.ConfigManager ? window.ConfigManager.generatePaymentAmounts() : [25, 50, 75, 100];

        amounts.forEach(amount => {
            const button = document.createElement('button');
            button.className = 'btn btn-secondary';
            button.textContent = this.utils.formatCurrency(amount);
            button.dataset.amount = amount;
            button.addEventListener('click', () => {
                this.selectedPaymentAmount = amount;
                this.showPaymentConfirmation(amount, 'Regular Payment');
            });
            container.appendChild(button);
        });
    }

    showPaymentConfirmation(amount, type) {
        const paymentConfirmation = document.getElementById('paymentConfirmation');
        const confirmAmountEl = document.getElementById('confirmAmount');
        const confirmTypeEl = document.getElementById('confirmType');

        if (paymentConfirmation && confirmAmountEl && confirmTypeEl) {
            confirmAmountEl.textContent = this.utils.formatCurrency(amount);
            confirmTypeEl.textContent = type;
            paymentConfirmation.style.display = 'flex';
        }

        const confirmBtn = document.getElementById('confirmPaymentBtn');
        if (confirmBtn) {
            confirmBtn.onclick = () => this.processPayment();
        }

        const cancelBtn = document.getElementById('cancelPaymentBtn');
        if (cancelBtn) {
            cancelBtn.onclick = () => {
                if (paymentConfirmation) paymentConfirmation.style.display = 'none';
            };
        }
    }

    async showCalendarSelectionModal() {
        const modal = document.getElementById('calendarSelectionModal');
        const calendarContainer = document.getElementById('unpaidWorkCalendar');
        
        if (modal && calendarContainer) {
            await this.generateUnpaidWorkCalendar(calendarContainer);
            modal.classList.add('show');
            this.setupCalendarSelectionHandlers();

            const calendarSummaryCard = document.getElementById('calendarPaymentSummaryCard');
            const calendarPaymentSummary = document.getElementById('calendarPaymentSummary');

            if (calendarSummaryCard) calendarSummaryCard.style.display = 'block';
            if (calendarPaymentSummary) calendarPaymentSummary.style.display = 'none';
        }
    }

    setupCalendarSelectionHandlers() {
        const confirmBtn = document.getElementById('confirmCalendarDirectPaymentBtn');
        if (confirmBtn) {
            confirmBtn.onclick = () => {
                const selectedDates = this.getSelectedCalendarDates();
                if (selectedDates.length > 0) {
                    const totalAmount = selectedDates.reduce((acc, date) => acc + parseFloat(date.amount), 0);
                    this.showCalendarPaymentConfirmation(totalAmount, 'Direct Payment');
                }
            };
        }
    }

    showCalendarPaymentConfirmation(amount, type) {
        const calendarPaymentSummary = document.getElementById('calendarPaymentSummary');
        const calendarSelectedAmountDisplay = document.getElementById('calendarSelectedAmountDisplay');
        const calendarPaymentTypeDisplay = document.getElementById('calendarPaymentTypeDisplay');

        if (calendarPaymentSummary && calendarSelectedAmountDisplay && calendarPaymentTypeDisplay) {
            calendarSelectedAmountDisplay.textContent = this.utils.formatCurrency(amount);
            calendarPaymentTypeDisplay.textContent = type;
            calendarPaymentSummary.style.display = 'block';
        }

        const confirmBtn = document.getElementById('confirmCalendarPaymentBtn');
        if (confirmBtn) {
            confirmBtn.onclick = () => this.processCalendarPayment();
        }

        const cancelBtn = document.getElementById('cancelCalendarPaymentBtn');
        if (cancelBtn) {
            cancelBtn.onclick = () => {
                if (calendarPaymentSummary) calendarPaymentSummary.style.display = 'none';
            };
        }
    }

    setupPWAInstall() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./sw.js', { scope: './' })
                .then(registration => {
                    console.log('Service Worker registered with scope:', registration.scope);
                }).catch(error => {
                    console.log('Service Worker registration failed:', error);
                });
        }

        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            window.deferredPrompt = e;
            this.showInstallRecommendation(e);
        });

        const installAppBtn = document.getElementById('installAppBtn');
        if (installAppBtn) {
            installAppBtn.addEventListener('click', async () => {
                if (window.deferredPrompt) {
                    window.deferredPrompt.prompt();
                    const { outcome } = await window.deferredPrompt.userChoice;
                    if (outcome === 'accepted') {
                        console.log('User accepted the install prompt');
                    }
                    window.deferredPrompt = null;
                }
                const pwaInstallBanner = document.getElementById('pwaInstallBanner');
                if (pwaInstallBanner) {
                    pwaInstallBanner.style.display = 'none';
                }
            });
        }

        const dismissInstallBtn = document.getElementById('dismissInstallBtn');
        if (dismissInstallBtn) {
            dismissInstallBtn.addEventListener('click', () => {
                const pwaInstallBanner = document.getElementById('pwaInstallBanner');
                if (pwaInstallBanner) {
                    pwaInstallBanner.style.display = 'none';
                }
            });
        }
    }
}