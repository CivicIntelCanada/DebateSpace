// ============================================
// DEBATESPACE - WORKING RESEARCH API
// ============================================

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    const { query } = req.query;
    if (!query || query.trim() === '') {
        return res.status(400).json({ error: 'No query provided' });
    }
    
    console.log(`\n🔍 SEARCH: "${query}"`);
    
    try {
        // Get all available API keys
        const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
        const cx = process.env.GOOGLE_SEARCH_CX_NA;
        
        console.log(`API Key exists: ${!!apiKey}`);
        console.log(`CX exists: ${!!cx}`);
        
        let allResults = [];
        
        // METHOD 1: Direct Google Search (no site restriction - ensures results)
        if (apiKey && cx) {
            console.log('Performing Google search...');
            const directResults = await googleSearch(query, apiKey, cx);
            allResults.push(...directResults);
            console.log(`Direct results: ${directResults.length}`);
        }
        
        // METHOD 2: Government-focused search
        if (apiKey && cx) {
            console.log('Performing government search...');
            const govResults = await governmentSearch(query, apiKey, cx);
            allResults.push(...govResults);
            console.log(`Government results: ${govResults.length}`);
        }
        
        // METHOD 3: Tavily fallback
        const tavilyResults = await tavilySearch(query);
        allResults.push(...tavilyResults);
        console.log(`Tavily results: ${tavilyResults.length}`);
        
        // Remove duplicates
        const uniqueResults = [];
        const seenUrls = new Set();
        for (const result of allResults) {
            if (!seenUrls.has(result.url)) {
                seenUrls.add(result.url);
                uniqueResults.push(result);
            }
        }
        
        console.log(`TOTAL UNIQUE RESULTS: ${uniqueResults.length}`);
        
        // Build answer - even if no results, return something
        const answer = buildAnswer(query, uniqueResults);
        
        // Get news and videos for display
        const newsResults = await getNews(query);
        const videoResults = await getVideos(query);
        
        return res.status(200).json({
            success: true,
            query: query,
            answer: answer,
            newsArticles: newsResults,
            videoSources: videoResults,
            allSources: uniqueResults.slice(0, 30),
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('FATAL ERROR:', error);
        // Always return something, never fail
        return res.status(200).json({
            success: true,
            query: query,
            answer: {
                text: `Search completed. Results: ${error.message}`,
                sentences: [{ text: `Search completed. Try being more specific.`, citationId: null }],
                citations: [],
                evidenceCount: 0
            },
            newsArticles: [],
            videoSources: [],
            allSources: []
        });
    }
}

// ============================================
// DIRECT GOOGLE SEARCH
// ============================================
async function googleSearch(query, apiKey, cx) {
    try {
        const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}&num=10`;
        console.log(`Request URL: ${url.substring(0, 150)}...`);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            console.log(`HTTP Error: ${response.status}`);
            return [];
        }
        
        const data = await response.json();
        
        if (!data.items) {
            console.log('No items in response');
            return [];
        }
        
        return data.items.map(item => ({
            type: "web",
            source: new URL(item.link).hostname,
            title: item.title,
            url: item.link,
            snippet: item.snippet,
            isGovernment: item.link.includes('.gov') || item.link.includes('.gc.ca')
        }));
        
    } catch (error) {
        console.error('Google search error:', error.message);
        return [];
    }
}

// ============================================
// GOVERNMENT-SPECIFIC SEARCH
// ============================================
async function governmentSearch(query, apiKey, cx) {
    const results = [];
    const govDomains = ['.gov', '.gc.ca', '.gov.uk', '.europa.eu'];
    
    for (const domain of govDomains) {
        try {
            const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}&siteSearch=${domain}&siteSearchFilter=i&num=5`;
            
            const response = await fetch(url);
            
            if (response.ok) {
                const data = await response.json();
                if (data.items) {
                    for (const item of data.items) {
                        results.push({
                            type: "government",
                            source: domain,
                            title: item.title,
                            url: item.link,
                            snippet: item.snippet,
                            isGovernment: true
                        });
                    }
                }
            }
            
            // Small delay to avoid rate limits
            await new Promise(r => setTimeout(r, 50));
            
        } catch (error) {
            // Continue to next domain
        }
    }
    
    return results;
}

// ============================================
// TAVILY SEARCH (FALLBACK)
// ============================================
async function tavilySearch(query) {
    const apiKey = process.env.TAVILY_API_KEY;
    
    if (!apiKey) {
        console.log('No Tavily API key');
        return [];
    }
    
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
        
        if (!response.ok) {
            console.log(`Tavily HTTP ${response.status}`);
            return [];
        }
        
        const data = await response.json();
        
        if (!data.results) return [];
        
        return data.results.map(result => ({
            type: "web",
            source: new URL(result.url).hostname,
            title: result.title,
            url: result.url,
            snippet: result.content?.substring(0, 300),
            isGovernment: result.url.includes('.gov')
        }));
        
    } catch (error) {
        console.error('Tavily error:', error.message);
        return [];
    }
}

// ============================================
// NEWS (DISPLAY ONLY)
// ============================================
async function getNews(query) {
    const apiKey = process.env.GNEWS_API_KEY;
    
    if (!apiKey) return [];
    
    try {
        const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=en&max=6&token=${apiKey}`;
        const response = await fetch(url);
        
        if (response.ok) {
            const data = await response.json();
            if (data.articles) {
                return data.articles.map(article => ({
                    title: article.title,
                    url: article.url,
                    source: new URL(article.url).hostname,
                    date: article.publishedAt?.split('T')[0],
                    description: article.description
                }));
            }
        }
    } catch (error) {
        console.error('News error:', error.message);
    }
    
    return [];
}

// ============================================
// VIDEOS (DISPLAY ONLY)
// ============================================
async function getVideos(query) {
    const apiKey = process.env.YOUTUBE_API_KEY;
    
    if (!apiKey) return [];
    
    try {
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=4&key=${apiKey}`;
        const response = await fetch(url);
        
        if (response.ok) {
            const data = await response.json();
            if (data.items) {
                return data.items.map(item => ({
                    title: item.snippet.title,
                    url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
                    channel: item.snippet.channelTitle,
                    thumbnail: item.snippet.thumbnails?.medium?.url || ''
                }));
            }
        }
    } catch (error) {
        console.error('Video error:', error.message);
    }
    
    return [];
}

// ============================================
// BUILD ANSWER WITH EXACT QUOTES
// ============================================
function buildAnswer(query, sources) {
    // Separate government sources
    const govSources = sources.filter(s => s.isGovernment === true || s.type === 'government');
    const otherSources = sources.filter(s => s !== govSources);
    
    // Prioritize government sources
    const sortedSources = [...govSources, ...otherSources];
    
    if (sortedSources.length === 0) {
        return {
            text: `No results found for "${query}". Please try a different search term. Example: "Canada immigration statistics 2024" or "US inflation rate"`,
            sentences: [{ text: `No results found. Try being more specific.`, citationId: null }],
            citations: [],
            evidenceCount: 0,
            governmentCount: 0
        };
    }
    
    const citations = [];
    const sentences = [];
    let citationId = 1;
    
    // Introduction
    sentences.push({
        text: `Found ${sortedSources.length} sources (${govSources.length} government sources) about "${query}":`,
        citationId: null
    });
    
    // Add each source as a quote
    for (const source of sortedSources.slice(0, 15)) {
        let quote = source.snippet || source.title || '';
        quote = quote.replace(/\s+/g, ' ').trim();
        
        if (quote.length > 50) {
            const typeLabel = source.isGovernment ? "🏛️ GOVERNMENT" : "📄 SOURCE";
            
            sentences.push({
                text: `"${quote.substring(0, 300)}"`,
                citationId: citationId
            });
            
            citations.push({
                id: citationId,
                text: quote.length > 400 ? quote.substring(0, 400) + '...' : quote,
                source: `${typeLabel}: ${source.source}`,
                url: source.url,
                title: source.title
            });
            
            citationId++;
        }
    }
    
    // Conclusion
    sentences.push({
        text: `Click any [number] to verify the original source. Each citation contains a direct quote.`,
        citationId: null
    });
    
    // Build full text
    let fullText = "";
    for (const sentence of sentences) {
        fullText += sentence.text + " ";
    }
    
    return {
        text: fullText,
        sentences: sentences,
        citations: citations,
        evidenceCount: sortedSources.length,
        governmentCount: govSources.length
    };
}
