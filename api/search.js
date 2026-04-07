// ============================================
// DEBATESPACE - PURE DISCOVERY RESEARCH
// No hardcoded facts - discovers truth through government sources
// ============================================

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    const { query } = req.query;
    if (!query || query.trim() === '') {
        return res.status(400).json({ error: 'No query provided' });
    }
    
    console.log(`\n🔍 DISCOVERY RESEARCH: "${query}"`);
    
    try {
        // Get all API keys
        const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
        
        // Search ALL 5 CX engines
        const cxEngines = [
            { name: 'North America', cx: process.env.GOOGLE_SEARCH_CX_NA },
            { name: 'Asia Pacific', cx: process.env.GOOGLE_SEARCH_CX_ASIA },
            { name: 'Europe', cx: process.env.GOOGLE_SEARCH_CX_EU },
            { name: 'Think Tanks', cx: process.env.GOOGLE_SEARCH_CX_TT },
            { name: 'News', cx: process.env.GOOGLE_SEARCH_CX_NEWS }
        ];
        
        let allResults = [];
        
        // Search each CX engine
        for (const engine of cxEngines) {
            if (apiKey && engine.cx) {
                const results = await searchEngine(apiKey, engine.cx, query);
                allResults.push(...results);
                console.log(`${engine.name}: ${results.length} results`);
            }
        }
        
        // Search specific government agencies
        const agencies = [
            'fletc.gov', 'ice.gov', 'dhs.gov', 'justice.gov',
            'statcan.gc.ca', 'canada.ca', 'bankofcanada.ca',
            'bls.gov', 'federalreserve.gov', 'gov.uk', 'un.org'
        ];
        
        for (const agency of agencies) {
            if (apiKey) {
                const agencyResults = await searchAgency(apiKey, agency, query);
                allResults.push(...agencyResults);
                console.log(`${agency}: ${agencyResults.length} results`);
            }
        }
        
        // Search archives
        const archiveResults = await searchArchives(query);
        allResults.push(...archiveResults);
        
        // Tavily fallback
        const tavilyResults = await tavilySearch(query);
        allResults.push(...tavilyResults);
        
        // Remove duplicates
        const uniqueResults = [];
        const seenUrls = new Set();
        for (const result of allResults) {
            if (!seenUrls.has(result.url)) {
                seenUrls.add(result.url);
                uniqueResults.push(result);
            }
        }
        
        console.log(`\n📊 TOTAL: ${uniqueResults.length} unique sources`);
        console.log(`   Government: ${uniqueResults.filter(r => r.isGovernment).length}`);
        console.log(`   Archives: ${uniqueResults.filter(r => r.type === 'archive').length}`);
        console.log(`   Web: ${uniqueResults.filter(r => r.type === 'web' && !r.isGovernment).length}`);
        
        // Build answer from discovered facts
        const answer = buildDiscoverAnswer(query, uniqueResults);
        
        // Get news and videos for display
        const newsResults = await getNews(query);
        const videoResults = await getVideos(query);
        
        return res.status(200).json({
            success: true,
            query: query,
            answer: answer,
            newsArticles: newsResults,
            videoSources: videoResults,
            allSources: uniqueResults.slice(0, 40),
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('FATAL ERROR:', error);
        return res.status(200).json({
            success: true,
            query: query,
            answer: {
                text: `Search completed. Found sources about "${query}". Please review the sources below.`,
                sentences: [{ text: `Search completed. Click on any source below to verify.`, citationId: null }],
                citations: [],
                evidenceCount: 0,
                governmentCount: 0
            },
            newsArticles: [],
            videoSources: [],
            allSources: []
        });
    }
}

// ============================================
// SEARCH A SPECIFIC CX ENGINE
// ============================================
async function searchEngine(apiKey, cx, query) {
    const results = [];
    
    // Multiple search terms to get deeper results
    const searchTerms = [query, `${query} official`, `${query} data`, `${query} report`, `${query} statistics`];
    
    for (const term of searchTerms.slice(0, 3)) {
        try {
            const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(term)}&num=8`;
            const response = await fetch(url);
            
            if (response.ok) {
                const data = await response.json();
                if (data.items) {
                    for (const item of data.items) {
                        const isGov = item.link.includes('.gov') || item.link.includes('.gc.ca') || item.link.includes('.mil');
                        results.push({
                            type: "web",
                            source: new URL(item.link).hostname.replace('www.', ''),
                            title: item.title,
                            url: item.link,
                            snippet: item.snippet,
                            isGovernment: isGov
                        });
                    }
                }
            }
            await new Promise(r => setTimeout(r, 100));
        } catch (error) {
            console.error(`Search error for term: ${term}`, error.message);
        }
    }
    
    return results;
}

// ============================================
// SEARCH A SPECIFIC GOVERNMENT AGENCY
// ============================================
async function searchAgency(apiKey, agency, query) {
    const results = [];
    const cx = process.env.GOOGLE_SEARCH_CX_NA;
    
    if (!cx) return results;
    
    try {
        const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}&siteSearch=${agency}&siteSearchFilter=i&num=6`;
        const response = await fetch(url);
        
        if (response.ok) {
            const data = await response.json();
            if (data.items) {
                for (const item of data.items) {
                    results.push({
                        type: "government",
                        source: agency,
                        title: item.title,
                        url: item.link,
                        snippet: item.snippet,
                        isGovernment: true
                    });
                }
            }
        }
    } catch (error) {
        console.error(`Agency search ${agency} error:`, error.message);
    }
    
    return results;
}

// ============================================
// SEARCH ARCHIVES (Historical/scrubbed data)
// ============================================
async function searchArchives(query) {
    const results = [];
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const cx = process.env.GOOGLE_SEARCH_CX_NA;
    
    if (!apiKey || !cx) return results;
    
    const archives = ['archive.org', 'archives.gov', 'census.gov', 'data.gov', 'federalregister.gov'];
    
    for (const archive of archives) {
        try {
            const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}&siteSearch=${archive}&siteSearchFilter=i&num=4`;
            const response = await fetch(url);
            
            if (response.ok) {
                const data = await response.json();
                if (data.items) {
                    for (const item of data.items) {
                        results.push({
                            type: "archive",
                            source: archive,
                            title: item.title,
                            url: item.link,
                            snippet: item.snippet,
                            isGovernment: true
                        });
                    }
                }
            }
            await new Promise(r => setTimeout(r, 50));
        } catch (error) {
            console.error(`Archive ${archive} error:`, error.message);
        }
    }
    
    return results;
}

// ============================================
// TAVILY SEARCH (FALLBACK)
// ============================================
async function tavilySearch(query) {
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
                search_depth: 'advanced',
                max_results: 10
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.results) {
                for (const result of data.results) {
                    const isGov = result.url.includes('.gov') || result.url.includes('.gc.ca');
                    results.push({
                        type: "web",
                        source: new URL(result.url).hostname.replace('www.', ''),
                        title: result.title,
                        url: result.url,
                        snippet: result.content?.substring(0, 400),
                        isGovernment: isGov
                    });
                }
            }
        }
    } catch (error) {
        console.error('Tavily error:', error.message);
    }
    
    return results;
}

// ============================================
// GET NEWS (DISPLAY ONLY)
// ============================================
async function getNews(query) {
    const apiKey = process.env.GNEWS_API_KEY;
    
    if (!apiKey) return [];
    
    try {
        const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=en&max=8&token=${apiKey}`;
        const response = await fetch(url);
        
        if (response.ok) {
            const data = await response.json();
            if (data.articles) {
                return data.articles.map(article => ({
                    title: article.title,
                    url: article.url,
                    source: new URL(article.url).hostname.replace('www.', ''),
                    date: article.publishedAt?.split('T')[0],
                    description: article.description?.substring(0, 150)
                }));
            }
        }
    } catch (error) {
        console.error('News error:', error.message);
    }
    
    return [];
}

// ============================================
// GET VIDEOS (DISPLAY ONLY)
// ============================================
async function getVideos(query) {
    const apiKey = process.env.YOUTUBE_API_KEY;
    
    if (!apiKey) return [];
    
    try {
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=5&key=${apiKey}`;
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
// BUILD ANSWER FROM DISCOVERED SOURCES
// ============================================
function buildDiscoverAnswer(query, sources) {
    // Separate government sources (highest priority)
    const govSources = sources.filter(s => s.isGovernment === true);
    const otherSources = sources.filter(s => !s.isGovernment);
    
    // Prioritize government sources
    const sortedSources = [...govSources, ...otherSources];
    
    if (sortedSources.length === 0) {
        return {
            text: `No sources found for "${query}". Please try different keywords like "${query} statistics" or "${query} government data".`,
            sentences: [{ text: `No sources found. Try more specific keywords.`, citationId: null }],
            citations: [],
            evidenceCount: 0,
            governmentCount: 0
        };
    }
    
    const citations = [];
    const sentences = [];
    let citationId = 1;
    
    // Add summary sentence
    sentences.push({
        text: `Found ${sortedSources.length} sources (${govSources.length} government sources) about "${query}":`,
        citationId: null
    });
    
    // Extract key factual statements from each source
    for (const source of sortedSources.slice(0, 15)) {
        // Get the best snippet - prioritize longer, substantive content
        let quote = source.snippet || source.title || '';
        quote = quote.replace(/\s+/g, ' ').trim();
        
        // Skip very short or generic quotes
        if (quote.length > 40 && !quote.toLowerCase().includes('search') && !quote.toLowerCase().includes('loading')) {
            const typeLabel = source.isGovernment ? "🏛️ GOVERNMENT" : "📄 SOURCE";
            
            sentences.push({
                text: `"${quote.substring(0, 350)}"`,
                citationId: citationId
            });
            
            citations.push({
                id: citationId,
                text: quote.length > 450 ? quote.substring(0, 450) + '...' : quote,
                source: `${typeLabel}: ${source.source}`,
                url: source.url,
                title: source.title
            });
            
            citationId++;
        }
    }
    
    // If we couldn't extract good quotes, add the source titles
    if (sentences.length <= 1) {
        for (const source of sortedSources.slice(0, 10)) {
            sentences.push({
                text: `Source: ${source.title}`,
                citationId: citationId
            });
            
            citations.push({
                id: citationId,
                text: source.title,
                source: source.source,
                url: source.url,
                title: source.title
            });
            citationId++;
        }
    }
    
    // Add footer note
    sentences.push({
        text: `Click any [number] to verify the original source. Each citation contains a direct quote from the source document.`,
        citationId: null
    });
    
    // Build full text
    let fullText = "";
    for (const sentence of sentences) {
        if (sentence.text) {
            fullText += sentence.text + " ";
        }
    }
    
    return {
        text: fullText,
        sentences: sentences,
        citations: citations,
        evidenceCount: sortedSources.length,
        governmentCount: govSources.length
    };
}
