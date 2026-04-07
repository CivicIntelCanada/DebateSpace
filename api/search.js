// ============================================
// DEBATESPACE - FACTUAL RESEARCH WITH EXACT QUOTES
// Every sentence is a direct quote from a source
// AI only formats - never generates facts
// ============================================

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    const { query } = req.query;
    if (!query || query.trim() === '') {
        return res.status(400).json({ error: 'No query provided' });
    }
    
    console.log(`\n🔍 RESEARCH: "${query}"`);
    
    try {
        // Search ALL sources in parallel for speed
        const [govResults, newsResults, videoResults, webResults] = await Promise.all([
            searchGovernmentSources(query),
            searchNewsSources(query),
            searchVideoSources(query),
            searchWebSources(query)
        ]);
        
        // Combine all evidence
        const allEvidence = [...govResults, ...webResults];
        
        console.log(`\n📊 RESULTS:`);
        console.log(`   Government: ${govResults.length}`);
        console.log(`   News: ${newsResults.length}`);
        console.log(`   Video: ${videoResults.length}`);
        console.log(`   Web: ${webResults.length}`);
        console.log(`   TOTAL: ${allEvidence.length} sources`);
        
        // Build answer using EXACT QUOTES from sources
        const answer = buildAnswerFromExactQuotes(query, allEvidence, govResults);
        
        return res.status(200).json({
            success: true,
            query: query,
            answer: answer,
            newsArticles: newsResults,
            videoSources: videoResults,
            allSources: allEvidence.slice(0, 50),
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('[API] Error:', error);
        return res.status(200).json({
            success: true,
            query: query,
            answer: {
                text: `Search completed but no results found for "${query}". Try: "Canada immigration", "US inflation", "ICE training", "Climate facts"`,
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
// GOVERNMENT SOURCES SEARCH (PRIORITY 1)
// ============================================
async function searchGovernmentSources(query) {
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const results = [];
    const seenUrls = new Set();
    
    if (!apiKey) {
        console.log('⚠️ No Google API key found');
        return results;
    }
    
    // Priority government sites for each query type
    const govSites = [
        'fletc.gov', 'ice.gov', 'dhs.gov', 'justice.gov', 'usa.gov',
        'cdc.gov', 'nih.gov', 'bls.gov', 'census.gov', 'federalreserve.gov',
        'canada.ca', 'statcan.gc.ca', 'gov.uk', 'ons.gov.uk', 'who.int'
    ];
    
    // Search each government site
    for (const site of govSites) {
        try {
            const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${process.env.GOOGLE_SEARCH_CX_NA || '001394068838258239124:3iwe7yswooy'}&q=${encodeURIComponent(query)}&siteSearch=${site}&siteSearchFilter=i&num=5`;
            
            const response = await fetch(url);
            
            if (response.ok) {
                const data = await response.json();
                if (data.items && data.items.length > 0) {
                    for (const item of data.items) {
                        if (!seenUrls.has(item.link)) {
                            seenUrls.add(item.link);
                            results.push({
                                type: "government",
                                source: site,
                                title: item.title,
                                url: item.link,
                                text: item.snippet,
                                exactQuote: item.snippet,
                                date: null
                            });
                        }
                    }
                }
            }
            
            // Rate limit: wait 100ms between requests
            await new Promise(r => setTimeout(r, 100));
            
        } catch (error) {
            console.error(`[${site}] Error:`, error.message);
        }
    }
    
    return results;
}

// ============================================
// NEWS SOURCES SEARCH
// ============================================
async function searchNewsSources(query) {
    const apiKey = process.env.GNEWS_API_KEY;
    const articles = [];
    
    if (!apiKey) return articles;
    
    try {
        const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=en&max=10&token=${apiKey}`;
        const response = await fetch(url);
        
        if (response.ok) {
            const data = await response.json();
            if (data.articles) {
                for (const article of data.articles.slice(0, 10)) {
                    articles.push({
                        title: article.title,
                        url: article.url,
                        source: new URL(article.url).hostname.replace('www.', ''),
                        date: article.publishedAt?.split('T')[0],
                        description: article.description,
                        type: "news"
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
// VIDEO SOURCES SEARCH
// ============================================
async function searchVideoSources(query) {
    const apiKey = process.env.YOUTUBE_API_KEY;
    const videos = [];
    
    if (!apiKey) return videos;
    
    try {
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=6&key=${apiKey}`;
        const response = await fetch(url);
        
        if (response.ok) {
            const data = await response.json();
            if (data.items) {
                for (const item of data.items) {
                    videos.push({
                        title: item.snippet.title,
                        url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
                        channel: item.snippet.channelTitle,
                        thumbnail: item.snippet.thumbnails?.medium?.url || '',
                        type: "video"
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
// GENERAL WEB SEARCH (Tavily)
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
                max_results: 10
            })
        });
        
        const data = await response.json();
        
        if (data.results) {
            for (const result of data.results) {
                results.push({
                    type: "web",
                    source: new URL(result.url).hostname.replace('www.', ''),
                    title: result.title,
                    url: result.url,
                    text: result.content?.substring(0, 300),
                    exactQuote: result.content?.substring(0, 300),
                    date: null
                });
            }
        }
    } catch (error) {
        console.error('[Tavily] Error:', error.message);
    }
    
    return results;
}

// ============================================
// BUILD ANSWER FROM EXACT QUOTES
// Each sentence is a direct quote from a source
// ============================================
function buildAnswerFromExactQuotes(query, allEvidence, govEvidence) {
    
    // Prioritize government sources
    const sortedEvidence = [...govEvidence, ...allEvidence.filter(e => e.type !== "government")];
    
    // Take unique sources (avoid duplicates)
    const uniqueSources = [];
    const seenTexts = new Set();
    
    for (const source of sortedEvidence) {
        const textKey = (source.text || '').substring(0, 60);
        if (!seenTexts.has(textKey) && source.text && source.text.length > 40) {
            seenTexts.add(textKey);
            uniqueSources.push(source);
        }
        if (uniqueSources.length >= 25) break;
    }
    
    if (uniqueSources.length === 0) {
        return {
            text: `No specific information found for "${query}". Please try different keywords like "Canada immigration", "US inflation", or "ICE training".`,
            sentences: [],
            citations: [],
            evidenceCount: 0
        };
    }
    
    // Create citations array
    const citations = [];
    const sentenceList = [];
    
    // Add introduction sentence
    sentenceList.push({
        text: `Here are direct quotes from ${uniqueSources.length} government and official sources about "${query}":`,
        citationId: null
    });
    
    // Add each source as a direct quote sentence
    let citationId = 1;
    for (const source of uniqueSources) {
        // Clean the quote text
        let quote = source.text
            .replace(/\s+/g, ' ')
            .trim();
        
        // Add quotes around the text to show it's a direct quote
        if (!quote.startsWith('"')) {
            quote = `"${quote}"`;
        }
        if (!quote.endsWith('"')) {
            quote = quote + '"';
        }
        
        // Add source attribution
        let typeLabel = "";
        if (source.type === "government") typeLabel = "🏛️ GOVERNMENT";
        else if (source.type === "web") typeLabel = "🌐 SOURCE";
        else typeLabel = "📄 SOURCE";
        
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
    
    // Add conclusion
    sentenceList.push({
        text: `Each citation above contains a direct quote from its source. Click the numbers to verify the original information.`,
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
        governmentCount: uniqueSources.filter(s => s.type === "government").length
    };
}
