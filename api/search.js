// ============================================
// DEBATESPACE - SEARCH API (UPGRADED)
// More sources, YouTube, Parliament, Live Wars
// ============================================

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    const { query } = req.query;
    if (!query || query.trim() === '') {
        return res.status(400).json({ error: 'No query provided' });
    }
    
    console.log(`\n🔍 RESEARCH: "${query}"`);
    
    try {
        // ========================================
        // FETCH FROM MULTIPLE SOURCES IN PARALLEL
        // ========================================
        const [leftResults, centreResults, rightResults, factCheckResult, youtubeResults, parliamentResult, warsResult] = await Promise.all([
            fetchLeftSources(query),
            fetchCentreSources(query),
            fetchRightSources(query),
            fetchFactCheck(query),
            fetchYouTube(query),
            fetchParliament(query),
            fetchWars()
        ]);
        
        // ========================================
        // BUILD THE ANSWER (Same format as before)
        // ========================================
        const answer = {
            verdict: factCheckResult.verdict || "Check multiple sources",
            left: leftResults.claim || "No left-leaning source found",
            centre: centreResults.claim || "No centrist source found", 
            right: rightResults.claim || "No right-leaning source found",
            sources: {
                left: leftResults.url || "#",
                centre: centreResults.url || "#",
                right: rightResults.url || "#",
                factcheck: factCheckResult.url || null
            },
            youtube: youtubeResults,
            parliament: parliamentResult,
            wars: warsResult,
            timestamp: new Date().toISOString()
        };
        
        return res.status(200).json({
            success: true,
            query: query,
            answer: answer,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('API Error:', error);
        return res.status(200).json({
            success: false,
            error: error.message,
            answer: {
                verdict: "Error fetching data",
                left: "Unable to fetch sources. Please try again.",
                centre: "Unable to fetch sources. Please try again.",
                right: "Unable to fetch sources. Please try again.",
                sources: {},
                youtube: [],
                parliament: null,
                wars: []
            }
        });
    }
}

// ============================================
// LEFT-LEANING SOURCES
// ============================================
async function fetchLeftSources(query) {
    const sources = [
        { name: "The Guardian", url: "https://www.theguardian.com", searchUrl: `https://www.theguardian.com/search?q=${encodeURIComponent(query)}` },
        { name: "Vox", url: "https://www.vox.com", searchUrl: `https://www.vox.com/search?q=${encodeURIComponent(query)}` },
        { name: "The Nation", url: "https://www.thenation.com", searchUrl: `https://www.thenation.com/search/${encodeURIComponent(query)}` },
        { name: "Mother Jones", url: "https://www.motherjones.com", searchUrl: `https://www.motherjones.com/search/${encodeURIComponent(query)}` },
        { name: "The Intercept", url: "https://theintercept.com", searchUrl: `https://theintercept.com/search/${encodeURIComponent(query)}` }
    ];
    
    // Try to fetch from NewsAPI if key exists
    const newsApiKey = process.env.NEWS_API_KEY;
    if (newsApiKey) {
        try {
            const response = await fetch(`https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&sources=the-guardian,bbc-news&apiKey=${newsApiKey}`);
            const data = await response.json();
            if (data.articles && data.articles[0]) {
                return {
                    claim: data.articles[0].title,
                    url: data.articles[0].url
                };
            }
        } catch (e) { console.log("NewsAPI left failed"); }
    }
    
    // Fallback: return first source
    return {
        claim: `Search left-leaning sources for "${query}" at ${sources[0].name}`,
        url: sources[0].searchUrl
    };
}

// ============================================
// CENTRIST SOURCES
// ============================================
async function fetchCentreSources(query) {
    const sources = [
        { name: "Reuters", url: "https://www.reuters.com", searchUrl: `https://www.reuters.com/search/news?blob=${encodeURIComponent(query)}` },
        { name: "Associated Press", url: "https://apnews.com", searchUrl: `https://apnews.com/search?q=${encodeURIComponent(query)}` },
        { name: "BBC News", url: "https://www.bbc.com", searchUrl: `https://www.bbc.com/search?q=${encodeURIComponent(query)}` },
        { name: "Politico", url: "https://www.politico.com", searchUrl: `https://www.politico.com/search?q=${encodeURIComponent(query)}` },
        { name: "The Hill", url: "https://thehill.com", searchUrl: `https://thehill.com/search/${encodeURIComponent(query)}` }
    ];
    
    const newsApiKey = process.env.NEWS_API_KEY;
    if (newsApiKey) {
        try {
            const response = await fetch(`https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&sources=reuters,bbc-news,ap-news&apiKey=${newsApiKey}`);
            const data = await response.json();
            if (data.articles && data.articles[0]) {
                return {
                    claim: data.articles[0].title,
                    url: data.articles[0].url
                };
            }
        } catch (e) { console.log("NewsAPI centre failed"); }
    }
    
    return {
        claim: `Search centrist sources for "${query}" at ${sources[0].name}`,
        url: sources[0].searchUrl
    };
}

// ============================================
// RIGHT-LEANING SOURCES
// ============================================
async function fetchRightSources(query) {
    const sources = [
        { name: "Fox News", url: "https://www.foxnews.com", searchUrl: `https://www.foxnews.com/search?q=${encodeURIComponent(query)}` },
        { name: "National Review", url: "https://www.nationalreview.com", searchUrl: `https://www.nationalreview.com/search/${encodeURIComponent(query)}` },
        { name: "Washington Times", url: "https://www.washingtontimes.com", searchUrl: `https://www.washingtontimes.com/search/${encodeURIComponent(query)}` },
        { name: "Daily Wire", url: "https://www.dailywire.com", searchUrl: `https://www.dailywire.com/search?q=${encodeURIComponent(query)}` },
        { name: "NY Post", url: "https://nypost.com", searchUrl: `https://nypost.com/search/${encodeURIComponent(query)}` }
    ];
    
    const newsApiKey = process.env.NEWS_API_KEY;
    if (newsApiKey) {
        try {
            const response = await fetch(`https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&sources=fox-news&apiKey=${newsApiKey}`);
            const data = await response.json();
            if (data.articles && data.articles[0]) {
                return {
                    claim: data.articles[0].title,
                    url: data.articles[0].url
                };
            }
        } catch (e) { console.log("NewsAPI right failed"); }
    }
    
    return {
        claim: `Search right-leaning sources for "${query}" at ${sources[0].name}`,
        url: sources[0].searchUrl
    };
}

// ============================================
// FACT CHECK API (Google Fact Check Tools)
// ============================================
async function fetchFactCheck(query) {
    const apiKey = process.env.FACT_CHECK_API_KEY;
    
    try {
        let url = `https://factchecktools.googleapis.com/v1alpha1/claims:search?query=${encodeURIComponent(query)}`;
        if (apiKey) url += `&key=${apiKey}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.claims && data.claims[0]) {
            const claim = data.claims[0];
            const review = claim.claimReview?.[0];
            return {
                verdict: review?.textualRating || "Unverified",
                url: review?.url || "#",
                publisher: review?.publisher?.name || "Fact check source"
            };
        }
    } catch (e) {
        console.log("Fact check API failed:", e.message);
    }
    
    return {
        verdict: `Search fact-checkers for "${query}"`,
        url: `https://www.google.com/search?q=${encodeURIComponent(query)}+fact+check`
    };
}

// ============================================
// YOUTUBE SEARCH (via API key)
// ============================================
async function fetchYouTube(query) {
    const apiKey = process.env.YOUTUBE_API_KEY;
    
    if (!apiKey) {
        return [{
            title: "YouTube API key not configured",
            url: "#",
            channel: "Add YOUTUBE_API_KEY to environment variables",
            views: "N/A"
        }];
    }
    
    try {
        const response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=3&key=${apiKey}`);
        const data = await response.json();
        
        if (data.items) {
            return data.items.map(item => ({
                title: item.snippet.title,
                url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
                channel: item.snippet.channelTitle,
                views: "Search on YouTube"
            }));
        }
    } catch (e) {
        console.log("YouTube API failed:", e.message);
    }
    
    return [{
        title: `Search YouTube for "${query}"`,
        url: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
        channel: "YouTube",
        views: "Click to search"
    }];
}

// ============================================
// PARLIAMENT/LIVE BRIEFINGS (UK, US, Canada)
// ============================================
async function fetchParliament(query) {
    const results = [];
    
    // UK Parliament
    try {
        const ukResponse = await fetch(`https://explore.data.parliament.uk/api/commons/search?q=${encodeURIComponent(query)}`);
        if (ukResponse.ok) {
            const ukData = await ukResponse.json();
            if (ukData.results && ukData.results[0]) {
                results.push({
                    country: "UK",
                    title: ukData.results[0].title,
                    url: ukData.results[0].url,
                    date: ukData.results[0].date
                });
            }
        }
    } catch (e) { console.log("UK Parliament fetch failed"); }
    
    // US Congress (GovTrack)
    try {
        const usResponse = await fetch(`https://www.govtrack.us/api/v2/role?current=true&limit=5`);
        if (usResponse.ok) {
            const usData = await usResponse.json();
            return {
                title: `US Congress - Search "${query}"`,
                url: `https://www.govtrack.us/search?q=${encodeURIComponent(query)}`,
                date: new Date().toISOString().split('T')[0]
            };
        }
    } catch (e) { console.log("US Congress fetch failed"); }
    
    return {
        title: `Search Parliament/Congress records for "${query}"`,
        url: `https://www.google.com/search?q=${encodeURIComponent(query)}+parliament+transcript`,
        date: new Date().toISOString().split('T')[0]
    };
}

// ============================================
// LIVE WAR/CONFLICT UPDATES
// ============================================
async function fetchWars() {
    const conflicts = [];
    
    // Wikipedia ongoing conflicts
    try {
        const wikiResponse = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/List_of_ongoing_armed_conflicts`);
        if (wikiResponse.ok) {
            const wikiData = await wikiResponse.json();
            conflicts.push({
                name: "Multiple ongoing conflicts",
                status: "See Wikipedia",
                source: wikiData.content_urls?.desktop?.page || "https://en.wikipedia.org/wiki/List_of_ongoing_armed_conflicts"
            });
        }
    } catch (e) { console.log("Wikipedia wars fetch failed"); }
    
    // Add major known conflicts
    const majorConflicts = [
        { name: "Russia-Ukraine War", status: "Active", source: "https://liveuamap.com/ukraine" },
        { name: "Israel-Hamas War", status: "Active", source: "https://liveuamap.com/israel" },
        { name: "Sudan Conflict", status: "Active", source: "https://liveuamap.com/sudan" }
    ];
    
    return majorConflicts;
}

// ============================================
// HELPER: Clean text
// ============================================
function cleanText(text) {
    return text.replace(/\s+/g, ' ').trim();
}
