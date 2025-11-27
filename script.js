document.addEventListener('DOMContentLoaded', () => {
    const navItems = document.querySelectorAll('.nav-item');
    const contentSections = document.querySelectorAll('.content-section');
    const loadingSpinner = document.getElementById('loading-spinner');
    const apiErrorMessage = document.getElementById('api-error-message');
    const retryApiBtn = document.getElementById('retry-api-btn');
    
    let allQuranData = null; // Cache for Quran data for search
    let currentApiSource = 'alquran-cloud'; // Default API source
    let tajwidEnabled = false; // Track if tajwid coloring is enabled

    // Masjid Finder variables
    let map = null;
    let userMarker = null;
    let routingControl = null;
    let mosqueMarkers = [];
    let isMapInitialized = false;
    const findMosquesBtn = document.getElementById('find-mosques-btn');
    const mosqueListContainer = document.getElementById('mosque-list-container');
    const locationPermissionDiv = document.getElementById('location-permission');
    const requestLocationBtn = document.getElementById('request-location-btn');

    // Doa Harian variables
    const loadDoaBtn = document.getElementById('load-doa-btn');
    const doaCategory = document.getElementById('doa-category');
    const doaListContainer = document.getElementById('doa-list');

    const showLoading = () => loadingSpinner.classList.remove('hidden');
    const hideLoading = () => loadingSpinner.classList.add('hidden');
    const showApiError = () => apiErrorMessage.classList.remove('hidden');
    const hideApiError = () => apiErrorMessage.classList.add('hidden');

    // --- API Source Selection ---
    document.querySelectorAll('.api-source').forEach(btn => {
        btn.addEventListener('click', () => {
            // Update UI
            document.querySelectorAll('.api-source').forEach(b => {
                b.classList.remove('bg-amber-500', 'text-emerald-900');
                b.classList.add('bg-emerald-700', 'text-white');
            });
            btn.classList.remove('bg-emerald-700', 'text-white');
            btn.classList.add('bg-amber-500', 'text-emerald-900');
            
            // Update API source
            currentApiSource = btn.dataset.source;
            
            // Reload data
            fetchSurahList();
        });
    });

    retryApiBtn.addEventListener('click', () => {
        fetchSurahList();
    });

    // --- Navigation Logic ---
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetId = item.dataset.target;
            
            contentSections.forEach(section => {
                section.classList.add('hidden');
            });
            
            navItems.forEach(nav => nav.classList.remove('active'));

            const targetSection = document.getElementById(`${targetId}-section`);
            targetSection.classList.remove('hidden');
            item.classList.add('active');

            // Initialize map only when the section is shown for the first time
            if (targetId === 'masjid' && !isMapInitialized) {
                initMap();
                isMapInitialized = true;
                checkLocationPermission();
            }

            // Initialize hijaiyah when the section is shown
            if (targetId === 'hijaiyah' && !hijaiyahInitialized) {
                initializeHijaiyah();
                hijaiyahInitialized = true;
            }

            // Load data for new sections when they're opened
            if (targetId === 'doa' && !doaListContainer.children.length) {
                loadDoaCategories();
            }
        });
    });

    // --- Tajwid Coloring Functions ---
    function applyTajwidColoring(arabicText) {
        if (!tajwidEnabled) return arabicText;
        
        // This is a simplified tajwid coloring implementation
        // In a real application, you would use a more sophisticated algorithm or API
        let coloredText = arabicText;
        
        // Apply ghunnah coloring (ن and م with shaddah)
        coloredText = coloredText.replace(/(نّ|مّ)/g, '<span class="tajwid-ghunnah">$1</span>');
        
        // Apply qalqalah coloring (ق ط ب ج د)
        coloredText = coloredText.replace(/([قطبجد])/g, '<span class="tajwid-qalqalah">$1</span>');
        
        // Apply madd coloring (ا و ي with madd)
        coloredText = coloredText.replace(/([اوي])/g, '<span class="tajwid-madd">$1</span>');
        
        // Apply ikhfa coloring (ن with letters other than م و ي ن ر ل)
        coloredText = coloredText.replace(/ن([ثذرزسشصضطظفخحعغقك])/g, 'ن<span class="tajwid-ikhfa">$1</span>');
        
        // Apply idgham coloring (ن with م و ي ن ر ل)
        coloredText = coloredText.replace(/ن([مونرل])/g, 'ن<span class="tajwid-idgham">$1</span>');
        
        // Apply iqlab coloring (ن with ب)
        coloredText = coloredText.replace(/ن(ب)/g, 'ن<span class="tajwid-iqlab">$1</span>');
        
        // Apply hamzah coloring
        coloredText = coloredText.replace(/(أ|إ|ؤ|ئ)/g, '<span class="tajwid-hamzah">$1</span>');
        
        return coloredText;
    }

    function createTajwidControls() {
        return `
            <div class="tajwid-container">
                <button class="tajwid-toggle" id="tajwid-toggle-btn">
                    ${tajwidEnabled ? 'Sembunyikan' : 'Tampilkan'} Tajwid Berwarna
                </button>
                <div class="tajwid-legend" id="tajwid-legend" style="${tajwidEnabled ? '' : 'display: none;'}">
                    <div class="tajwid-legend-item">
                        <div class="tajwid-legend-color tajwid-ghunnah"></div>
                        <span>Ghunnah</span>
                    </div>
                    <div class="tajwid-legend-item">
                        <div class="tajwid-legend-color tajwid-qalqalah"></div>
                        <span>Qalqalah</span>
                    </div>
                    <div class="tajwid-legend-item">
                        <div class="tajwid-legend-color tajwid-madd"></div>
                        <span>Madd</span>
                    </div>
                    <div class="tajwid-legend-item">
                        <div class="tajwid-legend-color tajwid-ikhfa"></div>
                        <span>Ikhfa</span>
                    </div>
                    <div class="tajwid-legend-item">
                        <div class="tajwid-legend-color tajwid-idgham"></div>
                        <span>Idgham</span>
                    </div>
                    <div class="tajwid-legend-item">
                        <div class="tajwid-legend-color tajwid-iqlab"></div>
                        <span>Iqlab</span>
                    </div>
                    <div class="tajwid-legend-item">
                        <div class="tajwid-legend-color tajwid-hamzah"></div>
                        <span>Hamzah</span>
                    </div>
                </div>
            </div>
        `;
    }

    // --- Al-Quran Logic dengan multiple API ---
    const surahListView = document.getElementById('surah-list-view');
    const surahDetailView = document.getElementById('surah-detail-view');
    const surahListContainer = document.getElementById('surah-list');
    const surahDetailContainer = document.getElementById('surah-detail-content');
    const backToSurahListBtn = document.getElementById('back-to-surah-list');
    const tafsirModal = document.getElementById('tafsir-modal');
    const closeTafsirModalBtn = document.getElementById('close-tafsir-modal');

    async function fetchSurahList() {
        showLoading();
        hideApiError();
        surahListContainer.innerHTML = '<p class="text-center text-gray-400">Memuat data...</p>';
        
        try {
            let response;
            let data;
            
            if (currentApiSource === 'alquran-cloud') {
                // Try primary API first
                try {
                    response = await fetch('https://alquran.cloud/api/surah');
                    if (!response.ok) throw new Error('Network response was not ok');
                    data = await response.json();
                    allQuranData = data.data;
                    renderSurahList(data.data);
                } catch (error) {
                    console.error('Primary API failed:', error);
                    // Try fallback API
                    response = await fetch('https://api.alquran.cloud/v1/surah');
                    if (!response.ok) throw new Error('Fallback API also failed');
                    data = await response.json();
                    allQuranData = data.data;
                    renderSurahList(data.data);
                }
            } else {
                // Use Santrikoding API
                response = await fetch('https://quran-api.santrikoding.com/api/surah');
                if (!response.ok) throw new Error('Network response was not ok');
                data = await response.json();
                allQuranData = data;
                renderSurahList(data);
            }
        } catch (error) {
            console.error('All APIs failed:', error);
            surahListContainer.innerHTML = `<p class="text-red-400">Gagal memuat daftar surah: ${error.message}</p>`;
            showApiError();
        } finally {
            hideLoading();
        }
    }

    function renderSurahList(surahs) {
        surahListContainer.innerHTML = '';
        
        if (!surahs || surahs.length === 0) {
            surahListContainer.innerHTML = '<p class="text-center text-gray-400">Tidak ada data surah yang tersedia.</p>';
            return;
        }
        
        surahs.forEach(surah => {
            const card = document.createElement('div');
            card.className = 'bg-emerald-800 bg-opacity-50 p-4 rounded-lg cursor-pointer hover:bg-emerald-700 transition-all duration-300 transform hover:-translate-y-1';
            
            // Handle different data structures from different APIs
            const number = surah.number || surah.nomor;
            const name = surah.name || surah.nama;
            const englishName = surah.englishName || surah.nama_latin;
            const englishNameTranslation = surah.englishNameTranslation || surah.arti;
            const numberOfAyahs = surah.numberOfAyahs || surah.jumlah_ayat;
            
            card.innerHTML = `
                <div class="flex justify-between items-center">
                    <div class="flex items-center">
                        <span class="bg-amber-500 text-emerald-900 w-8 h-8 flex items-center justify-center rounded-full font-bold mr-4">${number}</span>
                        <div>
                            <h3 class="font-bold text-lg text-amber-300">${englishName}</h3>
                            <p class="text-sm text-gray-300">${englishNameTranslation}</p>
                        </div>
                    </div>
                    <div class="text-right">
                        <p class="font-amiri text-2xl text-amber-200">${name}</p>
                        <p class="text-xs text-gray-400">${numberOfAyahs} ayat</p>
                    </div>
                </div>
            `;
            card.addEventListener('click', () => fetchSurahDetail(number));
            surahListContainer.appendChild(card);
        });
    }

    async function fetchSurahDetail(surahNumber) {
        showLoading();
        try {
            let response, data, arabicData;
            
            if (currentApiSource === 'alquran-cloud') {
                // Try primary API first
                try {
                    response = await fetch(`https://alquran.cloud/api/surah/${surahNumber}/id.indonesian`);
                    if (!response.ok) throw new Error('Network response was not ok');
                    data = await response.json();
                    
                    // Also get Arabic text
                    const arabicResponse = await fetch(`https://alquran.cloud/api/surah/${surahNumber}`);
                    arabicData = await arabicResponse.json();
                    
                    renderSurahDetail(data.data, arabicData.data);
                } catch (error) {
                    console.error('Primary API failed:', error);
                    // Try fallback API
                    response = await fetch(`https://api.alquran.cloud/v1/surah/${surahNumber}/id.indonesian`);
                    if (!response.ok) throw new Error('Fallback API also failed');
                    data = await response.json();
                    
                    // Also get Arabic text
                    const arabicResponse = await fetch(`https://api.alquran.cloud/v1/surah/${surahNumber}`);
                    arabicData = await arabicResponse.json();
                    
                    renderSurahDetail(data.data, arabicData.data);
                }
            } else {
                // Use Santrikoding API
                response = await fetch(`https://quran-api.santrikoding.com/api/surah/${surahNumber}`);
                if (!response.ok) throw new Error('Network response was not ok');
                data = await response.json();
                
                renderSurahDetail(data, null);
            }
            
            surahListView.classList.add('hidden');
            surahDetailView.classList.remove('hidden');
            window.scrollTo(0, 0);
        } catch (error) {
            surahDetailContainer.innerHTML = `<p class="text-red-400">Gagal memuat detail surah: ${error.message}</p>`;
        } finally {
            hideLoading();
        }
    }

    function renderSurahDetail(surah, arabicSurah) {
        let ayahsHtml;
        
        if (currentApiSource === 'alquran-cloud') {
            // Render using alquran.cloud data structure
            ayahsHtml = surah.ayahs.map((ayat, index) => {
                const arabicAyah = arabicSurah.ayahs[index];
                const coloredArabicText = applyTajwidColoring(arabicAyah.text);
                
                return `
                    <div class="border-b-2 border-amber-500 border-opacity-30 py-6">
                        <div class="flex justify-between items-center mb-4">
                            <span class="bg-amber-500 text-emerald-900 font-bold px-3 py-1 rounded-md">${surah.number}:${ayat.numberInSurah}</span>
                            <button class="tafsir-btn px-3 py-1 bg-emerald-600 hover:bg-emerald-500 rounded-md text-sm" data-surah="${surah.number}" data-ayat="${ayat.numberInSurah}">Tafsir</button>
                        </div>
                        <p class="font-amiri text-3xl text-right leading-loose text-amber-100 mb-4">${coloredArabicText}</p>
                        <p class="text-gray-300 leading-relaxed">${ayat.text}</p>
                        <div class="audio-player">
                            <button class="play-button" data-surah="${surah.number}" data-ayah="${ayat.numberInSurah}">▶</button>
                            <span class="ml-2 text-sm">Putar Audio</span>
                        </div>
                    </div>
                `;
            }).join('');
            
            surahDetailContainer.innerHTML = `
                <div class="mb-6">
                    <h2 class="text-2xl font-bold text-amber-400 mb-2">${surah.englishName}</h2>
                    <p class="font-amiri text-3xl text-amber-200 mb-2">${surah.name}</p>
                    <p class="text-gray-300 mb-4">${surah.englishNameTranslation} (${surah.numberOfAyahs} ayat)</p>
                    ${createTajwidControls()}
                </div>
                <div class="space-y-4">
                    ${ayahsHtml}
                </div>
            `;
        } else {
            // Render using Santrikoding API data structure
            ayahsHtml = surah.ayat.map(ayat => {
                const coloredArabicText = applyTajwidColoring(ayat.ar);
                
                return `
                    <div class="border-b-2 border-amber-500 border-opacity-30 py-6">
                        <div class="flex justify-between items-center mb-4">
                            <span class="bg-amber-500 text-emerald-900 font-bold px-3 py-1 rounded-md">${surah.nomor}:${ayat.nomor}</span>
                            <button class="tafsir-btn px-3 py-1 bg-emerald-600 hover:bg-emerald-500 rounded-md text-sm" data-surah="${surah.nomor}" data-ayat="${ayat.nomor}">Tafsir</button>
                        </div>
                        <p class="font-amiri text-3xl text-right leading-loose text-amber-100 mb-4">${coloredArabicText}</p>
                        <p class="text-gray-300 leading-relaxed">${ayat.idn}</p>
                        <div class="audio-player">
                            <button class="play-button" data-surah="${surah.nomor}" data-ayah="${ayat.nomor}">▶</button>
                            <span class="ml-2 text-sm">Putar Audio</span>
                        </div>
                    </div>
                `;
            }).join('');
            
            surahDetailContainer.innerHTML = `
                <div class="mb-6">
                    <h2 class="text-2xl font-bold text-amber-400 mb-2">${surah.nama_latin}</h2>
                    <p class="font-amiri text-3xl text-amber-200 mb-2">${surah.nama}</p>
                    <p class="text-gray-300 mb-4">${surah.arti} (${surah.jumlah_ayat} ayat)</p>
                    ${createTajwidControls()}
                </div>
                <div class="space-y-4">
                    ${ayahsHtml}
                </div>
            `;
        }
        
        // Add event listeners for tafsir buttons
        document.querySelectorAll('.tafsir-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const surahNumber = btn.dataset.surah;
                const ayatNumber = btn.dataset.ayat;
                fetchTafsir(surahNumber, ayatNumber);
            });
        });
        
        // Add event listeners for audio buttons
        document.querySelectorAll('.play-button').forEach(btn => {
            btn.addEventListener('click', () => {
                const surahNumber = btn.dataset.surah;
                const ayatNumber = btn.dataset.ayah;
                playAudio(surahNumber, ayatNumber);
            });
        });
        
        // Add event listener for tajwid toggle
        const tajwidToggleBtn = document.getElementById('tajwid-toggle-btn');
        if (tajwidToggleBtn) {
            tajwidToggleBtn.addEventListener('click', () => {
                tajwidEnabled = !tajwidEnabled;
                fetchSurahDetail(surah.number || surah.nomor);
            });
        }
    }

    async function fetchTafsir(surahNumber, ayatNumber) {
        showLoading();
        try {
            const response = await fetch(`https://api.quran.com/api/v4/quran/verses/by_key/${surahNumber}:${ayatNumber}?language=id`);
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();
            
            const tafsirResponse = await fetch(`https://api.quran.com/api/v4/quran/tafsirs/${surahNumber}:${ayatNumber}?language=id`);
            let tafsirData = null;
            
            if (tafsirResponse.ok) {
                tafsirData = await tafsirResponse.json();
            }
            
            showTafsirModal(surahNumber, ayatNumber, data.verse, tafsirData?.tafsirs?.[0]?.text || "Tafsir tidak tersedia untuk ayat ini.");
        } catch (error) {
            console.error('Error fetching tafsir:', error);
            showTafsirModal(surahNumber, ayatNumber, null, "Gagal memuat tafsir. Silakan coba lagi.");
        } finally {
            hideLoading();
        }
    }

    function showTafsirModal(surahNumber, ayatNumber, verse, tafsirText) {
        const modalTitle = document.getElementById('tafsir-modal-title');
        const modalContent = document.getElementById('tafsir-modal-content');
        
        modalTitle.textContent = `Tafsir QS ${surahNumber}:${ayatNumber}`;
        
        if (verse) {
            modalContent.innerHTML = `
                <div class="mb-4">
                    <p class="font-amiri text-2xl text-right text-amber-100 mb-2">${verse.text_uthmani}</p>
                    <p class="text-gray-300">${verse.translation}</p>
                </div>
                <div class="border-t border-emerald-700 pt-4">
                    <h3 class="text-lg font-semibold text-amber-300 mb-2">Tafsir:</h3>
                    <p class="text-gray-200 leading-relaxed">${tafsirText}</p>
                </div>
            `;
        } else {
            modalContent.innerHTML = `
                <div class="border-t border-emerald-700 pt-4">
                    <h3 class="text-lg font-semibold text-amber-300 mb-2">Tafsir:</h3>
                    <p class="text-gray-200 leading-relaxed">${tafsirText}</p>
                </div>
            `;
        }
        
        tafsirModal.classList.remove('hidden');
    }

    function playAudio(surahNumber, ayatNumber) {
        // Create audio element and play
        const audio = new Audio(`https://cdn.islamic.network/quran/audio/128/ar.alafasy/${surahNumber}${ayatNumber}.mp3`);
        audio.play().catch(error => {
            console.error('Error playing audio:', error);
            alert('Gagal memutar audio. Silakan coba lagi.');
        });
    }

    backToSurahListBtn.addEventListener('click', () => {
        surahListView.classList.remove('hidden');
        surahDetailView.classList.add('hidden');
    });

    closeTafsirModalBtn.addEventListener('click', () => {
        tafsirModal.classList.add('hidden');
    });

    // --- Hadits Logic ---
    const haditsPerawi = document.getElementById('hadits-perawi');
    const haditsStart = document.getElementById('hadits-start');
    const searchHaditsBtn = document.getElementById('search-hadits-btn');
    const haditsResult = document.getElementById('hadits-result');

    searchHaditsBtn.addEventListener('click', () => {
        const perawi = haditsPerawi.value;
        const start = haditsStart.value || 1;
        
        if (!perawi) {
            haditsResult.innerHTML = '<p class="text-red-400">Silakan pilih perawi hadits.</p>';
            return;
        }
        
        fetchHadits(perawi, start);
    });

    async function fetchHadits(perawi, start) {
        showLoading();
        haditsResult.innerHTML = '<p class="text-center text-gray-400">Memuat data...</p>';
        
        try {
            const response = await fetch(`https://hadis-api-id.vercel.app/hadith/${perawi}?page=${start}&limit=10`);
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();
            
            if (!data.items || data.items.length === 0) {
                haditsResult.innerHTML = '<p class="text-center text-gray-400">Tidak ada hadits ditemukan.</p>';
                return;
            }
            
            renderHadits(data.items, perawi);
        } catch (error) {
            console.error('Error fetching hadits:', error);
            haditsResult.innerHTML = `<p class="text-red-400">Gagal memuat hadits: ${error.message}</p>`;
        } finally {
            hideLoading();
        }
    }

    function renderHadits(hadits, perawi) {
        haditsResult.innerHTML = '';
        
        hadits.forEach(hadits => {
            const card = document.createElement('div');
            card.className = 'bg-emerald-800 bg-opacity-50 p-4 rounded-lg';
            
            card.innerHTML = `
                <div class="flex justify-between items-center mb-2">
                    <h3 class="font-bold text-lg text-amber-300">Hadits ${perawi} No. ${hadits.number}</h3>
                </div>
                <p class="font-amiri text-xl text-right leading-loose text-amber-100 mb-3">${hadits.arab}</p>
                <p class="text-gray-300 leading-relaxed">${hadits.id}</p>
            `;
            
            haditsResult.appendChild(card);
        });
    }

    // --- Jadwal Sholat Logic ---
    const sholatCity = document.getElementById('sholat-city');
    const searchSholatBtn = document.getElementById('search-sholat-btn');
    const sholatResult = document.getElementById('sholat-result');

    searchSholatBtn.addEventListener('click', () => {
        const city = sholatCity.value.trim();
        
        if (!city) {
            sholatResult.innerHTML = '<p class="text-red-400">Silakan masukkan nama kota.</p>';
            return;
        }
        
        fetchSholatSchedule(city);
    });

    async function fetchSholatSchedule(city) {
        showLoading();
        sholatResult.innerHTML = '<p class="text-center text-gray-400">Memuat jadwal sholat...</p>';
        
        try {
            // Get today's date
            const today = new Date();
            const year = today.getFullYear();
            const month = today.getMonth() + 1; // JavaScript months are 0-indexed
            const date = today.getDate();
            
            // Format date as YYYY-MM-DD
            const formattedDate = `${year}-${month.toString().padStart(2, '0')}-${date.toString().padStart(2, '0')}`;
            
            // Try to get city coordinates first
            const geoResponse = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)}`);
            if (!geoResponse.ok) throw new Error('Failed to get city coordinates');
            const geoData = await geoResponse.json();
            
            if (geoData.length === 0) {
                sholatResult.innerHTML = '<p class="text-red-400">Kota tidak ditemukan. Silakan coba dengan nama kota lain.</p>';
                return;
            }
            
            const { lat, lon } = geoData[0];
            
            // Get prayer times using coordinates
            const response = await fetch(`https://api.aladhan.com/v1/timings/${formattedDate}?latitude=${lat}&longitude=${lon}&method=4`);
            if (!response.ok) throw new Error('Failed to get prayer times');
            const data = await response.json();
            
            renderSholatSchedule(data.data, city);
        } catch (error) {
            console.error('Error fetching prayer times:', error);
            sholatResult.innerHTML = `<p class="text-red-400">Gagal memuat jadwal sholat: ${error.message}</p>`;
        } finally {
            hideLoading();
        }
    }

    function renderSholatSchedule(data, city) {
        const timings = data.timings;
        const date = data.date;
        
        sholatResult.innerHTML = `
            <div class="bg-emerald-800 bg-opacity-50 p-4 rounded-lg">
                <h3 class="text-xl font-bold text-amber-300 mb-4">Jadwal Sholat untuk ${city}</h3>
                <p class="text-gray-300 mb-4">${date.readable} ${date.hijri.day} ${date.hijri.month.en} ${date.hijri.year} H</p>
                <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div class="bg-emerald-700 p-3 rounded-lg text-center">
                        <p class="text-gray-300 text-sm">Subuh</p>
                        <p class="text-xl font-bold text-amber-300">${timings.Fajr}</p>
                    </div>
                    <div class="bg-emerald-700 p-3 rounded-lg text-center">
                        <p class="text-gray-300 text-sm">Dzuhur</p>
                        <p class="text-xl font-bold text-amber-300">${timings.Dhuhr}</p>
                    </div>
                    <div class="bg-emerald-700 p-3 rounded-lg text-center">
                        <p class="text-gray-300 text-sm">Ashar</p>
                        <p class="text-xl font-bold text-amber-300">${timings.Asr}</p>
                    </div>
                    <div class="bg-emerald-700 p-3 rounded-lg text-center">
                        <p class="text-gray-300 text-sm">Maghrib</p>
                        <p class="text-xl font-bold text-amber-300">${timings.Maghrib}</p>
                    </div>
                    <div class="bg-emerald-700 p-3 rounded-lg text-center">
                        <p class="text-gray-300 text-sm">Isya</p>
                        <p class="text-xl font-bold text-amber-300">${timings.Isha}</p>
                    </div>
                    <div class="bg-emerald-700 p-3 rounded-lg text-center">
                        <p class="text-gray-300 text-sm">Imsak</p>
                        <p class="text-xl font-bold text-amber-300">${timings.Imsak}</p>
                    </div>
                </div>
            </div>
        `;
    }

    // --- Arah Kiblat Logic ---
    const startQiblaBtn = document.getElementById('start-qibla-btn');
    const compassNeedle = document.getElementById('compass-needle');
    const qiblaInfo = document.getElementById('qibla-info');
    const qiblaInstruction = document.getElementById('qibla-instruction');

    startQiblaBtn.addEventListener('click', () => {
        if (window.DeviceOrientationEvent) {
            // Request permission for iOS 13+
            if (typeof DeviceOrientationEvent.requestPermission === 'function') {
                DeviceOrientationEvent.requestPermission()
                    .then(response => {
                        if (response === 'granted') {
                            startCompass();
                        } else {
                            qiblaInfo.textContent = 'Izin akses sensor ditolak. Tidak dapat menentukan arah kiblat.';
                        }
                    })
                    .catch(error => {
                        console.error('Error requesting device orientation permission:', error);
                        qiblaInfo.textContent = 'Terjadi kesalahan saat meminta izin akses sensor.';
                    });
            } else {
                // Non-iOS 13+ devices
                startCompass();
            }
        } else {
            qiblaInfo.textContent = 'Perangkat Anda tidak mendukung sensor orientasi. Tidak dapat menentukan arah kiblat.';
        }
    });

    function startCompass() {
        qiblaInstruction.textContent = 'Mendeteksi arah kiblat...';
        startQiblaBtn.textContent = 'Mendeteksi...';
        startQiblaBtn.disabled = true;
        
        // Get user's current position
        navigator.geolocation.getCurrentPosition(
            position => {
                const { latitude, longitude } = position.coords;
                
                // Calculate Qibla direction
                const qiblaDirection = calculateQiblaDirection(latitude, longitude);
                
                // Start watching device orientation
                window.addEventListener('deviceorientation', handleOrientation);
                
                qiblaInstruction.textContent = 'Arahkan bagian atas ponsel Anda ke arah panah.';
                qiblaInfo.textContent = `Arah Kiblat: ${qiblaDirection.toFixed(1)}°`;
            },
            error => {
                console.error('Error getting location:', error);
                qiblaInfo.textContent = 'Gagal mendapatkan lokasi. Pastikan GPS aktif dan berikan izin lokasi.';
                startQiblaBtn.textContent = 'Mulai Deteksi Kiblat';
                startQiblaBtn.disabled = false;
            }
        );
    }

    function handleOrientation(event) {
        const alpha = event.alpha; // Compass direction (0-360)
        
        if (alpha !== null) {
            // Get user's current position
            navigator.geolocation.getCurrentPosition(
                position => {
                    const { latitude, longitude } = position.coords;
                    
                    // Calculate Qibla direction
                    const qiblaDirection = calculateQiblaDirection(latitude, longitude);
                    
                    // Calculate the difference between current direction and Qibla
                    const difference = qiblaDirection - alpha;
                    
                    // Rotate the compass needle
                    compassNeedle.style.transform = `rotate(${difference}deg)`;
                },
                error => {
                    console.error('Error getting location:', error);
                }
            );
        }
    }

    function calculateQiblaDirection(latitude, longitude) {
        // Kaaba coordinates
        const kaabaLatitude = 21.4225;
        const kaabaLongitude = 39.8262;
        
        // Convert to radians
        const lat1 = latitude * (Math.PI / 180);
        const lat2 = kaabaLatitude * (Math.PI / 180);
        const longDiff = (kaabaLongitude - longitude) * (Math.PI / 180);
        
        // Calculate Qibla direction
        const y = Math.sin(longDiff);
        const x = Math.cos(lat1) * Math.tan(lat2) - Math.sin(lat1) * Math.cos(longDiff);
        
        let direction = Math.atan2(y, x) * (180 / Math.PI);
        
        // Normalize to 0-360
        direction = (direction + 360) % 360;
        
        return direction;
    }

    // --- Masjid Finder Logic ---
    function initMap() {
        // Initialize the map
        map = L.map('map').setView([-6.2088, 106.8456], 13); // Default to Jakarta
        
        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);
    }

    function checkLocationPermission() {
        if (navigator.geolocation) {
            navigator.permissions.query({ name: 'geolocation' })
                .then(result => {
                    if (result.state === 'granted') {
                        locationPermissionDiv.classList.add('hidden');
                    } else if (result.state === 'prompt') {
                        locationPermissionDiv.classList.remove('hidden');
                    } else if (result.state === 'denied') {
                        locationPermissionDiv.classList.remove('hidden');
                        locationPermissionDiv.innerHTML = `
                            <p class="text-amber-300">Izin lokasi ditolak. Aplikasi membutuhkan izin lokasi untuk menemukan masjid terdekat. Silakan ubah pengaturan izin lokasi pada browser Anda.</p>
                        `;
                    }
                })
                .catch(error => {
                    console.error('Error checking location permission:', error);
                    locationPermissionDiv.classList.remove('hidden');
                });
        } else {
            locationPermissionDiv.classList.remove('hidden');
            locationPermissionDiv.innerHTML = `
                <p class="text-amber-300">Browser Anda tidak mendukung geolokasi. Aplikasi tidak dapat menemukan masjid terdekat.</p>
            `;
        }
    }

    requestLocationBtn.addEventListener('click', () => {
        navigator.geolocation.getCurrentPosition(
            position => {
                locationPermissionDiv.classList.add('hidden');
            },
            error => {
                console.error('Error getting location:', error);
                locationPermissionDiv.innerHTML = `
                    <p class="text-amber-300">Gagal mendapatkan izin lokasi. Aplikasi membutuhkan izin lokasi untuk menemukan masjid terdekat.</p>
                    <button class="permission-button" id="request-location-btn">Coba Lagi</button>
                `;
                
                // Re-attach event listener
                document.getElementById('request-location-btn').addEventListener('click', () => {
                    location.reload();
                });
            }
        );
    });

    findMosquesBtn.addEventListener('click', findNearbyMosques);

    async function findNearbyMosques() {
        showLoading();
        
        try {
            // Mendapatkan posisi pengguna
            const position = await getCurrentPosition();
            const { latitude, longitude } = position.coords;
            
            // Inisialisasi peta jika belum ada
            if (!map) {
                initMap();
            }
            
            // Set posisi pengguna di peta
            if (userMarker) {
                map.removeLayer(userMarker);
            }
            
            userMarker = L.marker([latitude, longitude], {
                icon: L.divIcon({
                    className: 'user-marker',
                    html: '<div class="bg-blue-500 w-4 h-4 rounded-full border-2 border-white"></div>',
                    iconSize: [16, 16]
                })
            }).addTo(map);
            
            map.setView([latitude, longitude], 15);
            
            // Hapus marker masjid lama
            mosqueMarkers.forEach(marker => map.removeLayer(marker));
            mosqueMarkers = [];
            
            // Hapus rute lama
            if (routingControl) {
                map.removeControl(routingControl);
            }
            
            // Get search parameters
            const radiusSelect = document.getElementById('search-radius');
            const maxResultsSelect = document.getElementById('max-results');
            const radius = parseInt(radiusSelect.value); // in meters
            const maxResults = parseInt(maxResultsSelect.value);
            
            // Menggunakan Overpass API untuk mencari masjid dalam radius yang dipilih
            const overpassQuery = `
                [out:json][timeout:25];
                (
                    node["amenity"="place_of_worship"]"religion"="muslim";
                    way["amenity"="place_of_worship"]"religion"="muslim";
                    relation["amenity"="place_of_worship"]"religion"="muslim";
                );
                out geom;
            `;
            
            const response = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`);
            const data = await response.json();
            
            // Mengurutkan berdasarkan jarak dan mengambil masjid terdekat sesuai dengan maxResults
            const mosques = data.elements
                .filter(element => element.tags && element.tags.name)
                .map(element => {
                    let lat, lng;
                    
                    if (element.type === 'node') {
                        lat = element.lat;
                        lng = element.lon;
                    } else if (element.type === 'way') {
                        // Untuk way, gunakan pusat dari geometri
                        const coords = element.geometry || [];
                        if (coords.length > 0) {
                            lat = coords.reduce((sum, coord) => sum + coord.lat, 0) / coords.length;
                            lng = coords.reduce((sum, coord) => sum + coord.lon, 0) / coords.length;
                        }
                    } else if (element.type === 'relation') {
                        // Untuk relation, gunakan pusat dari member
                        const members = element.members || [];
                        if (members.length > 0) {
                            lat = members.reduce((sum, member) => sum + (member.lat || 0), 0) / members.length;
                            lng = members.reduce((sum, member) => sum + (member.lon || 0), 0) / members.length;
                        }
                    }
                    
                    // Hitung jarak
                    const distance = calculateDistance(latitude, longitude, lat, lng);
                    
                    return {
                        id: element.id,
                        name: element.tags.name,
                        address: element.tags["addr:street"] || "Alamat tidak tersedia",
                        lat: lat,
                        lng: lng,
                        distance: distance
                    };
                })
                .filter(mosque => mosque.lat && mosque.lng) // Hanya masjid dengan koordinat valid
                .sort((a, b) => a.distance - b.distance) // Urutkan berdasarkan jarak
                .slice(0, maxResults); // Ambil masjid terdekat sesuai dengan maxResults
            
            // Tambahkan marker untuk setiap masjid
            mosques.forEach(mosque => {
                const marker = L.marker([mosque.lat, mosque.lng], {
                    icon: L.divIcon({
                        className: 'mosque-marker',
                        html: '<div class="bg-amber-500 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center"><span class="text-white text-xs">🕌</span></div>',
                        iconSize: [24, 24]
                    })
                }).addTo(map);
                
                marker.bindPopup(`<b>${mosque.name}</b><br>${mosque.address}<br>Jarak: ${mosque.distance.toFixed(2)} km`);
                
                marker.on('click', () => {
                    // Update UI untuk menandai masjid yang dipilih
                    document.querySelectorAll('.mosque-item').forEach(item => {
                        item.classList.remove('active');
                    });
                    
                    const listItem = document.getElementById(`mosque-${mosque.id}`);
                    if (listItem) {
                        listItem.classList.add('active');
                        listItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }
                    
                    // Buat rute dari lokasi pengguna ke masjid
                    if (routingControl) {
                        map.removeControl(routingControl);
                    }
                    
                    routingControl = L.Routing.control({
                        waypoints: [
                            L.latLng(latitude, longitude),
                            L.latLng(mosque.lat, mosque.lng)
                        ],
                        routeWhileDragging: true,
                        addWaypoints: false,
                        createMarker: function() { return null; }, // Gunakan marker yang sudah ada
                        lineOptions: {
                            styles: [{ color: '#f59e0b', weight: 4, opacity: 0.7 }]
                        }
                    }).addTo(map);
                });
                
                mosqueMarkers.push(marker);
            });
            
            // Tampilkan daftar masjid
            renderMosqueList(mosques);
            
            // Jika tidak ada masjid ditemukan
            if (mosques.length === 0) {
                mosqueListContainer.innerHTML = `<p class="text-center text-gray-400">Tidak ada masjid ditemukan dalam radius ${radius/1000} km. Coba cari dengan radius yang lebih besar.</p>`;
            }
            
        } catch (error) {
            console.error('Error finding mosques:', error);
            mosqueListContainer.innerHTML = `<p class="text-red-400">Gagal menemukan masjid: ${error.message}</p>`;
        } finally {
            hideLoading();
        }
    }

    function getCurrentPosition() {
        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject);
        });
    }

    // Fungsi untuk menghitung jarak antara dua koordinat (dalam km)
    function calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Radius bumi dalam km
        const dLat = deg2rad(lat2 - lat1);
        const dLon = deg2rad(lon2 - lon1);
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c; // Jarak dalam km
        return distance;
    }

    function deg2rad(deg) {
        return deg * (Math.PI/180);
    }

    // Fungsi untuk menampilkan daftar masjid
    function renderMosqueList(mosques) {
        mosqueListContainer.innerHTML = '';
        
        mosques.forEach(mosque => {
            const mosqueItem = document.createElement('div');
            mosqueItem.className = 'mosque-item';
            mosqueItem.id = `mosque-${mosque.id}`;
            
            mosqueItem.innerHTML = `
                <div class="mosque-name">${mosque.name}</div>
                <div class="mosque-address">${mosque.address}</div>
                <div class="mosque-distance">Jarak: ${mosque.distance.toFixed(2)} km</div>
            `;
            
            mosqueItem.addEventListener('click', () => {
                // Buka popup marker dan buat rute
                const marker = mosqueMarkers.find(m => {
                    const position = m.getLatLng();
                    return Math.abs(position.lat - mosque.lat) < 0.0001 && Math.abs(position.lng - mosque.lng) < 0.0001;
                });
                
                if (marker) {
                    marker.openPopup();
                    
                    // Update UI
                    document.querySelectorAll('.mosque-item').forEach(item => {
                        item.classList.remove('active');
                    });
                    mosqueItem.classList.add('active');
                    
                    // Buat rute
                    if (userMarker && routingControl) {
                        map.removeControl(routingControl);
                    }
                    
                    if (userMarker) {
                        const userPosition = userMarker.getLatLng();
                        routingControl = L.Routing.control({
                            waypoints: [
                                L.latLng(userPosition.lat, userPosition.lng),
                                L.latLng(mosque.lat, mosque.lng)
                            ],
                            routeWhileDragging: true,
                            addWaypoints: false,
                            createMarker: function() { return null; },
                            lineOptions: {
                                styles: [{ color: '#f59e0b', weight: 4, opacity: 0.7 }]
                            }
                        }).addTo(map);
                    }
                }
            });
            
            mosqueListContainer.appendChild(mosqueItem);
        });
    }

    // --- Tasbih Logic ---
    const tasbihCount = document.getElementById('tasbih-count');
    const tasbihIncrementBtn = document.getElementById('tasbih-increment-btn');
    const tasbihResetBtn = document.getElementById('tasbih-reset-btn');
    
    let count = 0;
    
    tasbihIncrementBtn.addEventListener('click', () => {
        count++;
        tasbihCount.textContent = count;
        
        // Add haptic feedback if available
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
        
        // Check if count reaches 33 or 100
        if (count === 33) {
            showNotification('33x - Subhanallah');
        } else if (count === 66) {
            showNotification('66x - Alhamdulillah');
        } else if (count === 99) {
            showNotification('99x - Allahu Akbar');
        } else if (count === 100) {
            showNotification('100x - Selesai! Reset untuk memulai lagi.');
        }
    });
    
    tasbihResetBtn.addEventListener('click', () => {
        count = 0;
        tasbihCount.textContent = count;
    });
    
    function showNotification(message) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'fixed top-20 left-1/2 transform -translate-x-1/2 bg-amber-500 text-emerald-900 px-4 py-2 rounded-lg font-bold z-50';
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Remove after 2 seconds
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 2000);
    }

    // --- Zakat Calculator Logic ---
    const calculateProfesiBtn = document.getElementById('calculate-profesi-btn');
    const calculateMaalBtn = document.getElementById('calculate-maal-btn');
    const calculateFitrahBtn = document.getElementById('calculate-fitrah-btn');
    
    calculateProfesiBtn.addEventListener('click', () => {
        const income = parseFloat(document.getElementById('zakat-profesi-income').value) || 0;
        const goldPrice = parseFloat(document.getElementById('zakat-profesi-gold-price').value) || 0;
        
        if (income <= 0 || goldPrice <= 0) {
            document.getElementById('zakat-profesi-result').innerHTML = '<p class="text-red-400">Silakan masukkan nilai yang valid.</p>';
            return;
        }
        
        // Calculate nisab (85 grams of gold)
        const nisab = 85 * goldPrice;
        
        if (income < nisab) {
            document.getElementById('zakat-profesi-result').innerHTML = `<p class="text-gray-300">Pendapatan Anda belum mencapai nisab (Rp ${nisab.toLocaleString('id-ID')}). Tidak wajib zakat.</p>`;
        } else {
            const zakatAmount = income * 0.025; // 2.5%
            document.getElementById('zakat-profesi-result').innerHTML = `<p class="text-amber-300">Zakat profesi: Rp ${zakatAmount.toLocaleString('id-ID')}</p>`;
        }
    });
    
    calculateMaalBtn.addEventListener('click', () => {
        const wealth = parseFloat(document.getElementById('zakat-maal-wealth').value) || 0;
        const goldPrice = 1300000; // Default gold price
        
        if (wealth <= 0) {
            document.getElementById('zakat-maal-result').innerHTML = '<p class="text-red-400">Silakan masukkan nilai yang valid.</p>';
            return;
        }
        
        // Calculate nisab (85 grams of gold)
        const nisab = 85 * goldPrice;
        
        if (wealth < nisab) {
            document.getElementById('zakat-maal-result').innerHTML = `<p class="text-gray-300">Harta Anda belum mencapai nisab (Rp ${nisab.toLocaleString('id-ID')}). Tidak wajib zakat.</p>`;
        } else {
            const zakatAmount = wealth * 0.025; // 2.5%
            document.getElementById('zakat-maal-result').innerHTML = `<p class="text-amber-300">Zakat maal: Rp ${zakatAmount.toLocaleString('id-ID')}</p>`;
        }
    });
    
    calculateFitrahBtn.addEventListener('click', () => {
        const people = parseInt(document.getElementById('zakat-fitrah-people').value) || 0;
        const ricePrice = parseFloat(document.getElementById('zakat-fitrah-rice-price').value) || 0;
        
        if (people <= 0 || ricePrice <= 0) {
            document.getElementById('zakat-fitrah-result').innerHTML = '<p class="text-red-400">Silakan masukkan nilai yang valid.</p>';
            return;
        }
        
        // Calculate zakat fitrah (3.5 liters of rice per person)
        const riceAmount = 3.5 * people; // in liters
        const zakatAmount = riceAmount * ricePrice;
        
        document.getElementById('zakat-fitrah-result').innerHTML = `<p class="text-amber-300">Zakat fitrah: ${riceAmount} liter beras atau Rp ${zakatAmount.toLocaleString('id-ID')}</p>`;
    });

    // --- Ayat Search Logic ---
    const ayatSearchInput = document.getElementById('ayat-search-input');
    const ayatSearchResults = document.getElementById('ayat-search-results');
    
    // Add debouncing to search input
    let searchTimeout;
    ayatSearchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        const query = ayatSearchInput.value.trim();
        
        if (query.length < 3) {
            ayatSearchResults.innerHTML = '<p class="text-center text-gray-400">Masukkan minimal 3 karakter untuk pencarian.</p>';
            return;
        }
        
        showLoading();
        searchTimeout = setTimeout(() => {
            searchAyat(query);
        }, 500);
    });
    
    async function searchAyat(query) {
        try {
            // If we don't have Quran data yet, fetch it first
            if (!allQuranData) {
                await fetchSurahList();
            }
            
            const results = [];
            let searchLimit = 8; // Batas maksimal hasil pencarian
            let foundCount = 0;
            
            // Search through all surahs and ayahs
            for (const surah of allQuranData) {
                if (foundCount >= searchLimit) break; // Hentikan pencarian jika sudah mencapai batas
                
                const surahNumber = surah.number || surah.nomor;
                
                try {
                    let response, ayahs;
                    
                    if (currentApiSource === 'alquran-cloud') {
                        // Try primary API first
                        try {
                            response = await fetch(`https://alquran.cloud/api/surah/${surahNumber}/id.indonesian`);
                            if (!response.ok) throw new Error('Network response was not ok');
                            const data = await response.json();
                            ayahs = data.data.ayahs;
                        } catch (error) {
                            console.error('Primary API failed:', error);
                            // Try fallback API
                            response = await fetch(`https://api.alquran.cloud/v1/surah/${surahNumber}/id.indonesian`);
                            if (!response.ok) throw new Error('Fallback API also failed');
                            const data = await response.json();
                            ayahs = data.data.ayahs;
                        }
                    } else {
                        // Use Santrikoding API
                        response = await fetch(`https://quran-api.santrikoding.com/api/surah/${surahNumber}`);
                        if (!response.ok) throw new Error('Network response was not ok');
                        const data = await response.json();
                        ayahs = data.ayat;
                    }
                    
                    // Search for matching ayahs
                    for (const ayah of ayahs) {
                        if (foundCount >= searchLimit) break; // Hentikan pencarian jika sudah mencapai batas
                        
                        const text = ayah.text || ayah.idn;
                        if (text && text.toLowerCase().includes(query.toLowerCase())) {
                            results.push({
                                surahNumber: surahNumber,
                                surahName: surah.englishName || surah.nama_latin,
                                surahArabicName: surah.name || surah.nama,
                                ayahNumber: ayah.numberInSurah || ayah.nomor,
                                text: text
                            });
                            foundCount++;
                        }
                    }
                } catch (error) {
                    console.error(`Error searching in surah ${surahNumber}:`, error);
                }
            }
            
            renderSearchResults(results, query);
        } catch (error) {
            console.error('Error searching ayat:', error);
            ayatSearchResults.innerHTML = `<p class="text-red-400">Gagal mencari ayat: ${error.message}</p>`;
        } finally {
            hideLoading();
        }
    }
    
    function renderSearchResults(results, query) {
        if (results.length === 0) {
            ayatSearchResults.innerHTML = `<p class="text-center text-gray-400">Tidak ada hasil untuk "${query}".</p>`;
            return;
        }
        
        ayatSearchResults.innerHTML = '';
        
        // Tampilkan semua hasil (maksimal 8)
        results.forEach(result => {
            const resultItem = document.createElement('div');
            resultItem.className = 'bg-emerald-800 bg-opacity-50 p-4 rounded-lg cursor-pointer hover:bg-emerald-700 transition-all duration-300';
            
            // Highlight the matching text
            const highlightedText = result.text.replace(
                new RegExp(query, 'gi'),
                match => `<span class="bg-amber-500 text-emerald-900 font-bold">${match}</span>`
            );
            
            resultItem.innerHTML = `
                <div class="flex justify-between items-center mb-2">
                    <h3 class="font-bold text-lg text-amber-300">${result.surahName} (${result.surahNumber}:${result.ayahNumber})</h3>
                </div>
                <p class="text-gray-300 leading-relaxed">${highlightedText}</p>
            `;
            
            resultItem.addEventListener('click', () => {
                // Navigate to the surah detail view
                fetchSurahDetail(result.surahNumber);
                
                // Switch to the Quran section
                document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
                document.querySelector('[data-target="quran"]').classList.add('active');
                
                document.querySelectorAll('.content-section').forEach(section => section.classList.add('hidden'));
                document.getElementById('quran-section').classList.remove('hidden');
            });
            
            ayatSearchResults.appendChild(resultItem);
        });
        
        // Tambahkan pesan jika ada lebih banyak hasil yang mungkin
        if (results.length === 8) {
            const moreResults = document.createElement('p');
            moreResults.className = 'text-center text-gray-400 mt-4';
            moreResults.textContent = 'Menampilkan 8 hasil teratas. Gunakan kata kunci yang lebih spesifik untuk hasil yang lebih tepat.';
            ayatSearchResults.appendChild(moreResults);
        }
    }

    // --- Doa Harian Logic ---
    const doaData = {
        makanan: [
            {
                title: "Doa Sebelum Makan",
                arabic: "اللَّهُمَّ بَارِكْ لَنَا فِيمَا رَزَقْتَنَا وَقِنَا عَذَابَ النَّارِ",
                latin: "Allahumma barik lana fima razaqtana wa qina 'adzaban nar",
                translation: "Ya Allah, berkahilah kami dalam rezeki yang Engkau berikan kepada kami dan lindungilah kami dari siksa api neraka."
            },
            {
                title: "Doa Sesudah Makan",
                arabic: "الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنَا وَسَقَانَا وَجَعَلَنَا مُسْلِمِينَ",
                latin: "Alhamdulillahilladhi ath'amana wa saqana wa ja'alana muslimin",
                translation: "Segala puji bagi Allah yang telah memberi makan kami dan minuman kami, serta menjadikan kami orang-orang Islam."
            }
        ],
        tidur: [
            {
                title: "Doa Sebelum Tidur",
                arabic: "بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا",
                latin: "Bismika Allahumma amutu wa ahya",
                translation: "Dengan menyebut nama-Mu ya Allah, aku mati dan aku hidup."
            },
            {
                title: "Doa Sesudah Tidur",
                arabic: "الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ",
                latin: "Alhamdulillahilladhi ahyana ba'da ma amata wa ilayhin nushur",
                translation: "Segala puji bagi Allah yang telah menghidupkan kami sesudah kami mati (membangunkan dari tidur) dan hanya kepada-Nya kami dikembalikan."
            }
        ],
        rumah: [
            {
                title: "Doa Masuk Rumah",
                arabic: "اللَّهُمَّ إِنِّي أَسْأَلُكَ خَيْرَ الْمَدْخَلِ وَخَيْرَ الْمَخْرَجِ بِاسْمِ اللَّهِ وَلَجَنَا وَبِاسْمِ اللَّهِ خَرَجْنَا وَعَلَى اللَّهِ رَبِّنَا تَوَكَّلْنَا",
                latin: "Allahumma inni as'aluka khairal madkhali wa khairal makhraji bismillahi walajna wa bismillahi kharajna wa 'alallahi rabbina tawakkalna",
                translation: "Ya Allah, sesungguhnya aku mohon kepada-Mu kebaikan saat masuk dan kebaikan saat keluar. Dengan nama Allah kami masuk, dan dengan nama Allah kami keluar, dan kepada Allah Tuhan kami, kami bertawakal."
            },
            {
                title: "Doa Keluar Rumah",
                arabic: "بِسْمِ اللَّهِ تَوَكَّلْتُ عَلَى اللَّهِ لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ",
                latin: "Bismillahi tawakkaltu 'alallahi la haula wa la quwwata illa billah",
                translation: "Dengan nama Allah, aku bertawakal kepada Allah, tidak ada daya dan kekuatan kecuali dengan Allah."
            }
        ],
        wc: [
            {
                title: "Doa Masuk WC",
                arabic: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْخُبُثِ وَالْخَبَائِثِ",
                latin: "Allahumma inni a'udzu bika minal khubutsi wal khabaits",
                translation: "Ya Allah, aku berlindung kepada-Mu dari godaan setan laki-laki dan setan perempuan."
            },
            {
                title: "Doa Keluar WC",
                arabic: "غُفْرَانَكَ",
                latin: "Ghufranaka",
                translation: "Aku memohon ampunan kepada-Mu."
            }
        ],
        pakaian: [
            {
                title: "Doa Memakai Pakaian Baru",
                arabic: "الْحَمْدُ لِلَّهِ الَّذِي كَسَانِي هَذَا وَرَزَقَنِيهِ مِنْ غَيْرِ حَوْلٍ مِنِّي وَلَا قُوَّةٍ",
                latin: "Alhamdulillahilladhi kasani hadza wa razaqanihi min ghairi haulin minni wa la quwwah",
                translation: "Segala puji bagi Allah yang telah memberikan aku pakaian ini dan memberikan rezeki kepadaku tanpa daya dan kekuatan dariku."
            }
        ]
    };

    function loadDoaCategories() {
        // Populate the doa list with the first category by default
        const firstCategory = Object.keys(doaData)[0];
        doaCategory.value = firstCategory;
        loadDoa();
    }

    loadDoaBtn.addEventListener('click', loadDoa);

    function loadDoa() {
        const category = doaCategory.value;
        
        if (!category) {
            doaListContainer.innerHTML = '<p class="text-center text-gray-400">Silakan pilih kategori doa.</p>';
            return;
        }
        
        const doas = doaData[category];
        
        if (!doas || doas.length === 0) {
            doaListContainer.innerHTML = '<p class="text-center text-gray-400">Tidak ada doa dalam kategori ini.</p>';
            return;
        }
        
        doaListContainer.innerHTML = '';
        
        doas.forEach(doa => {
            const doaCard = document.createElement('div');
            doaCard.className = 'bg-emerald-800 bg-opacity-50 p-4 rounded-lg';
            
            doaCard.innerHTML = `
                <h3 class="font-bold text-lg text-amber-300 mb-2">${doa.title}</h3>
                <p class="font-amiri text-2xl text-right leading-loose text-amber-100 mb-2">${doa.arabic}</p>
                <p class="text-sm text-gray-400 mb-2">${doa.latin}</p>
                <p class="text-gray-300">${doa.translation}</p>
            `;
            
            doaListContainer.appendChild(doaCard);
        });
    }

    // --- Hijaiyah Practice Logic ---
    let hijaiyahInitialized = false;
    const hijaiyahLetters = [
        'ا', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د', 'ذ', 'ر', 'ز', 'س', 'ش', 'ص', 
        'ض', 'ط', 'ظ', 'ع', 'غ', 'ف', 'ق', 'ك', 'ل', 'م', 'ن', 'ه', 'و', 'ي'
    ];
    let currentLetterIndex = 0;
    let letterProgress = new Array(hijaiyahLetters.length).fill(false);
    
    function initializeHijaiyah() {
        const canvas = document.getElementById('drawingCanvas');
        const ctx = canvas.getContext('2d');
        const nextButton = document.getElementById('nextButton');
        const clearButton = document.getElementById('clearButton');
        const targetLetter = document.getElementById('targetLetter');
        const feedbackText = document.getElementById('feedbackText');
        const progressBar = document.getElementById('progressBar');
        const currentScore = document.getElementById('currentScore');
        const lettersGrid = document.getElementById('lettersGrid');
        
        // Set up canvas
        ctx.strokeStyle = '#00a8a8';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // Initialize letters grid
        renderLettersGrid();
        
        // Show the first letter
        showCurrentLetter();
        
        // Drawing functions
        let isDrawing = false;
        let lastX = 0;
        let lastY = 0;
        
        function startDrawing(e) {
            isDrawing = true;
            [lastX, lastY] = getMousePos(canvas, e);
        }
        
        function draw(e) {
            if (!isDrawing) return;
            
            const [currentX, currentY] = getMousePos(canvas, e);
            
            ctx.beginPath();
            ctx.moveTo(lastX, lastY);
            ctx.lineTo(currentX, currentY);
            ctx.stroke();
            
            [lastX, lastY] = [currentX, currentY];
        }
        
        function stopDrawing() {
            if (isDrawing) {
                isDrawing = false;
                evaluateDrawing();
            }
        }
        
        function getMousePos(canvas, e) {
            const rect = canvas.getBoundingClientRect();
            const clientX = e.clientX || (e.touches && e.touches[0].clientX);
            const clientY = e.clientY || (e.touches && e.touches[0].clientY);
            
            return [
                clientX - rect.left,
                clientY - rect.top
            ];
        }
        
        // Mouse events
        canvas.addEventListener('mousedown', startDrawing);
        canvas.addEventListener('mousemove', draw);
        canvas.addEventListener('mouseup', stopDrawing);
        canvas.addEventListener('mouseout', stopDrawing);
        
        // Touch events
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            startDrawing(e);
        });
        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            draw(e);
        });
        canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            stopDrawing();
        });
        
        // Button events
        nextButton.addEventListener('click', () => {
            // Mark current letter as completed
            letterProgress[currentLetterIndex] = true;
            
            // Move to next letter
            currentLetterIndex = (currentLetterIndex + 1) % hijaiyahLetters.length;
            
            // Update UI
            showCurrentLetter();
            renderLettersGrid();
            clearCanvas();
        });
        
        clearButton.addEventListener('click', clearCanvas);
        
        function clearCanvas() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            feedbackText.textContent = 'Silakan gambar huruf target di atas kanvas.';
            progressBar.style.width = '0%';
            currentScore.textContent = '0%';
        }
        
        function showCurrentLetter() {
            targetLetter.textContent = hijaiyahLetters[currentLetterIndex];
        }
        
        function renderLettersGrid() {
            lettersGrid.innerHTML = '';
            
            hijaiyahLetters.forEach((letter, index) => {
                const letterItem = document.createElement('div');
                letterItem.className = 'letter-item';
                
                if (letterProgress[index]) {
                    letterItem.classList.add('completed');
                } else if (index === currentLetterIndex) {
                    letterItem.classList.add('current');
                }
                
                letterItem.textContent = letter;
                lettersGrid.appendChild(letterItem);
            });
        }
        
        function evaluateDrawing() {
            // This is a simplified evaluation - in a real app, you'd use more sophisticated pattern recognition
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const pixels = imageData.data;
            
            // Count non-transparent pixels
            let drawnPixels = 0;
            for (let i = 3; i < pixels.length; i += 4) {
                if (pixels[i] > 0) {
                    drawnPixels++;
                }
            }
            
            // Calculate coverage percentage
            const totalPixels = canvas.width * canvas.height;
            const coveragePercent = (drawnPixels / totalPixels) * 100;
            
            // Update UI with feedback
            if (coveragePercent < 1) {
                feedbackText.textContent = 'Gambar tidak terdeteksi. Silakan coba lagi.';
                progressBar.style.width = '0%';
                currentScore.textContent = '0%';
            } else if (coveragePercent < 3) {
                feedbackText.textContent = 'Huruf terlalu kecil. Silakan gambar lebih besar.';
                progressBar.style.width = '20%';
                currentScore.textContent = '20%';
            } else if (coveragePercent < 6) {
                feedbackText.textContent = 'Cukup baik, tapi bisa lebih baik lagi.';
                progressBar.style.width = '40%';
                currentScore.textContent = '40%';
            } else if (coveragePercent < 10) {
                feedbackText.textContent = 'Bagus! Terus berlatih.';
                progressBar.style.width = '60%';
                currentScore.textContent = '60%';
            } else if (coveragePercent < 15) {
                feedbackText.textContent = 'Sangat baik!';
                progressBar.style.width = '80%';
                currentScore.textContent = '80%';
            } else {
                feedbackText.textContent = 'Luar biasa! Huruf sempurna.';
                progressBar.style.width = '100%';
                currentScore.textContent = '100%';
            }
        }
    }

    // Initialize the app
    fetchSurahList();
});