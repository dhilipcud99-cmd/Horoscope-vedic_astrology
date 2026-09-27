import { Body, Ecliptic, GeoVector, AstroTime, SiderealTime, e_tilt, DEG2RAD, RAD2DEG, SearchRiseSet, Observer } from 'astronomy-engine';

// Delaunay variables and Ayanamsa

// Delaunay variables and Ayanamsa
export function getAyanamsa(jd) {
    const T = (jd - 2451545.0) / 36525.0;
    // Lahiri Ayanamsa:
    return 23.8585 + 1.3963 * T;
}

// Map absolute longitude (0-360) to Rasi Sign (0-11)
export function getRasiSignIndex(lon) {
    return Math.floor(lon / 30) % 12;
}

// 12 Zodiac signs in order starting from Aries
export const signKeys = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
];

// 27 Nakshatras names
export const starKeys = [
    "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashirsha",
    "Ardra", "Punarvasu", "Pushya", "Ashlesha", "Magha",
    "Poorva Phalguni", "Uttara Phalguni", "Hasta", "Chitra", "Swati",
    "Vishakha", "Anuradha", "Jyeshtha", "Mula", "Poorvashadha",
    "Uttarashadha", "Shravana", "Dhanishta", "Shatabhisha", "Poorva Bhadrapada",
    "Uttara Bhadrapada", "Revati"
];

// Return Star Index and Pada for a given longitude
export function getStarAndPada(lon) {
    const starLength = 360 / 27; // 13.3333 degrees
    const padaLength = starLength / 4; // 3.3333 degrees
    
    const starIdx = Math.floor(lon / starLength) % 27;
    const rem = lon % starLength;
    const pada = Math.floor(rem / padaLength) + 1; // 1, 2, 3, or 4
    
    return { starIdx, pada };
}

// Get Navamsam Sign Index (0-11)
export function getNavamsamSignIndex(lon) {
    const rasiIdx = getRasiSignIndex(lon);
    const rem = lon % 30;
    const padaIdx = Math.floor(rem / (30 / 9)); // 0 to 8
    
    let startSign = 0;
    const element = rasiIdx % 4;
    if (element === 0) { // Fire: Aries, Leo, Sagittarius
        startSign = 0; // Aries
    } else if (element === 1) { // Earth: Taurus, Virgo, Capricorn
        startSign = 9; // Capricorn
    } else if (element === 2) { // Air: Gemini, Libra, Aquarius
        startSign = 6; // Libra
    } else { // Water: Cancer, Scorpio, Pisces
        startSign = 3; // Cancer
    }
    
    return (startSign + padaIdx) % 12;
}

// Calculate Mandi position
export function calculateMandiLongitude(birthDate, lat, lon) {
    const observer = new Observer(lat, lon, 0);
    
    // We search sunrise and sunset for the birth day
    // Start search 12 hours before birth date to capture sunrise of the day
    const searchStart = new AstroTime(new Date(birthDate.getTime() - 12 * 3600 * 1000));
    const sunrise = SearchRiseSet(Body.Sun, observer, 1, searchStart, 1);
    const sunset = SearchRiseSet(Body.Sun, observer, -1, searchStart, 1);
    const nextSunrise = SearchRiseSet(Body.Sun, observer, 1, new AstroTime(sunset.date), 1);
    
    const isNight = birthDate < sunrise.date || birthDate > sunset.date;
    
    let periodStart, periodEnd;
    if (isNight) {
        if (birthDate < sunrise.date) {
            // Born before sunrise, so part of previous night
            const prevSunset = SearchRiseSet(Body.Sun, observer, -1, new AstroTime(new Date(sunrise.date.getTime() - 24 * 3600 * 1000)), 1);
            periodStart = prevSunset.date;
            periodEnd = sunrise.date;
        } else {
            periodStart = sunset.date;
            periodEnd = nextSunrise.date;
        }
    } else {
        periodStart = sunrise.date;
        periodEnd = sunset.date;
    }
    
    const duration = periodEnd.getTime() - periodStart.getTime();
    const P = duration / 8;
    
    // Day of the week (0=Sunday, 1=Monday, 2=Tuesday, etc.)
    // Note: In Vedic astrology, the day starts at sunrise.
    // If born before sunrise, the weekday is the previous day.
    let birthDayOfWeek = birthDate.getDay();
    if (birthDate < sunrise.date) {
        birthDayOfWeek = (birthDayOfWeek + 6) % 7;
    }
    
    let partIndex = 0;
    if (isNight) {
        // Night segments: Sun: 3rd, Mon: 2nd, Tue: 1st, Wed: 7th, Thu: 6th, Fri: 5th, Sat: 4th
        const nightSaturnParts = [4, 3, 2, 1, 0, 6, 5]; // Note: 0-indexed part (1st part = index 0)
        partIndex = nightSaturnParts[birthDayOfWeek];
    } else {
        // Day segments: Sun: 7th, Mon: 6th, Tue: 5th, Wed: 4th, Thu: 3rd, Fri: 2nd, Sat: 1st
        const daySaturnParts = [6, 5, 4, 3, 2, 1, 0];
        partIndex = daySaturnParts[birthDayOfWeek];
    }
    
    // Mandi is at the middle of Saturn's part
    const mandiTimeMs = periodStart.getTime() + partIndex * P + 0.5 * P;
    const mandiAstroTime = new AstroTime(new Date(mandiTimeMs));
    
    // Calculate Lagna at Mandi Time
    const gast = SiderealTime(mandiAstroTime);
    const lst = (gast * 15 + lon + 360) % 360;
    const tilt = e_tilt(mandiAstroTime);
    const eps = tilt.tobl;
    
    const lstRad = lst * DEG2RAD;
    const epsRad = eps * DEG2RAD;
    const latRad = lat * DEG2RAD;
    
    const y = Math.cos(lstRad);
    const x = -(Math.sin(lstRad) * Math.cos(epsRad) + Math.tan(latRad) * Math.sin(epsRad));
    let ascTropical = Math.atan2(y, x) * RAD2DEG;
    ascTropical = (ascTropical + 360) % 360;
    
    const jd = 2451545.0 + mandiAstroTime.ut;
    const ayanamsa = getAyanamsa(jd);
    
    return (ascTropical - ayanamsa + 360) % 360;
}

// Calculate the active planetary Hora and the sunrise/sunset boundaries for a local date and time.
export function calculateHoraDetails(dateStr, timeStr, lat, lon) {
    const observer = new Observer(lat, lon, 0);
    const localMidnight = new Date(`${dateStr}T00:00:00`);
    const requestedTime = new Date(`${dateStr}T${timeStr}:00`);
    if (Number.isNaN(localMidnight.getTime()) || Number.isNaN(requestedTime.getTime())) return null;

    const sunrise = SearchRiseSet(Body.Sun, observer, 1, new AstroTime(localMidnight), 1);
    if (!sunrise) return null;
    const sunset = SearchRiseSet(Body.Sun, observer, -1, new AstroTime(sunrise.date), 1);
    const nextSunrise = sunset && SearchRiseSet(Body.Sun, observer, 1, new AstroTime(sunset.date), 1);
    if (!sunset || !nextSunrise || sunset.date <= sunrise.date || nextSunrise.date <= sunset.date) return null;

    const previousSunset = SearchRiseSet(
        Body.Sun,
        observer,
        -1,
        new AstroTime(new Date(sunrise.date.getTime() - 24 * 60 * 60 * 1000)),
        1
    );
    if (!previousSunset) return null;

    const horaCycle = ['Sun', 'Venus', 'Mercury', 'Moon', 'Saturn', 'Jupiter', 'Mars'];
    const weekdayLords = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
    let weekday = localMidnight.getDay();
    let periodStart;
    let periodEnd;
    let horaOffset;

    if (requestedTime < sunrise.date) {
        weekday = (weekday + 6) % 7;
        periodStart = previousSunset.date;
        periodEnd = sunrise.date;
        horaOffset = 12;
    } else if (requestedTime >= sunset.date) {
        periodStart = sunset.date;
        periodEnd = nextSunrise.date;
        horaOffset = 12;
    } else {
        periodStart = sunrise.date;
        periodEnd = sunset.date;
        horaOffset = 0;
    }

    const segmentDuration = (periodEnd.getTime() - periodStart.getTime()) / 12;
    const elapsed = Math.max(0, Math.min(requestedTime.getTime() - periodStart.getTime(), periodEnd.getTime() - periodStart.getTime() - 1));
    const segmentIndex = Math.min(11, Math.floor(elapsed / segmentDuration));
    const startLordIndex = horaCycle.indexOf(weekdayLords[weekday]);
    const horaIndex = (startLordIndex + horaOffset + segmentIndex) % horaCycle.length;
    const horaEnd = new Date(periodStart.getTime() + (segmentIndex + 1) * segmentDuration);

    return {
        lord: horaCycle[horaIndex],
        start: new Date(periodStart.getTime() + segmentIndex * segmentDuration),
        end: horaEnd,
        sunrise: sunrise.date,
        sunset: sunset.date,
        isDaytime: horaOffset === 0
    };
}

// Calculate the full horoscope data
export function calculateHoroscope({ name, gender, dateStr, timeStr, lat, lon, fatherName, motherName, ampm, city }) {
    const dateTimeStr = `${dateStr}T${timeStr}`;
    const birthDate = new Date(dateTimeStr);
    const astroTime = new AstroTime(birthDate);
    const jd = 2451545.0 + astroTime.ut;
    const T = (jd - 2451545.0) / 36525.0;
    const ayanamsa = getAyanamsa(jd);
    
    // Obliquity of date
    const tilt = e_tilt(astroTime);
    const eps = tilt.tobl;
    
    // 1. Calculate Lagna (Ascendant)
    const gast = SiderealTime(astroTime);
    const lst = (gast * 15 + lon + 360) % 360;
    const lstRad = lst * DEG2RAD;
    const epsRad = eps * DEG2RAD;
    const latRad = lat * DEG2RAD;
    
    const yLagna = Math.cos(lstRad);
    const xLagna = -(Math.sin(lstRad) * Math.cos(epsRad) + Math.tan(latRad) * Math.sin(epsRad));
    let lagnaTropical = Math.atan2(yLagna, xLagna) * RAD2DEG;
    lagnaTropical = (lagnaTropical + 360) % 360;
    const lagnaSidereal = (lagnaTropical - ayanamsa + 360) % 360;
    
    // 2. Calculate Planets (Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn)
    const bodies = {
        Sun: Body.Sun,
        Moon: Body.Moon,
        Mercury: Body.Mercury,
        Venus: Body.Venus,
        Mars: Body.Mars,
        Jupiter: Body.Jupiter,
        Saturn: Body.Saturn
    };
    
    const planetLongitudes = {};
    const planetRetrograde = {};
    for (const [pName, pBody] of Object.entries(bodies)) {
        const vector = GeoVector(pBody, astroTime, true);
        const ecl = Ecliptic(vector);
        const lon = (ecl.elon - ayanamsa + 360) % 360;
        planetLongitudes[pName] = lon;
        
        // Check retrograde status
        if (pName === 'Sun' || pName === 'Moon') {
            planetRetrograde[pName] = false;
        } else {
            const laterTime = new AstroTime(new Date(astroTime.date.getTime() + 60 * 60 * 1000));
            const laterVector = GeoVector(pBody, laterTime, true);
            const laterEcl = Ecliptic(laterVector);
            const laterJd = 2451545.0 + laterTime.ut;
            const laterAyanamsa = getAyanamsa(laterJd);
            const laterLon = (laterEcl.elon - laterAyanamsa + 360) % 360;
            
            let diff = laterLon - lon;
            if (diff > 180) diff -= 360;
            if (diff < -180) diff += 360;
            planetRetrograde[pName] = diff < 0;
        }
    }
    
    // 3. Calculate Rahu and Ketu
    // Delaunay arguments for Mean Node calculation
    const L = (218.3164477 + 481267.88123421 * T - 0.0015786 * T * T) % 360;
    const L_S = (280.46646 + 36000.76983 * T + 0.0003032 * T * T) % 360;
    const M_prime = (357.52911 + 35999.05029 * T - 0.0001537 * T * T) % 360;
    const O = (125.044522 - 1934.136261 * T + 0.0020708 * T * T) % 360;
    const F = (L - O + 360) % 360;
    const D = (L - L_S + 360) % 360;
    
    // Standard True Node perturbation term
    const delta_O = 1.4979 * Math.sin(2 * (L_S - O) * DEG2RAD) - 0.1500 * Math.sin(M_prime * DEG2RAD) - 0.1200 * Math.sin(2 * F * DEG2RAD) + 0.1000 * Math.sin(2 * D * DEG2RAD);
    const rahuTropical = (O - delta_O + 360) % 360;
    const rahuSidereal = (rahuTropical - ayanamsa + 360) % 360;
    const ketuSidereal = (rahuSidereal + 180) % 360;
    
    planetLongitudes["Rahu"] = rahuSidereal;
    planetLongitudes["Ketu"] = ketuSidereal;
    planetLongitudes["Lagna"] = lagnaSidereal;
    
    planetRetrograde["Rahu"] = true; // Nodes are always retrograde
    planetRetrograde["Ketu"] = true;
    planetRetrograde["Lagna"] = false;
    planetRetrograde["Mandi"] = false;
    
    // 4. Calculate Mandi
    const mandiSidereal = calculateMandiLongitude(birthDate, lat, lon);
    planetLongitudes["Mandi"] = mandiSidereal;
    
    // 5. Gather all positions details
    const planetsDetails = [];
    const allPlanetNames = ["Lagna", "Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu", "Mandi"];
    
    const lagnaSign = getRasiSignIndex(lagnaSidereal);
    
    for (const pName of allPlanetNames) {
        const lon = planetLongitudes[pName];
        const rasiIdx = getRasiSignIndex(lon);
        const { starIdx, pada } = getStarAndPada(lon);
        const navamsamIdx = getNavamsamSignIndex(lon);
        // House number (1-12) starting from Lagna
        const house = ((rasiIdx - lagnaSign + 12) % 12) + 1;
        const isRetro = planetRetrograde[pName] || false;
        
        planetsDetails.push({
            name: pName,
            longitude: lon,
            rasiIdx,
            starIdx,
            pada,
            navamsamIdx,
            house,
            isRetro
        });
    }
    
    // 6. Panchang calculations
    const sunLon = planetLongitudes["Sun"];
    const moonLon = planetLongitudes["Moon"];
    
    // Tithi
    const tithiDiff = (moonLon - sunLon + 360) % 360;
    const tithiIdx = Math.floor(tithiDiff / 12) % 30; // 0 to 29
    
    // Yoga
    const yogaSum = (sunLon + moonLon) % 360;
    const yogaIdx = Math.floor(yogaSum / (360 / 27)) % 27;
    
    // Karana
    const karanaIdx = Math.floor(tithiDiff / 6) % 60;
    
    const dasaTimeline = calculateVimshottariDasa(moonLon, birthDate);
    
    // Sunrise/sunset for details
    const observer = new Observer(lat, lon, 0);
    const searchStart = new AstroTime(new Date(birthDate.getTime() - 12 * 3600 * 1000));
    const sunrise = SearchRiseSet(Body.Sun, observer, 1, searchStart, 1);
    const sunset = SearchRiseSet(Body.Sun, observer, -1, searchStart, 1);
    const nextSunrise = SearchRiseSet(Body.Sun, observer, 1, new AstroTime(sunset.date), 1);
    
    return {
        birthDetails: { name, gender, dateStr, timeStr, lat, lon, fatherName, motherName, ampm, city },
        ayanamsa,
        lagnaLon: lagnaSidereal,
        planets: planetsDetails,
        dasaTimeline,
        panchang: {
            tithiIdx,
            yogaIdx,
            karanaIdx,
            starIdx: getStarAndPada(moonLon).starIdx,
            pada: getStarAndPada(moonLon).pada,
            rasiIdx: getRasiSignIndex(moonLon),
            sunrise: sunrise.date,
            sunset: sunset.date,
            nextSunrise: nextSunrise.date
        }
    };
}

// Calculate Vimshottari Dasa timeline (120 years total)
export function calculateVimshottariDasa(moonLon, birthDate) {
    const dasaPeriods = {
        Ketu: 7,
        Venus: 20,
        Sun: 6,
        Moon: 10,
        Mars: 7,
        Rahu: 18,
        Jupiter: 16,
        Saturn: 19,
        Mercury: 17
    };
    
    const dasaOrder = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'];
    
    // 27 stars
    const starLength = 360 / 27; // 13.333333333333334
    const starIdx = Math.floor(moonLon / starLength) % 27;
    const startLordIdx = starIdx % 9;
    
    // Moon's relative position in Nakshatra
    const remDegrees = moonLon % starLength;
    const fractionTraversed = remDegrees / starLength;
    const remainingFraction = 1.0 - fractionTraversed;
    
    // Balance of Dasa at birth in years
    const startLord = dasaOrder[startLordIdx];
    const fullDuration = dasaPeriods[startLord];
    const firstDasaPeriod = remainingFraction * fullDuration;
    const elapsed = fractionTraversed * fullDuration;
    
    // Virtual start date of first Dasa
    const virtualStart = new Date(birthDate);
    const elapsedDays = Math.round(elapsed * 365.25);
    virtualStart.setDate(virtualStart.getDate() - elapsedDays);
    
    const timeline = [];
    let prevEndDate = new Date(birthDate);
    let prevAge = 0;
    
    const now = new Date();
    
    function addYears(date, years) {
        const result = new Date(date);
        const yearsInt = Math.floor(years);
        const fraction = years - yearsInt;
        result.setFullYear(result.getFullYear() + yearsInt);
        if (fraction > 0) {
            const days = Math.round(fraction * 365.25);
            result.setDate(result.getDate() + days);
        }
        return result;
    }
    
    // Generate all 9 dasas in the cycle
    for (let i = 0; i < 9; i++) {
        const currentLordIdx = (startLordIdx + i) % 9;
        const lord = dasaOrder[currentLordIdx];
        const duration = (i === 0) ? firstDasaPeriod : dasaPeriods[lord];
        
        const startDate = new Date(prevEndDate);
        const endDate = addYears(startDate, duration);
        
        const startAge = prevAge;
        const endAge = prevAge + duration;
        
        let status = 'future';
        if (now >= startDate && now < endDate) {
            status = 'active';
        } else if (now >= endDate) {
            status = 'past';
        }
        
        timeline.push({
            lord,
            start: startDate,
            end: endDate,
            startAge,
            endAge,
            duration,
            status,
            // Virtual start and duration context for child periods calculations
            virtualStart: (i === 0) ? virtualStart : startDate,
            fullDuration: (i === 0) ? fullDuration : duration
        });
        
        prevEndDate = new Date(endDate);
        prevAge = endAge;
    }
    
    return timeline;
}

// Calculate sub-periods (Bhukti, Antara, Sookshma) proportionally
export function calculateSubPeriods(parentPeriod, birthDateStr) {
    const dasaPeriods = {
        Ketu: 7,
        Venus: 20,
        Sun: 6,
        Moon: 10,
        Mars: 7,
        Rahu: 18,
        Jupiter: 16,
        Saturn: 19,
        Mercury: 17
    };
    
    const dasaOrder = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'];
    
    function addYears(date, years) {
        const result = new Date(date);
        const yearsInt = Math.floor(years);
        const fraction = years - yearsInt;
        result.setFullYear(result.getFullYear() + yearsInt);
        if (fraction > 0) {
            const days = Math.round(fraction * 365.25);
            result.setDate(result.getDate() + days);
        }
        return result;
    }
    
    const parentLord = parentPeriod.lord;
    const parentStart = parentPeriod.virtualStart ? new Date(parentPeriod.virtualStart) : new Date(parentPeriod.start);
    const parentDuration = parentPeriod.fullDuration !== undefined ? parentPeriod.fullDuration : parentPeriod.duration;
    
    const birthDate = birthDateStr ? new Date(birthDateStr) : new Date(parentPeriod.start);
    
    // Elapsed years of the parent's virtual start in the user's timeline
    const elapsedMs = birthDate.getTime() - parentStart.getTime();
    const elapsedYears = elapsedMs / (365.25 * 24 * 60 * 60 * 1000);
    const parentVirtualStartAge = parentPeriod.virtualStart ? -elapsedYears : parentPeriod.startAge;
    
    const startIdx = dasaOrder.indexOf(parentLord);
    const subPeriods = [];
    let prevEndDate = new Date(parentStart);
    let prevAge = parentVirtualStartAge;
    
    const now = new Date();
    
    for (let i = 0; i < 9; i++) {
        const lordIdx = (startIdx + i) % 9;
        const lord = dasaOrder[lordIdx];
        
        // Sub-period duration is parentDuration * (lord's period / 120)
        const duration = parentDuration * (dasaPeriods[lord] / 120);
        
        const startDate = new Date(prevEndDate);
        const endDate = addYears(startDate, duration);
        
        const startAge = prevAge;
        const endAge = prevAge + duration;
        
        let status = 'future';
        if (now >= startDate && now < endDate) {
            status = 'active';
        } else if (now >= endDate) {
            status = 'past';
        }
        
        subPeriods.push({
            lord,
            start: startDate,
            end: endDate,
            startAge,
            endAge,
            duration,
            status,
            virtualStart: startDate,
            fullDuration: duration
        });
        
        prevEndDate = new Date(endDate);
        prevAge = endAge;
    }
    
    // Filter out periods that ended before birth
    const filteredSubPeriods = subPeriods.filter(sp => sp.end > birthDate);
    
    // Truncate the first active period that spans birth
    if (filteredSubPeriods.length > 0 && filteredSubPeriods[0].start < birthDate) {
        const firstActive = filteredSubPeriods[0];
        firstActive.start = new Date(birthDate);
        firstActive.startAge = 0;
        
        const remMs = firstActive.end.getTime() - birthDate.getTime();
        firstActive.duration = remMs / (365.25 * 24 * 60 * 60 * 1000);
        
        if (now >= firstActive.start && now < firstActive.end) {
            firstActive.status = 'active';
        } else if (now >= firstActive.end) {
            firstActive.status = 'past';
        }
    }
    
    return filteredSubPeriods;
}

// -------------------------------------------------------------
// CHANDRASHTAMA (சந்திராஷ்டமம்) CALCULATIONS
// -------------------------------------------------------------

// Calculate sidereal Moon longitude for any given Date object
export function getMoonSiderealLongitude(date) {
    const astroTime = new AstroTime(date);
    const jd = 2451545.0 + astroTime.ut;
    const ayanamsa = getAyanamsa(jd);
    const vector = GeoVector(Body.Moon, astroTime, true);
    const ecl = Ecliptic(vector);
    return (ecl.elon - ayanamsa + 360) % 360;
}

// Get Chandrashtama (8th house) Rasi index for a given Janma Rasi index (0-11)
export function getChandrashtamaRasiForJanmaRasi(janmaRasiIdx) {
    return (janmaRasiIdx + 7) % 12;
}

// Get the Janma Rasi index that has Chandrashtama when transit Moon is in transitMoonRasiIdx
export function getJanmaRasiForTransitMoonRasi(transitMoonRasiIdx) {
    return (transitMoonRasiIdx + 5) % 12;
}

// Map of 27 Janma Nakshatras to their respective peak Chandrashtama star index(es)
export const starChandrashtamaMap = [
    [16],       // 0: Ashwini -> Anuradha (Anusham)
    [17],       // 1: Bharani -> Jyeshtha (Kettai)
    [15, 16],   // 2: Krittika -> Vishakha (pada 4) / Anuradha (Scorpio) / Mula (Sagittarius)
    [19],       // 3: Rohini -> Poorva Ashadha (Pooradam)
    [20, 21],   // 4: Mrigashirsha -> Uttara Ashadha (Uthiradam) / Shravana (Thiruvonam)
    [22],       // 5: Ardra -> Dhanishta (Avittam)
    [23, 24],   // 6: Punarvasu -> Shatabhisha (Sadhayam) / Poorva Bhadrapada (Poorattathi)
    [25],       // 7: Pushya -> Uttara Bhadrapada (Uthirattathi)
    [26],       // 8: Ashlesha -> Revati (Revathi)
    [24, 25],   // 9: Magha -> Poorva Bhadrapada / Uttara Bhadrapada
    [25, 26],   // 10: Poorva Phalguni -> Uttara Bhadrapada / Revati
    [0, 1],     // 11: Uttara Phalguni -> Ashwini / Bharani
    [1, 2],     // 12: Hasta -> Bharani / Krittika
    [2, 3],     // 13: Chitra -> Krittika / Rohini
    [4, 5],     // 14: Swati -> Mrigashirsha / Ardra
    [5, 6],     // 15: Vishakha -> Ardra / Punarvasu
    [7, 8],     // 16: Anuradha -> Pushya / Ashlesha
    [8, 9],     // 17: Jyeshtha -> Ashlesha / Magha
    [10, 11],   // 18: Mula -> Poorva Phalguni / Uttara Phalguni
    [11, 12],   // 19: Poorva Ashadha -> Uttara Phalguni / Hasta
    [12, 13],   // 20: Uttara Ashadha -> Hasta / Chitra
    [13, 14],   // 21: Shravana -> Chitra / Swati
    [15, 16],   // 22: Dhanishta -> Vishakha / Anuradha
    [16, 17],   // 23: Shatabhisha -> Anuradha / Jyeshtha
    [18, 19],   // 24: Poorva Bhadrapada -> Mula / Poorva Ashadha
    [19, 20],   // 25: Uttara Bhadrapada -> Poorva Ashadha / Uttara Ashadha
    [20, 21]    // 26: Revati -> Uttara Ashadha / Shravana
];

// Returns stars belonging to a given Rasi (0-11)
export function getStarsInRasi(rasiIdx) {
    const starLength = 360 / 27; // 13.3333 deg
    const padaLength = starLength / 4; // 3.3333 deg
    const startLon = rasiIdx * 30;
    const endLon = (rasiIdx + 1) * 30;
    
    const stars = [];
    for (let s = 0; s < 27; s++) {
        const sStart = s * starLength;
        const sEnd = (s + 1) * starLength;
        if (sEnd > startLon && sStart < endLon) {
            // Find which padas overlap with this rasi
            const padas = [];
            for (let p = 1; p <= 4; p++) {
                const pStart = sStart + (p - 1) * padaLength;
                const pEnd = sStart + p * padaLength;
                if (pEnd > startLon + 0.001 && pStart < endLon - 0.001) {
                    padas.push(p);
                }
            }
            stars.push({ starIdx: s, padas });
        }
    }
    return stars;
}

// Find precise start and end time when the Moon transits a given sign around a target date
export function findMoonSignTransitWindow(targetDate, targetRasiIdx) {
    const centerTime = new Date(targetDate).getTime();
    
    // Search backward to find entry (ingress)
    let leftTime = centerTime - 4 * 24 * 3600 * 1000;
    let rightTime = centerTime;
    
    // Step in 1-hour increments backward to find boundary
    let entryStepTime = centerTime;
    while (entryStepTime > leftTime) {
        const testLon = getMoonSiderealLongitude(new Date(entryStepTime));
        const rIdx = getRasiSignIndex(testLon);
        if (rIdx !== targetRasiIdx) {
            leftTime = entryStepTime;
            rightTime = entryStepTime + 3600 * 1000;
            break;
        }
        entryStepTime -= 3600 * 1000;
    }
    
    // Refine entry using bisection to ~1 minute precision
    for (let iter = 0; iter < 12; iter++) {
        const midTime = (leftTime + rightTime) / 2;
        const testLon = getMoonSiderealLongitude(new Date(midTime));
        const rIdx = getRasiSignIndex(testLon);
        if (rIdx === targetRasiIdx) {
            rightTime = midTime;
        } else {
            leftTime = midTime;
        }
    }
    const ingressTime = new Date(rightTime);
    
    // Search forward to find exit (egress)
    leftTime = centerTime;
    rightTime = centerTime + 4 * 24 * 3600 * 1000;
    let exitStepTime = centerTime;
    while (exitStepTime < rightTime) {
        const testLon = getMoonSiderealLongitude(new Date(exitStepTime));
        const rIdx = getRasiSignIndex(testLon);
        if (rIdx !== targetRasiIdx) {
            leftTime = exitStepTime - 3600 * 1000;
            rightTime = exitStepTime;
            break;
        }
        exitStepTime += 3600 * 1000;
    }
    
    // Refine exit using bisection
    for (let iter = 0; iter < 12; iter++) {
        const midTime = (leftTime + rightTime) / 2;
        const testLon = getMoonSiderealLongitude(new Date(midTime));
        const rIdx = getRasiSignIndex(testLon);
        if (rIdx === targetRasiIdx) {
            leftTime = midTime;
        } else {
            rightTime = midTime;
        }
    }
    const egressTime = new Date(leftTime);
    
    return {
        rasiIdx: targetRasiIdx,
        start: ingressTime,
        end: egressTime
    };
}

// Find the exact time when Moon reaches a specific sidereal longitude between tMin and tMax
export function findMoonLongitudeTime(tMin, tMax, targetLon) {
    let left = tMin.getTime();
    let right = tMax.getTime();
    
    for (let iter = 0; iter < 18; iter++) {
        const mid = (left + right) / 2;
        const lon = getMoonSiderealLongitude(new Date(mid));
        
        let diff = lon - targetLon;
        if (diff > 180) diff -= 360;
        if (diff < -180) diff += 360;
        
        if (diff < 0) {
            left = mid;
        } else {
            right = mid;
        }
    }
    
    return new Date((left + right) / 2);
}

// Break down a sign transit window into exact star and pada sub-windows
export function getStarTransitsInSignWindow(windowStart, windowEnd, rasiIdx) {
    const starLength = 360 / 27; // 13.333333333333334
    const starsInSign = getStarsInRasi(rasiIdx);
    
    const starWindows = [];
    
    starsInSign.forEach(starInfo => {
        const starIdx = starInfo.starIdx;
        const padas = starInfo.padas;
        
        const sStartLon = Math.max(starIdx * starLength, rasiIdx * 30);
        const sEndLon = Math.min((starIdx + 1) * starLength, (rasiIdx + 1) * 30);
        
        let sStart = windowStart;
        if (Math.abs(sStartLon - rasiIdx * 30) > 0.01) {
            sStart = findMoonLongitudeTime(windowStart, windowEnd, sStartLon);
        }
        
        let sEnd = windowEnd;
        if (Math.abs(sEndLon - (rasiIdx + 1) * 30) > 0.01) {
            sEnd = findMoonLongitudeTime(windowStart, windowEnd, sEndLon);
        }
        
        starWindows.push({
            starIdx,
            padas,
            start: sStart,
            end: sEnd
        });
    });
    
    return starWindows;
}

// Calculate upcoming Chandrashtama periods for a specific Janma Rasi over the next `daysCount` days
export function calculateUpcomingChandrashtamaForRasi(janmaRasiIdx, startDateStr = new Date().toISOString(), daysCount = 60) {
    const target8thRasi = getChandrashtamaRasiForJanmaRasi(janmaRasiIdx);
    const startDate = new Date(startDateStr);
    const startMs = startDate.getTime();
    const endMs = startMs + daysCount * 24 * 3600 * 1000;
    
    const results = [];
    let currentMs = startMs;
    const stepMs = 6 * 3600 * 1000; // 6-hour probe step
    
    while (currentMs <= endMs) {
        const testLon = getMoonSiderealLongitude(new Date(currentMs));
        const rIdx = getRasiSignIndex(testLon);
        
        if (rIdx === target8thRasi) {
            const window = findMoonSignTransitWindow(new Date(currentMs), target8thRasi);
            // Check if this window was already captured
            const alreadyExists = results.some(r => Math.abs(r.start.getTime() - window.start.getTime()) < 12 * 3600 * 1000);
            if (!alreadyExists) {
                const stars = getStarsInRasi(target8thRasi);
                const starTransits = getStarTransitsInSignWindow(window.start, window.end, target8thRasi);
                results.push({
                    janmaRasiIdx,
                    transitRasiIdx: target8thRasi,
                    start: window.start,
                    end: window.end,
                    stars,
                    starTransits
                });
            }
            // Skip past the end of this window
            currentMs = window.end.getTime() + 12 * 3600 * 1000;
        } else {
            currentMs += stepMs;
        }
    }
    
    return results;
}

// Calculate full monthly Chandrashtama transit windows for an entire calendar month
export function calculateMonthlyChandrashtama(year, month) {
    // month is 1-indexed (1 = Jan, 12 = Dec)
    const monthStart = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
    const nextMonthStart = new Date(Date.UTC(year, month, 1, 0, 0, 0));
    
    const transitWindows = [];
    let currentMs = monthStart.getTime() - 24 * 3600 * 1000; // Look back 1 day to catch ingresses spanning 1st
    const endMs = nextMonthStart.getTime() + 24 * 3600 * 1000; // Look forward 1 day
    
    let lastRasi = null;
    const stepMs = 3 * 3600 * 1000; // 3-hour probe step
    
    while (currentMs <= endMs) {
        const testLon = getMoonSiderealLongitude(new Date(currentMs));
        const rIdx = getRasiSignIndex(testLon);
        
        if (rIdx !== lastRasi) {
            const window = findMoonSignTransitWindow(new Date(currentMs), rIdx);
            
            // Ensure we don't duplicate
            const exists = transitWindows.some(w => Math.abs(w.start.getTime() - window.start.getTime()) < 6 * 3600 * 1000);
            if (!exists) {
                // Check if this window overlaps with the calendar month
                if (window.end >= monthStart && window.start < nextMonthStart) {
                    const affectedJanmaRasiIdx = getJanmaRasiForTransitMoonRasi(rIdx);
                    const starsInTransitRasi = getStarsInRasi(rIdx);
                    
                    transitWindows.push({
                        transitRasiIdx: rIdx,
                        affectedJanmaRasiIdx,
                        start: window.start,
                        end: window.end,
                        stars: starsInTransitRasi
                    });
                }
            }
            lastRasi = rIdx;
            currentMs = window.end.getTime() + 3600 * 1000;
        } else {
            currentMs += stepMs;
        }
    }
    
    // Sort chronologically
    transitWindows.sort((a, b) => a.start - b.start);
    return transitWindows;
}

// -------------------------------------------------------------
// PLANETARY TRANSITIONS (கிரகப் பெயர்ச்சிகள்)
// -------------------------------------------------------------

// Calculate sidereal longitude of any planet for a given date
export function getPlanetSiderealLongitude(planetName, date) {
    const astroTime = new AstroTime(date);
    const jd = 2451545.0 + astroTime.ut;
    const T = (jd - 2451545.0) / 36525.0;
    const ayanamsa = getAyanamsa(jd);
    
    if (planetName === 'Rahu' || planetName === 'Ketu') {
        const L = (218.3164477 + 481267.88123421 * T - 0.0015786 * T * T) % 360;
        const L_S = (280.46646 + 36000.76983 * T + 0.0003032 * T * T) % 360;
        const M_prime = (357.52911 + 35999.05029 * T - 0.0001537 * T * T) % 360;
        const O = (125.044522 - 1934.136261 * T + 0.0020708 * T * T) % 360;
        const F = (L - O + 360) % 360;
        const D = (L - L_S + 360) % 360;
        const delta_O = 1.4979 * Math.sin(2 * (L_S - O) * DEG2RAD) - 0.1500 * Math.sin(M_prime * DEG2RAD) - 0.1200 * Math.sin(2 * F * DEG2RAD) + 0.1000 * Math.sin(2 * D * DEG2RAD);
        const rahuTropical = (O - delta_O + 360) % 360;
        const rahuSidereal = (rahuTropical - ayanamsa + 360) % 360;
        return planetName === 'Rahu' ? rahuSidereal : (rahuSidereal + 180) % 360;
    }
    
    const bodies = {
        Sun: Body.Sun,
        Moon: Body.Moon,
        Mercury: Body.Mercury,
        Venus: Body.Venus,
        Mars: Body.Mars,
        Jupiter: Body.Jupiter,
        Saturn: Body.Saturn
    };
    
    const pBody = bodies[planetName];
    if (!pBody) return 0;
    
    const vector = GeoVector(pBody, astroTime, true);
    const ecl = Ecliptic(vector);
    return (ecl.elon - ayanamsa + 360) % 360;
}

// Calculate the next upcoming transition (ingress into next Rasi) for all 9 planets
export function calculateNextPlanetTransitions(baseDate = new Date()) {
    const planets = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"];
    const results = [];
    const baseMs = baseDate.getTime();
    
    const stepConfigs = {
        Moon: { stepMs: 2 * 3600 * 1000, maxDays: 5 },
        Sun: { stepMs: 12 * 3600 * 1000, maxDays: 35 },
        Mercury: { stepMs: 6 * 3600 * 1000, maxDays: 50 },
        Venus: { stepMs: 12 * 3600 * 1000, maxDays: 50 },
        Mars: { stepMs: 24 * 3600 * 1000, maxDays: 80 },
        Jupiter: { stepMs: 3 * 24 * 3600 * 1000, maxDays: 450 },
        Saturn: { stepMs: 5 * 24 * 3600 * 1000, maxDays: 1100 },
        Rahu: { stepMs: 5 * 24 * 3600 * 1000, maxDays: 600 },
        Ketu: { stepMs: 5 * 24 * 3600 * 1000, maxDays: 600 }
    };
    
    planets.forEach(pName => {
        const initialLon = getPlanetSiderealLongitude(pName, baseDate);
        const initialRasi = getRasiSignIndex(initialLon);
        const initialStar = getStarAndPada(initialLon);
        
        const config = stepConfigs[pName] || { stepMs: 24 * 3600 * 1000, maxDays: 100 };
        const maxMs = baseMs + config.maxDays * 24 * 3600 * 1000;
        
        let t = baseMs;
        let foundLeft = baseMs;
        let foundRight = null;
        let nextRasi = null;
        
        while (t <= maxMs) {
            t += config.stepMs;
            const curLon = getPlanetSiderealLongitude(pName, new Date(t));
            const curRasi = getRasiSignIndex(curLon);
            
            if (curRasi !== initialRasi) {
                foundLeft = t - config.stepMs;
                foundRight = t;
                nextRasi = curRasi;
                break;
            }
        }
        
        if (foundRight !== null) {
            let left = foundLeft;
            let right = foundRight;
            
            for (let iter = 0; iter < 18; iter++) {
                const mid = (left + right) / 2;
                const midLon = getPlanetSiderealLongitude(pName, new Date(mid));
                const midRasi = getRasiSignIndex(midLon);
                
                if (midRasi === initialRasi) {
                    left = mid;
                } else {
                    right = mid;
                }
            }
            
            const transitionDate = new Date(right);
            const enteringLon = getPlanetSiderealLongitude(pName, transitionDate);
            const enteringStar = getStarAndPada(enteringLon);
            const enteringRasi = getRasiSignIndex(enteringLon);
            
            const diffMs = transitionDate.getTime() - baseMs;
            const diffDays = Math.max(0, diffMs / (24 * 3600 * 1000));
            const isMajor = (pName === 'Jupiter' || pName === 'Saturn' || pName === 'Rahu' || pName === 'Ketu');
            
            results.push({
                name: pName,
                isMajor,
                currentRasi: initialRasi,
                currentLongitude: initialLon,
                currentStar: initialStar,
                nextRasi: enteringRasi,
                nextStar: enteringStar,
                transitionDate,
                diffDays
            });
        }
    });
    
    results.sort((a, b) => a.transitionDate.getTime() - b.transitionDate.getTime());
    return results;
}
