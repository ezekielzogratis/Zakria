# 🔧 R-Service Tracker - Technical Documentation

## 📋 Table of Contents
1. [System Architecture](#system-architecture)
2. [Core Components](#core-components)
3. [Database Schema](#database-schema)
4. [API Reference](#api-reference)
5. [Configuration System](#configuration-system)
6. [Theme Engine](#theme-engine)
7. [PWA Implementation](#pwa-implementation)
8. [Audio System](#audio-system)
9. [Chart Integration](#chart-integration)
10. [Security & Data Management](#security--data-management)
11. [Performance Optimizations](#performance-optimizations)
12. [Error Handling](#error-handling)
13. [Testing Guidelines](#testing-guidelines)
14. [Deployment Guide](#deployment-guide)

## 🏗️ System Architecture

### **Application Structure**
```
R-Service Tracker/
├── 📄 index.html              # Main application entry point
├── 📄 manifest.json           # PWA configuration
├── 📄 sw.js                   # Service Worker v1.0.0
├── 📁 js/                     # JavaScript modules
│   ├── app.js                 # Main application controller (3,042 lines)
│   ├── database.js            # IndexedDB operations (609 lines)
│   ├── calendar.js            # Calendar management (995 lines)
│   ├── notifications.js       # Push notifications & audio (2,460 lines)
│   ├── charts.js              # Data visualization (573 lines)
│   ├── utils.js               # Utility functions (1,355 lines)
│   └── constants.js           # Configuration management (218 lines)
├── 📁 css/
│   └── style.css              # Comprehensive styling (4,900+ lines)
└── 📁 assets/                 # Icons and static resources
    ├── favicon.ico/svg
    ├── icon-192.png/svg
    └── icon-512.png/svg
```

### **Data Flow Architecture**
```
User Interface (index.html)
        ↓
Main Controller (app.js)
        ↓
Database Layer (database.js) ← → IndexedDB
        ↓
Component Controllers:
├── Calendar (calendar.js)
├── Charts (charts.js)
├── Notifications (notifications.js)
└── Utils (utils.js)
```

## 🧩 Core Components

### **1. Main Application Controller (app.js)**
```javascript
class RServiceTracker {
    constructor() {
        this.db = new DatabaseManager();
        this.notifications = new NotificationManager();
        this.charts = new ChartsManager(this.db);
        this.calendar = new CalendarManager(this.db);
        this.utils = new Utils();
        this.currentStats = {};
        this.pendingUnpaidDates = [];
    }
}
```

**Key Responsibilities:**
- Application initialization and lifecycle management
- UI event handling and state management
- Component coordination and data flow
- Theme management and user preferences
- Payment processing and work tracking
- PWA installation management

**Critical Methods:**
- `init()`: Application bootstrap and component initialization
- `handleDoneClick()`: Work completion processing
- `handlePaidClick()`: Payment processing workflow
- `updateDashboard()`: Real-time UI updates
- `setupPWAInstall()`: PWA recommendation system

### **2. Database Manager (database.js)**
```javascript
class DatabaseManager {
    constructor() {
        this.dbName = 'RServiceTrackerDB';
        this.dbVersion = 3;
        this.db = null;
        this.stores = {
            workRecords: 'workRecords',
            payments: 'payments',
            settings: 'settings'
        };
    }
}
```

**Features:**
- IndexedDB abstraction layer
- Transaction management
- Data validation and integrity
- Advance payment calculations
- Earnings statistics computation
- Data export/import functionality

**Core Operations:**
- `addWorkRecord()`: Store completed work entries
- `addPayment()`: Process and store payments
- `getEarningsStats()`: Calculate comprehensive statistics
- `getAdvancePaymentStatus()`: Advanced payment tracking
- `clearAllData()`: Complete data removal with transaction IDs

### **3. Calendar Manager (calendar.js)**
```javascript
class CalendarManager {
    constructor(databaseManager) {
        this.db = databaseManager;
        this.currentDate = new Date();
        this.workRecords = [];
        this.payments = [];
    }
}
```

**Capabilities:**
- Visual calendar rendering with work status indicators
- Date-based work marking and payment processing
- Future date validation and security
- Real-time updates and synchronization
- Modal-based day detail views
- Export functionality for calendar data

### **4. Notification Manager (notifications.js)**
```javascript
class NotificationManager {
    constructor() {
        this.permission = 'default';
        this.audioContext = null;
        this.soundEnabled = true;
        this.volume = 0.7;
    }
}
```

**Advanced Features:**
- Push notification system with service worker integration
- Premium audio engine with Web Audio API
- Toast notification system with queue management
- Reminder scheduling for work and payments
- Milestone achievement notifications
- Professional sound effects for user actions

### **5. Charts Manager (charts.js)**
```javascript
class ChartsManager {
    constructor(databaseManager) {
        this.db = databaseManager;
        this.charts = {};
        this.chartInstances = new Map();
    }
}
```

**Visualization Features:**
- Chart.js integration with custom configurations
- Real-time data updates and animations
- Theme-aware color schemes
- Responsive design for all devices
- Performance optimization for large datasets

### **6. Utilities Manager (utils.js)**
```javascript
class Utils {
    constructor() {
        this.initialized = false;
    }
}
```

**Utility Functions:**
- PDF generation with professional templates
- Data formatting and validation
- Animation helpers and effects
- Local storage management
- Date manipulation and formatting
- Currency formatting and calculations

## 🗄️ Database Schema

### **Work Records Store**
```javascript
{
  id: Number,              // Auto-increment primary key
  date: String,            // ISO date string (YYYY-MM-DD)
  wage: Number,            // Daily wage amount
  status: String,          // 'completed' | 'pending'
  timestamp: String,       // ISO timestamp of creation
  month: Number,           // Month number (1-12)
  year: Number            // Full year number
}
```

### **Payments Store**
```javascript
{
  id: Number,              // Auto-increment primary key
  amount: Number,          // Payment amount
  workDates: Array,        // Array of date strings covered
  paymentDate: String,     // ISO date string of payment
  timestamp: String,       // ISO timestamp of creation
  month: Number,           // Month of payment
  year: Number,            // Year of payment
  isAdvance: Boolean,      // Whether this is an advance payment
  pendingDaysAtPayment: Number  // Days covered at payment time
}
```

### **Settings Store**
```javascript
{
  id: Number,              // Auto-increment primary key
  key: String,             // Setting identifier
  value: Any,              // Setting value
  timestamp: String,       // Last modified timestamp
  type: String            // Data type for validation
}
```

### **Indexes and Performance**
```javascript
// Optimized indexes for query performance
workRecords: ['date', 'status', 'month', 'year']
payments: ['paymentDate', 'isAdvance', 'month', 'year']
settings: ['key']
```

## 🔌 API Reference

### **Core Application APIs**

#### **Work Management**
```javascript
// Mark work as completed
await app.handleDoneClick()

// Check today's work status
const isAvailable = await app.isMarkDoneAvailable()

// Update work status across all components
await app.updateTodayStatus()
```

#### **Payment Processing**
```javascript
// Process regular payment
await app.processPayment(amount, closeModalCallback)

// Check payment button visibility
await app.updatePaidButtonVisibility()

// Handle force payment for specific date
await calendar.handleForcePaid(dateString)
```

#### **Data Operations**
```javascript
// Get comprehensive earnings statistics
const stats = await db.getEarningsStats()

// Export all data
const exportData = await db.exportData()

// Clear all application data
await db.clearAllData()
```

### **Database APIs**

#### **Work Records**
```javascript
// Add completed work record
await db.addWorkRecord(date, wage, status)

// Get specific work record
const record = await db.getWorkRecord(date)

// Get all work records
const allRecords = await db.getAllWorkRecords()
```

#### **Payment Management**
```javascript
// Add payment record
await db.addPayment(amount, workDates, paymentDate, isAdvance)

// Get all payments
const payments = await db.getAllPayments()

// Check advance payment status
const advanceStatus = await db.getAdvancePaymentStatus()
```

### **Notification APIs**
```javascript
// Show toast notification
notifications.showToast(message, type, duration)

// Show system notification
notifications.showNotification(title, options)

// Play audio feedback
notifications.playSound(soundType)

// Schedule reminders
notifications.scheduleReminders()
```

### **Calendar APIs**
```javascript
// Navigate calendar
calendar.previousMonth()
calendar.nextMonth()
calendar.goToToday()

// Update calendar display
await calendar.updateCalendar()

// Show day details modal
await calendar.showDayDetails(date, workRecord, isPaid)
```

## ⚙️ Configuration System

### **Core Configuration (constants.js)**
```javascript
const CONFIG = {
    DAILY_WAGE: 25,                    // Default daily wage
    PAYMENT_THRESHOLD: 4,              // Days before payment collection
    CURRENCY_SYMBOL: '₹',              // Display currency
    TIMEZONE: 'Asia/Kolkata',          // Default timezone
    
    // Validation Limits
    DAILY_WAGE_MIN: 1,
    DAILY_WAGE_MAX: 50000,
    PAYMENT_THRESHOLD_MIN: 1,
    PAYMENT_THRESHOLD_MAX: 365,
    
    // UI Configuration
    MAX_WORK_RECORDS_DISPLAY: 1000,
    NOTIFICATION_DURATION_MIN: 1000,
    NOTIFICATION_DURATION_MAX: 30000
}
```

### **User Configuration Management**
```javascript
// Get current configuration
const config = ConfigManager.getConfig()

// Save user preferences
ConfigManager.saveUserConfig(newConfig)

// Reset to defaults
ConfigManager.resetToDefaults()

// Get validation limits
const limits = ConfigManager.getLimits()
```

### **Theme Configuration**
```javascript
// Available themes
const themes = [
    'blue-light', 'blue-dark',
    'orange-light', 'orange-dark', 
    'green-light', 'green-dark',
    'red-light', 'red-dark',
    'monochrome-light', 'monochrome-dark'
]
```

## 🎨 Theme Engine

### **CSS Custom Properties System**
```css
:root {
    /* Color Variables */
    --primary: #2196F3;
    --primary-light: #64B5F6;
    --primary-dark: #1976D2;
    --secondary: #212529;
    --surface: #FFFFFF;
    --text-primary: #212529;
    
    /* Spacing & Layout */
    --border-radius: 8px;
    --border-radius-small: 4px;
    --shadow-light: 0 2px 8px rgba(0,0,0,0.1);
    --shadow-medium: 0 4px 16px rgba(0,0,0,0.15);
    --shadow-heavy: 0 8px 32px rgba(0,0,0,0.2);
    
    /* Animations */
    --transition-fast: 0.2s cubic-bezier(0.4, 0.0, 0.2, 1);
    --transition-medium: 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
    --transition-slow: 0.5s cubic-bezier(0.4, 0.0, 0.2, 1);
}
```

### **Dynamic Theme Application**
```javascript
// Theme switching logic
applyTheme() {
    const theme = `${this.currentColor}-${this.currentMode}`;
    document.documentElement.setAttribute('data-theme', theme);
    
    // Update charts with theme colors
    if (this.charts) {
        this.charts.updateThemeColors();
    }
    
    // Update PWA theme color
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
        themeColorMeta.content = getComputedStyle(document.documentElement)
            .getPropertyValue('--primary');
    }
}
```

## 📱 PWA Implementation

### **Service Worker (sw.js)**
```javascript
const CACHE_NAME = 'r-service-tracker-v1.0.0';
const DYNAMIC_CACHE = 'r-service-dynamic-v1.0.0';

// Cache strategy: Cache First with Network Fallback
self.addEventListener('fetch', event => {
    if (event.request.destination === 'document' || 
        event.request.url.includes('/api/')) {
        // Network first for critical resources
        event.respondWith(networkFirstStrategy(event.request));
    } else {
        // Cache first for static assets
        event.respondWith(cacheFirstStrategy(event.request));
    }
});
```

### **Manifest Configuration**
```json
{
  "name": "R-Service Tracker",
  "short_name": "R-Service",
  "description": "Premium work tracking and payment management",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#2196F3",
  "theme_color": "#2196F3",
  "icons": [
    {
      "src": "assets/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "assets/icon-512.png", 
      "sizes": "512x512",
      "type": "image/png"
    }
  ],
  "shortcuts": [
    {
      "name": "Mark Work Done",
      "url": "/?action=mark-done",
      "icons": [{"src": "assets/icon-192.png", "sizes": "192x192"}]
    },
    {
      "name": "Collect Payment", 
      "url": "/?action=mark-paid",
      "icons": [{"src": "assets/icon-192.png", "sizes": "192x192"}]
    }
  ]
}
```

### **Installation Strategy**
```javascript
// Smart PWA recommendation system
async shouldShowPWAOnPaymentDay() {
    const paymentThreshold = window.R_SERVICE_CONFIG?.PAYMENT_THRESHOLD || 4;
    const unpaidDays = await this.getUnpaidWorkDays();
    return unpaidDays.length > 0 && unpaidDays.length % paymentThreshold === 0;
}

// Payment day triggered recommendations
async checkPWAOnPaymentDay() {
    const isPaymentDay = await this.shouldShowPWAOnPaymentDay();
    if (isPaymentDay && !this.isPWAInstalled()) {
        this.showPremiumInstallRecommendation();
    }
}
```

## 🔊 Audio System

### **Web Audio API Implementation**
```javascript
class AudioEngine {
    constructor() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.audioContext.createGain();
        this.masterGain.connect(this.audioContext.destination);
    }
    
    async createPremiumSound(frequency, duration, type = 'sine') {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.masterGain);
        
        oscillator.frequency.value = frequency;
        oscillator.type = type;
        
        // Premium envelope with attack, decay, sustain, release
        const now = this.audioContext.currentTime;
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.3, now + 0.1);    // Attack
        gainNode.gain.exponentialRampToValueAtTime(0.2, now + 0.3); // Decay
        gainNode.gain.setValueAtTime(0.2, now + duration - 0.2);   // Sustain
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration); // Release
        
        oscillator.start(now);
        oscillator.stop(now + duration);
    }
}
```

### **Sound Effects Library**
```javascript
const SOUND_LIBRARY = {
    done: {
        frequency: 880,    // A5 note
        duration: 0.6,
        type: 'triangle',
        description: 'Work completion sound'
    },
    paid: {
        sequence: [         // Multi-note sequence
            { frequency: 523, duration: 0.2 }, // C5
            { frequency: 659, duration: 0.2 }, // E5
            { frequency: 784, duration: 0.4 }  // G5
        ],
        description: 'Payment success sound'
    }
}
```

## 📊 Chart Integration

### **Chart.js Configuration**
```javascript
class ChartsManager {
    createEarningsChart(data) {
        return new Chart(canvas, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'Daily Earnings',
                    data: data.values,
                    borderColor: 'var(--primary)',
                    backgroundColor: 'rgba(var(--primary-rgb), 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'var(--surface)',
                        titleColor: 'var(--text-primary)',
                        bodyColor: 'var(--text-secondary)',
                        borderColor: 'var(--primary)',
                        borderWidth: 1
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'var(--border-light)' },
                        ticks: { color: 'var(--text-secondary)' }
                    },
                    x: {
                        grid: { color: 'var(--border-light)' },
                        ticks: { color: 'var(--text-secondary)' }
                    }
                }
            }
        });
    }
}
```

### **Real-time Updates**
```javascript
async updateCharts() {
    const stats = await this.db.getEarningsStats();
    const chartData = this.processDataForCharts(stats);
    
    // Update existing charts with animation
    Object.entries(this.chartInstances).forEach(([key, chart]) => {
        chart.data = chartData[key];
        chart.update('active');
    });
}
```

## 🔒 Security & Data Management

### **Data Validation**
```javascript
validateWorkRecord(record) {
    const errors = [];
    
    if (!record.date || !this.isValidDate(record.date)) {
        errors.push('Invalid date format');
    }
    
    if (!record.wage || record.wage < CONFIG.DAILY_WAGE_MIN || 
        record.wage > CONFIG.DAILY_WAGE_MAX) {
        errors.push('Invalid wage amount');
    }
    
    if (!['completed', 'pending'].includes(record.status)) {
        errors.push('Invalid status');
    }
    
    return { valid: errors.length === 0, errors };
}
```

### **Data Sanitization**
```javascript
sanitizeUserInput(input) {
    if (typeof input === 'string') {
        return input
            .trim()
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .substring(0, CONFIG.MAX_STRING_LENGTH);
    }
    return input;
}
```

### **Secure Data Clearing**
```javascript
async clearAllData() {
    // Clear IndexedDB stores
    await this.clearStore('workRecords');
    await this.clearStore('payments');
    await this.clearStore('settings');
    
    // Clear localStorage items
    const appKeys = [
        'r-service-user-config', 'selected-color', 'selected-mode',
        'pwa-install-dismissed', 'transaction-ids', 'payment-transaction-ids'
    ];
    
    appKeys.forEach(key => localStorage.removeItem(key));
    
    // Clear app-specific prefixed keys
    const prefixes = ['r-service-', 'rservice-', 'work-tracker-', 'payment-'];
    for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && prefixes.some(prefix => key.startsWith(prefix))) {
            localStorage.removeItem(key);
        }
    }
}
```

## ⚡ Performance Optimizations

### **Database Optimizations**
```javascript
// Efficient transaction management
async performTransaction(storeName, mode, operation) {
    return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([storeName], mode);
        const store = transaction.objectStore(storeName);
        
        const request = operation(store);
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        
        // Auto-cleanup
        transaction.oncomplete = () => {
            // Transaction completed successfully
        };
    });
}
```

### **Lazy Loading Strategy**
```javascript
// Lazy load heavy components
async loadChartsWhenNeeded() {
    if (!this.chartsLoaded) {
        await import('./charts.js');
        this.charts = new ChartsManager(this.db);
        this.chartsLoaded = true;
    }
    return this.charts;
}
```

### **Animation Optimization**
```javascript
// Efficient number animation with RAF
animateNumber(element, start, end, duration) {
    const range = end - start;
    const startTime = performance.now();
    
    const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function for smooth animation
        const easedProgress = 1 - Math.pow(1 - progress, 3);
        const current = start + (range * easedProgress);
        
        element.textContent = this.formatCurrency(Math.round(current));
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    };
    
    requestAnimationFrame(animate);
}
```

## 🚨 Error Handling

### **Global Error Management**
```javascript
// Comprehensive error handling system
class ErrorManager {
    static handleError(error, context = 'Unknown') {
        console.error(`[${context}] Error:`, error);
        
        // User-friendly error messages
        const userMessage = this.getUserFriendlyMessage(error);
        
        // Show error notification
        if (window.app && window.app.notifications) {
            window.app.notifications.showToast(userMessage, 'error');
        }
        
        // Report critical errors
        if (this.isCriticalError(error)) {
            this.reportCriticalError(error, context);
        }
    }
    
    static getUserFriendlyMessage(error) {
        const errorMappings = {
            'QuotaExceededError': 'Storage space is full. Please clear some data.',
            'DataError': 'Invalid data format. Please check your input.',
            'NetworkError': 'Network connection issue. Please try again.',
            'SecurityError': 'Security restriction. Please check permissions.'
        };
        
        return errorMappings[error.name] || 'An unexpected error occurred. Please try again.';
    }
}

// Global error handlers
window.addEventListener('error', (event) => {
    ErrorManager.handleError(event.error, 'Global');
});

window.addEventListener('unhandledrejection', (event) => {
    ErrorManager.handleError(event.reason, 'Promise');
});
```

### **Database Error Recovery**
```javascript
async recoverFromDatabaseError(error) {
    console.warn('Database error detected, attempting recovery:', error);
    
    try {
        // Attempt to reinitialize database
        await this.initDatabase();
        
        // Verify data integrity
        const isValid = await this.validateDataIntegrity();
        
        if (!isValid) {
            // Offer user data recovery options
            this.showDataRecoveryDialog();
        }
        
        return true;
    } catch (recoveryError) {
        console.error('Database recovery failed:', recoveryError);
        this.showCriticalErrorDialog();
        return false;
    }
}
```

## 🧪 Testing Guidelines

### **Unit Testing Structure**
```javascript
// Example test structure for core functionality
describe('RServiceTracker Core Functionality', () => {
    let app, db;
    
    beforeEach(async () => {
        app = new RServiceTracker();
        db = app.db;
        await app.init();
    });
    
    describe('Work Record Management', () => {
        test('should create work record successfully', async () => {
            const today = new Date().toISOString().split('T')[0];
            const result = await db.addWorkRecord(today, 25, 'completed');
            
            expect(result).toBeTruthy();
            
            const record = await db.getWorkRecord(today);
            expect(record.wage).toBe(25);
            expect(record.status).toBe('completed');
        });
        
        test('should prevent future date work records', async () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 1);
            const futureDateStr = futureDate.toISOString().split('T')[0];
            
            // This should be handled at the UI level
            expect(() => {
                calendar.handleMarkAsDone(futureDateStr);
            }).not.toThrow();
        });
    });
    
    describe('Payment Processing', () => {
        test('should process payment correctly', async () => {
            // Setup work records
            const dates = [];
            for (let i = 0; i < 4; i++) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];
                dates.push(dateStr);
                await db.addWorkRecord(dateStr, 25, 'completed');
            }
            
            // Process payment
            const result = await db.addPayment(100, dates);
            expect(result).toBeTruthy();
            
            // Verify payment recorded
            const payments = await db.getAllPayments();
            expect(payments.length).toBe(1);
            expect(payments[0].amount).toBe(100);
        });
    });
    
    afterEach(async () => {
        await db.clearAllData();
    });
});
```

### **Integration Testing**
```javascript
describe('Component Integration', () => {
    test('calendar actions should update dashboard', async () => {
        const today = new Date().toISOString().split('T')[0];
        
        // Mark work as done via calendar
        await calendar.handleMarkAsDone(today);
        
        // Verify dashboard updates
        await app.updateDashboard();
        const stats = await db.getEarningsStats();
        
        expect(stats.totalWorked).toBe(1);
        expect(stats.currentBalance).toBe(25);
    });
});
```

## 🚀 Deployment Guide

### **Pre-deployment Checklist**
```bash
# 1. Code Quality Checks
- [ ] All console.errors resolved
- [ ] Performance optimizations applied
- [ ] Accessibility standards met
- [ ] Cross-browser compatibility verified

# 2. PWA Requirements
- [ ] HTTPS enabled
- [ ] Service worker registered
- [ ] Manifest.json configured
- [ ] Icons optimized (192px, 512px)

# 3. Performance Metrics
- [ ] Lighthouse score > 90
- [ ] First Contentful Paint < 2s
- [ ] Time to Interactive < 3s
- [ ] Cumulative Layout Shift < 0.1
```

### **Deployment Configuration**
```nginx
# Nginx configuration for optimal performance
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    # SSL Configuration
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
    
    # PWA Headers
    add_header Cache-Control "public, max-age=31536000" always;
    
    location / {
        root /var/www/r-service-tracker;
        index index.html;
        try_files $uri $uri/ /index.html;
        
        # Service Worker
        location = /sw.js {
            add_header Cache-Control "no-cache, no-store, must-revalidate";
            add_header Pragma "no-cache";
            add_header Expires "0";
        }
        
        # Manifest
        location = /manifest.json {
            add_header Content-Type "application/manifest+json";
        }
    }
    
    # Asset Optimization
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        gzip_static on;
    }
}
```

### **Performance Monitoring**
```javascript
// Performance monitoring setup
if ('performance' in window) {
    window.addEventListener('load', () => {
        const perfData = performance.getEntriesByType('navigation')[0];
        
        console.log('Performance Metrics:', {
            'DOM Content Loaded': perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
            'Load Complete': perfData.loadEventEnd - perfData.loadEventStart,
            'Total Load Time': perfData.loadEventEnd - perfData.fetchStart
        });
    });
}
```

---

**This technical documentation provides comprehensive coverage of the R-Service Tracker system architecture, implementation details, and deployment guidelines. For additional technical support or questions, refer to the main README.md or open an issue on GitHub.**