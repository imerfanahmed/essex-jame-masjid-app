const prayerDisplayNames = {
    fajr: 'Fajr',
    sunrise: 'Sunrise',
    zuhr: 'Zuhr',
    asr: 'Asr',
    maghrib: 'Maghrib',
    isha: 'Isha'
};

function formatTime(timeString) {
    if (!timeString) return 'N/A';
    
    const timeParts = timeString.split(':');
    if (timeParts.length < 2) return timeString;
    
    const hours = parseInt(timeParts[0]);
    const minutes = timeParts[1];
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours);
    return `${displayHour}:${minutes} ${ampm}`;
}

function getCurrentTime() {
    const now = new Date();
    const hours24 = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const ampm = hours24 >= 12 ? 'PM' : 'AM';
    const hours12 = hours24 > 12 ? hours24 - 12 : (hours24 === 0 ? 12 : hours24);
    return `${hours12}:${minutes}:${seconds} ${ampm}`;
}

function updateCurrentTime() {
    $('#current-time').text(getCurrentTime());
}

function formatTimeRemaining(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
        return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
}

function renderPrayerTimes(data) {
    const today = data[0];
    const nextPrayer = today.next_prayer;

    let html = `
        <div class="receipt">
            <div class="header">
                <div class="logo-container">
                    <img src="./ejm.png" alt="Giamme Masjid Logo">
                </div>
                <div class="current-time" id="current-time">${getCurrentTime()}</div>
                <h1>Essex Jamme Masjid</h1>
                <h3>Prayer Times</h3>
                <div class="date-info">
                    <div class="date-row">
                        <span class="date-label">Date:</span>
                        <span>${new Date(today.d_date).toLocaleDateString('en-GB', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
                    </div>
                    <div class="date-row">
                        <span class="date-label">Hijri:</span>
                        <span>${today.hijri_date_convert || 'N/A'}</span>
                    </div>
                </div>
            </div>
    `;

    if (nextPrayer && nextPrayer.prayerName && nextPrayer.timeLeft) {
        html += `
            <div class="next-prayer">
                <h3>Next: ${prayerDisplayNames[nextPrayer.prayerName]}</h3>
                <div class="time">${formatTimeRemaining(nextPrayer.timeLeft)}</div>
            </div>
        `;
    }

    html += '<div class="prayer-times">';

    const prayers = ['fajr', 'sunrise', 'zuhr', 'asr', 'maghrib', 'isha'];
    prayers.forEach(prayer => {
        const isActive = nextPrayer && nextPrayer.prayerName === prayer;
        
        // Sunrise is a special case - only has one time, no jamah
        if (prayer === 'sunrise') {
            html += `
                <div class="prayer-row sunrise-row">
                    <div class="prayer-name">${prayerDisplayNames[prayer]}</div>
                    <div class="prayer-times-group">
                        <div class="time-item">
                            <div class="time-label">Time</div>
                            <div class="time-value">${formatTime(today.sunrise)}</div>
                        </div>
                    </div>
                </div>
            `;
            return;
        }
        
        const beginsKey = `${prayer}_begins`;
        const jamahKey = `${prayer}_jamah`;
        
        // Use asr_mithl_1 for Asr begins time if asr_begins is not available
        const beginsTime = prayer === 'asr' && !today[beginsKey] 
            ? today.asr_mithl_1 
            : today[beginsKey];
        
        html += `
            <div class="prayer-row ${isActive ? 'active' : ''}">
                <div class="prayer-name">${prayerDisplayNames[prayer]}</div>
                <div class="prayer-times-group">
                    <div class="time-item">
                        <div class="time-label">Begins</div>
                        <div class="time-value">${formatTime(beginsTime)}</div>
                    </div>
                    <div class="time-item">
                        <div class="time-label">Jamah</div>
                        <div class="time-value">${formatTime(today[jamahKey])}</div>
                    </div>
                </div>
            </div>
        `;
    });

    html += '</div>';

    if (today.tomorrow) {
        html += `
            <div class="tomorrow-section">
                <h2>Tomorrow</h2>
                <div class="tomorrow-prayers">
        `;

        prayers.forEach(prayer => {
            const jamahKey = `${prayer}_jamah`;
            html += `
                <div class="tomorrow-item">
                    <div class="tomorrow-prayer">${prayerDisplayNames[prayer]}</div>
                    <div class="tomorrow-time">${formatTime(today.tomorrow[jamahKey])}</div>
                </div>
            `;
        });

        html += '</div></div>';
    }

    html += '</div>';

    $('#content').html(html);
    $('#loading').hide();
    $('#content').fadeIn();
    
    // Update current time every second
    setInterval(updateCurrentTime, 1000);
}

// Fetch prayer times
$.ajax({
    url: 'https://essexmasjid.com/?rest_route=/dpt/v1/prayertime&filter=today',
    method: 'GET',
    success: function(data) {
        renderPrayerTimes(data);
        
        // Update countdown every minute
        setInterval(function() {
            location.reload();
        }, 60000);
    },
    error: function(xhr, status, error) {
        $('#loading').html('Error loading prayer times. Please refresh the page.');
        console.error('Error:', error);
    }
});
