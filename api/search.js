// ============================================
// DEBATESPACE - PROPER RESEARCH API
// Government sources ONLY in main answer
// Every sentence = direct quote
// ============================================

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    const { query } = req.query;
    if (!query || query.trim() === '') {
        return res.status(400).json({ error: 'No query provided' });
    }
    
    console.log(`\n🔍 RESEARCH: "${query}"`);
    
    try {
        // Search government sources (PRIORITY 1)
        const govResults = await searchGovernmentSources(query);
        
        // Search web sources (FALLBACK only)
        const webResults = await searchWebSources(query);
        
        // Search news (DISPLAY ONLY)
        const newsResults = await searchNewsSources(query);
        const videoResults = await searchVideoSources(query);
        
        // Combine: government first, then web
        const allEvidence = [...govResults, ...webResults];
        
        console.log(`   Government: ${govResults.length} | Web: ${webResults.length} | Total: ${allEvidence.length}`);
        
        // Build answer from exact quotes
        const answer = buildAnswerFromExactQuotes(query, allEvidence, govResults);
        
        return res.status(200).json({
            success: true,
            query: query,
            answer: answer,
            newsArticles: newsResults,
            videoSources: videoResults,
            allSources: allEvidence,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('[API] Error:', error);
        return res.status(200).json({
            success: true,
            query: query,
            answer: {
                text: `Search error: ${error.message}. Please try again.`,
                sentences: [],
                citations: []
            },
            newsArticles: [],
            videoSources: [],
            allSources: []
        });
    }
}

// ============================================
// GOVERNMENT SOURCES - USING YOUR CX KEYS
// ============================================
async function searchGovernmentSources(query) {
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const cx = process.env.GOOGLE_SEARCH_CX_NA;
    const results = [];
    const seenUrls = new Set();
    
    if (!apiKey || !cx) {
        console.log('⚠️ Missing API keys');
        return results;
    }
    
    // Government domains to search
    const govDomains = [
        'usa.gov', 'whitehouse.gov', 'congress.gov', 'federalregister.gov',
        'cdc.gov', 'nih.gov', 'bls.gov', 'census.gov', 'justice.gov', 
        'dhs.gov', 'ice.gov', 'fletc.gov', 'state.gov', 'treasury.gov',
        'fda.gov', 'epa.gov', 'archives.gov', 'gao.gov', 'canada.ca',
        'statcan.gc.ca', 'gov.uk', 'ons.gov.uk', 'europa.eu', 'who.int'
    ];
    
    // Search each domain
    for (const domain of govDomains) {
        try {
            const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}&siteSearch=${domain}&siteSearchFilter=i&num=3`;
            
            const response = await fetch(url);
            
            if (response.ok) {
                const data = await response.json();
                if (data.items) {
                    for (const item of data.items) {
                        if (!seenUrls.has(item.link)) {
                            seenUrls.add(item.link);
                            results.push({
                                type: "government",
                                source: domain,
                                title: item.title,
                                url: item.link,
                                text: item.snippet,
                                exactQuote: item.snippet
                            });
                        }
                    }
                }
            }
            
            // Rate limit
            await new Promise(r => setTimeout(r, 100));
            
        } catch (error) {
            // Silent fail for individual domains
        }
    }
    
    return results;
}

// ============================================
// WEB SOURCES (FALLBACK)
// ============================================
async function searchWebSources(query) {
    const apiKey = process.env.TAVILY_API_KEY;
    const results = [];
    
    if (!apiKey) return results;
    
    try {
        const response = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                api_key: apiKey,
                query: query,
                search_depth: 'basic',
                max_results: 5
            })
        });
        
        const data = await response.json();
        
        if (data.results) {
            for (const result of data.results) {
                results.push({
                    type: "web",
                    source: new URL(result.url).hostname,
                    title: result.title,
                    url: result.url,
                    text: result.content?.substring(0, 300),
                    exactQuote: result.content?.substring(0, 300)
                });
            }
        }
    } catch (error) {
        console.error('[Tavily] Error:', error.message);
    }
    
    return results;
}

// ============================================
// NEWS SOURCES (DISPLAY ONLY)
// ============================================
async function searchNewsSources(query) {
    const apiKey = process.env.GNEWS_API_KEY;
    const articles = [];
    
    if (!apiKey) return articles;
    
    try {
        const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=en&max=8&token=${apiKey}`;
        const response = await fetch(url);
        
        if (response.ok) {
            const data = await response.json();
            if (data.articles) {
                for (const article of data.articles.slice(0, 8)) {
                    articles.push({
                        title: article.title,
                        url: article.url,
                        source: new URL(article.url).hostname,
                        date: article.publishedAt?.split('T')[0],
                        description: article.description
                    });
                }
            }
        }
    } catch (error) {
        console.error('[GNews] Error:', error.message);
    }
    
    return articles;
}

// ============================================
// VIDEO SOURCES (DISPLAY ONLY)
// ============================================
async function searchVideoSources(query) {
    const apiKey = process.env.YOUTUBE_API_KEY;
    const videos = [];
    
    if (!apiKey) return videos;
    
    try {
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=5&key=${apiKey}`;
        const response = await fetch(url);
        
        if (response.ok) {
            const data = await response.json();
            if (data.items) {
                for (const item of data.items) {
                    videos.push({
                        title: item.snippet.title,
                        url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
                        channel: item.snippet.channelTitle,
                        thumbnail: item.snippet.thumbnails?.medium?.url || ''
                    });
                }
            }
        }
    } catch (error) {
        console.error('[YouTube] Error:', error.message);
    }
    
    return videos;
}

// ============================================
// BUILD ANSWER FROM EXACT QUOTES
// ============================================
function buildAnswerFromExactQuotes(query, allEvidence, govEvidence) {
    // Prioritize government sources
    const sortedEvidence = [...govEvidence, ...allEvidence.filter(e => e.type !== "government")];
    
    // Remove duplicates
    const uniqueSources = [];
    const seenTexts = new Set();
    
    for (const source of sortedEvidence) {
        const textKey = (source.text || '').substring(0, 60);
        if (!seenTexts.has(textKey) && source.text && source.text.length > 40) {
            seenTexts.add(textKey);
            uniqueSources.push(source);
        }
        if (uniqueSources.length >= 20) break;
    }
    
    if (uniqueSources.length === 0) {
        return {
            text: `No government sources found for "${query}". Try: "Canada immigration statistics" or "US inflation rate 2024"`,
            sentences: [],
            citations: [],
            evidenceCount: 0,
            governmentCount: 0
        };
    }
    
    const citations = [];
    const sentenceList = [];
    
    // Introduction
    const govCount = uniqueSources.filter(s => s.type === "government").length;
    sentenceList.push({
        text: `DIRECT QUOTES FROM ${uniqueSources.length} SOURCES (${govCount} government sources) about "${query}":`,
        citationId: null
    });
    
    // Add each source as a direct quote
    let citationId = 1;
    for (const source of uniqueSources) {
        let quote = source.text.replace(/\s+/g, ' ').trim();
        
        // Add quotation marks
        if (!quote.startsWith('"')) quote = `"${quote}"`;
        if (!quote.endsWith('"')) quote = quote + '"';
        
        const typeLabel = source.type === "government" ? "🏛️ GOVERNMENT" : "🌐 SOURCE";
        
        sentenceList.push({
            text: quote,
            citationId: citationId
        });
        
        citations.push({
            id: citationId,
            text: source.text.length > 350 ? source.text.substring(0, 350) + '...' : source.text,
            source: `${typeLabel}: ${source.source}`,
            url: source.url,
            title: source.title
        });
        
        citationId++;
    }
    
    // Conclusion
    sentenceList.push({
        text: `Each citation contains a direct quote. Click the numbers to verify the original source.`,
        citationId: null
    });
    
    // Build full text
    let fullText = "";
    for (const sentence of sentenceList) {
        fullText += sentence.text + " ";
    }
    
    return {
        text: fullText,
        sentences: sentenceList,
        citations: citations,
        evidenceCount: uniqueSources.length,
        governmentCount: govCount
    };
}
