class CalendarManager {
    constructor(databaseManager) {
        this.db = databaseManager;
        this.currentDate = new Date();
        this.workRecords = [];
        this.payments = [];
        this.monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        this.dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    }

    async init() {
        try {
            await this.loadData();
            this.setupEventListeners();
            this.render();
        } catch (error) {
            console.error('Error initializing calendar:', error);
        }
    }

    async loadData() {
        try {
            this.workRecords = await this.db.getAllWorkRecords();
            this.payments = await this.db.getAllPayments();
        } catch (error) {
            console.error('Error loading calendar data:', error);
        }
    }

    setupEventListeners() {
        const prevBtn = document.getElementById('prevMonth');
        const nextBtn = document.getElementById('nextMonth');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                this.previousMonth();
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                this.nextMonth();
            });
        }

        document.addEventListener('keydown', (e) => {
            if (document.getElementById('calendarView').style.display !== 'none') {
                if (e.key === 'ArrowLeft') {
                    this.previousMonth();
                } else if (e.key === 'ArrowRight') {
                    this.nextMonth();
                }
            }
        });
    }

    previousMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        this.render();
    }

    nextMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        this.render();
    }

    goToToday() {
        this.currentDate = new Date();
        this.render();
    }

    goToMonth(year, month) {
        this.currentDate = new Date(year, month - 1, 1);
        this.render();
    }

    render() {
        this.updateTitle();
        this.renderGrid();
    }

    updateTitle() {
        const titleElement = document.getElementById('calendarTitle');
        if (titleElement) {
            const monthName = this.monthNames[this.currentDate.getMonth()];
            const year = this.currentDate.getFullYear();
            titleElement.textContent = `${monthName} ${year}`;
        }
    }

    renderGrid() {
        const gridElement = document.getElementById('calendarGrid');
        if (!gridElement) return;

        const fragment = document.createDocumentFragment();
        
        gridElement.innerHTML = '';

        this.dayNames.forEach(dayName => {
            const dayHeader = document.createElement('div');
            dayHeader.className = 'calendar-header-cell';
            dayHeader.textContent = dayName;
            dayHeader.style.cssText = `
                padding: 0.75rem;
                background: var(--surface);
                font-weight: 600;
                text-align: center;
                color: var(--text-primary);
                border-bottom: 1px solid var(--primary);
                border-radius: 6px 6px 0 0;
                font-size: 0.8rem;
            `;
            fragment.appendChild(dayHeader);
        });

        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startDay = firstDay.getDay();

        for (let i = 0; i < startDay; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'calendar-cell empty';
            fragment.appendChild(emptyCell);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const cellDate = new Date(year, month, day);
            const dateString = this.formatDate(cellDate);
            
            const cell = this.createDayCell(day, cellDate, dateString);
            fragment.appendChild(cell);
        }

        const totalCells = 42;
        const currentCells = startDay + daysInMonth;
        const remainingCells = totalCells - currentCells;
        
        for (let i = 0; i < remainingCells; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'calendar-cell empty';
            fragment.appendChild(emptyCell);
        }
        
        gridElement.appendChild(fragment);
    }

    createDayCell(day, cellDate, dateString) {
        const cell = document.createElement('div');
        cell.className = 'calendar-cell';
        
        const today = new Date();
        const isToday = this.isSameDate(cellDate, today);
        
        const workRecord = this.workRecords.find(record => record.date === dateString);
        const isWorked = workRecord && workRecord.status === 'completed';
        
        const isPaid = this.isDatePaid(dateString);
        
        if (isToday) {
            cell.classList.add('today');
        }
        if (isWorked) {
            cell.classList.add('worked');
            if (isPaid) {
                cell.classList.add('paid');
            }
        }

        const cellContent = this.createCellContent(day, workRecord, isPaid, isToday);
        cell.appendChild(cellContent);

        cell.addEventListener('click', async () => {
            await this.showDayDetails(cellDate, workRecord, isPaid);
        });

        cell.addEventListener('mouseenter', () => {
            cell.classList.add('calendar-cell-hover');
        });

        cell.addEventListener('mouseleave', () => {
            cell.classList.remove('calendar-cell-hover');
        });

        return cell;
    }

    createCellContent(day, workRecord, isPaid, isToday) {
        const content = document.createElement('div');
        content.className = 'calendar-cell-content';
        content.style.cssText = `
            height: 100%;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            padding: 0.5rem;
        `;

        const dayNumber = document.createElement('div');
        dayNumber.className = 'day-number';
        dayNumber.textContent = day;
        dayNumber.style.cssText = `
            font-weight: ${isToday ? 'bold' : '500'};
            font-size: 1rem;
            color: ${isToday ? 'white' : 'var(--text-primary)'};
        `;

        const indicators = document.createElement('div');
        indicators.className = 'day-indicators';
        indicators.style.cssText = `
            display: flex;
            flex-direction: row;
            gap: 0.15rem;
            margin-top: 0.1rem;
            flex-wrap: nowrap;
            justify-content: center;
            align-items: center;
        `;

        if (workRecord && workRecord.status === 'completed') {
            const workIndicator = document.createElement('span');
            workIndicator.className = 'work-indicator';
            workIndicator.innerHTML = '<i class="fas fa-check"></i>';
            workIndicator.style.cssText = `
                background: var(--success);
                color: white;
                border-radius: 50%;
                width: 10px;
                height: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 0.5rem;
                flex-shrink: 0;
                margin: 0 1px;
            `;
            indicators.appendChild(workIndicator);

            if (isPaid) {
                const payment = this.getPaymentForDate(workRecord.date);
                const paymentAmount = payment ? Math.floor(payment.amount / payment.workDates.length) : (window.R_SERVICE_CONFIG?.DAILY_WAGE || 25);
                
                const paidIndicator = document.createElement('span');
                paidIndicator.className = 'paid-indicator';
                paidIndicator.innerHTML = '<i class="fas fa-money-bill-wave"></i>';
                paidIndicator.style.cssText = `
                    background: var(--info);
                    color: white;
                    border-radius: 50%;
                    width: 10px;
                    height: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.5rem;
                    flex-shrink: 0;
                    margin: 0 1px;
                `;
                indicators.appendChild(paidIndicator);
            }
        }

        content.appendChild(dayNumber);
        content.appendChild(indicators);

        return content;
    }

    async showDayDetails(date, workRecord, isPaid) {
        const dateString = this.formatDate(date);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
        const formattedDate = date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });

        let content = `
            <div class="day-details">
                <h3>${dayName}</h3>
                <p class="date">${formattedDate}</p>
        `;

        const today = new Date();
        today.setHours(23, 59, 59, 999); // Set to end of today for comparison
        const isPastOrTodayDate = date <= today;
        const isPastDate = date < today || this.isSameDate(date, today);

        if (workRecord && workRecord.status === 'completed') {
            content += `
                <div class="work-status success">
                    <i class="fas fa-check-circle"></i>
                    <span>Work Completed</span>
                </div>
                <div class="earnings">
                    <span class="label">Earned:</span>
                    <span class="amount">₹${workRecord.wage}</span>
                </div>
            `;

            if (isPaid) {
                const payment = this.getPaymentForDate(dateString);
                const paidAmount = payment ? Math.floor(payment.amount / payment.workDates.length) : (window.R_SERVICE_CONFIG?.DAILY_WAGE || 25);
                content += `
                    <div class="payment-status success">
                        <i class="fas fa-money-bill-wave"></i>
                        <span>Payment Received</span>
                    </div>
                    <div class="payment-details">
                        <span class="label">Amount Paid:</span>
                        <span class="amount">₹${paidAmount}</span>
                    </div>
                `;
                if (payment) {
                    content += `
                        <div class="payment-details">
                            <span class="label">Payment Date:</span>
                            <span class="date">${new Date(payment.paymentDate).toLocaleDateString()}</span>
                        </div>
                    `;
                }
            } else {
                content += `
                    <div class="payment-status pending">
                        <i class="fas fa-clock"></i>
                        <span>Payment Pending</span>
                    </div>
                `;
            }
        } else {
            content += `
                <div class="work-status not-worked">
                    <i class="fas fa-times-circle"></i>
                    <span>No Work Recorded</span>
                </div>
            `;
            
            // Add Mark as Done button only for past or today dates
            if (isPastOrTodayDate) {
                content += `
                    <button class="mark-done-btn" data-date="${dateString}" style="
                        margin-top: 1rem;
                        width: 100%;
                        padding: 0.75rem;
                        background: linear-gradient(135deg, var(--primary), var(--primary-dark));
                        color: white;
                        border: none;
                        border-radius: var(--border-radius);
                        cursor: pointer;
                        font-family: var(--font-family);
                        font-weight: 600;
                        font-size: 0.9rem;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 0.5rem;
                        box-shadow: var(--shadow-light);
                        transition: all var(--transition-fast);
                    ">
                        <i class="fas fa-check"></i>
                        Mark as Done
                    </button>
                `;
            } else {
                content += `
                    <div class="future-date-notice" style="
                        margin-top: 1rem;
                        padding: 0.75rem;
                        background: var(--warning);
                        color: white;
                        border-radius: var(--border-radius);
                        text-align: center;
                        font-weight: 500;
                    ">
                        <i class="fas fa-calendar-times"></i>
                        Cannot mark work for future dates
                    </div>
                `;
            }
        }



        content += `</div>`;

        this.showDayModal(content, dateString);
    }

    showDayModal(content, dateString) {
        const modal = document.createElement('div');
        modal.className = 'day-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(4px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1001;
            animation: fadeIn 0.3s ease-in-out;
        `;

        const modalContent = document.createElement('div');
        modalContent.className = 'day-modal-content';
        modalContent.style.cssText = `
            background: var(--surface);
            border-radius: var(--border-radius);
            padding: 2rem;
            max-width: 400px;
            width: 90%;
            box-shadow: var(--shadow-heavy);
            animation: slideInUp 0.3s ease-in-out;
        `;

        modalContent.innerHTML = content + `
            <button class="close-day-modal" style="
                margin-top: 1.5rem;
                width: 100%;
                padding: 0.75rem;
                background: var(--primary);
                color: white;
                border: none;
                border-radius: var(--border-radius);
                cursor: pointer;
                font-family: var(--font-family);
                font-weight: 500;
            ">Close</button>
        `;

        modal.appendChild(modalContent);
        document.body.appendChild(modal);

        const closeModal = () => {
            if (document.body.contains(modal)) {
                document.body.removeChild(modal);
            }
        };

        const closeBtn = modalContent.querySelector('.close-day-modal');
        closeBtn.addEventListener('click', closeModal);

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });



        // Add event listener for Mark as Done button
        const markDoneBtn = modalContent.querySelector('.mark-done-btn');
        if (markDoneBtn) {
            markDoneBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                try {
                    const targetDate = markDoneBtn.dataset.date || dateString;
                    console.log('Mark as done button clicked for date:', targetDate);
                    
                    if (!targetDate) {
                        console.error('No target date found');
                        if (window.app && window.app.notifications) {
                            window.app.notifications.showToast('Error: No date selected', 'error');
                        }
                        return;
                    }
                    
                    markDoneBtn.disabled = true;
                    markDoneBtn.style.background = 'linear-gradient(135deg, #ccc, #999)';
                    markDoneBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
                    markDoneBtn.style.transform = 'scale(0.95)';
                    
                    closeModal();
                    
                    setTimeout(async () => {
                        try {
                            await this.handleMarkAsDone(targetDate);
                        } catch (markDoneError) {
                            console.error('Error marking work as done:', markDoneError);
                            if (window.app && window.app.notifications) {
                                window.app.notifications.showToast('Error marking work as done. Please try again.', 'error');
                            }
                        }
                    }, 200);
                    
                } catch (error) {
                    console.error('Error in mark as done button handler:', error);
                    if (window.app && window.app.notifications) {
                        window.app.notifications.showToast('Error marking work as done', 'error');
                    }
                }
            });
        }

        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);
    }

    formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    isSameDate(date1, date2) {
        return date1.toDateString() === date2.toDateString();
    }

    isDatePaid(dateString) {
        return this.payments.some(payment => 
            payment.workDates.includes(dateString)
        );
    }

    getPaymentForDate(dateString) {
        return this.payments.find(payment => 
            payment.workDates.includes(dateString)
        );
    }

    async isPaymentDay() {
        try {
            if (!this.db) return false;
            
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
            
            return isPaymentDay;
        } catch (error) {
            console.error('Error checking if payment day:', error);
            return false;
        }
    }

    getCalendarStats() {
        const currentMonth = this.currentDate.getMonth() + 1;
        const currentYear = this.currentDate.getFullYear();
        
        const monthRecords = this.workRecords.filter(record => 
            record.month === currentMonth && record.year === currentYear
        );
        
        const workedDays = monthRecords.filter(record => 
            record.status === 'completed'
        ).length;
        
        const totalEarnings = workedDays * (window.R_SERVICE_CONFIG?.DAILY_WAGE || 25);
        
        const paidDays = monthRecords.filter(record => 
            record.status === 'completed' && this.isDatePaid(record.date)
        ).length;
        
        const paidAmount = paidDays * (window.R_SERVICE_CONFIG?.DAILY_WAGE || 25);
        const pendingAmount = totalEarnings - paidAmount;
        
        return {
            month: this.monthNames[this.currentDate.getMonth()],
            year: currentYear,
            workedDays,
            totalEarnings,
            paidAmount,
            pendingAmount,
            paidDays,
            pendingDays: workedDays - paidDays
        };
    }

    async updateCalendar() {
        await this.loadData();
        this.render();
    }

    exportCalendarView() {
        const stats = this.getCalendarStats();
        const monthName = this.monthNames[this.currentDate.getMonth()];
        const year = this.currentDate.getFullYear();
        
        const exportData = {
            period: `${monthName} ${year}`,
            statistics: stats,
            workDays: this.workRecords
                .filter(record => 
                    record.month === this.currentDate.getMonth() + 1 && 
                    record.year === year &&
                    record.status === 'completed'
                )
                .map(record => ({
                    date: record.date,
                    day: new Date(record.date).toLocaleDateString('en-US', { weekday: 'long' }),
                    wage: record.wage,
                    paid: this.isDatePaid(record.date)
                }))
        };
        
        return exportData;
    }





    highlightDates(dates, className = 'highlighted') {
        dates.forEach(dateString => {
            const date = new Date(dateString);
            if (date.getMonth() === this.currentDate.getMonth() && 
                date.getFullYear() === this.currentDate.getFullYear()) {
            }
        });
    }

    async handleMarkAsDone(dateString) {
        try {
            console.log('Processing mark as done for date:', dateString);
            
            if (!dateString) {
                throw new Error('No date provided for marking as done');
            }

            if (!this.db) {
                throw new Error('Database not available');
            }
            
            // Check if the date is in the future
            const targetDate = new Date(dateString);
            const today = new Date();
            today.setHours(23, 59, 59, 999); // Set to end of today for comparison
            
            if (targetDate > today) {
                if (window.app && window.app.notifications) {
                    window.app.notifications.showToast('Cannot mark work as done for future dates!', 'error');
                }
                return;
            }
            
            // Check if work is already recorded for this date
            const existingRecord = await this.db.getWorkRecord(dateString);
            if (existingRecord && existingRecord.status === 'completed') {
                if (window.app && window.app.notifications) {
                    window.app.notifications.showToast('Work already marked as done for this date!', 'warning');
                }
                return;
            }
            
            const dailyWage = window.R_SERVICE_CONFIG?.DAILY_WAGE || 25;
            
            // Add work record
            await this.db.addWorkRecord(dateString, dailyWage, 'completed');
            console.log('Work record added successfully');

            if (window.app && window.app.notifications) {
                window.app.notifications.showToast(`Work marked as done for ${new Date(dateString).toLocaleDateString()}! Earned ₹${dailyWage}`, 'success');
                try {
                    window.app.notifications.playSound('done');
                } catch (soundError) {
                    console.log('Sound playback failed (non-critical):', soundError);
                }
            }

            // Refresh calendar and app state
            try {
                await this.loadData();
                
                const gridElement = document.getElementById('calendarGrid');
                if (gridElement) {
                    gridElement.innerHTML = '';
                }
                this.render();
                
                console.log('Calendar refreshed after marking as done');

                // Sync all amount flow and updates across components
                if (window.app && typeof window.app.syncAmountFlow === 'function') {
                    try {
                        await window.app.syncAmountFlow();
                        
                        // Check and process automatic advance payment if applicable
                        if (typeof window.app.processAutomaticAdvancePayment === 'function') {
                            await window.app.processAutomaticAdvancePayment(dateString);
                        }
                        
                        // Update today's status (done button state)
                        if (typeof window.app.updateTodayStatus === 'function') {
                            await window.app.updateTodayStatus();
                        }
                        
                        if (typeof window.app.checkPendingPayments === 'function') {
                            await window.app.checkPendingPayments();
                        }
                        
                        console.log('App synced after marking as done');
                    } catch (syncError) {
                        console.error('Error syncing app after marking as done:', syncError);
                    }
                }

            } catch (refreshError) {
                console.error('Error refreshing after marking as done:', refreshError);
                if (window.app && window.app.notifications) {
                    window.app.notifications.showToast('Work saved but display may need manual refresh', 'warning');
                }
            }
            
        } catch (error) {
            console.error('Error in handleMarkAsDone:', error);
            if (window.app && window.app.notifications) {
                window.app.notifications.showToast('Error marking work as done: ' + error.message, 'error');
            }
            throw error;
        }
    }
}

window.CalendarManager = CalendarManager;

const calendarStyle = document.createElement('style');
calendarStyle.textContent = `
    .calendar-header-cell {
        padding: 0.75rem;
        background: var(--surface);
        font-weight: 600;
        text-align: center;
        color: var(--text-primary);
        border-bottom: 1px solid var(--primary);
        border-radius: 6px 6px 0 0;
        font-size: 0.8rem;
    }
    
    .day-details {
        text-align: center;
        padding: 1rem;
    }
    
    .day-details h3 {
        color: var(--primary);
        margin-bottom: 0.5rem;
        font-size: 1.3rem;
        font-weight: 700;
    }
    
    .day-details .date {
        color: var(--text-secondary);
        margin-bottom: 1.5rem;
        font-size: 0.95rem;
        font-weight: 500;
    }
    
    .work-status, .payment-status {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        padding: 0.75rem;
        border-radius: var(--border-radius);
        margin: 0.5rem 0;
        font-weight: 500;
    }
    
    .work-status.success, .payment-status.success {
        background: rgba(76, 175, 80, 0.1);
        color: var(--success);
    }
    
    .work-status.not-worked {
        background: rgba(158, 158, 158, 0.1);
        color: var(--text-muted);
    }
    
    .payment-status.pending {
        background: rgba(255, 152, 0, 0.1);
        color: var(--warning);
    }
    
    .earnings, .payment-details {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.5rem 0;
        border-bottom: 1px solid var(--border);
    }
    
    .earnings:last-child, .payment-details:last-child {
        border-bottom: none;
    }
    
    .earnings .amount {
        font-weight: 600;
        color: var(--primary);
    }
    
    .close-day-modal:hover {
        background: var(--primary-dark) !important;
        transform: translateY(-2px);
    }
`;
document.head.appendChild(calendarStyle);