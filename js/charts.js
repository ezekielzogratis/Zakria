class ChartsManager {
    constructor(databaseManager) {
        this.db = databaseManager;
        this.charts = {};
        this.defaultColors = {
            primary: '#FF6B35',
            secondary: '#2196F3',
            success: '#4CAF50',
            warning: '#FF9800',
            error: '#F44336',
            info: '#2196F3'
        };
    }

    getThemeColors() {
        const root = document.documentElement;
        const computedStyle = getComputedStyle(root);
        
        return {
            primary: computedStyle.getPropertyValue('--primary').trim() || this.defaultColors.primary,
            secondary: computedStyle.getPropertyValue('--secondary').trim() || this.defaultColors.secondary,
            success: computedStyle.getPropertyValue('--success').trim() || this.defaultColors.success,
            warning: computedStyle.getPropertyValue('--warning').trim() || this.defaultColors.warning,
            error: computedStyle.getPropertyValue('--error').trim() || this.defaultColors.error,
            info: computedStyle.getPropertyValue('--info').trim() || this.defaultColors.info,
            background: computedStyle.getPropertyValue('--background').trim() || '#FAFAFA',
            textPrimary: computedStyle.getPropertyValue('--text-primary').trim() || '#212121',
            textSecondary: computedStyle.getPropertyValue('--text-secondary').trim() || '#757575'
        };
    }

    async createEarningsChart() {
        try {
            const canvas = document.getElementById('earningsChart');
            if (!canvas) return null;

            const ctx = canvas.getContext('2d');
            const colors = this.getThemeColors();
            
            const monthlyData = await this.db.getMonthlyEarnings();
            const sortedMonths = Object.keys(monthlyData).sort();
            
            const last12Months = this.getLast12Months();
            const labels = [];
            const data = [];
            
            last12Months.forEach(month => {
                labels.push(this.formatMonthLabel(month));
                data.push(monthlyData[month] || 0);
            });

            if (this.charts.earnings) {
                this.charts.earnings.destroy();
            }

            this.charts.earnings = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Monthly Earnings (₹)',
                        data: data,
                        borderColor: colors.primary,
                        backgroundColor: this.hexToRgba(colors.primary, 0.1),
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: colors.primary,
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointRadius: 6,
                        pointHoverRadius: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Monthly Earnings Trend',
                            font: {
                                size: 16,
                                weight: 'bold'
                            },
                            color: colors.textPrimary
                        },
                        legend: {
                            display: false
                        },
                        tooltip: {
                            backgroundColor: colors.background,
                            titleColor: colors.textPrimary,
                            bodyColor: colors.textSecondary,
                            borderColor: colors.primary,
                            borderWidth: 1,
                            callbacks: {
                                label: function(context) {
                                    return `Earnings: ₹${context.parsed.y}`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: {
                                display: false
                            },
                            ticks: {
                                color: colors.textSecondary
                            }
                        },
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: this.hexToRgba(colors.textSecondary, 0.1)
                            },
                            ticks: {
                                color: colors.textSecondary,
                                callback: function(value) {
                                    return '₹' + value;
                                }
                            }
                        }
                    },
                    interaction: {
                        intersect: false,
                        mode: 'index'
                    }
                }
            });

            return this.charts.earnings;
        } catch (error) {
            console.error('Error creating earnings chart:', error);
            return null;
        }
    }

    async createWorkDaysChart() {
        try {
            const canvas = document.getElementById('workDaysChart');
            if (!canvas) return null;

            const ctx = canvas.getContext('2d');
            const colors = this.getThemeColors();
            
            const workRecords = await this.db.getAllWorkRecords();
            const payments = await this.db.getAllPayments();
            
            const monthlyStats = {};
            
            workRecords.forEach(record => {
                const key = `${record.year}-${record.month.toString().padStart(2, '0')}`;
                if (!monthlyStats[key]) {
                    monthlyStats[key] = {
                        worked: 0,
                        earned: 0,
                        paid: 0
                    };
                }
                
                if (record.status === 'completed') {
                    monthlyStats[key].worked++;
                    monthlyStats[key].earned += record.wage;
                }
            });
            
            payments.forEach(payment => {
                const key = `${payment.year}-${payment.month.toString().padStart(2, '0')}`;
                if (monthlyStats[key]) {
                    monthlyStats[key].paid += payment.amount;
                }
            });
            
            const last12Months = this.getLast12Months();
            const labels = [];
            const workedData = [];
            const earnedData = [];
            const paidData = [];
            
            last12Months.forEach(month => {
                labels.push(this.formatMonthLabel(month));
                const stats = monthlyStats[month] || { worked: 0, earned: 0, paid: 0 };
                workedData.push(stats.worked);
                earnedData.push(stats.earned);
                paidData.push(stats.paid);
            });

            if (this.charts.workDays) {
                this.charts.workDays.destroy();
            }

            this.charts.workDays = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Days Worked',
                            data: workedData,
                            backgroundColor: this.hexToRgba(colors.primary, 0.8),
                            borderColor: colors.primary,
                            borderWidth: 1,
                            borderRadius: 8,
                            borderSkipped: false,
                            yAxisID: 'y'
                        },
                        {
                            label: 'Amount Earned (₹)',
                            data: earnedData,
                            backgroundColor: this.hexToRgba(colors.success, 0.8),
                            borderColor: colors.success,
                            borderWidth: 1,
                            borderRadius: 8,
                            borderSkipped: false,
                            yAxisID: 'y1'
                        },
                        {
                            label: 'Amount Paid (₹)',
                            data: paidData,
                            backgroundColor: this.hexToRgba(colors.info, 0.8),
                            borderColor: colors.info,
                            borderWidth: 1,
                            borderRadius: 8,
                            borderSkipped: false,
                            yAxisID: 'y1'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Work Days & Earnings',
                            font: {
                                size: 16,
                                weight: 'bold'
                            },
                            color: colors.textPrimary
                        },
                        legend: {
                            position: 'top',
                            labels: {
                                color: colors.textSecondary,
                                font: {
                                    size: 12
                                }
                            }
                        },
                        tooltip: {
                            backgroundColor: colors.background,
                            titleColor: colors.textPrimary,
                            bodyColor: colors.textSecondary,
                            borderColor: colors.primary,
                            borderWidth: 1,
                            callbacks: {
                                label: function(context) {
                                    if (context.datasetIndex === 0) {
                                        return `Days Worked: ${context.parsed.y}`;
                                    } else {
                                        return `${context.dataset.label}: ₹${context.parsed.y}`;
                                    }
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: {
                                display: false
                            },
                            ticks: {
                                color: colors.textSecondary
                            }
                        },
                        y: {
                            type: 'linear',
                            display: true,
                            position: 'left',
                            beginAtZero: true,
                            grid: {
                                color: this.hexToRgba(colors.textSecondary, 0.1)
                            },
                            ticks: {
                                color: colors.textSecondary,
                                callback: function(value) {
                                    return value + ' days';
                                }
                            },
                            title: {
                                display: true,
                                text: 'Days Worked',
                                color: colors.textSecondary
                            }
                        },
                        y1: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            beginAtZero: true,
                            grid: {
                                drawOnChartArea: false,
                            },
                            ticks: {
                                color: colors.textSecondary,
                                callback: function(value) {
                                    return '₹' + value;
                                }
                            },
                            title: {
                                display: true,
                                text: 'Amount (₹)',
                                color: colors.textSecondary
                            }
                        }
                    }
                }
            });

            return this.charts.workDays;
        } catch (error) {
            console.error('Error creating work days chart:', error);
            return null;
        }
    }

    async createEarningsBreakdownChart() {
        try {
            const stats = await this.db.getEarningsStats();
            const colors = this.getThemeColors();
            
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            const data = {
                labels: ['Paid', 'Pending Payment'],
                datasets: [{
                    data: [stats.totalPaid, stats.currentBalance],
                    backgroundColor: [
                        this.hexToRgba(colors.success, 0.8),
                        this.hexToRgba(colors.warning, 0.8)
                    ],
                    borderColor: [colors.success, colors.warning],
                    borderWidth: 2
                }]
            };

            return new Chart(ctx, {
                type: 'doughnut',
                data: data,
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Earnings Breakdown',
                            color: colors.textPrimary
                        },
                        legend: {
                            position: 'bottom',
                            labels: {
                                color: colors.textSecondary
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return `${context.label}: ₹${context.parsed}`;
                                }
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error creating earnings breakdown chart:', error);
            return null;
        }
    }

    async createWeeklyPatternChart() {
        try {
            const workRecords = await this.db.getAllWorkRecords();
            const colors = this.getThemeColors();
            
            const weeklyPattern = {
                'Monday': 0,
                'Tuesday': 0,
                'Wednesday': 0,
                'Thursday': 0,
                'Friday': 0,
                'Saturday': 0,
                'Sunday': 0
            };
            
            workRecords.forEach(record => {
                if (record.status === 'completed') {
                    const date = new Date(record.date);
                    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
                    weeklyPattern[dayName]++;
                }
            });
            
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            return new Chart(ctx, {
                type: 'radar',
                data: {
                    labels: Object.keys(weeklyPattern),
                    datasets: [{
                        label: 'Work Days',
                        data: Object.values(weeklyPattern),
                        backgroundColor: this.hexToRgba(colors.primary, 0.2),
                        borderColor: colors.primary,
                        borderWidth: 2,
                        pointBackgroundColor: colors.primary,
                        pointBorderColor: '#fff',
                        pointRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Weekly Work Pattern',
                            color: colors.textPrimary
                        },
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        r: {
                            beginAtZero: true,
                            grid: {
                                color: this.hexToRgba(colors.textSecondary, 0.2)
                            },
                            angleLines: {
                                color: this.hexToRgba(colors.textSecondary, 0.2)
                            },
                            pointLabels: {
                                color: colors.textSecondary
                            },
                            ticks: {
                                color: colors.textSecondary
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error creating weekly pattern chart:', error);
            return null;
        }
    }

    async initializeCharts() {
        try {
            await this.createEarningsChart();
            await this.createWorkDaysChart();
        } catch (error) {
            console.error('Error initializing charts:', error);
        }
    }

    async updateCharts() {
        try {
            await this.createEarningsChart();
            await this.createWorkDaysChart();
        } catch (error) {
            console.error('Error updating charts:', error);
        }
    }

    destroyCharts() {
        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
        this.charts = {};
    }

    getLast12Months() {
        const months = [];
        const now = new Date();
        
        for (let i = 11; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const year = date.getFullYear();
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            months.push(`${year}-${month}`);
        }
        
        return months;
    }

    formatMonthLabel(monthKey) {
        const [year, month] = monthKey.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1, 1);
        return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    }

    hexToRgba(hex, alpha) {
        hex = hex.replace('#', '');
        
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    exportChart(chartKey, filename) {
        const chart = this.charts[chartKey];
        if (chart) {
            const link = document.createElement('a');
            link.download = filename || `${chartKey}-chart.png`;
            link.href = chart.toBase64Image();
            link.click();
        }
    }

    async getChartStats() {
        try {
            const stats = await this.db.getEarningsStats();
            const workRecords = await this.db.getAllWorkRecords();
            
            const thisMonth = new Date();
            const thisMonthKey = `${thisMonth.getFullYear()}-${(thisMonth.getMonth() + 1).toString().padStart(2, '0')}`;
            
            const thisMonthRecords = workRecords.filter(record => {
                const recordKey = `${record.year}-${record.month.toString().padStart(2, '0')}`;
                return recordKey === thisMonthKey && record.status === 'completed';
            });
            
            const lastMonth = new Date(thisMonth.getFullYear(), thisMonth.getMonth() - 1, 1);
            const lastMonthKey = `${lastMonth.getFullYear()}-${(lastMonth.getMonth() + 1).toString().padStart(2, '0')}`;
            
            const lastMonthRecords = workRecords.filter(record => {
                const recordKey = `${record.year}-${record.month.toString().padStart(2, '0')}`;
                return recordKey === lastMonthKey && record.status === 'completed';
            });
            
            const dailyWage = window.R_SERVICE_CONFIG?.DAILY_WAGE || 25;
            const thisMonthEarnings = thisMonthRecords.length * dailyWage;
            const lastMonthEarnings = lastMonthRecords.length * dailyWage;
            const monthlyGrowth = lastMonthEarnings > 0 ? 
                ((thisMonthEarnings - lastMonthEarnings) / lastMonthEarnings * 100).toFixed(1) : 0;
            
            return {
                ...stats,
                thisMonthDays: thisMonthRecords.length,
                thisMonthEarnings,
                lastMonthDays: lastMonthRecords.length,
                lastMonthEarnings,
                monthlyGrowth: parseFloat(monthlyGrowth),
                averageEarningsPerMonth: stats.totalEarned / Math.max(1, new Set(workRecords.map(r => `${r.year}-${r.month}`)).size),
                workEfficiency: stats.totalWorked > 0 ? (stats.totalEarned / (stats.totalWorked * (window.R_SERVICE_CONFIG?.DAILY_WAGE || 25)) * 100).toFixed(1) : 0
            };
        } catch (error) {
            console.error('Error getting chart stats:', error);
            return {};
        }
    }
}

window.ChartsManager = ChartsManager;