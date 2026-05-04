const prayerDisplayNames = {
    fajr: 'Fajr',
    sunrise: 'Sunrise',
    zuhr: 'Zuhr',
    asr: 'Asr',
    maghrib: 'Maghrib',
    isha: 'Isha'
};



let currentSlide = 0;
let nextJamahTimeTarget = null;

function formatTime(timeString) {
    if (!timeString) return '--:--';
    const timeParts = timeString.split(':');
    if (timeParts.length < 2) return timeString;
    
    const hours = parseInt(timeParts[0]);
    const minutes = timeParts[1];
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours);
    return `${displayHour}:${minutes} ${ampm}`;
}

function updateCurrentTime() {
    const now = new Date();
    const hours24 = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const ampm = hours24 >= 12 ? 'PM' : 'AM';
    const hours12 = hours24 > 12 ? hours24 - 12 : (hours24 === 0 ? 12 : hours24);
    
    $('#ds-time').text(`${hours12}:${minutes}:${seconds} ${ampm}`);

    // Next Jamah countdown logic
    if (nextJamahTimeTarget) {
        const diffMs = nextJamahTimeTarget - now;
        if (diffMs > 0) {
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            const diffSecs = Math.floor((diffMs % (1000 * 60)) / 1000);
            
            if (diffHours > 0) {
                $('#ds-next-countdown').text(`${diffHours}h ${diffMins}m`);
            } else {
                $('#ds-next-countdown').text(`${diffMins}m ${diffSecs}s`);
            }
        } else {
            $('#ds-next-countdown').text('Now');
        }
    }
}

function fetchRandomAyah() {
    $.ajax({
        url: 'https://api.alquran.cloud/v1/ayah/random/editions/quran-uthmani,en.asad',
        method: 'GET',
        success: function(response) {
            if (response && response.data && response.data.length === 2) {
                const ar = response.data[0];
                const en = response.data[1];
                
                const slider = $('#ds-hadith-slider');
                slider.fadeOut(500, function() {
                    slider.html(`
                        <div class="ds-slide active" style="position: relative;">
                            <div class="ds-quran-ar">${ar.text}</div>
                            <div class="ds-quran-en">"${en.text}"</div>
                            <div class="ds-hadith-ref">- Surah ${ar.surah.englishName} (${ar.surah.number}:${ar.numberInSurah})</div>
                        </div>
                    `);
                    slider.fadeIn(500);
                });
            }
        },
        error: function(err) {
            console.error('Error fetching ayah:', err);
        }
    });
}

function initSlideshow() {
    $('#ds-hadith-slider').html('<div class="ds-loading" style="font-size:1rem;">Loading daily inspiration...</div>');
    fetchRandomAyah();
    setInterval(fetchRandomAyah, 25000); // New verse every 25 seconds
}

function renderPrayerTimes(data) {
    const today = data[0];
    const nextPrayer = today.next_prayer;

    // Update Dates
    $('#ds-date').text(new Date(today.d_date).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
    $('#ds-hijri').text(today.hijri_date_convert || 'Islamic Date Loading...');

    // Render Prayer Board
    const prayers = ['fajr', 'sunrise', 'zuhr', 'asr', 'maghrib', 'isha'];
    let boardHtml = '';

    prayers.forEach(prayer => {
        const isActive = nextPrayer && nextPrayer.prayerName === prayer;
        
        let beginsTime = '--:--';
        let jamahTime = '--:--';

        if (prayer === 'sunrise') {
            beginsTime = formatTime(today.sunrise);
        } else {
            const beginsKey = `${prayer}_begins`;
            const jamahKey = `${prayer}_jamah`;
            beginsTime = formatTime(prayer === 'asr' && !today[beginsKey] ? today.asr_mithl_1 : today[beginsKey]);
            jamahTime = formatTime(today[jamahKey]);
        }

        boardHtml += `
            <div class="ds-prayer-row ${isActive ? 'active' : ''}">
                <div class="col-prayer">${prayerDisplayNames[prayer]}</div>
                <div class="col-begins">${beginsTime}</div>
                <div class="col-jamah">${prayer === 'sunrise' ? '-' : jamahTime}</div>
            </div>
        `;
    });

    $('#ds-prayer-times-list').html(boardHtml);

    // Render Tomorrow Stripe
    if (today.tomorrow) {
        let tomorrowHtml = '';
        prayers.forEach(prayer => {
            if (prayer !== 'sunrise') {
                const jamahKey = `${prayer}_jamah`;
                tomorrowHtml += `
                    <div class="ds-tom-item">
                        <div class="ds-tom-name">${prayerDisplayNames[prayer]}</div>
                        <div class="ds-tom-time">${formatTime(today.tomorrow[jamahKey])}</div>
                    </div>
                `;
            }
        });
        $('#ds-tomorrow-times').html(tomorrowHtml);
    }

    // Set Next Jamah Banner
    if (nextPrayer && nextPrayer.prayerName && nextPrayer.prayerName !== 'sunrise') {
        $('#ds-next-prayer-banner').show();
        $('#ds-next-name').text(prayerDisplayNames[nextPrayer.prayerName]);
        
        const jamahKey = `${nextPrayer.prayerName}_jamah`;
        const jamahTime = today[jamahKey];
        $('#ds-next-time').text(formatTime(jamahTime));
        
        if (jamahTime) {
            const now = new Date();
            const jamahParts = jamahTime.split(':');
            let target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), parseInt(jamahParts[0]), parseInt(jamahParts[1]), 0);
            
            // if target is strictly in the past, it could be for tomorrow
            if (target < now && nextPrayer.prayerName === 'fajr' && now.getHours() > 12) {
                target.setDate(target.getDate() + 1);
            }
            
            nextJamahTimeTarget = target;
        } else {
            nextJamahTimeTarget = null;
            $('#ds-next-countdown').text('--');
        }
    } else {
        $('#ds-next-prayer-banner').hide();
        nextJamahTimeTarget = null;
    }
}

// Fetch data
function fetchPrayerTimes() {
    $.ajax({
        url: 'https://essexmasjid.com/?rest_route=/dpt/v1/prayertime&filter=today',
        method: 'GET',
        success: function(data) {
            renderPrayerTimes(data);
        },
        error: function(xhr, status, error) {
            console.error('Error loading prayer times:', error);
            $('#ds-prayer-times-list').html('<div class="ds-loading">Error loading times. Retrying...</div>');
        }
    });
}

// Initialization
$(document).ready(function() {
    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);
    
    initSlideshow();
    
    fetchPrayerTimes();
    // Refresh prayer data every hour
    setInterval(fetchPrayerTimes, 60 * 60 * 1000);
    
    // Quick reload at midnight to refresh dates
    setInterval(() => {
        const now = new Date();
        if (now.getHours() === 0 && now.getMinutes() === 0 && now.getSeconds() === 0) {
            location.reload();
        }
    }, 1000);
});
