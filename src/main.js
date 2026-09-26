import './style.css';
import { translations } from './translations.js';
import { 
    calculateHoroscope, 
    signKeys, 
    starKeys, 
    getRasiSignIndex, 
    getStarAndPada, 
    calculateSubPeriods,
    getMoonSiderealLongitude,
    getPlanetSiderealLongitude,
    getChandrashtamaRasiForJanmaRasi,
    getJanmaRasiForTransitMoonRasi,
    starChandrashtamaMap,
    getStarsInRasi,
    findMoonSignTransitWindow,
    findMoonLongitudeTime,
    calculateUpcomingChandrashtamaForRasi,
    calculateMonthlyChandrashtama,
    calculateNextPlanetTransitions
} from './astroCalculations.js';

// Localized strings for Dasa search feature
const dasaSearchTranslations = {
    en: {
        searchByDate: "Search Dasa by Date",
        searchBtn: "Search",
        activeDasaOn: "Active Dasa on",
        invalidDate: "Please select a valid date.",
        outOfRange: "Date is out of the 120-year Dasa timeline range."
    },
    ta: {
        searchByDate: "தேதி வாரியாக தசா தேடல்",
        searchBtn: "தேடு",
        activeDasaOn: "குறிப்பிட்ட தேதியில் தற்போதைய தசா",
        invalidDate: "தயவுசெய்து ஒரு சரியான தேதியைத் தேர்ந்தெடுக்கவும்.",
        outOfRange: "தேதி 120 வருட தசா காலவரிசைக்கு அப்பாற்பட்டது."
    },
    hi: {
        searchByDate: "दिनांक के अनुसार दशा खोजें",
        searchBtn: "खोजें",
        activeDasaOn: "को सक्रिय दशा",
        invalidDate: "कृपया एक वैध दिनांक चुनें।",
        outOfRange: "दिनांक 120-वर्षीय दशा कालक्रम सीमा से बाहर है।"
    },
    te: {
        searchByDate: "తేదీ ద్వారా దశా శోధన",
        searchBtn: "శోధించు",
        activeDasaOn: "నాడు క్రియాశీల దశ",
        invalidDate: "దయచేసి సరైన తేదీని ఎంచుకోండి.",
        outOfRange: "తేదీ 120 సంవత్సరాల దశా కాలక్రమం వెలుపల ఉంది."
    },
    kn: {
        searchByDate: "ದಿನಾಂಕದ ಮೂಲಕ ದಶಾ ಹುಡುಕಾಟ",
        searchBtn: "ಹುಡುಕಿ",
        activeDasaOn: "ರಂದು ಸಕ್ರಿಯ ದಶಾ",
        invalidDate: "ದಯವಿಟ್ಟು ಮಾನ್ಯವಾದ ದಿನಾಂಕವನ್ನು ಆಯ್ಕೆಮಾಡಿ.",
        outOfRange: "ದಿನಾಂಕವು 120 ವರ್ಷಗಳ ದಶ ಕಾಲಾವಧಿಯ ವ್ಯಾಪ್ತಿಯಿಂದ ಹೊರಗಿದೆ."
    },
    ml: {
        searchByDate: "തീയതി അനുസരിച്ച് ദശ തിരയുക",
        searchBtn: "തിരയുക",
        activeDasaOn: "-ൽ സജീവമായ ദശ",
        invalidDate: "ദയവായി സാധുവായ ഒരു തീയതി തിരഞ്ഞെടുക്കുക.",
        outOfRange: "തീയതി 120 വർഷത്തെ ദശാ സമയപരിധിക്ക് പുറത്താണ്."
    }
};

// Helper function to find active Dasa, Bhukti, Antara, and Sookshma at a specific date
function findActiveDasaPathAtDate(targetDate, dasaTimeline, birthDateStr) {
    const birthDate = new Date(birthDateStr);
    let searchDate = new Date(targetDate);
    
    // Clamp search date to birth date-time if it falls on the same calendar day but before birth time
    if (searchDate.toDateString() === birthDate.toDateString() && searchDate < birthDate) {
        searchDate = new Date(birthDate);
    }
    
    // Clamp search date to just before timeline end if it falls on the same calendar day but after end time
    if (dasaTimeline && dasaTimeline.length > 0) {
        const timelineEnd = new Date(dasaTimeline[dasaTimeline.length - 1].end);
        if (searchDate.toDateString() === timelineEnd.toDateString() && searchDate > timelineEnd) {
            searchDate = new Date(timelineEnd.getTime() - 1000);
        }
    }

    // 1. Find Mahadasa (level 1)
    const mahadasa = dasaTimeline.find(p => {
        const start = new Date(p.start);
        const end = new Date(p.end);
        return searchDate >= start && searchDate < end;
    });
    if (!mahadasa) return null;
    
    // Normalize parent period for subperiod calculations
    const mdObj = {
        lord: mahadasa.lord,
        start: new Date(mahadasa.start).toISOString(),
        end: new Date(mahadasa.end).toISOString(),
        duration: mahadasa.duration,
        startAge: mahadasa.startAge,
        endAge: mahadasa.endAge,
        virtualStart: mahadasa.virtualStart ? new Date(mahadasa.virtualStart).toISOString() : undefined,
        fullDuration: mahadasa.fullDuration
    };
    
    // 2. Find Bhukti (level 2)
    const bhuktis = calculateSubPeriods(mdObj, birthDateStr);
    const bhukti = bhuktis.find(p => {
        const start = new Date(p.start);
        const end = new Date(p.end);
        return searchDate >= start && searchDate < end;
    });
    if (!bhukti) return [mdObj];
    
    // 3. Find Antara (level 3)
    const antaras = calculateSubPeriods(bhukti, birthDateStr);
    const antara = antaras.find(p => {
        const start = new Date(p.start);
        const end = new Date(p.end);
        return searchDate >= start && searchDate < end;
    });
    if (!antara) return [mdObj, bhukti];
    
    // 4. Find Sookshma (level 4)
    const sookshmas = calculateSubPeriods(antara, birthDateStr);
    const sookshma = sookshmas.find(p => {
        const start = new Date(p.start);
        const end = new Date(p.end);
        return searchDate >= start && searchDate < end;
    });
    if (!sookshma) return [mdObj, bhukti, antara];
    
    return [mdObj, bhukti, antara, sookshma];
}

// Helper function to format geocoding result display name cleanly (removing full address info)
const formatCleanPlaceLabel = (item) => {
    const addr = item.address || {};
    const placeName = addr.city || addr.town || addr.village || addr.municipality || addr.suburb || addr.hamlet || addr.locality || item.name || item.display_name.split(',')[0];
    const postcode = addr.postcode || '';
    const stateName = addr.state || addr.region || addr.county || addr.district || '';
    const countryName = addr.country || '';

    let placeStr = placeName;
    if (postcode) {
        placeStr += ` (${postcode})`;
    }

    let label = placeStr;
    if (stateName && stateName !== placeName) {
        label += `, ${stateName}`;
    }
    if (countryName && countryName !== stateName && countryName !== placeName) {
        label += `, ${countryName}`;
    }
    return label;
};

// Helper function for local date formatting
const formatDate = (date) => {
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const y = date.getFullYear();
    return `${d}-${m}-${y}`;
};

// Helper function to calculate calendar difference in years, months, and days
const getAgeYMD = (birthDate, targetDate) => {
    const bDate = new Date(birthDate);
    const tDate = new Date(targetDate);
    
    if (tDate < bDate) {
        return { years: 0, months: 0, days: 0 };
    }
    
    let years = tDate.getFullYear() - bDate.getFullYear();
    let months = tDate.getMonth() - bDate.getMonth();
    let days = tDate.getDate() - bDate.getDate();
    
    if (days < 0) {
        // Borrow days from the previous month of targetDate
        const prevMonth = new Date(tDate.getFullYear(), tDate.getMonth(), 0);
        days += prevMonth.getDate();
        months--;
    }
    
    if (months < 0) {
        months += 12;
        years--;
    }
    
    return { years, months, days };
};

// Helper function to format Age YMD based on current language tags
const formatAgeYMD = (ageObj, t) => {
    return `${ageObj.years}${t.dasa.y} ${ageObj.months}${t.dasa.m} ${ageObj.days}${t.dasa.d}`;
};

// Helper function to format duration between two dates in clean, human-readable format
const formatDuration = (startDate, endDate, t) => {
    const diff = getAgeYMD(startDate, endDate);
    const parts = [];
    
    if (diff.years > 0) {
        const label = diff.years === 1 ? t.dasa.yearSingular : t.dasa.yearPlural;
        parts.push(`${diff.years} ${label}`);
    }
    
    if (diff.months > 0) {
        const label = diff.months === 1 ? t.dasa.monthSingular : t.dasa.monthPlural;
        parts.push(`${diff.months} ${label}`);
    }
    
    if (diff.days > 0) {
        const label = diff.days === 1 ? t.dasa.daySingular : t.dasa.dayPlural;
        parts.push(`${diff.days} ${label}`);
    }
    
    if (parts.length === 0) {
        return `0 ${t.dasa.dayPlural}`;
    }
    
    return parts.join(' ');
};

window.highlightAspects = function(rasiIdx) {
    document.querySelectorAll('.aspect-path').forEach(p => {
        if (p.classList.contains('from-' + rasiIdx)) {
            p.style.opacity = '1';
            p.style.strokeWidth = '2.5px';
        } else {
            p.style.opacity = '0.08';
            p.style.strokeWidth = '1.2px';
        }
    });
};

window.resetAspects = function() {
    document.querySelectorAll('.aspect-path').forEach(p => {
        p.style.opacity = '0.85';
        p.style.strokeWidth = '1.5px';
    });
};

function getCurrentLocation(successCallback, errorCallback) {
    if (!navigator.geolocation) {
        errorCallback(new Error("Geolocation not supported"));
        return;
    }
    navigator.geolocation.getCurrentPosition(
        (position) => {
            successCallback(position.coords.latitude, position.coords.longitude);
        },
        (error) => {
            errorCallback(error);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
}

function getPlanetaryStrength(pName, rasiIdx, lang) {
    if (pName === 'Lagna' || pName === 'Mandi') return '-';
    
    const exaltationMap = { Sun: 0, Moon: 1, Mars: 9, Mercury: 5, Jupiter: 3, Venus: 11, Saturn: 6, Rahu: 1, Ketu: 7 };
    const debilitationMap = { Sun: 6, Moon: 7, Mars: 3, Mercury: 11, Jupiter: 9, Venus: 5, Saturn: 0, Rahu: 7, Ketu: 1 };
    const ownSignsMap = {
        Sun: [4], Moon: [3], Mars: [0, 7], Mercury: [2, 5],
        Jupiter: [8, 11], Venus: [1, 6], Saturn: [9, 10], Rahu: [5, 10], Ketu: [11, 7]
    };
    const rasiLords = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];
    
    const naturalRelationships = {
        Sun: { friends: ['Moon', 'Mars', 'Jupiter'], enemies: ['Venus', 'Saturn'], neutrals: ['Mercury'] },
        Moon: { friends: ['Sun', 'Mercury'], enemies: [], neutrals: ['Mars', 'Jupiter', 'Venus', 'Saturn'] },
        Mars: { friends: ['Sun', 'Moon', 'Jupiter'], enemies: ['Mercury'], neutrals: ['Venus', 'Saturn'] },
        Mercury: { friends: ['Sun', 'Venus'], enemies: ['Moon'], neutrals: ['Mars', 'Jupiter', 'Saturn'] },
        Jupiter: { friends: ['Sun', 'Moon', 'Mars'], enemies: ['Mercury', 'Venus'], neutrals: ['Saturn'] },
        Venus: { friends: ['Mercury', 'Saturn'], enemies: ['Sun', 'Moon'], neutrals: ['Mars', 'Jupiter'] },
        Saturn: { friends: ['Mercury', 'Venus'], enemies: ['Sun', 'Moon', 'Mars'], neutrals: ['Jupiter'] },
        Rahu: { friends: ['Mercury', 'Venus', 'Saturn'], enemies: ['Sun', 'Moon', 'Mars'], neutrals: ['Jupiter'] },
        Ketu: { friends: ['Sun', 'Moon', 'Mars', 'Jupiter'], enemies: ['Mercury', 'Venus'], neutrals: ['Saturn'] }
    };

    const strengthTranslations = {
        exalted: { ta: 'உச்சம்', en: 'Exalted', hi: 'उच्च', te: 'ఉచ్ఛ', kn: 'ಉಚ್ಚ', ml: 'ഉച്ചം' },
        debilitated: { ta: 'நீசம்', en: 'Debilitated', hi: 'नीच', te: 'నీచ', kn: 'ನೀಚ', ml: 'നീചം' },
        ownSign: { ta: 'ஆட்சி', en: 'Own Sign', hi: 'स्वराशि', te: 'స్వరాశి', kn: 'ಸ್ವರಾಶಿ', ml: 'സ്വക്ഷേത്രം' },
        friendly: { ta: 'நட்பு', en: 'Friendly', hi: 'मित्र', te: 'మిత్ర', kn: 'ಮಿತ್ರ', ml: 'മിത്രം' },
        enemy: { ta: 'பகை', en: 'Enemy', hi: 'शत्रु', te: 'शत्रु', kn: 'ಶತ್ರು', ml: 'ശത്രു' },
        neutral: { ta: 'சமம்', en: 'Neutral', hi: 'सम', te: 'सम', kn: 'ಸಮ', ml: 'സമം' }
    };

    let key = 'neutral';
    if (exaltationMap[pName] === rasiIdx) {
        key = 'exalted';
    } else if (debilitationMap[pName] === rasiIdx) {
        key = 'debilitated';
    } else if (ownSignsMap[pName] && ownSignsMap[pName].includes(rasiIdx)) {
        key = 'ownSign';
    } else {
        const lord = rasiLords[rasiIdx];
        const rels = naturalRelationships[pName];
        if (rels) {
            if (rels.friends.includes(lord)) {
                key = 'friendly';
            } else if (rels.enemies.includes(lord)) {
                key = 'enemy';
            }
        }
    }

    return strengthTranslations[key][lang] || strengthTranslations[key]['en'];
}

function calculateAspectMatrix(planets) {
    const targetPlanets = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];
    
    const aspectMap = {};
    targetPlanets.forEach(p1 => {
        aspectMap[p1] = {};
        targetPlanets.forEach(p2 => {
            aspectMap[p1][p2] = null;
        });
    });

    planets.forEach(pSource => {
        const pName = pSource.name;
        if (!targetPlanets.includes(pName) || pName === 'Rahu' || pName === 'Ketu') return;
        
        const srcRasi = pSource.rasiIdx;
        
        const aspectOffsets = [7];
        if (pName === 'Mars') {
            aspectOffsets.push(4, 8);
        } else if (pName === 'Jupiter' || pName === 'Rahu' || pName === 'Ketu') {
            aspectOffsets.push(5, 9);
        } else if (pName === 'Saturn') {
            aspectOffsets.push(3, 10);
        }
        
        planets.forEach(pTarget => {
            const tName = pTarget.name;
            if (!targetPlanets.includes(tName) || tName === pName) return;
            
            const tgtRasi = pTarget.rasiIdx;
            const diff = (tgtRasi - srcRasi + 12) % 12 + 1;
            
            if (aspectOffsets.includes(diff)) {
                aspectMap[pName][tName] = diff;
            }
        });
    });
    
    return aspectMap;
}

function formatAspectValue(offset, lang) {
    if (!offset) return '';
    return lang === 'ta' ? `${offset}-ம்` : `${offset}th`;
}

function renderAspectMatrixHtml(planets, t, lang) {
    const signKeys = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
    
    const elementColors = [
        'rgba(239, 68, 68, 0.08)',   // 0: Aries (Fire)
        'rgba(16, 185, 129, 0.08)',  // 1: Taurus (Earth)
        'rgba(59, 130, 246, 0.08)',   // 2: Gemini (Air)
        'rgba(168, 85, 247, 0.08)',  // 3: Cancer (Water)
        'rgba(239, 68, 68, 0.08)',   // 4: Leo (Fire)
        'rgba(16, 185, 129, 0.08)',  // 5: Virgo (Earth)
        'rgba(59, 130, 246, 0.08)',   // 6: Libra (Air)
        'rgba(168, 85, 247, 0.08)',  // 7: Scorpio (Water)
        'rgba(239, 68, 68, 0.08)',   // 8: Sagittarius (Fire)
        'rgba(16, 185, 129, 0.08)',  // 9: Capricorn (Earth)
        'rgba(59, 130, 246, 0.08)',   // 10: Aquarius (Air)
        'rgba(168, 85, 247, 0.08)'   // 11: Pisces (Water)
    ];

    let dividersHtml = '';
    let signsHtml = '';
    let sectorsHtml = '';
    
    for (let i = 0; i < 12; i++) {
        const dividerAngle = (i - 0.5) * 2 * Math.PI / 12 - Math.PI / 2;
        const x1 = 200 + 110 * Math.cos(dividerAngle);
        const y1 = 200 + 110 * Math.sin(dividerAngle);
        const x2 = 200 + 170 * Math.cos(dividerAngle);
        const y2 = 200 + 170 * Math.sin(dividerAngle);
        dividersHtml += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--card-border)" stroke-width="1.2" stroke-dasharray="2 3" opacity="0.7" />`;
        
        const startAngle = (i - 0.5) * 2 * Math.PI / 12 - Math.PI / 2;
        const endAngle = (i + 0.5) * 2 * Math.PI / 12 - Math.PI / 2;
        const R1 = 110;
        const R2 = 170;
        
        const x21 = 200 + R2 * Math.cos(startAngle);
        const y21 = 200 + R2 * Math.sin(startAngle);
        const x22 = 200 + R2 * Math.cos(endAngle);
        const y22 = 200 + R2 * Math.sin(endAngle);
        const x11 = 200 + R1 * Math.cos(startAngle);
        const y11 = 200 + R1 * Math.sin(startAngle);
        const x12 = 200 + R1 * Math.cos(endAngle);
        const y12 = 200 + R1 * Math.sin(endAngle);
        
        const pathD = `
            M ${x21} ${y21} 
            A ${R2} ${R2} 0 0 1 ${x22} ${y22} 
            L ${x12} ${y12} 
            A ${R1} ${R1} 0 0 0 ${x11} ${y11} 
            Z
        `;
        
        sectorsHtml += `<path class="rasi-sector" d="${pathD}" fill="${elementColors[i]}" fill-opacity="0.8" stroke="none" onmouseenter="highlightAspects(${i})" onmouseleave="resetAspects()" style="cursor: pointer;" />`;
        
        const centerAngle = i * 2 * Math.PI / 12 - Math.PI / 2;
        const cx = 200 + 138 * Math.cos(centerAngle);
        const cy = 200 + 138 * Math.sin(centerAngle);
        const sx = cx;
        const sy = cy - 7;
        
        const rasiTamilName = t.signs[signKeys[i]];
        const rasiEnglishName = translations['en'].signs[signKeys[i]];
        const signLabel = lang === 'ta' ? rasiTamilName : rasiEnglishName;
        
        const planetsInSign = planets.filter(pl => pl.rasiIdx === i);
        const plNames = planetsInSign
            .filter(pl => ['Lagna', 'Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu', 'Mandi'].includes(pl.name))
            .map(pl => {
                const abbrev = {
                    Lagna: 'Lg', Sun: 'Su', Moon: 'Mo', Mars: 'Ma', Mercury: 'Me',
                    Jupiter: 'Ju', Venus: 'Ve', Saturn: 'Sa', Rahu: 'Ra', Ketu: 'Ke', Mandi: 'Ma'
                }[pl.name];
                return abbrev || pl.name.substring(0, 2);
            })
            .join(' ');
            
        const px = cx;
        const py = cy + 8;
        
        signsHtml += `
            <g onmouseenter="highlightAspects(${i})" onmouseleave="resetAspects()" style="cursor: pointer;">
                <text x="${sx}" y="${sy}" fill="var(--accent)" font-size="11px" font-weight="700" text-anchor="middle" dominant-baseline="middle">${signLabel}</text>
                <text x="${px}" y="${py}" fill="var(--text-primary)" font-size="10px" font-weight="700" text-anchor="middle" dominant-baseline="middle">${plNames}</text>
            </g>
        `;
    }
    
    const planetColors = {
        Sun: '#22c55e',      // Green
        Moon: '#3b82f6',     // Blue
        Mars: '#ef4444',     // Red
        Mercury: '#06b6d4',  // Cyan
        Jupiter: '#a855f7',  // Purple
        Venus: '#ec4899',    // Pink/Magenta
        Saturn: '#475569',   // Charcoal/Slate
        Rahu: '#f97316',     // Orange
        Ketu: '#78716c'      // Brown
    };
    
    let markersHtml = '';
    Object.keys(planetColors).forEach(pName => {
        markersHtml += `
            <marker id="arrow-${pName}" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="${planetColors[pName]}" />
            </marker>
        `;
    });
    
    const planetJitters = {
        Sun: -0.06,
        Moon: -0.04,
        Mars: -0.02,
        Mercury: 0.0,
        Jupiter: 0.02,
        Venus: 0.04,
        Saturn: 0.06,
        Rahu: 0.08,
        Ketu: 0.1
    };
    
    let linesHtml = '';
    const activeAspectPlanets = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
    
    activeAspectPlanets.forEach(pName => {
        const pl = planets.find(p => p.name === pName);
        if (!pl) return;
        
        const S_A = pl.rasiIdx;
        const targetSigns = [(S_A + 6) % 12];
        
        if (pName === 'Mars') {
            targetSigns.push((S_A + 3) % 12, (S_A + 7) % 12);
        } else if (pName === 'Jupiter' || pName === 'Rahu' || pName === 'Ketu') {
            targetSigns.push((S_A + 4) % 12, (S_A + 8) % 12);
        } else if (pName === 'Saturn') {
            targetSigns.push((S_A + 2) % 12, (S_A + 9) % 12);
        }
        
        targetSigns.forEach(S_B => {
            const jitter = planetJitters[pName] || 0;
            const srcAngle = S_A * 2 * Math.PI / 12 - Math.PI / 2 + jitter;
            const tgtAngle = S_B * 2 * Math.PI / 12 - Math.PI / 2 + jitter;
            
            const x_a = 200 + 110 * Math.cos(srcAngle);
            const y_a = 200 + 110 * Math.sin(srcAngle);
            const x_b = 200 + 106 * Math.cos(tgtAngle);
            const y_b = 200 + 106 * Math.sin(tgtAngle);
            
            const mx = (x_a + x_b) / 2;
            const my = (y_a + y_b) / 2;
            const cx = mx * 0.95 + 200 * 0.05;
            const cy = my * 0.95 + 200 * 0.05;
            
            linesHtml += `
                <path class="aspect-path from-${S_A}" 
                      d="M ${x_a} ${y_a} Q ${cx} ${cy} ${x_b} ${y_b}" 
                      fill="none" 
                      stroke="${planetColors[pName]}" 
                      stroke-width="1.5" 
                      stroke-dasharray="3 3" 
                      marker-end="url(#arrow-${pName})" 
                      opacity="0.85" />
            `;
        });
    });

    const titleText = lang === 'ta' ? 'கிரக பார்வை வரைபடம்' : 'Planetary Aspects (Mapping Chart)';
    const descText = lang === 'ta'
        ? '*கிரகங்களின் பார்வைகளை இணைக்கும் வண்ணக் கதிர்கள்.'
        : '*Color-coded dashed lines connecting planetary aspects.';

    return `
        <div class="chart-box aspect-map-box" style="padding: 15px; display: flex; flex-direction: column; width: 100%; max-width: 440px; box-sizing: border-box; background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 8px; box-shadow: var(--shadow); align-items: center;">
            <div class="chart-title-header" style="font-size: 16px; font-weight: 700; margin-bottom: 2px; text-align: center; text-transform: uppercase; letter-spacing: 0.5px;">${titleText}</div>
            <div style="font-size: 10px; color: var(--text-secondary); text-align: center; margin-bottom: 12px; font-style: italic;">${descText}</div>
            
            <div style="position: relative; width: 100%; max-width: 380px; aspect-ratio: 1;">
                <svg viewBox="0 0 400 400" style="width: 100%; height: 100%; overflow: visible;">
                    <defs>
                        ${markersHtml}
                    </defs>
                    
                    <style>
                        .aspect-path {
                            transition: opacity 0.25s ease, stroke-width 0.25s ease;
                        }
                        .rasi-sector {
                            transition: fill 0.25s ease, fill-opacity 0.25s ease;
                        }
                    </style>
                    
                    <!-- Annular colored sectors -->
                    ${sectorsHtml}
                    
                    <!-- Outer boundary circle -->
                    <circle cx="200" cy="200" r="170" fill="none" stroke="var(--card-border)" stroke-width="1" />
                    
                    <!-- Inner boundary circle -->
                    <circle cx="200" cy="200" r="110" fill="none" stroke="var(--card-border)" stroke-width="1.5" />
                    
                    <!-- Segment Dividers -->
                    ${dividersHtml}
                    
                    <!-- Aspect Paths -->
                    ${linesHtml}
                    
                    <!-- Sign Names & Planet Text Lists -->
                    ${signsHtml}
                </svg>
            </div>
        </div>
    `;
}

// Color utilities for Accent Color Customization
function hexToHsl(hex) {
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return null;
    let r = parseInt(result[1], 16) / 255;
    let g = parseInt(result[2], 16) / 255;
    let b = parseInt(result[3], 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) {
        h = s = 0;
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return {
        h: Math.round(h * 360),
        s: Math.round(s * 100),
        l: Math.round(l * 100)
    };
}

function hslToHex(h, s, l) {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = n => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
}

function computeAccentForCustom(primaryColor) {
    const hsl = hexToHsl(primaryColor);
    if (!hsl) return primaryColor;
    // Shift hue by -22 degrees for complimentary gradient
    const accentH = (hsl.h - 22 + 360) % 360;
    return hslToHex(accentH, hsl.s, hsl.l);
}

function applyAccentColor(primaryColor, accentColor) {
    const primaryHsl = hexToHsl(primaryColor);
    const accentHsl = hexToHsl(accentColor);
    if (primaryHsl && accentHsl) {
        document.documentElement.style.setProperty('--primary-h', primaryHsl.h);
        document.documentElement.style.setProperty('--primary-s', primaryHsl.s + '%');
        document.documentElement.style.setProperty('--primary-l', primaryHsl.l + '%');
        document.documentElement.style.setProperty('--accent-h', accentHsl.h);
        document.documentElement.style.setProperty('--accent-s', accentHsl.s + '%');
        document.documentElement.style.setProperty('--accent-l', accentHsl.l + '%');
    }
}

function applyChartAccentColor(color) {
    const hsl = hexToHsl(color);
    if (hsl) {
        document.documentElement.style.setProperty('--chart-accent-h', hsl.h);
        document.documentElement.style.setProperty('--chart-accent-s', hsl.s + '%');
        document.documentElement.style.setProperty('--chart-accent-l', hsl.l + '%');
        document.documentElement.style.setProperty('--chart-accent', color);
    }
}

// Application State Loader
const savedState = localStorage.getItem('horoscope_app_state');
let state = {
    lang: 'ta', // 'ta' or 'en'
    view: 'form', // 'form' or 'results'
    horoscope: null,
    selectedCity: null,
    chartStyle: 'south',
    globalZoom: 100
};

if (savedState) {
    try {
        const parsed = JSON.parse(savedState);
        if (parsed && typeof parsed === 'object') {
            state = { ...state, ...parsed };
        }
    } catch (e) {
        console.error("Failed to parse saved state", e);
    }
}
state.globalZoom = parseInt(state.globalZoom, 10) || 100;
state.activeTab = state.activeTab || 'horoscope';
state.selectedCity = null; // Ensure birth place is blank on initial load/refresh

// Initialize separate calendar and location state for current planetary positions (transits)
state.transitDate = state.transitDate || new Date().toISOString().split('T')[0];
state.transitTime = state.transitTime || new Date().toTimeString().split(' ')[0].substring(0, 5);
state.transitLocationName = state.transitLocationName || (state.lang === 'ta' ? 'சென்னை (DEFAULT)' : 'Chennai (DEFAULT)');
state.transitLatitude = state.transitLatitude !== undefined ? state.transitLatitude : 13.0827;
state.transitLongitude = state.transitLongitude !== undefined ? state.transitLongitude : 80.2707;
state.transitRangePast = state.transitRangePast || 3;
state.transitRangeFuture = state.transitRangeFuture || 3;

// Chandrashtama Section State
state.chandrashtamaTab = state.chandrashtamaTab || 'today';
const currentSystemDate = new Date();
state.chandrashtamaCalendarYear = state.chandrashtamaCalendarYear || currentSystemDate.getFullYear();
state.chandrashtamaCalendarMonth = state.chandrashtamaCalendarMonth || (currentSystemDate.getMonth() + 1);
state.calendarSidebarOpen = state.calendarSidebarOpen !== undefined ? state.calendarSidebarOpen : true;

// Saved Profiles & Left Sidebar State
const savedProfilesJson = localStorage.getItem('horoscope_saved_profiles');
let savedProfiles = [];
if (savedProfilesJson) {
    try {
        const parsed = JSON.parse(savedProfilesJson);
        if (Array.isArray(parsed)) {
            savedProfiles = parsed;
        }
    } catch (e) {
        console.error("Failed to parse saved profiles", e);
    }
}
state.savedProfiles = savedProfiles;
state.leftSidebarOpen = localStorage.getItem('horoscope_left_sidebar_open') !== null ? localStorage.getItem('horoscope_left_sidebar_open') === 'true' : true;
state.leftSidebarMini = localStorage.getItem('horoscope_left_sidebar_mini') === 'true';

// Localized strings for Left Navigation & Tools Sidebar
const leftSidebarTranslations = {
    ta: {
        title: "வேத ஜோதிட வழிகாட்டி",
        subtitle: "முக்கிய கருவிகள் & அம்சங்கள்",
        navigation: "பிரிவுகள்",
        navHoroscope: "ஜாதகம் கணித்தல்",
        navTransits: "கோச்சார கிரக நிலைகள்",
        navChandrashtama: "சந்திராஷ்டம விவரங்கள்",
        navTransitions: "கிரக பெயர்ச்சிகள்",
        navCalendar: "மாதாந்திர நாட்காட்டி",
        navTop: "பக்கத்தின் உச்சிக்கு செல்க",
        tools: "கருவிகள் & அமைப்புகள்",
        chartStyle: "கட்ட முறை",
        southIndian: "தெற்கு",
        northIndian: "வடக்கு",
        theme: "தோற்றம்",
        dark: "இருண்ட",
        light: "வெளிச்சம்",
        colors: "வண்ணத் தீம்",
        languages: "மொழி",
        savedProfiles: "சேமிக்கப்பட்ட ஜாதகங்கள்",
        noProfiles: "சேமிக்கப்பட்ட ஜாதகங்கள் இல்லை",
        saveCurrent: "+ தற்போதைய விவரங்களை சேமி",
        enterProfileName: "ஜாதகப் பெயரைக் குறிப்பிடவும்:",
        profileSaved: "ஜாதகம் வெற்றிகரமாக சேமிக்கப்பட்டது!",
        profileDeleted: "ஜாதகம் நீக்கப்பட்டது!",
        loadProfile: "ஏற்று",
        deleteProfile: "நீக்கு",
        zoom: "பக்க அளவு (Zoom)",
        expandSidebar: "பக்கப்பட்டையை விரித்து உரையை காட்டு",
        collapseSidebar: "பக்கப்பட்டையை சுருக்கு"
    },
    en: {
        title: "Vedic Astro Dashboard",
        subtitle: "Quick Tools & Navigation",
        navigation: "Navigation",
        navHoroscope: "Horoscope Calculator",
        navTransits: "Planetary Positions",
        navChandrashtama: "Chandrashtama Details",
        navTransitions: "Planet Transitions",
        navCalendar: "Monthly Calendar",
        navTop: "Scroll to Top",
        tools: "Tools & Settings",
        chartStyle: "Chart Style",
        southIndian: "South",
        northIndian: "North",
        theme: "Theme Mode",
        dark: "Dark",
        light: "Light",
        colors: "Accent Colors",
        languages: "Language",
        savedProfiles: "Saved Profiles",
        noProfiles: "No saved profiles yet",
        saveCurrent: "+ Save Current Profile",
        enterProfileName: "Enter a name for this profile:",
        profileSaved: "Profile saved successfully!",
        profileDeleted: "Profile deleted!",
        loadProfile: "Load",
        deleteProfile: "Delete",
        zoom: "Page Zoom",
        expandSidebar: "Expand Sidebar to Show Text",
        collapseSidebar: "Collapse to Mini"
    },
    hi: {
        title: "वैदिक ज्योतिष डैशबोर्ड",
        subtitle: "त्वरित उपकरण और नेविगेशन",
        navigation: "नेविगेशन",
        navHoroscope: "कुंडली जनरेटर",
        navTransits: "ग्रह स्थिति (गोचर)",
        navChandrashtama: "चंद्राष्टम विवरण",
        navTransitions: "ग्रह गोचर/परिवर्तन",
        navCalendar: "मासिक पंचांग",
        tools: "उपकरण और सेटिंग्स",
        chartStyle: "कुंडली प्रारूप",
        southIndian: "दक्षिण",
        northIndian: "उत्तर",
        theme: "थीम मोड",
        dark: "डार्क",
        light: "लाइट",
        colors: "रंग थीम",
        languages: "भाषा",
        savedProfiles: "सहेजे गए प्रोफाइल",
        noProfiles: "कोई सहेजा हुआ प्रोफाइल नहीं",
        saveCurrent: "+ वर्तमान प्रोफाइल सहेजें",
        enterProfileName: "इस प्रोफाइल के लिए एक नाम दर्ज करें:",
        profileSaved: "प्रोफाइल सफलतापूर्वक सहेजा गया!",
        profileDeleted: "प्रोफाइल हटाया गया!",
        loadProfile: "लोड करें",
        deleteProfile: "हटाएं",
        zoom: "पृष्ठ ज़ूम",
        expandSidebar: "टेक्स्ट देखने के लिए साइडबार फैलाएं",
        collapseSidebar: "छोटा करें"
    },
    te: {
        title: "వేద జ్యోతిష్య డాష్‌బోర్డ్",
        subtitle: "త్వరిత సాధనాలు & నావిగేషన్",
        navigation: "నావిగేషన్",
        navHoroscope: "జాతకం కాలిక్యులేటర్",
        navTransits: "గ్రహ స్థితులు",
        navChandrashtama: "చంద్రాష్టమ వివరాలు",
        navTransitions: "గ్రహ సంచారాలు",
        navCalendar: "నెలవారీ క్యాలెండర్",
        tools: "సాధనాలు & సెట్టింగ్‌లు",
        chartStyle: "చార్ట్ శైలి",
        southIndian: "దక్షిణ",
        northIndian: "ఉత్తర",
        theme: "థీమ్ మోడ్",
        dark: "డార్క్",
        light: "లైట్",
        colors: "రంగు థీమ్",
        languages: "భాష",
        savedProfiles: "సేవ్ చేసిన ప్రొఫైల్స్",
        noProfiles: "సేవ్ చేసిన ప్రొఫైల్స్ లేవు",
        saveCurrent: "+ ప్రస్తుత ప్రొఫైల్ సేవ్ చేయండి",
        enterProfileName: "ప్రొఫైల్ పేరు నమోదు చేయండి:",
        profileSaved: "ప్రొఫైల్ సేవ్ చేయబడింది!",
        profileDeleted: "ప్రొఫైల్ తొలగించబడింది!",
        loadProfile: "లోడ్",
        deleteProfile: "తొలగించు",
        zoom: "పేజీ జూమ్",
        expandSidebar: "టెక్స్ట్ చూపడానికి సైడ్‌బార్ విస్తరించండి",
        collapseSidebar: "కుదించండి"
    },
    kn: {
        title: "ವೈದಿಕ ಜ್ಯೋತಿಷ್ಯ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್",
        subtitle: "ತ್ವರಿತ ಉಪಕರಣಗಳು & ನ್ಯಾವಿಗೇಷನ್",
        navigation: "ನ್ಯಾವಿಗೇಷನ್",
        navHoroscope: "ಜಾತಕ ಕ್ಯಾಲ್ಕುಲೇಟರ್",
        navTransits: "ಗ್ರಹ ಸ್ಥಿತಿಗಳು",
        navChandrashtama: "ಚಂದ್ರಾಷ್ಟಮ ವಿವರಗಳು",
        navTransitions: "ಗ್ರಹ ಬದಲಾವಣೆಗಳು",
        navCalendar: "ಮಾಸಿಕ ಕ್ಯಾಲೆಂಡರ್",
        navTop: "ಮೇಲಕ್ಕೆ ಹೋಗಿ",
        tools: "ಉಪಕರಣಗಳು & ಸೆಟ್ಟಿಂಗ್‌ಗಳು",
        chartStyle: "ಚಾರ್ಟ್ ಶೈಲಿ",
        southIndian: "ದಕ್ಷಿಣ",
        northIndian: "ಉತ್ತರ",
        theme: "ಥೀಮ್ ಮೋಡ್",
        dark: "ಡಾರ್ಕ್",
        light: "ಲೈಟ್",
        colors: "ಬಣ್ಣದ ಥೀಮ್",
        languages: "ಭಾಷೆ",
        savedProfiles: "ಉಳಿಸಲಾದ ಪ್ರೊಫೈಲ್‌ಗಳು",
        noProfiles: "ಯಾವುದೇ ಪ್ರೊಫೈಲ್‌ಗಳಿಲ್ಲ",
        saveCurrent: "+ ಪ್ರಸ್ತುತ ಪ್ರೊಫೈಲ್ ಉಳಿಸಿ",
        enterProfileName: "ಪ್ರೊಫೈಲ್ ಹೆಸರು ನಮೂದಿಸಿ:",
        profileSaved: "ಪ್ರೊಫೈಲ್ ಉಳಿಸಲಾಗಿದೆ!",
        profileDeleted: "ಪ್ರೊಫೈಲ್ ಅಳಿಸಲಾಗಿದೆ!",
        loadProfile: "ಲೋಡ್",
        deleteProfile: "ಅಳಿಸಿ",
        zoom: "ಪುಟ ಜೂಮ್",
        expandSidebar: "ಪಠ್ಯವನ್ನು ತೋರಿಸಲು ಸೈಡ್‌ಬಾರ್ ವಿಸ್ತರಿಸಿ",
        collapseSidebar: "ಕುಗ್ಗಿಸಿ"
    },
    ml: {
        title: "വേദ ജ്യോതിഷ ഡാഷ്‌ബോർഡ്",
        subtitle: "ഉപകരണങ്ങളും നാവിഗേഷനും",
        navigation: "നാവിഗേഷൻ",
        navHoroscope: "ജാതകം കാൽക്കുലേറ്റർ",
        navTransits: "ഗ്രഹ നിലകൾ",
        navChandrashtama: "ചന്ദ്രാഷ്ടമം വിവരങ്ങൾ",
        navTransitions: "ഗ്രഹ മാറ്റങ്ങൾ",
        navCalendar: "പ്രതിമാസ കലണ്ടർ",
        navTop: "മുകളിലേക്ക് പോകുക",
        tools: "ഉപകരണങ്ങളും ക്രമീകരണങ്ങളും",
        chartStyle: "ചാർട്ട് ശൈലി",
        southIndian: "തെക്ക്",
        northIndian: "വടക്ക്",
        theme: "തീം മോഡ്",
        dark: "ഡാർക്ക്",
        light: "ലൈറ്റ്",
        colors: "വർണ്ണ തീം",
        languages: "ഭാഷ",
        savedProfiles: "സംരക്ഷിച്ച പ്രൊഫൈലുകൾ",
        noProfiles: "പ്രൊഫൈലുകൾ ലഭ്യമല്ല",
        saveCurrent: "+ നിലവിലെ പ്രൊഫൈൽ സൂക്ഷിക്കുക",
        enterProfileName: "പ്രൊഫൈൽ പേര് നൽകുക:",
        profileSaved: "പ്രൊഫൈൽ സംരക്ഷിച്ചു!",
        profileDeleted: "പ്രൊഫൈൽ നീക്കം ചെയ്തു!",
        loadProfile: "ലോഡ്",
        deleteProfile: "ഡിലീറ്റ്"
    }
};

// Persist Theme Preference
const savedTheme = localStorage.getItem('horoscope_app_theme');
if (savedTheme === 'dark') {
    document.body.classList.remove('light-mode');
} else if (savedTheme === 'light') {
    document.body.classList.add('light-mode');
}

// Load saved Accent Color or set default Bronze Gold
const savedAccent = localStorage.getItem('horoscope_app_accent');
let currentAccent = { primary: '#ca8a04', accent: '#ea580c' };
if (savedAccent) {
    try {
        const parsed = JSON.parse(savedAccent);
        if (parsed && parsed.primary && parsed.accent) {
            currentAccent = parsed;
        }
    } catch (e) {
        console.error("Failed to parse saved accent color", e);
    }
}
applyAccentColor(currentAccent.primary, currentAccent.accent);

// Load saved Chart Accent Color or set default Amber Orange
const savedChartAccent = localStorage.getItem('horoscope_app_chart_accent');
let currentChartAccent = '#d97706';
if (savedChartAccent) {
    currentChartAccent = savedChartAccent;
}
applyChartAccentColor(currentChartAccent);

// Main DOM mounting element
const root = document.querySelector('#app');

// App Initialization
function init() {
    render();
}

// Render Left Navigation & Tools Sidebar HTML
function renderLeftNavSidebarHtml(t, currentAccent, isLight) {
    const lang = state.lang;
    const ls = leftSidebarTranslations[lang] || leftSidebarTranslations['en'];

    return `
        <!-- Sidebar Header -->
        <div class="left-sidebar-header">
            <div class="left-sidebar-brand" style="${state.leftSidebarMini ? 'justify-content: center; width: 100%; cursor: pointer;' : ''}" title="${state.leftSidebarMini ? (ls.expandSidebar || 'Click to show text') : ''}">
                <div class="hide-in-mini">
                    <div style="line-height: 1.1; font-size: 13.5px; font-weight: 700;">${ls.title}</div>
                    <div style="font-size: 10px; font-weight: normal; color: var(--text-secondary);">${ls.subtitle}</div>
                </div>
            </div>
            <div style="display: flex; gap: 4px; align-items: center; ${state.leftSidebarMini ? 'display: none;' : ''}">
                <button type="button" id="close-left-sidebar-btn" class="left-sidebar-toggle-btn" title="${state.lang === 'ta' ? 'பக்கப்பட்டையை மூடு' : 'Close Sidebar'}">
                    ✕
                </button>
            </div>
        </div>

        ${state.leftSidebarMini ? `
        <div style="display: flex; justify-content: center; width: 100%; margin-top: -6px;">
            <button type="button" id="toggle-left-sidebar-mini-btn" class="left-sidebar-toggle-btn" style="width: 100%; height: 26px; font-size: 12px; font-weight: bold; background: var(--accent); color: #fff; border-color: var(--accent);" title="${ls.expandSidebar || 'Click to show text'}">
                ▶
            </button>
        </div>
        ` : ''}

        <!-- Navigation Section -->
        <div class="sidebar-navigation-section">
            <div class="sidebar-section-title">
                <span><span class="hide-in-mini">${ls.navigation}</span></span>
            </div>
            <div class="sidebar-nav-list">
                <a class="sidebar-nav-item ${state.view === 'form' ? 'active' : ''}" id="nav-link-horoscope" title="${ls.navHoroscope}" data-tooltip="${ls.navHoroscope}">
                    <span class="hide-in-mini">${ls.navHoroscope}</span>
                </a>
                <a class="sidebar-nav-item" id="nav-link-transits" title="${ls.navTransits}" data-tooltip="${ls.navTransits}">
                    <span class="hide-in-mini">${ls.navTransits}</span>
                </a>
                <a class="sidebar-nav-item" id="nav-link-chandrashtama" title="${ls.navChandrashtama}" data-tooltip="${ls.navChandrashtama}">
                    <span class="hide-in-mini">${ls.navChandrashtama}</span>
                </a>
                <a class="sidebar-nav-item" id="nav-link-transitions" title="${ls.navTransitions}" data-tooltip="${ls.navTransitions}">
                    <span class="hide-in-mini">${ls.navTransitions}</span>
                </a>
                <a class="sidebar-nav-item" id="nav-link-calendar" title="${ls.navCalendar}" data-tooltip="${ls.navCalendar}">
                    <span class="hide-in-mini">${ls.navCalendar}</span>
                </a>
            </div>
        </div>
    `;
}

// Render the application based on state
function render() {
    const t = translations[state.lang];
    
    // Apply global page zoom
    document.body.style.zoom = `${state.globalZoom || 100}%`;
    
    // Save only language and chart style preferences (not birth details history) to protect privacy
    const stateToSave = {
        lang: state.lang,
        chartStyle: state.chartStyle,
        globalZoom: state.globalZoom
    };
    localStorage.setItem('horoscope_app_state', JSON.stringify(stateToSave));
    const isLight = document.body.classList.contains('light-mode');
    localStorage.setItem('horoscope_app_theme', isLight ? 'light' : 'dark');
    
    let content = '';
    
    if (state.view === 'form') {
        content = renderFormView(t);
    } else {
        content = renderResultsView(t);
    }
    
    const scrollToTopLabels = {
        en: 'Scroll to Top',
        ta: 'மேலே செல்க',
        hi: 'शीर्ष पर जाएं',
        te: 'పైకి వెళ్ళండి',
        kn: 'ಮೇಲಕ್ಕೆ ಸ್ಕ್ರೋಲ್ ಮಾಡಿ',
        ml: 'മുകളിലേക്ക് സ്ക്രോൾ ചെയ്യുക'
    };
        const logoSubtitles = {
        en: 'Accurate Vedic Astrology Predictions',
        ta: 'துல்லியமான வேத ஜோதிட கணிப்புகள்',
        hi: 'सटीक वैदिक ज्योतिष भविष्यवाणियां',
        te: 'ఖచ్చితమైన వేద జ్యోతిష్య అంచనాలు',
        kn: 'ನಿಖರವಾದ ವೈದಿಕ ಜ್ಯೋತಿಷ್ಯ ಮುನ್ಸೂಚನೆಗಳು',
        ml: 'കൃത്യമായ വേദ ജ്യോതിഷ പ്രവചനങ്ങൾ'
    };
    const footerTexts = {
        en: 'Vedic Astrology Calculations. All Rights Reserved.',
        ta: 'வேத ஜோதிட கணிப்புகள். அனைத்து உரிமைகளும் பாதுகாக்கப்பட்டவை.',
        hi: 'वैदिक ज्योतिष गणना। सर्वाधिकार सुरक्षित।',
        te: 'వేద జ్యోతిష్య లెక్కలు. అన్ని హక్కులూ ప్రత్యేకించబడినవి.',
        kn: 'ವೈದಿಕ ಜ್ಯೋತಿಷ್ಯ ಲೆಕ್ಕಾಚಾರಗಳು. ಎಲ್ಲ ಹಕ್ಕುಗಳನ್ನು ಕಾಯ್ದಿರಿಸಲಾಗಿದೆ.',
        ml: 'വേദ ജ്യോതിഷ കണക്കുകൂട്ടലുകൾ. എല്ലാ അവകാശങ്ങളും നിക്ഷിപ്തം.'
    };

    const presets = [
        { name: 'Gold', primary: '#ca8a04', accent: '#ea580c' },
        { name: 'Green', primary: '#059669', accent: '#0d9488' },
        { name: 'Blue', primary: '#2563eb', accent: '#0284c7' },
        { name: 'Red', primary: '#dc2626', accent: '#e11d48' },
        { name: 'Purple', primary: '#7c3aed', accent: '#c084fc' }
    ];

    let presetsHtml = '';
    presets.forEach(p => {
        const isActive = currentAccent.primary.toLowerCase() === p.primary.toLowerCase();
        presetsHtml += `
            <button class="preset-color-dot${isActive ? ' active' : ''}" 
                    data-primary="${p.primary}" 
                    data-accent="${p.accent}" 
                    style="background: ${p.primary}; width: 28px; height: 28px; border-radius: 50%; border: 2px solid ${isActive ? 'var(--text-primary)' : 'transparent'}; cursor: pointer; transition: transform 0.2s, border-color 0.2s; padding: 0; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"
                    title="${p.name}">
            </button>
        `;
    });

    const leftSidebarHtml = renderLeftNavSidebarHtml(t, currentAccent, isLight);

    root.innerHTML = `
        <div class="app-dashboard-wrapper">
            <!-- Left Navigation & Tools Sidebar -->
            <aside class="app-left-sidebar ${state.leftSidebarOpen ? 'is-open' : 'is-closed'} ${state.leftSidebarMini ? 'is-mini' : ''}" id="app-left-sidebar">
                ${leftSidebarHtml}
            </aside>

            <!-- Main Workspace -->
            <div class="app-main-workspace">
                <header>
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <!-- Hamburger / Left Sidebar Toggle Button -->
                        <button class="lang-btn" id="header-toggle-left-sidebar-btn" style="height: 28px; width: 28px; padding: 0; display: inline-flex; align-items: center; justify-content: center; font-size: 15px; cursor: pointer; color: ${state.leftSidebarOpen ? 'var(--accent)' : 'var(--text-primary)'}; border-color: ${state.leftSidebarOpen ? 'var(--accent)' : 'var(--btn-secondary-border)'};" title="${state.lang === 'ta' ? 'பக்கப்பட்டை' : 'Toggle Left Sidebar'}">
                            ☰
                        </button>
                        <div class="logo-container" id="header-logo" style="cursor: pointer; display: flex; align-items: center; gap: 12px;">
                            <img src="./logo.png" alt="Logo" style="height: 44px; width: 44px; border-radius: 50%; border: 1.5px solid var(--accent); object-fit: cover;">
                            <div>
                                <h1>Horoscope Calculator</h1>
                                <p>${logoSubtitles[state.lang] || logoSubtitles['en']}</p>
                            </div>
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                        <!-- Global Page Zoom Widget (Visible on all pages) -->
                        <div style="display: inline-flex; align-items: center; gap: 4px; border: 1px solid var(--card-border); padding: 0 4px; background: var(--input-bg); height: 24px; box-sizing: border-box; font-family: inherit; border-radius: 4px;">
                            <button id="global-zoom-out-btn" style="width: 16px; height: 16px; border-radius: 50%; border: none; background: rgba(0,0,0,0.06); cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; color: var(--text-primary); transition: background 0.2s; padding: 0;" title="${state.lang === 'ta' ? 'அளவை குறை' : 'Zoom Out'}" ${state.globalZoom <= 70 ? 'disabled style="opacity:0.4; cursor:default;"' : ''}>
                                &minus;
                            </button>
                            <span style="font-size: 11px; font-weight: 600; min-width: 28px; text-align: center; color: var(--text-primary);">${state.globalZoom}%</span>
                            <button id="global-zoom-in-btn" style="width: 16px; height: 16px; border-radius: 50%; border: none; background: rgba(0,0,0,0.06); cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; color: var(--text-primary); transition: background 0.2s; padding: 0;" title="${state.lang === 'ta' ? 'அளவை பெருக்கு' : 'Zoom In'}" ${state.globalZoom >= 130 ? 'disabled style="opacity:0.4; cursor:default;"' : ''}>
                                +
                            </button>
                        </div>

                        <button class="lang-btn" id="toggle-theme-btn" style="width: 24px; height: 24px; border-radius: 0; padding: 0; display: inline-flex; align-items: center; justify-content: center;" title="${isLight ? 'Dark Mode' : 'Light Mode'}">
                            ${isLight ? 
                                `<svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" stroke-linecap="round" stroke-linejoin="round"></path></svg>` : 
                                `<svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" stroke-linecap="round" stroke-linejoin="round"></path></svg>`
                            }
                        </button>
                        
                        <!-- Accent Color Picker -->
                        <div style="position: relative; display: inline-block;">
                            <button class="lang-btn" id="accent-menu-btn" style="width: 24px; height: 24px; border-radius: 0; padding: 0; display: inline-flex; align-items: center; justify-content: center; color: var(--primary);" title="${(t.accentMenu && t.accentMenu.title) || 'Accent Color'}">
                                <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 21a9 9 0 100-18 9 9 0 000 18z" stroke-linecap="round" stroke-linejoin="round"></path>
                                    <path d="M7.5 10.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM11.5 7.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM16.5 9.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM15.5 14.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" fill="currentColor"></path>
                                </svg>
                            </button>
                            <div id="accent-dropdown" class="accent-dropdown-menu" style="display: none; position: absolute; top: 30px; right: 0; background: var(--card-bg); border: 1px solid var(--card-border); padding: 12px; width: 220px; box-shadow: var(--shadow); z-index: 1000; flex-direction: column; gap: 10px;">
                                <div style="font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">${(t.accentMenu && t.accentMenu.presets) || 'Preset Colors'}</div>
                                <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px;" id="preset-colors-container">
                                    ${presetsHtml}
                                </div>
                                <div style="border-top: 1px solid var(--card-border); margin-top: 6px; padding-top: 8px;">
                                    <div style="font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">${(t.accentMenu && t.accentMenu.custom) || 'Custom Color'}</div>
                                    <div style="display: flex; align-items: center; gap: 10px;">
                                        <input type="color" id="custom-accent-picker" style="border: 1px solid var(--card-border); background: none; width: 34px; height: 34px; padding: 0; cursor: pointer;" value="${currentAccent.primary}">
                                        <span style="font-size: 13px; font-family: monospace; color: var(--text-primary); font-weight: 600;" id="custom-color-value">${currentAccent.primary.toUpperCase()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <select class="lang-btn" id="lang-select" style="cursor: pointer; padding: 0 4px; height: 24px; font-size: 11px;">
                            <option value="en" ${state.lang === 'en' ? 'selected' : ''}>English</option>
                            <option value="ta" ${state.lang === 'ta' ? 'selected' : ''}>தமிழ்</option>
                            <option value="hi" ${state.lang === 'hi' ? 'selected' : ''}>हिन्दी</option>
                            <option value="te" ${state.lang === 'te' ? 'selected' : ''}>తెలుగు</option>
                            <option value="kn" ${state.lang === 'kn' ? 'selected' : ''}>ಕನ್ನಡ</option>
                            <option value="ml" ${state.lang === 'ml' ? 'selected' : ''}>മലയാളം</option>
                        </select>
                    </div>
                </header>
                <main>
                    ${content}
                </main>
                <footer>
                    <p>© ${new Date().getFullYear()} ${footerTexts[state.lang] || footerTexts['en']}</p>
                </footer>
            </div>
        </div>

        <!-- Mobile Drawer Backdrop for Left Sidebar -->
        <div id="left-sidebar-backdrop" class="left-sidebar-backdrop ${state.leftSidebarOpen ? 'active' : ''}"></div>

        <!-- Floating Scroll to Top Button -->
        <button type="button" id="scroll-to-top-btn" class="scroll-to-top-btn" title="${scrollToTopLabels[state.lang] || 'Scroll to top'}" aria-label="Scroll to top">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 15l-6-6-6 6"/>
            </svg>
        </button>
    `;
    
    bindEvents();
}


// Render the Input Form
function renderFormView(t) {
    const currentYear = new Date().getFullYear();
    
    // Day options (1-31)
    let daysHtml = `<option value="">${t.day}</option>`;
    for (let i = 1; i <= 31; i++) {
        daysHtml += `<option value="${i.toString().padStart(2, '0')}">${i}</option>`;
    }
    
    // Month options
    let monthsHtml = `<option value="">${t.month}</option>`;
    t.months.forEach((m, idx) => {
        monthsHtml += `<option value="${(idx + 1).toString().padStart(2, '0')}">${m}</option>`;
    });
    
    // Year options (1940 to currentYear + 5)
    let yearsHtml = `<option value="">${t.year}</option>`;
    for (let i = currentYear + 4; i >= 1940; i--) {
        yearsHtml += `<option value="${i}">${i}</option>`;
    }
    
    // Hour options (1-12)
    let hoursHtml = `<option value="">${t.hour}</option>`;
    for (let i = 1; i <= 12; i++) {
        hoursHtml += `<option value="${i.toString().padStart(2, '0')}">${i}</option>`;
    }
    
    // Minute options (0-59)
    let minutesHtml = `<option value="">${t.minute}</option>`;
    for (let i = 0; i < 60; i++) {
        minutesHtml += `<option value="${i.toString().padStart(2, '0')}">${i.toString().padStart(2, '0')}</option>`;
    }
    
    const formHtml = `
        <div class="card" id="form-card">
            <h2 class="card-title">${t.title}</h2>
            <p class="card-subtitle">${t.subtitle}</p>
            
            <form id="horoscope-form" onsubmit="return false;">
                <div class="form-grid">
                    <!-- Name -->
                    <div class="form-group">
                        <label for="input-name">${t.name} <span class="label-highlight">*</span></label>
                        <input type="text" id="input-name" placeholder="${t.namePlaceholder}" required>
                    </div>
                    
                    <!-- Gender -->
                    <div class="form-group">
                        <label for="input-gender">${t.gender} <span class="label-highlight">*</span></label>
                        <select id="input-gender" required>
                            <option value="male" selected>${t.male}</option>
                            <option value="female">${t.female}</option>
                        </select>
                    </div>
                    
                    <!-- Birth Place -->
                    <div class="form-group full-width autocomplete-container">
                        <label for="input-place">${t.birthPlace} <span class="label-highlight">*</span></label>
                        <div style="position: relative; display: flex; width: 100%;">
                            <input type="text" id="input-place" placeholder="${t.birthPlacePlaceholder}" autocomplete="off" required style="padding-right: 70px;">
                            <button type="button" id="locate-btn" title="${state.lang === 'ta' ? 'தற்போதைய இருப்பிடத்தைப் பயன்படுத்துக' : (state.lang === 'hi' ? 'वर्तमान स्थान का उपयोग करें' : (state.lang === 'te' ? 'ప్రస్తుత స్థానాన్ని ఉపయోగించండి' : (state.lang === 'kn' ? 'ಪ್ರಸ್ತುತ ಸ್ಥಳವನ್ನು ಬಳಸಿ' : (state.lang === 'ml' ? 'നിലവിലെ സ്ഥാനം ഉപയോഗിക്കുക' : 'Use Current Location'))))}">
                                <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="12" cy="12" r="9"></circle>
                                    <path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke-linecap="round"></path>
                                    <circle cx="12" cy="12" r="3" fill="currentColor"></circle>
                                </svg>
                            </button>
                            <button type="button" id="clear-place-btn">✕</button>
                        </div>
                        <ul class="suggestions-list" id="city-suggestions" style="display: none;"></ul>
                    </div>
                    
                    <!-- Birth Date -->
                    <div class="form-group full-width">
                        <label>${t.birthDate} <span class="label-highlight">*</span></label>
                        <div class="multi-select-grid">
                            <select id="select-day" required>
                                ${daysHtml}
                            </select>
                            <select id="select-month" required>
                                ${monthsHtml}
                            </select>
                            <select id="select-year" required>
                                ${yearsHtml}
                            </select>
                        </div>
                    </div>
                    
                    <!-- Birth Time -->
                    <div class="form-group full-width">
                        <label>${t.birthTime} <span class="label-highlight">*</span></label>
                        <div class="multi-select-grid">
                            <select id="select-hour" required>
                                ${hoursHtml}
                            </select>
                            <select id="select-minute" required>
                                ${minutesHtml}
                            </select>
                            <select id="select-ampm" required>
                                <option value="AM">AM</option>
                                <option value="PM" selected>PM</option>
                            </select>
                        </div>
                    </div>
                    
                    <!-- Submit Button -->
                    <div class="submit-btn-container">
                        <button type="submit" class="submit-btn" id="submit-btn">
                            <span>${t.calculateBtn}</span>
                            <svg fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                <path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                            </svg>
                        </button>
                        <button type="button" class="btn-secondary" id="live-btn">
                            <span>${state.lang === 'ta' ? 'இப்போதைய ஜாதகம் (Live)' : 'Live Horoscope'}</span>
                        </button>
                    </div>
                </div>
            </form>
        </div>
    `;

    // Calculate current transits (Planetary positions) for transit display
    const transitDateStr = state.transitDate;
    const transitTimeStr = `${state.transitTime}:00`;
    
    const [tHourStr, tMinStr] = state.transitTime.split(':');
    const tHour = parseInt(tHourStr, 10);
    const transitAmpm = tHour >= 12 ? 'PM' : 'AM';

    const currentTransit = calculateHoroscope({
        name: 'Kocharam',
        gender: 'male',
        dateStr: transitDateStr,
        timeStr: transitTimeStr,
        lat: state.transitLatitude,
        lon: state.transitLongitude,
        fatherName: '',
        motherName: '',
        ampm: transitAmpm,
        city: state.transitLocationName
    });
    
    const displayTransitDate = new Date(`${transitDateStr}T${state.transitTime}`).toLocaleDateString();
    const displayTransitTime = new Date(`${transitDateStr}T${state.transitTime}`).toLocaleTimeString();
    
    const sectionTitle = state.lang === 'ta' ? 'தற்போதைய கோச்சார கிரக நிலைகள்' : 'Current Planetary Positions';
    const locationSubtitle = state.lang === 'ta' 
        ? `கணிப்பு இடம்: ${state.transitLocationName} (${state.transitLatitude.toFixed(2)}° N, ${state.transitLongitude.toFixed(2)}° E)`
        : `Calculated for: ${state.transitLocationName} (${state.transitLatitude.toFixed(2)}° N, ${state.transitLongitude.toFixed(2)}° E)`;
    
    const transitMoonStarName = state.lang === 'ta' ? t.stars[currentTransit.panchang.starIdx] : translations['en'].stars[currentTransit.panchang.starIdx];
    const transitStarPadaText = `${transitMoonStarName}-${currentTransit.panchang.pada}`;
    
    const transitRasiGridHtml = state.chartStyle === 'north'
        ? renderNorthChartGrid(currentTransit.planets, false, t)
        : renderChartGrid(
            currentTransit.planets,
            false,
            t,
            transitStarPadaText,
            state.lang === 'ta' ? 'கோச்சாரம்' : 'Kocharam',
            `${transitDateStr.split('-').reverse().join('-')} ${state.transitTime} ${transitAmpm}`,
            state.transitLatitude.toFixed(2),
            state.transitLongitude.toFixed(2),
            state.transitLocationName
          );
        const transitNavamsamGridHtml = state.chartStyle === 'north'
                ? renderNorthChartGrid(currentTransit.planets, true, t)
                : renderChartGrid(
                        currentTransit.planets,
                        true,
                        t,
                        transitStarPadaText,
                        state.lang === 'ta' ? 'கோச்சாரம்' : 'Kocharam',
                        `${transitDateStr.split('-').reverse().join('-')} ${state.transitTime} ${transitAmpm}`,
                        state.transitLatitude.toFixed(2),
                        state.transitLongitude.toFixed(2),
                        state.transitLocationName
                    );

    const transitAspectMapHtml = renderAspectMatrixHtml(currentTransit.planets, t, state.lang);

    const transitCardHtml = `
        <div class="card" id="planetary-positions-card" style="display: flex; flex-direction: column; gap: 30px; align-items: center;">
            <div style="width: 100%;">
                <h2 class="card-title" style="font-size: 22px; margin-bottom: 5px; text-align: left;">${sectionTitle}</h2>
                
                <!-- Separate Calendar and Location Controls for Transits -->
                <div class="transit-controls" style="display: flex; gap: 15px; flex-wrap: wrap; margin-top: 15px; margin-bottom: 20px; padding: 15px; background: rgba(0,0,0,0.02); border: 1px solid var(--card-border); border-radius: 8px; width: 100%; box-sizing: border-box; align-items: flex-end;">
                    <div style="flex: 1; min-width: 150px; display: flex; flex-direction: column; gap: 6px;">
                        <label style="font-size: 12px; font-weight: 600; color: var(--text-secondary);">${state.lang === 'ta' ? 'தேதி' : 'Date'}</label>
                        <input type="date" id="transit-date-input" value="${state.transitDate}" style="padding: 8px 12px; border-radius: 6px; border: 1px solid var(--card-border); background: var(--card-bg); color: var(--text-primary); width: 100%; box-sizing: border-box; font-family: inherit;">
                    </div>
                    <div style="flex: 1; min-width: 120px; display: flex; flex-direction: column; gap: 6px;">
                        <label style="font-size: 12px; font-weight: 600; color: var(--text-secondary);">${state.lang === 'ta' ? 'நேரம்' : 'Time'}</label>
                        <input type="time" id="transit-time-input" value="${state.transitTime}" style="padding: 8px 12px; border-radius: 6px; border: 1px solid var(--card-border); background: var(--card-bg); color: var(--text-primary); width: 100%; box-sizing: border-box; font-family: inherit;">
                    </div>
                    <div style="flex: 2; min-width: 240px; display: flex; flex-direction: column; gap: 6px; position: relative;">
                        <label style="font-size: 12px; font-weight: 600; color: var(--text-secondary);">${state.lang === 'ta' ? 'கணிப்பு இடம்' : 'Location'}</label>
                        <div style="position: relative; display: flex; align-items: center; width: 100%;">
                            <input type="text" id="transit-location-input" value="${state.transitLocationName}" placeholder="${state.lang === 'ta' ? 'இடத்தைத் தட்டச்சு செய்க...' : 'Search city...'}" style="padding: 8px 36px 8px 12px; border-radius: 6px; border: 1px solid var(--card-border); background: var(--card-bg); color: var(--text-primary); width: 100%; box-sizing: border-box; font-family: inherit;" autocomplete="off">
                            <button id="transit-locate-btn" type="button" style="position: absolute; right: 8px; background: none; border: none; cursor: pointer; color: var(--accent); width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; padding: 0;" title="${state.lang === 'ta' ? 'தற்போதைய இருப்பிடம்' : 'Use Current Location'}">
                                <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="12" cy="12" r="9"></circle>
                                    <path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke-linecap="round"></path>
                                    <circle cx="12" cy="12" r="3" fill="currentColor"></circle>
                                </svg>
                            </button>
                        </div>
                        <ul id="transit-suggestions-dropdown" class="suggestions-list" style="display: none; position: absolute; top: 62px; left: 0; right: 0; z-index: 1000; width: 100%;"></ul>
                    </div>
                </div>

                <p style="font-size: 13px; color: var(--text-secondary); margin: 0 0 15px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                    <span>${locationSubtitle}</span>
                    <span>${displayTransitTime} (${displayTransitDate})</span>
                </p>
            </div>
            
            <!-- Charts Section (Rasi Chart + Aspect Map) -->
            <div style="display: flex; flex-wrap: wrap; gap: 30px; justify-content: center; width: 100%; align-items: start;">
                <!-- Rasi Chart -->
                <div class="chart-box" style="padding: 0; align-items: center; max-width: 380px; width: 100%; display: flex; flex-direction: column; justify-content: center;">
                    <div class="chart-title-header" style="font-size: 18px; margin-bottom: 15px;">${state.lang === 'ta' ? 'கோச்சார இராசி கட்டம் (Transit Rasi)' : 'Transit Rasi Chart (D-1)'}</div>
                    ${state.chartStyle === 'north'
                        ? transitRasiGridHtml
                        : `<div class="chart-grid rasi-theme" style="width: 100%;">${transitRasiGridHtml}</div>`
                    }
                </div>

                <!-- Navamsa Chart -->
                <div class="chart-box" style="padding: 0; align-items: center; max-width: 380px; width: 100%; display: flex; flex-direction: column; justify-content: center;">
                    <div class="chart-title-header" style="font-size: 18px; margin-bottom: 15px;">${state.lang === 'ta' ? 'கோச்சார நவாம்சக் கட்டம் (Transit Navamsa)' : 'Transit Navamsa Chart (D-9)'}</div>
                    ${state.chartStyle === 'north'
                        ? transitNavamsamGridHtml
                        : `<div class="chart-grid nav-theme" style="width: 100%;">${transitNavamsamGridHtml}</div>`
                    }
                </div>
                
                <!-- Aspect Map -->
                ${transitAspectMapHtml}
            </div>
        </div>
    `;
    
    const chandrashtamaCardHtml = renderChandrashtamaCardHtml(currentTransit, t);
    const planetTransitionsCardHtml = renderPlanetTransitionsCardHtml(currentTransit, t);
    const monthlyCalendarCardHtml = renderMonthlyCalendarCardHtml(currentTransit, t);
    
    return `
        <div style="display: flex; flex-direction: column; gap: var(--space-xl); width: 100%;">
            ${formHtml}
            ${transitCardHtml}
            ${chandrashtamaCardHtml}
            ${planetTransitionsCardHtml}
            ${monthlyCalendarCardHtml}
        </div>
    `;
}

// Render Chandrashtama Card with Rasi Selector, Star & Pada Mapping, and Accurate Upcoming Dates
function renderChandrashtamaCardHtml(currentTransit, t) {
    const lang = state.lang;
    
    // Current Transit Moon Info
    const moonPlanet = currentTransit.planets.find(p => p.name === 'Moon');
    const moonLon = moonPlanet ? moonPlanet.longitude : 0;
    const transitMoonRasiIdx = getRasiSignIndex(moonLon);
    const transitMoonStar = getStarAndPada(moonLon);
    
    const affectedJanmaRasiIdx = getJanmaRasiForTransitMoonRasi(transitMoonRasiIdx);
    
    // Selected Rasi (defaults to currently active sign if undefined)
    const selectedRasiIdx = (state.chandrashtamaSelectedRasi !== undefined) ? state.chandrashtamaSelectedRasi : affectedJanmaRasiIdx;
    
    const selectedRasiKey = signKeys[selectedRasiIdx];
    
    const eighthHouseIdx = getChandrashtamaRasiForJanmaRasi(selectedRasiIdx);
    
    const transitMoonRasiName = lang === 'ta' ? t.signs[signKeys[transitMoonRasiIdx]] : translations['en'].signs[signKeys[transitMoonRasiIdx]];
    const transitMoonStarName = lang === 'ta' ? t.stars[transitMoonStar.starIdx] : translations['en'].stars[transitMoonStar.starIdx];
    
    const formatDateTimeReadable = (d) => {
        const dateStr = d.toLocaleDateString(lang === 'ta' ? 'ta-IN' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' });
        const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return `${dateStr}, ${timeStr}`;
    };
    
    // Calculate upcoming Chandrashtama periods for selected Rasi
    const upcomingPeriods = calculateUpcomingChandrashtamaForRasi(selectedRasiIdx, state.transitDate, 75);
    const activeOrNextPeriod = upcomingPeriods.length > 0 ? upcomingPeriods[0] : null;
    const nowMs = new Date(`${state.transitDate}T${state.transitTime}:00`).getTime();
    
    // Stars in selected Rasi and 8th House Rasi
    const starsInSelected = getStarsInRasi(selectedRasiIdx);
    
    const padaLength = 30 / 9; // 3.3333333333333335 deg
    const eighthRasiStartLon = eighthHouseIdx * 30;
    
    // Build accurate per-pada rows with exact timings and clear columns
    let padaRasiIndex = 0;
    let starPadaRowsHtml = '';
    
    starsInSelected.forEach((s) => {
        const sName = lang === 'ta' ? t.stars[s.starIdx] : translations['en'].stars[s.starIdx];
        const padasCount = s.padas.length;
        
        s.padas.forEach((padaNum, pIdx) => {
            const currentPadaIdx = padaRasiIndex;
            padaRasiIndex++;
            
            let pStartStr = '-';
            let pEndStr = '-';
            let isPadaActive = false;
            
            if (activeOrNextPeriod) {
                const targetLonStart = eighthRasiStartLon + currentPadaIdx * padaLength;
                const targetLonEnd = eighthRasiStartLon + (currentPadaIdx + 1) * padaLength;
                
                let pStart = activeOrNextPeriod.start;
                if (currentPadaIdx > 0) {
                    pStart = findMoonLongitudeTime(activeOrNextPeriod.start, activeOrNextPeriod.end, targetLonStart);
                }
                
                let pEnd = activeOrNextPeriod.end;
                if (currentPadaIdx < 8) {
                    pEnd = findMoonLongitudeTime(activeOrNextPeriod.start, activeOrNextPeriod.end, targetLonEnd);
                }
                
                isPadaActive = nowMs >= pStart.getTime() && nowMs <= pEnd.getTime();
                pStartStr = formatDateTimeReadable(pStart);
                pEndStr = formatDateTimeReadable(pEnd);
            }
            
            const isLastPadaOfStar = (pIdx === padasCount - 1);
            const rowBorderBottom = isLastPadaOfStar ? '2px solid var(--card-border)' : '1px solid rgba(0,0,0,0.04)';
            const rowBg = isPadaActive ? 'background: rgba(239, 68, 68, 0.08);' : '';
            
            starPadaRowsHtml += `
                <tr style="border-bottom: ${rowBorderBottom}; ${rowBg}">
                    ${pIdx === 0 ? `
                        <td rowspan="${padasCount}" style="padding: 14px 16px; font-weight: 700; font-size: 15px; color: var(--accent); vertical-align: middle; border-right: 1.5px solid var(--card-border); background: rgba(0,0,0,0.015);">
                            <div>${sName}</div>
                        </td>
                    ` : ''}
                    <td style="padding: 10px 12px; text-align: center; vertical-align: middle; border-right: 1px solid var(--card-border);">
                        <span style="font-weight: 600; font-size: 13px; color: var(--text-primary); background: var(--card-bg); border: 1px solid var(--card-border); padding: 3px 8px; border-radius: 4px; display: inline-block;">
                            ${padaNum}${lang === 'ta' ? '-ம் பாதம்' : ' Pada'}
                        </span>
                    </td>
                    <td style="padding: 10px 14px; vertical-align: middle; font-weight: 600; color: ${isPadaActive ? '#ef4444' : 'var(--text-primary)'}; font-size: 13.5px;">
                        ${pStartStr}
                    </td>
                    <td style="padding: 10px 14px; vertical-align: middle; font-weight: 600; color: ${isPadaActive ? '#ef4444' : 'var(--text-primary)'}; font-size: 13.5px;">
                        ${pEndStr}
                    </td>
                </tr>
            `;
        });
    });
    
    // Rasi Selector Pills
    let rasiPillsHtml = '<div class="rasi-selector-container" style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; margin-bottom: 16px;">';
    for (let i = 0; i < 12; i++) {
        const rKey = signKeys[i];
        const rName = lang === 'ta' ? t.signs[rKey] : translations['en'].signs[rKey];
        const isSel = i === selectedRasiIdx;
        const isAct = i === affectedJanmaRasiIdx;
        
        rasiPillsHtml += `
            <button type="button" class="rasi-select-pill ${isSel ? 'selected' : ''} ${isAct ? 'current-chandrashtama' : ''}" data-rasi="${i}">
                ${rName}
            </button>
        `;
    }
    rasiPillsHtml += '</div>';

    const title = lang === 'ta' ? 'சந்திராஷ்டம விவரங்கள் (நட்சத்திர & பாத வாரியாக)' : 'Chandrashtama Details (Star & Pada-wise)';
    const subtitle = lang === 'ta' ? 'ராசியைத் தேர்ந்தெடுத்து நட்சத்திர & பாத வாரியான சந்திராஷ்டம ஆரம்பம்/முடிவு தேதிகளை அறியவும்' : 'Select your Rasi to view star & pada-wise Chandrashtama dates and timings';

    return `
        <div class="card" id="chandrashtama-card">
            <div style="width: 100%;">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 8px;">
                    <div>
                        <h2 class="card-title" style="font-size: 20px; margin-bottom: 3px; text-align: left;">${title}</h2>
                        <p style="font-size: 13px; color: var(--text-secondary); margin: 0; text-align: left;">${subtitle}</p>
                        <label style="display: inline-flex; align-items: center; gap: 8px; margin-top: 10px; font-size: 12px; color: var(--text-secondary);">
                            ${lang === 'ta' ? 'தேதி' : 'Date'}
                            <input type="date" id="chandrashtama-date-input" value="${state.transitDate}" style="height: 30px; padding: 3px 8px; border: 1px solid var(--card-border); border-radius: 4px; background: var(--card-bg); color: var(--text-primary);">
                        </label>
                        <p style="font-size: 12px; color: var(--text-secondary); margin: 6px 0 0; text-align: left;">
                            ${lang === 'ta' ? 'நேரம்' : 'Time'}: ${state.transitTime}
                            <span style="margin: 0 8px; opacity: 0.6;">•</span>
                            ${lang === 'ta' ? 'இடம்' : 'Place'}: ${state.transitLocationName}
                        </p>
                    </div>
                    <div style="font-size: 12px; background: rgba(0,0,0,0.03); border: 1px solid var(--card-border); padding: 5px 12px; border-radius: 20px; color: var(--text-secondary);">
                        ${lang === 'ta' ? 'கோச்சார சந்திரன்' : 'Transit Moon'}: <strong style="color: var(--accent);">${transitMoonRasiName} (${(moonLon % 30).toFixed(2)}°)</strong> - <span style="color: var(--text-primary); font-weight: 500;">${transitMoonStarName} (${transitMoonStar.pada}-ம் பாதம்)</span>
                    </div>
                </div>

                <!-- 12 Rasi Selector -->
                ${rasiPillsHtml}

                <!-- Selected Sign Overview Card with Star & Pada Mapping and Dates -->
                <div style="display: flex; flex-direction: column; gap: 14px; padding: 16px 18px; background: rgba(0,0,0,0.02); border: 1px solid var(--card-border); border-radius: 10px;">
                    <!-- Star & Pada Mapping Table with Dates -->
                    <div>
                        <div style="font-size: 13px; font-weight: 700; color: var(--text-primary); margin-bottom: 8px;">
                            ${lang === 'ta' ? 'நட்சத்திர & பாத வாரியான சந்திராஷ்டம தேதிகள் மற்றும் நேரங்கள்' : 'Star & Pada-wise Chandrashtama Dates and Timings'}:
                        </div>
                        <div class="table-container" style="margin: 0;">
                            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                                <thead>
                                    <tr style="background: rgba(0,0,0,0.04); border-bottom: 2px solid var(--card-border);">
                                        <th style="padding: 12px 14px; text-align: left; width: 22%;">${lang === 'ta' ? 'நட்சத்திரம்' : 'Nakshatra'}</th>
                                        <th style="padding: 12px 12px; text-align: center; width: 14%;">${lang === 'ta' ? 'பாதம்' : 'Pada'}</th>
                                        <th style="padding: 12px 14px; text-align: left; width: 27%;">${lang === 'ta' ? 'ஆரம்ப நேரம்' : 'Start Time'}</th>
                                        <th style="padding: 12px 14px; text-align: left; width: 27%;">${lang === 'ta' ? 'முடிவு நேரம்' : 'End Time'}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${starPadaRowsHtml}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Render Planet Transitions (கிரகப் பெயர்ச்சிகள்) Card
function renderPlanetTransitionsCardHtml(currentTransit, t) {
    const lang = state.lang;
    const baseDate = new Date(`${state.transitDate}T${state.transitTime}:00`);
    const transitions = calculateNextPlanetTransitions(baseDate);
    
    const filteredTransitions = transitions;
    
    const planetColors = {
        Sun: '#f59e0b', Moon: '#a1a1aa', Mars: '#ef4444', Mercury: '#10b981',
        Jupiter: '#fbbf24', Venus: '#ec4899', Saturn: '#3b82f6', Rahu: '#8b5cf6', Ketu: '#d97706'
    };
    
    const formatDateTime = (d) => {
        const dateStr = d.toLocaleDateString(lang === 'ta' ? 'ta-IN' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' });
        const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return `${dateStr}, ${timeStr}`;
    };
    
    // Format human-friendly time remaining
    const formatTimeRemaining = (diffDays) => {
        if (diffDays < 1) {
            const hrs = Math.max(1, Math.round(diffDays * 24));
            return lang === 'ta' ? `இன்னும் ${hrs} மணி நேரத்தில்` : `In ${hrs} hours`;
        }
        const days = Math.round(diffDays);
        if (days === 1) {
            return lang === 'ta' ? 'நாளை' : 'Tomorrow (1 day)';
        }
        if (days > 365) {
            const yrs = (days / 365.25).toFixed(1);
            return lang === 'ta' ? `இன்னும் ~${yrs} ஆண்டுகளில்` : `In ~${yrs} years`;
        }
        if (days > 30) {
            const months = (days / 30.4).toFixed(1);
            return lang === 'ta' ? `இன்னும் ~${months} மாதங்களில்` : `In ~${months} months`;
        }
        return lang === 'ta' ? `இன்னும் ${days} நாட்களில்` : `In ${days} days`;
    };

    // Rows
    let rowsHtml = '';
    filteredTransitions.forEach(tr => {
        const pName = lang === 'ta' ? t.planets[tr.name] : translations['en'].planets[tr.name];
        const pNameEng = translations['en'].planets[tr.name];
        const color = planetColors[tr.name] || 'var(--accent)';
        
        const curRasiName = lang === 'ta' ? t.signs[signKeys[tr.currentRasi]] : translations['en'].signs[signKeys[tr.currentRasi]];
        const curDeg = (tr.currentLongitude % 30).toFixed(1);
        const curStarName = lang === 'ta' ? t.stars[tr.currentStar.starIdx] : translations['en'].stars[tr.currentStar.starIdx];
        
        const nextRasiName = lang === 'ta' ? t.signs[signKeys[tr.nextRasi]] : translations['en'].signs[signKeys[tr.nextRasi]];
        const nextRasiEng = translations['en'].signs[signKeys[tr.nextRasi]];
        const nextStarName = lang === 'ta' ? t.stars[tr.nextStar.starIdx] : translations['en'].stars[tr.nextStar.starIdx];
        
        const isSoon = tr.diffDays <= 7;
        const timeRemainingText = formatTimeRemaining(tr.diffDays);
        
        rowsHtml += `
            <tr style="border-bottom: 1px solid var(--card-border); ${isSoon ? 'background: rgba(202, 138, 4, 0.04);' : ''}">
                <td style="padding: 12px 14px; vertical-align: middle;">
                    <div>
                        <div style="font-weight: 700; font-size: 14.5px; color: ${color};">${pName}</div>
                        <div style="font-size: 11px; color: var(--text-secondary);">${pNameEng} ${tr.isMajor ? `<span style="color:#ef4444; font-weight:600;">• ${lang === 'ta' ? 'முக்கிய கிரகம்' : 'Major'}</span>` : ''}</div>
                    </div>
                </td>
                <td style="padding: 12px 14px; vertical-align: middle;">
                    <div style="font-weight: 600; color: var(--text-primary); font-size: 13.5px;">
                        ${curRasiName} <span style="font-size: 11.5px; font-weight: normal; color: var(--text-secondary);">(${curDeg}°)</span>
                    </div>
                    <div style="font-size: 11.5px; color: var(--text-secondary); margin-top: 2px;">
                        ${curStarName} (${tr.currentStar.pada}-ம் பாதம்)
                    </div>
                </td>
                <td style="padding: 12px 14px; vertical-align: middle;">
                    <div style="font-weight: 700; color: #ef4444; font-size: 14px; display: flex; align-items: center; gap: 6px;">
                        <span style="font-size: 15px;">➔</span> ${nextRasiName} <span style="font-size: 11.5px; font-weight: normal; color: var(--text-secondary);">(${nextRasiEng})</span>
                    </div>
                    <div style="font-size: 11.5px; color: var(--text-secondary); margin-top: 2px;">
                        ${nextStarName} (${tr.nextStar.pada}-ம் பாதம்)
                    </div>
                </td>
                <td style="padding: 12px 14px; vertical-align: middle; font-weight: 600; color: var(--text-primary); font-size: 13px;">
                    <div>${formatDateTime(tr.transitionDate)}</div>
                </td>
                <td style="padding: 12px 14px; text-align: center; vertical-align: middle;">
                    <span style="font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 20px; display: inline-block; ${isSoon ? 'background: rgba(239, 68, 68, 0.12); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3);' : 'background: rgba(0,0,0,0.04); color: var(--text-primary); border: 1px solid var(--card-border);'}">
                        ${timeRemainingText}
                    </span>
                </td>
            </tr>
        `;
    });

    const title = lang === 'ta' ? 'கிரகப் பெயர்ச்சிகள் (ராசி சஞ்சாரம்)' : 'Planet Transitions (Rasi Ingress)';
    const subtitle = lang === 'ta' ? 'அனைத்து 9 கிரகங்களின் அடுத்த ராசி பெயர்ச்சி தேதிகள், நேரங்கள் மற்றும் கால அவகாசம்' : 'Upcoming sign ingress dates, exact timings and remaining time for all 9 planets';

    return `
        <div class="card" id="planet-transitions-card" style="margin-top: 20px;">
            <div style="width: 100%;">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 12px;">
                    <div>
                        <h2 class="card-title" style="font-size: 20px; margin-bottom: 3px; text-align: left;">${title}</h2>
                        <p style="font-size: 13px; color: var(--text-secondary); margin: 0; text-align: left;">${subtitle}</p>
                        <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px;">
                            <label style="display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-secondary);">
                                ${lang === 'ta' ? 'தேதி' : 'Date'}
                                <input type="date" id="transitions-date-input" value="${state.transitDate}" style="height: 30px; padding: 3px 8px; border: 1px solid var(--card-border); border-radius: 4px; background: var(--card-bg); color: var(--text-primary);">
                            </label>
                            <label style="display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-secondary);">
                                ${lang === 'ta' ? 'நேரம்' : 'Time'}
                                <input type="time" id="transitions-time-input" value="${state.transitTime}" style="height: 30px; padding: 3px 8px; border: 1px solid var(--card-border); border-radius: 4px; background: var(--card-bg); color: var(--text-primary);">
                            </label>
                            <label style="display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-secondary);">
                                ${lang === 'ta' ? 'இடம்' : 'Location'}
                                <input type="text" id="transitions-location-input" value="${state.transitLocationName}" placeholder="${lang === 'ta' ? 'இடத்தைத் தேடுக' : 'Search location'}" autocomplete="off" style="height: 30px; min-width: 190px; padding: 3px 8px; border: 1px solid var(--card-border); border-radius: 4px; background: var(--card-bg); color: var(--text-primary);">
                            </label>
                            <button type="button" id="transitions-today-btn" style="height: 30px; padding: 3px 12px; border: 1px solid var(--card-border); border-radius: 4px; background: var(--card-bg); color: var(--accent); cursor: pointer; font-weight: 600;">
                                ${lang === 'ta' ? 'இன்று' : 'Today'}
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Planet Transitions Table -->
                <div class="table-container" style="margin: 0;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                        <thead>
                            <tr style="background: rgba(0,0,0,0.04); border-bottom: 2px solid var(--card-border);">
                                <th style="padding: 12px 14px; text-align: left; width: 22%;">${lang === 'ta' ? 'கிரகம்' : 'Planet'}</th>
                                <th style="padding: 12px 14px; text-align: left; width: 22%;">${lang === 'ta' ? 'தற்போதைய ராசி' : 'Current House'}</th>
                                <th style="padding: 12px 14px; text-align: left; width: 22%;">${lang === 'ta' ? 'பெயர்ச்சி அடையும் ராசி' : 'Moving to House'}</th>
                                <th style="padding: 12px 14px; text-align: left; width: 20%;">${lang === 'ta' ? 'பெயர்ச்சி தேதி & நேரம்' : 'Transition Date & Time'}</th>
                                <th style="padding: 12px 14px; text-align: center; width: 14%;">${lang === 'ta' ? 'கால அவகாசம்' : 'Time Remaining'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rowsHtml}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

// Render Monthly Vedic Astrology Calendar for Global Sidebar
function renderMonthlyCalendarCardHtml(currentTransit, t) {
    const lang = state.lang;
    
    const year = state.chandrashtamaCalendarYear || new Date().getFullYear();
    const month = state.chandrashtamaCalendarMonth || (new Date().getMonth() + 1); // 1-12
    
    // Day of week strings
    const weekDays = {
        ta: ["ஞாயிறு", "திங்கள்", "செவ்வாய்", "புதன்", "வியாழன்", "வெள்ளி", "சனி"],
        en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        hi: ["रविवार", "सोमवार", "मंगलवार", "बुधवार", "गुरुवार", "शुक्रवार", "शनिवार"],
        te: ["ఆదివారం", "సోమవారం", "మంగళవారం", "బుధవారం", "గురువారం", "శుక్రవారం", "శనివారం"],
        kn: ["ಭಾನುವಾರ", "ಸೋಮವಾರ", "ಮಂಗಳವಾರ", "ಬುಧವಾರ", "ಗುರುವಾರ", "ಶುಕ್ರವಾರ", "ಶನಿವಾರ"],
        ml: ["ഞായർ", "തിങ്കൾ", "ചൊവ്വ", "ബുധൻ", "വ്യാഴം", "വെള്ളി", "ശനി"]
    };
    const weekDaysShort = {
        ta: ["ஞா", "திங்", "செவ்", "புதன்", "வியா", "வெள்", "சனி"],
        en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
        hi: ["रवि", "सोम", "मंगल", "बुध", "गुरु", "शुक्र", "शनि"],
        te: ["ఆది", "సోమ", "మంగళ", "బుధ", "గురు", "శుక్ర", "శని"],
        kn: ["ಭಾನು", "ಸೋಮ", "ಮಂಗಳ", "ಬುಧ", "ಗುರು", "ಶುಕ್ರ", "ಶನಿ"],
        ml: ["ഞായർ", "തിങ്കൾ", "ചൊവ്വ", "ബുധൻ", "വ്യാഴം", "വെള്ളി", "ശനി"]
    };
    const daysHeaderFull = weekDays[lang] || weekDays['en'];
    const daysHeaderShort = weekDaysShort[lang] || weekDaysShort['en'];
    
    // Month Names
    const monthNames = {
        ta: ["ஜனவரி", "பிப்ரவரி", "மார்ச்", "ஏப்ரல்", "மே", "ஜூன்", "ஜூலை", "ஆகஸ்ட்", "செப்டம்பர்", "அக்டோபர்", "நவம்பர்", "டிசம்பர்"],
        en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
        hi: ["जनवरी", "फ़रवरी", "मार्च", "अप्रैल", "मई", "जून", "जुलाई", "अगस्त", "सितंबर", "अक्टूबर", "नवंबर", "दिसंबर"],
        te: ["జనవరి", "ఫిబ్రవరి", "మార్చి", "ఏప్రిల్", "మే", "జూన్", "జూలై", "ఆగస్టు", "సెప్టెంబర్", "అక్టోబర్", "నవంబర్", "డిసెంబర్"],
        kn: ["ಜನವರಿ", "ಫೆಬ್ರವರಿ", "ಮಾರ್ಚ್", "ಏಪ್ರಿಲ್", "ಮೇ", "ಜೂನ್", "ಜುಲೈ", "ಆಗಸ್ಟ್", "ಸೆಪ್ಟೆಂಬರ್", "ಅಕ್ಟೋಬರ್", "ನವೆಂಬರ್", "ಡಿಸೆಂಬರ್"],
        ml: ["ജനുവരി", "ഫെബ്രുവരി", "മാർച്ച്", "മേയ്", "ജൂൺ", "ജൂലൈ", "ഓഗസ്റ്റ്", "സെപ്റ്റംബർ", "ഒക്ടോബർ", "നവംബർ", "ഡിസംബർ"]
    };

    // Tithi Names
    const tithiList = [
        { ta: "பிரதமை", en: "Shukla 1" }, { ta: "துவிதியை", en: "Shukla 2" }, { ta: "திருதியை", en: "Shukla 3" }, { ta: "சதுர்த்தி", en: "Shukla 4" }, { ta: "பஞ்சமி", en: "Shukla 5" }, { ta: "சஷ்டி", en: "Shukla 6" }, { ta: "சப்தமி", en: "Shukla 7" }, { ta: "அஷ்டமி", en: "Shukla 8" }, { ta: "நவமி", en: "Shukla 9" }, { ta: "தசமி", en: "Shukla 10" },
        { ta: "ஏகாதசி", en: "Ekadashi" }, { ta: "துவாதசி", en: "Dwadashi" }, { ta: "திரயோதசி", en: "Trayodashi" }, { ta: "சதுர்தசி", en: "Chaturdashi" }, { ta: "பௌர்ணமி", en: "Pournami" },
        { ta: "பிரதமை", en: "Krishna 1" }, { ta: "துவிதியை", en: "Krishna 2" }, { ta: "திருதியை", en: "Krishna 3" }, { ta: "சதுர்த்தி", en: "Krishna 4" }, { ta: "பஞ்சமி", en: "Krishna 5" }, { ta: "சஷ்டி", en: "Krishna 6" }, { ta: "சப்தமி", en: "Krishna 7" }, { ta: "அஷ்டமி", en: "Krishna 8" }, { ta: "நவமி", en: "Krishna 9" }, { ta: "தசமி", en: "Krishna 10" },
        { ta: "ஏகாதசி", en: "Ekadashi" }, { ta: "துவாதசி", en: "Dwadashi" }, { ta: "திரயோதசி", en: "Trayodashi" }, { ta: "சதுர்தசி", en: "Chaturdashi" }, { ta: "அமாவாசை", en: "Amavasya" }
    ];

    // Days in Month
    const numDaysInMonth = new Date(year, month, 0).getDate();
    const firstDayOfWeek = new Date(year, month - 1, 1).getDay(); // 0 = Sun, 6 = Sat
    
    // System Today
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    // Current Active Transit Date
    const activeTransitDate = state.transitDate || todayStr;

    // Month Navigation Options
    let monthOptionsHtml = '';
    for (let m = 1; m <= 12; m++) {
        const mName = (monthNames[lang] || monthNames['en'])[m - 1];
        monthOptionsHtml += `<option value="${m}" ${m === month ? 'selected' : ''}>${mName}</option>`;
    }

    let yearOptionsHtml = '';
    const currentYr = new Date().getFullYear();
    for (let y = currentYr - 5; y <= currentYr + 10; y++) {
        yearOptionsHtml += `<option value="${y}" ${y === year ? 'selected' : ''}>${y}</option>`;
    }

    // Weekday Headers HTML
    let weekDaysHtml = '';
    for (let i = 0; i < 7; i++) {
        weekDaysHtml += `
            <div class="sidebar-cal-header-day">
                <span class="hide-in-small-cal">${daysHeaderFull[i]}</span>
                <span class="show-in-small-cal">${daysHeaderShort[i]}</span>
            </div>
        `;
    }

    // Calendar Cells Grid HTML
    let calendarCellsHtml = '';
    
    // Empty cells before day 1
    for (let i = 0; i < firstDayOfWeek; i++) {
        calendarCellsHtml += `
            <div class="sidebar-cal-cell-empty"></div>
        `;
    }

    // Days 1 to N
    for (let day = 1; day <= numDaysInMonth; day++) {
        const dayStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isToday = (dayStr === todayStr);
        const isSelected = (dayStr === activeTransitDate);
        
        const dayNoon = new Date(year, month - 1, day, 12, 0, 0);
        
        // Moon calculations at noon
        const dMoonLon = getMoonSiderealLongitude(dayNoon);
        
        // Sun calculations at noon
        const dSunLon = getPlanetSiderealLongitude('Sun', dayNoon);
        
        // Tithi
        const tDiff = (dMoonLon - dSunLon + 360) % 360;
        const tIdx = Math.floor(tDiff / 12) % 30;
        const tithiObj = tithiList[tIdx] || { ta: 'திதி', en: 'Tithi' };
        const tithiName = lang === 'ta' ? tithiObj.ta : tithiObj.en;
        
        const isPournami = (tIdx === 14);
        const isAmavasya = (tIdx === 29);
        const isEkadashi = (tIdx === 10 || tIdx === 25);

        let tithiBadgeColor = 'var(--text-secondary)';
        if (isPournami) tithiBadgeColor = '#ca8a04';
        if (isAmavasya) tithiBadgeColor = '#64748b';
        if (isEkadashi) tithiBadgeColor = '#16a34a';

        calendarCellsHtml += `
            <div class="sidebar-cal-cell cal-day-cell ${isSelected ? 'is-selected' : ''}" data-date="${dayStr}">
                <!-- Date Number Header -->
                <div style="display: flex; justify-content: space-between; align-items: center; line-height: 1; margin-bottom: 4px;">
                    <span class="cal-day-number ${isToday ? 'today-num' : ''} ${isSelected ? 'selected-num' : ''}">
                        ${day}
                    </span>
                    <div style="display: flex; align-items: center; gap: 3px;">
                        ${isToday ? `<span class="cal-today-badge">${lang === 'ta' ? 'இன்று' : 'Today'}</span>` : ''}
                    </div>
                </div>

                <!-- Astrological details -->
                <div style="display: flex; flex-direction: column; gap: 3px; font-size: 10px; line-height: 1.25; margin-top: auto;">
                    <!-- Tithi -->
                    <div style="font-size: 9px; font-weight: 600; color: ${tithiBadgeColor}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        ${tithiName}
                    </div>
                </div>
            </div>
        `;
    }

    // --- Live Gochara Rasi Chart Calculations for the Selected Date ---
    const selectedTransit = calculateHoroscope({
        name: 'Gochara',
        gender: 'male',
        dateStr: activeTransitDate,
        timeStr: state.transitTime || '12:00',
        lat: state.transitLatitude || 13.08,
        lon: state.transitLongitude || 80.27,
        fatherName: '',
        motherName: '',
        ampm: 'PM',
        city: state.transitLocationName || 'Chennai'
    });

    const sideMoonStarName = lang === 'ta' ? t.stars[selectedTransit.panchang.starIdx] : translations['en'].stars[selectedTransit.panchang.starIdx];
    const sideStarPadaText = `${sideMoonStarName}-${selectedTransit.panchang.pada}`;

    const sideRasiGridHtml = state.chartStyle === 'north'
        ? renderNorthChartGrid(selectedTransit.planets, false, t)
        : renderChartGrid(
            selectedTransit.planets,
            false,
            t,
            sideStarPadaText,
            lang === 'ta' ? 'கோச்சாரம்' : 'Kocharam',
            `${activeTransitDate.split('-').reverse().join('-')} ${state.transitTime || '12:00'}`,
            (state.transitLatitude || 13.08).toFixed(2),
            (state.transitLongitude || 80.27).toFixed(2),
            state.transitLocationName || 'Chennai'
          );

    let displaySelectedDate = activeTransitDate;
    const dParts = activeTransitDate.split('-');
    if (dParts.length === 3) {
        const yr = dParts[0];
        const mo = parseInt(dParts[1], 10);
        const da = parseInt(dParts[2], 10);
        const mName = (monthNames[lang] || monthNames['en'])[mo - 1];
        displaySelectedDate = `${da} ${mName}, ${yr}`;
    }

    const titles = {
        ta: 'ஜோதிட நாட்காட்டி',
        en: 'Vedic Calendar',
        hi: 'वैदिक पंचांग कैलेंडर',
        te: 'వేద క్యాలెండర్',
        kn: 'ವೈದಿಕ ಕ್ಯಾಲೆಂಡರ್',
        ml: 'വേദ കലണ്ടർ'
    };
    const subtitles = {
        ta: 'தினசரி பஞ்சாங்கம், நட்சத்திரம் & கோச்சாரக் கட்டம்',
        en: 'Daily Panchang, Nakshatra & Gochara Chart',
        hi: 'दैनिक पंचांग, नक्षत्र एवं गोचर कुंडली',
        te: 'రోజువారీ పంచాంగం, నక్షత్రం & గోచారం',
        kn: 'ದೈನಂದಿನ ಪಂಚಾಂಗ, ನಕ್ಷತ್ರ & ಗೋಚಾರ',
        ml: 'പ്രതിദിന പഞ്ചാംഗം, നക്ഷത്രം & ഗോചാരം'
    };
    const title = titles[lang] || titles['en'];
    const subtitle = subtitles[lang] || subtitles['en'];

    return `
        <div class="card" id="monthly-calendar-card">
            <div style="width: 100%;">
                <!-- Header -->
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 16px;">
                    <div>
                        <h2 class="card-title" style="font-size: 20px; margin-bottom: 3px; text-align: left;">${title}</h2>
                        <p style="font-size: 13px; color: var(--text-secondary); margin: 0; text-align: left;">${subtitle}</p>
                        <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px;">
                            <label style="display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-secondary);">
                                ${lang === 'ta' ? 'நேரம்' : 'Time'}
                                <input type="time" id="calendar-time-input" value="${state.transitTime}" style="height: 30px; padding: 3px 8px; border: 1px solid var(--card-border); border-radius: 4px; background: var(--card-bg); color: var(--text-primary);">
                            </label>
                            <label style="display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-secondary);">
                                ${lang === 'ta' ? 'இடம்' : 'Place'}
                                <input type="text" id="calendar-location-input" value="${state.transitLocationName}" placeholder="${lang === 'ta' ? 'இடத்தைத் தேடுக' : 'Search place'}" autocomplete="off" style="height: 30px; min-width: 190px; padding: 3px 8px; border: 1px solid var(--card-border); border-radius: 4px; background: var(--card-bg); color: var(--text-primary);">
                            </label>
                        </div>
                    </div>

                    <!-- Month & Year Controls -->
                    <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 8px;">
                        <div style="display: inline-flex; align-items: center; gap: 4px; background: rgba(0,0,0,0.02); padding: 3px; border-radius: 6px; border: 1px solid var(--card-border);">
                            <button type="button" id="cal-prev-month-btn" style="padding: 0 10px; height: 30px; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; cursor: pointer; border-radius: 4px; border: 1px solid var(--card-border); background: var(--card-bg); color: var(--text-primary); transition: all 0.2s;" title="${lang === 'ta' ? 'முந்தைய மாதம்' : 'Prev Month'}">
                                ◀
                            </button>
                            <select id="cal-month-select" style="height: 30px; padding: 0 10px; font-weight: 600; font-size: 13px; border-radius: 4px; border: 1px solid var(--card-border); background: var(--card-bg); color: var(--text-primary); cursor: pointer; min-width: 125px;">
                                ${monthOptionsHtml}
                            </select>
                            <select id="cal-year-select" style="height: 30px; padding: 0 8px; font-weight: 600; font-size: 13px; border-radius: 4px; border: 1px solid var(--card-border); background: var(--card-bg); color: var(--text-primary); cursor: pointer; min-width: 75px;">
                                ${yearOptionsHtml}
                            </select>
                            <button type="button" id="cal-next-month-btn" style="padding: 0 10px; height: 30px; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; cursor: pointer; border-radius: 4px; border: 1px solid var(--card-border); background: var(--card-bg); color: var(--text-primary); transition: all 0.2s;" title="${lang === 'ta' ? 'அடுத்த மாதம்' : 'Next Month'}">
                                ▶
                            </button>
                        </div>
                        <button type="button" id="cal-today-btn" style="padding: 0 12px; height: 36px; display: inline-flex; align-items: center; gap: 5px; font-weight: 600; font-size: 12.5px; border-radius: 6px; border: 1px solid var(--card-border); background: var(--card-bg); color: var(--accent); cursor: pointer; transition: all 0.2s;" title="${lang === 'ta' ? 'இன்றைய மாதம்' : 'Today'}">
                            ${lang === 'ta' ? 'இன்று' : 'Today'}
                        </button>
                    </div>
                </div>

                <!-- 2-Column Responsive Body -->
                <div class="calendar-card-container">
                    <!-- Left: Calendar Grid -->
                    <div class="calendar-main-grid-column">
                        <!-- Legend Bar -->
                        <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 2px;">
                            <span class="cal-legend-chip">${lang === 'ta' ? 'பௌர்ணமி (முழு நிலவு)' : 'Pournami (Full Moon)'}</span>
                            <span class="cal-legend-chip">${lang === 'ta' ? 'அமாவாசை (புது நிலவு)' : 'Amavasya (New Moon)'}</span>
                            <span class="cal-legend-chip">${lang === 'ta' ? 'ஏகாதசி விரதம்' : 'Ekadashi Vrat'}</span>
                        </div>

                        <!-- 7-Day Weekday Header -->
                        <div class="sidebar-cal-grid">
                            ${weekDaysHtml}
                        </div>

                        <!-- Calendar Day Cells Grid -->
                        <div class="sidebar-cal-grid">
                            ${calendarCellsHtml}
                        </div>
                    </div>

                    <!-- Right: Selected Date Gochara Chart & Highlights -->
                    <div class="calendar-chart-column">
                        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--card-border); padding-bottom: 10px;">
                            <div>
                                <div style="font-size: 11px; color: var(--text-secondary); text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">
                                    ${lang === 'ta' ? 'தேர்ந்தெடுக்கப்பட்ட நாள்' : 'Selected Date'}
                                </div>
                                <div style="font-size: 16px; font-weight: 700; color: var(--accent); margin-top: 2px;">
                                    ${displaySelectedDate}
                                </div>
                            </div>
                            <span class="status-badge badge-primary" style="font-size: 11px; padding: 3px 8px;">
                                ${lang === 'ta' ? 'கோச்சாரக் கட்டம்' : 'Gochara Chart'}
                            </span>
                        </div>

                        <!-- Rasi Chart -->
                        <div class="chart-box" style="padding: 0; align-items: center; width: 100%; display: flex; flex-direction: column; justify-content: center; background: none; border: none; box-shadow: none;">
                            ${state.chartStyle === 'north' ? `
                                <div class="north-chart-container" style="max-width: 290px; width: 100%;">
                                    ${sideRasiGridHtml}
                                </div>
                            ` : `
                                <div class="chart-grid rasi-theme" style="max-width: 290px; width: 100%; aspect-ratio: 1; --chart-font-size: 10.5px;">
                                    ${sideRasiGridHtml}
                                </div>
                            `}
                        </div>

                        <!-- Selected Date Panchangam Highlights -->
                        <div style="display: flex; flex-direction: column; gap: 8px; font-size: 12px; background: rgba(0,0,0,0.02); padding: 12px; border-radius: 6px; border: 1px solid var(--card-border);">
                            <div style="display: flex; justify-content: space-between; align-items: center; gap: 6px;">
                                <span style="color: var(--text-secondary);">${lang === 'ta' ? 'திதி' : 'Tithi'}:</span>
                                <strong style="color: var(--text-primary); font-size: 12px; text-align: right;">${getTithiName(selectedTransit.panchang.tithiIdx, lang)}</strong>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Render Results View
function renderResultsView(t) {
    const data = state.horoscope;
    const details = data.birthDetails;
    const dst = dasaSearchTranslations[state.lang] || dasaSearchTranslations['en'];
    
    // Get formatted Date-Time representation for the chart center
    const genderLabel = details.gender === 'male' ? `${t.male} / Male` : `${t.female} / Female`;
    const birthTimeDisplay = details.timeStr.replace(/:00$/, '') + ' ' + details.ampm.toLowerCase();
    
    const formattedDate = details.dateStr.split('-').reverse().join('-');
    const dtDisplay = `${formattedDate} - ${birthTimeDisplay}`;
    
    const latDirectionText = details.lat >= 0 ? 'N' : 'S';
    const lonDirectionText = details.lon >= 0 ? 'E' : 'W';
    const latDisplay = `Lat: ${Math.abs(details.lat).toFixed(2)} ${latDirectionText}`;
    const lonDisplay = `Lon: ${Math.abs(details.lon).toFixed(2)} ${lonDirectionText}`;
    const cityText = details.city;
    
    // Star details
    const moonStarTamilName = t.stars[data.panchang.starIdx];
    const moonStarEnglishName = translations['en'].stars[data.panchang.starIdx];
    const starPadaText = state.lang === 'ta' ? `${moonStarTamilName}-${data.panchang.pada}` : `${moonStarEnglishName}-${data.panchang.pada}`;
    
    // Generate charts for screen
    const rasiGridHtml = state.chartStyle === 'north'
        ? renderNorthChartGrid(data.planets, false, t)
        : renderChartGrid(data.planets, false, t, starPadaText, genderLabel, dtDisplay, latDisplay, lonDisplay, cityText);
    const navamsamGridHtml = state.chartStyle === 'north'
        ? renderNorthChartGrid(data.planets, true, t)
        : renderChartGrid(data.planets, true, t, starPadaText, genderLabel, dtDisplay, latDisplay, lonDisplay, cityText);
    
    const resultsAspectMapHtml = renderAspectMatrixHtml(data.planets, t, state.lang);
    
    // Generate vertical placements table
    const allPlanetNames = ["Lagna", "Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu", "Mandi"];
    let verticalTableRowsHtml = '';
    
    allPlanetNames.forEach(pName => {
        const p = data.planets.find(pl => pl.name === pName);
        if (!p) return;
        
        const pTamilName = t.planets[pName] || pName;
        const pEnglishName = translations['en'].planets[pName] || pName;
        
        const isRetro = p.isRetro && p.name !== 'Lagna' && p.name !== 'Mandi';
        const planetDisplayName = state.lang === 'ta' 
            ? pTamilName + (isRetro ? ' (வ)' : '') 
            : pEnglishName + (isRetro ? ' (R)' : '');
            
        const relativeLon = p.longitude % 30;
        const deg = Math.floor(relativeLon);
        const minTotal = (relativeLon - deg) * 60;
        const min = Math.floor(minTotal);
        const signLonStr = `${deg}° ${min.toString().padStart(2, '0')}'`;
        const totalLonStr = `${p.longitude.toFixed(2)}°`;
        
        const rasiTamilName = t.signs[signKeys[p.rasiIdx]];
        const rasiEnglishName = translations['en'].signs[signKeys[p.rasiIdx]];
        const rasiDisplayName = state.lang === 'ta' ? rasiTamilName : rasiEnglishName;
        
        const starTamil = t.stars[p.starIdx] || '-';
        const starEnglish = translations['en'].stars[p.starIdx] || '-';
        const starDisplayName = state.lang === 'ta' ? starTamil : starEnglish;
        const padaDisplay = p.starIdx !== undefined ? `(${p.pada})` : '';
        
        const starLords = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'];
        const starLordKey = p.starIdx !== undefined ? starLords[p.starIdx % 9] : null;
        let starLordDisplayName = '-';
        if (starLordKey) {
            starLordDisplayName = state.lang === 'ta' 
                ? t.planets[starLordKey] 
                : (translations[state.lang]?.planets[starLordKey] || translations['en'].planets[starLordKey]);
        }
        
        const strengthVal = getPlanetaryStrength(pName, p.rasiIdx, state.lang);
        
        verticalTableRowsHtml += `
            <tr style="border-bottom: 1px solid var(--card-border);">
                <td style="padding: 12px; font-weight: 600; color: var(--accent);">
                    <div>${planetDisplayName}</div>
                    ${state.lang === 'ta' ? `<div style="font-size: 11px; font-weight: normal; color: var(--text-secondary); margin-top: 1px;">${pEnglishName}${isRetro ? ' (R)' : ''}</div>` : ''}
                </td>
                <td style="padding: 12px; font-weight: 600;">
                    <div>${signLonStr}</div>
                    <div style="font-size: 11px; font-weight: normal; color: var(--text-secondary); margin-top: 1px;">(Tot: ${totalLonStr})</div>
                </td>
                <td style="padding: 12px;">${rasiDisplayName}</td>
                <td style="padding: 12px; font-weight: 500;">
                    <div>${starDisplayName} ${padaDisplay}</div>
                </td>
                <td style="padding: 12px; color: var(--text-secondary);">${starLordDisplayName}</td>
                <td style="padding: 12px; font-weight: 600; text-align: center;">${p.house}</td>
                <td style="padding: 12px;">${strengthVal}</td>
            </tr>
        `;
    });
    
    // Panchang items
    const panchangItems = [
        { label: t.panchang.star, value: state.lang === 'ta' ? `${moonStarTamilName} (பாதம்: ${data.panchang.pada})` : `${moonStarEnglishName} (Pada: ${data.panchang.pada})` },
        { label: t.panchang.rasi, value: state.lang === 'ta' ? t.signs[signKeys[data.panchang.rasiIdx]] : translations['en'].signs[signKeys[data.panchang.rasiIdx]] },
        { label: t.panchang.lagna, value: state.lang === 'ta' ? t.signs[signKeys[getRasiSignIndex(data.lagnaLon)]] : translations['en'].signs[signKeys[getRasiSignIndex(data.lagnaLon)]] },
        { label: t.panchang.tithi, value: getTithiName(data.panchang.tithiIdx, state.lang) },
        { label: t.panchang.yoga, value: getYogaName(data.panchang.yogaIdx, state.lang) },
        { label: t.panchang.karana, value: getKaranaName(data.panchang.karanaIdx, state.lang) }
    ];
    
    let panchangHtml = '';
    panchangItems.forEach(item => {
        panchangHtml += `
            <div class="summary-item">
                <span class="summary-label">${item.label}</span>
                <span class="summary-value">${item.value}</span>
            </div>
        `;
    });
    
    // Dasa rows calculation
    let dasaRowsHtml = '';
    const lordColors = {
        Sun: '#f59e0b',
        Moon: '#a1a1aa',
        Mars: '#ef4444',
        Mercury: '#10b981',
        Jupiter: '#fbbf24',
        Venus: '#ec4899',
        Saturn: '#3b82f6',
        Rahu: '#6b7280',
        Ketu: '#78350f'
    };
    
    data.dasaTimeline.forEach(period => {
        const lordTamilName = t.planets[period.lord] || period.lord;
        const lordEnglishName = translations['en'].planets[period.lord] || period.lord;
        const lordDisplay = state.lang === 'ta' ? `${lordTamilName} (${lordEnglishName})` : lordEnglishName;
        
        const startStr = formatDate(new Date(period.start));
        const endStr = formatDate(new Date(period.end));
        
        const durationStr = formatDuration(period.start, period.end, t);
        
        let badgeClass = 'badge-future';
        let statusText = t.dasa.future;
        if (period.status === 'active') {
            badgeClass = 'badge-active';
            statusText = t.dasa.active;
        } else if (period.status === 'past') {
            badgeClass = 'badge-past';
            statusText = t.dasa.past;
        }
        
        const bulletColor = lordColors[period.lord] || '#8b5cf6';
        
        dasaRowsHtml += `
            <tr class="dasa-row ${period.status === 'active' ? 'dasa-active' : ''}"
                data-level="1"
                data-lord="${period.lord}"
                data-start="${new Date(period.start).toISOString()}"
                data-end="${new Date(period.end).toISOString()}"
                data-duration="${period.duration}"
                data-start-age="${period.startAge}"
                data-end-age="${period.endAge}"
                ${period.virtualStart ? `data-virtual-start="${new Date(period.virtualStart).toISOString()}"` : ''}
                ${period.fullDuration !== undefined ? `data-full-duration="${period.fullDuration}"` : ''}
                data-expanded="false"
                style="cursor: pointer;"
            >
                <td>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span class="dasa-toggle-icon">&#9656;</span>
                        <span class="dasa-bullet" style="background-color: ${bulletColor};"></span>
                        <span style="font-weight: 600;">${lordDisplay}<span style="font-size: 12px; color: var(--text-secondary); font-weight: normal;"> - ${t.dasa.mahadasa}</span></span>
                    </div>
                </td>
                <td>${startStr}</td>
                <td>${endStr}</td>
                <td style="text-align: center;">${durationStr}</td>
            </tr>
        `;
    });
    
    // --- PRINT CALCULATIONS & HTML GENERATION ---
    const birthDateObj = new Date(details.dateStr + 'T' + details.timeStr);
    
    // 1. Timezone offset string
    const tzOffsetMinutesVal = -birthDateObj.getTimezoneOffset();
    const offsetHr = Math.floor(Math.abs(tzOffsetMinutesVal) / 60);
    const offsetMin = Math.abs(tzOffsetMinutesVal) % 60;
    const offsetSignSymbol = tzOffsetMinutesVal >= 0 ? '+' : '-';
    const timezoneOffsetStr = `${offsetSignSymbol}${offsetHr}.${offsetMin.toString().padStart(2, '0')} GMT`;
    
    // 2. Tamil Date (Calculated from Sun's absolute longitude)
    const sunPlanet = data.planets.find(p => p.name === 'Sun');
    const sunLonVal = sunPlanet ? sunPlanet.longitude : 0;
    const sunSignIdx = Math.floor(sunLonVal / 30);
    const tamilMonths = ["சித்திரை", "வைகாசி", "ஆனி", "ஆடி", "ஆவணி", "புரட்டாசி", "ஐப்பசி", "கார்த்திகை", "மார்கழி", "தை", "மாசி", "பங்குனி"];
    const tamilMonthName = tamilMonths[sunSignIdx];
    const tamilDate = Math.floor(sunLonVal % 30) + 1;
    
    let yearCE = birthDateObj.getFullYear();
    const monthVal = birthDateObj.getMonth();
    const dateVal = birthDateObj.getDate();
    if (monthVal < 3 || (monthVal === 3 && dateVal < 14)) {
        yearCE--;
    }
    const tamilYears = [
        "பிரபவ", "விபவ", "சுக்ல", "பிரமோதூத", "பிரசோற்பத்தி", "ஆங்கீரச", "ஸ்ரீமுக", "பவ", "யுவ", "தாது",
        "ஈஸ்வர", "பகுதானிய", "பிரமாதி", "விக்ரம", "விஷு", "சித்திரபானு", "சுபானு", "தாரண", "பார்த்திப", "விய",
        "சர்வஜித்", "சர்வதாரி", "விரோதி", "விக்ருதி", "கர", "நந்தன", "விஜய", "ஜய", "மன்மத", "துன்முகி",
        "ஹேவிளம்பி", "விளம்பி", "விகாரி", "சார்வரி", "பிலவ", "சுபகிருது", "சோபகிருது", "குரோதி", "விசுவாசுவ", "பரபாவ",
        "பிலவங்க", "கீலக", "சௌமிய", "சாதாரண", "விரோதகிருது", "பரிதாபி", "பிரமாதீச", "ஆனந்த", "ராட்சஸ", "நள",
        "பிங்கள", "காளயுக்தி", "சித்தார்த்தி", "ரௌத்திரி", "துன்மதி", "துந்துபி", "ருத்ரோத்காரி", "ரக்தாட்சி", "குரோதன", "அக்ஷய"
    ];
    const tamilYearIdx = (yearCE - 1987 + 60) % 60;
    const tamilYearName = tamilYears[tamilYearIdx];
    const kaliYugaYear = yearCE + 3101;
    const tamilDateStr = `${tamilMonthName}-மீ ${tamilDate}-உ -${tamilYearName} வரு, கலி-${kaliYugaYear}`;
    
    // 3. Day of week in Tamil or English
    const tamilWeekdays = ["ஞாயிற்றுக்கிழமை", "திங்கட்கிழமை", "செவ்வாய்க்கிழமை", "புதன்கிழமை", "வியாழக்கிழமை", "வெள்ளிக்கிழமை", "சனிக்கிழமை"];
    const englishWeekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const sunriseDate = new Date(data.panchang.sunrise);
    const sunsetDate = new Date(data.panchang.sunset);
    
    let birthDayIdx = birthDateObj.getDay();
    if (birthDateObj < sunriseDate) {
        birthDayIdx = (birthDayIdx + 6) % 7;
    }
    const dayNameStr = state.lang === 'ta' ? tamilWeekdays[birthDayIdx] : englishWeekdays[birthDayIdx];
    
    // 4. Coordinates formatted
    const latDir = details.lat >= 0 ? 'N' : 'S';
    const lonDir = details.lon >= 0 ? 'E' : 'W';
    const latDisplayVal = `${Math.abs(details.lat).toFixed(2)} ${latDir}`;
    const lonDisplayVal = `${Math.abs(details.lon).toFixed(2)} ${lonDir}`;
    
    // 5. Sunrise and Sunset times formatted
    const formatTimeHM = (d) => {
        const h = d.getHours().toString().padStart(2, '0');
        const m = d.getMinutes().toString().padStart(2, '0');
        return `${h}:${m}`;
    };
    const sunriseHM = formatTimeHM(sunriseDate);
    const sunsetHM = formatTimeHM(sunsetDate);
    
    // 6. Dinamana (Ahas)
    const ahasMs = sunsetDate.getTime() - sunriseDate.getTime();
    const ahasHours = ahasMs / (3600 * 1000);
    const ahasNaazhigai = ahasHours * 2.5;
    const ahasN = Math.floor(ahasNaazhigai);
    const ahasV = Math.floor((ahasNaazhigai - ahasN) * 60);
    const ahasDisplay = `${ahasN}:${ahasV.toString().padStart(2, '0')} நா.வி`;
    
    const sunriseTamilTime = "59:50 நா.வி";
    const sunsetTamilTime = `${ahasN}:${(ahasV + 10).toString().padStart(2, '0')} நா.வி`;
    
    // 7. Udayadhi Naazhigai & Tamil Time
    let referenceSunrise = sunriseDate;
    if (birthDateObj < sunriseDate) {
        referenceSunrise = new Date(sunriseDate.getTime() - 24 * 3600 * 1000);
    }
    const elapsedMs = birthDateObj.getTime() - referenceSunrise.getTime();
    const elapsedHours = elapsedMs / (3600 * 1000);
    const udayadhiNaazhigai = elapsedHours * 2.5;
    const udayadhiN = Math.floor(udayadhiNaazhigai);
    const udayadhiV = Math.floor((udayadhiNaazhigai - udayadhiN) * 60);
    const udayadhiDisplay = `${udayadhiN}:${udayadhiV.toString().padStart(2, '0')} நா.வி (${elapsedHours.toFixed(2)} மணி)`;
    const tamilTimeDisplay = `${udayadhiN}:${udayadhiV.toString().padStart(2, '0')} நா.வி`;
    
    // 8. LMT (Local Mean Time)
    const stdMeridian = (tzOffsetMinutesVal / 60) * 15;
    const lonDiff = details.lon - stdMeridian;
    const lmtOffsetMinutes = lonDiff * 4;
    const lmtDate = new Date(birthDateObj.getTime() + lmtOffsetMinutes * 60 * 1000);
    const lmtHM = formatTimeHM(lmtDate) + ":" + lmtDate.getSeconds().toString().padStart(2, '0');
    
    // 9. Birth Hora
    const horaIdx = Math.floor(elapsedHours) % 24;
    const weekdayLords = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
    const startLord = weekdayLords[birthDayIdx];
    const horaCycle = ['Sun', 'Venus', 'Mercury', 'Moon', 'Saturn', 'Jupiter', 'Mars'];
    const startLordIdx = horaCycle.indexOf(startLord);
    const currentHoraLord = horaCycle[(startLordIdx + horaIdx) % 7];
    const horaLordTamil = t.planets[currentHoraLord] || currentHoraLord;
    const horaGender = (currentHoraLord === 'Moon' || currentHoraLord === 'Venus') 
        ? (state.lang === 'ta' ? 'பெண்' : 'Female') 
        : (state.lang === 'ta' ? 'ஆண்' : 'Male');
        
    // 10. Separated Tithi and Paksha
    const tithiFull = getTithiName(data.panchang.tithiIdx, state.lang);
    const tithiNameOnly = tithiFull.includes(' - ') ? tithiFull.split(' - ')[1] : tithiFull;
    const pakshaName = data.panchang.tithiIdx < 15 
        ? (state.lang === 'ta' ? "சுக்கில ( வளர்பிறை )" : "Shukla Paksha (Waxing)") 
        : (state.lang === 'ta' ? "கிருஷ்ண ( தேய்பிறை )" : "Krishna Paksha (Waning)");
        
    // 11. Print Rasi and Navamsam HTML (always South Indian style for print formatting)
    const printRasiGridHtml = renderChartGrid(data.planets, false, t, starPadaText, genderLabel, dtDisplay, latDisplay, lonDisplay, cityText);
    const printNavamsamGridHtml = renderChartGrid(data.planets, true, t, starPadaText, genderLabel, dtDisplay, latDisplay, lonDisplay, cityText);
    
    // 12. Print Table Rows
    let printTableRows = '';
    const rasiLords = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];
    const starLords = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'];
    
    data.planets.forEach(p => {
        const pTamilName = t.planets[p.name];
        const pEnglishName = translations['en'].planets[p.name];
        const planetDisplayName = state.lang === 'ta' ? pTamilName : pEnglishName;
        
        const relativeLon = p.longitude % 30;
        const deg = Math.floor(relativeLon);
        const minTotal = (relativeLon - deg) * 60;
        const min = Math.floor(minTotal);
        const sec = Math.floor((minTotal - min) * 60);
        const signLonStr = `${deg}° ${min.toString().padStart(2, '0')}' ${sec.toString().padStart(2, '0')}"`;
        
        const absDeg = Math.floor(p.longitude);
        const absMinTotal = (p.longitude - absDeg) * 60;
        const absMin = Math.floor(absMinTotal);
        const absSec = Math.floor((absMinTotal - absMin) * 60);
        const absLonStr = `${absDeg}° ${absMin.toString().padStart(2, '0')}' ${absSec.toString().padStart(2, '0')}"`;
        
        const rasiName = state.lang === 'ta' ? t.signs[signKeys[p.rasiIdx]] : translations['en'].signs[signKeys[p.rasiIdx]];
        const rasiLordName = state.lang === 'ta' ? t.planets[rasiLords[p.rasiIdx]] : translations['en'].planets[rasiLords[p.rasiIdx]];
        const starName = state.lang === 'ta' ? t.stars[p.starIdx] : translations['en'].stars[p.starIdx];
        const starLordName = state.lang === 'ta' ? t.planets[starLords[p.starIdx % 9]] : translations['en'].planets[starLords[p.starIdx % 9]];
        
        let statusVal = '-';
        if (p.isRetro && p.name !== 'Lagna' && p.name !== 'Mandi') {
            statusVal = state.lang === 'ta' ? 'வ' : 'R';
        }
        
        printTableRows += `
            <tr>
                <td><strong>${planetDisplayName}</strong></td>
                <td>${signLonStr}</td>
                <td>${starName}</td>
                <td>${p.pada}</td>
                <td>${starLordName}</td>
                <td>${absLonStr}</td>
                <td>${rasiName}</td>
                <td>${rasiLordName}</td>
                <td>${statusVal}</td>
            </tr>
        `;
    });
    
    // 13. Dasa Balance and Active Dasa Bhukti strings
    const firstPeriod = data.dasaTimeline[0];
    const firstPeriodEnd = new Date(firstPeriod.end);
    const firstDasaAge = getAgeYMD(birthDateObj, firstPeriodEnd);
    const lordName = state.lang === 'ta' ? t.planets[firstPeriod.lord] : translations['en'].planets[firstPeriod.lord];
    
    const dasaBalanceStr = state.lang === 'ta'
        ? `${lordName} திசை: ${firstDasaAge.years} ஆண்டு, ${firstDasaAge.months} மாதம், ${firstDasaAge.days} நாள். ${formatDate(firstPeriodEnd)} வரை`
        : `${lordName} Dasa: ${firstDasaAge.years} Years, ${firstDasaAge.months} Months, ${firstDasaAge.days} Days. Up to ${formatDate(firstPeriodEnd)}`;
        
    const activePath = findActiveDasaPathAtDate(new Date(), data.dasaTimeline, details.dateStr + 'T' + details.timeStr);
    let currentDasaBhuktiStr = '-';
    if (activePath && activePath.length >= 2) {
        const activeMD = activePath[0];
        const activeBhukti = activePath[1];
        const mdLord = state.lang === 'ta' ? t.planets[activeMD.lord] : translations['en'].planets[activeMD.lord];
        const bhLord = state.lang === 'ta' ? t.planets[activeBhukti.lord] : translations['en'].planets[activeBhukti.lord];
        
        const bhuktis = calculateSubPeriods(activeMD, details.dateStr + 'T' + details.timeStr);
        const activeBhuktiIdx = bhuktis.findIndex(b => b.lord === activeBhukti.lord && new Date(b.start).getTime() === new Date(activeBhukti.start).getTime());
        let nextBhuktiStr = '';
        if (activeBhuktiIdx !== -1 && activeBhuktiIdx + 1 < bhuktis.length) {
            const nextBh = bhuktis[activeBhuktiIdx + 1];
            const nextLordName = state.lang === 'ta' ? t.planets[nextBh.lord] : translations['en'].planets[nextBh.lord];
            nextBhuktiStr = state.lang === 'ta'
                ? `. இதற்கு மேல் ${mdLord} திசையில் ${nextLordName} புத்தி.`
                : `. Followed by ${nextLordName} Bhukti in ${mdLord} Dasa.`;
        } else {
            const nextMDIdx = data.dasaTimeline.findIndex(m => m.lord === activeMD.lord) + 1;
            if (nextMDIdx < data.dasaTimeline.length) {
                const nextMD = data.dasaTimeline[nextMDIdx];
                const nextMDBhuktis = calculateSubPeriods(nextMD, details.dateStr + 'T' + details.timeStr);
                const nextBh = nextMDBhuktis[0];
                const nextMDLord = state.lang === 'ta' ? t.planets[nextMD.lord] : translations['en'].planets[nextMD.lord];
                const nextLordName = state.lang === 'ta' ? t.planets[nextBh.lord] : translations['en'].planets[nextBh.lord];
                nextBhuktiStr = state.lang === 'ta'
                    ? `. இதற்கு மேல் ${nextMDLord} திசையில் ${nextLordName} புத்தி.`
                    : `. Followed by ${nextLordName} Bhukti in ${nextMDLord} Dasa.`;
            }
        }
        
        currentDasaBhuktiStr = state.lang === 'ta'
            ? `${mdLord} திசையில் ${bhLord} புத்தி ${formatDate(new Date(activeBhukti.start))} முதல் ${formatDate(new Date(activeBhukti.end))} வரை${nextBhuktiStr}`
            : `${mdLord} Dasa - ${bhLord} Bhukti from ${formatDate(new Date(activeBhukti.start))} to ${formatDate(new Date(activeBhukti.end))}${nextBhuktiStr}`;
    }
    const chartPresets = [
        { name: 'Amber', primary: '#d97706' },
        { name: 'Green', primary: '#059669' },
        { name: 'Blue', primary: '#2563eb' },
        { name: 'Red', primary: '#dc2626' },
        { name: 'Purple', primary: '#7c3aed' }
    ];

    let chartPresetsHtml = '';
    chartPresets.forEach(p => {
        const isActive = currentChartAccent.toLowerCase() === p.primary.toLowerCase();
        chartPresetsHtml += `
            <button class="chart-preset-color-dot${isActive ? ' active' : ''}" 
                    data-primary="${p.primary}" 
                    style="background: ${p.primary}; width: 28px; height: 28px; border-radius: 50%; border: 2px solid ${isActive ? 'var(--text-primary)' : 'transparent'}; cursor: pointer; transition: transform 0.2s, border-color 0.2s; padding: 0; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"
                    title="${p.name}">
            </button>
        `;
    });
    
    return `
        <!-- SCREEN VIEW -->
        <div class="screen-only results-container">
            <!-- Top Back Button -->
            <div style="display: flex; justify-content: flex-start; margin-bottom: -10px;">
                <button class="btn-secondary" id="top-back-btn" style="width: 40px; height: 40px; border-radius: 0; padding: 0; display: inline-flex; align-items: center; justify-content: center;" title="${t.actions.back}">
                    <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                    </svg>
                </button>
            </div>
            <!-- Charts Grid (Rasi & Navamsam side-by-side) -->
            <div class="card">
                <div style="display: flex; justify-content: flex-end; align-items: center; gap: 10px; margin-bottom: 20px;">
                    <!-- Chart Accent Color Picker -->
                    <div style="position: relative; display: inline-block;">
                        <button class="lang-btn" id="chart-accent-menu-btn" style="width: 34px; height: 34px; border-radius: 0; padding: 0; display: inline-flex; align-items: center; justify-content: center; color: var(--chart-accent);" title="${(t.chartAccentMenu && t.chartAccentMenu.title) || 'Chart Accent Color'}">
                            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <rect x="3" y="3" width="18" height="18" rx="0"></rect>
                                <path d="M3 12h18M12 3v18M3 3l18 18M21 3L3 21" opacity="0.6" stroke-width="1"></path>
                            </svg>
                        </button>
                        <div id="chart-accent-dropdown" class="accent-dropdown-menu" style="display: none; position: absolute; top: 40px; right: 0; background: var(--card-bg); border: 1px solid var(--card-border); padding: 12px; width: 220px; box-shadow: var(--shadow); z-index: 1000; flex-direction: column; gap: 10px;">
                            <div style="font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">${(t.chartAccentMenu && t.chartAccentMenu.presets) || 'Chart Presets'}</div>
                            <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px;" id="chart-preset-colors-container">
                                ${chartPresetsHtml}
                            </div>
                            <div style="border-top: 1px solid var(--card-border); margin-top: 6px; padding-top: 8px;">
                                <div style="font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">${(t.chartAccentMenu && t.chartAccentMenu.custom) || 'Chart Custom Color'}</div>
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <input type="color" id="custom-chart-accent-picker" style="border: 1px solid var(--card-border); background: none; width: 34px; height: 34px; padding: 0; cursor: pointer;" value="${currentChartAccent}">
                                    <span style="font-size: 13px; font-family: monospace; color: var(--text-primary); font-weight: 600;" id="custom-chart-color-value">${currentChartAccent.toUpperCase()}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <button class="lang-btn" id="toggle-chart-style-btn" style="padding: 0 12px; font-size: 13px; height: 34px; display: inline-flex; align-items: center; justify-content: center;">
                        ${state.chartStyle === 'north' ? t.actions.toggleSouthStyle : t.actions.toggleNorthStyle}
                    </button>
                </div>
                <div class="charts-grid-wrapper">
                    <!-- Rasi Chart -->
                    <div class="chart-box">
                        <div class="chart-title-header">${state.lang === 'ta' ? 'இராசி கட்டம் (Rasi Chart)' : 'Rasi Chart (D-1)'}</div>
                        ${state.chartStyle === 'north'
                            ? rasiGridHtml
                            : `<div class="chart-grid rasi-theme">${rasiGridHtml}</div>`
                        }
                    </div>
                    
                    <!-- Navamsam Chart -->
                    <div class="chart-box">
                        <div class="chart-title-header">${state.lang === 'ta' ? 'நவாம்சம் கட்டம் (Navamsam Chart)' : 'Navamsam Chart (D-9)'}</div>
                        ${state.chartStyle === 'north'
                            ? navamsamGridHtml
                            : `<div class="chart-grid nav-theme">${navamsamGridHtml}</div>`
                        }
                    </div>
                    
                    <!-- Planetary Aspect Map -->
                    ${resultsAspectMapHtml}
                </div>
                <div class="kocharam-label">
                    Kocharam : ${new Date().toLocaleTimeString()} GMT+5:30 *Planet Degree in Decimal
                </div>
            </div>
            
            <!-- Panchang Summary & Details -->
            <div class="card" style="margin-bottom: 30px;">
                <h2 class="card-title" style="text-align: left; margin-bottom: 20px;">${t.panchang.title}</h2>
                <div class="summary-list" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 15px 30px;">
                    ${panchangHtml}
                </div>
            </div>
            
            <div class="card" style="margin-bottom: 30px;">
                <h2 class="card-title" style="text-align: left; margin-bottom: 20px;">${state.lang === 'ta' ? 'கிரக நிலைகள்' : 'Planetary Placements'}</h2>
                <div class="table-container">
                    <table style="width: 100%; border-collapse: collapse; text-align: left;">
                        <thead>
                            <tr style="background: rgba(0,0,0,0.02); border-bottom: 2px solid var(--card-border);">
                                <th style="padding: 12px; text-align: left;">${state.lang === 'ta' ? 'கிரகம்' : 'Planet'}</th>
                                <th style="padding: 12px; text-align: left;">${state.lang === 'ta' ? 'பாகை (நிமிடம்)' : 'Degree (Min)'}</th>
                                <th style="padding: 12px; text-align: left;">${state.lang === 'ta' ? 'இராசி' : 'Zodiac Sign'}</th>
                                <th style="padding: 12px; text-align: left;">${state.lang === 'ta' ? 'நட்சத்திரம் (பாதம்)' : 'Star (Nakshatra)'}</th>
                                <th style="padding: 12px; text-align: left;">${state.lang === 'ta' ? 'சாரநாதன் / அதிபதி' : 'Star Lord'}</th>
                                <th style="padding: 12px; text-align: center;">${state.lang === 'ta' ? 'பாவகம்' : 'House'}</th>
                                <th style="padding: 12px; text-align: left;">${state.lang === 'ta' ? 'பலம் / நிலை' : 'Strength'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${verticalTableRowsHtml}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <!-- Vimshottari Dasa Timeline -->
            <div class="card">
                <h2 class="card-title" style="text-align: left; margin-bottom: 20px;">${t.dasa.title}</h2>
                
                <!-- Dasa Search Widget -->
                <div class="dasa-search-widget" style="margin-bottom: 25px; padding: 20px; background: rgba(0, 0, 0, 0.05); border: 1px solid var(--card-border); display: flex; flex-direction: column; gap: 15px;">
                    <div style="font-weight: 600; font-size: 15px; color: var(--accent);">
                        ${dst.searchByDate}
                    </div>
                    <div style="display: flex; gap: 12px; flex-wrap: wrap; align-items: center;">
                        <input type="date" id="dasa-search-input" style="max-width: 250px; height: 42px; padding: 8px 12px; border-radius: 0;">
                        <button class="btn-primary" id="dasa-search-submit-btn" style="padding: 10px 24px; font-size: 14px; height: 42px; display: inline-flex; align-items: center; justify-content: center; gap: 6px;">
                            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                            </svg>
                            <span>${dst.searchBtn}</span>
                        </button>
                    </div>
                    <div id="dasa-search-results-box" style="display: none; padding: 15px; background: rgba(255, 255, 255, 0.02); border: 1px dashed var(--card-border); border-radius: 0;">
                        <!-- Result breadcrumb path goes here -->
                    </div>
                </div>
                
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>${t.dasa.lord}</th>
                                <th>${t.dasa.start}</th>
                                <th>${t.dasa.end}</th>
                                <th style="text-align: center;">${t.dasa.duration}</th>
                            </tr>
                        </thead>
                        <tbody id="dasa-tbody">
                            ${dasaRowsHtml}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <!-- Actions -->
            <div class="actions-container">
                <button class="btn-secondary" id="back-btn">${t.actions.back}</button>
                <button class="btn-primary" id="print-btn">
                    <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path>
                    </svg>
                    <span>${t.actions.print}</span>
                </button>
            </div>
        </div>
        
        <!-- PRINT-ONLY HIGH-FIDELITY LAYOUT (MATCHING REFERENCE SCREENSHOT) -->
        <div class="print-only print-horoscope-page">
            <div class="print-page-border">
                <!-- Auspicious starting symbol -->
                <div class="print-auspicious-symbol">உ</div>
                <h1 class="print-page-title">${state.lang === 'ta' ? 'ஜாதக கணிதம்' : 'Horoscope Calculations'}</h1>
                
                <!-- Birth details key-value grid -->
                <div class="print-details-grid">
                    <!-- Column 1 -->
                    <div class="print-details-col">
                        <div class="print-detail-item"><span class="label">${state.lang === 'ta' ? 'பெயர்' : 'Name'}</span><span class="val">: ${details.name}</span></div>
                        <div class="print-detail-item"><span class="label">${state.lang === 'ta' ? 'பிறந்த தேதி' : 'Date of Birth'}</span><span class="val">: ${details.dateStr.split('-').reverse().join('-')}</span></div>
                        <div class="print-detail-item"><span class="label">${state.lang === 'ta' ? 'பிறந்த நேரம்' : 'Time of Birth'}</span><span class="val">: ${details.timeStr.replace(/:00$/, '')} ${details.ampm}</span></div>
                        <div class="print-detail-item"><span class="label">${state.lang === 'ta' ? 'பாலினம்' : 'Gender'}</span><span class="val">: ${details.gender === 'male' ? (state.lang === 'ta' ? 'ஆண் / Male' : 'Male') : (state.lang === 'ta' ? 'பெண் / Female' : 'Female')}</span></div>
                        <div class="print-detail-item"><span class="label">${state.lang === 'ta' ? 'பிறந்த கிழமை' : 'Birth Day'}</span><span class="val">: ${dayNameStr}</span></div>
                        <div class="print-detail-item"><span class="label">${state.lang === 'ta' ? 'ஜென்ம நட்சத்திரம்' : 'Birth Star'}</span><span class="val">: ${t.stars[data.panchang.starIdx]}-${data.panchang.pada} ${state.lang === 'ta' ? 'ஆம் பாதம்' : 'Pada'}</span></div>
                        <div class="print-detail-item"><span class="label">${state.lang === 'ta' ? 'ஜென்ம இராசி' : 'Birth Rasi'}</span><span class="val">: ${t.signs[signKeys[data.panchang.rasiIdx]]}</span></div>
                        <div class="print-detail-item"><span class="label">${state.lang === 'ta' ? 'ஜென்ம லக்கினம்' : 'Lagna'}</span><span class="val">: ${t.signs[signKeys[getRasiSignIndex(data.lagnaLon)]]}</span></div>
                        <div class="print-detail-item"><span class="label">${state.lang === 'ta' ? 'பொதுநேரம், திருத்தம்' : 'Timezone Offset'}</span><span class="val">: ${timezoneOffsetStr}</span></div>
                        <div class="print-detail-item"><span class="label">${state.lang === 'ta' ? 'தமிழ் நேரம்' : 'Tamil Time'}</span><span class="val">: ${tamilTimeDisplay}</span></div>
                        <div class="print-detail-item"><span class="label">${state.lang === 'ta' ? 'பிறந்த ஊர்' : 'Birth Place'}</span><span class="val">: ${details.city}</span></div>
                        <div class="print-detail-item"><span class="label">${state.lang === 'ta' ? 'சூரிய உதயம்' : 'Sunrise'}</span><span class="val">: ${sunriseHM}</span></div>
                        <div class="print-detail-item"><span class="label">${state.lang === 'ta' ? 'சூரிய அஸ்தமனம்' : 'Sunset'}</span><span class="val">: ${sunsetHM}</span></div>
                        <div class="print-detail-item"><span class="label">${state.lang === 'ta' ? 'சூ.உ. தமிழ் நேரம்' : 'Sunrise Tamil Time'}</span><span class="val">: ${sunriseTamilTime}</span></div>
                    </div>
                    
                    <!-- Column 2 -->
                    <div class="print-details-col">
                        <div class="print-detail-item"><span class="label">${state.lang === 'ta' ? 'சூ-அ தமிழ் நேரம்' : 'Sunset Tamil Time'}</span><span class="val">: ${sunsetTamilTime}</span></div>
                        <div class="print-detail-item"><span class="label">${state.lang === 'ta' ? 'அகஸ்' : 'Ahas (Dinamana)'}</span><span class="val">: ${ahasDisplay}</span></div>
                        <div class="print-detail-item"><span class="label">${state.lang === 'ta' ? 'அயனாம்சம்' : 'Ayanamsa'}</span><span class="val">: -${data.ayanamsa.toFixed(2)} (${state.lang === 'ta' ? 'லஹரி' : 'Lahiri'})</span></div>
                        <div class="print-detail-item"><span class="label">${state.lang === 'ta' ? 'தமிழ் தேதி' : 'Tamil Date'}</span><span class="val">: ${tamilDateStr}</span></div>
                        <div class="print-detail-item"><span class="label">${state.lang === 'ta' ? 'உதயாதி நாழிகை' : 'Udayadhi Naazhigai'}</span><span class="val">: ${udayadhiDisplay}</span></div>
                        <div class="print-detail-item"><span class="label">${state.lang === 'ta' ? 'சுதேச மணி' : 'Local Mean Time (LMT)'}</span><span class="val">: ${lmtHM}</span></div>
                        <div class="print-detail-item"><span class="label">${state.lang === 'ta' ? 'நட்சத்திர ஹோரை' : 'Star Hora'}</span><span class="val">: ${formatTimeHM(new Date(birthDateObj.getTime() - 25 * 60 * 1000))}</span></div>
                        <div class="print-detail-item"><span class="label">${state.lang === 'ta' ? 'அட்சாம்சம்' : 'Latitude'}</span><span class="val">: ${latDisplayVal}</span></div>
                        <div class="print-detail-item"><span class="label">${state.lang === 'ta' ? 'தீர்க்காம்சம்' : 'Longitude'}</span><span class="val">: ${lonDisplayVal}</span></div>
                        <div class="print-detail-item"><span class="label">${state.lang === 'ta' ? 'திதி' : 'Tithi'}</span><span class="val">: ${tithiNameOnly}</span></div>
                        <div class="print-detail-item"><span class="label">${state.lang === 'ta' ? 'ஜனன ஹோரை' : 'Birth Hora'}</span><span class="val">: ${horaLordTamil} (${horaGender})</span></div>
                        <div class="print-detail-item"><span class="label">${state.lang === 'ta' ? 'பட்சம்' : 'Paksha'}</span><span class="val">: ${pakshaName}</span></div>
                        <div class="print-detail-item"><span class="label">${state.lang === 'ta' ? 'கரணம்' : 'Karana'}</span><span class="val">: ${getKaranaName(data.panchang.karanaIdx, state.lang)}</span></div>
                        <div class="print-detail-item"><span class="label">${state.lang === 'ta' ? 'யோகம்' : 'Yoga'}</span><span class="val">: ${getYogaName(data.panchang.yogaIdx, state.lang)}</span></div>
                    </div>
                </div>
                
                <!-- Divider -->
                <hr class="print-divider">
                
                <!-- Charts Grid (Rasi & Navamsam side-by-side) -->
                <div class="print-charts-grid">
                    <div class="print-chart-box">
                        <div class="print-chart-title">${state.lang === 'ta' ? 'இராசி' : 'Rasi Chart'}</div>
                        <div class="chart-grid rasi-theme">${printRasiGridHtml}</div>
                    </div>
                    <div class="print-chart-box">
                        <div class="print-chart-title">${state.lang === 'ta' ? 'நவாம்சம்' : 'Navamsam Chart'}</div>
                        <div class="chart-grid nav-theme">${printNavamsamGridHtml}</div>
                    </div>
                </div>
                
                <!-- Divider -->
                <hr class="print-divider">
                
                <!-- Planetary Longitudes Table -->
                <div class="print-table-container">
                    <table class="print-planet-table">
                        <thead>
                            <tr>
                                <th>${state.lang === 'ta' ? 'கிரகம்' : 'Planet'}</th>
                                <th>${state.lang === 'ta' ? 'பா-கலை' : 'Sign Longitude'}</th>
                                <th>${state.lang === 'ta' ? 'நட்சத்திரம்' : 'Star'}</th>
                                <th>${state.lang === 'ta' ? 'ந.பாதம்' : 'Pada'}</th>
                                <th>${state.lang === 'ta' ? 'சாரம்' : 'Star Lord'}</th>
                                <th>${state.lang === 'ta' ? 'நிராயண' : 'Longitude'}</th>
                                <th>${state.lang === 'ta' ? 'ராசி' : 'Rasi'}</th>
                                <th>${state.lang === 'ta' ? 'ராசி அதிபதி' : 'Rasi Lord'}</th>
                                <th>${state.lang === 'ta' ? 'வேகம்' : 'Status'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${printTableRows}
                        </tbody>
                    </table>
                </div>
                
                <!-- Dasa Balance Info -->
                <div class="print-dasa-balance">
                    <div><strong>${state.lang === 'ta' ? 'பிறந்த கால திசை இருப்பு (ஜனன கால தசாசேஷம்)' : 'Dasa Balance at Birth'}:-</strong> ${dasaBalanceStr}</div>
                    <div style="margin-top: 5px;"><strong>${state.lang === 'ta' ? 'நடப்பு தசா புத்தி' : 'Current Dasa Bhukti'}:-</strong> ${currentDasaBhuktiStr}</div>
                </div>
                

            </div>
        </div>
    `;
}

// Helper to generate Rasi/Navamsam cells
// Grid cells indexes clockwise:
// Row 1: Pisces(11), Aries(0), Taurus(1), Gemini(2)
// Row 2: Aquarius(10), Center, Center, Cancer(3)
// Row 3: Capricorn(9), Center, Center, Leo(4)
// Row 4: Sagittarius(8), Scorpio(7), Libra(6), Virgo(5)
// Render North Indian style chart using SVG
function renderNorthChartGrid(planets, isNavamsam, t) {
    const lagnaPlanet = planets.find(p => p.name === 'Lagna');
    const lagnaSignIdx = lagnaPlanet ? (isNavamsam ? lagnaPlanet.navamsamIdx : lagnaPlanet.rasiIdx) : 0;
    
    const houseConfigs = [
        { houseNum: 1,  rx: 200, ry: 75,  px: 200, py: 120 },
        { houseNum: 2,  rx: 130, ry: 45,  px: 85,  py: 30 },
        { houseNum: 3,  rx: 45,  ry: 130, px: 30,  py: 85 },
        { houseNum: 4,  rx: 125, ry: 200, px: 75,  py: 200 },
        { houseNum: 5,  rx: 45,  ry: 270, px: 30,  py: 315 },
        { houseNum: 6,  rx: 130, ry: 355, px: 85,  py: 370 },
        { houseNum: 7,  rx: 200, ry: 325, px: 200, py: 280 },
        { houseNum: 8,  rx: 270, ry: 355, px: 315, py: 370 },
        { houseNum: 9,  rx: 355, ry: 270, px: 370, py: 315 },
        { houseNum: 10, rx: 275, ry: 200, px: 325, py: 200 },
        { houseNum: 11, rx: 355, ry: 130, px: 370, py: 85 },
        { houseNum: 12, rx: 270, ry: 45,  px: 315, py: 30 }
    ];
    
    let textElements = '';
    
    houseConfigs.forEach(cfg => {
        const signIdx = (lagnaSignIdx + cfg.houseNum - 1) % 12;
        const rashiNumber = signIdx + 1;
        
        const matchingPlanets = planets.filter(p => {
            const sign = isNavamsam ? p.navamsamIdx : p.rasiIdx;
            return sign === signIdx;
        });
        
        const planetList = matchingPlanets.map(p => t.planetsShort[p.name]).join(' ');
        
        textElements += `
            <text x="${cfg.rx}" y="${cfg.ry}" class="north-rashi-num">${rashiNumber}</text>
            <text x="${cfg.px}" y="${cfg.py}" class="north-planet-list">${planetList}</text>
        `;
    });
    
    const themeClass = isNavamsam ? 'nav-theme' : 'rasi-theme';
    
    return `
        <svg viewBox="0 0 400 400" class="north-chart-svg ${themeClass}">
            <rect x="2" y="2" width="396" height="396" class="chart-outer-rect" />
            <line x1="2" y1="2" x2="398" y2="398" class="chart-line" />
            <line x1="398" y1="2" x2="2" y2="398" class="chart-line" />
            <polygon points="200,2 398,200 200,398 2,200" class="chart-polygon" />
            ${textElements}
        </svg>
    `;
}

function getPlanetShorthand(p, t, lang) {
    let pShort = t.planetsShort[p.name];
    if (p.isRetro && p.name !== 'Rahu' && p.name !== 'Ketu' && p.name !== 'Lagna' && p.name !== 'Mandi') {
        pShort += lang === 'ta' ? ' (வ)' : ' (R)';
    }
    return pShort;
}

function renderChartGrid(planets, isNavamsam, t, starPada, gender, datetime, lat, lon, city) {
    const layout = [
        { signIdx: 11, row: 1, col: 1 }, // Pisces
        { signIdx: 0,  row: 1, col: 2 }, // Aries
        { signIdx: 1,  row: 1, col: 3 }, // Taurus
        { signIdx: 2,  row: 1, col: 4 }, // Gemini
        { signIdx: 3,  row: 2, col: 4 }, // Cancer
        { signIdx: 4,  row: 3, col: 4 }, // Leo
        { signIdx: 5,  row: 4, col: 4 }, // Virgo
        { signIdx: 6,  row: 4, col: 3 }, // Libra
        { signIdx: 7,  row: 4, col: 2 }, // Scorpio
        { signIdx: 8,  row: 4, col: 1 }, // Sagittarius
        { signIdx: 9,  row: 3, col: 1 }, // Capricorn
        { signIdx: 10, row: 2, col: 1 }  // Aquarius
    ];
    
    // Find Lagna sign
    const lagnaPlanet = planets.find(p => p.name === 'Lagna');
    const lagnaSignIdx = lagnaPlanet ? (isNavamsam ? lagnaPlanet.navamsamIdx : lagnaPlanet.rasiIdx) : 0;
    
    let cellsHtml = '';
    
    layout.forEach(cell => {
        const matchingPlanets = planets.filter(p => {
            const sign = isNavamsam ? p.navamsamIdx : p.rasiIdx;
            return sign === cell.signIdx;
        });
        
        // Generate planetary degree label (only for Rasi chart, in top-left)
        let degreeLabelHtml = '';
        if (!isNavamsam) {
            const lines = matchingPlanets.map(p => {
                const pShort = getPlanetShorthand(p, t, state.lang);
                const relativeLon = p.longitude % 30;
                return `${pShort}-${relativeLon.toFixed(2)}`;
            });
            degreeLabelHtml = `<div class="cell-degree-info">${lines.join('\n')}</div>`;
        }
        
        // Generate list of planet shorthands in center of cell
        let planetListHtml = '';
        matchingPlanets.forEach(p => {
            const pShort = getPlanetShorthand(p, t, state.lang);
            planetListHtml += `<div class="cell-planet-item">${pShort}</div>`;
        });
        
        // House numbers (relative to Lagna, clockwise starting from Lagna = 1)
        // Only display house numbers on the Rasi chart
        let houseNumHtml = '';
        if (!isNavamsam) {
            const houseNum = ((cell.signIdx - lagnaSignIdx + 12) % 12) + 1;
            houseNumHtml = `<div class="cell-house-num">${houseNum}</div>`;
        }
        
        // Styles for layout grid placement
        const style = `grid-row: ${cell.row}; grid-column: ${cell.col};`;
        
        const isLagnaCell = cell.signIdx === lagnaSignIdx;
        let cellClass = isLagnaCell ? 'chart-cell lagna-highlight' : 'chart-cell';
        if (isLagnaCell) {
            let cornerClass = '';
            if (cell.row === 1) {
                cornerClass = cell.col <= 2 ? 'lagna-tl' : 'lagna-tr';
            } else if (cell.row === 4) {
                cornerClass = cell.col <= 2 ? 'lagna-bl' : 'lagna-br';
            } else if (cell.col === 1) {
                cornerClass = cell.row <= 2 ? 'lagna-tl' : 'lagna-bl';
            } else {
                cornerClass = cell.row <= 2 ? 'lagna-tr' : 'lagna-br';
            }
            cellClass += ' ' + cornerClass;
        }
        
        cellsHtml += `
            <div class="${cellClass}" style="${style}">
                ${houseNumHtml}
                ${degreeLabelHtml}
                <div class="cell-planets-list">
                    ${planetListHtml}
                </div>
            </div>
        `;
    });
    
    // Add center cell
    const centerTitle = isNavamsam ? t.navamsamTitle : t.rasiTitle;
    cellsHtml += `
        <div class="chart-center-cell">
            <h3 class="center-title">${centerTitle}</h3>
            <div class="center-star">${starPada}</div>
            <div class="center-info-row bold">${gender}</div>
            <div class="center-info-row">${datetime}</div>
            <div class="center-info-row">${lat} - ${lon}</div>
            <div class="center-info-row">${city}</div>
        </div>
    `;
    
    return cellsHtml;
}

// Get Tithi name based on index (0 to 29)
function getTithiName(idx, lang) {
    const paksha = idx < 15 ? (lang === 'ta' ? 'வளர்பிறை' : 'Shukla Paksha') : (lang === 'ta' ? 'தேய்பிறை' : 'Krishna Paksha');
    const tithisTa = [
        "பிரதமை", "துவிதியை", "திருதியை", "சதுர்த்தி", "பஞ்சமி", "சஷ்டி", "சப்தமி", "அஷ்டமி", "நவமி", "தசமி",
        "ஏகாதசி", "துவாதசி", "திரயோதசி", "சதுர்தசி", "பௌர்ணமி / அமாவாசை"
    ];
    const tithisEn = [
        "Prathama", "Dwitiya", "Tritiya", "Chaturthi", "Panchami", "Shashthi", "Saptami", "Ashtami", "Navami", "Dashami",
        "Ekadashi", "Dwadashi", "Trayodashi", "Chaturdashi", "Full Moon / New Moon"
    ];
    
    let tithiName = '';
    const rem = idx % 15;
    if (rem === 14) {
        tithiName = idx < 15 ? (lang === 'ta' ? 'பௌர்ணமி' : 'Purnima') : (lang === 'ta' ? 'அமாவாசை' : 'Amavasya');
    } else {
        tithiName = lang === 'ta' ? tithisTa[rem] : tithisEn[rem];
    }
    
    return `${paksha} - ${tithiName}`;
}

// Get Yoga Name
function getYogaName(idx, lang) {
    const yogasTa = [
        "விஷ்கம்பம்", "பிரீதி", "ஆயுஷ்மான்", "சௌபாக்கியம்", "சோபனம்", "அதிகண்டம்", "சுகர்மம்", "திருதி", "சூலம்",
        "கண்டம்", "விருத்தி", "துருவம்", "வியாதீபாதம்", "ஹர்ஷணம்", "வஜ்ரம்", "சித்தி", "வியதீபாதம்", "வரியான்",
        "பரிகம்", "சிவம்", "சித்தம்", "சாத்தியம்", "சுபம்", "சுப்ரம்", "பிராமியம்", "ஐந்திரம்", "வைதிருதி"
    ];
    const yogasEn = [
        "Vishkumbha", "Preeti", "Ayushman", "Saubhagya", "Sobhana", "Atiganda", "Sukarma", "Dhriti", "Shoola",
        "Ganda", "Vriddhi", "Dhruva", "Vyaghata", "Harshana", "Vajra", "Siddhi", "Vyatipata", "Variyan",
        "Parigha", "Shiva", "Siddha", "Sadhya", "Shubha", "Shukla", "Brahma", "Indra", "Vaidhriti"
    ];
    return lang === 'ta' ? yogasTa[idx] : yogasEn[idx];
}

// Get Karana Name
function getKaranaName(idx, lang) {
    const karanasTa = [
        "சிம்மம் (பவ)", "புலி (பாலவ)", "பன்றி (கௌலவ)", "கழுதை (தைதிலை)", "யானை (கரசை)", "பசு (வணிசை)", "பத்திரி (பத்திரை)",
        "சகுனி", "சதுஷ்பாதம்", "நாகவம்", "கிம்ஸ்துக்னம்"
    ];
    const karanasEn = [
        "Bava", "Balava", "Kaulava", "Taitila", "Garaja", "Vanija", "Vishti",
        "Shakuni", "Chatushpada", "Naga", "Kimstughna"
    ];
    
    let kIdx = 0;
    if (idx === 0) kIdx = 10; // Kimstughna
    else if (idx >= 57) kIdx = 7 + (idx - 57); // Shakuni, Chatushpada, Naga
    else {
        kIdx = ((idx - 1) % 7); // Repeating 7 karanas
    }
    
    return lang === 'ta' ? karanasTa[kIdx] : karanasEn[kIdx];
}

// Bind event listeners to UI components
function bindEvents() {
    // Logo Click (Go to home/form view)
    const headerLogo = document.querySelector('#header-logo');
    if (headerLogo) {
        headerLogo.addEventListener('click', () => {
            state.view = 'form';
            render();
        });
    }

    // 1. Language Selection Dropdown
    const langSelect = document.querySelector('#lang-select');
    if (langSelect) {
        langSelect.addEventListener('change', (e) => {
            state.lang = e.target.value;
            render();
        });
    }
    
    // Theme Toggle
    const toggleThemeBtn = document.querySelector('#toggle-theme-btn');
    if (toggleThemeBtn) {
        toggleThemeBtn.addEventListener('click', () => {
            document.body.classList.toggle('light-mode');
            render();
        });
    }

    // Scroll to Top Floating Button & Nav Shortcut Handler
    const scrollToTopBtn = document.querySelector('#scroll-to-top-btn');
    if (scrollToTopBtn) {
        scrollToTopBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });

        const toggleScrollBtnVisibility = () => {
            if (window.scrollY > 250) {
                scrollToTopBtn.classList.add('visible');
            } else {
                scrollToTopBtn.classList.remove('visible');
            }
        };

        window.addEventListener('scroll', toggleScrollBtnVisibility, { passive: true });
        toggleScrollBtnVisibility();
    }



        // Global Page Zoom Buttons (Header & Left Sidebar - Active on ALL pages)
    const handleZoomStep = (delta) => {
        const currentZoom = parseInt(state.globalZoom, 10) || 100;
        const nextZoom = currentZoom + delta;
        if (nextZoom >= 70 && nextZoom <= 130) {
            state.globalZoom = nextZoom;
            render();
        }
    };

    const globalZoomOutBtn = document.querySelector('#global-zoom-out-btn');
    if (globalZoomOutBtn) {
        globalZoomOutBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            handleZoomStep(-10);
        });
    }

    const globalZoomInBtn = document.querySelector('#global-zoom-in-btn');
    if (globalZoomInBtn) {
        globalZoomInBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            handleZoomStep(10);
        });
    }

    const sidebarZoomOutBtn = document.querySelector('#sidebar-zoom-out-btn');
    if (sidebarZoomOutBtn) {
        sidebarZoomOutBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            handleZoomStep(-10);
        });
    }

    const sidebarZoomInBtn = document.querySelector('#sidebar-zoom-in-btn');
    if (sidebarZoomInBtn) {
        sidebarZoomInBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            handleZoomStep(10);
        });
    }

    // Accent Color Selection
    const accentMenuBtn = document.querySelector('#accent-menu-btn');
    const accentDropdown = document.querySelector('#accent-dropdown');
    if (accentMenuBtn && accentDropdown) {
        accentMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isHidden = accentDropdown.style.display === 'none' || accentDropdown.style.display === '';
            accentDropdown.style.display = isHidden ? 'flex' : 'none';
        });

        accentDropdown.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    const chartAccentMenuBtn = document.querySelector('#chart-accent-menu-btn');
    const chartAccentDropdown = document.querySelector('#chart-accent-dropdown');
    if (chartAccentMenuBtn && chartAccentDropdown) {
        chartAccentMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isHidden = chartAccentDropdown.style.display === 'none' || chartAccentDropdown.style.display === '';
            chartAccentDropdown.style.display = isHidden ? 'flex' : 'none';
        });

        chartAccentDropdown.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    // Close accent dropdowns when clicking outside
    document.addEventListener('click', (e) => {
        const dropdown = document.querySelector('#accent-dropdown');
        const menuBtn = document.querySelector('#accent-menu-btn');
        if (dropdown && menuBtn && !menuBtn.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.style.display = 'none';
        }

        const chartDropdown = document.querySelector('#chart-accent-dropdown');
        const chartMenuBtn = document.querySelector('#chart-accent-menu-btn');
        if (chartDropdown && chartMenuBtn && !chartMenuBtn.contains(e.target) && !chartDropdown.contains(e.target)) {
            chartDropdown.style.display = 'none';
        }
    });

    // Preset color dots event listeners
    const presetDots = document.querySelectorAll('.preset-color-dot');
    presetDots.forEach(dot => {
        dot.addEventListener('click', () => {
            const primary = dot.getAttribute('data-primary');
            const accent = dot.getAttribute('data-accent');
            currentAccent = { primary, accent };
            applyAccentColor(primary, accent);
            localStorage.setItem('horoscope_app_accent', JSON.stringify(currentAccent));

            // Update custom picker input value and hex text
            const customPicker = document.querySelector('#custom-accent-picker');
            if (customPicker) customPicker.value = primary;
            const hexVal = document.querySelector('#custom-color-value');
            if (hexVal) hexVal.textContent = primary.toUpperCase();

            // Manage active classes
            presetDots.forEach(d => {
                if (d.getAttribute('data-primary').toLowerCase() === primary.toLowerCase()) {
                    d.classList.add('active');
                } else {
                    d.classList.remove('active');
                }
            });
        });
    });

    // Custom color picker input events
    const customPicker = document.querySelector('#custom-accent-picker');
    if (customPicker) {
        customPicker.addEventListener('input', (e) => {
            const primary = e.target.value;
            const accent = computeAccentForCustom(primary);
            currentAccent = { primary, accent };
            applyAccentColor(primary, accent);

            const hexVal = document.querySelector('#custom-color-value');
            if (hexVal) hexVal.textContent = primary.toUpperCase();

            presetDots.forEach(d => d.classList.remove('active'));
        });

        customPicker.addEventListener('change', (e) => {
            const primary = e.target.value;
            const accent = computeAccentForCustom(primary);
            currentAccent = { primary, accent };
            localStorage.setItem('horoscope_app_accent', JSON.stringify(currentAccent));
        });
    }

    // Chart Preset color dots event listeners
    const chartPresetDots = document.querySelectorAll('.chart-preset-color-dot');
    chartPresetDots.forEach(dot => {
        dot.addEventListener('click', () => {
            const primary = dot.getAttribute('data-primary');
            currentChartAccent = primary;
            applyChartAccentColor(primary);
            localStorage.setItem('horoscope_app_chart_accent', currentChartAccent);

            // Update custom chart picker input value and hex text
            const customChartPicker = document.querySelector('#custom-chart-accent-picker');
            if (customChartPicker) customChartPicker.value = primary;
            const hexVal = document.querySelector('#custom-chart-color-value');
            if (hexVal) hexVal.textContent = primary.toUpperCase();

            // Manage active classes
            chartPresetDots.forEach(d => {
                if (d.getAttribute('data-primary').toLowerCase() === primary.toLowerCase()) {
                    d.classList.add('active');
                } else {
                    d.classList.remove('active');
                }
            });
        });
    });

    // Chart Custom color picker input events
    const customChartPicker = document.querySelector('#custom-chart-accent-picker');
    if (customChartPicker) {
        customChartPicker.addEventListener('input', (e) => {
            const primary = e.target.value;
            currentChartAccent = primary;
            applyChartAccentColor(primary);

            const hexVal = document.querySelector('#custom-chart-color-value');
            if (hexVal) hexVal.textContent = primary.toUpperCase();

            chartPresetDots.forEach(d => d.classList.remove('active'));
        });

        customChartPicker.addEventListener('change', (e) => {
            const primary = e.target.value;
            currentChartAccent = primary;
            localStorage.setItem('horoscope_app_chart_accent', currentChartAccent);
        });
    }
    
    // Form view events
    if (state.view === 'form') {
        const form = document.querySelector('#horoscope-form');
        const placeInput = document.querySelector('#input-place');
        const suggestionsList = document.querySelector('#city-suggestions');
        
        // Autocomplete search
        let debounceTimer;
        if (placeInput && suggestionsList) {
            placeInput.addEventListener('input', (e) => {
                const query = e.target.value.trim();
                suggestionsList.innerHTML = '';
                
                if (query.length < 2) {
                    suggestionsList.style.display = 'none';
                    return;
                }
                
                suggestionsList.innerHTML = '';
                
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=25&addressdetails=1`)
                        .then(res => res.json())
                        .then(data => {
                            // If user cleared query in the meantime
                            if (placeInput.value.trim().length < 2) {
                                suggestionsList.innerHTML = '';
                                suggestionsList.style.display = 'none';
                                return;
                            }
                            
                            const itemsToShow = [];
                            
                            // Add Nominatim results
                            if (data && data.length > 0) {
                                // Filter Nominatim results to include all actual places (cities, towns, villages, hamlets, administrative divisions, etc.)
                                const placeFiltered = data.filter(item => {
                                    const isExcluded = ['highway', 'shop', 'tourism', 'amenity', 'leisure', 'office', 'aeroway', 'historic', 'railway', 'man_made'].includes(item.class);
                                    return !isExcluded;
                                });

                                placeFiltered.slice(0, 10).forEach(item => {
                                    const cleanLabel = formatCleanPlaceLabel(item);
                                    itemsToShow.push({
                                        isApi: true,
                                        label: cleanLabel,
                                        cityData: {
                                            name: cleanLabel,
                                            tamilName: cleanLabel,
                                            lat: parseFloat(item.lat),
                                            lon: parseFloat(item.lon)
                                        }
                                    });
                                });
                            }
                            
                            // If API has items, clear local preview and show API results
                            if (itemsToShow.length > 0) {
                                suggestionsList.innerHTML = '';
                                itemsToShow.forEach(item => {
                                    const li = document.createElement('li');
                                    li.textContent = item.label;
                                    li.addEventListener('click', () => {
                                        placeInput.value = item.label;
                                        state.selectedCity = item.cityData;
                                        suggestionsList.style.display = 'none';
                                    });
                                    suggestionsList.appendChild(li);
                                });
                                suggestionsList.style.display = 'block';
                            }
                        })
                        .catch(err => {
                            console.error("Nominatim API lookup failed", err);
                            // Fallback local results are already displaying instantly.
                        });
                }, 500);
            });
            
            // Clear input button handler
            const clearPlaceBtn = document.querySelector('#clear-place-btn');
            if (clearPlaceBtn && placeInput) {
                const toggleClearBtn = () => {
                    clearPlaceBtn.style.display = placeInput.value.trim() !== '' ? 'flex' : 'none';
                };
                placeInput.addEventListener('input', toggleClearBtn);
                clearPlaceBtn.addEventListener('click', () => {
                    placeInput.value = '';
                    state.selectedCity = null;
                    suggestionsList.style.display = 'none';
                    clearPlaceBtn.style.display = 'none';
                    placeInput.focus();
                });
                toggleClearBtn();
            }
            
            // Hide list on click outside
            document.addEventListener('click', (e) => {
                if (e.target !== placeInput && e.target !== suggestionsList && e.target !== clearPlaceBtn) {
                    suggestionsList.style.display = 'none';
                }
            });
        }
        
        // Live Horoscope button click
        const liveBtn = document.querySelector('#live-btn');
        if (liveBtn) {
            liveBtn.addEventListener('click', () => {
                const now = new Date();
                
                // Formulate YYYY-MM-DD
                const year = now.getFullYear();
                const month = (now.getMonth() + 1).toString().padStart(2, '0');
                const day = now.getDate().toString().padStart(2, '0');
                const dateIsoStr = `${year}-${month}-${day}`;
                
                // Formulate HH:MM:SS
                const hour = now.getHours();
                const minute = now.getMinutes().toString().padStart(2, '0');
                const ampm = hour >= 12 ? 'PM' : 'AM';
                const time24Str = `${hour.toString().padStart(2, '0')}:${minute}:00`;
                
                const place = placeInput ? placeInput.value : '';
                let lat = state.selectedCity ? state.selectedCity.lat : null;
                let lon = state.selectedCity ? state.selectedCity.lon : null;
                let finalCityName = state.selectedCity ? state.selectedCity.name : '';
                
                const calculateAndShowLive = (lLatitude, lLongitude, lCityName) => {
                    const name = state.lang === 'ta' ? 'இப்போதைய ஜாதகம் (Live)' : 'Live Horoscope';
                    const gender = 'male';
                    
                    const horoscope = calculateHoroscope({
                        name,
                        gender,
                        dateStr: dateIsoStr,
                        timeStr: time24Str,
                        lat: lLatitude,
                        lon: lLongitude,
                        fatherName: '',
                        motherName: '',
                        ampm,
                        city: lCityName
                    });
                    
                    state.horoscope = horoscope;
                    state.view = 'results';
                    render();
                };

                if (!lat || !lon) {
                    const loadingText = {
                        en: "Detecting location...",
                        ta: "இருப்பிடம் கண்டறியப்படுகிறது...",
                        hi: "स्थान का पता लगाया जा रहा है...",
                        te: "స్థానాన్ని కనుగొంటున్నారు...",
                        kn: "ಸ್ಥಳವನ್ನು ಪತ್ತೆಹಚ್ಚಲಾಗುತ್ತಿದೆ...",
                        ml: "സ്ഥാനം കണ്ടെത്തുന്നു..."
                    };
                    const deniedText = {
                        en: "Location access denied or unavailable. Please enter manually.",
                        ta: "இருப்பிட அணுகல் மறுக்கப்பட்டது அல்லது கிடைக்கவில்லை. தயவுசெய்து கைமுறையாக உள்ளிடவும்.",
                        hi: "स्थान पहुंच अस्वीकार या अनुपलब्ध। कृपया मैन्युअल रूप से दर्ज करें।",
                        te: "స్థాన ప్రాప్యత నిరాకరించబడింది లేదా అందుబాటులో లేదు. దయచేసి మాన్യുవల్‌గా నమోదు చేయండి.",
                        kn: "ಸ್ಥಳ ಪ್ರವೇಶವನ್ನು నిರಾಕರಿಸಲಾಗಿದೆ ಅಥವಾ ಲಭ್ಯವಿಲ್ಲ. ದಯವಿಟ್ಟು ಹಸ್ತಚಾಲಿತವಾಗಿ ನಮೂದಿಸಿ.",
                        ml: "ലൊക്കേഷൻ അനുമതി നിഷേധിക്കപ്പെട്ടു അല്ലെങ്കിൽ ലഭ്യമല്ല. ദയവായി നേരിട്ട് നൽകുക."
                    };
                    const fallbackName = {
                        en: "Live Location",
                        ta: "தற்போதைய இருப்பிடம்",
                        hi: "वर्तमान स्थान",
                        te: "ప్రస్తుత స్థానం",
                        kn: "ಪ್ರಸ್ತುತ ಸ್ಥಳ",
                        ml: "നിലവിലെ স্থানം"
                    };

                    if (placeInput) {
                        placeInput.value = loadingText[state.lang] || loadingText['en'];
                        placeInput.disabled = true;
                    }
                    const locateBtn = document.querySelector('#locate-btn');
                    if (locateBtn) locateBtn.classList.add('loading');

                    getCurrentLocation(
                        (lLat, lLon) => {
                            fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lLat}&lon=${lLon}&addressdetails=1`)
                                .then(res => res.json())
                                .then(data => {
                                    const cleanLabel = formatCleanPlaceLabel(data);
                                    state.selectedCity = {
                                        name: cleanLabel,
                                        tamilName: cleanLabel,
                                        lat: lLat,
                                        lon: lLon
                                    };
                                    if (placeInput) {
                                        placeInput.value = cleanLabel;
                                        placeInput.disabled = false;
                                    }
                                    if (locateBtn) locateBtn.classList.remove('loading');
                                    calculateAndShowLive(lLat, lLon, cleanLabel);
                                })
                                .catch(err => {
                                    console.error("Reverse lookup failed, using fallback name", err);
                                    const nameFallback = fallbackName[state.lang] || fallbackName['en'];
                                    state.selectedCity = {
                                        name: nameFallback,
                                        tamilName: nameFallback,
                                        lat: lLat,
                                        lon: lLon
                                    };
                                    if (placeInput) {
                                        placeInput.value = nameFallback;
                                        placeInput.disabled = false;
                                    }
                                    if (locateBtn) locateBtn.classList.remove('loading');
                                    calculateAndShowLive(lLat, lLon, nameFallback);
                                });
                        },
                        (err) => {
                            console.error(err);
                            alert(deniedText[state.lang] || deniedText['en']);
                            if (placeInput) {
                                placeInput.value = '';
                                placeInput.disabled = false;
                                placeInput.focus();
                            }
                            if (locateBtn) locateBtn.classList.remove('loading');
                        }
                    );
                } else {
                    calculateAndShowLive(lat, lon, finalCityName);
                }
            });
        }

        // Locate button click
        const locateBtn = document.querySelector('#locate-btn');
        if (locateBtn) {
            locateBtn.addEventListener('click', () => {
                const loadingText = {
                    en: "Detecting location...",
                    ta: "இருப்பிடம் கண்டறியப்படுகிறது...",
                    hi: "स्थान का पता लगाया जा रहा है...",
                    te: "స్థానాన్ని కనుగొంటున్నారు...",
                    kn: "ಸ್ಥಳವನ್ನು ಪತ್ತೆಹಚ್ಚಲಾಗುತ್ತಿದೆ...",
                    ml: "സ്ഥാനം കണ്ടെത്തുന്നു..."
                };
                const deniedText = {
                    en: "Location access denied or unavailable. Please enter manually.",
                    ta: "இருப்பிட அணுகல் மறுக்கப்பட்டது அல்லது கிடைக்கவில்லை. தயவுசெய்து கைமுறையாக உள்ளிடவும்.",
                    hi: "स्थान पहुंच अस्वीकार या अनुपलब्ध। कृपया मैन्युअल रूप से दर्ज करें।",
                    te: "స్థాన ప్రాప్యత నిరాకరించబడింది లేదా అందుబాటులో లేదు. దయచేసి మాన్యువల్‌గా నమోదు చేయండి.",
                    kn: "ಸ್ಥಳ ಪ್ರವೇಶವನ್ನು నిರಾಕರಿಸಲಾಗಿದೆ ಅಥವಾ ಲಭ್ಯವಿಲ್ಲ. ದಯವಿಟ್ಟು ಹಸ್ತಚಾಲಿತವಾಗಿ ನಮೂದಿಸಿ.",
                    ml: "ലൊക്കേഷൻ അനുമതി നിഷേധിക്കപ്പെട്ടു അല്ലെങ്കിൽ ലഭ്യമല്ല. ദയവായി നേരിട്ട് നൽകുക."
                };
                const fallbackName = {
                    en: "Live Location",
                    ta: "தற்போதைய இருப்பிடம்",
                    hi: "वर्तमान स्थान",
                    te: "ప్రస్తుత స్థానం",
                    kn: "ಪ್ರಸ್ತುತ ಸ್ಥಳ",
                    ml: "നിലവിലെ സ്ഥാനം"
                };

                if (placeInput) {
                    placeInput.value = loadingText[state.lang] || loadingText['en'];
                    placeInput.disabled = true;
                }
                locateBtn.classList.add('loading');

                getCurrentLocation(
                    (lLat, lLon) => {
                        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lLat}&lon=${lLon}&addressdetails=1`)
                            .then(res => res.json())
                            .then(data => {
                                const cleanLabel = formatCleanPlaceLabel(data);
                                state.selectedCity = {
                                    name: cleanLabel,
                                    tamilName: cleanLabel,
                                    lat: lLat,
                                    lon: lLon
                                };
                                if (placeInput) {
                                    placeInput.value = cleanLabel;
                                    placeInput.disabled = false;
                                }
                                locateBtn.classList.remove('loading');
                                const clearBtn = document.querySelector('#clear-place-btn');
                                if (clearBtn) clearBtn.style.display = 'flex';
                            })
                            .catch(err => {
                                console.error("Reverse lookup failed, using fallback name", err);
                                const nameFallback = fallbackName[state.lang] || fallbackName['en'];
                                state.selectedCity = {
                                    name: nameFallback,
                                    tamilName: nameFallback,
                                    lat: lLat,
                                    lon: lLon
                                };
                                if (placeInput) {
                                    placeInput.value = nameFallback;
                                    placeInput.disabled = false;
                                }
                                locateBtn.classList.remove('loading');
                                const clearBtn = document.querySelector('#clear-place-btn');
                                if (clearBtn) clearBtn.style.display = 'flex';
                            });
                    },
                    (err) => {
                        console.error(err);
                        alert(deniedText[state.lang] || deniedText['en']);
                        if (placeInput) {
                            placeInput.value = '';
                            placeInput.disabled = false;
                            placeInput.focus();
                        }
                        locateBtn.classList.remove('loading');
                    }
                );
            });
        }
        
        // Form submit
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                
                const name = document.querySelector('#input-name').value;
                const gender = document.querySelector('#input-gender').value;
                const place = placeInput.value;
                
                const day = document.querySelector('#select-day').value;
                const month = document.querySelector('#select-month').value;
                const year = document.querySelector('#select-year').value;
                
                const hour = document.querySelector('#select-hour').value;
                const minute = document.querySelector('#select-minute').value;
                const ampm = document.querySelector('#select-ampm').value;
                

                
                // Formulate 24h ISO time
                let hr24 = parseInt(hour);
                if (ampm === 'PM' && hr24 < 12) hr24 += 12;
                if (ampm === 'AM' && hr24 === 12) hr24 = 0;
                const hr24Str = hr24.toString().padStart(2, '0');
                const time24Str = `${hr24Str}:${minute}:00`;
                const dateIsoStr = `${year}-${month}-${day}`;
                
                // Retrieve coordinates: check if typed name matches preloaded city, otherwise fallback to selectedCity
                const lat = state.selectedCity ? state.selectedCity.lat : null;
                const lon = state.selectedCity ? state.selectedCity.lon : null;
                const finalCityName = state.selectedCity ? state.selectedCity.name : '';
                
                if (!lat || !lon) {
                    alert(state.lang === 'ta' ? 'தயவுசெய்து பட்டியலிலிருந்து ஒரு செல்லுபடியாகும் பிறந்த இடத்தை தேர்ந்தெடுக்கவும்.' : 'Please select a valid birth place from the list.');
                    if (placeInput) placeInput.focus();
                    return;
                }
                
                // Calculate
                const horoscope = calculateHoroscope({
                    name,
                    gender,
                    dateStr: dateIsoStr,
                    timeStr: time24Str,
                    lat,
                    lon,
                    fatherName: '',
                    motherName: '',
                    ampm,
                    city: finalCityName
                });
                
                state.horoscope = horoscope;
                state.view = 'results';
                render();
            });
        }
        
        // Transit Date, Time & Location controls event listeners
        const transitDateInput = document.querySelector('#transit-date-input');
        const transitTimeInput = document.querySelector('#transit-time-input');
        const transitLocationInput = document.querySelector('#transit-location-input');
        const transitLocateBtn = document.querySelector('#transit-locate-btn');
        const transitSuggestionsList = document.querySelector('#transit-suggestions-dropdown');
        
        if (transitDateInput) {
            transitDateInput.addEventListener('change', (e) => {
                state.transitDate = e.target.value;
                render();
            });
        }

        const chandrashtamaDateInput = document.querySelector('#chandrashtama-date-input');
        if (chandrashtamaDateInput) {
            chandrashtamaDateInput.addEventListener('change', (e) => {
                state.transitDate = e.target.value;
                render();
            });
        }
        
        if (transitTimeInput) {
            transitTimeInput.addEventListener('change', (e) => {
                state.transitTime = e.target.value;
                render();
            });
        }

        const calendarTimeInput = document.querySelector('#calendar-time-input');
        const calendarLocationInput = document.querySelector('#calendar-location-input');
        if (calendarTimeInput) {
            calendarTimeInput.addEventListener('change', (e) => {
                state.transitTime = e.target.value;
                render();
            });
        }
        if (calendarLocationInput) {
            calendarLocationInput.addEventListener('change', () => {
                const query = calendarLocationInput.value.trim();
                if (query.length < 2) return;

                fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&addressdetails=1`)
                    .then(res => res.json())
                    .then(data => {
                        if (!data || data.length === 0) return;
                        const item = data[0];
                        state.transitLocationName = formatCleanPlaceLabel(item);
                        state.transitLatitude = parseFloat(item.lat);
                        state.transitLongitude = parseFloat(item.lon);
                        render();
                    })
                    .catch(err => console.error("Calendar location lookup failed", err));
            });
        }

        const transitionsDateInput = document.querySelector('#transitions-date-input');
        const transitionsTimeInput = document.querySelector('#transitions-time-input');
        const transitionsLocationInput = document.querySelector('#transitions-location-input');
        const transitionsTodayBtn = document.querySelector('#transitions-today-btn');
        if (transitionsDateInput) {
            transitionsDateInput.addEventListener('change', (e) => {
                state.transitDate = e.target.value;
                render();
            });
        }
        if (transitionsTimeInput) {
            transitionsTimeInput.addEventListener('change', (e) => {
                state.transitTime = e.target.value;
                render();
            });
        }
        if (transitionsTodayBtn) {
            transitionsTodayBtn.addEventListener('click', () => {
                state.transitDate = new Date().toISOString().split('T')[0];
                render();
            });
        }
        if (transitionsLocationInput) {
            transitionsLocationInput.addEventListener('change', () => {
                const query = transitionsLocationInput.value.trim();
                if (query.length < 2) return;

                fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&addressdetails=1`)
                    .then(res => res.json())
                    .then(data => {
                        if (!data || data.length === 0) return;
                        const item = data[0];
                        state.transitLocationName = formatCleanPlaceLabel(item);
                        state.transitLatitude = parseFloat(item.lat);
                        state.transitLongitude = parseFloat(item.lon);
                        render();
                    })
                    .catch(err => console.error("Transitions location lookup failed", err));
            });
        }
        
        let transitDebounceTimer;
        if (transitLocationInput && transitSuggestionsList) {
            transitLocationInput.addEventListener('input', (e) => {
                const query = e.target.value.trim();
                transitSuggestionsList.innerHTML = '';
                
                if (query.length < 2) {
                    transitSuggestionsList.style.display = 'none';
                    return;
                }
                
                transitSuggestionsList.innerHTML = '';
                
                clearTimeout(transitDebounceTimer);
                transitDebounceTimer = setTimeout(() => {
                    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=25&addressdetails=1`)
                        .then(res => res.json())
                        .then(data => {
                            if (transitLocationInput.value.trim().length < 2) {
                                transitSuggestionsList.innerHTML = '';
                                transitSuggestionsList.style.display = 'none';
                                return;
                            }
                            
                            const itemsToShow = [];
                            if (data && data.length > 0) {
                                const placeFiltered = data.filter(item => {
                                    const isExcluded = ['highway', 'shop', 'tourism', 'amenity', 'leisure', 'office', 'aeroway', 'historic', 'railway', 'man_made'].includes(item.class);
                                    return !isExcluded;
                                });

                                placeFiltered.slice(0, 10).forEach(item => {
                                    const cleanLabel = formatCleanPlaceLabel(item);
                                    itemsToShow.push({
                                        label: cleanLabel,
                                        cityData: {
                                            name: cleanLabel,
                                            lat: parseFloat(item.lat),
                                            lon: parseFloat(item.lon)
                                        }
                                    });
                                });
                            }
                            
                            if (itemsToShow.length > 0) {
                                transitSuggestionsList.innerHTML = '';
                                itemsToShow.forEach(item => {
                                    const li = document.createElement('li');
                                    li.textContent = item.label;
                                    li.addEventListener('click', () => {
                                        transitLocationInput.value = item.label;
                                        state.transitLocationName = item.cityData.name;
                                        state.transitLatitude = item.cityData.lat;
                                        state.transitLongitude = item.cityData.lon;
                                        transitSuggestionsList.style.display = 'none';
                                        render();
                                    });
                                    transitSuggestionsList.appendChild(li);
                                });
                                transitSuggestionsList.style.display = 'block';
                            }
                        })
                        .catch(err => {
                            console.error("Transit Nominatim lookup failed", err);
                        });
                }, 500);
            });
        }
        
        document.addEventListener('click', (e) => {
            if (transitLocationInput && transitSuggestionsList && e.target !== transitLocationInput && e.target !== transitSuggestionsList) {
                transitSuggestionsList.style.display = 'none';
            }
        });
        
        if (transitLocateBtn) {
            transitLocateBtn.addEventListener('click', () => {
                const loadingText = {
                    en: "Detecting...",
                    ta: "கண்டறியப்படுகிறது..."
                };
                const deniedText = {
                    en: "Location access denied or unavailable. Please enter manually.",
                    ta: "இருப்பிடம் கண்டறிய முடியவில்லை. தயவுசெய்து கைமுறையாக உள்ளிடவும்."
                };
                
                if (transitLocationInput) {
                    transitLocationInput.value = loadingText[state.lang] || loadingText['en'];
                    transitLocationInput.disabled = true;
                }
                transitLocateBtn.style.opacity = '0.5';
                
                getCurrentLocation(
                    (lLat, lLon) => {
                        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lLat}&lon=${lLon}&addressdetails=1`)
                            .then(res => res.json())
                            .then(data => {
                                const cleanLabel = formatCleanPlaceLabel(data);
                                state.transitLocationName = cleanLabel;
                                state.transitLatitude = lLat;
                                state.transitLongitude = lLon;
                                if (transitLocationInput) {
                                    transitLocationInput.value = cleanLabel;
                                    transitLocationInput.disabled = false;
                                }
                                transitLocateBtn.style.opacity = '1';
                                render();
                            })
                            .catch(err => {
                                console.error("Transit reverse lookup failed", err);
                                const fallback = state.lang === 'ta' ? 'தற்போதைய இருப்பிடம்' : 'Current Location';
                                state.transitLocationName = fallback;
                                state.transitLatitude = lLat;
                                state.transitLongitude = lLon;
                                if (transitLocationInput) {
                                    transitLocationInput.value = fallback;
                                    transitLocationInput.disabled = false;
                                }
                                transitLocateBtn.style.opacity = '1';
                                render();
                            });
                    },
                    (err) => {
                        console.error(err);
                        alert(deniedText[state.lang] || deniedText['en']);
                        if (transitLocationInput) {
                            transitLocationInput.value = '';
                            transitLocationInput.disabled = false;
                            transitLocationInput.focus();
                        }
                        transitLocateBtn.style.opacity = '1';
                    }
                );
            });
        }
        

        // Chandrashtama Rasi Selector Pills
        const rasiPills = document.querySelectorAll('.rasi-select-pill[data-rasi]');
        rasiPills.forEach(pill => {
            pill.addEventListener('click', () => {
                const rasiIdx = parseInt(pill.getAttribute('data-rasi'), 10);
                if (!isNaN(rasiIdx)) {
                    state.chandrashtamaSelectedRasi = rasiIdx;
                    render();
                }
            });
        });

        // Left Sidebar Toggle & Mini Listeners
        const headerToggleLeftSidebarBtn = document.querySelector('#header-toggle-left-sidebar-btn');
        if (headerToggleLeftSidebarBtn) {
            headerToggleLeftSidebarBtn.addEventListener('click', () => {
                if (!state.leftSidebarOpen) {
                    state.leftSidebarOpen = true;
                    state.leftSidebarMini = false; // Always show full text when opening
                } else if (state.leftSidebarMini) {
                    state.leftSidebarMini = false; // Expand to show text
                } else {
                    state.leftSidebarOpen = false; // Close
                }
                localStorage.setItem('horoscope_left_sidebar_open', state.leftSidebarOpen ? 'true' : 'false');
                localStorage.setItem('horoscope_left_sidebar_mini', state.leftSidebarMini ? 'true' : 'false');
                render();
            });
        }

        // Clicking anywhere on mini sidebar header/brand expands sidebar to show text
        const appLeftSidebar = document.querySelector('#app-left-sidebar');
        if (appLeftSidebar) {
            appLeftSidebar.addEventListener('click', (e) => {
                if (state.leftSidebarMini && !e.target.closest('.sidebar-nav-item')) {
                    state.leftSidebarMini = false;
                    localStorage.setItem('horoscope_left_sidebar_mini', 'false');
                    render();
                }
            });
        }

        const toggleLeftSidebarMiniBtn = document.querySelector('#toggle-left-sidebar-mini-btn');
        if (toggleLeftSidebarMiniBtn) {
            toggleLeftSidebarMiniBtn.addEventListener('click', () => {
                state.leftSidebarMini = !state.leftSidebarMini;
                localStorage.setItem('horoscope_left_sidebar_mini', state.leftSidebarMini ? 'true' : 'false');
                render();
            });
        }

        const closeLeftSidebarBtn = document.querySelector('#close-left-sidebar-btn');
        if (closeLeftSidebarBtn) {
            closeLeftSidebarBtn.addEventListener('click', () => {
                state.leftSidebarOpen = false;
                localStorage.setItem('horoscope_left_sidebar_open', 'false');
                render();
            });
        }

        const leftSidebarBackdrop = document.querySelector('#left-sidebar-backdrop');
        if (leftSidebarBackdrop) {
            leftSidebarBackdrop.addEventListener('click', () => {
                state.leftSidebarOpen = false;
                localStorage.setItem('horoscope_left_sidebar_open', 'false');
                render();
            });
        }

        // Left Sidebar Navigation Links
        const scrollToElement = (selector) => {
            const el = document.querySelector(selector);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            if (window.innerWidth <= 1120 && state.leftSidebarOpen) {
                state.leftSidebarOpen = false;
                localStorage.setItem('horoscope_left_sidebar_open', 'false');
                render();
            }
        };

        const navHoroscope = document.querySelector('#nav-link-horoscope');
        if (navHoroscope) {
            navHoroscope.addEventListener('click', () => {
                if (state.view !== 'form') {
                    state.view = 'form';
                    render();
                }
                setTimeout(() => scrollToElement('#form-card'), 50);
            });
        }

        const navTransits = document.querySelector('#nav-link-transits');
        if (navTransits) {
            navTransits.addEventListener('click', () => {
                if (state.view !== 'form') {
                    state.view = 'form';
                    render();
                }
                setTimeout(() => scrollToElement('#planetary-positions-card'), 50);
            });
        }

        const navChandrashtama = document.querySelector('#nav-link-chandrashtama');
        if (navChandrashtama) {
            navChandrashtama.addEventListener('click', () => {
                if (state.view !== 'form') {
                    state.view = 'form';
                    render();
                }
                setTimeout(() => scrollToElement('#chandrashtama-card'), 50);
            });
        }

        const navTransitions = document.querySelector('#nav-link-transitions');
        if (navTransitions) {
            navTransitions.addEventListener('click', () => {
                if (state.view !== 'form') {
                    state.view = 'form';
                    render();
                }
                setTimeout(() => scrollToElement('#planet-transitions-card'), 50);
            });
        }

        const navCalendar = document.querySelector('#nav-link-calendar');
        if (navCalendar) {
            navCalendar.addEventListener('click', () => {
                if (state.view !== 'form') {
                    state.view = 'form';
                    render();
                }
                setTimeout(() => scrollToElement('#monthly-calendar-card'), 50);
            });
        }

        // Left Sidebar Chart Style buttons
        const sidebarChartStyleBtns = document.querySelectorAll('.sidebar-chart-style-btn[data-style]');
        sidebarChartStyleBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const style = btn.getAttribute('data-style');
                if (style && style !== state.chartStyle) {
                    state.chartStyle = style;
                    render();
                }
            });
        });

        // Left Sidebar Theme Toggle
        const sidebarThemeToggleBtn = document.querySelector('#sidebar-theme-toggle-btn');
        if (sidebarThemeToggleBtn) {
            sidebarThemeToggleBtn.addEventListener('click', () => {
                const toggleThemeBtn = document.querySelector('#toggle-theme-btn');
                if (toggleThemeBtn) {
                    toggleThemeBtn.click();
                } else {
                    document.body.classList.toggle('light-mode');
                    render();
                }
            });
        }

        // Left Sidebar Accent Dots
        const sidebarAccentDots = document.querySelectorAll('.sidebar-accent-dot');
        sidebarAccentDots.forEach(dot => {
            dot.addEventListener('click', () => {
                const pri = dot.getAttribute('data-primary');
                const acc = dot.getAttribute('data-accent');
                if (pri && acc) {
                    currentAccent = { primary: pri, accent: acc };
                    localStorage.setItem('horoscope_app_accent', JSON.stringify(currentAccent));
                    applyAccentColor(pri, acc);
                    render();
                }
            });
        });

        // Left Sidebar Saved Profiles Management
        const saveProfileBtn = document.querySelector('#save-current-profile-btn');
        if (saveProfileBtn) {
            saveProfileBtn.addEventListener('click', () => {
                const ls = leftSidebarTranslations[state.lang] || leftSidebarTranslations['en'];
                let name = '';
                let gender = 'male';
                let place = '';
                let day = '';
                let month = '';
                let year = '';
                let hour = '';
                let minute = '';
                let ampm = 'PM';
                let cityObj = state.selectedCity;

                if (state.view === 'results' && state.horoscope && state.horoscope.birthDetails) {
                    const bd = state.horoscope.birthDetails;
                    name = bd.name || '';
                    gender = bd.gender || 'male';
                    place = bd.city || '';
                    const [y, m, d] = (bd.dateStr || '').split('-');
                    year = y; month = m; day = d;
                    const [h, min] = (bd.timeStr || '').split(':');
                    hour = h; minute = min; ampm = bd.ampm || 'PM';
                } else {
                    name = document.querySelector('#input-name')?.value || '';
                    gender = document.querySelector('#input-gender')?.value || 'male';
                    place = document.querySelector('#input-place')?.value || '';
                    day = document.querySelector('#select-day')?.value || '';
                    month = document.querySelector('#select-month')?.value || '';
                    year = document.querySelector('#select-year')?.value || '';
                    hour = document.querySelector('#select-hour')?.value || '';
                    minute = document.querySelector('#select-minute')?.value || '';
                    ampm = document.querySelector('#select-ampm')?.value || 'PM';
                }

                if (!name || !day || !month || !year) {
                    const enterValidMsg = state.lang === 'ta' 
                        ? 'தயவுசெய்து பெயர் மற்றும் பிறந்த தேதியை உள்ளிடவும்.' 
                        : 'Please enter at least Name and Birth Date to save profile.';
                    alert(enterValidMsg);
                    return;
                }

                const defaultName = `${name} (${day}-${month}-${year})`;
                const profileLabel = prompt(ls.enterProfileName, defaultName);
                if (!profileLabel) return;

                const newProfile = {
                    id: 'prof_' + Date.now(),
                    name: profileLabel,
                    personName: name,
                    gender,
                    place,
                    day,
                    month,
                    year,
                    dateStr: `${year}-${month}-${day}`,
                    hour,
                    minute,
                    ampm,
                    city: cityObj
                };

                state.savedProfiles = [newProfile, ...(state.savedProfiles || [])];
                localStorage.setItem('horoscope_saved_profiles', JSON.stringify(state.savedProfiles));
                render();
            });
        }

        // Load Saved Profile Buttons
        const loadProfileBtns = document.querySelectorAll('.load-profile-btn');
        loadProfileBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.getAttribute('data-index'), 10);
                if (!isNaN(idx) && state.savedProfiles && state.savedProfiles[idx]) {
                    const prof = state.savedProfiles[idx];
                    if (state.view !== 'form') {
                        state.view = 'form';
                    }
                    if (prof.city) {
                        state.selectedCity = prof.city;
                    }
                    render();
                    
                    // Fill form inputs
                    setTimeout(() => {
                        if (document.querySelector('#input-name')) document.querySelector('#input-name').value = prof.personName || prof.name;
                        if (document.querySelector('#input-gender')) document.querySelector('#input-gender').value = prof.gender || 'male';
                        if (document.querySelector('#input-place')) document.querySelector('#input-place').value = prof.place || '';
                        if (document.querySelector('#select-day')) document.querySelector('#select-day').value = prof.day || '';
                        if (document.querySelector('#select-month')) document.querySelector('#select-month').value = prof.month || '';
                        if (document.querySelector('#select-year')) document.querySelector('#select-year').value = prof.year || '';
                        if (document.querySelector('#select-hour')) document.querySelector('#select-hour').value = prof.hour || '';
                        if (document.querySelector('#select-minute')) document.querySelector('#select-minute').value = prof.minute || '';
                        if (document.querySelector('#select-ampm')) document.querySelector('#select-ampm').value = prof.ampm || 'PM';
                        scrollToElement('#form-card');
                    }, 50);
                }
            });
        });

        // Delete Saved Profile Buttons
        const deleteProfileBtns = document.querySelectorAll('.delete-profile-btn');
        deleteProfileBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(btn.getAttribute('data-index'), 10);
                const ls = leftSidebarTranslations[state.lang] || leftSidebarTranslations['en'];
                if (!isNaN(idx) && state.savedProfiles && state.savedProfiles[idx]) {
                    if (confirm(ls.deleteProfile + '?')) {
                        state.savedProfiles.splice(idx, 1);
                        localStorage.setItem('horoscope_saved_profiles', JSON.stringify(state.savedProfiles));
                        render();
                    }
                }
            });
        });


        // Monthly Calendar Navigation Listeners
        const calPrevBtn = document.querySelector('#cal-prev-month-btn');
        if (calPrevBtn) {
            calPrevBtn.addEventListener('click', () => {
                let m = state.chandrashtamaCalendarMonth || (new Date().getMonth() + 1);
                let y = state.chandrashtamaCalendarYear || new Date().getFullYear();
                m--;
                if (m < 1) {
                    m = 12;
                    y--;
                }
                state.chandrashtamaCalendarMonth = m;
                state.chandrashtamaCalendarYear = y;
                render();
            });
        }

        const calNextBtn = document.querySelector('#cal-next-month-btn');
        if (calNextBtn) {
            calNextBtn.addEventListener('click', () => {
                let m = state.chandrashtamaCalendarMonth || (new Date().getMonth() + 1);
                let y = state.chandrashtamaCalendarYear || new Date().getFullYear();
                m++;
                if (m > 12) {
                    m = 1;
                    y++;
                }
                state.chandrashtamaCalendarMonth = m;
                state.chandrashtamaCalendarYear = y;
                render();
            });
        }

        const calTodayBtn = document.querySelector('#cal-today-btn');
        if (calTodayBtn) {
            calTodayBtn.addEventListener('click', () => {
                const now = new Date();
                state.chandrashtamaCalendarMonth = now.getMonth() + 1;
                state.chandrashtamaCalendarYear = now.getFullYear();
                render();
            });
        }

        const calMonthSelect = document.querySelector('#cal-month-select');
        if (calMonthSelect) {
            calMonthSelect.addEventListener('change', (e) => {
                state.chandrashtamaCalendarMonth = parseInt(e.target.value, 10);
                render();
            });
        }

        const calYearSelect = document.querySelector('#cal-year-select');
        if (calYearSelect) {
            calYearSelect.addEventListener('change', (e) => {
                state.chandrashtamaCalendarYear = parseInt(e.target.value, 10);
                render();
            });
        }

        // Calendar Day Cell Click to Select Date
        const calDayCells = document.querySelectorAll('.cal-day-cell[data-date]');
        calDayCells.forEach(cell => {
            cell.addEventListener('click', () => {
                const dStr = cell.getAttribute('data-date');
                if (dStr) {
                    state.transitDate = dStr;
                    render();
                }
            });
        });
    }
    
    // Results view events
    if (state.view === 'results') {
        // Top Back button
        const topBackBtn = document.querySelector('#top-back-btn');
        if (topBackBtn) {
            topBackBtn.addEventListener('click', () => {
                state.view = 'form';
                render();
            });
        }
        
        // Back button
        const backBtn = document.querySelector('#back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                state.view = 'form';
                render();
            });
        }
        
        // Print button
        const printBtn = document.querySelector('#print-btn');
        if (printBtn) {
            printBtn.addEventListener('click', () => {
                window.print();
            });
        }
        
        // Toggle Chart Style Button
        const toggleChartStyleBtn = document.querySelector('#toggle-chart-style-btn');
        if (toggleChartStyleBtn) {
            toggleChartStyleBtn.addEventListener('click', () => {
                state.chartStyle = state.chartStyle === 'north' ? 'south' : 'north';
                render();
            });
        }


        // Dasa sub-period expand/collapse click handler (Event Delegation)
        const dasaTbody = document.querySelector('#dasa-tbody');
        if (dasaTbody) {
            dasaTbody.addEventListener('click', (e) => {
                const row = e.target.closest('.dasa-row');
                if (!row) return;
                
                const level = parseInt(row.getAttribute('data-level'));
                if (level >= 4) return; // Sookshma cannot be expanded further
                
                const isExpanded = row.getAttribute('data-expanded') === 'true';
                const t = translations[state.lang];
                
                if (isExpanded) {
                    // Collapse all descendant rows recursively
                    let next = row.nextElementSibling;
                    while (next && parseInt(next.getAttribute('data-level')) > level) {
                        const toRemove = next;
                        next = next.nextElementSibling;
                        toRemove.remove();
                    }
                    row.setAttribute('data-expanded', 'false');
                    const toggleIcon = row.querySelector('.dasa-toggle-icon');
                    if (toggleIcon) {
                        toggleIcon.innerHTML = '&#9656;'; // ▸
                    }
                } else {
                    // Expand: calculate sub-periods
                    const parentPeriod = {
                        lord: row.getAttribute('data-lord'),
                        start: row.getAttribute('data-start'),
                        end: row.getAttribute('data-end'),
                        duration: parseFloat(row.getAttribute('data-duration')),
                        startAge: parseFloat(row.getAttribute('data-start-age')),
                        endAge: parseFloat(row.getAttribute('data-end-age')),
                        virtualStart: row.getAttribute('data-virtual-start') || undefined,
                        fullDuration: row.getAttribute('data-full-duration') ? parseFloat(row.getAttribute('data-full-duration')) : undefined
                    };
                    
                    const birthDateStr = state.horoscope.birthDetails.dateStr + 'T' + state.horoscope.birthDetails.timeStr;
                    const subPeriods = calculateSubPeriods(parentPeriod, birthDateStr);
                    
                    let newRowsHtml = '';
                    const nextLevel = level + 1;
                    
                    const lordColors = {
                        Sun: '#f59e0b',
                        Moon: '#a1a1aa',
                        Mars: '#ef4444',
                        Mercury: '#10b981',
                        Jupiter: '#fbbf24',
                        Venus: '#ec4899',
                        Saturn: '#3b82f6',
                        Rahu: '#6b7280',
                        Ketu: '#78350f'
                    };
                    
                    subPeriods.forEach(sp => {
                        const lordTamilName = t.planets[sp.lord] || sp.lord;
                        const lordEnglishName = translations['en'].planets[sp.lord] || sp.lord;
                        const lordDisplay = state.lang === 'ta' ? `${lordTamilName} (${lordEnglishName})` : lordEnglishName;
                        
                        let levelLabel = '';
                        if (nextLevel === 2) levelLabel = ` - ${t.dasa.bhukti}`;
                        else if (nextLevel === 3) levelLabel = ` - ${t.dasa.antara}`;
                        else if (nextLevel === 4) levelLabel = ` - ${t.dasa.sookshma}`;
                        
                        const startStr = formatDate(new Date(sp.start));
                        const endStr = formatDate(new Date(sp.end));
                        
                        const durationStr = formatDuration(sp.start, sp.end, t);
                        
                        let badgeClass = 'badge-future';
                        let statusText = t.dasa.future;
                        if (sp.status === 'active') {
                            badgeClass = 'badge-active';
                            statusText = t.dasa.active;
                        } else if (sp.status === 'past') {
                            badgeClass = 'badge-past';
                            statusText = t.dasa.past;
                        }
                        
                        const bulletColor = lordColors[sp.lord] || '#8b5cf6';
                        const toggleChevron = nextLevel < 4 ? '<span class="dasa-toggle-icon">&#9656;</span>' : '<span class="dasa-toggle-spacer"></span>';
                        
                        const levelClass = `dasa-row-l${nextLevel}`;
                        
                        newRowsHtml += `
                            <tr class="dasa-row ${levelClass} ${sp.status === 'active' ? 'dasa-active' : ''}"
                                data-level="${nextLevel}"
                                data-lord="${sp.lord}"
                                data-start="${new Date(sp.start).toISOString()}"
                                data-end="${new Date(sp.end).toISOString()}"
                                data-duration="${sp.duration}"
                                data-start-age="${sp.startAge}"
                                data-end-age="${sp.endAge}"
                                ${sp.virtualStart ? `data-virtual-start="${new Date(sp.virtualStart).toISOString()}"` : ''}
                                ${sp.fullDuration !== undefined ? `data-full-duration="${sp.fullDuration}"` : ''}
                                data-expanded="false"
                                style="cursor: pointer;"
                            >
                                <td>
                                    <div style="display: flex; align-items: center; gap: 10px;">
                                        ${toggleChevron}
                                        <span class="dasa-bullet" style="background-color: ${bulletColor};"></span>
                                        <span style="font-weight: 500;">${lordDisplay}<span style="font-size: 12px; color: var(--text-secondary); font-weight: normal;">${levelLabel}</span></span>
                                    </div>
                                </td>
                                <td>${startStr}</td>
                                <td>${endStr}</td>
                                <td style="text-align: center;">${durationStr}</td>
                            </tr>
                        `;
                    });
                    
                    row.insertAdjacentHTML('afterend', newRowsHtml);
                    row.setAttribute('data-expanded', 'true');
                    const toggleIcon = row.querySelector('.dasa-toggle-icon');
                    if (toggleIcon) {
                        toggleIcon.innerHTML = '&#9662;'; // ▾
                    }
                }
            });
        }

        // Dasa Search event listener
        const dasaSearchBtn = document.querySelector('#dasa-search-submit-btn');
        const dasaSearchInput = document.querySelector('#dasa-search-input');
        const dasaSearchResultsBox = document.querySelector('#dasa-search-results-box');
        
        if (dasaSearchBtn && dasaSearchInput && dasaSearchResultsBox) {
            dasaSearchBtn.addEventListener('click', () => {
                const targetDateVal = dasaSearchInput.value;
                const dst = dasaSearchTranslations[state.lang] || dasaSearchTranslations['en'];
                if (!targetDateVal) {
                    alert(dst.invalidDate);
                    return;
                }
                
                const targetDate = new Date(targetDateVal + 'T00:00:00');
                const birthDateStr = state.horoscope.birthDetails.dateStr + 'T' + state.horoscope.birthDetails.timeStr;
                const birthDate = new Date(birthDateStr);
                const timelineEnd = new Date(state.horoscope.dasaTimeline[state.horoscope.dasaTimeline.length - 1].end);
                
                if (targetDate < new Date(state.horoscope.birthDetails.dateStr + 'T00:00:00')) {
                    dasaSearchResultsBox.style.display = 'block';
                    dasaSearchResultsBox.innerHTML = `<span style="color: #ef4444; font-weight: 600;">${
                        state.lang === 'ta' ? 'தேதி பிறந்த தேதிக்கு முந்தையது!' : 'Selected date is before the birth date!'
                    }</span>`;
                    return;
                }
                
                if (targetDate > timelineEnd) {
                    dasaSearchResultsBox.style.display = 'block';
                    dasaSearchResultsBox.innerHTML = `<span style="color: #ef4444; font-weight: 600;">${dst.outOfRange}</span>`;
                    return;
                }
                
                const path = findActiveDasaPathAtDate(targetDate, state.horoscope.dasaTimeline, birthDateStr);
                if (!path || path.length === 0) {
                    dasaSearchResultsBox.style.display = 'block';
                    dasaSearchResultsBox.innerHTML = `<span style="color: #ef4444; font-weight: 600;">${dst.outOfRange}</span>`;
                    return;
                }
                
                // Format active Dasa path display
                const t = translations[state.lang];
                let pathHtml = `<div style="margin-bottom: 8px; font-weight: 600;">${dst.activeDasaOn} ${formatDate(targetDate)}:</div>`;
                pathHtml += `<div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 15px;">`;
                
                const levelNames = [t.dasa.mahadasa, t.dasa.bhukti, t.dasa.antara, t.dasa.sookshma];
                const colors = ['var(--primary)', 'var(--accent)', '#3b82f6', '#10b981'];
                
                path.forEach((period, idx) => {
                    const lordTamilName = t.planets[period.lord] || period.lord;
                    const lordEnglishName = translations['en'].planets[period.lord] || period.lord;
                    const lordDisplay = state.lang === 'ta' ? `${lordTamilName} (${lordEnglishName})` : lordEnglishName;
                    
                    if (idx > 0) {
                        pathHtml += `<span style="color: var(--text-secondary); font-weight: bold;">➔</span>`;
                    }
                    
                    pathHtml += `
                        <div style="background: var(--input-bg); border: 1px solid var(--card-border); padding: 6px 12px; display: inline-flex; flex-direction: column; align-items: center;">
                            <span style="font-size: 11px; color: var(--text-secondary); text-transform: uppercase;">${levelNames[idx]}</span>
                            <span style="font-weight: 700; color: ${colors[idx] || 'var(--text-primary)'};">${lordDisplay}</span>
                        </div>
                    `;
                });
                
                pathHtml += `</div>`;
                dasaSearchResultsBox.style.display = 'block';
                dasaSearchResultsBox.innerHTML = pathHtml;
            });
        }
    }
}

// Start the app
init();
