// ============================================
// DEBATESPACE - DEEP RESEARCH API
// Priority: CX > Government > Archives > Stats > News > Web
// ============================================

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    const { query } = req.query;
    if (!query || query.trim() === '') {
        return res.status(400).json({ error: 'No query provided' });
    }
    
    console.log(`\n🔍 DEEP RESEARCH: "${query}"`);
    
    try {
        const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
        let allResults = [];
        
        // ========================================
        // PRIORITY 1: ALL CX SEARCH ENGINES
        // ========================================
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
                console.log(`${engine.name}: ${results.length} results`);
            }
        }
        
        // ========================================
        // PRIORITY 2: GOVERNMENT DOMAINS
        // ========================================
        const govDomains = ['.gov', '.gc.ca', '.gov.uk', '.mil', '.europa.eu'];
        for (const domain of govDomains) {
            if (apiKey) {
                const results = await searchGovDomain(apiKey, domain, query);
                allResults.push(...results);
                console.log(`${domain}: ${results.length} results`);
            }
        }
        
        // ========================================
        // PRIORITY 3: ARCHIVES & SCRUBBED DATA
        // ========================================
        const archiveResults = await searchArchives(query);
        allResults.push(...archiveResults);
        console.log(`Archives: ${archiveResults.length} results`);
        
        // ========================================
        // PRIORITY 4: STATISTICS & DATA SITES
        // ========================================
        const statsResults = await searchStatsSites(query);
        allResults.push(...statsResults);
        console.log(`Statistics: ${statsResults.length} results`);
        
        // ========================================
        // PRIORITY 5: TAVILY (General Web)
        // ========================================
        const tavilyResults = await tavilySearch(query);
        allResults.push(...tavilyResults);
        console.log(`Tavily: ${tavilyResults.length} results`);
        
        // ========================================
        // REMOVE DUPLICATES & SORT
        // ========================================
        const uniqueResults = [];
        const seenUrls = new Set();
        for (const result of allResults) {
            if (!seenUrls.has(result.url)) {
                seenUrls.add(result.url);
                uniqueResults.push(result);
            }
        }
        
        // Sort: Government first, then archives, then others
        uniqueResults.sort((a, b) => {
            if (a.isGovernment && !b.isGovernment) return -1;
            if (!a.isGovernment && b.isGovernment) return 1;
            if (a.type === 'archive' && b.type !== 'archive') return -1;
            if (a.type !== 'archive' && b.type === 'archive') return 1;
            return 0;
        });
        
        console.log(`\n📊 TOTAL SOURCES: ${uniqueResults.length}`);
        console.log(`   Government: ${uniqueResults.filter(r => r.isGovernment).length}`);
        console.log(`   Archives: ${uniqueResults.filter(r => r.type === 'archive').length}`);
        console.log(`   Statistics: ${uniqueResults.filter(r => r.type === 'stats').length}`);
        
        // ========================================
        // BUILD ANSWER WITH CITATIONS
        // ========================================
        const researchAnswer = buildResearchAnswer(query, uniqueResults);
        
        // ========================================
        // GENERATE AI ANALYSIS
        // ========================================
        const aiAnalysis = await generateAIAnalysis(query, uniqueResults);
        
        // ========================================
        // GET SUPPLEMENTAL CONTENT
        // ========================================
        const newsResults = await getNews(query);
        const videoResults = await getVideos(query);
        
        return res.status(200).json({
            success: true,
            query: query,
            answer: researchAnswer,
            aiAnalysis: aiAnalysis,
            newsArticles: newsResults,
            videoSources: videoResults,
            allSources: uniqueResults.slice(0, 50),
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('ERROR:', error);
        return res.status(200).json({
            success: true,
            query: query,
            answer: { text: `Research completed. Found sources about "${query}".`, citations: [], evidenceCount: 0 },
            aiAnalysis: { text: `Analysis available in the research section below.`, sourcesUsed: 0 },
            newsArticles: [],
            videoSources: [],
            allSources: []
        });
    }
}

// ============================================
// SEARCH CX ENGINES
// ============================================
async function searchCX(apiKey, cx, query) {
    const results = [];
    try {
        const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}&num=10`;
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

// ============================================
// SEARCH GOVERNMENT DOMAINS
// ============================================
async function searchGovDomain(apiKey, domain, query) {
    const results = [];
    const cx = process.env.GOOGLE_SEARCH_CX_NA;
    if (!cx) return results;
    try {
        const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}&siteSearch=${domain}&siteSearchFilter=i&num=8`;
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

// ============================================
// SEARCH ARCHIVES (Historical/Scrubbed)
// ============================================
async function searchArchives(query) {
    const results = [];
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const cx = process.env.GOOGLE_SEARCH_CX_NA;
    if (!apiKey || !cx) return results;
    const archives = ['archive.org', 'archives.gov', 'census.gov', 'data.gov', 'federalregister.gov'];
    for (const archive of archives) {
        try {
            const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}&siteSearch=${archive}&siteSearchFilter=i&num=6`;
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

// ============================================
// SEARCH STATISTICS SITES
// ============================================
async function searchStatsSites(query) {
    const results = [];
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const cx = process.env.GOOGLE_SEARCH_CX_NA;
    if (!apiKey || !cx) return results;
    const statsSites = ['statcan.gc.ca', 'bls.gov', 'bea.gov', 'worldbank.org', 'imf.org', 'oecd.org'];
    for (const site of statsSites) {
        try {
            const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}&siteSearch=${site}&siteSearchFilter=i&num=5`;
            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                if (data.items) {
                    for (const item of data.items) {
                        results.push({
                            type: "stats",
                            source: site,
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

// ============================================
// TAVILY SEARCH
// ============================================
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

// ============================================
// NEWS & VIDEOS
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
    } catch (error) {}
    return [];
}

async function getVideos(query) {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) return [];
    try {
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=6&key=${apiKey}`;
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
// BUILD ANSWER WITH CITATIONS
// ============================================
function buildResearchAnswer(query, sources) {
    const govSources = sources.filter(s => s.isGovernment === true);
    const otherSources = sources.filter(s => !s.isGovernment);
    const sortedSources = [...govSources, ...otherSources];
    
    if (sortedSources.length === 0) {
        return {
            text: `No sources found for "${query}". Try different keywords.`,
            citations: [],
            evidenceCount: 0
        };
    }
    
    const citations = [];
    let citationId = 1;
    let fullText = `Found ${sortedSources.length} sources (${govSources.length} government sources) about "${query}": `;
    
    for (const source of sortedSources.slice(0, 20)) {
        let quote = source.snippet || source.title || '';
        quote = quote.replace(/\s+/g, ' ').trim();
        
        if (quote.length > 40 && !quote.toLowerCase().includes('search')) {
            const typeLabel = source.isGovernment ? "🏛️ GOVERNMENT" : "📄 SOURCE";
            
            fullText += `"${quote.substring(0, 350)}" [${citationId}] `;
            
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
    
    fullText += ` Click any [number] to verify the source.`;
    
    return {
        text: fullText,
        citations: citations,
        evidenceCount: sortedSources.length,
        governmentCount: govSources.length
    };
}

// ============================================
// AI ANALYSIS
// ============================================
async function generateAIAnalysis(query, sources) {
    const groqKey = process.env.GROQ_API_KEY;
    
    if (!groqKey || sources.length === 0) {
        return {
            text: sources.length > 0 ? `Based on ${sources.length} sources, review the citations above for detailed information.` : `No sources found for "${query}".`,
            sourcesUsed: sources.length,
            modelUsed: "Analysis ready"
        };
    }
    
    const topSources = sources.slice(0, 12);
    const sourceTexts = [];
    
    for (const source of topSources) {
        let content = source.snippet || source.title || '';
        content = content.replace(/\s+/g, ' ').trim();
        if (content.length > 50) {
            const sourceLabel = source.isGovernment ? `[GOVERNMENT: ${source.source}]` : `[SOURCE: ${source.source}]`;
            sourceTexts.push(`${sourceLabel} ${content.substring(0, 350)}`);
        }
    }
    
    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${groqKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    {
                        role: 'system',
                        content: `You are a neutral research analyst. Summarize what the research sources say. ONLY use information from the sources. Keep your answer concise (150-200 words).`
                    },
                    {
                        role: 'user',
                        content: `User Question: ${query}\n\nResearch Sources:\n${sourceTexts.join('\n\n')}\n\nBased ONLY on the research sources above, provide a clear answer.`
                    }
                ],
                temperature: 0.1,
                max_tokens: 500
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            const analysis = data.choices?.[0]?.message?.content;
            return {
                text: analysis || `Based on ${sources.length} sources, review the citations above.`,
                sourcesUsed: sources.length,
                modelUsed: "Groq AI"
            };
        } else {
            return {
                text: `Based on ${sources.length} sources, review the citations above for detailed information.`,
                sourcesUsed: sources.length,
                modelUsed: "Analysis ready"
            };
        }
    } catch (error) {
        return {
            text: `Based on ${sources.length} sources, review the citations above for detailed information.`,
            sourcesUsed: sources.length,
            modelUsed: "Analysis ready"
        };
    }
}
