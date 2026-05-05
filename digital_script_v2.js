const prayerDisplayNames = {
    fajr: 'FAJAR',
    sunrise: 'SUNRISE',
    zuhr: 'DHUHR',
    asr: 'ASR',
    maghrib: 'MAGHRIB',
    isha: 'ISHA'
};

let nextJamahTimeTarget = null;

function formatTime(timeString, includeAmPm = true) {
    if (!timeString) return '--:--';
    const timeParts = timeString.split(':');
    if (timeParts.length < 2) return timeString;
    
    const hours = parseInt(timeParts[0]);
    const minutes = timeParts[1];
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours);
    const paddedHour = String(displayHour).padStart(2, '0');
    
    if (includeAmPm) {
        return `${paddedHour}:${minutes} ${ampm}`;
    } else {
        return `${paddedHour}:${minutes}`;
    }
}

function updateCurrentTime() {
    const now = new Date();
    const hours24 = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    $('#v2-current-time').text(`${String(hours24).padStart(2, '0')}:${minutes}:${seconds}`);

    // Countdown logic
    if (nextJamahTimeTarget) {
        const diffMs = nextJamahTimeTarget - now;
        if (diffMs > 0) {
            const diffHours = String(Math.floor(diffMs / (1000 * 60 * 60))).padStart(2, '0');
            const diffMins = String(Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, '0');
            const diffSecs = String(Math.floor((diffMs % (1000 * 60)) / 1000)).padStart(2, '0');
            
            $('#v2-countdown').text(`${diffHours}:${diffMins}:${diffSecs}`);
        } else {
            $('#v2-countdown').text('00:00:00');
        }
    }
}

function renderPrayerTimes(data) {
    const today = data[0];
    const nextPrayer = today.next_prayer;

    // Dates
    const d = new Date(today.d_date);
    const months = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
    $('#v2-date').text(`${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]}`);
    $('#v2-hijri').text(today.hijri_date_convert ? today.hijri_date_convert.toUpperCase() : 'ISLAMIC DATE');

    // Sunrise & Ishraq (if ishraq is missing, hide or keep placeholder)
    $('#v2-sunrise').text(formatTime(today.sunrise));
    // Check if ishraq exists, if not use a calculated estimate or keep placeholder
    if(today.ishraq) {
        $('#v2-ishraq').text(formatTime(today.ishraq));
    } else {
        // approximate ishraq is 15-20 mins after sunrise, we will just display sunrise + 15m as placeholder if not available
        let sunParts = today.sunrise.split(':');
        let ishraqDate = new Date();
        ishraqDate.setHours(parseInt(sunParts[0]), parseInt(sunParts[1]) + 15, 0);
        $('#v2-ishraq').text(formatTime(`${ishraqDate.getHours()}:${ishraqDate.getMinutes()}`));
    }

    // Prayers
    const prayers = ['fajr', 'zuhr', 'asr', 'maghrib', 'isha'];
    
    $('.prayer-circle').removeClass('active');

    prayers.forEach(prayer => {
        const beginsKey = `${prayer}_begins`;
        const jamahKey = `${prayer}_jamah`;
        
        const beginsTime = prayer === 'asr' && !today[beginsKey] ? today.asr_mithl_1 : today[beginsKey];
        const jamahTime = today[jamahKey];

        // Format for Adhaan (begins) - e.g. "06:15 AM"
        $(`#v2-${prayer}-begins`).text(formatTime(beginsTime, true));
        
        // Format for Iqamah (jamah) - e.g. "06:30 AM" or we can split the AM/PM if we want to format it smaller, but for now we'll just put it.
        // Wait, the design has AM/PM small. Let's just output the full string and CSS can handle if needed, or we just rely on the layout.
        $(`#v2-${prayer}-jamah`).text(formatTime(jamahTime, true));
        
        if (nextPrayer && nextPrayer.prayerName === prayer) {
            $(`#circle-${prayer}`).addClass('active');
        }
    });

    // Set Countdown Target
    if (nextPrayer && nextPrayer.prayerName && nextPrayer.prayerName !== 'sunrise') {
        const jamahKey = `${nextPrayer.prayerName}_jamah`;
        const jamahTime = today[jamahKey];
        
        if (jamahTime) {
            const now = new Date();
            const jamahParts = jamahTime.split(':');
            let target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), parseInt(jamahParts[0]), parseInt(jamahParts[1]), 0);
            
            if (target < now && nextPrayer.prayerName === 'fajr' && now.getHours() > 12) {
                target.setDate(target.getDate() + 1);
            }
            
            nextJamahTimeTarget = target;
        } else {
            nextJamahTimeTarget = null;
        }
    } else {
        nextJamahTimeTarget = null;
        $('#v2-countdown').text('--:--:--');
    }
}

function fetchPrayerTimes() {
    $.ajax({
        url: 'https://essexmasjid.com/?rest_route=/dpt/v1/prayertime&filter=today',
        method: 'GET',
        success: function(data) {
            renderPrayerTimes(data);
        },
        error: function(err) {
            console.error('Error fetching prayer times:', err);
        }
    });
}

$(document).ready(function() {
    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);
    
    fetchPrayerTimes();
    setInterval(fetchPrayerTimes, 60000 * 30); // refresh data every 30 mins
});
