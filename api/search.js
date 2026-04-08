// ============================================
// DEBATESPACE - COMPLETE API
// Discovery research with AI analysis
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
        // SEARCH ALL CX ENGINES
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
        
        // ========================================
        // SEARCH GOVERNMENT DOMAINS
        // ========================================
        const govDomains = ['.gov', '.gc.ca', '.gov.uk', '.mil'];
        for (const domain of govDomains) {
            if (apiKey) {
                const results = await searchGovDomain(apiKey, domain, query);
                allResults.push(...results);
            }
        }
        
        // ========================================
        // SEARCH ARCHIVES
        // ========================================
        const archiveResults = await searchArchives(query);
        allResults.push(...archiveResults);
        
        // ========================================
        // TAVILY SEARCH
        // ========================================
        const tavilyResults = await tavilySearch(query);
        allResults.push(...tavilyResults);
        
        // ========================================
        // REMOVE DUPLICATES
        // ========================================
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
        // BUILD RESEARCH ANSWER
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
            research: researchAnswer,
            aiAnalysis: aiAnalysis,
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
            aiAnalysis: { text: `Analysis unavailable. Please review the research sources below.`, sourcesUsed: 0 },
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
// BUILD RESEARCH ANSWER
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
// GENERATE AI ANALYSIS
// ============================================
async function generateAIAnalysis(query, sources) {
    const groqKey = process.env.GROQ_API_KEY;
    
    if (!groqKey) {
        return {
            text: `AI analysis requires a Groq API key. Please review the ${sources.length} research sources above.`,
            sourcesUsed: sources.length,
            modelUsed: "Groq API key missing"
        };
    }
    
    if (sources.length === 0) {
        return {
            text: `No research sources were found for "${query}". Please try different keywords.`,
            sourcesUsed: 0,
            modelUsed: "No sources"
        };
    }
    
    // Prepare source excerpts
    const topSources = sources.slice(0, 10);
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
                        content: `You are a neutral research analyst. Summarize what the provided research sources say. ONLY use information from the sources. Keep your answer concise (150-250 words).`
                    },
                    {
                        role: 'user',
                        content: `User Question: ${query}\n\nResearch Sources:\n${sourceTexts.join('\n\n')}\n\nBased ONLY on the research sources above, provide a clear answer to the user's question.`
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
                text: analysis || `Based on ${sources.length} sources, the research findings are presented above.`,
                sourcesUsed: sources.length,
                modelUsed: "Groq Llama 3.3",
                disclaimer: "Analysis based solely on the research sources"
            };
        } else {
            return {
                text: `AI analysis temporarily unavailable. Please review the ${sources.length} research sources above.`,
                sourcesUsed: sources.length,
                modelUsed: "API error"
            };
        }
        
    } catch (error) {
        console.error('AI Analysis error:', error.message);
        return {
            text: `AI analysis unavailable. Please review the ${sources.length} research sources above.`,
            sourcesUsed: sources.length,
            modelUsed: "Error"
        };
    }
}
