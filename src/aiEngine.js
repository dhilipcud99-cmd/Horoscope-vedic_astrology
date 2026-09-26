import { signKeys, getRasiSignIndex } from './astroCalculations.js';
import { translations } from './translations.js';

// Detailed descriptions for Lagna/Ascendant
const lagnaDetails = {
    en: [
        "Aries: You possess dynamic energy, pioneering spirit, and natural leadership qualities. You thrive on challenge and approach life with enthusiasm.",
        "Taurus: You are patient, practical, reliable, and deeply appreciate beauty and comfort. You value stability and build your life on solid foundations.",
        "Gemini: You are highly communicative, intellectual, adaptable, and naturally curious. You love learning and excel in tasks involving speech or writing.",
        "Cancer: You are emotionally intuitive, highly protective, nurturing, and deeply connected to home and family. Your strength lies in your empathy.",
        "Leo: You possess natural confidence, warmth, creativity, and a strong sense of pride. You command respect and seek to shine in your chosen field.",
        "Virgo: You are analytical, meticulous, service-oriented, and highly practical. You excel in organizing, problem-solving, and improving systems.",
        "Libra: You value harmony, balance, diplomacy, and relationships. You possess artistic taste and always seek fair and peaceful resolutions.",
        "Scorpio: You are intense, passionate, highly intuitive, and drawn to mysteries. You possess immense inner strength and power to transform.",
        "Sagittarius: You are optimistic, freedom-loving, philosophical, and generous. You seek truth, enjoy travel, and have a broad perspective on life.",
        "Capricorn: You are disciplined, ambitious, practical, and highly responsible. You build success through persistent effort and respect structure.",
        "Aquarius: You are innovative, humanitarian, independent, and progressive. You value friendship and seek to make positive social impacts.",
        "Pisces: You are compassionate, imaginative, spiritual, and deeply empathetic. You possess artistic talents and have a strong intuitive connection."
    ],
    ta: [
        "மேஷம்: நீங்கள் சுறுசுறுப்பும், தலைமைப் பண்பும், சவால்களை எதிர்கொள்ளும் தைரியமும் கொண்டவர். எதிலும் முதல் ஆளாக நிற்க விரும்புவீர்கள்.",
        "ரிஷபம்: நீங்கள் பொறுமை, நிதானம், கலை ஆர்வம் மற்றும் நம்பகத்தன்மை கொண்டவர். வாழ்க்கையில் நிலையான தன்மையையும் வசதிகளையும் விரும்புவீர்கள்.",
        "மிதுனம்: நீங்கள் சிறந்த புத்திசாலித்தனம், பேச்சுத்திறன் மற்றும் பல்துறை ஆர்வம் கொண்டவர். புதிய தகவல்களை கற்பதில் ஆர்வம் காட்டுவீர்கள்.",
        "கடகம்: நீங்கள் ஈர மனம், கற்பனை வளம் மற்றும் குடும்பத்தின் மீது மிகுந்த பற்றும் கொண்டவர். மற்றவர்களின் உணர்வுகளை எளிதில் புரிந்து கொள்வீர்கள்.",
        "சிம்மம்: நீங்கள் கம்பீரமான தோற்றம், ஆளுமைத் திறன் மற்றும் தாராள குணம் கொண்டவர். சுயமரியாதைக்கு முக்கியத்துவம் தருவீர்கள்.",
        "கன்னி: நீங்கள் சிறந்த பகுத்தறிவு, நேர்த்தி மற்றும் ஒழுக்க ஒழுங்கு கொண்டவர். எந்த ஒரு வேலையையும் மிகவும் நுணுக்கமாக செய்து முடிப்பீர்கள்.",
        "துலாம்: நீங்கள் சமநிலை, நியாயம், கலை உணர்வு மற்றும் நட்பு குணம் கொண்டவர். உறவுகளுக்கு மதிப்பளித்து அமைதியை விரும்புவீர்கள்.",
        "விருச்சிகம்: நீங்கள் மறைமுக ஆற்றல், கூர்மையான புத்தி மற்றும் விடாமுயற்சி கொண்டவர். ரகசியங்களைக் காப்பதிலும், சவால்களை வெல்வதிலும் வல்லவர்.",
        "தனுசு: நீங்கள் நேர்மை, ஆன்மீக நாட்டம், தாராள குணம் மற்றும் நேர்மறை எண்ணம் கொண்டவர். எப்போதும் நல்ல ஆலோசனைகளை வழங்குவீர்கள்.",
        "மகரம்: நீங்கள் கடின உழைப்பு, கடமை உணர்வு மற்றும் பொறுமை கொண்டவர். விடாமுயற்சியால் படிப்படியாக முன்னேறி இலக்கை அடைவீர்கள்.",
        "கும்பம்: நீங்கள் புதுமையான சிந்தனை, சுதந்திர குணம் மற்றும் சமூக நல அக்கறை கொண்டவர். நண்பர்கள் வட்டத்தில் செல்வாக்கு மிக்கவர்.",
        "மீனம்: நீங்கள் கருணை உள்ளம், ஆன்மீக நாட்டம் மற்றும் கற்பனை ஆற்றல் கொண்டவர். பிறருக்கு உதவுவதில் மகிழ்ச்சி காண்பீர்கள்."
    ]
};

// Detailed descriptions for active Dasa Lord
const dasaLordDetails = {
    en: {
        Sun: "Sun (Surya) Mahadasa: This is a period of authority, recognition, and self-realization. Focus on establishing career leadership, improving relations with government/superiors, and maintaining vitality. Avoid ego clashes.",
        Moon: "Moon (Chandra) Mahadasa: A highly creative, emotional, and reflective phase. Travel, family welfare, mental peace, and artistic pursuits will dominate. Pay attention to mood stability and nutrition.",
        Mars: "Mars (Mangal) Mahadasa: A high-energy phase of action, competition, and property gains. Your determination will help resolve long-standing hurdles, but guard against impulsiveness, impatience, and arguments.",
        Mercury: "Mercury (Budha) Mahadasa: A prime period for business development, skill acquisition, financial calculations, and communication. Intellectually stimulating, excellent for writing, education, and trade.",
        Jupiter: "Jupiter (Guru) Mahadasa: The most auspicious phase of wisdom, expansion, and prosperity. Promotes spiritual growth, academic excellence, family harmony, and wealth creation. A highly progressive period.",
        Venus: "Venus (Shukra) Mahadasa: A phase of luxury, creative expansion, relationships, and comforts. Ideal for artistic pursuits, purchases of vehicles/property, marriage, and enjoying life's pleasures.",
        Saturn: "Saturn (Shani) Mahadasa: A period of discipline, structuring, and career development through hard work. While things may move slow, Saturn rewards persistence, teaching valuable lessons in patience.",
        Rahu: "Rahu Mahadasa: A cycle of ambition, unconventional paths, and potential foreign journeys or tech-oriented career success. Focus on clarity and avoid illusionary short-cuts.",
        Ketu: "Ketu Mahadasa: A spiritual phase of detachment, deep research, and intuitive development. Focus shifts inward toward self-discovery and letting go of materials. Excellent for research and yoga."
    },
    ta: {
        Sun: "சூரிய தசா காலம்: இது அதிகாரம், கௌரவம் மற்றும் அரசாங்க ஆதரவு கிடைக்கும் காலம். உங்கள் தலைமைப் பண்பு வெளிப்படும். தந்தை வழியில் நன்மைகள் உண்டாகும். அவசரப்பட்டு கோபப்படுவதைத் தவிர்க்கவும்.",
        Moon: "சந்திர தசா காலம்: மன அமைதி, குடும்ப மகிழ்ச்சி மற்றும் கலைகளில் ஆர்வம் அதிகரிக்கும் காலம். பயணங்கள் மூலம் நன்மைகள் விளையும். தாய்வழி உறவுகளால் நன்மை கிட்டும். உணர்ச்சிகளைக் கட்டுப்படுத்துவது நல்லது.",
        Mars: "செவ்வாய் தசா காலம்: தைரியம், சுறுசுறுப்பு மற்றும் நிலம்/வீடு சார்ந்த சொத்து சேர்க்கை கூடும் காலம். சவால்களை எதிர்த்து வெற்றி பெறுவீர்கள். உடன் பிறந்தவர்களுடன் இணக்கமாகச் செல்லவும், கோபத்தைக் குறைக்கவும்.",
        Mercury: "புதன் தசா காலம்: கல்வி, வியாபாரம், கணக்கியல் மற்றும் தகவல் தொடர்புத் துறையில் பெரும் வளர்ச்சி கிட்டும் காலம். உங்கள் புத்திசாலித்தனத்தால் புதிய வருமான வழிகள் உருவாகும். புதிய நுட்பங்களை கற்பீர்கள்.",
        Jupiter: "குரு தசா காலம்: ஆன்மீகம், அறிவு வளர்ச்சி, குடும்பத்தில் சுப காரியங்கள் மற்றும் பொருளாதார முன்னேற்றம் தரும் காலம். குழந்தை பாக்கியம், உயர் பதவி மற்றும் சமூகத்தில் மதிப்பு கூடும்.",
        Venus: "சுக்கிர தசா காலம்: ஆடை ஆபரண சேர்க்கை, வாகன வசதி, சொகுசு வாழ்க்கை மற்றும் திருமண சுப நிகழ்வுகள் கூடும் காலம். கலைத் துறையினருக்கு உன்னதமான காலம். மகிழ்ச்சி நிறைந்திருக்கும்.",
        Saturn: "சனி தசா காலம்: கடின உழைப்பு, பொறுமை மற்றும் தொழில் ஒழுங்கு மூலம் முன்னேறும் காலம். பொறுப்புகள் அதிகரிக்கும். தாமதங்கள் இருந்தாலும் இறுதியில் நிலையான வெற்றியைத் தரும்.",
        Rahu: "ராகு தசா காலம்: திடீர் மாற்றங்கள், வெளிநாட்டுத் தொடர்புகள் மற்றும் நவீன தொழில் நுட்பங்கள் மூலம் லாபம் தரும் காலம். பெரிய பேராசைகளைத் தவிர்த்து விழிப்புடன் செயல்படவும்.",
        Ketu: "கேது தசா காலம்: ஆன்மீக நாட்டம், ஞானம், ஆராய்ச்சி குணம் மற்றும் மன அமைதி தேடும் காலம். தியானம், யோகா போன்றவற்றில் ஆர்வம் கூடும். மனத்தெளிவு உண்டாகும்."
    }
};

export function generateAIPrediction(horoscope, lang) {
    const starIdx = horoscope.panchang.starIdx;
    const starName = translations[lang]?.stars[starIdx] || translations['en'].stars[starIdx];
    const pada = horoscope.panchang.pada;
    
    // Calculate Lagna
    const lagnaIdx = getRasiSignIndex(horoscope.lagnaLon);
    const lagnaName = translations[lang]?.signs[signKeys[lagnaIdx]] || translations['en'].signs[signKeys[lagnaIdx]];
    
    // Find active Dasa
    const activeDasa = horoscope.dasaTimeline.find(p => p.status === 'active') || horoscope.dasaTimeline[0];
    const dasaLord = activeDasa.lord;
    const activeDasaLordName = translations[lang]?.planets[dasaLord] || translations['en'].planets[dasaLord];
    
    const lagnaText = lagnaDetails[lang]?.[lagnaIdx] || lagnaDetails['en']?.[lagnaIdx] || '';
    const dasaText = dasaLordDetails[lang]?.[dasaLord] || dasaLordDetails['en']?.[dasaLord] || '';
    
    const details = {
        title: lang === 'ta' ? `${horoscope.birthDetails.name}-க்கான AI ஜாதக கணிப்புகள்` : `AI Horoscope Readings for ${horoscope.birthDetails.name}`,
        
        personality: lang === 'ta' 
            ? `<b>லக்னம் மற்றும் நட்சத்திர ஆளுமை:</b> உங்கள் லக்னம் <b>${lagnaName}</b> மற்றும் உங்கள் ஜென்ம நட்சத்திரம் <b>${starName} (பாதம்: ${pada})</b> ஆகும். ${lagnaText} உங்கள் மனம் மற்றும் எண்ணங்கள் எப்போதும் சுயமாகச் சிந்திக்கும் தன்மையைக் கொண்டிருக்கும்.`
            : `<b>Lagna & Nakshatra Analysis:</b> Your Ascendant (Lagna) is <b>${lagnaName}</b> and your birth star is <b>${starName} (Pada: ${pada})</b>. ${lagnaText} The combined planetary aspects give you a strong capacity to handle challenging life scenarios with resilience and focus.`,
        
        career: lang === 'ta'
            ? `<b>தொழில் மற்றும் நிதி வாய்ப்புகள்:</b> உங்கள் ஜாதகக் கட்டத்தில் 10-ஆம் மற்றும் 2-ஆம் அதிபதிகளின் வலுவைப் பார்க்கும்போது, நீங்கள் மேலாண்மை, வடிவமைப்பு, ஆலோசனைகள் வழங்குதல் அல்லது சொந்த வர்த்தகத்தில் சிறந்து விளங்குவீர்கள். வியாபாரத்தில் புதிய கூட்டாளிகள் மூலம் லாபம் கிட்டும். எதிலும் திட்டமிட்டுச் செயல்படுவது நலம்.`
            : `<b>Career & Financial Outlook:</b> Analyzing the planetary strengths of your 10th (Career) and 2nd (Wealth) houses suggests a naturally active approach to professional opportunities. You are highly suited for leadership roles, consultancy, finance, technology, or independent enterprise. Consistent planning brings steady financial growth.`,
        
        dasa: lang === 'ta'
            ? `<b>தற்போதைய திசை பலன்கள் (${activeDasaLordName} தசா):</b> தற்போது உங்களுக்கு <b>${activeDasaLordName} தசா</b> நடைபெறுகிறது. ${dasaText} இந்த தசா காலம் உங்கள் வாழ்வில் புதிய திருப்புமுனைகளையும், முக்கிய முடிவுகளையும் எடுக்கத் தூண்டும். தற்போதைய வயதுக்கேற்ற நல்ல வளர்ச்சியைத் தரும்.`
            : `<b>Active Life Phase (${activeDasaLordName} Dasa):</b> You are currently running the <b>${activeDasaLordName} Mahadasa</b>. ${dasaText} This phase represents a major developmental chapter in your life, urging you to focus on growth and align with your core strengths.`,
            
        remedy: lang === 'ta'
            ? `<b>ஆன்மீக வழிகாட்டுதல் & பரிகாரம்:</b> உங்கள் நட்சத்திர நாதனையும், தற்போதைய தசா நாதனையும் வழிபடவும். தினமும் காலையில் சூரிய நமஸ்காரம் செய்வதும், குலதெய்வ வழிபாட்டைத் தொடர்வதும் தடைகளை உடைத்து வாழ்வில் பெரும் வெற்றியைத் தரும்.`
            : `<b>Remedy & Spiritual Guidance:</b> Strengthening the lord of your active Dasa and offering prayers to your family deity will invite positive energies. Regular meditation and practicing gratitude will help remove obstacles and bring overall prosperity.`
    };
    
    return details;
}

// Preset Q&A database mapping
export function getAIAnswer(horoscope, questionId, lang) {
    const starIdx = horoscope.panchang.starIdx;
    const starName = translations[lang]?.stars[starIdx] || translations['en'].stars[starIdx];
    const lagnaIdx = getRasiSignIndex(horoscope.lagnaLon);
    const lagnaName = translations[lang]?.signs[signKeys[lagnaIdx]] || translations['en'].signs[signKeys[lagnaIdx]];
    const activeDasa = horoscope.dasaTimeline.find(p => p.status === 'active') || horoscope.dasaTimeline[0];
    const activeDasaLordName = translations[lang]?.planets[activeDasa.lord] || translations['en'].planets[activeDasa.lord];
    
    const answers = {
        finance: {
            en: `Based on your Ascendant in <b>${lagnaName}</b> and the active <b>${activeDasaLordName} Dasa</b>, your financial situation will grow through structured savings and investments. The active Dasa lord indicates that any business or career effort started with proper advice during this phase will produce steady wealth. Avoid impulsive spending, and invest in long-term gold, mutual funds, or land assets.`,
            ta: `உங்கள் <b>${lagnaName} லக்னம்</b> மற்றும் தற்போதைய <b>${activeDasaLordName} தசா</b> அடிப்படையில், உங்கள் பொருளாதாரம் திட்டமிட்ட சேமிப்பு மற்றும் முதலீடுகள் மூலம் உயரும். தற்போதைய தசா நாதன் புதிய வருமான வழிகளை உருவாக்க உதவுவார். அவசரப்பட்டு யாரிடமும் பணம் கடன் கொடுக்க வேண்டாம். தங்கம் அல்லது நிலத்தில் முதலீடு செய்வது நீண்ட காலத்திற்கு லாபமளிக்கும்.`
        },
        purpose: {
            en: `With your Moon placed in the sacred Nakshatra of <b>${starName}</b>, your true life purpose revolves around creating balance, sharing knowledge, and helping others grow. Your <b>${lagnaName} Lagna</b> equips you with the passion and patience to lead and guide. You are destined to make an impact in your local community, family, and profession.`,
            ta: `உங்கள் சந்திரன் <b>${starName} நட்சத்திரத்தில்</b> அமைந்திருப்பதால், உங்கள் வாழ்வின் உண்மையான நோக்கம் மற்றவர்களுக்கு உதவுவதும், ஞானத்தை வளர்ப்பதும் ஆகும். உங்கள் <b>${lagnaName} லக்னம்</b> உங்களுக்கு எதையும் தாங்கும் மன உறுதியையும், ஆளுமைத் திறனையும் வழங்குகிறது. சமூகத்திற்கு உங்களால் முடிந்த நல்ல உதவிகளைச் செய்வதே உங்கள் ஆன்மாவின் விருப்பம்.`
        },
        growth: {
            en: `Your career growth is highly dynamic. Under the influence of the current <b>${activeDasaLordName} Mahadasa</b>, you are entering a phase where hard work will translate directly into promotion and recognition. Expect significant career progress, especially in sectors matching your star's energy (such as management, advisory, or technology). Key professional windows open during sub-periods of beneficial planets.`,
            ta: `உங்கள் தொழில் வளர்ச்சி தற்போது நடைபெறும் <b>${activeDasaLordName} தசா</b> மூலம் புதிய வேகத்தைப் பெறும். உங்கள் கடின உழைப்பிற்கான அங்கீகாரம், பதவி உயர்வு மற்றும் பாராட்டுக்கள் கிடைக்கும். நீங்கள் மேலாண்மை, கல்வி அல்லது தொழில்நுட்பத் துறையில் இருந்தால், அடுத்த சில மாதங்களில் நல்ல செய்தி கிடைக்கும். சோம்பலைத் தவிர்த்து உழைத்தால் வெற்றி நிச்சயம்.`
        },
        remedy: {
            en: `To balance the active energies of <b>${activeDasaLordName} Dasa</b> and strengthen your birth star <b>${starName}</b>, follow these simple remedies:\n1. Light a lamp (ghee or sesame oil) at home or a local temple on the day of your Nakshatra.\n2. Help a student or donate to educational causes.\n3. Keep a silver coin or write your family deity name daily.`,
            ta: `தற்போதைய <b>${activeDasaLordName} தசா</b> மற்றும் உங்கள் ஜென்ம நட்சத்திரமான <b>${starName}</b>-ன் ஆற்றல்களை சமநிலைப்படுத்த எளிய பரிகாரங்கள்:\n1. உங்கள் நட்சத்திரம் வரும் நாளில் வீட்டில் நெய் அல்லது நல்லெண்ணெய் தீபம் ஏற்றி வழிபடவும்.\n2. ஏழை மாணவர்களின் கல்விக்கு உங்களால் முடிந்த உதவிகளை வழங்கவும்.\n3. தினமும் காலையில் குலதெய்வத்தை மனதார நினைத்து தியானம் செய்யவும்.`
        }
    };
    
    return answers[questionId]?.[lang] || answers[questionId]?.['en'] || '';
}

// Interactive custom free-text question routing
export function getAIAnswerFromFreeText(horoscope, queryText, lang) {
    const query = queryText.toLowerCase().trim();
    
    // Topic checks
    if (query.includes('finance') || query.includes('money') || query.includes('wealth') || query.includes('saving') || query.includes('income') || query.includes('loan') || query.includes('நிதி') || query.includes('பணம்') || query.includes('சேமிப்பு') || query.includes('வருமானம்') || query.includes('கடன்')) {
        return getAIAnswer(horoscope, 'finance', lang);
    }
    
    if (query.includes('career') || query.includes('job') || query.includes('work') || query.includes('business') || query.includes('growth') || query.includes('promotion') || query.includes('வேலை') || query.includes('தொழில்') || query.includes('வியாபாரம்') || query.includes('வளர்ச்சி') || query.includes('பதவி')) {
        return getAIAnswer(horoscope, 'growth', lang);
    }
    
    if (query.includes('purpose') || query.includes('life') || query.includes('destiny') || query.includes('born') || query.includes('நோக்கம்') || query.includes('வாழ்க்கை') || query.includes('விதி') || query.includes('பிறவி')) {
        return getAIAnswer(horoscope, 'purpose', lang);
    }
    
    if (query.includes('remedy') || query.includes('parihar') || query.includes('pray') || query.includes('temple') || query.includes('பரிகாரம்') || query.includes('வழிபாடு') || query.includes('கோவில்') || query.includes('தீபம்')) {
        return getAIAnswer(horoscope, 'remedy', lang);
    }
    
    if (query.includes('health') || query.includes('disease') || query.includes('sick') || query.includes('body') || query.includes('pain') || query.includes('உடல்') || query.includes('ஆரோக்கியம்') || query.includes('நோய்') || query.includes('வலி')) {
        const activeDasa = horoscope.dasaTimeline.find(p => p.status === 'active') || horoscope.dasaTimeline[0];
        const activeDasaLordName = translations[lang]?.planets[activeDasa.lord] || translations['en'].planets[activeDasa.lord];
        return lang === 'ta'
            ? `ஆரோக்கியம் குறித்து: தற்போதைய <b>${activeDasaLordName} தசா</b> உங்கள் உடல் பலத்தை சீராக வைத்திருக்கும். என்றாலும் செரிமானம், ஒற்றைத்தலைவலி அல்லது நரம்புத் தளர்ச்சி போன்ற உபாதைகளில் எச்சரிக்கை தேவை. முறையான உணவுப் பழக்கமும், தியானமும் உங்களைக் காக்கும்.`
            : `Concerning your health: Under the active <b>${activeDasaLordName} Mahadasa</b>, your physical energy remains steady. However, watch out for minor digestive, nerve, or fatigue issues. Maintaining a clean diet and practicing breathing exercises will ensure wellness.`;
    }
    
    // Default fallback
    const starIdx = horoscope.panchang.starIdx;
    const starName = translations[lang]?.stars[starIdx] || translations['en'].stars[starIdx];
    const lagnaIdx = getRasiSignIndex(horoscope.lagnaLon);
    const lagnaName = translations[lang]?.signs[signKeys[lagnaIdx]] || translations['en'].signs[signKeys[lagnaIdx]];
    const activeDasa = horoscope.dasaTimeline.find(p => p.status === 'active') || horoscope.dasaTimeline[0];
    const activeDasaLordName = translations[lang]?.planets[activeDasa.lord] || translations['en'].planets[activeDasa.lord];
    
    return lang === 'ta'
        ? `உங்கள் கேள்வி குறித்து உங்களது <b>${lagnaName} லக்னம்</b> மற்றும் <b>${starName} நட்சத்திரம்</b> அடிப்படையில் AI ஆராய்ந்தது. தற்போதைய <b>${activeDasaLordName} தசா</b> உங்களை சுயமாகச் சிந்தித்து முடிவெடுக்கத் தூண்டுகிறது. உங்களது சவால்கள் படிப்படியாகக் குறையும், நேர்மறையான எண்ணங்களுடன் உங்கள் கடமையைச் செய்யவும்.`
        : `Analyzing your chart: As a <b>${lagnaName}</b> Ascendant with <b>${starName}</b> Nakshatra, your path is supported by steady progress. The active <b>${activeDasaLordName} Mahadasa</b> indicates that key answers will unfold as you stay focused on your daily efforts. Stay optimistic and maintain discipline.`;
}
