(function() {
    'use strict';
    
    const CONFIG = {
        DAILY_WAGE: 25,
        PAYMENT_THRESHOLD: 4, // Days before payment can be collected
        CURRENCY_SYMBOL: '₹',
        CURRENCY_NAME: 'rupees',
        TIMEZONE: 'Asia/Kolkata', // IST timezone
        
        // Global Increment Limits
        INCREMENT_VALUE: 25, // Default increment for payment amounts
        INCREMENT_MIN: 1, // Minimum increment value
        INCREMENT_MAX: 1000, // Maximum increment value
        
        // Global Day Limits
        PAYMENT_DAY_DURATION: 4, // Default payment day duration
        PAYMENT_DAY_MIN: 1, // Minimum payment days
        PAYMENT_DAY_MAX: 30, // Maximum payment days
        
        // Global Amount Limits
        MAX_PAYMENT_AMOUNT: 500, // Default maximum payment amount
        MIN_PAYMENT_AMOUNT: 1, // Minimum payment amount
        AMOUNT_LIMIT_MIN: 10, // Minimum value for amount limits
        AMOUNT_LIMIT_MAX: 100000, // Maximum value for amount limits
        
        // Daily Wage Limits
        DAILY_WAGE_MIN: 1, // Minimum daily wage
        DAILY_WAGE_MAX: 50000, // Maximum daily wage
        
        // Advanced Configuration Limits
        PAYMENT_THRESHOLD_MIN: 1, // Minimum payment threshold
        PAYMENT_THRESHOLD_MAX: 365, // Maximum payment threshold (1 year)
        
        // UI/UX Limits
        MAX_WORK_RECORDS_DISPLAY: 1000, // Maximum records to display
        MAX_PAYMENT_HISTORY_DISPLAY: 500, // Maximum payment history items
        NOTIFICATION_DURATION_MIN: 1000, // Minimum notification duration (ms)
        NOTIFICATION_DURATION_MAX: 30000, // Maximum notification duration (ms)
        
        // Data Validation Limits
        MAX_STRING_LENGTH: 1000, // Maximum string length for inputs
        MAX_DATE_FUTURE_YEARS: 10, // Maximum years into future for dates
        MAX_DATE_PAST_YEARS: 100 // Maximum years into past for dates
    };

    const ConfigManager = {
        getConfig() {
            const userConfig = this.getUserConfig();
            return { ...CONFIG, ...userConfig };
        },

        getUserConfig() {
            try {
                const stored = localStorage.getItem('r-service-user-config');
                return stored ? JSON.parse(stored) : {};
            } catch (error) {
                console.error('Error loading user config:', error);
                return {};
            }
        },

        validateConfig(config) {
            const validated = { ...config };
            
            // Validate daily wage
            if (validated.DAILY_WAGE !== undefined) {
                validated.DAILY_WAGE = Math.max(CONFIG.DAILY_WAGE_MIN, 
                    Math.min(CONFIG.DAILY_WAGE_MAX, validated.DAILY_WAGE));
            }
            
            // Validate increment value
            if (validated.INCREMENT_VALUE !== undefined) {
                validated.INCREMENT_VALUE = Math.max(CONFIG.INCREMENT_MIN, 
                    Math.min(CONFIG.INCREMENT_MAX, validated.INCREMENT_VALUE));
            }
            
            // Validate payment day duration
            if (validated.PAYMENT_DAY_DURATION !== undefined) {
                validated.PAYMENT_DAY_DURATION = Math.max(CONFIG.PAYMENT_DAY_MIN, 
                    Math.min(CONFIG.PAYMENT_DAY_MAX, validated.PAYMENT_DAY_DURATION));
            }
            
            // Validate payment threshold
            if (validated.PAYMENT_THRESHOLD !== undefined) {
                validated.PAYMENT_THRESHOLD = Math.max(CONFIG.PAYMENT_THRESHOLD_MIN, 
                    Math.min(CONFIG.PAYMENT_THRESHOLD_MAX, validated.PAYMENT_THRESHOLD));
            }
            
            // Validate max payment amount
            if (validated.MAX_PAYMENT_AMOUNT !== undefined) {
                validated.MAX_PAYMENT_AMOUNT = Math.max(CONFIG.AMOUNT_LIMIT_MIN, 
                    Math.min(CONFIG.AMOUNT_LIMIT_MAX, validated.MAX_PAYMENT_AMOUNT));
            }
            
            return validated;
        },

        saveUserConfig(config) {
            try {
                const currentUserConfig = this.getUserConfig();
                const validatedConfig = this.validateConfig(config);
                const newUserConfig = { ...currentUserConfig, ...validatedConfig };
                localStorage.setItem('r-service-user-config', JSON.stringify(newUserConfig));
                
                if (typeof window !== 'undefined') {
                    window.R_SERVICE_CONFIG = this.getConfig();
                }
                
                console.log('Configuration saved (validated):', newUserConfig);
                return true;
            } catch (error) {
                console.error('Error saving user config:', error);
                return false;
            }
        },

        resetToDefaults() {
            try {
                localStorage.removeItem('r-service-user-config');
                if (typeof window !== 'undefined') {
                    window.R_SERVICE_CONFIG = { ...CONFIG };
                }
                console.log('Configuration reset to defaults');
                return true;
            } catch (error) {
                console.error('Error resetting config:', error);
                return false;
            }
        },

        getLimits() {
            return {
                // Increment limits
                increment: {
                    min: CONFIG.INCREMENT_MIN,
                    max: CONFIG.INCREMENT_MAX,
                    default: CONFIG.INCREMENT_VALUE
                },
                // Day limits
                days: {
                    min: CONFIG.PAYMENT_DAY_MIN,
                    max: CONFIG.PAYMENT_DAY_MAX,
                    default: CONFIG.PAYMENT_DAY_DURATION
                },
                // Amount limits
                amount: {
                    min: CONFIG.AMOUNT_LIMIT_MIN,
                    max: CONFIG.AMOUNT_LIMIT_MAX,
                    default: CONFIG.MAX_PAYMENT_AMOUNT,
                    payment_min: CONFIG.MIN_PAYMENT_AMOUNT
                },
                // Daily wage limits
                dailyWage: {
                    min: CONFIG.DAILY_WAGE_MIN,
                    max: CONFIG.DAILY_WAGE_MAX,
                    default: CONFIG.DAILY_WAGE
                },
                // Payment threshold limits
                threshold: {
                    min: CONFIG.PAYMENT_THRESHOLD_MIN,
                    max: CONFIG.PAYMENT_THRESHOLD_MAX,
                    default: CONFIG.PAYMENT_THRESHOLD
                }
            };
        },

        generatePaymentAmounts() {
            const config = this.getConfig();
            const increment = Math.max(CONFIG.INCREMENT_MIN, 
                Math.min(CONFIG.INCREMENT_MAX, config.INCREMENT_VALUE || 25));
            const maxAmount = Math.max(CONFIG.AMOUNT_LIMIT_MIN, 
                Math.min(CONFIG.AMOUNT_LIMIT_MAX, config.MAX_PAYMENT_AMOUNT || 500));
            
            const amounts = [];
            for (let amount = increment; amount <= maxAmount; amount += increment) {
                amounts.push(amount);
            }
            
            if (amounts.length === 0) {
                const dailyWage = config.DAILY_WAGE || 25;
                return [dailyWage, dailyWage*2, dailyWage*3, dailyWage*4, dailyWage*8, dailyWage*12, dailyWage*16, dailyWage*20, dailyWage*24, 500];
            }
            
            return amounts;
        },

        init() {
            try {
                window.R_SERVICE_CONFIG = this.getConfig();
                window.ConfigManager = this;
                window.R_SERVICE_LIMITS = this.getLimits();
                
                console.log('ConfigManager initialized with:');
                console.log('Config:', window.R_SERVICE_CONFIG);
                console.log('Limits:', window.R_SERVICE_LIMITS);
                return true;
            } catch (error) {
                console.error('Error initializing ConfigManager:', error);
                window.R_SERVICE_CONFIG = { ...CONFIG };
                window.ConfigManager = this;
                window.R_SERVICE_LIMITS = this.getLimits();
                return false;
            }
        }
    };

    if (typeof window !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                ConfigManager.init();
            });
        } else {
            ConfigManager.init();
        }
    }

})();