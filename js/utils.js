class Utils {
    constructor() {
        this.dateOptions = {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        };
    }

    formatDate(date, options = this.dateOptions) {
        return new Date(date).toLocaleDateString('en-US', options);
    }

    formatDateShort(date) {
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        });
    }

    formatDateTime(date) {
        return new Date(date).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    formatCurrency(amount) {
        if (amount === undefined || amount === null || isNaN(amount)) {
            return '₹0';
        }
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount)) {
            return '₹0';
        }
        return `₹${numAmount.toLocaleString('en-IN')}`;
    }

    formatCurrencyForPDF(amount) {
        if (amount === 0) return '0 rupees';
        
        const formattedAmount = amount.toLocaleString('en-IN');
        
        return formattedAmount + ' rupees';
    }

    getTodayString() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    getCurrentWeek() {
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        
        return {
            start: this.formatLocalDate(startOfWeek),
            end: this.formatLocalDate(endOfWeek)
        };
    }

    getCurrentMonth() {
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        
        return {
            start: this.formatLocalDate(startOfMonth),
            end: this.formatLocalDate(endOfMonth)
        };
    }

    formatLocalDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    isToday(dateString) {
        return dateString === this.getTodayString();
    }

    isThisWeek(dateString) {
        const week = this.getCurrentWeek();
        return dateString >= week.start && dateString <= week.end;
    }

    isThisMonth(dateString) {
        const month = this.getCurrentMonth();
        return dateString >= month.start && dateString <= month.end;
    }

    getDaysBetween(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end - start);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    getDateRange(startDate, endDate) {
        const dates = [];
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        while (start <= end) {
            dates.push(start.toISOString().split('T')[0]);
            start.setDate(start.getDate() + 1);
        }
        
        return dates;
    }

    async exportToPDF(data, filename = 'R-Service-Tracker-Report.pdf') {
        try {
            console.log('PDF Export: Starting with data:', data);
            
            let jsPDF;
            if (typeof window.jsPDF !== 'undefined') {
                jsPDF = window.jsPDF.jsPDF || window.jsPDF;
            } else if (typeof window.jspdf !== 'undefined') {
                jsPDF = window.jspdf.jsPDF;
            } else {
                console.error('jsPDF library not found. Checked window.jsPDF and window.jspdf');
                throw new Error('jsPDF library not loaded');
            }

            console.log('PDF Export: jsPDF is available');
            const doc = new jsPDF({
                unit: 'mm',
                format: 'a4',
                orientation: 'portrait'
            });
            console.log('PDF Export: jsPDF document created');
            
            // Add Exo font support with proper fallback chain
            try {
                console.log('PDF Export: Setting up Exo font support');
                
                // Add helper method to document for consistent Exo font usage
                doc.setExoFont = function(style = 'normal', size = null) {
                    try {
                        // Exo is a modern geometric sans-serif font
                        // Use helvetica as the closest available alternative with Exo-like characteristics
                        
                        // Map style variations
                        const fontStyles = {
                            'normal': 'normal',
                            'bold': 'bold', 
                            'italic': 'italic',
                            'light': 'normal', // Helvetica doesn't have light, use normal
                            'medium': 'normal',
                            'semibold': 'bold',
                            'extrabold': 'bold'
                        };
                        
                        const mappedStyle = fontStyles[style] || 'normal';
                        this.setFont('helvetica', mappedStyle);
                        
                        // Apply Exo-like text rendering characteristics
                        this.setCharSpace(0.05); // Exo has slightly wider character spacing
                        
                        // If size is provided, set it as well for convenience
                        if (size !== null && typeof size === 'number') {
                            this.setFontSize(size);
                        }
                        
                    } catch (fontSetError) {
                        console.warn('Font setting failed, using default:', fontSetError);
                        this.setFont('helvetica', 'normal');
                        if (size !== null && typeof size === 'number') {
                            this.setFontSize(size);
                        }
                    }
                };
                
                // Set default font properties to match Exo characteristics
                doc.setFont('helvetica', 'normal');
                doc.setCharSpace(0.1); // Exo has slightly wider character spacing
                
                console.log('PDF Export: Exo font support configured successfully');
            } catch (fontError) {
                console.error('PDF Export: Font setup error:', fontError);
                // Fallback font setup
                doc.setExoFont = function(style = 'normal') {
                    this.setFont('helvetica', style || 'normal');
                };
            }
            
            // Set clean document properties with Exo font branding
            doc.setProperties({
                title: 'R-Service Tracker Report',
                subject: 'Work Management Report - Styled with Exo Font',
                author: 'R-Service Tracker',
                creator: 'R-Service Tracker v1.0.0 (Exo Font)',
                producer: 'R-Service Tracker PDF Generator',
                keywords: 'work tracker, payment report, R-Service, Exo font'
            });
            
            const colors = this.getPDFColorsFromTheme();
            console.log('PDF Export: Using theme colors:', colors);
            
            this.addHeader(doc, colors);
            
            let yPos = 55; // Better spacing after header for cleaner layout
            
            yPos = this.addCompanyInfo(doc, colors, yPos);
            
            if (data.summary) {
                yPos = this.addExecutiveSummary(doc, colors, data.summary, yPos);
            }
            
            if (data.summary) {
                yPos = this.addFinancialAnalytics(doc, colors, data.summary, yPos);
            }
            
            if (data.workRecords && data.workRecords.length > 0) {
                yPos = this.addDetailedWorkRecords(doc, colors, data.workRecords, yPos);
            }
            
            if (data.payments && data.payments.length > 0) {
                yPos = this.addPaymentHistory(doc, colors, data.payments, yPos);
            }
            
            if (data.summary) {
                yPos = this.addPerformanceMetrics(doc, colors, data.summary, yPos);
            }
            
            this.addFooter(doc, colors);
            
            console.log('PDF Export: Saving PDF with filename:', filename);
            doc.save(filename);
            console.log('PDF Export: PDF saved successfully');
            return true;
        } catch (error) {
            console.error('Error exporting PDF:', error);
            throw error; // Re-throw to allow proper error handling
        }
    }

    addHeader(doc, colors) {
        try {
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'blue-light';
            const isDarkTheme = currentTheme.includes('dark');
            
            // Create a sophisticated gradient header based on theme
            this.createThemeBasedHeader(doc, colors, currentTheme, isDarkTheme);
            
        } catch (error) {
            console.error('Error in addHeader:', error);
            // Fallback to basic header
            doc.setFillColor(33, 150, 243); // Default blue
            doc.rect(0, 0, 210, 35, 'F');
        }
        
        // Dynamic title styling based on theme
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'blue-light';
        const isDarkTheme = currentTheme.includes('dark');
        const titleColor = this.getTitleColorForTheme(currentTheme, isDarkTheme);
        
        // App title with clean styling using Exo font
        doc.setExoFont('bold', 26);
        doc.setTextColor(...titleColor);
        doc.text('R-Service Tracker', 15, 23);
        
        // Subtitle with enhanced styling using Exo font
        doc.setExoFont('normal', 10);
        doc.setTextColor(...titleColor);
        doc.text('Work & Payment Management Report', 28, 31);
        
        // Clean decorative elements (only gradient border, no corner lines)
        this.addThemeDecorativeElements(doc, colors, currentTheme);
    }

    createThemeBasedHeader(doc, colors, currentTheme, isDarkTheme) {
        const headerHeight = 38;
        
        // Base header background
        doc.setFillColor(...colors.primary);
        doc.rect(0, 0, 210, headerHeight, 'F');
        
        // Create gradient effect simulation with multiple rectangles
        const gradientSteps = 8;
        const stepHeight = headerHeight / gradientSteps;
        
        for (let i = 0; i < gradientSteps; i++) {
            const opacity = 1 - (i * 0.08); // Gradually decrease opacity
            const [r, g, b] = colors.primary;
            
            // Calculate lighter shade for gradient effect
            const lightR = Math.min(255, Math.round(r + (255 - r) * (1 - opacity)));
            const lightG = Math.min(255, Math.round(g + (255 - g) * (1 - opacity)));
            const lightB = Math.min(255, Math.round(b + (255 - b) * (1 - opacity)));
            
            doc.setFillColor(lightR, lightG, lightB);
            doc.rect(0, i * stepHeight, 210, stepHeight, 'F');
        }
        
        // Removed theme patterns and accent bars to keep header completely clean with only gradient
    }

    addThemePattern(doc, colors, currentTheme, headerHeight) {
        // Add subtle geometric patterns based on theme
        doc.setDrawColor(...colors.accent || [255, 255, 255]);
        doc.setLineWidth(0.3);
        
        if (currentTheme.includes('blue')) {
            // Tech-inspired circuit pattern for blue themes
            this.drawCircuitPattern(doc, headerHeight);
        } else if (currentTheme.includes('orange')) {
            // Dynamic wave pattern for orange themes
            this.drawWavePattern(doc, headerHeight);
        } else if (currentTheme.includes('green')) {
            // Organic leaf pattern for green themes
            this.drawLeafPattern(doc, headerHeight);
        } else if (currentTheme.includes('red')) {
            // Angular geometric pattern for red themes
            this.drawGeometricPattern(doc, headerHeight);
        } else if (currentTheme.includes('monochrome')) {
            // Minimalist line pattern for monochrome themes
            this.drawMinimalistPattern(doc, headerHeight);
        }
    }

    drawCircuitPattern(doc, headerHeight) {
        // Subtle circuit-like lines in the header
        for (let i = 0; i < 3; i++) {
            const y = 8 + (i * 8);
            doc.line(160 + (i * 10), y, 180 + (i * 10), y);
            doc.line(180 + (i * 10), y, 180 + (i * 10), y + 6);
            doc.circle(182 + (i * 10), y + 3, 1);
        }
    }

    drawWavePattern(doc, headerHeight) {
        // Flowing wave pattern
        doc.setLineWidth(0.5);
        for (let i = 0; i < 2; i++) {
            const baseY = 12 + (i * 12);
            let prevX = 160, prevY = baseY;
            for (let x = 165; x < 200; x += 5) {
                const y = baseY + Math.sin((x - 160) * 0.3) * 3;
                doc.line(prevX, prevY, x, y);
                prevX = x; prevY = y;
            }
        }
    }

    drawLeafPattern(doc, headerHeight) {
        // Organic leaf-like shapes
        doc.setLineWidth(0.4);
        for (let i = 0; i < 4; i++) {
            const x = 165 + (i * 8);
            const y = 15 + (i % 2) * 8;
            // Simple leaf shape
            doc.ellipse(x, y, 2, 4);
            doc.line(x, y - 4, x, y + 4);
        }
    }

    drawGeometricPattern(doc, headerHeight) {
        // Sharp angular patterns
        doc.setLineWidth(0.4);
        for (let i = 0; i < 3; i++) {
            const x = 170 + (i * 10);
            const y = 15;
            // Diamond shapes
            doc.line(x, y - 4, x + 3, y);
            doc.line(x + 3, y, x, y + 4);
            doc.line(x, y + 4, x - 3, y);
            doc.line(x - 3, y, x, y - 4);
        }
    }

    drawMinimalistPattern(doc, headerHeight) {
        // Clean, minimal lines
        doc.setLineWidth(0.3);
        for (let i = 0; i < 5; i++) {
            const x = 170 + (i * 5);
            doc.line(x, 10, x, 25);
            if (i % 2 === 0) {
                doc.line(x, 17, x + 4, 17);
            }
        }
    }

    getTitleColorForTheme(currentTheme, isDarkTheme) {
        // Return appropriate title color based on theme
        if (currentTheme.includes('monochrome') && isDarkTheme) {
            return [33, 37, 41]; // Dark text for light background in monochrome dark
        }
        return [255, 255, 255]; // White text for most themes
    }

    getIconStyleForTheme(currentTheme) {
        // Return simple text-based icons without special characters
        if (currentTheme.includes('blue')) return 'R-ST'; // R-Service Tracker
        if (currentTheme.includes('orange')) return 'R-ST'; // R-Service Tracker
        if (currentTheme.includes('green')) return 'R-ST'; // R-Service Tracker
        if (currentTheme.includes('red')) return 'R-ST'; // R-Service Tracker
        if (currentTheme.includes('monochrome')) return 'R-ST'; // R-Service Tracker
        return 'R-ST'; // Default R-Service Tracker
    }



    addThemeDecorativeElements(doc, colors, currentTheme) {
        // Only add gradient separator border, no corner lines or dots to keep header clean
        // Professional gradient separator border with enhanced styling
        const borderY = 45;
        const borderHeight = 2;
        const borderWidth = 180;
        const borderStartX = 15;
        
        // Create gradient effect for the border
        const gradientSteps = 20;
        const stepWidth = borderWidth / gradientSteps;
        
        for (let i = 0; i < gradientSteps; i++) {
            const progress = i / gradientSteps;
            const [r, g, b] = colors.primary;
            const [ar, ag, ab] = colors.accent || colors.primary;
            
            // Interpolate between primary and accent colors
            const gradR = Math.round(r + (ar - r) * progress);
            const gradG = Math.round(g + (ag - g) * progress);
            const gradB = Math.round(b + (ab - b) * progress);
            
            doc.setFillColor(gradR, gradG, gradB);
            doc.rect(borderStartX + (i * stepWidth), borderY, stepWidth + 0.5, borderHeight, 'F');
        }
        
        // Add subtle decorative elements at border ends with theme colors
        doc.setFillColor(...colors.accent || colors.primary);
        doc.circle(15, 46, 1, 'F');
        doc.circle(195, 46, 1, 'F');
    }

    addFooter(doc, colors) {
        const footerY = 285;
        
        // Footer background with theme colors
        doc.setFillColor(...colors.light);
        doc.rect(0, footerY, 210, 12, 'F');
        
        // Footer border with theme gradient
        const borderSteps = 10;
        const stepWidth = 210 / borderSteps;
        for (let i = 0; i < borderSteps; i++) {
            const progress = i / borderSteps;
            const [r, g, b] = colors.primary;
            const [ar, ag, ab] = colors.accent || colors.primary;
            
            // Create subtle gradient line at top of footer
            const gradR = Math.round(r + (ar - r) * progress);
            const gradG = Math.round(g + (ag - g) * progress);
            const gradB = Math.round(b + (ab - b) * progress);
            
            doc.setFillColor(gradR, gradG, gradB);
            doc.rect(i * stepWidth, footerY, stepWidth + 0.5, 0.5, 'F');
        }
        
        // Footer content with consistent alignment using Exo font
        doc.setExoFont('normal', 7);
        doc.setTextColor(...colors.secondary);
        
        doc.text('R-Service Tracker - Work Management System', 15, footerY + 5);
        doc.text('Generated automatically - All data remains private on your device', 15, footerY + 8);
        
        // Page number (for multi-page support) - right aligned
        doc.text(`Page ${doc.getCurrentPageInfo().pageNumber}`, 185, footerY + 8);
        
        // Security notice
        doc.setTextColor(...colors.primary);
        doc.text('🔒 Privacy Protected', 150, footerY + 5);
    }

    // Helper function for consistent section headers
    addSectionHeader(doc, colors, title, yPos, height = 15, isLight = false) {
        if (isLight) {
            doc.setFillColor(...colors.light);
            doc.setTextColor(...colors.secondary);
        } else {
            doc.setFillColor(...colors.secondary);
            doc.setTextColor(255, 255, 255);
        }
        
        doc.rect(15, yPos - 5, 180, height, 'F');
        doc.setExoFont('bold', 14);
        doc.text(title, 20, yPos + 5);
        
        return yPos;
    }

    addCompanyInfo(doc, colors, yPos) {
        // Add some spacing before the section
        yPos += 5;
        
        // Use consistent section header styling
        yPos = this.addSectionHeader(doc, colors, 'SERVICE PROVIDER INFORMATION', yPos, 25, true);
        
        doc.setExoFont('normal');
        doc.setFontSize(10);
        doc.text('Service: R-Service Work Tracking', 25, yPos + 13);
        doc.text('Report Type: Work Summary', 25, yPos + 18);
        doc.text(`Daily Rate: ${this.formatCurrencyForPDF(window.R_SERVICE_CONFIG?.DAILY_WAGE || 25)} per day`, 110, yPos + 13);
        doc.text('Currency: Indian Rupees (INR)', 110, yPos + 18);
        
        return yPos + 40; // Extra spacing after this section
    }

    addExecutiveSummary(doc, colors, summary, yPos) {
        if (yPos > 250) {
            doc.addPage();
            yPos = 20;
        }
        
        // Use consistent section header
        yPos = this.addSectionHeader(doc, colors, 'EXECUTIVE SUMMARY', yPos);
        yPos += 20;
        
        const metrics = [
            { label: 'Total Days Worked', value: `${summary.totalWorked} days` },
            { label: 'Total Earnings', value: this.formatCurrencyForPDF(summary.totalEarned) },
            { label: 'Amount Received', value: this.formatCurrencyForPDF(summary.totalPaid) },
            { label: 'Outstanding Balance', value: this.formatCurrencyForPDF(summary.currentBalance) }
        ];
        
        metrics.forEach((metric, index) => {
            const x = 20 + (index % 2) * 90;
            const y = yPos + Math.floor(index / 2) * 25;
            
            doc.setFillColor(252, 252, 252);
            doc.rect(x - 2, y - 3, 85, 20, 'F');
            
            doc.setExoFont('bold');
            doc.setFontSize(11);
            doc.setTextColor(...colors.secondary);
            doc.text(metric.label, x, y + 5);
            
            doc.setExoFont('bold');
            doc.setFontSize(13);
            doc.setTextColor(...colors.primary);
            doc.text(metric.value, x, y + 13);
        });
        
        return yPos + 60;
    }

    addFinancialAnalytics(doc, colors, summary, yPos) {
        if (yPos > 220) {
            doc.addPage();
            yPos = 20;
        }
        
        // Use consistent section header
        yPos = this.addSectionHeader(doc, colors, 'FINANCIAL ANALYTICS', yPos, 15, true);
        yPos += 25;
        
        const avgEarningsPerDay = summary.totalWorked > 0 ? summary.totalEarned / summary.totalWorked : 0;
        const paymentEfficiency = summary.totalEarned > 0 ? (summary.totalPaid / summary.totalEarned * 100) : 0;
        const workStreak = summary.currentStreak || 0;
        
        const analytics = [
            { label: 'Average Daily Earnings', value: this.formatCurrencyForPDF(avgEarningsPerDay) },
            { label: 'Payment Efficiency', value: `${paymentEfficiency.toFixed(1)}%` },
            { label: 'Current Work Streak', value: `${workStreak} days` },
            { label: 'Work Frequency', value: summary.totalWorked > 0 ? 'Active' : 'Inactive' }
        ];
        
        analytics.forEach((item, index) => {
            const x = 25 + (index % 2) * 90;
            const y = yPos + Math.floor(index / 2) * 12;
            
            doc.setExoFont('normal');
            doc.setFontSize(10);
            doc.setTextColor(...colors.secondary);
            doc.text(`${item.label}:`, x, y);
            
            doc.setExoFont('bold');
            doc.setTextColor(...colors.primary);
            doc.text(item.value, x + 65, y);
        });
        
        yPos += 35;
        let statusText = '';
        let statusColor = colors.success;
        
        if (summary.currentBalance > 0) {
            statusText = `Outstanding Payment Due: ${this.formatCurrencyForPDF(summary.currentBalance)}`;
            statusColor = colors.danger;
        } else if (summary.currentBalance < 0) {
            statusText = `Advance Payment Made: ${this.formatCurrencyForPDF(Math.abs(summary.currentBalance))}`;
            statusColor = colors.warning;
        } else {
            statusText = 'All payments up to date';
            statusColor = colors.success;
        }
        
        doc.setFillColor(...statusColor);
        doc.rect(15, yPos - 3, 180, 12, 'F');
        doc.setExoFont('bold');
        doc.setFontSize(11);
        doc.setTextColor(255, 255, 255);
        doc.text(statusText, 20, yPos + 4);
        
        return yPos + 20;
    }

    addDetailedWorkRecords(doc, colors, workRecords, yPos) {
        if (yPos > 200) {
            doc.addPage();
            yPos = 20;
        }
        
        // Use consistent section header
        yPos = this.addSectionHeader(doc, colors, 'DETAILED WORK RECORDS', yPos);
        yPos += 25;
        
        doc.setFillColor(...colors.light);
        doc.rect(15, yPos - 3, 180, 12, 'F');
        
        doc.setExoFont('bold');
        doc.setFontSize(9);
        doc.setTextColor(...colors.secondary);
        doc.text('DATE', 20, yPos + 5);
        doc.text('DAY', 48, yPos + 5);
        doc.text('STATUS', 72, yPos + 5);
        doc.text('EARNINGS', 105, yPos + 5);
        doc.text('PAYMENT STATUS', 140, yPos + 5);
        doc.text('NOTES', 175, yPos + 5);
        yPos += 15;
        
        doc.setExoFont('normal');
        workRecords.forEach((record, index) => {
            if (yPos > 270) {
                doc.addPage();
                yPos = 20;
                
                doc.setFillColor(...colors.light);
                doc.rect(15, yPos - 3, 180, 12, 'F');
                doc.setExoFont('bold');
                doc.setFontSize(9);
                doc.setTextColor(...colors.secondary);
                doc.text('DATE', 20, yPos + 5);
                doc.text('DAY', 50, yPos + 5);
                doc.text('STATUS', 75, yPos + 5);
                doc.text('EARNINGS', 110, yPos + 5);
                doc.text('PAYMENT STATUS', 145, yPos + 5);
                doc.text('NOTES', 175, yPos + 5);
                yPos += 15;
                doc.setExoFont('normal');
            }
            
            if (index % 2 === 0) {
                doc.setFillColor(250, 250, 250);
                doc.rect(15, yPos - 2, 180, 10, 'F');
            }
            
            const date = new Date(record.date);
            const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
            
            doc.setExoFont('normal');
            doc.setFontSize(8);
            doc.setTextColor(...colors.secondary);
            doc.text(this.formatDateShort(record.date), 20, yPos + 3);
            doc.text(dayName, 48, yPos + 3);
            
            if (record.status === 'completed') {
                doc.setTextColor(...colors.success);
                doc.text('COMPLETED', 72, yPos + 3);
            } else {
                doc.setTextColor(...colors.danger);
                doc.text('MISSED', 72, yPos + 3);
            }
            
            doc.setTextColor(...colors.secondary);
            doc.text(record.status === 'completed' ? this.formatCurrencyForPDF(record.wage) : '0 rupees', 105, yPos + 3);
            
            if (record.paid) {
                doc.setTextColor(...colors.success);
                doc.text('PAID', 140, yPos + 3);
            } else {
                doc.setTextColor(...colors.warning);
                doc.text('PENDING', 140, yPos + 3);
            }
            
            doc.setTextColor(...colors.muted);
            doc.text(record.status === 'completed' ? 'OK' : 'FAILED', 175, yPos + 3);
            
            yPos += 10;
        });
        
        return yPos + 15;
    }

    addPaymentHistory(doc, colors, payments, yPos) {
        if (yPos > 200) {
            doc.addPage();
            yPos = 20;
        }
        
        // Use consistent section header
        yPos = this.addSectionHeader(doc, colors, 'PAYMENT TRANSACTION HISTORY', yPos);
        yPos += 25;
        
        const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
        const advancePayments = payments.filter(p => p.isAdvance);
        const regularPayments = payments.filter(p => !p.isAdvance);
        
        doc.setExoFont('normal');
        doc.setFontSize(10);
        doc.setTextColor(...colors.secondary);
        doc.text(`Total Transactions: ${payments.length} | Regular: ${regularPayments.length} | Advance: ${advancePayments.length}`, 20, yPos);
        yPos += 15;
        
        doc.setFillColor(...colors.light);
        doc.rect(15, yPos - 3, 180, 12, 'F');
        
        doc.setExoFont('bold');
        doc.setFontSize(9);
        doc.setTextColor(...colors.secondary);
        doc.text('PAYMENT DATE', 20, yPos + 5);
        doc.text('AMOUNT', 62, yPos + 5);
        doc.text('WORK DAYS', 95, yPos + 5);
        doc.text('TYPE', 125, yPos + 5);
        doc.text('TRANSACTION ID', 155, yPos + 5);
        yPos += 15;
        
        doc.setExoFont('normal');
        payments.forEach((payment, index) => {
            if (yPos > 270) {
                doc.addPage();
                yPos = 20;
                
                doc.setFillColor(...colors.light);
                doc.rect(15, yPos - 3, 180, 12, 'F');
                doc.setExoFont('bold');
                doc.setFontSize(9);
                doc.setTextColor(...colors.secondary);
                doc.text('PAYMENT DATE', 20, yPos + 5);
                doc.text('AMOUNT', 65, yPos + 5);
                doc.text('WORK DAYS', 95, yPos + 5);
                doc.text('TYPE', 125, yPos + 5);
                doc.text('TRANSACTION ID', 155, yPos + 5);
                yPos += 15;
                doc.setExoFont('normal');
            }
            
            if (index % 2 === 0) {
                doc.setFillColor(250, 250, 250);
                doc.rect(15, yPos - 2, 180, 10, 'F');
            }
            
            doc.setExoFont('normal');
            doc.setFontSize(8);
            doc.setTextColor(...colors.secondary);
            doc.text(this.formatDateShort(payment.paymentDate), 20, yPos + 3);
            
            if (payment.isAdvance) {
                doc.setTextColor(...colors.warning);
            } else {
                doc.setTextColor(...colors.success);
            }
            doc.text(this.formatCurrencyForPDF(payment.amount), 62, yPos + 3);
            
            doc.setTextColor(...colors.secondary);
            doc.text(`${payment.workDates.length}`, 95, yPos + 3);
            
            if (payment.isAdvance) {
                doc.setTextColor(...colors.warning);
                doc.text('ADVANCE', 125, yPos + 3);
            } else {
                doc.setTextColor(...colors.success);
                doc.text('REGULAR', 125, yPos + 3);
            }
            
            doc.setTextColor(...colors.muted);
            doc.text(`TXN-${(payment.id || index).toString().padStart(3, '0')}`, 155, yPos + 3);
            
            yPos += 10;
        });
        
        return yPos + 15;
    }

    addPerformanceMetrics(doc, colors, summary, yPos) {
        if (yPos > 200) {
            doc.addPage();
            yPos = 20;
        }
        
        // Use consistent section header
        yPos = this.addSectionHeader(doc, colors, 'PERFORMANCE INSIGHTS AND RECOMMENDATIONS', yPos);
        yPos += 25;
        
        const workDays = summary.totalWorked || 0;
        const earnings = summary.totalEarned || 0;
        const streak = summary.currentStreak || 0;
        
        const insights = [];
        
        if (workDays >= 30) {
            insights.push('Excellent work consistency - Over 30 days completed');
        } else if (workDays >= 15) {
            insights.push('Good work progress - Over 15 days completed');
        } else if (workDays >= 7) {
            insights.push('Building momentum - Weekly target achieved');
        } else {
            insights.push('Getting started - Continue building your work record');
        }
        
        if (streak >= 7) {
            insights.push('Outstanding streak - 7+ consecutive days');
        } else if (streak >= 3) {
            insights.push('Good momentum - 3+ consecutive days');
        }
        
        if (summary.currentBalance <= 0) {
            insights.push('Payment status healthy - No outstanding dues');
        } else {
            insights.push('Payment attention needed - Outstanding balance exists');
        }
        
        insights.forEach((insight, index) => {
            doc.setExoFont('normal');
            doc.setFontSize(10);
            doc.setTextColor(...colors.secondary);
            doc.text(`${index + 1}. ${insight}`, 25, yPos + (index * 8));
        });
        
        yPos += insights.length * 8 + 15;
        
        doc.setExoFont('bold');
        doc.setFontSize(12);
        doc.setTextColor(...colors.primary);
        doc.text('RECOMMENDATIONS:', 20, yPos);
        yPos += 12;
        
        const recommendations = [
            'Maintain consistent daily work schedule for optimal earnings',
            'Review payment cycles to ensure timely settlement',
            'Track performance metrics regularly for improvement',
            'Consider setting milestone goals for motivation'
        ];
        
        recommendations.forEach((rec, index) => {
            doc.setExoFont('normal');
            doc.setFontSize(9);
            doc.setTextColor(...colors.secondary);
            doc.text(`• ${rec}`, 25, yPos + (index * 6));
        });
        
        return yPos + 30;
    }

    addFooter(doc, colors, data) {
        const pageCount = doc.internal.getNumberOfPages();
        const now = new Date();
        
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            
            doc.setFillColor(...colors.light);
            doc.rect(0, 285, 210, 12, 'F');
            
            doc.setExoFont('bold');
            doc.setFontSize(8);
            doc.setTextColor(...colors.secondary);
            doc.text(`Page ${i} of ${pageCount}`, 20, 292);
            
            doc.setExoFont('normal');
            doc.text('R-Service Tracker v1.0.0', 80, 292);
            
            doc.text(`Generated: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`, 155, 292);
            
            if (i === pageCount) {
                doc.setExoFont('normal');
                doc.setFontSize(7);
                doc.setTextColor(...colors.muted);
                doc.text('This report contains confidential work and payment information. Handle with care.', 20, 280);
            }
        }
    }

    getPDFColorsFromTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'blue-light';
        
        const themeColors = {
            'blue-light': {
                primary: [33, 150, 243],      // Blue
                secondary: [33, 37, 41],      // Dark gray
                text: [33, 37, 41],           // Dark text for PDF readability
                accent: [227, 242, 253],      // Light blue accent
                success: [40, 167, 69],       // Green
                warning: [255, 193, 7],       // Yellow
                danger: [220, 53, 69],        // Red
                light: [248, 249, 250],       // Light gray
                muted: [117, 117, 117]        // Muted gray
            },
            'blue-dark': {
                primary: [33, 150, 243],      // Blue
                secondary: [33, 37, 41],      // Always dark for PDF text readability
                text: [33, 37, 41],           // Always dark text for PDF readability
                accent: [227, 242, 253],      // Light blue accent
                success: [40, 167, 69],       // Green
                warning: [255, 193, 7],       // Yellow
                danger: [220, 53, 69],        // Red
                light: [248, 249, 250],       // Light background for PDF
                muted: [117, 117, 117]        // Muted gray
            },
            'orange-light': {
                primary: [255, 107, 53],      // Orange
                secondary: [33, 37, 41],      // Dark gray
                text: [33, 37, 41],           // Dark text for PDF readability
                accent: [255, 224, 178],      // Light orange accent
                success: [40, 167, 69],       // Green
                warning: [255, 193, 7],       // Yellow
                danger: [220, 53, 69],        // Red
                light: [248, 249, 250],       // Light gray
                muted: [117, 117, 117]        // Muted gray
            },
            'orange-dark': {
                primary: [255, 107, 53],      // Orange
                secondary: [33, 37, 41],      // Always dark for PDF text readability
                text: [33, 37, 41],           // Always dark text for PDF readability
                accent: [255, 224, 178],      // Light orange accent
                success: [40, 167, 69],       // Green
                warning: [255, 193, 7],       // Yellow
                danger: [220, 53, 69],        // Red
                light: [248, 249, 250],       // Light background for PDF
                muted: [117, 117, 117]        // Muted gray
            },
            'green-light': {
                primary: [76, 175, 80],       // Green
                secondary: [33, 37, 41],      // Dark gray
                text: [33, 37, 41],           // Dark text for PDF readability
                accent: [232, 245, 232],      // Light green accent
                success: [40, 167, 69],       // Green
                warning: [255, 193, 7],       // Yellow
                danger: [220, 53, 69],        // Red
                light: [248, 249, 250],       // Light gray
                muted: [117, 117, 117]        // Muted gray
            },
            'green-dark': {
                primary: [76, 175, 80],       // Green
                secondary: [33, 37, 41],      // Always dark for PDF text readability
                text: [33, 37, 41],           // Always dark text for PDF readability
                accent: [232, 245, 232],      // Light green accent
                success: [40, 167, 69],       // Green
                warning: [255, 193, 7],       // Yellow
                danger: [220, 53, 69],        // Red
                light: [248, 249, 250],       // Light background for PDF
                muted: [117, 117, 117]        // Muted gray
            },
            'red-light': {
                primary: [244, 67, 54],       // Red
                secondary: [33, 37, 41],      // Dark gray
                text: [33, 37, 41],           // Dark text for PDF readability
                accent: [255, 235, 238],      // Light red accent
                success: [40, 167, 69],       // Green
                warning: [255, 193, 7],       // Yellow
                danger: [220, 53, 69],        // Red
                light: [248, 249, 250],       // Light gray
                muted: [117, 117, 117]        // Muted gray
            },
            'red-dark': {
                primary: [244, 67, 54],       // Red
                secondary: [33, 37, 41],      // Always dark for PDF text readability
                text: [33, 37, 41],           // Always dark text for PDF readability
                accent: [255, 235, 238],      // Light red accent
                success: [40, 167, 69],       // Green
                warning: [255, 193, 7],       // Yellow
                danger: [220, 53, 69],        // Red
                light: [248, 249, 250],       // Light background for PDF
                muted: [117, 117, 117]        // Muted gray
            },
            'monochrome-light': {
                primary: [44, 44, 44],        // Dark gray
                secondary: [33, 37, 41],      // Dark gray
                text: [33, 37, 41],           // Dark text for PDF readability
                accent: [240, 240, 240],      // Light gray accent
                success: [46, 125, 50],       // Green
                warning: [245, 124, 0],       // Orange
                danger: [198, 40, 40],        // Red
                light: [248, 249, 250],       // Light gray
                muted: [117, 117, 117]        // Muted gray
            },
            'monochrome-dark': {
                primary: [44, 44, 44],        // Always dark for PDF text readability
                secondary: [33, 37, 41],      // Always dark for PDF text readability
                text: [33, 37, 41],           // Always dark text for PDF readability
                accent: [240, 240, 240],      // Light gray accent
                success: [46, 125, 50],       // Green
                warning: [245, 124, 0],       // Orange
                danger: [198, 40, 40],        // Red
                light: [248, 249, 250],       // Light background for PDF
                muted: [117, 117, 117]        // Muted gray
            }
        };
        
        return themeColors[currentTheme] || themeColors['blue-light'];
    }

    getReportPeriod(data) {
        if (!data.workRecords || data.workRecords.length === 0) {
            return 'No records available';
        }
        
        const dates = data.workRecords.map(record => new Date(record.date));
        const startDate = new Date(Math.min(...dates));
        const endDate = new Date(Math.max(...dates));
        
        return `${this.formatDateShort(startDate.toISOString().split('T')[0])} to ${this.formatDateShort(endDate.toISOString().split('T')[0])}`;
    }

    validateDate(dateString) {
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date);
    }

    validateWage(wage) {
        return typeof wage === 'number' && wage > 0;
    }

    saveToLocalStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Error saving to localStorage:', error);
            return false;
        }
    }

    loadFromLocalStorage(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Error loading from localStorage:', error);
            return null;
        }
    }

    removeFromLocalStorage(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Error removing from localStorage:', error);
            return false;
        }
    }

    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        this.saveToLocalStorage('r-service-theme', theme);
        
        this.updateBrowserThemeColor(theme);
    }
    
    updateBrowserThemeColor(theme) {
        const themeColorMap = {
            'blue-light': '#2196F3',
            'blue-dark': '#1976D2',
            'orange-light': '#FF6B35',
            'orange-dark': '#E55A2B',
            'green-light': '#4CAF50',
            'green-dark': '#388E3C',
            'purple-light': '#9C27B0',
            'purple-dark': '#7B1FA2'
        };
        
        const color = themeColorMap[theme] || '#2196F3';
        
        const existingMetas = document.querySelectorAll('meta[name="theme-color"]');
        existingMetas.forEach(meta => meta.remove());
        
        const meta = document.createElement('meta');
        meta.name = 'theme-color';
        meta.content = color;
        document.head.appendChild(meta);
        
        let navButtonMeta = document.querySelector('meta[name="msapplication-navbutton-color"]');
        if (navButtonMeta) {
            navButtonMeta.content = color;
        } else {
            navButtonMeta = document.createElement('meta');
            navButtonMeta.name = 'msapplication-navbutton-color';
            navButtonMeta.content = color;
            document.head.appendChild(navButtonMeta);
        }
        
        let statusBarMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
        const statusBarStyle = theme.includes('dark') ? 'black-translucent' : 'default';
        if (statusBarMeta) {
            statusBarMeta.content = statusBarStyle;
        }
        
        console.log(`Browser theme color updated to ${color} for theme: ${theme}`);
    }

    getTheme() {
        return this.loadFromLocalStorage('r-service-theme') || 'orange-light';
    }

    animateValue(element, start, end, duration = 1000) {
        if (!element) return;
        
        const startTimestamp = performance.now();
        const step = (timestamp) => {
            const elapsed = timestamp - startTimestamp;
            const progress = Math.min(elapsed / duration, 1);
            
            const current = Math.floor(progress * (end - start) + start);
            element.textContent = current;
            
            if (progress < 1) {
                requestAnimationFrame(step);
            }
        };
        
        requestAnimationFrame(step);
    }

    animateCurrency(element, start, end, duration = 1000) {
        if (!element) return;
        
        const startTimestamp = performance.now();
        const step = (timestamp) => {
            const elapsed = timestamp - startTimestamp;
            const progress = Math.min(elapsed / duration, 1);
            
            const current = Math.floor(progress * (end - start) + start);
            element.textContent = this.formatCurrency(current);
            
            if (progress < 1) {
                requestAnimationFrame(step);
            }
        };
        
        requestAnimationFrame(step);
    }

    animateNumber(element, start, end, duration = 1000) {
        if (!element) return;
        
        const startTimestamp = performance.now();
        const step = (timestamp) => {
            const elapsed = timestamp - startTimestamp;
            const progress = Math.min(elapsed / duration, 1);
            
            const current = Math.floor(progress * (end - start) + start);
            element.textContent = current.toLocaleString('en-IN');
            
            if (progress < 1) {
                requestAnimationFrame(step);
            }
        };

        requestAnimationFrame(step);
    }

    debounce(func, delay) {
        let timeoutId;
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }

    throttle(func, limit) {
        let lastFunc;
        let lastRan;
        return function (...args) {
            if (!lastRan) {
                func.apply(this, args);
                lastRan = Date.now();
            } else {
                clearTimeout(lastFunc);
                lastFunc = setTimeout(() => {
                    if ((Date.now() - lastRan) >= limit) {
                        func.apply(this, args);
                        lastRan = Date.now();
                    }
                }, limit - (Date.now() - lastRan));
            }
        };
    }

    generateShareableLink(data) {
        const params = new URLSearchParams({
            totalEarned: data.totalEarned || 0,
            totalWorked: data.totalWorked || 0,
            currentStreak: data.currentStreak || 0
        });
        
        return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    }

    downloadJSON(data, filename = 'r-service-backup.json') {
        const dataStr = JSON.stringify(data, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = filename;
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    }

    readJSONFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    resolve(data);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = () => reject(new Error('File reading failed'));
            reader.readAsText(file);
        });
    }

    measurePerformance(label, fn) {
        const start = performance.now();
        const result = fn();
        const end = performance.now();
        console.log(`${label}: ${(end - start).toFixed(2)}ms`);
        return result;
    }

    handleError(error, context = 'Unknown') {
        console.error(`Error in ${context}:`, error);
        
        if (window.gtag) {
            window.gtag('event', 'exception', {
                description: `${context}: ${error.message}`,
                fatal: false
            });
        }
        
        return {
            success: false,
            error: error.message,
            context: context,
            timestamp: new Date().toISOString()
        };
    }

    isOnline() {
        return navigator.onLine;
    }

    isMobile() {
        return window.innerWidth <= 768;
    }

    isTablet() {
        return window.innerWidth > 768 && window.innerWidth <= 1024;
    }

    isDesktop() {
        return window.innerWidth > 1024;
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }

    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                document.body.removeChild(textArea);
                return true;
            } catch (fallbackError) {
                document.body.removeChild(textArea);
                return false;
            }
        }
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    randomBetween(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    groupBy(array, key) {
        return array.reduce((groups, item) => {
            const group = item[key];
            groups[group] = groups[group] || [];
            groups[group].push(item);
            return groups;
        }, {});
    }

    sortBy(array, key, direction = 'asc') {
        return [...array].sort((a, b) => {
            const aVal = a[key];
            const bVal = b[key];
            
            if (direction === 'asc') {
                return aVal > bVal ? 1 : -1;
            } else {
                return aVal < bVal ? 1 : -1;
            }
        });
    }

    calculateAverage(numbers) {
        if (numbers.length === 0) return 0;
        const sum = numbers.reduce((a, b) => a + b, 0);
        return sum / numbers.length;
    }

    calculatePercentage(part, total) {
        if (total === 0) return 0;
        return (part / total) * 100;
    }

    calculateGrowth(current, previous) {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
    }
}

window.Utils = Utils;