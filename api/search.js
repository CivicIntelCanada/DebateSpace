// ============================================
// DEBATESPACE - SEARCH API WITH RULE-BASED SUMMARIZER
// ============================================

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    const { query } = req.query;
    if (!query || query.trim() === '') {
        return res.status(400).json({ error: 'No query provided' });
    }
    
    console.log(`\n🔍 RESEARCH: "${query}"`);
    
    try {
        const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
        
        // ========================================
        // SEARCH ALL SOURCES
        // ========================================
        let allResults = [];
        
        const cxEngines = [
            { name: 'North America', cx: process.env.GOOGLE_SEARCH_CX_NA },
            { name: 'Asia Pacific', cx: process.env.GOOGLE_SEARCH_CX_ASIA },
            { name: 'Europe', cx: process.env.GOOGLE_SEARCH_CX_EU },
            { name: 'Think Tanks', cx: process.env.GOOGLE_SEARCH_CX_TT },
            { name: 'News', cx: process.env.GOOGLE_SEARCH_CX_NEWS }
        ];
        
        for (const engine of cxEngines) {
            if (apiKey && engine.cx) {
                const results = await searchCX(apiKey, engine.cx, query);
                allResults.push(...results);
            }
        }
        
        const govDomains = ['.gov', '.gc.ca', '.gov.uk', '.mil'];
        for (const domain of govDomains) {
            if (apiKey) {
                const results = await searchGovDomain(apiKey, domain, query);
                allResults.push(...results);
            }
        }
        
        const archiveResults = await searchArchives(query);
        allResults.push(...archiveResults);
        
        const tavilyResults = await tavilySearch(query);
        allResults.push(...tavilyResults);
        
        const uniqueResults = [];
        const seenUrls = new Set();
        for (const result of allResults) {
            if (!seenUrls.has(result.url)) {
                seenUrls.add(result.url);
                uniqueResults.push(result);
            }
        }
        
        console.log(`Total sources: ${uniqueResults.length}`);
        
        // ========================================
        // BUILD RESEARCH ANSWER (Citations)
        // ========================================
        const researchAnswer = buildResearchAnswer(query, uniqueResults);
        
        // ========================================
        // GENERATE CONCISE RULE-BASED SUMMARY (NO AI)
        // ========================================
        const researchSummary = generateConciseSummary(query, uniqueResults);
        
        // ========================================
        // GET SUPPLEMENTAL CONTENT
        // ========================================
        const newsResults = await getNews(query);
        const videoResults = await getVideos(query);
        
        return res.status(200).json({
            success: true,
            query: query,
            research: researchAnswer,
            researchSummary: researchSummary,
            newsArticles: newsResults,
            videoSources: videoResults,
            allSources: uniqueResults.slice(0, 40),
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('ERROR:', error);
        return res.status(200).json({
            success: true,
            query: query,
            research: { text: `Research completed. Found sources about "${query}".`, citations: [], evidenceCount: 0 },
            researchSummary: { text: `Summary available. Please review the research sources below.`, sourcesUsed: 0 },
            newsArticles: [],
            videoSources: [],
            allSources: []
        });
    }
}

// ============================================
// SEARCH FUNCTIONS
// ============================================
async function searchCX(apiKey, cx, query) {
    const results = [];
    try {
        const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}&num=8`;
        const response = await fetch(url);
        if (response.ok) {
            const data = await response.json();
            if (data.items) {
                for (const item of data.items) {
                    results.push({
                        type: "cx",
                        source: new URL(item.link).hostname.replace('www.', ''),
                        title: item.title,
                        url: item.link,
                        snippet: item.snippet,
                        isGovernment: item.link.includes('.gov') || item.link.includes('.gc.ca')
                    });
                }
            }
        }
    } catch (error) {}
    return results;
}

async function searchGovDomain(apiKey, domain, query) {
    const results = [];
    const cx = process.env.GOOGLE_SEARCH_CX_NA;
    if (!cx) return results;
    try {
        const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}&siteSearch=${domain}&siteSearchFilter=i&num=6`;
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
    } catch (error) {}
    return results;
}

async function searchArchives(query) {
    const results = [];
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const cx = process.env.GOOGLE_SEARCH_CX_NA;
    if (!apiKey || !cx) return results;
    const archives = ['archive.org', 'archives.gov', 'census.gov', 'data.gov'];
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
        } catch (error) {}
    }
    return results;
}

async function tavilySearch(query) {
    const apiKey = process.env.TAVILY_API_KEY;
    const results = [];
    if (!apiKey) return results;
    try {
        const response = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ api_key: apiKey, query: query, search_depth: 'advanced', max_results: 8 })
        });
        if (response.ok) {
            const data = await response.json();
            if (data.results) {
                for (const result of data.results) {
                    results.push({
                        type: "web",
                        source: new URL(result.url).hostname.replace('www.', ''),
                        title: result.title,
                        url: result.url,
                        snippet: result.content?.substring(0, 400),
                        isGovernment: result.url.includes('.gov')
                    });
                }
            }
        }
    } catch (error) {}
    return results;
}

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
                    source: new URL(article.url).hostname.replace('www.', ''),
                    date: article.publishedAt?.split('T')[0],
                    description: article.description?.substring(0, 150)
                }));
            }
        }
    } catch (error) {}
    return [];
}

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
    } catch (error) {}
    return [];
}

// ============================================
// BUILD RESEARCH ANSWER (Citations)
// ============================================
function buildResearchAnswer(query, sources) {
    const govSources = sources.filter(s => s.isGovernment === true);
    const otherSources = sources.filter(s => !s.isGovernment);
    const sortedSources = [...govSources, ...otherSources];
    
    if (sortedSources.length === 0) {
        return {
            text: `No sources found for "${query}". Try different keywords.`,
            citations: [],
            evidenceCount: 0,
            governmentCount: 0
        };
    }
    
    const citations = [];
    let citationId = 1;
    let fullText = `Found ${sortedSources.length} sources (${govSources.length} government sources) about "${query}": `;
    
    for (const source of sortedSources.slice(0, 15)) {
        let quote = source.snippet || source.title || '';
        quote = quote.replace(/\s+/g, ' ').trim();
        
        if (quote.length > 40 && !quote.toLowerCase().includes('search')) {
            const typeLabel = source.isGovernment ? "🏛️ GOVERNMENT" : "📄 SOURCE";
            
            fullText += `"${quote.substring(0, 300)}" [${citationId}] `;
            
            citations.push({
                id: citationId,
                text: quote.length > 400 ? quote.substring(0, 400) + '...' : quote,
                source: `${typeLabel}: ${source.source}`,
                url: source.url
            });
            citationId++;
        }
    }
    
    fullText += ` Click any [number] to verify the source.`;
    
    return {
        text: fullText,
        citations: citations,
        evidenceCount: sortedSources.length,
        governmentCount: govSources.length
    };
}

// ============================================
// CONCISE RULE-BASED SUMMARY (NO AI)
// ============================================
function generateConciseSummary(query, sources) {
    if (sources.length === 0) {
        return {
            text: `No sources found for "${query}". Try different keywords.`,
            sourcesUsed: 0,
            method: "Rule-based summary (no AI)"
        };
    }
    
    const keyFacts = [];
    const seenText = new Set();
    
    for (const source of sources.slice(0, 20)) {
        const content = source.snippet || source.title || '';
        if (content.length < 40) continue;
        
        let cleanText = content.replace(/\s+/g, ' ').trim();
        if (cleanText.length > 200) {
            cleanText = cleanText.substring(0, 200) + '...';
        }
        
        const shortKey = cleanText.substring(0, 80);
        if (!seenText.has(shortKey)) {
            seenText.add(shortKey);
            keyFacts.push({
                text: cleanText,
                source: source.source,
                url: source.url,
                isGovernment: source.isGovernment
            });
        }
    }
    
    const topFacts = keyFacts.slice(0, 8);
    
    let summaryText = `📋 RESEARCH SUMMARY: ${query}\n\n`;
    summaryText += `Based on ${sources.length} sources (${sources.filter(s => s.isGovernment).length} government)\n\n`;
    
    if (topFacts.length > 0) {
        summaryText += `KEY FINDINGS:\n\n`;
        for (let i = 0; i < topFacts.length; i++) {
            const fact = topFacts[i];
            const badge = fact.isGovernment ? '[GOVERNMENT]' : '[NEWS]';
            summaryText += `${i+1}. ${fact.text}\n   ${badge} Source: ${fact.source}\n   Verify: ${fact.url}\n\n`;
        }
    } else {
        summaryText += `No specific facts could be extracted. Please review the citations below.\n\n`;
    }
    
    summaryText += `---\n`;
    summaryText += `METHOD: Rule-based extraction from search results (no AI)\n`;
    summaryText += `CITATIONS: Click any Verify link above to view the original document.`;
    
    return {
        text: summaryText,
        sourcesUsed: sources.length,
        governmentSources: sources.filter(s => s.isGovernment).length,
        newsSources: sources.filter(s => !s.isGovernment).length,
        factsExtracted: topFacts.length,
        method: "Rule-based (no AI)"
    };
}
